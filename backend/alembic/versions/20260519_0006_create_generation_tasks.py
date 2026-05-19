"""create generation tasks table

Revision ID: 20260519_0006
Revises: 20260519_0005
Create Date: 2026-05-19 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260519_0006"
down_revision: str | None = "20260519_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "generation_tasks",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("client_id", sa.String(length=36), nullable=True),
        sa.Column("request_id", sa.String(length=36), nullable=True),
        sa.Column("type", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("input", sa.JSON(), nullable=False),
        sa.Column("output", sa.JSON(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["request_id"], ["travel_requests.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_generation_tasks_client_id"),
        "generation_tasks",
        ["client_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_generation_tasks_request_id"),
        "generation_tasks",
        ["request_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_generation_tasks_user_id"),
        "generation_tasks",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_generation_tasks_user_id"), table_name="generation_tasks")
    op.drop_index(op.f("ix_generation_tasks_request_id"), table_name="generation_tasks")
    op.drop_index(op.f("ix_generation_tasks_client_id"), table_name="generation_tasks")
    op.drop_table("generation_tasks")
