# Security Checklist - Pulsos Sociales

## Checklist de Seguridad para Producción

**Versión:** 1.0.0  
**Fecha:** 2026-03-31  
**Estado:** ✅ COMPLETADO

---

## 1. Puertos y Red

### 1.1 PostgreSQL (Puerto 5432)
- [x] Puerto 5432 NO expuesto externamente en `docker-compose.yml`
- [x] Puerto 5432 NO expuesto externamente en `deploy/easypanel/pulsos-sociales.json`
- [x] PostgreSQL solo accesible internamente entre contenedores
- [x] Firewall (UFW) configurado para bloquear puerto 5432

**Verificación:**
```bash
# Verificar que el puerto no está expuesto
sudo netstat -tlnp | grep 5432
# Debe retornar vacío o solo mostrar 127.0.0.1

# Verificar estado del firewall
sudo ufw status | grep 5432
# No debe mostrar ninguna regla permitiendo 5432
```

### 1.2 Otros Puertos Internos
- [x] Puerto 3000 (Supabase Studio) - No expuesto en producción
- [x] Puerto 9999 (Auth) - Solo acceso interno
- [x] Puerto 8080 (Meta) - Solo acceso interno
- [x] Puerto 4000 (Realtime) - Solo acceso interno
- [x] Puerto 5000 (Storage) - Solo acceso interno
- [x] Puerto 5001 (ImgProxy) - Solo acceso interno

### 1.3 Puertos Públicos
- [x] Puerto 22 (SSH) - Abierto para administración
- [x] Puerto 80 (HTTP) - Abierto para frontend
- [x] Puerto 443 (HTTPS) - Abierto para frontend (recomendado)
- [x] Puerto 8000 (Kong API Gateway) - Solo si se usa externamente

---

## 2. Docker Compose

### 2.1 Resource Limits
- [x] Frontend: 512MB RAM, 1 CPU
- [x] PostgreSQL: 1GB RAM, 1 CPU
- [x] Auth: 256MB RAM, 0.5 CPU
- [x] REST: 256MB RAM, 0.5 CPU
- [x] Kong: 256MB RAM, 0.5 CPU
- [x] Otros servicios: 256MB RAM, 0.5 CPU

**Verificación:**
```bash
# Verificar que los límites están aplicados
docker stats --no-stream
```

### 2.2 Exposición de Puertos
- [x] Usar `expose` en lugar de `ports` para servicios internos
- [x] Comentar o eliminar líneas `ports` para servicios internos
- [x] Solo el frontend y Kong (opcional) deben tener `ports`

---

## 3. EasyPanel Configuration

### 3.1 Service Ports
- [x] `supabase-db`: `servicePort: null` (no expuesto)
- [x] `supabase-studio`: `servicePort: null` (no expuesto)
- [x] `supabase-auth`: `servicePort: null` (no expuesto)
- [x] `supabase-rest`: `servicePort: null` (no expuesto)
- [x] `supabase-realtime`: `servicePort: null` (no expuesto)
- [x] `supabase-storage`: `servicePort: null` (no expuesto)
- [x] `supabase-imgproxy`: `servicePort: null` (no expuesto)
- [x] `supabase-meta`: `servicePort: null` (no expuesto)
- [x] `pulsos-frontend`: `servicePort: 80` (expuesto)
- [x] `supabase-kong`: `servicePort: 8000` (expuesto)

### 3.2 Resource Limits
- [x] Todos los servicios tienen `resources.memory` configurado
- [x] Todos los servicios tienen `resources.cpu` configurado

---

## 4. Firewall (UFW)

### 4.1 Configuración del Firewall
- [x] Script `deploy/firewall-setup.sh` creado
- [x] Política por defecto: DENY incoming
- [x] Puerto 22 permitido (SSH)
- [x] Puerto 80 permitido (HTTP)
- [x] Puerto 443 permitido (HTTPS)
- [x] Puerto 5432 bloqueado explícitamente
- [x] Logging habilitado

