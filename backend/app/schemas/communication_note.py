from datetime import datetime
from typing import Literal

from pydantic import Field, field_validator

from app.schemas.client import CamelModel
from app.schemas.proposal import normalize_required_text


CommunicationNoteType = Literal["note", "call", "telegram", "whatsapp", "email"]


class CommunicationNoteBase(CamelModel):
    request_id: str | None = None
    type: CommunicationNoteType = "note"
    content: str = Field(min_length=1)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        return normalize_required_text(value)


class CommunicationNoteCreate(CommunicationNoteBase):
    pass


class CommunicationNoteUpdate(CamelModel):
    type: CommunicationNoteType | None = None
    content: str | None = Field(default=None, min_length=1)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_required_text(value)


class CommunicationNoteRead(CommunicationNoteBase):
    id: str
    client_id: str
    created_at: datetime
    updated_at: datetime
