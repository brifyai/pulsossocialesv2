# CHECKPOINTS Y VERSIONADO - Pulso Social
## Control de Versiones Estables

**Versión:** 1.0  
**Fecha:** 14 de marzo 2026

---

## 📌 CHECKPOINTS OFICIALES

### Checkpoint v0.1.0 - BASE ESTABLE
**Fecha:** 14 de marzo 2026  
**Estado:** ✅ CONGELADO  
**Tag:** `v0.1.0-stable`

**Descripción:**
Primera versión estable con mapa 3D cyberpunk, agentes animados sobre red fija de El Golf, y panel de controles funcional.

**Features:**
- Mapa 3D MapLibre + MapTiler
- Estilo cyberpunk (roads magenta, labels rosas, fog)
- Edificios 3D extruidos
- Agentes animados con heurística angular
- Panel UI con toggles y controles
- Simulación start/pause/reset

**Archivos clave:**
```
src/app/initMap.ts              # Inicialización mapa
src/app/simulation/agentEngine.ts   # Motor simulación
src/data/elGolfNetwork.ts       # Red peatonal
src/styles/main.css             # Estilos cyberpunk
src/ui/panel.ts                 # Panel controles
```

**Verificación:**
- [x] `npm run dev` funciona
- [x] `npm run build` funciona
- [x] Mapa carga correctamente
- [x] Agentes se mueven
- [x] Panel UI responde
- [x] Simulación estable

**Rollback a este checkpoint:**
```bash
git checkout v0.1.0-stable
# o
git reset --hard v0.1.0-stable
```

---

## 🔄 ESTRATEGIA DE VERSIONADO

### Versiones Semánticas

```
v{MAJOR}.{MINOR}.{PATCH}

MAJOR - Cambios breaking en arquitectura
MINOR - Nuevas features (compatibles hacia atrás)
PATCH - Bug fixes
```

### Ejemplos de versiones futuras:

```
v0.1.0 - Base estable actual (CONGELADA)
v0.2.0 - + Modo calidad/performance
v0.3.0 - + Router básico (Home/Mapa)
v0.4.0 - + Selector de regiones
v0.5.0 - + Data pipeline scaffold
v0.6.0 - + Synthetic agents v1
v0.7.0 - + Vista agentes + ficha
v0.8.0 - + Encuestas v1
v0.9.0 - + Benchmarks
v1.0.0 - MVP Pulso Social
```

---

## 📝 REGISTRO DE CAMBIOS

### Formato de entrada:

```markdown
### vX.Y.Z - DD/MM/YYYY
**Tipo:** [FEATURE|FIX|REFACTOR|DOCS]
**Autor:** @nombre
**Estado:** [EN DESARROLLO|ESTABLE|CONGELADO|DEPRECADO]

**Cambios:**
- Cambio 1
- Cambio 2

**Breaking Changes:**
- Ninguno / Lista

**Migración:**
- Pasos si aplica

**Verificación:**
- [ ] Build OK
- [ ] Tests pasan
- [ ] Manual testing OK
```

---

## 🏷️ TAGS Y RELEASES

### Crear nuevo checkpoint:

```bash
# 1. Asegurar que todo funciona
npm run build
npm run dev  # testear manualmente

# 2. Commit de versión
git add .
git commit -m "chore(release): v0.X.Y - Descripción"

# 3. Crear tag
git tag -a v0.X.Y -m "v0.X.Y - Descripción"

# 4. Push
git push origin main
git push origin v0.X.Y
```

### Listar checkpoints:

```bash
git tag -l "v*" --sort=-version:refname
```

### Cambiar a checkpoint anterior:

```bash
# Ver checkpoint
git checkout v0.1.0-stable

# Volver a desarrollo
git checkout main
```

---

## 🚨 EMERGENCIAS - ROLLBACK RÁPIDO

### Si el sistema se rompe:

```bash
# Opción 1: Revertir último commit
git revert HEAD

# Opción 2: Reset a checkpoint estable
git reset --hard v0.1.0-stable

# Opción 3: Stash cambios y volver a estable
git stash
git checkout v0.1.0-stable

# Siempre verificar después:
npm run build
npm run dev
```

---

## 📊 ESTADO ACTUAL

| Versión | Fecha | Estado | Descripción |
|---------|-------|--------|-------------|
| v0.1.0 | 14/03/2026 | ✅ CONGELADO | Base estable inicial |
| v0.9.0 | 15/03/2026 | ✅ ESTABLE | Benchmarks + Vista Comparación |
| v0.9.1 | 15/03/2026 | ✅ ESTABLE | Página de Metodología |

---

## � REGISTRO DE CAMBIOS

### v0.2.0 - 15/03/2026
**Tipo:** FEATURE  
**Autor:** @cline  
**Estado:** ✅ ESTABLE  
**Sprint:** 8A

**Cambios:**
- Sistema de Quality Mode con dos modos: Full y Lite
- Modo Full: 200 agentes, labels visibles, velocidad 1.0x
- Modo Lite: 50 agentes, labels ocultos, velocidad 1.5x, optimizado para bajo rendimiento
- Instrumentación de performance con FPS tracking
- Auto-detección de bajo rendimiento (FPS < 20 por 3 segundos)
- UI discreta en panel con toggle Full/Lite
- Persistencia de preferencia en localStorage
- Callbacks para aplicar configuración automáticamente
- Cleanup automático al cambiar de página

