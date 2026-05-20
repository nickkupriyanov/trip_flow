from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.client import Client, ClientPreference
from app.models.communication_note import CommunicationNote
from app.models.proposal import Proposal
from app.models.reminder import Reminder
from app.models.tour_option import TourOption
from app.models.travel_request import TravelRequest
from app.models.user import User
from app.services.auth import create_user, get_user_by_email


DEMO_EMAIL = "agent@example.com"
DEMO_PASSWORD = "strong-password"
DEMO_AGENT_NAME = "Demo Travel Agent"
DEMO_CLIENT_NAME = "Анна Петрова"
DEMO_REQUEST_DESTINATION = "Турция, Белек"


def _find_demo_client(db: Session, user_id: str) -> Client | None:
    return db.scalar(
        select(Client).where(
            Client.user_id == user_id,
            Client.full_name == DEMO_CLIENT_NAME,
        )
    )


def _find_demo_request(db: Session, user_id: str, client_id: str) -> TravelRequest | None:
    return db.scalar(
        select(TravelRequest).where(
            TravelRequest.user_id == user_id,
            TravelRequest.client_id == client_id,
            TravelRequest.destination == DEMO_REQUEST_DESTINATION,
        )
    )


def create_demo_data(db: Session) -> User:
    user = get_user_by_email(db, DEMO_EMAIL)
    if user is None:
        user = create_user(
            db,
            email=DEMO_EMAIL,
            name=DEMO_AGENT_NAME,
            password=DEMO_PASSWORD,
        )

    client = _find_demo_client(db, user.id)
    if client is None:
        client = Client(
            user_id=user.id,
            full_name=DEMO_CLIENT_NAME,
            phone="+79990001122",
            email="anna.petrova@example.com",
            telegram="@anna_family",
            whatsapp="+79990001122",
            city="Москва",
            source="Telegram",
            tags=["семья", "море", "VIP"],
            notes="Путешествует с семьей, любит спокойные отели с хорошим детским клубом.",
        )
        db.add(client)
        db.flush()

    if client.preferences is None:
        db.add(
            ClientPreference(
                client_id=client.id,
                preferred_destinations=["Турция", "ОАЭ", "Греция"],
                disliked_destinations=["долгие ночные перелеты"],
                preferred_hotel_level="5*",
                meal_preferences=["all inclusive", "детское меню"],
                travel_style=["семейный отдых", "пляж", "спокойный сервис"],
                important_factors=["короткий трансфер", "детский клуб", "первая линия"],
                avoid_factors=["шумные вечеринки", "сложная логистика"],
                average_budget_min=300000,
                average_budget_max=420000,
            )
        )

    travel_request = _find_demo_request(db, user.id, client.id)
    if travel_request is None:
        travel_request = TravelRequest(
            user_id=user.id,
            client_id=client.id,
            status="sent",
            destination=DEMO_REQUEST_DESTINATION,
            departure_city="Москва",
            date_from=date.today() + timedelta(days=45),
            date_to=date.today() + timedelta(days=55),
            nights_from=9,
            nights_to=10,
            adults=2,
            children=1,
            children_ages=[7],
            budget_min=320000,
            budget_max=420000,
            travel_type="Семейный пляжный отдых",
            wishes="Нужен спокойный отель у моря, детский клуб, хороший пляж и понятный all inclusive.",
            restrictions="Без долгого трансфера и шумных молодежных отелей.",
            internal_comment="Отправить подборку и напомнить завтра после обеда.",
        )
        db.add(travel_request)
        db.flush()

    existing_options = list(
        db.scalars(select(TourOption).where(TourOption.request_id == travel_request.id))
    )
    if not existing_options:
        option_start = travel_request.date_from
        option_end = travel_request.date_to
        db.add_all(
            [
                TourOption(
                    request_id=travel_request.id,
                    title="Pine Beach Belek 5*",
                    country="Турция",
                    resort="Белек",
                    hotel_name="Pine Beach Belek",
                    hotel_stars=5,
                    date_from=option_start,
                    date_to=option_end,
                    nights=10,
                    room_type="Family Room",
                    meal_type="All inclusive",
                    price=365000,
                    currency="RUB",
                    link="https://example.com/pine-beach-belek",
                    pros=["детский клуб", "первая линия", "короткий трансфер"],
                    cons=["популярный отель, лучше не затягивать с решением"],
                    agent_comment="Лучший баланс цены и семейной инфраструктуры.",
                    is_recommended=True,
                ),
                TourOption(
                    request_id=travel_request.id,
                    title="Ela Excellence Resort 5*",
                    country="Турция",
                    resort="Белек",
                    hotel_name="Ela Excellence Resort",
                    hotel_stars=5,
                    date_from=option_start,
                    date_to=option_end,
                    nights=10,
                    room_type="Superior Room",
                    meal_type="Ultra all inclusive",
                    price=415000,
                    currency="RUB",
                    link="https://example.com/ela-excellence",
                    pros=["сильный детский клуб", "премиальный сервис", "хорошее питание"],
                    cons=["выше бюджета, но попадает в верхнюю границу"],
                    agent_comment="Премиальный вариант для сравнения.",
                    is_recommended=False,
                ),
                TourOption(
                    request_id=travel_request.id,
                    title="TUI Magic Life Masmavi 5*",
                    country="Турция",
                    resort="Белек",
                    hotel_name="TUI Magic Life Masmavi",
                    hotel_stars=5,
                    date_from=option_start,
                    date_to=option_end,
                    nights=10,
                    room_type="Standard Room",
                    meal_type="All inclusive",
                    price=338000,
                    currency="RUB",
                    link="https://example.com/masmavi",
                    pros=["активная инфраструктура", "хорошая цена", "много семей"],
                    cons=["может быть оживленнее, чем хотелось клиенту"],
                    agent_comment="Бюджетнее, но менее спокойный по атмосфере.",
                    is_recommended=False,
                ),
            ]
        )

    has_proposal = db.scalar(
        select(Proposal.id).where(Proposal.request_id == travel_request.id)
    )
    if has_proposal is None:
        db.add(
            Proposal(
                request_id=travel_request.id,
                title="Подборка Белек для семьи",
                format="telegram",
                content=(
                    "Анна, добрый день! Подготовила 3 варианта по Белеку на 10 ночей.\n\n"
                    "Рекомендую Pine Beach Belek 5*: первая линия, детский клуб, all inclusive "
                    "и короткий трансфер. По бюджету вариант сейчас выглядит самым сбалансированным.\n\n"
                    "Ela Excellence дороже, но сильнее по сервису. Masmavi бюджетнее, но может быть "
                    "чуть активнее по атмосфере.\n\n"
                    "Посмотрите, пожалуйста, что ближе по настроению. После этого уточню детали по "
                    "номерам и актуальности условий."
                ),
            )
        )

    has_note = db.scalar(
        select(CommunicationNote.id).where(
            CommunicationNote.client_id == client.id,
            CommunicationNote.request_id == travel_request.id,
        )
    )
    if has_note is None:
        db.add(
            CommunicationNote(
                client_id=client.id,
                request_id=travel_request.id,
                type="telegram",
                content="Клиент попросил семейный Белек, без шумных отелей и долгого трансфера.",
            )
        )

    has_reminder = db.scalar(
        select(Reminder.id).where(
            Reminder.user_id == user.id,
            Reminder.client_id == client.id,
            Reminder.request_id == travel_request.id,
            Reminder.status == "active",
        )
    )
    if has_reminder is None:
        due_at = datetime.now(UTC).replace(minute=0, second=0, microsecond=0) + timedelta(
            hours=2
        )
        db.add(
            Reminder(
                user_id=user.id,
                client_id=client.id,
                request_id=travel_request.id,
                title="Написать Анне по подборке Белека",
                description="Уточнить, какой вариант ближе: спокойный Pine Beach или премиальный Ela.",
                due_at=due_at,
                status="active",
            )
        )

    db.commit()
    db.refresh(user)
    return user


def main() -> None:
    db = SessionLocal()
    try:
        user = create_demo_data(db)
    finally:
        db.close()

    print("Demo data is ready.")
    print(f"Email: {user.email}")
    print(f"Password: {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
