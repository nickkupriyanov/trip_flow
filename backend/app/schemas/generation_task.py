from datetime import datetime
from typing import Literal

from app.schemas.client import CamelModel


GenerationTaskType = Literal[
    "proposal",
    "client_summary",
    "message_template",
    "next_questions",
    "rewrite_message",
]
GenerationTaskStatus = Literal["pending", "processing", "done", "failed"]


class GenerationTaskRead(CamelModel):
    id: str
    user_id: str
    client_id: str | None
    request_id: str | None
    type: GenerationTaskType
    status: GenerationTaskStatus
    input: dict[str, object]
    output: dict[str, object] | None
    error: str | None
    created_at: datetime
    updated_at: datetime
