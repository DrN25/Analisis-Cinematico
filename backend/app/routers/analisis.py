"""Rutas de cálculo cinemático, renderizado de estereogramas y descargas Excel/PNG/ZIP."""
import base64
import io
import math
import os
import sys
import threading
import time
import uuid
from collections import OrderedDict
from dataclasses import asdict
from pathlib import Path
from typing import Any

import matplotlib
os.environ.setdefault("MPLBACKEND", "Agg")
matplotlib.use("Agg")

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from cinematica.analisis_cinematico import (  # noqa: E402
    criticos_por_persistencia,
    criticos_por_tipo,
    ejecutar_analisis_dips,
    resumen_porcentajes,
)
from cinematica.lectura_discontinuidades import (  # noqa: E402
    conteo_por_tipo,
    filtrar,
    leer_archivo,
    validar_discontinuidades,
)
from cinematica.modelos_datos import GeometriaTalud, ParametrosDips  # noqa: E402
from cinematica.planos_paralelos_talud import resumen_exclusion  # noqa: E402
from cinematica.veredicto_mecanismos import evaluar_veredicto  # noqa: E402
from estereograma.figuras_mecanismos import FIGURAS  # noqa: E402
from estereograma.opciones_estereograma import OpcionesEstereograma  # noqa: E402
from salidas.exportar_resultados import (  # noqa: E402
    excel_resultados,
    nombre_base,
    png_figura,
    tablas_intersecciones,
    zip_resultados,
)

from app import models, schemas  # noqa: E402
from app.audit import record_log  # noqa: E402
from app.database import get_db  # noqa: E402
from app.deps import get_current_user  # noqa: E402

router = APIRouter()

MAX_UPLOAD_BYTES = 25 * 1024 * 1024
CACHE_MAX_ITEMS = 12
CACHE_TTL_SECONDS = 1800

PLOT_LOCK = threading.Lock()
CACHE_LOCK = threading.Lock()
ANALYSIS_CACHE: OrderedDict[tuple[int, str], tuple[Any, pd.DataFrame, float]] = OrderedDict()

RUTA_EJEMPLO = BACKEND_DIR / "datos_ejemplo" / "discontinuidades_ejemplo.csv"
COLS_PLANOS = ["ID", "Tipo", "Buz", "DirBuz", "Persistencia", "Clase_P"]


def _clean_val(val: Any) -> Any:
    if val is None or val is pd.NA:
        return None
    if isinstance(val, (np.bool_, bool)):
        return bool(val)
    if isinstance(val, np.integer):
        return int(val)
    if isinstance(val, (np.floating, float)):
        f = float(val)
        return None if (math.isnan(f) or math.isinf(f)) else f
    if pd.isna(val):
        return None
    return val


def _df_records(df: pd.DataFrame, limit: int | None = None) -> list[dict[str, Any]]:
    if df is None or len(df) == 0:
        return []
    sub = df.head(limit) if limit else df
    return [
        {str(col): _clean_val(val) for col, val in row.items()}
        for row in sub.to_dict(orient="records")
    ]


def _to_opciones(opt: schemas.OpcionesPlotIn) -> OpcionesEstereograma:
    d = opt.model_dump()
    if d.get("mostrar") is not None:
        d["mostrar"] = tuple(d["mostrar"])
    return OpcionesEstereograma(**d)


def _cache_put(user_id: int, res: Any, descartadas: pd.DataFrame) -> str:
    analysis_id = uuid.uuid4().hex
    now = time.monotonic()
    with CACHE_LOCK:
        stale = [k for k, (_, _, ts) in ANALYSIS_CACHE.items() if now - ts > CACHE_TTL_SECONDS]
        for k in stale:
            ANALYSIS_CACHE.pop(k, None)
        ANALYSIS_CACHE[(user_id, analysis_id)] = (res, descartadas, now)
        while len(ANALYSIS_CACHE) > CACHE_MAX_ITEMS:
            ANALYSIS_CACHE.popitem(last=False)
    return analysis_id


