# Scenario Builder - Implementación

**Fecha:** 29 de marzo de 2026  
**Versión:** CADEM v1.2  
**Estado:** ✅ Completado

---

## Resumen

Se ha implementado la infraestructura base para el **Scenario Builder** de CADEM v1.2, que permite a los usuarios crear escenarios hipotéticos de eventos para simular su impacto en las encuestas.

---

## Componentes Implementados

### 1. Base de Datos

**Archivo:** `migrations/20260329_create_scenario_events.sql`

Tabla `scenario_events` con:
- **Campos principales:** id, user_id, name, description, category
- **Métricas del evento:** sentiment, intensity, salience, severity
- **Segmentación:** target_entities, affected_segments (JSONB)
- **Estado:** status (draft/active/archived)
- **Metadatos:** metadata (JSONB flexible)
- **Timestamps:** created_at, updated_at

**Constraints:**
- Rangos válidos para sentiment (-1 a 1), intensity (0-1), salience (0-1)
- Valores permitidos para severity y category (mismos que weekly_events)
- Valores permitidos para status (draft, active, archived)

**Índices:**
- user_id (búsquedas por usuario)
- status (filtrado por estado)
- category (filtrado por categoría)
- created_at (ordenamiento temporal)
- user_id + status (consultas comunes)

**RLS (Row Level Security):**
- Políticas para que usuarios solo accedan a sus propios escenarios
- SELECT, INSERT, UPDATE, DELETE protegidos

### 2. Store de Escenarios

**Archivo:** `src/app/events/scenarioEventStore.ts`

Funcionalidades implementadas:

#### CRUD Completo
- `createScenario()` - Crear nuevo escenario
- `getScenarioById()` - Obtener escenario por ID
- `listScenarios()` - Listar con filtros y paginación
- `updateScenario()` - Actualizar escenario existente
- `deleteScenario()` - Eliminar escenario

#### Utilidades
- `activateScenario()` - Activar escenario (draft → active)
- `archiveScenario()` - Archivar escenario (→ archived)
- `duplicateScenario()` - Duplicar escenario existente
- `scenarioToWeeklyEvent()` - Convertir a formato compatible con motor de opiniones

#### Filtros Soportados
- status (draft/active/archived)
- categories (array de categorías)
- minSeverity/maxSeverity (filtro por severidad)
- sentiment (positive/negative/neutral)
- limit/offset (paginación)

---

## Integración con Motor de Opiniones

El escenario puede convertirse a formato `WeeklyEvent` compatible:

```typescript
const scenario = await getScenarioById('uuid-del-escenario');
if (scenario.success && scenario.data) {
  const weeklyEvent = scenarioToWeeklyEvent(scenario.data, 'SCENARIO-001');
  // weeklyEvent es compatible con el motor de opiniones existente
}
```

---

## Uso del Store

### Crear un escenario
```typescript
import { createScenario } from './scenarioEventStore';

const result = await createScenario({
  name: 'Crisis Económica Hipotética',
  description: 'Simulación de una recesión económica moderada',
  category: 'economy',
  sentiment: -0.75,
  intensity: 0.8,
  salience: 0.9,
  severity: 'major',
  targetEntities: [
    { type: 'institution', name: 'Banco Central', sentiment: -0.5 }
  ],
  affectedSegments: [
    { dimension: 'income', value: 'low', impact: -0.6 }
  ],
  status: 'draft'
});

if (result.success) {
  console.log('Escenario creado:', result.data.id);
}
```

### Listar escenarios
```typescript
import { listScenarios } from './scenarioEventStore';

const result = await listScenarios({
  status: 'active',
  categories: ['economy', 'government'],
  limit: 10
});

if (result.success) {
  console.log(`Total: ${result.data.total}`);
  console.log('Escenarios:', result.data.scenarios);
}
```

### Duplicar un escenario
```typescript
import { duplicateScenario } from './scenarioEventStore';

const result = await duplicateScenario('uuid-original', 'Copia modificada');
```

---

## Frontend - Scenario Builder Page

### Archivos Creados

#### ScenarioBuilderPage.ts
- **Ubicación**: `src/pages/ScenarioBuilderPage.ts`
- **Descripción**: Página completa para crear escenarios hipotéticos
- **Características**:
  - Formulario con validación en tiempo real
  - Sliders para métricas (sentiment, intensity, salience)
  - Selectores de categoría y severidad
  - Vista de éxito después de guardar
  - Manejo de errores

#### scenarios.css
- **Ubicación**: `src/styles/scenarios.css`
- **Descripción**: Estilos completos para el Scenario Builder
- **Características**:
  - Diseño responsive
  - Soporte para dark mode
  - Estilos para sliders personalizados
  - Estados de éxito y error

### Integración con Router

#### Router (src/router/index.ts)
- Agregada ruta protegida `'scenarios'`
- Tipo actualizado: `ProtectedRoute` incluye `'scenarios'`

#### Main (src/main.ts)
- Importada página: `createScenarioBuilderPage`
- Importada función cleanup: `cleanupScenarioBuilderPage`
- Agregado case en `renderProtectedPage` para `'scenarios'`
- Agregado cleanup en `cleanupMapResources`
- Importados estilos: `import './styles/scenarios.css'`

#### Navigation (src/components/Navigation.ts)
- Agregado item de navegación: `{ route: 'scenarios', label: 'Escenarios', icon: 'psychology' }`
- Posicionado entre "Encuestas" y "Benchmarks"

### Características del Formulario

