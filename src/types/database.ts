/**
 * Database Types - Sprint 9
 * 
 * Tipos para entidades de base de datos en Supabase.
 * Estos tipos representan las tablas que se crearán en PostgreSQL.
 * 
 * NOTA: Estos son tipos TypeScript. Las tablas reales se crean
 * mediante migrations SQL en Supabase.
 */

// ===========================================
// Enums (como tipos TypeScript)
// ===========================================

export type DbSex = 'male' | 'female';
export type DbAgeGroup = 'child' | 'youth' | 'adult' | 'middle_age' | 'senior';
export type DbHouseholdType = 'single' | 'couple' | 'family' | 'extended';
export type DbUrbanicity = 'urban' | 'rural';
export type DbPovertyStatus = 'extreme_poverty' | 'poverty' | 'vulnerable' | 'middle_class' | 'upper_middle' | 'upper_class';
export type DbEducationLevel = 'none' | 'primary' | 'secondary' | 'technical' | 'university' | 'postgraduate';
export type DbOccupationStatus = 'employed' | 'unemployed' | 'self_employed' | 'retired' | 'student' | 'homemaker';
export type DbSocioeconomicLevel = 'low' | 'medium' | 'high';
export type DbConnectivityLevel = 'none' | 'low' | 'medium' | 'high' | 'very_high';
export type DbDigitalExposureLevel = 'none' | 'low' | 'medium' | 'high' | 'very_high';
export type DbSurveyChannel = 'phone' | 'online' | 'in_person' | 'mixed';
export type DbAgentType = 'resident' | 'retiree' | 'student' | 'entrepreneur' | 'worker';

export type DbQuestionType = 'single_choice' | 'likert_scale' | 'multiple_choice' | 'text';
export type DbSurveyStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type DbRunStatus = 'pending' | 'running' | 'completed' | 'failed';

export type DbBenchmarkSource = 'casen' | 'subtel' | 'cep' | 'ine' | 'other';
export type DbBenchmarkCategory = 'demographics' | 'connectivity' | 'socioeconomic' | 'digital' | 'other';

// ===========================================
// Users Table
// ===========================================

export type DbUserRole = 'user' | 'admin' | 'moderator';

/**
 * Table: users
 * Descripción: Usuarios de la aplicación (autenticación personalizada)
 * NOTA: No usa Supabase Auth, es una tabla propia
 */
export interface DbUser {
  id: string;                    // UUID primary key
  email: string;                 // Email único
  password_hash: string;         // Hash de contraseña (bcrypt)
  name: string | null;           // Nombre del usuario
  avatar: string | null;         // URL del avatar
  role: DbUserRole;              // Rol del usuario
  is_active: boolean;            // Usuario activo/inactivo
  email_verified: boolean;       // Email verificado
  last_login_at: string | null;  // Último login
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
}

// ===========================================
// Core Tables
// ===========================================

/**
 * Table: territories
 * Descripción: Territorios administrativos de Chile
 * Pipeline: Generado por scripts/integrate/build_territories_master.ts
 * Supabase: Sí - tabla maestra de referencia
 * 
 * ACTUALIZADO: 2026-03-16 - Modelo Alineado v2.0
 * - Soporta códigos cortos (RM, VA, etc.)
 * - Estructura flexible para regiones y comunas
 */
export interface DbTerritory {
  id: string;                    // UUID primary key
  
  // Identificación jerárquica
  level: 'region' | 'comuna' | 'provincia';  // Nivel administrativo
  code: string;                  // Código primario: RM, VA, 13101, etc.
  region_code: string | null;    // Código de región padre (para comunas)
  
  // Nombres
  name: string;                  // Nombre del territorio
  region_name: string | null;    // Nombre de la región (para comunas)
  
  // Geometría (GeoJSON)
  centroid: [number, number] | null;  // [lng, lat] centroide
  geometry: GeoJSON.Geometry | null;
  bbox: [number, number, number, number] | null; // [minLng, minLat, maxLng, maxLat]
  
