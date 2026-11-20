"""Pruebas de integración de la API FastAPI sobre SQLite temporal aislado."""
import importlib
import io
import os
import sys
import zipfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_health(api_env):
    client, _, _ = api_env
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["bd"] == "ok"
    assert res.json()["sistema"] == "cinematico"


def test_login_aislamiento_y_logs(api_env):
    client, SessionLocal, models = api_env

    # La clave del ADMIN de 'mapeo' NO debe autenticar en 'cinematico'
    bad = client.post("/api/auth/login", json={"username_or_email": "ADMIN", "password": "MapeoPass1!"})
    assert bad.status_code == 401

    # La clave del ADMIN de 'cinematico' SÍ autentica
    ok = client.post("/api/auth/login", json={"username_or_email": "ADMIN", "password": "Admin2026!"})
    assert ok.status_code == 200
    body = ok.json()
    assert body["user"]["usuario"] == "ADMIN"
    assert body["user"]["rol_nombre"] == "admin"
    token = body["access_token"]

    me = client.get("/api/auth/me", headers=_auth_header(token))
    assert me.status_code == 200
    assert me.json()["email"] == "admin.cinematico@gema.com"

    # Verificar rechazo sin token / token inválido
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers=_auth_header("invalid.jwt.token")).status_code == 401

    # Verificar que se guardaron LOGIN_FAIL y LOGIN_OK
    with SessionLocal() as db:
        acciones = [r.accion for r in db.query(models.LogAcceso).order_by(models.LogAcceso.log_id.asc()).all()]
    assert "LOGIN_FAIL" in acciones
    assert "LOGIN_OK" in acciones


def test_crud_usuarios_rbac_y_revocacion_token(api_env):
    client, _, _ = api_env
    admin_tok = client.post(
        "/api/auth/login", json={"username_or_email": "ADMIN", "password": "Admin2026!"}
    ).json()["access_token"]

    roles = client.get("/api/admin/roles", headers=_auth_header(admin_tok)).json()
    user_role_id = next(r["rol_id"] for r in roles if r["nombre"] == "usuario")

    # Crear usuario normal
    created = client.post(
        "/api/admin/usuarios",
        headers=_auth_header(admin_tok),
        json={
            "usuario": "GEO1",
            "email": "geo1@gema.com",
            "nombre_completo": "Geólogo Uno",
            "rol_id": user_role_id,
            "password": "ClaveUser1!",
        },
    )
    assert created.status_code == 201
    geo_id = created.json()["usuario_id"]

    # Protegido ADMIN no puede desactivarse
    users = client.get("/api/admin/usuarios", headers=_auth_header(admin_tok)).json()
    admin_id = next(u["usuario_id"] for u in users if u["usuario"] == "ADMIN")
    prot = client.patch(
        f"/api/admin/usuarios/{admin_id}/estado",
        headers=_auth_header(admin_tok),
        json={"estado": "I"},
    )
    assert prot.status_code == 400

    # Usuario normal autentica, no puede acceder a /api/admin/* (403)
    user_tok = client.post(
        "/api/auth/login", json={"username_or_email": "GEO1", "password": "ClaveUser1!"}
    ).json()["access_token"]
    assert client.get("/api/admin/logs", headers=_auth_header(user_tok)).status_code == 403
    assert client.get("/api/admin/usuarios", headers=_auth_header(user_tok)).status_code == 403

    # Cambio de contraseña revoca token anterior
    chg = client.post(
        "/api/auth/change-password",
        headers=_auth_header(user_tok),
        json={"old_password": "ClaveUser1!", "new_password": "NuevaClave2!"},
    )
    assert chg.status_code == 200
    assert client.get("/api/auth/me", headers=_auth_header(user_tok)).status_code == 401

    # Nuevo login funciona; luego admin lo edita y desactiva
    user_tok2 = client.post(
        "/api/auth/login", json={"username_or_email": "geo1@gema.com", "password": "NuevaClave2!"}
    ).json()["access_token"]
    assert client.get("/api/auth/me", headers=_auth_header(user_tok2)).status_code == 200

    upd = client.put(
        f"/api/admin/usuarios/{geo_id}",
        headers=_auth_header(admin_tok),
        json={"nombre_completo": "Geólogo Editado"},
    )
    assert upd.status_code == 200
    assert upd.json()["nombre_completo"] == "Geólogo Editado"

    off = client.patch(
        f"/api/admin/usuarios/{geo_id}/estado",
        headers=_auth_header(admin_tok),
        json={"estado": "I"},
    )
    assert off.status_code == 200
    assert client.get("/api/auth/me", headers=_auth_header(user_tok2)).status_code == 401


