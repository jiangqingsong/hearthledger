"""Idempotent seed data: categories, templates and the admin account."""
import os

from sqlalchemy.orm import Session

from .models import Category, Direction, Owner, Template, User
from .security import hash_password

# (name, direction, sort_order, hint)
SEED_CATEGORIES = [
    ("房贷/房租", Direction.expense, 1, None),
    ("日常吃喝", Direction.expense, 2, "买菜/外出吃"),
    ("孩子", Direction.expense, 3, "教育/兴趣班/用品"),
    ("交通/汽车", Direction.expense, 4, None),
    ("水电煤通讯", Direction.expense, 5, None),
    ("购物/网购/娱乐", Direction.expense, 6, None),
    ("保险", Direction.expense, 7, "商业/车险"),
    ("其他", Direction.expense, 8, None),
    ("工资", Direction.income, 1, "用归属区分"),
    ("补课", Direction.income, 2, None),
    ("其他", Direction.income, 3, None),
]

# (name, direction, amount, category_name, owner, sort_order, note)
SEED_TEMPLATES = [
    ("工资", Direction.income, 30000, "工资", Owner.me, 1, None),
    ("房贷", Direction.expense, 12000, "房贷/房租", Owner.shared, 2, None),
    ("水电煤", Direction.expense, 300, "水电煤通讯", Owner.shared, 3, None),
    ("商业保险", Direction.expense, 1800, "保险", Owner.shared, 4, None),
]


def seed_categories(db: Session) -> None:
    for name, direction, sort_order, hint in SEED_CATEGORIES:
        exists = (
            db.query(Category)
            .filter(Category.name == name, Category.direction == direction)
            .first()
        )
        if exists is None:
            db.add(
                Category(
                    name=name,
                    direction=direction,
                    sort_order=sort_order,
                    hint=hint,
                )
            )
    db.commit()


def seed_templates(db: Session) -> None:
    for name, direction, amount, category_name, owner, sort_order, note in SEED_TEMPLATES:
        if db.query(Template).filter(Template.name == name).first() is not None:
            continue
        category = (
            db.query(Category)
            .filter(Category.name == category_name, Category.direction == direction)
            .first()
        )
        if category is None:
            continue
        db.add(
            Template(
                name=name,
                direction=direction,
                amount=amount,
                category_id=category.id,
                owner=owner,
                note=note,
                sort_order=sort_order,
            )
        )
    db.commit()


def seed_admin_user(db: Session) -> None:
    """Create the configured admin account if it does not already exist.

    Existing accounts are left untouched so a changed password is never
    overwritten by a restart.
    """
    username = os.environ.get("HEARTHLEDGER_USERNAME", "admin")
    password = os.environ.get("HEARTHLEDGER_PASSWORD", "hearthledger")

    exists = db.query(User).filter(User.username == username).first()
    if exists is None:
        db.add(User(username=username, password_hash=hash_password(password)))
        db.commit()
        print(f"[seed] created account: {username}")
    else:
        print(f"[seed] account already exists: {username}")


def seed(db: Session) -> None:
    """Seed everything; safe to call repeatedly."""
    seed_categories(db)
    seed_templates(db)
    seed_admin_user(db)
