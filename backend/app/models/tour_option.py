from datetime import UTC, date, datetime
from uuid import uuid4

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def now_utc() -> datetime:
    return datetime.now(UTC)


class TourOption(Base):
    __tablename__ = "tour_options"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    request_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("travel_requests.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    country: Mapped[str | None] = mapped_column(String(120))
    resort: Mapped[str | None] = mapped_column(String(120))
    hotel_name: Mapped[str | None] = mapped_column(String(180))
    hotel_stars: Mapped[int | None] = mapped_column(Integer)
    date_from: Mapped[date | None] = mapped_column(Date)
    date_to: Mapped[date | None] = mapped_column(Date)
    nights: Mapped[int | None] = mapped_column(Integer)
    room_type: Mapped[str | None] = mapped_column(String(160))
    meal_type: Mapped[str | None] = mapped_column(String(120))
    price: Mapped[int | None] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3), default="RUB", nullable=False)
    link: Mapped[str | None] = mapped_column(String(500))
    pros: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    cons: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    agent_comment: Mapped[str | None] = mapped_column(Text)
    is_recommended: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
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

    request = relationship("TravelRequest", back_populates="tour_options")
