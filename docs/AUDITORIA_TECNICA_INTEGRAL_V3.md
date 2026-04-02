# AUDITORÍA TÉCNICA INTEGRAL - PULSOS SOCIALES

**Fecha:** 2026-04-02  
**Auditor:** Claude (Anthropic)  
**Versión:** 3.0  
**Estado:** COMPLETADA

---

## A. RESUMEN EJECUTIVO

### Descripción de Arquitectura
Pulsos Sociales es una SPA de simulación de opinión pública basada en agentes sintéticos para Chile. Frontend en Vite + TypeScript + MapLibre GL JS, backend en Supabase self-hosted (PostgreSQL + PostgREST + Kong Gateway), autenticación custom sobre tabla `users` (NO usa Supabase Auth), datos de ~20M agentes sintéticos. Infraestructura Docker con nginx, CI/CD en GitHub Actions.

### Nivel de Riesgo Global
**MEDIO-ALTO**: Sistema funcional con buenas prácticas de seguridad básicas, pero con vulnerabilidades significativas en rate limiting (solo en memoria), ausencia de CSP headers, y potencial exposición de secrets en build args de Docker.

### Top 5 Hallazgos Críticos/Altos

| ID | Hallazgo | Severidad |
|----|----------|-----------|
| H-001 | Rate limiter solo en memoria (no persiste entre recargas) | ALTO |
| H-002 | Secrets pasados como build-args en Dockerfile (potencial exposición en layers) | ALTO |
| H-003 | Ausencia de Content Security Policy (CSP) headers en nginx | ALTO |
| H-004 | Vite middleware sirve archivos del filesystem sin validación de path | MEDIO |
| H-005 | No hay tests de seguridad en CI/CD pipeline | MEDIO |

### Top 5 Fortalezas

1. **Autenticación robusta**: PBKDF2 con 100k iteraciones, salt único por password
2. **RLS implementado**: Políticas de seguridad a nivel de fila en tablas críticas
3. **Audit logging**: Sistema de logging de eventos de seguridad
4. **TypeScript strict**: Configuración estricta del compilador
5. **Docker multi-stage**: Build optimizado con nginx alpine

### Veredicto
**APTO CONDICIONAL PARA PRODUCCIÓN**

Condiciones:
- Implementar rate limiting persistente (Redis/DB)
- Agregar CSP headers en nginx
- Mover secrets a runtime (no build-time)
- Implementar tests de seguridad en CI/CD
- Configurar monitoreo de seguridad

---

## B. MAPA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTE (NAVEGADOR)                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   MapLibre GL   │  │  Custom Auth    │  │   Vite SPA      │             │
│  │   (Mapas)       │  │  (JWT+PBKDF2)   │  │   (Frontend)    │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
└───────────┼────────────────────┼────────────────────┼──────────────────────┘
            │                    │                    │
            │ HTTPS              │ HTTPS              │ HTTPS
            │                    │                    │
┌───────────▼────────────────────▼────────────────────▼──────────────────────┐
│                              KONG GATEWAY                                   │
│                    (API Gateway - Puerto 8000)                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   Rate Limiting │  │   JWT Auth      │  │   CORS          │             │
│  │   (Kong Plugin) │  │   (Kong Plugin) │  │   (Kong Plugin) │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
└───────────┼────────────────────┼────────────────────┼──────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   GoTrue Auth   │  │  PostgREST API  │  │  Storage API    │
│   (Puerto 9999) │  │  (Puerto 3000)  │  │  (Puerto 5000)  │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   (Puerto 5438) │
                    │   - users       │
                    │   - agents      │
                    │   - surveys     │
                    └─────────────────┘
