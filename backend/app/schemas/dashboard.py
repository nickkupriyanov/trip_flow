from typing import Literal

from pydantic import Field, model_validator

from app.schemas.client import CamelModel


DashboardWidgetId = Literal[
    "overview",
    "todayReminders",
    "recentClients",
    "miniPipeline",
]

DEFAULT_DASHBOARD_WIDGET_ORDER: list[DashboardWidgetId] = [
    "overview",
    "todayReminders",
    "recentClients",
    "miniPipeline",
]


class DashboardPreferencesRead(CamelModel):
    dashboard_widget_order: list[DashboardWidgetId]


class DashboardPreferencesUpdate(CamelModel):
    dashboard_widget_order: list[DashboardWidgetId] = Field(min_length=4, max_length=4)

    @model_validator(mode="after")
    def validate_widget_order(self) -> "DashboardPreferencesUpdate":
        if set(self.dashboard_widget_order) != set(DEFAULT_DASHBOARD_WIDGET_ORDER):
            raise ValueError("Dashboard widget order must include each widget exactly once")
        return self
