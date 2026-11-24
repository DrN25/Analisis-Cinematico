"""Esquemas Pydantic para autenticación, auditoría y análisis cinemático."""
from datetime import datetime
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, Field


# ============================================================================
# AUTH & USUARIOS
# ============================================================================

class LoginIn(BaseModel):
    username_or_email: str
    password: str
    client: Optional[Literal["web", "mobile"]] = "web"


class RefreshIn(BaseModel):
    refresh_token: str = Field(min_length=10)


class LogoutIn(BaseModel):
    revoke_sessions: bool = False


class UserOut(BaseModel):
    usuario_id: int
    usuario: str
    email: str
    nombre_completo: Optional[str] = None
    rol_id: int
    rol_nombre: str
    protegido: bool = False
    estado: str
    ultimo_acceso: Optional[str] = None
    fecha_registro: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None
    expires_in_seconds: int = 43200
    refresh_expires_in_seconds: int = 2592000
    user: UserOut


class RoleOut(BaseModel):
    rol_id: int
    nombre: str
    descripcion: Optional[str] = None
    estado: str


class UserCreateIn(BaseModel):
    usuario: str = Field(min_length=2, max_length=50)
    email: str = Field(min_length=3, max_length=200)
    nombre_completo: Optional[str] = Field(default=None, max_length=150)
    rol_id: int
    password: str = Field(min_length=4, max_length=128)


class UserUpdateIn(BaseModel):
    usuario: Optional[str] = Field(default=None, min_length=2, max_length=50)
    email: Optional[str] = Field(default=None, min_length=3, max_length=200)
    nombre_completo: Optional[str] = Field(default=None, max_length=150)
    rol_id: Optional[int] = None
    password: Optional[str] = Field(default=None, max_length=128)


class UserStatusIn(BaseModel):
    estado: Literal["A", "I", "*"]


class ChangePasswordIn(BaseModel):
    old_password: str
    new_password: str = Field(min_length=4, max_length=128)


# ============================================================================
# AUDITORÍA / LOGS
# ============================================================================

class LogOut(BaseModel):
    log_id: int
    usuario_id: Optional[int] = None
    usuario: str
    accion: str
    detalle: Optional[str] = None
    direccion_ip: Optional[str] = None
    user_agent: Optional[str] = None
    fecha_hora: str


class LogsKPIs(BaseModel):
    accesos_hoy: int
    accesos_7d: int
    usuarios_unicos_7d: int
    logins_fallidos_7d: int
    analisis_7d: int
    descargas_7d: int


class LogsResponse(BaseModel):
    kpis: LogsKPIs
    items: List[LogOut]


# ============================================================================
# ANÁLISIS CINEMÁTICO
# ============================================================================

class DiscontinuidadRow(BaseModel):
    ID: Optional[str] = None
    Buz: Any
    DirBuz: Any
    Tipo: Optional[str] = "Sin tipo"
    Persistencia: Optional[Any] = None


class TaludIn(BaseModel):
    nombre: str = "Talud 1"
    buz: float = Field(default=70.0, ge=1.0, le=90.0)
    dirbuz: float = Field(default=180.0, ge=0.0, le=360.0)


class ParametrosIn(BaseModel):
    phi: float = Field(default=30.0, ge=0.0, le=89.0)
    ll_planar: float = Field(default=20.0, ge=0.0, le=90.0)
    ll_flexural: float = Field(default=20.0, ge=0.0, le=90.0)
    ll_directo: float = Field(default=20.0, ge=0.0, le=90.0)
    ponderacion: Literal["ninguna", "terzaghi"] = "ninguna"
    azimut_muestreo: float = Field(default=0.0, ge=0.0, le=360.0)
    inclinacion_muestreo: float = Field(default=0.0, ge=0.0, le=90.0)


class FiltroIn(BaseModel):
    tipos: Optional[List[str]] = None
    persistencia_min: float = Field(default=0.0, ge=0.0)


