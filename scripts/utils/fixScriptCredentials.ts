/**
 * Script para corregir credenciales en scripts de TypeScript
 * Reemplaza patrones de fallback a ANON_KEY con validación estricta de SERVICE_KEY
 *
 * Uso:
 *   npx tsx scripts/utils/fixScriptCredentials.ts <ruta-al-script>
 *   npx tsx scripts/utils/fixScriptCredentials.ts scripts/rollout/runPhase2Controlled.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Lista de scripts que requieren SERVICE_KEY (operaciones de escritura)
const SCRIPTS_REQUIRING_SERVICE_KEY = [
  'scripts/rollout/',
  'scripts/staging/',
  'scripts/migrations/',
  'scripts/synthesize/',
];

// Lista de scripts que pueden usar ANON_KEY (solo lectura)
const SCRIPTS_ANON_KEY_ACCEPTABLE = [
  'scripts/calibration/',
  'scripts/audit/',
  'scripts/test/',
];

/**
 * Detecta si un script requiere SERVICE_KEY basado en su ruta
 */
function requiresServiceKey(filePath: string): boolean {
  return SCRIPTS_REQUIRING_SERVICE_KEY.some(prefix => filePath.includes(prefix));
}

/**
 * Detecta si un script puede usar ANON_KEY (solo lectura)
 */
function canUseAnonKey(filePath: string): boolean {
  return SCRIPTS_ANON_KEY_ACCEPTABLE.some(prefix => filePath.includes(prefix));
}

/**
 * Genera el código de importación del helper
 */
function generateImport(): string {
  return `import { getServiceClientConfig } from '../utils/validateScriptEnv';`;
}

/**
 * Genera el código de configuración para scripts que requieren SERVICE_KEY
 */
function generateServiceKeyConfig(): string {
  return `// Validar y obtener configuración de entorno (requiere SERVICE_KEY)
const { url: supabaseUrl, key: supabaseKey } = getServiceClientConfig();

const supabase = createClient(supabaseUrl, supabaseKey);`;
}

/**
 * Genera el código de configuración para scripts de solo lectura
 */
function generateAnonKeyConfig(): string {
  return `// Configuración para scripts de solo lectura
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Se requieren SUPABASE_URL y SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);`;
}

/**
 * Procesa un archivo y aplica las correcciones necesarias
 */
