from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import Field, field_validator

from app.schemas.client import CamelModel, normalize_optional_text


TravelRequestStatus = Literal[
    "new",
    "clarifying",
    "searching",
    "sent",
    "thinking",
    "booked",
    "rejected",
]

NonNegativeInt = Annotated[int, Field(ge=0)]


class TravelRequestBase(CamelModel):
    status: TravelRequestStatus = "new"
    destination: str | None = Field(default=None, max_length=160)
    departure_city: str | None = Field(default=None, max_length=120)
    date_from: date | None = None
    date_to: date | None = None
    nights_from: int | None = Field(default=None, ge=0)
    nights_to: int | None = Field(default=None, ge=0)
    adults: int = Field(default=2, ge=1)
    children: int = Field(default=0, ge=0)
    children_ages: list[NonNegativeInt] = Field(default_factory=list)
    budget_min: int | None = Field(default=None, ge=0)
    budget_max: int | None = Field(default=None, ge=0)
    travel_type: str | None = Field(default=None, max_length=120)
    wishes: str | None = None
    restrictions: str | None = None
    internal_comment: str | None = None

    @field_validator(
        "destination",
        "departure_city",
        "travel_type",
        "wishes",
        "restrictions",
        "internal_comment",
    )
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        return normalize_optional_text(value)


class TravelRequestCreate(TravelRequestBase):
    pass


class TravelRequestUpdate(CamelModel):
    status: TravelRequestStatus | None = None
    destination: str | None = Field(default=None, max_length=160)
    departure_city: str | None = Field(default=None, max_length=120)
    date_from: date | None = None
    date_to: date | None = None
    nights_from: int | None = Field(default=None, ge=0)
    nights_to: int | None = Field(default=None, ge=0)
    adults: int | None = Field(default=None, ge=1)
    children: int | None = Field(default=None, ge=0)
    children_ages: list[NonNegativeInt] | None = None
    budget_min: int | None = Field(default=None, ge=0)
    budget_max: int | None = Field(default=None, ge=0)
    travel_type: str | None = Field(default=None, max_length=120)
    wishes: str | None = None
    restrictions: str | None = None
    internal_comment: str | None = None

    @field_validator(
        "destination",
        "departure_city",
        "travel_type",
        "wishes",
        "restrictions",
        "internal_comment",
    )
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        return normalize_optional_text(value)


class TravelRequestRead(TravelRequestBase):
    id: str
    user_id: str
    client_id: str
    created_at: datetime
    updated_at: datetime


class TravelRequestStatusUpdate(CamelModel):
    status: TravelRequestStatus


class PipelineTravelRequestRead(TravelRequestRead):
    client_full_name: str


class PipelineRead(CamelModel):
    new: list[PipelineTravelRequestRead]
    clarifying: list[PipelineTravelRequestRead]
    searching: list[PipelineTravelRequestRead]
    sent: list[PipelineTravelRequestRead]
    thinking: list[PipelineTravelRequestRead]
    booked: list[PipelineTravelRequestRead]
    rejected: list[PipelineTravelRequestRead]
