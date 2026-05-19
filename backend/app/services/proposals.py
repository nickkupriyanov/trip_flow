from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.proposal import Proposal
from app.models.travel_request import TravelRequest
from app.schemas.proposal import ProposalCreate, ProposalUpdate


def list_proposals(db: Session, *, request: TravelRequest) -> list[Proposal]:
    statement = (
        select(Proposal)
        .where(Proposal.request_id == request.id)
        .order_by(Proposal.created_at.asc())
    )
    return list(db.scalars(statement))


def get_proposal(
    db: Session,
    *,
    user_id: str,
    proposal_id: str,
) -> Proposal | None:
    statement = (
        select(Proposal)
        .join(TravelRequest)
        .where(Proposal.id == proposal_id, TravelRequest.user_id == user_id)
    )
    return db.scalar(statement)


def create_proposal(
    db: Session,
    *,
    request: TravelRequest,
    payload: ProposalCreate,
) -> Proposal:
    proposal = Proposal(request_id=request.id, **payload.model_dump())
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    return proposal


def update_proposal(
    db: Session,
    *,
    proposal: Proposal,
    payload: ProposalUpdate,
) -> Proposal:
    values = payload.model_dump(exclude_unset=True)
    for field, value in values.items():
        setattr(proposal, field, value)

    db.commit()
    db.refresh(proposal)
    return proposal


def delete_proposal(db: Session, *, proposal: Proposal) -> None:
    db.delete(proposal)
    db.commit()
