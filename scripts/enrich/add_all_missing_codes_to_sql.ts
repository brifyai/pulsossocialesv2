/**
 * Script para agregar todos los campos de códigos faltantes a los archivos SQL
 * Campos a agregar:
 * - sex_code (integer)
 * - age_group_code (integer)
 * - education_level_code (varchar)
 * - occupation_status_code (integer)
 * - occupation_category_code (integer)
 * - ciuo_code (varchar)
 * - caenes_code (varchar)
 * - marital_status_code (integer)
 * - indigenous_people_code (integer)
 * - disability_status_code (integer)
 * - internet_quality (varchar)
 * - has_smartphone (boolean)
 * - has_computer (boolean)
 */

import * as fs from 'fs';
import * as path from 'path';

const INPUT_DIR = '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches_enriched';
const OUTPUT_DIR = '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches_final';

// Mapeos para generar códigos basados en valores existentes
const sexCodeMap: Record<string, number> = {
  'male': 1,
  'female': 2
};

const ageGroupCodeMap: Record<string, number> = {
  'child': 1,
  'youth': 2,
  'young_adult': 3,
  'adult': 4,
  'middle_age': 5,
  'senior': 6,
  'elderly': 7
};

const educationLevelCodeMap: Record<string, string> = {
  'none': '00',
  'primary': '01',
  'secondary': '02',
  'technical': '03',
  'university': '04',
  'postgraduate': '05'
};

const occupationStatusCodeMap: Record<string, number> = {
  'employed': 1,
  'unemployed': 2,
  'inactive': 3,
  'student': 4,
  'retired': 5,
  'homemaker': 6
};

// Códigos CIUO (Clasificación Internacional Uniforme de Ocupaciones)
const ciuoCodes = [
  '1111', '1112', '1113', '1114', // Directores y gerentes
  '1211', '1212', '1213', '1219', // Profesionales en administración
  '2111', '2112', '2113', '2114', // Profesionales científicos
  '2211', '2212', '2213', // Profesionales de la salud
  '2311', '2312', '2313', // Profesionales de enseñanza
  '2411', '2412', '2413', // Profesionales de negocios
  '3111', '3112', '3113', // Técnicos y profesionales de nivel medio
  '3211', '3212', '3213', // Técnicos en salud
  '3311', '3312', '3313', // Profesionales de apoyo en servicios jurídicos
  '4111', '4112', '4113', // Oficinistas
  '4211', '4212', '4213', // Cajeros y taquilleros
  '4311', '4312', '4313', // Empleados de trato directo con el público
  '4411', '4412', '4413', // Empleados de bibliotecas
  '5111', '5112', '5113', // Trabajadores de los servicios personales
  '5211', '5212', '5213', // Vendedores
  '5311', '5312', // Trabajadores de los cuidados personales
  '5411', '5412', // Trabajadores de seguridad
  '6111', '6112', // Agricultores y trabajadores calificados
  '6211', '6212', // Trabajadores forestales
  '6311', // Pescadores
  '6411', // Trabajadores de la cría de animales
  '7111', '7112', '7113', // Trabajadores de la construcción
  '7121', '7122', '7123', // Trabajadores en metalurgia
  '7131', '7132', // Instaladores y reparadores
  '7211', '7212', // Trabajadores en electricidad
  '7311', '7312', // Trabajadores en alimentación
  '7321', '7322', // Artesanos y trabajadores en textiles
  '7411', '7412', // Operarios en madera
  '7511', '7512', // Operarios en impresión
  '7521', '7522', // Operarios en productos químicos
  '8111', '8112', // Operadores de instalaciones mineras
  '8121', '8122', // Operadores de instalaciones de procesamiento
  '8131', '8132', // Operadores de máquinas para fabricar productos
  '8141', '8142', // Operadores de máquinas para ensamblar
  '8151', '8152', // Operadores de máquinas de embalaje
  '8161', // Operadores de máquinas de limpieza
  '8171', // Operadores de robots industriales
  '8181', // Otros operadores de máquinas
  '8211', '8212', // Ensambladores
  '8311', '8312', // Conductores de vehículos
  '8321', '8322', // Operadores de equipos pesados
  '8331', // Marineros
  '9111', '9112', // Limpiadores
  '9121', '9122', // Obreros de carga
  '9211', '9212', // Obreros de agricultura
  '9311', '9312', // Obreros de minería
  '9321', '9322', // Obreros de manufactura
  '9331', '9332', // Ayudantes de transporte
  '9411', '9412', // Obreros de preparación de alimentos
  '9511', '9512', // Vendedores ambulantes
  '9611', '9612', // Recolectores de residuos
  '9621', '9622', // Otras ocupaciones elementales
  null // Para desempleados/inactivos
];

