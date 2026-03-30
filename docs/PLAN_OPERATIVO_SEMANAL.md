# PLAN OPERATIVO SEMANAL - Pulso Social
## Basado en Auditoría Técnica 30/03/2026
## Objetivo: Preparar para producción controlada

---

## RESUMEN EJECUTIVO

Este plan convierte los hallazgos de la auditoría en **tareas concretas y ejecutables** para las próximas 4 semanas.

**Prioridades:**
1. 🔴 Seguridad (RLS policies)
2. 🔴 Operación sin scripts (Operations UI)
3. 🟡 UX de comparación (Scenario Builder polish)
4. 🟡 Validación con usuarios

---

## SEMANA 1: SEGURIDAD Y RLS

### Objetivo
Resolver completamente las políticas RLS pendientes y endurecer seguridad antes de cualquier deploy a producción.

### Tareas

#### Día 1-2: Consolidar migraciones RLS
- [ ] **Tarea 1.1**: Revisar las 3 migraciones de scenario_events RLS
  - Archivos: `20250330_fix_scenario_events_rls.sql`, `v2.sql`, `v3.sql`
  - Identificar qué cambios son realmente necesarios
  - Decidir: ¿consolidar en una sola migración o aplicar secuencialmente?

- [ ] **Tarea 1.2**: Crear migración final consolidada
  - Archivo: `migrations/20250401_scenario_events_rls_final.sql`
  - Debe incluir: SELECT, INSERT, UPDATE, DELETE policies
  - Usar `FOR ALL` o policies específicas según necesidad

- [ ] **Tarea 1.3**: Aplicar migración en ambiente local
  ```bash
  psql $DATABASE_URL -f migrations/20250401_scenario_events_rls_final.sql
  ```

#### Día 3: Auditar permisos
- [ ] **Tarea 1.4**: Verificar que usuarios solo vean sus propios escenarios
  ```sql
  -- Test: Como usuario anon, intentar ver escenarios de otro usuario
  -- Debe fallar o retornar vacío
  ```

- [ ] **Tarea 1.5**: Verificar que solo usuarios autenticados puedan crear
  ```sql
  -- Test: INSERT sin autenticación debe fallar
  ```

- [ ] **Tarea 1.6**: Documentar políticas aplicadas
  - Archivo: `docs/SECURITY_RLS_POLICIES.md`
  - Tabla de qué puede hacer cada rol (anon, authenticated, service_role)

#### Día 4-5: Security hardening adicional
- [ ] **Tarea 1.7**: Revisar `docs/SECURITY_HARDENING_PHASE_1.md`
  - Identificar qué items ya están hechos
  - Crear checklist de pendientes

- [ ] **Tarea 1.8**: Verificar service keys
  - Asegurar que `SUPABASE_SERVICE_KEY` no esté en código
  - Verificar que esté solo en `.env` y `.env.scripts`

- [ ] **Tarea 1.9**: Auditar tablas sin RLS
  ```sql
  -- Query para encontrar tablas sin policies
  SELECT schemaname, tablename
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT tablename FROM pg_policies WHERE schemaname = 'public'
  );
  ```

### Entregables Semana 1
- [ ] Migración RLS final aplicada y funcionando
- [ ] Documento de políticas de seguridad
- [ ] Tests de permisos pasando
- [ ] Checklist de security hardening actualizado

### Métricas de éxito
- Usuario A no puede ver escenarios de Usuario B
- Usuario no autenticado no puede crear escenarios
- 0 tablas críticas sin RLS policies

---

## SEMANA 2: OPERATIONS UI MÍNIMA

### Objetivo
Crear una UI básica que permita ejecutar encuestas CADEM sin necesidad de scripts.

### Tareas

#### Día 1: Diseñar Operations Page v2
- [ ] **Tarea 2.1**: Revisar `src/pages/OperationsPage.ts` actual
  - Identificar qué ya existe
  - Definir qué falta para ejecución básica

- [ ] **Tarea 2.2**: Diseñar flujo de ejecución de encuesta
  - Wireframe: Selección de encuesta → Configuración → Ejecutar → Ver progreso → Ver resultados
  - Definir estados: pending, running, completed, failed

#### Día 2-3: Implementar ejecución básica
- [ ] **Tarea 2.3**: Crear componente `SurveyExecutionPanel`
  - Dropdown: Seleccionar encuesta de `survey_definitions`
  - Input: Sample size (default: 500)
  - Toggle: Con/Sin eventos (v1.2)
  - Botón: "Ejecutar Encuesta"

- [ ] **Tarea 2.4**: Integrar con `surveyRunner`
  - Llamar `runSurvey()` desde la UI
  - Pasar parámetros correctos
  - Manejar errores

