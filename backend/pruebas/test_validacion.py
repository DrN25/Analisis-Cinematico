"""Pruebas locales (pytest): casos de validación, figuras con distintas opciones y archivos de salida."""
import io
import os
import sys
import zipfile
from dataclasses import replace

import matplotlib.pyplot as plt
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cinematica.analisis_cinematico import ejecutar_analisis_dips  # noqa: E402
from cinematica.lectura_discontinuidades import filtrar, leer_archivo, validar_discontinuidades  # noqa: E402
from estereograma.figuras_mecanismos import FIGURAS  # noqa: E402
from estereograma.opciones_estereograma import OpcionesEstereograma  # noqa: E402
from salidas.exportar_resultados import excel_resultados, zip_resultados  # noqa: E402
from validacion.casos_validacion import RUTA_EJEMPLO, ejecutar_validacion  # noqa: E402


@pytest.fixture(scope="module")
def resultado():
    datos, _ = validar_discontinuidades(leer_archivo(RUTA_EJEMPLO))
    datos, filtro = filtrar(datos)
    return ejecutar_analisis_dips(datos, filtro=filtro)


def test_casos_de_validacion():
    tabla = ejecutar_validacion()
    fallas = tabla[tabla.Resultado != "✔"]
    assert fallas.empty, fallas.to_string()


@pytest.mark.parametrize("proyeccion", ["equiarea", "equiangulo"])
@pytest.mark.parametrize("hemisferio", ["inferior", "superior"])
@pytest.mark.parametrize("leyenda", ["derecha", "abajo", "izquierda", "ninguna"])
def test_figuras(resultado, proyeccion, hemisferio, leyenda):
    op = OpcionesEstereograma(proyeccion=proyeccion, hemisferio=hemisferio, ubicacion_leyenda=leyenda, resolucion=61,
                              mostrar=("polos", "planos", "intersecciones"), contornos_en_mecanismos=True)
    for _, funcion in FIGURAS.values():
        plt.close(funcion(resultado, op))


def test_excel_y_zip(resultado):
    assert len(excel_resultados(resultado, 5.0)) > 10_000
    nombres = zipfile.ZipFile(io.BytesIO(zip_resultados(resultado, replace(OpcionesEstereograma(), dpi_exportar=60),
                                                          5.0, resolucion_exportar=61))).namelist()
    assert len(nombres) == 3 + len(FIGURAS)
