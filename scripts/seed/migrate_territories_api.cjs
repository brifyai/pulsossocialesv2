#!/usr/bin/env node
/**
 * Script de migración usando API REST de Supabase
 * Agrega columnas faltantes a la tabla territories
 */

const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Extract host from URL
const url = new URL(SUPABASE_URL);
const hostname = url.hostname;

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path: `/rest/v1/${path}`,
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseData));
          } catch {
            resolve(responseData);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// RPC call to execute SQL
async function executeSQL(sql) {
  try {
    const result = await makeRequest('rpc/execute_sql', 'POST', { sql });
    return result;
  } catch (err) {
    console.error('SQL Error:', err.message);
    throw err;
  }
}

async function migrate() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     🔧 MIGRACIÓN TERRITORIES v2.0                              ║');
  console.log('║     Usando API REST de Supabase                               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`🔗 Connecting to: ${SUPABASE_URL}\n`);

  // Verificar estructura actual
  console.log('📋 Paso 1: Verificando estructura actual...');
  try {
    const territories = await makeRequest('territories?select=*&limit=1');
    console.log('   ✅ Tabla territories existe');
    if (territories && territories.length > 0) {
      console.log('   📊 Columnas actuales:', Object.keys(territories[0]).join(', '));
    }
  } catch (err) {
    console.error('   ❌ Error:', err.message);
    process.exit(1);
  }

  // Intentar insertar un territorio de prueba con el nuevo modelo
  console.log('\n📋 Paso 2: Intentando insertar territorio de prueba...');
  
  const testTerritory = {
    level: 'region',
    code: 'TEST',
    name: 'Test Region',
    population_total: 1000000,
    source: 'test',
    source_year: 2024
  };

  try {
    await makeRequest('territories', 'POST', testTerritory);
    console.log('   ✅ Insert sin centroid funcionó');
    
    // Limpiar
    await makeRequest('territories?code=eq.TEST', 'DELETE');
    console.log('   🗑️  Registro de prueba eliminado');
  } catch (err) {
    console.error('   ❌ Error en insert:', err.message);
    
    if (err.message.includes('centroid')) {
      console.log('\n⚠️  La columna centroid no existe.');
      console.log('   Debes aplicar la migración SQL manualmente:');
      console.log('   1. Ve a Supabase Studio > SQL Editor');
      console.log('   2. Ejecuta: ALTER TABLE territories ADD COLUMN centroid POINT;');
      console.log('   3. Ejecuta: ALTER TABLE territories ADD COLUMN level VARCHAR(20);');
      console.log('   4. Ejecuta: ALTER TABLE territories ADD COLUMN code VARCHAR(20);');
    }
    
    if (err.message.includes('code')) {
      console.log('\n⚠️  La columna code no existe.');
    }
  }

  // Verificar si podemos usar el schema actual
  console.log('\n📋 Paso 3: Verificando schema compatible...');
  try {
    const allTerritories = await makeRequest('territories?select=*');
    console.log(`   ✅ Total de territorios existentes: ${allTerritories.length}`);
    
    if (allTerritories.length > 0) {
      const sample = allTerritories[0];
      console.log('   📄 Ejemplo de registro:');
      console.log('      ', JSON.stringify(sample, null, 2).substring(0, 200));
    }
  } catch (err) {
    console.error('   ❌ Error:', err.message);
  }

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║     RESUMEN                                                    ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║  La migración requiere acceso directo a PostgreSQL.           ║');
  console.log('║  La API REST de Supabase no permite ALTER TABLE.              ║');
  console.log('║                                                                ║');
  console.log('║  Opciones:                                                     ║');
  console.log('║  1. Usar Supabase Studio > SQL Editor                         ║');
  console.log('║  2. Usar psql con la connection string                        ║');
  console.log('║  3. Usar la CLI de Supabase                                   ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
}

migrate().catch(err => {
  console.error('💥 Error:', err);
  process.exit(1);
});
