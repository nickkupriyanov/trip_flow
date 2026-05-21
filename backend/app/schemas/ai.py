from typing import Literal

from pydantic import Field, field_validator

from app.schemas.client import CamelModel
from app.schemas.proposal import ProposalFormat


ProposalTone = Literal["friendly", "concise", "premium"]


class RequestGenerationBase(CamelModel):
    request_id: str
    tone: ProposalTone = "friendly"
    format: ProposalFormat = "telegram"


class GenerateProposalRequest(CamelModel):
    request_id: str
    selected_option_ids: list[str] = Field(default_factory=list)
    tone: ProposalTone = "friendly"
    format: ProposalFormat = "telegram"

    @field_validator("selected_option_ids")
    @classmethod
    def normalize_option_ids(cls, value: list[str]) -> list[str]:
        return [item.strip() for item in value if item.strip()]


class ProposalGenerationOutput(CamelModel):
    title: str = Field(min_length=1, max_length=180)
    message: str = Field(min_length=1)
    recommended_option_id: str | None = None
    short_summary: str = Field(min_length=1, max_length=500)


class GenerateProposalResponse(ProposalGenerationOutput):
    generation_task_id: str


class GenerateNextQuestionsRequest(RequestGenerationBase):
    pass


class NextQuestionsGenerationOutput(CamelModel):
    questions: list[str] = Field(min_length=1, max_length=8)
    message: str = Field(min_length=1)
    short_summary: str = Field(min_length=1, max_length=500)

    @field_validator("questions")
    @classmethod
    def normalize_questions(cls, value: list[str]) -> list[str]:
        questions = [item.strip() for item in value if item.strip()]
        if not questions:
            raise ValueError("At least one question is required")
        return questions


class GenerateNextQuestionsResponse(NextQuestionsGenerationOutput):
    generation_task_id: str
