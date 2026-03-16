/**
 * Synthesize Population
 * 
 * Genera población sintética a nivel de comuna basada en el backbone de población.
 * 
 * INPUT:
 *   - data/processed/population_backbone.json
 *   - data/processed/territories_master.json
 * 
 * OUTPUT:
 *   - data/processed/synthetic_population.json
 * 
 * ETAPA: Síntesis
 * 
 * NOTA: Este script genera datos sintéticos a nivel de comuna
 * para demostrar la capacidad del pipeline. En producción,
 * esto se haría con datos reales a nivel de granularidad.
 */

import * as fs from 'fs';
import * as path from 'path';

const POPULATION_BACKBONE = path.join(process.cwd(), 'data/processed/population_backbone.json');
const TERRITORIES_MASTER = path.join(process.cwd(), 'data/processed/territories_master.json');
const OUTPUT_PATH = path.join(process.cwd(), 'data/processed/synthetic_population.json');

// Comunas de ejemplo por región (placeholder - en producción vendría de datos reales)
const COMMUNE_SAMPLES: Record<string, string[]> = {
  'RM': ['Santiago', 'Providencia', 'Las Condes', 'Ñuñoa', 'Maipú', 'La Florida', 'Peñalolén', 'San Bernardo', 'Puente Alto'],
  'VA': ['Valparaíso', 'Viña del Mar', 'Quilpué', 'Villa Alemana', 'San Antonio'],
  'BI': ['Concepción', 'Talcahuano', 'Chiguayante', 'San Pedro de la Paz', 'Los Ángeles'],
  'ML': ['Talca', 'Curicó', 'Linares', 'Cauquenes'],
  'AR': ['Temuco', 'Padre Las Casas', 'Villarrica', 'Pucón'],
  'LI': ['Rancagua', 'San Fernando', 'Pichilemu'],
  'CO': ['La Serena', 'Coquimbo', 'Ovalle', 'Illapel'],
  'AN': ['Antofagasta', 'Calama', 'Tocopilla'],
  'LL': ['Puerto Montt', 'Osorno', 'Castro', 'Quellón'],
  'TA': ['Iquique', 'Alto Hospicio', 'Arica'],
  'AT': ['Copiapó', 'Caldera', 'Chañaral'],
  'NB': ['Chillán', 'San Carlos', 'Bulnes'],
  'LR': ['Valdivia', 'La Unión', 'Río Bueno'],
  'AP': ['Arica', 'Putre'],
  'AI': ['Coyhaique', 'Chile Chico'],
  'MA': ['Punta Arenas', 'Puerto Natales', 'Porvenir'],
};

interface SyntheticCommune {
  // Identificación
  region_code: string;
  region_name: string;
  commune_code: string;
  commune_name: string;
  
  // Población
  total_population: number;
  male_population: number;
  female_population: number;
  
  // Estructura de edad
  age_0_14: number;
  age_15_64: number;
  age_65_plus: number;
  
  // Distribución por género y edad
  male_age_0_14: number;
  male_age_15_64: number;
  male_age_65_plus: number;
  female_age_0_14: number;
  female_age_15_64: number;
  female_age_65_plus: number;
  
  // Ingresos
  avg_per_capita_income: number;
  income_quintile: number;
  
  // Pobreza
  poverty_rate: number;
  extreme_poverty_rate: number;
  
  // Metadatos
  is_synthetic: boolean;
  generation_method: string;
  created_at: string;
}

/**
 * Cargar datos
 */
function loadBackbone(): any[] {
  if (!fs.existsSync(POPULATION_BACKBONE)) {
    console.warn(`⚠️ Archivo no encontrado: ${POPULATION_BACKBONE}`);
    return [];
  }
  return JSON.parse(fs.readFileSync(POPULATION_BACKBONE, 'utf-8'));
}

function loadTerritories(): any[] {
  if (!fs.existsSync(TERRITORIES_MASTER)) {
    console.warn(`⚠️ Archivo no encontrado: ${TERRITORIES_MASTER}`);
    return [];
  }
  return JSON.parse(fs.readFileSync(TERRITORIES_MASTER, 'utf-8'));
}

/**
 * Generar código de comuna
 */
function generateCommuneCode(regionCode: string, index: number): string {
  const regionNum = parseInt(regionCode) || 1;
  return `${regionNum.toString().padStart(2, '0')}${(index + 1).toString().padStart(3, '0')}`;
}

/**
 * Generar distribución de edad con variabilidad
 */
function distributeAge(totalPop: number, baseYoung: number, baseWorking: number, baseElder: number): [number, number, number] {
  // Agregar variabilidad del ±10%
  const young = Math.round(baseYoung * (0.9 + Math.random() * 0.2));
  const working = Math.round(baseWorking * (0.9 + Math.random() * 0.2));
  const elder = totalPop - young - working;
  
  return [young, Math.max(working, 0), Math.max(elder, 0)];
}

