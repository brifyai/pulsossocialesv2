/**
 * Synthetic Response Engine v1
 * 
 * Motor de respuestas sintéticas basado en reglas heurísticas.
 * Sin IA compleja - usa atributos del agente para generar respuestas plausibles.
 */

import type { SyntheticAgent } from '../../types/agent';
import type { 
  SurveyQuestion, 
  SingleChoiceQuestion, 
  LikertScaleQuestion,
  MultipleChoiceQuestion,
  TextQuestion,
  AgentResponse,
  ResponseValue 
} from '../../types/survey';

// ===========================================
// Heurísticas de respuesta
// ===========================================

/**
 * Calcula un score de "conservadurismo" basado en atributos del agente
 * Mayor score = más conservador (menos abierto al cambio)
 */
function calculateConservatism(agent: SyntheticAgent): number {
  let score = 0;
  
  // Edad - mayor edad = más conservador
  if (agent.age > 70) score += 40;
  else if (agent.age > 60) score += 30;
  else if (agent.age > 50) score += 20;
  else if (agent.age > 40) score += 10;
  else score += 5;
  
  // Educación - menor educación = más conservador
  const educationScores: Record<string, number> = {
    'none': 25, 'primary': 20, 'secondary': 15, 'technical': 10, 'university': 5, 'postgraduate': 0
  };
  score += educationScores[agent.education_level || 'secondary'];
  
  // Urbanicidad - rural = más conservador
  if (agent.urbanicity === 'rural') score += 15;
  else score += 5;
  
  // Ingreso - menor ingreso = más conservador
  const incomeDecile = agent.income_decile || 5;
  score += (11 - incomeDecile) * 2;
  
  return Math.min(100, score);
}

/**
 * Calcula un score de "digital readiness" basado en atributos del agente
 */
function calculateDigitalReadiness(agent: SyntheticAgent): number {
  let score = 0;
  
  // Conectividad (0-40 puntos)
  const connectivityScores: Record<string, number> = {
    'none': 0, 'low': 10, 'medium': 25, 'high': 35, 'very_high': 40
  };
  score += connectivityScores[agent.connectivity_level || 'none'];
  
  // Educación (0-30 puntos)
  const educationScores: Record<string, number> = {
    'none': 0, 'primary': 5, 'secondary': 15, 'technical': 25, 'university': 30, 'postgraduate': 30
  };
  score += educationScores[agent.education_level || 'none'];
  
  // Edad (0-20 puntos) - younger is more digital
  if (agent.age < 25) score += 20;
  else if (agent.age < 40) score += 15;
  else if (agent.age < 60) score += 10;
  else score += 5;
  
  // Ingreso (0-10 puntos)
  score += (agent.income_decile || 1) * 1;
  
  return Math.min(100, score);
}

/**
 * Genera respuesta para pregunta de opción múltiple
 * Implementado en v2 - Selección múltiple basada en atributos del agente
 */
function generateMultipleChoiceResponse(
  agent: SyntheticAgent,
  question: MultipleChoiceQuestion
): ResponseValue {
  const selectedOptions: string[] = [];
  const numOptions = question.options.length;
  
  // Calcular cuántas opciones seleccionar (1 a numOptions)
  // Basado en digital_readiness: más digital = más opciones
  const digitalReadiness = calculateDigitalReadiness(agent);
  const maxSelections = Math.max(1, Math.min(numOptions, 
    Math.floor(digitalReadiness / 20) + 1
  ));
  
  // Probabilidad de seleccionar cada opción
  const selectionProbabilities = question.options.map((option: { id: string; label: string; value: string | number }) => {
    const label = option.label.toLowerCase();
    let probability = 0.3; // Probabilidad base
    
    // Ajustar según atributos del agente
    if (label.includes('internet') || label.includes('digital') || label.includes('online')) {
      probability += (digitalReadiness / 100) * 0.5;
    }
    if (label.includes('móvil') || label.includes('celular') || label.includes('smartphone')) {
      probability += agent.connectivity_level === 'high' || agent.connectivity_level === 'very_high' ? 0.4 : 0.1;
    }
    if (label.includes('presencial') || label.includes('físico') || label.includes('oficina')) {
      probability += agent.age > 50 ? 0.3 : 0.1;
    }
    if (label.includes('teléfono') || label.includes('llamada')) {
      probability += agent.age > 40 ? 0.2 : 0.1;
    }
    
    // Ajustar por educación
    if (label.includes('avanzado') || label.includes('complejo')) {
      const educationBoost = {
        'none': -0.2, 'primary': -0.1, 'secondary': 0, 
        'technical': 0.1, 'university': 0.2, 'postgraduate': 0.3
      };
      probability += educationBoost[agent.education_level || 'secondary'] || 0;
    }
    
    return { option, probability: Math.max(0.1, Math.min(0.9, probability)) };
  });
  
  // Seleccionar opciones basadas en probabilidades
  for (const { option, probability } of selectionProbabilities) {
    if (selectedOptions.length < maxSelections && Math.random() < probability) {
      selectedOptions.push(option.value as string);
    }
  }
  
  // Asegurar al menos una selección
  if (selectedOptions.length === 0) {
    const randomOption = question.options[Math.floor(Math.random() * numOptions)];
    selectedOptions.push(randomOption.value as string);
  }
  
  return selectedOptions;
}

