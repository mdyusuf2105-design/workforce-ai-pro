from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, func

from app.database import Base


class AttritionPredictionRecord(Base):
    __tablename__ = "attrition_predictions"

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
        index=True,
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    overtime = Column(Integer, nullable=False)
    job_satisfaction = Column(Integer, nullable=False)
    work_life_balance = Column(Integer, nullable=False)
    years_at_company = Column(Integer, nullable=False)
    monthly_income = Column(Float, nullable=False)
    training_hours = Column(Integer, nullable=False)

    risk_probability = Column(Float, nullable=False)
    risk_level = Column(String(10), nullable=False)

    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        index=True,
    )