class OpcionesPlotIn(BaseModel):
    proyeccion: Literal["equiarea", "equiangulo"] = "equiarea"
    hemisferio: Literal["inferior", "superior"] = "inferior"
    etiquetas: Literal["grados", "cardinales", "ambos", "ninguna"] = "grados"
    paso_etiquetas: int = 30
    marcas_exteriores: bool = True
    circulo_perimetral: bool = True
    cruz_central: bool = True
    ejes_cruzados: bool = False
    espaciado_marcas: float = Field(default=10.0, ge=1.0, le=45.0)
    ancho_borde: float = Field(default=3.0, ge=0.0, le=10.0)
    ancho_interno: float = Field(default=1.0, ge=0.0, le=10.0)
    ancho_superposicion: float = Field(default=1.0, ge=0.0, le=10.0)
    escala_leyenda: float = Field(default=110.0, ge=50.0, le=150.0)
    ubicacion_leyenda: Literal["derecha", "izquierda", "abajo", "ninguna"] = "derecha"
    etiqueta_filtro: bool = True
    red: Literal["ecuatorial", "polar", "ninguna"] = "ecuatorial"
    intervalo_red: float = Field(default=10.0, ge=2.0, le=30.0)
    color_red: str = "#d4d4d4"
    mostrar: Optional[List[Literal["polos", "planos", "intersecciones"]]] = None
    filtro_planos: Literal["criticos", "todos"] = "criticos"
    filtro_intersecciones: Literal["criticos", "todos"] = "criticos"
    etiquetas_polos: Literal["criticos", "todos", "ninguno"] = "criticos"
    etiquetas_intersecciones: Literal["criticos", "todos", "ninguno"] = "ninguno"
    simbolo_por_tipo: bool = True
    tamano_por_persistencia: bool = True
    tamano_simbolo: float = 30.0
    tamano_polo: float = 12.0
    contornos_general: bool = True
    contornos_en_mecanismos: bool = True
    mapa_color: str = "YlOrRd"
    mapa_color_mecanismos: Literal["Blues", "Greens", "Purples", "Greys"] = "Blues"
    titulo: bool = True
    caja_info: bool = True
    # OCULTO POR REQUERIMIENTO: no mostrar texto "Estereograma equiareal..." debajo del gráfico.
    mostrar_proyeccion: bool = False
    tamano_figura: float = 6.8
    tamano_fuente: float = 9.0
    resolucion: int = 201
    dpi_pantalla: int = 110
    dpi_exportar: int = 300


VistaKey = Literal["general", "planar", "cuna", "flexural", "directo", "roseta"]


class EjecutarAnalisisIn(BaseModel):
    filas: List[DiscontinuidadRow]
    talud: TaludIn = Field(default_factory=TaludIn)
    parametros: ParametrosIn = Field(default_factory=ParametrosIn)
    filtro: FiltroIn = Field(default_factory=FiltroIn)
    umbral: float = Field(default=10.0, ge=0.0, le=100.0)
    vista: VistaKey = "general"
    opciones: OpcionesPlotIn = Field(default_factory=OpcionesPlotIn)


class FiguraIn(BaseModel):
    analysis_id: str
    vista: VistaKey = "general"
    opciones: OpcionesPlotIn = Field(default_factory=OpcionesPlotIn)
    dpi: Optional[int] = Field(default=None, ge=50, le=600)


class ExportarIn(BaseModel):
    analysis_id: str
    vista: VistaKey = "general"
    umbral: float = Field(default=10.0, ge=0.0, le=100.0)
    opciones: OpcionesPlotIn = Field(default_factory=OpcionesPlotIn)


def dt_iso_utc(dt: datetime | None) -> str | None:
    """Serializa un datetime naive/UTC en formato ISO-8601 con sufijo Z."""
    if dt is None:
        return None
    return dt.isoformat() + ("Z" if dt.tzinfo is None else "")
