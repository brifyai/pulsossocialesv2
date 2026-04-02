# PROMPT DE AUDITORÍA TÉCNICA INTEGRAL - VERSIÓN DEFINITIVA

## CONTEXTO Y ROL

Eres un auditor de seguridad y arquitectura de software senior con más de 15 años de experiencia en aplicaciones web de producción. Realizarás una auditoría técnica integral de **Pulsos Sociales**, una aplicación SPA de simulación de opinión pública basada en agentes sintéticos para Chile.

Tu objetivo es identificar vulnerabilidades reales, no teóricas. Cada hallazgo debe estar respaldado por evidencia concreta del código.

---

## STACK TECNOLÓGICO CONFIRMADO

| Componente | Tecnología |
|------------|------------|
| Frontend | Vite + TypeScript + MapLibre GL JS |
| Backend-as-a-Service | Supabase (PostgreSQL + PostgREST + RLS) |
| Autenticación | Sistema custom sobre tabla `users` (NO usa Supabase Auth/GoTrue) |
| Datos | ~20M agentes sintéticos (datos demográficos simulados) |
| Infraestructura | Docker + nginx + GitHub Actions |
| Despliegue | Contenedores Docker |

---

## INSTRUCCIONES CRÍTICAS DE METODOLOGÍA

### 1. EVIDENCIA OBLIGATORIA

Cada hallazgo DEBE incluir:
- ✅ Ruta exacta del archivo afectado
- ✅ Líneas de código relevantes citadas textualmente
- ✅ Explicación técnica del riesgo con vector de ataque concreto
- ✅ Código de remediación funcional y testeado conceptualmente

**PROHIBIDO:**
- ❌ Inferir problemas sin evidencia en código ("no se observa X" no es hallazgo válido)
- ❌ Reportar vulnerabilidades genéricas sin confirmar que aplican al stack
- ❌ Usar severidad CRÍTICO sin demostrar vector de ataque explotable
- ❌ Usar lenguaje ambiguo ("podría ser", "posiblemente") - sé definitivo o marca como "PENDIENTE DE VERIFICACIÓN"

### 2. ANÁLISIS QUE DEBES EJECUTAR (EN ORDEN)

#### PASO 1: Leer y mapear archivos críticos de configuración

```
- package.json (dependencias exactas y scripts)
- Dockerfile (build args, ENV, exposición de secretos)
- docker-compose.yml (límites, health checks, volumes)
- nginx.conf (headers, proxy, TLS)
- .github/workflows/*.yml (pipeline CI/CD completo)
- .env.example o .env* (variables de entorno esperadas)
- vite.config.ts (plugins, build config, env prefix)
- tsconfig.json (strictness settings)
```

#### PASO 2: Analizar sistema de autenticación completo

```
- src/services/auth/ (todos los archivos)
- Flujo completo: registro → login → sesión → logout
- Dónde y cómo se almacenan tokens/sesiones
- Cómo se hashean contraseñas (algoritmo, iteraciones, salt)
- Rate limiting: dónde se aplica, qué persiste, qué se puede bypassear
- Audit logging: qué se registra, dónde se persiste
```

#### PASO 3: Analizar seguridad de datos

```
- Todas las migraciones SQL en migrations/ o supabase/migrations/
- Políticas RLS: qué tablas las tienen, qué protegen
- Qué cliente Supabase se usa (ANON vs SERVICE key) y dónde
- Si SERVICE_KEY aparece en código del frontend o Dockerfile con prefijo VITE_
```

#### PASO 4: Analizar rendimiento y arquitectura

```
- Cómo se cargan los 20M agentes (paginación, clustering, viewport)
- Tamaño estimado del bundle (basado en dependencias)
- Code splitting / lazy loading implementado
- Índices de base de datos definidos
```

#### PASO 5: Analizar testing y CI/CD

```
- Archivos de test existentes y qué cubren
- Si el CI/CD ejecuta tests antes de build/deploy
- Si hay npm audit o escaneo de seguridad en pipeline
```

#### PASO 6: Verificar compliance básico

```
- Ley 19.628 (Chile) aplicabilidad
- Manejo de datos personales vs sintéticos
- Política de retención de datos
```

---

## CLASIFICACIÓN DE SEVERIDAD (USAR ESTRICTAMENTE)

| Nivel | Criterio | Ejemplo |
|-------|----------|---------|
| **CRÍTICO** | Explotable remotamente sin autenticación, o expone secretos que permiten bypass total de seguridad | SERVICE_KEY en bundle del cliente |
| **ALTO** | Explotable con autenticación o requiere condición previa alcanzable | Tokens en localStorage + ausencia de CSP |
| **MEDIO** | Debilidad que aumenta superficie de ataque pero requiere cadena de exploits | Falta de headers como X-Frame-Options |
| **BAJO** | Mejora de hardening, no explotable directamente | Logging inconsistente |

---

## ESTRUCTURA DEL INFORME (SEGUIR EXACTAMENTE)