def _cache_get(user_id: int, analysis_id: str) -> tuple[Any, pd.DataFrame]:
    now = time.monotonic()
    with CACHE_LOCK:
        item = ANALYSIS_CACHE.get((user_id, analysis_id))
        if not item:
            raise HTTPException(
                status_code=404,
                detail={"code": "CACHE_MISS", "message": "Análisis expirado; se requiere recalcular."},
            )
        res, desc, ts = item
        if now - ts > CACHE_TTL_SECONDS:
            ANALYSIS_CACHE.pop((user_id, analysis_id), None)
            raise HTTPException(
                status_code=404,
                detail={"code": "CACHE_MISS", "message": "Análisis expirado; se requiere recalcular."},
            )
        ANALYSIS_CACHE.move_to_end((user_id, analysis_id))
        return res, desc


def _render_png(res: Any, vista: str, op: OpcionesEstereograma, dpi: int | None = None) -> bytes:
    if vista not in FIGURAS:
        raise HTTPException(status_code=400, detail=f"Vista '{vista}' inválida.")
    _, fn = FIGURAS[vista]
    target_dpi = dpi or op.dpi_pantalla
    with PLOT_LOCK:
        return png_figura(fn(res, op), target_dpi)


def _parse_payload(df_raw: pd.DataFrame, filename: str) -> dict[str, Any]:
    datos, descartadas = validar_discontinuidades(df_raw)
    cols_edit = [c for c in ["ID", "Buz", "DirBuz", "Tipo", "Persistencia"] if c in datos.columns]
    cols_desc = [c for c in ["ID", "Buz", "DirBuz", "Motivo"] if c in descartadas.columns]
    return {
        "filename": filename,
        "rows": _df_records(datos[cols_edit]),
        "descartadas": _df_records(descartadas[cols_desc]),
        "tipos_conteo": conteo_por_tipo(datos),
    }


@router.get("/ejemplo")
def load_ejemplo(_: models.Usuario = Depends(get_current_user)):
    """Carga el conjunto de discontinuidades de ejemplo (36 filas)."""
    if not RUTA_EJEMPLO.exists():
        raise HTTPException(status_code=404, detail="Archivo de ejemplo no encontrado.")
    df_raw = leer_archivo(str(RUTA_EJEMPLO))
    return _parse_payload(df_raw, RUTA_EJEMPLO.name)


@router.post("/parse-archivo")
async def parse_archivo(
    file: UploadFile = File(...),
    _: models.Usuario = Depends(get_current_user),
):
    """Lee un CSV/TXT/Excel subido, normaliza columnas y reporta filas válidas y descartadas."""
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 25 MB.")
    if not raw:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")
    fname = file.filename or "archivo.csv"
    try:
        df_raw = leer_archivo(raw, fname)
        return _parse_payload(df_raw, fname)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"No se pudo leer el archivo: {exc}") from exc


