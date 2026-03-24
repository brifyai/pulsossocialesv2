#!/bin/bash
# Script para ejecutar los archivos UPSERT en la base de datos
# Uso: ./execute_upsert_batches.sh [host] [puerto] [usuario] [base_de_datos]

# Configuración por defecto
HOST="${1:-localhost}"
PORT="${2:-5432}"
USER="${3:-postgres}"
DB="${4:-postgres}"

# Directorio con los archivos UPSERT
UPSERT_DIR="/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches_upsert"

# Verificar que el directorio existe
if [ ! -d "$UPSERT_DIR" ]; then
    echo "Error: No se encuentra el directorio $UPSERT_DIR"
    exit 1
fi

# Contar archivos
total_files=$(ls -1 "$UPSERT_DIR"/insert_agents_batch_*_enriched_upsert.sql 2>/dev/null | wc -l)

if [ "$total_files" -eq 0 ]; then
    echo "Error: No se encontraron archivos UPSERT en $UPSERT_DIR"
    exit 1
fi

echo "=========================================="
echo "Ejecutando archivos UPSERT"
echo "Host: $HOST:$PORT"
echo "Usuario: $USER"
echo "Base de datos: $DB"
echo "Total archivos: $total_files"
echo "=========================================="
echo ""

# Contador
executed=0
failed=0

# Ejecutar cada archivo
for sql_file in "$UPSERT_DIR"/insert_agents_batch_*_enriched_upsert.sql; do
    filename=$(basename "$sql_file")
    executed=$((executed + 1))

    echo "[$executed/$total_files] Ejecutando: $filename"

    # Ejecutar el archivo SQL
    if PGPASSWORD="${PGPASSWORD}" psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -f "$sql_file" 2>&1 | grep -q "ERROR"; then
        echo "  ❌ Error al ejecutar $filename"
        failed=$((failed + 1))
    else
        echo "  ✅ Completado"
    fi
done

echo ""
echo "=========================================="
echo "Proceso completado"
echo "Archivos ejecutados: $executed"
echo "Errores: $failed"
echo "=========================================="

if [ "$failed" -gt 0 ]; then
    exit 1
fi
