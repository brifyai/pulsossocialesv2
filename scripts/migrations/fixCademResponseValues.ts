/**
 * Script de migración para corregir valores de respuestas CADEM
 * 
 * Problema: Las respuestas CADEM se guardaron con valores internos del motor
 * (ej: 'approve', 'good_path') en lugar de los valores de opciones (ej: 'A', 'B')
 * 
 * Solución: Este script lee todas las respuestas de encuestas CADEM, identifica
 * los valores internos y los mapea a los valores correctos de opciones.
 * 
 * Uso: npx ts-node scripts/migrations/fixCademResponseValues.ts
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient } from '../utils/serviceClient';

// El cliente serviceClient ya está validado y configurado con SERVICE_KEY
console.log('🔗 Usando serviceClient con SERVICE_KEY');

// ===========================================
// Configuración
// ===========================================

const CADEM_VALUE_MAPPINGS: Record<string, Record<string, string>> = {
  // Familia: approval (Aprueba/Desaprueba)
  approval: {
    'approve': 'A',
    'disapprove': 'B',
    'no_response': 'C',
    'no_opinion': 'C',
  },
  // Familia: direction (Rumbo país)
  direction: {
    'good_path': 'A',
    'bad_path': 'B',
    'no_response': 'C',
    'no_opinion': 'C',
  },
  // Familia: optimism (Optimismo personal)
  optimism: {
    'very_optimistic': 'A',
    'optimistic': 'B',
    'pessimistic': 'C',
    'very_pessimistic': 'D',
    'no_response': 'E',
    'no_opinion': 'E',
  },
  // Familia: economic_perception (Situación económica personal)
  economic_perception: {
    'very_good': 'A',
    'good': 'B',
    'bad': 'C',
    'very_bad': 'D',
    'no_response': 'E',
    'no_opinion': 'E',
  },
  // Familia: economic_situation (Situación económica país)
  economic_situation: {
    'very_good': 'A',
    'good': 'B',
    'bad': 'C',
    'very_bad': 'D',
    'no_response': 'E',
    'no_opinion': 'E',
  },
};

// Valores internos que indican que es una respuesta CADEM
const CADEM_INTERNAL_VALUES = [
  'approve', 'disapprove', 'good_path', 'bad_path',
  'very_optimistic', 'optimistic', 'pessimistic', 'very_pessimistic',
  'very_good', 'good', 'bad', 'very_bad',
  'no_response', 'no_opinion'
];

// ===========================================
// Tipos
// ===========================================

interface SurveyResponse {
  id: string;
  survey_id: string;
  run_id: string;
  agent_id: string;
  question_id: string;
  value: string | number | null;
  confidence: number;
  reasoning: string | null;
}

interface SurveyDefinition {
  id: string;
  name: string;
  questions: Array<{
    id: string;
    type: string;
    text: string;
    options?: Array<{
      id: string;
      label: string;
      value: string | number;
    }>;
  }>;
  engine_mode?: string;
}

// ===========================================
// Funciones de utilidad
// ===========================================

/**
 * Detecta la familia de pregunta CADEM basada en el texto
 */
function detectCademFamily(questionText: string): string | null {
  const text = questionText.toLowerCase();
  
  // Approval: "Aprueba" o "Desaprueba"
  if (text.includes('aprueba') || text.includes('desaprueba') || text.includes('gestión')) {
    return 'approval';
  }
  
  // Direction: "rumbo", "camino"
  if (text.includes('rumbo') || text.includes('camino') || text.includes('dirección')) {
    return 'direction';
  }
  
  // Optimism: "optimista", "pesimista"
  if (text.includes('optimista') || text.includes('pesimista')) {
    return 'optimism';
  }
  
  // Economic perception: "situación económica" + "personal"
  if (text.includes('situación económica') && text.includes('personal')) {
    return 'economic_perception';
  }
  
  // Economic situation: "situación económica" + "país"
  if (text.includes('situación económica') && (text.includes('país') || text.includes('pais'))) {
    return 'economic_situation';
  }
  
  return null;
}

