# Diagnóstico de Conexión a Base de Datos

## Fecha
23 de marzo, 2026

## Problema Identificado

Error `PGRST002`: "Could not query the database for the schema cache. Retrying."

Este error indica que **PostgREST no puede conectarse a PostgreSQL** en el servidor.

## Causa Raíz

El error PGRST002 ocurre cuando:
1. El contenedor PostgreSQL no está corriendo
2. Hay un problema de red entre PostgREST y PostgreSQL
3. PostgreSQL no responde en el puerto configurado (5438)

## Estado Actual

| Componente | Estado |
|------------|--------|
| Frontend (ANON_KEY) | ✅ Corregido - Coincide con backend |
| Autenticación | ✅ Funcionando |
| PostgREST | ✅ Respondiendo |
| PostgreSQL | ❌ **No accesible desde PostgREST** |

## Verificación Remota

```bash
# Test de conexión (desde cualquier máquina)
curl -s "https://supabase.pulsossociales.com/rest/v1/territories?select=id&limit=1" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc0MjMwNzA2LCJleHAiOjIwODk1OTA3MDZ9.4PYYA_aprxs_rt29a48BS5RSpNfE78LEe21VMXF7kJ4" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc0MjMwNzA2LCJleHAiOjIwODk1OTA3MDZ9.4PYYA_aprxs_rt29a48BS5RSpNfE78LEe21VMXF7kJ4"
```

**Resultado esperado:** Error PGRST002

## Instrucciones para Corrección (Requiere acceso al servidor)

### Paso 1: Conectar al servidor
```bash
ssh usuario@pulsossociales.com
cd /ruta/al/proyecto/deploy
```

### Paso 2: Ejecutar diagnóstico
```bash
bash diagnose-supabase.sh
```

### Paso 3: Verificar contenedores
```bash
docker-compose -f docker-compose.supabase.yml ps
```

### Paso 4: Si PostgreSQL no está corriendo
```bash
docker-compose -f docker-compose.supabase.yml up -d db
```

### Paso 5: Verificar logs
```bash
docker-compose -f docker-compose.supabase.yml logs db --tail=50
docker-compose -f docker-compose.supabase.yml logs rest --tail=50
```

### Paso 6: Verificar conectividad de red
```bash
docker-compose -f docker-compose.supabase.yml exec rest ping db
docker-compose -f docker-compose.supabase.yml exec rest nc -zv db 5432
```

## Configuración Correcta

### Variables de entorno verificadas:

**Frontend (.env):**
```env
VITE_SUPABASE_URL=https://supabase.pulsossociales.com
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc0MjMwNzA2LCJleHAiOjIwODk1OTA3MDZ9.4PYYA_aprxs_rt29a48BS5RSpNfE78LEe21VMXF7kJ4
```

**Backend (deploy/.env):**
```env
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc0MjMwNzA2LCJleHAiOjIwODk1OTA3MDZ9.4PYYA_aprxs_rt29a48BS5RSpNfE78LEe21VMXF7kJ4
JWT_SECRET=piwjMjad3frjRFQj8Je0M6C+vGkG24OpdgKsFTcdaM7suFEuiXdLN4MChFVyaxdt
```

## Notas

- El frontend ya está configurado correctamente
- El problema es exclusivamente del backend (PostgREST ↔ PostgreSQL)
- Se requiere acceso SSH al servidor para resolver el problema

## Contacto para Soporte

Para resolver este problema, contactar al administrador del servidor con acceso a:
- SSH al servidor pulsossociales.com
- Docker/Docker Compose en el servidor
