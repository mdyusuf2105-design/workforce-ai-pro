from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


LeaveType = Literal[
    "CASUAL",
    "SICK",
    "ANNUAL",
    "UNPAID",
    "MATERNITY",
    "PATERNITY",
    "OTHER",
]


class LeaveRequestCreate(BaseModel):
    employee_id: int = Field(gt=0)
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str = Field(min_length=3, max_length=2000)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("End date cannot be before start date.")
        return self


class LeaveReviewRequest(BaseModel):
    status: Literal["APPROVED", "REJECTED"]
    reviewer_comments: str | None = Field(default=None, max_length=2000)


class LeaveRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    leave_type: str
    start_date: date
    end_date: date
    reason: str
    status: str
    reviewed_by: int | None
    reviewer_comments: str | None
    reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime
