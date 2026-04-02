/**
 * Carga de variables de entorno para scripts
 * 
 * Este archivo debe importarse ANTES que cualquier otro módulo
 * que dependa de variables de entorno.
 * 
 * Uso:
 *   import './loadEnv';  // Primera línea del script
 *   import { serviceClient } from './serviceClient';
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno desde .env.scripts (primera prioridad)
const result1 = dotenv.config({ path: resolve(process.cwd(), '.env.scripts') });
if (result1.error) {
  console.warn('⚠️  No se pudo cargar .env.scripts:', result1.error.message);
}

// Cargar desde .env como fallback (no sobrescribe variables existentes)
const result2 = dotenv.config({ path: resolve(process.cwd(), '.env'), override: false });
if (result2.error) {
  // Silencioso - .env es opcional
}

// Debug: Mostrar estado de variables (solo en desarrollo)
if (process.env.DEBUG_ENV) {
  console.log('[ENV LOADED] Variables disponibles:');
  console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ definido' : '✗ no definido');
  console.log('  SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✓ definido' : '✗ no definido');
  console.log('  SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✓ definido' : '✗ no definido');
}