- [ ] **Tarea 2.5**: Mostrar estado de ejecución
  - Spinner mientras corre
  - Progress bar (si es posible)
  - Mensaje de éxito/error

#### Día 4: Listado de ejecuciones
- [ ] **Tarea 2.6**: Crear tabla `survey_executions` (si no existe)
  ```sql
  CREATE TABLE IF NOT EXISTS survey_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_definition_id UUID REFERENCES survey_definitions(id),
    status VARCHAR(20) NOT NULL, -- pending, running, completed, failed
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    sample_size INTEGER,
    engine_mode VARCHAR(20),
    results JSONB,
    error_message TEXT,
    created_by UUID REFERENCES auth.users(id)
  );
  ```

- [ ] **Tarea 2.7**: Mostrar listado de ejecuciones previas
  - Tabla con: Encuesta, Estado, Fecha, Sample, Acciones
  - Botón "Ver resultados" para completadas

#### Día 5: Polish y validación
- [ ] **Tarea 2.8**: Validar flujo end-to-end
  - Crear encuesta de prueba
  - Ejecutar desde UI
  - Verificar resultados

- [ ] **Tarea 2.9**: Manejo de errores
  - Mensajes claros si falla
  - Retry automático (opcional)
  - Log de errores visible

### Entregables Semana 2
- [ ] Operations Page funcional para ejecutar encuestas
- [ ] Tabla de ejecuciones con historial
- [ ] Flujo end-to-end validado
- [ ] Documentación de uso

### Métricas de éxito
- Usuario no técnico puede ejecutar encuesta sin ayuda de desarrollo
- Tiempo de ejecución visible y razonable (< 5 min para 500 agentes)
- Historial de ejecuciones persistente

---

## SEMANA 3: UX DE COMPARACIÓN Y POLISH

### Objetivo
Mejorar la visualización de resultados en Scenario Builder para usuarios no técnicos.

### Tareas

#### Día 1-2: Mejorar visualización de deltas
- [ ] **Tarea 3.1**: Revisar `renderResults()` en `ScenarioBuilderPage.ts`
  - Identificar qué se muestra actualmente (tabla básica)
  - Definir mejoras

- [ ] **Tarea 3.2**: Agregar gráficos de barras comparativos
  - Librería: Chart.js o CSS puro (barras divs)
  - Mostrar: Baseline vs Escenario lado a lado
  - Colores: Verde (mejora), Rojo (empeora), Gris (sin cambio)

- [ ] **Tarea 3.3**: Destacar deltas significativos
  - > 5%: Mostrar flecha y color intenso
  - 2-5%: Mostrar indicador sutil
  - < 2%: Mostrar como "sin cambio significativo"

#### Día 3: Exportación básica
- [ ] **Tarea 3.4**: Botón "Exportar resultados"
  - Formato: CSV simple
  - Columnas: Pregunta, Opción, Baseline%, Escenario%, Delta%

- [ ] **Tarea 3.5**: Generar CSV en cliente
  ```typescript
  function exportToCSV(results: SimulationResults): string {
    // Convertir a formato CSV
    // Crear blob y descargar
  }
  ```

#### Día 4: UX refinements
- [ ] **Tarea 3.6**: Mejorar labels y explicaciones
  - Agregar tooltips explicando qué es cada métrica
  - Texto de ayuda para interpretar deltas
  - Ejemplo: "Un delta de -8% en aprobación indica un impacto negativo significativo"

- [ ] **Tarea 3.7**: Loading states más claros
  - Mensaje: "Simulando 500 agentes... Esto toma ~30 segundos"
  - Progress bar animado
  - No bloquear UI completamente

#### Día 5: Validación interna
- [ ] **Tarea 3.8**: Test con equipo interno
  - Pedir a 2-3 personas que usen Scenario Builder
  - Observar dónde se confunden
  - Ajustar según feedback

### Entregables Semana 3
- [ ] Visualización de deltas mejorada con gráficos
- [ ] Exportación CSV funcionando
- [ ] UX refinements aplicados
- [ ] Feedback interno recopilado

### Métricas de éxito
- Usuario no técnico entiende los resultados sin explicación
- Tiempo para interpretar resultados < 2 minutos
- 0 confusiones sobre qué significan los deltas

---

## SEMANA 4: VALIDACIÓN CON USUARIOS Y FEATURE FLAGS

### Objetivo
Realizar validación con usuarios reales e implementar feature flags básicos.

### Tareas

#### Día 1-2: Preparar validación con usuarios
- [ ] **Tarea 4.1**: Revisar `docs/VALIDACION_USUARIOS_CHECKLIST.md`
  - Identificar escenarios de prueba
  - Preparar guión de sesiones

