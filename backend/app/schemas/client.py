from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        from_attributes=True,
        populate_by_name=True,
    )


def normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


class ClientBase(CamelModel):
    full_name: str = Field(min_length=1, max_length=160)
    phone: str | None = Field(default=None, max_length=80)
    email: str | None = Field(default=None, max_length=255)
    telegram: str | None = Field(default=None, max_length=120)
    whatsapp: str | None = Field(default=None, max_length=80)
    city: str | None = Field(default=None, max_length=120)
    source: str | None = Field(default=None, max_length=120)
    tags: list[str] = Field(default_factory=list)
    notes: str | None = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Client full name is required")
        return stripped

    @field_validator(
        "phone",
        "email",
        "telegram",
        "whatsapp",
        "city",
        "source",
        "notes",
    )
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        return normalize_optional_text(value)

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, value: list[str]) -> list[str]:
        return [item.strip() for item in value if item.strip()]


class ClientCreate(ClientBase):
    pass


class ClientUpdate(CamelModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=160)
    phone: str | None = Field(default=None, max_length=80)
    email: str | None = Field(default=None, max_length=255)
    telegram: str | None = Field(default=None, max_length=120)
    whatsapp: str | None = Field(default=None, max_length=80)
    city: str | None = Field(default=None, max_length=120)
    source: str | None = Field(default=None, max_length=120)
    tags: list[str] | None = None
    notes: str | None = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("Client full name is required")
        return stripped

    @field_validator(
        "phone",
        "email",
        "telegram",
        "whatsapp",
        "city",
        "source",
        "notes",
    )
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        return normalize_optional_text(value)

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        return [item.strip() for item in value if item.strip()]


class ClientRead(ClientBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime


HotelLevel = Literal["3*", "4*", "5*", "luxury"]


class ClientPreferenceBase(CamelModel):
    preferred_destinations: list[str] = Field(default_factory=list)
    disliked_destinations: list[str] = Field(default_factory=list)
    preferred_hotel_level: HotelLevel | None = None
    meal_preferences: list[str] = Field(default_factory=list)
    travel_style: list[str] = Field(default_factory=list)
    important_factors: list[str] = Field(default_factory=list)
    avoid_factors: list[str] = Field(default_factory=list)
    average_budget_min: int | None = Field(default=None, ge=0)
    average_budget_max: int | None = Field(default=None, ge=0)

    @field_validator(
        "preferred_destinations",
        "disliked_destinations",
        "meal_preferences",
        "travel_style",
        "important_factors",
        "avoid_factors",
    )
    @classmethod
    def normalize_string_list(cls, value: list[str]) -> list[str]:
        return [item.strip() for item in value if item.strip()]


class ClientPreferenceUpsert(ClientPreferenceBase):
    pass


class ClientPreferenceRead(ClientPreferenceBase):
    id: str
    client_id: str
    created_at: datetime
    updated_at: datetime
