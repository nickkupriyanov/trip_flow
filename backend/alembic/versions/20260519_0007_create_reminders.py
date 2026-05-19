"""create reminders table

Revision ID: 20260519_0007
Revises: 20260519_0006
Create Date: 2026-05-19 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260519_0007"
down_revision: str | None = "20260519_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "reminders",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("client_id", sa.String(length=36), nullable=True),
        sa.Column("request_id", sa.String(length=36), nullable=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["request_id"], ["travel_requests.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_reminders_client_id"), "reminders", ["client_id"])
    op.create_index(op.f("ix_reminders_request_id"), "reminders", ["request_id"])
    op.create_index(op.f("ix_reminders_user_id"), "reminders", ["user_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_reminders_user_id"), table_name="reminders")
    op.drop_index(op.f("ix_reminders_request_id"), table_name="reminders")
    op.drop_index(op.f("ix_reminders_client_id"), table_name="reminders")
    op.drop_table("reminders")