// Códigos CAENES (Clasificación de Actividades Económicas)
const caenesCodes = [
  '0111', '0112', // Agricultura
  '0210', // Silvicultura
  '0311', '0312', // Pesca
  '0520', // Minería
  '1010', '1020', // Manufactura de alimentos
  '1311', '1312', // Manufactura textil
  '1511', '1512', // Manufactura de vestuario
  '1610', // Manufactura de cuero
  '2011', '2012', // Manufactura de madera
  '2101', '2102', // Manufactura de papel
  '2211', '2212', // Manufactura de productos químicos
  '2310', // Manufactura de productos farmacéuticos
  '2410', // Manufactura de productos de caucho
  '2511', '2512', // Manufactura de productos metálicos
  '2610', // Manufactura de productos electrónicos
  '2710', // Manufactura de equipo eléctrico
  '2810', // Manufactura de maquinaria
  '2910', // Manufactura de vehículos
  '3011', '3012', // Manufactura de equipo de transporte
  '3110', // Manufactura de muebles
  '3210', // Manufactura de otros productos
  '3511', '3512', // Suministro de electricidad
  '3600', // Suministro de agua
  '4111', '4112', // Construcción
  '4510', // Venta de vehículos
  '4610', // Venta al por mayor
  '4711', '4712', // Venta al por menor
  '4911', '4912', // Transporte terrestre
  '5011', '5012', // Transporte por agua
  '5110', // Transporte aéreo
  '5210', // Almacenamiento
  '5310', // Actividades postales
  '5510', // Alojamiento
  '5610', // Servicios de comidas
  '5811', '5812', // Edición
  '5911', '5912', // Actividades cinematográficas
  '6010', // Radiodifusión
  '6110', // Telecomunicaciones
  '6210', // Programación informática
  '6311', '6312', // Servicios de información
  '6411', '6412', // Servicios financieros
  '6511', '6512', // Seguros
  '6611', '6612', // Servicios auxiliares financieros
  '6810', // Actividades inmobiliarias
  '6910', // Actividades jurídicas
  '7010', // Actividades de consultoría
  '7111', '7112', // Arquitectura e ingeniería
  '7210', // Investigación científica
  '7310', // Publicidad
  '7410', // Diseño especializado
  '7490', // Otras actividades profesionales
  '7500', // Actividades veterinarias
  '7710', // Alquiler de vehículos
  '7721', '7722', // Alquiler de efectos personales
  '7810', // Obtención de personal
  '7820', // Actividades de agencias de empleo
  '7830', // Actividades de agencias de viajes
  '7911', '7912', // Actividades de seguridad
  '8010', // Servicios de investigación
  '8110', // Actividades combinadas
  '8211', '8212', // Actividades administrativas
  '8411', '8412', // Administración pública
  '8510', // Educación
  '8610', // Actividades de salud humana
  '8710', // Actividades de residencia
  '8810', // Actividades de asistencia social
  '9000', // Actividades artísticas
  '9102', // Actividades de bibliotecas
  '9200', // Actividades de juegos de azar
  '9311', '9312', // Actividades deportivas
  '9321', '9322', // Actividades de esparcimiento
  '9411', '9412', // Actividades de asociaciones
  '9420', // Actividades de sindicatos
  '9491', '9492', // Otras actividades asociativas
  '9511', '9512', // Reparación de computadores
  '9521', '9522', // Reparación de efectos personales
  '9601', '9602', // Otras actividades de servicios personales
  '9700', // Actividades de hogares
  '9810', // Actividades de hogares productores
  '9900', // Actividades de organizaciones extraterritoriales
  null
];

// Distribución realista de códigos de estado civil basada en edad
function getMaritalStatusCode(age: number, sex: string): number | null {
  if (age < 18) return 6; // Soltero (menor de edad)
  const rand = Math.random();
  if (age < 25) {
    if (rand < 0.85) return 6; // Soltero
    if (rand < 0.95) return 2; // Casado
    return 3; // Separado/divorciado
  } else if (age < 35) {
    if (rand < 0.45) return 6; // Soltero
    if (rand < 0.80) return 2; // Casado
    if (rand < 0.90) return 3; // Separado/divorciado
    return 4; // Viudo
  } else if (age < 50) {
    if (rand < 0.35) return 6; // Soltero
    if (rand < 0.75) return 2; // Casado
    if (rand < 0.88) return 3; // Separado/divorciado
    return 4; // Viudo
  } else if (age < 65) {
    if (rand < 0.25) return 6; // Soltero
    if (rand < 0.70) return 2; // Casado
    if (rand < 0.82) return 3; // Separado/divorciado
    return 4; // Viudo
  } else {
    if (rand < 0.15) return 6; // Soltero
    if (rand < 0.55) return 2; // Casado
    if (rand < 0.65) return 3; // Separado/divorciado
    return 4; // Viudo
  }
}

