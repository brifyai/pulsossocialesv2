/**
 * Helper de validación de variables de entorno para scripts
 * 
 * USO:
 *   import { validateServiceClientEnv, validateAnonClientEnv } from './validateScriptEnv';
 *   
 *   // Para scripts que requieren SERVICE_KEY (escritura)
 *   validateServiceClientEnv();
 *   
 *   // Para scripts que pueden usar ANON_KEY (solo lectura)
 *   validateAnonClientEnv();
 * 
 * REGLAS:
 *   - Scripts de escritura: DEBEN usar SERVICE_KEY, NO permitir fallback
 *   - Scripts de lectura: PUEDEN usar ANON_KEY o SERVICE_KEY
 *   - Nunca mezclar VITE_* con variables sin prefijo en scripts
 */

export interface ValidationResult {
  valid: boolean;
  missing: string[];
  url?: string;
  key?: string;
  keyType: 'service' | 'anon';
}

/**
 * Valida variables para scripts que requieren SERVICE_KEY
 * Falla explícitamente si no existe SERVICE_KEY
 * NO permite fallback a ANON_KEY
 */
export function validateServiceClientEnv(): ValidationResult {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  const missing: string[] = [];

  if (!url) {
    missing.push('SUPABASE_URL');
  }

  if (!key) {
    missing.push('SUPABASE_SERVICE_KEY');
  }

  // Verificar que NO esté usando ANON_KEY como fallback
  if (!key && process.env.SUPABASE_ANON_KEY) {
    throw new Error(
      '❌ ERROR DE SEGURIDAD: Se detectó SUPABASE_ANON_KEY pero se requiere SUPABASE_SERVICE_KEY.\n' +
      'Los scripts de escritura NO deben usar ANON_KEY.\n' +
      'Configura SUPABASE_SERVICE_KEY en tu archivo .env.scripts'
    );
  }

  if (missing.length > 0) {
    throw new Error(
      `❌ Variables de entorno requeridas no definidas:\n` +
      missing.map(v => `   - ${v}`).join('\n') + '\n\n' +
      `Configura estas variables en tu archivo .env.scripts\n` +
      `Ver docs/SECURITY_HARDENING_PHASE_1.md para más información.`
    );
  }

  // Validar formato básico de URL
  if (url && !url.startsWith('https://')) {
    throw new Error(
      `❌ SUPABASE_URL debe comenzar con https://\n` +
      `   Valor actual: ${url}`
    );
  }

  // Validar que la key parezca un JWT (contenga puntos)
  if (key && !key.includes('.')) {
    throw new Error(
      `❌ SUPABASE_SERVICE_KEY no parece ser un token JWT válido\n` +
      `   Debe contener al menos un punto (formato: header.payload.signature)`
    );
  }

  return {
    valid: true,
    missing: [],
    url,
    key,
    keyType: 'service'
  };
}

/**
 * Valida variables para scripts que pueden usar ANON_KEY
 * Permite ANON_KEY o SERVICE_KEY, pero prioriza SERVICE_KEY si existe
 * Solo para operaciones de lectura
 */
export function validateAnonClientEnv(): ValidationResult {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  
  // Priorizar SERVICE_KEY si existe, sino ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  const key = serviceKey || anonKey;
  const keyType: 'service' | 'anon' = serviceKey ? 'service' : 'anon';

  const missing: string[] = [];

  if (!url) {
    missing.push('SUPABASE_URL (o VITE_SUPABASE_URL)');
  }

  if (!key) {
    missing.push('SUPABASE_ANON_KEY (o SUPABASE_SERVICE_KEY)');
  }

  if (missing.length > 0) {
    throw new Error(
      `❌ Variables de entorno requeridas no definidas:\n` +
      missing.map(v => `   - ${v}`).join('\n') + '\n\n' +
      `Configura estas variables en tu archivo .env.scripts\n` +
      `Nota: Para scripts de solo lectura, ANON_KEY es suficiente.`
    );
  }

  return {
    valid: true,
    missing: [],
    url,
    key,
    keyType
  };
}

/**
 * Valida que NO existan variables VITE_* en el entorno de scripts
 * Esto ayuda a detectar configuración incorrecta
 */
export function validateNoViteVarsInScripts(): void {
  const viteVars = Object.keys(process.env).filter(k => k.startsWith('VITE_'));
  
  if (viteVars.length > 0) {
    console.warn('⚠️  Advertencia: Se detectaron variables VITE_* en el entorno de scripts:');
    viteVars.forEach(v => console.warn(`   - ${v}`));
    console.warn('   Estas variables están destinadas al frontend, no a scripts Node.js.\n');
  }
}

/**
 * Obtiene el cliente de Supabase validado para scripts de escritura
 * Garantiza que se use SERVICE_KEY
 */
export function getServiceClientConfig(): { url: string; key: string } {
  const result = validateServiceClientEnv();
  
  if (!result.url || !result.key) {
    throw new Error('validateServiceClientEnv() debería haber lanzado error antes');
  }

  return {
    url: result.url,
    key: result.key
  };
}

/**
 * Obtiene el cliente de Supabase validado para scripts de lectura
 * Puede usar ANON_KEY o SERVICE_KEY
 */
export function getAnonClientConfig(): { url: string; key: string; keyType: 'service' | 'anon' } {
  const result = validateAnonClientEnv();
  
  if (!result.url || !result.key) {
    throw new Error('validateAnonClientEnv() debería haber lanzado error antes');
  }

  return {
    url: result.url,
    key: result.key,
    keyType: result.keyType
  };
}
