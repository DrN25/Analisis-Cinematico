"""Excel, PNG y ZIP de resultados, todo en memoria (bytes): nada se sube a ningún servidor."""
import io
import re
import zipfile
from dataclasses import replace

import pandas as pd

import estereograma  # noqa: F401  (fija el backend Agg antes de importar pyplot)
import matplotlib.pyplot as plt

from estereograma.figuras_mecanismos import FIGURAS


def nombre_base(res):
    return re.sub(r"[^\w\-]+", "_", res.talud.nombre).strip("_") or "talud"


COLS_INTER = ["Plano_1", "Buz_1", "DirBuz_1", "Plano_2", "Buz_2", "DirBuz_2", "Persist_min", "Trend", "Plunge"]


def tablas_intersecciones(res):
    """Solo las intersecciones críticas (cuña y toppling directo), con columnas compactas."""
    c = res.cuna[res.cuna.Critico][COLS_INTER + ["Zona_Primaria", "Zona_Secundaria", "Modo", "Clasificacion",
                                                  "Plano_Deslizamiento"]].sort_values("Plunge", ascending=False)
    ri = res.directo_aristas
    col_crit = "Directo" if "Directo" in ri.columns else "C1_Dips"
    d = ri[ri[col_crit] | (ri.Oblicuo if "Oblicuo" in ri.columns else False)][COLS_INTER + ["Zona_1", "Zona_2", "Zona_3", "Clasificacion"]].sort_values("Plunge", ascending=False)
    return c.round(2), d.round(2)


def png_figura(fig, dpi=150):
    buf = io.BytesIO()
    try:
        fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight", facecolor="white")
    finally:
        plt.close(fig)          # siempre se libera la figura, aunque falle el guardado
    return buf.getvalue()


MAX_FILAS_HOJA = 1_048_575           # filas de datos por hoja de Excel (más el encabezado)
NOTA_DIRECTO = "Direct sliding results are C1 (direct toppling) and C2 (oblique toppling)"


def _id_salida(ids):
    """IDs como en Dips: enteros. Si el archivo no traía ID (se generaron D001, D002…), 1, 2, …"""
    ids = pd.Series(ids, dtype=str)
    if ids.str.fullmatch(r"D\d{3,}").all():
        return ids.str[1:].astype(int).tolist()
    numericos = pd.to_numeric(ids, errors="coerce")
    if numericos.notna().all() and (numericos % 1 == 0).all():
        return numericos.astype(int).tolist()
    return ids.tolist()


def _num(v):
    """Valores enteros como enteros (70 y no 70.0), como en Dips."""
    v = float(v)
    return int(v) if v.is_integer() else v


def _texto(v):
    return v if v else None


