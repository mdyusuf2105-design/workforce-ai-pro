from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.models.leave import LeaveRequest
from app.models.user import User
from app.routers.auth import get_current_user, require_roles
from app.schemas.leave import (
    LeaveRequestCreate,
    LeaveRequestResponse,
    LeaveReviewRequest,
)


router = APIRouter(
    prefix="/api/leaves",
    tags=["Leave Management"],
)


def get_employee_for_user(db: Session, user: User):
    return (
        db.query(Employee)
        .filter(Employee.email == user.email)
        .first()
    )


@router.post(
    "/",
    response_model=LeaveRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_leave_request(
    payload: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = (
        db.query(Employee)
        .filter(Employee.id == payload.employee_id)
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found.",
        )

    if employee.employment_status != "ACTIVE":
        raise HTTPException(
            status_code=400,
            detail="Only active employees can request leave.",
        )

    if current_user.role.upper() == "EMPLOYEE":
        own_employee = get_employee_for_user(db, current_user)

        if not own_employee or own_employee.id != employee.id:
            raise HTTPException(
                status_code=403,
                detail="You can submit leave requests only for yourself.",
            )

    if payload.start_date < date.today():
        raise HTTPException(
            status_code=400,
            detail="Leave start date cannot be in the past.",
        )

    overlapping_leave = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.employee_id == employee.id,
            LeaveRequest.status.in_(["PENDING", "APPROVED"]),
            LeaveRequest.start_date <= payload.end_date,
            LeaveRequest.end_date >= payload.start_date,
        )
        .first()
    )

    if overlapping_leave:
        raise HTTPException(
            status_code=409,
            detail="An existing pending or approved leave overlaps these dates.",
        )

    leave = LeaveRequest(
        employee_id=employee.id,
        leave_type=payload.leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason.strip(),
        status="PENDING",
    )

    db.add(leave)
    db.commit()
    db.refresh(leave)

    return leave


@router.get("/", response_model=list[LeaveRequestResponse])
def list_leave_requests(
    employee_id: int | None = Query(default=None, gt=0),
    leave_status: str | None = Query(
        default=None,
        alias="status",
        pattern="^(PENDING|APPROVED|REJECTED|CANCELLED)$",
    ),
    start_date: date | None = None,
    end_date: date | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(LeaveRequest)

    if current_user.role.upper() == "EMPLOYEE":
        employee = get_employee_for_user(db, current_user)

        if not employee:
            return []

        query = query.filter(
            LeaveRequest.employee_id == employee.id
        )
    elif employee_id is not None:
        query = query.filter(
            LeaveRequest.employee_id == employee_id
        )

    if leave_status:
        query = query.filter(LeaveRequest.status == leave_status)

    if start_date:
        query = query.filter(LeaveRequest.end_date >= start_date)

    if end_date:
        query = query.filter(LeaveRequest.start_date <= end_date)

    return (
        query.order_by(LeaveRequest.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{leave_id}", response_model=LeaveRequestResponse)
def get_leave_request(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    leave = db.query(LeaveRequest).filter(
        LeaveRequest.id == leave_id
    ).first()

    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found.")

    if current_user.role.upper() == "EMPLOYEE":
        employee = get_employee_for_user(db, current_user)

        if not employee or employee.id != leave.employee_id:
            raise HTTPException(status_code=403, detail="Access denied.")

    return leave


@router.patch(
    "/{leave_id}/review",
    response_model=LeaveRequestResponse,
)
def review_leave_request(
    leave_id: int,
    payload: LeaveReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "HR", "MANAGER")
    ),
):
    leave = db.query(LeaveRequest).filter(
        LeaveRequest.id == leave_id
    ).with_for_update().first()

    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found.")

    if leave.status != "PENDING":
        raise HTTPException(
            status_code=409,
            detail="Only pending leave requests can be reviewed.",
        )

    if payload.status == "REJECTED" and not (
        payload.reviewer_comments or ""
    ).strip():
        raise HTTPException(
            status_code=400,
            detail="A reason is required when rejecting a leave request.",
        )

    if payload.status == "APPROVED":
        overlapping_leave = (
            db.query(LeaveRequest)
            .filter(
                LeaveRequest.id != leave.id,
                LeaveRequest.employee_id == leave.employee_id,
                LeaveRequest.status == "APPROVED",
                LeaveRequest.start_date <= leave.end_date,
                LeaveRequest.end_date >= leave.start_date,
            )
            .first()
        )

        if overlapping_leave:
            raise HTTPException(
                status_code=409,
                detail="Another approved leave overlaps these dates.",
            )

    leave.status = payload.status
    leave.reviewed_by = current_user.id
    leave.reviewer_comments = (
        payload.reviewer_comments.strip()
        if payload.reviewer_comments
        else None
    )
    leave.reviewed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(leave)

    return leave


@router.patch(
    "/{leave_id}/cancel",
    response_model=LeaveRequestResponse,
)
def cancel_leave_request(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    leave = db.query(LeaveRequest).filter(
        LeaveRequest.id == leave_id
    ).first()

    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found.")

    if current_user.role.upper() == "EMPLOYEE":
        employee = get_employee_for_user(db, current_user)

        if not employee or employee.id != leave.employee_id:
            raise HTTPException(status_code=403, detail="Access denied.")

    elif current_user.role.upper() not in {"ADMIN", "HR", "MANAGER"}:
        raise HTTPException(status_code=403, detail="Access denied.")

    if leave.status != "PENDING":
        raise HTTPException(
            status_code=409,
            detail="Only pending leave requests can be cancelled.",
        )

    leave.status = "CANCELLED"
    db.commit()
    db.refresh(leave)

    return leave
