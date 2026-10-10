"""Report aggregation tests: monthly, category and member breakdowns."""


def _category(client, name, direction="expense"):
    return client.post(
        "/api/categories", json={"name": name, "direction": direction}
    ).json()


def _txn(client, date, direction, amount, category_id, owner="me"):
    return client.post(
        "/api/transactions",
        json={"date": date, "direction": direction, "amount": amount,
              "category_id": category_id, "owner": owner},
    )


def test_monthly_report_aggregation(client):
    cat = _category(client, "月报类")
    # 2026-01: income 5000, expense 1500
    _txn(client, "2026-01-05", "income", 5000, cat["id"], "me")
    _txn(client, "2026-01-06", "expense", 1000, cat["id"], "me")
    _txn(client, "2026-01-07", "expense", 500, cat["id"], "shared")
    # 2026-02: income only
    _txn(client, "2026-02-01", "income", 3000, cat["id"], "me")

    # The window ends at the latest month with data (2026-02) and walks back.
    rows = client.get("/api/reports/monthly?months=2").json()
    assert [r["month"] for r in rows] == ["2026-01", "2026-02"]

    by_month = {r["month"]: r for r in rows}
    assert by_month["2026-01"] == {
        "month": "2026-01", "income": 5000, "expense": 1500, "balance": 3500,
    }
    assert by_month["2026-02"] == {
        "month": "2026-02", "income": 3000, "expense": 0, "balance": 3000,
    }

    # A wider window adds a trailing empty month before the earliest data.
    rows = client.get("/api/reports/monthly?months=3").json()
    assert [r["month"] for r in rows] == ["2025-12", "2026-01", "2026-02"]
    by_month = {r["month"]: r for r in rows}
    assert by_month["2025-12"] == {
        "month": "2025-12", "income": 0, "expense": 0, "balance": 0,
    }


def test_category_breakdown_aggregation_and_order(client):
    cat_a = _category(client, "吃饭类")
    cat_b = _category(client, "购物类")
    _txn(client, "2026-05-01", "expense", 100, cat_a["id"])
    _txn(client, "2026-05-02", "expense", 250, cat_a["id"])
    _txn(client, "2026-05-03", "expense", 80, cat_b["id"])
    # Income in the same category/month must not leak into expense totals.
    _txn(client, "2026-05-04", "income", 9999, cat_a["id"])

    rows = client.get(
        "/api/reports/category-breakdown?month=2026-05&direction=expense"
    ).json()
    assert rows == [
        {"category_id": cat_a["id"], "name": "吃饭类", "amount": 350},
        {"category_id": cat_b["id"], "name": "购物类", "amount": 80},
    ]

    # Direction defaults to expense; other months are empty.
    assert client.get("/api/reports/category-breakdown?month=2026-06").json() == []


def test_member_breakdown_aggregation(client):
    cat = _category(client, "成员类")
    _txn(client, "2026-06-01", "expense", 100, cat["id"], "me")
    _txn(client, "2026-06-02", "expense", 50, cat["id"], "spouse")
    _txn(client, "2026-06-03", "expense", 200, cat["id"], "shared")
    # Income must not be counted in an expense breakdown.
    _txn(client, "2026-06-04", "income", 12345, cat["id"], "me")

    rows = client.get(
        "/api/reports/member-breakdown?month=2026-06&direction=expense"
    ).json()
    by_owner = {r["owner"]: r["amount"] for r in rows}
    assert by_owner == {"me": 100, "spouse": 50, "shared": 200}
    # Descending by amount.
    assert [r["amount"] for r in rows] == sorted(
        [r["amount"] for r in rows], reverse=True
    )
