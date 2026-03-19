# 🔧 Fix para Supabase Auth en Easypanel

## Problema
El endpoint `/auth/v1/health` devuelve **503 "name resolution failed"**.

## Causa
La configuración de Kong usa nombres de servicio cortos (`auth`, `db`) pero en Easypanel los servicios tienen nombres completos (`supabase-auth`, `supabase-db`).

## Solución

### Paso 1: Acceder a Easypanel
1. Ve a tu panel de Easypanel: `https://tu-dominio-easypanel:3000`
2. Inicia sesión
3. Ve al proyecto "pulsos-sociales"

### Paso 2: Actualizar Configuración de Kong

1. **Ve al servicio `supabase-kong`**
2. **Haz clic en "Volumes"**
3. **Encuentra el volumen `kong-config`**
4. **Edita el contenido** y reemplázalo con:

```yaml
_format_version: "3.0"
_transform: true

services:
  - name: auth
    url: http://supabase-auth:9999
    routes:
      - name: auth-route
        strip_path: true
        paths:
          - /auth/v1
    plugins:
      - name: cors
        config:
          origins:
            - "*"
          methods:
            - GET
            - POST
            - PUT
            - PATCH
            - DELETE
            - OPTIONS
          headers:
            - Authorization
            - Content-Type
            - X-Client-Info
            - X-Request-ID
            - apikey
          exposed_headers:
            - "*"
          max_age: 3600

  - name: rest
    url: http://supabase-rest:3000
    routes:
      - name: rest-route
        strip_path: true
        paths:
          - /rest/v1
    plugins:
      - name: cors
        config:
          origins:
            - "*"
          methods:
            - GET
            - POST
            - PUT
            - PATCH
            - DELETE
            - OPTIONS
          headers:
            - Authorization
            - Content-Type
            - X-Client-Info
            - X-Request-ID
            - apikey
          exposed_headers:
            - "*"
          max_age: 3600

  - name: realtime
    url: http://supabase-realtime:4000
    routes:
      - name: realtime-route
        strip_path: true
        paths:
          - /realtime/v1
    plugins:
      - name: cors
        config:
          origins:
            - "*"
          methods:
            - GET
            - POST
            - PUT
            - PATCH
            - DELETE
            - OPTIONS
          headers:
            - Authorization
            - Content-Type
            - X-Client-Info
            - X-Request-ID
            - apikey
          exposed_headers:
            - "*"
          max_age: 3600

  - name: storage
    url: http://supabase-storage:5000
    routes:
      - name: storage-route
        strip_path: true
        paths:
          - /storage/v1
    plugins:
      - name: cors
        config:
          origins:
            - "*"
          methods:
            - GET
            - POST
            - PUT
            - PATCH
            - DELETE
            - OPTIONS
          headers:
            - Authorization
            - Content-Type
            - X-Client-Info
            - X-Request-ID
            - apikey
          exposed_headers:
            - "*"
          max_age: 3600

  - name: meta
    url: http://supabase-meta:8080
    routes:
      - name: meta-route
        strip_path: true
        paths:
          - /pg
    plugins:
      - name: cors
        config:
          origins:
            - "*"
          methods:
            - GET
            - POST
            - PUT
            - PATCH
            - DELETE
            - OPTIONS
          headers:
            - Authorization
            - Content-Type
            - X-Client-Info
            - X-Request-ID
            - apikey
          exposed_headers:
            - "*"
          max_age: 3600
```

5. **Guarda los cambios**

### Paso 3: Reiniciar Kong

1. **Ve a la pestaña "Deploy" del servicio `supabase-kong`**
2. **Haz clic en "Redeploy" o "Restart"**
3. **Espera 10-20 segundos**

### Paso 4: Verificar que Auth esté corriendo

1. **Ve al servicio `supabase-auth`**
2. **Verifica que el status sea "Running"**
3. **Si no está running, haz clic en "Start" o "Restart"**

### Paso 5: Probar el endpoint

Abre una terminal local y ejecuta:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  https://supabase.pulsossociales.com/auth/v1/health \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE"
```

**Resultado esperado:** `401` (no 503)

Un 401 significa que el servicio está funcionando pero requiere autenticación.
Un 503 significa que sigue habiendo problemas.

### Paso 6: Si sigue fallando (503)

Si después de actualizar Kong sigues viendo 503:

1. **Reinicia el servicio `supabase-auth`:**
   - Ve a `supabase-auth` → "Deploy" → "Restart"
   - Espera 30 segundos

2. **Verifica logs de auth:**
   - Ve a `supabase-auth` → "Logs"
   - Busca errores de conexión a la base de datos

3. **Verifica que la base de datos esté corriendo:**
   - Ve a `supabase-db` → verifica status "Running"
   - Si no está running, iníciala

4. **Reinicia todos los servicios en orden:**
   - Primero: `supabase-db` (espera 30s)
   - Segundo: `supabase-auth` (espera 15s)
   - Tercero: `supabase-kong`
   - Cuarto: el resto (`supabase-rest`, `supabase-realtime`, etc.)

## Cambios realizados en los archivos

Los cambios principales en `kong-easypanel.yml`:

| Antes (Docker Compose) | Después (Easypanel) |
|------------------------|---------------------|
| `http://auth:9999` | `http://supabase-auth:9999` |
| `http://rest:3000` | `http://supabase-rest:3000` |
| `http://realtime:4000` | `http://supabase-realtime:4000` |
| `http://storage:5000` | `http://supabase-storage:5000` |
| `http://meta:8080` | `http://supabase-meta:8080` |

## Archivos creados

- `deploy/volumes/api/kong-easypanel.yml` - Configuración compatible con Easypanel
- `deploy/EASYPANEL-FIX.md` - Este documento

## Soporte

Si el problema persiste después de seguir estos pasos:
1. Copia los logs del servicio `supabase-auth` desde Easypanel
2. Comparte el resultado del comando de test (Paso 5)
