#!/bin/bash
# Script para arreglar el servicio GoTrue (Auth) de Supabase
# Este script diagnostica y repara problemas comunes de conectividad

echo "🔧 FIX GOTRUE (Supabase Auth)"
echo "=============================="
echo ""

cd "$(dirname "$0")"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "1️⃣  Verificando estado de contenedores..."
echo "------------------------------------------"
docker-compose -f docker-compose.supabase.yml ps | grep -E "(auth|db|kong)" || echo "No se encontraron contenedores"
echo ""

echo "2️⃣  Verificando red Docker..."
echo "-----------------------------"
docker network ls | grep pulsos || echo "${RED}❌ Red pulsos-network no encontrada${NC}"
echo ""

echo "3️⃣  Reiniciando servicio de autenticación..."
echo "--------------------------------------------"
docker-compose -f docker-compose.supabase.yml restart auth
echo ""

sleep 5

echo "4️⃣  Verificando logs de auth..."
echo "--------------------------------"
docker-compose -f docker-compose.supabase.yml logs --tail=20 auth 2>&1
echo ""

echo "5️⃣  Probando endpoint de health..."
echo "-----------------------------------"
sleep 2
curl -s http://localhost:9999/health 2>&1 || echo "${RED}❌ Health check falló${NC}"
echo ""

echo "6️⃣  Probando registro..."
echo "------------------------"
TEST_RESULT=$(curl -s -X POST 'http://localhost:8000/auth/v1/signup' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456!"}' 2>&1)

if echo "$TEST_RESULT" | grep -q "id\|access_token"; then
    echo "${GREEN}✅ Registro funcionando correctamente${NC}"
    echo "$TEST_RESULT" | head -50
elif echo "$TEST_RESULT" | grep -q "name resolution"; then
    echo "${RED}❌ Error de resolución DNS persiste${NC}"
    echo "$TEST_RESULT"
    echo ""
    echo "${YELLOW}🔧 Aplicando fix de red...${NC}"
    
    # Recrear la red Docker
    docker network rm pulsos-network 2>/dev/null || true
    docker network create --driver bridge pulsos-network
    
    # Reiniciar todos los servicios
    echo "Reiniciando todos los servicios..."
    docker-compose -f docker-compose.supabase.yml down
    docker-compose -f docker-compose.supabase.yml up -d
    
    echo ""
    echo "Esperando 30 segundos para que los servicios inicien..."
    sleep 30
    
    # Verificar nuevamente
    echo ""
    echo "Verificando nuevamente..."
    curl -s -X POST 'http://localhost:8000/auth/v1/signup' \
      -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE" \
      -H "Content-Type: application/json" \
      -d '{"email":"test2@example.com","password":"Test123456!"}' 2>&1 | head -20
else
    echo "${YELLOW}⚠️  Respuesta inesperada:${NC}"
    echo "$TEST_RESULT"
fi

echo ""
echo "=============================="
echo "✅ Fix completado"
echo ""
echo "Para verificar el estado:"
echo "  docker-compose -f docker-compose.supabase.yml logs -f auth"
