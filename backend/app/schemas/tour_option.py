from datetime import date, datetime
from typing import Literal

from pydantic import Field, field_validator

from app.schemas.client import CamelModel, normalize_optional_text


Currency = Literal["RUB", "USD", "EUR"]


class TourOptionBase(CamelModel):
    title: str = Field(min_length=1, max_length=180)
    country: str | None = Field(default=None, max_length=120)
    resort: str | None = Field(default=None, max_length=120)
    hotel_name: str | None = Field(default=None, max_length=180)
    hotel_stars: int | None = Field(default=None, ge=1, le=5)
    date_from: date | None = None
    date_to: date | None = None
    nights: int | None = Field(default=None, ge=0)
    room_type: str | None = Field(default=None, max_length=160)
    meal_type: str | None = Field(default=None, max_length=120)
    price: int | None = Field(default=None, ge=0)
    currency: Currency = "RUB"
    link: str | None = Field(default=None, max_length=500)
    pros: list[str] = Field(default_factory=list)
    cons: list[str] = Field(default_factory=list)
    agent_comment: str | None = None
    is_recommended: bool = False

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Tour option title is required")
        return stripped

    @field_validator(
        "country",
        "resort",
        "hotel_name",
        "room_type",
        "meal_type",
        "link",
        "agent_comment",
    )
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        return normalize_optional_text(value)

    @field_validator("pros", "cons")
    @classmethod
    def normalize_string_list(cls, value: list[str]) -> list[str]:
        return [item.strip() for item in value if item.strip()]


class TourOptionCreate(TourOptionBase):
    pass


class TourOptionUpdate(CamelModel):
    title: str | None = Field(default=None, min_length=1, max_length=180)
    country: str | None = Field(default=None, max_length=120)
    resort: str | None = Field(default=None, max_length=120)
    hotel_name: str | None = Field(default=None, max_length=180)
    hotel_stars: int | None = Field(default=None, ge=1, le=5)
    date_from: date | None = None
    date_to: date | None = None
    nights: int | None = Field(default=None, ge=0)
    room_type: str | None = Field(default=None, max_length=160)
    meal_type: str | None = Field(default=None, max_length=120)
    price: int | None = Field(default=None, ge=0)
    currency: Currency | None = None
    link: str | None = Field(default=None, max_length=500)
    pros: list[str] | None = None
    cons: list[str] | None = None
    agent_comment: str | None = None
    is_recommended: bool | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("Tour option title is required")
        return stripped

    @field_validator(
        "country",
        "resort",
        "hotel_name",
        "room_type",
        "meal_type",
        "link",
        "agent_comment",
    )
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        return normalize_optional_text(value)

    @field_validator("pros", "cons")
    @classmethod
    def normalize_string_list(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        return [item.strip() for item in value if item.strip()]


class TourOptionRead(TourOptionBase):
    id: str
    request_id: str
    created_at: datetime
    updated_at: datetime