```

### Tabla de Componentes

| Componente | Tecnología | Responsabilidad | Nivel de Confianza |
|------------|------------|-----------------|-------------------|
| Frontend | Vite + TS | UI/UX, Mapas | Untrusted |
| Kong | Kong 2.8.1 | API Gateway, Auth | Trusted |
| GoTrue | Supabase gotrue | Auth JWT | Trusted |
| PostgREST | PostgREST v12 | REST API | Trusted |
| PostgreSQL | Postgres 15 | Persistencia | Trusted |
| Custom Auth | TypeScript | Login/Session | Trusted |

### Trust Boundaries

1. **Cliente ↔ Kong**: HTTPS, JWT tokens
2. **Kong ↔ Servicios**: Internal network, service tokens
3. **Servicios ↔ PostgreSQL**: Internal network, postgres auth
4. **Build-time ↔ Runtime**: Secrets en build-args (RISK)

---

## C. HALLAZGOS DETALLADOS

### 1. Seguridad de Autenticación y Sesiones

#### HALLAZGO-001: Rate Limiter Solo en Memoria
**Severidad:** ALTO  
**Categoría:** Seguridad de Autenticación y Sesiones  
**Archivo(s):** `src/services/auth/rateLimiter.ts` (líneas 1-127)

**Descripción:**
El rate limiter implementado usa `Map<string, LoginAttempt>` para almacenar intentos en memoria. Esto significa que:
1. Los intentos se pierden al recargar la página
2. Un atacante puede bypass el rate limiting cambiando de IP o usando modo incógnito
3. No hay protección contra ataques distribuidos

**Evidencia:**
```typescript
// src/services/auth/rateLimiter.ts
export class RateLimiter {
  private attempts = new Map<string, LoginAttempt>(); // Solo en memoria
  // ...
}
```

**Vector de ataque:**
1. Atacante intenta login con fuerza bruta
2. Llega al límite de 5 intentos
3. Abre nueva ventana incógnito o cambia IP
4. Rate limiter se resetea (nuevo Map)
5. Puede continuar atacando indefinidamente

**Impacto:**
- Bypass completo de protección contra fuerza bruta
- Riesgo de compromiso de cuentas por password guessing

**Remediación:**
```typescript
// Implementar rate limiting en Supabase
// Crear tabla login_attempts

// migrations/20250402_add_rate_limiting.sql
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- email o IP
  attempt_count INTEGER DEFAULT 1,
  first_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_login_attempts_identifier ON login_attempts(identifier);
CREATE INDEX idx_login_attempts_locked ON login_attempts(locked_until) 
  WHERE locked_until IS NOT NULL;

// Función para verificar rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(p_identifier TEXT)
RETURNS TABLE (
  blocked BOOLEAN,
  remaining_seconds INTEGER
) AS $$
DECLARE
  v_attempt RECORD;
  v_max_attempts INTEGER := 5;
  v_lockout_minutes INTEGER := 15;
BEGIN
  SELECT * INTO v_attempt 
  FROM login_attempts 
  WHERE identifier = p_identifier
  AND first_attempt_at > NOW() - INTERVAL '30 minutes';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;
  
  IF v_attempt.locked_until IS NOT NULL 
     AND v_attempt.locked_until > NOW() THEN
    RETURN QUERY SELECT 
      TRUE, 
      EXTRACT(EPOCH FROM (v_attempt.locked_until - NOW()))::INTEGER;
    RETURN;
  END IF;
  
  IF v_attempt.attempt_count >= v_max_attempts THEN
    UPDATE login_attempts 
    SET locked_until = NOW() + (v_lockout_minutes || ' minutes')::INTERVAL
    WHERE id = v_attempt.id;
    
    RETURN QUERY SELECT TRUE, v_lockout_minutes * 60;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT FALSE, 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Validación:**
```bash
# Test de rate limiting
for i in {1..10}; do
  curl -X POST https://supabase.pulsossociales.com/auth/v1/token \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# El 6to intento debería retornar 429 Too Many Requests
```

**Prioridad:** P0  
**Esfuerzo estimado:** 8 horas (implementación + testing)

---

#### HALLAZGO-002: Secrets en Build Args de Docker
**Severidad:** ALTO  
**Categoría:** Exposición de Secretos y Configuración  
**Archivo(s):** 
- `Dockerfile` (líneas 20-22)
- `.github/workflows/docker-build.yml` (líneas 60-62)

**Descripción:**
Los secrets (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_MAPTILER_KEY) se pasan como build-args en el Dockerfile. Esto significa que quedan almacenados en las layers de la imagen Docker y pueden ser extraídos con `docker history`.

