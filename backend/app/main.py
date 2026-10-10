"""HearthLedger FastAPI application."""
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import SessionLocal
from .routes import auth, backup, balance, categories, reports, templates, transactions
from .routes.auth import require_user
from .seed import seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed categories + templates + admin account idempotently on startup. The
    # schema itself is created by Alembic (`alembic upgrade head`) first.
    with SessionLocal() as db:
        seed(db)
    yield


app = FastAPI(title="HearthLedger", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(
    transactions.router, prefix=API_PREFIX, dependencies=[Depends(require_user)]
)
app.include_router(
    categories.router, prefix=API_PREFIX, dependencies=[Depends(require_user)]
)
app.include_router(
    balance.router, prefix=API_PREFIX, dependencies=[Depends(require_user)]
)
app.include_router(
    templates.router, prefix=API_PREFIX, dependencies=[Depends(require_user)]
)
app.include_router(
    reports.router, prefix=API_PREFIX, dependencies=[Depends(require_user)]
)
app.include_router(
    backup.router, prefix=API_PREFIX, dependencies=[Depends(require_user)]
)


@app.get("/")
def root():
    return {"app": "HearthLedger", "docs": "/docs", "api": API_PREFIX}
