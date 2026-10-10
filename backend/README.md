# HearthLedger Backend

Single-user local family-finance API. FastAPI + SQLAlchemy 2.x + SQLite + Alembic + Pydantic v2.
All amounts are whole yuan (integers). Base path for every endpoint is `/api`.

## Requirements

- Python 3.11+ (developed against 3.12)
- Nothing else — dependencies are installed into a virtualenv below.

## Setup & run

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Create the SQLite schema (backend/hearthledger.db) via Alembic.
.venv/bin/alembic upgrade head

# Start the API server (Vite dev origin is CORS-allowed).
.venv/bin/uvicorn app.main:app --reload --port 8000
```

- Interactive API docs: http://127.0.0.1:8000/docs
- Categories and templates are seeded idempotently on first run / app startup.
  Transactions are never seeded — the app starts with an empty ledger.
- Override the database location with the `HEARTHLEDGER_DB` environment variable
  (absolute path or filename).

## Tests

```bash
cd backend
.venv/bin/pytest
```

The test suite runs against a throwaway SQLite file that is migrated with Alembic
and seeded per test session; it does not touch `hearthledger.db`.

## Layout

```
backend/
├── app/
│   ├── main.py            # FastAPI app, CORS, router wiring, lifespan seed
│   ├── database.py        # engine, session factory, Base, get_db
│   ├── models.py          # SQLAlchemy models + enums
│   ├── schemas.py         # Pydantic v2 request/response models
│   ├── seed.py            # idempotent category/template seed
│   └── routes/            # transactions, categories, balance, templates, reports, backup
├── alembic/               # migration environment + versions/0001_initial.py
├── alembic.ini
├── tests/                 # pytest suite
├── requirements.txt
└── backups/               # created by GET /api/backup (SQLite snapshot + JSON)
```

## Backup

`GET /api/backup` writes a consistent SQLite snapshot (via `sqlite3.Connection.backup`)
and a full JSON dump into `backend/backups/`, then returns `{"ok": true, "file": "<snapshot path>"}`.

## Notes / assumptions

- `date` is stored as `YYYY-MM-DD` text; month-based reports group with `substr(date, 1, 7)`.
- `GET /api/reports/monthly?months=N` returns the last N months ending at the latest
  month present in the data (the current month when there is no data), ascending.
- `POST /api/transactions/copy-last-month` defaults `from_month` to the previous month
  and `to_month` to the current month; each copied record keeps its day-of-month,
  clamped to the number of days in the target month.
- Category deletion returns 409 when a transaction references it; templates that
  reference a deleted category are set to `category_id = NULL`.
- Amount fields are strict positive integers (reject 0, negatives and non-integers).
