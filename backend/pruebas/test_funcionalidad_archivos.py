"""Pruebas exhaustivas de funcionalidad con archivos reales y control de memoria (<=512 MB).

Archivos evaluados:
1. discontinuidades_ejemplo.csv (ejemplo base de 36 filas)
2. C:\\Users\\Rafael\\Downloads\\PRUEBA 01_Zona 01 pared W.csv (archivo real descargado por el usuario)
3. PRUEBA 01_Zona 01 pared W.xlsx (archivo Excel real)
4. Archivo que excede 80 KB (validación de límite 413)
"""
import io
import os
import sys
import zipfile
from pathlib import Path

import openpyxl
import psutil
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

DOWNLOADS_CSV = Path(r"C:\Users\Rafael\Downloads\PRUEBA 01_Zona 01 pared W.csv")
ORIGINAL_XLSX = Path(r"c:\Users\Rafael\UNSA\TRABAJO\GEMA\Otros\Interfaz_Slope_Kinematic\PRUEBA 01_Zona 01 pared W.xlsx")


def get_process_memory_mb():
    return psutil.Process().memory_info().rss / (1024 * 1024)


def test_funcionalidad_completa_archivos(api_env):
    client, _, _ = api_env
    mem_inicial = get_process_memory_mb()
    print(f"\n[MEMORIA] Inicio de pruebas: {mem_inicial:.2f} MB")

    # Autenticación como ADMIN
    login_res = client.post(
        "/api/auth/login", json={"username_or_email": "ADMIN", "password": "Admin2026!"}
    )
    assert login_res.status_code == 200, f"Error en login: {login_res.text}"
    token = login_res.json()["access_token"]
    hdr = {"Authorization": f"Bearer {token}"}

    # =========================================================================
    # CASO 1: Archivo de ejemplo incorporado (discontinuidades_ejemplo.csv)
    # =========================================================================
    print("\n--- CASO 1: Archivo de ejemplo base ---")
    ej = client.get("/api/analisis/ejemplo", headers=hdr)
    assert ej.status_code == 200
    ej_data = ej.json()
    assert ej_data["filename"] == "discontinuidades_ejemplo.csv"
    assert len(ej_data["rows"]) == 36
    assert len(ej_data["descartadas"]) == 0
    assert "Diaclasa" in ej_data["tipos_conteo"]

    # Ejecutar análisis
    run1 = client.post(
        "/api/analisis/ejecutar",
        headers=hdr,
        json={
            "filas": ej_data["rows"],
            "talud": {"nombre": "Talud 1", "buz": 70.0, "dirbuz": 180.0},
            "parametros": {"phi": 30.0, "ll_planar": 20.0, "ll_flexural": 20.0, "ll_directo": 20.0},
            "filtro": {"tipos": None, "persistencia_min": 0.0},
            "umbral": 10.0,
            "vista": "general",
        },
    )
    assert run1.status_code == 200, f"Error al ejecutar: {run1.text}"
    r1 = run1.json()
    aid1 = r1["analysis_id"]
    assert len(r1["veredictos"]) == 4
    assert r1["oblicuo"] is not None
    assert r1["contexto"]["n_datos"] == 36
    assert r1["contexto"]["n_intersecciones"] == 628
    assert len(r1["figura_base64"]) > 1000

    # Probar las 6 vistas mediante /api/analisis/figura
    vistas = ["general", "planar", "cuna", "flexural", "directo", "roseta"]
    for v in vistas:
        fig_res = client.post(
            "/api/analisis/figura",
            headers=hdr,
            json={"analysis_id": aid1, "vista": v},
        )
        assert fig_res.status_code == 200, f"Error en vista {v}: {fig_res.text}"
        assert fig_res.content.startswith(b"\x89PNG\r\n\x1a\n"), f"Vista {v} no devolvió PNG válido"

    # Probar opciones visuales (paletas de colores de contornos y proyección)
    for paleta in ["Blues", "Greens", "Purples", "Greys"]:
        fig_opt = client.post(
            "/api/analisis/figura",
            headers=hdr,
            json={
                "analysis_id": aid1,
                "vista": "general",
                "opciones": {
                    "mapa_color_mecanismos": paleta,
                    "tamano_polo": 18.0,
                    "proyeccion": "equiangulo",
                },
            },
        )
        assert fig_opt.status_code == 200
        assert fig_opt.content.startswith(b"\x89PNG\r\n\x1a\n")

    # Probar exportaciones Caso 1
    # 1. Excel
    exp_xl = client.post("/api/analisis/exportar/excel", headers=hdr, json={"analysis_id": aid1, "umbral": 10.0})
    assert exp_xl.status_code == 200
    assert len(exp_xl.content) > 5000
    wb = openpyxl.load_workbook(io.BytesIO(exp_xl.content))
    assert "Kinematic Properties" in wb.sheetnames
    assert "Grid Data Planes" in wb.sheetnames
    assert "Plane Intersections" in wb.sheetnames

    # 2. PNG
    exp_png = client.post("/api/analisis/exportar/png", headers=hdr, json={"analysis_id": aid1, "vista": "planar"})
    assert exp_png.status_code == 200
    assert exp_png.content.startswith(b"\x89PNG")

    # 3. ZIP
    exp_zip = client.post("/api/analisis/exportar/zip", headers=hdr, json={"analysis_id": aid1, "umbral": 10.0})
    assert exp_zip.status_code == 200
    with zipfile.ZipFile(io.BytesIO(exp_zip.content), "r") as z:
        archivos_zip = z.namelist()
        assert any("resultados.xlsx" in a for a in archivos_zip)
        assert any("general.png" in a for a in archivos_zip)
        assert any("cuna.png" in a for a in archivos_zip)

    # 4. Cuna Excel
    exp_cuna = client.post("/api/analisis/exportar/cuna-excel", headers=hdr, json={"analysis_id": aid1})
    assert exp_cuna.status_code == 200
    assert len(exp_cuna.content) > 1000

    # 5. CSV tabla
    exp_csv = client.post("/api/analisis/exportar/tabla-csv/planar", headers=hdr, json={"analysis_id": aid1})
    assert exp_csv.status_code == 200
    assert b"ID" in exp_csv.content

    mem_caso1 = get_process_memory_mb()
    print(f"[MEMORIA] Fin Caso 1: {mem_caso1:.2f} MB")
    assert mem_caso1 < 350, f"Memoria excesiva tras Caso 1: {mem_caso1:.2f} MB"

    # =========================================================================
    # CASO 2: Archivo CSV real (PRUEBA 01_Zona 01 pared W.csv)
    # =========================================================================
    print(f"\n--- CASO 2: Archivo CSV real ({DOWNLOADS_CSV.name}) ---")
    assert DOWNLOADS_CSV.exists(), f"El archivo {DOWNLOADS_CSV} debe existir para la prueba."
    csv_bytes = DOWNLOADS_CSV.read_bytes()
    assert len(csv_bytes) <= 80 * 1024, f"El archivo {DOWNLOADS_CSV.name} debe cumplir el límite de 80 KB"

    parse_csv = client.post(
        "/api/analisis/parse-archivo",
        headers=hdr,
        files={"file": (DOWNLOADS_CSV.name, csv_bytes, "text/csv")},
    )
    assert parse_csv.status_code == 200, f"Error al parsear CSV: {parse_csv.text}"
    p_csv_data = parse_csv.json()
    assert p_csv_data["filename"] == DOWNLOADS_CSV.name
    rows_csv = p_csv_data["rows"]
    assert len(rows_csv) > 0, "No se obtuvieron filas del CSV"
    print(f"Filas leídas del CSV: {len(rows_csv)}, Descartadas: {len(p_csv_data['descartadas'])}")
    print(f"Tipos detectados: {p_csv_data['tipos_conteo']}")

    # Ejecutar análisis con datos reales
    run_csv = client.post(
        "/api/analisis/ejecutar",
        headers=hdr,
        json={
            "filas": rows_csv,
            "talud": {"nombre": "Pared W", "buz": 80.0, "dirbuz": 90.0},
            "parametros": {"phi": 32.0, "ll_planar": 20.0, "ll_flexural": 20.0, "ll_directo": 20.0},
            "filtro": {"tipos": None, "persistencia_min": 0.0},
            "umbral": 5.0,
            "vista": "general",
        },
    )
    assert run_csv.status_code == 200, f"Error al ejecutar CSV real: {run_csv.text}"
    print(f"[MEMORIA Paso 2.1 - Tras ejecutar]: {get_process_memory_mb():.2f} MB")
    r_csv = run_csv.json()
    aid_csv = r_csv["analysis_id"]
    assert r_csv["contexto"]["n_datos"] == len(rows_csv)
    print(f"Intersecciones generadas: {r_csv['contexto']['n_intersecciones']}")
    for v in r_csv["veredictos"]:
        print(f"  - {v['nombre']}: {v['porcentaje']}% ({v['criticos']} críticos) -> Posible: {v['posible']}")

    # Probar las 6 figuras para el CSV real
    for v in vistas:
        fig_r = client.post("/api/analisis/figura", headers=hdr, json={"analysis_id": aid_csv, "vista": v})
        assert fig_r.status_code == 200
        assert fig_r.content.startswith(b"\x89PNG")
    print(f"[MEMORIA Paso 2.2 - Tras 6 figuras]: {get_process_memory_mb():.2f} MB")

    # Probar filtro por persistencia y tipo
    run_filt = client.post(
        "/api/analisis/ejecutar",
        headers=hdr,
        json={
            "filas": rows_csv,
            "talud": {"nombre": "Pared W", "buz": 80.0, "dirbuz": 90.0},
            "parametros": {"phi": 32.0, "ll_planar": 20.0, "ll_flexural": 20.0, "ll_directo": 20.0},
            "filtro": {"tipos": ["JN"], "persistencia_min": 25.0},
            "umbral": 5.0,
            "vista": "cuna",
        },
    )
    assert run_filt.status_code == 200
    r_filt = run_filt.json()
    assert r_filt["contexto"]["n_datos"] <= len(rows_csv)
    print(f"[MEMORIA Paso 2.3 - Tras ejecutar filtro]: {get_process_memory_mb():.2f} MB")

    # Exportación completa del caso real
    exp_zip_real = client.post(
        "/api/analisis/exportar/zip",
        headers=hdr,
        json={"analysis_id": aid_csv, "umbral": 5.0},
    )
    assert exp_zip_real.status_code == 200
    print(f"[MEMORIA Paso 2.4 - Tras exportar zip]: {get_process_memory_mb():.2f} MB")
    with zipfile.ZipFile(io.BytesIO(exp_zip_real.content), "r") as z:
        assert any("resultados.xlsx" in a for a in z.namelist())
        assert any("roseta.png" in a for a in z.namelist())

    mem_caso2 = get_process_memory_mb()
    print(f"[MEMORIA] Fin Caso 2: {mem_caso2:.2f} MB")
    assert mem_caso2 < 450, f"Memoria excesiva tras Caso 2: {mem_caso2:.2f} MB"

    # =========================================================================
    # CASO 3: Archivo XLSX real (PRUEBA 01_Zona 01 pared W.xlsx)
    # =========================================================================
    if ORIGINAL_XLSX.exists():
        print(f"\n--- CASO 3: Archivo XLSX real ({ORIGINAL_XLSX.name}) ---")
        xlsx_bytes = ORIGINAL_XLSX.read_bytes()
        assert len(xlsx_bytes) <= 80 * 1024, f"XLSX supera 80 KB: {len(xlsx_bytes)} bytes"

        parse_xl = client.post(
            "/api/analisis/parse-archivo",
            headers=hdr,
            files={"file": (ORIGINAL_XLSX.name, xlsx_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
        assert parse_xl.status_code == 200
        p_xl_data = parse_xl.json()
        assert len(p_xl_data["rows"]) > 0
        print(f"Filas leídas de XLSX: {len(p_xl_data['rows'])}")

        run_xl = client.post(
            "/api/analisis/ejecutar",
            headers=hdr,
            json={"filas": p_xl_data["rows"], "umbral": 10.0, "vista": "general"},
        )
        assert run_xl.status_code == 200

    # =========================================================================
    # CASO 4: Validación estricta del límite de 80 KB
    # =========================================================================
    print("\n--- CASO 4: Validación de límite de tamaño (80 KB) ---")
    pesado_bytes = b"ID,Buz,DirBuz\n" + b"1,50,180\n" * 9000  # ~90 KB
    assert len(pesado_bytes) > 80 * 1024
    res_pesado = client.post(
        "/api/analisis/parse-archivo",
        headers=hdr,
        files={"file": ("archivo_pesado.csv", pesado_bytes, "text/csv")},
    )
    assert res_pesado.status_code == 413
    assert "80 KB" in res_pesado.json()["detail"]
    print("Respuesta correcta para archivo >80 KB: HTTP 413 con detalle 'supera el límite de 80 KB'")

    # =========================================================================
    # RESUMEN FINAL DE MEMORIA
    # =========================================================================
    mem_final = get_process_memory_mb()
    print(f"\n[MEMORIA] Memoria final tras todas las pruebas: {mem_final:.2f} MB")
    print(f"[MEMORIA] Incremento neto: {mem_final - mem_inicial:.2f} MB")
    assert mem_final < 400, f"Memoria final excedió el umbral seguro de 400 MB: {mem_final:.2f} MB"
