"""create communication notes table

Revision ID: 20260519_0008
Revises: 20260519_0007
Create Date: 2026-05-19 00:08:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260519_0008"
down_revision: str | None = "20260519_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "communication_notes",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("client_id", sa.String(length=36), nullable=False),
        sa.Column("request_id", sa.String(length=36), nullable=True),
        sa.Column("type", sa.String(length=24), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["request_id"],
            ["travel_requests.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_communication_notes_client_id"),
        "communication_notes",
        ["client_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_communication_notes_request_id"),
        "communication_notes",
        ["request_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_communication_notes_request_id"),
        table_name="communication_notes",
    )
    op.drop_index(
        op.f("ix_communication_notes_client_id"),
        table_name="communication_notes",
    )
    op.drop_table("communication_notes")
