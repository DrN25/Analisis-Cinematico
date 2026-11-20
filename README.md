# GEMA-Cinemático — Análisis Cinemático de Taludes (Dips v9)

Sistema desacoplado **Frontend (React + Tailwind)** + **Backend (FastAPI + motor Dips v9)** conectado a la base de datos compartida `db_ad0a4f_gema` (SQL Server), con autenticación JWT, administración de usuarios por sistema y auditoría de accesos (`auth.LogsAcceso`).

## Estructura

```text
GEMA-Cinematico/
├── backend/
│   ├── app/                # FastAPI, modelos SQLAlchemy, auth, logs y router cinemático
│   ├── cinematica/         # Motor puro de cálculo Dips v9
│   ├── estereograma/       # Gráficos Matplotlib
│   ├── salidas/            # Exportadores Excel, PNG y ZIP
│   ├── datos_ejemplo/      # discontinuidades_ejemplo.csv
│   ├── migrations/         # 001_cinematico_auth_y_logs.sql
│   ├── pruebas/            # pytest (validación Dips + API)
│   ├── Dockerfile          # Contenedor con unixodbc + msodbcsql17
│   └── run.py              # Arranque local en puerto 8002
├── frontend/
│   ├── src/                # React + TypeScript + Tailwind (interfaz compacta tipo Dips)
│   ├── netlify.toml        # Configuración lista para Netlify
│   └── vite.config.ts      # Proxy local /api -> :8002 (puerto 5175)
└── docker-compose.yml      # Backend + perfil opcional cloudflared (Cloudflare Tunnel)
```

## Credenciales iniciales

- **Sistema en BD:** `cinematico` (`GEMA-Cinemático`)
- **Usuario administrador inicial:** `ADMIN`
- **Contraseña inicial:** `Admin2026!` *(cámbiala tras el primer ingreso desde el ícono de llave)*

## Ejecución local

### 1. Backend (puerto 8002)
```bash
cd backend
pip install -r requirements.txt
# Configura backend/.env (ya basado en .env.example)
python run.py
```
Pruebas automatizadas:
```bash
cd backend
python -m pytest pruebas -v
```

### 2. Frontend (puerto 5175)
```bash
cd frontend
npm install
npm run dev
```

## Despliegue en producción

### Backend en DigitalOcean + Cloudflare Tunnel (24/7)
1. Copia la carpeta del proyecto en el Droplet (`docker` + `docker compose`).
2. Configura `backend/.env` con `CORS_ORIGINS=https://tu-sitio.netlify.app`, un `JWT_SECRET_KEY` seguro y las credenciales de SQL Server.
3. Crea un túnel en Cloudflare Zero Trust apuntando el subdominio (ej. `https://api-cinematico.tudominio.com`) hacia `http://backend:8002` y coloca el token en `.env` raíz (`CLOUDFLARE_TUNNEL_TOKEN=...`).
4. Levanta ambos servicios:
   ```bash
   docker compose --profile tunnel up -d --build
   ```

### Frontend en Netlify
1. Conecta `frontend/` en Netlify (base directory: `frontend`, build command: `npm run build`, publish directory: `dist`).
2. Define la variable de entorno en Netlify:
   - `VITE_API_BASE=https://api-cinematico.tudominio.com`
