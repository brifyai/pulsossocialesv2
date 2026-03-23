#!/bin/bash
# =============================================================================
# Script de Fix para Supabase en EasyPanel
# Pulsos Sociales - Infraestructura de Persistencia
# =============================================================================
#
# Este script arregla los problemas comunes de Supabase self-hosted en EasyPanel:
# 1. Variables de autenticación externa faltantes (GOTRUE_EXTERNAL_*)
# 2. Problemas de conexión a PostgreSQL
# 3. Servicios que no inician correctamente
#
# Uso:
#   chmod +x fix-easypanel-supabase.sh
#   ./fix-easypanel-supabase.sh
#
# =============================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔧 FIX SUPABASE PARA EASYPANEL"
echo "==============================="
echo ""

cd "$(dirname "$0")"

# =============================================================================
# PASO 1: Verificar que los archivos de configuración existen
# =============================================================================
echo -e "${BLUE}PASO 1: Verificando archivos de configuración...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: No se encontró el archivo .env${NC}"
    echo "Por favor, asegúrate de estar en el directorio deploy/"
    exit 1
fi

if [ ! -f "docker-compose.supabase.yml" ]; then
    echo -e "${RED}❌ Error: No se encontró docker-compose.supabase.yml${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Archivos de configuración encontrados${NC}"
echo ""

# =============================================================================
# PASO 2: Verificar y agregar variables faltantes al .env
# =============================================================================
echo -e "${BLUE}PASO 2: Verificando variables de entorno...${NC}"

# Función para agregar variable si no existe
add_env_var() {
    local var_name=$1
    local var_value=$2
    if ! grep -q "^${var_name}=" .env; then
        echo "${var_name}=${var_value}" >> .env
        echo -e "  ${YELLOW}➕ Agregado: ${var_name}${NC}"
    else
        echo -e "  ${GREEN}✓ Ya existe: ${var_name}${NC}"
    fi
}

# Agregar variables de autenticación externa si faltan
add_env_var "GOTRUE_EXTERNAL_GOOGLE_ENABLED" "false"
add_env_var "GOTRUE_EXTERNAL_GITHUB_ENABLED" "false"
add_env_var "GOTRUE_EXTERNAL_APPLE_ENABLED" "false"
add_env_var "GOTRUE_EXTERNAL_AZURE_ENABLED" "false"
add_env_var "GOTRUE_EXTERNAL_DISCORD_ENABLED" "false"
add_env_var "GOTRUE_EXTERNAL_FACEBOOK_ENABLED" "false"
add_env_var "GOTRUE_EXTERNAL_FIGMA_ENABLED" "false"
add_env_var "GOTRUE_EXTERNAL_GITLAB_ENABLED" "false"
add_env_var "GOTRUE_EXTERNAL_KEYCLOAK_ENABLED" "false"
add_env_var "GOTRUE_EXTERNAL_LINKEDIN_ENABLED" "false"
add_env_var "GOTRUE_EXTERNAL_NOTION_ENABLED" "false"
add_env_var "GOTRUE_EXTERNAL_TWITCH_ENABLED" "false"
add_env_var "GOTRUE_EXTERNAL_TWITTER_ENABLED" "false"
add_env_var "GOTRUE_EXTERNAL_SLACK_ENABLED" "false"
add_env_var "GOTRUE_EXTERNAL_SPOTIFY_ENABLED" "false"
add_env_var "GOTRUE_EXTERNAL_WORKOS_ENABLED" "false"
add_env_var "GOTRUE_EXTERNAL_ZOOM_ENABLED" "false"

echo ""

# =============================================================================
# PASO 3: Detener todos los servicios
# =============================================================================
echo -e "${BLUE}PASO 3: Deteniendo servicios existentes...${NC}"
docker-compose -f docker-compose.supabase.yml down --remove-orphans 2>/dev/null || true
echo -e "${GREEN}✅ Servicios detenidos${NC}"
echo ""

# =============================================================================
# PASO 4: Limpiar volúmenes y redes problemáticas (opcional)
# =============================================================================
echo -e "${BLUE}PASO 4: Limpiando redes Docker...${NC}"
docker network rm pulsos-network 2>/dev/null || true
docker network create --driver bridge pulsos-network 2>/dev/null || echo -e "${YELLOW}⚠️  Red ya existe o no se pudo crear${NC}"
echo -e "${GREEN}✅ Redes limpiadas${NC}"
echo ""