  // Estadísticas (del pipeline)
  population_total: number | null;
  population_urban: number | null;
  population_rural: number | null;
  
  // Metadata
  source: string | null;         // 'ine', 'casen', etc.
  source_year: number | null;    // 2017, 2022, etc.
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
}

/**
 * Table: synthetic_agents
 * Descripción: Agentes sintéticos generados por el pipeline
 * Pipeline: Generado por scripts/synthesize/generate_synthetic_agents_v1.ts
 * Supabase: Sí - tabla principal de agentes
 * 
 * NOTA: Esta tabla puede ser grande (millones de registros).
 * Considerar particionamiento por región o batch.
 */
export interface DbSyntheticAgent {
  id: string;                    // UUID primary key
  agent_id: string;              // ID único del agente (ej: 'AGENT-CL13-000001')
  
  // Batch/Version
  batch_id: string;              // Referencia a synthetic_agent_batches
  version: string;               // 'v1.0.0'
  
  // Territorio
  territory_id: string;          // FK -> territories.id
  country_code: string;          // 'CL'
  region_code: string;           // 'CL-13'
  comuna_code: string;           // '13101'
  urbanicity: DbUrbanicity;
  
  // Demografía
  sex: DbSex;
  age: number;
  age_group: DbAgeGroup;
  
  // Hogar
  household_size: number;
  household_type: DbHouseholdType;
  
  // Socioeconómico
  income_decile: number | null;  // 1-10
  poverty_status: DbPovertyStatus | null;
  education_level: DbEducationLevel | null;
  occupation_status: DbOccupationStatus | null;
  occupation_group: string | null;
  socioeconomic_level: DbSocioeconomicLevel | null;
  
  // Digital
  connectivity_level: DbConnectivityLevel | null;
  digital_exposure_level: DbDigitalExposureLevel | null;
  preferred_survey_channel: DbSurveyChannel | null;
  
  // Funcional
  agent_type: DbAgentType;
  
  // Traceabilidad
  backbone_key: string;          // Referencia a población backbone
  subtel_profile_key: string | null;
  casen_profile_key: string | null;
  generation_notes: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Table: synthetic_agent_batches
 * Descripción: Metadata de batches de generación de agentes
 * Pipeline: Un registro por ejecución del generador
 * Supabase: Sí
 */
export interface DbSyntheticAgentBatch {
  id: string;                    // UUID primary key
  batch_id: string;              // ID único (ej: 'BATCH-20240315-001')
  
  // Configuración
  version: string;               // 'v1.0.0'
  schema_version: string;        // 'v1'
  
  // Cobertura
  country_code: string;
  region_codes: string[];        // ['CL-13', 'CL-05']
  comuna_codes: string[] | null; // null = todas
  
  // Estadísticas
  total_agents_requested: number;
  total_agents_generated: number;
  fields_with_null: string[];
  
  // Fuentes de datos
  data_sources: {
    population_backbone: string;
    territories_master: string;
    subtel_profile: string | null;
    casen_normalized: string | null;
  };
  
  // Estado
  status: 'generating' | 'completed' | 'failed' | 'validated';
  validation_report: Record<string, unknown> | null;
  
  // Timestamps
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

// ===========================================
// Survey Tables
// ===========================================

/**
 * Table: survey_definitions
 * Descripción: Definiciones de encuestas
 * Pipeline: Creado por usuarios/UI
 * Supabase: Sí
 */
export interface DbSurveyDefinition {
  id: string;                    // UUID primary key
  
  // Identificación
  name: string;
  description: string | null;
  slug: string;                  // URL-friendly (ej: 'encuesta-movilidad-2024')
  
  // Segmento objetivo
  segment: {
    region_codes?: string[];
    comuna_codes?: string[];
    sex?: DbSex[];
    age_groups?: DbAgeGroup[];
    income_deciles?: number[];
    education_levels?: DbEducationLevel[];
    connectivity_levels?: DbConnectivityLevel[];
    agent_types?: DbAgentType[];
  };
  
