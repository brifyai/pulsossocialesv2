# 🔍 AUDITORÍA TÉCNICA Y DE PRODUCTO - PULSO SOCIAL

> **Fecha**: 30 de Marzo, 2026  
> **Auditor**: Análisis automatizado de codebase  
> **Alcance**: Backend, Frontend, Supabase, Scripts, UX, Arquitectura

---

## A. Executive Summary

### Estado Real de la App

**Nivel de madurez: MVP Técnico Avanzado → Beta Pública Controlada**

La aplicación tiene una **base técnica sólida** con arquitectura bien diseñada, pero presenta **gaps significativos en UX y operación** que impiden una experiencia de cliente completa.

### Principales Fortalezas

1. **Arquitectura de opinión CADEM v1.1/v1.2** validada y calibrada con benchmarks reales
2. **Sistema de eventos** implementado con impactos configurables
3. **Scenario Builder MVP** funcional con creación, simulación y comparación
4. **Persistencia de estados** de agentes validada longitudinalmente
5. **Seguridad P0** implementada correctamente (RLS v4, separación de credenciales)
6. **Operations Page** con monitoreo de runs en tiempo real

### Principales Riesgos

1. **Dependencia crítica de scripts** para operaciones principales (no hay ejecución 100% desde UI)
2. **Mock data en Scenario Builder** - los resultados de simulación son aleatorios, no usan el motor real
3. **UX de comparación incompleta** - no hay vista unificada baseline vs escenario
4. **Gestión de escenarios limitada** - no se pueden editar, duplicar ni archivar desde UI
5. **Deuda técnica en adapters** - duplicación sync/async sin consolidar

---

## B. Hallazgos Críticos (P0)

| # | Problema | Impacto | Evidencia |
|---|----------|---------|-----------|
| 1 | **Scenario Builder usa mock data** | Los usuarios ven resultados aleatorios, no reales | `processSimulationResults()` en `ScenarioBuilderPage.ts: línea ~750` genera distribuciones mock con `generateMockDistribution()` |
| 2 | **No hay ejecución real desde UI** | Usuarios dependen de scripts para encuestas complejas | Scripts en `scripts/rollout/` son necesarios para ejecutar con eventos/escenarios persistentes |
| 3 | **Falta comparación visual baseline vs escenario** | No se puede entender el impacto visualmente | SurveysPage muestra runs individuales, no comparación lado a lado con deltas |
| 4 | **RLS no verificado en tablas críticas** | Riesgo de exposición de datos | `weekly_events`, `event_impact_logs`, `agent_topic_state` necesitan confirmación de políticas RLS |
| 5 | **No hay rate limiting en Kong** | Riesgo de abuso en endpoints críticos | `kong.yml` sin configuración de límites por endpoint |

### Detalle de Hallazgo Crítico #1: Mock Data en Scenario Builder

```typescript
// src/pages/ScenarioBuilderPage.ts ~línea 750
function processSimulationResults(_baseline: any, _scenario: any): any {
  // Mock results for MVP - en producción esto procesaría los resultados reales
  const questions = ['q_approval', 'q_direction', 'q_optimism', ...];
  
  questions.forEach((qId) => {
    const baselineDist = generateMockDistribution(optionKeys); // ← ALEATORIO
    const scenarioDist = generateMockDistribution(optionKeys); // ← ALEATORIO
    // ...
  });
}
```

**Impacto**: Los usuarios del Scenario Builder ven resultados que no reflejan el impacto real del escenario, lo que genera desconfianza en el sistema.

**Solución**: Conectar `processSimulationResults()` al motor CADEM real usando `runSurvey()` con el escenario aplicado.

---

## C. Hallazgos Importantes pero No Críticos (P1)

### Deuda Técnica

| Problema | Ubicación | Impacto |
|----------|-----------|---------|
| **Duplicación de adapters** | `cademAdapter.ts` + `cademAdapterAsync.ts` | Mantenimiento doble, riesgo de divergencia |
| **Naming inconsistente** | Algunos archivos camelCase, otros PascalCase | Confusión en imports |
| **Migraciones dispersas** | `migrations/`, `supabase/migrations/`, `deploy/init/` | Difícil tracking de schema |
| **Código muerto** | `test_economy_personal.ts`, `test_resolver.ts` en root | Desorden en codebase |

