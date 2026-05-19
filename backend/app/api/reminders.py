from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.reminder import Reminder
from app.models.user import User
from app.schemas.reminder import (
    ReminderCreate,
    ReminderRead,
    ReminderStatus,
    ReminderUpdate,
)
from app.services.reminders import (
    create_reminder,
    delete_reminder,
    get_owned_client,
    get_owned_request,
    get_reminder,
    list_reminders,
    mark_reminder_done,
    update_reminder,
)

router = APIRouter(prefix="/reminders", tags=["reminders"])


def reminder_or_404(
    db: Session,
    *,
    current_user: User,
    reminder_id: str,
) -> Reminder:
    reminder = get_reminder(db, user_id=current_user.id, reminder_id=reminder_id)
    if reminder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found",
        )
    return reminder


def verify_reminder_links(
    db: Session,
    *,
    current_user: User,
    client_id: str | None,
    request_id: str | None,
) -> None:
    if client_id is not None and get_owned_client(
        db,
        user_id=current_user.id,
        client_id=client_id,
    ) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    request = get_owned_request(db, user_id=current_user.id, request_id=request_id)
    if request_id is not None and request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Travel request not found",
        )
    if request is not None and client_id is not None and request.client_id != client_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Reminder request must belong to the selected client",
        )


@router.get("", response_model=list[ReminderRead])
def get_reminders(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    status_filter: Annotated[ReminderStatus | None, Query(alias="status")] = None,
    due_from: datetime | None = None,
    due_to: datetime | None = None,
    client_id: str | None = None,
    request_id: str | None = None,
) -> list[Reminder]:
    return list_reminders(
        db,
        user_id=current_user.id,
        status=status_filter,
        due_from=due_from,
        due_to=due_to,
        client_id=client_id,
        request_id=request_id,
    )


@router.post("", response_model=ReminderRead, status_code=status.HTTP_201_CREATED)
def post_reminder(
    payload: ReminderCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Reminder:
    verify_reminder_links(
        db,
        current_user=current_user,
        client_id=payload.client_id,
        request_id=payload.request_id,
    )
    return create_reminder(db, user_id=current_user.id, payload=payload)


@router.patch("/{reminder_id}", response_model=ReminderRead)
def patch_reminder(
    reminder_id: str,
    payload: ReminderUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Reminder:
    reminder = reminder_or_404(db, current_user=current_user, reminder_id=reminder_id)
    client_id = (
        payload.client_id
        if "client_id" in payload.model_fields_set
        else reminder.client_id
    )
    request_id = (
        payload.request_id
        if "request_id" in payload.model_fields_set
        else reminder.request_id
    )
    verify_reminder_links(
        db,
        current_user=current_user,
        client_id=client_id,
        request_id=request_id,
    )
    return update_reminder(db, reminder=reminder, payload=payload)


@router.patch("/{reminder_id}/done", response_model=ReminderRead)
def patch_reminder_done(
    reminder_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Reminder:
    reminder = reminder_or_404(db, current_user=current_user, reminder_id=reminder_id)
    return mark_reminder_done(db, reminder=reminder)


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_reminder(
    reminder_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    reminder = reminder_or_404(db, current_user=current_user, reminder_id=reminder_id)
    delete_reminder(db, reminder=reminder)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