def excel_resultados(res, umbral=None, descartadas=None):
    """Excel con el mismo formato que la exportación de resultados cinemáticos de Dips: tres hojas.

    · Kinematic Properties  talud, ángulo de fricción y límite lateral
    · Grid Data Planes      un plano por fila: Planar Sliding, Flexural Toppling, Direct Toppling (Base Plane)
    · Plane Intersections   una intersección por fila: Direct Toppling (C1 / C2), Wedge Sliding (P1 / P2)
    'umbral' y 'descartadas' se aceptan por compatibilidad y no se escriben.
    """
    from openpyxl import Workbook

    t, p, d = res.talud, res.parametros, res.datos
    wb = Workbook(write_only=True)          # escritura en flujo: rápida y con poca memoria

    hoja = wb.create_sheet("Kinematic Properties")
    hoja.append(["Slope Dip", _num(t.buz)])
    hoja.append(["Slope Dip Direction", _num(t.dirbuz)])
    hoja.append(["Friction Angle", _num(p.phi)])
    if p.ll_planar == p.ll_flexural == p.ll_directo:
        hoja.append(["Lateral Limit Angle", _num(p.ll_planar)])
    else:
        hoja.append(["Lateral Limit Angle (Planar Sliding)", _num(p.ll_planar)])
        hoja.append(["Lateral Limit Angle (Flexural Toppling)", _num(p.ll_flexural)])
        hoja.append(["Lateral Limit Angle (Direct Toppling)", _num(p.ll_directo)])
    hoja.append([])
    hoja.append([NOTA_DIRECTO])

    # --- planos
    ids = _id_salida(d["ID"])
    id_de = dict(zip(d["ID"].astype(str), ids))
    planar = dict(zip(res.planar.ID.astype(str), res.planar.Critico))
    flexural = dict(zip(res.flexural.ID.astype(str), res.flexural.Critico))
    base = dict(zip(res.directo_base.ID.astype(str), res.directo_base.Grupo_Base))
    etiqueta_base = {"Base": "Base", "Base con deslizamiento": "Sliding+Base", "Sliding+Base": "Sliding+Base"}
    con_tipo = not (d["Tipo"].astype(str) == "Sin tipo").all()
    con_pers = d["Persistencia"].notna().any() if "Persistencia" in d else False
    hoja = wb.create_sheet("Grid Data Planes")
    hoja.append(["ID", "Dip", "Dip Direction"] + (["Tipo"] if con_tipo else []) + (["Persistencia"] if con_pers else [])
                + ["Planar Sliding", "Flexural Toppling", "Direct Toppling (Base Plane)"])
    for fila in d.itertuples(index=False):
        clave = str(fila.ID)
        extra = ([fila.Tipo] if con_tipo else []) + ([None if pd.isna(fila.Persistencia) else _num(fila.Persistencia)]
                                                     if con_pers else [])
        hoja.append([id_de[clave], _num(fila.Buz), _num(fila.DirBuz)] + extra +
                    ["Sliding" if planar.get(clave) else None, "Toppling" if flexural.get(clave) else None,
                     _texto(etiqueta_base.get(base.get(clave, ""), ""))])

    # --- intersecciones (mismo orden que el cálculo; la cuña y el toppling se evalúan sobre la misma tabla)
    inter = res.intersecciones
    p1 = inter.Plano_1.astype(str).map(id_de).tolist()
    p2 = inter.Plano_2.astype(str).map(id_de).tolist()
    trend, plunge = inter.Trend.to_numpy(float).tolist(), inter.Plunge.to_numpy(float).tolist()
    # C1: toppling directo (zonas 1 y 2) · C2: toppling oblicuo (zona 3); excluyentes entre sí
    directo = res.directo_aristas
    c12 = ["C1" if a else ("C2" if b else None)
           for a, b in zip(directo.Directo.to_numpy(bool), directo.Oblicuo.to_numpy(bool))]
    cuna = res.cuna.Modo.fillna("").astype(str).tolist()
    encabezado = ["Intersection ID", "Trend", "Plunge", "Quantity", "Plane ID #1", "Plane ID #2",
                  "Direct Toppling", "Wedge Sliding"]
    hoja, n_hoja, filas = None, 0, 0
    for k in range(len(inter)):
        if hoja is None or filas >= MAX_FILAS_HOJA:   # más de 1 048 575 intersecciones: sigue en otra hoja
            n_hoja += 1
            hoja = wb.create_sheet("Plane Intersections" + ("" if n_hoja == 1 else f" ({n_hoja})"))
            hoja.append(encabezado)
            filas = 0
        hoja.append([k, trend[k], plunge[k], 1, p1[k], p2[k], c12[k], cuna[k] or None])
        filas += 1
    if hoja is None:
        wb.create_sheet("Plane Intersections").append(encabezado)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def zip_resultados(res, op, umbral=None, descartadas=None, resolucion_exportar=301):
    """ZIP con el Excel de resultados, CSVs de intersecciones críticas y un PNG por estereograma, a op.dpi_exportar."""
    op_exp = replace(op, resolucion=resolucion_exportar)
    base = nombre_base(res)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(f"{base}_resultados.xlsx", excel_resultados(res, umbral, descartadas))
        cuna, aristas = tablas_intersecciones(res)
        z.writestr(f"{base}_cuna_intersecciones_criticas.csv", cuna.to_csv(index=False).encode("utf-8-sig"))
        z.writestr(f"{base}_toppling_directo_aristas_criticas.csv", aristas.to_csv(index=False).encode("utf-8-sig"))
        for clave, (_, funcion) in FIGURAS.items():
            z.writestr(f"{base}_{clave}.png", png_figura(funcion(res, op_exp), op.dpi_exportar))
    return buf.getvalue()
