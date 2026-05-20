from datetime import UTC, date, datetime
from uuid import uuid4

from sqlalchemy import Date, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def now_utc() -> datetime:
    return datetime.now(UTC)


class TravelRequest(Base):
    __tablename__ = "travel_requests"

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
    client_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("clients.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(24), default="new", nullable=False)
    destination: Mapped[str | None] = mapped_column(String(160))
    departure_city: Mapped[str | None] = mapped_column(String(120))
    date_from: Mapped[date | None] = mapped_column(Date)
    date_to: Mapped[date | None] = mapped_column(Date)
    nights_from: Mapped[int | None] = mapped_column(Integer)
    nights_to: Mapped[int | None] = mapped_column(Integer)
    adults: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    children: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    children_ages: Mapped[list[int]] = mapped_column(JSON, default=list, nullable=False)
    budget_min: Mapped[int | None] = mapped_column(Integer)
    budget_max: Mapped[int | None] = mapped_column(Integer)
    travel_type: Mapped[str | None] = mapped_column(String(120))
    wishes: Mapped[str | None] = mapped_column(Text)
    restrictions: Mapped[str | None] = mapped_column(Text)
    internal_comment: Mapped[str | None] = mapped_column(Text)
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

    client = relationship("Client", back_populates="travel_requests")
    tour_options: Mapped[list["TourOption"]] = relationship(
        back_populates="request",
        cascade="all, delete-orphan",
    )
    proposals: Mapped[list["Proposal"]] = relationship(
        back_populates="request",
        cascade="all, delete-orphan",
    )
    reminders: Mapped[list["Reminder"]] = relationship(back_populates="request")
    communication_notes: Mapped[list["CommunicationNote"]] = relationship(
        back_populates="request",
        cascade="all, delete-orphan",
    )
