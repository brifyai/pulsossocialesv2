/**
 * Script de depuración para ver cómo interpretQuestion() clasifica preguntas benchmark
 * Detecta si q_direction y q_optimism están siendo interpretadas correctamente
 */

import { interpretQuestion } from '../../src/app/opinionEngine/questionInterpreter';
import type { InterpretedQuestion } from '../../src/app/opinionEngine/types';

// Preguntas CADEM con wording real
const TEST_QUESTIONS = [
  {
    id: 'q_approval',
    text: 'Ahora. Independiente de su posición política, ¿Usted aprueba o desaprueba la forma cómo José Antonio Kast está conduciendo su Gobierno?',
    options: ['Aprueba', 'Desaprueba', 'No responde'],
  },
  {
    id: 'q_direction',
    text: 'Ahora, pensando en todos los aspectos políticos, económicos y sociales, ¿Usted cree que el país va por un buen camino o por un mal camino?',
    options: ['Buen camino', 'Mal camino', 'No responde'],
  },
  {
    id: 'q_optimism',
    text: 'En general, ¿Cómo se siente usted acerca del futuro del país?',
    options: ['Muy optimista', 'Optimista', 'Pesimista', 'Muy pesimista', 'No responde'],
  },
  {
    id: 'q_economy_national',
    text: 'Usted cree que en el momento actual la economía chilena está...',
    options: ['Muy buena', 'Buena', 'Mala', 'Muy mala', 'No responde'],
  },
  {
    id: 'q_economy_personal',
    text: '¿Cómo calificaría usted la situación económica actual de usted y su familia?',
    options: ['Muy buena', 'Buena', 'Mala', 'Muy mala', 'No responde'],
  },
];

// Preguntas del script de debug (wording simplificado)
const DEBUG_QUESTIONS = [
  {
    id: 'q_approval',
    text: '¿Aprueba o desaprueba la forma como el gobierno está manejando los problemas del país?',
    options: ['Aprueba', 'Desaprueba', 'No responde'],
  },
  {
    id: 'q_direction',
    text: '¿Cree usted que el país va por el camino correcto o por el camino equivocado?',
    options: ['Buen camino', 'Mal camino', 'No responde'],
  },
  {
    id: 'q_optimism',
    text: '¿Cree que dentro de un año la situación del país será mejor, igual o peor?',
    options: ['Muy optimista', 'Optimista', 'Pesimista', 'Muy pesimista', 'No responde'],
  },
  {
    id: 'q_economy_national',
    text: '¿Cómo evalúa la situación económica actual del país?',
    options: ['Muy buena', 'Buena', 'Mala', 'Muy mala', 'No responde'],
  },
  {
    id: 'q_economy_personal',
    text: '¿Cómo evalúa su situación económica personal actual?',
    options: ['Muy buena', 'Buena', 'Mala', 'Muy mala', 'No responde'],
  },
];

interface InterpretationResult {
  questionId: string;
  originalText: string;
  family: string;
  topic: string;
  targetEntity: string | null;
  responseFormat: string;
  fingerprint: string;
  options: string[];
}

function analyzeQuestion(question: { id: string; text: string; options: string[] }): InterpretationResult {
  const interpreted = interpretQuestion({
    id: question.id,
    text: question.text,
    type: 'single_choice',
    options: question.options,
  });

  return {
    questionId: question.id,
    originalText: question.text,
    family: interpreted.family ?? 'unknown',
    topic: interpreted.topic ?? 'unknown',
    targetEntity: interpreted.targetEntity ?? null,
    responseFormat: interpreted.responseFormat,
    fingerprint: interpreted.fingerprint,
    options: question.options,
  };
}