@router.post("/ejecutar")
def ejecutar(
    data: schemas.EjecutarAnalisisIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """Valida discontinuidades, aplica filtros, ejecuta análisis Dips v9 y renderiza la vista activa."""
    if not data.filas:
        raise HTTPException(status_code=400, detail="Debes enviar al menos una discontinuidad.")

    df_in = pd.DataFrame([row.model_dump() for row in data.filas])
    try:
        datos, descartadas = validar_discontinuidades(df_in)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    datos_filt, filtro_txt = filtrar(datos, data.filtro.tipos, data.filtro.persistencia_min)
    if len(datos_filt) == 0:
        raise HTTPException(status_code=400, detail="No quedan discontinuidades válidas con los filtros elegidos.")

    talud = GeometriaTalud(
        buz=float(data.talud.buz),
        dirbuz=float(data.talud.dirbuz) % 360.0,
        nombre=data.talud.nombre.strip() or "Talud 1",
    )
    param = ParametrosDips(
        phi=float(data.parametros.phi),
        ll_planar=float(data.parametros.ll_planar),
        ll_flexural=float(data.parametros.ll_flexural),
        ll_directo=float(data.parametros.ll_directo),
        ponderacion=data.parametros.ponderacion,
        linea_muestreo=(
            (float(data.parametros.azimut_muestreo), float(data.parametros.inclinacion_muestreo))
            if data.parametros.ponderacion == "terzaghi"
            else None
        ),
    )

    try:
        res = ejecutar_analisis_dips(datos_filt, talud, param, filtro_txt)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    analysis_id = _cache_put(current_user.usuario_id, res, descartadas)
    op = _to_opciones(data.opciones)
    png_bytes = _render_png(res, data.vista, op, op.dpi_pantalla)

    record_log(
        db, request, current_user.sistema_id, current_user.usuario, "ANALISIS",
        detalle=f"{talud.nombre} ({talud.buz:g}/{talud.dirbuz:03.0f}°, φ={param.phi:g}°) · N={len(datos_filt)}",
        usuario_id=current_user.usuario_id,
    )

    cuna_crit = res.cuna[res.cuna.Critico][
        ["Plano_1", "Plano_2", "Trend", "Plunge", "Modo", "Clasificacion", "Plano_Deslizamiento", "Persist_min"]
    ].sort_values("Plunge", ascending=False).round(1)
    dir_z12 = res.directo_aristas[res.directo_aristas.Directo][
        ["Plano_1", "Plano_2", "Trend", "Plunge", "Clasificacion"]
    ].sort_values("Plunge", ascending=False).round(1)
    dir_z3 = res.directo_aristas[res.directo_aristas.Oblicuo][
        ["Plano_1", "Plano_2", "Trend", "Plunge"]
    ].sort_values("Plunge", ascending=False).round(1)

    return {
        "analysis_id": analysis_id,
        "contexto": {
            "nombre": res.talud.nombre,
            "buz": res.talud.buz,
            "dirbuz": res.talud.dirbuz,
            "phi": res.parametros.phi,
            "n_datos": len(res.datos),
            "n_intersecciones": len(res.intersecciones),
            "filtro": res.filtro,
            "exclusion_resumen": resumen_exclusion(res),
        },
        "veredictos": [asdict(v) for v in evaluar_veredicto(res, data.umbral)],
        "tablas": {
            "resumen_porcentajes": _df_records(resumen_porcentajes(res)),
            "criticos_por_tipo": _df_records(criticos_por_tipo(res).reset_index()),
            "criticos_por_persistencia": _df_records(criticos_por_persistencia(res).reset_index()),
            "planar": _df_records(res.planar[res.planar.Critico][COLS_PLANOS]),
            "cuna": _df_records(cuna_crit, limit=500),
            "cuna_total": int(len(cuna_crit)),
            "flexural": _df_records(res.flexural[res.flexural.Critico][COLS_PLANOS]),
            "directo_z12": _df_records(dir_z12, limit=500),
            "directo_z12_total": int(len(dir_z12)),
            "directo_z3": _df_records(dir_z3, limit=500),
            "directo_z3_total": int(len(dir_z3)),
            "directo_base": _df_records(res.directo_base[res.directo_base.Critico][COLS_PLANOS + ["Etiqueta_Dips"]]),
            "tipos_conteo": _df_records(
                res.datos.Tipo.value_counts().rename_axis("Tipo").reset_index(name="N")
            ),
            "descartadas": _df_records(descartadas[["ID", "Buz", "DirBuz", "Motivo"]]) if len(descartadas) else [],
        },
        "figura_base64": base64.b64encode(png_bytes).decode("ascii"),
    }


@router.post("/figura")
def render_figura(
    data: schemas.FiguraIn,
    current_user: models.Usuario = Depends(get_current_user),
):
    """Redibuja un estereograma desde el análisis cacheado sin recalcular."""
    res, _ = _cache_get(current_user.usuario_id, data.analysis_id)
    op = _to_opciones(data.opciones)
    png_bytes = _render_png(res, data.vista, op, data.dpi or op.dpi_pantalla)
    return Response(content=png_bytes, media_type="image/png")


@router.post("/exportar/excel")
def exportar_excel(
    data: schemas.ExportarIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """Genera y descarga el libro Excel completo del análisis cacheado."""
    res, descartadas = _cache_get(current_user.usuario_id, data.analysis_id)
    content = excel_resultados(res, data.umbral, descartadas)
    fname = f"{nombre_base(res)}_analisis_cinematico.xlsx"
    record_log(
        db, request, current_user.sistema_id, current_user.usuario, "EXPORT_EXCEL",
        detalle=fname, usuario_id=current_user.usuario_id,
    )
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.post("/exportar/png")
def exportar_png(
    data: schemas.ExportarIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """Exporta el estereograma activo en alta resolución (dpi_exportar)."""
    res, _ = _cache_get(current_user.usuario_id, data.analysis_id)
    op = _to_opciones(data.opciones)
    content = _render_png(res, data.vista, op, op.dpi_exportar)
    fname = f"{nombre_base(res)}_{data.vista}.png"
    record_log(
        db, request, current_user.sistema_id, current_user.usuario, "EXPORT_PNG",
        detalle=f"{fname} ({op.dpi_exportar} dpi)", usuario_id=current_user.usuario_id,
    )
    return Response(
        content=content,
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.post("/exportar/zip")
def exportar_zip(
    data: schemas.ExportarIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """Exporta ZIP completo (Excel + CSVs de intersecciones + los 6 estereogramas)."""
    res, descartadas = _cache_get(current_user.usuario_id, data.analysis_id)
    op = _to_opciones(data.opciones)
    with PLOT_LOCK:
        content = zip_resultados(res, op, data.umbral, descartadas)
    fname = f"{nombre_base(res)}_resultados.zip"
    record_log(
        db, request, current_user.sistema_id, current_user.usuario, "EXPORT_ZIP",
        detalle=fname, usuario_id=current_user.usuario_id,
    )
    return Response(
        content=content,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


def _tabla_df(res: Any, tabla: str) -> pd.DataFrame:
    if tabla == "resumen_porcentajes":
        return resumen_porcentajes(res)
    if tabla == "criticos_por_tipo":
        return criticos_por_tipo(res).reset_index()
    if tabla == "criticos_por_persistencia":
        return criticos_por_persistencia(res).reset_index()
    if tabla == "planar":
        return res.planar[res.planar.Critico][COLS_PLANOS]
    if tabla == "cuna":
        return tablas_intersecciones(res)[0]
    if tabla == "flexural":
        return res.flexural[res.flexural.Critico][COLS_PLANOS]
    if tabla == "directo_z12":
        return res.directo_aristas[res.directo_aristas.Directo][
            ["Plano_1", "Plano_2", "Trend", "Plunge", "Clasificacion"]
        ].sort_values("Plunge", ascending=False).round(2)
    if tabla == "directo_z3":
        return res.directo_aristas[res.directo_aristas.Oblicuo][
            ["Plano_1", "Plano_2", "Trend", "Plunge"]
        ].sort_values("Plunge", ascending=False).round(2)
    if tabla == "directo_base":
        return res.directo_base[res.directo_base.Critico][COLS_PLANOS + ["Etiqueta_Dips"]]
    if tabla == "tipos_conteo":
        return res.datos.Tipo.value_counts().rename_axis("Tipo").reset_index(name="N")
    raise HTTPException(status_code=404, detail=f"Tabla '{tabla}' no soportada.")


@router.post("/exportar/cuna-excel")
def exportar_cuna_excel(
    data: schemas.ExportarIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """Exporta todas las intersecciones críticas de cuña a un libro Excel (.xlsx)."""
    res, _ = _cache_get(current_user.usuario_id, data.analysis_id)
    df = tablas_intersecciones(res)[0]
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as w:
        df.head(50_000).to_excel(w, sheet_name="Cuna criticas", index=False)
    fname = f"{nombre_base(res)}_cuna_criticas.xlsx"
    record_log(
        db, request, current_user.sistema_id, current_user.usuario, "EXPORT_EXCEL",
        detalle=fname, usuario_id=current_user.usuario_id,
    )
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.post("/exportar/tabla-csv/{tabla}")
def exportar_tabla_csv(
    tabla: str,
    data: schemas.ExportarIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """Exporta cualquier tabla de resultados completa en CSV UTF-8-SIG."""
    res, _ = _cache_get(current_user.usuario_id, data.analysis_id)
    df = _tabla_df(res, tabla)
    fname = f"{nombre_base(res)}_{tabla}.csv"
    record_log(
        db, request, current_user.sistema_id, current_user.usuario, "EXPORT_CSV",
        detalle=fname, usuario_id=current_user.usuario_id,
    )
    return Response(
        content=df.to_csv(index=False).encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )
