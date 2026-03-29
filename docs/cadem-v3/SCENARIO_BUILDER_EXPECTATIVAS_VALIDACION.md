# Expectativas de Validación - Scenario Builder MVP

**Fecha:** 29 de marzo de 2026  
**Propósito:** Definir qué resultados esperamos en cada escenario para evaluar si el sistema funciona correctamente

---

## Orden de Ejecución Recomendado

1. **Subsidio al Transporte** (más fácil de interpretar)
2. **Crisis Económica** (mejor para probar magnitud negativa)
3. **Endurecimiento Migratorio** (más complejo, prueba polarización)

---

## Escenario 1: Subsidio al Transporte

### Configuración
```yaml
Categoría: economy
Sentimiento: +0.3 (positivo)
Intensidad: 0.6
Visibilidad: 0.8
Severidad: moderate
```

### Expectativas de Resultados

#### Aprobación (q_approval)
- **Baseline:** ~35-45% (valor típico actual)
- **Escenario:** +3 a +8 puntos
- **Razonable:** Entre +2 y +12 puntos
- **Raro:** Más de +15 o negativo

#### Dirección del País (q_direction)
- **Baseline:** ~40-50% creen que va por buen camino
- **Escenario:** +2 a +6 puntos
- **Razonable:** Entre 0 y +10 puntos
- **Raro:** Más de +15 o caída significativa

#### Optimismo (q_optimism)
- **Baseline:** ~45-55%
- **Escenario:** +5 a +10 puntos
- **Razonable:** Entre +3 y +15 puntos
- **Raro:** Negativo o más de +20

#### Economía Nacional (q_economy_national)
- **Baseline:** ~30-40% positiva
- **Escenario:** +2 a +5 puntos (efecto moderado)
- **Razonable:** Entre 0 y +8 puntos
- **Raro:** Más de +12 o negativo

#### Economía Personal (q_economy_personal)
- **Baseline:** ~40-50% positiva
- **Escenario:** +8 a +15 puntos (efecto más fuerte)
- **Razonable:** Entre +5 y +20 puntos
- **Raro:** Menos de +3 o negativo

### Señales de Éxito
- ✅ Economía personal mejora más que economía nacional
- ✅ Aprobación sube moderadamente
- ✅ Optimismo aumenta
- ✅ No hay caídas inexplicables en otras métricas

### Red Flags
- ❌ Economía personal no mejora o empeora
- ❌ Cambios mayores a 20 puntos en cualquier métrica
- ❌ Aprobación cae
- ❌ no_response aumenta significativamente

---

## Escenario 2: Crisis Económica

### Configuración
```yaml
Categoría: economy
Sentimiento: -0.7 (muy negativo)
Intensidad: 0.9
Visibilidad: 0.9
Severidad: major
```

### Expectativas de Resultados

#### Aprobación (q_approval)
- **Baseline:** ~35-45%
- **Escenario:** -10 a -20 puntos
- **Razonable:** Entre -5 y -25 puntos
- **Raro:** Menos de -30 o sube

#### Dirección del País (q_direction)
- **Baseline:** ~40-50%
- **Escenario:** -8 a -15 puntos
- **Razonable:** Entre -5 y -20 puntos
- **Raro:** Menos de -25 o sube

#### Optimismo (q_optimism)
- **Baseline:** ~45-55%
- **Escenario:** -15 a -25 puntos
- **Razonable:** Entre -10 y -30 puntos
- **Raro:** Menos de -35 o sube

#### Economía Nacional (q_economy_national)
- **Baseline:** ~30-40% positiva
- **Escenario:** -15 a -25 puntos
- **Razonable:** Entre -10 y -30 puntos
- **Raro:** Menos de -35 o mejora

#### Economía Personal (q_economy_personal)
- **Baseline:** ~40-50% positiva
- **Escenario:** -12 a -20 puntos
- **Razonable:** Entre -8 y -25 puntos
- **Raro:** Menos de -30 o mejora

### Señales de Éxito
- ✅ Todas las métricas caen (dirección correcta)
- ✅ Economía nacional cae más que aprobación
- ✅ Optimismo es de las más afectadas
- ✅ Magnitudes son significativas pero no extremas

### Red Flags
- ❌ Alguna métrica sube
- ❌ Caídas menores a 5 puntos (efecto muy débil)
- ❌ Caídas mayores a 40 puntos (efecto exagerado)
- ❌ no_response sube a más de 15%

---

## Escenario 3: Endurecimiento Migratorio

### Configuración
```yaml
Categoría: government
Sentimiento: -0.4 (negativo)
Intensidad: 0.7
Visibilidad: 0.6
Severidad: moderate
```

### Expectativas de Resultados

#### Aprobación (q_approval)
- **Baseline:** ~35-45%
- **Escenario:** -3 a -8 puntos
- **Razonable:** Entre -1 y -12 puntos
- **Raro:** Más de -15 o sube significativamente

