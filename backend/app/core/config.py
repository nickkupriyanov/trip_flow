from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "TripFlow"
    database_url: str = Field(
        default="postgresql+psycopg://tripflow:tripflow_local_password@localhost:5432/tripflow",
        validation_alias="DATABASE_URL",
    )
    jwt_secret_key: str = Field(
        default="tripflow-local-dev-secret-change-me",
        validation_alias="JWT_SECRET_KEY",
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    backend_cors_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        validation_alias="BACKEND_CORS_ORIGINS",
    )
    timeweb_ai_agent_url: str | None = Field(
        default=None,
        validation_alias="TIMEWEB_AI_AGENT_URL",
    )
    timeweb_ai_api_token: str | None = Field(
        default=None,
        validation_alias="TIMEWEB_AI_API_TOKEN",
    )
    ai_model: str = Field(default="gpt-4o-mini", validation_alias="AI_MODEL")

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.backend_cors_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
