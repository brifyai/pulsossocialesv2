# ✅ Checklist de Deploy - Pulsos Sociales

## Pre-Deploy

### 1. Preparación del Código

- [ ] **Branch correcto**: Estoy en la branch que quiero deployar
  ```bash
  git branch --show-current
  ```

- [ ] **Código actualizado**: Últimos cambios del repositorio
  ```bash
  git pull origin main
  ```

- [ ] **Tests pasan**: Todos los tests ejecutan correctamente
  ```bash
  npm ci && npm run test:run
  ```
  - [ ] Tests unitarios: ✅
  - [ ] Tests de integración: ✅
  - [ ] Cobertura > 80%: ✅

- [ ] **Build local exitoso**: El build se completa sin errores
  ```bash
  npm run build
  ```
  - [ ] Sin errores de TypeScript: ✅
  - [ ] Sin errores de Vite: ✅
  - [ ] Archivos generados en `dist/`: ✅

### 2. Variables de Entorno

- [ ] **VITE_MAPTILER_KEY**: Configurada y válida
  ```bash
  echo $VITE_MAPTILER_KEY
  ```

- [ ] **VITE_SUPABASE_URL** (opcional): Configurada si se usa persistencia
  ```bash
  echo $VITE_SUPABASE_URL
  ```

- [ ] **VITE_SUPABASE_ANON_KEY** (opcional): Configurada si se usa persistencia
  ```bash
  echo $VITE_SUPABASE_ANON_KEY
  ```

- [ ] **Verificar conexión Supabase** (si aplica):
  ```bash
  curl $VITE_SUPABASE_URL/rest/v1/territories?limit=1 \
    -H "apikey: $VITE_SUPABASE_ANON_KEY"
  ```

### 3. Docker (si aplica)

- [ ] **Docker instalado y corriendo**:
  ```bash
  docker --version
  docker ps
  ```

- [ ] **Espacio en disco suficiente**:
  ```bash
  docker system df
  ```

- [ ] **Imagen anterior taggeada** (para rollback):
  ```bash
  docker tag pulsos-sociales:latest pulsos-sociales:backup-$(date +%Y%m%d-%H%M%S)
  ```

---

## Deploy

### 4. Build de Imagen Docker

- [ ] **Build con variables correctas**:
  ```bash
  docker build -t pulsos-sociales:latest \
    --build-arg VITE_MAPTILER_KEY=$VITE_MAPTILER_KEY \
    --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
    --build-arg VCS_REF=$(git rev-parse --short HEAD) \
    .
  ```

- [ ] **Build exitoso**: Sin errores en la salida

- [ ] **Imagen creada correctamente**:
  ```bash
  docker images | grep pulsos-sociales
  ```

### 5. Deploy del Contenedor

- [ ] **Detener contenedor anterior** (si existe):
  ```bash
  docker stop pulsos-frontend || true
  docker rm pulsos-frontend || true
  ```

- [ ] **Iniciar nuevo contenedor**:
  ```bash
  docker run -d \
    --name pulsos-frontend \
    -p 80:80 \
    --restart unless-stopped \
    pulsos-sociales:latest
  ```

- [ ] **Contenedor corriendo**:
  ```bash
  docker ps | grep pulsos-frontend
  ```

### 6. Verificación Post-Deploy

- [ ] **Health check pasa**:
  ```bash
  curl -f http://localhost/health
  # Debe retornar: healthy
  ```

- [ ] **Status endpoint funciona**:
  ```bash
  curl http://localhost/health/status
  # Debe retornar JSON con status: healthy
  ```

- [ ] **Health UI accesible**:
  ```bash
  curl -f http://localhost/health/ui
  # Debe retornar HTML
  ```

- [ ] **Versión correcta**:
  ```bash
  curl http://localhost/version.json
  # Verificar que coincida con el commit actual
  ```

- [ ] **Logs sin errores críticos**:
  ```bash
  docker logs pulsos-frontend --tail 50
  ```
  - [ ] Sin errores de Nginx: ✅
  - [ ] Sin errores de aplicación: ✅

### 7. Verificación Funcional

- [ ] **Página principal carga**:
  ```bash
  curl -f http://localhost/ | head -20
  ```

- [ ] **Assets estáticos sirven**:
  ```bash
  curl -f http://localhost/assets/ 2>&1 | head -5
  ```

- [ ] **Mapa funciona** (verificar en navegador):
  - [ ] Mapa carga correctamente
  - [ ] Marcadores visibles
  - [ ] Interacciones funcionan

- [ ] **Autenticación funciona** (si aplica):
  - [ ] Login con credenciales válidas
  - [ ] Login con credenciales inválidas (debe fallar)
  - [ ] Sesión persiste después de refresh

- [ ] **Datos persistentes** (si aplica):
  - [ ] Crear agente
  - [ ] Verificar en base de datos
  - [ ] Recargar página - datos persisten

