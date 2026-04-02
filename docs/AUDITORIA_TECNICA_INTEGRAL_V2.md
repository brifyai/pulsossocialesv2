# Auditoría Técnica Integral - Pulsos Sociales v2

**Fecha:** 4 de enero de 2026  
**Auditor:** Claude (Anthropic)  
**Versión:** 2.0  
**Alcance:** Frontend, Backend, Base de Datos, Seguridad, Infraestructura, DevOps

---

## A. RESUMEN EJECUTIVO

### Estado General y Arquitectura de Alto Nivel

**Pulsos Sociales** es una aplicación SPA (Single Page Application) construida con:
- **Frontend:** Vite + TypeScript + MapLibre GL para visualización geoespacial
- **Backend:** Supabase (PostgreSQL + PostgREST) con autenticación custom
- **Datos:** ~20M de agentes sintéticos representando la población de Chile
- **Arquitectura:** Cliente pesado con procesamiento local + sincronización con Supabase

### Nivel de Riesgo Global: **ALTO** ⚠️

**Justificación:**
1. **CRÍTICO:** Tokens de sesión almacenados en localStorage (vulnerable a XSS)
2. **CRÍTICO:** Ausencia de MFA (Multi-Factor Authentication)
3. **ALTO:** Múltiples migraciones RLS duplicadas y potencialmente conflictivas
4. **ALTO:** No hay rate limiting en el backend de Supabase (solo en frontend)
5. **ALTO:** Sin headers de seguridad HTTP configurados en nginx
6. **MEDIO:** Sin política de Content Security Policy (CSP)
7. **MEDIO:** Sin mecanismo de revocación de sesiones

### Fortalezas Notables ✅

1. **PBKDF2 con 100K iteraciones** para hashing de contraseñas
2. **Rate limiting en frontend** (5 intentos cada 15 minutos)
3. **Audit logging** de eventos de autenticación
4. **Separación clara** entre ANON_KEY (frontend) y SERVICE_KEY (scripts)
5. **Validación estricta** de variables de entorno en scripts
6. **RLS policies** implementadas (aunque con deuda técnica)
7. **Migración automática** de hashes legacy a PBKDF2

### Principales Problemas Críticos y de Alto Riesgo

| # | Problema | Severidad | Impacto |
|---|----------|-----------|---------|
| 1 | Tokens en localStorage | CRÍTICO | Robo de sesión vía XSS |
| 2 | Sin MFA | CRÍTICO | Compromiso de cuentas |
| 3 | Migraciones RLS duplicadas | ALTO | Políticas inconsistentes |
| 4 | Sin rate limiting en backend | ALTO | Ataques de fuerza bruta |
| 5 | Sin headers de seguridad | ALTO | Vulnerabilidades XSS/CSRF |
| 6 | Sin revocación de sesiones | ALTO | Sesiones persistentes indefinidamente |

### Recomendación Global

**NO APTA PARA PRODUCCIÓN** sin las siguientes correcciones:

1. **Inmediatas (P0):**
   - Implementar httpOnly cookies para tokens
   - Configurar headers de seguridad en nginx
   - Consolidar migraciones RLS

2. **Corto plazo (P1):**
   - Implementar MFA
   - Rate limiting en Supabase
   - CSP headers

3. **Mediano plazo (P2):**
   - Sistema de revocación de sesiones
   - Monitoreo de seguridad
   - Tests de seguridad automatizados

---

## B. MAPA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTE (BROWSER)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │   Vite SPA   │  │  MapLibre GL │  │  Auth Custom │  │  OpinionEngine  │ │
│  │  TypeScript  │  │   (Mapas)    │  │  (localStorage)│  │  (Simulación)   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘ │
│         │                 │                 │                    │          │
│         └─────────────────┴─────────────────┴────────────────────┘          │
│                                    │                                        │
│                         ┌──────────▼──────────┐                             │
│                         │  Supabase Client    │                             │
│                         │  (ANON_KEY only)    │                             │
│                         └──────────┬──────────┘                             │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │ HTTPS
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE (PostgreSQL)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │   RLS Policies│  │    Tables    │  │   Functions  │  │   Triggers      │ │
│  │  (Seguridad) │  │  (users, etc)│  │  (PostgREST) │  │  (Auditoría)    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                     ▲
                                     │ SERVICE_KEY (scripts only)
