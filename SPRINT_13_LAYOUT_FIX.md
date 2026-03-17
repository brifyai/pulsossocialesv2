# Sprint 13 - Fix de Layout en SurveysPage

## Fecha
17/03/2026

## Problema Reportado
La vista de Encuestas tenía un layout roto que se percibía visualmente como:
- Sección superior (título, tabs) quedaba muy arriba
- Zona de loading/spinner quedaba flotando en medio
- Estadísticas y cards quedaban muy abajo
- Demasiado espacio muerto entre bloques
- Sensación de pantalla "duplicada" o partida en dos secciones desconectadas

## Causa Raíz

1. **Wrapper innecesario**: Existía un `survey-list-wrapper` que agregaba un contenedor extra sin propósito claro
2. **Loading state mal posicionado**: Se renderizaba como string HTML reemplazando todo el contenido, causando un flash y desconexión visual
3. **Estructura anidada excesiva**: `content → wrapper → stats → list` en lugar de una estructura plana
4. **Espaciado inconsistente**: Márgenes y paddings excesivos entre secciones
5. **Falta de estilos para estados**: No había CSS definido para `.state-container`, `.state-loading`, etc.

## Solución Implementada

### 1. Reestructuración de SurveysPage.ts

**Cambios principales:**
- Eliminado el wrapper `survey-list-wrapper` innecesario
- Cambiado de strings HTML a elementos DOM reales para estados (loading, empty, error)
- Creadas funciones helper:
  - `createLoadingElement(message)`
  - `createEmptyStateElement(icon, title, message, buttonText, onAction)`
  - `createErrorStateElement(icon, title, message, onRetry)`
- Estructura plana: header → tabs → content (stats + list directamente)
- Loading ahora se inserta como elemento hijo, no reemplaza todo el contenido

**Flujo de renderizado corregido:**
```
Antes:
container.innerHTML = renderLoadingState(...)  // Reemplaza TODO
// ... async load ...
container.innerHTML = ''
const wrapper = document.createElement('div')
wrapper.appendChild(stats)
wrapper.appendChild(list)
container.appendChild(wrapper)

Después:
const loadingEl = createLoadingElement(...)
container.appendChild(loadingEl)  // Inserta, no reemplaza
// ... async load ...
container.innerHTML = ''  // Limpia solo el loading
container.appendChild(stats)  // Directo
container.appendChild(list)   // Directo
```

### 2. Actualización de surveys.css

**Cambios principales:**
- Reducido padding de `.surveys-page` de 20px a 16px 20px
- Reducido margin-bottom de `.surveys-header` de 30px a 16px
- Reducido font-size de título de 2rem a 1.6rem
- Reducido margin-bottom de tabs de 30px a 20px
- Agregados estilos para `.state-container` con centrado y altura mínima
- Agregados estilos para `.state-spinner` con animación
- Agregados estilos para `.state-empty` y `.state-error`
- Agregados estilos para `.badge-success` y `.badge-pending`
- Agregada clase `.surveys-content` con `display: flex; flex-direction: column; gap: 16px`
- Reducido padding de `.results-header` de 24px a 20px
- Reducido margin-bottom de `.results-header` de 30px a 20px

## Archivos Modificados

1. `src/pages/SurveysPage.ts` - Reestructuración completa del layout
2. `src/styles/surveys.css` - Estilos compactos y nuevos componentes de estado

## Verificación

- ✅ `npm run build` funciona sin errores
- ✅ `npm run dev` inicia correctamente
- ✅ No hay errores de TypeScript
- ✅ Layout ahora es continuo y unificado

## Estructura Visual Resultante

```
┌─────────────────────────────────────┐
│  📊 Encuestas Sintéticas            │  ← Header compacto
│  Diseña, ejecuta y analiza...       │
├─────────────────────────────────────┤
│  [📋 Mis Encuestas] [➕ Crear]      │  ← Tabs
├─────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐          │  ← Stats
│  │    5     │ │    12    │          │
│  │Encuestas │ │Preguntas │          │
│  └──────────┘ └──────────┘          │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │  ← Cards
│  │ Encuesta 1              [✓] │    │
│  │ Descripción...              │    │
│  │ [▶ Ejecutar] [📈 Ver]       │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Encuesta 2              [⏳] │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

## Pendientes para Futuros Sprints

- Optimizar el tamaño del bundle (advertencia de chunks > 500KB)
- Considerar virtualización para listas largas de encuestas
- Agregar animaciones de transición entre vistas
