"""Backup endpoint tests."""
import json
import sqlite3
from pathlib import Path


def test_backup_creates_snapshot_and_json(client):
    resp = client.get("/api/backup")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["ok"] is True
    snapshot = Path(body["file"])
    assert snapshot.exists()
    assert snapshot.name.endswith(".db")

    # The snapshot must be a valid SQLite database with the expected tables.
    con = sqlite3.connect(snapshot)
    try:
        tables = {r[0] for r in con.execute(
            "select name from sqlite_master where type='table'"
        )}
    finally:
        con.close()
    assert {"categories", "transactions", "balance_items", "templates"} <= tables

    # A sibling JSON dump should also exist.
    json_path = snapshot.with_suffix(".json")
    assert json_path.exists()
    data = json.loads(json_path.read_text(encoding="utf-8"))
    assert set(data) == {"categories", "transactions", "balance_items", "templates"}

    # Clean up the files this test produced.
    snapshot.unlink(missing_ok=True)
    json_path.unlink(missing_ok=True)
