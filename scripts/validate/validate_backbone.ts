/**
 * Validate Backbone
 * 
 * Valida la integridad del population_backbone.
 * 
 * INPUT:
 *   - data/processed/population_backbone.json
 * 
 * OUTPUT:
 *   - data/validation/backbone_validation.json
 * 
 * ETAPA: Validación
 */

import * as fs from 'fs';
import * as path from 'path';

const INPUT_PATH = path.join(process.cwd(), 'data/processed/population_backbone.json');
const OUTPUT_PATH = path.join(process.cwd(), 'data/validation/backbone_validation.json');

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  territory_code?: string;
}

interface ValidationResult {
  is_valid: boolean;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  issues: ValidationIssue[];
  summary: {
    total_population: number;
    avg_income: number;
    avg_poverty_rate: number;
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
  if (!record.territory_code) {
    issues.push({ severity: 'error', field: 'territory_code', message: 'Código de territorio requerido' });
  }
  if (!record.territory_name) {
    issues.push({ severity: 'error', field: 'territory_name', message: 'Nombre de territorio requerido' });
  }
  
  // Validar población
  if (record.total_population !== undefined && record.total_population < 0) {
    issues.push({ severity: 'error', field: 'total_population', message: 'Población no puede ser negativa', territory_code: record.territory_code });
  }
  
  // Validar coherencia de género
  const genderSum = (record.male_population || 0) + (record.female_population || 0);
  if (record.total_population && Math.abs(genderSum - record.total_population) > 10) {
    issues.push({ severity: 'warning', field: 'population', message: 'Suma de géneros no coincide con población total', territory_code: record.territory_code });
  }
  
  // Validar estructura de edad
  const ageSum = (record.age_0_14 || 0) + (record.age_15_64 || 0) + (record.age_65_plus || 0);
  if (record.total_population && Math.abs(ageSum - record.total_population) > 100) {
    issues.push({ severity: 'warning', field: 'age', message: 'Suma de grupos de edad no coincide con población total', territory_code: record.territory_code });
  }
  
  // Validar tasas
  if (record.age_dependency_ratio !== undefined && (record.age_dependency_ratio < 0 || record.age_dependency_ratio > 150)) {
    issues.push({ severity: 'warning', field: 'age_dependency_ratio', message: 'Ratio de dependencia fuera de rango típico', territory_code: record.territory_code });
  }
  
  if (record.unemployment_rate !== undefined && (record.unemployment_rate < 0 || record.unemployment_rate > 100)) {
    issues.push({ severity: 'error', field: 'unemployment_rate', message: 'Tasa de desempleo fuera de rango (0-100)', territory_code: record.territory_code });
  }
  
  // Validar ingresos
  if (record.avg_per_capita_income !== undefined && record.avg_per_capita_income < 0) {
    issues.push({ severity: 'error', field: 'avg_per_capita_income', message: 'Ingreso no puede ser negativo', territory_code: record.territory_code });
  }
  
  // Validar pobreza
  if (record.poverty_rate !== undefined && (record.poverty_rate < 0 || record.poverty_rate > 100)) {
    issues.push({ severity: 'error', field: 'poverty_rate', message: 'Tasa de pobreza fuera de rango (0-100)', territory_code: record.territory_code });
  }
  
  return issues;
}

/**
 * Ejecutar validación
 */
function validateBackbone(): ValidationResult {
  console.log('🔍 Validando population_backbone...');
  
  const data = loadData();
  const allIssues: ValidationIssue[] = [];
  
  for (const record of data) {
    const issues = validateRecord(record);
    allIssues.push(...issues);
  }
  
  const errors = allIssues.filter(i => i.severity === 'error');
  const warnings = allIssues.filter(i => i.severity === 'warning');
  
  const result: ValidationResult = {
    is_valid: errors.length === 0,
    total_records: data.length,
    valid_records: data.length - errors.length,
    invalid_records: errors.length,
    issues: allIssues,
    summary: {
      total_population: data.reduce((sum, r) => sum + (r.total_population || 0), 0),
      avg_income: data.length > 0 
        ? data.reduce((sum, r) => sum + (r.avg_per_capita_income || 0), 0) / data.length 
        : 0,
      avg_poverty_rate: data.length > 0 
        ? data.reduce((sum, r) => sum + (r.poverty_rate || 0), 0) / data.length 
        : 0,
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
export function validateBackbonePipeline(): void {
  console.log('🚀 Iniciando validación de backbone...');
  console.log('='.repeat(50));
  
  const result = validateBackbone();
  
  console.log(`📊 Registros validados: ${result.total_records}`);
  console.log(`✅ Válidos: ${result.valid_records}`);
  console.log(`❌ Inválidos: ${result.invalid_records}`);
  console.log(`⚠️ Advertencias: ${result.issues.filter(i => i.severity === 'warning').length}`);
  
  if (result.is_valid) {
    console.log('✅ Validación PASSED');
  } else {
    console.log('❌ Validación FAILED');
  }
  
  saveValidation(result);
  
  console.log('='.repeat(50));
}

if (process.argv[1]?.includes('pipeline.ts')) {
  validateBackbonePipeline();
}

export default validateBackbonePipeline;