---

## Post-Deploy

### 8. Monitoreo

- [ ] **Health checks automáticos configurados**:
  - [ ] Intervalo: 30s
  - [ ] Timeout: 3s
  - [ ] Retries: 3

- [ ] **Alertas configuradas** (si aplica):
  - [ ] Health check falla
  - [ ] Uso de CPU > 80%
  - [ ] Uso de memoria > 80%

- [ ] **Logs centralizados** (si aplica):
  - [ ] Configuración de logging
  - [ ] Retención de logs definida

### 9. Documentación

- [ ] **Versión documentada**:
  ```bash
  echo "Deploy v$(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d '[[:space:]]') - $(date)" >> deploys.log
  ```

- [ ] **Cambios documentados**:
  - [ ] Nuevas features
  - [ ] Bug fixes
  - [ ] Breaking changes

- [ ] **Equipo notificado**:
  - [ ] Slack/Teams
  - [ ] Email
  - [ ] Ticket actualizado

---

## Rollback (en caso de problemas)

### 10. Procedimiento de Rollback

- [ ] **Identificar problema**:
  - [ ] Health check falla
  - [ ] Errores en logs
  - [ ] Funcionalidad rota

- [ ] **Detener contenedor actual**:
  ```bash
  docker stop pulsos-frontend
  docker rm pulsos-frontend
  ```

- [ ] **Identificar imagen anterior**:
  ```bash
  docker images | grep pulsos-sociales
  ```

- [ ] **Iniciar versión anterior**:
  ```bash
  docker run -d \
    --name pulsos-frontend \
    -p 80:80 \
    --restart unless-stopped \
    pulsos-sociales:backup-YYYYMMDD-HHMMSS
  ```

- [ ] **Verificar rollback exitoso**:
  - [ ] Health check pasa
  - [ ] Funcionalidad básica OK
  - [ ] Logs sin errores

- [ ] **Notificar equipo**:
  - [ ] Problema identificado
  - [ ] Rollback completado
  - [ ] Próximos pasos

---

## Docker Compose (Alternativa)

### Deploy con Docker Compose

- [ ] **Variables en .env**:
  ```bash
  cat .env
  VITE_MAPTILER_KEY=xxx
  VITE_SUPABASE_URL=xxx
  VITE_SUPABASE_ANON_KEY=xxx
  ```

- [ ] **Deploy**:
  ```bash
  docker-compose up -d --build
  ```

- [ ] **Verificar servicios**:
  ```bash
  docker-compose ps
  docker-compose logs -f
  ```

### Rollback con Docker Compose

- [ ] **Editar docker-compose.yml** para usar imagen específica:
  ```yaml
  services:
    frontend:
      image: pulsos-sociales:backup-YYYYMMDD-HHMMSS
      # build: ... (comentar)
  ```

- [ ] **Reiniciar**:
  ```bash
  docker-compose up -d
  ```

---

## EasyPanel (Alternativa)

### Deploy en EasyPanel

- [ ] **Variables configuradas**:
  - [ ] VITE_MAPTILER_KEY: ✅
  - [ ] Container Port: 80
  - [ ] Service Port: 80

- [ ] **Build configurado**:
  - [ ] Type: Dockerfile
  - [ ] Dockerfile: Dockerfile

- [ ] **Deploy iniciado**:
  - [ ] Build en progreso
  - [ ] Sin errores en logs

- [ ] **Verificación**:
  - [ ] URL accesible
  - [ ] Health check pasa
  - [ ] Funcionalidad OK

---

## Notas

### Comandos Útiles

```bash
# Ver logs en tiempo real
docker logs -f pulsos-frontend

# Entrar al contenedor
docker exec -it pulsos-frontend sh

# Ver configuración de Nginx
docker exec pulsos-frontend cat /etc/nginx/conf.d/default.conf

# Ver archivos estáticos
docker exec pulsos-frontend ls -la /usr/share/nginx/html

# Reiniciar contenedor
docker restart pulsos-frontend

# Limpiar imágenes antiguas
docker image prune -a
```

### Troubleshooting Rápido

| Problema | Comando de diagnóstico |
|----------|------------------------|
| No carga | `curl -v http://localhost/health` |
| Error 502 | `docker logs pulsos-frontend` |
| Mapa no muestra | Verificar `VITE_MAPTILER_KEY` |
| No conecta a DB | Verificar `VITE_SUPABASE_URL` |
| Assets 404 | `docker exec pulsos-frontend ls /usr/share/nginx/html/assets` |

---

## Firma

**Deploy realizado por**: _________________

**Fecha**: _________________

**Versión**: _________________

**Commit**: _________________

**Resultado**: [ ] Éxito [ ] Rollback

**Notas**: _________________________________________________