function fixScript(filePath: string): { success: boolean; message: string } {
  if (!fs.existsSync(filePath)) {
    return { success: false, message: `Archivo no encontrado: ${filePath}` };
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // Verificar si ya usa el helper
  if (content.includes('getServiceClientConfig')) {
    return { success: true, message: '✅ Ya usa el helper getServiceClientConfig' };
  }

  // Detectar si ya tiene import de createClient
  const hasCreateClientImport = content.includes("import { createClient } from '@supabase/supabase-js'");

  // Agregar import del helper si no existe
  if (!content.includes('validateScriptEnv')) {
    // Buscar la última línea de import
    const importMatch = content.match(/^(import .+ from .+;?\n)+/m);
    if (importMatch) {
      const lastImport = importMatch[0].trim().split('\n').pop();
      if (lastImport) {
        content = content.replace(
          lastImport,
          lastImport + '\n' + generateImport()
        );
      }
    }
  }

  // Reemplazar patrones de configuración
  const patterns = [
    // Patrón 1: const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
    //           const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    {
      regex: /const\s+(?:SUPABASE_URL|supabaseUrl)\s*=\s*process\.env\.(?:VITE_)?SUPABASE_URL\s*\|\|\s*process\.env\.VITE_SUPABASE_URL\s*\|\|\s*['"]{2};?\s*\n\s*const\s+(?:supabaseKey|SUPABASE_KEY)\s*=\s*process\.env\.(?:VITE_)?SUPABASE_SERVICE_KEY\s*\|\|\s*process\.env\.(?:VITE_)?SUPABASE_ANON_KEY\s*\|\|\s*['"]{2};?/g,
      replacement: generateServiceKeyConfig()
    },
    // Patrón 2: const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
    //           const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    {
      regex: /const\s+(?:SUPABASE_URL|supabaseUrl)\s*=\s*process\.env\.VITE_SUPABASE_URL\s*\|\|\s*['"]{2};?\s*\n\s*const\s+(?:SUPABASE_ANON_KEY|supabaseKey)\s*=\s*process\.env\.SUPABASE_ANON_KEY\s*\|\|\s*process\.env\.VITE_SUPABASE_ANON_KEY\s*\|\|\s*['"]{2};?/g,
      replacement: canUseAnonKey(filePath) ? generateAnonKeyConfig() : generateServiceKeyConfig()
    },
    // Patrón 3: const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    //           const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    {
      regex: /const\s+supabaseUrl\s*=\s*process\.env\.VITE_SUPABASE_URL\s*\|\|\s*['"]{2};?\s*\n\s*const\s+supabaseKey\s*=\s*process\.env\.VITE_SUPABASE_SERVICE_KEY\s*\|\|\s*process\.env\.VITE_SUPABASE_ANON_KEY\s*\|\|\s*['"]{2};?/g,
      replacement: generateServiceKeyConfig()
    },
    // Patrón 4: const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
    //           const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    {
      regex: /const\s+SUPABASE_ANON_KEY\s*=\s*process\.env\.VITE_SUPABASE_ANON_KEY\s*\|\|\s*['"]{2};?\s*\n\s*\n?const\s+supabaseUrl\s*=\s*process\.env\.VITE_SUPABASE_URL\s*\|\|\s*['"]{2};?/g,
      replacement: canUseAnonKey(filePath) ? generateAnonKeyConfig() : generateServiceKeyConfig()
    },
    // Patrón 5: const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    //           const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    {
      regex: /const\s+SUPABASE_URL\s*=\s*process\.env\.SUPABASE_URL\s*\|\|\s*process\.env\.VITE_SUPABASE_URL\s*\|\|\s*['"]{2};?\s*\n\s*const\s+supabaseKey\s*=\s*process\.env\.VITE_SUPABASE_SERVICE_KEY\s*\|\|\s*process\.env\.VITE_SUPABASE_ANON_KEY\s*\|\|\s*['"]{2};?/g,
      replacement: generateServiceKeyConfig()
    }
  ];

  let replaced = false;
  for (const pattern of patterns) {
    if (pattern.regex.test(content)) {
      content = content.replace(pattern.regex, pattern.replacement);
      replaced = true;
      break;
    }
  }

  if (!replaced) {
    return { success: false, message: '⚠️ No se encontró patrón de configuración para reemplazar' };
  }

  // Eliminar validaciones manuales duplicadas
  content = content.replace(
    /if\s*\(\s*!supabaseUrl\s*\|\|\s*!supabaseKey\s*\)\s*\{\s*\n\s*console\.error\s*\(\s*['"][^'"]+['"]\s*\);?\s*\n\s*process\.exit\s*\(\s*1\s*\);?\s*\n\s*\}\s*\n?/g,
    ''
  );

  // Eliminar creación duplicada de cliente
  content = content.replace(
    /const\s+supabase\s*=\s*createClient\s*\(\s*supabaseUrl\s*,\s*supabaseKey\s*\);?\s*\n?/g,
    ''
  );

  // Guardar cambios
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, message: '✅ Archivo corregido exitosamente' };
  }

  return { success: true, message: '✅ No se requirieron cambios' };
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('🔧 Fix Script Credentials');
    console.log('');
    console.log('Uso:');
    console.log('  npx tsx scripts/utils/fixScriptCredentials.ts <ruta-al-script>');
    console.log('');
    console.log('Ejemplos:');
    console.log('  npx tsx scripts/utils/fixScriptCredentials.ts scripts/rollout/runPhase2Controlled.ts');
    console.log('  npx tsx scripts/utils/fixScriptCredentials.ts scripts/staging/createB2LongitudinalSurvey.ts');
    console.log('');
    console.log('Scripts que requieren SERVICE_KEY:');
    SCRIPTS_REQUIRING_SERVICE_KEY.forEach(p => console.log(`  - ${p}`));
    console.log('');
    console.log('Scripts que pueden usar ANON_KEY (solo lectura):');
    SCRIPTS_ANON_KEY_ACCEPTABLE.forEach(p => console.log(`  - ${p}`));
    process.exit(1);
  }

  const filePath = args[0];
  const fullPath = path.resolve(filePath);

  console.log(`🔧 Procesando: ${filePath}`);
  console.log(`   Tipo: ${requiresServiceKey(filePath) ? 'SERVICE_KEY requerida' : canUseAnonKey(filePath) ? 'ANON_KEY aceptable' : 'Desconocido'}`);
  console.log('');

  const result = fixScript(fullPath);

  if (result.success) {
    console.log(result.message);
    process.exit(0);
  } else {
    console.error(result.message);
    process.exit(1);
  }
}

main();
