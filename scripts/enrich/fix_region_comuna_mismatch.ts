/**
 * Script para corregir la inconsistencia entre region_code y comuna_code
 * Los agentes tienen region_code RM/VA pero comuna_code de Tarapacá (01xxx)
 * Este script reasigna códigos de comuna correctos según la región
 */

import * as fs from 'fs';
import * as path from 'path';

// Comunas de la Región Metropolitana (códigos 13xxx)
const rmComunas = [
  { code: '13101', name: 'Santiago' },
  { code: '13102', name: 'Cerrillos' },
  { code: '13103', name: 'Cerro Navia' },
  { code: '13104', name: 'Conchalí' },
  { code: '13105', name: 'El Bosque' },
  { code: '13106', name: 'Estación Central' },
  { code: '13107', name: 'Huechuraba' },
  { code: '13108', name: 'Independencia' },
  { code: '13109', name: 'La Cisterna' },
  { code: '13110', name: 'La Florida' },
  { code: '13111', name: 'La Granja' },
  { code: '13112', name: 'La Pintana' },
  { code: '13113', name: 'La Reina' },
  { code: '13114', name: 'Las Condes' },
  { code: '13115', name: 'Lo Barnechea' },
  { code: '13116', name: 'Lo Espejo' },
  { code: '13117', name: 'Lo Prado' },
  { code: '13118', name: 'Macul' },
  { code: '13119', name: 'Maipú' },
  { code: '13120', name: 'Ñuñoa' },
  { code: '13121', name: 'Pedro Aguirre Cerda' },
  { code: '13122', name: 'Peñalolén' },
  { code: '13123', name: 'Providencia' },
  { code: '13124', name: 'Pudahuel' },
  { code: '13125', name: 'Quilicura' },
  { code: '13126', name: 'Quinta Normal' },
  { code: '13127', name: 'Recoleta' },
  { code: '13128', name: 'Renca' },
  { code: '13129', name: 'San Joaquín' },
  { code: '13130', name: 'San Miguel' },
  { code: '13131', name: 'San Ramón' },
  { code: '13132', name: 'Vitacura' },
  { code: '13201', name: 'Puente Alto' },
  { code: '13202', name: 'San José de Maipo' },
  { code: '13203', name: 'Colina' },
  { code: '13204', name: 'Lampa' },
  { code: '13205', name: 'Tiltil' },
  { code: '13301', name: 'San Bernardo' },
  { code: '13302', name: 'Buin' },
  { code: '13303', name: 'Calera de Tango' },
  { code: '13304', name: 'Paine' },
  { code: '13401', name: 'Melipilla' },
  { code: '13402', name: 'Alhué' },
  { code: '13403', name: 'Curacaví' },
  { code: '13404', name: 'María Pinto' },
  { code: '13405', name: 'San Pedro' },
  { code: '13501', name: 'Talagante' },
  { code: '13502', name: 'El Monte' },
  { code: '13503', name: 'Isla de Maipo' },
  { code: '13504', name: 'Padre Hurtado' },
  { code: '13505', name: 'Peñaflor' },
  { code: '13601', name: 'San Pedro de Melipilla' },
  { code: '13602', name: 'María Pinto' },
  { code: '13603', name: 'Curacaví' },
  { code: '13604', name: 'Alhué' },
  { code: '13605', name: 'San Pedro' },
];

