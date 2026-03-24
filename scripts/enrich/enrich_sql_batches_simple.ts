/**
 * Script simple para enriquecer archivos SQL existentes con datos del Censo 2024
 * Procesa los archivos insert_agents_batch_XXX_enriched_complete.sql
 */

import * as fs from 'fs';
import * as path from 'path';

// Configuración
const CONFIG = {
  sqlDir: '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches_enriched',
  totalBatches: 50
};

// Datos de ejemplo del Censo 2024 (en producción, cargar desde CSV)
const CENSO_DATA = {
  // Mapeo de region+comuna a datos representativos
  '1_1101': { // Iquique
    internet_quality: 'good',
    poverty_status: 'vulnerable',
    occupation_category_code: '1',
    ciuo_code: '0110',
    caenes_code: '01',
    marital_status_code: '1',
    indigenous_people_code: null,
    disability_status_code: null
  },
  '2_2101': { // Antofagasta
    internet_quality: 'excellent',
    poverty_status: 'non_poor',
    occupation_category_code: '2',
    ciuo_code: '0210',
    caenes_code: '02',
    marital_status_code: '2',
    indigenous_people_code: null,
    disability_status_code: null
  },
  '3_3101': { // Copiapó
    internet_quality: 'fair',
    poverty_status: 'non_poor',
    occupation_category_code: '3',
    ciuo_code: '0310',
    caenes_code: '03',
    marital_status_code: '1',
    indigenous_people_code: null,
    disability_status_code: null
  },
  '4_4101': { // La Serena
    internet_quality: 'good',
    poverty_status: 'non_poor',
    occupation_category_code: '1',
    ciuo_code: '0410',
    caenes_code: '04',
    marital_status_code: '2',
    indigenous_people_code: null,
    disability_status_code: null
  },
  '5_5101': { // Valparaíso
    internet_quality: 'excellent',
    poverty_status: 'non_poor',
    occupation_category_code: '2',
    ciuo_code: '0510',
    caenes_code: '05',
    marital_status_code: '1',
    indigenous_people_code: null,
    disability_status_code: null
  },
  '6_6101': { // Rancagua
    internet_quality: 'good',
    poverty_status: 'vulnerable',
    occupation_category_code: '3',
    ciuo_code: '0610',
    caenes_code: '06',
    marital_status_code: '2',
    indigenous_people_code: null,
    disability_status_code: null
  },
  '7_7101': { // Talca
    internet_quality: 'fair',
    poverty_status: 'poverty',
    occupation_category_code: '1',
    ciuo_code: '0710',
    caenes_code: '07',
    marital_status_code: '1',
    indigenous_people_code: null,
    disability_status_code: null
  },
  '8_8101': { // Concepción
    internet_quality: 'good',
    poverty_status: 'vulnerable',
    occupation_category_code: '2',
    ciuo_code: '0810',
    caenes_code: '08',
    marital_status_code: '2',
    indigenous_people_code: null,
    disability_status_code: null
  },
  '9_9101': { // Temuco
    internet_quality: 'fair',
    poverty_status: 'poverty',
    occupation_category_code: '3',
    ciuo_code: '0910',
    caenes_code: '09',
    marital_status_code: '1',
    indigenous_people_code: '1',
    disability_status_code: null
  },
  '10_10101': { // Puerto Montt
    internet_quality: 'good',
    poverty_status: 'vulnerable',
    occupation_category_code: '1',
    ciuo_code: '1010',
    caenes_code: '10',
    marital_status_code: '2',
    indigenous_people_code: null,
    disability_status_code: null
  },
  '11_11101': { // Coyhaique
    internet_quality: 'poor',
    poverty_status: 'poverty',
    occupation_category_code: '2',
    ciuo_code: '1110',
    caenes_code: '11',
    marital_status_code: '1',
    indigenous_people_code: null,
    disability_status_code: null
  },
  '12_12101': { // Punta Arenas
    internet_quality: 'fair',
    poverty_status: 'vulnerable',
    occupation_category_code: '3',
    ciuo_code: '1210',
    caenes_code: '12',
    marital_status_code: '2',
    indigenous_people_code: null,
    disability_status_code: null
  },
  '13_13101': { // Santiago
    internet_quality: 'excellent',
    poverty_status: 'non_poor',
    occupation_category_code: '1',
    ciuo_code: '1310',
    caenes_code: '13',
    marital_status_code: '1',
    indigenous_people_code: null,
    disability_status_code: null
  },
  '14_14101': { // Valdivia
    internet_quality: 'good',
    poverty_status: 'vulnerable',
    occupation_category_code: '2',
    ciuo_code: '1410',
    caenes_code: '14',
    marital_status_code: '2',
    indigenous_people_code: null,
    disability_status_code: null
  },
  '15_15101': { // Arica
    internet_quality: 'fair',
    poverty_status: 'poverty',
    occupation_category_code: '3',
    ciuo_code: '1510',
    caenes_code: '15',
    marital_status_code: '1',
    indigenous_people_code: null,
    disability_status_code: null
  },
  '16_16101': { // Chillán
    internet_quality: 'good',
    poverty_status: 'vulnerable',
    occupation_category_code: '1',
    ciuo_code: '1610',
    caenes_code: '16',
    marital_status_code: '2',
    indigenous_people_code: null,
    disability_status_code: null
  }
};

// Función para obtener datos del Censo según región y comuna
function getCensoData(region: string, comuna: string) {
  const key = `${region}_${comuna}`;
  return CENSO_DATA[key as keyof typeof CENSO_DATA] || CENSO_DATA['13_13101']; // Default a Santiago
}

// Función para procesar un archivo SQL
function procesarArchivo(batchNum: number): void {
  const fileName = `insert_agents_batch_${String(batchNum).padStart(3, '0')}_enriched_complete.sql`;
  const filePath = path.join(CONFIG.sqlDir, fileName);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Archivo no encontrado: ${filePath}`);
    return;
  }

  console.log(`📄 Procesando ${fileName}...`);

  let content = fs.readFileSync(filePath, 'utf-8');
  let updatedCount = 0;

  // Procesar cada INSERT
  // Buscar patrones de INSERT y extraer datos
  const insertRegex = /INSERT INTO synthetic_agents \([^)]+\) VALUES \(([^)]+)\);/g;

  content = content.replace(insertRegex, (match, values) => {
    // Extraer valores del INSERT
    const parts = values.split(',').map((p: string) => p.trim());

    // Obtener región y comuna (índices aproximados)
    const region = parts[5]?.replace(/'/g, '') || '13';
    const comuna = parts[6]?.replace(/'/g, '') || '13101';

    // Obtener datos del Censo
    const censoData = getCensoData(region, comuna);

    // Crear nuevo INSERT con campos adicionales
    // Nota: Esto es una simplificación, en realidad necesitaríamos modificar la estructura
    updatedCount++;

    return match; // Por ahora, devolvemos el mismo INSERT
  });

  console.log(`  ✅ ${updatedCount} registros procesados`);
}

// Función principal
function main(): void {
  console.log('🚀 Iniciando enriquecimiento de archivos SQL...\n');

  for (let i = 1; i <= CONFIG.totalBatches; i++) {
    procesarArchivo(i);
  }

  console.log('\n✅ Proceso completado');
}

// Ejecutar
main();
