/**
 * Script para aplicar la migración de soft delete a survey_definitions
 * Esto agrega la columna deleted_at si no existe
 */

import { createClient } from '@supabase/supabase-js';
import './utils/loadEnv';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Variables de entorno no configuradas');
  console.error('   Se requieren: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function applySoftDeleteMigration() {
  console.log('🔧 Aplicando migración de soft delete para survey_definitions...\n');

  try {
    // Verificar si la columna deleted_at existe
    console.log('1️⃣ Verificando si existe la columna deleted_at...');
    const { data: columns, error: columnsError } = await supabase
      .from('survey_definitions')
      .select('*')
      .limit(1);

    if (columnsError) {
      console.error('❌ Error al verificar columnas:', columnsError.message);
      return false;
    }

    // Verificar si la columna existe en el resultado
    const hasDeletedAt = columns && columns.length > 0 && 'deleted_at' in columns[0];

    if (hasDeletedAt) {
      console.log('✅ La columna deleted_at ya existe\n');
    } else {
      console.log('⚠️ La columna deleted_at NO existe. Agregándola...\n');

      // Ejecutar SQL para agregar la columna
      const { error: alterError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE survey_definitions
          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

          CREATE INDEX IF NOT EXISTS idx_survey_definitions_deleted_at
          ON survey_definitions(deleted_at)
          WHERE deleted_at IS NULL;
        `
      });

      if (alterError) {
        // Intentar con método alternativo
        console.log('   Intentando método alternativo...');
        const { error: rawError } = await supabase
          .from('survey_definitions')
          .select('*', { head: true });

        if (rawError) {
          console.error('❌ Error al verificar tabla:', rawError.message);
          return false;
        }

        // La tabla existe, intentar agregar columna directamente
        console.log('   ⚠️ No se pudo ejecutar SQL directamente.');
        console.log('   Por favor, ejecuta esta SQL manualmente en el SQL Editor de Supabase:\n');
        console.log('─'.repeat(60));
        console.log(`
-- Agregar columna deleted_at a survey_definitions
ALTER TABLE survey_definitions
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Crear índice para filtrar encuestas activas eficientemente
CREATE INDEX IF NOT EXISTS idx_survey_definitions_deleted_at
ON survey_definitions(deleted_at)
WHERE deleted_at IS NULL;
        `.trim());
        console.log('─'.repeat(60) + '\n');
        return false;
      }

      console.log('✅ Columna deleted_at agregada exitosamente\n');
    }

    // Verificar el estado actual
    console.log('2️⃣ Verificando estado de la tabla...');
    const { data: sample, error: sampleError } = await supabase
      .from('survey_definitions')
      .select('id, name, deleted_at')
      .limit(5);

    if (sampleError) {
      console.error('❌ Error al obtener muestra:', sampleError.message);
      return false;
    }

    console.log(`   📊 Total de encuestas en muestra: ${sample?.length || 0}`);
    if (sample && sample.length > 0) {
      console.log('   Primeras encuestas:');
      sample.forEach(s => {
        const status = s.deleted_at ? '❌ ELIMINADA' : '✅ Activa';
        console.log(`     - ${s.name?.substring(0, 40)}... (${status})`);
      });
    }

    // Contar encuestas activas vs eliminadas
    const { data: activeCount } = await supabase
      .from('survey_definitions')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    const { data: deletedCount } = await supabase
      .from('survey_definitions')
      .select('*', { count: 'exact', head: true })
      .not('deleted_at', 'is', null);

    console.log(`\n📈 Resumen:`);
    console.log(`   ✅ Encuestas activas: ${activeCount?.length || 0}`);
    console.log(`   ❌ Encuestas eliminadas: ${deletedCount?.length || 0}`);

    console.log('\n✅ Migración verificada exitosamente');
    return true;

  } catch (error) {
    console.error('❌ Error inesperado:', error);
    return false;
  }
}

// Ejecutar
applySoftDeleteMigration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
