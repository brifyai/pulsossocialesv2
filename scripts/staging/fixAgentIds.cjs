const fs = require('fs');

// Leer el archivo de resultados de la Ola 1
const data = JSON.parse(fs.readFileSync('data/staging/b2_wave_1_result.json', 'utf8'));

// Extraer IDs únicos de agentes
const agentIds = [...new Set(data.responses.map(r => r.agent_id))];

console.log('Total respuestas:', data.responses.length);
console.log('Total agentes únicos:', agentIds.length);
console.log('Primeros 10 IDs:', agentIds.slice(0, 10));

// Guardar en archivo
fs.writeFileSync('data/staging/agents_run_001_ids.json', JSON.stringify(agentIds, null, 2));
console.log('\n✅ Archivo guardado: data/staging/agents_run_001_ids.json');
console.log('   Contiene', agentIds.length, 'agentes');
