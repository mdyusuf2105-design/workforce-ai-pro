from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class EmployeeCreate(BaseModel):
    employee_code: str = Field(min_length=2, max_length=20)
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)
    department: str = Field(min_length=2, max_length=100)
    job_title: str = Field(min_length=2, max_length=100)
    joining_date: date | None = None


class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_code: str
    full_name: str
    email: EmailStr
    phone: str | None
    department: str
    job_title: str
    employment_status: str
    joining_date: date | None
    created_at: datetime


class EmployeeUpdate(BaseModel):
    employee_code: str | None = Field(default=None, min_length=2, max_length=20)
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=20)
    department: str | None = Field(default=None, min_length=2, max_length=100)
    job_title: str | None = Field(default=None, min_length=2, max_length=100)
    joining_date: date | None = None
