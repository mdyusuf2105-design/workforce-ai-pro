from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.department import Department
from app.models.employee import Employee
from app.models.user import User
from app.routers.auth import require_roles, get_current_user
from app.schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
)

router = APIRouter(prefix="/api/departments", tags=["Departments"])


def department_response(db: Session, department: Department) -> dict:
    count = (
        db.query(func.count(Employee.id))
        .filter(
            func.lower(Employee.department) == department.name.lower(),
            Employee.employment_status == "ACTIVE",
        )
        .scalar()
    )

    return {
        "id": department.id,
        "name": department.name,
        "code": department.code,
        "description": department.description,
        "is_active": department.is_active,
        "employee_count": count or 0,
    }


@router.post(
    "/",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_department(
    data: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    name = data.name.strip()
    code = data.code.strip().upper()

    if db.query(Department).filter(
        func.lower(Department.name) == name.lower()
    ).first():
        raise HTTPException(
            status_code=409,
            detail="A department with this name already exists",
        )

    if db.query(Department).filter(
        func.upper(Department.code) == code
    ).first():
        raise HTTPException(
            status_code=409,
            detail="A department with this code already exists",
        )

    department = Department(
        name=name,
        code=code,
        description=data.description.strip() if data.description else None,
    )
    db.add(department)

    try:
        db.commit()
        db.refresh(department)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Department name or code already exists",
        )

    return department_response(db, department)


@router.get("/", response_model=list[DepartmentResponse])
def list_departments(
    search: str | None = Query(default=None, max_length=100),
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Department)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            Department.name.ilike(term)
            | Department.code.ilike(term)
        )

    if active_only:
        query = query.filter(Department.is_active.is_(True))

    departments = query.order_by(Department.name.asc()).all()
    return [department_response(db, item) for item in departments]


@router.get("/statistics")
def department_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "HR", "MANAGER")
    ),
):
    active_departments = (
        db.query(Department)
        .filter(Department.is_active.is_(True))
        .order_by(Department.name.asc())
        .all()
    )

    results = [
        department_response(db, department)
        for department in active_departments
    ]

    return {
        "total_departments": len(results),
        "total_active_employees": sum(
            item["employee_count"] for item in results
        ),
        "departments": results,
    }


@router.get("/{department_id}", response_model=DepartmentResponse)
def get_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    department = db.get(Department, department_id)

    if department is None:
        raise HTTPException(status_code=404, detail="Department not found")

    return department_response(db, department)


@router.patch("/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: int,
    data: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    department = db.get(Department, department_id)

    if department is None:
        raise HTTPException(status_code=404, detail="Department not found")

    updates = data.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one field to update",
        )

    if "name" in updates:
        if updates["name"] is None:
            raise HTTPException(status_code=422, detail="Name cannot be null")

        updates["name"] = updates["name"].strip()

        duplicate = db.query(Department).filter(
            func.lower(Department.name) == updates["name"].lower(),
            Department.id != department_id,
        ).first()

        if duplicate:
            raise HTTPException(
                status_code=409,
                detail="A department with this name already exists",
            )

    if "code" in updates:
        if updates["code"] is None:
            raise HTTPException(status_code=422, detail="Code cannot be null")

        updates["code"] = updates["code"].strip().upper()

        duplicate = db.query(Department).filter(
            func.upper(Department.code) == updates["code"],
            Department.id != department_id,
        ).first()

        if duplicate:
            raise HTTPException(
                status_code=409,
                detail="A department with this code already exists",
            )

    if "description" in updates and updates["description"] is not None:
        updates["description"] = updates["description"].strip()

    for field, value in updates.items():
        setattr(department, field, value)

    try:
        db.commit()
        db.refresh(department)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Department name or code already exists",
        )

    return department_response(db, department)
