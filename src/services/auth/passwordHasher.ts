/**
 * Password hashing usando PBKDF2 con Web Crypto API.
 * PBKDF2 es deliberadamente lento, resistente a fuerza bruta.
 * Funciona en browser sin dependencias de Node.js.
 */

const PBKDF2_ITERATIONS = 100000;  // 100K iteraciones = ~100ms en browser moderno
const SALT_LENGTH = 16;            // 16 bytes de salt aleatorio
const HASH_LENGTH = 32;            // 256 bits de output
const ALGORITHM = 'PBKDF2';

/**
 * Genera un salt aleatorio criptográficamente seguro
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Hashea un password con PBKDF2
 * Retorna string en formato: iterations:salt_hex:hash_hex
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    ALGORITHM,
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: ALGORITHM,
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_LENGTH * 8
  );

  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  return `${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

/**
 * Verifica un password contra un hash almacenado
 * Soporta tanto hashes PBKDF2 como legacy SHA-256
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Si el hash es formato legacy (SHA-256 sin separador), usar verificación legacy
  if (isLegacyHash(storedHash)) {
    return verifyLegacyPassword(password, storedHash);
  }

  const [iterationsStr, saltHex, expectedHash] = storedHash.split(':');

  if (!iterationsStr || !saltHex || !expectedHash) {
    return false; // Formato inválido
  }

  const iterations = parseInt(iterationsStr, 10);
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    ALGORITHM,
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: ALGORITHM,
      salt: salt.buffer as ArrayBuffer,
      iterations: iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_LENGTH * 8
  );

  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex === expectedHash;
}

/**
 * Verifica un password contra un hash legacy (SHA-256 con salt estático)
 * Usado para migración automática de usuarios legacy
 */
async function verifyLegacyPassword(password: string, hash: string): Promise<boolean> {
  const salt = 'pulsossociales-salt-v1';
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return computedHash === hash;
}

/**
 * Detecta si un hash es formato legacy (SHA-256 con salt estático)
 * Los hashes legacy no contienen ':'
 */
export function isLegacyHash(hash: string): boolean {
  return !hash.includes(':');
}

// Constantes exportadas para tests
export const PBKDF2_HASH_PREFIX = 'pbkdf2';
export const LEGACY_HASH_PREFIX = 'legacy';
