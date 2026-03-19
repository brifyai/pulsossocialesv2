#!/bin/bash
# Script de diagnóstico para Supabase
# Ejecutar en el servidor donde está desplegado Supabase

echo "🔍 SUPABASE DIAGNOSTIC SCRIPT"
echo "=============================="
echo ""

cd "$(dirname "$0")"

echo "1️⃣  ESTADO DE CONTENEDORES"
echo "---------------------------"
docker-compose -f docker-compose.supabase.yml ps
echo ""

echo "2️⃣  LOGS DEL SERVICIO AUTH (últimas 50 líneas)"
echo "-----------------------------------------------"
docker-compose -f docker-compose.supabase.yml logs --tail=50 auth 2>&1 || echo "No se pudieron obtener logs"
echo ""

echo "3️⃣  LOGS DE LA BASE DE DATOS (últimas 30 líneas)"
echo "-------------------------------------------------"
docker-compose -f docker-compose.supabase.yml logs --tail=30 db 2>&1 || echo "No se pudieron obtener logs"
echo ""

echo "4️⃣  REDES DOCKER"
echo "----------------"
docker network ls | grep -E "(pulsos|NETWORK)" || echo "No se encontraron redes"
echo ""

echo "5️⃣  TEST DE CONECTIVIDAD DNS"
echo "----------------------------"
echo "→ Verificando si auth puede resolver 'db':"
docker-compose -f docker-compose.supabase.yml exec -T auth nslookup db 2>&1 || echo "❌ nslookup falló"
echo ""

echo "6️⃣  TEST DE CONECTIVIDAD A BASE DE DATOS"
echo "----------------------------------------"
echo "→ Verificando conexión desde auth a db:5432:"
docker-compose -f docker-compose.supabase.yml exec -T auth timeout 5 bash -c "</dev/tcp/db/5432" 2>&1 && echo "✅ Conexión exitosa" || echo "❌ No se pudo conectar"
echo ""

echo "7️⃣  HEALTHCHECK INTERNO DE AUTH"
echo "-------------------------------"
echo "→ Consultando http://localhost:9999/health desde auth:"
docker-compose -f docker-compose.supabase.yml exec -T auth wget -qO- http://localhost:9999/health 2>&1 || echo "❌ Healthcheck falló"
echo ""

echo "8️⃣  VARIABLES DE ENTORNO DE AUTH"
echo "---------------------------------"
echo "→ GOTRUE_DB_DATABASE_URL:"
docker-compose -f docker-compose.supabase.yml exec -T auth env | grep GOTRUE_DB_DATABASE_URL | sed 's/password=[^@]*/password=***/' || echo "No se pudo obtener"
echo ""

echo "=============================="
echo "📋 DIAGNÓSTICO COMPLETADO"
echo ""
echo "Si necesitas ayuda, comparte la salida completa de este script."
