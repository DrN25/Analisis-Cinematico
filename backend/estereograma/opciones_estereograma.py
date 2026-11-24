"""Opciones de dibujo del estereograma: proyección, red, leyenda, qué mostrar, símbolos y colores."""
from dataclasses import asdict, dataclass, field
from typing import Optional, Tuple

# Elementos por defecto: polos en todas las vistas; intersecciones (solo críticas) en cuña y toppling directo.
ELEMENTOS_POR_MECANISMO = {
    "general": {"polos"},
    "planar": {"polos"},
    "cuna": {"polos", "intersecciones"},
    "flexural": {"polos"},
    "directo": {"intersecciones", "polos"},
}

COLORES_DEFECTO = dict(critico="#d62728", no_critico="#8f8f8f", talud="#1f4e9c", friccion="#2ca02c",
                       zona="#e8585a", zona_2="#ffa94d", limite="#7b2d8e", base="#1f77b4", secundaria="#8c564b",
                       oblicuo="#ff7f0e")


@dataclass
class OpcionesEstereograma:
    # --- Proyección, marcas y leyenda ---
    proyeccion: str = "equiarea"           # Projection: "equiarea" (Schmidt) · "equiangulo" (Wulff)
    hemisferio: str = "inferior"           # Hemisphere: "inferior" · "superior"
    etiquetas: str = "grados"              # Labels: "grados" · "cardinales" · "ambos" · "ninguna"
    paso_etiquetas: int = 30
    marcas_exteriores: bool = True         # Exterior Ticks
    circulo_perimetral: bool = True        # Perimeter Circle
    cruz_central: bool = True              # Center Cross
    ejes_cruzados: bool = False            # Cross Hairs
    espaciado_marcas: float = 10.0         # Tick Spacing
    ancho_borde: float = 3.0               # Outer Grid Width
    ancho_interno: float = 1.0             # Inner Grid Width
    ancho_superposicion: float = 1.0       # Overlay Width
    escala_leyenda: float = 110.0          # Legend Scale (%) - fijo 110%
    ubicacion_leyenda: str = "derecha"     # Legend Location: "derecha" · "izquierda" · "abajo" · "ninguna"
    etiqueta_filtro: bool = True           # Filter Label
    # --- Red (Stereonet Overlay) ---
    red: str = "ecuatorial"                # "ecuatorial" · "polar" · "ninguna"
    intervalo_red: float = 10.0
    color_red: str = "#d4d4d4"
    # --- Qué mostrar ---
    mostrar: Optional[Tuple[str, ...]] = None     # None = según el mecanismo; o ("polos", "planos", "intersecciones")
    filtro_planos: str = "criticos"        # planos dibujados: "todos" · "criticos"
    filtro_intersecciones: str = "criticos"   # intersecciones dibujadas: "criticos" · "todos"
    etiquetas_polos: str = "ninguno"       # ID junto a cada polo: "todos" (interruptor encendido) · "ninguno"
    etiquetas_intersecciones: str = "ninguno"
    # --- Símbolos y contornos ---
    simbolo_por_tipo: bool = True
    tamano_por_persistencia: bool = True
    tamano_simbolo: float = 30.0         # base de las intersecciones (se reduce sola con miles de puntos)
    tamano_polo: float = 12.0            # base de los polos (puntos²), fijo en 12
    contornos_general: bool = True
    contornos_en_mecanismos: bool = True   # contornos de polos bajo cada mecanismo
    mapa_color: str = "YlOrRd"               # (sin uso en las figuras; se conserva por compatibilidad)
    mapa_color_mecanismos: str = "Blues"     # paleta de los contornos de densidad en TODAS las vistas
    # --- Figura ---
    titulo: bool = True
    caja_info: bool = True
    mostrar_proyeccion: bool = True
    tamano_figura: float = 6.8
    tamano_fuente: float = 9.0
    resolucion: int = 201                  # puntos por lado de la malla de zonas y contornos
    dpi_pantalla: int = 110
    dpi_exportar: int = 300
    colores: dict = field(default_factory=lambda: dict(COLORES_DEFECTO))

    def elementos(self, clave):
        return set(self.mostrar) if self.mostrar else set(ELEMENTOS_POR_MECANISMO[clave])

    def solo_criticos(self, nombre):
        return str(getattr(self, nombre)).lower().startswith("crit")

    def clave_cache(self):
        return repr(sorted(asdict(self).items()))
