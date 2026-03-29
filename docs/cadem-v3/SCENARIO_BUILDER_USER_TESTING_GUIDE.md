# Scenario Builder - Guía de Validación con Usuarios

**Fecha:** 29 de marzo de 2026  
**Versión:** MVP v1.0  
**Objetivo:** Validar usabilidad y utilidad del Scenario Builder con usuarios reales

---

## Resumen

Esta guía permite realizar sesiones controladas de validación con 2-5 usuarios internos o cliente piloto para obtener feedback real sobre el Scenario Builder MVP.

**Duración estimada por sesión:** 30-45 minutos  
**Modalidad:** Presencial o videollamada con compartir pantalla  
**Preparación previa:** 15 minutos

---

## Preparación Previa (Facilitador)

### 1. Configuración Técnica

```bash
# Verificar que el entorno está funcionando
npm run dev

# Confirmar que los escenarios de ejemplo existen
# (se crearon en validación previa)
```

### 2. Materiales Necesarios

- [ ] Acceso al Scenario Builder (URL: `/scenarios`)
- [ ] Esta guía impresa o en pantalla secundaria
- [ ] Formato de notas para capturar observaciones
- [ ] Opcional: Grabación de pantalla (con consentimiento)

### 3. Escenarios de Prueba Preparados

Tener a mano estos escenarios ya creados:

| Escenario | Descripción | UUID (para referencia) |
|-----------|-------------|------------------------|
| Subsidio al Transporte | Evento positivo, gobierno | `a0ee4c4b-3f7d-4a8e-b6c5-2d1e8f9a3b4c` |
| Crisis Económica | Evento negativo, economía | `1d91e26b-581d-4015-b907-b5102a407fc2` |
| Endurecimiento Migratorio | Evento mixto, seguridad | `c3f8a9e2-7b4d-4c1a-9f5e-6d2b8a4c7e1f` |

---

## Estructura de la Sesión (30-45 min)

### Fase 1: Introducción (5 min)

**Script del facilitador:**

> "Hoy vamos a probar una nueva funcionalidad llamada Scenario Builder. Te voy a pedir que hagas algunas tareas y que pienses en voz alta. No hay respuestas correctas o incorrectas - lo que me interesa es entender cómo usas la herramienta y qué te resulta confuso o útil."

**Contexto mínimo:**
- El Scenario Builder permite simular eventos y ver cómo afectarían la opinión pública
- Puedes crear escenarios con diferentes eventos y comparar resultados

---

### Fase 2: Tarea 1 - Explorar un Escenario Existente (10 min)

**Instrucción para el usuario:**

> "Veo que hay un escenario llamado 'Crisis Económica' ya creado. Ábrelo y explora qué información muestra. Cuéntame qué entiendes de lo que ves."

**Observaciones del facilitador:**

| Aspecto a observar | ¿Lo logró? | Notas |
|-------------------|------------|-------|
| Encuentra el escenario | ☐ Sí ☐ No | |
| Entiende qué es el baseline | ☐ Sí ☐ No | |
| Entiende qué es el escenario | ☐ Sí ☐ No | |
| Interpreta los deltas correctamente | ☐ Sí ☐ No | |
| Identifica el evento configurado | ☐ Sí ☐ No | |

**Preguntas de seguimiento:**

1. "¿Qué crees que significa el número '+8%' al lado de 'disapprove'?"
2. "¿Qué diferencia ves entre 'Baseline' y 'Escenario'?"
3. "¿Qué te dice esto sobre cómo afectaría una crisis económica a la aprobación del gobierno?"

---

### Fase 3: Tarea 2 - Crear un Escenario Simple (15 min)

**Instrucción para el usuario:**

> "Ahora quiero que crees tu propio escenario. Imagina que el gobierno anuncia una medida positiva, como una reducción de impuestos. Crea un escenario con ese evento y ejecútalo."

**Observaciones del facilitador:**

