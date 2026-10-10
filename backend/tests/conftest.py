"""Shared pytest fixtures.

Sets HEARTHLEDGER_DB to a throwaway SQLite file, migrates it with Alembic,
seeds it, and exposes a session-scoped TestClient.
"""
import os
import sys
import tempfile
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# Must be set before importing the app (the engine binds to this path).
_tmp = tempfile.NamedTemporaryFile(prefix="hearthledger_test_", suffix=".db", delete=False)
_tmp.close()
os.environ["HEARTHLEDGER_DB"] = _tmp.name

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402

_cfg = Config(str(BACKEND_DIR / "alembic.ini"))
_cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
command.upgrade(_cfg, "head")

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models import BalanceItem, Template, Transaction  # noqa: E402
from app.seed import seed  # noqa: E402

with SessionLocal() as _db:
    seed(_db)

from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        # Authenticate the shared client so existing route tests hit protected
        # endpoints with a valid session cookie.
        login = c.post(
            "/api/auth/login",
            json={"username": "admin", "password": "hearthledger"},
        )
        assert login.status_code == 200, login.text
        yield c


@pytest.fixture(autouse=True)
def clean_tables():
    """Start every test with an empty data set (seeded categories remain)."""
    with SessionLocal() as db:
        db.query(Transaction).delete()
        db.query(Template).delete()
        db.query(BalanceItem).delete()
        db.commit()
    yield
