/**
 * Comparación A/B Standalone - Legacy vs CADEM
 * Versión con normalización canónica para comparación analíticamente válida
 */

import { createClient } from '@supabase/supabase-js';
import { generateSurveyResponses } from '../../src/app/survey/syntheticResponseEngine';
import { runCademSurvey } from '../../src/app/survey/cademAdapter';
import { calculateCanonicalDistribution } from '../../src/app/survey/canonicalDistribution';
import type { SyntheticAgent } from '../../src/types/agent';
import type { SurveyQuestion } from '../../src/types/survey';
import type { CademAdapterAgent, CademSurveyDefinition } from '../../src/app/survey/cademAdapter';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SURVEY_A_ID = '6f0f8dc9-f4c5-4c93-95ba-8aade26e747e';
const SURVEY_B_ID = '2ae728ff-bb3b-4379-9aa0-7d77dab02f2f';
const SAMPLE_SIZE = 300;

interface SurveyFromDB {
  id: string;
  title?: string;
  description?: string;
  questions: Array<{
    id: string;
    text: string;
    type: string;
    options?: Array<{ id: string; text: string; value: number }> | string[];
    periodicity?: 'permanent' | 'monthly' | 'lower_frequency' | 'ad_hoc';
  }>;
  engine_mode?: 'legacy' | 'cadem';
  persist_state?: boolean;
  metadata?: Record<string, unknown>;
}

async function loadSurveyFromDB(surveyId: string): Promise<SurveyFromDB | null> {
  const { data, error } = await supabase
    .from('survey_definitions')
    .select('*')
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

  return (data || []).map((agent: any) => ({
    agentId: agent.agent_id,
    age: agent.age,
    sex: agent.sex,
    educationLevel: agent.education_level,
    incomeDecile: agent.income_decile,
    povertyStatus:
      agent.income_decile <= 3
        ? 'poverty'
        : agent.income_decile <= 6
          ? 'vulnerable'
          : 'middle_class',
    regionCode: agent.region_code || 'CL-RM',
    connectivityLevel: agent.connectivity_level || 'medium',
    digitalExposure:
      agent.connectivity_level === 'high'
        ? 'high'
        : agent.connectivity_level === 'medium'
          ? 'medium'
          : 'low',
    preferredChannel:
      agent.connectivity_level === 'high' ? 'online' : 'mixed',
    agentType:
      agent.age < 25 ? 'student' : agent.age > 64 ? 'retired' : 'worker',
  }));
}

function normalizeQuestionOptions(options: SurveyFromDB['questions'][number]['options']): string[] {
  if (!options) return [];

  if (Array.isArray(options) && typeof options[0] === 'string') {
    return options as string[];
  }

  return (options as Array<{ id: string; text: string; value: number }>).map((o) => o.text);
}

function normalizeSurveyDefinition(survey: SurveyFromDB): CademSurveyDefinition {
  return {
    id: survey.id,
    title: survey.title || 'Sin título',
    topic: (survey.metadata?.topic as string) || 'politics',
    questions: survey.questions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      options: normalizeQuestionOptions(q.options),
      periodicity: q.periodicity || 'permanent',
    })),
  };
}

interface SurveyResult {
  responses: Array<{
    surveyId: string;
    questionId: string;
    agentId: string;
    value: string | null;
    confidence: number;
    reasoning: string;
    engineMode: string;
    engineVersion: string;
  }>;
  durationMs: number;
  totalResponses: number;
}

