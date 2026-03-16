# AUDITORÍA TÉCNICA - Pulso Social
## Fecha: 14 de marzo 2026

---

## 1. RESUMEN EJECUTIVO

**Estado actual:** App funcional y estable con MapLibre + MapTiler, estilo cyberpunk, edificios 3D, roads/labels recolorizados, fog, y agentes animados sobre red fija local (El Golf/Tobalaba). Arquitectura limpia en TypeScript/Vite.

**Fortalezas:**
- Código bien estructurado y modular
- Sin dependencias pesadas (solo MapLibre)
- Simulación fluida con heurística angular implementada
- Panel UI funcional con controles completos

**Riesgos principales:**
- Sin sistema de routing multi-página
- Sin modo de calidad/performance
- Sin data pipeline real
- Sin tests
- Sin manejo de errores robusto

**Veredicto:** Base sólida para evolucionar hacia "Pulso Social", pero requiere arquitectura de producto (routing, estado, data) antes de escalar features.

---

## 2. ESTADO ACTUAL DETALLADO

### 2.1 Stack Tecnológico

| Componente | Tecnología | Versión | Estado |
|------------|-----------|---------|--------|
| Framework | Vanilla TypeScript | 5.9.3 | ✅ Estable |
| Bundler | Vite | 8.0.0 | ✅ Estable |
| Mapa | MapLibre GL JS | 5.20.1 | ✅ Estable |
| Tiles/Estilo | MapTiler | API v1 | ✅ Estable |
| Estilos | CSS puro | - | ✅ Estable |
| Estado | Variables globales | - | ⚠️ Simple |
| Routing | Ninguno | - | ❌ Faltante |
| Tests | Ninguno | - | ❌ Faltante |

### 2.2 Árbol de Carpetas

```
src/
├── app/
│   ├── initMap.ts          # Inicialización MapLibre (FRÁGIL)
│   ├── mapConfig.ts        # Configuración cámara, colores
│   ├── fog.ts              # Configuración niebla
│   ├── styleTweaks.ts      # Ajustes visuales globales
│   ├── layers/
│   │   ├── buildings.ts    # Edificios 3D extruidos
│   │   ├── roads.ts        # Recolorización carreteras
│   │   ├── labels.ts       # Recolorización labels
│   │   └── agents.ts       # Capa agentes (símbolos)
│   ├── simulation/
│   │   ├── agentEngine.ts  # Motor simulación + loop (FRÁGIL)
│   │   ├── network.ts      # Red peatonal + heurística angular
│   │   ├── spawn.ts        # Spawning agentes
│   │   └── agentModel.ts   # Modelo agente (legacy?)
│   └── utils/
│       ├── styleHelpers.ts # Helpers estilo MapLibre
│       ├── geoUtils.ts     # Utilidades geográficas
│       └── icons.ts        # Iconos SVG agentes
├── data/
│   └── elGolfNetwork.ts    # Red fija El Golf (~20 segmentos) (FRÁGIL)
├── styles/
│   └── main.css            # Estilos cyberpunk + UI (FRÁGIL)
├── types/
│   ├── map.ts              # Tipos MapLibre
│   ├── network.ts          # Tipos red + agentes
│   └── agent.ts            # Tipos agente (legacy?)
├── ui/
│   └── panel.ts            # Panel lateral controles
└── main.ts                 # Entry point
```

### 2.3 Features Existentes ✅

#### Mapa y Visualización
- [x] Mapa 3D con MapLibre + MapTiler
- [x] Estilo cyberpunk (roads magenta, labels rosas, fog)
- [x] Edificios 3D extruidos con altura realista
- [x] Cámara inclinada cinematográfica (pitch 75°, bearing -40°)
- [x] Fog/atmósfera oscura azul/violeta
- [x] NavigationControl (zoom + brújula)
- [x] Hash en URL para compartir posición

#### UI y Controles
- [x] Panel lateral cyberpunk con glassmorphism
- [x] Toggles para Buildings, Roads, Labels, Agents
- [x] Botón recenter a Santiago
- [x] Indicadores de estado (MapLibre, MapTiler)
- [x] Animaciones CSS (glow, transitions)

