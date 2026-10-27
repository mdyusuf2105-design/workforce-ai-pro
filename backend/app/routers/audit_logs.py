from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.routers.auth import require_roles

router = APIRouter(
    prefix="/api/audit-logs",
    tags=["Audit Logs"],
)

AUDIT_ROLES = ("ADMIN", "HR")


def serialize_audit(log, username=None):
    return {
        "id": log.id,
        "user_id": log.user_id,
        "username": username,
        "action": log.action,
        "entity_type": log.entity_type,
        "entity_id": log.entity_id,
        "description": log.description,
        "ip_address": log.ip_address,
        "details": log.details,
        "created_at": (
            log.created_at.isoformat()
            if log.created_at else None
        ),
    }


@router.get("/")
def list_audit_logs(
    action: str | None = None,
    entity_type: str | None = None,
    user_id: int | None = Query(default=None, gt=0),
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*AUDIT_ROLES)),
):
    query = (
        db.query(AuditLog, User.full_name)
        .outerjoin(User, User.id == AuditLog.user_id)
    )

    if action:
        query = query.filter(AuditLog.action == action.upper())

    if entity_type:
        query = query.filter(
            AuditLog.entity_type == entity_type.upper()
        )

    if user_id is not None:
        query = query.filter(AuditLog.user_id == user_id)

    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date must not be later than end_date.",
        )

    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)

    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)

    total = query.count()

    rows = (
        query.order_by(AuditLog.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": [
            serialize_audit(log, username)
            for log, username in rows
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/summary")
def audit_summary(
    days: int = Query(default=7, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*AUDIT_ROLES)),
):
    cutoff = datetime.utcnow() - timedelta(days=days)

    logs = db.query(AuditLog).filter(
        AuditLog.created_at >= cutoff
    ).all()

    action_counts = {}
    entity_counts = {}

    for log in logs:
        action_counts[log.action] = action_counts.get(log.action, 0) + 1
        entity_counts[log.entity_type] = (
            entity_counts.get(log.entity_type, 0) + 1
        )

    return {
        "period_days": days,
        "total_events": len(logs),
        "unique_users": len({
            log.user_id for log in logs if log.user_id is not None
        }),
        "actions": action_counts,
        "entities": entity_counts,
    }


@router.get("/{audit_id}")
def get_audit_log(
    audit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*AUDIT_ROLES)),
):
    result = (
        db.query(AuditLog, User.full_name)
        .outerjoin(User, User.id == AuditLog.user_id)
        .filter(AuditLog.id == audit_id)
        .first()
    )

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Audit log not found.",
        )

    log, username = result
    return serialize_audit(log, username)