function runLegacySurvey(
  surveyDefinition: CademSurveyDefinition,
  agents: CademAdapterAgent[]
): SurveyResult {
  const startTime = Date.now();

  // Convertir CademAdapterAgent a SyntheticAgent para el motor legacy
  const legacyAgents: SyntheticAgent[] = agents.map(agent => ({
    agent_id: agent.agentId,
    age: agent.age ?? 35,
    sex: agent.sex ?? 'unknown',
    education_level: agent.educationLevel ?? 'secondary',
    income_decile: agent.incomeDecile ?? 5,
    poverty_status: agent.povertyStatus ?? 'middle_class',
    region_code: agent.regionCode ?? 'CL-RM',
    connectivity_level: agent.connectivityLevel ?? 'medium',
    urbanicity: agent.connectivityLevel === 'high' ? 'urban' : 'mixed',
    occupation_status: agent.agentType === 'student' ? 'student' : agent.agentType === 'retired' ? 'retired' : 'employed',
  } as SyntheticAgent));

  // Convertir preguntas al formato legacy
  const legacyQuestions: SurveyQuestion[] = surveyDefinition.questions.map(q => {
    if (q.options && q.options.length > 0) {
      return {
        id: q.id,
        text: q.text,
        type: 'single_choice',
        options: q.options.map((opt, idx) => ({
          id: `opt_${idx}`,
          label: opt,
          value: opt,
        })),
      } as SurveyQuestion;
    }
    return {
      id: q.id,
      text: q.text,
      type: 'likert_scale',
      min: 1,
      max: 5,
      labels: ['Muy en desacuerdo', 'En desacuerdo', 'Neutral', 'De acuerdo', 'Muy de acuerdo'],
      minLabel: 'Muy en desacuerdo',
      maxLabel: 'Muy de acuerdo',
      required: true,
    } as SurveyQuestion;
  });

  const legacyResponses = generateSurveyResponses(legacyAgents, legacyQuestions);

  const responses = legacyResponses.map((r) => ({
    surveyId: surveyDefinition.id,
    questionId: r.questionId,
    agentId: r.agentId,
    value: r.value !== null && r.value !== undefined ? String(r.value) : null,
    confidence: r.confidence,
    reasoning: r.reasoning,
    engineMode: 'legacy',
    engineVersion: 'legacy-v1',
  }));

  return {
    responses,
    durationMs: Date.now() - startTime,
    totalResponses: responses.length,
  };
}

function runCademSurveyWrapper(
  surveyDefinition: CademSurveyDefinition,
  agents: CademAdapterAgent[]
): SurveyResult {
  const startTime = Date.now();

  const rawResponses = runCademSurvey({
    surveyDefinition,
    agents,
    weekKey: '2026-W13',
    mode: 'cawi',
  });

  const responses = rawResponses.map((r) => ({
    surveyId: r.surveyId,
    questionId: r.questionId,
    agentId: r.agentId,
    value: r.value !== null && r.value !== undefined ? String(r.value) : null,
    confidence: r.confidence,
    reasoning: r.reasoning,
    engineMode: 'cadem',
    engineVersion: r.engineVersion,
  }));

  return {
    responses,
    durationMs: Date.now() - startTime,
    totalResponses: responses.length,
  };
}

function expectedOptionsForQuestion(questionId: string): string[] {
  switch (questionId) {
    case 'q_approval':
      return ['approve', 'disapprove', 'no_response'];

    case 'q_direction':
      return ['good_path', 'bad_path', 'no_response'];

    case 'q_optimism':
      return ['very_optimistic', 'optimistic', 'pessimistic', 'very_pessimistic', 'no_response'];

    case 'q_economy_national':
    case 'q_economy_personal':
      return ['very_good', 'good', 'bad', 'very_bad', 'no_response'];

    case 'q_ideology':
      return ['right', 'center_right', 'center', 'center_left', 'left', 'independent', 'no_response'];

    default:
      return ['unknown'];
  }
}

function averageConfidence(responses: any[]): string {
  if (!responses.length) return 'N/A';
  const avg =
    responses.reduce((sum, r) => sum + (typeof r.confidence === 'number' ? r.confidence : 0), 0) /
    responses.length;
  return avg.toFixed(3);
}

