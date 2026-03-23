# Fix para Supabase en EasyPanel

## 📋 Resumen del Problema

Los logs de EasyPanel muestran múltiples errores en la instancia de Supabase:

1. **Auth (GoTrue)**: Error crítico - `GOTRUE_EXTERNAL_GOOGLE_ENABLED` está vacío y debería ser un booleano
2. **REST API (PostgREST)**: Error de conexión a PostgreSQL - `could not look up local user ID 1000`
3. **Analytics (Logflare)**: Crash por problemas de conexión a la base de datos
4. **Base de datos**: PostgreSQL no responde correctamente (errores 500 en pg-meta)

## 🔧 Solución Aplicada

### 1. Variables de Autenticación Externa Faltantes

Se agregaron las siguientes variables al archivo `deploy/.env`:

```env
# External Auth Providers (set to false to disable)
GOTRUE_EXTERNAL_GOOGLE_ENABLED=false
GOTRUE_EXTERNAL_GITHUB_ENABLED=false
GOTRUE_EXTERNAL_APPLE_ENABLED=false
GOTRUE_EXTERNAL_AZURE_ENABLED=false
GOTRUE_EXTERNAL_DISCORD_ENABLED=false
GOTRUE_EXTERNAL_FACEBOOK_ENABLED=false
GOTRUE_EXTERNAL_FIGMA_ENABLED=false
GOTRUE_EXTERNAL_GITLAB_ENABLED=false
GOTRUE_EXTERNAL_KEYCLOAK_ENABLED=false
GOTRUE_EXTERNAL_LINKEDIN_ENABLED=false
GOTRUE_EXTERNAL_NOTION_ENABLED=false
GOTRUE_EXTERNAL_TWITCH_ENABLED=false
GOTRUE_EXTERNAL_TWITTER_ENABLED=false
GOTRUE_EXTERNAL_SLACK_ENABLED=false
GOTRUE_EXTERNAL_SPOTIFY_ENABLED=false
GOTRUE_EXTERNAL_WORKOS_ENABLED=false
GOTRUE_EXTERNAL_ZOOM_ENABLED=false
```

### 2. Actualización de docker-compose.supabase.yml

Se agregaron las variables correspondientes al servicio `auth` en el archivo `docker-compose.supabase.yml`.

### 3. Script de Fix Automatizado

Se creó el script `fix-easypanel-supabase.sh` que automatiza todo el proceso de reparación.

## 🚀 Instrucciones para Aplicar el Fix en EasyPanel

### Opción A: Usar la Interfaz de EasyPanel (Sin SSH - Recomendado)

Si no tienes acceso SSH al servidor, puedes aplicar el fix directamente desde la interfaz web de EasyPanel:

1. **Accede al servicio `supabase-auth` en EasyPanel**:
   - Ve a tu panel de EasyPanel
   - Busca el servicio `supabase-auth` (o `pulsos-sociales-supabase-auth`)
   - Haz clic en "Edit" o "Settings"

2. **Agrega las variables de entorno faltantes**:
   En la sección de Environment Variables, agrega las siguientes variables (todas con valor `false`):

   ```
   GOTRUE_EXTERNAL_GOOGLE_ENABLED=false
   GOTRUE_EXTERNAL_GITHUB_ENABLED=false
   GOTRUE_EXTERNAL_APPLE_ENABLED=false
   GOTRUE_EXTERNAL_AZURE_ENABLED=false
   GOTRUE_EXTERNAL_DISCORD_ENABLED=false
   GOTRUE_EXTERNAL_FACEBOOK_ENABLED=false
   GOTRUE_EXTERNAL_FIGMA_ENABLED=false
   GOTRUE_EXTERNAL_GITLAB_ENABLED=false
   GOTRUE_EXTERNAL_KEYCLOAK_ENABLED=false
   GOTRUE_EXTERNAL_LINKEDIN_ENABLED=false
   GOTRUE_EXTERNAL_NOTION_ENABLED=false
   GOTRUE_EXTERNAL_TWITCH_ENABLED=false
   GOTRUE_EXTERNAL_TWITTER_ENABLED=false
   GOTRUE_EXTERNAL_SLACK_ENABLED=false
   GOTRUE_EXTERNAL_SPOTIFY_ENABLED=false
   GOTRUE_EXTERNAL_WORKOS_ENABLED=false
   GOTRUE_EXTERNAL_ZOOM_ENABLED=false
   ```

