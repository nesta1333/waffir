"""initial schema — users, otp_codes, price_alerts, search_history

Revision ID: 001
Revises:
Create Date: 2025-01-01 00:00:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id",              UUID(as_uuid=False), primary_key=True),
        sa.Column("phone",           sa.String(20),  nullable=False),
        sa.Column("name",            sa.String(100), nullable=True),
        sa.Column("language",        sa.String(2),   nullable=False, server_default="ar"),
        sa.Column("currency",        sa.String(3),   nullable=False, server_default="AED"),
        sa.Column("is_premium",      sa.Boolean(),   nullable=False, server_default="false"),
        sa.Column("premium_expires", sa.DateTime(),  nullable=True),
        sa.Column("created_at",      sa.DateTime(),  nullable=False, server_default=sa.text("now()")),
        sa.Column("last_seen_at",    sa.DateTime(),  nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_users_phone", "users", ["phone"], unique=True)

    # ── otp_codes ─────────────────────────────────────────────────────────────
    op.create_table(
        "otp_codes",
        sa.Column("id",         UUID(as_uuid=False), primary_key=True),
        sa.Column("phone",      sa.String(20), nullable=False),
        sa.Column("code",       sa.String(6),  nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used",       sa.Boolean(),  nullable=False, server_default="false"),
        sa.Column("attempts",   sa.Integer(),  nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_otp_phone", "otp_codes", ["phone"])

    # ── price_alerts ──────────────────────────────────────────────────────────
    op.create_table(
        "price_alerts",
        sa.Column("id",              UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id",         UUID(as_uuid=False), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_name_ar", sa.String(500), nullable=False),
        sa.Column("product_id",      sa.String(200), nullable=True),
        sa.Column("target_price",    sa.Numeric(10, 2), nullable=False),
        sa.Column("currency",        sa.String(3),  nullable=False, server_default="AED"),
        sa.Column("platform_id",     sa.String(50), nullable=True),
        sa.Column("is_active",       sa.Boolean(),  nullable=False, server_default="true"),
        sa.Column("triggered",       sa.Boolean(),  nullable=False, server_default="false"),
        sa.Column("triggered_at",    sa.DateTime(), nullable=True),
        sa.Column("current_price",   sa.Numeric(10, 2), nullable=True),
        sa.Column("created_at",      sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_price_alerts_user", "price_alerts", ["user_id"])

    # ── search_history ────────────────────────────────────────────────────────
    op.create_table(
        "search_history",
        sa.Column("id",            UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id",       UUID(as_uuid=False), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("query",         sa.String(500), nullable=False),
        sa.Column("currency",      sa.String(3),   nullable=False, server_default="AED"),
        sa.Column("results_count", sa.Integer(),   nullable=False, server_default="0"),
        sa.Column("created_at",    sa.DateTime(),  nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_search_history_user", "search_history", ["user_id"])


def downgrade() -> None:
    op.drop_table("search_history")
    op.drop_table("price_alerts")
    op.drop_table("otp_codes")
    op.drop_table("users")
