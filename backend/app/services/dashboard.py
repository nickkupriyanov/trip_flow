from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.dashboard import (
    DEFAULT_DASHBOARD_WIDGET_ORDER,
    DashboardPreferencesUpdate,
    DashboardWidgetId,
)


def get_dashboard_widget_order(user: User) -> list[DashboardWidgetId]:
    if user.dashboard_widget_order is None:
        return DEFAULT_DASHBOARD_WIDGET_ORDER.copy()
    return list(user.dashboard_widget_order)


def update_dashboard_preferences(
    db: Session,
    *,
    user: User,
    payload: DashboardPreferencesUpdate,
) -> list[DashboardWidgetId]:
    user.dashboard_widget_order = list(payload.dashboard_widget_order)
    db.add(user)
    db.commit()
    db.refresh(user)
    return get_dashboard_widget_order(user)
