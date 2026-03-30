# Prompt 7: Documentación y Handover - Scenario Builder

## Objetivo
Crear documentación completa del Scenario Builder para handover al equipo de desarrollo y operaciones.

## Documentación Requerida

### 1. Resumen Ejecutivo

#### Estado Actual
- **Fecha**: 30 de Marzo, 2026
- **Versión**: MVP v1.0
- **Estado**: ✅ Completado y validado

#### Componentes Entregados
| Componente | Estado | Ubicación |
|------------|--------|-----------|
| Vista de Lista | ✅ Completo | ScenarioBuilderPage.ts |
| Formulario de Creación | ✅ Completo | ScenarioBuilderPage.ts |
| Vista de Simulación | ✅ Completo | ScenarioBuilderPage.ts |
| Vista de Resultados | ✅ Completo | ScenarioBuilderPage.ts |
| Estilos CSS | ✅ Completo | scenarios.css |
| Store de Eventos | ✅ Completo | scenarioEventStore.ts |
| RLS Seguro | ✅ Completo | Migración v4 |

### 2. Arquitectura

#### Diagrama de Flujo
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vista Lista   │────▶│  Form Crear     │────▶│   Simulación    │
│   (list)        │     │   (form)        │     │   (simulation)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                               │
         │                                               ▼
         │                                      ┌─────────────────┐
         │                                      │   Resultados    │
         │                                      │   (results)     │
         │                                      └─────────────────┘
         │                                               │
         └───────────────────────────────────────────────┘
                            (Volver a lista)
```

#### Componentes Principales

##### Frontend (src/pages/ScenarioBuilderPage.ts)
```typescript
// Estados de la vista
type ViewState = 'list' | 'form' | 'simulation' | 'results';

// Funciones principales
- loadScenarios(): Carga escenarios del usuario
- createScenario(): Crea nuevo escenario
- runSimulation(): Ejecuta simulación
- deleteScenario(): Elimina escenario
```

##### Store (src/app/events/scenarioEventStore.ts)
```typescript
// Funciones principales
- createScenarioEvent(): Crea evento de escenario
- getScenarioEvents(): Obtiene escenarios del usuario
- deleteScenarioEvent(): Elimina escenario
- applyScenarioToAgents(): Aplica escenario a agentes
```

##### Base de Datos (scenario_events)
```sql
-- Estructura de tabla
CREATE TABLE scenario_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT,
  sentiment_impact FLOAT,
  intensity FLOAT,
  salience FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Guía de Uso

#### Para Usuarios

##### Crear un Escenario
1. Ir a `/scenarios`
2. Click en "Crear Escenario"
3. Completar formulario:
   - Nombre: Descriptivo del evento
   - Categoría: economy, government, social, security, international, environment, other
   - Severidad: minor, moderate, major, critical
   - Sentimiento: -1.0 a 1.0
   - Intensidad: 0.0 a 1.0
   - Visibilidad: 0.0 a 1.0
4. Click en "Guardar Escenario"

##### Simular un Escenario
1. En la lista, click en "Simular" del escenario deseado
2. Configurar parámetros:
   - Duración: 1-12 semanas
   - Intensidad acumulativa: Sí/No
3. Click en "Ejecutar Simulación"
4. Revisar resultados

##### Eliminar un Escenario
1. En la lista, click en "Eliminar"
2. Confirmar en el diálogo
3. Escenario eliminado permanentemente

#### Para Desarrolladores

##### Agregar Nueva Categoría
1. Actualizar tipos en `src/app/events/types.ts`
2. Agregar badge color en `scenarios.css`
3. Actualizar validaciones en `ScenarioBuilderPage.ts`

##### Modificar Parámetros de Simulación
1. Editar `src/app/events/scenarioEventStore.ts`
2. Actualizar función `applyScenarioToAgents()`
3. Ajustar factores de impacto según necesidad

### 4. Configuración

#### Variables de Entorno
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# App
VITE_API_URL=http://localhost:3000
```

#### Permisos RLS
```sql
-- Políticas activas
- Usuarios autenticados pueden ver/crear/actualizar/eliminar sus propios escenarios
- Solo usuarios autenticados tienen acceso
- user_id obligatorio (NOT NULL)
```

### 5. Deployment

#### Pre-deployment Checklist
- [ ] Migraciones aplicadas
- [ ] RLS configurado
- [ ] Tests pasando
- [ ] Documentación actualizada

#### Comandos
```bash
# Aplicar migraciones
npx tsx scripts/apply_migrations.ts

# Verificar RLS
psql $DATABASE_URL -f scripts/verify/verify_rls_v4.sql

