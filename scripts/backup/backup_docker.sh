#!/bin/bash
# Script de Backup de PostgreSQL usando Docker exec
# Este script crea un backup completo ejecutando comandos dentro del contenedor

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
CONTAINER_NAME="oasis-supabase-db"
DB_NAME="postgres"
DB_USER="postgres"

# Crear directorio de backup con timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="backups/backup-${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}BACKUP DE POSTGRESQL - DOCKER${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Contenedor: $CONTAINER_NAME"
echo "Base de datos: $DB_NAME"
echo "Usuario: $DB_USER"
echo "Directorio: $BACKUP_DIR"
echo ""

# Verificar que el contenedor existe y está corriendo
echo -e "${YELLOW}Verificando contenedor...${NC}"
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}Error: El contenedor $CONTAINER_NAME no está corriendo${NC}"
    echo "Contenedores disponibles:"
    docker ps --format "table {{.Names}}\t{{.Status}}"
    exit 1
fi
echo -e "${GREEN}  ✓ Contenedor encontrado y corriendo${NC}"
echo ""

# Función para hacer backup de una tabla a JSON
backup_table() {
    local table=$1
    local output_file="$BACKUP_DIR/${table}.json"
    
    echo -e "${YELLOW}Respaldando tabla: $table${NC}"
    
    # Exportar tabla a JSON usando psql dentro del contenedor
    if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT json_agg(t) FROM (SELECT * FROM public.$table) t;" > "$output_file" 2>/dev/null; then
        # Verificar si el archivo tiene contenido válido
        if [ -s "$output_file" ] && [ "$(cat "$output_file" | tr -d '[:space:]')" != "[null]" ]; then
            # Contar registros
            count=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM public.$table;" 2>/dev/null | tr -d '[:space:]')
            echo -e "${GREEN}  ✓ $table: $count registros${NC}"
            return 0
        else
            echo -e "${BLUE}  ℹ $table: Tabla vacía${NC}"
            echo "[]" > "$output_file"
            return 0
        fi
    else
        echo -e "${RED}  ✗ $table: Error al respaldar${NC}"
        echo "[]" > "$output_file"
        return 1
    fi
}

# Función para hacer backup completo con pg_dump
backup_full() {
    local output_file="$BACKUP_DIR/full_backup.sql"
    
    echo -e "${YELLOW}Creando backup completo con pg_dump...${NC}"
    
    if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --schema=public --data-only --inserts --column-inserts > "$output_file" 2>/dev/null; then
        # Verificar tamaño del archivo
        size=$(du -h "$output_file" | cut -f1)
        echo -e "${GREEN}  ✓ Backup completo creado: $size${NC}"
        return 0
    else
        echo -e "${RED}  ✗ Error al crear backup completo${NC}"
        return 1
    fi
}

# Función para hacer backup del esquema
backup_schema() {
    local output_file="$BACKUP_DIR/schema_backup.sql"
    
    echo -e "${YELLOW}Creando backup del esquema...${NC}"
    
    if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --schema=public --schema-only > "$output_file" 2>/dev/null; then
        size=$(du -h "$output_file" | cut -f1)
        echo -e "${GREEN}  ✓ Backup del esquema creado: $size${NC}"
        return 0
    else
        echo -e "${RED}  ✗ Error al crear backup del esquema${NC}"
        return 1
    fi
}

# Obtener lista de tablas existentes
echo -e "${YELLOW}Obteniendo lista de tablas...${NC}"
TABLES=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'pg_%' 
    AND tablename NOT LIKE 'auth_%'
    ORDER BY tablename;
" 2>/dev/null | tr -d '[:space:]' | sed '/^$/d')

if [ -z "$TABLES" ]; then
    echo -e "${YELLOW}No se encontraron tablas en el esquema public${NC}"
    TABLES=""
else
    echo -e "${GREEN}  ✓ Tablas encontradas:${NC}"
    echo "$TABLES" | tr '\n' ' ' | fold -s -w 70 | sed 's/^/     /'
fi
echo ""

# Backup individual de cada tabla
if [ -n "$TABLES" ]; then
    echo -e "${YELLOW}Respaldando tablas individuales...${NC}"
    success_count=0
    total_records=0
    
    for table in $TABLES; do
        if backup_table "$table"; then
            ((success_count++))
            # Contar registros
            count=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM public.$table;" 2>/dev/null | tr -d '[:space:]')
            if [ "$count" != "" ] && [ "$count" != "NULL" ] && [[ "$count" =~ ^[0-9]+$ ]]; then
                total_records=$((total_records + count))
            fi
        fi
    done
    echo ""
else
    success_count=0
    total_records=0
fi

# Backup completo
backup_full
echo ""

# Backup del esquema
backup_schema
echo ""

# Crear archivo de metadata
table_list=$(echo "$TABLES" | jq -R . | jq -s . 2>/dev/null || echo "[]")
cat > "$BACKUP_DIR/_metadata.json" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "database": "$DB_NAME",
  "container": "$CONTAINER_NAME",
  "totalTables": $(echo "$TABLES" | wc -w | tr -d '[:space:]'),
  "successfulBackups": $success_count,
  "totalRecords": $total_records,
  "tables": $table_list
}
EOF

# Crear archivo de resumen
cat > "$BACKUP_DIR/_summary.txt" << EOF
BACKUP DE POSTGRESQL - SUPABASE (DOCKER)
=========================================
Fecha: $(date)
Base de datos: $DB_NAME
Contenedor: $CONTAINER_NAME

RESUMEN:
- Total de tablas: $(echo "$TABLES" | wc -w | tr -d '[:space:]')
- Backups exitosos: $success_count
- Total de registros: $total_records

TABLAS ENCONTRADAS:
$(echo "$TABLES" | sed 's/^/- /')

ARCHIVOS:
- Tablas individuales: *.json
- Backup completo: full_backup.sql
- Backup del esquema: schema_backup.sql
- Metadata: _metadata.json
EOF

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}BACKUP COMPLETADO${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Tablas respaldadas: $success_count"
echo "Total de registros: $total_records"
echo "Directorio: $BACKUP_DIR"
echo ""
echo -e "${GREEN}Archivos creados:${NC}"
ls -lh "$BACKUP_DIR"
