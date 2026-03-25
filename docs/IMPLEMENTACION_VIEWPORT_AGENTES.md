# Implementación: Sistema de Viewport para Agentes

## Sprint 12C - Visualización de 25,000 Agentes

### Resumen

Se ha implementado un sistema completo de carga de agentes basado en el viewport del mapa, con soporte para clustering y estrategias de renderizado según el nivel de zoom.

### Archivos Creados/Modificados

#### 1. Tipos de Datos (`src/types/`)

**`src/types/database.ts`**
- ✅ Agregados campos `location_lat` y `location_lng` a `DbSyntheticAgent`

**`src/types/agent.ts`**
- ✅ Agregados campos opcionales `location_lat` y `location_lng` a `SyntheticAgent`

#### 2. Repositorio (`src/services/supabase/repositories/`)

**`src/services/supabase/repositories/agentRepository.ts`**
- ✅ Agregado método `getAgentsInBBox(sw, ne, options)` - Carga agentes dentro de un bounding box
- ✅ Agregado método `getAgentClusters(sw, ne, gridSize)` - Agrupa agentes en clusters para zoom bajo
- ✅ Actualizado `dbAgentToSyntheticAgent()` para incluir coordenadas

#### 3. Sistema de Viewport (`src/app/layers/`)

**`src/app/layers/agentsViewport.ts`** (NUEVO)
- ✅ Sistema de carga basado en viewport con debounce (300ms)
- ✅ Estrategia de renderizado según zoom:
  - **Zoom < 10**: Modo Clusters (agrupación geográfica)
  - **Zoom 10-14**: Modo Simplificado (puntos básicos)
  - **Zoom > 14**: Modo Detallado (toda la información)
- ✅ Límites configurables:
  - Clusters: hasta 5,000 agentes
  - Simplificado: hasta 1,000 agentes
  - Detallado: hasta 500 agentes
- ✅ Cancelación de requests previos (AbortController)
- ✅ Callbacks: `onLoading`, `onLoaded`, `onError`

### API de Bounding Box

```typescript
// Cargar agentes en un área específica
const agents = await getAgentsInBBox(
  [-70.65, -33.45], // Southwest [lng, lat]
  [-70.55, -33.40], // Northeast [lng, lat]
  {
    limit: 500,
    filters: {
      regionCode: 'CL-13',
      sex: 'female',
      ageMin: 18,
      ageMax: 65,
    }
  }
);

// Obtener clusters para zoom bajo
const clusters = await getAgentClusters(
  [-70.65, -33.45],
  [-70.55, -33.40],
  0.1 // Tamaño de celda en grados
);
```

### Uso del Sistema de Viewport

```typescript
import { initAgentsViewport, refreshAgentsViewport, cleanupAgentsViewport } from './app/layers/agentsViewport';

// Inicializar en el mapa
initAgentsViewport(map, {
  onLoading: () => console.log('Cargando agentes...'),
  onLoaded: (count) => console.log(`Cargados ${count} agentes`),
  onError: (error) => console.error('Error:', error),
});

// Forzar recarga
refreshAgentsViewport(map);

// Limpiar al destruir el componente
cleanupAgentsViewport();
```

### Configuración

```typescript
// Umbrales de zoom
const ZOOM_CONFIG = {
  cluster: 10,      // Por debajo: mostrar clusters
  simplified: 14,   // Por debajo: mostrar puntos simplificados
  detailed: 18,     // Por encima: mostrar agentes detallados
};

// Límites de agentes
const LIMITS = {
  cluster: 5000,
  simplified: 1000,
  detailed: 500,
};

// Debounce
const DEBOUNCE_MS = 300;
```

### Requisitos para Funcionamiento

1. **Coordenadas en la BD**: Los agentes deben tener `location_lat` y `location_lng` no nulos
2. **Índices espaciales**: Recomendado crear índices en Supabase:
   ```sql
   CREATE INDEX idx_agents_location ON synthetic_agents(location_lng, location_lat);
   CREATE INDEX idx_agents_bbox ON synthetic_agents USING btree(location_lng, location_lat);
   ```

### Próximos Pasos

1. **Verificar coordenadas**: Ejecutar el script de verificación para confirmar que los 25,000 agentes tienen coordenadas
2. **Crear índices**: Agregar índices espaciales en Supabase para mejorar performance
3. **Integrar en el mapa**: Reemplazar la carga actual de agentes con el sistema de viewport
4. **Testing**: Probar con diferentes niveles de zoom y áreas geográficas

### Notas Técnicas

- El sistema usa debounce de 300ms para evitar múltiples requests durante el pan/zoom
- Los requests previos se cancelan automáticamente (AbortController)
- El clustering es client-side (grid-based) - para producción considerar PostGIS
- Los agentes sin coordenadas se filtran automáticamente
