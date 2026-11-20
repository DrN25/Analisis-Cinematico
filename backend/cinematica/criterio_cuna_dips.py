"""Rotura en cuña — criterio de Dips v9 (se evalúa sobre las INTERSECCIONES αi/ψi).

Zona primaria:   φ ≤ ψi ≤ ψapp(αi)  y  |αi − αs| < 90°
    Markland (1972); Hudson & Harrison (2000) 18.1.2, fig. 18.4; Wyllie (2018) 8.2; ayuda de Dips v9 "Wedge Sliding"
    Sin límites laterales: la intersección ya fija la dirección (Dips v9; Hudson & Harrison 2000).
Zona secundaria: ψi < φ, entre el círculo máximo del talud y el de un plano de buzamiento φ con la dirección del talud;
    crítica si el vector de buzamiento de alguno de los dos planos cae en la zona primaria.   Ayuda de Dips v9.

Modo de deslizamiento, como lo etiqueta Dips en su exportación:
    P2 = cuña que desliza sobre los DOS planos: zona primaria y ningún plano buza entre αi y αs
    P1 = desliza sobre UN plano: zona primaria con un plano que buza entre αi y αs (Hocking 1976), o zona secundaria
Comprobado contra una exportación de Dips v9 (1 144 planos, 653 721 intersecciones): P2 104 640 de 104 640,
P1 69 115 de 69 118; las demás diferencias son intersecciones exactamente sobre el borde de la zona.
"""
import numpy as np
import pandas as pd

from cinematica.geometria_esferica import TOL, buz_aparente, envolver, lineas_circulo_maximo, lineas_cono_vertical


def _hacia_cara(trend, talud):
    return np.abs(envolver(np.asarray(trend, float) - talud.dirbuz)) <= 90.0 + TOL


def zona_primaria_cuna(trend, plunge, talud, param):
    aflora = plunge <= buz_aparente(talud.buz, talud.dirbuz, trend) + TOL
    return _hacia_cara(trend, talud) & aflora & (plunge >= param.phi - TOL)


def zona_secundaria_cuna(trend, plunge, talud, param):
    """Área de la zona secundaria (sin la condición sobre los vectores de buzamiento)."""
    aflora = plunge <= buz_aparente(talud.buz, talud.dirbuz, trend) + TOL
    sobre_plano_phi = plunge >= buz_aparente(param.phi, talud.dirbuz, trend) - TOL
    return _hacia_cara(trend, talud) & aflora & (plunge < param.phi - TOL) & sobre_plano_phi


def vector_en_primaria(buz, dirbuz, talud, param):
    """El vector de buzamiento del plano (dirbuz, buz) cae en la zona primaria."""
    aflora = buz <= buz_aparente(talud.buz, talud.dirbuz, dirbuz) + TOL
    return _hacia_cara(dirbuz, talud) & aflora & (buz > param.phi + TOL)


def _entre(a, t, s):
    """El azimut a está en el arco corto que va de t a s."""
    da, ds = envolver(np.asarray(a) - np.asarray(t)), envolver(np.asarray(s) - np.asarray(t))
    return (da * ds > 0) & (np.abs(da) < np.abs(ds))


def evaluar_cuna(intersecciones, talud, param):
    r = intersecciones.copy()
    t, p = r["Trend"].to_numpy(float), r["Plunge"].to_numpy(float)
    b1, d1 = r["Buz_1"].to_numpy(float), r["DirBuz_1"].to_numpy(float)
    b2, d2 = r["Buz_2"].to_numpy(float), r["DirBuz_2"].to_numpy(float)
    r["Buz_Aparente_Talud"] = np.round(buz_aparente(talud.buz, talud.dirbuz, t), 1).astype(np.float32)
    primaria = zona_primaria_cuna(t, p, talud, param)
    v1, v2 = vector_en_primaria(b1, d1, talud, param), vector_en_primaria(b2, d2, talud, param)
    secundaria = zona_secundaria_cuna(t, p, talud, param) & (v1 | v2)
    e1, e2 = _entre(d1, t, talud.dirbuz), _entre(d2, t, talud.dirbuz)
    un_plano = primaria & (e1 | e2)
    r["Zona_Primaria"], r["Zona_Secundaria"] = primaria, secundaria
    r["Critico"] = primaria | secundaria
    r["Modo"] = pd.Categorical(
        np.where(primaria & ~un_plano, "P2", np.where(un_plano | secundaria, "P1", "")),
        categories=["P1", "P2", ""],
    )
    clasif_cats = [
        "P2 · cuña, desliza en dos planos",
        "P1 · desliza en un plano (zona primaria)",
        "P1 · desliza en un plano (zona secundaria)",
        "No crítica",
    ]
    r["Clasificacion"] = pd.Categorical(
        np.select([primaria & ~un_plano, un_plano, secundaria],
                  ["P2 · cuña, desliza en dos planos", "P1 · desliza en un plano (zona primaria)",
                   "P1 · desliza en un plano (zona secundaria)"], "No crítica"),
        categories=clasif_cats,
    )
    plano_prim = np.where(e1 & (~e2 | (b1 >= b2)), r["Plano_1"], r["Plano_2"])
    plano_sec = np.where(v1 & (~v2 | (b1 >= b2)), r["Plano_1"], r["Plano_2"])
    desliz_cats = (
        list(intersecciones["Plano_1"].cat.categories) + [""]
        if hasattr(intersecciones["Plano_1"], "cat")
        else None
    )
    r["Plano_Deslizamiento"] = pd.Categorical(
        np.where(un_plano, plano_prim, np.where(secundaria, plano_sec, "")),
        categories=desliz_cats,
    )
    return r


def curvas_limite_cuna(talud, param):
    return [
        {"lineas": lineas_circulo_maximo(talud.buz, talud.dirbuz), "estilo": "talud", "etiqueta": "Plano del talud"},
        {"lineas": lineas_cono_vertical(param.phi), "estilo": "friccion", "etiqueta": "Cono de fricción"},
        {"lineas": lineas_circulo_maximo(param.phi, talud.dirbuz), "estilo": "plano_phi",
         "etiqueta": "Plano de buzamiento φ"},
    ]
