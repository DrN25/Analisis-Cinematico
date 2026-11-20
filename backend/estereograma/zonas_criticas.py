"""Zonas críticas y curvas límite.

sombrear_zona recibe la función de zona del criterio (cinematica/criterio_*_dips.py) y la evalúa en la malla:
el área sombreada es el propio criterio aplicado en cada punto, de modo que dibujo y cálculo coinciden.
Este módulo no importa ningún criterio: los recibe como argumento.
"""
import numpy as np
from matplotlib.lines import Line2D

from estereograma.proyeccion_estereografica import malla_proyeccion
from estereograma.red_estereografica import trazar_lineas


ALPHA_ZONA = 0.62   # zonas críticas bien visibles; los contornos de polos van debajo y en otra paleta


def sombrear_zona(ax, op, funcion_zona, color, alpha=ALPHA_ZONA):
    """funcion_zona(trend, plunge) → bool, evaluada en cada punto de la malla."""
    gx, gy, dentro, gt, gp = malla_proyeccion(op.proyeccion, op.hemisferio, int(op.resolucion))
    m = np.where(dentro & funcion_zona(gt, gp), 1.0, 0.0)
    if m.any():
        ax.contourf(gx, gy, m, levels=[0.5, 1.5], colors=[color], alpha=alpha, zorder=1.2)
        ax.contour(gx, gy, m, levels=[0.5], colors=["#7a1f1f"], linewidths=1.1, zorder=1.3)


def estilos_curvas(op):
    c = op.colores
    return {
        "talud": dict(color=c["talud"], lw=1.8, ls="-", zorder=5),
        "friccion": dict(color=c["friccion"], lw=1.4, ls="-", zorder=4),
        "daylight": dict(color="k", lw=1.0, ls="--", zorder=4),
        "lateral": dict(color="k", lw=0.9, ls=":", zorder=4),
        "limite": dict(color=c["limite"], lw=1.3, ls="--", zorder=4),
        "plano_phi": dict(color=c["friccion"], lw=1.0, ls="--", zorder=4),
        "vertical_psi": dict(color="k", lw=0.9, ls="--", zorder=4),
    }


def trazar_curvas(ax, op, curvas):
    """Dibuja las curvas límite del criterio y devuelve sus entradas de leyenda."""
    estilos, leyenda = estilos_curvas(op), []
    for curva in curvas:
        e = estilos[curva["estilo"]]
        trazar_lineas(ax, op, curva["lineas"], **e)
        if curva.get("etiqueta"):
            leyenda.append(Line2D([], [], color=e["color"], lw=e["lw"], ls=e["ls"], label=curva["etiqueta"]))
    return leyenda
