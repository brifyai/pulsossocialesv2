/**
 * Tests for Fixed Sample Comparison Feature
 * 
 * Verifica que las funciones de comparación con muestra fija
 * funcionan correctamente para baseline vs escenario.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SurveyRun, SurveyDefinition, AgentResponse } from '../../../types/survey';
import type { SyntheticAgent, Sex, EducationLevel, SyntheticAgentType } from '../../../types/agent';

// Mock de las dependencias
vi.mock('../../../data/syntheticAgents', () => ({
  filterAgents: vi.fn()
}));

vi.mock('../../../services/supabase/repositories/surveyRepository', () => ({
  createSurveyDefinition: vi.fn(),
  getSurveyDefinitions: vi.fn(),
  getSurveyDefinitionById: vi.fn(),
  deleteSurveyDefinition: vi.fn(),
  isSurveyPersistenceAvailable: vi.fn().mockResolvedValue(false),
  createSurveyRunDb: vi.fn(),
  getSurveyRunsBySurveyId: vi.fn(),
  getSurveyRunById: vi.fn(),
  isSurveyRunPersistenceAvailable: vi.fn().mockResolvedValue(false),
  saveSurveyResultsDb: vi.fn(),
  getSurveyResultsBySurveyId: vi.fn(),
  getSurveyResultsByRunId: vi.fn(),
  isSurveyResultPersistenceAvailable: vi.fn().mockResolvedValue(false),
  saveSurveyResponses: vi.fn(),
  isSurveyResponsePersistenceAvailable: vi.fn().mockResolvedValue(false),
}));

vi.mock('../syntheticResponseEngine', () => ({
  generateSurveyResponses: vi.fn(),
  calculateConfidenceStats: vi.fn()
}));

import { filterAgents } from '../../../data/syntheticAgents';
import { generateSurveyResponses } from '../syntheticResponseEngine';

// Importar las funciones a testear
import {
  runSurvey,
  getSurveyRun,
  runSurveyWithFixedAgents,
  runBaselineAndScenario,
  createSurvey
} from '../surveyService';

describe('Fixed Sample Comparison', () => {
  // Datos de prueba con tipos correctos
  const mockAgents: SyntheticAgent[] = [
    { 
      agent_id: 'agent_001', 
      age: 25, 
      sex: 'male' as Sex, 
      education_level: 'university' as EducationLevel, 
      income_decile: 5, 
      region_code: '13', 
      comuna_code: '13101', 
      connectivity_level: 'high', 
      agent_type: 'resident' as SyntheticAgentType,
      synthetic_batch_id: 'batch_001',
      source_version: '1.0',
      created_at: new Date().toISOString(),
      country_code: 'CL',
      region_name: 'Metropolitana',
      comuna_name: 'Santiago',
      urbanicity: 'urban',
      age_group: 'adult',
      household_size: 3,
      household_type: 'family',
      poverty_status: 'middle_class',
      occupation_status: 'employed',
      occupation_group: 'professional',
      socioeconomic_level: 'medium',
      digital_exposure_level: 'high',
      preferred_survey_channel: 'online',
      backbone_key: 'backbone_001',
      subtel_profile_key: 'subtel_001',
      casen_profile_key: 'casen_001',
      generation_notes: 'Test agent'
    },
    { 
      agent_id: 'agent_002', 
      age: 30, 
      sex: 'female' as Sex, 
      education_level: 'secondary' as EducationLevel, 
      income_decile: 3, 
      region_code: '13', 
      comuna_code: '13102', 
      connectivity_level: 'medium', 
      agent_type: 'worker' as SyntheticAgentType,
      synthetic_batch_id: 'batch_001',
      source_version: '1.0',
      created_at: new Date().toISOString(),
      country_code: 'CL',
      region_name: 'Metropolitana',
      comuna_name: 'Providencia',
      urbanicity: 'urban',
      age_group: 'adult',
      household_size: 2,
      household_type: 'couple',
      poverty_status: 'vulnerable',
      occupation_status: 'employed',
      occupation_group: 'service',
      socioeconomic_level: 'medium',
      digital_exposure_level: 'medium',
      preferred_survey_channel: 'phone',
      backbone_key: 'backbone_002',
      subtel_profile_key: 'subtel_002',
      casen_profile_key: 'casen_002',
      generation_notes: 'Test agent'
    },
    { 
      agent_id: 'agent_003', 
      age: 45, 
      sex: 'male' as Sex, 
      education_level: 'university' as EducationLevel, 
      income_decile: 7, 
      region_code: '13', 
      comuna_code: '13101', 
      connectivity_level: 'high', 
      agent_type: 'resident' as SyntheticAgentType,
      synthetic_batch_id: 'batch_001',
      source_version: '1.0',
      created_at: new Date().toISOString(),
      country_code: 'CL',
      region_name: 'Metropolitana',
      comuna_name: 'Santiago',
      urbanicity: 'urban',
      age_group: 'middle_age',
      household_size: 4,
      household_type: 'family',
      poverty_status: 'middle_class',
      occupation_status: 'employed',
      occupation_group: 'management',
      socioeconomic_level: 'high',
      digital_exposure_level: 'high',
      preferred_survey_channel: 'online',
      backbone_key: 'backbone_003',
      subtel_profile_key: 'subtel_003',
      casen_profile_key: 'casen_003',
      generation_notes: 'Test agent'
    },
    { 
      agent_id: 'agent_004', 
      age: 60, 
      sex: 'female' as Sex, 
      education_level: 'primary' as EducationLevel, 
      income_decile: 2, 
      region_code: '13', 
      comuna_code: '13103', 
      connectivity_level: 'low', 
      agent_type: 'retiree' as SyntheticAgentType,
      synthetic_batch_id: 'batch_001',
      source_version: '1.0',
      created_at: new Date().toISOString(),
      country_code: 'CL',
      region_name: 'Metropolitana',
      comuna_name: 'Ñuñoa',
      urbanicity: 'urban',
      age_group: 'senior',
      household_size: 1,
      household_type: 'single',
      poverty_status: 'poverty',
      occupation_status: 'retired',
      occupation_group: 'none',
      socioeconomic_level: 'low',
      digital_exposure_level: 'low',
      preferred_survey_channel: 'phone',
      backbone_key: 'backbone_004',
      subtel_profile_key: 'subtel_004',
      casen_profile_key: 'casen_004',
      generation_notes: 'Test agent'
    },
    { 
      agent_id: 'agent_005', 
      age: 35, 
      sex: 'male' as Sex, 
      education_level: 'university' as EducationLevel, 
      income_decile: 8, 
      region_code: '13', 
      comuna_code: '13101', 
      connectivity_level: 'high', 
      agent_type: 'entrepreneur' as SyntheticAgentType,
      synthetic_batch_id: 'batch_001',
      source_version: '1.0',
      created_at: new Date().toISOString(),
      country_code: 'CL',
      region_name: 'Metropolitana',
      comuna_name: 'Santiago',
      urbanicity: 'urban',
      age_group: 'adult',
      household_size: 3,
      household_type: 'family',
      poverty_status: 'upper_middle',
      occupation_status: 'self_employed',
      occupation_group: 'business',
      socioeconomic_level: 'high',
      digital_exposure_level: 'very_high',
      preferred_survey_channel: 'online',
      backbone_key: 'backbone_005',
      subtel_profile_key: 'subtel_005',
      casen_profile_key: 'casen_005',
      generation_notes: 'Test agent'
    },
  ];

  const mockResponses: AgentResponse[] = [
    { agentId: 'agent_001', questionId: 'q1', value: 'A', confidence: 0.8, reasoning: 'Test' },
    { agentId: 'agent_002', questionId: 'q1', value: 'B', confidence: 0.7, reasoning: 'Test' },
    { agentId: 'agent_003', questionId: 'q1', value: 'A', confidence: 0.9, reasoning: 'Test' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(filterAgents).mockResolvedValue(mockAgents);
    vi.mocked(generateSurveyResponses).mockReturnValue(mockResponses);
  });

  describe('runSurvey with fixedAgentIds', () => {
    it('should use fixed agent IDs when provided', async () => {
      // Crear survey primero
      const survey = await createSurvey({
        name: 'Test Survey',
        description: 'Test survey for fixed sample',
        sampleSize: 3,
        segment: { regionCode: '13' },
        questions: [
          {
            id: 'q1',
            type: 'single_choice',
            text: 'Test question',
            required: true,
            options: [
              { id: 'opt1', label: 'Option A', value: 'A' },
              { id: 'opt2', label: 'Option B', value: 'B' },
            ]
          }
        ],
        engineMode: 'legacy',
        persistState: false
      });
      
      const fixedAgentIds = ['agent_001', 'agent_003', 'agent_005'];
      
      const run = await runSurvey(survey.id, undefined, fixedAgentIds);
      
      // Verificar que el run tiene los agentes fijos
      expect(run.selectedAgentIds).toEqual(fixedAgentIds);
      expect(run.totalAgents).toBe(3);
    });

    it('should filter fixed agent IDs to only include agents in segment', async () => {
      // Crear survey primero
      const survey = await createSurvey({
        name: 'Test Survey 2',
        description: 'Test survey for fixed sample',
        sampleSize: 3,
        segment: { regionCode: '13' },
        questions: [
          {
            id: 'q1',
            type: 'single_choice',
            text: 'Test question',
            required: true,
            options: [
              { id: 'opt1', label: 'Option A', value: 'A' },
              { id: 'opt2', label: 'Option B', value: 'B' },
            ]
          }
        ],
        engineMode: 'legacy',
        persistState: false
      });
      
      const fixedAgentIds = ['agent_001', 'agent_003', 'agent_999']; // agent_999 no existe
      
      const run = await runSurvey(survey.id, undefined, fixedAgentIds);
      
      // Los IDs seleccionados se guardan tal como se proporcionaron para trazabilidad
      expect(run.selectedAgentIds).toEqual(fixedAgentIds);
      // Pero solo se usan los agentes que existen en el segmento
      expect(run.totalAgents).toBe(2);
    });

    it('should fallback to normal sampling if no fixed agents match', async () => {
      // Crear survey primero
      const survey = await createSurvey({
        name: 'Test Survey 3',
        description: 'Test survey for fixed sample',
        sampleSize: 3,
        segment: { regionCode: '13' },
        questions: [
          {
            id: 'q1',
            type: 'single_choice',
            text: 'Test question',
            required: true,
            options: [
              { id: 'opt1', label: 'Option A', value: 'A' },
              { id: 'opt2', label: 'Option B', value: 'B' },
            ]
          }
        ],
        engineMode: 'legacy',
        persistState: false
      });
      
      const fixedAgentIds = ['agent_999', 'agent_998']; // Ninguno existe
      
      const run = await runSurvey(survey.id, undefined, fixedAgentIds);
      
      // Debería hacer fallback a sampling normal
      expect(run.totalAgents).toBeGreaterThan(0);
      expect(run.selectedAgentIds).toBeDefined();
      expect(run.selectedAgentIds!.length).toBeGreaterThan(0);
    });

    it('should store selectedAgentIds in the run metadata', async () => {
      // Crear survey primero
      const survey = await createSurvey({
        name: 'Test Survey 4',
        description: 'Test survey for fixed sample',
        sampleSize: 3,
        segment: { regionCode: '13' },
        questions: [
          {
            id: 'q1',
            type: 'single_choice',
            text: 'Test question',
            required: true,
            options: [
              { id: 'opt1', label: 'Option A', value: 'A' },
              { id: 'opt2', label: 'Option B', value: 'B' },
            ]
          }
        ],
        engineMode: 'legacy',
        persistState: false
      });
      
      const run = await runSurvey(survey.id);
      
      expect(run.selectedAgentIds).toBeDefined();
      expect(Array.isArray(run.selectedAgentIds)).toBe(true);
      expect(run.selectedAgentIds!.length).toBe(run.totalAgents);
    });
  });

  describe('runSurveyWithFixedAgents', () => {
    it('should throw error if baseline run does not exist', async () => {
      await expect(runSurveyWithFixedAgents({
        surveyId: 'test_survey_001',
        baselineRunId: 'non_existent_run',
        scenarioEventId: 'scenario_001'
      })).rejects.toThrow('Baseline run not found');
    });
  });

  describe('runBaselineAndScenario', () => {
    it('should return only baseline when no scenarioEventId provided', async () => {
      // Crear survey primero
      const survey = await createSurvey({
        name: 'Test Survey 5',
        description: 'Test survey for fixed sample',
        sampleSize: 3,
        segment: { regionCode: '13' },
        questions: [
          {
            id: 'q1',
            type: 'single_choice',
            text: 'Test question',
            required: true,
            options: [
              { id: 'opt1', label: 'Option A', value: 'A' },
              { id: 'opt2', label: 'Option B', value: 'B' },
            ]
          }
        ],
        engineMode: 'legacy',
        persistState: false
      });
      
      const result = await runBaselineAndScenario(survey.id);
      
      expect(result.baselineRun).toBeDefined();
      expect(result.scenarioRun).toBeUndefined();
      expect(result.comparison).toBeUndefined();
    });

    it('should execute baseline and scenario with same agents', async () => {
      // Crear survey primero
      const survey = await createSurvey({
        name: 'Test Survey 6',
        description: 'Test survey for fixed sample',
        sampleSize: 3,
        segment: { regionCode: '13' },
        questions: [
          {
            id: 'q1',
            type: 'single_choice',
            text: 'Test question',
            required: true,
            options: [
              { id: 'opt1', label: 'Option A', value: 'A' },
              { id: 'opt2', label: 'Option B', value: 'B' },
            ]
          }
        ],
        engineMode: 'legacy',
        persistState: false
      });
      
      const result = await runBaselineAndScenario(survey.id, 'scenario_001');
      
      expect(result.baselineRun).toBeDefined();
      expect(result.scenarioRun).toBeDefined();
      
      // Verificar que ambos usan los mismos agentes
      expect(result.scenarioRun!.selectedAgentIds).toEqual(result.baselineRun.selectedAgentIds);
    });
  });
});
