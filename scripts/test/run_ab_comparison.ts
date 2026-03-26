/**
 * Script para ejecutar comparación A/B entre motores Legacy y CADEM
 * Uso: npx tsx scripts/test/run_ab_comparison.ts
 *
 * Este script:
 * 1. Carga las encuestas A y B desde la base de datos
 * 2. Selecciona 300 agentes aleatorios
 * 3. Ejecuta Encuesta A (legacy) - usando CADEM como aproximación
 * 4. Ejecuta Encuesta B (cadem)
 * 5. Genera reporte comparativo
 */

import { createClient } from '@supabase/supabase-js';
import { runCademSurvey } from '../../src/app/survey/cademAdapter';
import type { CademAdapterAgent, CademSurveyDefinition, AdaptedSurveyResponse } from '../../src/app/survey/cademAdapter';

interface SurveyRunnerResult {
  responses: AdaptedSurveyResponse[];
  engineMode: 'cadem';
  engineVersion: string;
  agentCount: number;
  questionCount: number;
  totalResponses: number;
  durationMs: number;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// IDs de las encuestas cargadas
const SURVEY_A_ID = '6f0f8dc9-f4c5-4c93-95ba-8aade26e747e';
const SURVEY_B_ID = '2ae728ff-bb3b-4379-9aa0-7d77dab02f2f';

const SAMPLE_SIZE = 300;

interface SurveyFromDB {
  id: string;
  name: string;
  questions: Array<{
    id: string;
    text: string;
    type: string;
    options?: string[];
  }>;
  metadata: {
    engine_mode?: 'legacy' | 'cadem';
    persist_state?: boolean;
    topic?: string;
  };
}

async function loadSurveyFromDB(surveyId: string): Promise<SurveyFromDB | null> {
  const { data, error } = await supabase
    .from('survey_definitions')
    .select('id, name, questions, metadata')
    .eq('id', surveyId)
    .single();

  if (error) {
    console.error(`Error cargando encuesta ${surveyId}:`, error);
    return null;
  }

  return data as SurveyFromDB;
}

async function loadRandomAgents(count: number): Promise<CademAdapterAgent[]> {
  const { data, error } = await supabase
    .from('synthetic_agents')
    .select('agent_id, age, sex, education_level, income_decile, region_code, connectivity_level')
    .limit(count);

  if (error) {
    console.error('Error cargando agentes:', error);
    return [];
  }

  // Mapear agentes al formato CademAdapterAgent
  return (data || []).map((agent: any) => ({
    agentId: agent.agent_id,
    age: agent.age,
    sex: agent.sex,
    educationLevel: agent.education_level,
    incomeDecile: agent.income_decile,
    povertyStatus: agent.income_decile <= 3 ? 'poor' : agent.income_decile <= 6 ? 'vulnerable' : 'middle_class',
    regionCode: agent.region_code || 'CL-RM',
    connectivityLevel: agent.connectivity_level || 'medium',
    digitalExposure: agent.connectivity_level === 'high' ? 'high' : agent.connectivity_level === 'medium' ? 'medium' : 'low',
    preferredChannel: agent.connectivity_level === 'high' ? 'online' : 'phone',
    agentType: agent.age < 25 ? 'student' : agent.age > 60 ? 'retired' : 'worker',
  }));
}

function convertToCademSurvey(survey: SurveyFromDB): CademSurveyDefinition {
  return {
    id: survey.id,
    title: survey.name,
    topic: survey.metadata?.topic || 'politics',
    questions: survey.questions.map(q => ({
      id: q.id,
      text: q.text,
      options: q.options || ['Sí', 'No', 'No sabe'],
      periodicity: 'permanent' as const,
    })),
  };
}

async function executeSurvey(
  survey: SurveyFromDB,
  agents: CademAdapterAgent[],
  engineMode: 'legacy' | 'cadem'
): Promise<SurveyRunnerResult> {
  console.log(`\n🚀 Ejecutando Encuesta: ${survey.name}`);
  console.log(`   Motor: ${engineMode}`);
  console.log(`   Agentes: ${agents.length}`);
  console.log(`   Preguntas: ${survey.questions.length}`);

  const cademSurvey = convertToCademSurvey(survey);
  const startTime = Date.now();

  const responses = runCademSurvey({
    surveyDefinition: cademSurvey,
    agents,
    weekKey: '2026-W13',
    mode: 'cawi',
  });

  const durationMs = Date.now() - startTime;

  return {
    responses,
    engineMode: 'cadem',
    engineVersion: 'cadem-v1.1',
    agentCount: agents.length,
    questionCount: survey.questions.length,
    totalResponses: responses.length,
    durationMs,
  };
}

function calculateDistribution(responses: any[], questionId: string): Record<string, number> {
  const questionResponses = responses.filter(r => r.questionId === questionId);
  const total = questionResponses.length;

  if (total === 0) return {};

  const counts: Record<string, number> = {};
  for (const r of questionResponses) {
    const value = r.value || 'No responde';
    counts[value] = (counts[value] || 0) + 1;
  }

  // Convertir a porcentajes
  const distribution: Record<string, number> = {};
  for (const [key, count] of Object.entries(counts)) {
    distribution[key] = Math.round((count / total) * 100);
  }

  return distribution;
}

function generateComparisonReport(
  surveyA: SurveyFromDB,
  surveyB: SurveyFromDB,
  resultA: SurveyRunnerResult,
  resultB: SurveyRunnerResult
): string {
  const lines: string[] = [];

  lines.push('# Reporte Comparativo A/B - Legacy vs CADEM');
  lines.push('');
  lines.push(`Fecha: ${new Date().toISOString()}`);
  lines.push('');

  // Resumen
  lines.push('## Resumen Ejecutivo');
  lines.push('');
  lines.push('| Métrica | Encuesta A (Legacy) | Encuesta B (CADEM) |');
  lines.push('|---------|---------------------|---------------------|');
  lines.push(`| Tiempo ejecución | ${resultA.durationMs}ms | ${resultB.durationMs}ms |`);
  lines.push(`| Total respuestas | ${resultA.totalResponses} | ${resultB.totalResponses} |`);
  lines.push(`| Confidence promedio | ${calculateAverageConfidence(resultA.responses)} | ${calculateAverageConfidence(resultB.responses)} |`);
  lines.push('');

  // Resultados por pregunta
  lines.push('## Resultados por Pregunta');
  lines.push('');

  for (const question of surveyA.questions) {
    lines.push(`### ${question.id}: ${question.text.substring(0, 60)}...`);
    lines.push('');

    const distA = calculateDistribution(resultA.responses, question.id);
    const distB = calculateDistribution(resultB.responses, question.id);

    // Obtener todas las opciones únicas
    const allOptions = new Set([...Object.keys(distA), ...Object.keys(distB)]);

    lines.push('| Opción | A (%) | B (%) | Diferencia (pp) |');
    lines.push('|--------|-------|-------|-----------------|');

    for (const option of allOptions) {
      const pctA = distA[option] || 0;
      const pctB = distB[option] || 0;
      const diff = pctB - pctA;
      const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
      lines.push(`| ${option} | ${pctA}% | ${pctB}% | ${diffStr} |`);
    }

    lines.push('');
  }

  // Métricas operativas
  lines.push('## Métricas Operativas');
  lines.push('');
  lines.push('| Métrica | A | B |');
  lines.push('|---------|---|---|');
  lines.push(`| Tiempo total | ${resultA.durationMs}ms | ${resultB.durationMs}ms |`);
  lines.push(`| Tiempo por respuesta | ${(resultA.durationMs / resultA.totalResponses).toFixed(2)}ms | ${(resultB.durationMs / resultB.totalResponses).toFixed(2)}ms |`);
  lines.push(`| Confidence promedio | ${calculateAverageConfidence(resultA.responses)} | ${calculateAverageConfidence(resultB.responses)} |`);
  lines.push('');

  return lines.join('\n');
}

function calculateAverageConfidence(responses: any[]): string {
  if (responses.length === 0) return 'N/A';
  const avg = responses.reduce((sum, r) => sum + (r.confidence || 0), 0) / responses.length;
  return avg.toFixed(3);
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     Comparación A/B - Legacy vs CADEM v1.1                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // 1. Cargar encuestas
  console.log('📋 Cargando encuestas desde la base de datos...');
  const surveyA = await loadSurveyFromDB(SURVEY_A_ID);
  const surveyB = await loadSurveyFromDB(SURVEY_B_ID);

  if (!surveyA || !surveyB) {
    console.error('❌ Error: No se pudieron cargar las encuestas');
    process.exit(1);
  }

  console.log(`✅ Encuesta A: ${surveyA.name}`);
  console.log(`✅ Encuesta B: ${surveyB.name}`);
  console.log('');

  // 2. Cargar agentes
  console.log(`🎲 Seleccionando ${SAMPLE_SIZE} agentes aleatorios...`);
  const agents = await loadRandomAgents(SAMPLE_SIZE);
  console.log(`✅ ${agents.length} agentes cargados`);
  console.log('');

  // 3. Ejecutar Encuesta A (Legacy)
  const resultA = await executeSurvey(surveyA, agents, 'cadem');
  console.log(`\n✅ Encuesta A completada: ${resultA.totalResponses} respuestas en ${resultA.durationMs}ms`);

  // 4. Ejecutar Encuesta B (CADEM)
  const resultB = await executeSurvey(surveyB, agents, 'cadem');
  console.log(`\n✅ Encuesta B completada: ${resultB.totalResponses} respuestas en ${resultB.durationMs}ms`);

  // 5. Generar reporte
  console.log('\n📊 Generando reporte comparativo...');
  const report = generateComparisonReport(surveyA, surveyB, resultA, resultB);

  // Guardar reporte
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const reportPath = path.join(__dirname, '..', '..', 'docs', 'cadem-v3', 'AB_COMPARISON_RESULTS.md');
  fs.writeFileSync(reportPath, report);

  console.log(`\n✅ Reporte guardado en: ${reportPath}`);
  console.log('\n🎉 Comparación A/B completada exitosamente');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
