# Scripts de Backup de Supabase

Este directorio contiene scripts para realizar backups de la base de datos PostgreSQL de Supabase.

## Scripts Disponibles

### 1. `backup_docker.sh` (Recomendado)
Script de backup que utiliza `docker exec` para ejecutar comandos directamente dentro del contenedor de PostgreSQL.

**Ventajas:**
- No requiere configuración de contraseñas
- Funciona con el contenedor Docker de Supabase
- Crea backups en formato JSON (por tabla) y SQL (completo)

**Uso:**
```bash
./scripts/backup/backup_docker.sh
```

**Salida:**
- Crea un directorio `backups/backup-YYYY-MM-DD_HH-MM-SS/`
- Genera archivos JSON para cada tabla
- Genera `full_backup.sql` con todos los datos
- Genera `schema_backup.sql` con el esquema
- Genera `_metadata.json` y `_summary.txt` con información del backup

### 2. `backup_postgres.sh`
Script de backup que se conecta directamente a PostgreSQL usando psql.

**Requisitos:**
- PostgreSQL client (psql, pg_dump) instalado localmente
- Acceso al puerto 5433 del contenedor
- Contraseña correcta configurada

**Uso:**
```bash
./scripts/backup/backup_postgres.sh
```

### 3. `backup_supabase.ts`
Script TypeScript que utiliza la API REST de Supabase para hacer backup.

**Requisitos:**
- Node.js
- Variables de entorno configuradas (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

**Uso:**
```bash
npx tsx scripts/backup/backup_supabase.ts
```

## Estructura de Backups

```
backups/
└── backup-2026-03-23_15-28-38/
    ├── _metadata.json          # Metadatos del backup
    ├── _summary.txt            # Resumen legible
    ├── full_backup.sql         # Backup completo en SQL
    ├── schema_backup.sql       # Solo el esquema
    ├── territories.json        # Datos de cada tabla
    ├── users.json
    └── ...
```

## Restauración

Para restaurar un backup SQL:

```bash
# Usando docker exec
docker exec -i oasis-supabase-db psql -U postgres -d postgres < backups/backup-YYYY-MM-DD_HH-MM-SS/full_backup.sql

# O usando psql local
PGPASSWORD="tu-password" psql -h localhost -p 5433 -U postgres -d postgres < full_backup.sql
```

## Notas

- El contenedor debe estar corriendo (`docker ps` para verificar)
- Los backups se almacenan localmente en el directorio `backups/`
- Se recomienda hacer backups regularmente y almacenarlos en un lugar seguro
- La base de datos actual está vacía (no hay tablas en el esquema public)