┌────────────────────────────────────┼────────────────────────────────────────┐
│                         SCRIPTS (Node.js/TS)                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │   Migrations │  │    Rollout   │  │    Seed      │  │   Maintenance   │ │
│  │   (RLS fix)  │  │  (Surveys)   │  │  (Agents)    │  │   (Backup)      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Flujo de Datos Principal

1. **Ingesta de Datos:**
   ```
   CENSO/CASEN → Scripts Node.js → Supabase (20M agentes sintéticos)
   ```

2. **Autenticación:**
   ```
   Usuario → Login → PBKDF2 verify → Token → localStorage
   ```

3. **Visualización de Mapas:**
   ```
   MapLibre GL → Viewport query → Supabase → Clustering → Render
   ```

4. **Simulación de Encuestas:**
   ```
   Survey Runner → OpinionEngine → Agent State → Supabase
   ```

---

## C. HALLAZGOS DETALLADOS POR CATEGORÍA

### 1. SEGURIDAD 🔒

#### HALLAZGO-001: Tokens de sesión en localStorage
- **Severidad:** CRÍTICO
- **Componente:** `src/services/auth/customAuth.ts` (líneas 45-70)
- **Descripción:** Los tokens de sesión se almacenan en localStorage, vulnerable a ataques XSS
- **Evidencia:**
  ```typescript
  function saveSession(session: AuthSession): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));  // ❌ Vulnerable
  }
  ```
- **Impacto:** Un atacante con XSS puede robar tokens y suplantar usuarios
- **Recomendación:** Migrar a httpOnly cookies con SameSite=Strict
- **Prioridad:** P0
- **Esfuerzo:** Alto (requiere cambio arquitectónico)

#### HALLAZGO-002: Ausencia de MFA
- **Severidad:** CRÍTICO
- **Componente:** Sistema de autenticación completo
- **Descripción:** No existe implementación de Multi-Factor Authentication
- **Impacto:** Compromiso de cuentas por password leaks o phishing
- **Recomendación:** Implementar TOTP (Time-based One-Time Password) con librerías como `otplib`
- **Prioridad:** P0
- **Esfuerzo:** Alto

#### HALLAZGO-003: Sin rate limiting en backend
- **Severidad:** ALTO
- **Componente:** Supabase/PostgreSQL
- **Descripción:** El rate limiting existe solo en frontend (`src/services/auth/rateLimiter.ts`), no en backend
- **Evidencia:** El rate limiter es local al navegador, fácilmente bypassable
- **Impacto:** Ataques de fuerza bruta directos a la API de Supabase
- **Recomendación:** Implementar rate limiting en PostgreSQL con extensiones como `pg_ratelimit` o en API Gateway
- **Prioridad:** P1
- **Esfuerzo:** Medio

#### HALLAZGO-004: Sin mecanismo de revocación de sesiones
- **Severidad:** ALTO
- **Componente:** `src/services/auth/tokenManager.ts`
- **Descripción:** No hay forma de invalidar sesiones activas (logout solo limpia localStorage)
- **Impacto:** Sesiones robadas permanecen válidas hasta expirar (7 días)
- **Recomendación:** Implementar tabla de sesiones activas con posibilidad de revocación
- **Prioridad:** P1
- **Esfuerzo:** Medio

#### HALLAZGO-005: Sin headers de seguridad HTTP
- **Severidad:** ALTO
- **Componente:** `nginx.conf`
- **Descripción:** No se configuran headers de seguridad (HSTS, X-Frame-Options, CSP, etc.)
- **Evidencia:**
  ```nginx
  # nginx.conf actual - sin headers de seguridad
  server {
      listen 80;
      # ... falta add_header
  }
  ```