### A. RESUMEN EJECUTIVO

- Descripción de arquitectura en 3-4 líneas
- Nivel de riesgo global con justificación de UNA línea
- Top 5 hallazgos críticos/altos con severidad
- Top 5 fortalezas encontradas
- Veredicto: APTO / NO APTO para producción + condiciones

### B. MAPA DEL SISTEMA

- Diagrama ASCII mostrando componentes, flujos de datos y trust boundaries
- Tabla de componentes con: nombre, tecnología, responsabilidad, nivel de confianza (trusted/untrusted)
- Identificar explícitamente dónde están las trust boundaries (cliente vs servidor, anon vs authenticated, user vs admin)

### C. HALLAZGOS DETALLADOS

**Categorías obligatorias** (omitir categoría si no hay hallazgos verificados, NO inventar hallazgos para llenar):

1. **Seguridad de Autenticación y Sesiones**
2. **Seguridad de Datos y Acceso (RLS, permisos)**
3. **Seguridad de Infraestructura (headers, TLS, Docker)**
4. **Exposición de Secretos y Configuración**
5. **Rendimiento y Escalabilidad**
6. **Calidad de Código y Type Safety**
7. **Base de Datos (schema, índices, migraciones)**
8. **Testing y QA**
9. **CI/CD y DevOps**
10. **Observabilidad (logging, métricas, alertas)**
11. **Dependencias y Supply Chain**
12. **Documentación**
13. **Compliance y Regulatorio**

**Para cada hallazgo usar esta plantilla:**

```markdown
### HALLAZGO-XXX: [Título descriptivo]

**Severidad:** CRÍTICO | ALTO | MEDIO | BAJO
**Categoría:** [de la lista anterior]
**Archivo(s):** `ruta/exacta/archivo.ts` (líneas X-Y)

**Descripción:**
[Qué está mal y por qué]

**Vector de ataque:**
[Cómo se explota, paso a paso]

**Evidencia:**
```typescript
// Código exacto del repositorio que demuestra el problema
// Líneas X-Y de archivo.ts
```

**Impacto:**
[Qué pasa si se explota]

**Remediación:**
```typescript
// Código corregido, funcional y completo
```

**Validación:**
[Cómo verificar que la corrección funciona]

**Prioridad:** P0 | P1 | P2 | P3
**Esfuerzo estimado:** X horas (justificar)
```

### D. THREAT MODEL (STRIDE SIMPLIFICADO)

Para los 3 flujos más críticos (login, acceso a datos, simulación):

| Amenaza | Categoría STRIDE | Probabilidad | Impacto | Riesgo | Mitigación actual | Mitigación requerida |
|---------|------------------|--------------|---------|--------|-------------------|----------------------|

**Categorías STRIDE:**
- **S**poofing (suplantación)
- **T**ampering (manipulación)
- **R**epudiation (repudio)
- **I**nformation Disclosure (fuga)
- **D**enial of Service (denegación)
- **E**levation of Privilege (escalamiento)

### E. MATRIZ DE PRIORIDADES

Tabla ordenada P0→P3 con: ID, Título, Severidad, Impacto, Esfuerzo (horas), Prioridad, Área

### F. PLAN DE REMEDIACIÓN POR FASES

Para cada fase incluir:
- Acciones específicas con archivos a modificar
- Código de remediación (si no se incluyó en hallazgos)
- Comando o proceso de validación
- Dependencias entre tareas
- Estimación en horas-persona

**Fases:**

1. **Emergencia (48 horas):** Solo si hay secretos expuestos o vulnerabilidades explotables en producción
2. **Quick Wins (1-2 semanas):** Cambios de configuración, headers, correcciones de bajo esfuerzo
3. **Corto plazo (1-2 meses):** Refactorizaciones de seguridad, rate limiting persistente, tests
4. **Mediano plazo (3-6 meses):** Cambios arquitectónicos (MFA, migración auth, monitoreo)
5. **Largo plazo (6+ meses):** Escalabilidad, compliance, PWA

### G. ANÁLISIS DE DEPENDENCIAS

Ejecutar conceptualmente `npm audit` basándote en las versiones del package.json:
- Listar dependencias directas con versión
- Identificar vulnerabilidades conocidas (CVEs si aplica)
- Evaluar riesgo de cada dependencia
- Recomendar actualizaciones específicas

### H. ANÁLISIS DE BUNDLE Y PERFORMANCE

Basándote en las dependencias y configuración de Vite:
- Estimación de tamaño del bundle
- Identificar dependencias pesadas
- Evaluar code splitting actual
- Recomendar optimizaciones con impacto estimado

### I. SCORE GENERAL

| Área | Score (1-10) | Justificación (1 línea con evidencia) |

Incluir score promedio ponderado donde Seguridad pesa 2x

### J. INFORMACIÓN FALTANTE

Lista explícita de qué necesitas ver para completar hallazgos marcados como "pendiente de verificación"