**Evidencia:**
```dockerfile
# Dockerfile
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_MAPTILER_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_MAPTILER_KEY=$VITE_MAPTILER_KEY
```

**Vector de ataque:**
1. Atacante obtiene acceso a la imagen Docker (registry o servidor)
2. Ejecuta: `docker history --no-trunc <image>`
3. Ve los valores de los build-args en las layers
4. Obtiene acceso a Supabase y MapTiler

**Impacto:**
- Exposición completa de credenciales
- Acceso no autorizado a base de datos
- Uso abusivo de API keys

**Remediación:**
```dockerfile
# Dockerfile corregido - NO usar build-args para secrets
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# NO pasar secrets como build-args
# En su lugar, usar runtime injection
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

# Script de entrypoint para inyectar secrets en runtime
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

```bash
# docker-entrypoint.sh
#!/bin/sh
set -e

# Reemplazar placeholders con variables de entorno
envsubst '${VITE_SUPABASE_URL} ${VITE_SUPABASE_ANON_KEY} ${VITE_MAPTILER_KEY}' \
  < /usr/share/nginx/html/assets/env.template.js \
  > /usr/share/nginx/html/assets/env.js

exec "$@"
```

```javascript
// env.template.js
window.ENV = {
  VITE_SUPABASE_URL: "${VITE_SUPABASE_URL}",
  VITE_SUPABASE_ANON_KEY: "${VITE_SUPABASE_ANON_KEY}",
  VITE_MAPTILER_KEY: "${VITE_MAPTILER_KEY}"
};
```

**Validación:**
```bash
# Verificar que no hay secrets en la imagen
docker history --no-trunc pulsos-frontend:latest | grep -i "supabase\|maptiler"
# No debería mostrar ningún resultado
```

**Prioridad:** P0  
**Esfuerzo estimado:** 4 horas

---

### 2. Seguridad de Infraestructura

#### HALLAZGO-003: Ausencia de CSP Headers
**Severidad:** ALTO  
**Categoría:** Seguridad de Infraestructura  
**Archivo(s):** `nginx.conf` (líneas 1-30)

**Descripción:**
El archivo nginx.conf no incluye headers de seguridad críticos como Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, etc. Esto expone la aplicación a ataques XSS, clickjacking y MIME sniffing.

**Evidencia:**
```nginx
# nginx.conf actual
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    # ... NO hay security headers
}
```

**Vector de ataque:**
1. **XSS**: Atacante inyecta script malicioso que se ejecuta en el contexto de la app
2. **Clickjacking**: Sitio malicioso carga la app en un iframe invisible
3. **MIME sniffing**: Navegador interpreta archivos de forma incorrecta

**Impacto:**
- Robo de sesiones
- Acciones no autorizadas en nombre del usuario
- Defacement

**Remediación:**
```nginx
# nginx.conf corregido
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    
    # Content Security Policy
    add_header Content-Security-Policy "default-src 'self'; \
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.maptiler.com; \
        style-src 'self' 'unsafe-inline' https://*.maptiler.com; \
        img-src 'self' data: blob: https://*.maptiler.com https://api.maptiler.com; \
        connect-src 'self' https://*.pulsossociales.com https://api.maptiler.com; \
        font-src 'self'; \
        frame-ancestors 'none'; \
        base-uri 'self'; \
        form-action 'self';" always;

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "ok\n";
        add_header Content-Type text/plain;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        try_files $uri =404;
    }

    # Fallback SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
}
```

**Validación:**
```bash
# Verificar headers
curl -I https://pulsosociales.com
# Debería mostrar todos los security headers
```

**Prioridad:** P1  
**Esfuerzo estimado:** 2 horas

---

#### HALLAZGO-004: Vite Middleware Sin Validación de Path
**Severidad:** MEDIO  
**Categoría:** Seguridad de Infraestructura  
**Archivo(s):** `vite.config.ts` (líneas 20-45)

**Descripción:**
El middleware personalizado de Vite sirve archivos desde `/data/` sin validar adecuadamente el path, permitiendo potencialmente path traversal si no se sanitiza correctamente.

**Evidencia:**
```typescript
// vite.config.ts
server.middlewares.use((req, res, next) => {
  if (req.url?.startsWith('/data/')) {
    const filePath = path.resolve(__dirname, req.url.slice(1));
    // No hay validación de que filePath esté dentro de __dirname
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      // ...
    }
  }
});
```

**Vector de ataque:**
1. Atacante solicita: `/data/../../../etc/passwd`
2. Si path.resolve no sanitiza correctamente, podría leer archivos del sistema

**Impacto:**
- Lectura de archivos sensibles del servidor
- Exposición de configuraciones

**Remediación:**
```typescript
// vite.config.ts corregido
import { resolve, normalize, isAbsolute } from 'path';

