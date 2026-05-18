from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.client import Client, ClientPreference
from app.models.user import User
from app.schemas.client import (
    ClientCreate,
    ClientPreferenceRead,
    ClientPreferenceUpsert,
    ClientRead,
    ClientUpdate,
)
from app.services.clients import (
    create_client,
    delete_client,
    get_client,
    get_client_preferences,
    list_clients,
    update_client,
    upsert_client_preferences,
)

router = APIRouter(prefix="/clients", tags=["clients"])


def owned_client_or_404(db: Session, *, current_user: User, client_id: str) -> Client:
    client = get_client(db, user_id=current_user.id, client_id=client_id)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    return client


@router.get("", response_model=list[ClientRead])
def get_clients(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    search: str | None = None,
) -> list[Client]:
    return list_clients(db, user_id=current_user.id, search=search)


@router.post("", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def post_client(
    payload: ClientCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Client:
    return create_client(db, user_id=current_user.id, payload=payload)


@router.get("/{client_id}", response_model=ClientRead)
def get_client_detail(
    client_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Client:
    return owned_client_or_404(db, current_user=current_user, client_id=client_id)


@router.patch("/{client_id}", response_model=ClientRead)
def patch_client(
    client_id: str,
    payload: ClientUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Client:
    client = owned_client_or_404(db, current_user=current_user, client_id=client_id)
    return update_client(db, client=client, payload=payload)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_client(
    client_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    client = owned_client_or_404(db, current_user=current_user, client_id=client_id)
    delete_client(db, client=client)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{client_id}/preferences", response_model=ClientPreferenceRead | None)
def get_preferences(
    client_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ClientPreference | None:
    client = owned_client_or_404(db, current_user=current_user, client_id=client_id)
    return get_client_preferences(db, client=client)


@router.put("/{client_id}/preferences", response_model=ClientPreferenceRead)
def put_preferences(
    client_id: str,
    payload: ClientPreferenceUpsert,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ClientPreference:
    client = owned_client_or_404(db, current_user=current_user, client_id=client_id)
    return upsert_client_preferences(db, client=client, payload=payload)
