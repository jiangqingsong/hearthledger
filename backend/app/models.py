"""SQLAlchemy ORM models for HearthLedger."""
import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from .database import Base


def utc_now() -> datetime:
    """Naive UTC timestamp (avoids the deprecated datetime.utcnow)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Direction(str, enum.Enum):
    income = "income"
    expense = "expense"


class Owner(str, enum.Enum):
    me = "me"
    spouse = "spouse"
    shared = "shared"


class Kind(str, enum.Enum):
    asset = "asset"
    liability = "liability"


ASSET_SUBTYPES = {"deposit", "cash", "property", "car"}
LIABILITY_SUBTYPES = {"mortgage", "credit_card", "car_loan", "consumer_loan"}


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    direction = Column(Enum(Direction, native_enum=False, length=10), nullable=False)
    parent_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    hint = Column(Text, nullable=True)

    children = relationship("Category", backref="parent", remote_side=[id])


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True)
    date = Column(String(10), nullable=False, index=True)  # "YYYY-MM-DD"
    direction = Column(Enum(Direction, native_enum=False, length=10), nullable=False)
    amount = Column(Integer, nullable=False)
    category_id = Column(
        Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    owner = Column(
        Enum(Owner, native_enum=False, length=10), nullable=False, default=Owner.me
    )
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    category = relationship("Category")


class BalanceItem(Base):
    __tablename__ = "balance_items"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    kind = Column(Enum(Kind, native_enum=False, length=10), nullable=False)
    subtype = Column(String(20), nullable=False)
    owner = Column(
        Enum(Owner, native_enum=False, length=10), nullable=False, default=Owner.me
    )
    current_value = Column(Integer, nullable=False)
    note = Column(Text, nullable=True)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    direction = Column(Enum(Direction, native_enum=False, length=10), nullable=False)
    amount = Column(Integer, nullable=False)
    category_id = Column(
        Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    owner = Column(
        Enum(Owner, native_enum=False, length=10), nullable=False, default=Owner.me
    )
    note = Column(Text, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)

    category = relationship("Category")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(100), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, nullable=False, default=utc_now)


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at = Column(DateTime, nullable=False, default=utc_now)
    expires_at = Column(DateTime, nullable=False)

    user = relationship("User")
