from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def now_utc() -> datetime:
    return datetime.now(UTC)


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(80))
    email: Mapped[str | None] = mapped_column(String(255))
    telegram: Mapped[str | None] = mapped_column(String(120))
    whatsapp: Mapped[str | None] = mapped_column(String(80))
    city: Mapped[str | None] = mapped_column(String(120))
    source: Mapped[str | None] = mapped_column(String(120))
    tags: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
        onupdate=now_utc,
        nullable=False,
    )

    preferences: Mapped["ClientPreference | None"] = relationship(
        back_populates="client",
        cascade="all, delete-orphan",
        uselist=False,
    )
    travel_requests: Mapped[list["TravelRequest"]] = relationship(
        back_populates="client",
        cascade="all, delete-orphan",
    )


class ClientPreference(Base):
    __tablename__ = "client_preferences"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    client_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("clients.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    preferred_destinations: Mapped[list[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )
    disliked_destinations: Mapped[list[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )
    preferred_hotel_level: Mapped[str | None] = mapped_column(String(20))
    meal_preferences: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    travel_style: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    important_factors: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    avoid_factors: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    average_budget_min: Mapped[int | None] = mapped_column(Integer)
    average_budget_max: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
        onupdate=now_utc,
        nullable=False,
    )

    client: Mapped[Client] = relationship(back_populates="preferences")
