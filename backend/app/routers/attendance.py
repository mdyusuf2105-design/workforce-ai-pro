from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.attendance import Attendance
from app.models.employee import Employee
from app.models.user import User
from app.routers.auth import get_current_user, require_roles
from app.schemas.attendance import (
    AttendanceResponse,
    CheckInRequest,
    CheckOutRequest,
)


router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


@router.post("/check-in", response_model=AttendanceResponse, status_code=201)
def check_in(
    data: CheckInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = db.get(Employee, data.employee_id)

    if employee is None or employee.employment_status != "ACTIVE":
        raise HTTPException(status_code=404, detail="Active employee not found")

    # Employees may check in only for their own account when their user email
    # matches the employee record. HR, managers, and admins can check in others.
    if current_user.role == "EMPLOYEE" and (
        current_user.email.lower() != employee.email.lower()
    ):
        raise HTTPException(status_code=403, detail="You can only check in for yourself")

    today = datetime.now(timezone.utc).date()

    existing = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == data.employee_id,
            Attendance.attendance_date == today,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Attendance already exists for today",
        )

    record = Attendance(
        employee_id=data.employee_id,
        attendance_date=today,
        check_in=datetime.now(timezone.utc),
        status="PRESENT",
        shift_name=data.shift_name,
    )

    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.post("/check-out", response_model=AttendanceResponse)
def check_out(
    data: CheckOutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = db.get(Employee, data.employee_id)

    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")

    if current_user.role == "EMPLOYEE" and (
        current_user.email.lower() != employee.email.lower()
    ):
        raise HTTPException(status_code=403, detail="You can only check out for yourself")

    today = datetime.now(timezone.utc).date()

    record = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == data.employee_id,
            Attendance.attendance_date == today,
        )
        .first()
    )

    if record is None or record.check_in is None:
        raise HTTPException(
            status_code=404,
            detail="No check-in record found for today",
        )

    if record.check_out is not None:
        raise HTTPException(status_code=409, detail="Already checked out")

    record.check_out = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)
    return record


@router.get("/", response_model=list[AttendanceResponse])
def attendance_history(
    employee_id: int | None = Query(default=None, gt=0),
    start_date: date | None = None,
    end_date: date | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Attendance)

    if current_user.role == "EMPLOYEE":
        employee = (
            db.query(Employee)
            .filter(Employee.email == current_user.email)
            .first()
        )

        if employee is None:
            return []

        query = query.filter(Attendance.employee_id == employee.id)
    elif employee_id is not None:
        query = query.filter(Attendance.employee_id == employee_id)

    if start_date is not None:
        query = query.filter(Attendance.attendance_date >= start_date)

    if end_date is not None:
        query = query.filter(Attendance.attendance_date <= end_date)

    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be after end_date",
        )

    return (
        query.order_by(Attendance.attendance_date.desc(), Attendance.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/summary")
def attendance_summary(
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR", "MANAGER")),
):
    query = db.query(Attendance)

    if start_date is not None:
        query = query.filter(Attendance.attendance_date >= start_date)

    if end_date is not None:
        query = query.filter(Attendance.attendance_date <= end_date)

    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be after end_date",
        )

    records = query.all()
    total_hours = 0.0
    completed_records = 0

    for record in records:
        if record.check_in and record.check_out:
            check_in_time = record.check_in
            check_out_time = record.check_out

            if check_in_time.tzinfo is None:
                check_in_time = check_in_time.replace(tzinfo=timezone.utc)

            if check_out_time.tzinfo is None:
                check_out_time = check_out_time.replace(tzinfo=timezone.utc)

            duration = (
                check_out_time - check_in_time
            ).total_seconds() / 3600

            if duration >= 0:
                total_hours += duration
                completed_records += 1

    return {
        "total_records": len(records),
        "completed_records": completed_records,
        "incomplete_records": len(records) - completed_records,
        "total_worked_hours": round(total_hours, 2),
        "average_hours_per_completed_record": round(
            total_hours / completed_records, 2
        ) if completed_records else 0,
    }
