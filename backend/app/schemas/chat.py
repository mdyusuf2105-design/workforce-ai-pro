from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ChatMessageCreate(BaseModel):
    receiver_id: int = Field(gt=0)
    message: str = Field(min_length=1, max_length=5000)

    @model_validator(mode="after")
    def validate_message(self):
        if not self.message.strip():
            raise ValueError("Message cannot be empty.")
        return self


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sender_id: int
    receiver_id: int
    message: str
    is_read: bool
    created_at: datetime
    read_at: datetime | None