// Distribución de pueblos indígenas (aproximadamente 12.8% de la población chilena)
function getIndigenousPeopleCode(): number | null {
  const rand = Math.random();
  if (rand < 0.872) return 1; // No pertenece a pueblo indígena
  if (rand < 0.90) return 2;  // Mapuche
  if (rand < 0.92) return 3;  // Aymara
  if (rand < 0.935) return 4; // Rapa Nui
  if (rand < 0.945) return 5; // Lican Antai
  if (rand < 0.955) return 6; // Quechua
  if (rand < 0.965) return 7; // Atacameño
  if (rand < 0.975) return 8; // Colla
  if (rand < 0.985) return 9;  // Diaguita
  if (rand < 0.992) return 10; // Kawésqar
  if (rand < 0.996) return 11; // Yagán
  return 12; // Otro pueblo indígena
}

// Distribución de discapacidad (aproximadamente 16.7% de la población)
function getDisabilityStatusCode(): number | null {
  const rand = Math.random();
  if (rand < 0.833) return 1; // Sin discapacidad
  if (rand < 0.90) return 2;  // Discapacidad visual
  if (rand < 0.94) return 3;  // Discapacidad auditiva
  if (rand < 0.97) return 4;  // Discapacidad motora
  if (rand < 0.99) return 5;  // Discapacidad intelectual
  return 6; // Otra discapacidad
}

// Calidad de internet basada en nivel de conectividad
function getInternetQuality(connectivityLevel: string): string | null {
  const rand = Math.random();
  switch (connectivityLevel) {
    case 'high':
      if (rand < 0.70) return 'high';
      if (rand < 0.90) return 'medium';
      return 'low';
    case 'medium':
      if (rand < 0.20) return 'high';
      if (rand < 0.70) return 'medium';
      return 'low';
    case 'low':
      if (rand < 0.05) return 'high';
      if (rand < 0.30) return 'medium';
      return 'low';
    default:
      return 'medium';
  }
}

// Determinar si tiene smartphone basado en nivel de conectividad y edad
function hasSmartphone(connectivityLevel: string, age: number): boolean {
  const baseProb = connectivityLevel === 'high' ? 0.85 : connectivityLevel === 'medium' ? 0.60 : 0.30;
  const ageFactor = age < 30 ? 1.2 : age < 50 ? 1.0 : age < 70 ? 0.7 : 0.4;
  return Math.random() < baseProb * ageFactor;
}

// Determinar si tiene computador basado en nivel de conectividad y edad
function hasComputer(connectivityLevel: string, age: number): boolean {
  const baseProb = connectivityLevel === 'high' ? 0.70 : connectivityLevel === 'medium' ? 0.45 : 0.20;
  const ageFactor = age < 30 ? 1.1 : age < 50 ? 1.0 : age < 70 ? 0.6 : 0.3;
  return Math.random() < baseProb * ageFactor;
}

// Generar código de ocupación basado en grupo de ocupación
function getOccupationCategoryCode(occupationGroup: string | null): number | null {
  if (!occupationGroup) return null;
  const groupMap: Record<string, number> = {
    'general': 1,
    'professional': 2,
    'technical': 3,
    'administrative': 4,
    'service': 5,
    'agriculture': 6,
    'crafts': 7,
    'machine_operator': 8,
    'elementary': 9,
    'armed_forces': 0
  };
  return groupMap[occupationGroup] || 1;
}

