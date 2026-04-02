#!/usr/bin/env node
/**
 * Validación Funcional Fase A - Script de Validación con Runs Reales
 *
 * Valida el módulo analítico usando datos reales de ejecuciones de encuestas.
 * No modifica datos, solo lee y reporta.
 *
 * Uso:
 *   npx tsx scripts/validation/functional/validateWithRealRuns.ts --runId=<uuid>
 *   npx tsx scripts/validation/functional/validateWithRealRuns.ts --runIds=<uuid1,uuid2,uuid3>
 *   npx tsx scripts/validation/functional/validateWithRealRuns.ts --list
 *   npx tsx scripts/validation/functional/validateWithRealRuns.ts --last=<n>
 */

// IMPORTANTE: Cargar variables de entorno ANTES que cualquier otro import
import '../../utils/loadEnv';

import {
  analyzeSurveyResult,
  getMostPolarizedQuestions,
  getMostConsensusQuestions,
  getLowestConfidenceQuestions,
  type SurveyAnalysis,
} from '../../../src/app/survey/analysis/index';
import {
  getSurveyRunById,
  getSurveyResultsByRunId,
} from '../../../src/services/supabase/repositories/surveyRepository';
import { serviceClient } from '../../utils/serviceClient';

// ===========================================
// Tipos
// ===========================================

type ValidationStatus = 'OK' | 'WARNING' | 'ERROR';

interface ValidationResult {
  runId: string;
  status: ValidationStatus;
  runInfo: {
    surveyId: string | null;
    totalAgents: number;
    completedAt: string | null;
  } | null;
  analysis: SurveyAnalysis | null;
  warnings: string[];
  errors: string[];
}

// ===========================================
// Constantes
// ===========================================

const THRESHOLDS = {
  LOW_CONFIDENCE: 0.6,
  HIGH_NON_RESPONSE: 30, // 0-100 (según contrato DistributionMetrics)
  EXTREME_ENTROPY: 0.9,
  MIN_SUPPORTED_QUESTIONS: 1,
};

// ===========================================
// CLI Parser
// ===========================================

type CliMode = 'validate' | 'list' | 'last';

interface ParsedArgs {
  mode: CliMode;
  runIds: string[];
  lastCount: number;
  errors: string[];
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const runIds: string[] = [];
  const errors: string[] = [];
  let mode: CliMode = 'validate';
  let lastCount = 0;

  for (const arg of args) {
    if (arg === '--list') {
      mode = 'list';
    } else if (arg.startsWith('--last=')) {
      mode = 'last';
      const count = parseInt(arg.slice(7), 10);
      if (isNaN(count) || count <= 0) {
        errors.push(`Invalid --last value: ${arg.slice(7)}`);
      } else {
        lastCount = count;
      }
    } else if (arg.startsWith('--runId=')) {
      const id = arg.slice(8);
      if (isValidUUID(id)) {
        runIds.push(id);
      } else {
        errors.push(`Invalid UUID: ${id}`);
      }
    } else if (arg.startsWith('--runIds=')) {
      const ids = arg.slice(9).split(',');
      for (const id of ids) {
        const trimmed = id.trim();
        if (isValidUUID(trimmed)) {
          runIds.push(trimmed);
        } else {
          errors.push(`Invalid UUID: ${trimmed}`);
        }
      }
    }
  }

  return { mode, runIds, lastCount, errors };
}

function isValidUUID(str: string): boolean {
  // Acepta UUIDs v1-v5 (estructuralmente válidos)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// ===========================================
// Run Discovery
// ===========================================

interface RunInfo {
  id: string;
  surveyId: string;
  completedAt: string | null;
  totalAgents: number;
}

async function getRecentRuns(limit: number): Promise<RunInfo[]> {
  const { data, error } = await serviceClient
    .from('survey_runs')
    .select('id, survey_id, completed_at, sample_size_actual')
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ Error fetching runs:', error.message);
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    surveyId: r.survey_id,
    completedAt: r.completed_at,
    totalAgents: r.sample_size_actual || 0,
  }));
}

