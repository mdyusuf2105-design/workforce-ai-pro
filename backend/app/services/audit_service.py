from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def record_audit(
    db: Session,
    action: str,
    entity_type: str,
    description: str,
    user_id: int | None = None,
    entity_id: int | None = None,
    ip_address: str | None = None,
    details: dict | None = None,
):
    """
    Add an audit record to the current database transaction.

    The calling endpoint should commit the transaction after its
    business operation succeeds.
    """

    audit = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        ip_address=ip_address,
        details=details,
    )

    db.add(audit)
    return audit
