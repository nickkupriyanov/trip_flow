from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.ai import GenerateProposalRequest, GenerateProposalResponse
from app.services.ai import (
    AIConfigurationError,
    AIProviderError,
    build_generation_input,
    generate_proposal_draft,
    load_generation_context,
)
from app.services.generation_tasks import (
    create_generation_task,
    mark_generation_task_done,
    mark_generation_task_failed,
)

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/generate-proposal", response_model=GenerateProposalResponse)
def post_generate_proposal(
    payload: GenerateProposalRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> GenerateProposalResponse:
    request, options, preferences = load_generation_context(
        db,
        user_id=current_user.id,
        payload=payload,
    )
    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Travel request not found",
        )

    generation_input = build_generation_input(
        request=request,
        options=options,
        preferences=preferences,
        payload=payload,
    )
    task = create_generation_task(
        db,
        user_id=current_user.id,
        client_id=request.client_id,
        request_id=request.id,
        task_type="proposal",
        status="processing",
        input_data=generation_input,
    )

    try:
        draft = generate_proposal_draft(
            settings=settings,
            generation_input=generation_input,
        )
    except AIConfigurationError as exc:
        mark_generation_task_failed(db, task=task, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except AIProviderError as exc:
        mark_generation_task_failed(db, task=task, error="AI provider request failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider failed to generate a proposal draft",
        ) from exc

    output = draft.model_dump(mode="json", by_alias=True)
    mark_generation_task_done(db, task=task, output=output)
    return GenerateProposalResponse.model_validate(
        {**draft.model_dump(), "generation_task_id": task.id}
    )
