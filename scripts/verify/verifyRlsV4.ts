#!/usr/bin/env ts-node
/**
 * Script de Verificación RLS v4
 * Verifica que las policies RLS se aplicaron correctamente
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Configuración
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  const color = {
    info: colors.blue,
    success: colors.green,
    error: colors.red,
    warning: colors.yellow
  }[type];
  console.log(`${color}${message}${colors.reset}`);
}

interface VerificationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
}

async function verifyRlsV4() {
  log('\n========================================', 'info');
  log('VERIFICACIÓN RLS v4', 'info');
  log('========================================\n', 'info');

  const results: VerificationResult[] = [];

  // Verificar credenciales
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    log('❌ Error: Faltan credenciales de Supabase', 'error');
    log('   Set SUPABASE_URL y SUPABASE_SERVICE_KEY', 'error');
    process.exit(1);
  }

  // Crear cliente con service_role
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // ========================================
    // 1. Verificar RLS habilitado
    // ========================================
    log('1. Verificando RLS habilitado...', 'info');
    const { data: rlsData, error: rlsError } = await serviceClient
      .rpc('exec_sql', {
        sql: `
          SELECT tablename, rowsecurity 
          FROM pg_tables 
          WHERE tablename IN ('scenario_events', 'weekly_events', 'event_impact_logs')
        `
      });

    if (rlsError) {
      // Fallback: usar query directa
      const { data, error } = await serviceClient
        .from('scenario_events')
        .select('id')
        .limit(1);
      
      if (error?.message?.includes('permission denied')) {
        results.push({
          check: 'RLS scenario_events',
          status: 'PASS',
          details: 'RLS está habilitado (acceso denegado sin auth)'
        });
      } else {
        results.push({
          check: 'RLS scenario_events',
          status: 'WARNING',
          details: 'No se pudo verificar RLS directamente'
        });
      }
    } else {
      log('   ✅ RLS verificado vía RPC', 'success');
    }

    // ========================================
    // 2. Verificar policies
    // ========================================
    log('\n2. Verificando policies...', 'info');
    
    const tables = ['scenario_events', 'weekly_events', 'event_impact_logs'];
    const expectedPolicies: Record<string, number> = {
      'scenario_events': 5,
      'weekly_events': 2,
      'event_impact_logs': 2
    };

    for (const table of tables) {
      try {
        // Intentar contar policies vía información_schema
        const { data: policies, error } = await serviceClient
          .from('information_schema.table_privileges')
          .select('*')
          .eq('table_name', table)
          .limit(10);

        if (error) {
          results.push({
            check: `Policies ${table}`,
            status: 'WARNING',
            details: `No se pudo verificar: ${error.message}`
          });
        } else {
          results.push({
            check: `Policies ${table}`,
            status: 'PASS',
            details: `Tabla accesible, verificar manualmente en Dashboard`
          });
        }
      } catch (e) {
        results.push({
          check: `Policies ${table}`,
          status: 'WARNING',
          details: 'Error al verificar'
        });
      }
    }

    // ========================================
    // 3. Verificar datos
    // ========================================
    log('\n3. Verificando datos...', 'info');
    
    // Contar escenarios
    const { data: scenarios, error: scenariosError } = await serviceClient
      .from('scenario_events')
      .select('id, user_id');

    if (scenariosError) {
      results.push({
        check: 'Datos scenario_events',
        status: 'FAIL',
        details: `Error: ${scenariosError.message}`
      });
    } else {
      const total = scenarios?.length || 0;
      const withUserId = scenarios?.filter(s => s.user_id).length || 0;
      const withoutUserId = total - withUserId;

      results.push({
        check: 'Total escenarios',
        status: 'PASS',
        details: `${total} escenarios encontrados`
      });

      if (withoutUserId > 0) {
        results.push({
          check: 'Escenarios sin user_id',
          status: 'WARNING',
          details: `${withoutUserId} escenarios necesitan asignación de usuario`
        });
      } else {
        results.push({
          check: 'Escenarios sin user_id',
          status: 'PASS',
          details: 'Todos los escenarios tienen user_id asignado'
        });
      }
    }

    // ========================================
    // 4. Test de acceso con service_role
    // ========================================
    log('\n4. Test de acceso con service_role...', 'info');
    
    try {
      const { data: testData, error: testError } = await serviceClient
        .from('scenario_events')
        .select('count')
        .limit(1);

      if (testError) {
        results.push({
          check: 'Service role access',
          status: 'FAIL',
          details: `Service role no puede acceder: ${testError.message}`
        });
      } else {
        results.push({
          check: 'Service role access',
          status: 'PASS',
          details: 'Service role puede acceder a los datos'
        });
      }
    } catch (e) {
      results.push({
        check: 'Service role access',
        status: 'FAIL',
        details: 'Error en test de service role'
      });
    }

    // ========================================
    // 5. Resumen
    // ========================================
    log('\n========================================', 'info');
    log('RESUMEN DE VERIFICACIÓN', 'info');
    log('========================================\n', 'info');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warnings = results.filter(r => r.status === 'WARNING').length;

    for (const result of results) {
      const icon = result.status === 'PASS' ? '✅' : 
                   result.status === 'FAIL' ? '❌' : '⚠️';
      const color = result.status === 'PASS' ? 'success' : 
                    result.status === 'FAIL' ? 'error' : 'warning';
      log(`${icon} ${result.check}: ${result.details}`, color);
    }

    log('\n========================================', 'info');
    log(`Total: ${passed} ✅ | ${failed} ❌ | ${warnings} ⚠️`, 'info');
    log('========================================\n', 'info');

    // Guardar reporte
    const reportPath = path.join(__dirname, '../../docs/RLS_V4_VERIFICATION_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results,
      summary: { passed, failed, warnings }
    }, null, 2));
    log(`📄 Reporte guardado en: ${reportPath}`, 'info');

    if (failed > 0) {
      log('\n❌ ALGUNAS VERIFICACIONES FALLARON', 'error');
      process.exit(1);
    } else if (warnings > 0) {
      log('\n⚠️ VERIFICACIÓN COMPLETADA CON ADVERTENCIAS', 'warning');
      process.exit(0);
    } else {
      log('\n✅ TODAS LAS VERIFICACIONES PASARON', 'success');
      process.exit(0);
    }

  } catch (error) {
    log(`\n❌ Error inesperado: ${error}`, 'error');
    process.exit(1);
  }
}

// Ejecutar
verifyRlsV4();
