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
        json={
            "destination": destination,
            "departureCity": "Moscow",
            "dateFrom": "2026-07-01",
            "dateTo": "2026-07-12",
            "nightsFrom": 10,
            "nightsTo": 11,
            "adults": 2,
            "children": 1,
            "childrenAges": [7],
            "budgetMin": 250000,
            "budgetMax": 350000,
            "travelType": "family beach",
            "wishes": "Kids club and calm beach",
            "restrictions": "No long transfers",
            "internalComment": "VIP family",
        },
    )
    assert response.status_code == 201
    return response.json()


def test_travel_request_crud_flow_returns_camel_case(client: TestClient) -> None:
    headers = auth_headers(client)
    created_client = create_client(client, headers)

    created = create_request(client, headers, str(created_client["id"]))

    assert created["id"]
    assert created["userId"]
    assert created["clientId"] == created_client["id"]
    assert created["status"] == "new"
    assert created["destination"] == "Turkey"
    assert created["departureCity"] == "Moscow"
    assert created["childrenAges"] == [7]
    assert created["createdAt"]
    assert created["updatedAt"]

    list_response = client.get(
        f"/clients/{created_client['id']}/requests",
        headers=headers,
    )
    assert list_response.status_code == 200
    assert [item["destination"] for item in list_response.json()] == ["Turkey"]

    detail_response = client.get(f"/requests/{created['id']}", headers=headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["budgetMax"] == 350000

    update_response = client.patch(
        f"/requests/{created['id']}",
        headers=headers,
        json={
            "status": "searching",
            "destination": "Greece",
            "children": 0,
            "childrenAges": [],
            "internalComment": None,
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["status"] == "searching"
    assert updated["destination"] == "Greece"
    assert updated["children"] == 0
    assert updated["childrenAges"] == []
    assert updated["internalComment"] is None

    delete_response = client.delete(f"/requests/{created['id']}", headers=headers)
    assert delete_response.status_code == 204
    missing_response = client.get(f"/requests/{created['id']}", headers=headers)
    assert missing_response.status_code == 404


def test_lists_current_user_requests_and_groups_pipeline(client: TestClient) -> None:
    first_user_headers = auth_headers(client, "first@example.com")
    second_user_headers = auth_headers(client, "second@example.com")
    first_client = create_client(client, first_user_headers, full_name="First Client")
    second_client = create_client(client, second_user_headers, full_name="Second Client")
    turkey_request = create_request(
        client,
        first_user_headers,
        str(first_client["id"]),
        destination="Turkey",
    )
    greece_request = create_request(
        client,
        first_user_headers,
        str(first_client["id"]),
        destination="Greece",
    )
    create_request(
        client,
        second_user_headers,
        str(second_client["id"]),
        destination="Egypt",
    )

    status_response = client.patch(
        f"/requests/{greece_request['id']}/status",
        headers=first_user_headers,
        json={"status": "searching"},
    )
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "searching"

    list_response = client.get("/requests", headers=first_user_headers)
    assert list_response.status_code == 200
    assert [item["destination"] for item in list_response.json()] == ["Greece", "Turkey"]

    pipeline_response = client.get("/pipeline", headers=first_user_headers)
    assert pipeline_response.status_code == 200
    pipeline = pipeline_response.json()
    assert [item["destination"] for item in pipeline["new"]] == ["Turkey"]
    assert [item["destination"] for item in pipeline["searching"]] == ["Greece"]
    assert pipeline["clarifying"] == []
    assert pipeline["sent"] == []
    assert pipeline["thinking"] == []
    assert pipeline["booked"] == []
    assert pipeline["rejected"] == []

    forbidden_status = client.patch(
        f"/requests/{turkey_request['id']}/status",
        headers=second_user_headers,
        json={"status": "sent"},
    )
    assert forbidden_status.status_code == 404


def test_travel_requests_are_scoped_to_current_user(client: TestClient) -> None:
    first_user_headers = auth_headers(client, "first@example.com")
    second_user_headers = auth_headers(client, "second@example.com")
    first_client = create_client(client, first_user_headers, full_name="First Client")
    second_client = create_client(client, second_user_headers, full_name="Second Client")
    first_request = create_request(client, first_user_headers, str(first_client["id"]))

    forbidden_create = client.post(
        f"/clients/{first_client['id']}/requests",
        headers=second_user_headers,
        json={"destination": "Turkey"},
    )
    assert forbidden_create.status_code == 404

    create_request(client, second_user_headers, str(second_client["id"]), destination="Egypt")

    first_list = client.get(
        f"/clients/{first_client['id']}/requests",
        headers=first_user_headers,
    )
    assert first_list.status_code == 200
    assert [item["destination"] for item in first_list.json()] == ["Turkey"]

    forbidden_detail = client.get(
        f"/requests/{first_request['id']}",
        headers=second_user_headers,
    )
    forbidden_update = client.patch(
        f"/requests/{first_request['id']}",
        headers=second_user_headers,
        json={"status": "sent"},
    )
    forbidden_delete = client.delete(
        f"/requests/{first_request['id']}",
        headers=second_user_headers,
    )

    assert forbidden_detail.status_code == 404
    assert forbidden_update.status_code == 404
    assert forbidden_delete.status_code == 404


def test_travel_request_validation_rejects_invalid_numbers_and_status(
    client: TestClient,
) -> None:
    headers = auth_headers(client)
    created_client = create_client(client, headers)

    invalid_create = client.post(
        f"/clients/{created_client['id']}/requests",
        headers=headers,
        json={"adults": 0, "children": -1, "childrenAges": [-2]},
    )
    assert invalid_create.status_code == 422

    created = create_request(client, headers, str(created_client["id"]))
    invalid_update = client.patch(
        f"/requests/{created['id']}",
        headers=headers,
        json={"status": "paid"},
    )
    assert invalid_update.status_code == 422

    invalid_status_update = client.patch(
        f"/requests/{created['id']}/status",
        headers=headers,
        json={"status": "paid"},
    )
    assert invalid_status_update.status_code == 422
