from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, JSON, String, Text, func

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(Integer, nullable=True, index=True)

    description = Column(Text, nullable=False)
    ip_address = Column(String(45), nullable=True)
    details = Column(JSON, nullable=True)

    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        Index("ix_audit_entity_created", "entity_type", "created_at"),
    )
