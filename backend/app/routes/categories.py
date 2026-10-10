"""Category endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Category, Transaction
from ..schemas import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


def _get_category_or_404(db: Session, category_id: int) -> Category:
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.get("", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return (
        db.query(Category)
        .order_by(Category.sort_order.asc(), Category.id.asc())
        .all()
    )


@router.post("", response_model=CategoryOut, status_code=201)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    if payload.parent_id is not None and db.get(Category, payload.parent_id) is None:
        raise HTTPException(status_code=404, detail="Parent category not found")
    category = Category(**payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int, payload: CategoryUpdate, db: Session = Depends(get_db)
):
    category = _get_category_or_404(db, category_id)
    data = payload.model_dump(exclude_unset=True)
    if data.get("parent_id") is not None and db.get(Category, data["parent_id"]) is None:
        raise HTTPException(status_code=404, detail="Parent category not found")
    if data.get("parent_id") == category_id:
        raise HTTPException(status_code=422, detail="A category cannot be its own parent")
    for key, value in data.items():
        setattr(category, key, value)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    category = _get_category_or_404(db, category_id)
    referenced = (
        db.query(Transaction.id)
        .filter(Transaction.category_id == category_id)
        .first()
    )
    if referenced is not None:
        raise HTTPException(
            status_code=409,
            detail="Category is referenced by transactions and cannot be deleted",
        )
    db.delete(category)
    db.commit()
    return Response(status_code=204)