- **Recomendación:** Agregar:
  ```nginx
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header Content-Security-Policy "default-src 'self'; ..." always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  ```
- **Prioridad:** P0
- **Esfuerzo:** Bajo

#### HALLAZGO-006: Sin Content Security Policy (CSP)
- **Severidad:** MEDIO
- **Componente:** Headers HTTP
- **Descripción:** No hay CSP configurado, permitiendo ejecución de scripts inline
- **Impacto:** Mayor superficie de ataque para XSS
- **Recomendación:** Implementar CSP restrictivo con nonces o hashes
- **Prioridad:** P1
- **Esfuerzo:** Medio

#### HALLAZGO-007: Validación de inputs insuficiente
- **Severidad:** MEDIO
- **Componente:** Múltiples formularios
- **Descripción:** Validación básica de email/password pero sin sanitización exhaustiva
- **Recomendación:** Implementar validación con Zod o similar en todos los inputs
- **Prioridad:** P2
- **Esfuerzo:** Medio

### 2. BASE DE DATOS 🗄️

#### HALLAZGO-008: Múltiples migraciones RLS duplicadas
- **Severidad:** ALTO
- **Componente:** `migrations/20250330_fix_scenario_events_rls*.sql`
- **Descripción:** Existen 5+ versiones de migraciones RLS para la misma tabla
- **Evidencia:**
  - `20250330_fix_scenario_events_rls.sql`
  - `20250330_fix_scenario_events_rls_v2.sql`
  - `20250330_fix_scenario_events_rls_v3.sql`
  - `20250330_fix_scenario_events_rls_v4_SECURE.sql`
  - `20250331_fix_scenario_events_rls_manual.sql`
  - `20250331_fix_scenario_events_rls_emergency.sql`
- **Impacto:** Políticas inconsistentes, comportamiento impredecible
- **Recomendación:** Consolidar en una única migración idempotente
- **Prioridad:** P0
- **Esfuerzo:** Medio

#### HALLAZGO-009: Sin índices optimizados para queries geoespaciales
- **Severidad:** MEDIO
- **Componente:** Tabla `synthetic_agents`
- **Descripción:** Queries por viewport pueden ser lentas sin índices espaciales
- **Recomendación:** Crear índice GiST en coordenadas geográficas
- **Prioridad:** P1
- **Esfuerzo:** Bajo

#### HALLAZGO-010: Sin estrategia de backup documentada
- **Severidad:** MEDIO
- **Componente:** Infraestructura
- **Descripción:** No hay documentación ni scripts de backup automatizados
- **Recomendación:** Implementar backups diarios con `pg_dump` o solución cloud
- **Prioridad:** P1
- **Esfuerzo:** Medio

### 3. FRONTEND 🎨

#### HALLAZGO-011: Sin protección CSRF
- **Severidad:** MEDIO
- **Componente:** Formularios
- **Descripción:** No hay tokens CSRF en formularios
- **Impacto:** Ataques CSRF posibles (aunque mitigado parcialmente por SameSite cookies)
- **Recomendación:** Implementar tokens CSRF para operaciones sensibles
- **Prioridad:** P2
- **Esfuerzo:** Medio

#### HALLAZGO-012: Carga de 20M agentes sin virtualización
- **Severidad:** MEDIO
- **Componente:** `src/app/layers/agentsViewport.ts`
- **Descripción:** Aunque hay clustering, la carga inicial puede ser pesada
- **Recomendación:** Implementar carga progresiva y virtualización
- **Prioridad:** P2
- **Esfuerzo:** Alto

### 4. INFRAESTRUCTURA/DEVOPS 🚀