function printRunList(runs: RunInfo[]): void {
  console.log('\n' + '='.repeat(70));
  console.log('  AVAILABLE SURVEY RUNS');
  console.log('='.repeat(70));
  console.log(`  Found ${runs.length} run(s)\n`);

  if (runs.length === 0) {
    console.log('  No runs found in database.');
    console.log('='.repeat(70) + '\n');
    return;
  }

  // Header
  console.log('  ID                                    | Survey ID                             | Agents | Completed');
  console.log('  ' + '-'.repeat(68));

  // Rows
  for (const run of runs) {
    const id = run.id.substring(0, 36);
    const surveyId = run.surveyId ? run.surveyId.substring(0, 36) : 'N/A';
    const agents = run.totalAgents.toString().padStart(6, ' ');
    const completed = run.completedAt 
      ? new Date(run.completedAt).toLocaleString('es-CL', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'N/A';
    
    console.log(`  ${id} | ${surveyId} | ${agents} | ${completed}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('  Usage:');
  console.log('    npx tsx scripts/validation/functional/validateWithRealRuns.ts --runId=<id>');
  console.log('    npx tsx scripts/validation/functional/validateWithRealRuns.ts --last=3');
  console.log('='.repeat(70) + '\n');
}

// ===========================================
// Validación Principal
// ===========================================

async function validateRun(runId: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    runId,
    status: 'OK',
    runInfo: null,
    analysis: null,
    warnings: [],
    errors: [],
  };

  // 1. Obtener run
  const run = await getSurveyRunById(runId);
  if (!run) {
    result.status = 'ERROR';
    result.errors.push(`Run not found: ${runId}`);
    return result;
  }

  result.runInfo = {
    surveyId: run.surveyId,
    totalAgents: run.totalAgents,
    completedAt: run.completedAt,
  };

  // 2. Obtener resultados
  const surveyResult = await getSurveyResultsByRunId(runId);
  if (!surveyResult) {
    result.status = 'ERROR';
    result.errors.push(`No results found for run: ${runId}`);
    return result;
  }

  // 3. Ejecutar análisis
  try {
    result.analysis = analyzeSurveyResult(surveyResult, run);
  } catch (error) {
    result.status = 'ERROR';
    result.errors.push(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }

  // 4. Detectar anomalías
  detectAnomalies(result);

  // 5. Determinar status final
  if (result.errors.length > 0) {
    result.status = 'ERROR';
  } else if (result.warnings.length > 0) {
    result.status = 'WARNING';
  }

  return result;
}

function detectAnomalies(result: ValidationResult): void {
  if (!result.analysis) return;

  const { summary, globalMetrics } = result.analysis;

  // Anomalía: Confidence muy baja
  if (globalMetrics.averageConfidence < THRESHOLDS.LOW_CONFIDENCE) {
    result.warnings.push(
      `Low average confidence: ${(globalMetrics.averageConfidence * 100).toFixed(1)}% ` +
      `(threshold: ${(THRESHOLDS.LOW_CONFIDENCE * 100).toFixed(0)}%)`
    );
  }

  // Anomalía: Non-response rate alta
  if (globalMetrics.nonResponseRate > THRESHOLDS.HIGH_NON_RESPONSE) {
    result.warnings.push(
      `High non-response rate: ${globalMetrics.nonResponseRate.toFixed(1)}% ` +
      `(threshold: ${THRESHOLDS.HIGH_NON_RESPONSE}%)`
    );
  }

  // Anomalía: Sin preguntas soportadas
  if (summary.supportedQuestions < THRESHOLDS.MIN_SUPPORTED_QUESTIONS) {
    result.errors.push(
      `No supported questions: ${summary.supportedQuestions} ` +
      `(minimum: ${THRESHOLDS.MIN_SUPPORTED_QUESTIONS})`
    );
  }

  // Anomalía: Entropía extrema en todas las preguntas
  if (globalMetrics.averageEntropy > THRESHOLDS.EXTREME_ENTROPY) {
    result.warnings.push(
      `Extreme average entropy: ${globalMetrics.averageEntropy.toFixed(2)} ` +
      `(threshold: ${THRESHOLDS.EXTREME_ENTROPY})`
    );
  }

  // Anomalía: Inconsistencia en métricas
  if (summary.totalResponses === 0 && summary.supportedQuestions > 0) {
    result.errors.push('Inconsistency: supported questions but zero total responses');
  }
}

// ===========================================
// Report Formatter
// ===========================================

function printReport(results: ValidationResult[]): void {
  const total = results.length;
  const ok = results.filter(r => r.status === 'OK').length;
  const warnings = results.filter(r => r.status === 'WARNING').length;
  const errors = results.filter(r => r.status === 'ERROR').length;

  // HEADER
  console.log('\n' + '='.repeat(70));
  console.log('  SURVEY ANALYSIS VALIDATION - FASE A');
  console.log('  Functional Validation with Real Runs');
  console.log('='.repeat(70));
  console.log(`  Total runs: ${total} | OK: ${ok} | WARNING: ${warnings} | ERROR: ${errors}`);
  console.log('='.repeat(70) + '\n');

  // Por cada run
  for (const result of results) {
    printRunReport(result);
  }

  // FINAL SUMMARY
  console.log('\n' + '='.repeat(70));
  console.log('  FINAL STATUS');
  console.log('='.repeat(70));
  console.log(`  Overall: ${errors > 0 ? 'ERROR' : warnings > 0 ? 'WARNING' : 'OK'}`);
  console.log(`  Runs validated: ${total}`);
  console.log(`  Successful: ${ok}`);
  console.log(`  With warnings: ${warnings}`);
  console.log(`  With errors: ${errors}`);
  console.log('='.repeat(70) + '\n');
}

function printRunReport(result: ValidationResult): void {
  const statusIcon = result.status === 'OK' ? '✓' : result.status === 'WARNING' ? '⚠' : '✗';

  // RUN INFO
  console.log('-'.repeat(70));
  console.log(`  RUN: ${result.runId}`);
  console.log(`  STATUS: ${statusIcon} ${result.status}`);
  console.log('-'.repeat(70));

  if (!result.runInfo) {
    console.log('  Run info: Not available');
    if (result.errors.length > 0) {
      console.log('\n  ERRORS:');
      result.errors.forEach(e => console.log(`    ✗ ${e}`));
    }
    console.log('');
    return;
  }

  console.log(`  Survey ID: ${result.runInfo.surveyId || 'N/A'}`);
  console.log(`  Total agents: ${result.runInfo.totalAgents}`);
  console.log(`  Completed: ${result.runInfo.completedAt || 'N/A'}`);

  if (!result.analysis) {
    console.log('\n  Analysis: Not available');
    if (result.errors.length > 0) {
      console.log('\n  ERRORS:');
      result.errors.forEach(e => console.log(`    ✗ ${e}`));
    }
    console.log('');
    return;
  }

  // GLOBAL METRICS
  console.log('\n  GLOBAL METRICS:');
  const { summary, globalMetrics } = result.analysis;
  console.log(`    Total questions: ${summary.totalQuestions}`);
  console.log(`    Supported questions: ${summary.supportedQuestions}`);
  console.log(`    Total responses: ${summary.totalResponses}`);
  console.log(`    Average confidence: ${(globalMetrics.averageConfidence * 100).toFixed(1)}%`);
  console.log(`    Average entropy: ${globalMetrics.averageEntropy.toFixed(3)}`);
  console.log(`    Non-response rate: ${(globalMetrics.nonResponseRate * 100).toFixed(1)}%`);
  console.log(`    Questions with dominance: ${globalMetrics.questionsWithDominance}`);
  console.log(`    Questions with polarization: ${globalMetrics.questionsWithPolarization}`);

  // TOP QUESTIONS
  console.log('\n  TOP QUESTIONS:');

  // Más polarizadas
  const polarized = getMostPolarizedQuestions(result.analysis, 3);
  if (polarized.length > 0) {
    console.log('    Most polarized:');
    polarized.forEach((q, i) => {
      const text = q.questionText.length > 40 ? q.questionText.substring(0, 40) + '...' : q.questionText;
      console.log(`      ${i + 1}. "${text}" (entropy: ${q.metrics?.entropy.toFixed(3)})`);
    });
  } else {
    console.log('    Most polarized: None detected');
  }

  // Mayor consenso
  const consensus = getMostConsensusQuestions(result.analysis, 3);
  if (consensus.length > 0) {
    console.log('    Most consensus:');
    consensus.forEach((q, i) => {
      const text = q.questionText.length > 40 ? q.questionText.substring(0, 40) + '...' : q.questionText;
      console.log(`      ${i + 1}. "${text}" (${q.metrics?.dominantPercentage.toFixed(1)}% dominant)`);
    });
  } else {
    console.log('    Most consensus: None detected');
  }

  // Menor confidence
  const lowConfidence = getLowestConfidenceQuestions(result.analysis, 3);
  if (lowConfidence.length > 0) {
    console.log('    Lowest confidence:');
    lowConfidence.forEach((q, i) => {
      const text = q.questionText.length > 40 ? q.questionText.substring(0, 40) + '...' : q.questionText;
      console.log(`      ${i + 1}. "${text}" (${((q.metrics?.averageConfidence ?? 0) * 100).toFixed(1)}% confidence)`);
    });
  } else {
    console.log('    Lowest confidence: None detected');
  }

  // WARNINGS
  if (result.warnings.length > 0) {
    console.log('\n  WARNINGS:');
    result.warnings.forEach(w => console.log(`    ⚠ ${w}`));
  }

  // ERRORS
  if (result.errors.length > 0) {
    console.log('\n  ERRORS:');
    result.errors.forEach(e => console.log(`    ✗ ${e}`));
  }

  console.log('');
}

// ===========================================
// Main
// ===========================================

async function main(): Promise<void> {
  console.log('\n🔍 Survey Analysis Validation - Fase A\n');

  const { mode, runIds, lastCount, errors: parseErrors } = parseArgs();

  if (parseErrors.length > 0) {
    console.log('❌ Invalid arguments:');
    parseErrors.forEach(e => console.log(`   ${e}`));
    printUsage();
    process.exit(1);
  }

  // Handle --list mode
  if (mode === 'list') {
    const runs = await getRecentRuns(10);
    printRunList(runs);
    process.exit(0);
  }

  // Handle --last mode
  if (mode === 'last') {
    if (lastCount <= 0) {
      console.log('❌ Invalid --last value');
      printUsage();
      process.exit(1);
    }
    
    console.log(`📋 Fetching last ${lastCount} runs...\n`);
    const runs = await getRecentRuns(lastCount);
    
    if (runs.length === 0) {
      console.log('❌ No runs found in database');
      process.exit(1);
    }

    printRunList(runs);
    
    // Automatically validate the fetched runs
    console.log(`\n🔍 Validating ${runs.length} run(s)...\n`);
    const results: ValidationResult[] = [];

    for (const run of runs) {
      try {
        const result = await validateRun(run.id);
        results.push(result);
      } catch (error) {
        results.push({
          runId: run.id,
          status: 'ERROR',
          runInfo: null,
          analysis: null,
          warnings: [],
          errors: [`Unexpected error: ${error instanceof Error ? error.message : String(error)}`],
        });
      }
    }

    printReport(results);

    // Exit code basado en resultados
    const hasErrors = results.some(r => r.status === 'ERROR');
    process.exit(hasErrors ? 1 : 0);
  }

  // Validate mode (default)
  if (runIds.length === 0) {
    console.log('❌ No run IDs provided');
    printUsage();
    process.exit(1);
  }

  console.log(`Validating ${runIds.length} run(s)...\n`);

  const results: ValidationResult[] = [];

  for (const runId of runIds) {
    try {
      const result = await validateRun(runId);
      results.push(result);
    } catch (error) {
      results.push({
        runId,
        status: 'ERROR',
        runInfo: null,
        analysis: null,
        warnings: [],
        errors: [`Unexpected error: ${error instanceof Error ? error.message : String(error)}`],
      });
    }
  }

  printReport(results);

  // Exit code basado en resultados
  const hasErrors = results.some(r => r.status === 'ERROR');
  process.exit(hasErrors ? 1 : 0);
}

function printUsage(): void {
  console.log('\nUsage:');
  console.log('  npx tsx scripts/validation/functional/validateWithRealRuns.ts --runId=<uuid>');
  console.log('  npx tsx scripts/validation/functional/validateWithRealRuns.ts --runIds=<uuid1,uuid2,uuid3>');
  console.log('  npx tsx scripts/validation/functional/validateWithRealRuns.ts --list');
  console.log('  npx tsx scripts/validation/functional/validateWithRealRuns.ts --last=<n>');
}

// Ejecutar
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
