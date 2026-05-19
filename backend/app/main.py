from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.ai import router as ai_router
from app.api.auth import router as auth_router
from app.api.clients import router as clients_router
from app.api.health import router as health_router
from app.api.proposals import router as proposals_router
from app.api.tour_options import router as tour_options_router
from app.api.travel_requests import router as travel_requests_router
from app.core.config import get_settings
from app import models as _models


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth_router)
    app.include_router(ai_router)
    app.include_router(clients_router)
    app.include_router(travel_requests_router)
    app.include_router(tour_options_router)
    app.include_router(proposals_router)
    app.include_router(health_router)

    return app


app = create_app()