function generateComparisonReport(
  surveyA: CademSurveyDefinition,
  surveyB: CademSurveyDefinition,
  resultA: SurveyResult,
  resultB: SurveyResult,
): string {
  const lines: string[] = [];

  lines.push('# Reporte Comparativo A/B - Legacy vs CADEM (NORMALIZADO)');
  lines.push('');
  lines.push(`Fecha: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('> **Nota:** Las respuestas de ambos motores fueron normalizadas a una taxonomía canónica común antes de calcular distribuciones y diferencias.');
  lines.push('');
  lines.push('## Resumen Ejecutivo');
  lines.push('');
  lines.push('| Métrica | Encuesta A (Legacy) | Encuesta B (CADEM) |');
  lines.push('|---------|---------------------|---------------------|');
  lines.push(`| Tiempo ejecución | ${resultA.durationMs}ms | ${resultB.durationMs}ms |`);
  lines.push(`| Total respuestas | ${resultA.totalResponses} | ${resultB.totalResponses} |`);
  lines.push(`| Confidence promedio | ${averageConfidence(resultA.responses)} | ${averageConfidence(resultB.responses)} |`);
  lines.push('');

  lines.push('## Resultados por Pregunta (Valores Canónicos)');
  lines.push('');

  for (const question of surveyA.questions) {
    lines.push(`### ${question.id}: ${question.text.substring(0, 60)}...`);
    lines.push('');

    // Usar distribución canónica en lugar de raw
    const distA = calculateCanonicalDistribution(resultA.responses, question.id);
    const distB = calculateCanonicalDistribution(resultB.responses, question.id);

    // Usar opciones esperadas canónicas en lugar de todas las opciones raw
    const allOptions = expectedOptionsForQuestion(question.id);

    lines.push('| Opción | A (%) | B (%) | Diferencia (pp) |');
    lines.push('|--------|-------|-------|-----------------|');

    for (const option of allOptions) {
      const pctA = distA[option as keyof typeof distA] || 0;
      const pctB = distB[option as keyof typeof distB] || 0;
      const diff = pctB - pctA;
      const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
      lines.push(`| ${option} | ${pctA}% | ${pctB}% | ${diffStr} |`);
    }

    // Mostrar unknown si existe
    const unknownA = distA['unknown'] || 0;
    const unknownB = distB['unknown'] || 0;
    if (unknownA > 0 || unknownB > 0) {
      const diff = unknownB - unknownA;
      const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
      lines.push(`| unknown | ${unknownA}% | ${unknownB}% | ${diffStr} |`);
    }

    lines.push('');
  }

  lines.push('## Métricas Operativas');
  lines.push('');
  lines.push('| Métrica | A | B |');
  lines.push('|---------|---|---|');
  lines.push(`| Tiempo total | ${resultA.durationMs}ms | ${resultB.durationMs}ms |`);
  lines.push(`| Tiempo por respuesta | ${(resultA.durationMs / resultA.totalResponses).toFixed(4)}ms | ${(resultB.durationMs / resultB.totalResponses).toFixed(4)}ms |`);
  lines.push(`| Confidence promedio | ${averageConfidence(resultA.responses)} | ${averageConfidence(resultB.responses)} |`);

  return lines.join('\n');
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║      Comparación A/B CANÓNICA - Legacy vs CADEM v1.1        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const surveyARaw = await loadSurveyFromDB(SURVEY_A_ID);
  const surveyBRaw = await loadSurveyFromDB(SURVEY_B_ID);

  if (!surveyARaw || !surveyBRaw) {
    throw new Error('No se pudieron cargar las encuestas A/B');
  }

  const surveyA = normalizeSurveyDefinition(surveyARaw);
  const surveyB = normalizeSurveyDefinition(surveyBRaw);

  console.log(`✅ Encuesta A: ${surveyA.title} [Legacy]`);
  console.log(`✅ Encuesta B: ${surveyB.title} [CADEM]`);

  const agents = await loadRandomAgents(SAMPLE_SIZE);
  console.log(`✅ ${agents.length} agentes cargados`);

  console.log('\n🔄 Ejecutando Encuesta A con motor LEGACY...');
  const resultA = runLegacySurvey(surveyA, agents);
  console.log(`   ✅ Completado: ${resultA.totalResponses} respuestas en ${resultA.durationMs}ms`);

  console.log('\n🔄 Ejecutando Encuesta B con motor CADEM...');
  const resultB = runCademSurveyWrapper(surveyB, agents);
  console.log(`   ✅ Completado: ${resultB.totalResponses} respuestas en ${resultB.durationMs}ms`);

  const report = generateComparisonReport(surveyA, surveyB, resultA, resultB);

  const fs = await import('fs');
  const path = await import('path');
  const outputPath = path.join(process.cwd(), 'docs', 'cadem-v3', 'AB_COMPARISON_RESULTS_CANONICAL.md');
  fs.writeFileSync(outputPath, report);

  console.log(`\n✅ Reporte CANÓNICO guardado en: ${outputPath}`);
  console.log('\n📊 Resumen:');
  console.log(`   Legacy: ${resultA.durationMs}ms, confidence: ${averageConfidence(resultA.responses)}`);
  console.log(`   CADEM:  ${resultB.durationMs}ms, confidence: ${averageConfidence(resultB.responses)}`);
}

main().catch((error) => {
  console.error('❌ Error en comparación A/B:', error);
  process.exit(1);
});