/**
 * Mapea un valor interno de CADEM a un valor de opción
 */
function mapCademValueToOption(
  cademValue: string,
  family: string,
  options?: Array<{ id: string; label: string; value: string | number }>
): string | number | null {
  const normalizedValue = cademValue.toLowerCase().trim();
  
  // Obtener el mapeo para esta familia
  const mapping = CADEM_VALUE_MAPPINGS[family];
  if (!mapping) {
    console.warn(`⚠️ No hay mapeo definido para familia: ${family}`);
    return null;
  }
  
  // Buscar el valor mapeado
  const mappedValue = mapping[normalizedValue];
  if (!mappedValue) {
    console.warn(`⚠️ No hay mapeo para valor "${cademValue}" en familia "${family}"`);
    return null;
  }
  
    // Si tenemos opciones, verificar que el valor mapeado exista
    if (options && options.length > 0) {
      const optionExists = options.some(opt => 
        String(opt.value).toUpperCase() === mappedValue.toUpperCase()
      );
      
      if (!optionExists) {
        console.warn(`⚠️ Valor mapeado "${mappedValue}" no existe en las opciones`);
        // Fallback: buscar por label
        const fallbackOption = options.find(opt => {
          if (!opt.label) return false;
          const label = opt.label.toLowerCase();
          if (normalizedValue.includes('approve') && label.includes('aprueba')) return true;
          if (normalizedValue.includes('disapprove') && label.includes('desaprueba')) return true;
          if (normalizedValue.includes('good_path') && label.includes('buen')) return true;
          if (normalizedValue.includes('bad_path') && label.includes('mal')) return true;
          if (normalizedValue.includes('no_response') && (label.includes('no responde') || label.includes('no sabe'))) return true;
          return false;
        });
        
        if (fallbackOption) {
          console.log(`  ↳ Usando fallback: ${fallbackOption.value}`);
          return fallbackOption.value;
        }
        
        return null;
      }
    }
  
  return mappedValue;
}

/**
 * Verifica si un valor es un valor interno de CADEM
 */
function isCademInternalValue(value: string | number | null): boolean {
  if (value === null || value === undefined) return false;
  const strValue = String(value).toLowerCase().trim();
  return CADEM_INTERNAL_VALUES.includes(strValue);
}

// ===========================================
// Funciones principales
// ===========================================

/**
 * Obtiene todas las encuestas que tienen respuestas
 */
async function getSurveysWithResponses(supabase: SupabaseClient): Promise<SurveyDefinition[]> {
  // Primero obtener todos los survey_ids de survey_responses
  const { data: responseData, error: responseError } = await supabase
    .from('survey_responses')
    .select('survey_id')
    .order('survey_id');
  
  if (responseError) {
    console.error('❌ Error obteniendo survey_ids de respuestas:', responseError);
    throw responseError;
  }
  
  // Obtener unique survey_ids
  const surveyIds = [...new Set((responseData || []).map(r => r.survey_id))];
  
  if (surveyIds.length === 0) {
    console.log('ℹ️ No hay encuestas con respuestas');
    return [];
  }
  
  // Obtener las definiciones de encuestas
  const { data, error } = await supabase
    .from('survey_definitions')
    .select('*')
    .in('id', surveyIds);
  
  if (error) {
    console.error('❌ Error obteniendo encuestas:', error);
    throw error;
  }
  
  return (data || []) as SurveyDefinition[];
}

/**
 * @deprecated Usar getSurveysWithResponses
 */
async function getCademSurveys(supabase: SupabaseClient): Promise<SurveyDefinition[]> {
  return getSurveysWithResponses(supabase);
}

/**
 * Obtiene todas las respuestas de una encuesta
 */
async function getSurveyResponses(
  supabase: SupabaseClient,
  surveyId: string
): Promise<SurveyResponse[]> {
  const { data, error } = await supabase
    .from('survey_responses')
    .select('*')
    .eq('survey_id', surveyId);
  
  if (error) {
    console.error(`❌ Error obteniendo respuestas de encuesta ${surveyId}:`, error);
    throw error;
  }
  
  return (data || []) as SurveyResponse[];
}

