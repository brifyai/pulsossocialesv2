/**
 * Benchmark Repository
 * Sprint 12C - Repositorio para gestión de benchmarks
 * 
 * Proporciona operaciones CRUD para benchmarks e indicadores,
 * así como funciones para subir PDFs y extraer datos.
 */

import { getSupabaseClient } from '../client';
import type {
  DbBenchmark,
  DbBenchmarkIndicator,
  DbBenchmarkComparison,
  DbBenchmarkPdfExtraction,
  DbBenchmarkStatus,
  DbExtractionStatus,
} from '../../../types/database';

// ===========================================
// Types para operaciones
// ===========================================

export interface CreateBenchmarkInput {
  source_id: string;
  name: string;
  organization: string;
  year: number;
  description?: string;
  url?: string;
  coverage_geographic?: string[];
  coverage_temporal_start?: string;
  coverage_temporal_end?: string;
  pdf_url?: string;
  created_by?: string;
}

export interface CreateIndicatorInput {
  benchmark_id: string;
  indicator_id: string;
  name: string;
  category: string;
  unit: 'percentage' | 'average' | 'count';
  value: number;
  description?: string;
  percentage?: number;
  sample_size?: number;
  margin_of_error?: number;
  confidence_interval?: { lower: number; upper: number };
  compatible_question_types?: string[];
  compatible_segments?: string[];
  page_number?: number;
  extracted_confidence?: number;
}

export interface BenchmarkFilters {
  status?: DbBenchmarkStatus;
  year?: number;
  organization?: string;
  search?: string;
}

// ===========================================
// Benchmark Operations
// ===========================================

/**
 * Obtiene todos los benchmarks activos
 */
export async function getBenchmarks(filters?: BenchmarkFilters): Promise<DbBenchmark[]> {
  const client = await getSupabaseClient();
  if (!client) {
    console.warn('[BenchmarkRepository] Supabase no disponible');
    return [];
  }

  let query = client
    .from('benchmarks')
    .select('*')
    .order('year', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  } else {
    query = query.eq('status', 'active');
  }

  if (filters?.year) {
    query = query.eq('year', filters.year);
  }

  if (filters?.organization) {
    query = query.ilike('organization', `%${filters.organization}%`);
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,organization.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching benchmarks:', error);
    throw new Error(`Failed to fetch benchmarks: ${error.message}`);
  }

  return (data as DbBenchmark[]) || [];
}

/**
 * Obtiene un benchmark por ID con sus indicadores
 */
export async function getBenchmarkById(id: string): Promise<{ benchmark: DbBenchmark; indicators: DbBenchmarkIndicator[] } | null> {
  const client = await getSupabaseClient();
  if (!client) {
    console.warn('[BenchmarkRepository] Supabase no disponible');
    return null;
  }

  const { data: benchmark, error: benchmarkError } = await client
    .from('benchmarks')
    .select('*')
    .eq('id', id)
    .single();

  if (benchmarkError) {
    if (benchmarkError.code === 'PGRST116') return null;
    console.error('Error fetching benchmark:', benchmarkError);
    throw new Error(`Failed to fetch benchmark: ${benchmarkError.message}`);
  }

  const { data: indicators, error: indicatorsError } = await client
    .from('benchmark_indicators')
    .select('*')
    .eq('benchmark_id', id)
    .order('category', { ascending: true });

  if (indicatorsError) {
    console.error('Error fetching indicators:', indicatorsError);
    throw new Error(`Failed to fetch indicators: ${indicatorsError.message}`);
  }

  return { 
    benchmark: benchmark as DbBenchmark, 
    indicators: (indicators as DbBenchmarkIndicator[]) || [] 
  };
}

/**
 * Crea un nuevo benchmark
 */
export async function createBenchmark(input: CreateBenchmarkInput): Promise<DbBenchmark> {
  const client = await getSupabaseClient();
  if (!client) {
    throw new Error('Supabase no disponible');
  }

  const insertData = {
    source_id: input.source_id,
    name: input.name,
    organization: input.organization,
    year: input.year,
    description: input.description || null,
    url: input.url || null,
    coverage_geographic: input.coverage_geographic || [],
    coverage_temporal_start: input.coverage_temporal_start || null,
    coverage_temporal_end: input.coverage_temporal_end || null,
    pdf_url: input.pdf_url || null,
    status: input.pdf_url ? 'processing' : 'active',
    created_by: input.created_by || null,
  };

  const { data, error } = await client
    .from('benchmarks')
    .insert(insertData as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating benchmark:', error);
    throw new Error(`Failed to create benchmark: ${error.message}`);
  }

  return data as DbBenchmark;
}

/**
 * Actualiza un benchmark
 */
