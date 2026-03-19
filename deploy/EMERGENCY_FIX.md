# 🔥 EMERGENCY FIX - Kong Name Resolution Failed

## ⚠️ PROBLEMA CRÍTICO

**Error:** `{"message":"name resolution failed"}`

**Endpoint afectado:** `https://supabase.pulsossociales.com/auth/v1/health`

**Causa raíz:** Kong está configurado con nombres de servicio cortos (`auth`, `rest`, `realtime`, etc.) pero en Easypanel los servicios se llaman con prefijo (`supabase-auth`, `supabase-rest`, `supabase-realtime`, etc.)

---

## 🚫 ¿Por qué NO funciona SQL?

Este problema **NO es de base de datos**. Es un problema de **red/Docker** en el API Gateway Kong.

- Kong es un proxy inverso que recibe peticiones HTTP
- Kong intenta reenviar las peticiones a los servicios backend
- Kong usa nombres DNS para encontrar los servicios
- Los nombres DNS no coinciden con los nombres reales de los contenedores

**SQL no puede solucionar problemas de configuración de red.**

---

## ✅ SOLUCIÓN REQUERIDA

Necesitamos modificar el archivo de configuración de Kong que está en el servidor.

### Archivo a modificar:
```
/volumes/kong.yml  (dentro del contenedor o volumen de supabase-kong)
```

### Cambios necesarios:

```yaml
# ANTES (incorrecto):
upstream_url: http://auth:9999

# DESPUÉS (correcto):
upstream_url: http://supabase-auth:9999
```

---

## 🚀 OPCIONES PARA APLICAR EL FIX

### Opción 1: Acceso SSH al servidor (RECOMENDADA)

Si tienes acceso SSH al servidor donde está Easypanel:

```bash
# 1. Conectar al servidor
ssh usuario@tu-servidor

# 2. Encontrar el volumen de Kong
docker volume ls | grep kong

# 3. Copiar el archivo corregido
cp /ruta/al/kong-easypanel.yml /var/lib/docker/volumes/supabase_kong/_data/kong.yml

# 4. Reiniciar Kong
docker restart supabase-kong

# 5. Verificar
curl https://supabase.pulsossociales.com/auth/v1/health -H "apikey: tu-api-key"
```

### Opción 2: Panel de Easypanel

Si puedes acceder al panel de Easypanel:

1. Ve a tu panel: `https://tu-dominio-easypanel:3000`
2. Encuentra el servicio `supabase-kong`
3. Ve a la sección "Volumes"
4. Edita el archivo `kong.yml`
5. Cambia los upstreams (ver `kong-easypanel.yml` para referencia)
6. Reinicia el servicio

### Opción 3: Redeploy completo

Si nada más funciona, puedes hacer un redeploy completo:

1. Detener todos los servicios de Supabase
2. Actualizar la configuración de Kong
3. Volver a iniciar los servicios

---

## 📋 ARCHIVOS PREPARADOS

Los siguientes archivos están listos en GitHub:

1. **`deploy/volumes/api/kong-easypanel.yml`** - Configuración corregida
2. **`deploy/fix-supabase.sh`** - Script de auto-reparación
3. **`deploy/diagnose-supabase.sh`** - Script de diagnóstico
4. **`deploy/EASYPANEL-FIX.md`** - Guía completa

---

## 🔍 VERIFICACIÓN

Después de aplicar el fix, verifica:

```bash
# Debería devolver 401 (no 503)
curl -i https://supabase.pulsossociales.com/auth/v1/health \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE"
```

**Éxito:** HTTP 401 Unauthorized (significa que Kong resuelve el servicio)
**Fallo:** HTTP 503 con "name resolution failed"

---

## 📞 CONTACTO

Si necesitas ayuda para aplicar este fix, contacta a:
- Tu administrador de sistemas
- El soporte de Easypanel
- Un desarrollador con acceso al servidor

---

## ⏰ URGENTE

Este problema está **BLOQUEANDO** el login de usuarios. La aplicación no puede funcionar sin el servicio de autenticación.

**Prioridad: CRÍTICA** 🔴
