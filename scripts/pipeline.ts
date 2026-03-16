/**
 * Data Pipeline Orchestrator
 * 
 * Orquestador principal del pipeline de datos de Chile.
 * 
 * Ejecuta todas las etapas en orden:
 * 1. Ingest - Ingieren datos crudos
 * 2. Normalize - Normalizan al formato unificado
 * 3. Integrate - Integran fuentes múltiples
 * 4. Synthesize - Generan datos sintéticos
 * 5. Validate - Validan integridad
 * 
 * USO:
 *   npm run pipeline        # Ejecuta todo
 *   npm run pipeline:ingest # Solo ingest
 *   npm run pipeline:normalize # Solo normalize
 *   npm run pipeline:integrate # Solo integrate
 *   npm run pipeline:synthesize # Solo synthesize
 *   npm run pipeline:validate # Solo validate
 */

import * as fs from 'fs';
import * as path from 'path';

// Scripts de ingest
import { ingestCensus } from './ingest/ingest_censo';
import { ingestCasen } from './ingest/ingest_casen';
import { ingestSubtel } from './ingest/ingest_subtel';

// Scripts de normalize
import { normalizeCensus } from './normalize/normalize_censo';
import { normalizeCasen } from './normalize/normalize_casen';
import { normalizeSubtel } from './normalize/normalize_subtel';

// Scripts de integrate
import { buildTerritoriesMasterPipeline } from './integrate/build_territories_master';
import { buildPopulationBackbonePipeline } from './integrate/build_population_backbone';
import { buildSubtelProfilePipeline } from './integrate/build_subtel_profile';

// Scripts de synthesize
import { synthesizePopulationPipeline } from './synthesize/synthesize_population';
import { generateSyntheticAgentsV1Pipeline } from './synthesize/generate_synthetic_agents_v1';

// Scripts de validate
import { validateBackbonePipeline } from './validate/validate_backbone';
import { validateSyntheticPopulationPipeline } from './validate/validate_synthetic_population';

/**
 *确保 directorios existen
 */
function ensureDirectories(): void {
  const dirs = [
    'data/raw',
    'data/interim',
    'data/processed',
    'data/validation',
  ];
  
  for (const dir of dirs) {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Creado: ${dir}`);
    }
  }
}

/**
 * Stage 1: Ingest
 */
function runIngest(): void {
  console.log('\n' + '='.repeat(60));
  console.log('📥 ETAPA 1: INGEST');
  console.log('='.repeat(60));
  
  try {
    ingestCensus();
    ingestCasen();
    ingestSubtel();
    console.log('✅ Ingest completado');
  } catch (error) {
    console.error('❌ Error en ingest:', error);
  }
}

/**
 * Stage 2: Normalize
 */
function runNormalize(): void {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 ETAPA 2: NORMALIZE');
  console.log('='.repeat(60));
  
  try {
    normalizeCensus();
    normalizeCasen();
    normalizeSubtel();
    console.log('✅ Normalize completado');
  } catch (error) {
    console.error('❌ Error en normalize:', error);
  }
}

/**
 * Stage 3: Integrate
 */
function runIntegrate(): void {
  console.log('\n' + '='.repeat(60));
  console.log('🔗 ETAPA 3: INTEGRATE');
  console.log('='.repeat(60));
  
  try {
    buildTerritoriesMasterPipeline();
    buildPopulationBackbonePipeline();
    buildSubtelProfilePipeline();
    console.log('✅ Integrate completado');
  } catch (error) {
    console.error('❌ Error en integrate:', error);
  }
}

/**
 * Stage 4: Synthesize
 */
function runSynthesize(): void {
  console.log('\n' + '='.repeat(60));
  console.log('🧬 ETAPA 4: SYNTHESIZE');
  console.log('='.repeat(60));
  
  try {
    synthesizePopulationPipeline();
    generateSyntheticAgentsV1Pipeline();
    console.log('✅ Synthesize completado');
  } catch (error) {
    console.error('❌ Error en synthesize:', error);
  }
}

/**
 * Stage 5: Validate
 */
function runValidate(): void {
  console.log('\n' + '='.repeat(60));
  console.log('✅ ETAPA 5: VALIDATE');
  console.log('='.repeat(60));
  
  try {
    validateBackbonePipeline();
    validateSyntheticPopulationPipeline();
    console.log('✅ Validate completado');
  } catch (error) {
    console.error('❌ Error en validate:', error);
  }
}

/**
 * Ejecutar pipeline completo
 */
export function runFullPipeline(): void {
  console.log('🚀 INICIANDO PIPELINE COMPLETO DE DATOS');
  console.log('🏗️ Pulso Social Chile - Data Pipeline');
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  ensureDirectories();
  runIngest();
  runNormalize();
  runIntegrate();
  runSynthesize();
  runValidate();
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 PIPELINE COMPLETADO');
  console.log(`⏱️ Tiempo total: ${duration}s`);
  console.log('='.repeat(60));
}

/**
 * Ejecutar solo ingest
 */
export function runIngestOnly(): void {
  console.log('🚀 Ejecutando solo INGEST...');
  ensureDirectories();
  runIngest();
}

/**
 * Ejecutar solo normalize
 */
export function runNormalizeOnly(): void {
  console.log('🚀 Ejecutando solo NORMALIZE...');
  runNormalize();
}

/**
 * Ejecutar solo integrate
 */
export function runIntegrateOnly(): void {
  console.log('🚀 Ejecutando solo INTEGRATE...');
  runIntegrate();
}

/**
 * Ejecutar solo synthesize
 */
export function runSynthesizeOnly(): void {
  console.log('🚀 Ejecutando solo SYNTHESIZE...');
  runSynthesize();
}

/**
 * Ejecutar solo validate
 */
export function runValidateOnly(): void {
  console.log('🚀 Ejecutando solo VALIDATE...');
  runValidate();
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'ingest':
    runIngestOnly();
    break;
  case 'normalize':
    runNormalizeOnly();
    break;
  case 'integrate':
    runIntegrateOnly();
    break;
  case 'synthesize':
    runSynthesizeOnly();
    break;
  case 'validate':
    runValidateOnly();
    break;
  default:
    runFullPipeline();
}

export default runFullPipeline;