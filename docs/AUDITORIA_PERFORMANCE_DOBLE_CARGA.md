# Auditoría de Performance y Doble Carga - Pulsos Sociales

**Fecha:** 31 de marzo de 2026
**Auditor:** Cline (AI Assistant)
**Scope:** Frontend performance, lifecycle issues, doble inicialización

---

## 1. Diagnóstico Breve

### Causa más probable de la doble carga
El problema principal está en **`src/main.ts`** donde existe una **inicialización duplicada** del router:

1. `initRouter()` se llama explícitamente en `initApp()`
2. `initRouter()` internamente ya renderiza la ruta inicial
3. Luego se suscribe a `onRouteChange` que también intenta renderizar
4. El flag `isFirstRouteChange` intenta prevenir esto, pero la lógica es frágil

### ¿Es problema de desarrollo o producción?
**Ambos.** Aunque React StrictMode puede causar doble render en dev, los problemas encontrados son de código real que afectarán producción.

### Páginas más afectadas
1. **OperationsPage** - Auto-refresh cada 30s sin cleanup adecuado
2. **SurveysPage** - setTimeout sin cleanup, modales sin limpieza
3. **ScenarioBuilderPage** - Carga de datos sin control de montaje
4. **Todas las páginas protegidas** - Suscripción a router sin cleanup

---

## 2. Lista de Hallazgos

### 🔴 ALTA SEVERIDAD

#### H1: Inicialización duplicada en main.ts
- **Archivo:** `src/main.ts`
- **Problema:** `initRouter()` renderiza la ruta inicial, luego `onRouteChange` intenta renderizar de nuevo
- **Impacto:** Doble render en carga inicial, posible flicker
- **Código problemático:**
```typescript
// Líneas 63-76
initRouter(); // Ya renderiza internamente

await renderRoute(getCurrentRoute()); // Render explícito

onRouteChange(async (route) => {
  // Este listener se dispara incluso en init
  await renderRoute(route);
});
```

#### H2: Auto-refresh sin cleanup en OperationsPage
- **Archivo:** `src/pages/OperationsPage.ts`
- **Problema:** `setInterval` de 30s no se limpia correctamente al desmontar
- **Impacto:** Memory leaks, fetches duplicados después de navegar
- **Código problemático:**
```typescript
// Líneas 28-29
startAutoRefresh(); // Se inicia pero no hay garantía de cleanup

// Líneas 267-275
function startAutoRefresh(): void {
  refreshInterval = window.setInterval(() => {
    if (!loading) loadData(); // Puede ejecutarse después de desmontar
  }, 30000);
}
```

#### H3: Suscripción a router sin cleanup en Navigation
- **Archivo:** `src/components/Navigation.ts`
- **Problema:** `onRouteChange` retorna función de cleanup que nunca se usa
- **Impacto:** Múltiples listeners acumulándose, memory leak
- **Código problemático:**
```typescript
// Líneas 67-68
onRouteChange(updateActiveState); // Retorna unsubscribe, pero no se guarda
```

### 🟡 MEDIA SEVERIDAD

#### H4: setTimeout sin cleanup en SurveysPage
- **Archivo:** `src/pages/SurveysPage.ts`
- **Problema:** Timeout para pre-selección de escenario sin cleanup
- **Impacto:** Código ejecutándose después de desmontar página
- **Código problemático:**
```typescript
// Líneas 56-59
setTimeout(() => {
  handlePreSelectedScenario();
}, 100);
```

#### H5: Modales sin limpieza en SurveysPage
- **Archivo:** `src/pages/SurveysPage.ts`
- **Problema:** Modales creados con `document.createElement` no se limpian en `cleanupSurveysPage`
- **Impacto:** DOM pollution, event listeners huérfanos
- **Código problemático:**
```typescript
// Líneas 614, 750 - Modales creados pero no hay cleanup
const modal = document.createElement('div');
document.body.appendChild(modal);
// ... pero cleanupSurveysPage solo limpia estado, no DOM
```

#### H6: Carga de datos sin control en ScenarioBuilderPage
- **Archivo:** `src/pages/ScenarioBuilderPage.ts`
- **Problema:** `loadScenarios()` se llama en render sin verificar si ya está cargando
- **Impacto:** Múltiples requests simultáneos
- **Código problemático:**
```typescript
// Líneas 156-159
if (!isLoading && scenariosList.length === 0 && !listError) {
  loadScenarios(); // Sin control de si ya se llamó
}
```

### 🟢 BAJA SEVERIDAD

#### H7: Event listeners en modales sin cleanup centralizado
- **Archivo:** Múltiples (SurveysPage, ScenarioBuilderPage, Navigation)
- **Problema:** Cada modal maneja su propio cleanup, inconsistente
- **Impacto:** Riesgo de olvidar limpiar algún listener

#### H8: Estado global mutable en módulos
- **Archivo:** Todas las páginas
- **Problema:** Variables de módulo (`let currentView`, `let runs`, etc.) persisten entre navegaciones
- **Impacto:** Estado residual entre páginas

---

## 3. Top 5 Causas Probables (Ordenadas por Prioridad)

### 1. **Router: Inicialización duplicada** (main.ts)
- **Probabilidad:** 95%
- **Evidencia:** `initRouter()` + `renderRoute()` explícito + `onRouteChange` suscripción
- **Fix:** Eliminar renderRoute explícito, confiar en el router

### 2. **OperationsPage: Auto-refresh sin cleanup** 
- **Probabilidad:** 90%
- **Evidencia:** `setInterval` de 30s, cleanup solo en función exportada
- **Fix:** Guardar interval ID y limpiar en desmontaje

### 3. **Navigation: Suscripción sin cleanup**
- **Probabilidad:** 85%
- **Evidencia:** `onRouteChange` retorna unsubscribe que no se usa
- **Fix:** Guardar función de cleanup y llamarla al desmontar

