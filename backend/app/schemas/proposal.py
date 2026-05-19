from datetime import datetime
from typing import Literal

from pydantic import Field, field_validator

from app.schemas.client import CamelModel


ProposalFormat = Literal["telegram", "whatsapp", "email"]


def normalize_required_text(value: str) -> str:
    stripped = value.strip()
    if not stripped:
        raise ValueError("Field is required")
    return stripped


class ProposalBase(CamelModel):
    title: str = Field(min_length=1, max_length=180)
    content: str = Field(min_length=1)
    format: ProposalFormat = "telegram"

    @field_validator("title", "content")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        return normalize_required_text(value)


class ProposalCreate(ProposalBase):
    pass


class ProposalUpdate(CamelModel):
    title: str | None = Field(default=None, min_length=1, max_length=180)
    content: str | None = Field(default=None, min_length=1)
    format: ProposalFormat | None = None

    @field_validator("title", "content")
    @classmethod
    def validate_required_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_required_text(value)


class ProposalRead(ProposalBase):
    id: str
    request_id: str
    created_at: datetime
    updated_at: datetime