export async function updateBenchmark(
  id: string,
  updates: Partial<DbBenchmark>
): Promise<DbBenchmark> {
  const client = await getSupabaseClient();
  if (!client) {
    throw new Error('Supabase no disponible');
  }

  // Construir objeto de actualización excluyendo campos de solo lectura
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  // Solo incluir campos que no son de solo lectura
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.organization !== undefined) updateData.organization = updates.organization;
  if (updates.year !== undefined) updateData.year = updates.year;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.url !== undefined) updateData.url = updates.url;
  if (updates.coverage_geographic !== undefined) updateData.coverage_geographic = updates.coverage_geographic;
  if (updates.coverage_temporal_start !== undefined) updateData.coverage_temporal_start = updates.coverage_temporal_start;
  if (updates.coverage_temporal_end !== undefined) updateData.coverage_temporal_end = updates.coverage_temporal_end;
  if (updates.pdf_url !== undefined) updateData.pdf_url = updates.pdf_url;
  if (updates.status !== undefined) updateData.status = updates.status;

  const { data, error } = await client
    .from('benchmarks')
    .update(updateData as any)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating benchmark:', error);
    throw new Error(`Failed to update benchmark: ${error.message}`);
  }

  return data as DbBenchmark;
}

/**
 * Elimina un benchmark (soft delete - cambia status a archived)
 */
export async function archiveBenchmark(id: string): Promise<void> {
  const client = await getSupabaseClient();
  if (!client) {
    throw new Error('Supabase no disponible');
  }

  const { error } = await client
    .from('benchmarks')
    .update({ status: 'archived', updated_at: new Date().toISOString() } as any)
    .eq('id', id);

  if (error) {
    console.error('Error archiving benchmark:', error);
    throw new Error(`Failed to archive benchmark: ${error.message}`);
  }
}

// ===========================================
// Indicator Operations
// ===========================================

/**
 * Crea indicadores para un benchmark
 */
export async function createIndicators(inputs: CreateIndicatorInput[]): Promise<DbBenchmarkIndicator[]> {
  if (inputs.length === 0) return [];

  const client = await getSupabaseClient();
  if (!client) {
    throw new Error('Supabase no disponible');
  }

  const { data, error } = await client
    .from('benchmark_indicators')
    .insert(inputs as any)
    .select();

  if (error) {
    console.error('Error creating indicators:', error);
    throw new Error(`Failed to create indicators: ${error.message}`);
  }

  return (data as DbBenchmarkIndicator[]) || [];
}

/**
 * Obtiene indicadores por benchmark ID
 */
export async function getIndicatorsByBenchmarkId(benchmarkId: string): Promise<DbBenchmarkIndicator[]> {
  const client = await getSupabaseClient();
  if (!client) {
    console.warn('[BenchmarkRepository] Supabase no disponible');
    return [];
  }

  const { data, error } = await client
    .from('benchmark_indicators')
    .select('*')
    .eq('benchmark_id', benchmarkId)
    .order('category', { ascending: true });

  if (error) {
    console.error('Error fetching indicators:', error);
    throw new Error(`Failed to fetch indicators: ${error.message}`);
  }

  return (data as DbBenchmarkIndicator[]) || [];
}

/**
 * Elimina todos los indicadores de un benchmark
 */
export async function deleteIndicatorsByBenchmarkId(benchmarkId: string): Promise<void> {
  const client = await getSupabaseClient();
  if (!client) {
    throw new Error('Supabase no disponible');
  }

  const { error } = await client
    .from('benchmark_indicators')
    .delete()
    .eq('benchmark_id', benchmarkId);

  if (error) {
    console.error('Error deleting indicators:', error);
    throw new Error(`Failed to delete indicators: ${error.message}`);
  }
}

// ===========================================
// PDF Extraction Operations
// ===========================================

/**
 * Crea un registro de extracción de PDF
 */
export async function createPdfExtraction(
  benchmarkId: string,
  pdfUrl: string
): Promise<DbBenchmarkPdfExtraction> {
  const client = await getSupabaseClient();
  if (!client) {
    throw new Error('Supabase no disponible');
  }

  const insertData = {
    benchmark_id: benchmarkId,
    pdf_url: pdfUrl,
    extraction_status: 'pending',
  };

  const { data, error } = await client
    .from('benchmark_pdf_extractions')
    .insert(insertData as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating PDF extraction:', error);
    throw new Error(`Failed to create PDF extraction: ${error.message}`);
  }

  return data as DbBenchmarkPdfExtraction;
}

/**
 * Actualiza el estado de una extracción
 */