  // Preguntas (JSONB)
  questions: DbSurveyQuestion[];
  
  // Configuración
  sample_size: number;
  status: DbSurveyStatus;
  
  // Autoría
  created_by: string | null;     // user_id si hay auth
  updated_by: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

/**
 * Question sub-type para surveys
 */
export interface DbSurveyQuestion {
  id: string;
  type: DbQuestionType;
  text: string;
  required: boolean;
  order: number;
  
  // Opciones para choice questions
  options?: {
    id: string;
    label: string;
    value: string | number;
  }[];
  
  // Configuración Likert
  likertConfig?: {
    min: number;
    max: number;
    minLabel: string;
    maxLabel: string;
  };
  
  // Configuración texto
  textConfig?: {
    maxLength?: number;
    placeholder?: string;
  };
}

/**
 * Table: survey_runs
 * Descripción: Ejecuciones de encuestas
 * Pipeline: Creado al ejecutar una encuesta
 * Supabase: Sí
 */
export interface DbSurveyRun {
  id: string;                    // UUID primary key
  survey_id: string;             // FK -> survey_definitions.id
  
  // Identificación
  run_number: number;            // Secuencial por survey
  name: string | null;           // Ej: "Ejecución #3 - Marzo 2024"
  
  // Estado
  status: DbRunStatus;
  
  // Configuración aplicada
  segment_applied: Record<string, unknown>; // Segmento final usado
  sample_size_requested: number;
  sample_size_actual: number;
  agents_matched: number;
  
  // Progreso
  progress_percent: number;
  current_agent_index: number;
  
  // Resultados resumidos
  results_summary: {
    total_responses: number;
    completion_rate: number;
    average_confidence: number;
  } | null;
  
  // Error si falló
  error_message: string | null;
  error_details: Record<string, unknown> | null;
  
  // Timestamps
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Table: survey_responses
 * Descripción: Respuestas individuales de agentes
 * Pipeline: Generado durante survey run
 * Supabase: Sí - puede ser grande
 * 
 * NOTA: Considerar particionamiento por survey_id
 * NOTA: Sprint 11C - NO persistido aún, solo local
 */
export interface DbSurveyResponse {
  id: string;                    // UUID primary key
  
  // Referencias
  survey_id: string;             // FK -> survey_definitions.id
  run_id: string;                // FK -> survey_runs.id
  agent_id: string;              // FK -> synthetic_agents.id
  
  // Respuesta
  question_id: string;
  question_type: DbQuestionType;
  value: string | number | string[] | null;
  
  // Metadata de generación
  confidence: number;            // 0-1
  reasoning: string;             // Explicación de por qué esta respuesta
  heuristics_applied: string[];  // ['income_based', 'age_correlated']
  
  // Traceabilidad
  agent_snapshot: Record<string, unknown>; // Datos del agente en momento de respuesta
  
  // Timestamp
  created_at: string;
}

/**
 * Table: survey_results
 * Descripción: Resultados agregados de encuestas
 * Pipeline: Generado al completar un survey run
 * Supabase: Sí - Sprint 11C
 * 
 * Almacena los resultados calculados por pregunta, no las respuestas individuales.
 * Esto permite consultar resultados sin cargar miles de respuestas.
 */
export interface DbSurveyResult {
  id: string;                    // UUID primary key
  
  // Referencias
  survey_id: string;             // FK -> survey_definitions.id
  run_id: string;                // FK -> survey_runs.id
  
  // Resumen
  summary: {
    totalQuestions: number;
    totalResponses: number;
    uniqueAgents: number;
  };
  
  // Resultados por pregunta (JSONB)
  // Cada resultado tiene: questionId, questionType, questionText, totalResponses, distribution, etc.
  results: DbQuestionResult[];
  
