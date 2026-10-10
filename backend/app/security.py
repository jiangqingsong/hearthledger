"""Password and token hashing helpers.

Passwords are hashed with bcrypt (never stored in plaintext). Session tokens
are stored only as SHA-256 hex digests, so a leaked DB does not leak sessions.
"""
import hashlib

import bcrypt


def hash_password(plain: str) -> str:
    """Hash a plaintext password with bcrypt and return the stored string."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if `plain` matches the bcrypt `hashed` value."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        # bcrypt rejects malformed hashes or over-long passwords.
        return False


def hash_token(token: str) -> str:
    """Return the SHA-256 hex digest of a session token."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
