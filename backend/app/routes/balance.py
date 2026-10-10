"""Balance item and summary endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    ASSET_SUBTYPES,
    LIABILITY_SUBTYPES,
    BalanceItem,
    Kind,
)
from ..schemas import (
    BalanceItemCreate,
    BalanceItemOut,
    BalanceItemUpdate,
    BalanceSummaryOut,
)

router = APIRouter(tags=["balance"])


def _get_balance_item_or_404(db: Session, item_id: int) -> BalanceItem:
    item = db.get(BalanceItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Balance item not found")
    return item


@router.get("/balance-items", response_model=list[BalanceItemOut])
def list_balance_items(db: Session = Depends(get_db)):
    return db.query(BalanceItem).order_by(BalanceItem.id.asc()).all()


@router.post("/balance-items", response_model=BalanceItemOut, status_code=201)
def create_balance_item(payload: BalanceItemCreate, db: Session = Depends(get_db)):
    item = BalanceItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/balance-items/{item_id}", response_model=BalanceItemOut)
def update_balance_item(
    item_id: int, payload: BalanceItemUpdate, db: Session = Depends(get_db)
):
    item = _get_balance_item_or_404(db, item_id)
    data = payload.model_dump(exclude_unset=True)

    # Validate the resulting kind/subtype pair against the persisted item.
    kind = data.get("kind", item.kind)
    subtype = data.get("subtype", item.subtype)
    allowed = ASSET_SUBTYPES if kind == Kind.asset else LIABILITY_SUBTYPES
    if subtype not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"subtype must be one of {sorted(allowed)} for kind={kind.value}",
        )

    for key, value in data.items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/balance-items/{item_id}", status_code=204)
def delete_balance_item(item_id: int, db: Session = Depends(get_db)):
    item = _get_balance_item_or_404(db, item_id)
    db.delete(item)
    db.commit()
    return Response(status_code=204)


@router.get("/balance/summary", response_model=BalanceSummaryOut)
def balance_summary(db: Session = Depends(get_db)):
    total_assets = (
        db.query(func.coalesce(func.sum(BalanceItem.current_value), 0))
        .filter(BalanceItem.kind == Kind.asset)
        .scalar()
    )
    total_liabilities = (
        db.query(func.coalesce(func.sum(BalanceItem.current_value), 0))
        .filter(BalanceItem.kind == Kind.liability)
        .scalar()
    )
    liquid_assets = (
        db.query(func.coalesce(func.sum(BalanceItem.current_value), 0))
        .filter(
            BalanceItem.kind == Kind.asset,
            BalanceItem.subtype.in_(["deposit", "cash"]),
        )
        .scalar()
    )
    return BalanceSummaryOut(
        total_assets=int(total_assets or 0),
        total_liabilities=int(total_liabilities or 0),
        net_worth=int(total_assets or 0) - int(total_liabilities or 0),
        liquid_assets=int(liquid_assets or 0),
    )
