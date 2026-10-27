from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.attrition_prediction import AttritionPredictionRecord
from app.models.employee import Employee
from app.models.notification import Notification
from app.models.user import User
from app.routers.auth import require_roles

router = APIRouter(
    prefix="/api/risk-monitoring",
    tags=["Employee Risk Monitoring"],
)


@router.get("/summary")
def risk_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    latest_ids = (
        db.query(
            AttritionPredictionRecord.employee_id,
            __import__("sqlalchemy").func.max(
                AttritionPredictionRecord.id
            ).label("latest_id"),
        )
        .group_by(AttritionPredictionRecord.employee_id)
        .subquery()
    )

    latest_records = (
        db.query(AttritionPredictionRecord)
        .join(latest_ids, AttritionPredictionRecord.id == latest_ids.c.latest_id)
        .all()
    )

    high = sum(record.risk_level == "HIGH" for record in latest_records)
    medium = sum(record.risk_level == "MEDIUM" for record in latest_records)
    low = sum(record.risk_level == "LOW" for record in latest_records)

    return {
        "employees_with_predictions": len(latest_records),
        "high_risk": high,
        "medium_risk": medium,
        "low_risk": low,
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("/employees")
def monitored_employees(
    risk_level: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    if risk_level and risk_level.upper() not in {"LOW", "MEDIUM", "HIGH"}:
        raise HTTPException(
            status_code=400,
            detail="risk_level must be LOW, MEDIUM, or HIGH",
        )

    latest_ids = (
        db.query(
            AttritionPredictionRecord.employee_id,
            __import__("sqlalchemy").func.max(
                AttritionPredictionRecord.id
            ).label("latest_id"),
        )
        .group_by(AttritionPredictionRecord.employee_id)
        .subquery()
    )

    records = (
        db.query(AttritionPredictionRecord, Employee)
        .join(latest_ids, AttritionPredictionRecord.id == latest_ids.c.latest_id)
        .join(Employee, Employee.id == AttritionPredictionRecord.employee_id)
        .filter(Employee.employment_status == "ACTIVE")
        .order_by(AttritionPredictionRecord.risk_probability.desc())
        .limit(limit)
        .all()
    )

    if risk_level:
        records = [
            (record, employee)
            for record, employee in records
            if record.risk_level == risk_level.upper()
        ]

    return [
        {
            "employee_id": employee.id,
            "employee_name": employee.full_name,
            "employee_code": employee.employee_code,
            "department": employee.department,
            "job_title": employee.job_title,
            "risk_probability": record.risk_probability,
            "risk_percentage": round(record.risk_probability * 100, 2),
            "risk_level": record.risk_level,
            "last_prediction_at": record.created_at.isoformat(),
        }
        for record, employee in records
    ]


@router.get("/employees/{employee_id}/history")
def employee_risk_history(
    employee_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    records = (
        db.query(AttritionPredictionRecord)
        .filter(AttritionPredictionRecord.employee_id == employee_id)
        .order_by(AttritionPredictionRecord.created_at.desc())
        .limit(limit)
        .all()
    )

    history = []
    for index, record in enumerate(records):
        previous = records[index + 1] if index + 1 < len(records) else None
        previous_probability = (
            previous.risk_probability if previous is not None else None
        )

        history.append({
            "prediction_id": record.id,
            "risk_probability": record.risk_probability,
            "risk_percentage": round(record.risk_probability * 100, 2),
            "risk_level": record.risk_level,
            "previous_risk_probability": previous_probability,
            "risk_change": (
                round(record.risk_probability - previous_probability, 4)
                if previous_probability is not None
                else None
            ),
            "created_at": record.created_at.isoformat(),
        })

    return {
        "employee_id": employee.id,
        "employee_name": employee.full_name,
        "history": history,
    }


@router.get("/alerts")
def high_risk_alerts(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    cutoff = datetime.utcnow() - timedelta(days=days)

    records = (
        db.query(AttritionPredictionRecord, Employee)
        .join(Employee, Employee.id == AttritionPredictionRecord.employee_id)
        .filter(
            AttritionPredictionRecord.risk_level == "HIGH",
            AttritionPredictionRecord.created_at >= cutoff,
            Employee.employment_status == "ACTIVE",
        )
        .order_by(AttritionPredictionRecord.created_at.desc())
        .limit(200)
        .all()
    )

    return [
        {
            "prediction_id": record.id,
            "employee_id": employee.id,
            "employee_name": employee.full_name,
            "department": employee.department,
            "risk_probability": record.risk_probability,
            "risk_percentage": round(record.risk_probability * 100, 2),
            "created_at": record.created_at.isoformat(),
            "alert_type": "HIGH_ATTRITION_RISK",
            "suggested_action": (
                "Arrange a confidential, supportive check-in and review "
                "workload, development opportunities, and employee feedback."
            ),
        }
        for record, employee in records
    ]


@router.post("/alerts/{prediction_id}/notify")
def notify_high_risk(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    record = (
        db.query(AttritionPredictionRecord)
        .filter(AttritionPredictionRecord.id == prediction_id)
        .first()
    )

    if not record:
        raise HTTPException(status_code=404, detail="Prediction not found")

    if record.risk_level != "HIGH":
        raise HTTPException(
            status_code=400,
            detail="Notifications can only be created for HIGH-risk predictions.",
        )

    employee = db.query(Employee).filter(
        Employee.id == record.employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    notification = Notification(
        user_id=current_user.id,
        title="High Attrition Risk Alert",
        message=(
            f"Employee {employee.full_name} (ID {employee.id}) has a "
            f"model-estimated attrition risk of "
            f"{record.risk_probability * 100:.1f}%. "
            "Review the situation with appropriate care."
        ),
        category="ATTRITION_RISK",
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return {
        "message": "Risk notification created.",
        "notification_id": notification.id,
        "employee_id": employee.id,
        "risk_level": record.risk_level,
    }
