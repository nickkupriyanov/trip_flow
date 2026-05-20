from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.demo_seed import DEMO_EMAIL, DEMO_PASSWORD, create_demo_data
from app.models.client import Client, ClientPreference
from app.models.communication_note import CommunicationNote
from app.models.proposal import Proposal
from app.models.reminder import Reminder
from app.models.tour_option import TourOption
from app.models.travel_request import TravelRequest
from app.models.user import User
from app.services.auth import authenticate_user


def make_session() -> Session:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return TestingSessionLocal()


def test_demo_seed_creates_complete_mvp_flow_and_is_idempotent() -> None:
    db = make_session()
    try:
        first_user = create_demo_data(db)
        second_user = create_demo_data(db)

        assert first_user.id == second_user.id
        assert authenticate_user(db, email=DEMO_EMAIL, password=DEMO_PASSWORD) is not None

        user_count = db.scalar(select(func.count()).select_from(User).where(User.email == DEMO_EMAIL))
        assert user_count == 1

        client = db.scalar(select(Client).where(Client.user_id == first_user.id))
        assert client is not None
        assert db.scalar(select(ClientPreference).where(ClientPreference.client_id == client.id))

        request = db.scalar(
            select(TravelRequest).where(TravelRequest.client_id == client.id)
        )
        assert request is not None
        assert request.status == "sent"

        options = list(
            db.scalars(select(TourOption).where(TourOption.request_id == request.id))
        )
        assert len(options) == 3
        assert sum(option.is_recommended for option in options) == 1

        assert db.scalar(select(Proposal).where(Proposal.request_id == request.id))
        assert db.scalar(
            select(CommunicationNote).where(CommunicationNote.request_id == request.id)
        )
        reminder = db.scalar(select(Reminder).where(Reminder.request_id == request.id))
        assert reminder is not None
        assert reminder.status == "active"

        assert db.scalar(select(func.count()).select_from(TourOption)) == 3
        assert db.scalar(select(func.count()).select_from(Proposal)) == 1
        assert db.scalar(select(func.count()).select_from(Reminder)) == 1
    finally:
        db.close()
