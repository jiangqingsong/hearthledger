"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-10-10

"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("direction", sa.String(length=10), nullable=False),
        sa.Column(
            "parent_id",
            sa.Integer(),
            sa.ForeignKey("categories.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("hint", sa.Text(), nullable=True),
    )

    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("date", sa.String(length=10), nullable=False, index=True),
        sa.Column("direction", sa.String(length=10), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column(
            "category_id",
            sa.Integer(),
            sa.ForeignKey("categories.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        ),
        sa.Column("owner", sa.String(length=10), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "balance_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("kind", sa.String(length=10), nullable=False),
        sa.Column("subtype", sa.String(length=20), nullable=False),
        sa.Column("owner", sa.String(length=10), nullable=False),
        sa.Column("current_value", sa.Integer(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("direction", sa.String(length=10), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column(
            "category_id",
            sa.Integer(),
            sa.ForeignKey("categories.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("owner", sa.String(length=10), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("templates")
    op.drop_table("balance_items")
    op.drop_table("transactions")
    op.drop_table("categories")
