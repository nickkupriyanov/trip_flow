from pathlib import Path


def test_docker_compose_passes_timeweb_ai_environment_to_backend() -> None:
    compose_file = Path(__file__).resolve().parents[2] / "docker-compose.yml"
    compose_text = compose_file.read_text(encoding="utf-8")

    assert "TIMEWEB_AI_AGENT_URL" in compose_text
    assert "TIMEWEB_AI_API_TOKEN" in compose_text
