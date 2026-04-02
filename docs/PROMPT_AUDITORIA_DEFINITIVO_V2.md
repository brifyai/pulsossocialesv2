# PROMPT DE AUDITORÍA TÉCNICA INTEGRAL - VERSIÓN DEFINITIVA V2

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
- Ley 21.719 (Chile, 2024 - reemplaza 19.628) aplicabilidad
  - ¿Los agentes sintéticos contienen datos derivados de personas reales?
  - ¿Los datos de CASEN/CENSO usados están anonimizados?
  - ¿Hay datos personales de usuarios (email, contraseñas) que requieran
    consentimiento y derecho a eliminación?
- GDPR aplicabilidad (si hay usuarios de la UE)
- Política de retención de datos documentada
- Mecanismo de eliminación de cuenta de usuario
```

#### PASO 7 (OPCIONAL): Lógica de negocio

Si hay acceso al código del motor de opinión/simulación:
```
- ¿Los algoritmos de calibración tienen tests?
- ¿Hay validación contra datos reales (CADEM, CEP)?
- ¿Es posible manipular resultados de encuestas vía la API?
- ¿Los resultados son reproducibles (seeds, determinismo)?
```

---

## CLASIFICACIÓN DE SEVERIDAD (USAR ESTRICTAMENTE)

| Nivel | Criterio | Ejemplo |
|-------|----------|---------|
| **CRÍTICO** | Explotable remotamente sin autenticación, o expone secretos que permiten bypass total de seguridad | SERVICE_KEY en bundle del cliente |
| **ALTO** | Explotable con autenticación o requiere condición previa alcanzable. Incluye controles de seguridad implementados solo en cliente, trivialmente bypasseables | Tokens en localStorage + ausencia de CSP; Rate limiter solo en frontend |
| **MEDIO** | Debilidad que aumenta superficie de ataque pero requiere cadena de exploits | Falta de headers como X-Frame-Options |
| **BAJO** | Mejora de hardening, no explotable directamente | Logging inconsistente |

---

## CONTROL DE ALCANCE

- **Máximo 25 hallazgos totales** (forzar priorización)
- **Máximo 3 CRÍTICOS** (solo los verdaderamente críticos)
- **Máximo 7 ALTOS**
- Si hay más de 25 problemas, agrupar los menores en una tabla resumen sin la plantilla completa
- **Preferir profundidad en hallazgos críticos sobre cobertura superficial**

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

Para cada flujo, describir:
1. **Actores involucrados** (usuario anónimo, autenticado, admin, script)
2. **Datos en tránsito** (qué se envía, en qué formato)
3. **Trust boundaries cruzadas** (cliente→Supabase, script→Supabase)
4. **Controles existentes** en cada boundary
5. **Amenazas STRIDE aplicables** con evidencia

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

**Estimación de tamaño del bundle:**
- maplibre-gl: ~800KB minificado (~220KB gzipped)
- @supabase/supabase-js: ~50KB minificado (~15KB gzipped)
- Código de aplicación: estimar por cantidad de archivos TS

**Verificar en vite.config.ts:**
- ¿Hay `build.rollupOptions.output.manualChunks`?
- ¿Se usa `import()` dinámico en algún lugar?
- ¿Hay `build.chunkSizeWarningLimit` configurado?

**Buscar en el código:**
- `import(` para lazy loading
- `React.lazy` o equivalente (si aplica)
- Archivos de más de 500 líneas que podrían dividirse

**Identificar dependencias pesadas**
**Evaluar code splitting actual**
**Recomendar optimizaciones con impacto estimado**

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

### L. ESTADO DE HALLAZGOS DE AUDITORÍAS ANTERIORES

Si se proporcionan auditorías previas, crear tabla de seguimiento:

| Hallazgo anterior | Estado | Evidencia |
|-------------------|--------|-----------|
| SERVICE_KEY en Dockerfile | ✅ CORREGIDO | Ya no existe VITE_SUPABASE_SERVICE_KEY en Dockerfile |
| Tokens en localStorage | ❌ PENDIENTE | customAuth.ts línea 45 sigue usando localStorage |
| Headers de seguridad | ⚠️ PARCIAL | Se agregó X-Frame-Options pero falta CSP |

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
# Versión: 2.1 - Corregido y optimizado

set -euo pipefail

OUTPUT_FILE="audit_input.txt"

{
echo "=========================================="
echo "RECOPILACIÓN DE ARCHIVOS PARA AUDITORÍA"
echo "Fecha: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "Repositorio: $(basename $(pwd))"
echo "=========================================="
echo ""

# --- PROJECT STRUCTURE ---
echo "=== PROJECT TREE (depth 3) ==="
if command -v tree &> /dev/null; then
    tree -I 'node_modules|dist|.git|coverage' --dirsfirst -L 3
else
    find . -not -path '*/node_modules/*' -not -path '*/.git/*' \
      -not -path '*/dist/*' -not -path '*/coverage/*' \
      -maxdepth 3 | sort
fi
echo ""

# --- CONFIG FILES ---
for config_file in package.json package-lock.json Dockerfile \
  docker-compose.yml nginx.conf vite.config.ts tsconfig.json \
  .env.example .env.scripts; do
    echo "=== $config_file ==="
    if [ -f "$config_file" ]; then
        cat "$config_file"
    else
        echo "[NO EXISTE]"
    fi
    echo ""
done

# --- AUTH SYSTEM (CRITICAL) ---
echo "=== AUTH SYSTEM FILES ==="
if [ -d "src/services/auth" ]; then
    find src/services/auth -type f -name "*.ts" | sort | while read file; do
        echo "=== $file ==="
        cat "$file"
        echo ""
    done
else
    echo "[DIRECTORIO src/services/auth NO EXISTE]"
fi
echo ""

# --- SUPABASE CLIENT ---
for supabase_file in \
  src/services/supabase/client.ts \
  src/services/supabase/repositories/userRepository.ts \
  scripts/utils/serviceClient.ts \
  scripts/utils/validateScriptEnv.ts; do
    echo "=== $supabase_file ==="
    if [ -f "$supabase_file" ]; then
        cat "$supabase_file"
    else
        echo "[NO EXISTE]"
    fi
    echo ""
done

# --- MAIN ENTRY + KEY FILES ---
for key_file in src/main.ts src/app/layers/agentsViewport.ts; do
    echo "=== $key_file ==="
    if [ -f "$key_file" ]; then
        cat "$key_file"
    else
        echo "[NO EXISTE]"
    fi
    echo ""
done

# --- CI/CD WORKFLOWS ---
echo "=== CI/CD WORKFLOWS ==="
if [ -d ".github/workflows" ]; then
    find .github/workflows -type f -name "*.yml" | sort | \
      while read file; do
        echo "=== $file ==="
        cat "$file"
        echo ""
    done
else
    echo "[NO EXISTE .github/workflows]"
fi
echo ""

# --- ALL MIGRATIONS ---
echo "=== ALL SQL MIGRATIONS ==="
for dir in migrations supabase/migrations; do
    if [ -d "$dir" ]; then
        find "$dir" -type f -name "*.sql" | sort | while read file; do
            echo "=== $file ==="
            cat "$file"
            echo ""
        done
    fi
done
echo ""

# --- TESTS ---
echo "=== TEST FILES ==="
find src -path "*__tests__*" -name "*.ts" -o \
  -path "*__tests__*" -name "*.tsx" 2>/dev/null | \
  sort | head -10 | while read file; do
    echo "=== $file ==="
    cat "$file"
    echo ""
done
echo ""

# --- SECURITY DOCS ---
echo "=== SECURITY DOCUMENTATION ==="
if [ -d "docs" ]; then
    find docs -iname "*security*" -o -iname "*auth*" \
      -o -iname "*rls*" 2>/dev/null | \
      sort | head -5 | while read file; do
        echo "=== $file ==="
        cat "$file"
        echo ""
    done
else
    echo "[DIRECTORIO docs/ NO EXISTE]"
fi
echo ""

# --- STATISTICS ---
echo "=========================================="
echo "ESTADÍSTICAS DEL REPOSITORIO"
echo "=========================================="
echo "Archivos TypeScript: $(find src -name '*.ts' \
  -o -name '*.tsx' 2>/dev/null | wc -l | tr -d ' ')"
echo "Archivos SQL: $(find migrations supabase/migrations \
  -name '*.sql' 2>/dev/null | wc -l | tr -d ' ')"
echo "Archivos de test: $(find src -path '*__tests__*' \
  2>/dev/null | wc -l | tr -d ' ')"
echo "Líneas de código TS: $(find src -name '*.ts' \
  -exec cat {} \; 2>/dev/null | wc -l | tr -d ' ')"
echo "=========================================="

} > "$OUTPUT_FILE" 2>&1

FILE_SIZE=$(wc -c < "$OUTPUT_FILE" | tr -d ' ')
echo "Archivo generado: $OUTPUT_FILE ($FILE_SIZE bytes)"

if [ "$FILE_SIZE" -gt 102400 ]; then
    echo "⚠️  ADVERTENCIA: Output mayor a 100KB."
    echo "   Considerar reducir archivos incluidos."
fi
```

**NOTA SOBRE TAMAÑO:** Si la salida del script excede 100KB, priorizar archivos en este orden:
1. Auth system (OBLIGATORIO)
2. Supabase client y config (OBLIGATORIO)
3. Dockerfile, nginx.conf, CI/CD (OBLIGATORIO)
4. Migraciones SQL (OBLIGATORIO)
5. Tests (IMPORTANTE)
6. Resto de archivos (SI HAY ESPACIO)

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
| **Threat model** | Ausente | STRIDE obligatorio con guía de flujos |
| **Estimaciones** | Vago (Bajo/Medio/Alto) | Horas-persona concretas |
| **Validación** | Ausente | Pasos de verificación por hallazgo |
| **Falsos positivos** | Comunes | Prohibidos sin evidencia |
| **Trust boundaries** | No identificadas | Mapeadas explícitamente |
| **Compliance** | No mencionado | Ley 21.719 Chile (2024) incluida |
| **Control de alcance** | No existía | Máximo 25 hallazgos, priorización forzada |
| **Seguimiento auditorías** | No existía | Tabla de estado de hallazgos anteriores |
| **Script recopilación** | Básico | Completo con archivos críticos adicionales |

---

## ARCHIVOS DEL REPOSITORIO

[AQUÍ PEGAR EL CONTENIDO DE LOS ARCHIVOS CLAVE DEL REPOSITORIO]

---

**Nota:** Este prompt debe producir una auditoría significativamente más accionable, verificable y útil que las versiones anteriores. Cada hallazgo debe ser demostrable y remediación debe ser implementable.
