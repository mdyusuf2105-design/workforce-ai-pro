from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.models.department import Department
from app.models.attendance import Attendance
from app.models.leave import LeaveRequest
from app.models.payroll import PayrollRecord
from app.models.attrition_prediction import AttritionPredictionRecord
from app.models.user import User
from app.routers.auth import get_current_user, require_roles

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard & Workforce Analytics"],
)


@router.get("/overview")
def dashboard_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR", "MANAGER")),
):
    total_employees = db.query(Employee).count()

    active_employees = db.query(Employee).filter(
        Employee.employment_status == "ACTIVE"
    ).count()

    inactive_employees = total_employees - active_employees

    department_count = db.query(Department).filter(
        Department.is_active.is_(True)
    ).count()

    pending_leaves = db.query(LeaveRequest).filter(
        LeaveRequest.status == "PENDING"
    ).count()

    approved_leaves = db.query(LeaveRequest).filter(
        LeaveRequest.status == "APPROVED"
    ).count()

    today = date.today()

    present_today = db.query(Attendance).filter(
        Attendance.attendance_date == today,
        Attendance.status == "PRESENT",
    ).count()

    absent_today = db.query(Attendance).filter(
        Attendance.attendance_date == today,
        Attendance.status == "ABSENT",
    ).count()

    late_today = db.query(Attendance).filter(
        Attendance.attendance_date == today,
        Attendance.status == "LATE",
    ).count()

    current_month = today.month
    current_year = today.year

    payroll_summary = db.query(
        func.count(PayrollRecord.id),
        func.coalesce(func.sum(PayrollRecord.gross_salary), 0),
        func.coalesce(func.sum(PayrollRecord.net_salary), 0),
    ).filter(
        PayrollRecord.month == current_month,
        PayrollRecord.year == current_year,
    ).first()

    payroll_status_counts = {
        "pending": db.query(PayrollRecord).filter(
            PayrollRecord.month == current_month,
            PayrollRecord.year == current_year,
            PayrollRecord.status == "PENDING",
        ).count(),
        "approved": db.query(PayrollRecord).filter(
            PayrollRecord.month == current_month,
            PayrollRecord.year == current_year,
            PayrollRecord.status == "APPROVED",
        ).count(),
        "paid": db.query(PayrollRecord).filter(
            PayrollRecord.month == current_month,
            PayrollRecord.year == current_year,
            PayrollRecord.status == "PAID",
        ).count(),
    }

    return {
        "employees": {
            "total": total_employees,
            "active": active_employees,
            "inactive": inactive_employees,
            "departments": department_count,
        },
        "attendance_today": {
            "date": today.isoformat(),
            "present": present_today,
            "absent": absent_today,
            "late": late_today,
        },
        "leave_management": {
            "pending_requests": pending_leaves,
            "approved_requests": approved_leaves,
        },
        "payroll": {
            "month": current_month,
            "year": current_year,
            "records": payroll_summary[0] or 0,
            "gross_total": float(payroll_summary[1] or 0),
            "net_total": float(payroll_summary[2] or 0),
            "status": payroll_status_counts,
        },
    }


@router.get("/departments")
def department_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR", "MANAGER")),
):
    departments = db.query(Department).order_by(Department.name).all()

    results = []

    for department in departments:
        employee_count = db.query(Employee).filter(
            Employee.department == department.name
        ).count()

        active_count = db.query(Employee).filter(
            Employee.department == department.name,
            Employee.employment_status == "ACTIVE",
        ).count()

        results.append({
            "department_id": department.id,
            "department": department.name,
            "code": department.code,
            "is_active": department.is_active,
            "total_employees": employee_count,
            "active_employees": active_count,
        })

    return results


@router.get("/attendance-trend")
def attendance_trend(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR", "MANAGER")),
):
    days = max(1, min(days, 90))
    start_date = date.today() - timedelta(days=days - 1)

    rows = db.query(
        Attendance.attendance_date,
        Attendance.status,
        func.count(Attendance.id),
    ).filter(
        Attendance.attendance_date >= start_date
    ).group_by(
        Attendance.attendance_date,
        Attendance.status,
    ).order_by(
        Attendance.attendance_date
    ).all()

    daily = {}

    for offset in range(days):
        day = start_date + timedelta(days=offset)
        daily[day.isoformat()] = {
            "date": day.isoformat(),
            "present": 0,
            "absent": 0,
            "late": 0,
            "other": 0,
        }

    for attendance_date, attendance_status, count in rows:
        key = attendance_date.isoformat()
        normalized_status = attendance_status.upper()

        if normalized_status in {"PRESENT", "ABSENT", "LATE"}:
            daily[key][normalized_status.lower()] += count
        else:
            daily[key]["other"] += count

    return list(daily.values())


@router.get("/leave-analytics")
def leave_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR", "MANAGER")),
):
    rows = db.query(
        LeaveRequest.leave_type,
        LeaveRequest.status,
        func.count(LeaveRequest.id),
    ).group_by(
        LeaveRequest.leave_type,
        LeaveRequest.status,
    ).all()

    results = {}

    for leave_type, leave_status, count in rows:
        if leave_type not in results:
            results[leave_type] = {
                "leave_type": leave_type,
                "pending": 0,
                "approved": 0,
                "rejected": 0,
                "cancelled": 0,
            }

        key = leave_status.lower()

        if key in results[leave_type]:
            results[leave_type][key] = count

    return list(results.values())


@router.get("/attrition-summary")
def attrition_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR", "MANAGER")),
):
    total_predictions = db.query(
        AttritionPredictionRecord
    ).count()

    return {
        "total_prediction_records": total_predictions,
        "message": (
            "Detailed attrition risk statistics depend on the fields "
            "available in the current prediction model."
        ),
    }
