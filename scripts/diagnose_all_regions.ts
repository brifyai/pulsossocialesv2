/**
 * Script para diagnosticar todas las regiones y verificar
 * si los IDs coinciden con las propiedades internas
 */

import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'src/data/chileRegionsGeoJSON.ts');

console.log('🔍 Diagnosticando todas las regiones...\n');

// Leer archivo
const content = fs.readFileSync(filePath, 'utf-8');

// Extraer la sección de features
const featuresMatch = content.match(/export const chileRegionsGeoJSON.*?features:\s*(\[.*?\])\s*\};/s);

if (!featuresMatch) {
  console.error('❌ No se pudo encontrar la sección de features');
  process.exit(1);
}

// Parsear features (forma simple)
const featuresSection = featuresMatch[1];

// Encontrar cada feature individual
const featureRegex = /\{\s*"type":\s*"Feature"[\s\S]*?\}\s*(?=,\s*\{|\])/g;
const features = featuresSection.match(featureRegex) || [];

console.log(`Total de features encontradas: ${features.length}\n`);

const issues: string[] = [];

features.forEach((feature, index) => {
  // Extraer ID
  const idMatch = feature.match(/"id":\s*"([^"]+)"/);
  const id = idMatch ? idMatch[1] : 'NO ID';

  // Extraer propiedades
  const codeMatch = feature.match(/"code":\s*"([^"]+)"/);
  const code = codeMatch ? codeMatch[1] : 'NO CODE';

  const nameMatch = feature.match(/"name":\s*"([^"]+)"/);
  const name = nameMatch ? nameMatch[1] : 'NO NAME';

  console.log(`Feature ${index + 1}:`);
  console.log(`  ID: ${id}`);
  console.log(`  Code: ${code}`);
  console.log(`  Name: ${name}`);

  if (id !== code) {
    console.log(`  ⚠️  PROBLEMA: ID (${id}) != CODE (${code})`);
    issues.push(`Feature ${index + 1}: ID "${id}" tiene code "${code}" (Name: ${name})`);
  } else {
    console.log(`  ✅ OK`);
  }
  console.log('');
});

if (issues.length > 0) {
  console.log('\n❌ PROBLEMAS ENCONTRADOS:');
  console.log('========================');
  issues.forEach(issue => console.log(`  - ${issue}`));
  console.log(`\nTotal de problemas: ${issues.length}`);
} else {
  console.log('\n✅ Todas las regiones tienen IDs y codes consistentes');
}
