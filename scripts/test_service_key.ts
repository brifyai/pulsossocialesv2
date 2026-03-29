/**
 * Script de prueba para verificar que la SERVICE_ROLE_KEY funciona
 * Prueba escritura en la tabla weekly_events
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde archivo .env
function loadEnvFile() {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          const cleanValue = value.replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = cleanValue;
          }
        }
      }
    }
  }
}

loadEnvFile();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  TEST DE SERVICE ROLE KEY                                  ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');
console.log('Configuración:');
console.log(`  URL: ${supabaseUrl}`);
console.log(`  Key type: ${process.env.VITE_SUPABASE_SERVICE_KEY ? 'SERVICE_ROLE' : 'ANON'}`);
console.log(`  Key present: ${!!supabaseKey}`);
console.log('');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('📡 Probando conexión a Supabase...');
  
  const { data, error } = await supabase
    .from('territories')
    .select('id')
    .limit(1);
  
  if (error) {
    console.error('❌ Error de conexión:', error.message);
    return false;
  }
  
  console.log('✅ Conexión exitosa');
  return true;
}

async function testWrite() {
  console.log('');
  console.log('📝 Probando escritura en weekly_events...');
  
  // Primero eliminar registro de prueba si existe
  await supabase
    .from('weekly_events')
    .delete()
    .eq('week_key', '2026-W99-TEST');
  
  // Formato correcto según el schema de weekly_events
  const testEvent = {
    week_key: '2026-W99-TEST',
    title: 'Test Event - IPC Diciembre',
    summary: 'Evento de prueba para validar service key',
    topic: 'economy',
    sentiment: 0.5,
    intensity: 0.7,
    salience: 0.6,
    severity: 'moderate',
    target_entities: JSON.stringify([{ type: 'country', id: 'CL', name: 'Chile' }]),
    affected_segments: JSON.stringify([{ segment: 'general', weight: 1.0 }]),
    created_by: 'test_script'
  };
  
  const { data, error } = await supabase
    .from('weekly_events')
    .insert(testEvent)
    .select();
  
  if (error) {
    console.error('❌ Error de escritura:', error.message);
    console.error('   Código:', error.code);
    return false;
  }
  
  console.log('✅ Escritura exitosa');
  console.log('   Registro insertado:', data?.[0]?.week_key);
  return true;
}

async function cleanup() {
  console.log('');
  console.log('🧹 Limpiando datos de prueba...');
  
  const { error } = await supabase
    .from('weekly_events')
    .delete()
    .eq('week_key', '2026-W99-TEST');
  
  if (error) {
    console.error('⚠️  Error al limpiar:', error.message);
  } else {
    console.log('✅ Datos de prueba eliminados');
  }
}

async function main() {
  try {
    const connected = await testConnection();
    if (!connected) {
      process.exit(1);
    }
    
    const written = await testWrite();
    if (!written) {
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  ❌ TEST FALLIDO                                           ║');
      console.log('║  La service key no tiene permisos de escritura            ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      process.exit(1);
    }
    
    await cleanup();
    
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ TEST EXITOSO                                           ║');
    console.log('║  La SERVICE_ROLE_KEY funciona correctamente               ║');
    console.log('║  Puede escribir en weekly_events                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

main();