/**
 * Genera respuesta para pregunta de texto
 * Implementado en v2 - Generación contextual basada en atributos
 */
function generateTextResponse(
  agent: SyntheticAgent,
  question: TextQuestion
): ResponseValue {
  const questionLower = question.text.toLowerCase();
  
  // Templates de respuestas por tema
  const templates: Record<string, string[]> = {
    'satisfacción': [
      'En general estoy {sentiment} con el servicio.',
      'Mi experiencia ha sido {sentiment}, aunque hay áreas de mejora.',
      'Considero que el servicio es {sentiment} para mis necesidades.'
    ],
    'mejora': [
      'Creo que deberían enfocarse en {aspecto}.',
      'Lo más importante sería mejorar {aspecto}.',
      'Mi sugerencia principal es trabajar en {aspecto}.'
    ],
    'problema': [
      'El principal problema que he enfrentado es {problema}.',
      'He tenido dificultades con {problema}.',
      'Un desafío importante es {problema}.'
    ],
    'experiencia': [
      'Mi experiencia ha sido {calidad} en general.',
      'He tenido una experiencia {calidad} hasta ahora.',
      'Diría que mi experiencia es {calidad}.'
    ],
    'opinión': [
      'En mi opinión, {opinion}.',
      'Considero que {opinion}.',
      'Pienso que {opinion}.'
    ]
  };
  
  // Determinar el tema de la pregunta
  let theme = 'opinión';
  for (const [key] of Object.entries(templates)) {
    if (questionLower.includes(key)) {
      theme = key;
      break;
    }
  }
  
  // Seleccionar template aleatorio
  const themeTemplates = templates[theme] || templates['opinión'];
  let response = themeTemplates[Math.floor(Math.random() * themeTemplates.length)];
  
  // Calcular sentimiento basado en atributos
  const digitalReadiness = calculateDigitalReadiness(agent);
  const serviceSatisfaction = calculatePublicServiceSatisfaction(agent);
  
  // Determinar sentimiento general
  let sentiment = 'neutral';
  if (serviceSatisfaction > 60 && digitalReadiness > 50) {
    sentiment = 'muy satisfecho';
  } else if (serviceSatisfaction > 40) {
    sentiment = 'satisfecho';
  } else if (serviceSatisfaction > 20) {
    sentiment = 'neutral';
  } else {
    sentiment = 'insatisfecho';
  }
  
  // Aspectos de mejora según perfil
  const aspectos = [
    'la accesibilidad digital',
    'los tiempos de respuesta',
    'la claridad de la información',
    'la atención personalizada',
    'la disponibilidad de canales',
    'la facilidad de uso'
  ];
  
  // Problemas según perfil
  const problemas = [
    'el acceso a internet en mi zona',
    'la complejidad de los trámites',
    'la falta de información clara',
    'los tiempos de espera',
    'la disponibilidad de horarios',
    'la necesidad de asistencia presencial'
  ];
  
  // Calidad según satisfacción
  const calidad = serviceSatisfaction > 60 ? 'positiva' : 
                  serviceSatisfaction > 30 ? 'mixta' : 'negativa';
  
  // Opiniones según perfil
  const opiniones = [
    'el servicio cumple con lo básico pero podría mejorar',
    'es importante seguir invirtiendo en digitalización',
    'la atención presencial sigue siendo necesaria para muchos',
    'la brecha digital es un desafío importante',
    'los servicios digitales son útiles cuando funcionan bien',
    'se necesita más capacitación para el uso de plataformas digitales'
  ];
  
  // Reemplazar placeholders
  response = response
    .replace('{sentiment}', sentiment)
    .replace('{aspecto}', aspectos[Math.floor(Math.random() * aspectos.length)])
    .replace('{problema}', problemas[Math.floor(Math.random() * problemas.length)])
    .replace('{calidad}', calidad)
    .replace('{opinion}', opiniones[Math.floor(Math.random() * opiniones.length)]);
  
  // Añadir variabilidad según educación
  if (agent.education_level === 'university' || agent.education_level === 'postgraduate') {
    response += ' Además, considero importante analizar esto desde una perspectiva más amplia.';
  } else if (agent.education_level === 'none' || agent.education_level === 'primary') {
    response = response.split('.')[0] + '.'; // Respuesta más corta
  }
  
  return response;
}

