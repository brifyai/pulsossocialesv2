#!/usr/bin/env node
/**
 * Script de Backup de Supabase
 * 
 * Este script exporta todas las tablas de Supabase a archivos JSON.
 * Incluye manejo de paginación para tablas grandes.
 * 
 * Uso:
 *   npx tsx scripts/backup/backup_supabase.ts
 * 
 * Variables de entorno requeridas:
 *   - VITE_SUPABASE_URL
 *   - VITE_SUPABASE_ANON_KEY (o SUPABASE_SERVICE_ROLE_KEY para datos completos)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../src/types/database';
import * as fs from 'fs';
import * as path from 'path';

// ===========================================
// Configuration
// ===========================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                     process.env.VITE_SUPABASE_ANON_KEY || 
                     process.env.SUPABASE_ANON_KEY || '';

// Tablas a respaldar (en orden de dependencias)
const TABLES_TO_BACKUP = [
  // Tablas base
  'territories',
  'users',
  
  // Agentes
  'synthetic_agent_batches',
  'synthetic_agents',
  
  // Encuestas
  'survey_definitions',
  'survey_runs',
  'survey_responses',
  'survey_results',
  
  // Benchmarks
  'benchmarks',
  'benchmark_comparisons',
] as const;

// Configuración de paginación
const PAGE_SIZE = 1000; // Registros por página
const MAX_PAGES = 1000; // Límite de seguridad

// ===========================================
// Types
// ===========================================

interface BackupResult {
  table: string;
  success: boolean;
  count: number;
  filePath: string;
  error?: string;
  duration: number;
}

interface BackupMetadata {
  timestamp: string;
  supabaseUrl: string;
  totalTables: number;
  successfulBackups: number;
  failedBackups: number;
  totalRecords: number;
  results: BackupResult[];
}

// ===========================================
// Utility Functions
// ===========================================

function log(message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ?? '');
}

function logError(message: string, error?: unknown): void {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ ${message}`, error ?? '');
}

function logSuccess(message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ✅ ${message}`, data ?? '');
}

function logWarning(message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] ⚠️  ${message}`, data ?? '');
}

/**
 * Crear directorio de backup con timestamp
 */
function createBackupDirectory(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups', `backup-${timestamp}`);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  return backupDir;
}

/**
 * Guardar datos en archivo JSON
 */
function saveToJson(data: unknown, filePath: string): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ===========================================
// Backup Functions
// ===========================================

/**
 * Obtener todos los registros de una tabla con paginación
 */
async function fetchAllRecords(
  client: SupabaseClient<Database>,
  table: string,
  pageSize: number = PAGE_SIZE
): Promise<{ data: unknown[]; count: number; error?: string }> {
  const allRecords: unknown[] = [];
  let page = 0;
  let hasMore = true;
  
  log(`Iniciando backup de tabla: ${table}`);
  
  while (hasMore && page < MAX_PAGES) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    
    try {
      // Usar type assertion para acceder a tablas dinámicamente
      const { data, error } = await client
        .from(table as any)
        .select('*')
        .range(from, to);
      
      if (error) {
        // Si es error de permisos, intentar con columnas específicas
        if (error.code === 'PGRST301' || error.message?.includes('permission')) {
          logWarning(`Error de permisos en ${table}, intentando con columnas mínimas`);
          const { data: limitedData, error: limitedError } = await client
            .from(table as any)
            .select('id')
            .range(from, to);
          
          if (limitedError) {
            return { data: [], count: 0, error: limitedError.message };
          }
          
          if (limitedData && limitedData.length > 0) {
            allRecords.push(...limitedData);
          }
          hasMore = limitedData && limitedData.length === pageSize;
        } else {
          return { data: [], count: 0, error: error.message };
        }
      } else {
        if (data && data.length > 0) {
          allRecords.push(...data);
          log(`  Página ${page + 1}: ${data.length} registros (total: ${allRecords.length})`);
        }
        hasMore = data && data.length === pageSize;
      }
      
      page++;
      
      // Pequeña pausa para no sobrecargar la API
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { data: allRecords, count: allRecords.length, error: errorMessage };
    }
  }
  
  if (page >= MAX_PAGES) {
    logWarning(`Tabla ${table} alcanzó el límite máximo de páginas (${MAX_PAGES})`);
  }
  
  return { data: allRecords, count: allRecords.length };
}

/**
 * Backup de una tabla individual
 */
