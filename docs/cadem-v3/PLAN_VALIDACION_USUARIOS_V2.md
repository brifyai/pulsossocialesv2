# Plan de Validación con Usuarios - Scenario Builder v2

**Fecha:** 30 de marzo de 2026  
**Versión:** MVP v1.0 + Labels Humanos  
**Estado:** Listo para ejecutar

---

## Resumen Ejecutivo

Este plan actualiza la validación del Scenario Builder MVP con los cambios recientes (labels humanos en distribuciones) y prioriza las métricas críticas para decidir el roadmap.

**Objetivo:** Validar con 2-3 usuarios reales si el Scenario Builder es:
1. **Comprensible** - Entienden baseline vs escenario
2. **Usable** - Pueden crear escenarios sin ayuda
3. **Confiable** - Creen en los resultados
4. **Valioso** - Ven aplicación práctica

**Duración por sesión:** 30-40 minutos  
**Modalidad:** Videollamada + compartir pantalla  
**Preparación:** 10 minutos

---

## Preparación Pre-Sesión

### 1. Configuración Técnica (5 min)

```bash
# Verificar que el servidor está corriendo
curl -s http://localhost:5175/scenarios | head -5

# Verificar que hay escenarios de ejemplo
# Ir a: http://localhost:5175/scenarios
# Confirmar que se ven escenarios listados
```

### 2. Migración de Foreign Key (REQUERIDO)

⚠️ **IMPORTANTE:** Antes de crear escenarios, debe ejecutarse la migración de FK.

La tabla `scenario_events` tiene una FK incorrecta que apunta a `auth.users` en lugar de `public.users`.