/**
 * Calcula un score de "preocupación económica"
 */
function calculateEconomicConcern(agent: SyntheticAgent): number {
  let score = 0;
  
  // Ingreso - lower income = higher concern
  const incomeDecile = agent.income_decile || 5;
  score += (11 - incomeDecile) * 8; // 80 max
  
  // Pobreza
  if (agent.poverty_status === 'extreme_poverty') score += 20;
  else if (agent.poverty_status === 'poverty') score += 15;
  else if (agent.poverty_status === 'vulnerable') score += 10;
  
  // Ocupación
  if (agent.occupation_status === 'unemployed') score += 10;
  
  return Math.min(100, score);
}

/**
 * Calcula un score de "satisfacción con servicios públicos"
 */
function calculatePublicServiceSatisfaction(agent: SyntheticAgent): number {
  // Basado en ingreso y región (simplificado)
  let score = 50; // base
  
  // Ingreso correlaciona con satisfacción (hasta cierto punto)
  const incomeDecile = agent.income_decile || 5;
  score += (incomeDecile - 5) * 3;
  
  // Conectividad afecta satisfacción digital
  const connectivityScores: Record<string, number> = {
    'none': -20, 'low': -10, 'medium': 0, 'high': 10, 'very_high': 15
  };
  score += connectivityScores[agent.connectivity_level || 'none'];
  
  // Ruido aleatorio pequeño para variabilidad
  score += (Math.random() - 0.5) * 20;
  
  return Math.max(0, Math.min(100, score));
}

// ===========================================
// Generadores de respuesta por tipo de pregunta
// ===========================================

/**
 * Genera respuesta para pregunta de opción única
 */
