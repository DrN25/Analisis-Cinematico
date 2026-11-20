"""Proyección al círculo de radio 1 (equiárea o equiángulo; hemisferio inferior o superior).

Equiárea (Schmidt):  r = √2·cos(45° + p/2)   Diederichs (1990) 3.2.2, ec. 3.2
Equiángulo (Wulff):  r = tan(45° − p/2)      Diederichs (1990) 3.2.1, fig. 3.4 (según Priest 1985)
Posición: x (Este) = r·sin(trend), y (Norte) = r·cos(trend)
Hemisferio superior: cada línea se dibuja por su extremo superior, el antípoda (trend + 180°).
"""
from functools import lru_cache

import numpy as np


def _es_wulff(proyeccion):
    return str(proyeccion).lower().startswith(("equiang", "equiáng", "wulff"))


def _giro(hemisferio):
    return 180.0 if str(hemisferio).lower().startswith(("sup", "upp")) else 0.0


def proyectar(trend, plunge, proyeccion="equiarea", hemisferio="inferior"):
    t = np.radians(np.asarray(trend, float) + _giro(hemisferio))
    p = np.radians(np.asarray(plunge, float))
    r = np.tan(np.pi / 4 - p / 2) if _es_wulff(proyeccion) else np.sqrt(2.0) * np.sin((np.pi / 2 - p) / 2)
    return r * np.sin(t), r * np.cos(t)


def inv_proyectar(x, y, proyeccion="equiarea", hemisferio="inferior"):
    r = np.clip(np.hypot(x, y), 0, 1)
    if _es_wulff(proyeccion):
        plunge = 90.0 - 2.0 * np.degrees(np.arctan(r))
    else:
        plunge = 90.0 - np.degrees(2.0 * np.arcsin(r / np.sqrt(2.0)))
    return (np.degrees(np.arctan2(x, y)) - _giro(hemisferio)) % 360.0, plunge


@lru_cache(maxsize=8)
def malla_proyeccion(proyeccion, hemisferio, n):
    """Malla del círculo; cada punto como línea (trend, plunge). Sirve para sombrear zonas y para contornos."""
    gx, gy = np.meshgrid(np.linspace(-1, 1, n), np.linspace(-1, 1, n))
    dentro = np.hypot(gx, gy) <= 1.0
    gt, gp = inv_proyectar(gx, gy, proyeccion, hemisferio)
    return gx, gy, dentro, gt, gp