  // Metadata
  generated_at: string;          // Cuándo se generaron los resultados
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Resultado de una pregunta individual (para survey_results)
 */
export type DbQuestionResult =
  | DbSingleChoiceResult
  | DbLikertResult
  | DbMultipleChoiceResult
  | DbTextResult;

export interface DbSingleChoiceResult {
  questionId: string;
  questionType: 'single_choice';
  questionText: string;
  totalResponses: number;
  distribution: Record<string, { count: number; percentage: number; label: string }>;
}

export interface DbLikertResult {
  questionId: string;
  questionType: 'likert_scale';
  questionText: string;
  totalResponses: number;
  average: number;
  median: number;
  distribution: Record<number, { count: number; percentage: number }>;
  minLabel: string;
  maxLabel: string;
}

export interface DbMultipleChoiceResult {
  questionId: string;
  questionType: 'multiple_choice';
  questionText: string;
  totalResponses: number;
  distribution: Record<string, { count: number; percentage: number; label: string }>;
}

export interface DbTextResult {
  questionId: string;
  questionType: 'text';
  questionText: string;
  totalResponses: number;
  sampleResponses: string[];
}

// ===========================================
// Benchmark Tables
// ===========================================

/**
 * Table: benchmarks
 * Descripción: Benchmarks de referencia (CASEN, SUBTEL, etc.)
 * Pipeline: Ingestado desde fuentes externas
 * Supabase: Sí
 */
export interface DbBenchmark {
  id: string;                    // UUID primary key
  
  // Fuente
  source: DbBenchmarkSource;
  source_name: string;           // 'CASEN 2022'
  source_organization: string;   // 'Ministerio de Desarrollo Social'
  source_year: number;           // 2022
  source_url: string | null;
  source_description: string | null;
  
  // Indicadores (JSONB)
  indicators: DbBenchmarkIndicator[];
  
  // Cobertura
  coverage: {
    geographic: string[];        // ['CL-13', 'national']
    demographic?: string[];
    temporal: {
      start: string;
      end: string;
    };
  };
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface DbBenchmarkIndicator {
  id: string;
  name: string;
  description: string;
  category: DbBenchmarkCategory;
  unit: 'percentage' | 'average' | 'index' | 'count';
  
  // Valor
  value: number;
  percentage?: number;
  sample_size?: number;
  confidence_interval?: [number, number];
  margin_of_error?: number;
  
  // Mapeo con encuestas
  compatible_question_types: DbQuestionType[];
  compatible_segments: string[];
  
  // Desagregaciones disponibles
  breakdowns?: {
    by_sex?: Record<string, number>;
    by_age_group?: Record<string, number>;
    by_region?: Record<string, number>;
  };
}

/**
 * Table: benchmark_comparisons
 * Descripción: Comparaciones entre encuestas sintéticas y benchmarks
 * Pipeline: Generado por benchmarkService
 * Supabase: Sí
 */
export interface DbBenchmarkComparison {
  id: string;                    // UUID primary key
  
  // Referencias
  survey_id: string;
  run_id: string;
  benchmark_id: string;
  
  // Comparaciones por indicador
  comparisons: DbIndicatorComparison[];
  
  // Resumen
  summary: {
    total_indicators: number;
    matched_indicators: number;
    above_benchmark: number;
    below_benchmark: number;
    match_benchmark: number;
    average_gap: number;
    max_gap: number;
  };
  
  // Timestamps
  compared_at: string;
  created_at: string;
}

export interface DbIndicatorComparison {
  benchmark_indicator_id: string;
  indicator_name: string;
  category: string;
  unit: string;
  
  // Valores
  synthetic_value: number;
  benchmark_value: number;
  
  // Gap
  gap_absolute: number;
  gap_relative: number;          // porcentaje
  gap_direction: 'above' | 'below' | 'match';
  significance: 'high' | 'medium' | 'low';
  
