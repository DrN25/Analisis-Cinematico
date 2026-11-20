"""Toppling directo — criterio de Dips v9 (INTERSECCIONES = aristas de los bloques; POLOS = planos base).

Se trabaja del lado opuesto a la cara, en la dirección αs + 180°.  Ayuda de Dips v9 "Direct Toppling":
  Zona 1: dentro de ±LL y 90° − ψs < ψi ≤ 90° − φ
  Zona 2: dentro de ±LL y ψi > 90° − φ                       (mayor riesgo)
  Zona 3: fuera de ±LL, hacia el interior y ψi > 90° − φ     (toppling oblicuo)
  En la exportación de Dips las tres zonas aparecen como C1.
Planos base, con las etiquetas de la exportación de Dips:
  "Base":          buza hacia la cara dentro de ±LL con φ ≤ ψj ≤ ψs
  "Sliding+Base":  buza hacia la cara (±90°) con ψj ≤ φ, fuera del grupo anterior
Comprobado contra una exportación de Dips v9 (1 144 planos, 653 721 intersecciones): planos base 207 de 207,
aristas: las 74 893 de Dips están incluidas (bordes ±LL y 90° inclusivos).
La prueba de esbeltez del bloque (Wyllie 2018, ec. 10.1–10.2) no es estereográfica y no se incluye.
"""
import numpy as np

from cinematica.geometria_esferica import (TOL, envolver, lineas_circulo_maximo, lineas_cono_vertical, lineas_radial,
                                           plano_de_polo, polo_de_plano)
from cinematica.lectura_discontinuidades import base


def zonas_aristas_directo(trend, plunge, talud, param):
    dif = np.abs(envolver(np.asarray(trend, float) - (talud.dirbuz + 180.0)))
    lado, dentro_ll = dif <= 90.0 + TOL, dif <= param.ll_directo + TOL
    cono = plunge > 90.0 - param.phi + TOL
    return {
        "Zona_1": dentro_ll & (plunge > 90.0 - talud.buz + TOL) & ~cono,
        "Zona_2": dentro_ll & cono,
        "Zona_3": lado & ~dentro_ll & cono,
    }


def zona_aristas_directo(trend, plunge, talud, param):
    """Aristas críticas para toppling directo (zonas 1 y 2)."""
    z = zonas_aristas_directo(trend, plunge, talud, param)
    return z["Zona_1"] | z["Zona_2"]


def grupos_plano_base(trend_polo, plunge_polo, talud, param):
    buz, dirbuz = plano_de_polo(trend_polo, plunge_polo)
    dif = np.abs(envolver(dirbuz - talud.dirbuz))
    grupo_base = (dif <= param.ll_directo + TOL) & (buz >= param.phi - TOL) & (buz <= talud.buz + TOL)
    grupo_sliding = (dif < 90.0) & (buz <= param.phi + TOL) & ~grupo_base
    return grupo_base, grupo_sliding


def zona_plano_base(trend_polo, plunge_polo, talud, param):
    g1, g2 = grupos_plano_base(trend_polo, plunge_polo, talud, param)
    return g1 | g2


def evaluar_toppling_directo(datos, intersecciones, talud, param):
    """Devuelve (aristas, planos_base)."""
    ri = intersecciones.copy()
    t, p = ri["Trend"].to_numpy(float), ri["Plunge"].to_numpy(float)
    z = zonas_aristas_directo(t, p, talud, param)
    for k, v in z.items():
        ri[k] = v
    ri["Directo"] = z["Zona_1"] | z["Zona_2"]
    ri["Oblicuo"] = z["Zona_3"]
    ri["C1_Dips"] = ri["Directo"] | ri["Oblicuo"]
    ri["Clasificacion"] = np.select([z["Zona_2"], z["Zona_1"], z["Zona_3"]],
                                    ["Directo (zona 2)", "Directo (zona 1)", "Oblicuo (zona 3)"], "No crítica")
    tp, pp = polo_de_plano(datos["Buz"].to_numpy(float), datos["DirBuz"].to_numpy(float))
    g_base, g_sliding = grupos_plano_base(tp, pp, talud, param)
    difp = np.abs(envolver(datos["DirBuz"].to_numpy(float) - talud.dirbuz))
    rb = base(datos)
    rb["Critico"] = g_base | g_sliding
    rb["Etiqueta_Dips"] = np.where(g_base, "Base", np.where(g_sliding, "Sliding+Base", ""))
    rb["Zona"] = np.where(g_base, "1", np.where(g_sliding, np.where(difp <= param.ll_directo, "2", "3"), ""))
    rb["Vuelca_y_Desliza"] = g_base
    return ri, rb


def curvas_limite_directo(talud, param):
    curvas = [
        {"lineas": lineas_circulo_maximo(talud.buz, talud.dirbuz), "estilo": "talud", "etiqueta": "Plano del talud"},
        {"lineas": lineas_cono_vertical(90 - param.phi), "estilo": "friccion", "etiqueta": "Cono de fricción"},
        {"lineas": lineas_cono_vertical(90 - talud.buz), "estilo": "vertical_psi", "etiqueta": "Círculo 90° − ψs"},
    ]
    for s in (-1, 1):
        curvas.append({"lineas": lineas_radial(talud.dirbuz + 180 + s * param.ll_directo), "estilo": "lateral",
                       "etiqueta": "Límites laterales" if s < 0 else None})
    return curvas
