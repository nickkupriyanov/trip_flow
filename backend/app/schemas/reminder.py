from datetime import datetime
from typing import Literal

from pydantic import Field, field_validator

from app.schemas.client import CamelModel, normalize_optional_text


ReminderStatus = Literal["active", "done"]


class ReminderBase(CamelModel):
    client_id: str | None = None
    request_id: str | None = None
    title: str = Field(min_length=1, max_length=180)
    description: str | None = None
    due_at: datetime
    status: ReminderStatus = "active"

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Reminder title is required")
        return stripped

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        return normalize_optional_text(value)


class ReminderCreate(ReminderBase):
    pass


class ReminderUpdate(CamelModel):
    client_id: str | None = None
    request_id: str | None = None
    title: str | None = Field(default=None, min_length=1, max_length=180)
    description: str | None = None
    due_at: datetime | None = None
    status: ReminderStatus | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("Reminder title is required")
        return stripped

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        return normalize_optional_text(value)


class ReminderRead(ReminderBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
