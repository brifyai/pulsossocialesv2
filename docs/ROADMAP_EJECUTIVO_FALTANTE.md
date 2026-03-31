# Roadmap Ejecutivo: Qué Falta para Beta Pública

> **Estado**: MVP técnico sólido → Beta pública controlada  
> **Fecha**: 30 de Marzo 2026  
> **Prioridad**: Seguridad > Operación > UX > Validación

---

## Resumen Ejecutivo

### ✅ Ya está hecho (NO tocar salvo bug crítico)
- Motor CADEM v1.1 calibrado
- Eventos v1.2 integrados
- Scenario Builder MVP funcional
- Persistencia de estados
- Rollout controlado validado
- Arquitectura de datos

### 🎯 Lo que falta ahora
**No falta "más inteligencia". Falta hacer la plataforma segura, operable y comprensible para usuarios reales.**

---

## P0 — CRÍTICO (Bloqueante para Beta)

### 1. Seguridad Real de Producción
**Estado**: Parcialmente avanzado, necesita consolidación

#### Checklist:
- [ ] **RLS en todas las tablas sensibles**
  - [ ] `survey_results` - verificar políticas
  - [ ] `agent_topic_state` - confirmar RLS
  - [ ] `agent_panel_state` - confirmar RLS
  - [ ] `scenario_events` - ya migrado a RLS v4
  - [ ] `weekly_events` - verificar
  - [ ] `event_impact_logs` - verificar
  - [ ] `survey_definitions` - verificar acceso por rol

- [ ] **Eliminar fallbacks residuales**
  - [ ] Revisar scripts que usen service key sin necesidad
  - [ ] Eliminar `anon` key en scripts de backend
  - [ ] Validar que no haya endpoints abiertos

- [ ] **Revisión de acceso por rol**
  - [ ] Admin: acceso total
  - [ ] Operador: crear/ver runs, no borrar
  - [ ] Usuario: solo ver resultados publicados
  - [ ] Anónimo: nada

- [ ] **Rotación de secrets**
  - [ ] Revisar si `SUPABASE_SERVICE_KEY` estuvo expuesto
  - [ ] Rotar si es necesario
  - [ ] Mover a variables de entorno seguras

- [ ] **Rate limiting**
  - [ ] Implementar en endpoints críticos
  - [ ] `/api/survey/run`
  - [ ] `/api/scenario/create`
  - [ ] Login/Auth

- [ ] **Auditoría de privilegios**
  - [ ] Revisar scripts con acceso elevado
  - [ ] Documentar qué hace cada script
  - [ ] Eliminar permisos excesivos

**Entregable**: Documento "Security Hardening Phase 2" con todo verificado

---

### 2. Operación Sin Scripts (Etapa 3-4)
**Estado**: Etapa 1-2 completadas, falta ejecución desde UI

#### Checklist:
- [ ] **Crear encuestas desde UI**
  - [ ] Formulario de creación de encuesta
  - [ ] Selección de preguntas desde catálogo
  - [ ] Configuración de sample size
  - [ ] Guardar como draft o publicar

- [ ] **Ejecutar runs controlados desde UI**
  - [ ] Botón "Ejecutar Encuesta" en Operations
  - [ ] Selección de modo: baseline / scenario
  - [ ] Configuración de parámetros (sample size, etc.)
  - [ ] Confirmación antes de ejecutar
  - [ ] Mostrar progreso en tiempo real

- [ ] **Ver estado de runs sin consola**
  - [ ] Tabla de runs con filtros (ya en progreso)
  - [ ] Estados: pending, running, completed, failed
  - [ ] Tiempo de ejecución
  - [ ] Progreso % (si es posible)

- [ ] **Ver errores en UI**
  - [ ] RunDetailModal con sección de errores ✅
  - [ ] Logs de error legibles
  - [ ] Stack trace colapsable
  - [ ] Botón "Reintentar" para runs fallidos

- [ ] **No depender de `tsx` para operar**
  - [ ] Todas las operaciones críticas desde UI
  - [ ] Scripts solo para migraciones y setup
  - [ ] Documentar qué scripts quedan

**Entregable**: Operations Page funcional para operador no-técnico

---

## P1 — MUY IMPORTANTE (Valor visible)

### 3. Comparación Visual Baseline vs Escenario
**Estado**: No implementado, mayor gap de UX

#### Checklist:
- [ ] **Vista comparativa en SurveyResults**
  - [ ] Split view: baseline | escenario
  - [ ] Mismo formato para comparar
  - [ ] Resumen ejecutivo arriba

- [ ] **Delta por pregunta visible**
  - [ ] Diferencia en puntos porcentuales
  - [ ] Indicador visual: ↑ ↓ →
  - [ ] Color: verde (sube), rojo (baja), gris (sin cambio)
  - [ ] Umbral de significancia (ej: >2%)

- [ ] **Indicadores comprensibles**
  - [ ] "Aprobación subió 5 puntos"
  - [ ] "Rechazo bajó 3 puntos"
  - [ ] "Sin cambio significativo"
  - [ ] Iconografía clara

- [ ] **Explicación simple**
  - [ ] Tooltip: "Este escenario representa..."
  - [ ] Texto auto-generado del impacto
  - [ ] Narrativa en lenguaje humano

**Entregable**: Página de comparación visual funcional

