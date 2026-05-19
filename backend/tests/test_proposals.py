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


def create_client(
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


def create_request(
    client: TestClient,
    headers: dict[str, str],
    client_id: str,
    *,
    destination: str = "Turkey",
) -> dict[str, object]:
    response = client.post(
        f"/clients/{client_id}/requests",
        headers=headers,
        json={"destination": destination},
    )
    assert response.status_code == 201
    return response.json()


def create_proposal(
    client: TestClient,
    headers: dict[str, str],
    request_id: str,
    *,
    title: str = "Family Turkey proposal",
    content: str = "Anna, here are two calm family options in Belek.",
    format: str = "telegram",
) -> dict[str, object]:
    response = client.post(
        f"/requests/{request_id}/proposals",
        headers=headers,
        json={"title": title, "content": content, "format": format},
    )
    assert response.status_code == 201
    return response.json()


def test_proposal_crud_flow_returns_camel_case(client: TestClient) -> None:
    headers = auth_headers(client)
    created_client = create_client(client, headers)
    request = create_request(client, headers, str(created_client["id"]))

    created = create_proposal(client, headers, str(request["id"]))

    assert created["id"]
    assert created["requestId"] == request["id"]
    assert created["title"] == "Family Turkey proposal"
    assert created["content"] == "Anna, here are two calm family options in Belek."
    assert created["format"] == "telegram"
    assert created["createdAt"]
    assert created["updatedAt"]

    list_response = client.get(f"/requests/{request['id']}/proposals", headers=headers)
    assert list_response.status_code == 200
    assert [item["title"] for item in list_response.json()] == [
        "Family Turkey proposal"
    ]

    update_response = client.patch(
        f"/proposals/{created['id']}",
        headers=headers,
        json={
            "title": "WhatsApp follow-up",
            "content": "Anna, sending the strongest option again.",
            "format": "whatsapp",
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["title"] == "WhatsApp follow-up"
    assert updated["content"] == "Anna, sending the strongest option again."
    assert updated["format"] == "whatsapp"

    delete_response = client.delete(f"/proposals/{created['id']}", headers=headers)
    assert delete_response.status_code == 204
    empty_response = client.get(f"/requests/{request['id']}/proposals", headers=headers)
    assert empty_response.status_code == 200
    assert empty_response.json() == []


def test_proposals_are_scoped_through_owned_request(client: TestClient) -> None:
    first_user_headers = auth_headers(client, "first@example.com")
    second_user_headers = auth_headers(client, "second@example.com")
    first_client = create_client(client, first_user_headers, full_name="First Client")
    second_client = create_client(client, second_user_headers, full_name="Second Client")
    first_request = create_request(client, first_user_headers, str(first_client["id"]))
    second_request = create_request(
        client,
        second_user_headers,
        str(second_client["id"]),
    )
    first_proposal = create_proposal(
        client,
        first_user_headers,
        str(first_request["id"]),
    )

    forbidden_list = client.get(
        f"/requests/{first_request['id']}/proposals",
        headers=second_user_headers,
    )
    forbidden_create = client.post(
        f"/requests/{first_request['id']}/proposals",
        headers=second_user_headers,
        json={"title": "Leaked proposal", "content": "Hidden", "format": "telegram"},
    )
    forbidden_update = client.patch(
        f"/proposals/{first_proposal['id']}",
        headers=second_user_headers,
        json={"title": "Leaked title"},
    )
    forbidden_delete = client.delete(
        f"/proposals/{first_proposal['id']}",
        headers=second_user_headers,
    )

    assert forbidden_list.status_code == 404
    assert forbidden_create.status_code == 404
    assert forbidden_update.status_code == 404
    assert forbidden_delete.status_code == 404

    own_proposal = create_proposal(client, second_user_headers, str(second_request["id"]))
    assert own_proposal["title"] == "Family Turkey proposal"


def test_proposal_validation_rejects_blank_text_and_invalid_format(
    client: TestClient,
) -> None:
    headers = auth_headers(client)
    created_client = create_client(client, headers)
    request = create_request(client, headers, str(created_client["id"]))

    invalid_create = client.post(
        f"/requests/{request['id']}/proposals",
        headers=headers,
        json={"title": " ", "content": "", "format": "sms"},
    )
    assert invalid_create.status_code == 422

    created = create_proposal(client, headers, str(request["id"]))
    invalid_update = client.patch(
        f"/proposals/{created['id']}",
        headers=headers,
        json={"format": "sms"},
    )
    assert invalid_update.status_code == 422
