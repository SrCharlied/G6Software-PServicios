#!/bin/bash
set -e

cd /app

echo "================================================"
echo "  PServicios - Backend Laravel"
echo "================================================"

# Generar .env desde variables de entorno de Docker
echo "[*] Configurando variables de entorno..."
cat > /app/.env <<EOF
APP_NAME=${APP_NAME:-PServicios}
APP_ENV=${APP_ENV:-local}
APP_KEY=${APP_KEY}
APP_DEBUG=${APP_DEBUG:-true}
APP_URL=${APP_URL:-http://localhost:8000}
DB_CONNECTION=${DB_CONNECTION:-pgsql}
DB_HOST=${DB_HOST:-db}
DB_PORT=${DB_PORT:-5432}
DB_DATABASE=${DB_DATABASE:-pservicios}
DB_USERNAME=${DB_USERNAME:-pservicios_user}
DB_PASSWORD=${DB_PASSWORD:-pservicios_secret}
CACHE_STORE=file
SESSION_DRIVER=file
EOF

echo "[*] Limpiando cache..."
php artisan config:clear

echo "================================================"
echo "  Backend listo en http://localhost:8000"
echo "  API disponible en http://localhost:8000/api"
echo "================================================"

# Iniciar servidor
php artisan serve --host=0.0.0.0 --port=8000
