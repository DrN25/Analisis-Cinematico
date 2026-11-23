"""Rutas de autenticación: login, refresco, perfil, cambio de contraseña y logout auditado."""
from datetime import timedelta

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.audit import record_log
from app.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    MOBILE_ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    SYSTEM_CODE,
)
from app.database import get_db
from app.deps import find_identity, get_current_user, get_sistema, resolve_user_from_claims
from app.models import utcnow
from app.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)

router = APIRouter()


def serialize_user(user: models.Usuario) -> schemas.UserOut:
    """Convierte un modelo Usuario a su esquema público UserOut."""
    return schemas.UserOut(
        usuario_id=user.usuario_id,
        usuario=user.usuario,
        email=user.email,
        nombre_completo=user.nombre_completo,
        rol_id=user.rol_id,
        rol_nombre=user.rol.nombre if user.rol else "usuario",
        protegido=bool(user.protegido),
        estado=user.estado,
        ultimo_acceso=schemas.dt_iso_utc(user.ultimo_acceso),
        fecha_registro=schemas.dt_iso_utc(user.fecha_registro) or "",
    )


def _build_token_response(user: models.Usuario, client: str = "web") -> schemas.TokenOut:
    """Construye el par access_token + refresh_token para web o cliente móvil offline."""
    rol_nombre = user.rol.nombre if user.rol else "usuario"
    claims = {
        "sub": str(user.usuario_id),
        "rol": rol_nombre,
        "ver": user.version_seguridad,
        "sys": SYSTEM_CODE,
    }
    access_mins = MOBILE_ACCESS_TOKEN_EXPIRE_MINUTES if client == "mobile" else ACCESS_TOKEN_EXPIRE_MINUTES
    access_delta = timedelta(minutes=access_mins)
    refresh_delta = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    access_token = create_access_token(claims, expires_delta=access_delta)
    refresh_token = create_refresh_token(claims, expires_delta=refresh_delta)
    return schemas.TokenOut(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in_seconds=int(access_delta.total_seconds()),
        refresh_expires_in_seconds=int(refresh_delta.total_seconds()),
        user=serialize_user(user),
    )


@router.post("/login", response_model=schemas.TokenOut)
def login(data: schemas.LoginIn, request: Request, db: Session = Depends(get_db)):
    """Autentica usuario de GEMA-Cinemático, emite JWT + refresh token y registra log."""
    sis = get_sistema(db)
    ident = data.username_or_email.strip()
    if not ident:
        raise HTTPException(status_code=400, detail="Ingresa tu usuario o correo.")

    user = find_identity(db, ident)
    if not user or not verify_password(data.password, user.contrasena_hash):
        record_log(
            db, request, sis.sistema_id, ident[:50], "LOGIN_FAIL",
            detalle="Credenciales incorrectas",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario/correo o contraseña incorrectos.",
        )

    if user.estado != "A":
        record_log(
            db, request, sis.sistema_id, user.usuario, "LOGIN_FAIL",
            detalle=f"Cuenta en estado '{user.estado}'", usuario_id=user.usuario_id,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tu cuenta se encuentra inhabilitada.",
        )

    rol_nombre = user.rol.nombre if user.rol else "usuario"
    try:
        resp = _build_token_response(user, data.client or "web")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="JWT no configurado en el servidor.") from exc

    user.ultimo_acceso = utcnow()
    db.commit()

    record_log(
        db, request, sis.sistema_id, user.usuario, "LOGIN_OK",
        detalle=f"Inicio de sesión ({rol_nombre} · {data.client or 'web'})", usuario_id=user.usuario_id,
    )
    return resp


@router.post("/refresh", response_model=schemas.TokenOut)
def refresh_session(data: schemas.RefreshIn, request: Request, db: Session = Depends(get_db)):
    """Renueva el access token móvil validando que el usuario siga activo y no revocado."""
    payload = decode_refresh_token(data.refresh_token)
    user = resolve_user_from_claims(db, payload)
    sis = get_sistema(db)

    try:
        resp = _build_token_response(user, "mobile")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="JWT no configurado en el servidor.") from exc

    user.ultimo_acceso = utcnow()
    db.commit()

    record_log(
        db, request, sis.sistema_id, user.usuario, "TOKEN_REFRESH",
        detalle="Renovación silenciosa de sesión móvil", usuario_id=user.usuario_id,
    )
    return resp


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.Usuario = Depends(get_current_user)):
    """Retorna la información del usuario autenticado."""
    return serialize_user(current_user)


@router.post("/change-password")
def change_password(
    data: schemas.ChangePasswordIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """Permite al usuario cambiar su contraseña e invalida tokens previos."""
    if not verify_password(data.old_password, current_user.contrasena_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta.")
    new_pwd = data.new_password.strip()
    if len(new_pwd) < 4:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 4 caracteres.")

    current_user.contrasena_hash = hash_password(new_pwd)
    current_user.version_seguridad += 1
    current_user.fecha_modificacion = utcnow()
    current_user.usuario_modificacion = current_user.usuario
    db.commit()

    record_log(
        db, request, current_user.sistema_id, current_user.usuario, "PASSWORD_CHANGE",
        detalle="Cambio de contraseña propio", usuario_id=current_user.usuario_id,
    )
    return {"message": "Contraseña actualizada. Inicia sesión nuevamente."}


@router.post("/logout")
def logout(
    request: Request,
    data: schemas.LogoutIn | None = Body(default=None),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """Registra el cierre de sesión y opcionalmente revoca tokens activos."""
    if data and data.revoke_sessions:
        current_user.version_seguridad += 1
        db.commit()
    record_log(
        db, request, current_user.sistema_id, current_user.usuario, "LOGOUT",
        detalle="Cierre de sesión", usuario_id=current_user.usuario_id,
    )
    return {"message": "Sesión cerrada."}
