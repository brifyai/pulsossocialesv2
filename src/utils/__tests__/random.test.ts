/**
 * Tests for Random Utilities
 * 
 * Verifica que las funciones de random producen distribuciones uniformes
 * y cumplen con los requisitos funcionales.
 */

import { describe, it, expect } from 'vitest';
import {
  fisherYatesShuffle,
  sampleFromArray,
  secureRandomInt,
  secureRandom,
  pickRandom,
  shuffleInPlace,
} from '../random';

describe('secureRandomInt', () => {
  it('should generate integers within the specified range', () => {
    const min = 5;
    const max = 10;
    
    for (let i = 0; i < 1000; i++) {
      const value = secureRandomInt(min, max);
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(max);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('should throw error when min > max', () => {
    expect(() => secureRandomInt(10, 5)).toThrow('Invalid range');
  });

  it('should return the same value when min === max', () => {
    expect(secureRandomInt(5, 5)).toBe(5);
  });

  it('should handle negative ranges', () => {
    const min = -10;
    const max = -5;
    
    for (let i = 0; i < 100; i++) {
      const value = secureRandomInt(min, max);
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(max);
    }
  });

  it('should handle range crossing zero', () => {
    const min = -5;
    const max = 5;
    
    for (let i = 0; i < 100; i++) {
      const value = secureRandomInt(min, max);
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(max);
    }
  });
});

describe('fisherYatesShuffle', () => {
  it('should not mutate the original array', () => {
    const original = [1, 2, 3, 4, 5];
    const originalCopy = [...original];
    
    fisherYatesShuffle(original);
    
    expect(original).toEqual(originalCopy);
  });

  it('should return a new array with the same elements', () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = fisherYatesShuffle(original);
    
    expect(shuffled).not.toBe(original);
    expect(shuffled.sort((a, b) => a - b)).toEqual(original);
  });

  it('should return an empty array when given an empty array', () => {
    const result = fisherYatesShuffle([]);
    expect(result).toEqual([]);
  });

  it('should return a single-element array unchanged', () => {
    const original = [42];
    const shuffled = fisherYatesShuffle(original);
    
    expect(shuffled).toEqual([42]);
  });

  it('should produce uniform distribution (chi-square test)', () => {
    // Test with array of 4 elements, run 10,000 shuffles
    // Each element should appear in each position approximately 2500 times
    const elements = ['A', 'B', 'C', 'D'];
    const positionCounts: Record<string, number[]> = {
      A: [0, 0, 0, 0],
      B: [0, 0, 0, 0],
      C: [0, 0, 0, 0],
      D: [0, 0, 0, 0],
    };
    
    const iterations = 10000;
    
    for (let i = 0; i < iterations; i++) {
      const shuffled = fisherYatesShuffle(elements);
      shuffled.forEach((elem, pos) => {
        positionCounts[elem][pos]++;
      });
    }
    
    // Expected count for each element in each position
    const expected = iterations / 4;
    
    // Chi-square test with 95% confidence (critical value ~16.9 for 9 df)
    let chiSquare = 0;
    for (const elem of elements) {
      for (let pos = 0; pos < 4; pos++) {
        const observed = positionCounts[elem][pos];
        chiSquare += Math.pow(observed - expected, 2) / expected;
      }
    }
    
    // For 15 degrees of freedom (16 cells - 1), critical value at 95% is ~25
    expect(chiSquare).toBeLessThan(25);
  });

  it('should handle arrays with duplicate elements', () => {
    const original = [1, 1, 2, 2, 3, 3];
    const shuffled = fisherYatesShuffle(original);
    
    expect(shuffled).toHaveLength(original.length);
    expect(shuffled.sort((a, b) => a - b)).toEqual(original);
  });

  it('should handle arrays of objects', () => {
    const original = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const shuffled = fisherYatesShuffle(original);
    
    expect(shuffled).toHaveLength(original.length);
    expect(shuffled.every(item => original.includes(item))).toBe(true);
  });
});

describe('sampleFromArray', () => {
  it('should return exactly N elements', () => {
    const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const sample = sampleFromArray(array, 5);
    
    expect(sample).toHaveLength(5);
  });

  it('should return elements from the original array', () => {
    const array = [1, 2, 3, 4, 5];
    const sample = sampleFromArray(array, 3);
    
    sample.forEach(elem => {
      expect(array).toContain(elem);
    });
  });

  it('should return all elements when N >= array.length', () => {
    const array = [1, 2, 3];
    const sample = sampleFromArray(array, 5);
    
    expect(sample).toHaveLength(3);
    expect(sample.sort((a, b) => a - b)).toEqual(array);
  });

  it('should return an empty array when size <= 0', () => {
    const array = [1, 2, 3];
    
    expect(sampleFromArray(array, 0)).toEqual([]);
    expect(sampleFromArray(array, -1)).toEqual([]);
  });

  it('should return an empty array when given an empty array', () => {
    expect(sampleFromArray([], 5)).toEqual([]);
  });

  it('should not mutate the original array', () => {
    const original = [1, 2, 3, 4, 5];
    const originalCopy = [...original];
    
    sampleFromArray(original, 3);
    
    expect(original).toEqual(originalCopy);
  });

  it('should produce uniform distribution', () => {
    // Test sampling 2 elements from [A, B, C, D]
    // Each pair should appear with equal probability
    const elements = ['A', 'B', 'C', 'D'];
    const pairCounts: Record<string, number> = {};
    
    const iterations = 5000;
    
    for (let i = 0; i < iterations; i++) {
      const sample = sampleFromArray(elements, 2);
      const key = sample.sort().join(',');
      pairCounts[key] = (pairCounts[key] || 0) + 1;
    }
    
    // There are C(4,2) = 6 possible pairs
    // Each should appear approximately iterations/6 times
    const expected = iterations / 6;
    const pairs = Object.keys(pairCounts);
    
    expect(pairs).toHaveLength(6);
    
    // Check that all counts are within 20% of expected
    for (const count of Object.values(pairCounts)) {
      expect(Math.abs(count - expected) / expected).toBeLessThan(0.2);
    }
  });
});

describe('secureRandom', () => {
  it('should return values in [0, 1)', () => {
    for (let i = 0; i < 1000; i++) {
      const value = secureRandom();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('should produce uniform distribution', () => {
    const buckets = new Array(10).fill(0);
    const iterations = 10000;
    
    for (let i = 0; i < iterations; i++) {
      const value = secureRandom();
      const bucket = Math.floor(value * 10);
      buckets[bucket]++;
    }
    
    const expected = iterations / 10;
    
    // Chi-square test
    let chiSquare = 0;
    for (const count of buckets) {
      chiSquare += Math.pow(count - expected, 2) / expected;
    }
    
    // For 9 degrees of freedom, critical value at 95% is ~16.9
    expect(chiSquare).toBeLessThan(16.9);
  });
});

describe('pickRandom', () => {
  it('should return an element from the array', () => {
    const array = [1, 2, 3, 4, 5];
    
    for (let i = 0; i < 100; i++) {
      const picked = pickRandom(array);
      expect(array).toContain(picked);
    }
  });

  it('should return undefined for empty array', () => {
    expect(pickRandom([])).toBeUndefined();
  });

  it('should return the only element for single-element array', () => {
    expect(pickRandom([42])).toBe(42);
  });

  it('should produce uniform distribution', () => {
    const array = ['A', 'B', 'C', 'D'];
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    
    const iterations = 4000;
    
    for (let i = 0; i < iterations; i++) {
      const picked = pickRandom(array);
      counts[picked!]++;
    }
    
    const expected = iterations / 4;
    
    // Chi-square test
    let chiSquare = 0;
    for (const count of Object.values(counts)) {
      chiSquare += Math.pow(count - expected, 2) / expected;
    }
    
    // For 3 degrees of freedom, critical value at 95% is ~7.8
    expect(chiSquare).toBeLessThan(7.8);
  });
});

describe('shuffleInPlace', () => {
  it('should mutate the original array', () => {
    const original = [1, 2, 3, 4, 5];
    const originalRef = original;
    
    shuffleInPlace(original);
    
    expect(original).toBe(originalRef);
  });

  it('should contain the same elements after shuffling', () => {
    const original = [1, 2, 3, 4, 5];
    const sortedOriginal = [...original].sort((a, b) => a - b);
    
    shuffleInPlace(original);
    const sortedShuffled = [...original].sort((a, b) => a - b);
    
    expect(sortedShuffled).toEqual(sortedOriginal);
  });

  it('should return the same array reference', () => {
    const original = [1, 2, 3];
    const result = shuffleInPlace(original);
    
    expect(result).toBe(original);
  });

  it('should handle empty arrays', () => {
    const empty: number[] = [];
    expect(shuffleInPlace(empty)).toEqual([]);
  });

  it('should handle single-element arrays', () => {
    const single = [42];
    expect(shuffleInPlace(single)).toEqual([42]);
  });
});