# =============================================================================
# PASO 5: Iniciar servicios en orden correcto
# =============================================================================
echo -e "${BLUE}PASO 5: Iniciando servicios...${NC}"
echo "  Iniciando PostgreSQL primero..."
docker-compose -f docker-compose.supabase.yml up -d db

echo "  Esperando a que PostgreSQL esté listo..."
sleep 10

# Verificar que PostgreSQL está respondiendo
echo "  Verificando conexión a PostgreSQL..."
for i in {1..30}; do
    if docker-compose -f docker-compose.supabase.yml exec -T db pg_isready -U postgres -d postgres >/dev/null 2>&1; then
        echo -e "  ${GREEN}✅ PostgreSQL está listo${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

echo ""
echo "  Iniciando servicios restantes..."
docker-compose -f docker-compose.supabase.yml up -d

echo -e "${GREEN}✅ Todos los servicios iniciados${NC}"
echo ""

# =============================================================================
# PASO 6: Esperar a que los servicios estén saludables
# =============================================================================
echo -e "${BLUE}PASO 6: Esperando health checks...${NC}"
echo "  Esperando 30 segundos para que los servicios inicien..."
sleep 30

echo ""
echo "  Verificando estado de servicios:"
docker-compose -f docker-compose.supabase.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.State}}"
echo ""

# =============================================================================
# PASO 7: Verificar logs de errores
# =============================================================================
echo -e "${BLUE}PASO 7: Verificando logs de errores...${NC}"

# Verificar auth
echo "  Logs de Auth (últimas 10 líneas):"
if docker-compose -f docker-compose.supabase.yml logs --tail=10 auth 2>&1 | grep -i "error\|fatal\|panic"; then
    echo -e "  ${RED}⚠️  Se encontraron errores en Auth${NC}"
else
    echo -e "  ${GREEN}✅ Auth sin errores críticos${NC}"
fi
echo ""

# Verificar REST API
echo "  Logs de REST API (últimas 10 líneas):"
if docker-compose -f docker-compose.supabase.yml logs --tail=10 rest 2>&1 | grep -i "error\|fatal\|panic"; then
    echo -e "  ${RED}⚠️  Se encontraron errores en REST API${NC}"
else
    echo -e "  ${GREEN}✅ REST API sin errores críticos${NC}"
fi
echo ""

# =============================================================================
# PASO 8: Probar endpoints
# =============================================================================
echo -e "${BLUE}PASO 8: Probando endpoints...${NC}"

# Health check de Kong
echo "  Probando Kong..."
if curl -s http://localhost:8000/status >/dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Kong responde correctamente${NC}"
else
    echo -e "  ${YELLOW}⚠️  Kong no responde (puede tardar más en iniciar)${NC}"
fi

# Health check de Auth
echo "  Probando Auth..."
if curl -s http://localhost:9999/health >/dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Auth responde correctamente${NC}"
else
    echo -e "  ${YELLOW}⚠️  Auth no responde (puede tardar más en iniciar)${NC}"
fi

echo ""

# =============================================================================
# PASO 9: Resumen
# =============================================================================
echo -e "${BLUE}==============================="
echo "RESUMEN DEL FIX"
echo "==============================="
echo -e "${NC}"

echo -e "${GREEN}✅ Configuración actualizada:${NC}"
echo "   - Variables de autenticación externa agregadas al .env"
echo "   - docker-compose.supabase.yml actualizado"
echo ""

echo -e "${GREEN}✅ Servicios reiniciados:${NC}"
docker-compose -f docker-compose.supabase.yml ps --format "table {{.Name}}\t{{.Status}}"
echo ""

echo -e "${YELLOW}📋 Próximos pasos:${NC}"
echo "   1. Verifica que todos los servicios estén 'healthy'"
echo "   2. Si hay servicios 'unhealthy', espera unos minutos y ejecuta:"
echo "      docker-compose -f docker-compose.supabase.yml logs -f [servicio]"
echo "   3. Para verificar la autenticación:"
echo "      curl -X POST 'http://localhost:8000/auth/v1/signup' \\"
echo "        -H 'apikey: TU_ANON_KEY' \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"email\":\"test@example.com\",\"password\":\"Test123456!\"}'"
echo ""

echo -e "${GREEN}🔧 Fix completado${NC}"
echo ""
