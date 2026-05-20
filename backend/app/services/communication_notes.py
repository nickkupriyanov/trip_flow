from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.communication_note import CommunicationNote
from app.models.travel_request import TravelRequest
from app.schemas.communication_note import (
    CommunicationNoteCreate,
    CommunicationNoteUpdate,
)


def list_client_notes(db: Session, *, client: Client) -> list[CommunicationNote]:
    statement = (
        select(CommunicationNote)
        .where(CommunicationNote.client_id == client.id)
        .order_by(CommunicationNote.created_at.desc())
    )
    return list(db.scalars(statement))


def list_request_notes(
    db: Session,
    *,
    request: TravelRequest,
) -> list[CommunicationNote]:
    statement = (
        select(CommunicationNote)
        .where(CommunicationNote.request_id == request.id)
        .order_by(CommunicationNote.created_at.desc())
    )
    return list(db.scalars(statement))


def get_note(
    db: Session,
    *,
    user_id: str,
    note_id: str,
) -> CommunicationNote | None:
    statement = (
        select(CommunicationNote)
        .join(Client, CommunicationNote.client_id == Client.id)
        .where(
            CommunicationNote.id == note_id,
            Client.user_id == user_id,
        )
    )
    return db.scalar(statement)


def create_note(
    db: Session,
    *,
    client: Client,
    payload: CommunicationNoteCreate,
) -> CommunicationNote:
    note = CommunicationNote(client_id=client.id, **payload.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def update_note(
    db: Session,
    *,
    note: CommunicationNote,
    payload: CommunicationNoteUpdate,
) -> CommunicationNote:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(note, field, value)
    db.commit()
    db.refresh(note)
    return note


def delete_note(db: Session, *, note: CommunicationNote) -> None:
    db.delete(note)
    db.commit()