### UX Incompleta

| Problema | Impacto | Estado Actual |
|----------|---------|---------------|
| **No editar escenarios** | Usuarios deben recrear escenarios para cambios | Solo crear/eliminar |
| **No duplicar escenarios** | Pierde tiempo creando escenarios similares | No implementado |
| **No archivar escenarios** | Lista crece indefinidamente | Solo activos/inactivos |
| **Modal de escenario sin preview real** | Usuario no sabe qué esperar | Preview basado en fórmula simple |

### Flujos Parciales

| Flujo | Estado | Problema |
|-------|--------|----------|
| **Vinculación escenario-encuesta** | ⚠️ Funcional pero confusa | Query params, redirecciones múltiples |
| **Exportación de resultados** | ⚠️ Básica | JSON/CSV sin filtros ni personalización |
| **Historial de runs** | ✅ Funcional | Bien implementado en OperationsPage |

---

## D. Lo que SÍ Está Bien y Debe Protegerse

| Componente | Estado | Por qué proteger |
|------------|--------|------------------|
| `topicStateSeed.ts` | ✅ Congelado | Calibración validada, cualquier cambio rompe benchmarks |
| Motor CADEM v1.1 | ✅ Estable | Validado contra datos reales de marzo 2026 |
| Persistencia de estados | ✅ Funcional | Validación longitudinal B2 completada con éxito |
| `surveyRunner.ts` | ✅ Sólido | Entrypoint unificado con soporte completo de escenarios |
| Scenario Builder (creación) | ✅ Funcional | Permite crear escenarios con parámetros correctos |
| Operations Page | ✅ MVP listo | Monitoreo funcional con auto-refresh cada 30s |
| Seguridad P0 | ✅ Implementada | RLS v4, separación de credenciales, validación de scripts |

### Evidencia de Validaciones Completadas

- **AB Comparison Run 001**: Validación de coherencia entre motores
- **Benchmark Comparison**: Comparación con datos CADEM reales de marzo 2026
- **B2 Longitudinal Test**: Validación de persistencia de estados
- **Scenario Builder Validation Run 003**: Validación técnica de escenarios
- **Rollout Fase 3 v1.2**: Escalamiento a 500 agentes con eventos

---

## E. Tabla de Estado por Módulo

| Módulo | Estado | Evidencia | Riesgo | Recomendación |
|--------|--------|-----------|--------|---------------|
| **synthetic_agents** | ✅ Estable | 15M+ agentes en Supabase, validados | Bajo | Congelar, solo fixes críticos |
| **topicStateSeed** | ✅ Congelado | Calibración v1.1 validada | Ninguno | NO TOCAR |
| **questionInterpreter** | ✅ Funcional | Tests unitarios presentes | Bajo | Mantener |
| **questionResolver** | ✅ Funcional | Resolución de preguntas CADEM | Bajo | Mantener |
| **surveyRunner** | ✅ Sólido | Entrypoint unificado, soporta escenarios | Bajo | Proteger |
| **cademAdapter** | ⚠️ Duplicado | Sync + Async sin consolidar | Medio | Consolidar en Q2 |
| **cademAdapterAsync** | ⚠️ Duplicado | Lógica similar al sync | Medio | Consolidar en Q2 |
| **agent state persistence** | ✅ Validado | Tests longitudinales B2 pasados | Bajo | Proteger |
| **weekly_events** | ⚠️ Sin confirmar RLS | Tabla existe, RLS no verificado | Alto | Verificar RLS P0 |
| **eventImpact** | ✅ Funcional | Tuning iterativo completado | Bajo | Mantener |
| **opinionUpdater** | ✅ Funcional | Actualización de estados validada | Bajo | Mantener |
| **Scenario Builder backend** | ✅ Funcional | CRUD completo con RLS v4 | Bajo | Proteger |
| **Scenario Builder UI** | ⚠️ Mock results | Usa datos aleatorios, no motor real | **CRÍTICO** | Conectar a motor real P0 |
| **SurveysPage resultados** | ⚠️ Sin comparación | Muestra runs individuales | Alto | Agregar comparación P1 |
| **benchmark pipeline** | ✅ Validado | Comparación con CADEM real | Bajo | Proteger |
| **staging scripts** | ✅ Funcionales | Validación en staging completada | Bajo | Mantener |
| **rollout scripts** | ✅ Funcionales | Fases 1-3 completadas | Bajo | Mantener |
| **documentación** | ⚠️ Dispersa | Múltiples docs en cadem-v3/ | Medio | Consolidar en Q2 |

