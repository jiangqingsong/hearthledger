"""Template CRUD tests."""


def test_template_crud(client):
    cat = client.post(
        "/api/categories", json={"name": "模板类", "direction": "expense"}
    ).json()

    resp = client.post(
        "/api/templates",
        json={"name": "房租模板", "direction": "expense", "amount": 12000,
              "category_id": cat["id"], "owner": "shared", "sort_order": 1},
    )
    assert resp.status_code == 201, resp.text
    created = resp.json()
    assert created["name"] == "房租模板"
    assert created["amount"] == 12000
    assert created["owner"] == "shared"

    resp = client.put(f"/api/templates/{created['id']}", json={"amount": 13000})
    assert resp.status_code == 200
    assert resp.json()["amount"] == 13000

    listing = client.get("/api/templates").json()
    assert [t["id"] for t in listing] == [created["id"]]

    resp = client.delete(f"/api/templates/{created['id']}")
    assert resp.status_code == 204
    assert client.get("/api/templates").json() == []


def test_template_validation(client):
    resp = client.post(
        "/api/templates",
        json={"name": "坏", "direction": "expense", "amount": 0, "category_id": 1},
    )
    assert resp.status_code == 422
