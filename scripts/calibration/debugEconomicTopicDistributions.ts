/**
 * Script para inspeccionar la distribución real de topic states económicos
 * antes de que pasen por el resolver.
 *
 * Objetivo: Entender dónde están cayendo los scores de economy_national y economy_personal
 */

import { createClient } from '@supabase/supabase-js';
import { buildInitialTopicStates, TopicStateSeedAgent } from '../../src/app/opinionEngine/topicStateSeed';
import { TopicState } from '../../src/app/opinionEngine/types';

// Configuración
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const SAMPLE_SIZE = 1000;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY requeridas');
  process.exit(1);
}

// Interfaces - solo columnas que sabemos que existen
interface AgentFromDB {
  id: string;
  age?: number;
  sex?: string;
  education_level?: string;
  income_decile?: number;
  poverty_status?: string;
  region_code?: string;
  comuna_code?: string;
  // Columnas opcionales que pueden no existir
  connectivity_level?: string;
  digital_exposure?: string;
  preferred_channel?: string;
  agent_type?: string;
}

interface DistributionStats {
  mean: number;
  median: number;
  min: number;
  max: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

interface BucketCount {
  range: string;
  count: number;
  percentage: number;
}

// Utilidades estadísticas
function calculatePercentile(sortedArray: number[], percentile: number): number {
  const index = (percentile / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (upper >= sortedArray.length) return sortedArray[lower];
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

function calculateStats(scores: number[]): DistributionStats {
  const sorted = [...scores].sort((a, b) => a - b);
  const sum = scores.reduce((a, b) => a + b, 0);

  return {
    mean: sum / scores.length,
    median: calculatePercentile(sorted, 50),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p10: calculatePercentile(sorted, 10),
    p25: calculatePercentile(sorted, 25),
    p50: calculatePercentile(sorted, 50),
    p75: calculatePercentile(sorted, 75),
    p90: calculatePercentile(sorted, 90),
  };
}

function calculateBuckets(scores: number[]): BucketCount[] {
  const buckets = [
    { range: '[-1.00, -0.75)', min: -1.0, max: -0.75, count: 0 },
    { range: '[-0.75, -0.50)', min: -0.75, max: -0.5, count: 0 },
    { range: '[-0.50, -0.25)', min: -0.5, max: -0.25, count: 0 },
    { range: '[-0.25,  0.00)', min: -0.25, max: 0, count: 0 },
    { range: '[ 0.00,  0.25)', min: 0, max: 0.25, count: 0 },
    { range: '[ 0.25,  0.50)', min: 0.25, max: 0.5, count: 0 },
    { range: '[ 0.50,  0.75)', min: 0.5, max: 0.75, count: 0 },
    { range: '[ 0.75,  1.00]', min: 0.75, max: 1.0, count: 0 },
  ];

  for (const score of scores) {
    for (const bucket of buckets) {
      if (score >= bucket.min && score < bucket.max) {
        bucket.count++;
        break;
      }
      // Caso especial para el último bucket (incluye 1.0)
      if (bucket.max === 1.0 && score >= bucket.min && score <= bucket.max) {
        bucket.count++;
        break;
      }
    }
  }

  const total = scores.length;
  return buckets.map(b => ({
    range: b.range,
    count: b.count,
    percentage: (b.count / total) * 100,
  }));
}

function printHistogram(buckets: BucketCount[], title: string): void {
  console.log(`\n${title}`);
  console.log('='.repeat(50));

  const maxCount = Math.max(...buckets.map(b => b.count));
  const barWidth = 40;

  for (const bucket of buckets) {
    const barLength = maxCount > 0 ? Math.round((bucket.count / maxCount) * barWidth) : 0;
    const bar = '█'.repeat(barLength);
    const label = bucket.range.padEnd(15);
    const countStr = `${bucket.count}`.padStart(4);
    const pctStr = `(${bucket.percentage.toFixed(1)}%)`.padStart(7);
    console.log(`${label} ${bar} ${countStr} ${pctStr}`);
  }
}

function printStats(stats: DistributionStats, title: string): void {
  console.log(`\n${title}`);
  console.log('='.repeat(50));
  console.log(`  Mean:   ${stats.mean.toFixed(4)}`);
  console.log(`  Median: ${stats.median.toFixed(4)}`);
  console.log(`  Min:    ${stats.min.toFixed(4)}`);
  console.log(`  Max:    ${stats.max.toFixed(4)}`);
  console.log(`  P10:    ${stats.p10.toFixed(4)}`);
  console.log(`  P25:    ${stats.p25.toFixed(4)}`);
  console.log(`  P50:    ${stats.p50.toFixed(4)}`);
  console.log(`  P75:    ${stats.p75.toFixed(4)}`);
  console.log(`  P90:    ${stats.p90.toFixed(4)}`);
}

// Mapeo de agente DB a formato del motor
function mapAgentToSeedFormat(agent: AgentFromDB): TopicStateSeedAgent {
  return {
    age: agent.age,
    sex: agent.sex,
    educationLevel: agent.education_level,
    incomeDecile: agent.income_decile,
    povertyStatus: agent.poverty_status,
    regionCode: agent.region_code,
    communeCode: agent.comuna_code,
    // Usar valores por defecto si no existen las columnas
    connectivityLevel: agent.connectivity_level || 'medium',
    digitalExposure: agent.digital_exposure || 'medium',
    preferredChannel: agent.preferred_channel,
    agentType: agent.agent_type,
  };
}

// Función principal
async function main() {
  console.log('================================================================================');
  console.log('DEBUG: DISTRIBUCIÓN DE TOPIC STATES ECONÓMICOS');
  console.log('================================================================================');
  console.log(`Sample size: ${SAMPLE_SIZE}`);
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log('');

  // Crear cliente Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Verificar conexión
  const { error: connError } = await supabase.from('synthetic_agents').select('id').limit(1);
  if (connError) {
    console.error('❌ Error de conexión:', connError.message);
    process.exit(1);
  }
  console.log('✅ Conexión exitosa');

  // Cargar agentes - solo columnas básicas que sabemos que existen
  console.log(`\n📥 Cargando ${SAMPLE_SIZE} agentes desde Supabase...`);
  const { data: agents, error } = await supabase
    .from('synthetic_agents')
    .select('id, age, sex, education_level, income_decile, poverty_status, region_code, comuna_code')
    .limit(SAMPLE_SIZE);

  if (error) {
    console.error('❌ Error cargando agentes:', error.message);
    process.exit(1);
  }

  if (!agents || agents.length === 0) {
    console.error('❌ No se encontraron agentes');
    process.exit(1);
  }

  console.log(`✅ Cargados ${agents.length} agentes`);

  // Generar topic states y extraer scores económicos
  console.log('\n🎲 Generando topic states con buildInitialTopicStates()...');

  const economyNationalScores: number[] = [];
  const economyPersonalScores: number[] = [];

  for (const agent of agents as AgentFromDB[]) {
    const seedAgent = mapAgentToSeedFormat(agent);
    const topicStates = buildInitialTopicStates(seedAgent);

    const nationalState = topicStates.find(ts => ts.topic === 'economy_national');
    const personalState = topicStates.find(ts => ts.topic === 'economy_personal');

    if (nationalState) {
      economyNationalScores.push(nationalState.score);
    }
    if (personalState) {
      economyPersonalScores.push(personalState.score);
    }
  }

  console.log(`✅ Procesados ${economyNationalScores.length} scores de economy_national`);
  console.log(`✅ Procesados ${economyPersonalScores.length} scores de economy_personal`);

  // Calcular estadísticas
  const nationalStats = calculateStats(economyNationalScores);
  const personalStats = calculateStats(economyPersonalScores);

  const nationalBuckets = calculateBuckets(economyNationalScores);
  const personalBuckets = calculateBuckets(economyPersonalScores);

  // Imprimir resultados
  console.log('\n');
  console.log('################################################################################');
  console.log('#                         RESULTADOS ECONOMY_NATIONAL                          #');
  console.log('################################################################################');

  printStats(nationalStats, 'ESTADÍSTICAS: economy_national');
  printHistogram(nationalBuckets, 'HISTOGRAMA: economy_national');

  console.log('\n');
  console.log('################################################################################');
  console.log('#                         RESULTADOS ECONOMY_PERSONAL                          #');
  console.log('################################################################################');

  printStats(personalStats, 'ESTADÍSTICAS: economy_personal');
  printHistogram(personalBuckets, 'HISTOGRAMA: economy_personal');

  // Análisis comparativo
  console.log('\n');
  console.log('################################################################################');
  console.log('#                         ANÁLISIS COMPARATIVO                                 #');
  console.log('################################################################################');

  const nationalPositive = economyNationalScores.filter(s => s > 0).length;
  const personalPositive = economyPersonalScores.filter(s => s > 0).length;

  console.log(`\nScores > 0 (positivos):`);
  console.log(`  economy_national: ${nationalPositive}/${economyNationalScores.length} (${((nationalPositive/economyNationalScores.length)*100).toFixed(1)}%)`);
  console.log(`  economy_personal: ${personalPositive}/${economyPersonalScores.length} (${((personalPositive/economyPersonalScores.length)*100).toFixed(1)}%)`);

  console.log(`\nDiferencia de medias:`);
  console.log(`  economy_personal - economy_national = ${(personalStats.mean - nationalStats.mean).toFixed(4)}`);

  console.log(`\nRangos:`);
  console.log(`  economy_national: [${nationalStats.min.toFixed(2)}, ${nationalStats.max.toFixed(2)}]`);
  console.log(`  economy_personal: [${personalStats.min.toFixed(2)}, ${personalStats.max.toFixed(2)}]`);

  console.log('\n================================================================================');
  console.log('DEBUG COMPLETADO');
  console.log('================================================================================');
}

main().catch(err => {
  console.error('❌ Error inesperado:', err);
  process.exit(1);
});