| Paso | ¿Lo logró sin ayuda? | ¿Dudó? | Notas |
|------|---------------------|--------|-------|
| Click en "Nuevo Escenario" | ☐ Sí ☐ No | ☐ Sí ☐ No | |
| Configurar título | ☐ Sí ☐ No | ☐ Sí ☐ No | |
| Agregar evento | ☐ Sí ☐ No | ☐ Sí ☐ No | |
| Configurar categoría | ☐ Sí ☐ No | ☐ Sí ☐ No | |
| Configurar severidad | ☐ Sí ☐ No | ☐ Sí ☐ No | |
| Configurar sentimiento | ☐ Sí ☐ No | ☐ Sí ☐ No | |
| Configurar intensidad | ☐ Sí ☐ No | ☐ Sí ☐ No | |
| Guardar escenario | ☐ Sí ☐ No | ☐ Sí ☐ No | |
| Ejecutar escenario | ☐ Sí ☐ No | ☐ Sí ☐ No | |

**Preguntas de seguimiento:**

1. "¿Qué fue lo más confuso de crear el escenario?"
2. "¿Entiendes qué hace cada slider (intensidad, salience, severidad)?"
3. "¿Confías en el resultado que te dio? ¿Por qué sí o por qué no?"

---

### Fase 4: Tarea 3 - Comparar Escenarios (10 min)

**Instrucción para el usuario:**

> "Ahora tienes dos escenarios: el de Crisis Económica que vimos al principio, y el que acabas de crear. ¿Puedes comparar qué impacto tiene cada uno en la aprobación del gobierno?"

**Observaciones del facilitador:**

| Aspecto | ¿Lo logró? | Notas |
|---------|------------|-------|
| Navega entre escenarios | ☐ Sí ☐ No | |
| Compara resultados | ☐ Sí ☐ No | |
| Entiende la diferencia de impacto | ☐ Sí ☐ No | |

**Preguntas de seguimiento:**

1. "¿Cuál escenario tiene más impacto? ¿Cómo lo sabes?"
2. "¿Te gustaría ver ambos resultados en la misma pantalla?"

---

### Fase 5: Preguntas Finales (5 min)

**Script del facilitador:**

> "Para terminar, tengo algunas preguntas generales:"

**Preguntas clave:**

1. **Utilidad:** "¿Crees que esta herramienta sería útil para tu trabajo? ¿En qué situaciones?"

2. **Confianza:** "¿Confías en los resultados que muestra? ¿Qué te haría confiar más?"

3. **Dirección del país:** "Notaste la pregunta sobre 'dirección del país'. ¿Te pareció que reaccionó de forma lógica a los escenarios?" (⚠️ Pregunta clave sobre `q_direction`)

4. **Detalle:** "¿Quieres ver más detalle (por región, edad, etc.) o menos?"

5. **Prioridad:** "Si pudieras mejorar UNA cosa de esta herramienta, ¿cuál sería?"

---

## Formato de Captura de Feedback

### Información General

- **Fecha:** ___/___/___
- **Nombre del usuario:** _________________
- **Rol:** ☐ Interno ☐ Cliente piloto ☐ Otro: _______
- **Duración de la sesión:** _____ minutos

### Resumen de Hallazgos

#### ✅ Lo que funcionó bien

1. _________________________________
2. _________________________________
3. _________________________________

#### ❌ Lo que causó confusión

1. _________________________________
2. _________________________________
3. _________________________________

#### 💡 Ideas o sugerencias

1. _________________________________
2. _________________________________
3. _________________________________

#### 🎯 Sobre `q_direction` (dirección del país)

- **¿Notó el usuario el comportamiento inconsistente?** ☐ Sí ☐ No
- **¿Le importó?** ☐ Sí ☐ No ☐ No lo mencionó
- **Comentarios:** _________________________________

---

## Análisis Post-Sesiones

### Después de 2-5 sesiones, responder:

#### 1. ¿Entienden baseline vs escenario?

- **% de usuarios que lo entendieron:** _____%
- **Patrones de confusión:** _________________________________
- **Acción recomendada:** _________________________________

