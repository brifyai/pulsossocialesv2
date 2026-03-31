# Checklist Ejecutivo Final — Pulso Social

> **Estado**: MVP Técnico Sólido → Beta Pública Controlada  
> **Fecha**: 30 Marzo 2026  
> **Próximo foco**: Seguridad + Operación mínima + UX comparación

---

## ✅ HECHO (NO TOCAR salvo bug crítico)

- [x] Motor CADEM v1.1 calibrado y validado
- [x] Eventos v1.2 integrados y validados técnicamente
- [x] Scenario Builder MVP funcional
- [x] Rollout controlado inicial completado
- [x] Persistencia de estados validada
- [x] Operations Page Etapa 1-2 (tabla + modal)
- [x] RLS v4 aplicado a `scenario_events`

---

## 🔴 P0 — CRÍTICO (Bloqueante Beta)

### 1. Seguridad
- [ ] **Frontend usa solo ANON_KEY**
  - [ ] Verificar `src/services/supabase/client.ts`
  - [ ] Verificar `.env` no expone SERVICE_KEY al frontend
  - [ ] Validar en build de producción

- [ ] **Scripts de escritura NO usan fallback a ANON_KEY**
  - [ ] Auditar todos los scripts en `scripts/`
  - [ ] Eliminar cualquier `anon` fallback
  - [ ] Usar `serviceClient.ts` unificado

- [ ] **RLS en tablas críticas**
  - [ ] `scenario_events` — ✅ ya migrado a RLS v4
  - [ ] `weekly_events` — verificar políticas
  - [ ] `event_impact_logs` — verificar
  - [ ] `survey_definitions` — verificar acceso por rol
  - [ ] `survey_runs` — verificar
  - [ ] `survey_responses` — verificar
  - [ ] `agent_topic_state` — confirmar RLS
  - [ ] `agent_panel_state` — confirmar RLS

- [ ] **Rotar SERVICE_KEY** si estuvo expuesto
  - [ ] Revisar historial de commits
  - [ ] Rotar si es necesario
  - [ ] Actualizar `.env.scripts`

- [ ] **Rate limiting en Kong/gateway**
  - [ ] Configurar límites por endpoint
  - [ ] `/api/survey/run`
  - [ ] `/api/scenario/create`
  - [ ] Login/auth endpoints

- [ ] **Documentar validación post-hardening**

### 2. Operación Mínima
- [ ] **Completar dashboard MVP**
  - [ ] Validar `/operations` carga correctamente
  - [ ] Verificar campos no vacíos:
    - [ ] estado del run
    - [ ] engine
    - [ ] escenario o baseline
    - [ ] eventos sí/no
    - [ ] agentes
    - [ ] respuestas
    - [ ] confidence

- [ ] **Corregir inconsistencias visuales**

### 3. Integridad de Resultados
- [ ] **Distribuciones por opción correctas**
- [ ] **Labels legibles** (no `option_a`)
- [ ] **Consistencia** entre SurveysPage y ScenarioBuilder

---

## 🟡 P1 — MUY IMPORTANTE (Siguiente fase)

### UX Escenarios ↔ Encuestas
- [ ] Validar R1: modal pre-ejecución con escenario
- [ ] Validar R2: badge de escenario en resultados
- [ ] Validar `scenarioEventId` se transmite correctamente
- [ ] Mostrar: baseline, escenario aplicado, categoría, eventos

### UX Comparación
- [ ] Vista comparativa baseline vs escenario
- [ ] Delta por pregunta visible
- [ ] Indicadores ↑ ↓ → con colores
- [ ] Comprensible para no técnicos

### Gestión de Escenarios
- [ ] Lista de escenarios usable
- [ ] Ver escenarios desde UI
- [ ] Editar escenario
- [ ] Duplicar escenario
- [ ] Archivar/activar

### Operación Sin Scripts
- [ ] Crear encuesta desde UI
- [ ] Ejecutar encuesta desde UI (baseline/escenario/eventos)
- [ ] Ver runs recientes y detalle
- [ ] Reducir dependencia de `tsx`

---

## 🟢 P2 — IMPORTANTE (Después)

### Testing
- [ ] Tests para: surveyRunner, eventImpact, opinionUpdater
- [ ] Tests para: scenarioEventStore, surveyService
- [ ] 3+ tests E2E críticos
- [ ] Cobertura > nivel actual

### Observabilidad
- [ ] Alertas de errores críticos
- [ ] Dashboard de salud
- [ ] Métricas: encuestas, escenarios, runs, confidence
- [ ] Logs centralizados

### Limpieza Técnica
- [ ] Consolidar adapters sync/async
- [ ] Revisar naming inconsistente
- [ ] Consolidar migraciones/documentación
- [ ] Archivar scripts obsoletos

### Feature Flags
- [ ] Sistema de flags por entorno
- [ ] Activar/desactivar: baseline, eventos, escenarios

---

## ⚪ P3 — DESPUÉS (Evolución)

### Automatización Eventos
- [ ] `event_source_items`
- [ ] `proposed_events`
- [ ] Pipeline de ingesta
- [ ] Revisión humana

### Scenario Builder Avanzado
- [ ] Comparación múltiple
- [ ] Filtros y tags
- [ ] Exportación PDF/Excel
- [ ] Segmentación geográfica

### IA / v1.3
- [ ] IA asistente para escenarios
- [ ] Traducción texto → scenario_event
- [ ] Nuevas categorías/preguntas
- [ ] Multi-país

---

## 🚫 NO TOCAR (Salvo bug crítico)

- [ ] `topicStateSeed.ts`
- [ ] Calibración v1.1 congelada
- [ ] Baseline benchmark marzo 2026
- [ ] Fix de `q_direction`
- [ ] Arquitectura persistencia validada
- [ ] Scripts rollout (si no es necesario)

---

## 🎯 Criterio "Listo para Beta"

Podrás decir "listo" cuando:

- [ ] Seguridad P0 cerrada
- [ ] Operación mínima sin scripts principales
- [ ] Baseline vs escenario se entiende en UI
- [ ] Scenario Builder validado con usuarios reales
- [ ] Observabilidad básica disponible

---

## 📅 Plan Sugerido

| Semana | Foco | Meta |
|--------|------|------|
| 1 | Seguridad P0 | RLS completo, secrets rotados |
| 2 | Operación P0 | Dashboard funcional, sin scripts |
| 3 | UX P1 | Comparación visual lista |
| 4 | User Testing | 3+ sesiones, feedback recopilado |

---

*Documento vivo — actualizar al completar items*
