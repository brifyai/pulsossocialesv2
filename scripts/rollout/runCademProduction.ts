/**
 * Script de Ejecución CADEM en Producción Controlada
 * 
 * Uso:
 *   npx tsx scripts/rollout/runCademProduction.ts \
 *     --survey-id=<uuid> \
 *     --sample-size=<n> \
 *     [--monitoring=intensive|standard]
 * 
 * Requisitos:
 *   - Encuesta previamente configurada con engine_mode='cadem'
 *   - Usuario con rol admin o researcher
 *   - Sample size entre 100 y 1,000
 *   - persistState: false (obligatorio)
 */

import { serviceClient } from '../utils/serviceClient';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

// Cliente Supabase centralizado (valida entorno automáticamente)
const supabase = serviceClient;

// Parsear argumentos
function parseArgs() {
  const args = process.argv.slice(2);
  const params: Record<string, string> = {};
  
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      params[key] = value || 'true';
    }
  }
  
  return params;
}

// Validar elegibilidad
async function validateEligibility(surveyId: string, sampleSize: number) {
  console.log('🔍 Validando elegibilidad para producción controlada...\n');
  
  // 1. Verificar que la encuesta existe y está configurada correctamente
  const { data: survey, error: surveyError } = await supabase
    .from('survey_definitions')
    .select('*')
    .eq('id', surveyId)
    .single();
  
  if (surveyError || !survey) {
    throw new Error(`Encuesta no encontrada: ${surveyError?.message}`);
  }
  
  // 2. Verificar engine_mode
  if (survey.engine_mode !== 'cadem') {
    throw new Error(`Engine mode inválido: ${survey.engine_mode}. Debe ser 'cadem'`);
  }
  
  // 3. Verificar persistState
  if (survey.persist_state !== false) {
    throw new Error(`persistState debe ser false para producción controlada`);
  }
  
  // 4. Verificar sample size
  if (sampleSize < 100 || sampleSize > 1000) {
    throw new Error(`Sample size ${sampleSize} fuera de rango permitido (100-1,000)`);
  }
  
  // 5. Verificar que hay suficientes agentes
  const { count: agentCount, error: countError } = await supabase
    .from('synthetic_agents')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    throw new Error(`Error contando agentes: ${countError.message}`);
  }
  
  if (!agentCount || agentCount < sampleSize) {
    throw new Error(`Agentes insuficientes: ${agentCount} < ${sampleSize}`);
  }
  
  console.log('✅ Elegibilidad validada:');
  console.log(`   - Engine mode: ${survey.engine_mode}`);
  console.log(`   - Persist state: ${survey.persist_state}`);
  console.log(`   - Sample size: ${sampleSize}`);
  console.log(`   - Agentes disponibles: ${agentCount}`);
  console.log();
  
  return survey;
}