**Instrucciones:**
1. Abrir [Supabase Dashboard](https://app.supabase.com)
2. Navegar a **SQL Editor**
3. Ejecutar el SQL de: `docs/MIGRACION_FK_MANUAL.md`

**Verificación rápida:**
```bash
npx tsx scripts/test/prepareUserTestingScenarios.ts
# Si muestra error de FK, ejecutar migración manual primero
```

### 3. Preparar Escenarios de Prueba

**Escenarios que deben existir antes de la sesión:**

| Escenario | Descripción | Propósito |
|-----------|-------------|-----------|
| **Crisis Económica** | Evento negativo economía | Test impacto negativo |
| **Subsidio Transporte** | Evento positivo gobierno | Test impacto positivo |
| **Endurecimiento Migratorio** | Evento mixto seguridad | Test impacto segmentado |

**Si no existen, crearlos antes:**
- Ir a `/scenarios`
- Click "Nuevo Escenario"
- Configurar según anexo
- Guardar

### 3. Materiales del Facilitador

- [ ] Esta guía impresa o en pantalla secundaria
- [ ] Formato de captura (ver abajo)
- [ ] Timer para cada tarea
- [ ] Opcional: Grabación con consentimiento

---

## Estructura de la Sesión

### Fase 1: Introducción (3 min)

**Script:**
> "Hoy vamos a probar una herramienta llamada Scenario Builder. Te voy a pedir que hagas algunas tareas y pienses en voz alta. No hay respuestas correctas - lo que me interesa es entender cómo usas la herramienta y qué te resulta confuso o útil."

**Contexto mínimo:**
- El Scenario Builder simula cómo eventos afectan la opinión pública
- Puedes crear escenarios y comparar resultados

---

### Fase 2: Tarea 1 - Explorar Baseline (7 min)

**Instrucción:**
> "Abre el escenario llamado 'Crisis Económica'. Explora lo que ves y cuéntame qué entiendes."

**Observaciones a registrar:**

| Aspecto | ¿Lo logró? | Notas |
|---------|------------|-------|
| Encuentra el escenario | ☐ Sí ☐ No | |
| Entiende qué es "Baseline" | ☐ Sí ☐ No | |
| Entiende qué es "Escenario" | ☐ Sí ☐ No | |
| Lee los labels humanos (Aprueba/Desaprueba) | ☐ Sí ☐ No | |
| Interpreta los deltas (+X% / -X%) | ☐ Sí ☐ No | |

**Preguntas de seguimiento:**
1. "¿Qué diferencia ves entre 'Baseline' y 'Escenario'?"
2. "¿Qué significa el '+8%' al lado de 'Desaprueba'?"
3. "¿Qué te dice esto sobre cómo afectaría una crisis económica?"

---

### Fase 3: Tarea 2 - Crear Escenario (15 min)

**Instrucción:**
> "Ahora crea tu propio escenario. Imagina que el gobierno anuncia una reducción de impuestos. Configúralo y ejecútalo."

**Pasos a observar:**

| Paso | ¿Sin ayuda? | ¿Dudó? | Tiempo | Notas |
|------|-------------|--------|--------|-------|
| Click "Nuevo Escenario" | ☐ Sí ☐ No | ☐ Sí ☐ No | ___ min | |
| Configura título | ☐ Sí ☐ No | ☐ Sí ☐ No | ___ min | |
| Agrega descripción | ☐ Sí ☐ No | ☐ Sí ☐ No | ___ min | |
| Selecciona categoría | ☐ Sí ☐ No | ☐ Sí ☐ No | ___ min | |
| Configura severidad | ☐ Sí ☐ No | ☐ Sí ☐ No | ___ min | |
| Configura sentimiento | ☐ Sí ☐ No | ☐ Sí ☐ No | ___ min | |
| Configura intensidad | ☐ Sí ☐ No | ☐ Sí ☐ No | ___ min | |
| Configura salience | ☐ Sí ☐ No | ☐ Sí ☐ No | ___ min | |
| Guarda escenario | ☐ Sí ☐ No | ☐ Sí ☐ No | ___ min | |
| Ejecuta escenario | ☐ Sí ☐ No | ☐ Sí ☐ No | ___ min | |

**Preguntas de seguimiento:**
1. "¿Qué fue lo más confuso?"
2. "¿Entiendes qué hace cada slider?"
3. "¿Confías en el resultado? ¿Por qué?"

---

### Fase 4: Tarea 3 - Comparar Resultados (8 min)

**Instrucción:**
> "Ahora tienes dos escenarios: el de Crisis Económica y el que acabas de crear. ¿Puedes comparar qué impacto tiene cada uno?"

**Observaciones:**

| Aspecto | ¿Lo logró? | Notas |
|---------|------------|-------|
| Navega entre escenarios | ☐ Sí ☐ No | |
| Compara resultados | ☐ Sí ☐ No | |
| Identifica cuál tiene más impacto | ☐ Sí ☐ No | |

**Preguntas:**
1. "¿Cuál escenario tiene más impacto? ¿Cómo lo sabes?"
2. "¿Te gustaría ver ambos en la misma pantalla?"

---

### Fase 5: Preguntas Finales (7 min)

**Preguntas clave:**

1. **Utilidad:** "¿Sería útil para tu trabajo? ¿En qué situaciones?"

2. **Confianza:** "¿Confías en los resultados? ¿Qué te haría confiar más?"

3. **Labels:** "¿Los labels 'Aprueba'/'Desaprueba' son claros?" (⚠️ NUEVO - validar cambio reciente)

4. **Dirección del país:** "¿Notaste la pregunta sobre 'dirección del país'? ¿Te pareció lógica?"

5. **Prioridad:** "Si pudieras mejorar UNA cosa, ¿cuál sería?"

6. **NPS:** "En escala 0-10, ¿qué tan probable es que recomiendes esta herramienta?"
   - Respuesta: ___

---

## Formato de Captura por Usuario

### Información General
- **Fecha:** ___/___/___
- **Nombre:** _________________
- **Rol:** ☐ Interno ☐ Cliente ☐ Analista ☐ Otro: ___
- **Nivel técnico:** ☐ Alto ☐ Medio ☐ Bajo
- **Duración:** ___ minutos

### Métricas de Comprensión

| Aspecto | Resultado | Notas |
|---------|-----------|-------|
| Entendió baseline vs escenario | ☐ Sí ☐ No ☐ Parcial | |
| Pudo crear escenario sin ayuda | ☐ Sí ☐ No ☐ Con ayuda | |
| Entendió los labels humanos | ☐ Sí ☐ No | |
| Confió en los resultados | ☐ Sí ☐ No ☐ Dudoso | |
| Encontró valor práctico | ☐ Sí ☐ No ☐ Dudoso | |

### Fricciones Identificadas

**Principal:** _________________________________

**Secundaria:** _________________________________

### Valor Percibido

**Principal:** _________________________________

**Secundario:** _________________________________

### Labels Humanos (NUEVO)
- ☐ Los notó y le parecieron claros
- ☐ Los notó pero no le importaron
- ☐ No los notó específicamente
- ☐ Sugirió mejoras: _________________

### Campo "Dirección del país"
- ☐ No lo notó
- ☐ Lo notó pero no le importó
- ☐ Se confundió
- ☐ Pidió explicación
- ☐ Sugirió eliminarlo

### Comentarios Verbales Clave
> "_________________________________"

### Mejoras Sugeridas
1. _________________________________
2. _________________________________
3. _________________________________

### NPS
**Respuesta:** ___/10

---

## Análisis Post-Sesiones

### Métricas Cuantitativas

| Métrica | Usuario 1 | Usuario 2 | Usuario 3 | Promedio |
|---------|-----------|-----------|-----------|----------|
| Entendió baseline vs escenario | ☐ | ☐ | ☐ | __% |
| Creó escenario sin ayuda | ☐ | ☐ | ☐ | __% |
| Confió en resultados | ☐ | ☐ | ☐ | __% |
| NPS (0-10) | __ | __ | __ | __ |

### Hallazgos Globales

#### ✅ Lo que Funcionó
1. _________________________________
2. _________________________________

#### ❌ Lo que Confundió
1. _________________________________
2. _________________________________

#### 💡 Mejoras Más Pedidas
1. _________________________________ (X/3 usuarios)
2. _________________________________ (X/3 usuarios)
3. _________________________________ (X/3 usuarios)

### Veredicto

- ☐ **AVANZAR:** Usuarios entienden y ven valor → Priorizar mejoras de UX, lista de escenarios, comparación side-by-side
- ☐ **REFINAR:** Usuarios se confunden pero ven valor → Mejorar claridad, labels, explicaciones
- ☐ **SIMPLIFICAR:** Usuarios no entienden → Simplificar flujo antes de agregar features

**Justificación:** _________________________________

---

## Acciones Inmediatas Post-Testing

### Semana 1: Compilar y Decidir
- [ ] Completar análisis de las sesiones
- [ ] Identificar patrones comunes
- [ ] Decidir: ¿Avanzar / Refinar / Simplificar?

### Semana 2-3: Implementar Mejoras de Alta Prioridad
- [ ] Mejora 1: _________________________________
- [ ] Mejora 2: _________________________________

### Semana 4: Validar Cambios
- [ ] Testear con 1-2 usuarios las mejoras
- [ ] Confirmar que las fricciones se resolvieron

---

## Anexo: Configuración de Escenarios de Prueba

### Escenario A: Crisis Económica

```
Título: Crisis Económica
Descripción: FMI proyecta recesión del 2% para Chile
Categoría: economy
Severidad: major
Sentimiento: -0.75
Intensidad: 0.9
Salience: 0.6
```

**Expectativa:** Caída de aprobación, aumento de desaprobación

### Escenario B: Subsidio Transporte

```
Título: Subsidio al Transporte
Descripción: Gobierno anuncia subsidio del 40% al transporte público
Categoría: government
Severidad: major
Sentimiento: 0.75
Intensidad: 0.8
Salience: 0.7
```

**Expectativa:** Aumento de aprobación

### Escenario C: Endurecimiento Migratorio

```
Título: Endurecimiento Migratorio
Descripción: Gobierno anuncia controles migratorios más estrictos
Categoría: migration
Severidad: major
Sentimiento: -0.5
Intensidad: 0.7
Salience: 0.8
```

**Expectativa:** Impacto mixto según segmento

---

## Checklist Pre-Sesión

- [ ] Servidor corriendo en `localhost:5175`
- [ ] Escenarios de prueba creados y visibles
- [ ] Guía impresa/disponible
- [ ] Formato de captura listo
- [ ] Usuario confirmado
- [ ] Consentimiento de grabación (si aplica)

---

**Documento creado:** 30/03/2026  
**Versión:** 2.0 (actualizado con labels humanos)  
**Estado:** ✅ Listo para ejecutar
