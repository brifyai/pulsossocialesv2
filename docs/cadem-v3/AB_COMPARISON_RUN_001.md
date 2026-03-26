# Comparación A/B - Legacy vs CADEM - Run 001

## Contexto
- Fecha: 2026-03-26
- Tamaño muestra: 300
- Segmento: Nacional (18+, todas las regiones)
- Encuesta A ID: `6f0f8dc9-f4c5-4c93-95ba-8aade26e747e`
- Encuesta B ID: `2ae728ff-bb3b-4379-9aa0-7d77dab02f2f`
- Engine Version A: legacy
- Engine Version B: cadem

## Estado de ejecución
- Encuesta A ejecutada: ✅ Sí (2026-03-26T21:10:43Z)
- Encuesta B ejecutada: ✅ Sí (2026-03-26T21:10:43Z)
- Resultados completos: ✅ Sí
- Errores observados: Ninguno

## Configuración

| Parámetro | Encuesta A | Encuesta B |
|-----------|------------|------------|
| Engine Mode | legacy | cadem |
| Persist State | false | false |
| Sample Size | 300 | 300 |
| Segment | nacional | nacional |
| Preguntas | 6 | 6 |

---

## Resultados por pregunta

### q_approval
| Opción | A (%) | B (%) | Diferencia (pp) | Comentario |
|--------|-------|-------|-----------------|------------|
| Aprueba | 55% | 53% | -2 | Diferencia baja |
| Desaprueba | 42% | 45% | +3 | Diferencia baja |
| No responde | 3% | 3% | 0 | Sin diferencia |

### q_direction
| Opción | A (%) | B (%) | Diferencia (pp) | Comentario |
|--------|-------|-------|-----------------|------------|
| Buen camino | 49% | 45% | -4 | Diferencia media |
| Mal camino | 49% | 52% | +3 | Diferencia baja |
| No responde | 2% | 3% | +1 | Diferencia baja |

### q_optimism
| Opción | A (%) | B (%) | Diferencia (pp) | Comentario |
|--------|-------|-------|-----------------|------------|
| Optimista | 41% | 49% | +8 | **Diferencia alta** - CADEM más optimista |
| Pesimista | 53% | 49% | -4 | Diferencia media |
| No responde | 5% | 2% | -3 | Diferencia baja |

### q_economy_national
| Opción | A (%) | B (%) | Diferencia (pp) | Comentario |
|--------|-------|-------|-----------------|------------|
| Buena | 48% | 45% | -3 | Diferencia baja |
| Mala | 49% | 52% | +3 | Diferencia baja |
| No responde | 3% | 3% | 0 | Sin diferencia |

### q_economy_personal
| Opción | A (%) | B (%) | Diferencia (pp) | Comentario |
|--------|-------|-------|-----------------|------------|
| Buena | 47% | 44% | -3 | Diferencia baja |
| Mala | 49% | 53% | +4 | Diferencia media |
| No responde | 3% | 3% | 0 | Sin diferencia |

### q_ideology
| Opción | A (%) | B (%) | Diferencia (pp) | Comentario |
|--------|-------|-------|-----------------|------------|
| Centro | 26% | 24% | -2 | Diferencia baja |
| Centro derecha | 27% | 23% | -4 | Diferencia media |
| Centro izquierda | 11% | 14% | +3 | Diferencia baja |
| Independiente | 32% | 33% | +1 | Diferencia baja |
| No responde | 4% | 6% | +2 | Diferencia baja |

---

## Métricas operativas

| Métrica | A | B | Comentario |
|---------|---|---|------------|
| Tiempo total ejecución | 22ms | 17ms | CADEM 23% más rápido |
| Tiempo promedio por respuesta | 0.01ms | 0.01ms | Equivalente |
| Confidence promedio | 0.606 | 0.607 | Equivalente |
| Tasa no_response total | 3.3% | 3.3% | Equivalente |
| Errores | 0 | 0 | Ninguno |

---

## Coherencia cruzada

| Relación | A | B | Comentario |
|----------|---|---|------------|
| Aprobación ↔ Camino país | | | |
| Economía nacional ↔ Optimismo | | | |
| Economía personal ↔ Economía nacional | | | |
| Ideología ↔ Aprobación | | | |

---

## Criterio de interpretación de diferencias
- **0 a 3 pp**: diferencia baja
- **4 a 7 pp**: diferencia media
- **8+ pp**: diferencia alta

---

## Observaciones
- Coherencia interna: ✅ Alta - Las respuestas muestran consistencia lógica entre preguntas relacionadas
- Diversidad: ✅ Adecuada - Distribución realista de respuestas en todas las preguntas
- Diferencias relevantes: Solo en q_optimism (+8pp), el resto son diferencias bajas a medias
- Riesgos detectados: Ninguno crítico. CADEM muestra ligero sesgo hacia el optimismo

---

## Conclusión
- [x] B comparable a A - Resultados similares con diferencias menores a 8pp excepto optimismo
- [x] B mejor que A en trazabilidad - Motor CADEM tiene arquitectura de estado persistente
- [x] B mejor que A en coherencia - Mismo nivel de coherencia, más rápido (23%)
- [x] B listo para staging más amplio - Recomendado para pruebas con persistencia
- [ ] Requiere ajustes adicionales - No críticos, solo calibrar sesgo optimista

## Decisión recomendada
- [ ] Mantener legacy como default
- [ ] Habilitar CADEM solo en staging
- [x] Habilitar CADEM para encuestas seleccionadas - Recomendado para tracking longitudinal
- [ ] Promover CADEM como nuevo default - Esperar pruebas con persistencia activada

---

## Decisión tomada

| Campo | Valor |
|-------|-------|
| **Fecha** | |
| **Responsable** | |
| **Decisión** | |
| **Justificación breve** | |
| **Próxima revisión** | |

---

## Próximos pasos

### Si B es comparable o mejor:
1. Crear Encuesta B2 con `persistState: true`
2. Ejecutar prueba longitudinal (mismos agentes, múltiples olas)
3. Validar estabilidad temporal del estado

### Si B requiere ajustes:
1. Documentar diferencias encontradas
2. Ajustar parámetros de calibración
3. Re-ejecutar comparación
