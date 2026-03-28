# Kickoff CADEM v1.2 - Sistema de Eventos Semanales

**Fecha:** 2026-03-28  
**Versión anterior:** CADEM v1.1 (rollout aprobado)  
**Tag de cierre v1.1:** `cadem-v1.1-rollout-approved`  
**Estado:** En desarrollo  
**Rama:** main (con disciplina de fases)

---

## 1. Objetivo de v1.2

Implementar un sistema de eventos semanales que permita al motor CADEM reaccionar a la coyuntura política, económica y social, introduciendo variabilidad longitudinal realista en las opiniones de los agentes sintéticos.

### Meta principal
Que eventos reales (o simulados) cambien de forma controlada:
- `government_approval` (aprobación presidencial)
- `country_direction` (dirección del país)
- `country_optimism` (optimismo país)
- `economy_national` (economía país)
- `economy_personal` (economía personal)
- `security_perception` (percepción de seguridad)
- `institutional_trust` (confianza institucional)

---

## 2. Qué problema deja abierto v1.1

### Limitación identificada
El motor v1.1 es **transversalmente estable** pero **longitudinalmente estático**:

| Aspecto | Estado v1.1 | Problema |
|---------|-------------|----------|
| Respuestas individuales | ✅ Coherentes | Bien calibrado |
| Distribuciones agregadas | ✅ Estables | Coinciden con benchmarks |
| Evolución temporal | ❌ Estática | No reacciona a coyuntura |
| Sensibilidad a eventos | ❌ Ausente | Mismo resultado semana tras semana |

### Consecuencia
Sin eventos, el panel de agentes no refleja cómo la opinión pública real **cambia** ante hechos relevantes (alza de combustibles, crisis de seguridad, anuncios económicos, etc.).

---

## 3. Por qué ahora toca eventos y no más calibración base

### Calibración base: CERRADA
- v1.1 ya alcanzó calibración transversal aceptable
- Las 3 preguntas principales responden coherentemente
- Los agentes tienen perfiles demográficos y opiniones base realistas
- Más calibración base tiene rendimientos decrecientes

### Siguiente frontera: DINÁMICA
- El realismo longitudinal requiere **exposición a información**
- Los eventos son el mecanismo natural de cambio de opinión
- Sin eventos, el panel es una "fotografía estática" repetida

### Decisión estratégica
**Congelar v1.1** (solo bugfixes críticos) y **abrir v1.2** (eventos + dinámica).

---

## 4. Componentes a construir

### 4.1 Weekly Events
**Archivo:** `src/app/events/types.ts`  
Definición de tipos para eventos semanales con:
- Categorías (government, economy, security, etc.)
- Severidad e intensidad
- Sentimiento (-1 a 1)
- Segmentos afectados

### 4.2 Event Store
**Archivo:** `src/app/events/eventStore.ts`  
Repositorio para:
- Crear eventos semanales
- Consultar eventos por período
- Asociar eventos a surveys

### 4.3 Event Impact
**Archivo:** `src/app/events/eventImpact.ts`  
Lógica de cálculo:
- Exposición del agente al evento (según perfil de información)
- Magnitud del cambio de opinión
- Aplicación del impacto a topic states

### 4.4 Opinion Updater
**Archivo:** `src/app/opinionEngine/opinionUpdater.ts`  
Orquestador que:
- Recibe agente, topic states y lista de eventos
- Calcula exposición y shift
- Aplica impacto
- Devuelve topic states actualizados + log de cambios

### 4.5 Test de Sensibilidad
**Archivo:** `scripts/calibration/testEventSensitivity.ts`  
Validación de que:
- Eventos económicos negativos bajan aprobación
- Eventos de seguridad afectan percepción de seguridad
- Los cambios son razonables (no caóticos)

---

## 5. Topics sensibles a eventos

### Mapeo de categorías a topics

| Categoría de Evento | Topics Afectados |
|---------------------|------------------|
| `government` | government_approval, country_direction |
| `economy` | economy_national, economy_personal, country_optimism, country_direction |
| `security` | security_perception, country_direction |
| `institutions` | institutional_trust |
| `migration` | country_direction, security_perception |
| `international` | country_optimism, economy_national |
| `social` | country_direction, institutional_trust |

