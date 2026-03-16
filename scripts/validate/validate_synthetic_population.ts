/**
 * Validate Synthetic Population
 * 
 * Valida la integridad de la población sintética.
 * 
 * INPUT:
 *   - data/processed/synthetic_population.json
 * 
 * OUTPUT:
 *   - data/validation/synthetic_population_validation.json
 * 
 * ETAPA: Validación
 */

import * as fs from 'fs';
import * as path from 'path';

const INPUT_PATH = path.join(process.cwd(), 'data/processed/synthetic_population.json');
const OUTPUT_PATH = path.join(process.cwd(), 'data/validation/synthetic_population_validation.json');

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  commune_code?: string;
}

interface ValidationResult {
  is_valid: boolean;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  issues: ValidationIssue[];
  summary: {
    total_population: number;
    total_communes: number;
    avg_population_per_commune: number;
    population_by_region: Record<string, number>;
  };
  checked_at: string;
}

/**
 * Cargar datos
 */
function loadData(): any[] {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`❌ Archivo no encontrado: ${INPUT_PATH}`);
    return [];
  }
  return JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));
}

/**
 * Validar un registro
 */
function validateRecord(record: any): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Validar campos requeridos
  if (!record.commune_code) {
    issues.push({ severity: 'error', field: 'commune_code', message: 'Código de comuna requerido' });
  }
  if (!record.commune_name) {
    issues.push({ severity: 'error', field: 'commune_name', message: 'Nombre de comuna requerido' });
  }
  if (!record.region_code) {
    issues.push({ severity: 'error', field: 'region_code', message: 'Código de región requerido' });
  }
  
  // Validar población
  if (record.total_population !== undefined && record.total_population < 0) {
    issues.push({ severity: 'error', field: 'total_population', message: 'Población no puede ser negativa', commune_code: record.commune_code });
  }
  
  // Validar coherencia de género
  const genderSum = (record.male_population || 0) + (record.female_population || 0);
  if (record.total_population && Math.abs(genderSum - record.total_population) > 5) {
    issues.push({ severity: 'warning', field: 'population', message: 'Suma de géneros no coincide', commune_code: record.commune_code });
  }
  
  // Validar estructura de edad
  const ageSum = (record.age_0_14 || 0) + (record.age_15_64 || 0) + (record.age_65_plus || 0);
  if (record.total_population && Math.abs(ageSum - record.total_population) > 10) {
    issues.push({ severity: 'warning', field: 'age', message: 'Suma de grupos de edad no coincide', commune_code: record.commune_code });
  }
  
  // Validar ingresos
  if (record.avg_per_capita_income !== undefined && record.avg_per_capita_income < 0) {
    issues.push({ severity: 'error', field: 'avg_per_capita_income', message: 'Ingreso no puede ser negativo', commune_code: record.commune_code });
  }
  
  // Validar quintil
  if (record.income_quintile !== undefined && (record.income_quintile < 1 || record.income_quintile > 5)) {
    issues.push({ severity: 'error', field: 'income_quintile', message: 'Quintil debe estar entre 1 y 5', commune_code: record.commune_code });
  }
  
  // Validar pobreza
  if (record.poverty_rate !== undefined && (record.poverty_rate < 0 || record.poverty_rate > 100)) {
    issues.push({ severity: 'error', field: 'poverty_rate', message: 'Tasa de pobreza fuera de rango', commune_code: record.commune_code });
  }
  
  // Validar flag sintético
  if (!record.is_synthetic) {
    issues.push({ severity: 'warning', field: 'is_synthetic', message: 'Registro no marcado como sintético', commune_code: record.commune_code });
  }
  
  return issues;
}

/**
 * Ejecutar validación
 */
function validateSyntheticPopulation(): ValidationResult {
  console.log('🔍 Validando población sintética...');
  
  const data = loadData();
  const allIssues: ValidationIssue[] = [];
  const populationByRegion: Record<string, number> = {};
  
  for (const record of data) {
    const issues = validateRecord(record);
    allIssues.push(...issues);
    
    // Acumular población por región
    const regionCode = record.region_code || 'unknown';
    populationByRegion[regionCode] = (populationByRegion[regionCode] || 0) + (record.total_population || 0);
  }
  
  const errors = allIssues.filter(i => i.severity === 'error');
  
  const result: ValidationResult = {
    is_valid: errors.length === 0,
    total_records: data.length,
    valid_records: data.length - errors.length,
    invalid_records: errors.length,
    issues: allIssues,
    summary: {
      total_population: data.reduce((sum, r) => sum + (r.total_population || 0), 0),
      total_communes: data.length,
      avg_population_per_commune: data.length > 0 
        ? data.reduce((sum, r) => sum + (r.total_population || 0), 0) / data.length 
        : 0,
      population_by_region: populationByRegion,
    },
    checked_at: new Date().toISOString(),
  };
  
  return result;
}

/**
 * Guardar resultado
 */
function saveValidation(result: ValidationResult): void {
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  console.log(`✅ Validación guardada en: ${OUTPUT_PATH}`);
}

/**
 * Función principal
 */
export function validateSyntheticPopulationPipeline(): void {
  console.log('🚀 Iniciando validación de población sintética...');
  console.log('='.repeat(50));
  
  const result = validateSyntheticPopulation();
  
  console.log(`📊 Comunas validadas: ${result.total_records}`);
  console.log(`✅ Válidas: ${result.valid_records}`);
  console.log(`❌ Inválidas: ${result.invalid_records}`);
  console.log(`📊 Población total: ${result.summary.total_population.toLocaleString()}`);
  
  if (result.is_valid) {
    console.log('✅ Validación PASSED');
  } else {
    console.log('❌ Validación FAILED');
  }
  
  saveValidation(result);
  
  console.log('='.repeat(50));
}

if (process.argv[1]?.includes('pipeline.ts')) {
  validateSyntheticPopulationPipeline();
}

export default validateSyntheticPopulationPipeline;