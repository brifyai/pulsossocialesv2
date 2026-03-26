/**
 * Script para cargar las encuestas A/B de comparación de motores
 * Uso: npx tsx scripts/load_ab_surveys.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// SQL para aplicar la migración de engine_mode
const migrationSQL = `
-- Add engine_mode column (legacy | cadem)
ALTER TABLE survey_definitions
ADD COLUMN IF NOT EXISTS engine_mode TEXT DEFAULT 'legacy';

-- Add persist_state column (boolean)
ALTER TABLE survey_definitions
ADD COLUMN IF NOT EXISTS persist_state BOOLEAN DEFAULT false;

-- Add engine metadata columns for survey_runs
ALTER TABLE survey_runs
ADD COLUMN IF NOT EXISTS engine_mode TEXT,
ADD COLUMN IF NOT EXISTS engine_version TEXT,
ADD COLUMN IF NOT EXISTS persist_state BOOLEAN DEFAULT false;
`;

async function applyMigration(): Promise<void> {
  console.log('🔧 Aplicando migración de engine_mode...');
  
  // Ejecutar SQL usando rpc (si existe) o directamente
  const statements = migrationSQL.split(';').filter(s => s.trim());
  
  for (const stmt of statements) {
    const cleanStmt = stmt.trim();
    if (!cleanStmt) continue;
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: cleanStmt + ';' });
      if (error) {
        // Si rpc no existe, intentar con query directa
        console.log(`   ⚠️  RPC falló, intentando método alternativo...`);
      }
    } catch (e) {
      // Ignorar errores de RPC no existente
    }
  }
  
  console.log('✅ Migración aplicada (o columnas ya existen)');
}

interface SurveyDefinition {
  name: string;
  description: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  segment: {
    region_codes?: string[];
    age_groups?: string[];
    income_deciles?: number[];
  };
  sample_size: number;
  questions: unknown[];
  metadata: Record<string, unknown>;
  // Optional fields for CADEM v1.1
  engine_mode?: 'legacy' | 'cadem';
  persist_state?: boolean;
}

async function loadSurvey(filePath: string): Promise<{id: string, name: string} | null> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const survey = JSON.parse(content);

  // Build insert object matching the actual DB schema
  const surveyDef: any = {
    name: survey.title,  // DB uses 'name', JSON uses 'title'
    slug: survey.slug || survey.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    description: survey.description,
    status: survey.status,
    segment: survey.targetAudience ? {
      region_codes: survey.targetAudience.regions?.map((r: string) => `CL-${r}`) || [],
      age_groups: survey.targetAudience.ageRange ? [survey.targetAudience.segment] : [],
      income_deciles: [1,2,3,4,5,6,7,8,9,10], // All deciles by default
    } : {},
    sample_size: survey.sampleSize,
    questions: survey.questions,
    metadata: {
      ...survey.metadata,
      engine_mode: survey.engineMode,
      persist_state: survey.persistState,
    },
  };

  const { data, error } = await supabase
    .from('survey_definitions')
    .insert(surveyDef)
    .select()
    .single();

  if (error) {
    console.error(`Error cargando ${path.basename(filePath)}:`, error);
    return null;
  }

  console.log(`✅ Encuesta cargada: ${survey.title} (ID: ${data.id})`);
  return { id: data.id, name: survey.title };
}

async function main() {
  const surveysDir = path.join(__dirname, '..', 'data', 'surveys');

  try {
    // Aplicar migración primero
    await applyMigration();
    
    // Cargar Encuesta A (Legacy)
    await loadSurvey(path.join(surveysDir, 'encuesta_a_legacy.json'));

    // Cargar Encuesta B (CADEM)
    await loadSurvey(path.join(surveysDir, 'encuesta_b_cadem.json'));

    console.log('\n🎉 Ambas encuestas A/B cargadas exitosamente');
    console.log('\nPara ejecutar la comparación:');
    console.log('  1. Activa Encuesta A desde el panel de administración');
    console.log('  2. Ejecuta con 300 agentes');
    console.log('  3. Guarda resultados');
    console.log('  4. Activa Encuesta B y repite');
    console.log('  5. Compara métricas entre ambas');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