#### Dirección del País (q_direction)
- **Baseline:** ~40-50%
- **Escenario:** -2 a -6 puntos (efecto moderado)
- **Razonable:** Entre 0 y -10 puntos
- **Raro:** Más de -15 o sube significativamente

#### Optimismo (q_optimism)
- **Baseline:** ~45-55%
- **Escenario:** -2 a -5 puntos (efecto leve)
- **Razonable:** Entre 0 y -8 puntos
- **Raro:** Más de -12 o sube

#### Economía Nacional (q_economy_national)
- **Baseline:** ~30-40% positiva
- **Escenario:** -1 a -3 puntos (efecto mínimo)
- **Razonable:** Entre -5 y +2 puntos
- **Raro:** Más de -8 o más de +5

#### Economía Personal (q_economy_personal)
- **Baseline:** ~40-50% positiva
- **Escenario:** 0 a -2 puntos (sin efecto o leve)
- **Razonable:** Entre -3 y +2 puntos
- **Raro:** Más de -5 o más de +5

### Señales de Éxito
- ✅ Aprobación cae moderadamente
- ✅ Dirección del país tiene efecto leve a moderado
- ✅ Métricas económicas casi no se mueven
- ✅ Optimismo tiene efecto menor que en crisis económica

### Red Flags
- ❌ Cambios mayores a 15 puntos en cualquier métrica
- ❌ Economía personal o nacional cambia significativamente
- ❌ Optimismo cae más que en crisis económica
- ❌ Resultados muy diferentes entre sí (alta varianza)

---

## Comparación Entre Escenarios

| Métrica | Subsidio Transporte | Crisis Económica | Endurecimiento Migratorio |
|---------|---------------------|------------------|---------------------------|
| Aprobación | +3 a +8 | -10 a -20 | -3 a -8 |
| Dirección País | +2 a +6 | -8 a -15 | -2 a -6 |
| Optimismo | +5 a +10 | -15 a -25 | -2 a -5 |
| Economía Nacional | +2 a +5 | -15 a -25 | -1 a -3 |
| Economía Personal | +8 a +15 | -12 a -20 | 0 a -2 |

### Patrones Esperados
1. **Crisis económica** debe tener los cambios más grandes (en magnitud absoluta)
2. **Subsidio** debe tener cambios positivos en economía personal > economía nacional
3. **Migratorio** debe tener efecto principalmente en aprobación, no en economía
4. **Optimismo** debe ser más volátil que aprobación en todos los escenarios

---

## Criterios de Éxito General

### Must Have (Bloqueante si falla)
- [ ] Dirección de cambio correcta en ≥4 de 5 métricas por escenario
- [ ] Crisis económica produce los mayores cambios (en valor absoluto)
- [ ] Subsidio produce cambios positivos
- [ ] Migratorio afecta más aprobación que economía

### Should Have (Importante)
- [ ] Magnitudes dentro de rangos razonables
- [ ] no_response se mantiene estable (< 10%)
- [ ] Distribuciones suman ~100%
- [ ] Cambios son consistentes con intensidad del evento

### Nice to Have (Deseable)
- [ ] Efectos heterogéneos por segmento (si se puede analizar)
- [ ] Correlación entre métricas relacionadas
- [ ] Resultados intuitivos para usuario no técnico

---

## Template para Documentar Resultados

```markdown
## Escenario X: [Nombre]

### Configuración Usada
- Sentimiento: X
- Intensidad: X
- Visibilidad: X
- Severidad: X
- Muestra: X agentes

### Resultados

| Métrica | Baseline | Escenario | Delta | Esperado | ¿OK? |
|---------|----------|-----------|-------|----------|------|
| Aprobación | X% | X% | ±X | ±X a ±X | ✅/❌ |
| Dirección | X% | X% | ±X | ±X a ±X | ✅/❌ |
| Optimismo | X% | X% | ±X | ±X a ±X | ✅/❌ |
| Eco. Nacional | X% | X% | ±X | ±X a ±X | ✅/❌ |
| Eco. Personal | X% | X% | ±X | ±X a ±X | ✅/❌ |

### Observaciones
- ¿Coincidió con expectativas?
- ¿Algo inesperado?
- ¿Problemas técnicos?

### Veredicto
- ✅ Pasa / ❌ Falla
```

---

## Notas Finales

### Qué NO esperamos
- Perfección matemática
- Predicciones exactas del futuro
- Consistencia 100% entre ejecuciones (hay aleatoriedad)

### Qué SÍ esperamos
- Dirección correcta de los cambios
- Magnitudes razonables
- Consistencia con la teoría
- Resultados explicables

---

**Documento creado:** 29 de marzo de 2026  
**Para usar con:** `SCENARIO_BUILDER_VALIDATION_RUN_001.md`
