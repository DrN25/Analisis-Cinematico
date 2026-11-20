"""Modelos ORM alineados al esquema [auth] en db_ad0a4f_gema (SQL Server)."""
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base


def utcnow() -> datetime:
    """Devuelve datetime UTC naive compatible con SQL Server DATETIME2/DATETIME y SQLite."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Sistema(Base):
    __tablename__ = "Sistemas"
    __table_args__ = {"schema": "auth"}

    sistema_id = Column("SistemaID", Integer, primary_key=True, autoincrement=True)
    codigo = Column("Codigo", String(50), nullable=False, unique=True)
    nombre = Column("Nombre", String(100), nullable=False)
    estado = Column("Estado", String(1), nullable=False, default="A")


class Role(Base):
    __tablename__ = "Roles"
    __table_args__ = (
        UniqueConstraint("SistemaID", "Nombre", name="UQ_AuthRoles_SistemaNombre"),
        UniqueConstraint("SistemaID", "RolID", name="UQ_AuthRoles_SistemaRol"),
        {"schema": "auth"},
    )

    rol_id = Column("RolID", Integer, primary_key=True, autoincrement=True)
    sistema_id = Column("SistemaID", Integer, ForeignKey("auth.Sistemas.SistemaID"), nullable=False)
    protegido = Column("EsProtegido", Boolean, nullable=False, default=False)
    nombre = Column("Nombre", String(50), nullable=False)
    descripcion = Column("Descripcion", String(200), nullable=True)
    estado = Column("Estado", String(1), nullable=False, default="A")

    usuarios = relationship("Usuario", back_populates="rol")


class Usuario(Base):
    __tablename__ = "Usuarios"
    __table_args__ = (
        UniqueConstraint("SistemaID", "Usuario", name="UQ_AuthUsuarios_SistemaUsuario"),
        UniqueConstraint("SistemaID", "Email", name="UQ_AuthUsuarios_SistemaEmail"),
        ForeignKeyConstraint(["SistemaID", "RolID"], ["auth.Roles.SistemaID", "auth.Roles.RolID"]),
        {"schema": "auth"},
    )

    usuario_id = Column("UsuarioID", Integer, primary_key=True, autoincrement=True)
    sistema_id = Column("SistemaID", Integer, nullable=False)
    protegido = Column("EsProtegido", Boolean, nullable=False, default=False)
    version_seguridad = Column("VersionSeguridad", Integer, nullable=False, default=0)
    usuario = Column("Usuario", String(50), nullable=False)
    email = Column("Email", String(200), nullable=False)
    contrasena_hash = Column("ContrasenaHash", String(255), nullable=False)
    nombre_completo = Column("NombreCompleto", String(150), nullable=True)
    rol_id = Column("RolID", Integer, nullable=False)
    geotecnico_id = Column("GeotecnicoID", Integer, nullable=True)
    estado = Column("Estado", String(1), nullable=False, default="A")
    ultimo_acceso = Column("UltimoAcceso", DateTime, nullable=True)
    fecha_registro = Column("FechaRegistro", DateTime, nullable=False, default=utcnow)
    usuario_registro = Column("UsuarioRegistro", String(100), nullable=True)
    fecha_modificacion = Column("FechaModificacion", DateTime, nullable=True)
    usuario_modificacion = Column("UsuarioModificacion", String(100), nullable=True)

    rol = relationship("Role", back_populates="usuarios")


class LogAcceso(Base):
    __tablename__ = "LogsAcceso"
    __table_args__ = {"schema": "auth"}

    log_id = Column("LogID", Integer, primary_key=True, autoincrement=True)
    sistema_id = Column("SistemaID", Integer, ForeignKey("auth.Sistemas.SistemaID"), nullable=False)
    usuario_id = Column("UsuarioID", Integer, ForeignKey("auth.Usuarios.UsuarioID"), nullable=True)
    usuario = Column("Usuario", String(50), nullable=False)
    accion = Column("Accion", String(50), nullable=False)
    detalle = Column("Detalle", String(500), nullable=True)
    direccion_ip = Column("DireccionIP", String(64), nullable=True)
    user_agent = Column("UserAgent", String(255), nullable=True)
    fecha_hora = Column("FechaHora", DateTime, nullable=False, default=utcnow)
