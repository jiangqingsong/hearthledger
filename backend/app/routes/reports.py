"""Report endpoints (aggregation)."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Category, Direction, Transaction
from ..schemas import (
    CategoryBreakdownItem,
    MemberBreakdownItem,
    MonthlyReportItem,
)

router = APIRouter(prefix="/reports", tags=["reports"])


def _current_month() -> str:
    return datetime.now().strftime("%Y-%m")


def _shift_month(month: str, delta: int) -> str:
    year, mon = int(month[:4]), int(month[5:7])
    total = year * 12 + (mon - 1) + delta
    y, m = divmod(total, 12)
    return f"{y:04d}-{m + 1:02d}"


@router.get("/monthly", response_model=list[MonthlyReportItem])
def monthly_report(
    months: int = Query(default=12, ge=1, le=600),
    db: Session = Depends(get_db),
):
    income_sum = func.sum(
        case((Transaction.direction == Direction.income, Transaction.amount), else_=0)
    )
    expense_sum = func.sum(
        case((Transaction.direction == Direction.expense, Transaction.amount), else_=0)
    )
    rows = (
        db.query(
            func.substr(Transaction.date, 1, 7).label("month"),
            income_sum.label("income"),
            expense_sum.label("expense"),
        )
        .group_by("month")
        .all()
    )

    aggregate: dict[str, dict[str, int]] = {}
    for month, income, expense in rows:
        aggregate[month] = {
            "income": int(income or 0),
            "expense": int(expense or 0),
        }

    # End the window at the latest month present in the data (or the current
    # month when there is no data at all), then walk back `months` months.
    end_month = max(aggregate.keys(), default=_current_month())

    result: list[MonthlyReportItem] = []
    for i in range(months - 1, -1, -1):
        month = _shift_month(end_month, -i)
        values = aggregate.get(month, {"income": 0, "expense": 0})
        result.append(
            MonthlyReportItem(
                month=month,
                income=values["income"],
                expense=values["expense"],
                balance=values["income"] - values["expense"],
            )
        )
    return result


@router.get("/category-breakdown", response_model=list[CategoryBreakdownItem])
def category_breakdown(
    month: str = Query(...),
    direction: Direction = Query(default=Direction.expense),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            Transaction.category_id.label("category_id"),
            Category.name.label("name"),
            func.sum(Transaction.amount).label("amount"),
        )
        .join(Category, Category.id == Transaction.category_id)
        .filter(
            func.substr(Transaction.date, 1, 7) == month,
            Transaction.direction == direction,
        )
        .group_by(Transaction.category_id, Category.name)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )
    return [
        CategoryBreakdownItem(
            category_id=row.category_id, name=row.name, amount=int(row.amount or 0)
        )
        for row in rows
    ]


@router.get("/member-breakdown", response_model=list[MemberBreakdownItem])
def member_breakdown(
    month: str = Query(...),
    direction: Direction = Query(default=Direction.expense),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            Transaction.owner.label("owner"),
            func.sum(Transaction.amount).label("amount"),
        )
        .filter(
            func.substr(Transaction.date, 1, 7) == month,
            Transaction.direction == direction,
        )
        .group_by(Transaction.owner)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )
    return [
        MemberBreakdownItem(owner=row.owner.value, amount=int(row.amount or 0))
        for row in rows
    ]
