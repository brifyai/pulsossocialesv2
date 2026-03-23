#!/bin/bash
# Script de Backup de PostgreSQL para Supabase Local
# Este script crea un backup completo de la base de datos usando pg_dump

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración
DB_HOST="localhost"
DB_PORT="5433"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="${POSTGRES_PASSWORD:-orEtSR4zbW32mh0oy/GqcMAS2XaPVC2IjW16LBJfsYw=}"

# Crear directorio de backup con timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="backups/backup-${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}BACKUP DE POSTGRESQL - SUPABASE${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Host: $DB_HOST:$DB_PORT"
echo "Base de datos: $DB_NAME"
echo "Usuario: $DB_USER"
echo "Directorio: $BACKUP_DIR"
echo ""

# Función para hacer backup de una tabla
backup_table() {
    local table=$1
    local output_file="$BACKUP_DIR/${table}.json"
    
    echo -e "${YELLOW}Respaldando tabla: $table${NC}"
    
    # Exportar tabla a JSON
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t \
        -c "SELECT json_agg(t) FROM (SELECT * FROM public.$table) t;" \
        > "$output_file" 2>/dev/null
    
    # Verificar si el archivo tiene contenido válido
    if [ -s "$output_file" ] && [ "$(cat "$output_file" | tr -d '[:space:]')" != "[null]" ]; then
        # Contar registros
        count=$(PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -t \
            -c "SELECT COUNT(*) FROM public.$table;" 2>/dev/null | tr -d '[:space:]')
        
        echo -e "${GREEN}  ✓ $table: $count registros${NC}"
        return 0
    else
        echo -e "${RED}  ✗ $table: Error o tabla vacía${NC}"
        echo "[]" > "$output_file"
        return 1
    fi
}

# Función para hacer backup completo con pg_dump
backup_full() {
    local output_file="$BACKUP_DIR/full_backup.sql"
    
    echo -e "${YELLOW}Creando backup completo con pg_dump...${NC}"
    
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --schema=public \
        --data-only \
        --inserts \
        --column-inserts \
        > "$output_file" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ Backup completo creado: $output_file${NC}"
        return 0
    else
        echo -e "${RED}  ✗ Error al crear backup completo${NC}"
        return 1
    fi
}

# Lista de tablas a respaldar
TABLES=(
    "territories"
    "users"
    "synthetic_agent_batches"
    "synthetic_agents"
    "survey_definitions"
    "survey_runs"
    "survey_responses"
    "survey_results"
    "benchmarks"
    "benchmark_comparisons"
)

# Verificar conexión
echo -e "${YELLOW}Verificando conexión a PostgreSQL...${NC}"
if ! PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}Error: No se pudo conectar a PostgreSQL${NC}"
    echo "Verifica que:"
    echo "  1. El contenedor de Supabase está corriendo (docker ps)"
    echo "  2. La contraseña es correcta"
    echo "  3. El puerto $DB_PORT está disponible"
    exit 1
fi

echo -e "${GREEN}  ✓ Conexión exitosa${NC}"
echo ""

# Backup individual de cada tabla
echo -e "${YELLOW}Respaldando tablas individuales...${NC}"
success_count=0
total_records=0

for table in "${TABLES[@]}"; do
    if backup_table "$table"; then
        ((success_count++))
        # Sumar registros (aproximado)
        count=$(PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -t \
            -c "SELECT COUNT(*) FROM public.$table;" 2>/dev/null | tr -d '[:space:]')
        if [ "$count" != "" ] && [ "$count" != "NULL" ]; then
            total_records=$((total_records + count))
        fi
    fi
done

echo ""

# Backup completo con pg_dump
backup_full

echo ""

# Crear archivo de metadata
cat > "$BACKUP_DIR/_metadata.json" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "database": "$DB_NAME",
  "host": "$DB_HOST:$DB_PORT",
  "totalTables": ${#TABLES[@]},
  "successfulBackups": $success_count,
  "totalRecords": $total_records,
  "tables": $(printf '%s\n' "${TABLES[@]}" | jq -R . | jq -s .)
}
EOF

# Crear archivo de resumen
cat > "$BACKUP_DIR/_summary.txt" << EOF
BACKUP DE POSTGRESQL - SUPABASE
================================
Fecha: $(date)
Base de datos: $DB_NAME
Host: $DB_HOST:$DB_PORT

RESUMEN:
- Total de tablas: ${#TABLES[@]}
- Backups exitosos: $success_count
- Total de registros: $total_records

TABLAS RESPALDADAS:
$(for table in "${TABLES[@]}"; do echo "- $table"; done)

ARCHIVOS:
- Tablas individuales: *.json
- Backup completo: full_backup.sql
- Metadata: _metadata.json
EOF

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}BACKUP COMPLETADO${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Tablas respaldadas: $success_count/${#TABLES[@]}"
echo "Total de registros: $total_records"
echo "Directorio: $BACKUP_DIR"
echo ""
echo -e "${GREEN}Archivos creados:${NC}"
ls -lh "$BACKUP_DIR"
