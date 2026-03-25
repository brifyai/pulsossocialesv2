/**
 * Script para corregir los IDs duplicados en chileRegionsGeoJSON.ts
 *
 * Problemas identificados:
 * 1. Segunda feature "AR" (línea ~9739) debería ser "AP" (Arica y Parinacota)
 * 2. Segunda feature "LO" (línea ~200337) debería ser "LR" (Los Ríos)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, '../src/data/chileRegionsGeoJSON.ts');

// Datos correctos para las regiones
const regionData: Record<string, { name: string; capital: string; population: number; area: number }> = {
  AP: {
    name: "Arica y Parinacota",
    capital: "Arica",
    population: 226068,
    area: 16873
  },
  LR: {
    name: "Los Ríos",
    capital: "Valdivia",
    population: 384934,
    area: 18429
  }
};

function fixGeoJSON() {
  console.log('Leyendo archivo...');
  let content = fs.readFileSync(filePath, 'utf-8');

  // Contar ocurrencias de cada ID en features
  const featureMatches = content.match(/"type": "Feature"[^}]*"id": "(AR|LO)"/g);
  console.log('Features AR/LO encontradas:', featureMatches?.length || 0);

  // Dividir el contenido en líneas para procesamiento
  const lines = content.split('\n');
  let arCount = 0;
  let loCount = 0;
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Buscar "id": "AR" en features (no en el array chileRegions)
    if (line.includes('"id": "AR"') && i > 200) {
      arCount++;
      if (arCount === 2) {
        console.log(`Corrigiendo segunda AR en línea ${i + 1}...`);

        // Corregir ID
        lines[i] = line.replace('"id": "AR"', '"id": "AP"');

        // Corregir code (línea siguiente)
        if (lines[i + 1] && lines[i + 1].includes('"code": "AR"')) {
          lines[i + 1] = lines[i + 1].replace('"code": "AR"', '"code": "AP"');
        }

        // Corregir name (2 líneas después)
        if (lines[i + 2] && lines[i + 2].includes('"name": "La Araucanía"')) {
          lines[i + 2] = lines[i + 2].replace('"name": "La Araucanía"', '"name": "Arica y Parinacota"');
        }

        // Corregir capital (3 líneas después)
        if (lines[i + 3] && lines[i + 3].includes('"capital": "Temuco"')) {
          lines[i + 3] = lines[i + 3].replace('"capital": "Temuco"', '"capital": "Arica"');
        }

        // Corregir population (4 líneas después)
        if (lines[i + 4] && lines[i + 4].includes('"population": 957224')) {
          lines[i + 4] = lines[i + 4].replace('"population": 957224', '"population": 226068');
        }

        // Corregir area (5 líneas después)
        if (lines[i + 5] && lines[i + 5].includes('"area": 31842')) {
          lines[i + 5] = lines[i + 5].replace('"area": 31842', '"area": 16873');
        }

        modified = true;
        console.log('  ✓ Corregida a AP (Arica y Parinacota)');
      }
    }

    // Buscar "id": "LO" en features (no en el array chileRegions)
    if (line.includes('"id": "LO"') && i > 200) {
      loCount++;
      if (loCount === 2) {
        console.log(`Corrigiendo segunda LO en línea ${i + 1}...`);

        // Corregir ID
        lines[i] = line.replace('"id": "LO"', '"id": "LR"');

        // Corregir code (línea siguiente)
        if (lines[i + 1] && lines[i + 1].includes('"code": "LO"')) {
          lines[i + 1] = lines[i + 1].replace('"code": "LO"', '"code": "LR"');
        }

        // Corregir name (2 líneas después)
        if (lines[i + 2] && lines[i + 2].includes('"name": "LosRíos"')) {
          lines[i + 2] = lines[i + 2].replace('"name": "LosRíos"', '"name": "Los Ríos"');
        }

        // Corregir capital (3 líneas después)
        if (lines[i + 3] && lines[i + 3].includes('"capital": "N/A"')) {
          lines[i + 3] = lines[i + 3].replace('"capital": "N/A"', '"capital": "Valdivia"');
        }

        modified = true;
        console.log('  ✓ Corregida a LR (Los Ríos)');
      }
    }
  }

  if (modified) {
    console.log('\nGuardando cambios...');
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    console.log('✅ Archivo corregido exitosamente');
  } else {
    console.log('⚠️ No se encontraron correcciones necesarias');
  }

  // Verificar resultado
  console.log('\nVerificando IDs únicos en features:');
  const newContent = fs.readFileSync(filePath, 'utf-8');
  const ids = newContent.match(/"type": "Feature"[^}]*"id": "([^"]+)"/g);
  const uniqueIds = new Set<string>();
  const duplicates: string[] = [];

  ids?.forEach(match => {
    const idMatch = match.match(/"id": "([^"]+)"/);
    if (idMatch) {
      const id = idMatch[1];
      if (uniqueIds.has(id)) {
        duplicates.push(id);
      } else {
        uniqueIds.add(id);
      }
    }
  });

  console.log(`  IDs únicos: ${uniqueIds.size}`);
  console.log(`  IDs: ${Array.from(uniqueIds).sort().join(', ')}`);

  if (duplicates.length > 0) {
    console.log(`  ❌ IDs duplicados: ${duplicates.join(', ')}`);
  } else {
    console.log('  ✅ No hay IDs duplicados');
  }
}

fixGeoJSON();
