/**
 * Script para crear los 3 escenarios de validación del Scenario Builder MVP
 *
 * Uso:
 *   npx ts-node scripts/test/createValidationScenarios.ts
 *
 * Crea automáticamente:
 * 1. Subsidio al Transporte
 * 2. Crisis Económica
 * 3. Endurecimiento Migratorio
 */

import { createScenario, listScenarios } from '../../src/app/events/scenarioEventStore.ts';
import type { CreateScenarioInput, ScenarioEvent } from '../../src/app/events/scenarioEventStore.ts';
import type { EventSentiment, EventTargetEntity } from '../../src/app/events/types.ts';

// ============================================================================
// CONFIGURACIÓN DE ESCENARIOS
// ============================================================================

// Helper para crear entidades target
function createTargetEntity(type: string, id: string, name: string): EventTargetEntity {
  return { type: type as any, id, name };
}

const VALIDATION_SCENARIOS: CreateScenarioInput[] = [
  {
    name: 'Subsidio al Transporte',
    description: 'Subsidio temporal al transporte público para enfrentar el costo de vida. Medida económica positiva que busca aliviar la presión sobre los hogares.',
    category: 'economy',
    sentiment: 0.25 as EventSentiment,  // Valor válido más cercano a 0.3
    intensity: 0.6,
    salience: 0.8,
    severity: 'moderate',
    targetEntities: [
      createTargetEntity('economic_sector', 'transport', 'Transporte Público'),
      createTargetEntity('social_group', 'households', 'Hogares')
    ],
    status: 'active',
    metadata: {
      validationScenario: true,
      order: 1,
      expectedImpact: 'positive_on_personal_economy'
    }
  },
  {
    name: 'Crisis Económica',
    description: 'Crisis económica con alza del desempleo e inflación alta. Escenario de contracción económica severa que afecta a todos los sectores.',
    category: 'economy',
    sentiment: -0.75 as EventSentiment,  // Valor válido más cercano a -0.7
    intensity: 0.9,
    salience: 0.9,
    severity: 'major',
    targetEntities: [
      createTargetEntity('economic_sector', 'economy', 'Economía Nacional'),
      createTargetEntity('social_group', 'employment', 'Empleo'),
      createTargetEntity('social_group', 'households', 'Hogares')
    ],
    status: 'active',
    metadata: {
      validationScenario: true,
      order: 2,
      expectedImpact: 'negative_on_all_metrics'
    }
  },
  {
    name: 'Endurecimiento Migratorio',
    description: 'Endurecimiento de la política migratoria y mayores restricciones de ingreso. Medida de gobierno que genera debate político.',
    category: 'government',
    sentiment: -0.5 as EventSentiment,  // Valor válido más cercano a -0.4
    intensity: 0.7,
    salience: 0.6,
    severity: 'moderate',
    targetEntities: [
      createTargetEntity('government', 'government', 'Gobierno'),
      createTargetEntity('institution', 'immigration_policy', 'Política Migratoria')
    ],
    status: 'active',
    metadata: {
      validationScenario: true,
      order: 3,
      expectedImpact: 'negative_on_approval_minimal_on_economy'
    }
  }
];

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Busca un escenario existente por nombre
 */
async function findExistingScenario(name: string): Promise<ScenarioEvent | null> {
  const result = await listScenarios({ status: 'active', limit: 100 });

  if (!result.success || !result.data) {
    return null;
  }

  const existing = result.data.scenarios.find(
    s => s.name.toLowerCase() === name.toLowerCase()
  );

  return existing || null;
}

/**
 * Crea un escenario si no existe
 */
async function createScenarioIfNotExists(
  input: CreateScenarioInput
): Promise<{ success: boolean; scenario?: ScenarioEvent; created: boolean; error?: string }> {
  // Buscar si ya existe
  const existing = await findExistingScenario(input.name);

  if (existing) {
    console.log(`   ℹ️  Escenario "${input.name}" ya existe (ID: ${existing.id})`);
    return { success: true, scenario: existing, created: false };
  }

  // Crear nuevo escenario
  const result = await createScenario(input);

  if (!result.success || !result.data) {
    return { success: false, error: result.error, created: false };
  }

  return { success: true, scenario: result.data, created: true };
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
  console.log('========================================');
  console.log('  Creación de Escenarios de Validación');
  console.log('  Scenario Builder MVP');
  console.log('========================================');
  console.log();

  const createdScenarios: { name: string; id: string; created: boolean }[] = [];
  const errors: { name: string; error: string }[] = [];

  for (const scenarioInput of VALIDATION_SCENARIOS) {
    console.log(`📝 Procesando: ${scenarioInput.name}`);
    console.log(`   Categoría: ${scenarioInput.category}`);
    console.log(`   Sentimiento: ${scenarioInput.sentiment > 0 ? '+' : ''}${scenarioInput.sentiment}`);
    console.log(`   Intensidad: ${scenarioInput.intensity} | Salience: ${scenarioInput.salience}`);
    console.log(`   Severidad: ${scenarioInput.severity}`);

    const result = await createScenarioIfNotExists(scenarioInput);

    if (result.success && result.scenario) {
      createdScenarios.push({
        name: result.scenario.name,
        id: result.scenario.id,
        created: result.created
      });

      if (result.created) {
        console.log(`   ✅ Creado: ${result.scenario.id}`);
      }
    } else {
      errors.push({
        name: scenarioInput.name,
        error: result.error || 'Unknown error'
      });
      console.log(`   ❌ Error: ${result.error}`);
    }

    console.log();
  }

  // ============================================================================
  // RESUMEN
  // ============================================================================

  console.log('========================================');
  console.log('  Resumen');
  console.log('========================================');
  console.log();

  if (createdScenarios.length > 0) {
    console.log('✅ Escenarios disponibles:');
    console.log();

    for (const s of createdScenarios) {
      const status = s.created ? 'NUEVO' : 'EXISTENTE';
      console.log(`   [${status}] ${s.name}`);
      console.log(`   ID: ${s.id}`);
      console.log();
    }

    console.log('----------------------------------------');
    console.log('UUIDs para usar en validación:');
    console.log('----------------------------------------');
    console.log();

    for (const s of createdScenarios) {
      console.log(`export const ${s.name.toUpperCase().replace(/\s+/g, '_')}_ID = '${s.id}';`);
    }

    console.log();
    console.log('Comandos para ejecutar validación:');
    console.log('----------------------------------------');
    console.log();

    const [subsidio, crisis, migratorio] = createdScenarios;

    console.log(`# 1. Subsidio al Transporte`);
    console.log(`npx ts-node scripts/test/runScenarioSurvey.ts --scenario-id "${subsidio?.id}" --agents 100`);
    console.log();
    console.log(`# 2. Crisis Económica`);
    console.log(`npx ts-node scripts/test/runScenarioSurvey.ts --scenario-id "${crisis?.id}" --agents 100`);
    console.log();
    console.log(`# 3. Endurecimiento Migratorio`);
    console.log(`npx ts-node scripts/test/runScenarioSurvey.ts --scenario-id "${migratorio?.id}" --agents 100`);
    console.log();
  }

  if (errors.length > 0) {
    console.log('❌ Errores:');
    for (const e of errors) {
      console.log(`   - ${e.name}: ${e.error}`);
    }
    console.log();
  }

  console.log('✅ Proceso completado');
}

// ============================================================================
// EJECUCIÓN
// ============================================================================

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
