# Plan de Validación del Scenario Builder MVP

## Objetivo
Validar que el Scenario Builder MVP funciona correctamente en condiciones reales de uso antes de invertir en features adicionales.

---

## Escenarios de Prueba Propuestos

### Escenario 1: Subsidio al Transporte
**Categoría:** Economía  
**Sentimiento:** +0.3 (positivo)  
**Intensidad:** 0.6  
**Visibilidad:** 0.8  
**Severidad:** Moderada

**Hipótesis:** Aumento de aprobación en economía personal, ligero aumento en aprobación general.

---

### Escenario 2: Crisis Económica
**Categoría:** Economía  
**Sentimiento:** -0.7 (muy negativo)  
**Intensidad:** 0.9  
**Visibilidad:** 0.9  
**Severidad:** Mayor

**Hipótesis:** Caída significativa en aprobación, optimismo y economía personal.

---

### Escenario 3: Endurecimiento Migratorio
**Categoría:** Gobierno  
**Sentimiento:** -0.4 (negativo)  
**Intensidad:** 0.7  
**Visibilidad:** 0.6  
**Severidad:** Moderada

**Hipótesis:** Impacto mixto en aprobación, posible polarización en dirección del país.

---

## Configuración de Simulación

| Parámetro | Valor |
|-----------|-------|
| Tamaño de muestra | 100 agentes |
| Modo | Comparación completa (baseline vs escenario) |
| Motor | CADEM v1.1 |
| Persistencia | false |

---

## Checklist de Validación

### 1. Funcionalidad Técnica
- [ ] El formulario guarda el escenario en Supabase
- [ ] La simulación ejecuta sin errores
- [ ] Los resultados se muestran en la tabla comparativa
- [ ] Los deltas se calculan correctamente
- [ ] El tiempo de ejecución es < 30 segundos

### 2. Consistencia de Datos
- [ ] Los resultados de la UI coinciden con ejecución por script
- [ ] Las distribuciones suman ~100%
- [ ] Los cambios (deltas) tienen dirección lógica
- [ ] No hay valores NaN o undefined visibles

### 3. UX/Usabilidad
- [ ] El usuario entiende la diferencia entre baseline y escenario
- [ ] Los sliders son intuitivos
- [ ] La tabla de resultados es legible
- [ ] El flujo de 4 pasos es claro
- [ ] No hay confusiones en la navegación

### 4. Performance
- [ ] La UI responde sin lag
- [ ] La simulación no bloquea el navegador
- [ ] Los resultados cargan sin delay perceptible

---

## Documento de Resultados

Después de ejecutar los 3 escenarios, crear:

**`docs/cadem-v3/SCENARIO_BUILDER_VALIDATION_RUN_001.md`**

Con las siguientes secciones por escenario:

```markdown
## Escenario X: [Nombre]

### Configuración
- Parámetros usados
- Timestamp de ejecución

### Resultados Baseline
| Pregunta | Distribución | Confianza |

### Resultados Escenario
| Pregunta | Distribución | Confianza |

### Deltas
| Pregunta | Cambio | Dirección |

### Observaciones
- ¿Coincidió con hipótesis?
- ¿Algún comportamiento inesperado?
- ¿Problemas de UX?

### Screenshots
[Adjuntar si aplica]
```

---

## Criterios de Aprobación del MVP

### Must Have (Bloqueante)
- [ ] Las 3 simulaciones completan sin errores
- [ ] Los resultados son consistentes con ejecución por script
- [ ] El tiempo de ejecución es aceptable (< 60s)

### Should Have (Importante)
- [ ] Los deltas tienen dirección lógica según el escenario
- [ ] La UI es usable sin explicación técnica
- [ ] No hay bugs visibles

### Nice to Have (Mejora)
- [ ] Los resultados son intuitivos para usuarios no técnicos
- [ ] El flujo es "delicioso" de usar
- [ ] Performance óptima

---

## Próximos Pasos Post-Validación

### Si el MVP pasa:
1. Lista de escenarios guardados
2. Duplicar/editar escenarios
3. Comparar múltiples escenarios
4. Exportar resultados
5. IA asistente para parametrización

### Si el MVP falla:
1. Documentar issues encontrados
2. Priorizar fixes críticos
3. Re-ejecutar validación
4. Decidir si continuar o pivotar

---

## Notas

- **Fecha de ejecución propuesta:** [Pendiente]
- **Responsable de validación:** [Pendiente]
- **Entorno:** Producción o staging con datos reales

---

## Historial

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2026-03-29 | Creación inicial del plan |
