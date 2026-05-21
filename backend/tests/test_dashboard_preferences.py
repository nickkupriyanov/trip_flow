from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import create_app


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


def auth_headers(client: TestClient, email: str = "agent@example.com") -> dict[str, str]:
    response = client.post(
        "/auth/register",
        json={"email": email, "name": "Agent Smith", "password": "strong-password"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_reads_default_dashboard_preferences(client: TestClient) -> None:
    headers = auth_headers(client)

    response = client.get("/dashboard/preferences", headers=headers)

    assert response.status_code == 200
    assert response.json() == {
        "dashboardWidgetOrder": [
            "overview",
            "todayReminders",
            "recentClients",
            "miniPipeline",
        ],
    }


def test_saves_dashboard_widget_order(client: TestClient) -> None:
    headers = auth_headers(client)
    widget_order = ["miniPipeline", "overview", "todayReminders", "recentClients"]

    patch_response = client.patch(
        "/dashboard/preferences",
        headers=headers,
        json={"dashboardWidgetOrder": widget_order},
    )
    get_response = client.get("/dashboard/preferences", headers=headers)

    assert patch_response.status_code == 200
    assert patch_response.json()["dashboardWidgetOrder"] == widget_order
    assert get_response.status_code == 200
    assert get_response.json()["dashboardWidgetOrder"] == widget_order


@pytest.mark.parametrize(
    "widget_order",
    [
        ["overview", "todayReminders", "recentClients"],
        ["overview", "todayReminders", "recentClients", "overview"],
        ["overview", "todayReminders", "recentClients", "unknownWidget"],
    ],
)
def test_rejects_invalid_dashboard_widget_order(
    client: TestClient,
    widget_order: list[str],
) -> None:
    headers = auth_headers(client)

    response = client.patch(
        "/dashboard/preferences",
        headers=headers,
        json={"dashboardWidgetOrder": widget_order},
    )

    assert response.status_code == 422


def test_dashboard_preferences_are_scoped_to_current_user(client: TestClient) -> None:
    first_headers = auth_headers(client, "first@example.com")
    second_headers = auth_headers(client, "second@example.com")
    first_order = ["miniPipeline", "overview", "todayReminders", "recentClients"]

    update_response = client.patch(
        "/dashboard/preferences",
        headers=first_headers,
        json={"dashboardWidgetOrder": first_order},
    )
    second_response = client.get("/dashboard/preferences", headers=second_headers)

    assert update_response.status_code == 200
    assert second_response.status_code == 200
    assert second_response.json()["dashboardWidgetOrder"] == [
        "overview",
        "todayReminders",
        "recentClients",
        "miniPipeline",
    ]
