from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, inspect
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.routers.auth import require_roles

router = APIRouter(
    prefix="/api/search",
    tags=["Advanced Search"],
)

HR_ROLES = ("ADMIN", "HR", "MANAGER")


def available_columns(model):
    return {column.key for column in inspect(model).columns}


def get_value(obj, field, default=None):
    return getattr(obj, field, default)


@router.get("/employees")
def search_employees(
    q: Optional[str] = Query(None, description="Search employee name, email, or ID"),
    department: Optional[str] = Query(None),
    designation: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    employment_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*HR_ROLES)),
):
    query = db.query(Employee)
    columns = available_columns(Employee)

    if q and q.strip():
        search_text = q.strip()
        conditions = []

        for field in ("full_name", "name", "email", "employee_code"):
            if field in columns:
                conditions.append(
                    getattr(Employee, field).ilike(f"%{search_text}%")
                )

        if search_text.isdigit() and "id" in columns:
            conditions.append(Employee.id == int(search_text))

        if conditions:
            query = query.filter(or_(*conditions))

    if department and "department" in columns:
        query = query.filter(
            Employee.department.ilike(f"%{department.strip()}%")
        )

    if designation:
        for field in ("designation", "job_title", "position"):
            if field in columns:
                query = query.filter(
                    getattr(Employee, field).ilike(
                        f"%{designation.strip()}%"
                    )
                )
                break

    if status and "employment_status" in columns:
        query = query.filter(
            Employee.employment_status.ilike(f"%{status.strip()}%")
        )

    if employment_type and "employment_type" in columns:
        query = query.filter(
            Employee.employment_type.ilike(
                f"%{employment_type.strip()}%"
            )
        )

    total = query.count()
    employees = (
        query.order_by(Employee.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []

    for employee in employees:
        item = {
            "id": employee.id,
        }

        for field in (
            "full_name",
            "name",
            "email",
            "employee_code",
            "department",
            "designation",
            "job_title",
            "position",
            "employment_status",
            "employment_type",
            "phone",
            "date_of_joining",
        ):
            if field in columns:
                value = get_value(employee, field)
                item[field] = str(value) if value is not None else None

        items.append(item)

    return {
        "filters": {
            "q": q,
            "department": department,
            "designation": designation,
            "status": status,
            "employment_type": employment_type,
        },
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
        },
        "items": items,
    }


@router.get("/employees/filters")
def employee_filter_options(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*HR_ROLES)),
):
    columns = available_columns(Employee)
    employees = db.query(Employee).all()

    def distinct_values(field):
        if field not in columns:
            return []

        values = {
            str(getattr(employee, field))
            for employee in employees
            if getattr(employee, field, None) is not None
            and str(getattr(employee, field)).strip()
        }
        return sorted(values, key=str.lower)

    return {
        "departments": distinct_values("department"),
        "designations": (
            distinct_values("designation")
            or distinct_values("job_title")
            or distinct_values("position")
        ),
        "employment_statuses": distinct_values("employment_status"),
        "employment_types": distinct_values("employment_type"),
    }
