# Scenario Builder - Diseño UX

**Fecha:** 29 de marzo de 2026  
**Versión:** CADEM v1.2  
**Estado:** Diseño UX para MVP

---

## 1. Objetivo del Feature

### ¿Qué problema resuelve?

El Scenario Builder permite a **usuarios no técnicos** simular el impacto de eventos hipotéticos en las opiniones públicas sin necesidad de entender la arquitectura interna del motor CADEM.

### Ejemplos de uso

- *"¿Qué pasaría si el gobierno anunciara un alza de impuestos?"*
- *"¿Cómo afectaría una crisis económica moderada a la aprobación presidencial?"*
- *"¿Qué impacto tendría un escándalo de corrupción en la confianza institucional?"*

### Tipo de usuario

- **Consultoras políticas** - Evaluar escenarios estratégicos
- **Equipos de gobierno** - Simular impacto de políticas públicas
- **Analistas de políticas públicas** - Estudiar efectos de eventos hipotéticos
- **Investigadores académicos** - Modelar comportamiento de opinión pública

---

## 2. Principios de Diseño

### 2.1 Simplicidad
- Un escenario debe poder crearse en menos de 2 minutos
- Solo campos esenciales visibles por defecto
- Opciones avanzadas colapsadas

### 2.2 Trazabilidad
- Cada escenario tiene un nombre y descripción clara
- Fecha de creación y última modificación visibles
- Historial de ejecuciones asociadas

### 2.3 Comparabilidad
- Baseline y escenario siempre visibles lado a lado
- Diferencias (deltas) destacadas visualmente
- Gráficos comparativos intuitivos

### 2.4 Sin exposición de complejidad técnica
- No se muestra: `weekKey`, `engineMode`, `persistState`
- No se muestra: SQL, JSON, IDs internos
- No se muestra: Configuración del motor de opiniones

---

## 3. Modos de Uso

### Modo 1 — Baseline ⭐ (Recomendado para empezar)
**Configuración:** Sin eventos ni escenarios

**Cuándo usar:**
- Primera vez que se explora una encuesta
- Para establecer punto de referencia
- Para validar que el sistema funciona correctamente

**Qué ve el usuario:**
- Resultados "puros" del modelo sin influencias externas
- Distribución de opiniones base

---

### Modo 2 — Coyuntura Real
**Configuración:** `useEvents: true`

**Cuándo usar:**
- Para entender el impacto de eventos reales actuales
- Cuando se quiere simular "el mundo como está hoy"

**Qué ve el usuario:**
- Eventos reales de la semana aplicados
- Impacto de coyuntura actual

---

### Modo 3 — Escenario Hipotético ⭐ (Principal caso de uso)
**Configuración:** `scenarioEventId: <uuid>`

**Cuándo usar:**
- Para simular un evento que aún no ha ocurrido
- Para evaluar estrategias ante posibles crisis
- Para entender sensibilidad del público a ciertos temas

**Qué ve el usuario:**
- Su escenario personalizado aplicado
- Comparación con baseline

---

### Modo 4 — Coyuntura + Escenario ⚠️ (Avanzado)
**Configuración:** `useEvents: true` + `scenarioEventId: <uuid>`

**Cuándo usar:**
- Cuando se quiere ver el impacto acumulado
- Para escenarios realistas que parten de la coyuntura actual

**Advertencia UX:**
- Este modo debe estar claramente marcado como "Avanzado"
- Debe mostrar explícitamente qué eventos reales y qué escenario se están combinando
- Riesgo: el usuario puede no entender qué parte del cambio viene de dónde

---

## 4. Flujo de Usuario

