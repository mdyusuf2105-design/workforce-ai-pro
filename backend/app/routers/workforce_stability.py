from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.models.attrition_prediction import AttritionPredictionRecord
from app.routers.auth import require_roles

router = APIRouter(
    prefix="/api/workforce-stability",
    tags=["Workforce Stability Engine"],
)

HR_ROLES = ("ADMIN", "HR", "MANAGER")


def get_probability(prediction):
    for field in (
        "attrition_probability",
        "probability",
        "risk_probability",
        "risk_score",
    ):
        value = getattr(prediction, field, None)

        if value is None:
            continue

        try:
            number = float(value)

            if 0 <= number <= 1:
                return number

            if 1 < number <= 100:
                return number / 100

        except (ValueError, TypeError):
            continue

    return None


def latest_predictions(db, employee_ids):
    if not employee_ids:
        return {}

    rows = (
        db.query(AttritionPredictionRecord)
        .filter(
            AttritionPredictionRecord.employee_id.in_(employee_ids)
        )
        .order_by(AttritionPredictionRecord.id.desc())
        .all()
    )

    latest = {}

    for row in rows:
        employee_id = row.employee_id

        if employee_id not in latest:
            latest[employee_id] = row

    return latest


@router.get("/overview")
def stability_overview(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*HR_ROLES)),
):
    employees = db.query(Employee).all()
    employee_ids = [employee.id for employee in employees]
    predictions = latest_predictions(db, employee_ids)

    high = 0
    medium = 0
    low = 0
    unavailable = 0

    department_stats = defaultdict(
        lambda: {
            "employees": 0,
            "high_risk": 0,
            "medium_risk": 0,
            "low_risk": 0,
            "unavailable": 0,
            "risk_total": 0.0,
            "risk_count": 0,
        }
    )

    for employee in employees:
        department = (
            getattr(employee, "department", None) or "Unassigned"
        )

        stats = department_stats[str(department)]
        stats["employees"] += 1

        prediction = predictions.get(employee.id)

        if prediction is None:
            unavailable += 1
            stats["unavailable"] += 1
            continue

        probability = get_probability(prediction)

        if probability is None:
            unavailable += 1
            stats["unavailable"] += 1
            continue

        stats["risk_total"] += probability
        stats["risk_count"] += 1

        if probability >= 0.70:
            high += 1
            stats["high_risk"] += 1
        elif probability >= 0.40:
            medium += 1
            stats["medium_risk"] += 1
        else:
            low += 1
            stats["low_risk"] += 1

    department_results = []

    for name, stats in sorted(department_stats.items()):
        count = stats.pop("risk_count")
        total = stats.pop("risk_total")

        stats["average_predicted_risk"] = (
            round(total / count, 4) if count else None
        )

        department_results.append({
            "department": name,
            **stats,
        })

    assessed = high + medium + low

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "total_employees": len(employees),
        "employees_assessed": assessed,
        "high_risk": high,
        "medium_risk": medium,
        "low_risk": low,
        "risk_unavailable": unavailable,
        "stability_rate_percent": (
            round((low / assessed) * 100, 2) if assessed else None
        ),
        "departments": department_results,
        "interpretation": (
            "Stability rate is the percentage of assessed employees "
            "whose latest available model risk is below 40%. "
            "It is not a measure of actual employee retention."
        ),
    }


@router.get("/retention-priorities")
def retention_priorities(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*HR_ROLES)),
):
    limit = max(1, min(limit, 100))

    employees = db.query(Employee).all()
    employee_ids = [employee.id for employee in employees]
    predictions = latest_predictions(db, employee_ids)

    priorities = []

    for employee in employees:
        prediction = predictions.get(employee.id)

        if prediction is None:
            continue

        probability = get_probability(prediction)

        if probability is None or probability < 0.40:
            continue

        priorities.append({
            "employee_id": employee.id,
            "employee_name": (
                getattr(employee, "full_name", None)
                or getattr(employee, "name", None)
            ),
            "department": (
                getattr(employee, "department", None)
                or "Unassigned"
            ),
            "predicted_risk": round(probability, 4),
            "risk_level": (
                "HIGH" if probability >= 0.70 else "MEDIUM"
            ),
            "suggested_action": (
                "Consider a confidential retention discussion"
                if probability >= 0.70
                else "Review engagement and development needs"
            ),
        })

    priorities.sort(
        key=lambda item: item["predicted_risk"],
        reverse=True,
    )

    return {
        "count": min(len(priorities), limit),
        "items": priorities[:limit],
        "disclaimer": (
            "Risk scores are estimates, not facts about employee intentions. "
            "Review the underlying data and speak with employees before "
            "making employment decisions."
        ),
    }
