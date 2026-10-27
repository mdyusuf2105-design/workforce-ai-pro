from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from app.database import Base


class WorkforceDataset(Base):
    __tablename__ = "workforce_datasets"

    id = Column(Integer, primary_key=True, index=True)

    uploaded_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), unique=True, nullable=False)
    file_path = Column(String(500), nullable=False)
    row_count = Column(Integer, nullable=False, default=0)
    column_count = Column(Integer, nullable=False, default=0)
    duplicate_rows = Column(Integer, nullable=False, default=0)
    missing_values = Column(Integer, nullable=False, default=0)
    validation_status = Column(String(30), nullable=False, default="PENDING")
    validation_report = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