#### Campos del MVP
1. **Nombre del escenario** (obligatorio)
2. **Descripción** (opcional)
3. **Categoría** (obligatorio) - economy, government, social, security, international, environment, other
4. **Sentimiento** (-1 a 1, slider)
5. **Intensidad** (0 a 1, slider)
6. **Visibilidad/Salience** (0 a 1, slider)
7. **Severidad** (minor, moderate, major)

#### Validaciones
- Nombre no vacío y máximo 100 caracteres
- Rangos numéricos válidos
- Mensajes de error en tiempo real

#### UX
- Sliders con valores visibles
- Labels descriptivos para cada métrica
- Botones primario y secundario
- Vista de éxito con opciones para crear otro o ver lista

---

## Próximos Pasos

Para completar el Scenario Builder se necesita:

### 1. Lista de Escenarios
- Página para listar escenarios del usuario
- Filtros por categoría, estado, severidad
- Acciones: editar, duplicar, archivar, eliminar
- Paginación para listados grandes

### 2. Visualización de Resultados
- Comparación: baseline vs escenario
- Mapa de calor de impacto por región
- Análisis de cambios en distribuciones

### 3. Mejoras al Formulario
- Selector de entidades afectadas (target_entities)
- Configurador de segmentos impactados (affected_segments)
- Preview del impacto estimado antes de guardar
- Autosave de borradores

### 4. Gestión Avanzada
- Organización por carpetas/tags
- Compartir escenarios entre usuarios (opcional)
- Exportar/importar escenarios

---

## Notas Técnicas

### Compatibilidad
- Schema compatible con `weekly_events` (mismos rangos y valores)
- Conversión directa a `WeeklyEvent` para motor de opiniones
- RLS asegura privacidad de escenarios por usuario

### Performance
- Índices optimizados para consultas comunes
- Paginación soportada para listados grandes
- JSONB flexible para metadatos y extensibilidad

### Seguridad
- Solo usuarios autenticados pueden crear escenarios
- Cada usuario solo ve sus propios escenarios
- Validación de rangos en base de datos

---

## Archivos Relacionados

- `migrations/20260329_create_scenario_events.sql` - Schema de BD
- `src/app/events/scenarioEventStore.ts` - Store CRUD
- `src/app/events/types.ts` - Tipos compartidos
- `src/app/events/eventStore.ts` - Store de eventos reales (referencia)

---

## Estado de Implementación

| Componente | Estado | Archivo |
|------------|--------|---------|
| Schema BD | ✅ Completado | `migrations/20260329_create_scenario_events.sql` |
| Store CRUD | ✅ Completado | `src/app/events/scenarioEventStore.ts` |
| Integración Survey Runner | ✅ Completado | `src/app/survey/surveyRunner.ts` |
| Script de Prueba | ✅ Completado | `scripts/test/runScenarioSurvey.ts` |
| UI Creación | ✅ Completado | `src/pages/ScenarioBuilderPage.ts` |
| Estilos UI | ✅ Completado | `src/styles/scenarios.css` |
| Router Integration | ✅ Completado | `src/router/index.ts`, `src/main.ts` |
| Navegación | ✅ Completado | `src/components/Navigation.ts` |
| Visualización Resultados | ⏳ Pendiente | - |

---

## Integración con Survey Runner

El survey runner ahora soporta el parámetro `scenarioEventId`:

```typescript
const result = await runSurvey({
  surveyDefinition,
  agents,
  engineMode: 'cadem',
  persistState: false,
  weekKey: '2026-W12',
  scenarioEventId: 'uuid-del-escenario', // ← Nuevo parámetro
});
```

### Flujo de ejecución:

1. Si se proporciona `scenarioEventId`, el runner:
   - Carga el escenario desde Supabase
   - Lo convierte a formato `WeeklyEvent`
   - Lo agrega a la lista de eventos semanales
   - Aplica el impacto del escenario junto con otros eventos

2. El escenario se aplica **además** de los eventos reales (si `useEvents: true`)

3. Los resultados reflejan el impacto combinado de eventos reales + escenario hipotético

---

## Script de Prueba

**Archivo:** `scripts/test/runScenarioSurvey.ts`

Permite ejecutar encuestas con escenarios desde la línea de comandos:

```bash
# Ejecutar baseline (sin escenario)
npx ts-node scripts/test/runScenarioSurvey.ts

# Ejecutar con escenario
npx ts-node scripts/test/runScenarioSurvey.ts --scenario-id <uuid> --agents 100

# Ver todas las opciones
npx ts-node scripts/test/runScenarioSurvey.ts --help
```

### Ejemplo de uso:

```bash
# Crear un escenario primero (usando el store)
# Luego ejecutar la encuesta con el ID del escenario
npx ts-node scripts/test/runScenarioSurvey.ts \
  --scenario-id "abc-123-uuid" \
  --agents 100 \
  --week-key "2026-W12"
```

### Salida del script:

- Información del escenario cargado
- Distribución de respuestas por pregunta
- Confianza promedio
- Duración de la ejecución

---

## Comandos Útiles

### Aplicar migración
```bash
# Usando el script de migraciones existente
npx ts-node scripts/apply_migrations.ts

# O directamente con psql
psql $DATABASE_URL -f migrations/20260329_create_scenario_events.sql
```

### Verificar tabla creada
```sql
\dt scenario_events
\d scenario_events
```

---

**Documento creado:** 29 de marzo de 2026  
**Autor:** Cline (asistente de desarrollo)
