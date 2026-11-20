"""Orquestador: aplica los cuatro criterios de Dips v9 y arma los resúmenes.

Porcentajes como Dips: planos críticos / total de polos; intersecciones críticas / total de intersecciones.
"""
import pandas as pd

from cinematica.criterio_cuna_dips import evaluar_cuna
from cinematica.criterio_planar_dips import evaluar_planar
from cinematica.criterio_toppling_directo_dips import evaluar_toppling_directo
from cinematica.criterio_toppling_flexural_dips import evaluar_flexural
from cinematica.intersecciones_planos import calcular_intersecciones
from cinematica.lectura_discontinuidades import CLASES_PERSISTENCIA
from cinematica.modelos_datos import GeometriaTalud, ParametrosDips, ResultadoAnalisis, porcentaje
from cinematica.planos_paralelos_talud import aplicar_exclusion, planos_paralelos


def ejecutar_analisis_dips(datos, talud=None, param=None, filtro="Sin filtro"):
    talud = talud or GeometriaTalud()
    param = param or ParametrosDips()
    if datos is None or len(datos) == 0:
        raise ValueError("No hay discontinuidades válidas para analizar.")
    talud = GeometriaTalud(float(talud.buz), float(talud.dirbuz) % 360.0, talud.nombre)
    inter = calcular_intersecciones(datos, param.ang_min_interseccion)
    aristas, planos_base = evaluar_toppling_directo(datos, inter, talud, param)
    res = ResultadoAnalisis(
        talud=talud, parametros=param, datos=datos, intersecciones=inter,
        planar=evaluar_planar(datos, talud, param),
        cuna=evaluar_cuna(inter, talud, param),
        flexural=evaluar_flexural(datos, talud, param),
        directo_aristas=aristas, directo_base=planos_base,
        filtro=filtro, tipos=list(pd.unique(datos["Tipo"])))
    if param.bordes_talud == "excluir":
        aplicar_exclusion(res, planos_paralelos(datos, talud))
    return res


def resumen_porcentajes(res):
    N, Ni = len(res.datos), len(res.intersecciones)
    filas = [
        ("Rotura planar", "Polos", N, res.planar.Critico.sum()),
        ("Rotura en cuña – P2 (dos planos)", "Intersecciones", Ni, (res.cuna.Modo == "P2").sum()),
        ("Rotura en cuña – P1 (un plano)", "Intersecciones", Ni, (res.cuna.Modo == "P1").sum()),
        ("Rotura en cuña – total", "Intersecciones", Ni, res.cuna.Critico.sum()),
        ("   zona primaria", "Intersecciones", Ni, res.cuna.Zona_Primaria.sum()),
        ("   zona secundaria", "Intersecciones", Ni, res.cuna.Zona_Secundaria.sum()),
        ("Toppling flexural", "Polos", N, res.flexural.Critico.sum()),
        ("Toppling directo – C1", "Intersecciones", Ni, res.directo_aristas.Directo.sum()),
        ("Toppling oblicuo – C2", "Intersecciones", Ni, res.directo_aristas.Oblicuo.sum()),
        ("Toppling directo – planos base", "Polos", N, res.directo_base.Critico.sum()),
        ("   «Base» (φ ≤ ψ ≤ ψs, ±LL)", "Polos", N, (res.directo_base.Grupo_Base == "Base").sum()),
        ("   «Base con deslizamiento» (ψ ≤ φ)", "Polos", N, (res.directo_base.Grupo_Base == "Base con deslizamiento").sum()),
    ]
    t = pd.DataFrame(filas, columns=["Mecanismo", "Se evalúa sobre", "Total", "Críticos"])
    t["Críticos"] = t["Críticos"].astype(int)
    t["% crítico"] = [round(porcentaje(c, n), 2) for c, n in zip(t["Críticos"], t["Total"])]
    return t


def criticos_por_tipo(res):
    return _criticos_por(res, "Tipo")


def criticos_por_persistencia(res):
    t = _criticos_por(res, "Clase_P")
    orden = [c[2] for c in CLASES_PERSISTENCIA] + ["Sin dato"]
    return t.reindex([o for o in orden if o in t.index])


def _criticos_por(res, columna):
    d = res.datos
    t = pd.DataFrame({"N": d.groupby(columna).size()})
    for nombre, tabla in (("Planar", res.planar), ("Flexural", res.flexural), ("Plano base", res.directo_base)):
        t[nombre] = tabla[tabla.Critico].groupby(columna).size()
    t = t.fillna(0).astype(int)
    t.index.name = "Tipo" if columna == "Tipo" else "Persistencia (ISRM)"
    return t
