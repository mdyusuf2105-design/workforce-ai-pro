from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.models.payroll import SalaryStructure, PayrollRecord
from app.models.user import User
from app.routers.auth import get_current_user, require_roles
from app.schemas.payroll import (
    SalaryStructureCreate,
    SalaryStructureUpdate,
    SalaryStructureResponse,
    PayrollResponse,
)

router = APIRouter(prefix="/api/payroll", tags=["Payroll Management"])


def employee_for_user(db: Session, user: User):
    return db.query(Employee).filter(Employee.email == user.email).first()


def require_employee_access(db: Session, user: User, employee_id: int):
    if user.role.upper() == "EMPLOYEE":
        employee = employee_for_user(db, user)
        if not employee or employee.id != employee_id:
            raise HTTPException(status_code=403, detail="Access denied.")


@router.post(
    "/salaries",
    response_model=SalaryStructureResponse,
)
def create_salary_structure(
    payload: SalaryStructureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    employee = db.query(Employee).filter(
        Employee.id == payload.employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")

    if employee.employment_status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Employee is not active.")

    existing = db.query(SalaryStructure).filter(
        SalaryStructure.employee_id == employee.id
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="A salary structure already exists for this employee.",
        )

    salary = SalaryStructure(
        employee_id=employee.id,
        basic_salary=payload.basic_salary,
        allowances=payload.allowances,
        deductions=payload.deductions,
        is_active="ACTIVE",
    )

    db.add(salary)
    db.commit()
    db.refresh(salary)
    return salary


@router.get("/salaries", response_model=list[SalaryStructureResponse])
def list_salary_structures(
    employee_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(SalaryStructure)

    if current_user.role.upper() == "EMPLOYEE":
        employee = employee_for_user(db, current_user)
        if not employee:
            return []
        query = query.filter(SalaryStructure.employee_id == employee.id)
    elif employee_id is not None:
        query = query.filter(SalaryStructure.employee_id == employee_id)

    return query.order_by(SalaryStructure.employee_id).all()


@router.patch(
    "/salaries/{salary_id}",
    response_model=SalaryStructureResponse,
)
def update_salary_structure(
    salary_id: int,
    payload: SalaryStructureUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    salary = db.query(SalaryStructure).filter(
        SalaryStructure.id == salary_id
    ).first()

    if not salary:
        raise HTTPException(status_code=404, detail="Salary structure not found.")

    changes = payload.model_dump(exclude_unset=True)

    if "is_active" in changes and changes["is_active"] is not None:
        salary.is_active = "ACTIVE" if changes["is_active"] else "INACTIVE"
        changes.pop("is_active")

    for field, value in changes.items():
        if value is not None:
            setattr(salary, field, value)

    gross = Decimal(str(salary.basic_salary)) + Decimal(str(salary.allowances))
    if Decimal(str(salary.deductions)) > gross:
        raise HTTPException(
            status_code=400,
            detail="Deductions cannot exceed gross salary.",
        )

    db.commit()
    db.refresh(salary)
    return salary


@router.post("/generate", response_model=list[PayrollResponse])
def generate_monthly_payroll(
    month: int = Query(ge=1, le=12),
    year: int = Query(ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    salaries = (
        db.query(SalaryStructure)
        .join(Employee, Employee.id == SalaryStructure.employee_id)
        .filter(
            SalaryStructure.is_active == "ACTIVE",
            Employee.employment_status == "ACTIVE",
        )
        .all()
    )

    created = []

    for salary in salaries:
        existing = db.query(PayrollRecord).filter(
            PayrollRecord.employee_id == salary.employee_id,
            PayrollRecord.month == month,
            PayrollRecord.year == year,
        ).first()

        if existing:
            continue

        basic = Decimal(str(salary.basic_salary))
        allowances = Decimal(str(salary.allowances))
        deductions = Decimal(str(salary.deductions))
        gross = basic + allowances
        net = gross - deductions

        record = PayrollRecord(
            employee_id=salary.employee_id,
            month=month,
            year=year,
            basic_salary=basic,
            allowances=allowances,
            deductions=deductions,
            gross_salary=gross,
            net_salary=net,
            status="PENDING",
        )
        db.add(record)
        created.append(record)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Payroll generation conflicted with another request. Please retry.",
        )

    for record in created:
        db.refresh(record)

    return created


@router.get("/", response_model=list[PayrollResponse])
def list_payroll(
    employee_id: int | None = Query(default=None, gt=0),
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    payroll_status: str | None = Query(
        default=None,
        alias="status",
        pattern="^(PENDING|APPROVED|PAID)$",
    ),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(PayrollRecord)

    if current_user.role.upper() == "EMPLOYEE":
        employee = employee_for_user(db, current_user)
        if not employee:
            return []
        query = query.filter(PayrollRecord.employee_id == employee.id)
    elif employee_id is not None:
        query = query.filter(PayrollRecord.employee_id == employee_id)

    if month is not None:
        query = query.filter(PayrollRecord.month == month)
    if year is not None:
        query = query.filter(PayrollRecord.year == year)
    if payroll_status:
        query = query.filter(PayrollRecord.status == payroll_status)

    return (
        query.order_by(PayrollRecord.year.desc(), PayrollRecord.month.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{payroll_id}", response_model=PayrollResponse)
def get_payroll_record(
    payroll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(PayrollRecord).filter(
        PayrollRecord.id == payroll_id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Payroll record not found.")

    require_employee_access(db, current_user, record.employee_id)
    return record


@router.patch("/{payroll_id}/approve", response_model=PayrollResponse)
def approve_payroll(
    payroll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    record = db.query(PayrollRecord).filter(
        PayrollRecord.id == payroll_id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Payroll record not found.")

    if record.status != "PENDING":
        raise HTTPException(
            status_code=409,
            detail="Only pending payroll records can be approved.",
        )

    record.status = "APPROVED"
    record.approved_by = current_user.id
    record.approved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(record)
    return record


@router.patch("/{payroll_id}/mark-paid", response_model=PayrollResponse)
def mark_payroll_paid(
    payroll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    record = db.query(PayrollRecord).filter(
        PayrollRecord.id == payroll_id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Payroll record not found.")

    if record.status != "APPROVED":
        raise HTTPException(
            status_code=409,
            detail="Payroll must be approved before it can be marked as paid.",
        )

    record.status = "PAID"
    record.paid_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(record)
    return record
