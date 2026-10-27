from datetime import date, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.attrition_prediction import AttritionPredictionRecord
from app.models.employee import Employee
from app.routers.auth import require_roles

router = APIRouter(
    prefix="/api/attrition-analytics",
    tags=["Attrition Analytics"],
)


def latest_prediction_subquery(db: Session):
    return (
        db.query(
            AttritionPredictionRecord.employee_id,
            func.max(AttritionPredictionRecord.id).label("latest_id"),
        )
        .group_by(AttritionPredictionRecord.employee_id)
        .subquery()
    )


@router.get("/overview")
def analytics_overview(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("ADMIN", "HR")),
):
    latest = latest_prediction_subquery(db)

    latest_records = (
        db.query(AttritionPredictionRecord)
        .join(latest, AttritionPredictionRecord.id == latest.c.latest_id)
        .all()
    )

    total = len(latest_records)
    high = sum(record.risk_level == "HIGH" for record in latest_records)
    medium = sum(record.risk_level == "MEDIUM" for record in latest_records)
    low = sum(record.risk_level == "LOW" for record in latest_records)

    average_risk = (
        sum(record.risk_probability for record in latest_records) / total
        if total else 0
    )

    active_employees = (
        db.query(func.count(Employee.id))
        .filter(Employee.employment_status == "ACTIVE")
        .scalar()
        or 0
    )

    return {
        "active_employees": active_employees,
        "employees_with_predictions": total,
        "high_risk": high,
        "medium_risk": medium,
        "low_risk": low,
        "average_risk_probability": round(average_risk, 4),
        "average_risk_percentage": round(average_risk * 100, 2),
        "high_risk_percentage": round(high / total * 100, 2) if total else 0,
        "generated_at": datetime.utcnow().isoformat(),
        "disclaimer": (
            "Results summarize model estimates, not verified employee "
            "resignation outcomes."
        ),
    }


@router.get("/departments")
def department_analytics(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("ADMIN", "HR")),
):
    latest = latest_prediction_subquery(db)

    rows = (
        db.query(AttritionPredictionRecord, Employee)
        .join(latest, AttritionPredictionRecord.id == latest.c.latest_id)
        .join(Employee, Employee.id == AttritionPredictionRecord.employee_id)
        .filter(Employee.employment_status == "ACTIVE")
        .all()
    )

    grouped = {}

    for record, employee in rows:
        department = employee.department or "Unassigned"

        if department not in grouped:
            grouped[department] = {
                "department": department,
                "employees_with_predictions": 0,
                "high_risk": 0,
                "medium_risk": 0,
                "low_risk": 0,
                "probabilities": [],
            }

        item = grouped[department]
        item["employees_with_predictions"] += 1
        item["probabilities"].append(record.risk_probability)

        if record.risk_level == "HIGH":
            item["high_risk"] += 1
        elif record.risk_level == "MEDIUM":
            item["medium_risk"] += 1
        else:
            item["low_risk"] += 1

    results = []

    for item in grouped.values():
        probabilities = item.pop("probabilities")
        average = sum(probabilities) / len(probabilities) if probabilities else 0

        item["average_risk_probability"] = round(average, 4)
        item["average_risk_percentage"] = round(average * 100, 2)
        results.append(item)

    return sorted(
        results,
        key=lambda item: item["average_risk_probability"],
        reverse=True,
    )


@router.get("/monthly-trends")
def monthly_analytics(
    months: int = Query(default=12, ge=1, le=36),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("ADMIN", "HR")),
):
    today = date.today()
    year = today.year
    month = today.month
    month_starts = []

    for _ in range(months):
        month_starts.append(date(year, month, 1))
        month -= 1

        if month == 0:
            month = 12
            year -= 1

    month_starts.reverse()
    results = []

    for start in month_starts:
        end = (
            date(start.year + 1, 1, 1)
            if start.month == 12
            else date(start.year, start.month + 1, 1)
        )

        records = (
            db.query(AttritionPredictionRecord)
            .filter(
                AttritionPredictionRecord.created_at >= datetime(
                    start.year, start.month, 1
                ),
                AttritionPredictionRecord.created_at < datetime(
                    end.year, end.month, end.day
                ),
            )
            .all()
        )

        high = sum(record.risk_level == "HIGH" for record in records)
        medium = sum(record.risk_level == "MEDIUM" for record in records)
        low = sum(record.risk_level == "LOW" for record in records)

        average = (
            sum(record.risk_probability for record in records) / len(records)
            if records else 0
        )

        results.append({
            "month": start.strftime("%Y-%m"),
            "predictions": len(records),
            "high_risk": high,
            "medium_risk": medium,
            "low_risk": low,
            "average_risk_percentage": round(average * 100, 2),
        })

    return {
        "months_requested": months,
        "history": results,
        "note": (
            "Monthly figures represent predictions generated during each "
            "month, not actual employee departures."
        ),
    }


@router.get("/high-risk")
def high_risk_employees(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("ADMIN", "HR")),
):
    latest = latest_prediction_subquery(db)

    rows = (
        db.query(AttritionPredictionRecord, Employee)
        .join(latest, AttritionPredictionRecord.id == latest.c.latest_id)
        .join(Employee, Employee.id == AttritionPredictionRecord.employee_id)
        .filter(
            AttritionPredictionRecord.risk_level == "HIGH",
            Employee.employment_status == "ACTIVE",
        )
        .order_by(AttritionPredictionRecord.risk_probability.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "employee_id": employee.id,
            "employee_code": employee.employee_code,
            "employee_name": employee.full_name,
            "department": employee.department,
            "job_title": employee.job_title,
            "risk_probability": record.risk_probability,
            "risk_percentage": round(record.risk_probability * 100, 2),
            "last_prediction_at": record.created_at.isoformat(),
        }
        for record, employee in rows
    ]


@router.get("/risk-distribution")
def risk_distribution(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("ADMIN", "HR")),
):
    latest = latest_prediction_subquery(db)

    rows = (
        db.query(AttritionPredictionRecord.risk_level, func.count())
        .join(latest, AttritionPredictionRecord.id == latest.c.latest_id)
        .group_by(AttritionPredictionRecord.risk_level)
        .all()
    )

    counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}

    for level, count in rows:
        if level in counts:
            counts[level] = int(count)

    return {
        "labels": list(counts.keys()),
        "values": list(counts.values()),
        "total": sum(counts.values()),
    }
