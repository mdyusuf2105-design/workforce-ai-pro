from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class SalaryStructureCreate(BaseModel):
    employee_id: int = Field(gt=0)
    basic_salary: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    allowances: Decimal = Field(default=Decimal("0"), ge=0, max_digits=12, decimal_places=2)
    deductions: Decimal = Field(default=Decimal("0"), ge=0, max_digits=12, decimal_places=2)

    @model_validator(mode="after")
    def validate_salary(self):
        if self.deductions > self.basic_salary + self.allowances:
            raise ValueError("Deductions cannot exceed gross salary.")
        return self


class SalaryStructureUpdate(BaseModel):
    basic_salary: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    allowances: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    deductions: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    is_active: bool | None = None


class SalaryStructureResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    basic_salary: Decimal
    allowances: Decimal
    deductions: Decimal
    is_active: str


class PayrollResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    month: int
    year: int
    basic_salary: Decimal
    allowances: Decimal
    deductions: Decimal
    gross_salary: Decimal
    net_salary: Decimal
    status: str
    approved_by: int | None
    approved_at: datetime | None
    paid_at: datetime | None
    created_at: datetime
