#!/bin/sh
set -e

# Apply any pending schema migrations (idempotent), then start the API.
alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
