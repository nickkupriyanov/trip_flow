"""add dashboard widget order

Revision ID: 20260521_0009
Revises: 20260519_0008
Create Date: 2026-05-21 00:09:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260521_0009"
down_revision: str | None = "20260519_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("dashboard_widget_order", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "dashboard_widget_order")
