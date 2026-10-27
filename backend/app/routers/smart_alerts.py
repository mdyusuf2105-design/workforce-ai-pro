from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.attrition_prediction import AttritionPredictionRecord
from app.models.employee import Employee
from app.models.notification import Notification
from app.models.user import User
from app.routers.auth import require_roles
from app.services.smart_notifications import (
    escalate_overdue_interventions,
    notify_hr_team,
)

router = APIRouter(
    prefix="/api/smart-alerts",
    tags=["Smart Notifications and Escalation"],
)

HR_ROLES = ("ADMIN", "HR", "MANAGER")


@router.get("/overview")
def smart_alert_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*HR_ROLES)),
):
    active_employees = db.query(Employee).filter(
        Employee.employment_status == "ACTIVE"
    ).count()

    recent_cutoff = datetime.utcnow() - timedelta(days=30)

    recent_high_risk = db.query(
        AttritionPredictionRecord
    ).filter(
        AttritionPredictionRecord.risk_level == "HIGH",
        AttritionPredictionRecord.created_at >= recent_cutoff,
    ).count()

    unread_alerts = db.query(Notification).filter(
        Notification.is_read.is_(False),
        Notification.category.in_([
            "HR_ALERT",
            "INTERVENTION_ESCALATION",
            "ATTRITION_ALERT",
        ]),
    ).count()

    return {
        "active_employees": active_employees,
        "high_risk_predictions_last_30_days": recent_high_risk,
        "unread_hr_alerts": unread_alerts,
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.post("/high-risk/{prediction_id}/notify")
def notify_high_risk_prediction(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*HR_ROLES)),
):
    prediction = db.query(
        AttritionPredictionRecord
    ).filter(
        AttritionPredictionRecord.id == prediction_id
    ).first()

    if not prediction:
        raise HTTPException(
            status_code=404,
            detail="Attrition prediction not found.",
        )

    if prediction.risk_level != "HIGH":
        raise HTTPException(
            status_code=400,
            detail="This prediction is not classified as high risk.",
        )

    employee = db.query(Employee).filter(
        Employee.id == prediction.employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Associated employee not found.",
        )

    title = f"High attrition risk: {employee.full_name}"
    message = (
        f"A high attrition-risk prediction requires HR review for "
        f"employee {employee.full_name} (employee ID: {employee.id}). "
        f"Recorded risk probability: "
        f"{prediction.risk_probability:.1%}. "
        "Review the available evidence before deciding on any action."
    )

    created = notify_hr_team(
        db=db,
        title=title,
        message=message,
        category="ATTRITION_ALERT",
    )

    if created:
        db.commit()

    return {
        "message": "High-risk notification processed.",
        "employee_id": employee.id,
        "notifications_created": len(created),
    }


@router.post("/escalate-overdue")
def escalate_overdue(
    overdue_days: int = Query(default=3, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    return escalate_overdue_interventions(
        db=db,
        overdue_days=overdue_days,
    )


@router.get("/high-risk")
def list_recent_high_risk(
    days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*HR_ROLES)),
):
    cutoff = datetime.utcnow() - timedelta(days=days)

    rows = (
        db.query(AttritionPredictionRecord, Employee)
        .join(
            Employee,
            Employee.id == AttritionPredictionRecord.employee_id,
        )
        .filter(
            AttritionPredictionRecord.risk_level == "HIGH",
            AttritionPredictionRecord.created_at >= cutoff,
        )
        .order_by(
            AttritionPredictionRecord.created_at.desc()
        )
        .limit(limit)
        .all()
    )

    return [
        {
            "prediction_id": prediction.id,
            "employee_id": employee.id,
            "employee_name": employee.full_name,
            "department": employee.department,
            "risk_level": prediction.risk_level,
            "risk_probability": prediction.risk_probability,
            "created_at": (
                prediction.created_at.isoformat()
                if prediction.created_at else None
            ),
        }
        for prediction, employee in rows
    ]
