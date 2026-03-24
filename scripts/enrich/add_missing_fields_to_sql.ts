/**
 * Script para agregar campos faltantes a los archivos SQL enriquecidos
 * 
 * Campos actuales en SQL (25):
 * - agent_id, batch_id, version, country_code, region_code, comuna_code, province_code
 * - urbanicity, sex, age, age_group, household_type, poverty_status, education_level
 * - occupation_status, connectivity_level, digital_exposure_level, preferred_survey_channel
 * - location_lat, location_lng, income_decile, employment_status, metadata, created_at, updated_at
 * 
 * Campos faltantes (7):
 * - territory_id (FK a territories)
 * - household_size
 * - socioeconomic_level (ya está en metadata, extraer)
 * - occupation_group
 * - agent_type
 * - backbone_key, subtel_profile_key, casen_profile_key, generation_notes
 */

import * as fs from 'fs';
import * as path from 'path';

const SQL_DIR = '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches_enriched';

// Mapeo de códigos de comuna 4 dígitos a 5 dígitos para lookup en territories
const COMUNA_CODE_MAP: Record<string, string> = {
  '1101': '13101', '1107': '13107', '1108': '13108', '1110': '13110', '1111': '13111',
  '1112': '13112', '1113': '13113', '1114': '13114', '1115': '13115', '1116': '13116',
  '1117': '13117', '1118': '13118', '1119': '13119', '1120': '13120', '1121': '13121',
  '1122': '13122', '1123': '13123', '1124': '13124', '1125': '13125', '1126': '13126',
  '1127': '13127', '1128': '13128', '1129': '13129', '1130': '13130', '1131': '13131',
  '1132': '13132',
  // Agregar más mapeos según sea necesario
};

interface AgentData {
  agent_id: string;
  batch_id: string;
  version: string;
  country_code: string;
  region_code: number;
  comuna_code: string;
  province_code: string;
  urbanicity: string;
  sex: string;
  age: number;
  age_group: string;
  household_type: string;
  poverty_status: string;
  education_level: string;
  occupation_status: string | null;
  connectivity_level: string;
  digital_exposure_level: string;
  preferred_survey_channel: string;
  location_lat: number;
  location_lng: number;
  income_decile: number;
  employment_status: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

function parseSQLLine(line: string): AgentData | null {
  const match = line.match(/INSERT INTO synthetic_agents \(([^)]+)\) VALUES \((.+)\);$/);
  if (!match) return null;

  const fields = match[1].split(',').map(f => f.trim());
  const valuesStr = match[2];
  
  // Parsear valores (esto es complejo por los JSON y strings)
  const values: any[] = [];
  let current = '';
  let inString = false;
  let inJson = false;
  let jsonDepth = 0;
  
  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    const nextChar = valuesStr[i + 1];
    
    if (!inJson && char === "'" && !inString) {
      inString = true;
    } else if (!inJson && char === "'" && inString) {
      if (nextChar === "'") {
        current += "'";
        i++;
      } else {
        inString = false;
      }
    } else if (!inString && char === '{') {
      inJson = true;
      jsonDepth++;
      current += char;
    } else if (!inString && char === '}' && inJson) {
      jsonDepth--;
      current += char;
      if (jsonDepth === 0) {
        inJson = false;
      }
    } else if (!inString && !inJson && char === ',' && jsonDepth === 0) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    values.push(current.trim());
  }

  const data: any = {};
  fields.forEach((field, index) => {
    let value = values[index];
    
    // Limpiar comillas
    if (value && value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1).replace(/''/g, "'");
    }
    
    // Parsear NULL
    if (value === 'NULL') {
      value = null;
    }
    
    // Parsear números
    if (value && !isNaN(Number(value)) && field !== 'agent_id' && field !== 'batch_id' && field !== 'version') {
      value = Number(value);
    }
    
    // Parsear JSON
    if (field === 'metadata' && value && value.startsWith('{')) {
      try {
        value = JSON.parse(value);
      } catch (e) {
        console.warn('Error parsing JSON:', value);
      }
    }
    
    data[field] = value;
  });

  return data as AgentData;
}

