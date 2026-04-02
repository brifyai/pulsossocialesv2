/**
 * Tests para distributionMetrics.ts
 *
 * Pruebas unitarias para el módulo de métricas de distribución.
 * Usa la API unificada buildDistributionMetrics.
 */

import { describe, it, expect } from 'vitest';
import { buildDistributionMetrics } from '../distributionMetrics';
import type { AgentResponse } from '../../../../types/survey';

describe('buildDistributionMetrics', () => {
  // ===========================================
  // Tests de Dominancia
  // ===========================================
  describe('dominant response', () => {
    it('should identify the dominant response correctly', () => {
      const distribution = { approve: 60, reject: 30, neutral: 10 };
      const total = 100;
      const responses: AgentResponse[] = [];
      const labels = { approve: 'Aprueba', reject: 'Rechaza', neutral: 'Neutral' };

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, false);

      expect(metrics.dominantResponse).toBe('approve');
      expect(metrics.dominantPercentage).toBe(60);
    });

    it('should handle uniform distribution (no clear dominant)', () => {
      const distribution = { a: 33, b: 33, c: 34 };
      const total = 100;
      const responses: AgentResponse[] = [];
      const labels = { a: 'A', b: 'B', c: 'C' };

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, false);

      // El más alto es 'c' con 34%
      expect(metrics.dominantResponse).toBe('c');
      expect(metrics.dominantPercentage).toBe(34);
    });
  });

  // ===========================================
  // Tests de Entropía (Dispersión Normalizada)
  // ===========================================
  describe('entropy (normalized dispersion)', () => {
    it('should calculate low entropy for concentrated distribution', () => {
      const distribution = { yes: 90, no: 10 };
      const total = 100;
      const responses: AgentResponse[] = [];
      const labels = { yes: 'Sí', no: 'No' };

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, false);

      // Entropía baja porque está concentrado
      expect(metrics.entropy).toBeLessThan(0.5);
    });

    it('should calculate high entropy for uniform distribution', () => {
      const distribution = { a: 25, b: 25, c: 25, d: 25 };
      const total = 100;
      const responses: AgentResponse[] = [];
      const labels = { a: 'A', b: 'B', c: 'C', d: 'D' };

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, false);

      // Entropía alta porque está uniforme
      expect(metrics.entropy).toBeGreaterThan(0.9);
    });

    it('should return 0 entropy for single option', () => {
      const distribution = { only: 100 };
      const total = 100;
      const responses: AgentResponse[] = [];
      const labels = { only: 'Único' };

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, false);

      expect(metrics.entropy).toBe(0);
    });

    it('should calculate low entropy (dispersion) for concentrated distribution', () => {
      const distribution = { winner: 85, others: 15 };
      const total = 100;
      const responses: AgentResponse[] = [];
      const labels = { winner: 'Ganador', others: 'Otros' };

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, false);

      // Entropía baja porque está concentrado (dispersión baja)
      // Entropía normalizada para 85-15 es ~0.61, que es moderada
      expect(metrics.entropy).toBeLessThan(0.7);
    });

    it('should calculate high entropy (dispersion) for uniform distribution', () => {
      const distribution = { a: 20, b: 20, c: 20, d: 20, e: 20 };
      const total = 100;
      const responses: AgentResponse[] = [];
      const labels = { a: 'A', b: 'B', c: 'C', d: 'D', e: 'E' };

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, false);

      // Entropía alta porque está uniforme (dispersión alta)
      expect(metrics.entropy).toBeGreaterThan(0.8);
    });
  });

  // ===========================================
  // Tests de Concentración (1 - Entropía)
  // ===========================================
  describe('concentration', () => {
    it('should calculate high concentration for concentrated distribution', () => {
      const distribution = { yes: 90, no: 10 };
      const total = 100;
      const responses: AgentResponse[] = [];
      const labels = { yes: 'Sí', no: 'No' };

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, false);

      // Concentración alta = 1 - entropía baja
      expect(metrics.concentration).toBeGreaterThan(0.5);
    });

    it('should calculate low concentration for uniform distribution', () => {
      const distribution = { a: 25, b: 25, c: 25, d: 25 };
      const total = 100;
      const responses: AgentResponse[] = [];
      const labels = { a: 'A', b: 'B', c: 'C', d: 'D' };

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, false);

      // Concentración baja = 1 - entropía alta
      expect(metrics.concentration).toBeLessThan(0.1);
    });

    it('should have concentration = 1 - entropy', () => {
      const distribution = { a: 50, b: 30, c: 20 };
      const total = 100;
      const responses: AgentResponse[] = [];
      const labels = { a: 'A', b: 'B', c: 'C' };

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, false);

      expect(metrics.concentration).toBeCloseTo(1 - metrics.entropy, 5);
    });
  });

  // ===========================================
  // Tests de Polarización
  // ===========================================
  describe('polarization', () => {
    it('should detect high polarization for bimodal distribution', () => {
      const distribution = { optionA: 45, optionB: 45, other: 10 };
      const total = 100;
      const responses: AgentResponse[] = [];
      const labels = { optionA: 'Opción A', optionB: 'Opción B', other: 'Otro' };

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, false);

      // Distribución bimodal 45-45 tiene alta polarización
      expect(metrics.polarization).toBeGreaterThan(0.7);
    });

    it('should detect low polarization for concentrated distribution', () => {
      const distribution = { winner: 80, loser: 15, other: 5 };
      const total = 100;
      const responses: AgentResponse[] = [];
      const labels = { winner: 'Ganador', loser: 'Perdedor', other: 'Otro' };

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, false);

      // Distribución concentrada tiene baja polarización
      expect(metrics.polarization).toBeLessThan(0.5);
    });

    it('should detect medium polarization for three-way split', () => {
      const distribution = { a: 40, b: 35, c: 25 };
      const total = 100;
      const responses: AgentResponse[] = [];
      const labels = { a: 'A', b: 'B', c: 'C' };

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, false);

      // Para distribución 40-35-25, top2/top1 = 35/40 = 0.875, escalado = ~0.88
      // Es una polarización alta (segunda opción muy cercana a la primera)
      expect(metrics.polarization).toBeGreaterThan(0.5);
      expect(metrics.polarization).toBeLessThanOrEqual(1);
    });
  });

  // ===========================================
  // Tests de Tasa de No Respuesta
  // ===========================================
  describe('non-response rate', () => {
    it('should calculate zero non-response when all agents answered', () => {
      const distribution = { yes: 50, no: 50 };
      const total = 100;
      const responses: AgentResponse[] = [
        { agentId: '1', questionId: 'q1', value: 'yes', confidence: 0.8, reasoning: 'Test' },
        { agentId: '2', questionId: 'q1', value: 'no', confidence: 0.7, reasoning: 'Test' },
      ];
      const labels = { yes: 'Sí', no: 'No' };

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, false);

      expect(metrics.nonResponseRate).toBe(0);
    });

    it('should calculate non-response rate correctly', () => {
      const distribution = { yes: 80, no_response: 20 };
      const total = 100; // 100 agents total
      const responses: AgentResponse[] = [
        { agentId: '1', questionId: 'q1', value: 'yes', confidence: 0.8, reasoning: 'Test' },
        { agentId: '2', questionId: 'q1', value: 'yes', confidence: 0.7, reasoning: 'Test' },
      ];
      const labels = { yes: 'Sí', no_response: 'No responde' };

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, false);

      // 20 no respondieron de 100 = 20% no respuesta
      expect(metrics.nonResponseRate).toBe(20);
    });
  });

  // ===========================================
  // Tests de Confianza Promedio
  // ===========================================
  describe('average confidence', () => {
    it('should calculate average confidence from responses', () => {
      const distribution = { yes: 2, no: 1 };
      const total = 3;
      const responses: AgentResponse[] = [
        { agentId: '1', questionId: 'q1', value: 'yes', confidence: 0.9, reasoning: 'Test' },
        { agentId: '2', questionId: 'q1', value: 'yes', confidence: 0.7, reasoning: 'Test' },
        { agentId: '3', questionId: 'q1', value: 'no', confidence: 0.5, reasoning: 'Test' },
      ];
      const labels = { yes: 'Sí', no: 'No' };

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, false);

      // Promedio: (0.9 + 0.7 + 0.5) / 3 = 0.7
      expect(metrics.averageConfidence).toBeCloseTo(0.7, 1);
    });

    it('should return 0 confidence when no responses provided', () => {
      const distribution = { yes: 50, no: 50 };
      const total = 100;
      const responses: AgentResponse[] = [];
      const labels = { yes: 'Sí', no: 'No' };

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, false);

      expect(metrics.averageConfidence).toBe(0);
    });
  });

  // ===========================================
  // Tests de Casos Edge
  // ===========================================
  describe('edge cases', () => {
    it('should handle empty distribution', () => {
      const distribution = {};
      const total = 0;
      const responses: AgentResponse[] = [];
      const labels = {};

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, false);

      expect(metrics.dominantResponse).toBeNull();
      expect(metrics.dominantPercentage).toBe(0);
      expect(metrics.entropy).toBe(0);
      expect(metrics.polarization).toBe(0);
      expect(metrics.concentration).toBe(0);
    });

    it('should handle single option', () => {
      const distribution = { only: 100 };
      const total = 100;
      const responses: AgentResponse[] = [];
      const labels = { only: 'Único' };

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, false);

      expect(metrics.dominantResponse).toBe('only');
      expect(metrics.dominantPercentage).toBe(100);
      expect(metrics.entropy).toBe(0);
      // Una sola opción = sin polarización
      expect(metrics.polarization).toBe(0);
    });

    it('should handle zero total count', () => {
      const distribution = { a: 0, b: 0 };
      const total = 0;
      const responses: AgentResponse[] = [];
      const labels = { a: 'A', b: 'B' };

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, false);

      expect(metrics.dominantResponse).toBeNull();
      expect(metrics.entropy).toBe(0);
    });
  });

  // ===========================================
  // Tests de Escala Likert
  // ===========================================
  describe('likert scale', () => {
    it('should handle likert scale distribution', () => {
      const distribution = { '1': 10, '2': 20, '3': 40, '4': 20, '5': 10 };
      const total = 100;
      const responses: AgentResponse[] = [];
      const labels = { '1': 'Muy malo', '2': 'Malo', '3': 'Neutral', '4': 'Bueno', '5': 'Muy bueno' };

      const metrics = buildDistributionMetrics(distribution, total, responses, labels, true);

      expect(metrics.dominantResponse).toBe(3); // Valor numérico parseado
      expect(metrics.dominantPercentage).toBe(40);
      expect(metrics.standardDeviation).toBeDefined();
      expect(metrics.standardDeviation).toBeGreaterThan(0);
    });
  });
});