**Ejecución:**
```bash
# Configurar firewall
sudo bash deploy/firewall-setup.sh

# Verificar estado
sudo bash deploy/firewall-setup.sh --verify
```

---

## 5. Variables de Entorno

### 5.1 Secrets Management
- [ ] Usar Docker Secrets o similar para contraseñas
- [ ] No hardcodear contraseñas en archivos de configuración
- [ ] Rotar contraseñas periódicamente
- [ ] Usar contraseñas fuertes (mínimo 32 caracteres)

### 5.2 JWT Secrets
- [ ] JWT_SECRET debe ser único y fuerte
- [ ] ANON_KEY debe ser diferente en cada ambiente
- [ ] SERVICE_ROLE_KEY nunca debe exponerse al frontend

---

## 6. SSL/TLS

### 6.1 Certificados
- [ ] Usar HTTPS en producción (puerto 443)
- [ ] Certificados válidos y no expirados
- [ ] Configurar redirección de HTTP a HTTPS
- [ ] Habilitar HSTS

### 6.2 Kong SSL
- [ ] Configurar SSL termination en Kong
- [ ] Usar certificados wildcard si es necesario

---

## 7. Monitoreo y Logging

### 7.1 Logs
- [x] UFW logging habilitado
- [ ] Configurar log aggregation (opcional)
- [ ] Configurar alertas de seguridad

### 7.2 Monitoreo
- [ ] Monitorear uso de recursos (CPU/Memoria)
- [ ] Alertas para uso anormal de recursos
- [ ] Monitorear intentos de conexión fallidos

---

## 8. Backup y Recuperación

### 8.1 Backups
- [ ] Backups automáticos de PostgreSQL
- [ ] Backups cifrados
- [ ] Probar restauración periódicamente

### 8.2 Disaster Recovery
- [ ] Documentar procedimiento de recuperación
- [ ] Tener plan de contingencia
- [ ] SLA definido

---

## 9. Actualizaciones

### 9.1 Imágenes Docker
- [ ] Usar versiones específicas de imágenes (no `latest`)
- [ ] Plan de actualización de imágenes de seguridad
- [ ] Probar actualizaciones en staging primero

### 9.2 Sistema Operativo
- [ ] Actualizaciones automáticas de seguridad
- [ ] Parchar vulnerabilidades críticas inmediatamente

---

## 10. Acceso y Autenticación

### 10.1 SSH
- [ ] Deshabilitar login con contraseña (usar keys)
- [ ] Cambiar puerto SSH (opcional)
- [ ] Fail2ban configurado
- [ ] Solo usuarios autorizados tienen acceso SSH

### 10.2 Supabase Auth
- [ ] RLS habilitado en todas las tablas
- [ ] Políticas de RLS revisadas
- [ ] MFA habilitado para usuarios admin

---

## Verificación Final

Ejecutar estos comandos para verificar la configuración:

```bash
# 1. Verificar que PostgreSQL no está expuesto
sudo netstat -tlnp | grep 5432 || echo "✓ Puerto 5432 no expuesto"

# 2. Verificar estado del firewall
sudo ufw status verbose

# 3. Verificar reglas de UFW
sudo ufw status numbered

# 4. Verificar contenedores en ejecución
docker ps

# 5. Verificar uso de recursos
docker stats --no-stream

# 6. Verificar logs de firewall
sudo tail -f /var/log/ufw.log
```

---

## Historial de Cambios

| Fecha | Versión | Cambios | Autor |
|-------|---------|---------|-------|
| 2026-03-31 | 1.0.0 | Configuración inicial de seguridad | Pulsos Team |

---

## Notas

- Este checklist debe revisarse mensualmente
- Cualquier cambio en la infraestructura debe actualizar este documento
- Reportar problemas de seguridad inmediatamente

---

**Firma de Aprobación:**

- [ ] DevOps Lead
- [ ] Security Lead
- [ ] Tech Lead

**Fecha de Aprobación:** ___________
