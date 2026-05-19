from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.reminder import Reminder
from app.models.travel_request import TravelRequest
from app.schemas.reminder import ReminderCreate, ReminderUpdate


def list_reminders(
    db: Session,
    *,
    user_id: str,
    status: str | None = None,
    due_from: datetime | None = None,
    due_to: datetime | None = None,
    client_id: str | None = None,
    request_id: str | None = None,
) -> list[Reminder]:
    statement = select(Reminder).where(Reminder.user_id == user_id)
    if status is not None:
        statement = statement.where(Reminder.status == status)
    if due_from is not None:
        statement = statement.where(Reminder.due_at >= due_from)
    if due_to is not None:
        statement = statement.where(Reminder.due_at <= due_to)
    if client_id is not None:
        statement = statement.where(Reminder.client_id == client_id)
    if request_id is not None:
        statement = statement.where(Reminder.request_id == request_id)
    statement = statement.order_by(Reminder.due_at.asc(), Reminder.created_at.asc())
    return list(db.scalars(statement))


def get_reminder(
    db: Session,
    *,
    user_id: str,
    reminder_id: str,
) -> Reminder | None:
    statement = select(Reminder).where(
        Reminder.id == reminder_id,
        Reminder.user_id == user_id,
    )
    return db.scalar(statement)


def get_owned_client(
    db: Session,
    *,
    user_id: str,
    client_id: str | None,
) -> Client | None:
    if client_id is None:
        return None
    statement = select(Client).where(Client.id == client_id, Client.user_id == user_id)
    return db.scalar(statement)


def get_owned_request(
    db: Session,
    *,
    user_id: str,
    request_id: str | None,
) -> TravelRequest | None:
    if request_id is None:
        return None
    statement = select(TravelRequest).where(
        TravelRequest.id == request_id,
        TravelRequest.user_id == user_id,
    )
    return db.scalar(statement)


def create_reminder(
    db: Session,
    *,
    user_id: str,
    payload: ReminderCreate,
) -> Reminder:
    reminder = Reminder(user_id=user_id, **payload.model_dump())
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


def update_reminder(
    db: Session,
    *,
    reminder: Reminder,
    payload: ReminderUpdate,
) -> Reminder:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(reminder, field, value)
    db.commit()
    db.refresh(reminder)
    return reminder


def mark_reminder_done(db: Session, *, reminder: Reminder) -> Reminder:
    reminder.status = "done"
    db.commit()
    db.refresh(reminder)
    return reminder


def delete_reminder(db: Session, *, reminder: Reminder) -> None:
    db.delete(reminder)
    db.commit()