### Reglas de impacto
1. **No todos los eventos afectan todos los topics**
2. **El impacto depende de la exposición** del agente
3. **Los cambios son acumulativos pero atenuados** (no explosivos)
4. **Hay límites de rango** (los topic states no salen de [0,1])

---

## 6. Criterios de éxito

### Funcionales
- [ ] Eventos se pueden crear y almacenar
- [ ] Eventos afectan topic states de agentes expuestos
- [ ] El impacto es proporcional a intensidad × exposición
- [ ] Los cambios son trazables (log por evento)

### De calidad
- [ ] Evento económico negativo → baja aprobación 5-15%
- [ ] Evento de seguridad positivo → sube percepción de seguridad
- [ ] Sin eventos → estabilidad (cambio < 2%)
- [ ] Con eventos contradictorios → efecto neto razonable

### Operativos
- [ ] 200 agentes procesados en < 30 segundos
- [ ] Sin errores de persistencia
- [ ] Sin duplicación de eventos
- [ ] Rollback posible si evento es incorrecto

---

## 7. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Cambios demasiado bruscos | Media | Alto | Límites de rango + atenuación |
| Eventos se acumulan sin control | Baja | Alto | Semana como unidad de tiempo |
| Performance con muchos eventos | Media | Medio | Batch processing + caching |
| Inconsistencia con v1.1 | Baja | Alto | No modificar motor de respuesta transversal |
| Complejidad de exposición | Media | Medio | Perfiles de información simplificados |

---

## 8. Plan de implementación por etapas

### Etapa 1: Fundamentos (Semana 1)
- [ ] Definir tipos de eventos (`types.ts`)
- [ ] Crear repositorio de eventos (`eventStore.ts`)
- [ ] Script de seed con eventos de ejemplo

### Etapa 2: Lógica de impacto (Semana 1-2)
- [ ] Implementar cálculo de exposición
- [ ] Implementar cálculo de shift
- [ ] Implementar aplicación de impacto
- [ ] Tests unitarios

### Etapa 3: Orquestación (Semana 2)
- [ ] Crear `opinionUpdater.ts`
- [ ] Integrar con motor de encuestas
- [ ] Agregar parámetro `weekKey` a surveys

### Etapa 4: Validación (Semana 2-3)
- [ ] Script `testEventSensitivity.ts`
- [ ] Correr encuestas antes/después de eventos
- [ ] Documentar resultados

### Etapa 5: Hardening (Semana 3)
- [ ] Manejo de errores
- [ ] Rollback de eventos
- [ ] Monitoreo
- [ ] Documentación de uso

---

## 9. Política de cambios en main

### v1.1 (congelada)
Solo se permite:
- Bugfixes críticos
- Monitoreo y logging
- Hardening de seguridad

### v1.2 (activa)
Todo lo nuevo:
- Eventos semanales
- Sensibilidad coyuntural
- Nuevas capacidades dinámicas

### Convención de commits
```
[v1.2-events] feat: agregar tipo WeeklyEvent
[v1.2-events] feat: implementar calculateExposure
[v1.2-events] test: validar sensibilidad a eventos económicos
[v1.1-fix] fix: corregir bug en cademAdapter
```

---

## 10. Referencias

- `docs/cadem-v3/ROLLOUT_FASE_3_INTERNAL.md` - Resultados v1.1
- `docs/cadem-v3/PRODUCTION_CONTROLLED_ENABLEMENT.md` - Uso en producción
- `src/app/opinionEngine/types.ts` - Topic states existentes
- `src/app/events/types.ts` - Tipos de eventos (a crear)

---

## 11. Próximo paso inmediato

Crear el archivo `src/app/events/types.ts` con la definición completa del modelo de eventos semanales.

---

**Documento preparado por:** Sistema CADEM  
**Fecha de kickoff:** 2026-03-28  
**Próxima revisión:** 2026-04-04 (1 semana)
