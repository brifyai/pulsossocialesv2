/**
 * Script de auditoría de cobertura de estados de agentes
 * Solo lectura - no modifica datos
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Configuración desde variables de entorno
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

interface StateCoverage {
  tableName: string;
  exists: boolean;
  totalRows: number;
  uniqueAgents: number;
  avgStatesPerAgent: number;
  topTopics: Array<{ topic: string; count: number }>;
  error?: string;
}

interface AuditResult {
  totalAgents: number;
  agentsWithTopicState: number;
  agentsWithPanelState: number;
  topicStateCoverage: StateCoverage | null;
  panelStateCoverage: StateCoverage | null;
  agentsWithoutState: number;
  timestamp: string;
}

async function auditTopicState(
  supabase: ReturnType<typeof createClient>,
  totalAgents: number
): Promise<StateCoverage> {
  console.log('\n📋 Auditando agent_topic_state');

  try {
    // Verificar si la tabla existe
    const { count, error: countError } = await supabase
      .from('agent_topic_state')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      if (countError.message.includes('does not exist') || countError.code === '42P01') {
        return {
          tableName: 'agent_topic_state',
          exists: false,
          totalRows: 0,
          uniqueAgents: 0,
          avgStatesPerAgent: 0,
          topTopics: [],
          error: 'Tabla no existe',
        };
      }
      throw countError;
    }

    const totalRows = count || 0;

    // Contar agentes únicos
    const { data: uniqueData, error: uniqueError } = await supabase
      .from('agent_topic_state')
      .select('agent_id');

    if (uniqueError) {
      throw uniqueError;
    }

    const uniqueAgentIds = new Set(uniqueData?.map(row => row.agent_id) || []);
    const uniqueAgents = uniqueAgentIds.size;

    // Calcular promedio de estados por agente
    const avgStatesPerAgent = uniqueAgents > 0 ? Math.round((totalRows / uniqueAgents) * 10) / 10 : 0;

    // Top topics
    const { data: topicData, error: topicError } = await supabase
      .from('agent_topic_state')
      .select('topic');

    if (topicError) {
      throw topicError;
    }

    const topicCounts: Record<string, number> = {};
    for (const row of topicData || []) {
      const topic = row.topic;
      if (topic) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      }
    }

    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    console.log(`  ✅ ${totalRows} filas, ${uniqueAgents} agentes únicos`);
    console.log(`  📊 Promedio: ${avgStatesPerAgent} estados por agente`);

    return {
      tableName: 'agent_topic_state',
      exists: true,
      totalRows,
      uniqueAgents,
      avgStatesPerAgent,
      topTopics,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`  ❌ Error: ${message}`);

    return {
      tableName: 'agent_topic_state',
      exists: false,
      totalRows: 0,
      uniqueAgents: 0,
      avgStatesPerAgent: 0,
      topTopics: [],
      error: message,
    };
  }
}

async function auditPanelState(
  supabase: ReturnType<typeof createClient>,
  totalAgents: number
): Promise<StateCoverage> {
  console.log('\n📋 Auditando agent_panel_state');

  try {
    // Verificar si la tabla existe
    const { count, error: countError } = await supabase
      .from('agent_panel_state')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      if (countError.message.includes('does not exist') || countError.code === '42P01') {
        return {
          tableName: 'agent_panel_state',
          exists: false,
          totalRows: 0,
          uniqueAgents: 0,
          avgStatesPerAgent: 0,
          topTopics: [],
          error: 'Tabla no existe',
        };
      }
      throw countError;
    }

    const totalRows = count || 0;

    // Contar agentes únicos
    const { data: uniqueData, error: uniqueError } = await supabase
      .from('agent_panel_state')
      .select('agent_id');

    if (uniqueError) {
      throw uniqueError;
    }

    const uniqueAgentIds = new Set(uniqueData?.map(row => row.agent_id) || []);
    const uniqueAgents = uniqueAgentIds.size;

    // Calcular promedio (en panel state suele ser 1 por agente)
    const avgStatesPerAgent = uniqueAgents > 0 ? Math.round((totalRows / uniqueAgents) * 10) / 10 : 0;

    console.log(`  ✅ ${totalRows} filas, ${uniqueAgents} agentes únicos`);

    return {
      tableName: 'agent_panel_state',
      exists: true,
      totalRows,
      uniqueAgents,
      avgStatesPerAgent,
      topTopics: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`  ❌ Error: ${message}`);

    return {
      tableName: 'agent_panel_state',
      exists: false,
      totalRows: 0,
      uniqueAgents: 0,
      avgStatesPerAgent: 0,
      topTopics: [],
      error: message,
    };
  }
}

function generateReport(result: AuditResult): string {
  let report = `# Auditoría de Cobertura de Estados de Agentes\n\n`;
  report += `**Fecha:** ${result.timestamp}\n\n`;
  report += `---\n\n`;

  // Resumen general
  report += `## Resumen General\n\n`;
  report += `- **Total de agentes:** ${result.totalAgents.toLocaleString()}\n`;
  report += `- **Agentes con topic_state:** ${result.agentsWithTopicState.toLocaleString()} (${Math.round((result.agentsWithTopicState / result.totalAgents) * 1000) / 10}%)\n`;
  report += `- **Agentes con panel_state:** ${result.agentsWithPanelState.toLocaleString()} (${Math.round((result.agentsWithPanelState / result.totalAgents) * 1000) / 10}%)\n`;
  report += `- **Agentes sin estado:** ${result.agentsWithoutState.toLocaleString()} (${Math.round((result.agentsWithoutState / result.totalAgents) * 1000) / 10}%)\n\n`;

  // Topic State
  if (result.topicStateCoverage) {
    report += `## Agent Topic State\n\n`;

    if (result.topicStateCoverage.exists) {
      report += `- **Estado:** ✅ Existe\n`;
      report += `- **Filas totales:** ${result.topicStateCoverage.totalRows.toLocaleString()}\n`;
      report += `- **Agentes únicos:** ${result.topicStateCoverage.uniqueAgents.toLocaleString()}\n`;
      report += `- **Promedio de estados por agente:** ${result.topicStateCoverage.avgStatesPerAgent}\n\n`;

      if (result.topicStateCoverage.topTopics.length > 0) {
        report += `### Topics más frecuentes\n\n`;
        report += `| Topic | Cantidad |\n`;
        report += `|-------|----------|\n`;

        for (const topic of result.topicStateCoverage.topTopics) {
          report += `| ${topic.topic} | ${topic.count.toLocaleString()} |\n`;
        }

        report += `\n`;
      }
    } else {
      report += `- **Estado:** ❌ No existe\n`;
      report += `- **Error:** ${result.topicStateCoverage.error}\n\n`;
    }
  }

  // Panel State
  if (result.panelStateCoverage) {
    report += `## Agent Panel State\n\n`;

    if (result.panelStateCoverage.exists) {
      report += `- **Estado:** ✅ Existe\n`;
      report += `- **Filas totales:** ${result.panelStateCoverage.totalRows.toLocaleString()}\n`;
      report += `- **Agentes únicos:** ${result.panelStateCoverage.uniqueAgents.toLocaleString()}\n`;
      report += `- **Promedio de estados por agente:** ${result.panelStateCoverage.avgStatesPerAgent}\n\n`;
    } else {
      report += `- **Estado:** ❌ No existe\n`;
      report += `- **Error:** ${result.panelStateCoverage.error}\n\n`;
    }
  }

  return report;
}

async function main(): Promise<void> {
  console.log('='.repeat(80));
  console.log('AUDITORÍA DE COBERTURA DE ESTADOS DE AGENTES');
  console.log('='.repeat(80));

  // Validar configuración
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Error: Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY requeridas');
    process.exit(1);
  }

  console.log(`\n🔗 Conectando a: ${SUPABASE_URL}`);

  // Crear cliente
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Obtener total de agentes
  const { count: totalAgents, error: agentsError } = await supabase
    .from('synthetic_agents')
    .select('*', { count: 'exact', head: true });

  if (agentsError) {
    console.error(`❌ Error obteniendo total de agentes: ${agentsError.message}`);
    process.exit(1);
  }

  const totalAgentsCount = totalAgents || 0;
  console.log(`✅ Total de agentes: ${totalAgentsCount.toLocaleString()}\n`);

  // Auditar topic state
  const topicStateCoverage = await auditTopicState(supabase, totalAgentsCount);

  // Auditar panel state
  const panelStateCoverage = await auditPanelState(supabase, totalAgentsCount);

  // Calcular agentes sin estado
  const agentsWithTopicState = topicStateCoverage?.uniqueAgents || 0;
  const agentsWithPanelState = panelStateCoverage?.uniqueAgents || 0;
  const agentsWithAnyState = Math.max(agentsWithTopicState, agentsWithPanelState);
  const agentsWithoutState = totalAgentsCount - agentsWithAnyState;

  // Generar resultado
  const result: AuditResult = {
    totalAgents: totalAgentsCount,
    agentsWithTopicState,
    agentsWithPanelState,
    topicStateCoverage,
    panelStateCoverage,
    agentsWithoutState,
    timestamp: new Date().toISOString(),
  };

  // Generar reporte
  console.log('\n' + '='.repeat(80));
  console.log('GENERANDO REPORTE');
  console.log('='.repeat(80));

  const report = generateReport(result);

  // Guardar reporte
  const outputDir = path.resolve('docs/cadem-v3');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'AGENT_STATE_COVERAGE_AUDIT.md');
  fs.writeFileSync(outputPath, report, 'utf-8');

  console.log(`\n✅ Reporte guardado en: ${outputPath}`);

  // Resumen en consola
  console.log('\n' + '='.repeat(80));
  console.log('RESUMEN');
  console.log('='.repeat(80));
  console.log(`\nTotal de agentes: ${totalAgentsCount.toLocaleString()}`);
  console.log(`Agentes con topic_state: ${agentsWithTopicState.toLocaleString()} (${Math.round((agentsWithTopicState / totalAgentsCount) * 100)}%)`);
  console.log(`Agentes con panel_state: ${agentsWithPanelState.toLocaleString()} (${Math.round((agentsWithPanelState / totalAgentsCount) * 100)}%)`);
  console.log(`Agentes sin estado: ${agentsWithoutState.toLocaleString()} (${Math.round((agentsWithoutState / totalAgentsCount) * 100)}%)`);

  if (topicStateCoverage?.exists && topicStateCoverage.topTopics.length > 0) {
    console.log('\nTop topics:');
    for (const topic of topicStateCoverage.topTopics.slice(0, 5)) {
      console.log(`  - ${topic.topic}: ${topic.count.toLocaleString()}`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
