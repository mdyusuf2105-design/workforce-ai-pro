from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.models.attrition_prediction import AttritionPredictionRecord
from app.models.department import Department
from app.routers.auth import require_roles

router = APIRouter(
    prefix="/api/forecasting",
    tags=["Workforce Forecasting"],
)


@router.get("/overview")
def forecasting_overview(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("ADMIN", "HR")),
):
    today = date.today()
    first_day = today.replace(day=1)

    active_employees = db.query(func.count(Employee.id)).filter(
        Employee.employment_status == "ACTIVE"
    ).scalar() or 0

    total_employees = db.query(func.count(Employee.id)).scalar() or 0

    departments = db.query(func.count(Department.id)).filter(
        Department.is_active.is_(True)
    ).scalar() or 0

    current_month_predictions = db.query(
        func.count(AttritionPredictionRecord.id)
    ).filter(
        AttritionPredictionRecord.created_at >= first_day
    ).scalar() or 0

    high_risk_predictions = db.query(
        func.count(AttritionPredictionRecord.id)
    ).filter(
        AttritionPredictionRecord.created_at >= first_day,
        AttritionPredictionRecord.risk_level == "HIGH",
    ).scalar() or 0

    return {
        "as_of": today.isoformat(),
        "active_employees": active_employees,
        "total_employees": total_employees,
        "active_departments": departments,
        "predictions_this_month": current_month_predictions,
        "high_risk_predictions_this_month": high_risk_predictions,
        "note": (
            "These figures summarize current records and model predictions. "
            "They are not a validated forecast of future resignations."
        ),
    }


@router.get("/monthly")
def monthly_workforce_trend(
    months: int = Query(default=12, ge=1, le=60),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("ADMIN", "HR")),
):
    today = date.today()
    first_month = today.replace(day=1)

    # Generate a calendar month sequence, including months with no records.
    month_starts = []
    year = first_month.year
    month = first_month.month

    for _ in range(months):
        month_starts.append(date(year, month, 1))
        month -= 1
        if month == 0:
            month = 12
            year -= 1

    month_starts.reverse()
    results = []

    for month_start in month_starts:
        if month_start.month == 12:
            next_month = date(month_start.year + 1, 1, 1)
        else:
            next_month = date(month_start.year, month_start.month + 1, 1)

        joined = db.query(func.count(Employee.id)).filter(
            Employee.joining_date >= month_start,
            Employee.joining_date < next_month,
        ).scalar() or 0

        # The existing employee table does not record a reliable exit date,
        # so actual monthly departures cannot be calculated here.
        predictions = db.query(
            func.count(AttritionPredictionRecord.id)
        ).filter(
            AttritionPredictionRecord.created_at >= month_start,
            AttritionPredictionRecord.created_at < next_month,
        ).scalar() or 0

        high_risk = db.query(
            func.count(AttritionPredictionRecord.id)
        ).filter(
            AttritionPredictionRecord.created_at >= month_start,
            AttritionPredictionRecord.created_at < next_month,
            AttritionPredictionRecord.risk_level == "HIGH",
        ).scalar() or 0

        results.append({
            "month": month_start.strftime("%Y-%m"),
            "employees_joined": joined,
            "predictions_generated": predictions,
            "high_risk_predictions": high_risk,
        })

    return {
        "months_requested": months,
        "history": results,
        "note": (
            "This is historical workforce activity, not a statistical "
            "forecast. Departure counts require an employee exit-date field."
        ),
    }


@router.get("/departments")
def department_workforce_summary(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("ADMIN", "HR")),
):
    departments = db.query(Department).all()
    results = []

    for department in departments:
        active_count = db.query(func.count(Employee.id)).filter(
            Employee.department == department.name,
            Employee.employment_status == "ACTIVE",
        ).scalar() or 0

        total_count = db.query(func.count(Employee.id)).filter(
            Employee.department == department.name,
        ).scalar() or 0

        latest_predictions = (
            db.query(
                AttritionPredictionRecord.employee_id,
                func.max(AttritionPredictionRecord.id).label("latest_id"),
            )
            .join(Employee, Employee.id == AttritionPredictionRecord.employee_id)
            .filter(Employee.department == department.name)
            .group_by(AttritionPredictionRecord.employee_id)
            .subquery()
        )

        high_risk_count = (
            db.query(func.count(AttritionPredictionRecord.id))
            .join(
                latest_predictions,
                AttritionPredictionRecord.id == latest_predictions.c.latest_id,
            )
            .filter(AttritionPredictionRecord.risk_level == "HIGH")
            .scalar()
        ) or 0

        results.append({
            "department_id": department.id,
            "department": department.name,
            "active": department.is_active,
            "active_employees": active_count,
            "total_employees": total_count,
            "employees_with_latest_high_risk": high_risk_count,
        })

    return results


@router.get("/yearly")
def yearly_workforce_summary(
    years: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("ADMIN", "HR")),
):
    current_year = date.today().year
    results = []

    for year in range(current_year - years + 1, current_year + 1):
        start = date(year, 1, 1)
        end = date(year + 1, 1, 1)

        joined = db.query(func.count(Employee.id)).filter(
            Employee.joining_date >= start,
            Employee.joining_date < end,
        ).scalar() or 0

        predictions = db.query(
            func.count(AttritionPredictionRecord.id)
        ).filter(
            AttritionPredictionRecord.created_at >= datetime(year, 1, 1),
            AttritionPredictionRecord.created_at < datetime(year + 1, 1, 1),
        ).scalar() or 0

        high_risk = db.query(
            func.count(AttritionPredictionRecord.id)
        ).filter(
            AttritionPredictionRecord.created_at >= datetime(year, 1, 1),
            AttritionPredictionRecord.created_at < datetime(year + 1, 1, 1),
            AttritionPredictionRecord.risk_level == "HIGH",
        ).scalar() or 0

        results.append({
            "year": year,
            "employees_joined": joined,
            "predictions_generated": predictions,
            "high_risk_predictions": high_risk,
        })

    return {
        "years_requested": years,
        "history": results,
        "note": (
            "Historical activity only. Reliable future headcount and "
            "attrition forecasting requires historical exit dates and "
            "validated forecasting data."
        ),
    }