function generateNewSQLLine(data: AgentData): string {
  // Calcular campos faltantes
  const territoryId = 'NULL'; // Se calcularía basado en comuna_code
  const householdSize = data.metadata?.household_size || Math.floor(Math.random() * 4) + 1;
  const socioeconomicLevel = data.metadata?.socioeconomic_level || 'medium';
  const occupationGroup = data.occupation_status || 'general';
  
  // Calcular agent_type basado en edad y ocupación
  let agentType = 'resident';
  if (data.age < 18) agentType = 'student';
  else if (data.age >= 65) agentType = 'retiree';
  else if (data.occupation_status === 'self_employed') agentType = 'entrepreneur';
  else if (data.occupation_status === 'employed') agentType = 'worker';
  
  // Campos de traceabilidad (usar valores del metadata si existen)
  const backboneKey = data.metadata?.sources?.census || `${data.batch_id}_backbone`;
  const subtelProfileKey = data.metadata?.sources?.subtel || null;
  const casenProfileKey = data.metadata?.sources?.casen || null;
  const generationNotes = `Enriched from ${Object.values(data.metadata?.sources || {}).join(', ')}`;

  // Nuevo orden de campos (agregando los 7 faltantes)
  const newFields = [
    'agent_id', 'batch_id', 'version', 'territory_id', 'country_code', 'region_code', 
    'comuna_code', 'province_code', 'urbanicity', 'sex', 'age', 'age_group', 
    'household_size', 'household_type', 'income_decile', 'poverty_status', 
    'education_level', 'occupation_status', 'occupation_group', 'socioeconomic_level',
    'connectivity_level', 'digital_exposure_level', 'preferred_survey_channel',
    'agent_type', 'backbone_key', 'subtel_profile_key', 'casen_profile_key',
    'location_lat', 'location_lng', 'employment_status', 'generation_notes',
    'metadata', 'created_at', 'updated_at'
  ];

  const newValues = [
    `'${data.agent_id}'`,
    `'${data.batch_id}'`,
    `'${data.version}'`,
    territoryId, // territory_id - NULL por ahora
    `'${data.country_code}'`,
    data.region_code,
    `'${data.comuna_code}'`,
    `'${data.province_code}'`,
    `'${data.urbanicity}'`,
    `'${data.sex}'`,
    data.age,
    `'${data.age_group}'`,
    householdSize,
    `'${data.household_type}'`,
    data.income_decile,
    data.poverty_status ? `'${data.poverty_status}'` : 'NULL',
    data.education_level ? `'${data.education_level}'` : 'NULL',
    data.occupation_status ? `'${data.occupation_status}'` : 'NULL',
    `'${occupationGroup}'`,
    `'${socioeconomicLevel}'`,
    data.connectivity_level ? `'${data.connectivity_level}'` : 'NULL',
    data.digital_exposure_level ? `'${data.digital_exposure_level}'` : 'NULL',
    data.preferred_survey_channel ? `'${data.preferred_survey_channel}'` : 'NULL',
    `'${agentType}'`,
    `'${backboneKey}'`,
    subtelProfileKey ? `'${subtelProfileKey}'` : 'NULL',
    casenProfileKey ? `'${casenProfileKey}'` : 'NULL',
    data.location_lat,
    data.location_lng,
    data.employment_status ? `'${data.employment_status}'` : 'NULL',
    `'${generationNotes}'`,
    `'${JSON.stringify(data.metadata).replace(/'/g, "''")}'`,
    `'${data.created_at}'`,
    `'${data.updated_at}'`
  ];

  return `INSERT INTO synthetic_agents (${newFields.join(', ')}) VALUES (${newValues.join(', ')});`;
}

function processFile(inputPath: string, outputPath: string): void {
  console.log(`Procesando: ${path.basename(inputPath)}`);
  
  const content = fs.readFileSync(inputPath, 'utf-8');
  const lines = content.split('\n');
  
  const newLines: string[] = [];
  let processedCount = 0;
  
  for (const line of lines) {
    if (line.trim().startsWith('INSERT INTO')) {
      const data = parseSQLLine(line);
      if (data) {
        const newLine = generateNewSQLLine(data);
        newLines.push(newLine);
        processedCount++;
      } else {
        newLines.push(line);
      }
    } else {
      newLines.push(line);
    }
  }
  
  fs.writeFileSync(outputPath, newLines.join('\n'));
  console.log(`  ✓ Procesados ${processedCount} registros`);
}

function main(): void {
  console.log('=== Agregando campos faltantes a archivos SQL ===\n');
  
  // Procesar archivos del 001 al 050
  for (let i = 1; i <= 50; i++) {
    const batchNum = i.toString().padStart(3, '0');
    const inputFile = path.join(SQL_DIR, `insert_agents_batch_${batchNum}_enriched.sql`);
    const outputFile = path.join(SQL_DIR, `insert_agents_batch_${batchNum}_enriched_complete.sql`);
    
    if (fs.existsSync(inputFile)) {
      processFile(inputFile, outputFile);
    } else {
      console.log(`⚠ Archivo no encontrado: ${path.basename(inputFile)}`);
    }
  }
  
  console.log('\n=== Proceso completado ===');
  console.log('Archivos generados con sufijo "_complete.sql"');
}

main();
