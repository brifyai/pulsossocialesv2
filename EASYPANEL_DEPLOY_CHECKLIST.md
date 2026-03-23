# EasyPanel Deploy Checklist - Pulsos Sociales

## PASO 1: Frontend (Vite + Nginx)

### 1.1 Editar archivo nginx.conf
- [ ] Abrir `nginx.conf` en el editor
- [ ] Pegar contenido corregido con regex escapada: `\.`
- [ ] Verificar que tenga `server_name _;`
- [ ] Verificar health check en `/health`

### 1.2 Editar Dockerfile
- [ ] Abrir `Dockerfile` en el editor
- [ ] Verificar que tenga ARG y ENV para:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_MAPTILER_KEY`
- [ ] Verificar multi-stage build (builder + nginx)

### 1.3 Configurar Build Args en EasyPanel
- [ ] Ir a servicio frontend en EasyPanel
- [ ] Agregar Build Args:
  ```
  VITE_SUPABASE_URL=https://supabase.pulsossociales.com
  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
  VITE_MAPTILER_KEY=TU_MAPTILER_KEY
  ```

### 1.4 Rebuild Frontend
- [ ] Hacer commit/push de cambios a git
- [ ] En EasyPanel: Rebuild servicio frontend
- [ ] Verificar logs: `docker logs <frontend-container>`
- [ ] Probar health check: `curl https://pulsossociales.com/health`

---

## PASO 2: Supabase (docker-compose)

### 2.1 Verificar deploy/.env
- [ ] Abrir `deploy/.env` en el servidor
- [ ] Confirmar variables:
  ```
  POSTGRES_PASSWORD=TU_PASSWORD
  JWT_SECRET=TU_JWT_SECRET
  ANON_KEY=TU_ANON_KEY
  SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
  SITE_URL=https://pulsossociales.com
  API_EXTERNAL_URL=https://supabase.pulsossociales.com
  SUPABASE_PUBLIC_URL=https://supabase.pulsossociales.com
  STUDIO_DEFAULT_ORGANIZATION=Pulsos Sociales
  STUDIO_DEFAULT_PROJECT=Pulsos Sociales
  ENABLE_EMAIL_AUTOCONFIRM=true
  ```

### 2.2 Verificar docker-compose.supabase.yml
- [ ] Confirmar que `GOTRUE_MAILER_AUTOCONFIRM` usa `ENABLE_EMAIL_AUTOCONFIRM`
- [ ] Confirmar que studio tiene `SUPABASE_ANON_KEY: ${ANON_KEY:-}`
- [ ] Confirmar que studio tiene `SUPABASE_SERVICE_ROLE_KEY: ${SERVICE_ROLE_KEY:-}`

### 2.3 Rebuild Supabase
- [ ] En EasyPanel: Rebuild servicio supabase
- [ ] Verificar que db esté healthy: `docker ps`
- [ ] Verificar que studio esté healthy

---

## PASO 3: Verificación Post-Deploy

### 3.1 Revisar Logs de Studio
- [ ] `docker logs pulsos-supabase-studio`
- [ ] Buscar errores "Invalid input"
- [ ] Verificar que no haya variables undefined

### 3.2 Revisar Logs de Meta
- [ ] `docker logs pulsos-supabase-meta`
- [ ] Verificar conexión a PostgreSQL

### 3.3 Probar URLs
- [ ] Frontend: `https://pulsossociales.com` → Debe cargar la SPA
- [ ] Health: `https://pulsossociales.com/health` → Debe retornar "ok"
- [ ] Supabase Studio: `https://supabase.pulsossociales.com` → Debe abrir
- [ ] Schemas: En Studio, ir a "Database" → "Schemas" → Debe cargar

---

## PASO 4: Troubleshooting

### Si Studio muestra "Invalid input: expected string, received undefined":
1. Verificar que `ANON_KEY` y `SERVICE_ROLE_KEY` estén en el .env
2. Verificar que `SUPABASE_PUBLIC_URL` esté correcta
3. Rebuild studio: `docker-compose restart studio`

### Si el frontend no carga:
1. Verificar logs de nginx: `docker logs <frontend-container>`
2. Verificar que el build se completó sin errores
3. Verificar que los Build Args se pasaron correctamente

### Si auth falla:
1. Verificar que `JWT_SECRET` sea consistente
2. Verificar `SITE_URL` y `API_EXTERNAL_URL`
3. Revisar logs de auth: `docker logs pulsos-supabase-auth`

---

## Resumen de Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `nginx.conf` | Regex corregida `\.`, `server_name _`, health check |
| `Dockerfile` | ARG y ENV para variables Vite |
| `deploy/docker-compose.supabase.yml` | `ENABLE_EMAIL_AUTOCONFIRM` en lugar de `MAILER_AUTOCONFIRM` |

---

**Fecha:** 23/03/2026
**Estado:** Listo para deploy
