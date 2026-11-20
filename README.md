# Análisis Cinemático de Taludes (Dips v9)

Sistema web para análisis de estabilidad cinemática de taludes en roca según criterios de Rocscience Dips v9 (rotura planar, rotura en cuña, toppling flexural y toppling directo), con proyección estereográfica interactiva, editor de discontinuidades, exportaciones (Excel, PNG, ZIP, Cuña), autenticación JWT y auditoría de accesos.

---

## Estructura del Proyecto

```text
GEMA-Cinematico/
├── backend/
│   ├── app/                # FastAPI, modelos SQLAlchemy, autenticación y auditoría
│   ├── cinematica/         # Motor de cálculo Dips v9 (geometría esférica, cuñas, toppling)
│   ├── estereograma/       # Gráficos estereográficos y rosetas de rumbos
│   ├── salidas/            # Exportadores Excel, PNG y ZIP
│   ├── datos_ejemplo/      # Dataset de prueba con 36 discontinuidades
│   ├── pruebas/            # Suite de pruebas automatizadas (pytest)
│   ├── Dockerfile          # Contenedor Linux con driver ODBC 17 para SQL Server
│   └── run.py              # Script de ejecución local (puerto 8002)
├── frontend/
│   ├── src/                # Interfaz en React + TypeScript + Tailwind CSS
│   ├── public/             # Recursos estáticos y reglas _redirects para SPA
│   ├── netlify.toml        # Configuración para despliegue directo de frontend en Netlify
│   └── vite.config.ts      # Proxy de desarrollo local (/api -> :8002)
├── render.yaml             # Blueprint de despliegue automático en Render (Docker)
├── netlify.toml            # Configuración para despliegue desde la raíz en Netlify
└── Dockerfile              # Dockerfile raíz para despliegues directos
```

---

## Despliegue en Render (Backend)

Render ejecuta el backend en un contenedor Docker con Debian Bookworm y Microsoft ODBC Driver 17 preinstalado para conectar con SQL Server.

### Opción A: Despliegue automático con Blueprint (Recomendado)
1. En Render, crea un nuevo **Blueprint**.
2. Conecta este repositorio. Render detectará automáticamente `render.yaml`.
3. Completa las variables de base de datos solicitadas:
   - `DB_SERVER`: Servidor SQL Server (ej. `sql8012.site4now.net`).
   - `DB_NAME`: Nombre de la base de datos (ej. `db_ad0a4f_gema`).
   - `DB_USER`: Usuario de base de datos.
   - `DB_PASSWORD`: Contraseña del usuario.
4. Render generará automáticamente un `JWT_SECRET_KEY` seguro y compilará la imagen.

### Opción B: Despliegue manual como Web Service
1. En Render, presiona **New +** → **Web Service**.
2. Conecta el repositorio de GitHub/GitLab.
3. Configura:
   - **Environment:** `Docker`
   - **Root Directory:** `backend` (o déjalo en blanco para usar la raíz)
   - **Dockerfile Path:** `Dockerfile`
4. Agrega las **Environment Variables**:
   - `DB_SERVER`: `sql8012.site4now.net`
   - `DB_NAME`: `db_ad0a4f_gema`
   - `DB_USER`: `tu_usuario`
   - `DB_PASSWORD`: `tu_password`
   - `DB_DRIVER`: `ODBC Driver 17 for SQL Server`
   - `DB_TRUSTED`: `no`
   - `SYSTEM_CODE`: `cinematico`
   - `ACCESS_TOKEN_EXPIRE_MINUTES`: `720`
   - `JWT_SECRET_KEY`: `(genera una clave aleatoria de 32+ caracteres)`
   - `CORS_ORIGINS`: `*` (o la URL de tu frontend en Netlify: `https://tu-app.netlify.app`)
5. Guarda y despliega. Al finalizar, copia la URL asignada (ej. `https://cinematico-backend.onrender.com`).

---

## Despliegue en Netlify (Frontend)

El frontend es una aplicación React (Vite) de una sola página (SPA).

1. En Netlify, presiona **Add new site** → **Import an existing project**.
2. Conecta este repositorio.
3. La configuración se detecta automáticamente gracias a `netlify.toml`:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. En **Environment variables**, agrega:
   - `VITE_API_BASE`: La URL de tu backend en Render (ej. `https://cinematico-backend.onrender.com`).
5. Presiona **Deploy site**.

---

## Ejecución Local

### 1. Backend (puerto 8002)
```bash
cd backend
pip install -r requirements.txt
# Copia backend/.env.example a backend/.env y completa tus credenciales
python run.py
```

Para correr las pruebas automáticas:
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

---

## Credenciales Iniciales de Prueba

- **Usuario:** `ADMIN`
- **Contraseña:** `Admin2026!`
