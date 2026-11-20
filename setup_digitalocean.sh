#!/usr/bin/env bash
# ==============================================================================
# Script de Despliegue Automático de GEMA Cinemático en DigitalOcean Droplet
# Compatible con Ubuntu 22.04 / 24.04 LTS (x86_64)
# ==============================================================================
set -e

echo "=========================================================="
echo "  Iniciando configuración de GEMA Cinemático Backend"
echo "=========================================================="

# 1. Actualizar paquetes del sistema
echo "--> [1/5] Actualizando paquetes del sistema..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git ufw fail2ban

# 2. Instalar Docker y Docker Compose si no están instalados
echo "--> [2/5] Verificando / Instalando Docker..."
if ! command -v docker &> /dev/null; then
    echo "Instalando Docker oficial..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# 3. Configurar cortafuegos (UFW)
echo "--> [3/5] Configurando cortafuegos UFW..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 8002/tcp comment 'GEMA Cinemático API'
ufw --force enable

# 4. Asegurar archivo .env
echo "--> [4/5] Verificando variables de entorno backend/.env..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo "--> Se creó backend/.env a partir de .env.example."
        echo "--> ¡IMPORTANTE! Edita backend/.env con las credenciales de tu base de datos."
    else
        cat << 'EOF' > backend/.env
DB_SERVER=sql8012.site4now.net
DB_NAME=db_ad0a4f_gema
DB_TRUSTED=no
DB_USER=
DB_PASSWORD=
DB_DRIVER=ODBC Driver 17 for SQL Server
SYSTEM_CODE=cinematico
JWT_SECRET_KEY=cambia-esta-clave-secreta-larga-y-aleatoria
ACCESS_TOKEN_EXPIRE_MINUTES=720
CORS_ORIGINS=*
HOST=0.0.0.0
PORT=8002
EOF
        echo "--> Se generó backend/.env base."
    fi
fi

# 5. Construir y levantar contenedores con Docker Compose
echo "--> [5/5] Construyendo e iniciando contenedor de backend..."
docker compose build --no-cache backend
docker compose up -d backend

# Obtener IP pública
IP_PUBLICA=$(curl -s https://ifconfig.me || curl -s https://api.ipify.org || echo "IP_DEL_DROPLET")

echo ""
echo "=========================================================="
echo "  ¡Despliegue completado con éxito!"
echo "=========================================================="
echo "Estado del contenedor:"
docker compose ps
echo ""
echo "Comprobando endpoint de salud:"
sleep 3
curl -s "http://127.0.0.1:8002/api/health" || echo "Iniciando..."
echo ""
echo "Enlaces de acceso:"
echo "  - Documentación Swagger: http://${IP_PUBLICA}:8002/docs"
echo "  - API Health:            http://${IP_PUBLICA}:8002/api/health"
echo ""
echo "Recuerda:"
echo "1. Para ver logs en vivo:       docker compose logs -f backend"
echo "2. Para reiniciar el servicio:  docker compose restart backend"
echo "3. Para actualizar con git:     git pull && docker compose up -d --build backend"
echo "=========================================================="
