from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.tour_option import TourOption
from app.models.travel_request import TravelRequest
from app.schemas.tour_option import TourOptionCreate, TourOptionUpdate


def list_tour_options(db: Session, *, request: TravelRequest) -> list[TourOption]:
    statement = (
        select(TourOption)
        .where(TourOption.request_id == request.id)
        .order_by(TourOption.created_at.asc())
    )
    return list(db.scalars(statement))


def get_tour_option(
    db: Session,
    *,
    user_id: str,
    option_id: str,
) -> TourOption | None:
    statement = (
        select(TourOption)
        .join(TravelRequest)
        .where(TourOption.id == option_id, TravelRequest.user_id == user_id)
    )
    return db.scalar(statement)


def clear_recommended_options(
    db: Session,
    *,
    request_id: str,
    except_option_id: str | None = None,
) -> None:
    statement = select(TourOption).where(TourOption.request_id == request_id)
    if except_option_id is not None:
        statement = statement.where(TourOption.id != except_option_id)

    for option in db.scalars(statement):
        option.is_recommended = False


def create_tour_option(
    db: Session,
    *,
    request: TravelRequest,
    payload: TourOptionCreate,
) -> TourOption:
    if payload.is_recommended:
        clear_recommended_options(db, request_id=request.id)

    option = TourOption(request_id=request.id, **payload.model_dump())
    db.add(option)
    db.commit()
    db.refresh(option)
    return option


def create_tour_options(
    db: Session,
    *,
    request: TravelRequest,
    payloads: list[TourOptionCreate],
) -> list[TourOption]:
    options = [
        TourOption(request_id=request.id, **payload.model_dump())
        for payload in payloads
    ]
    db.add_all(options)
    db.commit()
    for option in options:
        db.refresh(option)
    return options


def update_tour_option(
    db: Session,
    *,
    option: TourOption,
    payload: TourOptionUpdate,
) -> TourOption:
    values = payload.model_dump(exclude_unset=True)
    if values.get("is_recommended") is True:
        clear_recommended_options(
            db,
            request_id=option.request_id,
            except_option_id=option.id,
        )

    for field, value in values.items():
        setattr(option, field, value)

    db.commit()
    db.refresh(option)
    return option


def delete_tour_option(db: Session, *, option: TourOption) -> None:
    db.delete(option)
    db.commit()
