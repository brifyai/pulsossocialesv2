# Event Impact Expectations by Topic

**Fecha:** 29 de marzo de 2026  
**Versión:** CADEM v1.2  
**Propósito:** Definir expectativas de comportamiento antes de ajustar `eventImpact.ts`

---

## Resumen Ejecutivo

Este documento establece cómo deberían reaccionar los topics del motor de opinión ante diferentes tipos de eventos. Sirve como referencia para calibrar el sistema de impacto de eventos.

**Principio fundamental:** Los eventos negativos deberían generar deterioro en los topics relacionados, no mejoras.

---

## Matriz de Impacto por Categoría de Evento

### 1. Eventos de Categoría: `economy`

| Topic | Dirección (positivo) | Dirección (negativo) | Magnitud | Prioridad | Notas |
|-------|---------------------|---------------------|----------|-----------|-------|
| `economy_national` | ↑ increase | ↓ **decrease** | **strong** | primary | Impacto directo y fuerte |
| `economy_personal` | ↑ increase | ↓ **decrease** | moderate | secondary | Impacto indirecto, menor que nacional |
| `country_optimism` | ↑ increase | ↓ **decrease** | **strong** | primary | Crisis económica → pesimismo |
| `country_direction` | ↑ increase | ↓ **decrease** | moderate | primary | Mala economía → mal camino |
| `government_approval` | ↑ increase | ↓ **decrease** | moderate | secondary | Efecto indirecto vía economía |

**Nota clave:** Un evento económico negativo fuerte (sentiment -0.75, intensity 0.9) debería producir:
- `economy_national`: -10% a -15%
- `economy_personal`: -5% a -8%
- `country_optimism`: -8% a -12%
- `country_direction`: -5% a -10%
- `government_approval`: -3% a -6%

---

### 2. Eventos de Categoría: `government`

| Topic | Dirección (positivo) | Dirección (negativo) | Magnitud | Prioridad | Notas |
|-------|---------------------|---------------------|----------|-----------|-------|
| `government_approval` | ↑ increase | ↓ **decrease** | **strong** | primary | Impacto directo |
| `country_direction` | ↑ increase | ↓ **decrease** | **strong** | primary | Gobierno mal → mal camino |
| `country_optimism` | ↑ increase | ↓ **decrease** | moderate | secondary | Efecto indirecto |
| `economy_national` | ↑ increase | ↓ **decrease** | weak | tertiary | Efecto muy indirecto |
| `economy_personal` | neutral | neutral | none | - | Sin impacto directo |

**Nota clave:** Eventos de gobierno afectan principalmente aprobación y dirección, con efecto cascada moderado en optimismo.

---

### 3. Eventos de Categoría: `security`

| Topic | Dirección (positivo) | Dirección (negativo) | Magnitud | Prioridad | Notas |
|-------|---------------------|---------------------|----------|-----------|-------|
| `security_perception` | ↑ increase | ↓ **decrease** | **strong** | primary | Impacto directo |
| `country_direction` | ↑ increase | ↓ **decrease** | moderate | secondary | Inseguridad → mal camino |
| `government_approval` | ↑ increase | ↓ **decrease** | moderate | secondary | Responsabilidad del gobierno |
| `country_optimism` | ↑ increase | ↓ **decrease** | weak | tertiary | Efecto indirecto |

---

### 4. Eventos de Categoría: `migration`

| Topic | Dirección (positivo) | Dirección (negativo) | Magnitud | Prioridad | Notas |
|-------|---------------------|---------------------|----------|-----------|-------|
| `government_approval` | ↑ increase | ↓ **decrease** | **strong** | primary | Tema político polarizado |
| `country_direction` | ↑ increase | ↓ **decrease** | moderate | secondary | Percepción de control |
| `security_perception` | neutral | ↓ **decrease** | weak | tertiary | Asociación con seguridad |
| `economy_national` | neutral | ↓ **decrease** | weak | tertiary | Impacto económico percibido |

---

### 5. Eventos de Categoría: `institutions`

| Topic | Dirección (positivo) | Dirección (negativo) | Magnitud | Prioridad | Notas |
|-------|---------------------|---------------------|----------|-----------|-------|
| `institutional_trust` | ↑ increase | ↓ **decrease** | **strong** | primary | Impacto directo |
| `government_approval` | ↑ increase | ↓ **decrease** | moderate | secondary | Correlación con instituciones |
| `country_direction` | ↑ increase | ↓ **decrease** | moderate | secondary | Confianza institucional → dirección |

