/**
 * Script para aplicar migraciones SQL en Supabase
 * Ejecuta las migraciones pendientes usando el cliente de Supabase
 * 
 * ⚠️ REQUIERE: SUPABASE_SERVICE_KEY en .env.scripts
 * NO usar ANON_KEY - las migraciones requieren privilegios de service_role
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { serviceClient } from './utils/serviceClient';

// Cargar variables de entorno desde .env.scripts
dotenv.config({ path: '.env.scripts' });

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// El cliente serviceClient ya está validado y configurado
const supabase = serviceClient;

// Lista de migraciones a aplicar (en orden)
const MIGRATIONS = [
  '20260326_create_agent_topic_state.sql',
  '20260326_create_agent_panel_state.sql'
];

async function applyMigration(filename: string): Promise<boolean> {
  const filepath = path.join(__dirname, '..', 'migrations', filename);

  console.log(`\n📄 Aplicando migración: ${filename}`);

  try {
    // Leer el archivo SQL
    const sql = fs.readFileSync(filepath, 'utf-8');

    // Ejecutar el SQL usando rpc (ejecutar SQL directo)
    // Nota: Esto requiere que tengas una función RPC en Supabase
    // Alternativa: Usar el SQL Editor de Supabase Dashboard

    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      // Si no existe la función RPC, informamos al usuario
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.error(`❌ No se puede ejecutar SQL automáticamente.`);
        console.error(`   La función RPC 'exec_sql' no existe en Supabase.`);
        console.error(`\n📝 INSTRUCCIONES MANUALES:`);
        console.error(`   1. Ve al SQL Editor de Supabase Dashboard`);
        console.error(`   2. Copia y pega el contenido de: ${filepath}`);
        console.error(`   3. Ejecuta el SQL`);
        return false;
      }
      console.error(`❌ Error al ejecutar migración: ${error.message}`);
      return false;
    }

    console.log(`✅ Migración aplicada exitosamente: ${filename}`);
    return true;

  } catch (err) {
    console.error(`❌ Error al leer archivo: ${err}`);
    return false;
  }
}

async function main() {
  console.log('🔧 Aplicando migraciones a Supabase...\n');

  let successCount = 0;
  let failCount = 0;

  for (const migration of MIGRATIONS) {
    const success = await applyMigration(migration);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   ✅ Exitosas: ${successCount}`);
  console.log(`   ❌ Fallidas: ${failCount}`);

  if (failCount > 0) {
    console.log(`\n⚠️  Algunas migraciones requieren ejecución manual.`);
    console.log(`   Ve al SQL Editor de Supabase Dashboard y ejecuta los archivos en:`);
    console.log(`   /migrations/`);
    process.exit(1);
  }

  console.log('\n✅ Todas las migraciones aplicadas correctamente');
  process.exit(0);
}

main();