#### Simulación de Agentes
- [x] Agentes animados sobre red fija (El Golf)
- [x] Heurística angular para giros naturales (evita U-turns)
- [x] Iconos orientados (flechas que rotan)
- [x] Controles: Start, Pause, Reset
- [x] Slider velocidad (0.1x - 5x)
- [x] Slider cantidad agentes (0 - 200)
- [x] Red peatonal con nodos y segmentos
- [x] Spawning distribuido en toda la red

#### Configuración
- [x] API key MapTiler desde .env
- [x] Mensaje de error si falta API key
- [x] Exposición de map en window para debugging

### 2.4 Features Faltantes ❌

#### Arquitectura
- [ ] Routing multi-página (Home / Mapa / Agentes / Encuestas)
- [ ] Estado global (Pinia/Zustand/Context)
- [ ] Manejo de errores robusto (Error Boundaries)
- [ ] Tests unitarios/integration
- [ ] CI/CD básico

#### Performance
- [ ] Modo de calidad/performance (full/lite)
- [ ] Instrumentación de métricas (FPS, frame time)
- [ ] Lazy loading de componentes
- [ ] Web Workers para simulación

#### Data
- [ ] Data pipeline (Censo/CASEN/SUBTEL)
- [ ] Carga dinámica de datasets
- [ ] Cache de datos
- [ ] Validación de datos

#### Producto
- [ ] PWA/offline support
- [ ] Mobile-optimized UI
- [ ] Analytics/métricas de uso
- [ ] Autenticación (si aplica)
- [ ] Exportar resultados

### 2.5 Puntos Frágiles / Riesgo 🔴

| Riesgo | Severidad | Archivo | Mitigación |
|--------|-----------|---------|------------|
| CSS global puede conflictear | Medio | main.css | Usar CSS Modules o scoped |
| Sin modo offline | Medio | - | Service worker básico |
| Red fija hardcodeada | Medio | elGolfNetwork.ts | Sistema de carga dinámica |
| Sin tests | Alto | - | Jest + Testing Library |
| Estado disperso | Medio | - | Centralizar en store |
| API key expuesta en build | Bajo | mapConfig.ts | Usar variables entorno |
| Sin error boundaries | Medio | initMap.ts | Try-catch en inicialización |
| Simulación consume CPU | Medio | agentEngine.ts | Modo lite + throttling |
| Sin persistencia | Bajo | - | LocalStorage para prefs |
| Loop de animación sin throttle | Medio | agentEngine.ts | requestAnimationFrame ok, pero verificar |

### 2.6 Dependencias Externas

| Dependencia | Uso | Requerida | Notas |
|-------------|-----|-----------|-------|
| MapTiler API Key | Tiles y estilo | Sí | Gratuita hasta 100k requests/mes |
| Google Fonts (Inter) | Tipografía | No crítica | Puede self-hostearse |
| MapLibre GL JS | Motor de mapa | Sí | CDN o npm |

### 2.7 Deuda Técnica Priorizada (Top 10)

1. **#1 - CRÍTICO:** Implementar sistema de routing (Home/Mapa/Agentes)
2. **#2 - CRÍTICO:** Agregar estado global para compartir data entre componentes
3. **#3 - ALTO:** Crear modo de calidad/performance (full/lite)
4. **#4 - ALTO:** Tests básicos para lógica de simulación
5. **#5 - MEDIO:** Data pipeline para cargar datasets reales
6. **#6 - MEDIO:** Service worker para offline básico
7. **#7 - MEDIO:** Refactor CSS a módulos o Tailwind
8. **#8 - MEDIO:** Error boundaries y manejo de errores
9. **#9 - BAJO:** Documentación de arquitectura
10. **#10 - BAJO:** Optimización bundle (code splitting)

---

## 3. GUARDRAILS (Reglas para Prompts Futuros)

### 3.1 Archivos NO tocar sin explícito permiso

```
🔴 PROHIBIDO MODIFICAR:
- src/app/initMap.ts          # Core del mapa, muy sensible
- src/styles/main.css         # Estilos globales, fácil romper
- src/data/elGolfNetwork.ts   # Datos de red, validar antes
- src/app/simulation/agentEngine.ts  # Motor de simulación, complejo

🟡 MODIFICAR CON CUIDADO:
- src/app/mapConfig.ts        # Cambios afectan visualización
- src/app/simulation/network.ts  # Lógica de red, testear después
- src/ui/panel.ts             # UI principal, verificar visual

🟢 SEGURO MODIFICAR:
- src/app/performance/*       # Nuevo módulo
- src/router/*                # Nuevo módulo
- src/pages/*                 # Nuevo módulo
- src/data/datasets/*         # Nuevo módulo
- src/__tests__/*             # Tests nuevos
```