#### HALLAZGO-013: Docker Compose sin límites de recursos
- **Severidad:** MEDIO
- **Componente:** `docker-compose.yml`
- **Descripción:** No hay límites de CPU/memoria configurados
- **Recomendación:** Agregar `deploy.resources.limits` en servicios
- **Prioridad:** P2
- **Esfuerzo:** Bajo

#### HALLAZGO-014: Sin health checks en contenedores
- **Severidad:** MEDIO
- **Componente:** `Dockerfile`, `docker-compose.yml`
- **Descripción:** No hay health checks configurados
- **Recomendación:** Agregar `HEALTHCHECK` en Dockerfile
- **Prioridad:** P2
- **Esfuerzo:** Bajo

#### HALLAZGO-015: CI/CD sin análisis de seguridad
- **Severidad:** MEDIO
- **Componente:** `.github/workflows/docker-build.yml`
- **Descripción:** El pipeline no incluye escaneo de vulnerabilidades
- **Recomendación:** Agregar `npm audit`, Trivy, o Snyk al pipeline
- **Prioridad:** P2
- **Esfuerzo:** Bajo

### 5. TESTING 🧪

#### HALLAZGO-016: Cobertura de tests de seguridad insuficiente
- **Severidad:** MEDIO
- **Componente:** `src/services/auth/__tests__/auth.test.ts`
- **Descripción:** Tests básicos pero sin tests de penetración o fuzzing
- **Recomendación:** Agregar tests para XSS, SQL injection, rate limiting
- **Prioridad:** P2
- **Esfuerzo:** Medio

### 6. DOCUMENTACIÓN 📚

#### HALLAZGO-017: Documentación de seguridad dispersa
- **Severidad:** BAJO
- **Componente:** `docs/SECURITY_HARDENING_PHASE_1.md`
- **Descripción:** La documentación existe pero está fragmentada
- **Recomendación:** Consolidar en un único documento de seguridad
- **Prioridad:** P3
- **Esfuerzo:** Bajo

---

## D. MATRIZ DE PRIORIDADES

| Hallazgo | Severidad | Impacto | Esfuerzo | Prioridad | Área |
|----------|-----------|---------|----------|-----------|------|
| HALLAZGO-001: Tokens en localStorage | CRÍTICO | Alto | Alto | P0 | Seguridad |
| HALLAZGO-002: Sin MFA | CRÍTICO | Alto | Alto | P0 | Seguridad |
| HALLAZGO-005: Sin headers de seguridad | ALTO | Alto | Bajo | P0 | Infraestructura |
| HALLAZGO-008: Migraciones RLS duplicadas | ALTO | Alto | Medio | P0 | Base de Datos |
| HALLAZGO-003: Sin rate limiting backend | ALTO | Alto | Medio | P1 | Seguridad |
| HALLAZGO-004: Sin revocación de sesiones | ALTO | Alto | Medio | P1 | Seguridad |
| HALLAZGO-006: Sin CSP | MEDIO | Medio | Medio | P1 | Seguridad |
| HALLAZGO-009: Sin índices geoespaciales | MEDIO | Medio | Bajo | P1 | Base de Datos |
| HALLAZGO-010: Sin backup documentado | MEDIO | Alto | Medio | P1 | Infraestructura |
| HALLAZGO-007: Validación insuficiente | MEDIO | Medio | Medio | P2 | Seguridad |
| HALLAZGO-011: Sin CSRF | MEDIO | Medio | Medio | P2 | Frontend |
| HALLAZGO-012: Carga sin virtualización | MEDIO | Medio | Alto | P2 | Frontend |
| HALLAZGO-013: Sin límites recursos | MEDIO | Bajo | Bajo | P2 | Infraestructura |
| HALLAZGO-014: Sin health checks | MEDIO | Bajo | Bajo | P2 | Infraestructura |
| HALLAZGO-015: CI/CD sin seguridad | MEDIO | Medio | Bajo | P2 | DevOps |
| HALLAZGO-016: Tests de seguridad | MEDIO | Medio | Medio | P2 | Testing |
| HALLAZGO-017: Documentación dispersa | BAJO | Bajo | Bajo | P3 | Documentación |

