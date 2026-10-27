from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


class CheckInRequest(BaseModel):
    employee_id: int = Field(gt=0)
    shift_name: str = Field(default="General", min_length=1, max_length=100)


class CheckOutRequest(BaseModel):
    employee_id: int = Field(gt=0)


class AttendanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    attendance_date: date
    check_in: datetime | None
    check_out: datetime | None
    status: str
    shift_name: str


class ShiftCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    start_time: str
    end_time: str
    break_minutes: int = Field(default=60, ge=0, le=240)


class ShiftResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    start_time: str
    end_time: str
    break_minutes: int
    is_active: bool