export async function updatePdfExtractionStatus(
  id: string,
  status: DbExtractionStatus,
  data?: {
    extracted_data?: Record<string, unknown>;
    error_message?: string;
  }
): Promise<void> {
  const client = await getSupabaseClient();
  if (!client) {
    throw new Error('Supabase no disponible');
  }

  const updates: any = {
    extraction_status: status,
  };

  if (status === 'processing') {
    updates.processing_started_at = new Date().toISOString();
  }

  if (status === 'completed' || status === 'error') {
    updates.processing_completed_at = new Date().toISOString();
  }

  if (data?.extracted_data) {
    updates.extracted_data = data.extracted_data;
  }

  if (data?.error_message) {
    updates.error_message = data.error_message;
  }

  const { error } = await client
    .from('benchmark_pdf_extractions')
    .update(updates as any)
    .eq('id', id);

  if (error) {
    console.error('Error updating PDF extraction:', error);
    throw new Error(`Failed to update PDF extraction: ${error.message}`);
  }
}

/**
 * Obtiene el estado de extracción de un benchmark
 */
export async function getPdfExtractionByBenchmarkId(
  benchmarkId: string
): Promise<DbBenchmarkPdfExtraction | null> {
  const client = await getSupabaseClient();
  if (!client) {
    console.warn('[BenchmarkRepository] Supabase no disponible');
    return null;
  }

  const { data, error } = await client
    .from('benchmark_pdf_extractions')
    .select('*')
    .eq('benchmark_id', benchmarkId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching PDF extraction:', error);
    throw new Error(`Failed to fetch PDF extraction: ${error.message}`);
  }

  return data as DbBenchmarkPdfExtraction;
}

// ===========================================
// Comparison Operations
// ===========================================

/**
 * Guarda una comparación entre encuesta y benchmark
 */
export async function saveComparison(
  surveyId: string,
  benchmarkId: string,
  summary: DbBenchmarkComparison['summary'],
  comparisons: DbBenchmarkComparison['comparisons'],
  comparedBy?: string,
  notes?: string
): Promise<DbBenchmarkComparison> {
  const client = await getSupabaseClient();
  if (!client) {
    throw new Error('Supabase no disponible');
  }

  const insertData = {
    survey_id: surveyId,
    benchmark_id: benchmarkId,
    compared_by: comparedBy || null,
    summary,
    comparisons,
    notes: notes || null,
  };

  const { data, error } = await client
    .from('benchmark_comparisons')
    .insert(insertData as any)
    .select()
    .single();

  if (error) {
    console.error('Error saving comparison:', error);
    throw new Error(`Failed to save comparison: ${error.message}`);
  }

  return data as DbBenchmarkComparison;
}

/**
 * Obtiene comparaciones por survey ID
 */
export async function getComparisonsBySurveyId(surveyId: string): Promise<DbBenchmarkComparison[]> {
  const client = await getSupabaseClient();
  if (!client) {
    console.warn('[BenchmarkRepository] Supabase no disponible');
    return [];
  }

  const { data, error } = await client
    .from('benchmark_comparisons')
    .select('*')
    .eq('survey_id', surveyId)
    .order('compared_at', { ascending: false });

  if (error) {
    console.error('Error fetching comparisons:', error);
    throw new Error(`Failed to fetch comparisons: ${error.message}`);
  }

  return (data as DbBenchmarkComparison[]) || [];
}

// ===========================================
// Storage Operations
// ===========================================

/**
 * Sube un PDF al storage de Supabase
 */
export async function uploadBenchmarkPdf(
  file: File,
  benchmarkId: string
): Promise<string> {
  const client = await getSupabaseClient();
  if (!client) {
    throw new Error('Supabase no disponible');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${benchmarkId}_${Date.now()}.${fileExt}`;
  const filePath = `benchmarks/${fileName}`;

  const { error: uploadError } = await client.storage
    .from('benchmarks')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Error uploading PDF:', uploadError);
    throw new Error(`Failed to upload PDF: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = client.storage
    .from('benchmarks')
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Elimina un PDF del storage
 */
export async function deleteBenchmarkPdf(pdfUrl: string): Promise<void> {
  const client = await getSupabaseClient();
  if (!client) {
    throw new Error('Supabase no disponible');
  }

  // Extraer el path del URL
  const url = new URL(pdfUrl);
  const pathMatch = url.pathname.match(/\/benchmarks\/(.+)/);
  
  if (!pathMatch) {
    console.warn('Could not extract path from PDF URL:', pdfUrl);
    return;
  }

  const filePath = pathMatch[1];

  const { error } = await client.storage
    .from('benchmarks')
    .remove([filePath]);

  if (error) {
    console.error('Error deleting PDF:', error);
    throw new Error(`Failed to delete PDF: ${error.message}`);
  }
}
