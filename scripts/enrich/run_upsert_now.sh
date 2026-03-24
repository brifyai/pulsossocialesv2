#!/bin/bash
# Script para ejecutar los archivos UPSERT en Supabase
# Usa la contraseña proporcionada

# Configuración de Supabase (ajusta estos valores según tu configuración)
HOST="db.pulsos-sociales-v2-0gh5wg0p7-brifyais-projects.vercel.app"
PORT="5432"
USER="postgres"
DB="postgres"

# Contraseña (proporcionada por el usuario)
export PGPASSWORD="this_password_is_insecure_and_should_be_updated"

# Directorio con los archivos UPSERT
UPSERT_DIR="/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches_upsert"

echo "=========================================="
echo "Ejecutando archivos UPSERT en Supabase"
echo "Host: $HOST:$PORT"
echo "Usuario: $USER"
echo "Base de datos: $DB"
echo "=========================================="
echo ""

# Verificar que el directorio existe
if [ ! -d "$UPSERT_DIR" ]; then
    echo "❌ Error: No se encuentra el directorio $UPSERT_DIR"
    exit 1
fi

# Contar archivos
total_files=$(ls -1 "$UPSERT_DIR"/insert_agents_batch_*_enriched_upsert.sql 2>/dev/null | wc -l)

if [ "$total_files" -eq 0 ]; then
    echo "❌ Error: No se encontraron archivos UPSERT"
    exit 1
fi

echo "📁 Total archivos a ejecutar: $total_files"
echo ""

# Contador
executed=0
failed=0

# Ejecutar cada archivo
for sql_file in "$UPSERT_DIR"/insert_agents_batch_*_enriched_upsert.sql; do
    filename=$(basename "$sql_file")
    executed=$((executed + 1))

    echo "[$executed/$total_files] 🔄 Ejecutando: $filename"

    # Ejecutar el archivo SQL
    result=$(psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -f "$sql_file" 2>&1)
    exit_code=$?

    if [ $exit_code -ne 0 ]; then
        echo "  ❌ Error al ejecutar $filename"
        echo "     $result"
        failed=$((failed + 1))
    else
        # Contar cuántas filas fueron insertadas/actualizadas
        rows=$(echo "$result" | grep -oE '[0-9]+' | tail -1)
        echo "  ✅ Completado (Filas afectadas: ${rows:-N/A})"
    fi
done

echo ""
echo "=========================================="
echo "✅ Proceso completado"
echo "📊 Archivos ejecutados: $executed"
echo "❌ Errores: $failed"
echo "=========================================="

if [ "$failed" -gt 0 ]; then
    echo ""
    echo "⚠️  Algunos archivos fallaron. Revisa los errores arriba."
    exit 1
fi