```
┌─────────────────────────────────────────────────────────────────┐
│                    LISTA DE ESCENARIOS                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Escenario 1 │  │ Escenario 2 │  │ Escenario 3 │  [+ Nuevo]  │
│  │   (draft)   │  │  (active)   │  │  (archived) │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CREAR/EDITAR ESCENARIO                         │
│                                                                 │
│  Nombre: [________________________]                            │
│  Descripción: [________________________]                       │
│                                                                 │
│  Categoría: [▼ Economy    ]                                    │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ Sentiment   │ │ Intensity   │ │  Salience   │               │
│  │   [-0.75]   │ │   [0.80]    │ │   [0.90]    │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                 │
│  Severidad: [● Major  ○ Moderate  ○ Minor]                     │
│                                                                 │
│  [Guardar Borrador]  [Activar Escenario]                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              EJECUTAR SIMULACIÓN                                │
│                                                                 │
│  Tipo de simulación:                                           │
│  ( ) Baseline                                                  │
│  ( ) Coyuntura real                                            │
│  (●) Escenario hipotético: "Crisis Económica"                  │
│  ( ) Coyuntura + Escenario [Avanzado]                          │
│                                                                 │
│  Encuesta: [▼ Encuesta Presidencial Marzo 2026]                │
│                                                                 │
│  [▶ Ejecutar Simulación]                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              RESULTADOS: BASELINE vs ESCENARIO                  │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │    BASELINE     │  │    ESCENARIO    │  │     DELTA       │ │
│  │                 │  │                 │  │                 │ │
│  │  Aprobación:    │  │  Aprobación:    │  │  Aprobación:    │ │
│  │     42%         │  │     35%         │  │     -7% 🔴      │ │
│  │                 │  │                 │  │                 │ │
│  │  Desaprobación: │  │  Desaprobación: │  │  Desaprobación: │ │
│  │     38%         │  │     47%         │  │     +9% 🔴      │ │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  [Ver por segmentos]  [Ver por región]  [Exportar]             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Pantallas

### 5.1 ScenarioListPage
**Propósito:** Ver y gestionar todos los escenarios del usuario

**Elementos principales:**
- Grid/tarjetas de escenarios
- Filtros: Todos / Activos / Borradores / Archivados
- Buscador por nombre
- Botón "Nuevo Escenario"

**Acciones disponibles:**
- Crear nuevo
- Editar
- Duplicar
- Archivar/Desarchivar
- Eliminar (solo borradores)

**Estados visuales:**
- Draft: Gris, etiqueta "Borrador"
- Active: Verde, etiqueta "Activo"
- Archived: Tenue, etiqueta "Archivado"

---

### 5.2 ScenarioBuilderPage
**Propósito:** Crear o editar un escenario

**Elementos principales:**
- Formulario de parámetros
- Preview de impacto estimado
- Botones de acción

**Secciones del formulario:**

#### Sección 1: Información Básica
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| Nombre | Texto | Sí | Máx 100 caracteres |
| Descripción | Textarea | No | Máx 500 caracteres |
| Categoría | Select | Sí | economy, government, social, security, international, environment, other |

#### Sección 2: Métricas del Evento (expandible)
| Campo | Tipo | Rango | Descripción UX |
|-------|------|-------|----------------|
| Sentimiento | Slider | -1 a 1 | Negativo ← → Positivo |
| Intensidad | Slider | 0 a 1 | Débil ← → Fuerte |
| Salience | Slider | 0 a 1 | Poco visible ← → Muy visible |
| Severidad | Radio | minor/moderate/major | Impacto del evento |

#### Sección 3: Segmentación (avanzado, colapsado)
- Target Entities: Entidades afectadas
- Affected Segments: Segmentos demográficos impactados

**Acciones disponibles:**
- Guardar borrador
- Activar escenario
- Previsualizar impacto
- Cancelar

---

### 5.3 ScenarioExecutionPage
**Propósito:** Configurar y ejecutar simulación

**Elementos principales:**
- Selector de modo (4 opciones)
- Selector de escenario (si aplica)
- Selector de encuesta
- Configuración de agentes (default: 500)
- Botón ejecutar

**Validaciones:**
- Si modo incluye escenario, debe seleccionarse uno
- Si modo es "Coyuntura + Escenario", mostrar advertencia

---

### 5.4 ScenarioResultsPage
**Propósito:** Ver comparación baseline vs escenario

**Elementos principales:**
- Vista comparativa de 3 columnas
- Gráficos de distribución
- Tabla de segmentos afectados
- Mapa de calor por región

**Indicadores clave mostrados:**
- Approval rate
- Direction (optimism/pessimism)
- Economy expectation
- Government approval

---

## 6. Formulario de Creación de Escenario

### Campos Detallados

#### 6.1 Nombre
- **Label:** "Nombre del escenario"
- **Placeholder:** "Ej: Crisis económica por alza de impuestos"
- **Validación:** Requerido, máx 100 caracteres
- **Error:** "El nombre es obligatorio"

#### 6.2 Descripción
- **Label:** "Descripción"
- **Placeholder:** "Describe el escenario hipotético..."
- **Validación:** Opcional, máx 500 caracteres
- **Ayuda:** "Esta descripción te ayudará a identificar el escenario más tarde"

#### 6.3 Categoría
- **Label:** "Categoría del evento"
- **Opciones:**
  - Economy → "Economía"
  - Government → "Gobierno"
  - Social → "Social"
  - Security → "Seguridad"
  - International → "Internacional"
  - Environment → "Medio Ambiente"
  - Other → "Otro"
- **Validación:** Requerido
- **Default:** "Economía"

#### 6.4 Sentimiento
- **Label:** "Sentimiento del evento"
- **Tipo:** Slider con labels
- **Rango:** -1 (muy negativo) a 1 (muy positivo)
- **Marcas:** -1, -0.5, 0, 0.5, 1
- **Labels:** "Muy negativo" | "Negativo" | "Neutral" | "Positivo" | "Muy positivo"
- **Default:** 0

#### 6.5 Intensidad
- **Label:** "Intensidad del impacto"
- **Tipo:** Slider
- **Rango:** 0 (débil) a 1 (fuerte)
- **Labels:** "Débil" | "Moderada" | "Fuerte"
- **Default:** 0.5
- **Ayuda:** "Qué tan fuerte es el impacto emocional del evento"

#### 6.6 Salience
- **Label:** "Visibilidad del evento"
- **Tipo:** Slider
- **Rango:** 0 (poco visible) a 1 (muy visible)
- **Labels:** "Poco visible" | "Moderada" | "Muy visible"
- **Default:** 0.7
- **Ayuda:** "Qué tan presente está el evento en la opinión pública"

#### 6.7 Severidad
- **Label:** "Severidad del evento"
- **Tipo:** Radio buttons
- **Opciones:**
  - Minor → "Menor" (impacto limitado)
  - Moderate → "Moderado" (impacto significativo)
  - Major → "Mayor" (impacto transformador)
- **Default:** "Moderado"

#### 6.8 Target Entities (Avanzado)
- **Label:** "Entidades afectadas"
- **Tipo:** Multi-select dinámico
- **Opciones:** Presidente, Congreso, Banco Central, etc.
- **Default:** Vacío (afecta a todos)

#### 6.9 Affected Segments (Avanzado)
- **Label:** "Segmentos demográficos afectados"
- **Tipo:** Multi-select
- **Opciones:** Por edad, ingreso, región, educación
- **Default:** Vacío (afecta a todos)

---

## 7. Validaciones UX

### 7.1 Campos Obligatorios
- Nombre
- Categoría

### 7.2 Rangos
| Campo | Mín | Máx | Mensaje de error |
|-------|-----|-----|------------------|
| Sentimiento | -1 | 1 | "El sentimiento debe estar entre -1 y 1" |
| Intensidad | 0 | 1 | "La intensidad debe estar entre 0 y 1" |
| Salience | 0 | 1 | "La visibilidad debe estar entre 0 y 1" |

### 7.3 Errores Comunes y Mensajes

| Situación | Mensaje |
|-----------|---------|
| Nombre duplicado | "Ya existe un escenario con este nombre" |
| Escenario sin activar | "Activa el escenario antes de usarlo en una simulación" |
| Modo combinado sin entender | "Estás combinando eventos reales con un escenario. Asegúrate de entender que los resultados reflejan ambos factores." |
| Sin escenarios creados | "Crea tu primer escenario para comenzar a simular" |

### 7.4 Advertencias

| Situación | Mensaje |
|-----------|---------|
| Severidad Major + Sentimiento extremo | "Estás configurando un evento de alto impacto. Verifica que los parámetros sean los esperados." |
| Modo combinado seleccionado | "Modo avanzado: estás combinando coyuntura real con escenario hipotético." |

---

## 8. Visualización de Resultados

### 8.1 Vista Comparativa (3 columnas)

```
┌─────────────────────────────────────────────────────────────────┐
│              COMPARACIÓN: BASELINE vs ESCENARIO                 │
├─────────────────┬─────────────────┬─────────────────────────────┤
│    BASELINE     │    ESCENARIO    │          DELTA              │
├─────────────────┼─────────────────┼─────────────────────────────┤
│                 │                 │                             │
│  APROBACIÓN     │  APROBACIÓN     │  APROBACIÓN                 │
│     42%         │     35%         │     -7% 🔴                  │
│  ████████░░     │  ██████░░░░     │  ↓ Significativo            │
│                 │                 │                             │
│  DESAPROBACIÓN  │  DESAPROBACIÓN  │  DESAPROBACIÓN              │
│     38%         │     47%         │     +9% 🔴                  │
│  ███████░░░     │  █████████░     │  ↑ Significativo            │
│                 │                 │                             │
│  NS/NR          │  NS/NR          │  NS/NR                      │
│     20%         │     18%         │     -2% 🟡                  │
│  ████░░░░░░     │  ███░░░░░░░     │  → Sin cambio               │
│                 │                 │                             │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

