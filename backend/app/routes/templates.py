"""Template endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Category, Template
from ..schemas import TemplateCreate, TemplateOut, TemplateUpdate

router = APIRouter(prefix="/templates", tags=["templates"])


def _get_template_or_404(db: Session, template_id: int) -> Template:
    template = db.get(Template, template_id)
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.get("", response_model=list[TemplateOut])
def list_templates(db: Session = Depends(get_db)):
    return (
        db.query(Template)
        .order_by(Template.sort_order.asc(), Template.id.asc())
        .all()
    )


@router.post("", response_model=TemplateOut, status_code=201)
def create_template(payload: TemplateCreate, db: Session = Depends(get_db)):
    if db.get(Category, payload.category_id) is None:
        raise HTTPException(status_code=404, detail="Category not found")
    template = Template(**payload.model_dump())
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.put("/{template_id}", response_model=TemplateOut)
def update_template(
    template_id: int, payload: TemplateUpdate, db: Session = Depends(get_db)
):
    template = _get_template_or_404(db, template_id)
    data = payload.model_dump(exclude_unset=True)
    if "category_id" in data and data["category_id"] is not None:
        if db.get(Category, data["category_id"]) is None:
            raise HTTPException(status_code=404, detail="Category not found")
    for key, value in data.items():
        setattr(template, key, value)
    db.commit()
    db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    template = _get_template_or_404(db, template_id)
    db.delete(template)
    db.commit()
    return Response(status_code=204)
