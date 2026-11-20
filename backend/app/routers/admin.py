"""Rutas de administración: gestión de usuarios y logs de auditoría (solo rol admin)."""
import csv
import io
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.audit import record_log
from app.database import get_db
from app.deps import get_sistema, require_admin, system_roles, system_users
from app.models import utcnow
from app.routers.auth import serialize_user
from app.security import hash_password

router = APIRouter()


def _commit(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Conflicto con un registro existente.") from exc


@router.get("/roles", response_model=list[schemas.RoleOut])
def list_roles(
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(require_admin),
):
    """Lista los roles activos del sistema cinemático."""
    roles = system_roles(db).filter(models.Role.estado == "A").order_by(models.Role.rol_id.asc()).all()
    return [
        schemas.RoleOut(rol_id=r.rol_id, nombre=r.nombre, descripcion=r.descripcion, estado=r.estado)
        for r in roles
    ]


@router.get("/usuarios", response_model=list[schemas.UserOut])
def list_users(
    estado: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(require_admin),
):
    """Lista los usuarios del sistema cinemático (excluye eliminados '*' salvo filtro explícito)."""
    q = system_users(db)
    q = q.filter(models.Usuario.estado == estado) if estado else q.filter(models.Usuario.estado != "*")
    return [serialize_user(u) for u in q.order_by(models.Usuario.usuario_id.desc()).all()]


@router.post("/usuarios", response_model=schemas.UserOut, status_code=201)
def create_user(
    data: schemas.UserCreateIn,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(require_admin),
):
    """Crea una nueva cuenta dentro del sistema cinemático."""
    sis = get_sistema(db)
    u_str = data.usuario.strip().upper()
    e_str = data.email.strip().lower()
    if not u_str or not e_str or len(data.password.strip()) < 4:
        raise HTTPException(status_code=400, detail="Usuario, email y contraseña (>=4 caracteres) son obligatorios.")

    if system_users(db).filter(models.Usuario.usuario == u_str).first():
        raise HTTPException(status_code=400, detail=f"El usuario '{u_str}' ya existe en este sistema.")
    if system_users(db).filter(models.Usuario.email == e_str).first():
        raise HTTPException(status_code=400, detail=f"El correo '{e_str}' ya está registrado en este sistema.")

    rol = system_roles(db).filter(models.Role.rol_id == data.rol_id, models.Role.estado == "A").first()
    if not rol:
        raise HTTPException(status_code=400, detail="Rol inválido para este sistema.")

    user = models.Usuario(
        sistema_id=sis.sistema_id,
        usuario=u_str,
        email=e_str,
        contrasena_hash=hash_password(data.password.strip()),
        nombre_completo=data.nombre_completo.strip() if data.nombre_completo else None,
        rol_id=rol.rol_id,
        estado="A",
        usuario_registro=admin.usuario,
    )
    db.add(user)
    _commit(db)
    db.refresh(user)

    record_log(
        db, request, sis.sistema_id, admin.usuario, "USER_CREATE",
        detalle=f"Creó cuenta {user.usuario} ({rol.nombre})", usuario_id=admin.usuario_id,
    )
    return serialize_user(user)


@router.put("/usuarios/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int,
    data: schemas.UserUpdateIn,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(require_admin),
):
    """Actualiza datos, rol o contraseña de un usuario del sistema cinemático."""
    user = system_users(db).filter(models.Usuario.usuario_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if user.protegido and (
        (data.usuario is not None and data.usuario.strip().upper() != user.usuario)
        or (data.email is not None and data.email.strip().lower() != user.email)
        or (data.rol_id is not None and data.rol_id != user.rol_id)
        or bool(data.password and data.password.strip())
    ):
        raise HTTPException(
            status_code=403,
            detail="La identidad, rol y contraseña de la cuenta protegida se gestionan desde su propia sesión.",
        )

    if data.usuario is not None and data.usuario.strip():
        u_str = data.usuario.strip().upper()
        if u_str != user.usuario:
            if system_users(db).filter(models.Usuario.usuario == u_str).first():
                raise HTTPException(status_code=400, detail=f"El usuario '{u_str}' ya está en uso.")
            user.usuario = u_str

    if data.email is not None:
        e_str = data.email.strip().lower()
        if e_str != user.email:
            if system_users(db).filter(models.Usuario.email == e_str).first():
                raise HTTPException(status_code=400, detail=f"El correo '{e_str}' ya está en uso.")
            user.email = e_str
            user.version_seguridad += 1

    if data.nombre_completo is not None:
        user.nombre_completo = data.nombre_completo.strip() or None

    if data.rol_id is not None and data.rol_id != user.rol_id:
        rol = system_roles(db).filter(models.Role.rol_id == data.rol_id, models.Role.estado == "A").first()
        if not rol:
            raise HTTPException(status_code=400, detail="Rol inválido.")
        user.rol_id = rol.rol_id

    if data.password and data.password.strip():
        if len(data.password.strip()) < 4:
            raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 4 caracteres.")
        user.contrasena_hash = hash_password(data.password.strip())
        user.version_seguridad += 1

    user.fecha_modificacion = utcnow()
    user.usuario_modificacion = admin.usuario
    _commit(db)
    db.refresh(user)

    record_log(
        db, request, admin.sistema_id, admin.usuario, "USER_UPDATE",
        detalle=f"Editó usuario {user.usuario}", usuario_id=admin.usuario_id,
    )
    return serialize_user(user)


@router.patch("/usuarios/{user_id}/estado", response_model=schemas.UserOut)
def update_user_status(
    user_id: int,
    data: schemas.UserStatusIn,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(require_admin),
):
    """Activa, inactiva o da de baja lógica ('*') a un usuario del sistema."""
    user = system_users(db).filter(models.Usuario.usuario_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if (user.protegido or user.usuario_id == admin.usuario_id) and data.estado in ("I", "*"):
        raise HTTPException(status_code=400, detail="No puedes desactivar o eliminar esta cuenta.")

    if user.estado != data.estado:
        user.version_seguridad += 1
    user.estado = data.estado
    user.fecha_modificacion = utcnow()
    user.usuario_modificacion = admin.usuario
    _commit(db)
    db.refresh(user)

    record_log(
        db, request, admin.sistema_id, admin.usuario, "USER_STATUS",
        detalle=f"Cambió estado de {user.usuario} a {data.estado}", usuario_id=admin.usuario_id,
    )
    return serialize_user(user)


def _query_logs(
    db: Session,
    sistema_id: int,
    usuario: Optional[str],
    accion: Optional[str],
    desde: Optional[str],
    hasta: Optional[str],
):
    q = db.query(models.LogAcceso).filter(models.LogAcceso.sistema_id == sistema_id)
    if usuario and usuario.strip():
        pat = f"%{usuario.strip()}%"
        q = q.filter(models.LogAcceso.usuario.ilike(pat))
    if accion and accion.strip():
        q = q.filter(models.LogAcceso.accion == accion.strip().upper())
    if desde:
        try:
            q = q.filter(models.LogAcceso.fecha_hora >= datetime.fromisoformat(desde))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Formato de fecha 'desde' inválido (YYYY-MM-DD).") from exc
    if hasta:
        try:
            dt_h = datetime.fromisoformat(hasta)
            if len(hasta) <= 10:
                dt_h = dt_h + timedelta(days=1)
            q = q.filter(models.LogAcceso.fecha_hora < dt_h)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Formato de fecha 'hasta' inválido (YYYY-MM-DD).") from exc
    return q


def _serialize_log(row: models.LogAcceso) -> schemas.LogOut:
    return schemas.LogOut(
        log_id=row.log_id,
        usuario_id=row.usuario_id,
        usuario=row.usuario,
        accion=row.accion,
        detalle=row.detalle,
        direccion_ip=row.direccion_ip,
        user_agent=row.user_agent,
        fecha_hora=schemas.dt_iso_utc(row.fecha_hora) or "",
    )


@router.get("/logs", response_model=schemas.LogsResponse)
def list_logs(
    usuario: Optional[str] = None,
    accion: Optional[str] = None,
    desde: Optional[str] = None,
    hasta: Optional[str] = None,
    limit: int = Query(default=150, ge=1, le=1000),
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(require_admin),
):
    """Retorna KPIs de actividad (últimos 7 días / hoy) y logs filtrados."""
    sis = get_sistema(db)
    now = utcnow()
    inicio_hoy = now.replace(hour=0, minute=0, second=0, microsecond=0)
    hace_7d = now - timedelta(days=7)

    base_7d = db.query(models.LogAcceso).filter(
        models.LogAcceso.sistema_id == sis.sistema_id,
        models.LogAcceso.fecha_hora >= hace_7d,
    )
    accesos_hoy = (
        db.query(func.count(models.LogAcceso.log_id))
        .filter(
            models.LogAcceso.sistema_id == sis.sistema_id,
            models.LogAcceso.accion == "LOGIN_OK",
            models.LogAcceso.fecha_hora >= inicio_hoy,
        )
        .scalar()
        or 0
    )
    accesos_7d = base_7d.filter(models.LogAcceso.accion == "LOGIN_OK").count()
    usuarios_unicos_7d = (
        db.query(func.count(func.distinct(models.LogAcceso.usuario)))
        .filter(
            models.LogAcceso.sistema_id == sis.sistema_id,
            models.LogAcceso.accion == "LOGIN_OK",
            models.LogAcceso.fecha_hora >= hace_7d,
        )
        .scalar()
        or 0
    )
    logins_fallidos_7d = base_7d.filter(models.LogAcceso.accion == "LOGIN_FAIL").count()
    analisis_7d = base_7d.filter(models.LogAcceso.accion == "ANALISIS").count()
    descargas_7d = base_7d.filter(models.LogAcceso.accion.like("EXPORT_%")).count()

    rows = (
        _query_logs(db, sis.sistema_id, usuario, accion, desde, hasta)
        .order_by(models.LogAcceso.fecha_hora.desc(), models.LogAcceso.log_id.desc())
        .limit(limit)
        .all()
    )
    return schemas.LogsResponse(
        kpis=schemas.LogsKPIs(
            accesos_hoy=accesos_hoy,
            accesos_7d=accesos_7d,
            usuarios_unicos_7d=usuarios_unicos_7d,
            logins_fallidos_7d=logins_fallidos_7d,
            analisis_7d=analisis_7d,
            descargas_7d=descargas_7d,
        ),
        items=[_serialize_log(r) for r in rows],
    )


@router.get("/logs/csv")
def export_logs_csv(
    usuario: Optional[str] = None,
    accion: Optional[str] = None,
    desde: Optional[str] = None,
    hasta: Optional[str] = None,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(require_admin),
):
    """Exporta los logs filtrados en formato CSV UTF-8-SIG."""
    sis = get_sistema(db)
    rows = (
        _query_logs(db, sis.sistema_id, usuario, accion, desde, hasta)
        .order_by(models.LogAcceso.fecha_hora.desc(), models.LogAcceso.log_id.desc())
        .limit(5000)
        .all()
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["LogID", "FechaHoraUTC", "Usuario", "Accion", "Detalle", "DireccionIP", "UserAgent"])
    for r in rows:
        writer.writerow([
            r.log_id,
            schemas.dt_iso_utc(r.fecha_hora) or "",
            r.usuario,
            r.accion,
            r.detalle or "",
            r.direccion_ip or "",
            r.user_agent or "",
        ])
    return Response(
        content=buf.getvalue().encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="gema_cinematico_logs.csv"'},
    )
