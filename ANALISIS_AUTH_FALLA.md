# 🔍 ANÁLISIS COMPLETO: Falla de Autenticación (Login/Registro)

## 📋 Resumen Ejecutivo

**Problema**: Ni el login ni el registro funcionan. El servidor responde con error 503.

**Causa Raíz**: El servicio GoTrue (autenticación de Supabase) en el servidor tiene un error de "name resolution failed", lo que significa que no puede conectarse a la base de datos.

---

## 🔬 Análisis Detallado de los Logs

### 1. Conexión a Supabase REST API ✅ FUNCIONA
```
client.ts:52 [🔵 DB] Intentando conectar a: https://supabase.pulsossociales.com
client.ts:52 [🔵 DB] Probando conexión a tabla territories...
client.ts:52 [🔵 DB] ✅ Conexión exitosa - tabla territories accesible (16 registros)
client.ts:52 [🔵 DB] ✅ Conectado exitosamente a Supabase
```
**Veredicto**: La API REST de Supabase (PostgREST) funciona perfectamente.

### 2. Inicialización de Auth ✅ FUNCIONA
```
index.ts:164 🔐 [Auth] Evento: INITIAL_SESSION
index.ts:171 🔐 [Auth] Sin sesión
```
**Veredicto**: El cliente de auth se inicializa correctamente, no hay sesión activa (esperado).

### 3. Intento de Registro ❌ FALLA
```
supabase.pulsossocia…om/auth/v1/signup:1
Failed to load resource: the server responded with a status of 503 ()

index.ts:257 [Auth] Sign up error: AuthRetryableFetchError: {}
    at async AuthService.signUp (index.ts:245:31)
    at async handleRegister (LoginPage.ts:450:20)
    at async HTMLFormElement.<anonymous> (LoginPage.ts:256:5)
```
**Veredicto**: El endpoint `/auth/v1/signup` devuelve HTTP 503 (Service Unavailable).

---

## 🎯 Flujo de Ejecución del Error

```
Usuario hace clic en "Crear cuenta"
    ↓
LoginPage.ts:256 - Event listener del formulario
    ↓
LoginPage.ts:450 - handleRegister() llama a authService.signUp()
    ↓
services/auth/index.ts:245 - authService.signUp() llama a client.auth.signUp()
    ↓
Supabase client envía POST a https://supabase.pulsossociales.com/auth/v1/signup
    ↓
❌ SERVIDOR RESPONDE 503 - "name resolution failed"
    ↓
AuthRetryableFetchError es lanzado
    ↓
Error se muestra en consola, usuario ve mensaje de error genérico
```

---

## 🔧 Arquitectura del Problema

### Componentes Involucrados

```
┌─────────────────────────────────────────────────────────────┐
│                    TU NAVEGADOR (Frontend)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  LoginPage   │  │  AuthService │  │  Supabase Client │  │
│  │     .ts      │──│   index.ts   │──│    client.ts     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS Request
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              SERVIDOR SUPABASE (Backend)                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐ │
│  │   Kong   │───→│   Auth   │───→│  GoTrue  │───→│   DB   │ │
│  │  (8000)  │    │  (9999)  │    │  Service │    │(5432)  │ │
│  └──────────┘    └──────────┘    └──────────┘    └────────┘ │
│       │              │                              │        │
│       │              └──────────────────────────────┘        │
│       │                   ❌ "name resolution failed"        │
│       │                                                      │
│       └────→ /rest/v1/territories ✅ FUNCIONA               │
│       └────→ /auth/v1/signup     ❌ ERROR 503               │
└─────────────────────────────────────────────────────────────┘
```

### ¿Por qué REST funciona pero Auth no?

| Servicio | Endpoint | Estado | Razón |
|----------|----------|--------|-------|
| **PostgREST** | `/rest/v1/*` | ✅ Funciona | Conecta directamente a DB, no usa resolución DNS interna |
| **GoTrue** | `/auth/v1/*` | ❌ Falla | Intenta resolver `db` como hostname, falla la resolución DNS |

---

## 🐛 Causa Raíz Técnica

### Error en GoTrue (Auth)
```
"name resolution failed"
```

Esto ocurre cuando:
1. GoTrue intenta conectarse a la base de datos usando el hostname `db`
2. La red Docker no está configurada correctamente
3. El contenedor `auth` no puede resolver el nombre `db` a la IP del contenedor de PostgreSQL