### 3.2 Reglas de Prompts Seguros

1. **1 prompt = 1 feature/módulo** (no mezclar concerns)
2. **Máximo 3-5 archivos por prompt**
3. **Siempre verificar build después de cambios** (`npm run build`)
4. **No modificar APIs existentes sin migración**
5. **Preferir composición sobre herencia**
6. **Mantener compatibilidad hacia atrás cuando sea posible**
7. **Agregar tests para nueva lógica compleja**

### 3.3 Estrategia de Branches/Commits

```bash
# Branch naming
feature/nombre-del-feature
fix/descripcion-del-bug
refactor/nombre-del-refactor

# Commits atómicos
feat: agregar modo de calidad full/lite
fix: corregir cálculo de ángulo en intersecciones
refactor: extraer helpers de estilo a módulo

# Versiones
v0.1.0 - Demo inicial
v0.2.0 - Con modo calidad
v0.3.0 - Con routing
v1.0.0 - MVP Pulso Social
```

---

## 4. ROADMAP HACIA "PULSO SOCIAL"

### Sprint 0: Estabilización (Semana 1)
**Objetivo:** Asegurar base sólida antes de escalar.

**Entregables:**
- [ ] Sistema de calidad/performance (full/lite)
- [ ] Instrumentación básica de métricas
- [ ] Panel de diagnóstico
- [ ] Fix bugs menores si existen

**Riesgos:** Bajo - solo agrega features, no modifica existentes.

**Criterios de aceptación:**
- Modo lite reduce agentes y desactiva fog/buildings
- Panel muestra FPS, agent count, modo actual
- Build funciona, sin regresiones

**Archivos a crear/modificar:**
- Crear: `src/app/performance/qualityMode.ts`
- Crear: `src/app/performance/perfMonitor.ts`
- Modificar: `src/ui/panel.ts`
- Modificar: `src/app/initMap.ts`

---

### Sprint 1: Arquitectura Producto (Semanas 2-3)
**Objetivo:** Transformar demo en app navegable.

**Entregables:**
- [ ] Router simple (Home / Mapa / Agentes)
- [ ] Layout base con navegación
- [ ] Página Home con hero + CTA
- [ ] Página Mapa (actual, aislada)
- [ ] Página Agentes (vista detalle)

**Riesgos:** Medio - reestructura entry point.

**Criterios de aceptación:**
- Navegación entre páginas funciona
- Mapa carga correctamente en su ruta
- Home explica el producto
- Mobile responsive básico

**Archivos a crear/modificar:**
- Crear: `src/router/index.ts`
- Crear: `src/pages/home.ts`, `src/pages/map.ts`
- Crear: `src/components/navbar.ts`
- Modificar: `src/main.ts` (entry point)

---

### Sprint 2: Mapa Chile por Regiones (Semanas 4-5)
**Objetivo:** Ampliar cobertura geográfica.

**Entregables:**
- [ ] Selector de región/comuna
- [ ] Dataset de regiones (top-level)
- [ ] Modo "análisis territorial" (vista simplificada)
- [ ] Carga dinámica de redes por zona

**Riesgos:** Medio - requiere data geográfica.

**Criterios de aceptación:**
- Puedo seleccionar Santiago/Valparaíso/etc
- Mapa cambia a región seleccionada
- Modo análisis muestra métricas resumidas

**Archivos a crear/modificar:**
- Crear: `src/data/chileRegions.ts`
- Modificar: `src/app/mapConfig.ts`
- Modificar: `src/ui/panel.ts`
- Modificar: `src/app/initMap.ts`

---

### Sprint 3: Data Pipeline Scaffold (Semanas 6-7)
**Objetivo:** Preparar ingesta de datos reales.

**Entregables:**
- [ ] Estructura para datasets (Censo, CASEN, SUBTEL)
- [ ] Scripts de transformación (ETL básico)
- [ ] API mock o JSON estático
- [ ] Tipado de datos territoriales

