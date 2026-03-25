/**
 * Script para corregir las propiedades de la región AP (Arica y Parinacota)
 * que actualmente tienen datos incorrectos de La Araucanía
 */

import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'src/data/chileRegionsGeoJSON.ts');

console.log('🔧 Corrigiendo propiedades de AP (Arica y Parinacota)...\n');

// Leer archivo
const content = fs.readFileSync(filePath, 'utf-8');

// Buscar y reemplazar las propiedades incorrectas de AP
// La feature con ID "AP" tiene propiedades de La Araucanía (code: "AR", name: "La Araucanía")
// Debemos cambiarlas a las de Arica y Parinacota

const incorrectAPProperties = `"id": "AP",
      "properties": {
        "code": "AR",
        "name": "La Araucanía",
        "capital": "Temuco",
        "population": 957224,
        "area": 31842`;

const correctAPProperties = `"id": "AP",
      "properties": {
        "code": "AP",
        "name": "Arica y Parinacota",
        "capital": "Arica",
        "population": 226068,
        "area": 16387`;

if (content.includes(incorrectAPProperties)) {
  const newContent = content.replace(incorrectAPProperties, correctAPProperties);
  fs.writeFileSync(filePath, newContent);
  console.log('✅ Propiedades de AP corregidas exitosamente');
  console.log('   - code: AR → AP');
  console.log('   - name: La Araucanía → Arica y Parinacota');
  console.log('   - capital: Temuco → Arica');
  console.log('   - population: 957224 → 226068');
  console.log('   - area: 31842 → 16387');
} else {
  console.log('⚠️ No se encontraron las propiedades incorrectas de AP');
  console.log('   Posiblemente ya están corregidas o el formato es diferente');
}

console.log('\n✨ Proceso completado');
