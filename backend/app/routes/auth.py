"""Authentication and session endpoints plus the shared auth dependency."""
import os
import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session as DBSession

from ..database import get_db
from ..models import Session as SessionModel
from ..models import User, utc_now
from ..schemas import AuthUserOut, ChangePasswordRequest, LoginRequest, OkOut
from ..security import hash_password, hash_token, verify_password

router = APIRouter(tags=["auth"])

SESSION_COOKIE = "hearthledger_session"
SESSION_DAYS = 30

LOGIN_FAILED_DETAIL = "用户名或密码错误"
UNAUTHENTICATED_DETAIL = "未登录或会话已过期"


def _cookie_secure() -> bool:
    value = os.environ.get("HEARTHLEDGER_COOKIE_SECURE", "false").strip().lower()
    return value in {"1", "true", "yes", "on"}


def require_user(request: Request, db: DBSession = Depends(get_db)) -> User:
    """Resolve the current user from the session cookie (or raise 401)."""
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail=UNAUTHENTICATED_DETAIL)

    session = (
        db.query(SessionModel)
        .filter(SessionModel.token_hash == hash_token(token))
        .first()
    )
    if session is None:
        raise HTTPException(status_code=401, detail=UNAUTHENTICATED_DETAIL)

    if session.expires_at <= utc_now():
        db.delete(session)
        db.commit()
        raise HTTPException(status_code=401, detail=UNAUTHENTICATED_DETAIL)

    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(status_code=401, detail=UNAUTHENTICATED_DETAIL)
    return user


@router.post("/auth/login", response_model=AuthUserOut)
def login(
    payload: LoginRequest,
    response: Response,
    db: DBSession = Depends(get_db),
):
    user = db.query(User).filter(User.username == payload.username).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail=LOGIN_FAILED_DETAIL)

    token = secrets.token_urlsafe(32)
    now = utc_now()
    db.add(
        SessionModel(
            token_hash=hash_token(token),
            user_id=user.id,
            created_at=now,
            expires_at=now + timedelta(days=SESSION_DAYS),
        )
    )
    db.commit()

    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=SESSION_DAYS * 24 * 60 * 60,
        httponly=True,
        samesite="lax",
        secure=_cookie_secure(),
    )
    return AuthUserOut(username=user.username)


@router.post("/auth/logout", response_model=OkOut)
def logout(
    request: Request,
    response: Response,
    db: DBSession = Depends(get_db),
):
    """Delete the current session and clear the cookie (idempotent)."""
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        db.query(SessionModel).filter(
            SessionModel.token_hash == hash_token(token)
        ).delete()
        db.commit()
    response.delete_cookie(key=SESSION_COOKIE)
    return OkOut(ok=True)


@router.get("/auth/me", response_model=AuthUserOut)
def me(user: User = Depends(require_user)):
    return AuthUserOut(username=user.username)


@router.post("/auth/change-password", response_model=OkOut)
def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(require_user),
    db: DBSession = Depends(get_db),
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="当前密码错误")

    user.password_hash = hash_password(payload.new_password)
    # Invalidate every session for this user so old cookies stop working.
    db.query(SessionModel).filter(SessionModel.user_id == user.id).delete()
    db.commit()
    return OkOut(ok=True)


@router.get("/health")
def health():
    """Public health probe (no auth required)."""
    return {"ok": True}