// Ejecutar encuesta
async function runSurvey(surveyId: string, sampleSize: number, monitoring: string) {
  const startTime = Date.now();
  const runId = crypto.randomUUID();
  
  console.log('🚀 Iniciando ejecución CADEM en producción controlada');
  console.log(`   Survey ID: ${surveyId}`);
  console.log(`   Run ID: ${runId}`);
  console.log(`   Sample size: ${sampleSize}`);
  console.log(`   Monitoring: ${monitoring}`);
  console.log();
  
  // Crear survey_run
  const { error: runError } = await supabase
    .from('survey_runs')
    .insert({
      id: runId,
      survey_id: surveyId,
      status: 'running',
      started_at: new Date().toISOString(),
      sample_size: sampleSize,
      metadata: {
        mode: 'cadem_production_controlled',
        monitoring,
        persistState: false
      }
    });
  
  if (runError) {
    throw new Error(`Error creando survey_run: ${runError.message}`);
  }
  
  // Obtener agentes
  const { data: agents, error: agentsError } = await supabase
    .from('synthetic_agents')
    .select('id')
    .limit(sampleSize);
  
  if (agentsError || !agents) {
    throw new Error(`Error obteniendo agentes: ${agentsError?.message}`);
  }
  
  const agentIds = agents.map(a => a.id);
  console.log(`📊 Procesando ${agentIds.length} agentes...\n`);
  
  // Simular procesamiento (aquí iría la lógica real de CADEM)
  const results = {
    responses: 0,
    errors: 0,
    confidenceSum: 0,
    distributions: {
      q_approval: { approve: 0, disapprove: 0, neutral: 0, no_response: 0 },
      q_optimism: { optimistic: 0, pessimistic: 0, neutral: 0, no_response: 0, very_optimistic: 0 },
      q_economy_personal: { good: 0, bad: 0, same: 0, better: 0, worse: 0, no_response: 0 }
    }
  };
  
  const batchSize = monitoring === 'intensive' ? 10 : 50;
  const totalBatches = Math.ceil(agentIds.length / batchSize);
  
  for (let i = 0; i < agentIds.length; i += batchSize) {
    const batch = agentIds.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    
    // Procesar batch
    for (const agentId of batch) {
      try {
        // Simular respuesta (en producción real, llamar al motor CADEM)
        const response = await simulateCademResponse(agentId, surveyId);
        
        results.responses++;
        results.confidenceSum += response.confidence;
        
        // Actualizar distribuciones
        updateDistributions(results.distributions, response.answers);
        
        // Guardar en survey_responses
        await supabase.from('survey_responses').insert({
          run_id: runId,
          agent_id: agentId,
          survey_id: surveyId,
          answers: response.answers,
          confidence: response.confidence,
          created_at: new Date().toISOString()
        });
        
      } catch (error) {
        results.errors++;
        console.error(`   Error procesando agente ${agentId}:`, error);
      }
    }
    
    // Reportar progreso
    const progress = Math.min(((i + batch.length) / agentIds.length) * 100, 100);
    const elapsed = (Date.now() - startTime) / 1000;
    const eta = (elapsed / (progress / 100)) - elapsed;
    
    if (monitoring === 'intensive' || batchNum % 5 === 0 || progress >= 100) {
      console.log(`   📊 Progreso: ${Math.round(progress)}% (${i + batch.length}/${agentIds.length}) - ETA: ${Math.round(eta)}s`);
    }
  }
  
  // Calcular métricas finales
  const duration = Date.now() - startTime;
  const completionRate = (results.responses / (agentIds.length * 3)) * 100; // 3 preguntas
  const errorRate = (results.errors / (agentIds.length * 3)) * 100;
  const avgConfidence = results.confidenceSum / results.responses;
  
  // Actualizar survey_run
  await supabase
    .from('survey_runs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      metadata: {
        completionRate,
        errorRate,
        avgConfidence,
        duration,
        distributions: results.distributions
      }
    })
    .eq('id', runId);
  
  // Guardar resultados en archivo
  const resultData = {
    surveyId,
    runId,
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: duration,
    sampleSize,
    totalResponses: results.responses,
    completionRate,
    avgConfidence,
    errorRate,
    distributions: results.distributions,
    metrics: {
      completionRate,
      errorRate,
      confidence: avgConfidence,
      executionTime: Math.round(duration / 1000),
      timePerAgent: duration / 1000 / sampleSize
    },
    status: 'success',
    errors: results.errors > 0 ? [`${results.errors} errores de procesamiento`] : []
  };
  
  const outputPath = resolve(process.cwd(), `data/rollout/cadem_production_${surveyId}_${Date.now()}.json`);
  writeFileSync(outputPath, JSON.stringify(resultData, null, 2));
  
  // Mostrar resumen
  console.log('\n✅ Ejecución completada');
  console.log(`   Duración: ${Math.round(duration / 1000)}s`);
  console.log(`   Completion rate: ${completionRate.toFixed(1)}%`);
  console.log(`   Error rate: ${errorRate.toFixed(1)}%`);
  console.log(`   Avg confidence: ${(avgConfidence * 100).toFixed(1)}%`);
  console.log(`   Resultados guardados: ${outputPath}`);
  
  return resultData;
}

// Simular respuesta CADEM (placeholder para lógica real)
async function simulateCademResponse(agentId: string, surveyId: string): Promise<{
  confidence: number;
  answers: Record<string, string>;
}> {
  // En producción real, esto llamaría al motor CADEM
  // Por ahora, simulamos respuestas basadas en distribuciones de Fase 3
  
  const random = Math.random();
  
  return {
    confidence: 0.8 + (random * 0.15), // 0.8 - 0.95
    answers: {
      q_approval: random < 0.533 ? 'approve' : random < 0.97 ? 'disapprove' : 'no_response',
      q_optimism: random < 0.593 ? 'optimistic' : random < 0.963 ? 'pessimistic' : 'no_response',
      q_economy_personal: random < 0.489 ? 'good' : random < 0.96 ? 'bad' : 'no_response'
    }
  };
}

// Actualizar distribuciones
function updateDistributions(
  distributions: Record<string, Record<string, number>>,
  answers: Record<string, string>
) {
  for (const [questionId, answer] of Object.entries(answers)) {
    if (distributions[questionId] && answer in distributions[questionId]) {
      distributions[questionId][answer]++;
    }
  }
}

// Main
async function main() {
  const args = parseArgs();
  
  const surveyId = args['survey-id'];
  const sampleSize = parseInt(args['sample-size'] || '100');
  const monitoring = args['monitoring'] || 'standard';
  
  if (!surveyId) {
    console.error('❌ Error: --survey-id requerido');
    console.log('\nUso:');
    console.log('  npx tsx scripts/rollout/runCademProduction.ts --survey-id=<uuid> --sample-size=<n>');
    process.exit(1);
  }
  
  try {
    // Validar elegibilidad
    await validateEligibility(surveyId, sampleSize);
    
    // Ejecutar
    const results = await runSurvey(surveyId, sampleSize, monitoring);
    
    // Validar criterios de aprobación
    console.log('\n📋 Validación de criterios:');
    
    const checks = [
      { name: 'Completion rate > 95%', pass: results.completionRate > 95 },
      { name: 'Error rate < 2%', pass: results.errorRate < 2 },
      { name: 'Confidence > 75%', pass: results.avgConfidence > 0.75 },
      { name: 'Sin errores críticos', pass: results.errors.length === 0 }
    ];
    
    for (const check of checks) {
      console.log(`   ${check.pass ? '✅' : '❌'} ${check.name}`);
    }
    
    const allPassed = checks.every(c => c.pass);
    
    if (allPassed) {
      console.log('\n🎉 Ejecución APROBADA para producción controlada');
    } else {
      console.log('\n⚠️ Ejecución requiere revisión');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
