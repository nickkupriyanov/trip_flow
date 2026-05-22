from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import create_app
from app.services.qui_quo_import import (
    QuiQuoImportError,
    parse_qui_quo_tour_options,
)


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


QUI_QUO_HTML = """
<html>
  <body>
    <section class="tour">
      <div class="hotel">
        <div class="thumb">
          <a class="thumb__link" href="https://qui-quo.ru/quote/CZ22-SU39/item/0">Open</a>
        </div>
        <div class="info">
          <div class="name">
            <a href="https://qui-quo.ru/quote/CZ22-SU39/item/0">1. Hampton By Hilton Marjan Island 4*</a>
          </div>
          <div class="country">ОАЭ, Рас-эль-Хайма</div>
          <div class="description">
            <div class="description-text">Семейный отель у пляжа.</div>
          </div>
          <div class="amenities">
            <div class="amenity">Бассейн</div>
            <div class="amenity">Пляж</div>
          </div>
        </div>
      </div>
      <div class="details">
        <span class="depcity">Начало тура: из Москвы</span>
        <div class="nights">7 ночей</div>
        <div class="dates">11 окт <small>(Вс)</small> &ndash; 18 окт <small>(Вс)</small></div>
        <div class="board"><span>AI - Все Включено</span></div>
        <div class="room"><span>king island view room, 2 взрослых 1 ребенок</span></div>
        <div class="price">225 120 RUB</div>
      </div>
    </section>
    <section class="tour">
      <div class="hotel">
        <div class="info">
          <div class="name">
            <a href="/quote/CZ22-SU39/item/1">2. Fairmont Fujairah Beach Resort 5*</a>
          </div>
          <div class="country">ОАЭ, Фуджейра</div>
          <div class="amenities">
            <div class="amenity">Фитнес-центр</div>
          </div>
        </div>
      </div>
      <div class="details">
        <div class="nights">10 ночей</div>
        <div class="dates">20 ноя - 30 ноя</div>
        <div class="board"><span>HB - Завтраки и ужины</span></div>
        <div class="room"><span>fairmont room king</span></div>
        <div class="price">1 990 EUR</div>
      </div>
    </section>
  </body>
</html>
"""


def test_parse_qui_quo_tour_options_extracts_options() -> None:
    options = parse_qui_quo_tour_options(
        QUI_QUO_HTML,
        source_url="https://qui-quo.ru/CZ22-SU39",
        default_year=2026,
    )

    assert len(options) == 2
    first = options[0]
    assert first.title == "Hampton By Hilton Marjan Island"
    assert first.hotel_name == "Hampton By Hilton Marjan Island"
    assert first.hotel_stars == 4
    assert first.country == "ОАЭ"
    assert first.resort == "Рас-эль-Хайма"
    assert first.date_from.isoformat() == "2026-10-11"
    assert first.date_to.isoformat() == "2026-10-18"
    assert first.nights == 7
    assert first.meal_type == "AI - Все Включено"
    assert first.room_type == "king island view room, 2 взрослых 1 ребенок"
    assert first.price == 225120
    assert first.currency == "RUB"
    assert first.link == "https://qui-quo.ru/quote/CZ22-SU39/item/0"
    assert first.pros == ["Бассейн", "Пляж"]
    assert first.agent_comment == (
        "Импортировано из Qui-Quo: https://qui-quo.ru/CZ22-SU39\n\n"
        "Семейный отель у пляжа."
    )
    assert first.is_recommended is False

    second = options[1]
    assert second.title == "Fairmont Fujairah Beach Resort"
    assert second.hotel_stars == 5
    assert second.currency == "EUR"
    assert second.price == 1990
    assert second.link == "https://qui-quo.ru/quote/CZ22-SU39/item/1"


def test_parse_qui_quo_tour_options_rejects_empty_page() -> None:
    with pytest.raises(QuiQuoImportError, match="В подборке не найдены варианты тура"):
        parse_qui_quo_tour_options(
            "<html><body></body></html>",
            source_url="https://qui-quo.ru/CZ22-SU39",
            default_year=2026,
        )


def test_parse_qui_quo_tour_options_handles_void_tags_inside_tour() -> None:
    html = """
    <html>
      <body>
        <section class="tour">
          <div class="hotel">
            <img src="/hotel.jpg">
            <div class="name">
              <a href="/quote/CZ22-SU39/item/0">1. Void Tag Resort 4*</a>
            </div>
            <div class="country">ОАЭ, Дубай</div>
          </div>
          <div class="details">
            <div class="nights">7 ночей</div>
            <div class="price">314 537 RUB</div>
          </div>
        </section>
      </body>
    </html>
    """

    options = parse_qui_quo_tour_options(
        html,
        source_url="https://qui-quo.ru/CZ22-SU39",
        default_year=2026,
    )

    assert len(options) == 1
    assert options[0].title == "Void Tag Resort"
    assert options[0].hotel_stars == 4
    assert options[0].price == 314537


def test_import_tour_options_creates_all_parsed_options(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    headers = auth_headers(client)
    created_client = create_client(client, headers)
    request = create_request(client, headers, str(created_client["id"]))

    def fake_fetch(url: str) -> str:
        assert url == "https://qui-quo.ru/CZ22-SU39"
        return QUI_QUO_HTML

    monkeypatch.setattr("app.api.tour_options.fetch_qui_quo_html", fake_fetch)

    response = client.post(
        f"/requests/{request['id']}/options/import",
        headers=headers,
        json={"url": "https://qui-quo.ru/CZ22-SU39"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["createdCount"] == 2
    assert [item["title"] for item in body["options"]] == [
        "Hampton By Hilton Marjan Island",
        "Fairmont Fujairah Beach Resort",
    ]
    assert body["options"][0]["requestId"] == request["id"]
    assert body["options"][0]["price"] == 225120
    assert body["options"][0]["isRecommended"] is False

    list_response = client.get(f"/requests/{request['id']}/options", headers=headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) == 2


def test_import_tour_options_rejects_unsupported_url(client: TestClient) -> None:
    headers = auth_headers(client)
    created_client = create_client(client, headers)
    request = create_request(client, headers, str(created_client["id"]))

    response = client.post(
        f"/requests/{request['id']}/options/import",
        headers=headers,
        json={"url": "https://example.com/CZ22-SU39"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Поддерживаются только ссылки Qui-Quo"


def test_import_tour_options_is_scoped_to_current_user(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    first_user_headers = auth_headers(client, "first-import@example.com")
    second_user_headers = auth_headers(client, "second-import@example.com")
    first_client = create_client(client, first_user_headers, full_name="First Client")
    second_client = create_client(client, second_user_headers, full_name="Second Client")
    first_request = create_request(client, first_user_headers, str(first_client["id"]))
    create_request(client, second_user_headers, str(second_client["id"]))

    def fake_fetch(url: str) -> str:
        return QUI_QUO_HTML

    monkeypatch.setattr("app.api.tour_options.fetch_qui_quo_html", fake_fetch)

    response = client.post(
        f"/requests/{first_request['id']}/options/import",
        headers=second_user_headers,
        json={"url": "https://qui-quo.ru/CZ22-SU39"},
    )

    assert response.status_code == 404
