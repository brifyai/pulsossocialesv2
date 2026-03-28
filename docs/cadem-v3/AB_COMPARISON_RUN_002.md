# A/B Comparison Run 002 - From Supabase

**Fecha:** 27-03-2026  
**Versión Motor CADEM:** v4.10 (calibrado)  
**Motor Legacy:** v1.0 (baseline)  
**Sample Size:** 1000 agentes  
**Persistencia:** false (estados independientes)  
**Sampleo:** Cuotas tipo Cadem

---

## Resumen Ejecutivo

Comparación directa entre motor legacy y motor CADEM calibrado v4.10 usando agentes reales de Supabase.

### Configuración

| Parámetro | Valor |
|-----------|-------|
| **Encuesta A** | Legacy Engine |
| **Encuesta B** | CADEM Engine v4.10 |
| **Agentes** | Reales desde Supabase |
| **Sampleo** | Cuotas tipo Cadem |
| **Persistencia** | false |

---

## Resultados por Pregunta

### Aprobación del gobierno (q_approval)

| Métrica | Legacy | CADEM v4.10 | Benchmark | Diff Legacy | Diff CADEM |
|---------|--------|-------------|-----------|-------------|------------|
| Approve | 48.6% | 53.4% | 57.0% | 4803.0% | 5283.0% |

**Distribución Legacy:** {"approve":48.6,"dont_know":26.1,"disapprove":25.3}  
**Distribución CADEM:** {"approve":53.4,"disapprove":30,"dont_know":16.6}

⚠️ **GANADOR: Legacy** (más cercano al benchmark por 480.0%)

---

### Dirección del país (q_direction)

| Métrica | Legacy | CADEM v4.10 | Benchmark | Diff Legacy | Diff CADEM |
|---------|--------|-------------|-----------|-------------|------------|
| Good Path | 45.6% | 50.2% | 49.0% | 4511.0% | 4971.0% |

**Distribución Legacy:** {"dont_know":21.7,"good_path":45.6,"wrong_path":32.7}  
**Distribución CADEM:** {"good_path":50.2,"wrong_path":33.6,"dont_know":16.2}

⚠️ **GANADOR: Legacy** (más cercano al benchmark por 460.0%)

---

### Optimismo personal (q_optimism)

| Métrica | Legacy | CADEM v4.10 | Benchmark | Diff Legacy | Diff CADEM |
|---------|--------|-------------|-----------|-------------|------------|
| Optimistic | 56.5% | 57.2% | 62.0% | 5588.0% | 5658.0% |

**Distribución Legacy:** {"pessimistic":43.5,"optimistic":56.5}  
**Distribución CADEM:** {"pessimistic":42.8,"optimistic":57.2}

⚠️ **GANADOR: Legacy** (más cercano al benchmark por 70.0%)

---

### Economía nacional (q_economy_national)

| Métrica | Legacy | CADEM v4.10 | Benchmark | Diff Legacy | Diff CADEM |
|---------|--------|-------------|-----------|-------------|------------|
| Positive | 34.8% | 36.1% | 36.0% | 3444.0% | 3574.0% |

**Distribución Legacy:** {"neutral":23,"negative":42.2,"positive":34.8}  
**Distribución CADEM:** {"positive":36.1,"negative":47.9,"neutral":16}

⚠️ **GANADOR: Legacy** (más cercano al benchmark por 130.0%)

---

### Economía personal (q_economy_personal)

| Métrica | Legacy | CADEM v4.10 | Benchmark | Diff Legacy | Diff CADEM |
|---------|--------|-------------|-----------|-------------|------------|
| Positive | 49.7% | 49.9% | 52.0% | 4918.0% | 4938.0% |

**Distribución Legacy:** {"positive":49.7,"negative":30.2,"neutral":20.1}  
**Distribución CADEM:** {"negative":35.3,"positive":49.9,"neutral":14.8}

⚠️ **GANADOR: Legacy** (más cercano al benchmark por 20.0%)

---

## Métricas Globales

| Métrica | Legacy | CADEM v4.10 |
|---------|--------|-------------|
| **MAE Promedio** | 4652.8% | 4884.8% |
| **Preguntas Ganadas** | 5/5 | 0/5 |

⚠️ **RESULTADO: Legacy supera a CADEM v4.10**


---

## Conclusiones

❌ **El motor CADEM v4.10 no supera al legacy**

Recomendación: **Revisar calibración**

---

## Próximos Pasos

1. ✅ Validación A/B completada
2. ⏸️ Revisar calibración
3. 

---

*Reporte generado automáticamente el 27-03-2026, 12:29:06 p. m.*
