from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.client import Client, ClientPreference
from app.schemas.client import ClientCreate, ClientPreferenceUpsert, ClientUpdate


def list_clients(db: Session, *, user_id: str, search: str | None = None) -> list[Client]:
    statement = select(Client).where(Client.user_id == user_id)
    if search:
        term = f"%{search.strip().lower()}%"
        statement = statement.where(
            or_(
                Client.full_name.ilike(term),
                Client.phone.ilike(term),
                Client.email.ilike(term),
                Client.telegram.ilike(term),
                Client.whatsapp.ilike(term),
                Client.city.ilike(term),
                Client.source.ilike(term),
            )
        )
    statement = statement.order_by(Client.created_at.desc())
    return list(db.scalars(statement))


def get_client(db: Session, *, user_id: str, client_id: str) -> Client | None:
    statement = select(Client).where(Client.id == client_id, Client.user_id == user_id)
    return db.scalar(statement)


def create_client(db: Session, *, user_id: str, payload: ClientCreate) -> Client:
    client = Client(user_id=user_id, **payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


def update_client(db: Session, *, client: Client, payload: ClientUpdate) -> Client:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    return client


def delete_client(db: Session, *, client: Client) -> None:
    db.delete(client)
    db.commit()


def get_client_preferences(
    db: Session,
    *,
    client: Client,
) -> ClientPreference | None:
    statement = select(ClientPreference).where(ClientPreference.client_id == client.id)
    return db.scalar(statement)


def upsert_client_preferences(
    db: Session,
    *,
    client: Client,
    payload: ClientPreferenceUpsert,
) -> ClientPreference:
    preferences = get_client_preferences(db, client=client)
    if preferences is None:
        preferences = ClientPreference(client_id=client.id)
        db.add(preferences)

    for field, value in payload.model_dump().items():
        setattr(preferences, field, value)

    db.commit()
    db.refresh(preferences)
    return preferences
