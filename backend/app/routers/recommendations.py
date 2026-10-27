from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.models.performance_review import PerformanceReview
from app.models.attrition_prediction import AttritionPredictionRecord
from app.routers.auth import get_current_user, require_roles

router = APIRouter(
    prefix="/api/recommendations",
    tags=["AI HR Recommendations"],
)

HR_ROLES = ("ADMIN", "HR", "MANAGER")


def get_risk_probability(prediction: Any) -> float | None:
    """Read the prediction probability without assuming a particular column name."""
    for field in (
        "attrition_probability",
        "probability",
        "risk_probability",
        "risk_score",
    ):
        value = getattr(prediction, field, None)
        if value is not None:
            try:
                number = float(value)
                if 0 <= number <= 1:
                    return number
                if 1 < number <= 100:
                    return number / 100
            except (TypeError, ValueError):
                continue
    return None


def build_recommendations(
    employee: Employee,
    prediction: Any | None,
    review: PerformanceReview | None,
) -> list[dict]:
    recommendations = []

    if prediction is None:
        recommendations.append({
            "category": "DATA",
            "priority": "MEDIUM",
            "title": "Generate an attrition risk prediction",
            "reason": "No attrition prediction was found for this employee.",
            "action": "Collect the required workforce data and run the attrition prediction endpoint.",
        })
    else:
        probability = get_risk_probability(prediction)

        if probability is not None and probability >= 0.70:
            recommendations.append({
                "category": "RETENTION",
                "priority": "HIGH",
                "title": "Consider a confidential retention discussion",
                "reason": f"The latest model estimate is {probability:.0%}.",
                "action": "Arrange a voluntary check-in to understand concerns, career goals, workload, and support needs.",
            })
        elif probability is not None and probability >= 0.40:
            recommendations.append({
                "category": "RETENTION",
                "priority": "MEDIUM",
                "title": "Review employee engagement",
                "reason": f"The latest model estimate is {probability:.0%}.",
                "action": "Discuss job satisfaction, development opportunities, workload, and any support the employee needs.",
            })
        elif probability is not None:
            recommendations.append({
                "category": "RETENTION",
                "priority": "LOW",
                "title": "Continue regular employee engagement",
                "reason": f"The latest model estimate is {probability:.0%}.",
                "action": "Maintain regular check-ins and review employee development goals.",
            })
        else:
            recommendations.append({
                "category": "DATA",
                "priority": "MEDIUM",
                "title": "Review prediction output",
                "reason": "A prediction exists, but its probability field could not be identified.",
                "action": "Check the prediction response schema and confirm that it exposes a probability or risk score.",
            })

    if review is None:
        recommendations.append({
            "category": "PERFORMANCE",
            "priority": "MEDIUM",
            "title": "Schedule a performance review",
            "reason": "No published performance review was found.",
            "action": "Arrange a review to discuss achievements, development goals, feedback, and support needs.",
        })
    else:
        rating = getattr(review, "rating", None)

        if rating is not None and float(rating) <= 2:
            recommendations.append({
                "category": "DEVELOPMENT",
                "priority": "MEDIUM",
                "title": "Offer additional development support",
                "reason": f"The latest published review rating is {rating}/5.",
                "action": "Discuss the employee's goals and offer appropriate coaching, training, and resources.",
            })
        elif rating is not None and float(rating) >= 4:
            recommendations.append({
                "category": "DEVELOPMENT",
                "priority": "LOW",
                "title": "Discuss career growth opportunities",
                "reason": f"The latest published review rating is {rating}/5.",
                "action": "Explore career interests, recognition, mentoring, and relevant development opportunities.",
            })

    if not recommendations:
        recommendations.append({
            "category": "ENGAGEMENT",
            "priority": "LOW",
            "title": "Continue routine employee check-ins",
            "reason": "No specific recommendation was triggered by the available signals.",
            "action": "Continue regular feedback conversations and review development goals.",
        })

    return recommendations


def latest_prediction(db: Session, employee_id: int):
    query = db.query(AttritionPredictionRecord).filter(
        AttritionPredictionRecord.employee_id == employee_id
    )

    if hasattr(AttritionPredictionRecord, "created_at"):
        query = query.order_by(AttritionPredictionRecord.created_at.desc())

    return query.first()


def latest_published_review(db: Session, employee_id: int):
    query = db.query(PerformanceReview).filter(
        PerformanceReview.employee_id == employee_id,
        PerformanceReview.status.in_(["PUBLISHED", "ACKNOWLEDGED"]),
    )

    if hasattr(PerformanceReview, "review_date"):
        query = query.order_by(PerformanceReview.review_date.desc())

    return query.first()


@router.get("/overview")
def recommendations_overview(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*HR_ROLES)),
):
    employees = db.query(Employee).all()

    high_risk = 0
    medium_risk = 0
    missing_predictions = 0
    missing_reviews = 0

    for employee in employees:
        prediction = latest_prediction(db, employee.id)
        review = latest_published_review(db, employee.id)

        if prediction is None:
            missing_predictions += 1
        else:
            probability = get_risk_probability(prediction)
            if probability is not None and probability >= 0.70:
                high_risk += 1
            elif probability is not None and probability >= 0.40:
                medium_risk += 1

        if review is None:
            missing_reviews += 1

    return {
        "total_employees": len(employees),
        "high_risk_employees": high_risk,
        "medium_risk_employees": medium_risk,
        "employees_without_predictions": missing_predictions,
        "employees_without_published_reviews": missing_reviews,
        "generated_at": datetime.utcnow().isoformat(),
        "note": "Recommendations support HR review and should not be used as the sole basis for employment decisions.",
    }


@router.get("/employee/{employee_id}")
def employee_recommendations(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()

    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")

    role = str(getattr(current_user, "role", "")).upper()
    user_id = getattr(current_user, "id", None)
    user_email = getattr(current_user, "email", None)
    employee_email = getattr(employee, "email", None)

    is_hr = role in HR_ROLES
    is_owner = (
        user_id is not None
        and getattr(employee, "user_id", None) == user_id
    ) or (
        user_email is not None
        and employee_email is not None
        and user_email.lower() == employee_email.lower()
    )

    if not is_hr and not is_owner:
        raise HTTPException(
            status_code=403,
            detail="You can only view your own recommendations",
        )

    prediction = latest_prediction(db, employee.id)
    review = latest_published_review(db, employee.id)

    return {
        "employee_id": employee.id,
        "employee_name": getattr(employee, "full_name", None)
        or getattr(employee, "name", None),
        "recommendations": build_recommendations(employee, prediction, review),
        "generated_at": datetime.utcnow().isoformat(),
        "disclaimer": (
            "These are rule-based suggestions from available records, not definitive "
            "AI conclusions. HR should verify the evidence and discuss relevant "
            "concerns with the employee before taking action."
        ),
    }


@router.get("/")
def list_employee_recommendations(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*HR_ROLES)),
):
    employees = db.query(Employee).limit(limit).all()
    results = []

    for employee in employees:
        prediction = latest_prediction(db, employee.id)
        review = latest_published_review(db, employee.id)
        recommendations = build_recommendations(employee, prediction, review)

        results.append({
            "employee_id": employee.id,
            "employee_name": getattr(employee, "full_name", None)
            or getattr(employee, "name", None),
            "recommendations": recommendations,
        })

    return {
        "count": len(results),
        "items": results,
        "generated_at": datetime.utcnow().isoformat(),
    }
