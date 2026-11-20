"""Opciones de dibujo, equivalentes a "Stereonet Options" de Dips, más qué mostrar, símbolos y colores."""
from dataclasses import asdict, dataclass, field
from typing import Optional, Tuple

# Elementos por defecto, como Dips: polos en todas las vistas; intersecciones (solo críticas) en cuña y toppling directo.
ELEMENTOS_POR_MECANISMO = {
    "general": {"polos"},
    "planar": {"polos"},
    "cuna": {"polos", "intersecciones"},
    "flexural": {"polos"},
    "directo": {"intersecciones", "polos"},
}

COLORES_DEFECTO = dict(critico="#d62728", no_critico="#a3a3a3", talud="#1f4e9c", friccion="#2ca02c",
                       zona="#f4a6a6", zona_2="#ffd8a8", limite="#7b2d8e", base="#1f77b4", secundaria="#8c564b",
                       oblicuo="#ff7f0e")


@dataclass
class OpcionesEstereograma:
    # --- Stereonet Options (Dips) ---
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
    escala_leyenda: float = 100.0          # Legend Scale (%)
    ubicacion_leyenda: str = "derecha"     # Legend Location: "derecha" · "izquierda" · "abajo" · "ninguna"
    etiqueta_filtro: bool = True           # Filter Label
    # --- Red (Stereonet Overlay) ---
    red: str = "ecuatorial"                # "ecuatorial" · "polar" · "ninguna"
    intervalo_red: float = 10.0
    color_red: str = "#d4d4d4"
    # --- Qué mostrar ---
    mostrar: Optional[Tuple[str, ...]] = None     # None = según el mecanismo; o ("polos", "planos", "intersecciones")
    filtro_planos: str = "criticos"        # planos dibujados: "todos" · "criticos"
    filtro_intersecciones: str = "criticos"   # intersecciones dibujadas: "criticos" (como Dips) · "todos"
    etiquetas_polos: str = "criticos"      # ID junto a cada polo: "todos" · "criticos" · "ninguno"
    etiquetas_intersecciones: str = "ninguno"
    # --- Símbolos y contornos ---
    simbolo_por_tipo: bool = True
    tamano_por_persistencia: bool = True
    tamano_simbolo: float = 30.0
    contornos_general: bool = True
    contornos_en_mecanismos: bool = True   # contornos tenues de polos bajo cada mecanismo, como Dips
    mapa_color: str = "YlOrRd"
    # --- Figura ---
    titulo: bool = True
    caja_info: bool = True
    mostrar_proyeccion: bool = True
    tamano_figura: float = 6.0
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