function generateSingleChoiceResponse(
  agent: SyntheticAgent, 
  question: SingleChoiceQuestion
): { value: string; confidence: number; reasoning: string } {
  const digitalReadiness = calculateDigitalReadiness(agent);
  const conservatism = calculateConservatism(agent);
  const economicConcern = calculateEconomicConcern(agent);
  
  // Analizar el texto de la pregunta para determinar contexto
  const questionLower = question.text.toLowerCase();
  
  // Preguntas sobre tecnología/digital
  if (questionLower.includes('internet') || questionLower.includes('digital') || 
      questionLower.includes('tecnología') || questionLower.includes('online')) {
    
    if (digitalReadiness > 70) {
      // Buscar opción positiva
      const positiveOption = question.options.find(o => 
        o.label.toLowerCase().includes('sí') || 
        o.label.toLowerCase().includes('frecuente') ||
        o.label.toLowerCase().includes('diario')
      );
      if (positiveOption) {
        return {
          value: positiveOption.value as string,
          confidence: 0.85,
          reasoning: `Alta conectividad (${agent.connectivity_level}) y educación (${agent.education_level})`
        };
      }
    } else if (digitalReadiness < 30) {
      const negativeOption = question.options.find(o => 
        o.label.toLowerCase().includes('no') || 
        o.label.toLowerCase().includes('nunca')
      );
      if (negativeOption) {
        return {
          value: negativeOption.value as string,
          confidence: 0.80,
          reasoning: `Baja conectividad (${agent.connectivity_level}) y educación básica`
        };
      }
    }
  }
  
  // Preguntas sobre economía/precios
  if (questionLower.includes('precio') || questionLower.includes('economía') || 
      questionLower.includes('gasto') || questionLower.includes('costo')) {
    
    if (economicConcern > 70) {
      const concernedOption = question.options.find(o => 
        o.label.toLowerCase().includes('muy') || 
        o.label.toLowerCase().includes('alto') ||
        o.label.toLowerCase().includes('preocupa')
      );
      if (concernedOption) {
        return {
          value: concernedOption.value as string,
          confidence: 0.82,
          reasoning: `Bajo ingreso (decil ${agent.income_decile}) y preocupación económica alta`
        };
      }
    }
  }
  
  // Preguntas sobre cambio/innovación
  if (questionLower.includes('cambio') || questionLower.includes('nuevo') || 
      questionLower.includes('innovación')) {
    
    if (conservatism > 60) {
      const conservativeOption = question.options.find(o => 
        o.label.toLowerCase().includes('no') || 
        o.label.toLowerCase().includes('prefiero') ||
        o.label.toLowerCase().includes('tradicional')
      );
      if (conservativeOption) {
        return {
          value: conservativeOption.value as string,
          confidence: 0.75,
          reasoning: `Edad (${agent.age}) y perfil conservador`
        };
      }
    }
  }
  
  // Respuesta por defecto: distribución ponderada por edad
  const random = Math.random();
  let selectedIndex = Math.floor(random * question.options.length);
  
  // Ajustar por edad (jóvenes tienden a opciones más extremas)
  if (agent.age < 30 && random > 0.7) {
    selectedIndex = 0; // primera opción (sí/muy de acuerdo)
  } else if (agent.age > 60 && random > 0.6) {
    selectedIndex = question.options.length - 1; // última opción
  }
  
  const selectedOption = question.options[selectedIndex];
  return {
    value: selectedOption.value as string,
    confidence: 0.60,
    reasoning: `Respuesta basada en distribución demográfica general`
  };
}

/**
 * Genera respuesta para escala Likert
 */
function generateLikertResponse(
  agent: SyntheticAgent, 
  question: LikertScaleQuestion
): { value: number; confidence: number; reasoning: string } {
  const questionLower = question.text.toLowerCase();
  const digitalReadiness = calculateDigitalReadiness(agent);
  const conservatism = calculateConservatism(agent);
  const economicConcern = calculateEconomicConcern(agent);
  const serviceSatisfaction = calculatePublicServiceSatisfaction(agent);
  
  let baseScore = 3; // neutral
  let confidence = 0.70;
  let reasoning = 'Respuesta neutral por defecto';
  
  // Preguntas sobre satisfacción con servicios
  if (questionLower.includes('satisfacción') || questionLower.includes('calidad') || 
      questionLower.includes('servicio')) {
    baseScore = Math.round(serviceSatisfaction / 20); // convertir 0-100 a 1-5
    baseScore = Math.max(question.min, Math.min(question.max, baseScore));
    confidence = 0.75;
    reasoning = `Satisfacción calculada: ${serviceSatisfaction.toFixed(0)}/100`;
  }
  
  // Preguntas sobre adopción tecnológica
  else if (questionLower.includes('tecnología') || questionLower.includes('digital') || 
           questionLower.includes('internet')) {
    baseScore = Math.round(digitalReadiness / 20);
    baseScore = Math.max(question.min, Math.min(question.max, baseScore));
    confidence = 0.80;
    reasoning = `Readiness digital: ${digitalReadiness.toFixed(0)}/100`;
  }
  
  // Preguntas sobre preocupación económica
  else if (questionLower.includes('preocupa') || questionLower.includes('económica') || 
           questionLower.includes('precio')) {
    // Invertir: mayor preocupación = menor score
    baseScore = question.max + 1 - Math.round(economicConcern / 20);
    baseScore = Math.max(question.min, Math.min(question.max, baseScore));
    confidence = 0.78;
    reasoning = `Preocupación económica: ${economicConcern.toFixed(0)}/100`;
  }
  
  // Preguntas sobre apertura al cambio
  else if (questionLower.includes('cambio') || questionLower.includes('innovación')) {
    // Invertir: mayor conservadurismo = menor score
    baseScore = question.max + 1 - Math.round(conservatism / 20);
    baseScore = Math.max(question.min, Math.min(question.max, baseScore));
    confidence = 0.72;
    reasoning = `Perfil de apertura basado en edad (${agent.age}) y educación`;
  }
  
  // Añadir variabilidad aleatoria
  const variability = (Math.random() - 0.5) * 1.5;
  let finalScore = Math.round(baseScore + variability);
  finalScore = Math.max(question.min, Math.min(question.max, finalScore));
  
  return { value: finalScore, confidence, reasoning };
}

