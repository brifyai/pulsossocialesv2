# EasyPanel Deploy Checklist - Pulsos Sociales

## Frontend

- [ ] Reemplazar nginx.conf por el limpio (regex escapada `\.`, `server_name _`, health check)
- [ ] Verificar Dockerfile con ARG + ENV para Vite:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_MAPTILER_KEY`
- [ ] Configurar Build Args en EasyPanel:
  ```
  VITE_SUPABASE_URL=https://supabase.pulsossociales.com
  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
  VITE_MAPTILER_KEY=TU_MAPTILER_KEY
  ```
- [ ] Rebuild frontend
- [ ] Revisar logs de nginx
- [ ] Abrir https://pulsossociales.com

## Supabase

- [ ] Pegar .env actualizado en EasyPanel con:
  ```
  SITE_URL=https://pulsossociales.com
  API_EXTERNAL_URL=https://supabase.pulsossociales.com
  SUPABASE_PUBLIC_URL=https://supabase.pulsossociales.com
  STUDIO_DEFAULT_ORGANIZATION=Pulsos Sociales
  STUDIO_DEFAULT_PROJECT=Pulsos Sociales
  DB_ENC_KEY=0d9072c8d56752cc9d7b818bc11273be
  MAILER_AUTOCONFIRM=true
  ENABLE_EMAIL_AUTOCONFIRM=true
  ```
- [ ] Rebuild supabase
- [ ] Revisar logs de:
  - studio
  - meta
  - auth
  - kong

## Validaciones

- [ ] Abrir https://supabase.pulsossociales.com
- [ ] Abrir https://pulsossociales.com
- [ ] Probar request: https://supabase.pulsossociales.com/rest/v1/
- [ ] Revisar DevTools > Network en frontend
- [ ] Revisar consola del navegador

---

**Archivos modificados:**
- `nginx.conf` - Regex corregida
- `Dockerfile` - ARG/ENV para Vite
- `deploy/docker-compose.supabase.yml` - `ENABLE_EMAIL_AUTOCONFIRM`
- `deploy/.env` - `MAILER_AUTOCONFIRM` agregado

**Fecha:** 23/03/2026