**Riesgos:** Medio - requiere entender formatos de datos.

**Criterios de aceptación:**
- Datos de ejemplo cargan correctamente
- Tipos TypeScript definidos
- Documentación de fuentes de datos

**Archivos a crear/modificar:**
- Crear: `src/types/datasets.ts`
- Crear: `src/data/datasets/index.ts`
- Crear: `src/data/datasets/mock/*`
- Crear: `src/services/dataService.ts`
- Crear: `docs/DATA_PIPELINE.md`

---

### Sprint 4: Synthetic Agents v1 + Validación (Semanas 8-9)
**Objetivo:** Agentes basados en datos reales.

**Entregables:**
- [ ] Agentes con atributos demográficos
- [ ] Comportamiento basado en datos Censo
- [ ] Sistema de validación (vs datos reales)
- [ ] Métricas de precisión

**Riesgos:** Alto - complejidad de modelado.

**Criterios de aceptación:**
- Agentes tienen edad, ingreso, ocupación
- Distribución demográfica coincide con Censo
- Dashboard de validación visible

**Archivos a crear/modificar:**
- Crear: `src/types/agentDemographics.ts`
- Crear: `src/app/simulation/demographicModel.ts`
- Crear: `src/app/validation/*`
- Modificar: `src/app/simulation/agentEngine.ts`
- Modificar: `src/types/network.ts`

---

### Sprint 5: Vista Agentes + Ficha (Semanas 10-11)
**Objetivo:** Explorar agentes individuales.

**Entregables:**
- [ ] Click en agente muestra ficha
- [ ] Perfil detallado (atributos + comportamiento)
- [ ] Histórico de movimiento
- [ ] Comparación entre agentes

**Riesgos:** Medio - requiere estado de selección.

**Criterios de aceptación:**
- Click en agente abre ficha lateral
- Ficha muestra datos completos
- Puedo comparar 2 agentes

**Archivos a crear/modificar:**
- Crear: `src/components/agentPanel.ts`
- Crear: `src/app/simulation/agentHistory.ts`
- Modificar: `src/app/layers/agents.ts` (click handler)
- Modificar: `src/ui/panel.ts`

---

### Sprint 6: Encuestas v1 + Resultados (Semanas 12-13)
**Objetivo:** Simular encuestas a agentes.

**Entregables:**
- [ ] Definición de encuestas (JSON/config)
- [ ] Lógica de respuesta basada en atributos
- [ ] Resultados agregados
- [ ] Visualización de resultados (charts simples)

**Riesgos:** Medio - requiere diseño de encuestas.

**Criterios de aceptación:**
- Puedo lanzar encuesta a agentes en zona
- Resultados se agregan por categorías
- Charts muestran distribución

**Archivos a crear/modificar:**
- Crear: `src/types/survey.ts`
- Crear: `src/app/surveys/*`
- Crear: `src/components/surveyPanel.ts`
- Crear: `src/components/resultsChart.ts`

---

### Sprint 7: Benchmarks v1 + Metodología (Semanas 14-15)
**Objetivo:** Comparar territorios.

**Entregables:**
- [ ] Definición de métricas benchmark
- [ ] Comparación lado a lado de zonas
- [ ] Exportar resultados (CSV/JSON)
- [ ] Documentación metodológica

**Riesgos:** Medio - requiere definir métricas.

**Criterios de aceptación:**
- Puedo comparar 2 comunas
- Métricas calculadas automáticamente
- Export funciona

**Archivos a crear/modificar:**
- Crear: `src/types/benchmark.ts`
- Crear: `src/app/benchmarks/*`
- Crear: `src/components/benchmarkPanel.ts`
- Crear: `docs/METHODOLOGY.md`

---

### Sprint 8: Performance + Polish (Semana 16)
**Objetivo:** Optimizar y preparar para usuarios reales.

**Entregables:**
- [ ] Optimización de simulación (Web Workers?)
- [ ] Lazy loading de componentes
- [ ] PWA básico (manifest, icons)
- [ ] Testing manual en devices reales

**Riesgos:** Bajo - refinamiento.

**Criterios de aceptación:**
- App carga en <3s en 4G
- Simulación fluida en laptop media
- PWA instalable

**Archivos a crear/modificar:**
- Crear: `public/manifest.json`
- Crear: `public/icons/*`
- Crear: `src/services/serviceWorker.ts`
- Modificar: `vite.config.ts` (lazy loading)

