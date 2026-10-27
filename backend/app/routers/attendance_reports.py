from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.attendance import Attendance
from app.models.employee import Employee
from app.models.shift import Shift
from app.models.user import User
from app.routers.auth import get_current_user, require_roles


router = APIRouter(prefix="/api/attendance", tags=["Attendance Reports"])

IST = ZoneInfo("Asia/Kolkata")
LATE_GRACE_MINUTES = 5


def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def attendance_metrics(record: Attendance, shift: Shift | None) -> dict:
    check_in = as_utc(record.check_in) if record.check_in else None
    check_out = as_utc(record.check_out) if record.check_out else None

    worked_hours = None
    scheduled_hours = None
    overtime_hours = None
    late_minutes = 0
    is_late = False

    if shift is not None:
        start = shift.start_time
        end = shift.end_time

        scheduled_duration = (
            datetime.combine(date.min, end)
            - datetime.combine(date.min, start)
        )

        if scheduled_duration.total_seconds() <= 0:
            scheduled_duration += timedelta(days=1)

        scheduled_duration -= timedelta(minutes=shift.break_minutes)
        scheduled_hours = max(0, scheduled_duration.total_seconds() / 3600)

        if check_in:
            local_check_in = check_in.astimezone(IST)
            scheduled_start = datetime.combine(
                record.attendance_date,
                start,
                tzinfo=IST,
            )
            difference = (
                local_check_in - scheduled_start
            ).total_seconds() / 60

            if difference > LATE_GRACE_MINUTES:
                is_late = True
                late_minutes = int(difference)

    if check_in and check_out and check_out >= check_in:
        worked_hours = round(
            (check_out - check_in).total_seconds() / 3600,
            2,
        )

        if scheduled_hours is not None:
            overtime_hours = round(
                max(0, worked_hours - scheduled_hours),
                2,
            )

    return {
        "worked_hours": worked_hours,
        "scheduled_hours": round(scheduled_hours, 2)
        if scheduled_hours is not None else None,
        "overtime_hours": overtime_hours,
        "is_late": is_late,
        "late_minutes": late_minutes,
        "shift_found": shift is not None,
    }


def get_report_records(
    db: Session,
    current_user: User,
    employee_id: int | None,
    department: str | None,
    start_date: date | None,
    end_date: date | None,
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be after end_date",
        )

    query = db.query(Attendance, Employee).join(
        Employee,
        Attendance.employee_id == Employee.id,
    )

    if current_user.role == "EMPLOYEE":
        query = query.filter(Employee.email == current_user.email)
    elif employee_id is not None:
        query = query.filter(Attendance.employee_id == employee_id)

    if department:
        query = query.filter(Employee.department.ilike(department.strip()))

    if start_date:
        query = query.filter(Attendance.attendance_date >= start_date)

    if end_date:
        query = query.filter(Attendance.attendance_date <= end_date)

    return query.order_by(
        Attendance.attendance_date.desc(),
        Attendance.id.desc(),
    ).all()


@router.get("/reports")
def attendance_report(
    employee_id: int | None = Query(default=None, gt=0),
    department: str | None = Query(default=None, min_length=1, max_length=100),
    start_date: date | None = None,
    end_date: date | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = get_report_records(
        db,
        current_user,
        employee_id,
        department,
        start_date,
        end_date,
    )

    shifts = {
        shift.name.casefold(): shift
        for shift in db.query(Shift).all()
    }

    results = []

    for record, employee in rows[skip:skip + limit]:
        shift = shifts.get(record.shift_name.casefold())

        results.append({
            "attendance_id": record.id,
            "employee_id": employee.id,
            "employee_code": employee.employee_code,
            "employee_name": employee.full_name,
            "department": employee.department,
            "attendance_date": record.attendance_date,
            "check_in": record.check_in,
            "check_out": record.check_out,
            "status": record.status,
            "shift_name": record.shift_name,
            **attendance_metrics(record, shift),
        })

    return {
        "count": len(results),
        "skip": skip,
        "limit": limit,
        "late_grace_minutes": LATE_GRACE_MINUTES,
        "records": results,
    }


@router.get("/analytics")
def attendance_analytics(
    start_date: date | None = None,
    end_date: date | None = None,
    department: str | None = Query(default=None, min_length=1, max_length=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR", "MANAGER")),
):
    rows = get_report_records(
        db,
        current_user,
        None,
        department,
        start_date,
        end_date,
    )

    shifts = {
        shift.name.casefold(): shift
        for shift in db.query(Shift).all()
    }

    total_worked_hours = 0.0
    total_overtime_hours = 0.0
    completed = 0
    incomplete = 0
    late_count = 0
    missing_shift_count = 0

    for record, employee in rows:
        shift = shifts.get(record.shift_name.casefold())
        metrics = attendance_metrics(record, shift)

        if metrics["worked_hours"] is None:
            incomplete += 1
        else:
            completed += 1
            total_worked_hours += metrics["worked_hours"]

        if metrics["is_late"]:
            late_count += 1

        if metrics["overtime_hours"] is not None:
            total_overtime_hours += metrics["overtime_hours"]

        if not metrics["shift_found"]:
            missing_shift_count += 1

    total = len(rows)

    return {
        "total_records": total,
        "completed_records": completed,
        "incomplete_records": incomplete,
        "late_arrivals": late_count,
        "late_arrival_percentage": round(late_count * 100 / total, 2)
        if total else 0,
        "total_worked_hours": round(total_worked_hours, 2),
        "total_overtime_hours": round(total_overtime_hours, 2),
        "records_missing_shift_schedule": missing_shift_count,
        "late_grace_minutes": LATE_GRACE_MINUTES,
        "timezone": "Asia/Kolkata",
    }