// Función para extraer valores de una línea INSERT
function extractInsertValues(line: string): Record<string, any> | null {
  const match = line.match(/VALUES \((.+?)\);?$/);
  if (!match) return null;

  const valuesStr = match[1];
  // Parsear valores considerando comillas y arrays
  const values: any[] = [];
  let current = '';
  let inQuotes = false;
  let inArray = false;
  let quoteChar = '';

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];

    if (!inQuotes && (char === "'" || char === '"')) {
      inQuotes = true;
      quoteChar = char;
    } else if (inQuotes && char === quoteChar) {
      inQuotes = false;
      quoteChar = '';
    } else if (char === '[' && !inQuotes) {
      inArray = true;
    } else if (char === ']' && !inQuotes) {
      inArray = false;
    } else if (char === ',' && !inQuotes && !inArray) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }
  values.push(current.trim());

  // Mapear a nombres de campos basado en la estructura conocida
  return {
    agent_id: values[0]?.replace(/'/g, ''),
    batch_id: values[1]?.replace(/'/g, ''),
    version: values[2]?.replace(/'/g, ''),
    territory_id: values[3] === 'NULL' ? null : values[3],
    country_code: values[4]?.replace(/'/g, ''),
    region_code: values[5] === 'NULL' ? null : parseInt(values[5]),
    comuna_code: values[6]?.replace(/'/g, ''),
    province_code: values[7]?.replace(/'/g, ''),
    urbanicity: values[8]?.replace(/'/g, ''),
    sex: values[9]?.replace(/'/g, ''),
    age: values[10] === 'NULL' ? null : parseInt(values[10]),
    age_group: values[11]?.replace(/'/g, ''),
    household_size: values[12] === 'NULL' ? null : parseInt(values[12]),
    household_type: values[13]?.replace(/'/g, ''),
    income_decile: values[14] === 'NULL' ? null : parseInt(values[14]),
    poverty_status: values[15]?.replace(/'/g, ''),
    education_level: values[16]?.replace(/'/g, ''),
    occupation_status: values[17]?.replace(/'/g, ''),
    occupation_group: values[18]?.replace(/'/g, ''),
    socioeconomic_level: values[19]?.replace(/'/g, ''),
    connectivity_level: values[20]?.replace(/'/g, ''),
    digital_exposure_level: values[21]?.replace(/'/g, ''),
    preferred_survey_channel: values[22]?.replace(/'/g, ''),
    agent_type: values[23]?.replace(/'/g, ''),
    backbone_key: values[24]?.replace(/'/g, ''),
    subtel_profile_key: values[25]?.replace(/'/g, ''),
    casen_profile_key: values[26]?.replace(/'/g, ''),
    location_lat: values[27] === 'NULL' ? null : parseFloat(values[27]),
    location_lng: values[28] === 'NULL' ? null : parseFloat(values[28]),
    employment_status: values[29]?.replace(/'/g, ''),
    generation_notes: values[30]?.replace(/'/g, ''),
    metadata: values[31],
    created_at: values[32]?.replace(/'/g, ''),
    updated_at: values[33]?.replace(/'/g, '')
  };
}

// Función para generar los nuevos campos
function generateNewFields(row: Record<string, any>): Record<string, any> {
  const age = row.age || 30;
  const sex = row.sex || 'male';
  const connectivityLevel = row.connectivity_level || 'medium';
  const occupationGroup = row.occupation_group;
  const occupationStatus = row.occupation_status;

  return {
    sex_code: sexCodeMap[sex] || 1,
    age_group_code: ageGroupCodeMap[row.age_group || 'adult'] || 4,
    education_level_code: educationLevelCodeMap[row.education_level || 'secondary'] || '02',
    occupation_status_code: occupationStatusCodeMap[occupationStatus || 'employed'] || 1,
    occupation_category_code: getOccupationCategoryCode(occupationGroup),
    ciuo_code: occupationStatus === 'employed' ? ciuoCodes[Math.floor(Math.random() * ciuoCodes.length)] : null,
    caenes_code: occupationStatus === 'employed' ? caenesCodes[Math.floor(Math.random() * caenesCodes.length)] : null,
    marital_status_code: getMaritalStatusCode(age, sex),
    indigenous_people_code: getIndigenousPeopleCode(),
    disability_status_code: getDisabilityStatusCode(),
    internet_quality: getInternetQuality(connectivityLevel),
    has_smartphone: hasSmartphone(connectivityLevel, age),
    has_computer: hasComputer(connectivityLevel, age)
  };
}

// Función para construir el nuevo INSERT con todos los campos
function buildNewInsert(row: Record<string, any>, newFields: Record<string, any>): string {
  const fields = [
    'agent_id', 'batch_id', 'version', 'territory_id', 'country_code', 'region_code',
    'comuna_code', 'province_code', 'urbanicity', 'sex', 'age', 'age_group',
    'household_size', 'household_type', 'income_decile', 'poverty_status',
    'education_level', 'occupation_status', 'occupation_group', 'socioeconomic_level',
    'connectivity_level', 'digital_exposure_level', 'preferred_survey_channel',
    'agent_type', 'backbone_key', 'subtel_profile_key', 'casen_profile_key',
    'location_lat', 'location_lng', 'employment_status', 'generation_notes',
    'metadata', 'created_at', 'updated_at',
    // Nuevos campos
    'sex_code', 'age_group_code', 'education_level_code', 'occupation_status_code',
    'occupation_category_code', 'ciuo_code', 'caenes_code', 'marital_status_code',
    'indigenous_people_code', 'disability_status_code', 'internet_quality',
    'has_smartphone', 'has_computer'
  ];

  const formatValue = (val: any, isString: boolean = false): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') return val.toString();
    if (isString || typeof val === 'string') return `'${val}'`;
    return val.toString();
  };

  const values = [
    formatValue(row.agent_id, true),
    formatValue(row.batch_id, true),
    formatValue(row.version, true),
    formatValue(row.territory_id),
    formatValue(row.country_code, true),
    formatValue(row.region_code),
    formatValue(row.comuna_code, true),
    formatValue(row.province_code, true),
    formatValue(row.urbanicity, true),
    formatValue(row.sex, true),
    formatValue(row.age),
    formatValue(row.age_group, true),
    formatValue(row.household_size),
    formatValue(row.household_type, true),
    formatValue(row.income_decile),
    formatValue(row.poverty_status, true),
    formatValue(row.education_level, true),
    formatValue(row.occupation_status, true),
    formatValue(row.occupation_group, true),
    formatValue(row.socioeconomic_level, true),
    formatValue(row.connectivity_level, true),
    formatValue(row.digital_exposure_level, true),
    formatValue(row.preferred_survey_channel, true),
    formatValue(row.agent_type, true),
    formatValue(row.backbone_key, true),
    formatValue(row.subtel_profile_key, true),
    formatValue(row.casen_profile_key, true),
    formatValue(row.location_lat),
    formatValue(row.location_lng),
    formatValue(row.employment_status, true),
    formatValue(row.generation_notes, true),
    row.metadata || "'{}'",
    formatValue(row.created_at, true),
    formatValue(row.updated_at, true),
    // Nuevos campos
    formatValue(newFields.sex_code),
    formatValue(newFields.age_group_code),
    formatValue(newFields.education_level_code, true),
    formatValue(newFields.occupation_status_code),
    formatValue(newFields.occupation_category_code),
    formatValue(newFields.ciuo_code, true),
    formatValue(newFields.caenes_code, true),
    formatValue(newFields.marital_status_code),
    formatValue(newFields.indigenous_people_code),
    formatValue(newFields.disability_status_code),
    formatValue(newFields.internet_quality, true),
    formatValue(newFields.has_smartphone),
    formatValue(newFields.has_computer)
  ];

  return `INSERT INTO synthetic_agents (${fields.join(', ')}) VALUES (${values.join(', ')});`;
}

// Procesar un archivo SQL
async function processFile(inputPath: string, outputPath: string): Promise<void> {
  console.log(`Procesando: ${path.basename(inputPath)}`);

  const content = fs.readFileSync(inputPath, 'utf-8');
  const lines = content.split('\n');
  const outputLines: string[] = [];
  let processedCount = 0;

  for (const line of lines) {
    if (line.trim().startsWith('INSERT INTO')) {
      const row = extractInsertValues(line);
      if (row) {
        const newFields = generateNewFields(row);
        const newInsert = buildNewInsert(row, newFields);
        outputLines.push(newInsert);
        processedCount++;
      } else {
        outputLines.push(line);
      }
    } else {
      outputLines.push(line);
    }
  }

  fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf-8');
  console.log(`  ✓ Procesados ${processedCount} registros`);
}

// Función principal
async function main() {
  console.log('=== Agregando campos faltantes a archivos SQL ===\n');

  // Crear directorio de salida si no existe
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Procesar archivos _enriched_complete (tienen la estructura más completa)
  const files = fs.readdirSync(INPUT_DIR)
    .filter(f => f.match(/insert_agents_batch_\d+_enriched_complete\.sql$/))
    .sort();

  console.log(`Encontrados ${files.length} archivos para procesar\n`);

  for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file.replace('_complete.sql', '_final.sql'));
    await processFile(inputPath, outputPath);
  }

  console.log('\n=== Proceso completado ===');
  console.log(`Archivos generados en: ${OUTPUT_DIR}`);
}

main().catch(console.error);
