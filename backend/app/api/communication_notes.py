from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.clients import owned_client_or_404
from app.api.deps import get_current_user
from app.api.travel_requests import owned_request_or_404
from app.core.database import get_db
from app.models.communication_note import CommunicationNote
from app.models.user import User
from app.schemas.communication_note import (
    CommunicationNoteCreate,
    CommunicationNoteRead,
    CommunicationNoteUpdate,
)
from app.services.communication_notes import (
    create_note,
    delete_note,
    get_note,
    list_client_notes,
    list_request_notes,
    update_note,
)

router = APIRouter(tags=["communication notes"])


def note_or_404(
    db: Session,
    *,
    current_user: User,
    note_id: str,
) -> CommunicationNote:
    note = get_note(db, user_id=current_user.id, note_id=note_id)
    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Communication note not found",
        )
    return note


def verify_request_belongs_to_client(
    *,
    client_id: str,
    request_client_id: str,
) -> None:
    if request_client_id != client_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Travel request does not belong to client",
        )


@router.get("/clients/{client_id}/notes", response_model=list[CommunicationNoteRead])
def get_client_notes(
    client_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[CommunicationNote]:
    client = owned_client_or_404(db, current_user=current_user, client_id=client_id)
    return list_client_notes(db, client=client)


@router.post(
    "/clients/{client_id}/notes",
    response_model=CommunicationNoteRead,
    status_code=status.HTTP_201_CREATED,
)
def post_client_note(
    client_id: str,
    payload: CommunicationNoteCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CommunicationNote:
    client = owned_client_or_404(db, current_user=current_user, client_id=client_id)
    if payload.request_id is not None:
        request = owned_request_or_404(
            db,
            current_user=current_user,
            request_id=payload.request_id,
        )
        verify_request_belongs_to_client(
            client_id=client.id,
            request_client_id=request.client_id,
        )
    return create_note(db, client=client, payload=payload)


@router.get("/requests/{request_id}/notes", response_model=list[CommunicationNoteRead])
def get_request_notes(
    request_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[CommunicationNote]:
    request = owned_request_or_404(
        db,
        current_user=current_user,
        request_id=request_id,
    )
    return list_request_notes(db, request=request)


@router.patch("/notes/{note_id}", response_model=CommunicationNoteRead)
def patch_note(
    note_id: str,
    payload: CommunicationNoteUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CommunicationNote:
    note = note_or_404(db, current_user=current_user, note_id=note_id)
    return update_note(db, note=note, payload=payload)


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_note(
    note_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    note = note_or_404(db, current_user=current_user, note_id=note_id)
    delete_note(db, note=note)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
