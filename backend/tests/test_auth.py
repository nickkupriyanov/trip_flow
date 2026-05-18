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


def test_register_login_and_me_flow(client: TestClient) -> None:
    register_response = client.post(
        "/auth/register",
        json={
            "email": "agent@example.com",
            "name": "Agent Smith",
            "password": "strong-password",
        },
    )

    assert register_response.status_code == 201
    registered = register_response.json()
    assert registered["token_type"] == "bearer"
    assert registered["access_token"]
    assert registered["user"] == {
        "id": registered["user"]["id"],
        "email": "agent@example.com",
        "name": "Agent Smith",
    }

    login_response = client.post(
        "/auth/login",
        json={"email": "agent@example.com", "password": "strong-password"},
    )

    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]

    me_response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert me_response.status_code == 200
    assert me_response.json()["email"] == "agent@example.com"


def test_register_rejects_duplicate_email(client: TestClient) -> None:
    payload = {
        "email": "agent@example.com",
        "name": "Agent Smith",
        "password": "strong-password",
    }

    assert client.post("/auth/register", json=payload).status_code == 201
    duplicate_response = client.post("/auth/register", json=payload)

    assert duplicate_response.status_code == 409
    assert duplicate_response.json()["detail"] == "User with this email already exists"


def test_login_rejects_invalid_credentials(client: TestClient) -> None:
    client.post(
        "/auth/register",
        json={
            "email": "agent@example.com",
            "name": "Agent Smith",
            "password": "strong-password",
        },
    )

    response = client.post(
        "/auth/login",
        json={"email": "agent@example.com", "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_me_rejects_missing_or_invalid_token(client: TestClient) -> None:
    missing_response = client.get("/auth/me")
    invalid_response = client.get(
        "/auth/me",
        headers={"Authorization": "Bearer not-a-real-token"},
    )

    assert missing_response.status_code == 403
    assert invalid_response.status_code == 401
