# Comparación A/B - Legacy vs CADEM

## Contexto
- Fecha:
- Tamaño muestra: 300
- Segmento: Nacional (18+, todas las regiones)
- Encuesta A ID:
- Encuesta B ID:

## Configuración

| Parámetro | Encuesta A | Encuesta B |
|-----------|------------|------------|
| Engine Mode | legacy | cadem |
| Persist State | false | false |
| Sample Size | 300 | 300 |
| Segment | nacional | nacional |
| Preguntas | 6 | 6 |

## Resultados por pregunta

### q_approval
| Opción | A (%) | B (%) | Diferencia (pp) |
|--------|-------|-------|-----------------|
| Aprueba | | | |
| Desaprueba | | | |
| No responde | | | |

### q_direction
| Opción | A (%) | B (%) | Diferencia (pp) |
|--------|-------|-------|-----------------|
| Buen camino | | | |
| Mal camino | | | |
| No responde | | | |

### q_optimism
| Opción | A (%) | B (%) | Diferencia (pp) |
|--------|-------|-------|-----------------|
| Muy optimista | | | |
| Optimista | | | |
| Pesimista | | | |
| Muy pesimista | | | |
| No responde | | | |

### q_economy_national
| Opción | A (%) | B (%) | Diferencia (pp) |
|--------|-------|-------|-----------------|
| Muy buena | | | |
| Buena | | | |
| Mala | | | |
| Muy mala | | | |
| No responde | | | |

### q_economy_personal
| Opción | A (%) | B (%) | Diferencia (pp) |
|--------|-------|-------|-----------------|
| Muy buena | | | |
| Buena | | | |
| Mala | | | |
| Muy mala | | | |
| No responde | | | |

### q_ideology
| Opción | A (%) | B (%) | Diferencia (pp) |
|--------|-------|-------|-----------------|
| Derecha | | | |
| Centro derecha | | | |
| Centro | | | |
| Centro izquierda | | | |
| Izquierda | | | |
| Ninguna-Independiente | | | |
| No responde | | | |

## Métricas operativas

| Métrica | A | B |
|---------|---|---|
| Tiempo total ejecución | | |
| Tiempo promedio por respuesta | | |
| Confidence promedio | | |
| Tasa no_response total | | |
| Errores | | |

## Observaciones
- Coherencia interna:
- Diversidad:
- Diferencias relevantes:
- Riesgos detectados:

## Conclusión
- [ ] B comparable a A
- [ ] B mejor que A en trazabilidad
- [ ] B listo para staging más amplio
- [ ] Requiere ajustes adicionales

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