**Archivos nuevos:**
```
src/app/performance/qualityMode.ts   # Sistema de quality mode
```

**Archivos modificados:**
```
src/ui/panel.ts                      # Agregado toggle de quality mode
src/pages/MapViewPage.ts             # Integración del sistema
src/app/simulation/agentEngine.ts    # Instrumentación de performance
src/styles/main.css                  # Estilos para quality mode
```

**Breaking Changes:**
- Ninguno

**Verificación:**
- [x] Build OK
- [x] TypeScript sin errores
- [x] Toggle funciona
- [x] Cambio de modo aplica configuración
- [x] Persistencia en localStorage
- [x] Cleanup correcto

---

### v0.9.1 - 15/03/2026
**Tipo:** FEATURE  
**Autor:** @cline  
**Estado:** ✅ ESTABLE  
**Sprint:** 7B

**Cambios:**
- Página de Metodología completa y profesional
- Secciones explicativas: qué es Pulso Social, agentes sintéticos, fuentes de datos
- Proceso de construcción de población sintética (4 pasos)
- Explicación de encuestas sintéticas y benchmarks
- Sección de limitaciones con 6 advertencias claras
- Guía de interpretación: qué SÍ y qué NO hacer con los resultados
- Diseño cyberpunk coherente con el resto de la aplicación
- Responsive y accesible

**Archivos nuevos:**
```
src/pages/MethodologyPage.ts    # Página completa
src/styles/methodology.css      # Estilos cyberpunk
```

**Archivos modificados:**
```
src/main.ts                     # Integración en router
```

**Breaking Changes:**
- Ninguno

**Verificación:**
- [x] Build OK
- [x] TypeScript sin errores
- [x] Navegación funciona
- [x] Contenido completo y profesional
- [x] Diseño responsive

---

### v0.9.0 - 15/03/2026
**Tipo:** FEATURE  
**Autor:** @cline  
**Estado:** ✅ ESTABLE  
**Sprint:** 7A

**Cambios:**
- Sistema de benchmarks con datos mock (CASEN, SUBTEL, CEP)
- Vista de comparación encuesta sintética vs benchmark
- Detección automática de gaps (arriba/bajo/coincide)
- Visualización de diferencias con indicadores de significancia
- Historial de comparaciones
- Integración completa con router y navegación

**Archivos nuevos:**
```
src/types/benchmark.ts              # Tipos de datos
src/app/benchmark/benchmarkService.ts   # Lógica de comparación
src/pages/BenchmarksPage.ts         # Vista principal
src/styles/benchmarks.css           # Estilos
```

**Breaking Changes:**
- Ninguno

**Verificación:**
- [x] Build OK
- [x] TypeScript sin errores
- [x] Navegación funciona
- [x] Comparación visual OK

---

## 🎯 PRÓXIMOS CHECKPOINTS PLANEADOS

| Versión | Objetivo | Fecha Est. |
|---------|----------|------------|
| v0.2.0 | Modo calidad/performance | +1 semana |
| v0.3.0 | Router básico | +2 semanas |
| v0.4.0 | Selector de regiones | +3 semanas |
| v0.5.0 | Data pipeline | +4 semanas |
| v1.0.0 | MVP Pulso Social | +16 semanas |

---

*Documento vivo - actualizar con cada release*

---

## Sprint 9: Persistencia con Supabase (Self-Hosted)

**Fecha:** 15/03/2026  
**Tipo:** FEATURE  
**Autor:** @cline  
**Estado:** ✅ ESTABLE

**Cambios:**
- Cliente Supabase con fallback automático a datos locales
- Schema SQL completo para PostgreSQL (7 tablas principales)
- Tipos TypeScript para todas las tablas de base de datos
- Repositorio de territories con paginación y filtros
- Archivos de deploy: Docker Compose, Easypanel template, Dockerfile
- Documentación completa de arquitectura
- Nginx configurado para SPA
- Sin breaking changes - app funciona 100% sin Supabase

**Archivos nuevos:**
```
src/services/supabase/client.ts
src/services/supabase/index.ts
src/services/supabase/repositories/territoryRepository.ts
src/types/database.ts
deploy/docker-compose.supabase.yml
deploy/.env.supabase.example
deploy/init/01-schema.sql
deploy/easypanel/pulsos-sociales.json
deploy/README.md
Dockerfile
nginx.conf
```

**Archivos modificados:**
```
.env.example
docs/ARCHITECTURE_SUPABASE.md
```

**Características:**
- Fallback automático: si no hay Supabase configurado, usa datos locales
- Schema completo: territories, synthetic_agents, surveys, benchmarks, etc.
- Deploy listo: Docker local, Easypanel, o Supabase Cloud
- Documentación: guías de setup, troubleshooting, roadmap

**Breaking Changes:**
- Ninguno

**Verificación:**
- [x] Build OK
- [x] TypeScript sin errores
- [x] App funciona sin Supabase
- [x] Schema SQL válido
- [x] Docker Compose funciona
- [x] Documentación completa
