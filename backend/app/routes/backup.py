"""Backup endpoint: SQLite snapshot + JSON dump."""
import json
import sqlite3
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import BACKEND_DIR, DB_PATH, get_db
from ..models import BalanceItem, Category, Template, Transaction
from ..schemas import BackupOut

router = APIRouter(tags=["backup"])

BACKUP_DIR = BACKEND_DIR / "backups"


def _json_default(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    if hasattr(obj, "value"):
        return obj.value
    return str(obj)


@router.get("/backup", response_model=BackupOut)
def create_backup(db: Session = Depends(get_db)):
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # 1. Consistent SQLite snapshot.
    snapshot_path = BACKUP_DIR / f"hearthledger_{timestamp}.db"
    source = sqlite3.connect(DB_PATH)
    try:
        destination = sqlite3.connect(str(snapshot_path))
        try:
            source.backup(destination)
        finally:
            destination.close()
    finally:
        source.close()

    # 2. Full JSON dump for portability.
    json_path = BACKUP_DIR / f"hearthledger_{timestamp}.json"
    dump = {
        "categories": [
            {
                "id": c.id,
                "name": c.name,
                "direction": c.direction.value,
                "parent_id": c.parent_id,
                "sort_order": c.sort_order,
                "hint": c.hint,
            }
            for c in db.query(Category).order_by(Category.id).all()
        ],
        "transactions": [
            {
                "id": t.id,
                "date": t.date,
                "direction": t.direction.value,
                "amount": t.amount,
                "category_id": t.category_id,
                "owner": t.owner.value,
                "note": t.note,
                "created_at": t.created_at,
                "updated_at": t.updated_at,
            }
            for t in db.query(Transaction).order_by(Transaction.id).all()
        ],
        "balance_items": [
            {
                "id": b.id,
                "name": b.name,
                "kind": b.kind.value,
                "subtype": b.subtype,
                "owner": b.owner.value,
                "current_value": b.current_value,
                "note": b.note,
                "updated_at": b.updated_at,
            }
            for b in db.query(BalanceItem).order_by(BalanceItem.id).all()
        ],
        "templates": [
            {
                "id": t.id,
                "name": t.name,
                "direction": t.direction.value,
                "amount": t.amount,
                "category_id": t.category_id,
                "owner": t.owner.value,
                "note": t.note,
                "sort_order": t.sort_order,
            }
            for t in db.query(Template).order_by(Template.id).all()
        ],
    }
    json_path.write_text(
        json.dumps(dump, ensure_ascii=False, indent=2, default=_json_default),
        encoding="utf-8",
    )

    return BackupOut(ok=True, file=str(snapshot_path))
