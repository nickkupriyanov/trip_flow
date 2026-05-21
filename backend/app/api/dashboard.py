from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.dashboard import (
    DashboardPreferencesRead,
    DashboardPreferencesUpdate,
)
from app.services.dashboard import (
    get_dashboard_widget_order,
    update_dashboard_preferences,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/preferences", response_model=DashboardPreferencesRead)
def get_dashboard_preferences(
    current_user: Annotated[User, Depends(get_current_user)],
) -> DashboardPreferencesRead:
    return DashboardPreferencesRead(
        dashboard_widget_order=get_dashboard_widget_order(current_user),
    )


@router.patch("/preferences", response_model=DashboardPreferencesRead)
def patch_dashboard_preferences(
    payload: DashboardPreferencesUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> DashboardPreferencesRead:
    return DashboardPreferencesRead(
        dashboard_widget_order=update_dashboard_preferences(
            db,
            user=current_user,
            payload=payload,
        ),
    )
