"""Utilidades de hashing bcrypt y emisión/validación de JWT Bearer."""
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.config import ACCESS_TOKEN_EXPIRE_MINUTES, JWT_AUDIENCE, JWT_ISSUER

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
    """Firma un JWT con iss, aud, iat y exp."""
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = {**data, "iat": now, "exp": expire, "iss": JWT_ISSUER, "aud": JWT_AUDIENCE}
    return jwt.encode(payload, _signing_key(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decodifica y verifica un JWT; retorna None si es inválido o expiró."""
    try:
        return jwt.decode(
            token,
            _signing_key(),
            algorithms=[ALGORITHM],
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE,
            options={"require_exp": True, "require_iat": True, "require_iss": True, "require_aud": True},
        )
    except (JWTError, RuntimeError):
        return None
