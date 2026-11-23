"""Utilidades de hashing bcrypt y emisión/validación de JWT Bearer."""
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    JWT_AUDIENCE,
    JWT_ISSUER,
    JWT_REFRESH_AUDIENCE,
    REFRESH_TOKEN_EXPIRE_DAYS,
)

ALGORITHM = "HS256"


def _signing_key() -> str:
    key = os.getenv("JWT_SECRET_KEY", "").strip()
    if not key:
        raise RuntimeError("Configura JWT_SECRET_KEY en el entorno.")
    return key


def hash_password(password: str) -> str:
    """Genera hash bcrypt seguro para una contraseña en texto plano."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña contra su hash bcrypt."""
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Firma un JWT de acceso con iss, aud, typ, iat y exp."""
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = {**data, "typ": "access", "iat": now, "exp": expire, "iss": JWT_ISSUER, "aud": JWT_AUDIENCE}
    return jwt.encode(payload, _signing_key(), algorithm=ALGORITHM)


def create_refresh_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Firma un JWT de refresco de larga duración con audiencia separada."""
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    payload = {
        **data,
        "typ": "refresh",
        "jti": secrets.token_hex(12),
        "iat": now,
        "exp": expire,
        "iss": JWT_ISSUER,
        "aud": JWT_REFRESH_AUDIENCE,
    }
    return jwt.encode(payload, _signing_key(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decodifica y verifica un JWT de acceso; rechaza refresh tokens."""
    try:
        payload = jwt.decode(
            token,
            _signing_key(),
            algorithms=[ALGORITHM],
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE,
            options={"require_exp": True, "require_iat": True, "require_iss": True, "require_aud": True},
        )
        if payload.get("typ") not in (None, "access"):
            return None
        return payload
    except (JWTError, RuntimeError):
        return None


def decode_refresh_token(token: str) -> dict[str, Any] | None:
    """Decodifica y verifica un refresh token JWT."""
    try:
        payload = jwt.decode(
            token,
            _signing_key(),
            algorithms=[ALGORITHM],
            issuer=JWT_ISSUER,
            audience=JWT_REFRESH_AUDIENCE,
            options={"require_exp": True, "require_iat": True, "require_iss": True, "require_aud": True},
        )
        if payload.get("typ") != "refresh":
            return None
        return payload
    except (JWTError, RuntimeError):
        return None