- [ ] **Tarea 4.2**: Crear escenarios de prueba
  - Crisis económica (negativo)
  - Buena noticia económica (positivo)
  - Escenario neutral

- [ ] **Tarea 4.3**: Preparar materiales
  - Guía de usuario rápida (1 página)
  - Formulario de feedback
  - Consentimiento de grabación (si aplica)

#### Día 3: Feature flags básicos
- [ ] **Tarea 4.4**: Implementar sistema de feature flags simple
  - Opción A: Tabla `feature_flags` en Supabase
  - Opción B: Config en localStorage (más simple)
  - Elegir según complejidad deseada

- [ ] **Tarea 4.5**: Flags iniciales
  ```typescript
  const FEATURES = {
    SCENARIO_BUILDER: true,      // Ya aprobado
    EVENTS_V12: false,           // Pendiente de validación
    OPERATIONS_UI: true,         // Nuevo esta semana
    CADEM_ONLY_MODE: true,       // Deshabilitar Legacy
  };
  ```

- [ ] **Tarea 4.6**: Integrar flags en UI
  - Ocultar/mostrar elementos según flags
  - Mensaje "Próximamente" para features deshabilitados

#### Día 4: Ejecutar validación con usuarios
- [ ] **Tarea 4.7**: Sesiones de validación (2-3 usuarios)
  - Duración: 30-45 min cada una
  - Tareas: Crear escenario, ejecutar simulación, interpretar resultados
  - Observar: Dónde se atoran, qué les confunde, qué les gusta

- [ ] **Tarea 4.8**: Documentar hallazgos
  - Archivo: `docs/VALIDACION_USUARIOS_RESULTADOS.md`
  - Lista de problemas encontrados
  - Quotes de usuarios
  - Priorización de fixes

#### Día 5: Cierre y planificación
- [ ] **Tarea 4.9**: Priorizar fixes según feedback
  - Críticos: Arreglar antes de producción
  - Importantes: Semana 5
  - Nice to have: Backlog

- [ ] **Tarea 4.10**: Actualizar roadmap
  - Revisar plan para semanas 5-8
  - Ajustar según aprendizajes

### Entregables Semana 4
- [ ] 2-3 sesiones de validación con usuarios completadas
- [ ] Documento de hallazgos de validación
- [ ] Feature flags implementados y funcionando
- [ ] Plan ajustado para semanas siguientes

### Métricas de éxito
- 3 usuarios completaron flujo sin ayuda técnica
- Lista de 5-10 items de mejora identificados
- Feature flags permiten habilitar/deshabilitar sin deploy

---

## CHECKLIST DE CIERRE (FIN SEMANA 4)

### Seguridad ✅
- [ ] RLS policies aplicadas y testeadas
- [ ] Security hardening completado
- [ ] 0 vulnerabilidades críticas conocidas

### Operación ✅
- [ ] Operations UI funcional
- [ ] Ejecución de encuestas sin scripts
- [ ] Historial de ejecuciones visible

### UX ✅
- [ ] Scenario Builder con visualización clara
- [ ] Exportación de resultados
- [ ] Validación con usuarios completada

### Feature Flags ✅
- [ ] Sistema implementado
- [ ] Al menos 3 flags configurables
- [ ] Documentación de uso

---

## POST-SEMANA 4: SIGUIENTES PASOS

### Semana 5-6: Fixes post-validación
- Arreglar problemas críticos identificados por usuarios
- Polish de UX según feedback
- Tests E2E de flujos críticos

### Semana 7-8: Preparación producción
- Monitoreo y alertas
- Documentación final
- Deploy a staging
- Pruebas de carga

### Mes 3: Producción controlada
- Deploy gradual
- Monitoreo intensivo
- Soporte usuarios iniciales

---

## NOTAS DE IMPLEMENTACIÓN

### Sobre RLS
Las políticas deben ser restrictivas por defecto:
```sql
-- Ejemplo correcto
CREATE POLICY "Users can only see their own scenarios"
  ON scenario_events
  FOR ALL
  TO authenticated
  USING (created_by = auth.uid());
```

### Sobre Operations UI
Empezar simple: un formulario básico que llame a `runSurvey()` es suficiente para la primera versión.

### Sobre Feature Flags
No sobre-ingenierizar. Un objeto JSON en localStorage o una tabla simple en Supabase es suficiente.

### Sobre Validación con Usuarios
Grabar pantalla + audio es invaluable. Pedir permiso primero.

---

**Documento creado:** 30/03/2026
**Basado en:** Auditoría Técnica Pulso Social v1.2
**Próxima revisión:** Fin Semana 4