### 8.2 Indicadores Clave

| Indicador | Descripción | Visualización |
|-----------|-------------|---------------|
| Approval | Tasa de aprobación | Barra de progreso + % |
| Direction | Dirección de expectativas | Flecha ↑↓ + valor |
| Optimism | Nivel de optimismo | Gauge |
| Economy | Expectativa económica | Barra comparativa |

### 8.3 Segmentos Afectados

Tabla con:
- Segmento (ej: "Mujeres 18-35", "RM", "C1-C2")
- Baseline
- Escenario
- Delta
- Significancia estadística

### 8.4 Mapa de Calor

Mapa de Chile con:
- Colores por intensidad de cambio
- Tooltip con valores específicos
- Leyenda de rangos

---

## 9. Riesgos UX

### 9.1 Confusión entre eventos reales y escenarios
**Riesgo:** El usuario no entiende la diferencia entre `useEvents` y `scenarioEventId`

**Mitigación:**
- Nombres claros: "Coyuntura real" vs "Escenario hipotético"
- Descripciones explicativas
- Modo combinado claramente marcado como "Avanzado"
- Visualización separada de qué eventos reales están activos

### 9.2 Sobrecarga de opciones
**Riesgo:** Demasiados parámetros abruman al usuario

**Mitigación:**
- Campos avanzados colapsados por defecto
- Valores por defecto razonables
- Tooltips explicativos
- Ejemplos pre-cargados

