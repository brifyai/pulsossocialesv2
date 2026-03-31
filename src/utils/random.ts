/**
 * Random Utilities
 * 
 * Funciones de generación de números aleatorios y shuffle con distribución uniforme.
 * Reemplaza el uso incorrecto de .sort(() => Math.random() - 0.5) que produce
 * distribuciones sesgadas.
 */

/**
 * Genera un entero aleatorio seguro en el rango [min, max] (inclusive).
 * Usa crypto.getRandomValues() si está disponible, con fallback a Math.random().
 * 
 * @param min - Valor mínimo (inclusive)
 * @param max - Valor máximo (inclusive)
 * @returns Entero aleatorio en el rango especificado
 */
export function secureRandomInt(min: number, max: number): number {
  if (min > max) {
    throw new Error(`Invalid range: min (${min}) must be <= max (${max})`);
  }
  
  const range = max - min + 1;
  
  // Intentar usar crypto.getRandomValues si está disponible (navegador o Node.js)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // Generar un array de 4 bytes (32 bits)
    const randomBytes = new Uint32Array(1);
    crypto.getRandomValues(randomBytes);
    // Usar módulo para obtener un número en el rango deseado
    // Descartamos valores que causarían sesgo en el módulo
    const maxValid = Math.floor(0x100000000 / range) * range;
    if (randomBytes[0] < maxValid) {
      return min + (randomBytes[0] % range);
    }
    // Si el valor está fuera del rango válido, caer en Math.random
  }
  
  // Fallback a Math.random()
  return min + Math.floor(Math.random() * range);
}

/**
 * Implementación del algoritmo Fisher-Yates para shuffle de arrays.
 * Produce una distribución uniforme de permutaciones.
 * 
 * IMPORTANTE: No muta el array original, retorna una copia shuffled.
 * 
 * @param array - Array a mezclar
 * @returns Nueva copia del array con elementos mezclados aleatoriamente
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
  // Crear copia del array para no mutar el original
  const shuffled = [...array];
  const n = shuffled.length;
  
  // Algoritmo Fisher-Yates (también conocido como Knuth shuffle)
  for (let i = n - 1; i > 0; i--) {
    // Elegir un índice aleatorio entre 0 e i (inclusive)
    const j = secureRandomInt(0, i);
    // Intercambiar elementos
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Obtiene una muestra aleatoria de N elementos de un array.
 * Usa Fisher-Yates para mezclar y luego toma los primeros N elementos.
 * 
 * Si N es mayor que el tamaño del array, retorna todos los elementos mezclados.
 * 
 * @param array - Array fuente
 * @param size - Tamaño de la muestra deseada
 * @returns Array con N elementos aleatorios del array original
 */
export function sampleFromArray<T>(array: T[], size: number): T[] {
  if (size <= 0) {
    return [];
  }
  
  if (size >= array.length) {
    // Si se pide más o igual elementos de los que hay, retornar todo mezclado
    return fisherYatesShuffle(array);
  }
  
  // Hacer shuffle y tomar los primeros N elementos
  const shuffled = fisherYatesShuffle(array);
  return shuffled.slice(0, size);
}

/**
 * Genera un número aleatorio en el rango [0, 1) usando crypto si está disponible.
 * Fallback a Math.random().
 * 
 * @returns Número aleatorio entre 0 (inclusive) y 1 (exclusive)
 */
export function secureRandom(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomBytes = new Uint32Array(1);
    crypto.getRandomValues(randomBytes);
    // Convertir 32-bit integer a float en [0, 1)
    return randomBytes[0] / 0x100000000;
  }
  
  return Math.random();
}

/**
 * Selecciona un elemento aleatorio de un array.
 * 
 * @param array - Array fuente
 * @returns Elemento aleatorio del array, o undefined si el array está vacío
 */
export function pickRandom<T>(array: T[]): T | undefined {
  if (array.length === 0) {
    return undefined;
  }
  const index = secureRandomInt(0, array.length - 1);
  return array[index];
}

/**
 * Mezcla un array en su lugar (muta el array original).
 * Usa Fisher-Yates para distribución uniforme.
 * 
 * @param array - Array a mezclar (será mutado)
 * @returns El mismo array mezclado (para chaining)
 */
export function shuffleInPlace<T>(array: T[]): T[] {
  const n = array.length;
  
  for (let i = n - 1; i > 0; i--) {
    const j = secureRandomInt(0, i);
    [array[i], array[j]] = [array[j], array[i]];
  }
  
  return array;
}
