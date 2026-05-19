import json
import urllib.error
import urllib.request
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import Settings
from app.models.client import ClientPreference
from app.models.tour_option import TourOption
from app.models.travel_request import TravelRequest
from app.schemas.ai import (
    GenerateProposalRequest,
    ProposalGenerationOutput,
)


class AIConfigurationError(RuntimeError):
    pass


class AIProviderError(RuntimeError):
    pass


def normalize_chat_completions_url(url: str) -> str:
    stripped = url.rstrip("/")
    if stripped.endswith("/chat/completions"):
        return stripped
    return f"{stripped}/chat/completions"


def load_generation_context(
    db: Session,
    *,
    user_id: str,
    payload: GenerateProposalRequest,
) -> tuple[TravelRequest | None, list[TourOption], ClientPreference | None]:
    statement = (
        select(TravelRequest)
        .options(selectinload(TravelRequest.client))
        .where(
            TravelRequest.id == payload.request_id,
            TravelRequest.user_id == user_id,
        )
    )
    request = db.scalar(statement)
    if request is None:
        return None, [], None

    options_statement = (
        select(TourOption)
        .where(TourOption.request_id == request.id)
        .order_by(TourOption.created_at.asc())
    )
    if payload.selected_option_ids:
        options_statement = options_statement.where(
            TourOption.id.in_(payload.selected_option_ids)
        )
    options = list(db.scalars(options_statement))

    preferences = db.scalar(
        select(ClientPreference).where(ClientPreference.client_id == request.client_id)
    )
    return request, options, preferences


def build_generation_input(
    *,
    request: TravelRequest,
    options: list[TourOption],
    preferences: ClientPreference | None,
    payload: GenerateProposalRequest,
) -> dict[str, object]:
    return {
        "format": payload.format,
        "tone": payload.tone,
        "client": {
            "fullName": request.client.full_name,
            "city": request.client.city,
            "tags": request.client.tags,
            "notes": request.client.notes,
        },
        "clientPreferences": None
        if preferences is None
        else {
            "preferredDestinations": preferences.preferred_destinations,
            "dislikedDestinations": preferences.disliked_destinations,
            "preferredHotelLevel": preferences.preferred_hotel_level,
            "mealPreferences": preferences.meal_preferences,
            "travelStyle": preferences.travel_style,
            "importantFactors": preferences.important_factors,
            "avoidFactors": preferences.avoid_factors,
            "averageBudgetMin": preferences.average_budget_min,
            "averageBudgetMax": preferences.average_budget_max,
        },
        "travelRequest": {
            "id": request.id,
            "status": request.status,
            "destination": request.destination,
            "departureCity": request.departure_city,
            "dateFrom": request.date_from.isoformat() if request.date_from else None,
            "dateTo": request.date_to.isoformat() if request.date_to else None,
            "nightsFrom": request.nights_from,
            "nightsTo": request.nights_to,
            "adults": request.adults,
            "children": request.children,
            "childrenAges": request.children_ages,
            "budgetMin": request.budget_min,
            "budgetMax": request.budget_max,
            "travelType": request.travel_type,
            "wishes": request.wishes,
            "restrictions": request.restrictions,
        },
        "tourOptions": [
            {
                "id": option.id,
                "title": option.title,
                "country": option.country,
                "resort": option.resort,
                "hotelName": option.hotel_name,
                "hotelStars": option.hotel_stars,
                "dateFrom": option.date_from.isoformat() if option.date_from else None,
                "dateTo": option.date_to.isoformat() if option.date_to else None,
                "nights": option.nights,
                "roomType": option.room_type,
                "mealType": option.meal_type,
                "price": option.price,
                "currency": option.currency,
                "link": option.link,
                "pros": option.pros,
                "cons": option.cons,
                "agentComment": option.agent_comment,
                "isRecommended": option.is_recommended,
            }
            for option in options
        ],
    }


def generate_proposal_draft(
    *,
    settings: Settings,
    generation_input: dict[str, object],
) -> ProposalGenerationOutput:
    if not settings.timeweb_ai_agent_url or not settings.timeweb_ai_api_token:
        raise AIConfigurationError(
            "AI provider is not configured. Set TIMEWEB_AI_AGENT_URL and "
            "TIMEWEB_AI_API_TOKEN."
        )

    body = {
        "model": settings.ai_model,
        "stream": False,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You help an individual travel agent write editable proposal drafts. "
                    "Use only the supplied CRM data. Never invent real-time prices, hotel "
                    "availability, booking status, or factual hotel details. If something "
                    "is missing, say it needs clarification. Return only JSON with keys "
                    "title, message, recommendedOptionId, shortSummary."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(generation_input, ensure_ascii=False),
            },
        ],
    }
    request = urllib.request.Request(
        normalize_chat_completions_url(settings.timeweb_ai_agent_url),
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.timeweb_ai_api_token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw_response = json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError as exc:
        raise AIProviderError("AI provider request failed") from exc

    try:
        content = raw_response["choices"][0]["message"]["content"]
        parsed: dict[str, Any] = json.loads(content)
        return ProposalGenerationOutput.model_validate(parsed)
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise AIProviderError("AI provider returned an invalid response") from exc
