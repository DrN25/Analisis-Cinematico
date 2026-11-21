"""Punto de entrada FastAPI para GEMA-Cinemático."""
import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import SYSTEM_CODE, get_cors_origins
from app.database import engine
from app.routers.admin import router as admin_router
from app.routers.analisis import router as analisis_router
from app.routers.auth import router as auth_router

app = FastAPI(
    title="Análisis Cinemático API",
    description="API de análisis cinemático de taludes (Dips v9) con autenticación y gestión de usuarios.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["Autenticación"])
app.include_router(admin_router, prefix="/api/admin", tags=["Administración"])
app.include_router(analisis_router, prefix="/api/analisis", tags=["Análisis Cinemático"])


@app.exception_handler(Exception)
async def global_exception_handler(_: Request, exc: Exception):
    """Garantiza que cualquier error 500 no capturado incluya cabeceras CORS legibles."""
    return JSONResponse(
        status_code=500,
        content={"detail": f"Error interno en el servidor: {str(exc)}"},
    )


@app.get("/")
def read_root():
    return {"status": "online", "service": "Análisis Cinemático API", "sistema": SYSTEM_CODE}


@app.get("/api/health")
def health_check():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "online", "bd": "ok", "sistema": SYSTEM_CODE}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Base de datos no disponible") from exc
