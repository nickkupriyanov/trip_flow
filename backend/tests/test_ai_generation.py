from collections.abc import Generator
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.database import Base, get_db
from app.main import create_app
from app.models.generation_task import GenerationTask
from app.services.ai import AIProviderError, normalize_chat_completions_url


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
    app.state.testing_session_local = TestingSessionLocal

    with TestClient(app) as test_client:
        yield test_client

    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


def auth_headers(
    test_client: TestClient,
    email: str = "agent@example.com",
) -> dict[str, str]:
    response = test_client.post(
        "/auth/register",
        json={"email": email, "name": "Agent Smith", "password": "strong-password"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_client(
    test_client: TestClient,
    headers: dict[str, str],
    *,
    full_name: str = "Anna Petrova",
) -> dict[str, object]:
    response = test_client.post(
        "/clients",
        headers=headers,
        json={"fullName": full_name, "phone": "+79990001122"},
    )
    assert response.status_code == 201
    return response.json()


def create_request(
    test_client: TestClient,
    headers: dict[str, str],
    client_id: str,
    *,
    destination: str = "Turkey",
) -> dict[str, object]:
    response = test_client.post(
        f"/clients/{client_id}/requests",
        headers=headers,
        json={"destination": destination, "wishes": "Calm family beach hotel"},
    )
    assert response.status_code == 201
    return response.json()


def create_option(
    test_client: TestClient,
    headers: dict[str, str],
    request_id: str,
    *,
    title: str = "Belek family resort",
    is_recommended: bool = True,
) -> dict[str, object]:
    response = test_client.post(
        f"/requests/{request_id}/options",
        headers=headers,
        json={
            "title": title,
            "country": "Turkey",
            "resort": "Belek",
            "hotelName": "Pine Beach",
            "hotelStars": 5,
            "nights": 10,
            "mealType": "All inclusive",
            "price": 320000,
            "currency": "RUB",
            "pros": ["Kids club", "Short transfer"],
            "isRecommended": is_recommended,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_generate_proposal_requires_authentication(client: TestClient) -> None:
    response = client.post(
        "/ai/generate-proposal",
        json={"requestId": "missing", "selectedOptionIds": []},
    )

    assert response.status_code in {401, 403}


def test_generate_proposal_returns_service_unavailable_without_api_key(
    client: TestClient,
) -> None:
    client.app.dependency_overrides[get_settings] = lambda: SimpleNamespace(
        timeweb_ai_agent_url=None,
        timeweb_ai_api_token=None,
        ai_model="test-model",
    )
    headers = auth_headers(client)
    created_client = create_client(client, headers)
    request = create_request(client, headers, str(created_client["id"]))
    option = create_option(client, headers, str(request["id"]))

    response = client.post(
        "/ai/generate-proposal",
        headers=headers,
        json={
            "requestId": request["id"],
            "selectedOptionIds": [option["id"]],
            "tone": "friendly",
            "format": "telegram",
        },
    )

    assert response.status_code == 503
    assert "AI provider is not configured" in response.json()["detail"]
    assert "TIMEWEB_AI_AGENT_URL" in response.json()["detail"]
    assert "TIMEWEB_AI_API_TOKEN" in response.json()["detail"]


def test_generate_proposal_returns_editable_draft_and_records_generation_task(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    headers = auth_headers(client)
    created_client = create_client(client, headers)
    request = create_request(client, headers, str(created_client["id"]))
    option = create_option(client, headers, str(request["id"]))

    def fake_generate_proposal_draft(**kwargs: object) -> dict[str, object]:
        from app.schemas.ai import ProposalGenerationOutput

        return ProposalGenerationOutput(
            title="Turkey family options",
            message="Anna, here are two checked options based on your request.",
            recommendedOptionId=option["id"],
            shortSummary="Family beach proposal for Turkey.",
        )

    monkeypatch.setattr(
        "app.api.ai.generate_proposal_draft",
        fake_generate_proposal_draft,
    )

    response = client.post(
        "/ai/generate-proposal",
        headers=headers,
        json={
            "requestId": request["id"],
            "selectedOptionIds": [option["id"]],
            "tone": "friendly",
            "format": "telegram",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Turkey family options"
    assert body["message"] == "Anna, here are two checked options based on your request."
    assert body["recommendedOptionId"] == option["id"]
    assert body["shortSummary"] == "Family beach proposal for Turkey."
    assert body["generationTaskId"]

    proposals_response = client.get(
        f"/requests/{request['id']}/proposals",
        headers=headers,
    )
    assert proposals_response.status_code == 200
    assert proposals_response.json() == []

    with client.app.state.testing_session_local() as db:
        task = db.scalar(
            select(GenerationTask).where(
                GenerationTask.id == body["generationTaskId"]
            )
        )
        assert task is not None
        assert task.status == "done"
        assert task.type == "proposal"
        assert task.request_id == request["id"]
        assert task.client_id == created_client["id"]
        assert task.output == {
            "title": "Turkey family options",
            "message": "Anna, here are two checked options based on your request.",
            "recommendedOptionId": option["id"],
            "shortSummary": "Family beach proposal for Turkey.",
        }


def test_generate_proposal_scopes_request_to_current_user(client: TestClient) -> None:
    first_headers = auth_headers(client, "first@example.com")
    second_headers = auth_headers(client, "second@example.com")
    first_client = create_client(client, first_headers, full_name="First Client")
    first_request = create_request(client, first_headers, str(first_client["id"]))

    response = client.post(
        "/ai/generate-proposal",
        headers=second_headers,
        json={"requestId": first_request["id"], "selectedOptionIds": []},
    )

    assert response.status_code == 404


def test_generate_proposal_provider_failure_records_sanitized_error(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    headers = auth_headers(client)
    created_client = create_client(client, headers)
    request = create_request(client, headers, str(created_client["id"]))
    option = create_option(client, headers, str(request["id"]))

    def fake_generate_proposal_draft(**kwargs: object) -> object:
        raise AIProviderError("provider rejected token sk-test-secret-value")

    monkeypatch.setattr(
        "app.api.ai.generate_proposal_draft",
        fake_generate_proposal_draft,
    )

    response = client.post(
        "/ai/generate-proposal",
        headers=headers,
        json={
            "requestId": request["id"],
            "selectedOptionIds": [option["id"]],
            "tone": "friendly",
            "format": "telegram",
        },
    )

    assert response.status_code == 502
    assert response.json()["detail"] == (
        "AI provider failed to generate a proposal draft"
    )

    with client.app.state.testing_session_local() as db:
        task = db.scalar(
            select(GenerationTask).where(GenerationTask.request_id == request["id"])
        )
        assert task is not None
        assert task.status == "failed"
        assert task.error == "AI provider request failed"


def test_timeweb_agent_base_url_is_normalized_to_chat_completions() -> None:
    assert normalize_chat_completions_url(
        "https://agent.timeweb.cloud/api/v1/cloud-ai/agents/agent-id/v1"
    ) == (
        "https://agent.timeweb.cloud/api/v1/cloud-ai/agents/agent-id/v1"
        "/chat/completions"
    )
    assert normalize_chat_completions_url(
        "https://agent.timeweb.cloud/api/v1/cloud-ai/agents/agent-id/v1/chat/completions"
    ) == (
        "https://agent.timeweb.cloud/api/v1/cloud-ai/agents/agent-id/v1"
        "/chat/completions"
    )
