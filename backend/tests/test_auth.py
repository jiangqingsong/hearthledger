"""Auth endpoints: login/logout/me, password hashing and change-password."""
from datetime import timedelta

import bcrypt
import pytest
from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.models import Session as SessionModel
from app.models import User, utc_now
from app.security import hash_password, hash_token


@pytest.fixture()
def anon():
    """A fresh, unauthenticated TestClient."""
    with TestClient(app) as c:
        yield c


def _ensure_user(username: str, password: str) -> None:
    with SessionLocal() as db:
        if db.query(User).filter(User.username == username).first() is None:
            db.add(User(username=username, password_hash=hash_password(password)))
            db.commit()


def test_health_public(anon):
    resp = anon.get("/api/health")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"ok": True}


def test_login_success(anon):
    resp = anon.post(
        "/api/auth/login",
        json={"username": "admin", "password": "hearthledger"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"username": "admin"}
    assert anon.cookies.get("hearthledger_session")


def test_login_wrong_password(anon):
    resp = anon.post(
        "/api/auth/login",
        json={"username": "admin", "password": "not-the-password"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "用户名或密码错误"


def test_unauthenticated_protected_route(anon):
    resp = anon.get("/api/categories")
    assert resp.status_code == 401
    assert resp.json()["detail"] == "未登录或会话已过期"


def test_login_me_logout_flow(anon):
    resp = anon.post(
        "/api/auth/login",
        json={"username": "admin", "password": "hearthledger"},
    )
    assert resp.status_code == 200

    me = anon.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json() == {"username": "admin"}

    out = anon.post("/api/auth/logout")
    assert out.status_code == 200
    assert out.json() == {"ok": True}

    # After logout the session is gone and the cookie is cleared.
    assert anon.get("/api/auth/me").status_code == 401
    # Logout is idempotent even when there is no session.
    assert anon.post("/api/auth/logout").json() == {"ok": True}


def test_password_hash_not_plaintext():
    with SessionLocal() as db:
        user = db.query(User).filter(User.username == "admin").first()
    assert user is not None
    assert user.password_hash != "hearthledger"
    assert "hearthledger" not in user.password_hash
    assert bcrypt.checkpw(b"hearthledger", user.password_hash.encode("utf-8"))


def test_change_password_flow(anon):
    _ensure_user("cp_user", "oldpass123")

    resp = anon.post(
        "/api/auth/login",
        json={"username": "cp_user", "password": "oldpass123"},
    )
    assert resp.status_code == 200, resp.text

    resp = anon.post(
        "/api/auth/change-password",
        json={"current_password": "oldpass123", "new_password": "newpass456"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"ok": True}

    # Old password is rejected, new password works.
    resp = anon.post(
        "/api/auth/login",
        json={"username": "cp_user", "password": "oldpass123"},
    )
    assert resp.status_code == 401

    resp = anon.post(
        "/api/auth/login",
        json={"username": "cp_user", "password": "newpass456"},
    )
    assert resp.status_code == 200, resp.text

    # The DB never stores the plaintext password.
    with SessionLocal() as db:
        user = db.query(User).filter(User.username == "cp_user").first()
    assert user.password_hash != "newpass456"
    assert bcrypt.checkpw(b"newpass456", user.password_hash.encode("utf-8"))


def test_expired_session_rejected(anon):
    token = "expired-token-value"
    with SessionLocal() as db:
        user = db.query(User).filter(User.username == "admin").first()
        db.add(
            SessionModel(
                token_hash=hash_token(token),
                user_id=user.id,
                created_at=utc_now(),
                expires_at=utc_now() - timedelta(seconds=1),
            )
        )
        db.commit()

    anon.cookies.set("hearthledger_session", token)
    resp = anon.get("/api/categories")
    assert resp.status_code == 401
    assert resp.json()["detail"] == "未登录或会话已过期"
