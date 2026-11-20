"""Conexión SQLAlchemy a SQL Server (db_ad0a4f_gema) con soporte SQLite para pruebas/local."""
import os
import urllib.parse
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

import app.config  # noqa: F401  (carga .env)


def _sqlite_engine(url: str):
    return create_engine(
        url,
        connect_args={"check_same_thread": False},
        execution_options={"schema_translate_map": {"auth": None}},
        pool_pre_ping=True,
    )


def build_engine(database_url: str | None = None):
    """Construye el engine de BD usando DATABASE_URL, SQL Server (ODBC) o fallback SQLite local."""
    url = (database_url or os.getenv("DATABASE_URL") or "").strip()
    if url:
        if url.startswith("sqlite"):
            eng = _sqlite_engine(url)
        else:
            eng = create_engine(url, pool_pre_ping=True)
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        return eng

    db_server = os.getenv("DB_SERVER", "localhost\\SQLEXPRESS")
    db_name = os.getenv("DB_NAME", "db_ad0a4f_gema")
    db_trusted = os.getenv("DB_TRUSTED", "no").lower() == "yes"
    db_user = os.getenv("DB_USER", "")
    db_password = os.getenv("DB_PASSWORD", "")

    drivers = []
    for drv in ["ODBC Driver 17 for SQL Server", "ODBC Driver 18 for SQL Server", os.getenv("DB_DRIVER", "")]:
        if drv and drv not in drivers:
            drivers.append(drv)

    for driver in drivers:
        try:
            auth_part = (
                "Trusted_Connection=yes;"
                if db_trusted
                else f"UID={db_user};PWD={db_password};"
            )
            conn_str = f"DRIVER={{{driver}}};SERVER={db_server};DATABASE={db_name};{auth_part}"
            if "Driver 18" in driver:
                conn_str += "TrustServerCertificate=yes;"
            params = urllib.parse.quote_plus(conn_str)
            eng = create_engine(f"mssql+pyodbc:///?odbc_connect={params}", pool_pre_ping=True)
            with eng.connect() as conn:
                conn.execute(text("SELECT 1 WHERE :x = :y"), {"x": "ok", "y": "ok"})
                inspect(eng).has_table("Usuarios", schema="auth")
            print(f"Conexión exitosa a SQL Server '{db_server}' ({db_name}) con '{driver}'.")
            return eng
        except Exception as exc:
            print(f"Aviso: fallo conexión SQL Server con '{driver}': {exc}")

    sqlite_path = Path(__file__).resolve().parent.parent / "cinematico_dev.db"
    print(f"ADVERTENCIA: usando SQLite local de respaldo en {sqlite_path}")
    return _sqlite_engine(f"sqlite:///{sqlite_path}")


engine = build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependencia FastAPI que entrega y cierra una sesión SQLAlchemy."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
