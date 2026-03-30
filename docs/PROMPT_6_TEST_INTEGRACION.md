# Prompt 6: Test de Integración - Scenario Builder

## Objetivo
Realizar test de integración end-to-end del Scenario Builder para validar que todos los componentes funcionan correctamente juntos.

## Alcance del Test

### 1. Flujo Completo de Creación
- [ ] Crear escenario desde la UI
- [ ] Verificar persistencia en Supabase
- [ ] Validar datos guardados

### 2. Flujo de Simulación
- [ ] Seleccionar escenario existente
- [ ] Configurar parámetros de simulación
- [ ] Ejecutar simulación
- [ ] Verificar resultados

### 3. Flujo de Eliminación
- [ ] Eliminar escenario desde la UI
- [ ] Verificar eliminación en Supabase
- [ ] Confirmar actualización de lista

## Casos de Test

### Test 1: Crear Escenario Económico
```
Nombre: "Test Integración - Inflación"
Categoría: economy
Severidad: major
Descripción: "Escenario de prueba para test de integración"
Sentimiento: -0.8
Intensidad: 0.9
Visibilidad: 0.7
```

**Validaciones:**
- [ ] Escenario aparece en lista
- [ ] Datos coinciden con entrada
- [ ] user_id correcto asignado
- [ ] created_at y updated_at presentes

### Test 2: Simular Escenario
```
Escenario: "Test Integración - Inflación"
Duración: 4 semanas
Intensidad acumulativa: Sí
```

**Validaciones:**
- [ ] Simulación se ejecuta sin errores
- [ ] Resultados se muestran correctamente
- [ ] Impacto calculado en agentes
- [ ] Logs de evento creados

### Test 3: Eliminar Escenario
```
Escenario: "Test Integración - Inflación"
```

**Validaciones:**
- [ ] Confirmación mostrada antes de eliminar
- [ ] Escenario desaparece de lista
- [ ] Registro eliminado de Supabase
- [ ] Mensaje de éxito mostrado

## Scripts de Test

### Script: testScenarioBuilderIntegration.ts
```typescript
// Test automatizado de integración
// Ubicación: scripts/test/testScenarioBuilderIntegration.ts

import { createServiceClient } from '../utils/serviceClient';
import { scenarioEventStore } from '../../src/app/events/scenarioEventStore';

async function runIntegrationTests() {
  console.log('🧪 Iniciando tests de integración...\n');
  
  // Test 1: Crear escenario
  // Test 2: Simular escenario
  // Test 3: Eliminar escenario
  
  console.log('\n✅ Tests completados');
}

runIntegrationTests();
```

## Comandos de Ejecución

```bash
# Ejecutar test de integración
npx tsx scripts/test/testScenarioBuilderIntegration.ts

# Verificar escenarios en base de datos
psql $DATABASE_URL -c "SELECT id, name, category, severity, user_id FROM scenario_events;"

# Verificar logs de eventos
psql $DATABASE_URL -c "SELECT * FROM event_impact_logs WHERE scenario_id IS NOT NULL;"
```

## Checklist de Validación

### Frontend
- [ ] Vista de lista carga correctamente
- [ ] Formulario de creación funciona
- [ ] Vista de simulación accesible
- [ ] Resultados se muestran correctamente
- [ ] Navegación entre vistas fluida
- [ ] Estados de carga visibles
- [ ] Manejo de errores funciona

### Backend
- [ ] API de escenarios responde
- [ ] RLS permite acceso correcto
- [ ] Datos se persisten correctamente
- [ ] Simulación ejecuta sin errores
- [ ] Eventos se aplican a agentes

### Base de Datos
- [ ] Tabla scenario_events accesible
- [ ] Foreign key user_id funciona
- [ ] Índices optimizan consultas
- [ ] Constraints validan datos

## Resultados Esperados

### Éxito
- Todos los tests pasan
- Flujo completo funciona sin errores
- Datos consistentes entre UI y DB
- Performance aceptable (< 2s carga)

### Fallos Comunes
- Error de RLS: Verificar políticas
- Error de FK: Verificar user_id
- Error de conexión: Verificar Supabase
- Error de datos: Verificar tipos

## Documentación de Resultados

### Formato
```markdown
## Test de Integración - [Fecha]

### Resumen
- Tests ejecutados: X
- Tests pasados: X
- Tests fallidos: X

### Detalles

#### Test 1: Crear Escenario
- Estado: ✅/❌
- Notas: [observaciones]

#### Test 2: Simular Escenario
- Estado: ✅/❌
- Notas: [observaciones]

#### Test 3: Eliminar Escenario
- Estado: ✅/❌
- Notas: [observaciones]

### Issues Encontrados
- [Lista de problemas]

### Recomendaciones
- [Sugerencias de mejora]
```

## Próximos Pasos

1. Ejecutar tests de integración
2. Documentar resultados
3. Corregir issues encontrados
4. Validar con usuarios reales
5. Preparar documentación final (Prompt 7)

## Notas

- Ejecutar tests en ambiente de staging
- Verificar logs de errores
- Documentar cualquier comportamiento inesperado
- Tomar screenshots de la UI