---

## E. PLAN DE REMEDIACIÓN POR FASES

### Quick Wins (1-2 semanas)

#### 1. Configurar Headers de Seguridad en Nginx
**Archivo:** `nginx.conf`

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Headers de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # CSP básico (ajustar según necesidades)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.supabase.co;" always;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Validación:**
```bash
# Verificar headers
curl -I http://localhost
# Debe mostrar todos los headers de seguridad
```

#### 2. Consolidar Migraciones RLS
**Archivo:** `migrations/20250401_consolidate_rls_final.sql`

```sql
-- Eliminar políticas existentes de forma segura
DROP POLICY IF EXISTS "scenario_events_select_policy" ON scenario_events;
DROP POLICY IF EXISTS "scenario_events_insert_policy" ON scenario_events;
DROP POLICY IF EXISTS "scenario_events_update_policy" ON scenario_events;
DROP POLICY IF EXISTS "scenario_events_delete_policy" ON scenario_events;

-- Crear políticas consolidadas y seguras
CREATE POLICY "scenario_events_select" ON scenario_events
    FOR SELECT USING (
        auth.uid()::text = user_id::text OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
    );

CREATE POLICY "scenario_events_insert" ON scenario_events
    FOR INSERT WITH CHECK (
        auth.uid()::text = user_id::text
    );

CREATE POLICY "scenario_events_update" ON scenario_events
    FOR UPDATE USING (
        auth.uid()::text = user_id::text OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
    );

CREATE POLICY "scenario_events_delete" ON scenario_events
    FOR DELETE USING (
        auth.uid()::text = user_id::text OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
    );
```

**Validación:**
```bash
# Aplicar migración
npm run migrate

# Verificar políticas
psql $DATABASE_URL -c "\d scenario_events"
```

#### 3. Agregar Health Checks
**Archivo:** `Dockerfile`

```dockerfile
# Al final del Dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health.html || exit 1
```

**Archivo:** `docker-compose.yml`

```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/health.html"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Corto Plazo (1-2 meses)

#### 4. Implementar httpOnly Cookies
**Nuevo archivo:** `src/services/auth/cookieManager.ts`

```typescript
/**
 * Gestión segura de sesiones con httpOnly cookies
 * Requiere endpoint de backend para setear cookies
 */

const COOKIE_NAME = 'pulsossociales_session';
const CSRF_COOKIE_NAME = 'pulsossociales_csrf';

interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
}

/**
 * Establece una cookie segura
 * Nota: httpOnly solo funciona desde servidor
 */
export function setClientCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  const {
    secure = true,
    sameSite = 'strict',
    maxAge = 7 * 24 * 60 * 60, // 7 días
    path = '/',
  } = options;

  // Nota: httpOnly no se puede setear desde JavaScript
  // Esto requiere un endpoint de backend
  document.cookie = `${name}=${encodeURIComponent(value)}; ` +
    `Max-Age=${maxAge}; ` +
    `Path=${path}; ` +
    `SameSite=${sameSite}; ` +
    `${secure ? 'Secure;' : ''}`;
}

/**
 * Obtiene valor de cookie
 */
export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Elimina una cookie
 */
export function deleteCookie(name: string): void {
  document.cookie = `${name}=; Max-Age=0; Path=/;`;
}

