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


def auth_headers(
    client: TestClient,
    email: str = "agent@example.com",
) -> dict[str, str]:
    response = client.post(
        "/auth/register",
        json={"email": email, "name": "Agent Smith", "password": "strong-password"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_client_record(
    client: TestClient,
    headers: dict[str, str],
    *,
    full_name: str = "Anna Petrova",
) -> dict[str, object]:
    response = client.post(
        "/clients",
        headers=headers,
        json={"fullName": full_name, "phone": "+79990001122"},
    )
    assert response.status_code == 201
    return response.json()


def create_request_record(
    client: TestClient,
    headers: dict[str, str],
    client_id: str,
    *,
    destination: str = "Turkey",
) -> dict[str, object]:
    response = client.post(
        f"/clients/{client_id}/requests",
        headers=headers,
        json={"destination": destination, "wishes": "Family beach hotel"},
    )
    assert response.status_code == 201
    return response.json()


def create_reminder_record(
    client: TestClient,
    headers: dict[str, str],
    payload: dict[str, object] | None = None,
) -> dict[str, object]:
    response = client.post(
        "/reminders",
        headers=headers,
        json=payload
        or {
            "title": "Follow up with Anna",
            "description": "Ask whether the Belek option works",
            "dueAt": "2026-05-19T12:30:00Z",
        },
    )
    assert response.status_code == 201
    return response.json()


def test_reminder_crud_flow_returns_camel_case(client: TestClient) -> None:
    headers = auth_headers(client)
    created_client = create_client_record(client, headers)
    request = create_request_record(client, headers, str(created_client["id"]))

    created = create_reminder_record(
        client,
        headers,
        {
            "clientId": created_client["id"],
            "requestId": request["id"],
            "title": "Follow up with Anna",
            "description": "Ask whether the Belek option works",
            "dueAt": "2026-05-19T12:30:00Z",
        },
    )

    assert created["id"]
    assert created["userId"]
    assert created["clientId"] == created_client["id"]
    assert created["requestId"] == request["id"]
    assert created["title"] == "Follow up with Anna"
    assert created["description"] == "Ask whether the Belek option works"
    assert created["dueAt"].startswith("2026-05-19T12:30:00")
    assert created["status"] == "active"
    assert created["createdAt"]
    assert created["updatedAt"]

    list_response = client.get("/reminders", headers=headers)
    assert list_response.status_code == 200
    assert [item["title"] for item in list_response.json()] == ["Follow up with Anna"]

    update_response = client.patch(
        f"/reminders/{created['id']}",
        headers=headers,
        json={
            "title": "Send refined proposal",
            "description": None,
            "dueAt": "2026-05-20T09:00:00Z",
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["title"] == "Send refined proposal"
    assert updated["description"] is None
    assert updated["dueAt"].startswith("2026-05-20T09:00:00")

    done_response = client.patch(f"/reminders/{created['id']}/done", headers=headers)
    assert done_response.status_code == 200
    assert done_response.json()["status"] == "done"

    delete_response = client.delete(f"/reminders/{created['id']}", headers=headers)
    assert delete_response.status_code == 204
    empty_response = client.get("/reminders", headers=headers)
    assert empty_response.status_code == 200
    assert empty_response.json() == []


def test_reminders_are_filtered_by_status_due_dates_client_and_request(
    client: TestClient,
) -> None:
    headers = auth_headers(client)
    created_client = create_client_record(client, headers)
    request = create_request_record(client, headers, str(created_client["id"]))
    first = create_reminder_record(
        client,
        headers,
        {
            "clientId": created_client["id"],
            "requestId": request["id"],
            "title": "Today follow-up",
            "dueAt": "2026-05-19T08:00:00Z",
        },
    )
    second = create_reminder_record(
        client,
        headers,
        {
            "title": "Future supplier check",
            "dueAt": "2026-05-21T08:00:00Z",
        },
    )
    client.patch(f"/reminders/{second['id']}/done", headers=headers)

    filtered_response = client.get(
        "/reminders",
        headers=headers,
        params={
            "status": "active",
            "due_from": "2026-05-19T00:00:00Z",
            "due_to": "2026-05-20T00:00:00Z",
            "client_id": created_client["id"],
            "request_id": request["id"],
        },
    )

    assert filtered_response.status_code == 200
    assert [item["id"] for item in filtered_response.json()] == [first["id"]]

    done_response = client.get("/reminders", headers=headers, params={"status": "done"})
    assert done_response.status_code == 200
    assert [item["id"] for item in done_response.json()] == [second["id"]]


def test_reminders_are_scoped_to_current_user(client: TestClient) -> None:
    first_headers = auth_headers(client, "first@example.com")
    second_headers = auth_headers(client, "second@example.com")
    first_client = create_client_record(client, first_headers, full_name="First Client")
    second_client = create_client_record(client, second_headers, full_name="Second Client")
    first_request = create_request_record(client, first_headers, str(first_client["id"]))
    reminder = create_reminder_record(
        client,
        first_headers,
        {
            "clientId": first_client["id"],
            "requestId": first_request["id"],
            "title": "Private follow-up",
            "dueAt": "2026-05-19T12:30:00Z",
        },
    )

    forbidden_create_client = client.post(
        "/reminders",
        headers=second_headers,
        json={
            "clientId": first_client["id"],
            "title": "Wrong user client",
            "dueAt": "2026-05-19T12:30:00Z",
        },
    )
    assert forbidden_create_client.status_code == 404

    forbidden_create_request = client.post(
        "/reminders",
        headers=second_headers,
        json={
            "clientId": second_client["id"],
            "requestId": first_request["id"],
            "title": "Wrong user request",
            "dueAt": "2026-05-19T12:30:00Z",
        },
    )
    assert forbidden_create_request.status_code == 404

    assert client.get("/reminders", headers=second_headers).json() == []
    assert (
        client.patch(
            f"/reminders/{reminder['id']}",
            headers=second_headers,
            json={"title": "Hijack reminder"},
        ).status_code
        == 404
    )
    forbidden_done = client.patch(
        f"/reminders/{reminder['id']}/done",
        headers=second_headers,
    )
    forbidden_delete = client.delete(
        f"/reminders/{reminder['id']}",
        headers=second_headers,
    )
    assert forbidden_done.status_code == 404
    assert forbidden_delete.status_code == 404


def test_reminder_validation_rejects_invalid_payloads(client: TestClient) -> None:
    headers = auth_headers(client)

    missing_due_at = client.post(
        "/reminders",
        headers=headers,
        json={"title": "Missing due date"},
    )
    assert missing_due_at.status_code == 422

    blank_title = client.post(
        "/reminders",
        headers=headers,
        json={"title": "   ", "dueAt": "2026-05-19T12:30:00Z"},
    )
    assert blank_title.status_code == 422

    invalid_status = client.get(
        "/reminders",
        headers=headers,
        params={"status": "archived"},
    )
    assert invalid_status.status_code == 422
