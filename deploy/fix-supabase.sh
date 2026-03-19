#!/bin/bash
# Script de auto-reparación para Supabase
# Ejecutar en el servidor donde está desplegado Supabase

set -e

echo "🔧 SUPABASE AUTO-REPAIR SCRIPT"
echo "================================"
echo ""

cd "$(dirname "$0")"

# Función para verificar si un contenedor está corriendo
is_running() {
    docker-compose -f docker-compose.supabase.yml ps -q "$1" > /dev/null 2>&1
}

# Función para verificar healthcheck
is_healthy() {
    docker-compose -f docker-compose.supabase.yml exec -T "$1" wget -qO- http://localhost:$2/health > /dev/null 2>&1
}

echo "1️⃣  Verificando estado actual..."
docker-compose -f docker-compose.supabase.yml ps

echo ""
echo "2️⃣  Reiniciando servicios en orden correcto..."

# Detener todos los servicios
echo "   → Deteniendo servicios..."
docker-compose -f docker-compose.supabase.yml down

# Limpiar redes huérfanas
echo "   → Limpiando redes..."
docker network prune -f

# Iniciar base de datos primero
echo "   → Iniciando base de datos..."
docker-compose -f docker-compose.supabase.yml up -d db

# Esperar a que la base de datos esté saludable
echo "   → Esperando base de datos (30s)..."
sleep 30

# Verificar que db esté lista
if ! docker-compose -f docker-compose.supabase.yml exec -T db pg_isready -U postgres > /dev/null 2>&1; then
    echo "   ❌ Base de datos no responde, esperando más..."
    sleep 30
fi

# Iniciar auth
echo "   → Iniciando servicio de auth..."
docker-compose -f docker-compose.supabase.yml up -d auth

# Esperar a que auth esté listo
echo "   → Esperando auth (15s)..."
sleep 15

# Iniciar resto de servicios
echo "   → Iniciando servicios restantes..."
docker-compose -f docker-compose.supabase.yml up -d kong rest realtime storage meta studio

echo ""
echo "3️⃣  Verificando estado final..."
sleep 10
docker-compose -f docker-compose.supabase.yml ps

echo ""
echo "4️⃣  Test de conectividad..."

# Test de health
echo "   → Testeando /auth/v1/health..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/auth/v1/health | grep -q "401"; then
    echo "   ✅ Auth responde correctamente (401 = requiere API key)"
else
    echo "   ⚠️  Auth no responde como se esperaba"
fi

echo ""
echo "================================"
echo "✅ Proceso de reparación completado"
echo ""
echo "Si el problema persiste, revisar logs:"
echo "  docker-compose -f docker-compose.supabase.yml logs auth --tail 50"
