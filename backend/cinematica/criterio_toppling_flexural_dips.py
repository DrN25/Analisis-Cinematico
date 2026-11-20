"""Toppling flexural — criterio de Dips v9 (se evalúa sobre los POLOS).

Un polo es crítico si:
  1. El plano buza hacia el interior del talud:  |αj − (αs + 180°)| ≤ LL
       Hudson & Harrison (2000) 18.1.3 (b); Kliche (2019) cap. 5
  2. Hay deslizamiento entre capas: el polo cae fuera del plano límite de buzamiento ψs − φ y dirección αs,
     es decir, plunge del polo < buzamiento aparente de ese plano en la dirección del polo.
       Ayuda de Dips v9 "Flexural Toppling"; Kliche (2019) figs. 5.9–5.10; Hudson & Harrison (2000) fig. 18.9
"""
import numpy as np

from cinematica.geometria_esferica import (buz_aparente, envolver, lineas_circulo_maximo, lineas_radial,
                                           plano_de_polo, polo_de_plano)
from cinematica.lectura_discontinuidades import base


def componentes_flexural(trend_polo, plunge_polo, talud, param):
    _, dirbuz = plano_de_polo(trend_polo, plunge_polo)
    return {
        "Lateral": np.abs(envolver(dirbuz - (talud.dirbuz + 180.0))) <= param.ll_flexural,
        "Limite_Deslizamiento": plunge_polo < buz_aparente(talud.buz - param.phi, talud.dirbuz, trend_polo),
    }


def zona_flexural(trend_polo, plunge_polo, talud, param):
    c = componentes_flexural(trend_polo, plunge_polo, talud, param)
    return c["Lateral"] & c["Limite_Deslizamiento"]


def evaluar_flexural(datos, talud, param):
    tp, pp = polo_de_plano(datos["Buz"].to_numpy(float), datos["DirBuz"].to_numpy(float))
    r = base(datos)
    for nombre, valor in componentes_flexural(tp, pp, talud, param).items():
        r[nombre] = valor
    r["Critico"] = zona_flexural(tp, pp, talud, param)
    return r


def curvas_limite_flexural(talud, param):
    curvas = [
        {"lineas": lineas_circulo_maximo(talud.buz, talud.dirbuz), "estilo": "talud", "etiqueta": "Plano del talud"},
        {"lineas": lineas_circulo_maximo(talud.buz - param.phi, talud.dirbuz), "estilo": "limite",
         "etiqueta": "Plano límite ψs − φ"},
    ]
    for s in (-1, 1):
        curvas.append({"lineas": lineas_radial(talud.dirbuz + s * param.ll_flexural), "estilo": "lateral",
                       "etiqueta": "Límites laterales" if s < 0 else None})
    return curvas
