"""Database engine, session factory and declarative base."""
import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

BACKEND_DIR = Path(__file__).resolve().parent.parent

# Allow the database file location to be overridden (used by tests / alembic).
DB_PATH = os.environ.get("HEARTHLEDGER_DB", str(BACKEND_DIR / "hearthledger.db"))

# For an absolute path this yields the required four slashes: sqlite:////abs/path
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

Base = declarative_base()


@event.listens_for(engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, connection_record):  # noqa: ANN001
    """Enable FK enforcement so ON DELETE rules actually apply on SQLite."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def get_db():
    """FastAPI dependency that yields a session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
