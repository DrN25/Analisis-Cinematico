"""Configuración de fixtures compartidos para pruebas de FastAPI y SQLAlchemy."""
import importlib
import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


@pytest.fixture(scope="session")
def api_env(tmp_path_factory):
    db_file = tmp_path_factory.mktemp("db") / "test_cinematico.db"
    os.environ["DATABASE_URL"] = f"sqlite:///{db_file.as_posix()}"
    os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-pytest-only-1234567890"
    os.environ["SYSTEM_CODE"] = "cinematico"

    import app.config
    import app.database
    import app.deps
    import app.main
    import app.models
    import app.security

    importlib.reload(app.config)
    importlib.reload(app.database)
    importlib.reload(app.models)
    importlib.reload(app.security)
    importlib.reload(app.deps)
    importlib.reload(app.main)

    app.models.Base.metadata.create_all(bind=app.database.engine)

    with app.database.SessionLocal() as db:
        sis_mapeo = app.models.Sistema(codigo="mapeo", nombre="GEMA-Mapeo", estado="A")
        sis_cin = app.models.Sistema(codigo="cinematico", nombre="GEMA-Cinemático", estado="A")
        db.add_all([sis_mapeo, sis_cin])
        db.flush()

        rol_m_admin = app.models.Role(
            sistema_id=sis_mapeo.sistema_id, nombre="admin", protegido=True, estado="A"
        )
        rol_c_admin = app.models.Role(
            sistema_id=sis_cin.sistema_id, nombre="admin", protegido=True, estado="A"
        )
        rol_c_user = app.models.Role(
            sistema_id=sis_cin.sistema_id, nombre="usuario", protegido=False, estado="A"
        )
        db.add_all([rol_m_admin, rol_c_admin, rol_c_user])
        db.flush()

        u_mapeo_admin = app.models.Usuario(
            sistema_id=sis_mapeo.sistema_id,
            rol_id=rol_m_admin.rol_id,
            protegido=True,
            usuario="ADMIN",
            email="admin@gema.com",
            contrasena_hash=app.security.hash_password("MapeoPass1!"),
            estado="A",
        )
        u_cin_admin = app.models.Usuario(
            sistema_id=sis_cin.sistema_id,
            rol_id=rol_c_admin.rol_id,
            protegido=True,
            usuario="ADMIN",
            email="admin.cinematico@gema.com",
            contrasena_hash=app.security.hash_password("Admin2026!"),
            nombre_completo="Admin Cinemático",
            estado="A",
        )
        db.add_all([u_mapeo_admin, u_cin_admin])
        db.commit()

    client = TestClient(app.main.app)
    return client, app.database.SessionLocal, app.models