server.middlewares.use((req, res, next) => {
  if (req.url?.startsWith('/data/')) {
    // Sanitizar el path
    const requestedPath = decodeURIComponent(req.url.slice(1));
    const filePath = normalize(resolve(__dirname, requestedPath));
    const dataDir = resolve(__dirname, 'data');
    
    // Validar que el path está dentro del directorio data
    if (!filePath.startsWith(dataDir)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }
    
    // Validar que no es un directorio
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }
    
    // Validar extensión permitida
    const allowedExtensions = ['.json', '.csv', '.txt'];
    const ext = path.extname(filePath).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      // ... resto del código
    }
  }
});
```

**Validación:**
```bash
# Test de path traversal
curl http://localhost:5173/data/../../../etc/passwd
# Debería retornar 403 Forbidden
```

**Prioridad:** P1  
**Esfuerzo estimado:** 2 horas

---

### 3. Testing y QA

#### HALLAZGO-005: Ausencia de Tests de Seguridad en CI/CD
**Severidad:** MEDIO  
**Categoría:** Testing y QA  
**Archivo(s):** `.github/workflows/docker-build.yml` (líneas 1-75)

**Descripción:**
El pipeline de CI/CD no ejecuta tests de seguridad (npm audit, escaneo de vulnerabilidades, tests de autenticación). Solo ejecuta el build de Docker.

**Evidencia:**
```yaml
# .github/workflows/docker-build.yml
jobs:
  build:
    steps:
    - name: Checkout repository
    - name: Set up Docker Buildx
    - name: Log in to Container Registry
    - name: Build and push Docker image
    # NO hay pasos de testing o seguridad
```

**Impacto:**
- Vulnerabilidades conocidas pueden pasar a producción
- No hay validación automática de seguridad
- Dependencias vulnerables no se detectan

**Remediación:**
```yaml
# .github/workflows/docker-build.yml corregido
jobs:
  security-checks:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run security audit
      run: npm audit --audit-level=moderate
    
    - name: Run tests
      run: npm run test:run
    
    - name: Run TypeScript check
      run: npx tsc --noEmit
    
    - name: Lint code
      run: npx eslint src/ --ext .ts
    
    - name: Check for secrets in code
      uses: trufflesecurity/trufflehog@main
      with:
        path: ./
        base: main
        head: HEAD

  build:
    needs: security-checks
    runs-on: ubuntu-latest
    steps:
    # ... resto del build