---

### 4. Gestión de Escenarios Mejorada
**Estado**: Builder existe, falta gestión

#### Checklist:
- [ ] **Lista de escenarios usable**
  - [ ] Tabla con: nombre, fecha, estado, acciones
  - [ ] Filtros: por fecha, por tipo, por estado
  - [ ] Búsqueda por nombre
  - [ ] Ordenamiento

- [ ] **Editar escenario**
  - [ ] Cargar escenario existente en builder
  - [ ] Modificar eventos
  - [ ] Guardar como nueva versión

- [ ] **Duplicar escenario**
  - [ ] Botón "Duplicar"
  - [ ] Crear copia con nombre "[Copia] Original"
  - [ ] Abrir en builder

- [ ] **Historial de escenario**
  - [ ] Versiones anteriores
  - [ ] Quién creó/modificó
  - [ ] Cuándo se usó en una encuesta

**Entregable**: Scenario List + gestión completa

---

### 5. Validación con Usuarios Reales
**Estado**: Planificado, no ejecutado

#### Checklist:
- [ ] **Preparar sesiones (2-5)**
  - [ ] Definir perfiles de usuarios
  - [ ] Crear guión de sesión
  - [ ] Preparar escenarios de prueba

- [ ] **Ejecutar sesiones**
  - [ ] Sesión 1: Usuario tipo analista
  - [ ] Sesión 2: Usuario tipo estratega
  - [ ] Sesión 3: Usuario tipo periodista
  - [ ] Grabar (con permiso) o tomar notas

- [ ] **Recopilar feedback**
  - [ ] Qué entendieron
  - [ ] Qué no entendieron
  - [ ] Qué les gustó
  - [ ] Qué les frustró
  - [ ] Qué esperaban y no encontraron

- [ ] **Validar hipótesis**
  - [ ] ¿Importa `q_direction` para usuarios?
  - [ ] ¿Entienden baseline vs escenario?
  - [ ] ¿El valor del producto es claro?
  - [ ] ¿Lo usarían pagando?

- [ ] **Priorizar mejoras**
  - [ ] Lista de fixes rápidos
  - [ ] Features que faltan
  - [ ] Bugs encontrados

**Entregable**: Reporte "User Testing Results" con insights

---

## P2 — IMPORTANTE (Después de P0-P1)

### 6. Observabilidad
- [ ] Alertas automáticas (Discord/Email)
- [ ] Dashboard de salud del sistema
- [ ] Métricas: tiempos de run, tasa de error
- [ ] Logs centralizados

### 7. Tests Automatizados
- [ ] Tests E2E críticos
- [ ] Tests de integración con Supabase
- [ ] Tests de flujos de UI
- [ ] Coverage > 60%

### 8. Feature Flags Claros
- [ ] Sistema de flags por entorno
- [ ] v1.1 baseline: ON/OFF
- [ ] v1.2 events: ON/OFF
- [ ] Scenarios: ON/OFF
- [ ] Por usuario/encuesta

---

## P3 — DESPUÉS (Futuro)

### 9. Automatización de Eventos Reales
- Pipeline `event_source_items` → `proposed_events`
- Validación humana
- Publicación a `weekly_events`

### 10. IA Asistente para Escenarios
- Sugerir eventos basados en noticias
- Explicar impacto en lenguaje natural
- Recomendaciones de escenarios

### 11. v1.3 / Features Grandes
- News ingestion automática
- Predicción de impacto avanzada
- ML para calibración
- Multi-país

---

## Plan de Trabajo Sugerido

### Semana 1: Seguridad (P0)
- Día 1-2: Auditar y consolidar RLS
- Día 3-4: Eliminar fallbacks, rotar secrets
- Día 5: Rate limiting y auditoría final

### Semana 2: Operación UI (P0)
- Día 1-2: Crear encuestas desde UI
- Día 3-4: Ejecutar runs desde UI
- Día 5: Ver errores y estados

### Semana 3: Comparación Visual (P1)
- Día 1-2: Vista split baseline/scenario
- Día 3-4: Deltas y indicadores
- Día 5: Explicaciones y narrativa

### Semana 4: User Testing (P1)
- Día 1: Preparar sesiones
- Día 2-3: Ejecutar sesiones
- Día 4: Analizar feedback
- Día 5: Priorizar y planificar

---

## Métricas de Éxito

### Para cerrar P0:
- [ ] 0 tablas sensibles sin RLS
- [ ] 0 scripts con service key innecesario
- [ ] Operador puede crear encuesta sin terminal
- [ ] Operador puede ejecutar run sin terminal
- [ ] Operador puede ver error sin consola

### Para cerrar P1:
- [ ] Usuario entiende baseline vs escenario en <30 segundos
- [ ] Usuario puede crear y comparar escenario sin ayuda
- [ ] 3+ sesiones de user testing completadas
- [ ] Lista de 10+ insights de usuarios

---

## Notas

- **NO tocar**: `topicStateSeed.ts`, calibración v1.1, `eventImpact.ts` (si está razonable), arquitectura de persistencia
- **Mantener**: Todos los scripts de rollout/staging para uso interno
- **Documentar**: Todo lo que se haga en esta fase

---

*Última actualización: 30 Marzo 2026*
*Próxima revisión: Al completar P0*
