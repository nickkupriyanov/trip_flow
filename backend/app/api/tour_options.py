from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.travel_requests import owned_request_or_404
from app.core.database import get_db
from app.models.tour_option import TourOption
from app.models.user import User
from app.schemas.tour_option import TourOptionCreate, TourOptionRead, TourOptionUpdate
from app.services.tour_options import (
    create_tour_option,
    delete_tour_option,
    get_tour_option,
    list_tour_options,
    update_tour_option,
)

router = APIRouter(tags=["tour options"])


def owned_option_or_404(
    db: Session,
    *,
    current_user: User,
    option_id: str,
) -> TourOption:
    option = get_tour_option(db, user_id=current_user.id, option_id=option_id)
    if option is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tour option not found",
        )
    return option


@router.get("/requests/{request_id}/options", response_model=list[TourOptionRead])
def get_request_options(
    request_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[TourOption]:
    request = owned_request_or_404(db, current_user=current_user, request_id=request_id)
    return list_tour_options(db, request=request)


@router.post(
    "/requests/{request_id}/options",
    response_model=TourOptionRead,
    status_code=status.HTTP_201_CREATED,
)
def post_request_option(
    request_id: str,
    payload: TourOptionCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TourOption:
    request = owned_request_or_404(db, current_user=current_user, request_id=request_id)
    return create_tour_option(db, request=request, payload=payload)


@router.patch("/options/{option_id}", response_model=TourOptionRead)
def patch_option(
    option_id: str,
    payload: TourOptionUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TourOption:
    option = owned_option_or_404(db, current_user=current_user, option_id=option_id)
    return update_tour_option(db, option=option, payload=payload)


@router.delete("/options/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_option(
    option_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    option = owned_option_or_404(db, current_user=current_user, option_id=option_id)
    delete_tour_option(db, option=option)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