---

## 5. PROMPTS SIGUIENTES (Listos para usar)

### Prompt 1: Sistema de Calidad/Performance

```
Actúa como desarrollador frontend senior especializado en performance web.

Contexto:
Tenemos una app MapLibre con simulación de agentes. Necesitamos un sistema de modos de calidad para soportar distintos equipos.

Objetivo:
Implementar modo "full" y "lite" que afecte visualización y performance.

Tareas:
1. Crear src/app/performance/qualityMode.ts con:
   - enum QualityMode { FULL, LITE }
   - interfaz QualityConfig { buildings3D, fog, agentCount, labels, roads }
   - configs por modo
   - función setQualityMode(map, mode)
   - evento onQualityChange

2. Crear src/app/performance/perfMonitor.ts con:
   - FPS counter básico (requestAnimationFrame)
   - Métricas: frame time, agent count, layer count
   - función getPerformanceReport()
   - logging a consola cada 5s

3. Modificar src/ui/panel.ts:
   - Agregar selector Full/Lite
   - Mostrar FPS actual
   - Mostrar modo actual

4. Modificar src/app/initMap.ts:
   - Aplicar modo inicial (detectar device?)
   - Escuchar cambios de calidad

No tocar:
- src/app/simulation/agentEngine.ts (solo leer)
- src/data/elGolfNetwork.ts

Criterios de aceptación:
- Selector cambia modo visual
- Lite desactiva fog y reduce agentes a 20
- Full activa todo (50 agentes)
- FPS visible en panel
- Build funciona
```

---

### Prompt 2: Router Simple (Home + Mapa)

```
Actúa como desarrollador frontend senior.

Contexto:
App actual es single-page. Necesitamos navegación básica.

Objetivo:
Agregar router simple sin dependencias pesadas.

Tareas:
1. Crear src/router/index.ts:
   - Router básico basado en hash (#/home, #/map)
   - Funciones: navigateTo(route), getCurrentRoute()
   - Evento: onRouteChange

2. Crear src/pages/home.ts:
   - Hero section con título "Pulso Social"
   - Descripción del producto
   - Botón "Ver Mapa" → navega a #/map
   - Estilos en home.css

3. Crear src/pages/map.ts:
   - Mover lógica actual de main.ts aquí
   - Inicializar mapa en contenedor #map-container
   - Panel UI incluido

4. Modificar src/main.ts:
   - Inicializar router
   - Renderizar página según ruta
   - Ruta por defecto: /home

5. Crear src/components/navbar.ts:
   - Links: Home, Mapa, Agentes (placeholder)
   - Estilo cyberpunk consistente

No tocar:
- src/app/initMap.ts (solo importar)
- src/app/simulation/* (no modificar)

Criterios de aceptación:
- Navegación entre Home y Mapa funciona
- URL cambia con hash
- Mapa carga correctamente en ruta /map
- Navbar visible en ambas páginas
- Build funciona
```

---

### Prompt 3: Selector de Región (Chile)

```
Actúa como desarrollador frontend especializado en mapas.

Contexto:
App actual solo muestra El Golf. Necesitamos seleccionar regiones.

Objetivo:
Agregar selector de regiones de Chile.

Tareas:
1. Crear src/data/chileRegions.ts:
   - Array de regiones con: id, name, center [lng, lat], zoom
   - Incluir: Santiago, Valparaíso, Concepción, Antofagasta
   - Bounding box opcional por región

2. Modificar src/app/mapConfig.ts:
   - Agregar REGION_CONFIGS
   - Función getRegionConfig(regionId)

3. Modificar src/ui/panel.ts:
   - Agregar dropdown de regiones
   - Al cambiar, llamar flyTo en mapa
   - Guardar región seleccionada en URL (?region=santiago)

4. Modificar src/app/initMap.ts:
   - Leer región de URL al iniciar
   - Aplicar center/zoom correspondiente

No tocar:
- src/data/elGolfNetwork.ts (mantener para El Golf)
- src/app/simulation/* (red fija por ahora)

Criterios de aceptación:
- Dropdown muestra regiones
- Cambiar región mueve mapa
- URL refleja región seleccionada
- Al recargar, mantiene región
- Build funciona
```

