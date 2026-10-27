from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.models.intervention import HRIntervention
from app.models.user import User
from app.routers.auth import get_current_user, require_roles

router = APIRouter(
    prefix="/api/interventions",
    tags=["HR Intervention and Decision Support"],
)

HR_ROLES = ("ADMIN", "HR", "MANAGER")
VALID_PRIORITIES = {"LOW", "MEDIUM", "HIGH", "URGENT"}
VALID_STATUSES = {"OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"}


class InterventionCreate(BaseModel):
    employee_id: int = Field(gt=0)
    prediction_id: int | None = Field(default=None, gt=0)
    assigned_to: int | None = Field(default=None, gt=0)
    intervention_type: str = Field(min_length=2, max_length=80)
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=3)
    priority: str = "MEDIUM"
    action_plan: str | None = None
    due_date: date | None = None


class InterventionUpdate(BaseModel):
    assigned_to: int | None = None
    priority: str | None = None
    status: str | None = None
    action_plan: str | None = None
    outcome_notes: str | None = None
    due_date: date | None = None


def intervention_response(item, employee=None):
    return {
        "id": item.id,
        "employee_id": item.employee_id,
        "employee_name": employee.full_name if employee else None,
        "prediction_id": item.prediction_id,
        "created_by": item.created_by,
        "assigned_to": item.assigned_to,
        "intervention_type": item.intervention_type,
        "title": item.title,
        "description": item.description,
        "priority": item.priority,
        "status": item.status,
        "action_plan": item.action_plan,
        "outcome_notes": item.outcome_notes,
        "due_date": item.due_date.isoformat() if item.due_date else None,
        "completed_at": item.completed_at.isoformat() if item.completed_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


@router.post("/", status_code=201)
def create_intervention(
    data: InterventionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*HR_ROLES)),
):
    if data.priority.upper() not in VALID_PRIORITIES:
        raise HTTPException(status_code=400, detail="Invalid priority.")

    employee = db.query(Employee).filter(
        Employee.id == data.employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")

    if data.assigned_to is not None:
        assignee = db.query(User).filter(
            User.id == data.assigned_to,
            User.is_active.is_(True),
        ).first()

        if not assignee:
            raise HTTPException(status_code=404, detail="Active assignee not found.")

    if data.prediction_id is not None:
        from app.models.attrition_prediction import AttritionPredictionRecord

        prediction = db.query(AttritionPredictionRecord).filter(
            AttritionPredictionRecord.id == data.prediction_id,
            AttritionPredictionRecord.employee_id == data.employee_id,
        ).first()

        if not prediction:
            raise HTTPException(
                status_code=400,
                detail="Prediction does not belong to this employee.",
            )

    item = HRIntervention(
        employee_id=data.employee_id,
        prediction_id=data.prediction_id,
        created_by=current_user.id,
        assigned_to=data.assigned_to,
        intervention_type=data.intervention_type.strip(),
        title=data.title.strip(),
        description=data.description.strip(),
        priority=data.priority.upper(),
        status="OPEN",
        action_plan=data.action_plan,
        due_date=data.due_date,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return intervention_response(item, employee)


@router.get("/")
def list_interventions(
    status: str | None = Query(default=None),
    employee_id: int | None = Query(default=None, gt=0),
    priority: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*HR_ROLES)),
):
    query = (
        db.query(HRIntervention, Employee)
        .join(Employee, Employee.id == HRIntervention.employee_id)
    )

    if status:
        if status.upper() not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status.")
        query = query.filter(HRIntervention.status == status.upper())

    if priority:
        if priority.upper() not in VALID_PRIORITIES:
            raise HTTPException(status_code=400, detail="Invalid priority.")
        query = query.filter(HRIntervention.priority == priority.upper())

    if employee_id is not None:
        query = query.filter(HRIntervention.employee_id == employee_id)

    rows = (
        query.order_by(HRIntervention.created_at.desc())
        .limit(limit)
        .all()
    )

    return [intervention_response(item, employee) for item, employee in rows]


@router.get("/summary")
def intervention_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*HR_ROLES)),
):
    items = db.query(HRIntervention).all()
    today = date.today()

    return {
        "total": len(items),
        "open": sum(item.status == "OPEN" for item in items),
        "in_progress": sum(item.status == "IN_PROGRESS" for item in items),
        "completed": sum(item.status == "COMPLETED" for item in items),
        "cancelled": sum(item.status == "CANCELLED" for item in items),
        "overdue": sum(
            item.due_date is not None
            and item.due_date < today
            and item.status not in {"COMPLETED", "CANCELLED"}
            for item in items
        ),
        "high_priority": sum(
            item.priority in {"HIGH", "URGENT"}
            and item.status not in {"COMPLETED", "CANCELLED"}
            for item in items
        ),
    }


@router.get("/{intervention_id}")
def get_intervention(
    intervention_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*HR_ROLES)),
):
    result = (
        db.query(HRIntervention, Employee)
        .join(Employee, Employee.id == HRIntervention.employee_id)
        .filter(HRIntervention.id == intervention_id)
        .first()
    )

    if not result:
        raise HTTPException(status_code=404, detail="Intervention not found.")

    item, employee = result
    return intervention_response(item, employee)


@router.patch("/{intervention_id}")
def update_intervention(
    intervention_id: int,
    data: InterventionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*HR_ROLES)),
):
    item = db.query(HRIntervention).filter(
        HRIntervention.id == intervention_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Intervention not found.")

    changes = data.model_dump(exclude_unset=True)

    if "status" in changes and changes["status"] is not None:
        changes["status"] = changes["status"].upper()
        if changes["status"] not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status.")

    if "priority" in changes and changes["priority"] is not None:
        changes["priority"] = changes["priority"].upper()
        if changes["priority"] not in VALID_PRIORITIES:
            raise HTTPException(status_code=400, detail="Invalid priority.")

    if "assigned_to" in changes and changes["assigned_to"] is not None:
        assignee = db.query(User).filter(
            User.id == changes["assigned_to"],
            User.is_active.is_(True),
        ).first()
        if not assignee:
            raise HTTPException(status_code=404, detail="Active assignee not found.")

    for key, value in changes.items():
        setattr(item, key, value)

    if item.status == "COMPLETED":
        item.completed_at = datetime.utcnow()
    elif "status" in changes:
        item.completed_at = None

    db.commit()
    db.refresh(item)

    employee = db.query(Employee).filter(
        Employee.id == item.employee_id
    ).first()

    return intervention_response(item, employee)


@router.delete("/{intervention_id}")
def delete_intervention(
    intervention_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    item = db.query(HRIntervention).filter(
        HRIntervention.id == intervention_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Intervention not found.")

    db.delete(item)
    db.commit()

    return {"message": "Intervention deleted successfully."}
