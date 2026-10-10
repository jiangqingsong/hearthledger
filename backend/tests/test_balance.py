"""Balance item CRUD and summary/net-worth/liquid-assets tests."""


def _create(client, name, kind, subtype, value, owner="me"):
    resp = client.post(
        "/api/balance-items",
        json={"name": name, "kind": kind, "subtype": subtype,
              "current_value": value, "owner": owner},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_balance_item_crud(client):
    item = _create(client, "活期存款", "asset", "deposit", 100000)
    assert item["kind"] == "asset"
    assert item["subtype"] == "deposit"

    resp = client.put(f"/api/balance-items/{item['id']}", json={"current_value": 120000})
    assert resp.status_code == 200, resp.text
    assert resp.json()["current_value"] == 120000

    assert len(client.get("/api/balance-items").json()) == 1

    resp = client.delete(f"/api/balance-items/{item['id']}")
    assert resp.status_code == 204
    assert client.get("/api/balance-items").json() == []


def test_balance_item_subtype_validation(client):
    # credit_card is a liability subtype, not valid for an asset.
    resp = client.post(
        "/api/balance-items",
        json={"name": "错", "kind": "asset", "subtype": "credit_card",
              "current_value": 10},
    )
    assert resp.status_code == 422, resp.text

    resp = client.put(
        f"/api/balance-items/999999",
        json={"current_value": 5},
    )
    assert resp.status_code == 404


def test_balance_summary_mixed(client):
    _create(client, "活期存款", "asset", "deposit", 100000)
    _create(client, "现金", "asset", "cash", 5000)
    _create(client, "房产", "asset", "property", 2000000)
    _create(client, "汽车", "asset", "car", 150000)
    _create(client, "房贷", "liability", "mortgage", 800000)
    _create(client, "信用卡", "liability", "credit_card", 20000)

    summary = client.get("/api/balance/summary").json()
    assert summary == {
        "total_assets": 100000 + 5000 + 2000000 + 150000,
        "total_liabilities": 800000 + 20000,
        "net_worth": 2255000 - 820000,
        "liquid_assets": 100000 + 5000,
    }


def test_balance_summary_empty(client):
    assert client.get("/api/balance/summary").json() == {
        "total_assets": 0,
        "total_liabilities": 0,
        "net_worth": 0,
        "liquid_assets": 0,
    }
