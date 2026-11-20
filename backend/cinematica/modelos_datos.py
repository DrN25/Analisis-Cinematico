"""Estructuras de datos que se pasan entre módulos: talud, parámetros y resultado del análisis."""
from dataclasses import dataclass, field
from typing import Optional, Tuple

import pandas as pd


@dataclass
class GeometriaTalud:
    """Orientación de la cara del talud (ψs / αs)."""
    buz: float = 70.0          # ψs buzamiento de la cara (°)
    dirbuz: float = 180.0      # αs dirección de buzamiento de la cara (°)
    nombre: str = "Talud 1"


@dataclass
class ParametrosDips:
    """Parámetros del análisis cinemático, con los valores por defecto de Dips v9."""
    phi: float = 30.0                    # ángulo de fricción de las discontinuidades (°)
    ll_planar: float = 20.0              # límite lateral rotura planar (±°)
    ll_flexural: float = 20.0            # límite lateral toppling flexural (±°)
    ll_directo: float = 20.0             # límite lateral toppling directo (±°)
    ang_min_interseccion: float = 0.0    # 0 = como Dips (solo se omiten planos idénticos)
    metodo_densidad: str = "Fisher"      # "Fisher" (Dips) o "Schmidt"
    area_conteo: float = 0.01            # círculo de conteo = 1 % del hemisferio
    ponderacion: str = "ninguna"         # "ninguna" o "terzaghi"
    linea_muestreo: Optional[Tuple[float, float]] = None   # (azimut, inclinación) para Terzaghi
    ang_min_terzaghi: float = 15.0
    bordes_talud: str = "excluir"        # regla fija de la interfaz: un plano igual al talud y sus intersecciones
                                         # no son críticos (volumen cero). "dips" solo se usa en la validación interna.


@dataclass
class ResultadoAnalisis:
    """Resultado completo: datos de entrada y una tabla por mecanismo."""
    talud: GeometriaTalud
    parametros: ParametrosDips
    datos: pd.DataFrame
    intersecciones: pd.DataFrame
    planar: pd.DataFrame
    cuna: pd.DataFrame
    flexural: pd.DataFrame
    directo_aristas: pd.DataFrame
    directo_base: pd.DataFrame
    filtro: str = "Sin filtro"
    tipos: list = field(default_factory=list)


def porcentaje(n, total):
    return 100.0 * float(n) / float(total) if total else 0.0