```

**Validación:**
```bash
# Verificar que el pipeline falla con vulnerabilidades
npm audit --audit-level=moderate
# Debería fallar si hay vulnerabilidades
```

**Prioridad:** P1  
**Esfuerzo estimado:** 4 horas

---

## D. THREAT MODEL (STRIDE)

### Flujo 1: Login

| Amenaza | Categoría | Probabilidad | Impacto | Riesgo | Mitigación actual | Mitigación requerida |
|---------|-----------|--------------|---------|--------|-------------------|---------------------|
| Fuerza bruta en passwords | Tampering | Alta | Alto | CRÍTICO | Rate limiter en memoria (bypassable) | Rate limiting persistente en DB |
| Robo de sesión | Information Disclosure | Media | Alto | ALTO | JWT en localStorage | HttpOnly cookies + refresh tokens |
| Password guessing | Spoofing | Media | Alto | ALTO | PBKDF2 100k iteraciones | Implementar MFA |

### Flujo 2: Acceso a Datos

| Amenaza | Categoría | Probabilidad | Impacto | Riesgo | Mitigación actual | Mitigación requerida |
|---------|-----------|--------------|---------|--------|-------------------|---------------------|
| SQL Injection | Tampering | Baja | Alto | MEDIO | PostgREST (query builder) | Validar RLS policies |
| Exposición de datos | Information Disclosure | Media | Alto | ALTO | RLS implementado | Auditar RLS policies |
| Escalamiento de privilegios | Elevation | Baja | Alto | MEDIO | Role-based access | Implementar ABAC |

### Flujo 3: Simulación

| Amenaza | Categoría | Probabilidad | Impacto | Riesgo | Mitigación actual | Mitigación requerida |
|---------|-----------|--------------|---------|--------|-------------------|---------------------|
| Manipulación de resultados | Tampering | Baja | Alto | MEDIO | Validación de inputs | Firmar resultados |
| DoS en simulación | Denial of Service | Media | Medio | MEDIO | Resource limits | Rate limiting por usuario |

---

## E. MATRIZ DE PRIORIDADES

| ID | Título | Severidad | Impacto | Esfuerzo (h) | Prioridad | Área |
|----|--------|-----------|---------|--------------|-----------|------|
| H-002 | Secrets en build args | ALTO | Alto | 4 | P0 | Infraestructura |
| H-001 | Rate limiter en memoria | ALTO | Alto | 8 | P0 | Autenticación |
| H-003 | Ausencia de CSP | ALTO | Alto | 2 | P1 | Infraestructura |
| H-005 | No tests de seguridad en CI/CD | MEDIO | Medio | 4 | P1 | QA |
| H-004 | Path traversal en Vite | MEDIO | Medio | 2 | P1 | Infraestructura |

---

## F. PLAN DE REMEDIACIÓN POR FASES

### Fase 1: Emergencia (48 horas)

**Acciones:**
1. **H-002**: Mover secrets a runtime injection
   - Modificar Dockerfile
   - Crear docker-entrypoint.sh
   - Actualizar docker-compose.yml
   - **Validación**: `docker history` no muestra secrets

2. **H-001**: Implementar rate limiting básico en Supabase
   - Crear tabla login_attempts
   - Crear función check_rate_limit
   - Modificar customAuth.ts para usar DB
   - **Validación**: Test de fuerza bruta falla después de 5 intentos

### Fase 2: Quick Wins (1-2 semanas)

**Acciones:**
1. **H-003**: Agregar CSP headers
   - Actualizar nginx.conf
   - Testear en staging
   - **Validación**: Headers presentes en respuestas

2. **H-004**: Validar paths en Vite middleware
   - Agregar sanitización de path
   - Validar extensiones permitidas
   - **Validación**: Path traversal retorna 403

3. **H-005**: Agregar tests de seguridad a CI/CD
   - npm audit en pipeline
   - trufflehog para secrets
   - **Validación**: Pipeline falla con vulnerabilidades

### Fase 3: Corto Plazo (1-2 meses)

**Acciones:**
1. Implementar MFA para usuarios admin
2. Migrar JWT de localStorage a HttpOnly cookies
3. Implementar monitoreo de seguridad (failed logins, anomalías)
4. Auditar y fortalecer RLS policies

### Fase 4: Mediano Plazo (3-6 meses)

**Acciones:**
1. Implementar ABAC (Attribute-Based Access Control)
2. Agregar WAF (Web Application Firewall)
3. Implementar SIEM para logs de seguridad
4. Penetration testing profesional

---

## G. ANÁLISIS DE DEPENDENCIAS

### Dependencias Directas

| Paquete | Versión | Riesgo | Acción |
|---------|---------|--------|--------|
| @supabase/supabase-js | ^2.99.1 | Bajo | Mantener actualizado |
| maplibre-gl | ^5.20.1 | Bajo | Mantener actualizado |
| tslib | ^2.8.1 | Bajo | Ninguna |

### Dev Dependencies

| Paquete | Versión | Riesgo | Acción |
|---------|---------|--------|--------|
| vite | ^8.0.0 | Bajo | Mantener actualizado |
| typescript | ~5.9.3 | Bajo | Ninguna |
| vitest | ^3.0.0 | Bajo | Ninguna |

### Recomendaciones

1. **Ejecutar `npm audit` semanalmente** en CI/CD
2. **Habilitar Dependabot** para actualizaciones automáticas
3. **Revisar advisories** de seguridad de Supabase y MapLibre

---

## H. ANÁLISIS DE BUNDLE Y PERFORMANCE

### Estimación de Tamaño

Basado en dependencias:
- **MapLibre GL**: ~500KB (gzipped)
- **Supabase JS**: ~100KB (gzipped)
- **Código aplicación**: ~200KB (estimado)
- **Total estimado**: ~800KB-1MB (gzipped)

### Code Splitting Actual

- ✅ Vite configura code splitting automático
- ✅ Lazy loading de componentes de página
- ⚠️ MapLibre GL se carga en bundle principal (considerar lazy load)

### Optimizaciones Recomendadas

1. **Lazy load MapLibre**: Cargar solo cuando se navega al mapa
2. **Preload crítico**: Agregar `<link rel="preload">` para assets críticos
3. **Service Worker**: Implementar caching con Workbox

---

## I. SCORE GENERAL

| Área | Score (1-10) | Justificación |
|------|--------------|---------------|
| Seguridad Autenticación | 6 | PBKDF2 bien implementado, pero rate limiter débil |
| Seguridad Datos | 7 | RLS implementado, pero falta auditar policies |
| Infraestructura | 5 | Docker OK, pero faltan security headers |
| Exposición Secrets | 4 | Secrets en build args es riesgo mayor |
| Rendimiento | 7 | Bundle razonable, pero puede optimizarse |
| Type Safety | 8 | TypeScript strict habilitado |
| Testing | 5 | Tests unitarios existentes, pero no de seguridad |
| CI/CD | 6 | Pipeline funcional, pero falta seguridad |
| **PROMEDIO PONDERADO** | **6.1/10** | Seguridad pesa 2x |

---

## J. INFORMACIÓN FALTANTE

Para completar hallazgos pendientes, necesito:

1. **Logs de producción**: Para analizar patrones de ataque
2. **Configuración de Kong**: Ver plugins de seguridad habilitados
3. **Variables de entorno reales**: Confirmar qué secrets están expuestos
4. **Reportes de npm audit**: Para vulnerabilidades conocidas
5. **Acceso a instancia Supabase**: Para auditar RLS policies en producción

---

## K. CONCLUSIONES

### 3 Acciones para Esta Semana (16 horas)

1. **Mover secrets a runtime** (4h) - H-002
2. **Implementar rate limiting en DB** (8h) - H-001
3. **Agregar CSP headers** (2h) - H-003
4. **Agregar tests de seguridad a CI/CD** (2h) - H-005

### 3 Acciones para Este Mes (40 horas)

1. **Auditar todas las RLS policies** (16h)
2. **Implementar MFA para admins** (16h)
3. **Migrar JWT a HttpOnly cookies** (8h)

### 3 Acciones para 3 Meses (120 horas)

1. **Implementar ABAC completo** (40h)
2. **Agregar WAF y monitoreo** (40h)
3. **Penetration testing profesional** (40h)

### Riesgos que Evolucionarán

| Riesgo | Timeline | Impacto si no se actúa |
|--------|----------|------------------------|
| Compromiso de credenciales | 1-3 meses | Acceso total a base de datos |
| Ataques de fuerza bruta | Inmediato | Cuentas de usuarios comprometidas |
| XSS/Clickjacking | 1-6 meses | Robo de sesiones, acciones no autorizadas |
| Compliance | 6-12 meses | Problemas legales con Ley 19.628 |

---

## APÉNDICE: COMANDOS DE VERIFICACIÓN

```bash
# Verificar headers de seguridad
curl -I https://pulsosociales.com

# Verificar secrets en imagen Docker
docker history --no-trunc pulsos-frontend:latest

# Test de rate limiting
for i in {1..10}; do
  curl -X POST https://supabase.pulsossociales.com/auth/v1/token \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done

# Verificar RLS policies
psql -h localhost -p 5438 -U postgres -c "\dp"

# npm audit
npm audit --audit-level=moderate
```

---

**Fin del Informe**
