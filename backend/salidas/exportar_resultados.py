"""Excel, PNG y ZIP de resultados, todo en memoria (bytes): nada se sube a ningún servidor."""
import io
import re
import zipfile
from dataclasses import asdict, replace

import matplotlib.pyplot as plt
import pandas as pd

from cinematica.analisis_cinematico import criticos_por_persistencia, criticos_por_tipo, resumen_porcentajes
from cinematica.veredicto_mecanismos import evaluar_veredicto
from estereograma.figuras_mecanismos import FIGURAS


def nombre_base(res):
    return re.sub(r"[^\w\-]+", "_", res.talud.nombre).strip("_") or "talud"


MAX_FILAS_EXCEL = 50_000
COLS_INTER = ["Plano_1", "Buz_1", "DirBuz_1", "Plano_2", "Buz_2", "DirBuz_2", "Persist_min", "Trend", "Plunge"]


def tablas_intersecciones(res):
    """Solo las intersecciones críticas (cuña y toppling directo), con columnas compactas."""
    c = res.cuna[res.cuna.Critico][COLS_INTER + ["Zona_Primaria", "Zona_Secundaria", "Modo", "Clasificacion",
                                                  "Plano_Deslizamiento"]].sort_values("Plunge", ascending=False)
    ri = res.directo_aristas
    d = ri[ri.C1_Dips][COLS_INTER + ["Zona_1", "Zona_2", "Zona_3", "Clasificacion"]].sort_values("Plunge", ascending=False)
    return c.round(2), d.round(2)


def _a_excel(w, tabla, hoja, notas):
    if len(tabla) > MAX_FILAS_EXCEL:
        notas.append((hoja, f"{len(tabla):,} filas críticas; aquí van las {MAX_FILAS_EXCEL:,} de mayor inmersión. "
                            "La lista completa está en el CSV del ZIP."))
        tabla = tabla.head(MAX_FILAS_EXCEL)
    tabla.to_excel(w, sheet_name=hoja, index=False)


def png_figura(fig, dpi=150):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return buf.getvalue()


def excel_resultados(res, umbral, descartadas=None):
    veredictos = pd.DataFrame([{"Mecanismo": v.nombre, "Resultado": "SÍ" if v.posible else "NO",
                                "% crítico": round(v.porcentaje, 1), "Críticos": v.criticos, "Total": v.total,
                                "Evaluado sobre": v.elemento, "Detalle": " · ".join(v.detalles)}
                               for v in evaluar_veredicto(res, umbral)])
    entrada = pd.DataFrame(
        [("Talud", k, v) for k, v in asdict(res.talud).items()] +
        [("Parámetros Dips", k, v) for k, v in asdict(res.parametros).items()] +
        [("Resumen", "PORCENTAJE CRÍTICO DE DISCONTINUIDADES (%)", umbral),
         ("Resumen", "Nota", "Solo clasifica en SÍ/NO; no es un factor de seguridad ni una probabilidad de falla"),
         ("Criterio", "Plano igual al talud", "No se considera en rotura planar ni en cuña: con un talud a/b, el plano a/b no "
          "produce rotura planar ni forma cuñas críticas (volumen cero). En toppling se evalúa normalmente. "
          "Solo planos con la misma orientación exacta"),
         ("Datos", "filtro", res.filtro)],
        columns=["Grupo", "Variable", "Valor"])
    entrada["Valor"] = entrada["Valor"].astype(str)
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as w:
        veredictos.to_excel(w, sheet_name="Resumen SI-NO", index=False)
        resumen_porcentajes(res).to_excel(w, sheet_name="Porcentajes Dips", index=False)
        entrada.to_excel(w, sheet_name="Entrada", index=False)
        res.datos.to_excel(w, sheet_name="Discontinuidades", index=False)
        res.planar.to_excel(w, sheet_name="Planar", index=False)
        cuna, aristas = tablas_intersecciones(res)
        notas = [("Intersecciones", f"{len(res.intersecciones):,} evaluadas; solo se listan las críticas.")]
        _a_excel(w, cuna, "Cuna criticas", notas)
        res.flexural.to_excel(w, sheet_name="Toppling flexural", index=False)
        _a_excel(w, aristas, "Toppling directo aristas", notas)
        res.directo_base.to_excel(w, sheet_name="Toppling directo base", index=False)
        criticos_por_tipo(res).to_excel(w, sheet_name="Criticos por tipo")
        criticos_por_persistencia(res).to_excel(w, sheet_name="Criticos por persistencia")
        if descartadas is not None and len(descartadas):
            descartadas.to_excel(w, sheet_name="Descartadas", index=False)
        pd.DataFrame(notas, columns=["Hoja", "Nota"]).to_excel(w, sheet_name="Notas", index=False)
    return buf.getvalue()


def zip_resultados(res, op, umbral, descartadas=None, resolucion_exportar=301):
    """ZIP con el Excel y un PNG por estereograma, a op.dpi_exportar."""
    op_exp = replace(op, resolucion=resolucion_exportar)
    base = nombre_base(res)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(f"{base}_analisis_cinematico.xlsx", excel_resultados(res, umbral, descartadas))
        cuna, aristas = tablas_intersecciones(res)
        z.writestr(f"{base}_cuna_intersecciones_criticas.csv", cuna.to_csv(index=False).encode("utf-8-sig"))
        z.writestr(f"{base}_toppling_directo_aristas_criticas.csv", aristas.to_csv(index=False).encode("utf-8-sig"))
        for clave, (_, funcion) in FIGURAS.items():
            z.writestr(f"{base}_{clave}.png", png_figura(funcion(res, op_exp), op.dpi_exportar))
    return buf.getvalue()
