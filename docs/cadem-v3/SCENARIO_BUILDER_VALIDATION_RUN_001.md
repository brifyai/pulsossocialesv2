# Scenario Builder Validation Run 001

## Estado: PENDIENTE DE EJECUCIÓN

**Fecha de preparación:** 2026-03-29
**Estado:** Scripts listos, esperando acceso a Supabase para ejecución

---

## Resumen

Esta validación tiene como objetivo verificar el funcionamiento del **Scenario Builder MVP** mediante la ejecución de 3 escenarios de prueba con 100 agentes cada uno, usando 5 preguntas CADEM estandarizadas.

### Escenarios a Validar

1. **Subsidio al Transporte** (economy, +0.25)
2. **Crisis Económica** (economy, -0.75)
3. **Endurecimiento Migratorio** (government, -0.5)

---

## Scripts Preparados

### 1. Creación de Escenarios
```bash
npx ts-node scripts/test/createValidationScenarios.ts
```

**Estado:** ✅ Script funcional (verificado sin conexión a DB)

**Resultado esperado:**
- Crea 3 escenarios en la tabla `scenario_events`
- Muestra los UUIDs generados para cada escenario
- Si ya existen, reutiliza los existentes

### 2. Ejecución de Encuestas con Escenarios
```bash
# Subsidio al Transporte
npx ts-node scripts/test/runScenarioSurvey.ts --scenario-id "<UUID>" --agents 100

# Crisis Económica
npx ts-node scripts/test/runScenarioSurvey.ts --scenario-id "<UUID>" --agents 100

# Endurecimiento Migratorio
npx ts-node scripts/test/runScenarioSurvey.ts --scenario-id "<UUID>" --agents 100
```

**Estado:** ✅ Script preparado (5 preguntas CADEM configuradas)

---

## Configuración de Preguntas (5 CADEM)

Las encuestas usarán las siguientes preguntas estandarizadas:

1. **Aprobación Presidente** (`president_approval`)
   - Escala: 1-5 (Muy mala → Muy buena)
   - Benchmark CADEM: ~35% aprobación (marzo 2026)

2. **Evaluación Económica Personal** (`personal_economy`)
   - Escala: 1-5 (Mucho peor → Mucho mejor)
   - Benchmark CADEM: ~25% mejoró

3. **Evaluación Económica Nacional** (`national_economy`)
   - Escala: 1-5 (Mucho peor → Mucho mejor)
   - Benchmark CADEM: ~15% mejoró

4. **Intención de Voto** (`voting_intention`)
   - Opciones: A Favor, En Contra, Indeciso, No votaría
   - Benchmark CADEM: ~45% A Favor

5. **Problema Principal** (`main_problem`)
   - Opciones: Delincuencia, Economía, Salud, Educación, etc.
   - Benchmark CADEM: Delincuencia ~35%, Economía ~25%

---

## Criterios de Éxito

### Métricas Operativas
- [ ] 3 escenarios creados exitosamente en Supabase
- [ ] 300 respuestas generadas (100 por escenario)
- [ ] 0 errores críticos durante la ejecución
- [ ] Tiempo de ejecución < 5 minutos por escenario

### Métricas Analíticas
- [ ] **Subsidio al Transporte:**
  - Aprobación Presidente: +5% a +10% vs baseline
  - Economía personal: +10% a +15% vs baseline
  - Economía nacional: +5% a +10% vs baseline

- [ ] **Crisis Económica:**
  - Aprobación Presidente: -10% a -15% vs baseline
  - Economía personal: -15% a -20% vs baseline
  - Economía nacional: -20% a -25% vs baseline

- [ ] **Endurecimiento Migratorio:**
  - Aprobación Presidente: -5% a -10% vs baseline
  - Economía personal: -2% a -5% vs baseline (efecto mínimo)
  - Intención de voto: -5% a -8% vs baseline

---

## Instrucciones de Ejecución

### Paso 1: Configurar Variables de Entorno
```bash
export VITE_SUPABASE_URL="https://tu-proyecto.supabase.co"
export VITE_SUPABASE_SERVICE_KEY="tu-service-key"
```

### Paso 2: Crear Escenarios
```bash
cd /Users/camiloalegria/Desktop/AIntelligence/Pulso\ social/versionconesteroides
npx ts-node scripts/test/createValidationScenarios.ts
```

**Nota:** Guardar los UUIDs generados para el siguiente paso.

### Paso 3: Ejecutar Validación por Escenario
```bash
# Ejemplo (reemplazar con UUIDs reales)
npx ts-node scripts/test/runScenarioSurvey.ts \
  --scenario-id "550e8400-e29b-41d4-a716-446655440000" \
  --agents 100
```

### Paso 4: Documentar Resultados
Actualizar este archivo con:
- UUIDs reales de los escenarios
- Resultados de cada ejecución
- Métricas comparativas vs baseline
- Observaciones y hallazgos

---

## Estructura de Datos Esperada

### Tabla: scenario_events
```sql
SELECT id, name, category, sentiment, intensity, salience, severity, status
FROM scenario_events
WHERE metadata->>'validationScenario' = 'true';
```

### Tabla: survey_results
```sql
SELECT 
  s.scenario_id,
  s.question_id,
  s.response_value,
  s.confidence,
  s.agent_id
FROM survey_results s
JOIN survey_definitions d ON s.survey_id = d.id
WHERE d.metadata->>'validationRun' = '001';
```

---

## Próximos Pasos

1. **Obtener acceso a Supabase** con credenciales válidas
2. **Ejecutar Paso 2** para crear los 3 escenarios
3. **Ejecutar Paso 3** para cada escenario
4. **Analizar resultados** y comparar con expectativas
5. **Documentar hallazgos** en este archivo
6. **Decidir** si el MVP está listo para release

---

## Notas Técnicas

### Cambios Realizados para la Validación

1. **scenarioEventStore.ts:** Corregidas importaciones con extensión `.ts`
2. **client.ts:** Corregida importación de `database.ts`
3. **createValidationScenarios.ts:** Corregida importación de tipos
4. **runScenarioSurvey.ts:** Actualizado a 5 preguntas CADEM

### Dependencias

- Node.js 18+
- ts-node configurado
- Acceso a Supabase con permisos de escritura
- Tablas `scenario_events` y `survey_results` creadas

---

## Contacto

Para ejecutar esta validación, contactar al equipo de DevOps para obtener:
- URL de Supabase
- Service Key con permisos adecuados

---

*Documento generado automáticamente el 2026-03-29*
*Estado: LISTO PARA EJECUCIÓN*