### 4. **SurveysPage: setTimeout y modales sin cleanup**
- **Probabilidad:** 80%
- **Evidencia:** Timeout de 100ms, modales en body sin cleanup
- **Fix:** Usar AbortController o flags de montaje

### 5. **ScenarioBuilderPage: Carga sin control**
- **Probabilidad:** 75%
- **Evidencia:** `loadScenarios()` en render sin debounce
- **Fix:** Agregar flag de "ya cargado" o usar useEffect pattern

---

## 4. Fixes Mínimos Recomendados

### Fix 1: Eliminar renderRoute duplicado (main.ts)
```typescript
// ANTES (líneas 63-76)
initRouter();
await renderRoute(getCurrentRoute());
onRouteChange(async (route) => { ... });

// DESPUÉS
initRouter(); // Ya maneja el render inicial internamente
onRouteChange(async (route) => {
  // Solo manejar cambios reales, no inicial
  await renderRoute(route);
});
```

### Fix 2: Cleanup de interval en OperationsPage
```typescript
// Agregar en OperationsPage.ts
let refreshInterval: number | null = null;
let isPageMounted = false;

export async function createOperationsPage(): Promise<HTMLElement> {
  isPageMounted = true;
  // ... resto del código
  startAutoRefresh();
  
  // Retornar función de cleanup junto al elemento
  (page as any).cleanup = () => {
    isPageMounted = false;
    stopAutoRefresh();
  };
  
  return page;
}

function startAutoRefresh(): void {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = window.setInterval(() => {
    if (!isPageMounted) return; // Guard check
    if (!loading) loadData();
  }, 30000);
}
```

### Fix 3: Cleanup de suscripción en Navigation
```typescript
// En Navigation.ts
let unsubscribeRouteChange: (() => void) | null = null;

export function createNavigation(): HTMLElement {
  // ...
  unsubscribeRouteChange = onRouteChange(updateActiveState);
  
  // Agregar cleanup al elemento
  (nav as any).cleanup = () => {
    if (unsubscribeRouteChange) {
      unsubscribeRouteChange();
      unsubscribeRouteChange = null;
    }
  };
  
  return nav;
}
```

### Fix 4: Cleanup de setTimeout en SurveysPage
```typescript
// En SurveysPage.ts
let preselectTimeout: number | null = null;

export async function createSurveysPage(): Promise<HTMLElement> {
  // ...
  if (preSelectedScenarioId) {
    preselectTimeout = window.setTimeout(() => {
      handlePreSelectedScenario();
    }, 100);
  }
  
  (page as any).cleanup = () => {
    if (preselectTimeout) {
      clearTimeout(preselectTimeout);
      preselectTimeout = null;
    }
  };
  
  return page;
}
```

### Fix 5: Control de carga en ScenarioBuilderPage
```typescript
// En ScenarioBuilderPage.ts
let hasLoadedScenarios = false;

async function loadScenarios(): Promise<void> {
  if (isLoading || hasLoadedScenarios) return; // Guard
  isLoading = true;
  // ... resto
  hasLoadedScenarios = true;
}

export function cleanupScenarioBuilderPage(): void {
  hasLoadedScenarios = false;
  // ... resto del cleanup
}
```

---

## 5. Plan de Validación

### Logs a agregar

```typescript
// En main.ts - trackear renders
console.log('[PERF] renderRoute called:', route, 'at:', Date.now());

// En OperationsPage.ts - trackear fetches
console.log('[PERF] loadData called at:', Date.now());

// En cada página - trackear montaje/desmontaje
console.log('[PERF] Page mounted:', pageId);
console.log('[PERF] Page unmounted:', pageId);
```

### Métricas a revisar

1. **Tiempo de carga inicial** - Debería reducirse ~30-50%
2. **Número de requests a Supabase** - Debería reducirse a la mitad
3. **Memory usage** - Usar Chrome DevTools Performance tab
4. **Número de listeners** - Verificar en Elements > Event Listeners

### Páginas a probar

1. **Home** → Navegar a Operations → Volver a Home
2. **Operations** - Dejar abierto 2 minutos, verificar no hay fetches duplicados
3. **Surveys** → Crear encuesta → Volver a lista
4. **ScenarioBuilder** → Crear escenario → Volver a lista
5. **Navegación rápida** - Clickar entre tabs rápidamente

### Checklist de validación

- [ ] No hay doble render en carga inicial
- [ ] No hay requests duplicados en Operations
- [ ] No hay memory leaks después de navegar 10 veces
- [ ] No hay modales huérfanos en DOM
- [ ] No hay errores de "setState on unmounted component"

---

## 6. Recomendaciones Adicionales

### Corto plazo (esta semana)
1. Implementar los 5 fixes mínimos arriba
2. Agregar logs de performance temporalmente
3. Testear en staging

### Mediano plazo (próximo sprint)
1. Considerar migrar a un framework con lifecycle management (React/Vue/Svelte)
2. Implementar un sistema de "page controller" con cleanup garantizado
3. Agregar React Query o similar para cacheo de requests

### Largo plazo
1. Implementar virtual scrolling para listas grandes
2. Code splitting por ruta
3. Service workers para cacheo offline

---

## Resumen Ejecutivo

**Problema:** La app tiene múltiples issues de lifecycle que causan doble carga, fetches duplicados y memory leaks.

**Causa raíz:** Arquitectura vanilla JS sin manejo explícito de cleanup en desmontaje de páginas.

**Fix prioritario:** Eliminar el `renderRoute` duplicado en `main.ts` y agregar cleanup de intervals/timeouts.

**Impacto esperado:** 30-50% mejora en tiempo de carga inicial, eliminación de fetches duplicados.
