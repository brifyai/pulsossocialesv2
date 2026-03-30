#!/usr/bin/env tsx
/**
 * Script para aplicar una migración SQL específica en Supabase
 * Uso: npx tsx scripts/apply_single_migration.ts <nombre_archivo.sql>
 * 
 * ⚠️ REQUIERE: SUPABASE_SERVICE_KEY en .env.scripts
 * NO usar ANON_KEY - las migraciones requieren privilegios de service_role
 */

import * as fs from 'fs';
import * as path from 'path';
import { serviceClient } from './utils/serviceClient';

// El cliente serviceClient ya está validado y configurado con SERVICE_KEY
const supabase = serviceClient;
console.log('🔗 Usando serviceClient con SERVICE_KEY');

const filename = process.argv[2];
if (!filename) {
  console.error('❌ Error: Debes especificar el nombre del archivo SQL');
  console.error('   Uso: npx tsx scripts/apply_single_migration.ts <nombre_archivo.sql>');
  process.exit(1);
}

async function applyMigration() {
  const filepath = path.join(process.cwd(), 'migrations', filename);

  console.log(`🔧 Aplicando migración: ${filename}`);
  console.log(`   Ruta: ${filepath}\n`);

  // Verificar que el archivo existe
  if (!fs.existsSync(filepath)) {
    console.error(`❌ Error: El archivo no existe: ${filepath}`);
    process.exit(1);
  }

  // Leer el SQL
  const sql = fs.readFileSync(filepath, 'utf-8');

  // Dividir el SQL en statements individuales (separados por ;)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

  console.log(`📄 SQL dividido en ${statements.length} statements\n`);

  // Ejecutar cada statement
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const shortStmt = statement.substring(0, 60).replace(/\s+/g, ' ');

    console.log(`[${i + 1}/${statements.length}] ${shortStmt}...`);

    const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

    if (error) {
      // Si no existe la función RPC, intentar con una query directa
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.error(`   ⚠️  Función RPC no disponible`);
        console.error(`\n📝 DEBES EJECUTAR MANUALMENTE EN SQL EDITOR:`);
        console.error(`\n${sql}\n`);
        process.exit(1);
      }

      // Algunos errores son esperados (ej: DROP IF EXISTS cuando no existe)
      if (error.message.includes('does not exist') && statement.toLowerCase().includes('drop')) {
        console.log(`   ℹ️  Ignorado (no existía)`);
        successCount++;
        continue;
      }

      console.error(`   ❌ Error: ${error.message}`);
      failCount++;
    } else {
      console.log(`   ✅ OK`);
      successCount++;
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   ✅ Exitosos: ${successCount}`);
  console.log(`   ❌ Fallidos: ${failCount}`);

  if (failCount > 0) {
    console.error(`\n⚠️  Algunos statements fallaron`);
    process.exit(1);
  }

  console.log('\n✅ Migración aplicada correctamente');
}

applyMigration().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