# Preparar escenarios de prueba
npx tsx scripts/test/prepareUserTestingScenarios.ts
```

### 6. Troubleshooting

#### Problemas Comunes

##### Error: "No se pudieron cargar los escenarios"
**Causa**: Problema de conexión con Supabase
**Solución**:
```bash
# Verificar conexión
curl $VITE_SUPABASE_URL/rest/v1/scenario_events \
  -H "apikey: $VITE_SUPABASE_ANON_KEY"
```

##### Error: "No tienes permisos"
**Causa**: RLS bloqueando acceso
**Solución**:
```sql
-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename = 'scenario_events';

-- Verificar usuario
SELECT auth.uid();
```

##### Error: "user_id cannot be null"
**Causa**: Escenarios sin user_id
**Solución**:
```sql
-- Verificar escenarios nulos
SELECT COUNT(*) FROM scenario_events WHERE user_id IS NULL;

-- Eliminar o asignar
DELETE FROM scenario_events WHERE user_id IS NULL;
```

### 7. Métricas y Monitoreo

#### KPIs Recomendados
- Tiempo de carga de lista (< 2s)
- Tiempo de creación de escenario (< 3s)
- Tiempo de simulación (< 10s)
- Tasa de errores (< 1%)

#### Logs Importantes
```typescript
// En scenarioEventStore.ts
console.log('[Scenario] Creating scenario:', scenarioData);
console.log('[Scenario] Running simulation:', config);
console.log('[Scenario] Applied to agents:', affectedCount);
```

### 8. Roadmap Futuro

#### v1.1 (Próximo)
- [ ] Edición de escenarios existentes
- [ ] Duplicar escenario
- [ ] Filtros y búsqueda en lista
- [ ] Ordenamiento por fecha/categoría

#### v1.2 (Futuro)
- [ ] Compartir escenarios entre usuarios
- [ ] Templates predefinidos
- [ ] Historial de simulaciones
- [ ] Exportar resultados

#### v2.0 (Visión)
- [ ] Simulación en tiempo real
- [ ] Múltiples escenarios simultáneos
- [ ] Integración con encuestas automática
- [ ] Predicción de impacto

### 9. Contactos y Recursos

#### Documentación Relacionada
- `SCENARIO_BUILDER_IMPLEMENTATION.md` - Implementación técnica
- `SCENARIO_BUILDER_UX.md` - Diseño UX
- `SCENARIO_BUILDER_VALIDATION_PLAN.md` - Plan de validación
- `SCENARIO_BUILDER_USER_TESTING_GUIDE.md` - Guía de testing

#### Archivos Clave
```
src/
├── pages/
│   └── ScenarioBuilderPage.ts    # UI principal
├── app/
│   └── events/
│       ├── scenarioEventStore.ts # Lógica de negocio
│       └── types.ts              # Tipos
├── styles/
│   └── scenarios.css             # Estilos
└── services/
    └── supabase/
        └── client.ts             # Cliente Supabase

scripts/
└── test/
    └── prepareUserTestingScenarios.ts # Setup de pruebas

migrations/
└── 20250330_fix_scenario_events_rls_v4_SECURE.sql # RLS
```

### 10. Checklist de Handover

#### Para DevOps
- [ ] Migraciones aplicadas en producción
- [ ] RLS verificado
- [ ] Variables de entorno configuradas
- [ ] Monitoreo activo
- [ ] Runbooks creados

#### Para QA
- [ ] Casos de test documentados
- [ ] Escenarios de prueba creados
- [ ] Checklist de validación
- [ ] Guía de regresión

#### Para Producto
- [ ] Guía de usuario actualizada
- [ ] Screenshots de funcionalidad
- [ ] Limitaciones conocidas documentadas
- [ ] Feedback de usuarios recolectado

#### Para Desarrollo
- [ ] Código documentado
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] README actualizado
- [ ] Dependencias listadas

## Notas Finales

### Decisiones Técnicas
1. **Service Client**: Se usa service client para operaciones críticas (bypass RLS)
2. **RLS v4**: Políticas restrictivas con user_id NOT NULL
3. **Categorías**: 7 categorías predefinidas con colores distintivos
4. **Simulación**: Impacto calculado en agentes sintéticos

### Limitaciones Conocidas
- No se puede editar escenario después de creado
- Simulación síncrona (puede tardar en escenarios grandes)
- No hay historial de simulaciones previas
- Solo un escenario activo por simulación

### Próximos Pasos Inmediatos
1. Monitorear uso en producción
2. Recolectar feedback de usuarios
3. Priorizar features v1.1
4. Planificar capacitación

---

**Documento preparado por**: Claude Code
**Fecha**: 30 de Marzo, 2026
**Versión**: 1.0
**Estado**: Final
