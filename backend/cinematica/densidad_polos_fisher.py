"""Densidad de polos como Dips: círculo de conteo del 1 % y distribución de Fisher (sin ponderación).

Diederichs (1990), sec. 5.3.5–5.3.8 y figs. 5.9–5.11.
"""
from functools import lru_cache

import numpy as np

from cinematica.geometria_esferica import vector_polo

AREA_CONTEO = 0.01


def semiangulo_conteo(area=AREA_CONTEO):
    """Semiángulo ρ del cono cuyo casquete ocupa 'area' del hemisferio: 1 − cos ρ = area."""
    return np.degrees(np.arccos(1.0 - area))


def tabla_influencia_fisher(rho_deg, n_xi=241, n_t=160, n_f=360):
    """Influencia de un polo a distancia ξ: Fisher con K tal que en ρ vale el 5 % del máximo, integrada en el círculo."""
    rho = np.radians(rho_deg)
    kappa = np.log(20.0) / (1.0 - np.cos(rho))
    t = (np.arange(n_t) + 0.5) / n_t * rho
    f = (np.arange(n_f) + 0.5) / n_f * 2 * np.pi
    T, F = np.meshgrid(t, f, indexing="ij")
    w = np.exp(kappa * (np.cos(T) - 1.0)) * np.sin(T)
    X, Z = np.sin(T) * np.cos(F), np.cos(T)
    xi = np.linspace(0, 2 * rho, n_xi)
    infl = np.array([w[(X * np.sin(x) + Z * np.cos(x)) >= np.cos(rho)].sum() for x in xi]) / w.sum()
    return np.degrees(xi), infl, kappa


@lru_cache(maxsize=8)
def _tabla(area):
    rho = semiangulo_conteo(area)
    xi, infl, kappa = tabla_influencia_fisher(rho)
    return rho, xi, infl, kappa


def densidad_en_puntos(polos, puntos, pesos=None, metodo="Fisher", area=AREA_CONTEO, bloque=20000):
    """Densidad (% de polos por 1 % de área) en 'puntos' (Nx3) para 'polos' (Mx3).

    |g·p| hace que un polo junto al borde cuente también en el lado opuesto (Diederichs 1990, fig. 5.9).
    """
    pesos = np.ones(len(polos)) if pesos is None else np.asarray(pesos, float)
    rho, xi_tab, infl_tab, _ = _tabla(float(area))
    salida = np.empty(len(puntos))
    for i in range(0, len(puntos), bloque):
        xi = np.degrees(np.arccos(np.clip(np.abs(puntos[i:i + bloque] @ polos.T), 0, 1)))
        infl = (xi <= rho).astype(float) if metodo.lower() == "schmidt" else np.interp(xi, xi_tab, infl_tab, right=0.0)
        salida[i:i + bloque] = 100.0 * (infl * pesos).sum(axis=1) / pesos.sum()
    return salida
