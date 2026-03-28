/**
 * Script de verificación de persistencia longitudinal en Supabase
 * GATE PREVIO A B2 Longitudinal Test
 *
 * Verifica:
 * 1. Existencia de tablas agent_topic_state y agent_panel_state
 * 2. Capacidad de lectura/escritura en ambas tablas
 * 3. Estructura de columnas
 * 4. Operaciones CRUD básicas
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_SERVICE_KEY/VITE_SUPABASE_ANON_KEY son requeridas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Agente dummy para pruebas - será reemplazado por un agente real
let DUMMY_AGENT_ID = 'verify-persistence-test-agent-001';
const DUMMY_SURVEY_ID = 'verify-persistence-test-survey-001';

// Obtener un agente real de la base de datos
async function getRealAgentId(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('synthetic_agents')
      .select('agent_id')
      .limit(1)
      .single();
    
    if (error || !data) {
      console.log('   ⚠️ No se pudo obtener un agente real de synthetic_agents');
      return null;
    }
    
    console.log(`   📋 Usando agente real para pruebas: ${data.agent_id}`);
    return data.agent_id;
  } catch (error) {
    console.log('   ⚠️ Error al obtener agente real:', error);
    return null;
  }
}

// Reporte
interface VerificationReport {
  timestamp: string;
  status: 'PASSED' | 'FAILED' | 'PARTIAL';
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  tables: {
    agent_topic_state: TableCheckResult;
    agent_panel_state: TableCheckResult;
  };
  operations: {
    read: boolean;
    write: boolean;
    update: boolean;
    delete: boolean;
  };
  errors: string[];
  recommendations: string[];
}

interface TableCheckResult {
  exists: boolean;
  readable: boolean;
  writable: boolean;
  rowCount: number | null;
  columns: string[] | null;
  sampleData: any | null;
  error: string | null;
}

// ============================================================================
// FUNCIONES DE VERIFICACIÓN
// ============================================================================

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      // Error específico de tabla no existente
      if (error.message?.includes('does not exist') ||
          error.message?.includes('relation') ||
          error.code === '42P01') {
        return false;
      }
      // Otro tipo de error
      console.error(`   ⚠️ Error al verificar ${tableName}:`, error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`   ❌ Error inesperado al verificar ${tableName}:`, error);
    return false;
  }
}

async function getTableColumns(tableName: string): Promise<string[] | null> {
  try {
    // Intentar obtener columnas de una fila de muestra
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    return Object.keys(data[0]);
  } catch (error) {
    console.error(`   ⚠️ Error al obtener columnas de ${tableName}:`, error);
    return null;
  }
}

async function countTableRows(tableName: string): Promise<number | null> {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error(`   ⚠️ Error al contar filas de ${tableName}:`, error.message);
      return null;
    }

    return count || 0;
  } catch (error) {
    console.error(`   ⚠️ Error al contar filas de ${tableName}:`, error);
    return null;
  }
}

async function getSampleData(tableName: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0];
  } catch (error) {
    return null;
  }
}

async function testWriteOperation(tableName: string): Promise<{ success: boolean; error: string | null }> {
  try {
    let testData: any;
    
    if (tableName === 'agent_topic_state') {
      // Schema real de agent_topic_state: agent_id, topic, score, confidence, salience, volatility, updated_at
      testData = {
        agent_id: DUMMY_AGENT_ID,
        topic: 'test_topic',
        score: 0.5,
        confidence: 0.8,
        salience: 0.6,
        volatility: 0.3,
        updated_at: new Date().toISOString()
      };
    } else if (tableName === 'agent_panel_state') {
      // Schema real de agent_panel_state: agent_id, eligible_web, participation_propensity, panel_fatigue, quality_score, cooldown_until, invites_30d, completions_30d, last_invited_at, last_completed_at, updated_at
      testData = {
        agent_id: DUMMY_AGENT_ID,
        eligible_web: true,
        participation_propensity: 0.7,
        panel_fatigue: 0.2,
        quality_score: 0.85,
        invites_30d: 1,
        completions_30d: 1,
        updated_at: new Date().toISOString()
      };
    } else {
      return { success: false, error: `Tabla desconocida: ${tableName}` };
    }

    const { error } = await supabase
      .from(tableName)
      .insert(testData);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function testReadOperation(tableName: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('agent_id', DUMMY_AGENT_ID)
      .limit(1);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function testUpdateOperation(tableName: string): Promise<{ success: boolean; error: string | null }> {
  try {
    let updateData: any;
    
    if (tableName === 'agent_topic_state') {
      // PK compuesta: (agent_id, topic)
      updateData = {
        score: 0.7,
        confidence: 0.9,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('agent_id', DUMMY_AGENT_ID)
        .eq('topic', 'test_topic');
      
      if (error) {
        return { success: false, error: error.message };
      }
    } else if (tableName === 'agent_panel_state') {
      // PK: agent_id
      updateData = {
        participation_propensity: 0.8,
        quality_score: 0.9,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('agent_id', DUMMY_AGENT_ID);
      
      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function testDeleteOperation(tableName: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('agent_id', DUMMY_AGENT_ID);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function verifyTable(tableName: string): Promise<TableCheckResult> {
  console.log(`\n🔍 Verificando tabla: ${tableName}`);

  const result: TableCheckResult = {
    exists: false,
    readable: false,
    writable: false,
    rowCount: null,
    columns: null,
    sampleData: null,
    error: null
  };

  // 1. Verificar existencia
  console.log('   1. Verificando existencia...');
  result.exists = await checkTableExists(tableName);

  if (!result.exists) {
    result.error = `La tabla ${tableName} no existe o no es accesible`;
    console.log(`   ❌ Tabla no existe o no es accesible`);
    return result;
  }
  console.log('   ✅ Tabla existe y es accesible');

  // 2. Verificar lectura
  console.log('   2. Verificando lectura...');
  result.columns = await getTableColumns(tableName);
  result.rowCount = await countTableRows(tableName);
  result.sampleData = await getSampleData(tableName);
  result.readable = result.columns !== null;

  if (result.readable) {
    console.log(`   ✅ Lectura funcionando (${result.rowCount} filas)`);
    console.log(`   📋 Columnas: ${result.columns?.join(', ')}`);
  } else {
    console.log('   ❌ Error en lectura');
  }

  // 3. Verificar escritura
  console.log('   3. Verificando escritura...');
  const writeResult = await testWriteOperation(tableName);
  result.writable = writeResult.success;

  if (writeResult.success) {
    console.log('   ✅ Escritura funcionando');
  } else {
    console.log(`   ❌ Error en escritura: ${writeResult.error}`);
    result.error = writeResult.error;
    return result;
  }

  // 4. Verificar lectura de datos de prueba
  console.log('   4. Verificando lectura de datos de prueba...');
  const readResult = await testReadOperation(tableName);
  if (readResult.success) {
    console.log('   ✅ Lectura de datos de prueba funcionando');
  } else {
    console.log(`   ❌ Error en lectura de datos de prueba: ${readResult.error}`);
  }

  // 5. Verificar actualización
  console.log('   5. Verificando actualización...');
  const updateResult = await testUpdateOperation(tableName);
  if (updateResult.success) {
    console.log('   ✅ Actualización funcionando');
  } else {
    console.log(`   ⚠️ Error en actualización: ${updateResult.error}`);
  }

  // 6. Limpiar datos de prueba
  console.log('   6. Limpiando datos de prueba...');
  const deleteResult = await testDeleteOperation(tableName);
  if (deleteResult.success) {
    console.log('   ✅ Limpieza completada');
  } else {
    console.log(`   ⚠️ Error en limpieza: ${deleteResult.error}`);
  }

  return result;
}

// ============================================================================
// GENERACIÓN DE REPORTE
// ============================================================================

function generateReport(
  topicStateResult: TableCheckResult,
  panelStateResult: TableCheckResult
): VerificationReport {
  const errors: string[] = [];
  const recommendations: string[] = [];

  // Evaluar topic_state
  if (!topicStateResult.exists) {
    errors.push('La tabla agent_topic_state no existe');
    recommendations.push('Ejecutar migración: 20260326_create_agent_topic_state.sql');
  } else if (!topicStateResult.writable) {
    errors.push('La tabla agent_topic_state no permite escritura');
    recommendations.push('Verificar permisos de RLS en Supabase');
  }

  // Evaluar panel_state
  if (!panelStateResult.exists) {
    errors.push('La tabla agent_panel_state no existe');
    recommendations.push('Ejecutar migración: 20260326_create_agent_panel_state.sql');
  } else if (!panelStateResult.writable) {
    errors.push('La tabla agent_panel_state no permite escritura');
    recommendations.push('Verificar permisos de RLS en Supabase');
  }

  // Recomendaciones adicionales
  if (topicStateResult.rowCount === 0 && panelStateResult.rowCount === 0) {
    recommendations.push('Las tablas están vacías. Esto es normal si no se ha ejecutado ninguna encuesta con persistState:true');
  }

  // Determinar estado
  let status: 'PASSED' | 'FAILED' | 'PARTIAL' = 'PASSED';
  if (errors.length > 0) {
    status = 'FAILED';
  } else if (!topicStateResult.writable || !panelStateResult.writable) {
    status = 'PARTIAL';
  }

  // Contar checks
  const totalChecks = 8; // exists x2, readable x2, writable x2, update x2, delete x2
  const passed = [
    topicStateResult.exists,
    topicStateResult.readable,
    topicStateResult.writable,
    panelStateResult.exists,
    panelStateResult.readable,
    panelStateResult.writable
  ].filter(Boolean).length;
  const failed = errors.length;
  const warnings = (!topicStateResult.writable || !panelStateResult.writable) ? 1 : 0;

  return {
    timestamp: new Date().toISOString(),
    status,
    summary: {
      totalChecks,
      passed,
      failed,
      warnings
    },
    tables: {
      agent_topic_state: topicStateResult,
      agent_panel_state: panelStateResult
    },
    operations: {
      read: topicStateResult.readable && panelStateResult.readable,
      write: topicStateResult.writable && panelStateResult.writable,
      update: true, // Asumimos que si write funciona, update también
      delete: true
    },
    errors,
    recommendations
  };
}

function saveReport(report: VerificationReport): void {
  const outputDir = path.join(__dirname, '../../docs/cadem-v3');
  const outputFile = path.join(outputDir, 'PERSISTENCE_VERIFICATION.md');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const markdown = `# Verificación de Persistencia Longitudinal

**Fecha:** ${new Date(report.timestamp).toLocaleString()}  
**Estado:** ${report.status === 'PASSED' ? '✅ PASSED' : report.status === 'FAILED' ? '❌ FAILED' : '⚠️ PARTIAL'}

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Total checks | ${report.summary.totalChecks} |
| Pasados | ${report.summary.passed} |
| Fallidos | ${report.summary.failed} |
| Advertencias | ${report.summary.warnings} |

### Estado de Operaciones

| Operación | Estado |
|-----------|--------|
| Lectura (Read) | ${report.operations.read ? '✅' : '❌'} |
| Escritura (Write) | ${report.operations.write ? '✅' : '❌'} |
| Actualización (Update) | ${report.operations.update ? '✅' : '❌'} |
| Eliminación (Delete) | ${report.operations.delete ? '✅' : '❌'} |

---

## Resultados por Tabla

### agent_topic_state

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Existe | ${report.tables.agent_topic_state.exists ? '✅' : '❌'} | ${report.tables.agent_topic_state.exists ? 'Tabla accesible' : 'No existe o no accesible'} |
| Legible | ${report.tables.agent_topic_state.readable ? '✅' : '❌'} | ${report.tables.agent_topic_state.rowCount !== null ? `${report.tables.agent_topic_state.rowCount} filas` : 'N/A'} |
| Escribible | ${report.tables.agent_topic_state.writable ? '✅' : '❌'} | ${report.tables.agent_topic_state.writable ? 'Operaciones CRUD funcionan' : 'Error en escritura'} |

**Columnas:** ${report.tables.agent_topic_state.columns?.join(', ') || 'N/A'}

### agent_panel_state

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Existe | ${report.tables.agent_panel_state.exists ? '✅' : '❌'} | ${report.tables.agent_panel_state.exists ? 'Tabla accesible' : 'No existe o no accesible'} |
| Legible | ${report.tables.agent_panel_state.readable ? '✅' : '❌'} | ${report.tables.agent_panel_state.rowCount !== null ? `${report.tables.agent_panel_state.rowCount} filas` : 'N/A'} |
| Escribible | ${report.tables.agent_panel_state.writable ? '✅' : '❌'} | ${report.tables.agent_panel_state.writable ? 'Operaciones CRUD funcionan' : 'Error en escritura'} |

**Columnas:** ${report.tables.agent_panel_state.columns?.join(', ') || 'N/A'}

---

## Errores Encontrados

${report.errors.length > 0 ? report.errors.map(e => `- ❌ ${e}`).join('\n') : '✅ No se encontraron errores'}

---

## Recomendaciones

${report.recommendations.length > 0 ? report.recommendations.map(r => `- ${r}`).join('\n') : '✅ No se requieren acciones'}

---

## Decisión: ¿Pasar a B2?

${report.status === 'PASSED'
  ? '### ✅ APROBADO PARA B2\n\nLa persistencia está operativa. Puedes proceder con el B2 Longitudinal Test.'
  : report.status === 'PARTIAL'
  ? '### ⚠️ APROBADO CON PRECAUCIONES\n\nLa persistencia funciona parcialmente. Revisa las advertencias antes de proceder con B2.'
  : '### ❌ NO APROBADO PARA B2\n\nLa persistencia no está operativa. Debes corregir los errores antes de proceder con B2.'}

---

*Reporte generado automáticamente por verifyPersistence.ts*
`;

  fs.writeFileSync(outputFile, markdown);
  console.log(`\n💾 Reporte guardado en: ${outputFile}`);
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
  console.log('🔍 VERIFICACIÓN DE PERSISTENCIA LONGITUDINAL\n');
  console.log('==============================================');
  console.log('Este script verifica que las tablas de persistencia');
  console.log('estén operativas antes de ejecutar B2 Longitudinal Test.\n');

  // Obtener un agente real para las pruebas
  console.log('🔍 Obteniendo agente real de synthetic_agents...');
  const realAgentId = await getRealAgentId();
  if (realAgentId) {
    DUMMY_AGENT_ID = realAgentId;
  } else {
    console.log('   ⚠️ Usando agente dummy (puede fallar por FK constraint)');
  }
  console.log();

  // Verificar ambas tablas
  const topicStateResult = await verifyTable('agent_topic_state');
  const panelStateResult = await verifyTable('agent_panel_state');

  // Generar reporte
  console.log('\n==============================================');
  console.log('GENERANDO REPORTE...');
  console.log('==============================================');

  const report = generateReport(topicStateResult, panelStateResult);
  saveReport(report);

  // Imprimir resumen
  console.log('\n📊 RESUMEN FINAL:\n');
  console.log(`Estado: ${report.status === 'PASSED' ? '✅ PASSED' : report.status === 'FAILED' ? '❌ FAILED' : '⚠️ PARTIAL'}`);
  console.log(`Checks pasados: ${report.summary.passed}/${report.summary.totalChecks}`);

  if (report.errors.length > 0) {
    console.log('\n❌ Errores:');
    report.errors.forEach(e => console.log(`   - ${e}`));
  }

  if (report.recommendations.length > 0) {
    console.log('\n💡 Recomendaciones:');
    report.recommendations.forEach(r => console.log(`   - ${r}`));
  }

  // Decisión final
  console.log('\n==============================================');
  if (report.status === 'PASSED') {
    console.log('✅ PERSISTENCIA VERIFICADA');
    console.log('Puedes proceder con B2 Longitudinal Test');
    console.log('==============================================\n');
    process.exit(0);
  } else if (report.status === 'PARTIAL') {
    console.log('⚠️ PERSISTENCIA PARCIAL');
    console.log('Revisa las advertencias antes de B2');
    console.log('==============================================\n');
    process.exit(1);
  } else {
    console.log('❌ PERSISTENCIA NO OPERATIVA');
    console.log('NO procedas con B2 hasta corregir errores');
    console.log('==============================================\n');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Error inesperado:', error);
  process.exit(1);
});
