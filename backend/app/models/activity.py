from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, JSON, String, Text, func

from app.database import Base


class WorkforceActivity(Base):
    __tablename__ = "workforce_activities"

    id = Column(Integer, primary_key=True, index=True)

    actor_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    employee_id = Column(
        Integer,
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    event_type = Column(String(80), nullable=False, index=True)
    category = Column(String(50), nullable=False, default="GENERAL", index=True)
    description = Column(Text, nullable=False)
    entity_type = Column(String(80), nullable=True)
    entity_id = Column(Integer, nullable=True)

    details = Column(JSON, nullable=True)

    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        Index("ix_workforce_activity_category_created", "category", "created_at"),
    )
