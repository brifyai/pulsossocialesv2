#!/usr/bin/env tsx
/**
 * Script para preparar escenarios de prueba para validación con usuarios
 * Crea 3 escenarios pre-configurados listos para usar en sesiones de testing
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
const envPath = path.resolve(process.cwd(), '.env.scripts');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  console.error('\nAsegúrate de tener el archivo .env.scripts configurado');
  process.exit(1);
}

// Escenarios de prueba para validación con usuarios
// NOTA: Requiere USER_ID de un usuario existente en auth.users
const TEST_SCENARIOS = [
  {
    id: 'a0ee4c4b-3f7d-4a8e-b6c5-2d1e8f9a3b4c',
    name: 'Crisis Económica',
    description: 'FMI proyecta recesión del 2% para Chile',
    category: 'economy',
    severity: 'major',
    sentiment: -0.75,
    intensity: 0.9,
    salience: 0.6,
    status: 'active'
  },
  {
    id: 'b1ff5d5c-4e8e-5b9f-c7d6-3e2f9f0b4c5d',
    name: 'Subsidio al Transporte',
    description: 'Gobierno anuncia subsidio del 40% al transporte público',
    category: 'government',
    severity: 'major',
    sentiment: 0.75,
    intensity: 0.8,
    salience: 0.7,
    status: 'active'
  },
  {
    id: 'c2aa6e6d-5f9f-6c0f-d8e7-4f3f0a1c5d6e',
    name: 'Endurecimiento Migratorio',
    description: 'Gobierno anuncia controles migratorios más estrictos',
    category: 'migration',
    severity: 'major',
    sentiment: -0.5,
    intensity: 0.7,
    salience: 0.8,
    status: 'active'
  }
];

async function prepareTestScenarios() {
  console.log('🎯 Preparando escenarios de prueba para validación con usuarios\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
  });

  // Verificar conexión
  const { data: healthCheck, error: healthError } = await supabase
    .from('scenario_events')
    .select('count')
    .limit(1);

  if (healthError) {
    console.error('❌ Error conectando a Supabase:', healthError.message);
    process.exit(1);
  }

  console.log('✅ Conexión a Supabase establecida\n');

  // Buscar un usuario válido en la tabla users
  console.log('🔍 Buscando usuario válido...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email')
    .limit(1);

  if (usersError || !users || users.length === 0) {
    console.error('❌ No se encontró ningún usuario en la tabla users');
    console.error('   Debes crear al menos un usuario antes de ejecutar este script');
    process.exit(1);
  }

  const userId = users[0].id;
  console.log(`✅ Usando usuario: ${users[0].email} (${userId})\n`);

  // Verificar si la FK está correctamente configurada
  console.log('🔍 Verificando configuración de Foreign Key...');

  // Verificar escenarios existentes
  const { data: existingScenarios, error: listError } = await supabase
    .from('scenario_events')
    .select('id, name')
    .in('id', TEST_SCENARIOS.map(s => s.id));

  if (listError) {
    console.error('❌ Error listando escenarios:', listError.message);
    process.exit(1);
  }

  const existingIds = new Set(existingScenarios?.map(s => s.id) || []);

  console.log(`📊 Escenarios existentes: ${existingIds.size}/${TEST_SCENARIOS.length}\n`);

  // Crear o actualizar escenarios
  for (const scenario of TEST_SCENARIOS) {
    const exists = existingIds.has(scenario.id);

    if (exists) {
      console.log(`🔄 Actualizando: ${scenario.name}`);
      const { error } = await supabase
        .from('scenario_events')
        .update({
          name: scenario.name,
          description: scenario.description,
          category: scenario.category,
          severity: scenario.severity,
          sentiment: scenario.sentiment,
          intensity: scenario.intensity,
          salience: scenario.salience,
          status: scenario.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', scenario.id);

      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
      } else {
        console.log(`   ✅ Actualizado`);
      }
    } else {
      console.log(`➕ Creando: ${scenario.name}`);
      const { error } = await supabase
        .from('scenario_events')
        .insert({
          id: scenario.id,
          user_id: userId,
          name: scenario.name,
          description: scenario.description,
          category: scenario.category,
          severity: scenario.severity,
          sentiment: scenario.sentiment,
          intensity: scenario.intensity,
          salience: scenario.salience,
          status: scenario.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
        if (error.message.includes('foreign key constraint') || error.message.includes('scenario_events_user_id_fkey')) {
          console.error('\n⚠️  ERROR DE FOREIGN KEY DETECTADO');
          console.error('   La tabla scenario_events tiene una FK que apunta a auth.users');
          console.error('   pero debe apuntar a public.users');
          console.error('\n   SOLUCIÓN:');
          console.error('   1. Ve a docs/MIGRACION_FK_MANUAL.md');
          console.error('   2. Ejecuta el SQL en el Supabase SQL Editor');
          console.error('   3. Vuelve a ejecutar este script\n');
          process.exit(1);
        }
      } else {
        console.log(`   ✅ Creado`);
      }
    }
  }

  // Verificar resultado final
  console.log('\n📋 Verificación final:');
  const { data: finalScenarios, error: finalError } = await supabase
    .from('scenario_events')
    .select('id, name, category, severity, sentiment, intensity, salience')
    .in('id', TEST_SCENARIOS.map(s => s.id))
    .order('name');

  if (finalError) {
    console.error('❌ Error en verificación:', finalError.message);
    process.exit(1);
  }

  console.log(`\n✅ ${finalScenarios?.length || 0} escenarios listos:\n`);

  for (const s of finalScenarios || []) {
    console.log(`   📌 ${s.name}`);
    console.log(`      Categoría: ${s.category} | Severidad: ${s.severity}`);
    console.log(`      Sentimiento: ${s.sentiment} | Intensidad: ${s.intensity} | Salience: ${s.salience}`);
    console.log('');
  }

  console.log('🎉 Escenarios de prueba preparados exitosamente');
  console.log('\n💡 Próximos pasos:');
  console.log('   1. Abrir http://localhost:5175/scenarios');
  console.log('   2. Verificar que los escenarios aparecen en la lista');
  console.log('   3. Ejecutar sesiones de validación con usuarios');
}

prepareTestScenarios().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
