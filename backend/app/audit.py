"""Registro de auditoría de accesos y acciones en auth.LogsAcceso."""
import logging
from fastapi import Request
from sqlalchemy.orm import Session

from app import models

logger = logging.getLogger(__name__)


def client_ip(request: Request) -> str:
    """Obtiene la IP real considerando Cloudflare Tunnel (CF-Connecting-IP) y proxies."""
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()[:64]
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()[:64]
    return (request.client.host if request.client else "unknown")[:64]


def record_log(
    db: Session,
    request: Request,
    sistema_id: int,
    usuario: str,
    accion: str,
    detalle: str | None = None,
    usuario_id: int | None = None,
) -> None:
    """Inserta un evento en auth.LogsAcceso sin interrumpir la petición si falla."""
    try:
        ua = (request.headers.get("user-agent") or "")[:255] or None
        entry = models.LogAcceso(
            sistema_id=sistema_id,
            usuario_id=usuario_id,
            usuario=(usuario or "ANON")[:50],
            accion=accion[:50],
            detalle=detalle[:500] if detalle else None,
            direccion_ip=client_ip(request),
            user_agent=ua,
        )
        db.add(entry)
        db.commit()
    except Exception as exc:
        logger.warning("No se pudo registrar log de auditoría (%s): %s", accion, exc)
        db.rollback()
