"""Pydantic v2 schemas (request/response models)."""
import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .models import (
    ASSET_SUBTYPES,
    LIABILITY_SUBTYPES,
    Direction,
    Kind,
    Owner,
)

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MONTH_RE = re.compile(r"^\d{4}-\d{2}$")


def _check_date(value: str) -> str:
    if not DATE_RE.match(value):
        raise ValueError("date must be in YYYY-MM-DD format")
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError as exc:  # noqa: BLE001
        raise ValueError("date is not a valid calendar date") from exc
    return value


def _check_month(value: str) -> str:
    if not MONTH_RE.match(value):
        raise ValueError("month must be in YYYY-MM format")
    year, month = int(value[:4]), int(value[5:7])
    if not (1 <= month <= 12):
        raise ValueError("month must be between 01 and 12")
    return value


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --------------------------------------------------------------------------- #
# Categories
# --------------------------------------------------------------------------- #
class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    direction: Direction
    parent_id: Optional[int] = None
    sort_order: int = 0
    hint: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    direction: Optional[Direction] = None
    parent_id: Optional[int] = None
    sort_order: Optional[int] = None
    hint: Optional[str] = None


class CategoryOut(ORMModel):
    id: int
    name: str
    direction: Direction
    parent_id: Optional[int]
    sort_order: int
    hint: Optional[str]


# --------------------------------------------------------------------------- #
# Transactions
# --------------------------------------------------------------------------- #
class TransactionCreate(BaseModel):
    date: str
    direction: Direction
    amount: int = Field(gt=0, strict=True)
    category_id: int
    owner: Owner = Owner.me
    note: Optional[str] = None

    @model_validator(mode="after")
    def _validate_date(self) -> "TransactionCreate":
        _check_date(self.date)
        return self


class TransactionUpdate(BaseModel):
    date: Optional[str] = None
    direction: Optional[Direction] = None
    amount: Optional[int] = Field(default=None, gt=0, strict=True)
    category_id: Optional[int] = None
    owner: Optional[Owner] = None
    note: Optional[str] = None

    @model_validator(mode="after")
    def _validate_date(self) -> "TransactionUpdate":
        if self.date is not None:
            _check_date(self.date)
        return self


class TransactionOut(ORMModel):
    id: int
    date: str
    direction: Direction
    amount: int
    category_id: int
    owner: Owner
    note: Optional[str]
    created_at: datetime
    updated_at: datetime


class CopyLastMonthRequest(BaseModel):
    from_month: Optional[str] = None
    to_month: Optional[str] = None

    @model_validator(mode="after")
    def _validate_months(self) -> "CopyLastMonthRequest":
        if self.from_month is not None:
            _check_month(self.from_month)
        if self.to_month is not None:
            _check_month(self.to_month)
        return self


class CopyLastMonthResponse(BaseModel):
    copied: int


# --------------------------------------------------------------------------- #
# Balance items
# --------------------------------------------------------------------------- #
class BalanceItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    kind: Kind
    subtype: str
    owner: Owner = Owner.me
    current_value: int = Field(ge=0, strict=True)
    note: Optional[str] = None

    @model_validator(mode="after")
    def _validate_subtype(self) -> "BalanceItemCreate":
        allowed = ASSET_SUBTYPES if self.kind == Kind.asset else LIABILITY_SUBTYPES
        if self.subtype not in allowed:
            raise ValueError(
                f"subtype must be one of {sorted(allowed)} for kind={self.kind.value}"
            )
        return self


class BalanceItemUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    kind: Optional[Kind] = None
    subtype: Optional[str] = None
    owner: Optional[Owner] = None
    current_value: Optional[int] = Field(default=None, ge=0, strict=True)
    note: Optional[str] = None

    @model_validator(mode="after")
    def _validate_subtype(self) -> "BalanceItemUpdate":
        if self.kind is None and self.subtype is None:
            return self
        kind = self.kind
        if kind is None or self.subtype is None:
            # If only one side is being changed we cannot validate the pair
            # here; the route validates against the persisted item instead.
            return self
        allowed = ASSET_SUBTYPES if kind == Kind.asset else LIABILITY_SUBTYPES
        if self.subtype not in allowed:
            raise ValueError(
                f"subtype must be one of {sorted(allowed)} for kind={kind.value}"
            )
        return self


class BalanceItemOut(ORMModel):
    id: int
    name: str
    kind: Kind
    subtype: str
    owner: Owner
    current_value: int
    note: Optional[str]
    updated_at: datetime


class BalanceSummaryOut(BaseModel):
    total_assets: int
    total_liabilities: int
    net_worth: int
    liquid_assets: int


# --------------------------------------------------------------------------- #
# Templates
# --------------------------------------------------------------------------- #
class TemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    direction: Direction
    amount: int = Field(gt=0, strict=True)
    category_id: int
    owner: Owner = Owner.me
    note: Optional[str] = None
    sort_order: int = 0


class TemplateUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    direction: Optional[Direction] = None
    amount: Optional[int] = Field(default=None, gt=0, strict=True)
    category_id: Optional[int] = None
    owner: Optional[Owner] = None
    note: Optional[str] = None
    sort_order: Optional[int] = None


class TemplateOut(ORMModel):
    id: int
    name: str
    direction: Direction
    amount: int
    category_id: Optional[int]
    owner: Owner
    note: Optional[str]
    sort_order: int


# --------------------------------------------------------------------------- #
# Reports
# --------------------------------------------------------------------------- #
class MonthlyReportItem(BaseModel):
    month: str
    income: int
    expense: int
    balance: int


class CategoryBreakdownItem(BaseModel):
    category_id: int
    name: str
    amount: int


class MemberBreakdownItem(BaseModel):
    owner: str
    amount: int


class BackupOut(BaseModel):
    ok: bool
    file: str


# --------------------------------------------------------------------------- #
# Auth
# --------------------------------------------------------------------------- #
class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=256)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=1, max_length=256)


class AuthUserOut(BaseModel):
    username: str


class OkOut(BaseModel):
    ok: bool
