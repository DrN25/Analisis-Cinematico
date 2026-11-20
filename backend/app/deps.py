"""Dependencias de aislamiento por sistema y autenticación JWT."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app import models
from app.config import SYSTEM_CODE
from app.database import get_db
from app.security import decode_access_token

bearer = HTTPBearer(auto_error=False)


def get_sistema(db: Session) -> models.Sistema:
    """Obtiene el registro de auth.Sistemas correspondiente a SYSTEM_CODE."""
    sis = (
        db.query(models.Sistema)
        .filter(models.Sistema.codigo == SYSTEM_CODE, models.Sistema.estado == "A")
        .first()
    )
    if sis is None:
        raise HTTPException(
            status_code=503,
            detail=f"Sistema '{SYSTEM_CODE}' no configurado en auth.Sistemas.",
        )
    return sis


def system_roles(db: Session):
    """Query de roles pertenecientes al sistema actual."""
    return (
        db.query(models.Role)
        .join(models.Sistema, models.Role.sistema_id == models.Sistema.sistema_id)
        .filter(models.Sistema.codigo == SYSTEM_CODE, models.Sistema.estado == "A")
    )


def system_users(db: Session):
    """Query de usuarios pertenecientes al sistema actual."""
    return (
        db.query(models.Usuario)
        .join(models.Usuario.rol)
        .join(models.Sistema, models.Usuario.sistema_id == models.Sistema.sistema_id)
        .filter(models.Sistema.codigo == SYSTEM_CODE, models.Sistema.estado == "A")
    )


def find_identity(db: Session, value: str) -> models.Usuario | None:
    """Busca un usuario activo por Usuario o Email dentro del sistema actual."""
    users = system_users(db).filter(models.Role.estado == "A")
    return (
        users.filter(models.Usuario.usuario.in_((value.upper(), value))).first()
        or users.filter(models.Usuario.email.in_((value.lower(), value))).first()
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> models.Usuario:
    """Valida el JWT Bearer y retorna el usuario activo del sistema actual."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión requerida.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(credentials.credentials)
    if not payload or payload.get("sys") != SYSTEM_CODE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o expirada.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    subject = payload.get("sub")
    version = payload.get("ver")
    if (
        not isinstance(subject, str)
        or not subject.isascii()
        or not subject.isdecimal()
        or len(subject) > 10
        or int(subject) > 2147483647
        or type(version) is not int
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token malformado.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = (
        system_users(db)
        .filter(
            models.Usuario.usuario_id == int(subject),
            models.Usuario.estado == "A",
            models.Usuario.version_seguridad == version,
            models.Role.estado == "A",
        )
        .first()
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o revocada.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_admin(current_user: models.Usuario = Depends(get_current_user)) -> models.Usuario:
    """Exige rol 'admin' dentro del sistema actual."""
    rol = current_user.rol.nombre if current_user.rol else None
    if rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: se requiere rol de administrador.",
        )
    return current_user