/**
 * Generar población sintética por comuna
 */
function synthesizePopulation(): SyntheticCommune[] {
  console.log('🧬 Generando población sintética...');
  
  const backbone = loadBackbone();
  const territories = loadTerritories();
  
  // Indexar territorios
  const territoryMap = new Map<string, any>();
  for (const t of territories) {
    territoryMap.set(t.code, t);
  }
  
  const syntheticPopulation: SyntheticCommune[] = [];
  
  for (const region of backbone) {
    const regionCode = region.territory_code;
    const communes = COMMUNE_SAMPLES[regionCode] || ['Capital Regional'];
    const territory = territoryMap.get(regionCode);
    
    // Población base por comuna (distribución no uniforme)
    const totalPop = region.total_population;
    const communeCount = communes.length;
    const basePopPerCommune = Math.floor(totalPop / communeCount);
    
    for (let i = 0; i < communes.length; i++) {
      const communeName = communes[i];
      
      // Variar población por comuna (±30%)
      const popVariation = 0.7 + Math.random() * 0.6;
      const communePop = Math.round(basePopPerCommune * popVariation);
      
      // Distribución de edad
      const [age0_14, age15_64, age65_plus] = distributeAge(
        communePop,
        region.age_0_14 / totalPop * communePop,
        region.age_15_64 / totalPop * communePop,
        region.age_65_plus / totalPop * communePop
      );
      
      // Distribución por género (aproximadamente 48.5% masculino)
      const maleRatio = 0.485;
      const malePop = Math.round(communePop * maleRatio);
      const femalePop = communePop - malePop;
      
      // Distribución edad x género
      const maleYoung = Math.round(age0_14 * maleRatio);
      const maleWorking = Math.round(age15_64 * maleRatio);
      const maleElder = Math.round(age65_plus * maleRatio);
      const femaleYoung = age0_14 - maleYoung;
      const femaleWorking = age15_64 - maleWorking;
      const femaleElder = age65_plus - maleElder;
      
      // Ingresos con variabilidad regional
      const incomeVariation = 0.7 + Math.random() * 0.6;
      const avgIncome = Math.round(region.avg_per_capita_income * incomeVariation);
      
      // Quintil (distribución normal centrada en el regional)
      const quintileBase = region.income_quintile_avg;
      const quintile = Math.max(1, Math.min(5, Math.round(quintileBase + (Math.random() - 0.5) * 2)));
      
      // Pobreza con variabilidad
      const povertyVariation = 0.8 + Math.random() * 0.4;
      const povertyRate = Math.min(100, region.poverty_rate * povertyVariation);
      const extremePovertyRate = Math.min(povertyRate, region.extreme_poverty_rate * povertyVariation);
      
      syntheticPopulation.push({
        region_code: regionCode,
        region_name: territory?.name || region.territory_name,
        commune_code: generateCommuneCode(regionCode, i),
        commune_name: communeName,
        
        total_population: communePop,
        male_population: malePop,
        female_population: femalePop,
        
        age_0_14: age0_14,
        age_15_64: age15_64,
        age_65_plus: age65_plus,
        
        male_age_0_14: maleYoung,
        male_age_15_64: maleWorking,
        male_age_65_plus: maleElder,
        female_age_0_14: femaleYoung,
        female_age_15_64: femaleWorking,
        female_age_65_plus: femaleElder,
        
        avg_per_capita_income: avgIncome,
        income_quintile: quintile,
        
        poverty_rate: Math.round(povertyRate * 100) / 100,
        extreme_poverty_rate: Math.round(extremePovertyRate * 100) / 100,
        
        is_synthetic: true,
        generation_method: 'population_backbone_proportional_allocation',
        created_at: new Date().toISOString(),
      });
    }
  }
  
  return syntheticPopulation;
}

/**
 * Guardar resultado
 */
function saveSyntheticPopulation(data: SyntheticCommune[]): void {
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
  console.log(`✅ Población sintética guardada en: ${OUTPUT_PATH}`);
}

/**
 * Función principal
 */
export function synthesizePopulationPipeline(): void {
  console.log('🚀 Iniciando síntesis de población...');
  console.log('='.repeat(50));
  
  const data = synthesizePopulation();
  console.log(`📊 Comunas generadas: ${data.length}`);
  console.log(`📊 Población total: ${data.reduce((sum, c) => sum + c.total_population, 0).toLocaleString()}`);
  
  saveSyntheticPopulation(data);
  
  console.log('='.repeat(50));
  console.log('✅ synthetic_population completado');
}

if (process.argv[1]?.includes('pipeline.ts')) {
  synthesizePopulationPipeline();
}

export default synthesizePopulationPipeline;