// ===========================================
// API Pública del Motor
// ===========================================

/**
 * Genera una respuesta sintética para un agente y pregunta
 */
export function generateSyntheticResponse(
  agent: SyntheticAgent,
  question: SurveyQuestion
): AgentResponse {
  let result: { value: ResponseValue; confidence: number; reasoning: string };
  
  switch (question.type) {
    case 'single_choice':
      result = generateSingleChoiceResponse(agent, question as SingleChoiceQuestion);
      break;
      
    case 'likert_scale':
      result = generateLikertResponse(agent, question as LikertScaleQuestion);
      break;
      
    case 'multiple_choice':
      result = { 
        value: generateMultipleChoiceResponse(agent, question as MultipleChoiceQuestion), 
        confidence: 0.70, 
        reasoning: 'Selección múltiple basada en perfil digital y demográfico'
      };
      break;
      
    case 'text':
      result = { 
        value: generateTextResponse(agent, question as TextQuestion), 
        confidence: 0.65, 
        reasoning: 'Texto generado contextualmente basado en atributos del agente'
      };
      break;
      
    default:
      result = { 
        value: null, 
        confidence: 0, 
        reasoning: 'Tipo de pregunta no soportado' 
      };
  }
  
  return {
    agentId: agent.agent_id,
    questionId: question.id,
    value: result.value,
    confidence: result.confidence,
    reasoning: result.reasoning
  };
}

/**
 * Genera respuestas para todos los agentes de una encuesta
 */
export function generateSurveyResponses(
  agents: SyntheticAgent[],
  questions: SurveyQuestion[]
): AgentResponse[] {
  const responses: AgentResponse[] = [];
  
  for (const agent of agents) {
    for (const question of questions) {
      const response = generateSyntheticResponse(agent, question);
      responses.push(response);
    }
  }
  
  return responses;
}

/**
 * Calcula estadísticas de confianza de las respuestas
 */
export function calculateConfidenceStats(responses: AgentResponse[]): {
  average: number;
  min: number;
  max: number;
  distribution: Record<string, number>;
} {
  if (responses.length === 0) {
    return { average: 0, min: 0, max: 0, distribution: {} };
  }
  
  const confidences = responses.map(r => r.confidence);
  const sum = confidences.reduce((a, b) => a + b, 0);
  const avg = sum / confidences.length;
  const min = Math.min(...confidences);
  const max = Math.max(...confidences);
  
  // Distribución por rangos
  const distribution: Record<string, number> = {
    '0.0-0.3': 0,
    '0.3-0.5': 0,
    '0.5-0.7': 0,
    '0.7-0.9': 0,
    '0.9-1.0': 0
  };
  
  confidences.forEach(c => {
    if (c < 0.3) distribution['0.0-0.3']++;
    else if (c < 0.5) distribution['0.3-0.5']++;
    else if (c < 0.7) distribution['0.5-0.7']++;
    else if (c < 0.9) distribution['0.7-0.9']++;
    else distribution['0.9-1.0']++;
  });
  
  return { average: avg, min, max, distribution };
}