### 9.3 Interpretación errónea de resultados
**Riesgo:** El usuario confunde correlación con causalidad

**Mitigación:**
- Disclaimer: "Estos resultados son simulaciones basadas en modelos estadísticos"
- No mostrar "predicciones" sino "escenarios"
- Contexto de incertidumbre

### 9.4 Expectativa de precisión
**Riesgo:** El usuario espera predicciones exactas

**Mitigación:**
- Lenguaje cauteloso: "simulación", "escenario", "proyección"
- Rangos de confianza visibles
- Recordatorio de que son modelos, no certezas

---

## 10. Recomendaciones para MVP

### 10.1 Qué entra en la primera versión

**Must have:**
- [ ] Lista de escenarios
- [ ] Crear escenario básico (nombre, descripción, categoría, métricas)
- [ ] Activar/desactivar escenario
- [ ] Ejecutar simulación con modo seleccionado
- [ ] Vista comparativa básica (baseline vs escenario)

**Should have:**
- [ ] Duplicar escenario
- [ ] Archivar escenario
- [ ] Preview de impacto antes de ejecutar
- [ ] Exportar resultados (CSV/PNG)

### 10.2 Qué se deja para versiones futuras

**Could have (v1.1):**
- [ ] Carpetas/etiquetas para organizar escenarios
- [ ] Comparación múltiple (más de 2 escenarios)
- [ ] Análisis de sensibilidad
- [ ] Escenarios pre-definidos (templates)

**Won't have (v2.0):**
- [ ] Compartir escenarios entre usuarios
- [ ] Colaboración en tiempo real
- [ ] IA asistente para crear escenarios
- [ ] Escenarios temporales (timeline)

---

## 11. Ejemplos de Escenarios Pre-cargados

Para ayudar a los usuarios a entender el sistema, incluir ejemplos:

### Ejemplo 1: "Crisis Económica Moderada"
- Categoría: Economy
- Sentiment: -0.6
- Intensity: 0.7
- Salience: 0.8
- Severity: major

### Ejemplo 2: "Escándalo de Corrupción Menor"
- Categoría: Government
- Sentiment: -0.4
- Intensity: 0.5
- Salience: 0.6
- Severity: moderate

### Ejemplo 3: "Anuncio de Reforma Popular"
- Categoría: Government
- Sentiment: 0.5
- Intensity: 0.6
- Salience: 0.7
- Severity: major

---

## 12. Métricas de Éxito

### 12.1 Métricas de Adopción
- % de usuarios que crean al menos 1 escenario
- Promedio de escenarios creados por usuario
- Frecuencia de uso del feature

### 12.2 Métricas de Usabilidad
- Tiempo promedio para crear escenario (objetivo: < 2 min)
- Tasa de completitud del formulario
- Tasa de errores de validación

### 12.3 Métricas de Valor
- % de usuarios que ejecutan simulaciones con escenarios
- Frecuencia de comparación baseline vs escenario
- Feedback cualitativo de usuarios

---

## 13. Checklist de Implementación

### Fase 1: MVP Core
- [ ] ScenarioListPage - Lista de escenarios
- [ ] ScenarioBuilderPage - Formulario básico
- [ ] ScenarioExecutionPage - Selector de modo
- [ ] ScenarioResultsPage - Comparación básica
- [ ] Integración con scenarioEventStore

### Fase 2: Mejoras UX
- [ ] Validaciones en tiempo real
- [ ] Tooltips explicativos
- [ ] Ejemplos pre-cargados
- [ ] Exportar resultados

### Fase 3: Avanzado
- [ ] Segmentación avanzada
- [ ] Análisis de sensibilidad
- [ ] Templates de escenarios

---

**Documento creado:** 29 de marzo de 2026  
**Autor:** Cline (asistente de desarrollo)  
**Próximo paso:** Implementar `ScenarioBuilderPage.tsx`