---

### Prompt 4: Data Pipeline Scaffold (Censo/CASEN)

```
Actúa como arquitecto de datos frontend.

Contexto:
Necesitamos estructura para consumir datos territoriales reales.

Objetivo:
Crear scaffold de data pipeline sin implementación completa.

Tareas:
1. Crear src/types/datasets.ts:
   - interfaces: CensusData, CasenData, SubtelData
   - Campos comunes: regionId, comunaId, year, metrics
   - Tipos específicos por dataset

2. Crear src/data/datasets/index.ts:
   - DatasetRegistry: Map de datasetId → loader
   - Función registerDataset(id, loader)
   - Función loadDataset(id, filters)

3. Crear src/data/datasets/mock/:
   - Datos de ejemplo para Santiago (JSON)
   - Estructura: comunas, población, ingreso promedio

4. Crear src/services/dataService.ts:
   - Cache en memoria de datasets cargados
   - Función getData(datasetId, regionId)
   - Transformación básica (normalización)

5. Documentar en docs/DATA_PIPELINE.md:
   - Cómo agregar nuevos datasets
   - Formatos esperados
   - Ejemplos de uso

No tocar:
- src/app/simulation/* (preparar para integración futura)
- src/ui/panel.ts (solo si es necesario para demo)

Criterios de aceptación:
- Tipos compilan correctamente
- Mock data carga y se cachea
- Documentación clara
- Build funciona
```

---

### Prompt 5: Tests Básicos (Jest)

```
Actúa como desarrollador QA frontend.

Contexto:
App sin tests. Necesitamos cobertura básica.

Objetivo:
Configurar Jest + Testing Library y tests críticos.

Tareas:
1. Instalar dependencias:
   - jest, ts-jest, @types/jest
   - @testing-library/dom (opcional)

2. Crear jest.config.js:
   - Configuración TypeScript
   - Test environment: jsdom
   - Setup files

3. Crear tests para:
   - src/app/simulation/network.ts:
     * chooseNextSegment prefiere recto
     * angleDifference calcula correctamente
   - src/app/utils/geoUtils.ts (si existe lógica)
   - src/data/elGolfNetwork.ts:
     * Red tiene nodos y segmentos
     * Todos los segmentos tienen longitud > 0

4. Crear src/__tests__/setup.ts:
   - Mocks básicos si necesarios

5. Agregar script "test" en package.json

No tocar:
- src/app/initMap.ts (no testear aún)
- src/app/simulation/agentEngine.ts (complejo, dejar para después)

Criterios de aceptación:
- npm test corre sin errores
- Al menos 5 tests pasan
- Cobertura básica documentada
- Build no se afecta
```

---

### Prompt 6: PWA Básico (Offline)

```
Actúa como desarrollador PWA.

Contexto:
App requiere conexión constante. Necesitamos offline básico.

Objetivo:
Implementar PWA mínimo funcional.

Tareas:
1. Crear public/manifest.json:
   - name: "Pulso Social"
   - icons, theme_color, background_color
   - start_url, display: standalone

2. Crear public/icons/:
   - icon-192x192.png
   - icon-512x512.png
   - (usar placeholders si no hay diseño)

3. Crear src/services/serviceWorker.ts:
   - Cache de assets estáticos
   - Cache de tiles MapLibre (opcional, complejo)
   - Estrategia: Cache First para assets

4. Registrar SW en src/main.ts:
   - Solo en producción
   - Log de registro exitoso

5. Agregar meta tags en index.html:
   - theme-color
   - viewport para mobile
   - apple-touch-icon

No tocar:
- src/app/simulation/* (no requiere cambios)
- src/app/initMap.ts (solo verificar carga)

Criterios de aceptación:
- Lighthouse report muestra "Installable"
- App funciona offline (assets cacheados)
- Manifest válido
- Build funciona
```

---

### Prompt 7: Refactor CSS a CSS Modules