/**
 * Actualiza una respuesta con el valor corregido
 */
async function updateResponseValue(
  supabase: SupabaseClient,
  responseId: string,
  newValue: string | number
): Promise<boolean> {
  const { error } = await supabase
    .from('survey_responses')
    .update({ value: newValue })
    .eq('id', responseId);
  
  if (error) {
    console.error(`❌ Error actualizando respuesta ${responseId}:`, error);
    return false;
  }
  
  return true;
}

/**
 * Ejecuta la migración
 */
async function runMigration() {
  console.log('🚀 Iniciando migración de respuestas CADEM...\n');
  
  // Usar serviceClient que ya está validado y configurado
  const supabase = serviceClient;
  
  // Estadísticas
  const stats = {
    surveysProcessed: 0,
    responsesAnalyzed: 0,
    responsesFixed: 0,
    responsesSkipped: 0,
    errors: 0,
  };
  
  try {
    // 1. Obtener todas las encuestas CADEM
    console.log('📋 Paso 1: Obteniendo encuestas CADEM...');
    const surveys = await getCademSurveys(supabase);
    console.log(`✅ Encontradas ${surveys.length} encuestas CADEM\n`);
    
    // 2. Procesar cada encuesta
    for (const survey of surveys) {
      console.log(`\n📊 Procesando encuesta: "${survey.name}" (${survey.id})`);
      stats.surveysProcessed++;
      
      // Crear mapa de preguntas
      const questionMap = new Map<string, SurveyDefinition['questions'][0]>();
      for (const q of survey.questions) {
        questionMap.set(q.id, q);
      }
      
      // 3. Obtener respuestas de esta encuesta
      const responses = await getSurveyResponses(supabase, survey.id);
      console.log(`  📄 ${responses.length} respuestas encontradas`);
      
      // 4. Procesar cada respuesta
      for (const response of responses) {
        stats.responsesAnalyzed++;
        
        // Verificar si el valor es un valor interno de CADEM
        if (!isCademInternalValue(response.value)) {
          stats.responsesSkipped++;
          continue;
        }
        
        // Obtener la pregunta correspondiente
        const question = questionMap.get(response.question_id);
        if (!question) {
          console.warn(`  ⚠️ Pregunta ${response.question_id} no encontrada en la encuesta`);
          stats.errors++;
          continue;
        }
        
        // Detectar la familia de la pregunta
        const family = detectCademFamily(question.text);
        if (!family) {
          console.warn(`  ⚠️ No se pudo detectar familia para pregunta: "${question.text.substring(0, 50)}..."`);
          stats.errors++;
          continue;
        }
        
        // Mapear el valor
        const newValue = mapCademValueToOption(
          String(response.value),
          family,
          question.options
        );
        
        if (newValue === null) {
          console.warn(`  ⚠️ No se pudo mapear valor "${response.value}" para familia "${family}"`);
          stats.errors++;
          continue;
        }
        
        // Actualizar la respuesta
        const success = await updateResponseValue(supabase, response.id, newValue);
        if (success) {
          console.log(`  ✅ Respuesta ${response.id}: "${response.value}" → "${newValue}"`);
          stats.responsesFixed++;
        } else {
          stats.errors++;
        }
      }
    }
    
    // 5. Mostrar resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`Encuestas procesadas: ${stats.surveysProcessed}`);
    console.log(`Respuestas analizadas: ${stats.responsesAnalyzed}`);
    console.log(`Respuestas corregidas: ${stats.responsesFixed}`);
    console.log(`Respuestas sin cambios: ${stats.responsesSkipped}`);
    console.log(`Errores: ${stats.errors}`);
    console.log('='.repeat(60));
    
    if (stats.errors === 0) {
      console.log('\n✅ Migración completada exitosamente');
    } else {
      console.log('\n⚠️ Migración completada con advertencias');
    }
    
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
runMigration();
