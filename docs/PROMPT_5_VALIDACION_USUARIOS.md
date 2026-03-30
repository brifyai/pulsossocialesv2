# Prompt 5: Validación con Usuarios - Scenario Builder

**Fecha:** 30 de marzo de 2026  
**Estado:** ✅ Listo para ejecutar  
**Dependencias:** Prompts 1-4 completados, RLS v4 aplicado, FK migrada

---

## 🎯 Objetivo

Validar con 2-3 usuarios reales si el Scenario Builder MVP es:
1. **Comprensible** - Entienden baseline vs escenario
2. **Usable** - Pueden crear escenarios sin ayuda
3. **Confiable** - Creen en los resultados
4. **Valioso** - Ven aplicación práctica

---

## ✅ Pre-requisitos Verificados

| Requisito | Estado | Documento |
|-----------|--------|-----------|
| RLS v4 aplicado | ✅ | `docs/RESUMEN_EJECUCION_RLS_V4.md` |
| FK migrada (auth.users → public.users) | ✅ | `docs/MIGRACION_FK_MANUAL.md` |
| Escenarios NULL fixeados | ✅ | Count: 0 |
| Script de preparación listo | ✅ | `scripts/test/prepareUserTestingScenarios.ts` |
| Plan de validación V2 | ✅ | `docs/cadem-v3/PLAN_VALIDACION_USUARIOS_V2.md` |
| Checklist de validación | ✅ | `docs/VALIDACION_USUARIOS_CHECKLIST.md` |

---

## 🚀 Instrucciones de Ejecución

### Paso 1: Preparar Escenarios de Prueba (2 min)

```bash
npx tsx scripts/test/prepareUserTestingScenarios.ts
```

**Resultado esperado:**
```
🎯 Preparando escenarios de prueba para validación con usuarios
✅ Conexión a Supabase establecida
🔍 Buscando usuario válido...
✅ Usando usuario: admin@pulso.com (uuid)
📊 Escenarios existentes: 0/3
➕ Creando: Crisis Económica
   ✅ Creado
➕ Creando: Subsidio al Transporte
   ✅ Creado
➕ Creando: Endurecimiento Migratorio
   ✅ Creado
🎉 Escenarios de prueba preparados exitosamente
```

### Paso 2: Verificar Servidor Frontend (1 min)

```bash
npm run dev
```

**Verificaciones:**
- [ ] Servidor responde en http://localhost:5175
- [ ] Página /scenarios carga sin errores
- [ ] Lista de escenarios muestra los 3 escenarios creados

### Paso 3: Preparar Materiales del Facilitador (5 min)

**Materiales necesarios:**
1. Esta guía (PROMPT_5_VALIDACION_USUARIOS.md)
2. Formato de captura (ver sección abajo)
3. Timer para cada tarea
4. Opcional: Consentimiento de grabación

---

## 📋 Estructura de la Sesión (30-40 min)

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

3. **Labels:** "¿Los labels 'Aprueba'/'Desaprueba' son claros?"

4. **Dirección del país:** "¿Notaste la pregunta sobre 'dirección del país'? ¿Te pareció lógica?"

5. **Prioridad:** "Si pudieras mejorar UNA cosa, ¿cuál sería?"

6. **NPS:** "En escala 0-10, ¿qué tan probable es que recomiendes esta herramienta?"
   - Respuesta: ___

---

## 📊 Formato de Captura por Usuario

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

### Labels Humanos
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

## 📈 Análisis Post-Sesiones

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

## 📁 Documentos Relacionados

| Documento | Descripción |
|-----------|-------------|
| `docs/cadem-v3/PLAN_VALIDACION_USUARIOS_V2.md` | Plan detallado completo |
| `docs/VALIDACION_USUARIOS_CHECKLIST.md` | Checklist técnico pre-sesión |
| `docs/cadem-v3/SCENARIO_BUILDER_USER_TESTING_GUIDE.md` | Guía de testing técnico |
| `scripts/test/prepareUserTestingScenarios.ts` | Script de preparación |
| `docs/MIGRACION_FK_MANUAL.md` | Instrucciones migración FK |

---

## ✅ Checklist Pre-Sesión

- [ ] Servidor corriendo en `localhost:5175`
- [ ] Escenarios de prueba creados y visibles
- [ ] Guía impresa/disponible
- [ ] Formato de captura listo
- [ ] Usuario confirmado
- [ ] Consentimiento de grabación (si aplica)

---

## 🎯 Criterios de Éxito

| Criterio | Meta | Medición |
|----------|------|----------|
| Comprensión baseline vs escenario | ≥ 80% | Usuarios que entienden la diferencia |
| Creación sin ayuda | ≥ 60% | Usuarios que crean escenario solo |
| Confianza en resultados | ≥ 70% | Usuarios que confían o están seguros |
| NPS | ≥ 7 | Promedio de recomendación |

---

## 🚀 Próximos Pasos (Post-Validación)

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

**Documento creado:** 30/03/2026  
**Versión:** 1.0  
**Estado:** ✅ Listo para ejecutar
