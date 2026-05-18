from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.client import Client
from app.models.travel_request import TravelRequest
from app.schemas.travel_request import TravelRequestCreate, TravelRequestUpdate


TRAVEL_REQUEST_STATUSES = [
    "new",
    "clarifying",
    "searching",
    "sent",
    "thinking",
    "booked",
    "rejected",
]


def list_requests(db: Session, *, user_id: str) -> list[TravelRequest]:
    statement = (
        select(TravelRequest)
        .where(TravelRequest.user_id == user_id)
        .order_by(TravelRequest.created_at.desc())
    )
    return list(db.scalars(statement))


def list_pipeline_requests(db: Session, *, user_id: str) -> list[TravelRequest]:
    statement = (
        select(TravelRequest)
        .options(selectinload(TravelRequest.client))
        .where(TravelRequest.user_id == user_id)
        .order_by(TravelRequest.created_at.desc())
    )
    return list(db.scalars(statement))


def list_client_requests(
    db: Session,
    *,
    user_id: str,
    client: Client,
) -> list[TravelRequest]:
    statement = (
        select(TravelRequest)
        .where(
            TravelRequest.user_id == user_id,
            TravelRequest.client_id == client.id,
        )
        .order_by(TravelRequest.created_at.desc())
    )
    return list(db.scalars(statement))


def get_request(
    db: Session,
    *,
    user_id: str,
    request_id: str,
) -> TravelRequest | None:
    statement = select(TravelRequest).where(
        TravelRequest.id == request_id,
        TravelRequest.user_id == user_id,
    )
    return db.scalar(statement)


def create_request(
    db: Session,
    *,
    user_id: str,
    client: Client,
    payload: TravelRequestCreate,
) -> TravelRequest:
    request = TravelRequest(
        user_id=user_id,
        client_id=client.id,
        **payload.model_dump(),
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def update_request(
    db: Session,
    *,
    request: TravelRequest,
    payload: TravelRequestUpdate,
) -> TravelRequest:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(request, field, value)
    db.commit()
    db.refresh(request)
    return request


def update_request_status(
    db: Session,
    *,
    request: TravelRequest,
    status: str,
) -> TravelRequest:
    request.status = status
    db.commit()
    db.refresh(request)
    return request


def delete_request(db: Session, *, request: TravelRequest) -> None:
    db.delete(request)
    db.commit()
