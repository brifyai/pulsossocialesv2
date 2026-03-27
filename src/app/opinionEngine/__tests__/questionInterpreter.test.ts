import { describe, it, expect } from 'vitest';
import { interpretQuestion } from '../questionInterpreter';

describe('questionInterpreter', () => {
  describe('Direction questions', () => {
    it('should detect CADEM real wording (buen camino/mal camino)', () => {
      const result = interpretQuestion({
        id: 'q_direction',
        text: 'Ahora, pensando en todos los aspectos políticos, económicos y sociales, ¿Usted cree que el país va por un buen camino o por un mal camino?',
        type: 'single_choice',
        options: ['Buen camino', 'Mal camino', 'No responde'],
      });

      expect(result.family).toBe('direction');
      expect(result.topic).toBe('country_direction');
      expect(result.responseFormat).toBe('binary_nr');
    });

    it('should detect variant wording (camino correcto/equivocado)', () => {
      const result = interpretQuestion({
        id: 'q_direction',
        text: '¿Cree usted que el país va por el camino correcto o por el camino equivocado?',
        type: 'single_choice',
        options: ['Buen camino', 'Mal camino', 'No responde'],
      });

      expect(result.family).toBe('direction');
      expect(result.topic).toBe('country_direction');
      expect(result.responseFormat).toBe('binary_nr');
    });

    it('should detect variant wording (dirección correcta/equivocada)', () => {
      const result = interpretQuestion({
        id: 'q_direction',
        text: '¿Cree que el país va por la dirección correcta o equivocada?',
        type: 'single_choice',
        options: ['Buen camino', 'Mal camino', 'No responde'],
      });

      expect(result.family).toBe('direction');
      expect(result.topic).toBe('country_direction');
    });
  });

  describe('Optimism questions', () => {
    it('should detect CADEM real wording (futuro del país)', () => {
      const result = interpretQuestion({
        id: 'q_optimism',
        text: 'En general, ¿Cómo se siente usted acerca del futuro del país?',
        type: 'single_choice',
        options: ['Muy optimista', 'Optimista', 'Pesimista', 'Muy pesimista', 'No responde'],
      });

      expect(result.family).toBe('optimism');
      expect(result.topic).toBe('country_optimism');
      expect(result.responseFormat).toBe('ordinal_4_nr');
    });

    it('should detect variant wording (dentro de un año mejor/igual/peor)', () => {
      const result = interpretQuestion({
        id: 'q_optimism',
        text: '¿Cree que dentro de un año la situación del país será mejor, igual o peor?',
        type: 'single_choice',
        options: ['Mejor', 'Igual', 'Peor', 'No responde'],
      });

      expect(result.family).toBe('optimism');
      expect(result.topic).toBe('country_optimism');
    });

    it('should detect variant wording (cómo se siente acerca del futuro)', () => {
      const result = interpretQuestion({
        id: 'q_optimism',
        text: '¿Cómo se siente acerca del futuro?',
        type: 'single_choice',
        options: ['Muy optimista', 'Optimista', 'Pesimista', 'Muy pesimista', 'No responde'],
      });

      expect(result.family).toBe('optimism');
      expect(result.topic).toBe('country_optimism');
    });
  });

  describe('Approval questions', () => {
    it('should detect approval with Kast', () => {
      const result = interpretQuestion({
        id: 'q_approval',
        text: 'Ahora. Independiente de su posición política, ¿Usted aprueba o desaprueba la forma cómo José Antonio Kast está conduciendo su Gobierno?',
        type: 'single_choice',
        options: ['Aprueba', 'Desaprueba', 'No responde'],
      });

      expect(result.family).toBe('approval');
      expect(result.topic).toBe('government_approval');
      expect(result.targetEntity).toBe('jose_antonio_kast');
      expect(result.responseFormat).toBe('binary_nr');
    });

    it('should detect approval with generic government', () => {
      const result = interpretQuestion({
        id: 'q_approval',
        text: '¿Aprueba o desaprueba la forma como el gobierno está manejando los problemas del país?',
        type: 'single_choice',
        options: ['Aprueba', 'Desaprueba', 'No responde'],
      });

      expect(result.family).toBe('approval');
      expect(result.topic).toBe('government_approval');
      expect(result.targetEntity).toBe('gobierno');
    });
  });

  describe('Economic perception questions', () => {
    it('should detect national economy', () => {
      const result = interpretQuestion({
        id: 'q_economy_national',
        text: 'Usted cree que en el momento actual la economía chilena está...',
        type: 'single_choice',
        options: ['Muy buena', 'Buena', 'Mala', 'Muy mala', 'No responde'],
      });

      expect(result.family).toBe('economic_perception');
      expect(result.topic).toBe('economy_national');
    });

    it('should detect personal economy', () => {
      const result = interpretQuestion({
        id: 'q_economy_personal',
        text: '¿Cómo calificaría usted la situación económica actual de usted y su familia?',
        type: 'single_choice',
        options: ['Muy buena', 'Buena', 'Mala', 'Muy mala', 'No responde'],
      });

      expect(result.family).toBe('economic_perception');
      expect(result.topic).toBe('economy_personal');
    });
  });

  describe('Unknown questions', () => {
    it('should fallback to open_text for unrecognized questions', () => {
      const result = interpretQuestion({
        id: 'q_unknown',
        text: '¿Cuál es su color favorito?',
        type: 'single_choice',
        options: ['Rojo', 'Azul', 'Verde'],
      });

      expect(result.family).toBe('open_text');
      expect(result.topic).toBeUndefined();
      expect(result.responseFormat).toBe('text');
    });
  });

  describe('Fingerprint generation', () => {
    it('should generate consistent fingerprints', () => {
      const result1 = interpretQuestion({
        id: 'q_test',
        text: '¿Aprueba o desaprueba?',
        type: 'single_choice',
        options: ['Sí', 'No'],
      });

      const result2 = interpretQuestion({
        id: 'q_test',
        text: '¿Aprueba o desaprueba?',
        type: 'single_choice',
        options: ['Sí', 'No'],
      });

      expect(result1.fingerprint).toBe(result2.fingerprint);
    });

    it('should generate different fingerprints for different texts', () => {
      const result1 = interpretQuestion({
        id: 'q_test1',
        text: '¿Aprueba o desaprueba?',
        type: 'single_choice',
        options: ['Sí', 'No'],
      });

      const result2 = interpretQuestion({
        id: 'q_test2',
        text: '¿Está de acuerdo?',
        type: 'single_choice',
        options: ['Sí', 'No'],
      });

      expect(result1.fingerprint).not.toBe(result2.fingerprint);
    });
  });
});
