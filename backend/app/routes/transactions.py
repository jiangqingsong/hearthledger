"""Transaction endpoints."""
import calendar
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Category, Direction, Owner, Transaction
from ..schemas import (
    CopyLastMonthRequest,
    CopyLastMonthResponse,
    TransactionCreate,
    TransactionOut,
    TransactionUpdate,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _get_transaction_or_404(db: Session, transaction_id: int) -> Transaction:
    transaction = db.get(Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    month: Optional[str] = Query(default=None),
    owner: Optional[Owner] = Query(default=None),
    category_id: Optional[int] = Query(default=None),
    direction: Optional[Direction] = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(Transaction)
    if month is not None:
        query = query.filter(Transaction.date.like(f"{month}-%"))
    if owner is not None:
        query = query.filter(Transaction.owner == owner)
    if category_id is not None:
        query = query.filter(Transaction.category_id == category_id)
    if direction is not None:
        query = query.filter(Transaction.direction == direction)
    return query.order_by(Transaction.date.desc(), Transaction.created_at.desc()).all()


@router.post("", response_model=TransactionOut, status_code=201)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db)):
    if db.get(Category, payload.category_id) is None:
        raise HTTPException(status_code=404, detail="Category not found")
    transaction = Transaction(**payload.model_dump())
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.put("/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
):
    transaction = _get_transaction_or_404(db, transaction_id)
    data = payload.model_dump(exclude_unset=True)
    if "category_id" in data and db.get(Category, data["category_id"]) is None:
        raise HTTPException(status_code=404, detail="Category not found")
    for key, value in data.items():
        setattr(transaction, key, value)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction = _get_transaction_or_404(db, transaction_id)
    db.delete(transaction)
    db.commit()
    return Response(status_code=204)


@router.post("/copy-last-month", response_model=CopyLastMonthResponse)
def copy_last_month(payload: CopyLastMonthRequest, db: Session = Depends(get_db)):
    now = datetime.now()
    current_month = now.strftime("%Y-%m")
    if now.month == 1:
        prev_month = f"{now.year - 1}-12"
    else:
        prev_month = f"{now.year}-{now.month - 1:02d}"

    from_month = payload.from_month or prev_month
    to_month = payload.to_month or current_month

    to_year, to_month_num = int(to_month[:4]), int(to_month[5:7])
    days_in_to = calendar.monthrange(to_year, to_month_num)[1]

    source = (
        db.query(Transaction)
        .filter(Transaction.date.like(f"{from_month}-%"))
        .order_by(Transaction.date.asc(), Transaction.created_at.asc())
        .all()
    )

    copied = 0
    for txn in source:
        day = int(txn.date[-2:])
        day = min(day, days_in_to)
        db.add(
            Transaction(
                date=f"{to_month}-{day:02d}",
                direction=txn.direction,
                amount=txn.amount,
                category_id=txn.category_id,
                owner=txn.owner,
                note=txn.note,
            )
        )
        copied += 1

    db.commit()
    return CopyLastMonthResponse(copied=copied)
