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
    email: str = "anna@example.com",
) -> dict[str, object]:
    response = client.post(
        "/clients",
        headers=headers,
        json={
            "fullName": full_name,
            "phone": "+79990001122",
            "email": email,
            "telegram": "@anna_travel",
            "whatsapp": "+79990001122",
            "city": "Moscow",
            "source": "Telegram",
            "tags": ["family", "vip"],
            "notes": "Prefers calm resorts",
        },
    )
    assert response.status_code == 201
    return response.json()


def test_client_crud_flow_requires_auth_and_returns_camel_case(client: TestClient) -> None:
    unauthenticated_response = client.get("/clients")
    assert unauthenticated_response.status_code == 403

    headers = auth_headers(client)
    created = create_client(client, headers)

    assert created["id"]
    assert created["userId"]
    assert created["fullName"] == "Anna Petrova"
    assert created["tags"] == ["family", "vip"]
    assert created["createdAt"]
    assert created["updatedAt"]

    list_response = client.get("/clients", headers=headers)
    assert list_response.status_code == 200
    assert [item["fullName"] for item in list_response.json()] == ["Anna Petrova"]

    detail_response = client.get(f"/clients/{created['id']}", headers=headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["email"] == "anna@example.com"

    update_response = client.patch(
        f"/clients/{created['id']}",
        headers=headers,
        json={"fullName": "Anna Ivanova", "tags": ["honeymoon"], "notes": None},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["fullName"] == "Anna Ivanova"
    assert updated["tags"] == ["honeymoon"]
    assert updated["notes"] is None

    delete_response = client.delete(f"/clients/{created['id']}", headers=headers)
    assert delete_response.status_code == 204
    missing_response = client.get(f"/clients/{created['id']}", headers=headers)
    assert missing_response.status_code == 404


def test_clients_are_scoped_to_current_user(client: TestClient) -> None:
    first_user_headers = auth_headers(client, "first@example.com")
    second_user_headers = auth_headers(client, "second@example.com")
    first_user_client = create_client(client, first_user_headers, full_name="First Client")
    create_client(client, second_user_headers, full_name="Second Client")

    list_response = client.get("/clients", headers=first_user_headers)
    assert list_response.status_code == 200
    assert [item["fullName"] for item in list_response.json()] == ["First Client"]

    forbidden_detail = client.get(
        f"/clients/{first_user_client['id']}",
        headers=second_user_headers,
    )
    forbidden_update = client.patch(
        f"/clients/{first_user_client['id']}",
        headers=second_user_headers,
        json={"fullName": "Leaked"},
    )
    forbidden_delete = client.delete(
        f"/clients/{first_user_client['id']}",
        headers=second_user_headers,
    )

    assert forbidden_detail.status_code == 404
    assert forbidden_update.status_code == 404
    assert forbidden_delete.status_code == 404


def test_clients_search_matches_contact_fields_and_stays_scoped(client: TestClient) -> None:
    first_user_headers = auth_headers(client, "first@example.com")
    second_user_headers = auth_headers(client, "second@example.com")
    create_client(client, first_user_headers, full_name="Anna Petrova", email="anna@example.com")
    create_client(client, first_user_headers, full_name="Boris Sokolov", email="boris@example.com")
    create_client(client, second_user_headers, full_name="Anna Other", email="other@example.com")

    response = client.get("/clients?search=petrova", headers=first_user_headers)

    assert response.status_code == 200
    assert [item["fullName"] for item in response.json()] == ["Anna Petrova"]


def test_client_validation_rejects_empty_name(client: TestClient) -> None:
    headers = auth_headers(client)

    response = client.post("/clients", headers=headers, json={"fullName": "   "})

    assert response.status_code == 422


def test_preferences_are_created_updated_and_scoped_through_owned_client(
    client: TestClient,
) -> None:
    first_user_headers = auth_headers(client, "first@example.com")
    second_user_headers = auth_headers(client, "second@example.com")
    first_user_client = create_client(client, first_user_headers)

    empty_response = client.get(
        f"/clients/{first_user_client['id']}/preferences",
        headers=first_user_headers,
    )
    assert empty_response.status_code == 200
    assert empty_response.json() is None

    create_response = client.put(
        f"/clients/{first_user_client['id']}/preferences",
        headers=first_user_headers,
        json={
            "preferredDestinations": ["Turkey", "Greece"],
            "dislikedDestinations": ["Busy cities"],
            "preferredHotelLevel": "5*",
            "mealPreferences": ["All inclusive"],
            "travelStyle": ["Family beach"],
            "importantFactors": ["Kids club"],
            "avoidFactors": ["Long transfers"],
            "averageBudgetMin": 200000,
            "averageBudgetMax": 350000,
        },
    )
    assert create_response.status_code == 200
    created = create_response.json()
    assert created["clientId"] == first_user_client["id"]
    assert created["preferredDestinations"] == ["Turkey", "Greece"]
    assert created["preferredHotelLevel"] == "5*"

    update_response = client.put(
        f"/clients/{first_user_client['id']}/preferences",
        headers=first_user_headers,
        json={"preferredDestinations": ["Thailand"], "averageBudgetMax": None},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["preferredDestinations"] == ["Thailand"]
    assert updated["averageBudgetMax"] is None

    forbidden_response = client.get(
        f"/clients/{first_user_client['id']}/preferences",
        headers=second_user_headers,
    )
    assert forbidden_response.status_code == 404


def test_preferences_validation_rejects_invalid_hotel_level(client: TestClient) -> None:
    headers = auth_headers(client)
    created = create_client(client, headers)

    response = client.put(
        f"/clients/{created['id']}/preferences",
        headers=headers,
        json={"preferredHotelLevel": "6*"},
    )

    assert response.status_code == 422
