from sqlalchemy.orm import Session

from app.models.generation_task import GenerationTask


def create_generation_task(
    db: Session,
    *,
    user_id: str,
    task_type: str,
    status: str,
    input_data: dict[str, object],
    client_id: str | None = None,
    request_id: str | None = None,
) -> GenerationTask:
    task = GenerationTask(
        user_id=user_id,
        client_id=client_id,
        request_id=request_id,
        type=task_type,
        status=status,
        input=input_data,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def mark_generation_task_done(
    db: Session,
    *,
    task: GenerationTask,
    output: dict[str, object],
) -> GenerationTask:
    task.status = "done"
    task.output = output
    task.error = None
    db.commit()
    db.refresh(task)
    return task


def mark_generation_task_failed(
    db: Session,
    *,
    task: GenerationTask,
    error: str,
) -> GenerationTask:
    task.status = "failed"
    task.error = error
    db.commit()
    db.refresh(task)
    return task
