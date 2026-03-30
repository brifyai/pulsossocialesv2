/**
 * Script de validación automatizada para R1 - Modal de Selección de Escenario
 * 
 * Este script verifica que la implementación de R1 esté correctamente integrada
 * en los archivos fuente antes de la validación manual en navegador.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  test: string;
  passed: boolean;
  details: string;
}

const results: ValidationResult[] = [];

function addResult(test: string, passed: boolean, details: string) {
  results.push({ test, passed, details });
  console.log(`${passed ? '✅' : '❌'} ${test}: ${details}`);
}

function validateFileExists(filePath: string, description: string): boolean {
  const fullPath = path.resolve(process.cwd(), filePath);
  const exists = fs.existsSync(fullPath);
  addResult(
    description,
    exists,
    exists ? `Archivo encontrado: ${filePath}` : `Archivo NO encontrado: ${filePath}`
  );
  return exists;
}

function validateFileContains(filePath: string, patterns: string[], description: string): boolean {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    addResult(description, false, `Archivo no existe: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const missingPatterns: string[] = [];

  for (const pattern of patterns) {
    if (!content.includes(pattern)) {
      missingPatterns.push(pattern);
    }
  }

  const passed = missingPatterns.length === 0;
  addResult(
    description,
    passed,
    passed 
      ? `Todas las ${patterns.length} patterns encontradas en ${filePath}`
      : `Faltan patterns: ${missingPatterns.join(', ')}`
  );
  return passed;
}

console.log('\n========================================');
console.log('R1 VALIDATION - Modal de Selección de Escenario');
console.log('========================================\n');

// 1. Validar existencia de archivos
console.log('📁 Validando archivos...\n');
validateFileExists('src/pages/SurveysPage.ts', 'SurveysPage.ts existe');
validateFileExists('src/app/survey/surveyService.ts', 'surveyService.ts existe');
validateFileExists('src/styles/surveys.css', 'surveys.css existe');

// 2. Validar implementación en SurveysPage.ts
console.log('\n📄 Validando SurveysPage.ts...\n');
validateFileContains(
  'src/pages/SurveysPage.ts',
  [
    'showScenarioSelectionModal',
    'executeSurveyWithScenario',
    'scenario-modal-overlay',
    'scenario-modal',
    'Baseline (sin escenario)',
    'listScenarios'
  ],
  'Funciones del modal implementadas'
);

// 3. Validar implementación en surveyService.ts
console.log('\n📄 Validando surveyService.ts...\n');
validateFileContains(
  'src/app/survey/surveyService.ts',
  [
    'scenarioEventId',
    'runSurvey',
    'survey_runs'
  ],
  'Parámetro scenarioEventId en runSurvey'
);

// 4. Validar estilos CSS
console.log('\n🎨 Validando surveys.css...\n');
validateFileContains(
  'src/styles/surveys.css',
  [
    '.scenario-modal-overlay',
    '.scenario-modal',
    '.scenario-modal-header',
    '.scenario-modal-body',
    '.scenario-modal-footer',
    'fadeIn',
    'slideUp',
    'backdrop-filter',
    'severity-low',
    'severity-medium',
    'severity-high',
    'sentiment-positive',
    'sentiment-negative',
    'sentiment-neutral'
  ],
  'Estilos del modal implementados'
);

// 5. Validar integración con scenarioEventStore
console.log('\n🔗 Validando integración con scenarioEventStore...\n');
validateFileExists('src/app/events/scenarioEventStore.ts', 'scenarioEventStore.ts existe');
validateFileContains(
  'src/pages/SurveysPage.ts',
  ['scenarioEventStore', 'listScenarios'],
  'Import y uso de scenarioEventStore'
);

// Resumen
console.log('\n========================================');
console.log('RESUMEN DE VALIDACIÓN');
console.log('========================================\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = results.filter(r => !r.passed);

console.log(`✅ Tests pasados: ${passed}/${total}`);
console.log(`❌ Tests fallidos: ${failed.length}\n`);

if (failed.length > 0) {
  console.log('Detalles de fallos:');
  failed.forEach(f => console.log(`  - ${f.test}: ${f.details}`));
}

console.log('\n========================================');
console.log(failed.length === 0 ? '✅ R1 LISTO PARA VALIDACIÓN MANUAL' : '❌ R1 TIENE PROBLEMAS PENDIENTES');
console.log('========================================\n');

process.exit(failed.length > 0 ? 1 : 0);
