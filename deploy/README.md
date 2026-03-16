# Deploy - Pulsos Sociales

Este directorio contiene los archivos necesarios para desplegar **Pulsos Sociales** con infraestructura de persistencia Supabase self-hosted.

## 📁 Estructura

```
deploy/
├── README.md                      # Este archivo
├── docker-compose.supabase.yml    # Docker Compose para Supabase
├── .env.supabase.example          # Variables de entorno de ejemplo
├── init/                          # Scripts de inicialización SQL
│   └── 01-schema.sql             # Schema de base de datos
└── easypanel/                     # Configuración para Easypanel
    └── pulsos-sociales.json      # Template de servicios
```

## 🚀 Opciones de Deploy

### Opción 1: Docker Local (Desarrollo)

Para desarrollo local con Supabase self-hosted:

```bash
# 1. Ir al directorio deploy
cd deploy

# 2. Copiar variables de entorno
cp .env.supabase.example .env

# 3. Editar .env con tus valores (opcional para dev)
# Los valores por defecto funcionan para desarrollo

# 4. Iniciar Supabase
docker-compose -f docker-compose.supabase.yml up -d

# 5. Esperar a que los servicios estén listos (30-60 segundos)
docker-compose -f docker-compose.supabase.yml ps

# 6. Acceder a:
#    - Supabase Studio: http://localhost:3000
#    - API: http://localhost:8000
#    - PostgreSQL: localhost:5432
```

**Servicios disponibles:**

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Kong | 8000 | API Gateway |
| Studio | 3000 | Interfaz de administración |
| PostgreSQL | 5432 | Base de datos |
| Auth | - | Autenticación (vía Kong) |
| REST | - | API REST PostgREST (vía Kong) |
| Realtime | - | WebSockets tiempo real (vía Kong) |
| Storage | - | Almacenamiento de archivos (vía Kong) |

### Opción 2: Easypanel (Producción)

Easypanel es una alternativa self-hosted a Heroku/Railway.

#### Paso 1: Instalar Easypanel

```bash
# En tu servidor VPS (Ubuntu 20.04+ recomendado)
curl -fsSL https://easypanel.io/get.sh | bash
```

#### Paso 2: Crear Proyecto

1. Accede a `https://tu-dominio-easypanel:3000`
2. Crea un proyecto llamado "pulsos-sociales"
3. Ve a "Environment Variables" y pega el contenido de `.env.supabase.example`
4. Configura los valores reales (especialmente los secretos)

#### Paso 3: Desplegar Servicios

Usa el template en `easypanel/pulsos-sociales.json` o crea manualmente:

**Servicios a crear:**

1. **PostgreSQL** (Database)
   - Image: `supabase/postgres:15.1.0.153`
   - Volumes: `/var/lib/postgresql/data`
   - Env: `POSTGRES_PASSWORD`, `POSTGRES_USER`, `POSTGRES_DB`

2. **Supabase Studio** (App)
   - Image: `supabase/studio:20240326-5e7a8e2`
   - Port: 3000
   - Env: Variables de Studio

3. **Kong** (App)
   - Image: `kong:2.8.1`
   - Ports: 8000, 8443
   - Env: Configuración Kong

4. **Auth** (App)
   - Image: `supabase/gotrue:v2.143.0`
   - Env: Configuración GoTrue

5. **REST** (App)
   - Image: `postgrest/postgrest:v12.0.1`
   - Env: Configuración PostgREST

6. **Realtime** (App)
   - Image: `supabase/realtime:v2.28.32`
   - Env: Configuración Realtime

7. **Storage** (App)
   - Image: `supabase/storage-api:v1.2.1`
   - Volumes: `/var/lib/storage`
   - Env: Configuración Storage

8. **Frontend** (App)
   - Build from Git repo
   - Port: 5173
   - Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Opción 3: Supabase Cloud (Rápido)

Para empezar rápidamente sin self-hosting:

1. Crea cuenta en [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. En Settings > API, copia:
   - `URL` → `VITE_SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`
4. Configura en tu `.env` del frontend

## 🔧 Configuración del Frontend

Una vez que tengas Supabase corriendo, configura el frontend:

```bash
# En la raíz del proyecto
cp .env.example .env

# Editar .env
VITE_MAPTILER_KEY=tu_key_de_maptiler
VITE_SUPABASE_URL=http://localhost:8000  # o tu URL de Supabase Cloud
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## 🗄️ Schema de Base de Datos

El archivo `init/01-schema.sql` contiene el schema inicial. Para aplicarlo:

```bash
# Opción 1: Automático (al iniciar Docker)
# El volumen ./init se monta en /docker-entrypoint-initdb.d

# Opción 2: Manual con psql
psql -h localhost -U postgres -d postgres -f init/01-schema.sql

# Opción 3: Via Supabase Studio
# 1. Abre http://localhost:3000
# 2. Ve a SQL Editor
# 3. Copia y pega el contenido de 01-schema.sql
# 4. Ejecuta
```

## 🔐 Generar Claves Seguras

Para producción, genera claves seguras:

```bash
# JWT Secret
openssl rand -base64 32

# Service Role Key
openssl rand -base64 32

# Anon Key
openssl rand -base64 32

# DB Encryption Key (opcional)
openssl rand -base64 32
```

## 📊 Monitoreo

### Health Checks

```bash
# PostgreSQL
docker-compose -f docker-compose.supabase.yml exec db pg_isready -U postgres

# Kong
curl http://localhost:8000/status

# Auth
curl http://localhost:9999/health

# Storage
curl http://localhost:5000/status
```

### Logs

```bash
# Todos los servicios
docker-compose -f docker-compose.supabase.yml logs -f

# Servicio específico
docker-compose -f docker-compose.supabase.yml logs -f db
docker-compose -f docker-compose.supabase.yml logs -f auth
```

## 🔄 Backup y Restore

### Backup

```bash
# Backup de PostgreSQL
docker-compose -f docker-compose.supabase.yml exec db pg_dump -U postgres postgres > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
# Restore de PostgreSQL
docker-compose -f docker-compose.supabase.yml exec -T db psql -U postgres postgres < backup_20240101.sql
```

## 🛑 Detener Servicios

```bash
# Detener
docker-compose -f docker-compose.supabase.yml down

# Detener y eliminar volúmenes (¡cuidado, borra datos!)
docker-compose -f docker-compose.supabase.yml down -v
```

## 🐛 Troubleshooting

### "Connection refused" al conectar

Espera 30-60 segundos después de `docker-compose up` para que todos los servicios inicien.

### "JWT validation failed"

Verifica que `JWT_SECRET` sea el mismo en todos los servicios.

### "Table not found"

Aplica el schema manualmente via SQL Editor en Studio.

### Puerto ya en uso

Cambia los puertos en `.env`:
```bash
KONG_HTTP_PORT=8001
STUDIO_PORT=3001
POSTGRES_PORT=5433
```

## 📚 Referencias

- [Supabase Self-Hosting Guide](https://supabase.com/docs/guides/self-hosting)
- [Supabase Docker](https://github.com/supabase/supabase/tree/master/docker)
- [Easypanel Docs](https://easypanel.io/docs)
- [Pulsos Sociales - Arquitectura](../docs/ARCHITECTURE_SUPABASE.md)