---

## F. Qué Falta para una Experiencia Real de Cliente

### Must Have (Bloqueantes Beta)

1. **Scenario Builder con resultados reales**
   - Conectar `processSimulationResults()` al motor CADEM real
   - Usar `runSurvey()` con el escenario aplicado
   - Mostrar distribuciones reales, no aleatorias

2. **RLS confirmado en todas las tablas**
   - Verificar `weekly_events`
   - Verificar `event_impact_logs`
   - Verificar `agent_topic_state`
   - Verificar `agent_panel_state`

3. **Rate limiting en Kong**
   - Configurar límites por endpoint
   - `/api/survey/run`
   - `/api/scenario/create`
   - Login/auth endpoints

4. **Vista de comparación baseline vs escenario**
   - Mostrar delta visual con ↑↓→
   - Colores para cambios positivos/negativos
   - Comparación lado a lado

5. **Ejecución de encuestas desde UI con escenarios**
   - Sin depender de scripts
   - Selección de escenario en modal
   - Persistencia de resultados

### Nice to Have (Post-Beta)

1. **Gestión de escenarios**
   - Editar escenarios creados
   - Duplicar escenarios
   - Archivar/activar escenarios

2. **Filtros avanzados**
   - En lista de escenarios
   - Por categoría, severidad, fecha

3. **Exportación mejorada**
   - Filtros por fecha
   - Selección de preguntas
   - Formatos adicionales (Excel, PDF)

4. **Dashboard de métricas**
   - Encuestas ejecutadas
   - Escenarios creados
   - Confidence promedio

5. **Feature flags**
   - Por entorno
   - Activar/desactivar funcionalidades

---

## G. Roadmap Recomendado

### Próximos 30 Días (Seguridad + Core UX)

| Semana | Foco | Entregable | Owner |
|--------|------|------------|-------|
| 1 | **Seguridad P0** | RLS verificado en todas las tablas, rate limiting Kong | DevOps |
| 2 | **Scenario Builder Real** | Conectar simulación a motor CADEM, eliminar mock data | Frontend |
| 3 | **UX Comparación** | Vista unificada baseline vs escenario con deltas | Frontend |
| 4 | **User Testing** | 3+ sesiones con usuarios reales, feedback recopilado | Producto |

### Próximos 60 Días (Operación + Polish)

| Semana | Foco | Entregable |
|--------|------|------------|
| 5-6 | **Operación Sin Scripts** | Ejecutar encuestas complejas desde UI |
| 7-8 | **Gestión de Escenarios** | Editar, duplicar, archivar desde UI |

### Qué Congelar (No tocar salvo bugs críticos)

- `topicStateSeed.ts` y calibración v1.1
- Arquitectura de persistencia validada
- Scripts de rollout (funcionan bien)
- Motor de opinión core

### Qué No Tocar Todavía

- Consolidación de adapters (riesgo de regresión)
- Refactor de migraciones (bajo impacto)
- Feature flags (necesita diseño previo)
- Optimizaciones de performance (prematuro)

---

## H. Análisis de Arquitectura

### Fortalezas Arquitectónicas

1. **Separación de responsabilidades clara**
   - `opinionEngine/`: Motor de opinión
   - `survey/`: Adaptadores de encuestas
   - `events/`: Sistema de eventos
   - `panel/`: Gestión de panel

