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


def create_option(
    client: TestClient,
    headers: dict[str, str],
    request_id: str,
    *,
    title: str = "Calm family resort",
    is_recommended: bool = False,
) -> dict[str, object]:
    response = client.post(
        f"/requests/{request_id}/options",
        headers=headers,
        json={
            "title": title,
            "country": "Turkey",
            "resort": "Belek",
            "hotelName": "Pine Beach",
            "hotelStars": 5,
            "dateFrom": "2026-07-01",
            "dateTo": "2026-07-11",
            "nights": 10,
            "roomType": "Family room",
            "mealType": "All inclusive",
            "price": 320000,
            "currency": "RUB",
            "link": "https://example.com/tour",
            "pros": ["Kids club", "Short transfer"],
            "cons": ["Higher price"],
            "agentComment": "Good fit for calm family rest",
            "isRecommended": is_recommended,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_tour_option_crud_flow_returns_camel_case(client: TestClient) -> None:
    headers = auth_headers(client)
    created_client = create_client(client, headers)
    request = create_request(client, headers, str(created_client["id"]))

    created = create_option(client, headers, str(request["id"]), is_recommended=True)

    assert created["id"]
    assert created["requestId"] == request["id"]
    assert created["title"] == "Calm family resort"
    assert created["hotelName"] == "Pine Beach"
    assert created["hotelStars"] == 5
    assert created["currency"] == "RUB"
    assert created["pros"] == ["Kids club", "Short transfer"]
    assert created["cons"] == ["Higher price"]
    assert created["agentComment"] == "Good fit for calm family rest"
    assert created["isRecommended"] is True
    assert created["createdAt"]
    assert created["updatedAt"]

    list_response = client.get(f"/requests/{request['id']}/options", headers=headers)
    assert list_response.status_code == 200
    assert [item["title"] for item in list_response.json()] == ["Calm family resort"]

    update_response = client.patch(
        f"/options/{created['id']}",
        headers=headers,
        json={
            "title": "Updated family resort",
            "price": 300000,
            "pros": ["Better price"],
            "agentComment": None,
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["title"] == "Updated family resort"
    assert updated["price"] == 300000
    assert updated["pros"] == ["Better price"]
    assert updated["agentComment"] is None

    delete_response = client.delete(f"/options/{created['id']}", headers=headers)
    assert delete_response.status_code == 204
    empty_response = client.get(f"/requests/{request['id']}/options", headers=headers)
    assert empty_response.status_code == 200
    assert empty_response.json() == []


def test_tour_options_are_scoped_through_owned_request(client: TestClient) -> None:
    first_user_headers = auth_headers(client, "first@example.com")
    second_user_headers = auth_headers(client, "second@example.com")
    first_client = create_client(client, first_user_headers, full_name="First Client")
    second_client = create_client(client, second_user_headers, full_name="Second Client")
    first_request = create_request(client, first_user_headers, str(first_client["id"]))
    second_request = create_request(client, second_user_headers, str(second_client["id"]))
    first_option = create_option(client, first_user_headers, str(first_request["id"]))

    forbidden_list = client.get(
        f"/requests/{first_request['id']}/options",
        headers=second_user_headers,
    )
    forbidden_create = client.post(
        f"/requests/{first_request['id']}/options",
        headers=second_user_headers,
        json={"title": "Leaked option"},
    )
    forbidden_update = client.patch(
        f"/options/{first_option['id']}",
        headers=second_user_headers,
        json={"title": "Leaked title"},
    )
    forbidden_delete = client.delete(
        f"/options/{first_option['id']}",
        headers=second_user_headers,
    )

    assert forbidden_list.status_code == 404
    assert forbidden_create.status_code == 404
    assert forbidden_update.status_code == 404
    assert forbidden_delete.status_code == 404

    own_option = create_option(client, second_user_headers, str(second_request["id"]))
    assert own_option["title"] == "Calm family resort"


def test_only_one_tour_option_is_recommended_per_request(client: TestClient) -> None:
    headers = auth_headers(client)
    created_client = create_client(client, headers)
    request = create_request(client, headers, str(created_client["id"]))
    first_option = create_option(
        client,
        headers,
        str(request["id"]),
        title="First option",
        is_recommended=True,
    )
    second_option = create_option(
        client,
        headers,
        str(request["id"]),
        title="Second option",
        is_recommended=True,
    )

    list_response = client.get(f"/requests/{request['id']}/options", headers=headers)
    assert list_response.status_code == 200
    options = list_response.json()
    assert [
        (item["title"], item["isRecommended"])
        for item in options
    ] == [("First option", False), ("Second option", True)]

    recommend_first_response = client.patch(
        f"/options/{first_option['id']}",
        headers=headers,
        json={"isRecommended": True},
    )
    assert recommend_first_response.status_code == 200

    list_again_response = client.get(f"/requests/{request['id']}/options", headers=headers)
    assert list_again_response.status_code == 200
    options_again = list_again_response.json()
    assert [
        (item["id"], item["isRecommended"])
        for item in options_again
    ] == [(first_option["id"], True), (second_option["id"], False)]


def test_tour_option_validation_rejects_invalid_numbers_and_currency(
    client: TestClient,
) -> None:
    headers = auth_headers(client)
    created_client = create_client(client, headers)
    request = create_request(client, headers, str(created_client["id"]))

    invalid_create = client.post(
        f"/requests/{request['id']}/options",
        headers=headers,
        json={
            "title": "Invalid option",
            "hotelStars": 6,
            "nights": -1,
            "price": -100,
            "currency": "GBP",
        },
    )
    assert invalid_create.status_code == 422

    created = create_option(client, headers, str(request["id"]))
    invalid_update = client.patch(
        f"/options/{created['id']}",
        headers=headers,
        json={"currency": "GBP"},
    )
    assert invalid_update.status_code == 422