function printInterpretationResults(results: InterpretationResult[], title: string): void {
  console.log('\n' + '='.repeat(100));
  console.log(title);
  console.log('='.repeat(100));

  for (const result of results) {
    console.log(`\n📋 ${result.questionId}`);
    console.log(`   Texto: "${result.originalText.substring(0, 70)}..."`);
    console.log(`   ├─ family:        ${result.family}`);
    console.log(`   ├─ topic:         ${result.topic}`);
    console.log(`   ├─ targetEntity:  ${result.targetEntity ?? 'null'}`);
    console.log(`   ├─ responseFormat:${result.responseFormat}`);
    console.log(`   └─ fingerprint:   ${result.fingerprint}`);

    // Verificar si es fallback
    const isFallback = result.family === 'unknown' || result.topic === 'unknown';
    if (isFallback) {
      console.log(`   ⚠️  ALERTA: Pregunta en fallback (family/topic = unknown)`);
    }
  }

  console.log('\n' + '-'.repeat(100));
  console.log('Resumen de familias detectadas:');
  const familyCounts: Record<string, number> = {};
  for (const r of results) {
    familyCounts[r.family] = (familyCounts[r.family] || 0) + 1;
  }
  for (const [family, count] of Object.entries(familyCounts)) {
    console.log(`  ${family}: ${count} preguntas`);
  }

  console.log('\nResumen de topics detectados:');
  const topicCounts: Record<string, number> = {};
  for (const r of results) {
    topicCounts[r.topic] = (topicCounts[r.topic] || 0) + 1;
  }
  for (const [topic, count] of Object.entries(topicCounts)) {
    console.log(`  ${topic}: ${count} preguntas`);
  }

  console.log('='.repeat(100));
}

function main(): void {
  console.log('='.repeat(100));
  console.log('DEBUG QUESTION INTERPRETATION');
  console.log('='.repeat(100));

  // Analizar preguntas con wording real CADEM
  console.log('\n🔍 Analizando preguntas con wording real de CADEM...');
  const realResults = TEST_QUESTIONS.map(analyzeQuestion);
  printInterpretationResults(realResults, 'RESULTADOS: Wording real CADEM');

  // Analizar preguntas con wording simplificado (usado en debugRunSurveyFromSupabase)
  console.log('\n🔍 Analizando preguntas con wording simplificado...');
  const debugResults = DEBUG_QUESTIONS.map(analyzeQuestion);
  printInterpretationResults(debugResults, 'RESULTADOS: Wording simplificado');

  // Comparar diferencias
  console.log('\n' + '='.repeat(100));
  console.log('COMPARACIÓN DE DIFERENCIAS');
  console.log('='.repeat(100));

  for (let i = 0; i < TEST_QUESTIONS.length; i++) {
    const real = realResults[i];
    const debug = debugResults[i];

    const familyDiff = real.family !== debug.family;
    const topicDiff = real.topic !== debug.topic;

    if (familyDiff || topicDiff) {
      console.log(`\n⚠️  ${real.questionId} - Diferencias detectadas:`);
      if (familyDiff) {
        console.log(`   family: "${real.family}" (real) vs "${debug.family}" (simplificado)`);
      }
      if (topicDiff) {
        console.log(`   topic:  "${real.topic}" (real) vs "${debug.topic}" (simplificado)`);
      }
    } else {
      console.log(`\n✅ ${real.questionId} - Misma interpretación`);
    }
  }

  // Verificar problemas específicos
  console.log('\n' + '='.repeat(100));
  console.log('VERIFICACIÓN DE PROBLEMAS ESPECÍFICOS');
  console.log('='.repeat(100));

  const directionResult = debugResults.find(r => r.questionId === 'q_direction');
  const optimismResult = debugResults.find(r => r.questionId === 'q_optimism');

  if (directionResult) {
    console.log('\n📍 q_direction:');
    console.log(`   family: ${directionResult.family} (esperado: direction)`);
    console.log(`   topic: ${directionResult.topic} (esperado: country_direction)`);
    if (directionResult.family !== 'direction' || directionResult.topic !== 'country_direction') {
      console.log('   ❌ PROBLEMA: No detecta correctamente dirección del país');
    } else {
      console.log('   ✅ OK: Detecta correctamente');
    }
  }

  if (optimismResult) {
    console.log('\n📍 q_optimism:');
    console.log(`   family: ${optimismResult.family} (esperado: optimism)`);
    console.log(`   topic: ${optimismResult.topic} (esperado: country_optimism)`);
    if (optimismResult.family !== 'optimism' || optimismResult.topic !== 'country_optimism') {
      console.log('   ❌ PROBLEMA: No detecta correctamente optimismo');
    } else {
      console.log('   ✅ OK: Detecta correctamente');
    }
  }

  console.log('\n' + '='.repeat(100));
  console.log('✅ Análisis completado');
  console.log('='.repeat(100));
}

main();