def test_flujo_analisis_figuras_export_y_logs(api_env):
    client, _, _ = api_env
    tok = client.post(
        "/api/auth/login", json={"username_or_email": "ADMIN", "password": "Admin2026!"}
    ).json()["access_token"]
    hdr = _auth_header(tok)

    # 1. Cargar ejemplo
    ej = client.get("/api/analisis/ejemplo", headers=hdr)
    assert ej.status_code == 200
    rows = ej.json()["rows"]
    assert len(rows) == 36

    # 2. Parse archivo CSV subido
    csv_bytes = b"ID,Buz,DirBuz,Tipo,Persistencia\nP1,50,180,Diaclasa,4.5\nP2,95,180,Falla,2.0\n"
    parsed = client.post(
        "/api/analisis/parse-archivo",
        headers=hdr,
        files={"file": ("prueba.csv", csv_bytes, "text/csv")},
    )
    assert parsed.status_code == 200
    assert len(parsed.json()["rows"]) == 1
    assert len(parsed.json()["descartadas"]) == 1

    # 3. Ejecutar análisis completo
    run = client.post(
        "/api/analisis/ejecutar",
        headers=hdr,
        json={"filas": rows, "umbral": 10.0, "vista": "general"},
    )
    assert run.status_code == 200
    data = run.json()
    aid = data["analysis_id"]
    assert len(data["veredictos"]) == 4
    assert len(data["figura_base64"]) > 1000

    # 4. Las 6 vistas de /figura
    for vista in ("general", "planar", "cuna", "flexural", "directo", "roseta"):
        fig = client.post(
            "/api/analisis/figura",
            headers=hdr,
            json={"analysis_id": aid, "vista": vista},
        )
        assert fig.status_code == 200
        assert fig.headers["content-type"].startswith("image/png")
        assert fig.content[:4] == b"\x89PNG"

    # 5. Exportaciones Excel, PNG, ZIP
    ex = client.post("/api/analisis/exportar/excel", headers=hdr, json={"analysis_id": aid, "umbral": 10.0})
    assert ex.status_code == 200 and len(ex.content) > 5000

    png = client.post("/api/analisis/exportar/png", headers=hdr, json={"analysis_id": aid, "vista": "planar"})
    assert png.status_code == 200 and png.content[:4] == b"\x89PNG"

    zp = client.post("/api/analisis/exportar/zip", headers=hdr, json={"analysis_id": aid, "umbral": 10.0})
    assert zp.status_code == 200
    names = zipfile.ZipFile(io.BytesIO(zp.content)).namelist()
    assert len(names) == 9

    cuna_xlsx = client.post("/api/analisis/exportar/cuna-excel", headers=hdr, json={"analysis_id": aid})
    assert cuna_xlsx.status_code == 200 and len(cuna_xlsx.content) > 2000

    for tbl in ("resumen_porcentajes", "cuna", "planar", "directo_z12"):
        tbl_csv = client.post(f"/api/analisis/exportar/tabla-csv/{tbl}", headers=hdr, json={"analysis_id": aid})
        assert tbl_csv.status_code == 200 and len(tbl_csv.content) > 20

    # 6. Logs admin y CSV
    logs_res = client.get("/api/admin/logs?limit=100", headers=hdr)
    assert logs_res.status_code == 200
    logs_json = logs_res.json()
    assert logs_json["kpis"]["analisis_7d"] >= 1
    assert logs_json["kpis"]["descargas_7d"] >= 3
    acciones = {item["accion"] for item in logs_json["items"]}
    assert {"ANALISIS", "EXPORT_EXCEL", "EXPORT_PNG", "EXPORT_ZIP"}.issubset(acciones)

    csv_res = client.get("/api/admin/logs/csv?accion=ANALISIS", headers=hdr)
    assert csv_res.status_code == 200
    assert "ANALISIS" in csv_res.text
