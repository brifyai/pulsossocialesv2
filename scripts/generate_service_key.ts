/**
 * Script para generar Service Role Key para Supabase
 * 
 * La service role key es un JWT con:
 * - role: service_role
 * - iss: supabase-demo (mismo que el anon key)
 * - iat: fecha de emisión
 * - exp: fecha de expiración (mismo que el anon key: 1799535600)
 * 
 * Se firma con el JWT_SECRET del servidor Supabase.
 * 
 * Uso:
 *   npx tsx scripts/generate_service_key.ts <JWT_SECRET>
 * 
 * Ejemplo:
 *   npx tsx scripts/generate_service_key.ts your-super-secret-jwt-secret
 */

import * as crypto from 'crypto';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generateJWT(payload: object, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function main() {
  const jwtSecret = process.argv[2];
  
  if (!jwtSecret) {
    console.error('❌ Error: Se requiere el JWT_SECRET como argumento');
    console.log('   Uso: npx tsx scripts/generate_service_key.ts <JWT_SECRET>');
    console.log('');
    console.log('   El JWT_SECRET se encuentra en:');
    console.log('   - deploy/.env (variable JWT_SECRET)');
    console.log('   - O en el panel de administración de Supabase');
    process.exit(1);
  }
  
  // Payload de la service role key (mismo formato que el anon key pero con role: service_role)
  const payload = {
    role: 'service_role',
    iss: 'supabase-demo',
    iat: 1641769200,
    exp: 1799535600
  };
  
  const serviceKey = generateJWT(payload, jwtSecret);
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  SERVICE ROLE KEY GENERADA                                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Service Key:');
  console.log(serviceKey);
  console.log('');
  console.log('Para usarla, agrega esta línea a tu archivo .env:');
  console.log(`VITE_SUPABASE_SERVICE_KEY=${serviceKey}`);
  console.log('');
  console.log('⚠️  IMPORTANTE:');
  console.log('   - Esta clave tiene privilegios de administrador');
  console.log('   - NUNCA la expongas en el frontend');
  console.log('   - Úsala solo en scripts de servidor/backend');
}

main();