// Comunas de la Región de Valparaíso (códigos 05xxx)
const vaComunas = [
  { code: '05101', name: 'Valparaíso' },
  { code: '05102', name: 'Casablanca' },
  { code: '05103', name: 'Concón' },
  { code: '05104', name: 'Juan Fernández' },
  { code: '05105', name: 'Puchuncaví' },
  { code: '05106', name: 'Quintero' },
  { code: '05107', name: 'Viña del Mar' },
  { code: '05108', name: 'Isla de Pascua' },
  { code: '05109', name: 'Quilpué' },
  { code: '05110', name: 'Villa Alemana' },
  { code: '05111', name: 'Limache' },
  { code: '05112', name: 'Olmué' },
  { code: '05113', name: 'San Antonio' },
  { code: '05114', name: 'Algarrobo' },
  { code: '05115', name: 'Cartagena' },
  { code: '05116', name: 'El Quisco' },
  { code: '05117', name: 'El Tabo' },
  { code: '05118', name: 'Santo Domingo' },
  { code: '05201', name: 'San Felipe' },
  { code: '05202', name: 'Catemu' },
  { code: '05203', name: 'Llaillay' },
  { code: '05204', name: 'Panquehue' },
  { code: '05205', name: 'Putaendo' },
  { code: '05206', name: 'Santa María' },
  { code: '05301', name: 'Quillota' },
  { code: '05302', name: 'Calera' },
  { code: '05303', name: 'Hijuelas' },
  { code: '05304', name: 'La Cruz' },
  { code: '05305', name: 'Nogales' },
  { code: '05401', name: 'Los Andes' },
  { code: '05402', name: 'Calle Larga' },
  { code: '05403', name: 'Rinconada' },
  { code: '05404', name: 'San Esteban' },
  { code: '05501', name: 'La Ligua' },
  { code: '05502', name: 'Cabildo' },
  { code: '05503', name: 'Papudo' },
  { code: '05504', name: 'Petorca' },
  { code: '05505', name: 'Zapallar' },
  { code: '05601', name: 'Petorca' },
  { code: '05602', name: 'La Ligua' },
  { code: '05603', name: 'Cabildo' },
  { code: '05604', name: 'Zapallar' },
  { code: '05605', name: 'Papudo' },
  { code: '05701', name: 'San Felipe' },
  { code: '05702', name: 'Llaillay' },
  { code: '05703', name: 'Putaendo' },
  { code: '05704', name: 'Santa María' },
  { code: '05705', name: 'Catemu' },
  { code: '05706', name: 'Panquehue' },
  { code: '05801', name: 'Quillota' },
  { code: '05802', name: 'La Calera' },
  { code: '05803', name: 'Hijuelas' },
  { code: '05804', name: 'Nogales' },
];

function getRandomComuna(comunas: typeof rmComunas) {
  return comunas[Math.floor(Math.random() * comunas.length)];
}

function fixRegionComunaMismatch() {
  const inputFile = path.join(process.cwd(), 'data', 'processed', 'synthetic_agents_v1.json');
  const outputFile = path.join(process.cwd(), 'data', 'processed', 'synthetic_agents_v1_fixed_regions.json');

  console.log('📖 Leyendo archivo de agentes...');
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  const agents = data.agents;
  console.log(`   Total de agentes: ${agents.length}`);

  let fixedCount = 0;
  const regionDistribution: Record<string, number> = {};
  const comunaDistribution: Record<string, number> = {};

  // Corregir códigos de comuna según la región
  const fixedAgents = agents.map((agent: any) => {
    const regionCode = agent.region_code;
    let newComuna;

    if (regionCode === 'RM') {
      newComuna = getRandomComuna(rmComunas);
    } else if (regionCode === 'VA') {
      newComuna = getRandomComuna(vaComunas);
    } else {
      // Si no es RM ni VA, mantener el código original
      return agent;
    }

    fixedCount++;
    regionDistribution[regionCode] = (regionDistribution[regionCode] || 0) + 1;
    comunaDistribution[newComuna.code] = (comunaDistribution[newComuna.code] || 0) + 1;

    return {
      ...agent,
      comuna_code: newComuna.code,
      comuna_name: newComuna.name,
    };
  });

  console.log(`\n✅ Códigos corregidos: ${fixedCount} de ${agents.length} agentes`);

  console.log('\n📊 Distribución por región:');
  Object.entries(regionDistribution)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([region, count]) => {
      console.log(`   ${region}: ${count} agentes`);
    });

  console.log('\n📊 Top 10 comunas asignadas:');
  Object.entries(comunaDistribution)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([code, count]) => {
      const comuna = rmComunas.find(c => c.code === code) || vaComunas.find(c => c.code === code);
      console.log(`   ${code} (${comuna?.name || 'Unknown'}): ${count} agentes`);
    });

  // Crear objeto de salida con metadata actualizada
  const outputData = {
    ...data,
    agents: fixedAgents,
    metadata: {
      ...data.metadata,
      region_comuna_fixed: true,
      region_comuna_fixed_at: new Date().toISOString(),
      region_comuna_fix_description: 'Reasignados códigos de comuna según región (RM/VA)',
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
fixRegionComunaMismatch();
console.log('\n✨ Proceso completado');