2. **Entrypoint unificado**
   - `surveyRunner.ts` centraliza ejecución
   - Soporta múltiples modos (legacy, cadem sync/async)
   - Integración con escenarios

3. **Persistencia desacoplada**
   - Repositories en `services/supabase/repositories/`
   - Fácil cambio de backend si es necesario

### Debilidades Arquitectónicas

1. **Duplicación de lógica**
   ```
   cademAdapter.ts (sync)
   cademAdapterAsync.ts (async)
   ```
   - 70% de código similar
   - Riesgo de divergencia

2. **Mezcla de capas en UI**
   - `ScenarioBuilderPage.ts` tiene:
     - Lógica de presentación
     - Lógica de negocio (mock)
     - Llamadas a API
   - Difícil de testear

3. **Acoplamiento con Supabase**
   - RLS es crítico para seguridad
   - Cambio de provider requeriría refactor mayor

---

## I. Análisis de Datos y Persistencia

### Schema de Supabase

| Tabla | Estado | RLS | Notas |
|-------|--------|-----|-------|
| `synthetic_agents` | ✅ Estable | ✅ | 15M+ registros |
| `survey_definitions` | ✅ Estable | ⚠️ Verificar | Core del sistema |
| `survey_runs` | ✅ Estable | ⚠️ Verificar | Historial de ejecuciones |
| `survey_responses` | ✅ Estable | ⚠️ Verificar | Datos de respuestas |
| `scenario_events` | ✅ Estable | ✅ v4 | Recién migrado |
| `weekly_events` | ⚠️ Nuevo | ❓ Verificar | Eventos del sistema |
| `event_impact_logs` | ⚠️ Nuevo | ❓ Verificar | Logs de impacto |
| `agent_topic_state` | ✅ Estable | ❓ Verificar | Persistencia de estados |
| `agent_panel_state` | ✅ Estable | ❓ Verificar | Estado de panel |

### Riesgos de Datos

1. **Columnas no utilizadas**: Posible acumulación de campos legacy
2. **Índices faltantes**: Queries en `survey_runs` podrían ser lentos sin índices apropiados
3. **Retención de datos**: No hay política de retención definida para logs

---

## J. Análisis de Código

### Hot Spots (Requieren Atención)

| Archivo | Líneas | Complejidad | Riesgo |
|---------|--------|-------------|--------|
| `ScenarioBuilderPage.ts` | ~900 | Alta | Mock data, mezcla de capas |
| `SurveysPage.ts` | ~800 | Media | Duplicación de lógica de modal |
| `cademAdapterAsync.ts` | ~400 | Media | Duplicación con sync |
| `surveyRunner.ts` | ~300 | Baja | Bien estructurado |

### Cobertura de Tests

| Módulo | Tests | Estado |
|--------|-------|--------|
| `questionInterpreter` | ✅ Unit tests | Bien cubierto |
| `surveyRunner` | ❌ Sin tests | Riesgo de regresión |
| `eventImpact` | ❌ Sin tests | Riesgo de regresión |
| `scenarioEventStore` | ❌ Sin tests | Riesgo de regresión |

### Deuda Técnica Acumulada

1. **TODOs en código**: Múltiples comentarios `// TODO` sin tracking
2. **Console.logs**: Debug logs en producción
3. **Any types**: Uso excesivo de `any` en TypeScript
4. **Código comentado**: Bloques de código legacy comentados

---

## K. Validación y Evidencia

### Qué Está Validado con Evidencia

| Validación | Evidencia | Estado |
|------------|-----------|--------|
| Motor CADEM v1.1 | `AB_COMPARISON_RUN_001.md` | ✅ Validado |
| Calibración economía | `CALIBRATION_ECONOMY_V1.5.md` | ✅ Validado |
| Persistencia estados | `B2_LONGITUDINAL_TEST_PLAN.md` | ✅ Validado |
| Event impact tuning | `EVENT_IMPACT_TUNING_001.md` | ✅ Validado |
| Scenario Builder | `SCENARIO_BUILDER_VALIDATION_RUN_003.md` | ✅ Validado técnicamente |
| Rollout controlado | `ROLLOUT_FASE_3_V12_ESCALAMIENTO_500.md` | ✅ Validado |

