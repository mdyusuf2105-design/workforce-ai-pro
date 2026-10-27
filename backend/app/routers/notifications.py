from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.routers.auth import get_current_user, require_roles
from app.schemas.notification import (
    NotificationCreate,
    NotificationReadUpdate,
    NotificationResponse,
)

router = APIRouter(
    prefix="/api/notifications",
    tags=["Notifications"],
)


@router.post("/", response_model=NotificationResponse, status_code=201)
def create_notification(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    recipient = db.query(User).filter(
        User.id == payload.user_id,
        User.is_active.is_(True),
    ).first()

    if not recipient:
        raise HTTPException(
            status_code=404,
            detail="Active recipient not found.",
        )

    notification = Notification(
        user_id=recipient.id,
        title=payload.title.strip(),
        message=payload.message.strip(),
        category=payload.category.strip().upper(),
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


@router.get("/", response_model=list[NotificationResponse])
def list_notifications(
    category: str | None = Query(default=None, max_length=50),
    unread_only: bool = False,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Notification).filter(
        Notification.user_id == current_user.id
    )

    if category:
        query = query.filter(
            Notification.category == category.upper()
        )

    if unread_only:
        query = query.filter(Notification.is_read.is_(False))

    return (
        query.order_by(Notification.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/unread-count")
def unread_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read.is_(False),
    ).count()

    return {"unread_count": count}


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def update_notification_read_status(
    notification_id: int,
    payload: NotificationReadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found.",
        )

    notification.is_read = payload.is_read
    notification.read_at = (
        datetime.now(timezone.utc) if payload.is_read else None
    )

    db.commit()
    db.refresh(notification)
    return notification


@router.patch("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read.is_(False),
    ).all()

    now = datetime.now(timezone.utc)

    for notification in notifications:
        notification.is_read = True
        notification.read_at = now

    db.commit()

    return {
        "message": "All notifications marked as read.",
        "updated_count": len(notifications),
    }


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found.",
        )

    db.delete(notification)
    db.commit()

    return {"message": "Notification deleted successfully."}
