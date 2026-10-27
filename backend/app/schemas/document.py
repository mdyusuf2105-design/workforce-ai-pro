from datetime import datetime
from pydantic import BaseModel, ConfigDict


class EmployeeDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    uploaded_by: int | None
    original_filename: str
    content_type: str
    file_size: int
    category: str
    description: str | None
    created_at: datetime
