# 📋 Guía de Operaciones - Pulsos Sociales

## Índice

1. [Visión General](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Variables de Entorno](#variables-de-entorno)
4. [Deploy](#deploy)
5. [Health Checks](#health-checks)
6. [Logs y Observabilidad](#logs-y-observabilidad)
7. [Rollback](#rollback)
8. [Troubleshooting](#troubleshooting)

---

## Visión General

**Pulsos Sociales** es una aplicación frontend SPA (Single Page Application) construida con:

- **Framework**: Vanilla TypeScript + Vite
- **Servidor**: Nginx (Alpine Linux)
- **Contenedor**: Docker
- **Mapas**: MapLibre GL + MapTiler
- **Backend**: Supabase (PostgreSQL + Auth) - Opcional

### Modos de Operación

| Modo | Descripción | Persistencia |
|------|-------------|--------------|
| **Demo** | Sin Supabase configurado | localStorage |
| **Producción** | Con Supabase configurado | PostgreSQL |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Cliente (Navegador)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────────┐
│                    Nginx (Alpine)                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Static Files (dist/)                                │   │
│  │  - index.html (SPA entry)                           │   │
│  │  - assets/ (JS, CSS con hash)                       │   │
│  │  - health.html (Health Check UI)                    │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ (Opcional)
┌──────────────────────▼──────────────────────────────────────┐
│                    Supabase                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │  Auth        │  │  PostgREST   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Variables de Entorno

### Requeridas

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_MAPTILER_KEY` | API Key de MapTiler | `orWgcmF4NtAAER2Tgjp2` |

### Opcionales (para persistencia)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | URL de instancia Supabase | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clave pública de Supabase | `eyJhbG...` |

### Build Args (Docker)

| Argumento | Descripción |
|-----------|-------------|
| `BUILD_DATE` | Fecha del build (ISO 8601) |
| `VCS_REF` | Hash del commit git |

---

## Deploy

### Opción 1: Docker Local

```bash
# Build con variables
docker build -t pulsos-sociales \
  --build-arg VITE_MAPTILER_KEY=your_key \
  --build-arg VITE_SUPABASE_URL=your_url \
  --build-arg VITE_SUPABASE_ANON_KEY=your_key \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg VCS_REF=$(git rev-parse --short HEAD) \
  .

# Run
docker run -d \
  --name pulsos \
  -p 80:80 \
  --restart unless-stopped \
  pulsos-sociales

# Ver logs
docker logs -f pulsos
```

### Opción 2: Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build:
      context: .
      args:
        VITE_MAPTILER_KEY: ${VITE_MAPTILER_KEY}
        VITE_SUPABASE_URL: ${VITE_SUPABASE_URL:-}
        VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY:-}
        BUILD_DATE: ${BUILD_DATE:-}
        VCS_REF: ${VCS_REF:-}
    ports:
      - "80:80"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
```

```bash
# Deploy
docker-compose up -d --build

# Ver estado
docker-compose ps
docker-compose logs -f
```

### Opción 3: EasyPanel

1. **Crear nuevo servicio** en EasyPanel
2. **Configurar Build**:
   - Type: `Dockerfile`
   - Dockerfile: `Dockerfile`
3. **Variables de Entorno**:
   ```
   VITE_MAPTILER_KEY=your_maptiler_key
   ```
4. **Puertos**:
   - Container: `80`
   - Service: `80`
5. **Deploy**

### Opción 4: Supabase Self-Hosted (con persistencia)

```bash
# 1. Clonar Supabase
git clone https://github.com/supabase/supabase
cd supabase/docker

# 2. Configurar .env
cp .env.example .env
# Editar: POSTGRES_PASSWORD, JWT_SECRET, etc.

# 3. Iniciar Supabase
docker-compose up -d

# 4. Aplicar schema
psql -h localhost -p 5432 -U postgres -d postgres -f schema.sql

# 5. Deploy frontend con variables de Supabase
docker build -t pulsos-sociales \
  --build-arg VITE_SUPABASE_URL=http://localhost:8000 \
  --build-arg VITE_SUPABASE_ANON_KEY=your-anon-key \
  .
```

---

## Health Checks

### Endpoints Disponibles

| Endpoint | Descripción | Uso |
|----------|-------------|-----|
| `/health` | Texto simple: "healthy" | Load balancers |
| `/health/ui` | Interfaz visual de estado | Debugging |
| `/health/status` | JSON con timestamp | Monitoring |
| `/version.json` | Versión del build | CI/CD |

### Ejemplos

```bash
# Health check simple
curl http://localhost/health
# Output: healthy

# Status JSON
curl http://localhost/health/status
# Output: {"status":"healthy","service":"pulsos-sociales","timestamp":"..."}

# Ver versión
curl http://localhost/version.json
# Output: {"version":"1.1.0","buildDate":"...","vcsRef":"..."}
```

### Health Check UI

Accede a `http://tu-dominio/health/ui` para ver:
- Estado del frontend
- Conexión a Supabase
- Estado de autenticación
- Accesibilidad de localStorage

---

## Logs y Observabilidad

### Estructura de Logs

```
[🔵 DB] Intentando conectar a: https://xxx.supabase.co
[🔵 DB] ✅ Conexión exitosa - tabla territories accesible (16 registros)
[🟡 FALLBACK] Supabase no configurado - usando datos locales
[🔴 ERROR] Conexión fallida [network]: Error de red
[Auth] Supabase not available, creating demo session
```

### Niveles de Log

| Prefijo | Significado | Acción |
|---------|-------------|--------|
| `[🔵 DB]` | Operación de base de datos | Informativo |
| `[🟡 FALLBACK]` | Modo fallback activado | Advertencia |
| `[🔴 ERROR]` | Error crítico | Revisar |
| `[Auth]` | Evento de autenticación | Informativo |

### Ver Logs

```bash
# Docker
docker logs -f pulsos

# Docker Compose
docker-compose logs -f frontend

# Nginx dentro del contenedor
docker exec pulsos tail -f /var/log/nginx/access.log
docker exec pulsos tail -f /var/log/nginx/error.log
```

### Métricas de Nginx

El formato de log incluye:
- `$request_time` - Tiempo total de la request
- `$upstream_connect_time` - Tiempo de conexión
- `$upstream_header_time` - Tiempo hasta recibir headers
- `$upstream_response_time` - Tiempo de respuesta del upstream

---

## Rollback

### Estrategia de Rollback

1. **Docker Tags**: Mantener versiones taggeadas
   ```bash
   docker tag pulsos-sociales:latest pulsos-sociales:v1.1.0
   docker tag pulsos-sociales:latest pulsos-sociales:stable
   ```

2. **Rollback Rápido**:
   ```bash
   # Detener versión actual
   docker stop pulsos
   docker rm pulsos

   # Iniciar versión anterior
   docker run -d --name pulsos -p 80:80 pulsos-sociales:v1.0.0
   ```

3. **Docker Compose**:
   ```bash
   # Editar docker-compose.yml para usar imagen específica
   docker-compose up -d
   ```

### Checklist de Rollback

- [ ] Detener contenedor actual
- [ ] Verificar imagen anterior disponible
- [ ] Iniciar versión anterior
- [ ] Verificar health check pasa
- [ ] Verificar funcionalidad básica
- [ ] Notificar equipo

---

## Troubleshooting

### Problema: App no carga

```bash
# Verificar contenedor está corriendo
docker ps | grep pulsos

# Ver logs
docker logs pulsos

# Verificar puerto
curl http://localhost/health
```

### Problema: Mapa no muestra

**Causa**: `VITE_MAPTILER_KEY` no configurada

**Solución**:
1. Obtener key en https://cloud.maptiler.com/account/keys/
2. Rebuild con la variable

### Problema: No conecta a Supabase

**Síntomas**: `[🔴 ERROR] Conexión fallida`

**Diagnóstico**:
```bash
# Verificar URL es correcta
curl $VITE_SUPABASE_URL/rest/v1/

# Verificar JWT
echo $VITE_SUPABASE_ANON_KEY | base64 -d  # Debe ser válido
```

**Soluciones**:

| Error | Causa | Solución |
|-------|-------|----------|
| `network` | URL incorrecta | Verificar URL |
| `auth` | Anon key inválido | Regenerar key |
| `rls` | Políticas RLS | Crear políticas para anon |
| `schema` | Tabla no existe | Aplicar schema.sql |

### Problema: Sesión no persiste

**Causas**:
- Navegador en modo privado
- localStorage deshabilitado
- Session expirada (7 días en modo demo)

**Verificación**:
```javascript
// En consola del navegador
localStorage.getItem('pulsos_session')
```

### Problema: Build falla

```bash
# Limpiar cache
rm -rf node_modules dist
npm ci

# Verificar TypeScript
npx tsc --noEmit

# Verificar tests
npm run test:run

# Rebuild
npm run build
```

---

## Comandos Útiles

```bash
# Build y test completo
npm ci && npm run test:run && npm run build

# Verificar bundle
ls -la dist/assets/

# Analizar tamaño
du -sh dist/

# Docker: limpiar todo
docker system prune -a

# Docker: rebuild sin cache
docker build --no-cache -t pulsos-sociales .
```

---

## Contacto y Soporte

- **Documentación**: Este archivo
- **Health Check**: `/health/ui`
- **Logs**: `docker logs -f pulsos`
- **Tests**: `npm run test:run`

---

## Changelog

### v1.1.0 (Sprint 16)
- ✅ Health checks mejorados (`/health`, `/health/ui`, `/health/status`)
- ✅ Dockerfile multi-stage optimizado
- ✅ Nginx configuración mejorada con logs detallados
- ✅ Documentación operativa completa
- ✅ Script de inicio con información de versión

### v1.0.0 (Sprint 15)
- ✅ Sistema de testing con Vitest
- ✅ Manejo de errores robusto
- ✅ Modo demo automático
- ✅ Supabase integration
