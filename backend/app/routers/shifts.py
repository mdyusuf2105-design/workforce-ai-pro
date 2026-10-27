from datetime import time

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.shift import Shift
from app.models.user import User
from app.routers.auth import get_current_user, require_roles


router = APIRouter(prefix="/api/shifts", tags=["Shift Management"])


class ShiftCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    start_time: time
    end_time: time
    break_minutes: int = Field(default=60, ge=0, le=240)


class ShiftUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    start_time: time | None = None
    end_time: time | None = None
    break_minutes: int | None = Field(default=None, ge=0, le=240)


class ShiftResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    start_time: time
    end_time: time
    break_minutes: int
    is_active: bool


@router.post("/", response_model=ShiftResponse, status_code=201)
def create_shift(
    data: ShiftCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    if data.start_time == data.end_time:
        raise HTTPException(
            status_code=422,
            detail="Shift start and end times cannot be identical",
        )

    shift = Shift(
        name=data.name.strip(),
        start_time=data.start_time,
        end_time=data.end_time,
        break_minutes=data.break_minutes,
        is_active=True,
    )
    db.add(shift)

    try:
        db.commit()
        db.refresh(shift)
        return shift
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A shift with that name already exists",
        )


@router.get("/", response_model=list[ShiftResponse])
def list_shifts(
    active_only: bool = True,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Shift)

    if active_only:
        query = query.filter(Shift.is_active.is_(True))

    return query.order_by(Shift.name).offset(skip).limit(limit).all()


@router.get("/{shift_id}", response_model=ShiftResponse)
def get_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shift = db.get(Shift, shift_id)
    if shift is None:
        raise HTTPException(status_code=404, detail="Shift not found")
    return shift


@router.patch("/{shift_id}", response_model=ShiftResponse)
def update_shift(
    shift_id: int,
    data: ShiftUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    shift = db.get(Shift, shift_id)
    if shift is None:
        raise HTTPException(status_code=404, detail="Shift not found")

    changes = data.model_dump(exclude_unset=True)

    if "name" in changes and changes["name"] is not None:
        changes["name"] = changes["name"].strip()

    proposed_start = changes.get("start_time", shift.start_time)
    proposed_end = changes.get("end_time", shift.end_time)

    if proposed_start == proposed_end:
        raise HTTPException(
            status_code=422,
            detail="Shift start and end times cannot be identical",
        )

    for field, value in changes.items():
        if value is not None:
            setattr(shift, field, value)

    try:
        db.commit()
        db.refresh(shift)
        return shift
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A shift with that name already exists",
        )


@router.patch("/{shift_id}/deactivate", response_model=ShiftResponse)
def deactivate_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    shift = db.get(Shift, shift_id)
    if shift is None:
        raise HTTPException(status_code=404, detail="Shift not found")

    shift.is_active = False
    db.commit()
    db.refresh(shift)
    return shift
