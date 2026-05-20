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


def test_client_note_crud_flow_returns_camel_case(client: TestClient) -> None:
    headers = auth_headers(client)
    created_client = create_client_record(client, headers)

    created_response = client.post(
        f"/clients/{created_client['id']}/notes",
        headers=headers,
        json={"type": "telegram", "content": "Client asked for a calmer hotel."},
    )

    assert created_response.status_code == 201
    created = created_response.json()
    assert created["id"]
    assert created["clientId"] == created_client["id"]
    assert created["requestId"] is None
    assert created["type"] == "telegram"
    assert created["content"] == "Client asked for a calmer hotel."
    assert created["createdAt"]
    assert created["updatedAt"]

    list_response = client.get(
        f"/clients/{created_client['id']}/notes",
        headers=headers,
    )
    assert list_response.status_code == 200
    assert [item["content"] for item in list_response.json()] == [
        "Client asked for a calmer hotel."
    ]

    update_response = client.patch(
        f"/notes/{created['id']}",
        headers=headers,
        json={"type": "call", "content": "Called client and confirmed budget."},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["type"] == "call"
    assert updated["content"] == "Called client and confirmed budget."

    delete_response = client.delete(f"/notes/{created['id']}", headers=headers)
    assert delete_response.status_code == 204
    empty_response = client.get(
        f"/clients/{created_client['id']}/notes",
        headers=headers,
    )
    assert empty_response.status_code == 200
    assert empty_response.json() == []


def test_request_notes_are_listed_for_their_request_and_client(
    client: TestClient,
) -> None:
    headers = auth_headers(client)
    created_client = create_client_record(client, headers)
    request = create_request_record(client, headers, str(created_client["id"]))

    created_response = client.post(
        f"/clients/{created_client['id']}/notes",
        headers=headers,
        json={
            "requestId": request["id"],
            "type": "whatsapp",
            "content": "Sent the Belek shortlist.",
        },
    )
    assert created_response.status_code == 201
    created = created_response.json()
    assert created["requestId"] == request["id"]

    request_list_response = client.get(
        f"/requests/{request['id']}/notes",
        headers=headers,
    )
    assert request_list_response.status_code == 200
    assert [item["id"] for item in request_list_response.json()] == [created["id"]]

    client_list_response = client.get(
        f"/clients/{created_client['id']}/notes",
        headers=headers,
    )
    assert client_list_response.status_code == 200
    assert [item["id"] for item in client_list_response.json()] == [created["id"]]


def test_notes_are_scoped_to_current_user(client: TestClient) -> None:
    first_headers = auth_headers(client, "first@example.com")
    second_headers = auth_headers(client, "second@example.com")
    first_client = create_client_record(client, first_headers, full_name="First Client")
    second_client = create_client_record(client, second_headers, full_name="Second Client")
    first_request = create_request_record(client, first_headers, str(first_client["id"]))
    note_response = client.post(
        f"/clients/{first_client['id']}/notes",
        headers=first_headers,
        json={
            "requestId": first_request["id"],
            "type": "note",
            "content": "Private note",
        },
    )
    assert note_response.status_code == 201
    note = note_response.json()

    forbidden_client_list = client.get(
        f"/clients/{first_client['id']}/notes",
        headers=second_headers,
    )
    assert forbidden_client_list.status_code == 404

    forbidden_request_list = client.get(
        f"/requests/{first_request['id']}/notes",
        headers=second_headers,
    )
    assert forbidden_request_list.status_code == 404

    forbidden_create_client = client.post(
        f"/clients/{first_client['id']}/notes",
        headers=second_headers,
        json={"type": "note", "content": "Wrong user client"},
    )
    assert forbidden_create_client.status_code == 404

    forbidden_create_request = client.post(
        f"/clients/{second_client['id']}/notes",
        headers=second_headers,
        json={
            "requestId": first_request["id"],
            "type": "note",
            "content": "Wrong user request",
        },
    )
    assert forbidden_create_request.status_code == 404

    forbidden_update = client.patch(
        f"/notes/{note['id']}",
        headers=second_headers,
        json={"content": "Hijack note"},
    )
    forbidden_delete = client.delete(f"/notes/{note['id']}", headers=second_headers)
    assert forbidden_update.status_code == 404
    assert forbidden_delete.status_code == 404


def test_note_request_must_belong_to_the_client(client: TestClient) -> None:
    headers = auth_headers(client)
    first_client = create_client_record(client, headers, full_name="First Client")
    second_client = create_client_record(client, headers, full_name="Second Client")
    second_request = create_request_record(client, headers, str(second_client["id"]))

    response = client.post(
        f"/clients/{first_client['id']}/notes",
        headers=headers,
        json={
            "requestId": second_request["id"],
            "type": "note",
            "content": "Mismatched request",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Travel request does not belong to client"


def test_note_validation_rejects_invalid_payloads(client: TestClient) -> None:
    headers = auth_headers(client)
    created_client = create_client_record(client, headers)

    blank_content = client.post(
        f"/clients/{created_client['id']}/notes",
        headers=headers,
        json={"type": "note", "content": "   "},
    )
    assert blank_content.status_code == 422

    invalid_type = client.post(
        f"/clients/{created_client['id']}/notes",
        headers=headers,
        json={"type": "sms", "content": "Asked for passport details."},
    )
    assert invalid_type.status_code == 422
