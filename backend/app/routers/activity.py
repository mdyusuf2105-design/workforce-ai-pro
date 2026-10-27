from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.activity import WorkforceActivity
from app.models.user import User
from app.routers.auth import require_roles

router = APIRouter(
    prefix="/api/activity",
    tags=["Real-Time Workforce Activity"],
)

HR_ROLES = ("ADMIN", "HR", "MANAGER")


def serialize_activity(activity, actor_name=None):
    return {
        "id": activity.id,
        "actor_id": activity.actor_id,
        "actor_name": actor_name,
        "employee_id": activity.employee_id,
        "event_type": activity.event_type,
        "category": activity.category,
        "description": activity.description,
        "entity_type": activity.entity_type,
        "entity_id": activity.entity_id,
        "details": activity.details,
        "created_at": (
            activity.created_at.isoformat()
            if activity.created_at else None
        ),
    }


@router.get("/feed")
def activity_feed(
    after_id: int | None = Query(default=None, ge=0),
    category: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*HR_ROLES)),
):
    query = (
        db.query(WorkforceActivity, User.full_name)
        .outerjoin(User, User.id == WorkforceActivity.actor_id)
    )

    if after_id is not None:
        query = query.filter(WorkforceActivity.id > after_id)

    if category:
        query = query.filter(
            WorkforceActivity.category == category.upper()
        )

    rows = (
        query.order_by(WorkforceActivity.id.desc())
        .limit(limit)
        .all()
    )

    return {
        "items": [
            serialize_activity(activity, actor_name)
            for activity, actor_name in rows
        ],
        "count": len(rows),
        "latest_id": max(
            (activity.id for activity, _ in rows),
            default=after_id or 0,
        ),
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("/summary")
def activity_summary(
    hours: int = Query(default=24, ge=1, le=720),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*HR_ROLES)),
):
    cutoff = datetime.utcnow() - timedelta(hours=hours)

    activities = db.query(WorkforceActivity).filter(
        WorkforceActivity.created_at >= cutoff
    ).all()

    category_counts = {}
    for activity in activities:
        category_counts[activity.category] = (
            category_counts.get(activity.category, 0) + 1
        )

    return {
        "period_hours": hours,
        "total_events": len(activities),
        "categories": category_counts,
        "latest_event_at": max(
            (item.created_at for item in activities if item.created_at),
            default=None,
        ),
    }


@router.get("/{activity_id}")
def get_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*HR_ROLES)),
):
    result = (
        db.query(WorkforceActivity, User.full_name)
        .outerjoin(User, User.id == WorkforceActivity.actor_id)
        .filter(WorkforceActivity.id == activity_id)
        .first()
    )

    if not result:
        raise HTTPException(status_code=404, detail="Activity not found.")

    activity, actor_name = result
    return serialize_activity(activity, actor_name)