async function backupTable(
  client: SupabaseClient<Database>,
  table: string,
  backupDir: string
): Promise<BackupResult> {
  const startTime = Date.now();
  const filePath = path.join(backupDir, `${table}.json`);
  
  try {
    const { data, count, error } = await fetchAllRecords(client, table);
    
    if (error) {
      throw new Error(error);
    }
    
    saveToJson(data, filePath);
    
    const duration = Date.now() - startTime;
    logSuccess(`Backup completado: ${table} (${count} registros en ${duration}ms)`);
    
    return {
      table,
      success: true,
      count,
      filePath,
      duration
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const duration = Date.now() - startTime;
    logError(`Backup fallido: ${table}`, errorMessage);
    
    return {
      table,
      success: false,
      count: 0,
      filePath,
      error: errorMessage,
      duration
    };
  }
}

/**
 * Ejecutar backup completo de todas las tablas
 */
async function runBackup(): Promise<void> {
  log('========================================');
  log('INICIANDO BACKUP DE SUPABASE');
  log('========================================');
  
  // Validar configuración
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    logError('Configuración incompleta. Variables requeridas:');
    logError('  - VITE_SUPABASE_URL o SUPABASE_URL');
    logError('  - VITE_SUPABASE_ANON_KEY, SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  log(`URL de Supabase: ${SUPABASE_URL}`);
  log(`Tablas a respaldar: ${TABLES_TO_BACKUP.length}`);
  
  // Crear directorio de backup
  const backupDir = createBackupDirectory();
  log(`Directorio de backup: ${backupDir}`);
  
  // Crear cliente de Supabase
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  // Verificar conexión
  log('Verificando conexión a Supabase...');
  const { error: testError } = await client.from('territories').select('id', { count: 'exact', head: true });
  
  if (testError) {
    logError('No se pudo conectar a Supabase:', testError.message);
    process.exit(1);
  }
  
  logSuccess('Conexión exitosa');
  
  // Ejecutar backups
  const results: BackupResult[] = [];
  const totalStartTime = Date.now();
  
  for (const table of TABLES_TO_BACKUP) {
    const result = await backupTable(client, table, backupDir);
    results.push(result);
    
    // Pausa entre tablas
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const totalDuration = Date.now() - totalStartTime;
  
  // Generar metadata
  const metadata: BackupMetadata = {
    timestamp: new Date().toISOString(),
    supabaseUrl: SUPABASE_URL,
    totalTables: TABLES_TO_BACKUP.length,
    successfulBackups: results.filter(r => r.success).length,
    failedBackups: results.filter(r => !r.success).length,
    totalRecords: results.reduce((sum, r) => sum + r.count, 0),
    results
  };
  
  // Guardar metadata
  const metadataPath = path.join(backupDir, '_metadata.json');
  saveToJson(metadata, metadataPath);
  
  // Mostrar resumen
  log('');
  log('========================================');
  log('RESUMEN DEL BACKUP');
  log('========================================');
  log(`Total de tablas: ${metadata.totalTables}`);
  log(`Backups exitosos: ${metadata.successfulBackups}`);
  log(`Backups fallidos: ${metadata.failedBackups}`);
  log(`Total de registros: ${metadata.totalRecords}`);
  log(`Duración total: ${totalDuration}ms`);
  log(`Directorio: ${backupDir}`);
  log('========================================');
  
  // Mostrar detalles de cada tabla
  log('');
  log('Detalles por tabla:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const errorInfo = result.error ? ` - Error: ${result.error}` : '';
    log(`  ${status} ${result.table}: ${result.count} registros (${result.duration}ms)${errorInfo}`);
  });
  
  // Guardar resumen en archivo de texto
  const summaryPath = path.join(backupDir, '_summary.txt');
  const summaryText = [
    'BACKUP DE SUPABASE',
    '==================',
    `Fecha: ${metadata.timestamp}`,
    `URL: ${metadata.supabaseUrl}`,
    '',
    'RESUMEN:',
    `- Total de tablas: ${metadata.totalTables}`,
    `- Backups exitosos: ${metadata.successfulBackups}`,
    `- Backups fallidos: ${metadata.failedBackups}`,
    `- Total de registros: ${metadata.totalRecords}`,
    `- Duración: ${totalDuration}ms`,
    '',
    'DETALLES POR TABLA:',
    ...results.map(r => {
      const status = r.success ? 'OK' : 'FAIL';
      const errorInfo = r.error ? ` - ${r.error}` : '';
      return `- ${r.table}: ${status} (${r.count} registros, ${r.duration}ms)${errorInfo}`;
    })
  ].join('\n');
  
  fs.writeFileSync(summaryPath, summaryText, 'utf-8');
  
  log('');
  logSuccess(`Backup completado. Archivos guardados en: ${backupDir}`);
  
  // Salir con código de error si hubo fallos
  if (metadata.failedBackups > 0) {
    process.exit(1);
  }
}

// ===========================================
// Main
// ===========================================

runBackup().catch(error => {
  logError('Error fatal en el backup:', error);
  process.exit(1);
});
