/**
 * Script para corregir códigos de comuna en el archivo JSON de agentes
 * Mapea códigos incorrectos (01001-01009) a códigos oficiales según diccionario
 */

import * as fs from 'fs';
import * as path from 'path';

// Mapeo de códigos incorrectos a códigos oficiales
const comunaCodeMapping: Record<string, string> = {
  '01001': '01101', // Iquique
  '01002': '01102', // Alto Hospicio
  '01003': '01107', // Pica
  '01004': '01201', // Pozo Almonte
  '01005': '01202', // María Elena
  '01006': '01203', // Sierra Gorda
  '01007': '01204', // Calama
  '01008': '01401', // Ollagüe
  '01009': '01402', // San Pedro de Atacama
};

// Nombres de comunas para referencia
const comunaNames: Record<string, string> = {
  '01101': 'Iquique',
  '01102': 'Alto Hospicio',
  '01107': 'Pica',
  '01201': 'Pozo Almonte',
  '01202': 'María Elena',
  '01203': 'Sierra Gorda',
  '01204': 'Calama',
  '01401': 'Ollagüe',
  '01402': 'San Pedro de Atacama',
};

function fixComunaCodes() {
  const inputFile = path.join(process.cwd(), 'data', 'processed', 'synthetic_agents_v1.json');
  const outputFile = path.join(process.cwd(), 'data', 'processed', 'synthetic_agents_v1_fixed.json');

  console.log('📖 Leyendo archivo de agentes...');
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  const agents = data.agents;
  console.log(`   Total de agentes: ${agents.length}`);

  let fixedCount = 0;
  const codeDistribution: Record<string, number> = {};

  // Corregir códigos de comuna
  const fixedAgents = agents.map((agent: any) => {
    const oldCode = agent.comuna_code;
    const newCode = comunaCodeMapping[oldCode];

    if (newCode) {
      fixedCount++;
      codeDistribution[newCode] = (codeDistribution[newCode] || 0) + 1;
      return {
        ...agent,
        comuna_code: newCode,
        comuna_name: comunaNames[newCode] || agent.comuna_name,
      };
    }

    // Si no hay mapeo, mantener el código original
    codeDistribution[oldCode] = (codeDistribution[oldCode] || 0) + 1;
    return agent;
  });

  console.log(`\n✅ Códigos corregidos: ${fixedCount} de ${agents.length} agentes`);

  console.log('\n📊 Distribución de códigos después de la corrección:');
  Object.entries(codeDistribution)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([code, count]) => {
      const name = comunaNames[code] || '';
      console.log(`   ${code}${name ? ` (${name})` : ''}: ${count} agentes`);
    });

  // Crear objeto de salida con metadata actualizada
  const outputData = {
    ...data,
    agents: fixedAgents,
    metadata: {
      ...data.metadata,
      comuna_codes_fixed: true,
      comuna_codes_fixed_at: new Date().toISOString(),
    }
  };

  // Guardar archivo corregido
  fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
  console.log(`\n💾 Archivo guardado: ${outputFile}`);

  // También sobrescribir el archivo original
  fs.writeFileSync(inputFile, JSON.stringify(outputData, null, 2));
  console.log(`💾 Archivo original actualizado: ${inputFile}`);

  return fixedAgents;
}

// Ejecutar
fixComunaCodes();
console.log('\n✨ Proceso completado');