### Configuración Problemática
En `deploy/docker-compose.supabase.yml`:
```yaml
auth:
  environment:
    GOTRUE_DB_DATABASE_URL: postgres://postgres:password@db:5432/postgres?sslmode=disable
    #                                                  ^^
    #                                                  ││
    #                                                  └┴── Este hostname no se resuelve
```

---

## ✅ Soluciones Posibles

### Solución 1: Fix en el Servidor (Recomendada)

Ejecutar en el servidor donde está Supabase:

```bash
# 1. Conectar al servidor
ssh usuario@tuservidor.com

# 2. Ir al directorio de deploy
cd /ruta/al/proyecto/deploy

# 3. Ejecutar script de fix
./fix-gotrue.sh
```

Este script:
- Verifica estado de contenedores
- Recrea la red Docker si es necesario
- Reinicia el servicio auth
- Verifica que funcione correctamente

### Solución 2: Fix Manual en Servidor

```bash
# 1. Detener contenedores
docker-compose -f docker-compose.supabase.yml down

# 2. Recrear red Docker
docker network rm pulsos-network 2>/dev/null
docker network create --driver bridge pulsos-network

# 3. Iniciar contenedores
docker-compose -f docker-compose.supabase.yml up -d

# 4. Verificar logs
docker-compose -f docker-compose.supabase.yml logs -f auth
```

### Solución 3: Modo Demo Temporal (Para desarrollo local)

Implementar un modo de demostración que simule el auth sin necesidad del backend.

---

## 📊 Estado de Componentes

| Componente | Estado | Detalle |
|------------|--------|---------|
| **Frontend** | ✅ OK | Build exitoso, sin errores TypeScript |
| **Supabase REST** | ✅ OK | Tabla territories accesible (16 registros) |
| **Supabase Auth** | ❌ FALLA | Error 503 - "name resolution failed" |
| **Red Docker** | ⚠️ DUDOSO | Posible problema de resolución DNS |
| **Base de datos** | ✅ OK | PostgreSQL funcionando |

---

## 🎨 Experiencia de Usuario Actual

### Flujo de Registro
1. ✅ Usuario ve formulario de registro
2. ✅ Usuario completa datos (nombre, email, contraseña)
3. ✅ Usuario hace clic en "Crear cuenta"
4. ❌ Error: "Error al crear la cuenta. Intenta nuevamente."
5. ❌ En consola: `AuthRetryableFetchError: {}`

### Flujo de Login
1. ✅ Usuario ve formulario de login
2. ✅ Usuario ingresa email y contraseña
3. ✅ Usuario hace clic en "Iniciar sesión"
4. ❌ Error: "Error al iniciar sesión. Intenta nuevamente."
5. ❌ Mismo error 503 en el backend

---

## 🔍 Comandos de Diagnóstico

### Verificar estado desde tu máquina local:
```bash
# Test REST API (debe funcionar)
curl -s 'https://supabase.pulsossociales.com/rest/v1/territories?select=id&limit=1' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test Auth (fallará con 503)
curl -s -X POST 'https://supabase.pulsossociales.com/auth/v1/signup' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456!"}'
```

### Verificar estado en el servidor:
```bash
# Ver contenedores
docker-compose -f docker-compose.supabase.yml ps

# Ver logs de auth
docker-compose -f docker-compose.supabase.yml logs auth

# Verificar red
docker network inspect pulsos-network
```

---

## 📝 Conclusión

**El problema NO está en el frontend**. El código del frontend está correcto:
- ✅ LoginPage.ts maneja el formulario correctamente
- ✅ AuthService hace las llamadas correctamente
- ✅ El cliente de Supabase está configurado correctamente

**El problema está en el backend de Supabase**:
- ❌ El servicio GoTrue (auth) no puede conectarse a la base de datos
- ❌ Error de resolución DNS en la red Docker
- ❌ El contenedor `auth` no puede resolver el hostname `db`

**Para arreglarlo necesitas**:
1. Acceso SSH al servidor donde está desplegado Supabase
2. Ejecutar el script `deploy/fix-gotrue.sh`
3. O recrear manualmente la red Docker

---

## 📁 Archivos Relacionados

- `deploy/fix-gotrue.sh` - Script de reparación
- `deploy/diagnose-supabase.sh` - Script de diagnóstico
- `deploy/docker-compose.supabase.yml` - Configuración de servicios
- `src/services/auth/index.ts` - Servicio de auth (frontend)
- `src/pages/LoginPage.ts` - Página de login/registro