#### 2. ¿Saben configurar intensidad/sentiment/salience?

- **% que configuró sin ayuda:** _____%
- **Concepto más confuso:** ☐ Intensidad ☐ Salience ☐ Severidad ☐ Sentiment
- **Acción recomendada:** _________________________________

#### 3. ¿Confían en el resultado?

- **% que confía:** _____%
- **Razones de desconfianza:** _________________________________
- **Acción recomendada:** _________________________________

#### 4. ¿Quieren más detalle o menos?

- **Mayoría quiere:** ☐ Más detalle ☐ Menos detalle ☐ Está bien así
- **Detalles solicitados:** _________________________________

#### 5. ¿`q_direction` realmente les importa?

- **% que notó el problema:** _____%
- **% a quienes les importó:** _____%
- **Veredicto:** ☐ Sí arreglar ☐ No es prioridad

---

## Criterios de Éxito del Test

### Mínimo Aceptable

- [ ] 60% de usuarios entienden baseline vs escenario
- [ ] 50% configuran un escenario sin ayuda significativa
- [ ] 50% confían en los resultados
- [ ] Se identifican mejoras claras para priorizar

### Buen Resultado

- [ ] 80% de usuarios entienden baseline vs escenario
- [ ] 70% configuran un escenario sin ayuda
- [ ] 70% confían en los resultados
- [ ] `q_direction` no es mencionado como problema por la mayoría

### Excelente Resultado

- [ ] 90%+ entienden la herramienta
- [ ] Usuarios proponen casos de uso inesperados
- [ ] Hay entusiasmo por usarlo en producción
- [ ] Se identifican mejoras de alto valor

---

## Próximos Pasos Post-Testing

### Inmediatos (1 semana)

1. **Compilar feedback** de todas las sesiones
2. **Identificar patrones** comunes
3. **Priorizar mejoras** basado en impacto vs esfuerzo

### Corto plazo (2-4 semanas)

4. **Implementar mejoras** de alta prioridad
5. **Validar cambios** con 1-2 usuarios
6. **Decidir** sobre `q_direction` basado en feedback

### Mediano plazo (1-3 meses)

7. **Expandir** a más usuarios si el feedback es positivo
8. **Desarrollar** features solicitadas (listas, comparaciones, IA)
9. **Integrar** con flujos de trabajo reales

---

## Anexo: Escenarios Sugeridos para Testing

### Escenario A: Subsidio al Transporte (Positivo)

```
Título: "Subsidio al Transporte Público"
Evento: "Gobierno anuncia subsidio del 40% al transporte público"
Categoría: government
Severidad: major
Sentimiento: 0.75 (positivo)
Intensidad: 0.8
Salience: 0.7
```

**Expectativa:** Aumento de aprobación del gobierno

### Escenario B: Crisis Económica (Negativo)

```
Título: "Crisis Económica"
Evento: "FMI proyecta recesión del 2% para Chile"
Categoría: economy
Severidad: major
Sentimiento: -0.75 (negativo)
Intensidad: 0.9
Salience: 0.6
```

**Expectativa:** Caída de aprobación y percepción económica

### Escenario C: Endurecimiento Migratorio (Mixto)

```
Título: "Endurecimiento Migratorio"
Evento: "Gobierno anuncia controles migratorios más estrictos"
Categoría: migration
Severidad: major
Sentimiento: -0.5 (negativo)
Intensidad: 0.7
Salience: 0.8
```

**Expectativa:** Impacto mixto según segmento político

---

## Checklist Pre-Sesión

- [ ] Entorno funcionando
- [ ] Escenarios de prueba creados
- [ ] Guía impresa/disponible
- [ ] Formato de notas listo
- [ ] Usuario confirmado
- [ ] Consentimiento de grabación (si aplica)

---

**Documento creado:** 29/03/2026  
**Última actualización:** 29/03/2026  
**Estado:** ✅ Listo para usar