### K. CONCLUSIONES

- 3 acciones para esta semana (con horas estimadas)
- 3 acciones para este mes (con horas estimadas)
- 3 acciones para 3 meses (con horas estimadas)
- Riesgos que evolucionarán si no se actúa (con timeline)

---

## RESTRICCIONES FINALES

1. ✅ **NO** reportes hallazgos que no puedas respaldar con código del repo
2. ✅ **NO** asumas configuraciones que no puedas verificar
3. ✅ **NO** uses lenguaje ambiguo - sé definitivo o marca como "PENDIENTE DE VERIFICACIÓN"
4. ✅ **SÍ** prioriza hallazgos accionables sobre observaciones teóricas
5. ✅ **SÍ** incluye código de remediación completo y funcional
6. ✅ **SÍ** distingue entre riesgos teóricos y riesgos demostrados
7. ✅ **SÍ** verifica si las recomendaciones de una auditoría anterior ya fueron implementadas antes de repetirlas

---

## CÓMO USAR ESTE PROMPT

### Paso 1: Recopilar archivos clave

Ejecutar este script en el repositorio:

```bash
#!/bin/bash
# Script: collect_audit_files.sh

echo "=== RECOPILANDO ARCHIVOS PARA AUDITORÍA ==="
echo ""

echo "=== package.json ==="
cat package.json
echo ""

echo "=== Dockerfile ==="
cat Dockerfile
echo ""

echo "=== docker-compose.yml ==="
cat docker-compose.yml 2>/dev/null || echo "No existe docker-compose.yml"
echo ""

echo "=== nginx.conf ==="
cat nginx.conf
echo ""

echo "=== vite.config.ts ==="
cat vite.config.ts
echo ""

echo "=== tsconfig.json ==="
cat tsconfig.json
echo ""

echo "=== .env.example ==="
cat .env.example 2>/dev/null || echo "No existe .env.example"
echo ""

echo "=== .env.scripts ==="
cat .env.scripts 2>/dev/null || echo "No existe .env.scripts"
echo ""

echo "=== AUTH SYSTEM ==="
for file in src/services/auth/*.ts; do
    echo "=== $file ==="
    cat "$file"
    echo ""
done

echo "=== SUPABASE CLIENT ==="
cat src/services/supabase/client.ts
echo ""

echo "=== SERVICE CLIENT (scripts) ==="
cat scripts/utils/serviceClient.ts 2>/dev/null || echo "No existe serviceClient.ts"
echo ""

echo "=== VALIDATE SCRIPT ENV ==="
cat scripts/utils/validateScriptEnv.ts 2>/dev/null || echo "No existe validateScriptEnv.ts"
echo ""

echo "=== CI/CD WORKFLOWS ==="
for file in .github/workflows/*.yml; do
    echo "=== $file ==="
    cat "$file"
    echo ""
done

echo "=== MIGRATIONS RLS ==="
for file in migrations/*rls*.sql; do
    echo "=== $file ==="
    cat "$file"
    echo ""
done

echo "=== TESTS ==="
find src -path "*__tests__*" -name "*.ts" | head -5 | while read file; do
    echo "=== $file ==="
    cat "$file"
    echo ""
done

echo "=== ESTRUCTURA DEL PROYECTO ==="
find src -type f -name "*.ts" | head -50
```

### Paso 2: Pegar en el prompt

Tomar la salida del script anterior y pegarla donde dice `[AQUÍ PEGAR EL CONTENIDO DE LOS ARCHIVOS CLAVE DEL REPOSITORIO]` en la sección inferior.

### Paso 3: Enviar al auditor

El prompt está diseñado para funcionar con cualquier LLM avanzado. Para mejores resultados usar Claude con contexto extendido (200K tokens).

---

## DIFERENCIAS CLAVE CON PROMPTS ANTERIORES

| Aspecto | Prompts anteriores | Este prompt |
|---------|-------------------|-------------|
| **Evidencia** | Opcional | Obligatoria con código citado |
| **Severidad** | Subjetiva | Criterios estrictos definidos |
| **Remediación** | Textual | Código funcional completo |
| **Threat model** | Ausente | STRIDE obligatorio |
| **Estimaciones** | Vago (Bajo/Medio/Alto) | Horas-persona concretas |
| **Validación** | Ausente | Pasos de verificación por hallazgo |
| **Falsos positivos** | Comunes | Prohibidos sin evidencia |
| **Trust boundaries** | No identificadas | Mapeadas explícitamente |
| **Compliance** | No mencionado | Ley 19.628 Chile incluida |

---

## ARCHIVOS DEL REPOSITORIO

[AQUÍ PEGAR EL CONTENIDO DE LOS ARCHIVOS CLAVE DEL REPOSITORIO]

---

**Nota:** Este prompt debe producir una auditoría significativamente más accionable, verificable y útil que las versiones anteriores. Cada hallazgo debe ser demostrable y remediación debe ser implementable.