---

### 6. Eventos de Categoría: `international`

| Topic | Dirección (positivo) | Dirección (negativo) | Magnitud | Prioridad | Notas |
|-------|---------------------|---------------------|----------|-----------|-------|
| `country_optimism` | ↑ increase | ↓ **decrease** | moderate | primary | Relaciones internacionales |
| `country_direction` | ↑ increase | ↓ **decrease** | weak | secondary | Efecto indirecto |
| `government_approval` | ↑ increase | ↓ **decrease** | weak | secondary | Capacidad diplomática |

---

### 7. Eventos de Categoría: `social`

| Topic | Dirección (positivo) | Dirección (negativo) | Magnitud | Prioridad | Notas |
|-------|---------------------|---------------------|----------|-----------|-------|
| `country_direction` | ↑ increase | ↓ **decrease** | moderate | primary | Cohesión social |
| `government_approval` | ↑ increase | ↓ **decrease** | moderate | secondary | Respuesta a demandas |
| `country_optimism` | ↑ increase | ↓ **decrease** | weak | secondary | Estado del país |

---

## Caso Específico: Escenarios Económicos Negativos

### Por qué `economy_national` debería caer más que `economy_personal`

**Razón 1: Proximidad cognitiva**
- Los agentes perciben la economía nacional de forma más abstracta y mediática
- Una crisis económica se comunica masivamente como problema "del país"
- La economía personal es más concreta y resistente a shocks de opinión

**Razón 2: Asimetría de información**
- Los agentes tienen información directa de su situación personal
- La situación nacional se evalúa por señales externas (noticias, comentarios)
- Eventos negativos afectan más las evaluaciones basadas en señales externas

**Razón 3: Efecto de medios**
- Crisis económica → cobertura mediática negativa → percepción nacional deteriorada
- El impacto en economía personal requiere experiencia directa de deterioro

**Expectativa de magnitud:**
- `economy_national`: -10% a -15% (fuerte)
- `economy_personal`: -5% a -8% (moderado)

---

### Por qué `country_direction` NO debería mejorar en un escenario económico negativo

**Problema observado:** En la validación Run 002, `q_direction` mejoró +14% en el escenario "Crisis Económica".

**Esto es incorrecto porque:**

1. **Coherencia semántica:**
   - Una crisis económica indica que el país va por el **mal camino**
   - No hay mecanismo racional por el cual una crisis mejore la percepción de dirección

2. **Experiencia empírica:**
   - Datos reales muestran que crisis económicas deterioran la percepción de dirección
   - Ejemplo: Chile 2019-2020, crisis social + económica → caída fuerte en dirección

3. **Mecanismo causal:**
   - Crisis económica → peor situación actual → peor expectativa futura → mal camino
   - No existe un mecanismo de compensación que invierta esta relación

**Expectativa correcta:**
- Crisis económica (sentiment -0.75, intensity 0.9) → `country_direction` debería **caer** -5% a -10%

---

## Tabla de Magnitudes Esperadas por Intensidad

Para eventos con `sentiment = -0.75` (muy negativo):

| Intensity | Magnitud Esperada | Ejemplo de Impacto en topic primary |
|-----------|-------------------|-------------------------------------|
| 0.3 | weak (-2% a -4%) | Evento menor |
| 0.6 | moderate (-5% a -8%) | Evento significativo |
| 0.9 | **strong** (-10% a -15%) | Crisis mayor |

**Nota:** La intensidad debería correlacionarse positivamente con la magnitud del cambio.

---

## Checklist de Validación

Antes de considerar el tuning completo, verificar:

- [ ] Evento económico negativo fuerte reduce `economy_national` >10%
- [ ] Evento económico negativo fuerte reduce `country_direction` >5%
- [ ] Evento de gobierno negativo reduce `government_approval` >8%
- [ ] Intensidad 0.9 produce cambios >2x que intensidad 0.3
- [ ] Ningún evento negativo produce mejoras en topics relevantes
- [ ] `no_response` se mantiene <10% en todos los escenarios

---

## Referencias

- Documento de validación: `SCENARIO_BUILDER_VALIDATION_RUN_002.md`
- Plan de tuning: `EVENT_IMPACT_TUNING_001.md`
- Implementación actual: `src/app/events/eventImpact.ts`

---

**Documento creado:** 29/03/2026  
**Próximo paso:** Revisar `eventImpact.ts` y comparar con estas expectativas
