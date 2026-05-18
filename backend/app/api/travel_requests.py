from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.clients import owned_client_or_404
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.travel_request import TravelRequest
from app.models.user import User
from app.schemas.travel_request import (
    PipelineRead,
    PipelineTravelRequestRead,
    TravelRequestCreate,
    TravelRequestRead,
    TravelRequestStatusUpdate,
    TravelRequestUpdate,
)
from app.services.travel_requests import (
    TRAVEL_REQUEST_STATUSES,
    create_request,
    delete_request,
    get_request,
    list_pipeline_requests,
    list_client_requests,
    list_requests,
    update_request,
    update_request_status,
)

router = APIRouter(tags=["travel requests"])


def owned_request_or_404(
    db: Session,
    *,
    current_user: User,
    request_id: str,
) -> TravelRequest:
    request = get_request(db, user_id=current_user.id, request_id=request_id)
    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Travel request not found",
        )
    return request


def to_pipeline_item(request: TravelRequest) -> PipelineTravelRequestRead:
    return PipelineTravelRequestRead.model_validate(
        {
            **TravelRequestRead.model_validate(request).model_dump(),
            "client_full_name": request.client.full_name,
        }
    )


@router.get("/requests", response_model=list[TravelRequestRead])
def get_requests(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[TravelRequest]:
    return list_requests(db, user_id=current_user.id)


@router.get("/pipeline", response_model=PipelineRead)
def get_pipeline(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> PipelineRead:
    grouped = {status_name: [] for status_name in TRAVEL_REQUEST_STATUSES}
    for request in list_pipeline_requests(db, user_id=current_user.id):
        grouped[request.status].append(to_pipeline_item(request))
    return PipelineRead.model_validate(grouped)


@router.get("/clients/{client_id}/requests", response_model=list[TravelRequestRead])
def get_client_requests(
    client_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[TravelRequest]:
    client = owned_client_or_404(db, current_user=current_user, client_id=client_id)
    return list_client_requests(db, user_id=current_user.id, client=client)


@router.post(
    "/clients/{client_id}/requests",
    response_model=TravelRequestRead,
    status_code=status.HTTP_201_CREATED,
)
def post_client_request(
    client_id: str,
    payload: TravelRequestCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TravelRequest:
    client = owned_client_or_404(db, current_user=current_user, client_id=client_id)
    return create_request(db, user_id=current_user.id, client=client, payload=payload)


@router.get("/requests/{request_id}", response_model=TravelRequestRead)
def get_request_detail(
    request_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TravelRequest:
    return owned_request_or_404(db, current_user=current_user, request_id=request_id)


@router.patch("/requests/{request_id}", response_model=TravelRequestRead)
def patch_request(
    request_id: str,
    payload: TravelRequestUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TravelRequest:
    request = owned_request_or_404(db, current_user=current_user, request_id=request_id)
    return update_request(db, request=request, payload=payload)


@router.patch("/requests/{request_id}/status", response_model=TravelRequestRead)
def patch_request_status(
    request_id: str,
    payload: TravelRequestStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TravelRequest:
    request = owned_request_or_404(db, current_user=current_user, request_id=request_id)
    return update_request_status(db, request=request, status=payload.status)


@router.delete("/requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_request(
    request_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    request = owned_request_or_404(db, current_user=current_user, request_id=request_id)
    delete_request(db, request=request)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
