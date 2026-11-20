"""Configuración global del backend cargada desde variables de entorno (.env)."""
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SYSTEM_CODE = os.getenv("SYSTEM_CODE", "cinematico").strip() or "cinematico"
JWT_ISSUER = "gema-cinematico"
JWT_AUDIENCE = "gema-cinematico-api"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "720"))


def get_cors_origins() -> list[str]:
    """Devuelve lista de orígenes permitidos desde CORS_ORIGINS (separados por coma)."""
    raw = os.getenv("CORS_ORIGINS", "*").strip()
    if not raw or raw == "*":
        return ["*"]
    return [item.strip().rstrip("/") for item in raw.split(",") if item.strip()]
