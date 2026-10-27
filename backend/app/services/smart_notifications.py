from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.models.intervention import HRIntervention
from app.models.notification import Notification
from app.models.user import User


def notify_user(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    category: str = "HR_ALERT",
):
    """Create an in-app notification for an active user."""

    user = db.query(User).filter(
        User.id == user_id,
        User.is_active.is_(True),
    ).first()

    if not user:
        return None

    notification = Notification(
        user_id=user.id,
        title=title,
        message=message,
        category=category,
    )

    db.add(notification)
    return notification


def notify_hr_team(
    db: Session,
    title: str,
    message: str,
    category: str = "HR_ALERT",
):
    """Notify active ADMIN and HR users."""

    users = db.query(User).filter(
        User.is_active.is_(True),
        User.role.in_(["ADMIN", "HR"]),
    ).all()

    created = []

    for user in users:
        notification = notify_user(
            db=db,
            user_id=user.id,
            title=title,
            message=message,
            category=category,
        )

        if notification:
            created.append(notification)

    return created


def escalate_overdue_interventions(
    db: Session,
    overdue_days: int = 3,
):
    """
    Escalate overdue interventions to active ADMIN/HR users.

    An intervention is escalated only once for each overdue date
    threshold, using an existing notification as the duplicate guard.
    """

    cutoff = date.today() - timedelta(days=overdue_days)

    overdue_items = db.query(HRIntervention).filter(
        HRIntervention.due_date.is_not(None),
        HRIntervention.due_date <= cutoff,
        HRIntervention.status.in_(["OPEN", "IN_PROGRESS"]),
    ).all()

    created_count = 0

    for item in overdue_items:
        title = f"Overdue HR intervention #{item.id}"

        existing = db.query(Notification).filter(
            Notification.title == title,
            Notification.message.contains(
                f"Employee ID: {item.employee_id}"
            ),
        ).first()

        if existing:
            continue

        message = (
            f"Intervention '{item.title}' is overdue. "
            f"Employee ID: {item.employee_id}. "
            f"Current status: {item.status}. "
            f"Due date: {item.due_date}. "
            "Please review and take appropriate action."
        )

        created = notify_hr_team(
            db=db,
            title=title,
            message=message,
            category="INTERVENTION_ESCALATION",
        )

        if created:
            created_count += len(created)

    if created_count:
        db.commit()

    return {
        "overdue_interventions": len(overdue_items),
        "notifications_created": created_count,
    }