3. **Reinicia el servicio**:
   - Guarda los cambios
   - Haz clic en "Restart" o "Redeploy" para el servicio `supabase-auth`

4. **Verifica que el servicio esté funcionando**:
   - Espera 30-60 segundos
   - Revisa los logs del servicio para confirmar que no hay errores

### Opción B: Re-desplegar desde el Template (Si tienes acceso al template)

1. **Actualiza el archivo `pulsos-sociales.json`** en tu repositorio (ya está actualizado en este commit)

2. **En EasyPanel, ve a "Templates" > "Import Template"**

3. **Sube o pega el contenido del archivo actualizado** `deploy/easypanel/pulsos-sociales.json`

4. **EasyPanel detectará los cambios** y te permitirá actualizar los servicios

5. **Aplica los cambios** y los servicios se reiniciarán con la nueva configuración

### Opción C: Usar el Script Automatizado (Requiere SSH)

Si tienes acceso SSH al servidor:

1. **Conectarse al servidor de EasyPanel** vía SSH:
   ```bash
   ssh root@tu-servidor-easypanel
   ```

2. **Navegar al directorio del proyecto**:
   ```bash
   cd /path/to/pulsos-sociales/deploy
   ```

3. **Ejecutar el script de fix**:
   ```bash
   ./fix-easypanel-supabase.sh
   ```

4. **Verificar que los servicios estén healthy**:
   ```bash
   docker-compose -f docker-compose.supabase.yml ps
   ```

## ✅ Verificación del Fix

### Verificar Auth (GoTrue)

```bash
# Health check
curl http://localhost:9999/health

# Probar registro
curl -X POST 'http://localhost:8000/auth/v1/signup' \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456!"}'
```

### Verificar REST API

```bash
# Health check
curl http://localhost:8000/rest/v1/
```

### Verificar PostgreSQL

```bash
docker-compose -f docker-compose.supabase.yml exec db pg_isready -U postgres
```

## 📊 Estado Esperado Después del Fix

| Servicio | Estado Esperado | Puerto |
|----------|----------------|--------|
| db | healthy | 5432 |
| auth | healthy | 9999 |
| rest | healthy | 3000 |
| kong | healthy | 8000, 8443 |
| studio | healthy | 3000 |
| storage | healthy | 5000 |
| meta | healthy | 8080 |

## 🔍 Troubleshooting

### Si Auth sigue fallando

```bash
# Ver logs detallados
docker-compose -f docker-compose.supabase.yml logs -f auth

# Reiniciar solo el servicio auth
docker-compose -f docker-compose.supabase.yml restart auth
```

### Si PostgreSQL no responde

```bash
# Verificar logs de PostgreSQL
docker-compose -f docker-compose.supabase.yml logs -f db

# Reiniciar PostgreSQL
docker-compose -f docker-compose.supabase.yml restart db
```

### Si hay problemas de red

```bash
# Recrear la red Docker
docker network rm pulsos-network
docker network create --driver bridge pulsos-network

# Reiniciar todos los servicios
docker-compose -f docker-compose.supabase.yml down
docker-compose -f docker-compose.supabase.yml up -d
```

## 📝 Notas Importantes

1. **Backup**: Antes de aplicar el fix, considera hacer un backup de la base de datos:
   ```bash
   docker-compose -f docker-compose.supabase.yml exec db pg_dump -U postgres postgres > backup.sql
   ```

2. **Variables de entorno**: Asegúrate de que todas las variables en `.env` estén correctamente configuradas antes de reiniciar.

3. **Puertos**: Verifica que los puertos configurados en `.env` no estén en uso por otros servicios.

4. **EasyPanel**: Si estás usando EasyPanel, asegúrate de que los cambios se sincronicen con la interfaz de EasyPanel.

## 📞 Soporte

Si el problema persiste después de aplicar el fix:

1. Revisa los logs completos: `docker-compose -f docker-compose.supabase.yml logs`
2. Verifica la conectividad de red entre contenedores
3. Consulta la documentación de Supabase self-hosted: https://supabase.com/docs/guides/self-hosting

---

**Última actualización**: 23 de marzo de 2026
**Versión del fix**: 1.0.0