  // Metadata
  synthetic_sample_size: number;
  benchmark_sample_size: number | null;
}

// ===========================================
// Utility Types
// ===========================================

/**
 * Type para queries con paginación
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Type para filtros comunes
 */
export interface TerritoryFilters {
  regionCode?: string;
  comunaCode?: string;
  urbanicity?: DbUrbanicity;
}

export interface AgentFilters {
  territoryId?: string;
  regionCode?: string;
  comunaCode?: string;
  sex?: DbSex;
  ageGroup?: DbAgeGroup;
  ageMin?: number;
  ageMax?: number;
  incomeDecile?: number;
  educationLevel?: DbEducationLevel;
  connectivityLevel?: DbConnectivityLevel;
  agentType?: DbAgentType;
  batchId?: string;
}

export interface SurveyFilters {
  status?: DbSurveyStatus;
  createdBy?: string;
  regionCode?: string;
}

// ===========================================
// Database Schema (para referencia)
// ===========================================

/**
 * Schema completo de la base de datos.
 * Usar como referencia para crear las tablas en Supabase.
 * 
 * ORDEN DE CREACIÓN:
 * 1. territories
 * 2. synthetic_agent_batches
 * 3. synthetic_agents
 * 4. survey_definitions
 * 5. survey_runs
 * 6. survey_responses
 * 7. benchmarks
 * 8. benchmark_comparisons
 * 
 * ÍNDICES RECOMENDADOS:
 * - synthetic_agents: territory_id, batch_id, region_code, comuna_code
 * - synthetic_agents: sex, age_group, income_decile (para filtros)
 * - survey_responses: survey_id, run_id, agent_id
 * - survey_responses: question_id (para agregaciones)
 * - benchmark_comparisons: survey_id, benchmark_id
 */
export interface DatabaseSchema {
  users: DbUser;
  territories: DbTerritory;
  synthetic_agents: DbSyntheticAgent;
  synthetic_agent_batches: DbSyntheticAgentBatch;
  survey_definitions: DbSurveyDefinition;
  survey_runs: DbSurveyRun;
  survey_responses: DbSurveyResponse;
  benchmarks: DbBenchmark;
  benchmark_comparisons: DbBenchmarkComparison;
}

// ===========================================
// Supabase Database Type
// ===========================================

/**
 * Tipo Database para el cliente de Supabase.
 * Este tipo sigue el formato esperado por @supabase/supabase-js
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: DbUser;
        Insert: Omit<DbUser, 'id' | 'created_at' | 'updated_at' | 'last_login_at'> & { id?: string; created_at?: string; updated_at?: string; last_login_at?: string };
        Update: Partial<Omit<DbUser, 'id' | 'created_at'>>;
      };
      territories: {
        Row: DbTerritory;
        Insert: Omit<DbTerritory, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<DbTerritory, 'id' | 'created_at'>>;
      };
      synthetic_agents: {
        Row: DbSyntheticAgent;
        Insert: Omit<DbSyntheticAgent, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<DbSyntheticAgent, 'id' | 'created_at'>>;
      };
      synthetic_agent_batches: {
        Row: DbSyntheticAgentBatch;
        Insert: Omit<DbSyntheticAgentBatch, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<DbSyntheticAgentBatch, 'id' | 'created_at'>>;
      };
      survey_definitions: {
        Row: DbSurveyDefinition;
        Insert: Omit<DbSurveyDefinition, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<DbSurveyDefinition, 'id' | 'created_at'>>;
      };
      survey_runs: {
        Row: DbSurveyRun;
        Insert: Omit<DbSurveyRun, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<DbSurveyRun, 'id' | 'created_at'>>;
      };
      survey_responses: {
        Row: DbSurveyResponse;
        Insert: Omit<DbSurveyResponse, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<DbSurveyResponse, 'id' | 'created_at'>>;
      };
      survey_results: {
        Row: DbSurveyResult;
        Insert: Omit<DbSurveyResult, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<DbSurveyResult, 'id' | 'created_at'>>;
      };
      benchmarks: {
        Row: DbBenchmark;
        Insert: Omit<DbBenchmark, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<DbBenchmark, 'id' | 'created_at'>>;
      };
      benchmark_comparisons: {
        Row: DbBenchmarkComparison;
        Insert: Omit<DbBenchmarkComparison, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<DbBenchmarkComparison, 'id' | 'created_at'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
