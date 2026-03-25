/**
 * Script para corregir la región Metropolitana (RM) en el GeoJSON
 * Cambia el ID "SA" a "RM" y actualiza las propiedades
 */

import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, '../src/data/chileRegionsGeoJSON.ts');

console.log('🔧 Corrigiendo región Metropolitana (RM) en GeoJSON...\n');

// Leer el archivo
let content = fs.readFileSync(filePath, 'utf-8');

// Contar cuántas veces aparece "SA" en el archivo
const saCount = (content.match(/"SA"/g) || []).length;
console.log(`📊 Encontradas ${saCount} ocurrencias de "SA"`);

// Reemplazar el ID de la feature
content = content.replace(
  /"id": "SA"/g,
  '"id": "RM"'
);

// Reemplazar el código en propiedades
content = content.replace(
  /"code": "SA"/g,
  '"code": "RM"'
);

// Reemplazar el nombre
content = content.replace(
  /"name": "SantiagoMetropolitan"/g,
  '"name": "Metropolitana"'
);

// Reemplazar la capital
content = content.replace(
  /"capital": "N\/A"/g,
  '"capital": "Santiago"'
);

// Guardar el archivo
fs.writeFileSync(filePath, content, 'utf-8');

console.log('✅ Archivo corregido exitosamente');
console.log('\n📝 Cambios realizados:');
console.log('  - ID: "SA" → "RM"');
console.log('  - code: "SA" → "RM"');
console.log('  - name: "SantiagoMetropolitan" → "Metropolitana"');
console.log('  - capital: "N/A" → "Santiago"');

// Verificar que se hicieron los cambios
const rmCount = (content.match(/"RM"/g) || []).length;
console.log(`\n📊 Ahora hay ${rmCount} ocurrencias de "RM"`);
