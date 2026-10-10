"""Category CRUD and 409-on-referenced-delete tests."""


def test_category_crud(client):
    # Seeded categories exist.
    initial = client.get("/api/categories").json()
    assert len(initial) >= 11

    resp = client.post(
        "/api/categories",
        json={"name": "宠物", "direction": "expense", "sort_order": 50, "hint": "猫粮"},
    )
    assert resp.status_code == 201, resp.text
    created = resp.json()
    assert created["name"] == "宠物"
    assert created["hint"] == "猫粮"

    resp = client.put(f"/api/categories/{created['id']}", json={"sort_order": 1})
    assert resp.status_code == 200
    assert resp.json()["sort_order"] == 1

    # Sorted by sort_order: sort_order 1 beats the default-seeded 2+ categories.
    names = [c["name"] for c in client.get("/api/categories").json()]
    assert names.index("宠物") < names.index("日常吃喝")

    resp = client.delete(f"/api/categories/{created['id']}")
    assert resp.status_code == 204
    assert client.get(f"/api/categories/{created['id']}").status_code == 405


def test_category_delete_conflict_when_referenced(client):
    cat = client.post(
        "/api/categories", json={"name": "有流水的类别", "direction": "expense"}
    ).json()
    txn = client.post(
        "/api/transactions",
        json={"date": "2026-06-01", "direction": "expense", "amount": 50,
              "category_id": cat["id"], "owner": "me"},
    ).json()

    resp = client.delete(f"/api/categories/{cat['id']}")
    assert resp.status_code == 409, resp.text

    # Once the transaction is gone the delete succeeds.
    client.delete(f"/api/transactions/{txn['id']}")
    resp = client.delete(f"/api/categories/{cat['id']}")
    assert resp.status_code == 204


def test_category_validation(client):
    resp = client.post("/api/categories", json={"name": "X", "direction": "nope"})
    assert resp.status_code == 422
    resp = client.post("/api/categories", json={"direction": "expense"})
    assert resp.status_code == 422
