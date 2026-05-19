from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.travel_requests import owned_request_or_404
from app.core.database import get_db
from app.models.proposal import Proposal
from app.models.user import User
from app.schemas.proposal import ProposalCreate, ProposalRead, ProposalUpdate
from app.services.proposals import (
    create_proposal,
    delete_proposal,
    get_proposal,
    list_proposals,
    update_proposal,
)

router = APIRouter(tags=["proposals"])


def owned_proposal_or_404(
    db: Session,
    *,
    current_user: User,
    proposal_id: str,
) -> Proposal:
    proposal = get_proposal(db, user_id=current_user.id, proposal_id=proposal_id)
    if proposal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found",
        )
    return proposal


@router.get("/requests/{request_id}/proposals", response_model=list[ProposalRead])
def get_request_proposals(
    request_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Proposal]:
    request = owned_request_or_404(db, current_user=current_user, request_id=request_id)
    return list_proposals(db, request=request)


@router.post(
    "/requests/{request_id}/proposals",
    response_model=ProposalRead,
    status_code=status.HTTP_201_CREATED,
)
def post_request_proposal(
    request_id: str,
    payload: ProposalCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Proposal:
    request = owned_request_or_404(db, current_user=current_user, request_id=request_id)
    return create_proposal(db, request=request, payload=payload)


@router.patch("/proposals/{proposal_id}", response_model=ProposalRead)
def patch_proposal(
    proposal_id: str,
    payload: ProposalUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Proposal:
    proposal = owned_proposal_or_404(
        db,
        current_user=current_user,
        proposal_id=proposal_id,
    )
    return update_proposal(db, proposal=proposal, payload=payload)


@router.delete("/proposals/{proposal_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_proposal(
    proposal_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    proposal = owned_proposal_or_404(
        db,
        current_user=current_user,
        proposal_id=proposal_id,
    )
    delete_proposal(db, proposal=proposal)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
