"""Rutas de autenticación: login, perfil, cambio de contraseña y logout auditado."""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.audit import record_log
from app.config import SYSTEM_CODE
from app.database import get_db
from app.deps import find_identity, get_current_user, get_sistema
from app.models import utcnow
from app.security import create_access_token, hash_password, verify_password

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


@router.post("/login", response_model=schemas.TokenOut)
def login(data: schemas.LoginIn, request: Request, db: Session = Depends(get_db)):
    """Autentica usuario de GEMA-Cinemático, emite JWT Bearer y registra log de acceso."""
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
        token = create_access_token({
            "sub": str(user.usuario_id),
            "rol": rol_nombre,
            "ver": user.version_seguridad,
            "sys": SYSTEM_CODE,
        })
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="JWT no configurado en el servidor.") from exc

    user.ultimo_acceso = utcnow()
    db.commit()

    record_log(
        db, request, sis.sistema_id, user.usuario, "LOGIN_OK",
        detalle=f"Inicio de sesión ({rol_nombre})", usuario_id=user.usuario_id,
    )
    return schemas.TokenOut(access_token=token, user=serialize_user(user))


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
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """Registra el cierre de sesión en auditoría."""
    record_log(
        db, request, current_user.sistema_id, current_user.usuario, "LOGOUT",
        detalle="Cierre de sesión", usuario_id=current_user.usuario_id,
    )
    return {"message": "Sesión cerrada."}
