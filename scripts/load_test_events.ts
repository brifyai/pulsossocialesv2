/**
 * Script para cargar eventos de prueba en weekly_events
 * Usado para la Fase 2.5 de validación de eventos
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

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Eventos de prueba para Fase 2.5
const testEvents = [
  {
    week_key: '2026-W13',
    title: 'IPC Marzo 2026 - Inflación moderada',
    summary: 'El IPC de marzo muestra una inflación dentro del rango meta del Banco Central, generando estabilidad económica',
    topic: 'economy',
    sentiment: 0.3,
    intensity: 0.5,
    salience: 0.7,
    severity: 'moderate',
    target_entities: JSON.stringify([{ type: 'country', id: 'CL', name: 'Chile' }]),
    affected_segments: JSON.stringify([
      { segment: 'all_income', weight: 0.8 },
      { segment: 'middle_class', weight: 0.9 }
    ]),
    created_by: 'phase2_5_setup'
  },
  {
    week_key: '2026-W13',
    title: 'Reforma Previsional avanza en el Congreso',
    summary: 'La reforma previsional logra acuerdos clave en comisión mixta, aumentando expectativas de aprobación',
    topic: 'politics',
    sentiment: 0.4,
    intensity: 0.6,
    salience: 0.8,
    severity: 'major',
    target_entities: JSON.stringify([{ type: 'institution', id: 'congress', name: 'Congreso Nacional' }]),
    affected_segments: JSON.stringify([
      { segment: 'retirees', weight: 1.0 },
      { segment: 'workers', weight: 0.7 }
    ]),
    created_by: 'phase2_5_setup'
  },
  {
    week_key: '2026-W13',
    title: 'Alerta sanitaria por virus respiratorio',
    summary: 'Minsal declara alerta por aumento de casos de virus respiratorio en la región metropolitana',
    topic: 'health',
    sentiment: -0.5,
    intensity: 0.7,
    salience: 0.6,
    severity: 'moderate',
    target_entities: JSON.stringify([{ type: 'region', id: 'RM', name: 'Región Metropolitana' }]),
    affected_segments: JSON.stringify([
      { segment: 'families', weight: 0.9 },
      { segment: 'elderly', weight: 0.8 }
    ]),
    created_by: 'phase2_5_setup'
  }
];

async function loadEvents() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  CARGA DE EVENTOS DE PRUEBA - FASE 2.5                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Cargando ${testEvents.length} eventos de prueba...`);
  console.log('');

  let successCount = 0;
  let errorCount = 0;

  for (const event of testEvents) {
    try {
      const { data, error } = await supabase
        .from('weekly_events')
        .insert(event)
        .select();

      if (error) {
        console.error(`❌ Error cargando "${event.title}":`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Cargado: ${event.title}`);
        console.log(`   Topic: ${event.topic}, Sentiment: ${event.sentiment}, Severity: ${event.severity}`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Error inesperado:`, err);
      errorCount++;
    }
  }

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  RESUMEN                                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`✅ Exitosos: ${successCount}`);
  console.log(`❌ Errores: ${errorCount}`);
  console.log('');

  if (errorCount === 0) {
    console.log('✅ Todos los eventos fueron cargados correctamente');
    console.log('');
    console.log('Ahora puedes ejecutar la Fase 2.5:');
    console.log('  npx tsx scripts/rollout/runPhase2_5Controlled.ts');
  } else {
    console.log('⚠️  Algunos eventos no se pudieron cargar');
  }
}

loadEvents().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