/**
 * Genera token CSRF para protección
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}
```

**Nota:** Para httpOnly real, se necesita un backend intermedio (Cloudflare Workers, Vercel Edge, etc.)

#### 5. Implementar Rate Limiting en Supabase
**Archivo:** `migrations/20250401_add_rate_limiting.sql`

```sql
-- Tabla para tracking de rate limiting
CREATE TABLE IF NOT EXISTS rate_limit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    count INTEGER DEFAULT 1
);

-- Índice para queries eficientes
CREATE INDEX idx_rate_limit_log_ip_timestamp 
    ON rate_limit_log(ip_address, timestamp);

-- Función para verificar rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_ip INET,
    p_endpoint TEXT,
    p_max_requests INTEGER DEFAULT 100,
    p_window_minutes INTEGER DEFAULT 15
) RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM rate_limit_log
    WHERE ip_address = p_ip
      AND endpoint = p_endpoint
      AND timestamp > NOW() - INTERVAL '1 minute' * p_window_minutes;
    
    RETURN v_count < p_max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para logging automático
CREATE OR REPLACE FUNCTION log_rate_limit() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO rate_limit_log (ip_address, endpoint, method, user_id)
    VALUES (inet_client_addr(), TG_TABLE_NAME, TG_OP, NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 6. Agregar npm audit al CI/CD
**Archivo:** `.github/workflows/docker-build.yml`

```yaml
name: Build and Security Check

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run security audit
        run: npm audit --audit-level=high
        
      - name: Run tests
        run: npm test
        
      - name: Build
        run: npm run build
```

### Mediano Plazo (3-6 meses)

#### 7. Implementar MFA con TOTP
**Nuevo archivo:** `src/services/auth/mfaService.ts`

```typescript
/**
 * Servicio de MFA usando TOTP (Time-based One-Time Password)
 * Implementación con otplib
 */

import { authenticator } from 'otplib';

const MFA_ISSUER = 'Pulsos Sociales';

export interface MfaSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export class MfaService {
  /**
   * Genera secreto MFA para nuevo usuario
   */
  generateSecret(userEmail: string): MfaSetup {
    const secret = authenticator.generateSecret();
    
    const qrCodeUrl = authenticator.keyuri(
      userEmail,
      MFA_ISSUER,
      secret
    );
    
    // Generar códigos de backup (10 códigos de 8 caracteres)
    const backupCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );
    
    return {
      secret,
      qrCodeUrl,
      backupCodes,
    };
  }
  
  /**
   * Verifica código TOTP
   */
  verifyToken(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret });
  }
  
  /**
   * Verifica código de backup
   */
  verifyBackupCode(token: string, backupCodes: string[]): boolean {
    return backupCodes.includes(token.toUpperCase());
  }
}
```

#### 8. Sistema de Revocación de Sesiones
**Archivo:** `migrations/20250401_create_sessions_table.sql`

```sql
-- Tabla de sesiones activas
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL, -- Hash del token, no el token completo
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT
);

-- Índices
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at) 
    WHERE is_revoked = FALSE;

