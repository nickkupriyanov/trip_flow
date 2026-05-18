"""create clients tables

Revision ID: 20260518_0002
Revises: 20260518_0001
Create Date: 2026-05-18 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260518_0002"
down_revision: str | None = "20260518_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "clients",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("phone", sa.String(length=80), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("telegram", sa.String(length=120), nullable=True),
        sa.Column("whatsapp", sa.String(length=80), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("source", sa.String(length=120), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_clients_user_id"), "clients", ["user_id"], unique=False)

    op.create_table(
        "client_preferences",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("client_id", sa.String(length=36), nullable=False),
        sa.Column("preferred_destinations", sa.JSON(), nullable=False),
        sa.Column("disliked_destinations", sa.JSON(), nullable=False),
        sa.Column("preferred_hotel_level", sa.String(length=20), nullable=True),
        sa.Column("meal_preferences", sa.JSON(), nullable=False),
        sa.Column("travel_style", sa.JSON(), nullable=False),
        sa.Column("important_factors", sa.JSON(), nullable=False),
        sa.Column("avoid_factors", sa.JSON(), nullable=False),
        sa.Column("average_budget_min", sa.Integer(), nullable=True),
        sa.Column("average_budget_max", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("client_id"),
    )
    op.create_index(
        op.f("ix_client_preferences_client_id"),
        "client_preferences",
        ["client_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_client_preferences_client_id"),
        table_name="client_preferences",
    )
    op.drop_table("client_preferences")
    op.drop_index(op.f("ix_clients_user_id"), table_name="clients")
    op.drop_table("clients")
