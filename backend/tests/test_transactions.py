"""Transaction CRUD, filtering and copy-last-month tests."""
from datetime import datetime


def _make_category(client, name="测试支出", direction="expense"):
    resp = client.post(
        "/api/categories",
        json={"name": name, "direction": direction, "sort_order": 99},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_transaction_crud_and_filtering(client):
    cat = _make_category(client, "测试支出A")
    payload = {
        "date": "2026-06-15",
        "direction": "expense",
        "amount": 888,
        "category_id": cat["id"],
        "owner": "me",
        "note": "买菜",
    }
    resp = client.post("/api/transactions", json=payload)
    assert resp.status_code == 201, resp.text
    created = resp.json()
    assert created["amount"] == 888
    assert created["direction"] == "expense"
    assert created["owner"] == "me"
    assert created["date"] == "2026-06-15"

    # Update amount + note.
    resp = client.put(
        f"/api/transactions/{created['id']}",
        json={"amount": 999, "note": "更新备注"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["amount"] == 999
    assert resp.json()["note"] == "更新备注"

    # Filtering.
    listing = client.get("/api/transactions?month=2026-06&direction=expense&owner=me").json()
    assert [t["id"] for t in listing] == [created["id"]]
    listing = client.get("/api/transactions?month=2026-07").json()
    assert listing == []

    # Delete -> 204, then gone.
    resp = client.delete(f"/api/transactions/{created['id']}")
    assert resp.status_code == 204
    assert client.get("/api/transactions").json() == []


def test_transaction_list_sorted_date_desc_then_created_desc(client):
    cat = _make_category(client, "测试支出B")
    for date in ["2026-01-01", "2026-03-01", "2026-03-02"]:
        client.post(
            "/api/transactions",
            json={"date": date, "direction": "expense", "amount": 10,
                  "category_id": cat["id"], "owner": "me"},
        )
    dates = [t["date"] for t in client.get("/api/transactions").json()]
    assert dates == ["2026-03-02", "2026-03-01", "2026-01-01"]


def test_transaction_validation(client):
    cat = _make_category(client, "测试支出C")
    base = {"date": "2026-06-15", "direction": "expense", "amount": 10,
            "category_id": cat["id"], "owner": "me"}
    # amount must be a positive integer.
    for bad in [0, -5, "100"]:
        resp = client.post("/api/transactions", json={**base, "amount": bad})
        assert resp.status_code == 422, resp.text
    # invalid direction / owner.
    resp = client.post("/api/transactions", json={**base, "direction": "transfer"})
    assert resp.status_code == 422
    resp = client.post("/api/transactions", json={**base, "owner": "dog"})
    assert resp.status_code == 422
    # invalid date.
    resp = client.post("/api/transactions", json={**base, "date": "2026-02-30"})
    assert resp.status_code == 422
    # missing required field.
    del base["date"]
    resp = client.post("/api/transactions", json=base)
    assert resp.status_code == 422


def test_copy_last_month_explicit_months_and_clamp(client):
    cat = _make_category(client, "测试支出D")
    for day in ["05", "15", "31"]:
        client.post(
            "/api/transactions",
            json={"date": f"2026-01-{day}", "direction": "expense", "amount": 100,
                  "category_id": cat["id"], "owner": "shared"},
        )
    resp = client.post(
        "/api/transactions/copy-last-month",
        json={"from_month": "2026-01", "to_month": "2026-02"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"copied": 3}

    copied = client.get("/api/transactions?month=2026-02").json()
    copied_dates = sorted(t["date"] for t in copied)
    # 2026 is not a leap year -> Feb has 28 days, so day 31 is clamped to 28.
    assert copied_dates == ["2026-02-05", "2026-02-15", "2026-02-28"]
    # Original records remain untouched.
    assert len(client.get("/api/transactions?month=2026-01").json()) == 3


def test_copy_last_month_default_months(client):
    cat = _make_category(client, "测试支出E")
    now = datetime.now()
    if now.month == 1:
        prev = f"{now.year - 1}-12"
    else:
        prev = f"{now.year}-{now.month - 1:02d}"
    current = now.strftime("%Y-%m")

    client.post(
        "/api/transactions",
        json={"date": f"{prev}-10", "direction": "income", "amount": 30000,
              "category_id": cat["id"], "owner": "me"},
    )
    resp = client.post("/api/transactions/copy-last-month", json={})
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"copied": 1}
    assert len(client.get(f"/api/transactions?month={current}").json()) == 1
