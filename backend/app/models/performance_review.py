from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    CheckConstraint,
    func,
)

from app.database import Base


class PerformanceReview(Base):
    __tablename__ = "performance_reviews"

    __table_args__ = (
        CheckConstraint(
            "rating >= 1 AND rating <= 5",
            name="ck_performance_rating_range",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
        index=True,
    )

    reviewer_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    review_period = Column(String(100), nullable=False)
    review_date = Column(Date, nullable=False)

    rating = Column(Integer, nullable=False)

    strengths = Column(Text, nullable=True)
    improvement_areas = Column(Text, nullable=True)
    feedback = Column(Text, nullable=False)
    goals = Column(Text, nullable=True)

    status = Column(String(30), nullable=False, default="DRAFT")

    employee_acknowledged = Column(
        DateTime,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