### Qué Está Documentado pero No Validado

| Item | Documentación | Estado |
|------|---------------|--------|
| UX de comparación | `SCENARIO_BUILDER_UX.md` | ❌ No implementado completamente |
| Operación sin scripts | `SEMANA_2_OPERACION_MINIMA.md` | ⚠️ Parcial |
| Feature flags | No existe | ❌ No planificado |

---

## L. Operación y Readiness

### Qué Está Listo para Producción Controlada

| Componente | Readiness | Notas |
|------------|-----------|-------|
| Motor CADEM v1.1 | ✅ Listo | Validado, calibrado |
| Motor CADEM v1.2 | ✅ Listo | Con eventos, validado |
| Scenario Builder (creación) | ✅ Listo | Funcional |
| Scenario Builder (simulación) | ❌ No listo | Usa mock data |
| Operations Page | ✅ Listo | Monitoreo funcional |
| SurveysPage (ejecución) | ⚠️ Parcial | Solo baseline simple |

### Qué No Debería Activarse Todavía

| Componente | Razón |
|------------|-------|
| Simulación de escenarios en producción | Resultados no son reales |
| Ejecución masiva desde UI | Sin rate limiting confirmado |
| Exportación masiva de datos | Sin validación de permisos |

### Procesos que Requieren Intervención Manual

| Proceso | Frecuencia | Riesgo |
|---------|------------|--------|
| Ejecución de encuestas con escenarios | Cada uso | Alto - dependencia de scripts |
| Validación de resultados | Semanal | Medio - requiere expertise |
| Rotación de service keys | Trimestral | Medio - proceso manual |

---

## M. Recomendaciones Prioritarias

### Inmediatas (Esta Semana)

1. **Verificar RLS en tablas críticas**
   ```sql
   -- Verificar políticas existentes
   SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
   FROM pg_policies 
   WHERE tablename IN ('weekly_events', 'event_impact_logs', 'agent_topic_state');
   ```

2. **Configurar rate limiting en Kong**
   ```yaml
   # kong.yml
   plugins:
     - name: rate-limiting
       config:
         minute: 60
         policy: local
   ```

3. **Crear plan para eliminar mock data**
   - Spike: 1 día para evaluar integración
   - Implementación: 2-3 días

### Corto Plazo (Próximas 2 Semanas)

1. Implementar vista de comparación baseline vs escenario
2. Agregar tests E2E críticos
3. Consolidar documentación dispersa

### Mediano Plazo (Próximo Mes)

1. Consolidar adapters sync/async
2. Implementar gestión completa de escenarios
3. Agregar observabilidad (logs, métricas)

---

## N. Conclusión

### Veredicto Final

**La aplicación está técnicamente sólida pero requiere trabajo de UX/operación antes de Beta pública.**

### Métricas de Madurez

| Dimensión | Score | Comentario |
|-----------|-------|------------|
| Arquitectura | 8/10 | Bien diseñada, algunas deudas técnicas |
| Seguridad | 9/10 | RLS implementado, credenciales separadas |
| Funcionalidad | 7/10 | Core sólido, UX incompleta |
| Validación | 8/10 | Benchmarks reales, tests longitudinales |
| Operación | 5/10 | Dependencia crítica de scripts |
| Documentación | 6/10 | Completa pero dispersa |

**Score General: 7.2/10** - Listo para Beta controlada con trabajo P0 completado.

### Próximos Pasos Recomendados

1. ✅ Completar items P0 de seguridad (1 semana)
2. 🔧 Conectar Scenario Builder a motor real (1 semana)
3. 🎨 Implementar comparación visual (1 semana)
4. 🧪 User testing con 3+ usuarios (1 semana)

**Tiempo estimado para Beta pública: 3-4 semanas de trabajo enfocado.**

---

*Documento generado el 30 de Marzo, 2026*  
*Próxima revisión recomendada: 15 de Abril, 2026*
