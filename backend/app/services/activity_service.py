from sqlalchemy.orm import Session

from app.models.activity import WorkforceActivity


def record_activity(
    db: Session,
    event_type: str,
    description: str,
    actor_id: int | None = None,
    employee_id: int | None = None,
    category: str = "GENERAL",
    entity_type: str | None = None,
    entity_id: int | None = None,
    details: dict | None = None,
):
    activity = WorkforceActivity(
        actor_id=actor_id,
        employee_id=employee_id,
        event_type=event_type,
        category=category,
        description=description,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
    )

    db.add(activity)
    return activity