-- Función para validar sesión
CREATE OR REPLACE FUNCTION validate_session(p_token_hash TEXT)
RETURNS TABLE (
    is_valid BOOLEAN,
    user_id UUID,
    session_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TRUE,
        us.user_id,
        us.id
    FROM user_sessions us
    WHERE us.token_hash = p_token_hash
      AND us.expires_at > NOW()
      AND us.is_revoked = FALSE;
      
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para revocar todas las sesiones de un usuario
CREATE OR REPLACE FUNCTION revoke_all_user_sessions(
    p_user_id UUID,
    p_reason TEXT DEFAULT 'user_request'
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE user_sessions
    SET is_revoked = TRUE,
        revoked_at = NOW(),
        revoked_reason = p_reason
    WHERE user_id = p_user_id
      AND is_revoked = FALSE;
      
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 9. Implementar Monitoreo de Seguridad
**Nuevo archivo:** `src/services/security/securityMonitor.ts`

```typescript
/**
 * Monitoreo de eventos de seguridad
 */

export interface SecurityEvent {
  type: 'suspicious_login' | 'rate_limit_exceeded' | 'xss_attempt' | 'csrf_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, unknown>;
  timestamp: number;
}

export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private events: SecurityEvent[] = [];
  
  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }
  
  log(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now(),
    };
    
    this.events.push(fullEvent);
    
    // Enviar a backend si es crítico
    if (event.severity === 'critical' || event.severity === 'high') {
      this.sendToBackend(fullEvent);
    }
    
    // Log en consola en desarrollo
    if (import.meta.env.DEV) {
      console.warn('[SecurityMonitor]', fullEvent);
    }
  }
  
  private async sendToBackend(event: SecurityEvent): Promise<void> {
    try {
      // Enviar a endpoint de logging de seguridad
      await fetch('/api/security/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    } catch (error) {
      // Silent fail - no exponer errores
      console.error('Failed to send security event:', error);
    }
  }
  
  getRecentEvents(minutes: number = 60): SecurityEvent[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.events.filter(e => e.timestamp > cutoff);
  }
}
```

### Largo Plazo (6+ meses)

#### 10. Implementar WAF (Web Application Firewall)
- Considerar Cloudflare Pro o AWS WAF
- Configurar reglas para XSS, SQL injection, rate limiting

#### 11. Auditoría de Seguridad Externa
- Contratar pentesting profesional
- Certificación de seguridad (SOC 2, ISO 27001)

#### 12. Implementar SIEM
- Centralizar logs de seguridad
- Alertas en tiempo real
- Análisis de comportamiento

---

## F. RIESGOS CRÍTICOS

### RIESGO-001: Robo de Sesión por XSS
- **Probabilidad:** Media (requiere vulnerabilidad XSS)
- **Impacto:** Crítico (compromiso total de cuenta)
- **Mitigación:**
  1. Implementar httpOnly cookies (P0)
  2. Implementar CSP estricto (P1)
  3. Sanitizar todos los inputs (P2)
  4. Implementar Content Security Policy (P1)

### RIESGO-002: Ataque de Fuerza Bruta
- **Probabilidad:** Alta
- **Impacto:** Alto (compromiso de cuentas débiles)
- **Mitigación:**
  1. Rate limiting en backend (P1)
  2. Implementar MFA (P0)
  3. Política de contraseñas fuertes (ya implementado)
  4. Alertas de login sospechosos (P2)

### RIESGO-003: Bypass de RLS
- **Probabilidad:** Media (por migraciones duplicadas)
- **Impacto:** Alto (acceso no autorizado a datos)
- **Mitigación:**
  1. Consolidar migraciones RLS (P0)
  2. Tests automatizados de RLS (P2)
  3. Auditoría periódica de políticas (P2)

### RIESGO-004: Exposición de Datos Sensibles
- **Probabilidad:** Baja (datos son sintéticos)
- **Impacto:** Medio
- **Mitigación:**
  1. Encriptación en reposo (ya en Supabase)
  2. TLS 1.3 obligatorio (P1)
  3. Classificación de datos (P3)

---

## G. SCORE GENERAL

| Área | Score (1-10) | Justificación |
|------|--------------|---------------|
| **Arquitectura** | 7 | Buena separación de responsabilidades, pero autenticación custom requiere mantenimiento |
| **Seguridad** | 4 | PBKDF2 y rate limiting son buenos, pero tokens en localStorage y sin MFA son críticos |
| **Rendimiento** | 6 | Clustering implementado, pero sin índices geoespaciales optimizados |
| **Calidad de Código** | 7 | TypeScript bien tipado, pero falta validación exhaustiva de inputs |
| **Base de Datos** | 5 | RLS implementado pero con deuda técnica de migraciones |
| **Escalabilidad** | 6 | Arquitectura permite escalar, pero sin límites de recursos definidos |
| **Testing** | 5 | Tests básicos presentes, pero sin tests de seguridad |
| **Operación/Observabilidad** | 4 | Audit logging presente, pero sin monitoreo centralizado |
| **Documentación** | 6 | Documentación existe pero está dispersa |

### Score Promedio: **5.6/10**

### Conclusión sobre Aptitud para Producción

**NO APTA PARA PRODUCCIÓN** en estado actual. Se requieren las siguientes acciones antes del lanzamiento:

1. **Bloqueantes (deben completarse):**
   - [ ] Implementar httpOnly cookies o alternativa segura
   - [ ] Configurar headers de seguridad en nginx
   - [ ] Consolidar migraciones RLS
   - [ ] Implementar MFA

2. **Recomendadas (alta prioridad):**
   - [ ] Rate limiting en backend
   - [ ] Sistema de revocación de sesiones
   - [ ] CSP headers
   - [ ] Tests de seguridad automatizados

---

## H. INFORMACIÓN ADICIONAL NECESARIA

Para completar la auditoría, se necesita:

1. **Configuración real de Supabase:**
   - ¿Están habilitadas las RLS policies en producción?
   - ¿Cuál es la configuración exacta de CORS?

2. **Logs de producción:**
   - ¿Existen intentos de ataque registrados?
   - ¿Cuál es el volumen de tráfico real?

3. **Resultados de tests:**
   - Cobertura actual de tests
   - Resultados de `npm audit`

4. **Infraestructura:**
   - ¿Dónde está desplegado actualmente?
   - ¿Hay CDN configurado?

5. **Compliance:**
   - ¿Se requiere cumplir con alguna normativa específica (Chile)?
   - ¿Hay requisitos de retención de datos?

---

## I. CONCLUSIONES Y RECOMENDACIONES FINALES

### Acciones Inmediatas (Esta semana)

1. **Configurar headers de seguridad en nginx** (2 horas)
2. **Consolidar migraciones RLS** (4 horas)
3. **Ejecutar `npm audit` y corregir vulnerabilidades** (2 horas)
4. **Revisar y documentar configuración de Supabase** (2 horas)

### Acciones Este Mes

1. **Implementar httpOnly cookies** (40 horas)
   - Requiere investigación de solución sin backend propio
   - Opciones: Cloudflare Workers, Vercel Edge Functions, Netlify Functions

2. **Implementar MFA** (40 horas)
   - Diseñar flujo de usuario
   - Implementar backend para TOTP
   - Integrar con frontend

3. **Rate limiting en backend** (16 horas)
   - Implementar en PostgreSQL
   - Tests de estrés

### Acciones en 3 Meses

1. **Sistema de revocación de sesiones** (24 horas)
2. **Monitoreo de seguridad** (16 horas)
3. **Tests de seguridad automatizados** (24 horas)
4. **Documentación de seguridad consolidada** (8 horas)

### Advertencias

⚠️ **Si no se actúa sobre los hallazgos críticos:**

1. **Tokens en localStorage:** Un ataque XSS podría comprometer todas las cuentas de usuarios
2. **Sin MFA:** Las cuentas son vulnerables a credential stuffing y phishing
3. **Migraciones RLS duplicadas:** Podrían permitir acceso no autorizado a datos sensibles
4. **Sin rate limiting:** La aplicación es vulnerable a ataques de fuerza bruta

### Recomendación Final

**No desplegar en producción** hasta que se completen al menos:
- HALLAZGO-001 (httpOnly cookies)
- HALLAZGO-002 (MFA)
- HALLAZGO-005 (headers de seguridad)
- HALLAZGO-008 (consolidar RLS)

Estimación total de esfuerzo para producción segura: **~160 horas** (4 semanas de trabajo de un desarrollador senior)

---

## ANEXOS

### A. Comandos de Verificación

```bash
# Verificar headers de seguridad
curl -I https://tu-dominio.com

# Verificar políticas RLS
psql $DATABASE_URL -c "\d scenario_events"

# Ejecutar auditoría de dependencias
npm audit

# Verificar bundle size
npm run build
ls -la dist/

# Tests de seguridad básicos
npm test -- --grep "auth"
```

### B. Recursos de Referencia

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/security)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)

---

**Fin del Informe de Auditoría**

*Documento generado el 4 de enero de 2026*
*Próxima revisión recomendada: 3 meses después de implementar correcciones*
