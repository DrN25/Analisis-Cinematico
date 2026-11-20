"""Rotura planar — criterio de Dips v9 (se evalúa sobre los POLOS).

Un polo es crítico si cumple las tres condiciones:
  1. Dirección casi paralela a la cara:  |αj − αs| ≤ LL
       Hudson & Harrison (2000) 18.1.1 (d); Kliche (2019) cap. 5; Wyllie (2018) 7.2
  2. Aflora en la cara (envolvente daylight):  ψj ≤ ψapp(αj)
       Ayuda de Dips v9 "Planar Sliding"; Kliche (2019) fig. 5.6
  3. Fuera del cono de fricción:  ψj ≥ φ
Los bordes se incluyen, como Dips (comprobado con una exportación de Dips v9: 137 de 137 planos).
       Hudson & Harrison (2000) 18.1.1 (c); Wyllie (2018) 7.2

La misma función de zona la usan el cálculo (sobre los datos) y el dibujo (sobre la malla).
"""
import numpy as np

from cinematica.geometria_esferica import (TOL, buz_aparente, envolver, lineas_circulo_maximo, lineas_cono_vertical,
                                           lineas_radial, plano_de_polo, polo_de_plano)
from cinematica.lectura_discontinuidades import base


def componentes_planar(trend_polo, plunge_polo, talud, param):
    buz, dirbuz = plano_de_polo(trend_polo, plunge_polo)
    return {
        "Lateral": np.abs(envolver(dirbuz - talud.dirbuz)) <= param.ll_planar,
        "Daylight": buz <= buz_aparente(talud.buz, talud.dirbuz, dirbuz) + TOL,
        "Friccion": buz >= param.phi - TOL,
    }


def zona_planar(trend_polo, plunge_polo, talud, param):
    c = componentes_planar(trend_polo, plunge_polo, talud, param)
    return c["Lateral"] & c["Daylight"] & c["Friccion"]


def evaluar_planar(datos, talud, param):
    tp, pp = polo_de_plano(datos["Buz"].to_numpy(float), datos["DirBuz"].to_numpy(float))
    r = base(datos)
    for nombre, valor in componentes_planar(tp, pp, talud, param).items():
        r[nombre] = valor
    r["Critico"] = zona_planar(tp, pp, talud, param)
    return r


def curvas_limite_planar(talud, param):
    d = np.linspace(talud.dirbuz - 90, talud.dirbuz + 90, 181)
    t_env, p_env = polo_de_plano(buz_aparente(talud.buz, talud.dirbuz, d), d)
    curvas = [
        {"lineas": lineas_circulo_maximo(talud.buz, talud.dirbuz), "estilo": "talud", "etiqueta": "Plano del talud"},
        {"lineas": lineas_cono_vertical(90 - param.phi), "estilo": "friccion", "etiqueta": "Cono de fricción"},
        {"lineas": (t_env, p_env), "estilo": "daylight", "etiqueta": "Envolvente daylight"},
    ]
    for s in (-1, 1):
        curvas.append({"lineas": lineas_radial(talud.dirbuz + 180 + s * param.ll_planar), "estilo": "lateral",
                       "etiqueta": "Límites laterales" if s < 0 else None})
    return curvas