```
Actúa como desarrollador CSS senior.

Contexto:
CSS global en main.css puede conflictear al escalar.

Objetivo:
Migrar a CSS Modules por componente.

Tareas:
1. Renombrar src/styles/main.css → src/styles/global.css:
   - Mantener solo variables y resets globales
   - Remover estilos de componentes específicos

2. Crear src/ui/panel.module.css:
   - Mover estilos de .cyberpunk-panel, .panel-header, etc
   - Usar naming: panelContainer, panelHeader, etc

3. Modificar src/ui/panel.ts:
   - Importar estilos como CSS Module
   - Aplicar clases dinámicamente
   - Mantener funcionalidad

4. Crear src/components/navbar.module.css (si existe navbar)

5. Actualizar vite.config.ts (si es necesario para CSS Modules)

No tocar:
- src/app/initMap.ts (estilos de MapLibre se quedan globales)
- src/styles/variables (mantener)

Criterios de aceptación:
- Estilos del panel funcionan igual
- No hay regresiones visuales
- Build funciona
- CSS global reducido a mínimo
```

---

### Prompt 8: Error Boundaries + Logging

```
Actúa como desarrollador frontend robusto.

Contexto:
App puede fallar silenciosamente. Necesitamos mejor manejo de errores.

Objetivo:
Implementar error boundaries y logging estructurado.

Tareas:
1. Crear src/utils/logger.ts:
   - Niveles: debug, info, warn, error
   - Prefijos por módulo: [Map], [Sim], [UI]
   - En producción: solo warn/error a consola

2. Crear src/utils/errorBoundary.ts:
   - Clase ErrorBoundary
   - Método: wrap(fn), tryCatch(fn)
   - Fallback UI opcional

3. Modificar src/app/initMap.ts:
   - Wrap inicialización en try-catch
   - Mensajes de error amigables
   - Retry automático (1 vez) si falla carga de tiles

4. Modificar src/app/simulation/agentEngine.ts:
   - Logging estructurado en lugar de console.log
   - Catch errores en animationLoop
   - Pausar simulación si hay error crítico

5. Crear src/components/errorDisplay.ts:
   - UI para mostrar errores al usuario
   - Botón "Reintentar"

No tocar:
- src/data/* (no requiere cambios)
- src/app/mapConfig.ts (solo usar logger)

Criterios de aceptación:
- Errores se loguean con contexto
- Usuario ve mensaje si mapa falla
- Simulación no crashea toda la app
- Build funciona
```

---

## 6. CONCLUSIÓN Y RECOMENDACIONES

### Estado General
El proyecto está en **estado estable y listo para escalar**. La arquitectura actual soporta la evolución hacia "Pulso Social" sin reescrituras mayores.

### Fortalezas Clave
1. **Código limpio:** Modular, bien estructurado, TypeScript
2. **Sin deuda de dependencias:** Solo MapLibre como dependencia pesada
3. **Simulación funcional:** Agentes con comportamiento realista
4. **Visualización atractiva:** Estilo cyberpunk diferenciador

### Riesgos a Mitigar
1. **Escalabilidad:** Sin routing ni estado global, crecimiento será difícil
2. **Performance:** Sin modo lite, equipos débiles sufrirán
3. **Mantenibilidad:** Sin tests, regresiones serán difíciles de detectar
4. **Robustez:** Sin manejo de errores, fallos serán catastróficos

### Próximo Paso Recomendado

**Implementar el Sistema de Calidad/Performance (Prompt 1) ANTES de cualquier otra cosa.**

**Razones:**
1. No rompe nada existente (feature additiva)
2. Mejora UX inmediatamente (usuarios con equipos débiles pueden usarla)
3. Prepara terreno para features futuras que consumen recursos (más agentes, más data)
4. Es relativamente simple y auto-contenido (4 archivos)
5. Permite evaluar performance real antes de escalar

**Después de Prompt 1, prioridad:**
1. Prompt 2 (Router) - Transforma demo en producto
2. Prompt 3 (Regiones) - Expande cobertura geográfica
3. Prompt 5 (Tests) - Asegura calidad antes de más features
4. Resto según prioridad de negocio

---

## ANEXO: Métricas de Código

| Métrica | Valor |
|---------|-------|
| Líneas de código TypeScript | ~2,500 |
| Archivos .ts | 20 |
| Dependencias de producción | 1 (maplibre-gl) |
| Dependencias de desarrollo | 2 (typescript, vite) |
| Bundle size (gzip) | ~280 KB |
| Tiempo de build | ~200ms |
| Tests | 0 |
| Documentación | Mínima |

---

*Documento generado el 14 de marzo de 2026*
*Versión: 1.0*
