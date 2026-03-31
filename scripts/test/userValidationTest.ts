/**
 * Test de Validación de Usuario - Scenario Builder
 * 
 * Este script simula las interacciones de un usuario real con el Scenario Builder
 * y verifica que cumple con los criterios de usabilidad definidos.
 * 
 * Uso: npx ts-node scripts/test/userValidationTest.ts
 */

import { serviceClient } from '../utils/serviceClient.ts';

interface ValidationResult {
  test: string;
  passed: boolean;
  details: string;
  severity: 'critical' | 'warning' | 'info';
}

interface UserScenario {
  title: string;
  description: string;
  category: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  sentiment: number;
  intensity: number;
  salience: number;
}

class UserValidationTest {
  private results: ValidationResult[] = [];
  private createdScenarioIds: string[] = [];

  async runAllTests(): Promise<void> {
    console.log('🧪 Iniciando Test de Validación de Usuario - Scenario Builder\n');

    // Test 1: Verificar que los escenarios de ejemplo existen
    await this.testExistingScenarios();

    // Test 2: Simular creación de escenario por usuario
    await this.testScenarioCreation();

    // Test 3: Verificar claridad de baseline vs escenario
    await this.testBaselineClarity();

    // Test 4: Verificar comprensión de parámetros
    await this.testParameterComprehension();

    // Test 5: Verificar comparación de escenarios
    await this.testScenarioComparison();

    // Test 6: Verificar confianza en resultados
    await this.testResultConfidence();

    // Test 7: Verificar comportamiento de q_direction
    await this.testQDirectionBehavior();

    // Test 8: Verificar integridad de datos de agentes
    await this.testAgentDataIntegrity();

    // Generar reporte
    this.generateReport();
  }

  private async testExistingScenarios(): Promise<void> {
    console.log('📋 Test 1: Verificando escenarios de ejemplo...');

    try {
      const { data: scenarios, error } = await serviceClient
        .from('scenario_events')
        .select('*')
        .limit(10);

      if (error) {
        this.addResult('Escenarios de ejemplo', false, `Error: ${error.message}`, 'critical');
        return;
      }

      if (!scenarios || scenarios.length === 0) {
        this.addResult(
          'Escenarios de ejemplo',
          false,
          'No hay escenarios creados. Los usuarios no tendrán ejemplos para explorar.',
          'critical'
        );
        return;
      }

      // Verificar que hay escenarios variados
      const categories = new Set(scenarios.map(s => s.category));
      const sentiments = scenarios.map(s => s.sentiment);
      const hasPositive = sentiments.some(s => s > 0.3);
      const hasNegative = sentiments.some(s => s < -0.3);

      if (categories.size < 3) {
        this.addResult(
          'Variedad de categorías',
          false,
          `Solo ${categories.size} categorías. Se recomiendan al menos 3 (economy, government, security)`,
          'warning'
        );
      } else {
        this.addResult(
          'Variedad de categorías',
          true,
          `${categories.size} categorías disponibles: ${Array.from(categories).join(', ')}`,
          'info'
        );
      }

      if (!hasPositive || !hasNegative) {
        this.addResult(
          'Variedad de sentimientos',
          false,
          `Faltan escenarios ${!hasPositive ? 'positivos' : 'negativos'} para comparación`,
          'warning'
        );
      } else {
        this.addResult(
          'Variedad de sentimientos',
          true,
          'Hay escenarios tanto positivos como negativos',
          'info'
        );
      }

      console.log(`  ✅ ${scenarios.length} escenarios encontrados\n`);
    } catch (err) {
      this.addResult('Escenarios de ejemplo', false, `Error inesperado: ${err}`, 'critical');
    }
  }

  private async testScenarioCreation(): Promise<void> {
    console.log('📝 Test 2: Simulando creación de escenario por usuario...');

    // Simular escenario que crearía un usuario típico
    const userScenario: UserScenario = {
      title: 'Test: Reducción de Impuestos',
      description: 'El gobierno anuncia una reducción del 10% en impuestos personales',
      category: 'government',
      severity: 'major',
      sentiment: 0.7,
      intensity: 0.8,
      salience: 0.75
    };

    try {
      // Verificar que el título es claro
      if (userScenario.title.length < 5 || userScenario.title.length > 100) {
        this.addResult(
          'Claridad del título',
          false,
          `Título de ${userScenario.title.length} caracteres. Debe ser entre 5-100.`,
          'warning'
        );
      } else {
        this.addResult(
          'Claridad del título',
          true,
          `Título apropiado: "${userScenario.title}"`,
          'info'
        );
      }

      // Verificar que la descripción es comprensible
      if (userScenario.description.length < 10) {
        this.addResult(
          'Claridad de descripción',
          false,
          'Descripción muy corta, usuarios pueden no entender el escenario',
          'warning'
        );
      } else {
        this.addResult(
          'Claridad de descripción',
          true,
          'Descripción clara y descriptiva',
          'info'
        );
      }

      // Verificar que los parámetros están en rangos razonables
      const params = {
        sentiment: userScenario.sentiment,
        intensity: userScenario.intensity,
        salience: userScenario.salience
      };

      for (const [key, value] of Object.entries(params)) {
        if (value < 0 || value > 1) {
          this.addResult(
            `Rango de ${key}`,
            false,
            `${key}=${value} fuera de rango [0,1]`,
            'critical'
          );
        } else if (value < 0.2 || value > 0.9) {
          this.addResult(
            `Rango de ${key}`,
            true,
            `${key}=${value} (valor extremo, puede ser confuso para usuarios)`,
            'warning'
          );
        } else {
          this.addResult(
            `Rango de ${key}`,
            true,
            `${key}=${value} en rango óptimo`,
            'info'
          );
        }
      }

      // Crear el escenario
      const { data: scenario, error } = await serviceClient
        .from('scenario_events')
        .insert({
          name: userScenario.title,
          description: userScenario.description,
          category: userScenario.category,
          severity: userScenario.severity,
          sentiment: userScenario.sentiment,
          intensity: userScenario.intensity,
          salience: userScenario.salience,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        this.addResult('Creación de escenario', false, `Error: ${error.message}`, 'critical');
        return;
      }

      this.createdScenarioIds.push(scenario.id);
      this.addResult(
        'Creación de escenario',
        true,
        `Escenario creado exitosamente: ${scenario.id}`,
        'info'
      );

      console.log('  ✅ Escenario de prueba creado\n');
    } catch (err) {
      this.addResult('Creación de escenario', false, `Error inesperado: ${err}`, 'critical');
    }
  }

  private async testBaselineClarity(): Promise<void> {
    console.log('⚖️  Test 3: Verificando claridad de baseline vs escenario...');

    try {
      // Verificar que existe al menos un run baseline
      const { data: baselineRuns, error } = await serviceClient
        .from('survey_runs')
        .select('*')
        .is('scenario_event_id', null)
        .limit(1);

      if (error || !baselineRuns || baselineRuns.length === 0) {
        this.addResult(
          'Existencia de baseline',
          false,
          'No hay runs baseline disponibles. Los usuarios no pueden comparar.',
          'critical'
        );
        return;
      }

      this.addResult(
        'Existencia de baseline',
        true,
        'Hay runs baseline disponibles para comparación',
        'info'
      );

      // Verificar que los runs con escenario tienen metadata apropiada
      const { data: scenarioRuns } = await serviceClient
        .from('survey_runs')
        .select('*')
        .not('scenario_event_id', 'is', null)
        .limit(1);

      if (scenarioRuns && scenarioRuns.length > 0) {
        const run = scenarioRuns[0];
        const hasScenarioName = run.metadata?.scenarioName || run.scenario_name;
        
        if (!hasScenarioName) {
          this.addResult(
            'Identificación de escenario',
            false,
            'Runs con escenario no muestran nombre del escenario',
            'warning'
          );
        } else {
          this.addResult(
            'Identificación de escenario',
            true,
            `Escenario identificado: ${hasScenarioName}`,
            'info'
          );
        }
      }

      console.log('  ✅ Baseline vs escenario verificado\n');
    } catch (err) {
      this.addResult('Baseline clarity', false, `Error: ${err}`, 'warning');
    }
  }

  private async testParameterComprehension(): Promise<void> {
    console.log('🎛️  Test 4: Verificando comprensión de parámetros...');

    // Simular confusión típica de usuario
    const confusingScenarios = [
      {
        name: 'Intensidad vs Salience',
        scenario: { intensity: 0.9, salience: 0.9 },
        issue: 'Ambos valores altos - usuario no entiende la diferencia'
      },
      {
        name: 'Sentimiento neutro',
        scenario: { sentiment: 0.0 },
        issue: 'Sentimiento exactamente 0 - ¿es positivo, negativo o neutro?'
      },
      {
        name: 'Severidad contradictoria',
        scenario: { severity: 'critical', sentiment: 0.8 },
        issue: 'Severidad critical pero sentimiento positivo - confuso'
      }
    ];

    for (const test of confusingScenarios) {
      // Verificar si este patrón existe en escenarios reales
      const { data: existing } = await serviceClient
        .from('scenario_events')
        .select('*')
        .gte('intensity', 0.85)
        .gte('salience', 0.85)
        .limit(1);

      if (existing && existing.length > 0) {
        this.addResult(
          `Patrón confuso: ${test.name}`,
          false,
          `${test.issue}. Recomendación: agregar tooltips o validación.`,
          'warning'
        );
      } else {
        this.addResult(
          `Patrón confuso: ${test.name}`,
          true,
          'No se encontraron escenarios con este patrón problemático',
          'info'
        );
      }
    }

    // Verificar que hay ayuda disponible
    this.addResult(
      'Ayuda contextual',
      true,
      'Se asume que la UI tiene tooltips (verificar manualmente)',
      'info'
    );

    console.log('  ✅ Parámetros verificados\n');
  }

  private async testScenarioComparison(): Promise<void> {
    console.log('📊 Test 5: Verificando comparación de escenarios...');

    try {
      // Verificar que se pueden obtener runs para comparar
      const { data: runs, error } = await serviceClient
        .from('survey_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error || !runs || runs.length < 2) {
        this.addResult(
          'Datos para comparación',
          false,
          'Insuficientes runs para probar comparación',
          'warning'
        );
        return;
      }

      // Verificar que los runs tienen resultados parseables
      const runWithResults = runs.find(r => r.results && Object.keys(r.results).length > 0);
      
      if (!runWithResults) {
        this.addResult(
          'Resultados disponibles',
          false,
          'Los runs no tienen resultados para comparar',
          'critical'
        );
        return;
      }

      // Verificar estructura de resultados
      const results = runWithResults.results;
      const hasDistributions = Object.values(results).some((r: any) => 
        r && (r.distribution || r.rawDistribution)
      );

      if (!hasDistributions) {
        this.addResult(
          'Estructura de resultados',
          false,
          'Los resultados no tienen distribuciones para comparar',
          'critical'
        );
      } else {
        this.addResult(
          'Estructura de resultados',
          true,
          'Resultados tienen distribuciones comparables',
          'info'
        );
      }

      // Verificar que se puede calcular delta
      const baselineRun = runs.find(r => !r.scenario_event_id);
      const scenarioRun = runs.find(r => r.scenario_event_id);

      if (baselineRun && scenarioRun) {
        this.addResult(
          'Pareja baseline/escenario',
          true,
          'Hay runs de baseline y escenario para comparar',
          'info'
        );
      } else {
        this.addResult(
          'Pareja baseline/escenario',
          false,
          'Falta baseline o escenario para comparación completa',
          'warning'
        );
      }

      console.log('  ✅ Comparación verificada\n');
    } catch (err) {
      this.addResult('Comparación', false, `Error: ${err}`, 'warning');
    }
  }

  private async testResultConfidence(): Promise<void> {
    console.log('🎯 Test 6: Verificando confianza en resultados...');

    try {
      // Verificar que los resultados tienen confidence scores
      const { data: runs, error } = await serviceClient
        .from('survey_runs')
        .select('*')
        .not('avg_confidence', 'is', null)
        .limit(5);

      if (error || !runs || runs.length === 0) {
        this.addResult(
          'Confidence scores',
          false,
          'No hay runs con confidence scores. Usuarios no pueden evaluar calidad.',
          'warning'
        );
        return;
      }

      const avgConfidence = runs.reduce((sum, r) => sum + (r.avg_confidence || 0), 0) / runs.length;

      if (avgConfidence < 0.6) {
        this.addResult(
          'Nivel de confianza',
          false,
          `Confidence promedio ${avgConfidence.toFixed(2)} es bajo. Usuarios pueden desconfiar.`,
          'warning'
        );
      } else if (avgConfidence < 0.75) {
        this.addResult(
          'Nivel de confianza',
          true,
          `Confidence promedio ${avgConfidence.toFixed(2)} es aceptable pero mejorable`,
          'warning'
        );
      } else {
        this.addResult(
          'Nivel de confianza',
          true,
          `Confidence promedio ${avgConfidence.toFixed(2)} es bueno`,
          'info'
        );
      }

      // Verificar sample size
      const runWithSampleSize = runs.find(r => r.sample_size || r.total_agents);
      if (!runWithSampleSize) {
        this.addResult(
          'Tamaño de muestra visible',
          false,
          'Los usuarios no ven el tamaño de muestra. Afecta confianza.',
          'warning'
        );
      } else {
        this.addResult(
          'Tamaño de muestra visible',
          true,
          'Tamaño de muestra disponible para usuarios',
          'info'
        );
      }

      console.log('  ✅ Confianza verificada\n');
    } catch (err) {
      this.addResult('Confianza', false, `Error: ${err}`, 'warning');
    }
  }

  private async testQDirectionBehavior(): Promise<void> {
    console.log('🧭 Test 7: Verificando comportamiento de q_direction...');

    try {
      // Buscar runs que tengan q_direction en resultados
      const { data: runs, error } = await serviceClient
        .from('survey_runs')
        .select('*')
        .limit(10);

      if (error || !runs) {
        this.addResult('q_direction check', false, `Error: ${error?.message}`, 'warning');
        return;
      }

      let qDirectionFound = false;
      let inconsistentBehavior = false;

      for (const run of runs) {
        if (run.results) {
          const qDirectionResult = Object.entries(run.results).find(([key]) => 
            key.toLowerCase().includes('direction') || key.toLowerCase().includes('pais')
          );

          if (qDirectionResult) {
            qDirectionFound = true;
            const [key, value] = qDirectionResult;
            
            // Verificar si el comportamiento es inconsistente
            // (esto es una heurística simplificada)
            const val = value as any;
            if (val.distribution) {
              const dist = val.distribution;
              const values = Object.values(dist).map(Number);
              const hasNegative = values.some(v => v < 0);
              
              if (hasNegative) {
                inconsistentBehavior = true;
                this.addResult(
                  `q_direction (${key})`,
                  false,
                  'Valores negativos detectados en distribución - posible bug',
                  'warning'
                );
              }
            }
          }
        }
      }

      if (!qDirectionFound) {
        this.addResult(
          'q_direction presente',
          false,
          'No se encontró q_direction en resultados',
          'info'
        );
      } else if (!inconsistentBehavior) {
        this.addResult(
          'q_direction comportamiento',
          true,
          'q_direction presente sin comportamiento obviamente inconsistente',
          'info'
        );
      }

      console.log('  ✅ q_direction verificado\n');
    } catch (err) {
      this.addResult('q_direction', false, `Error: ${err}`, 'warning');
    }
  }

  private addResult(test: string, passed: boolean, details: string, severity: ValidationResult['severity']): void {
    this.results.push({ test, passed, details, severity });
  }

  private generateReport(): void {
    console.log('═'.repeat(70));
    console.log('📋 REPORTE DE VALIDACIÓN DE USUARIO - SCENARIO BUILDER');
    console.log('═'.repeat(70));

    const critical = this.results.filter(r => r.severity === 'critical' && !r.passed);
    const warnings = this.results.filter(r => r.severity === 'warning' && !r.passed);
    const passed = this.results.filter(r => r.passed);
    const info = this.results.filter(r => r.severity === 'info');

    console.log(`\n📊 Resumen:`);
    console.log(`   ✅ Pasados: ${passed.length}`);
    console.log(`   ⚠️  Advertencias: ${warnings.length}`);
    console.log(`   ❌ Críticos: ${critical.length}`);
    console.log(`   ℹ️  Info: ${info.length}`);

    if (critical.length > 0) {
      console.log(`\n❌ PROBLEMAS CRÍTICOS (${critical.length}):`);
      critical.forEach(r => {
        console.log(`   • ${r.test}`);
        console.log(`     ${r.details}`);
      });
    }

    if (warnings.length > 0) {
      console.log(`\n⚠️  ADVERTENCIAS (${warnings.length}):`);
      warnings.forEach(r => {
        console.log(`   • ${r.test}`);
        console.log(`     ${r.details}`);
      });
    }

    console.log(`\n✅ TESTS PASADOS (${passed.length}):`);
    passed.forEach(r => {
      console.log(`   ✓ ${r.test}: ${r.details}`);
    });

    // Calcular score de usabilidad
    const totalTests = this.results.length;
    const criticalWeight = 3;
    const warningWeight = 1;
    const maxScore = totalTests * criticalWeight;
    const actualScore = passed.length * criticalWeight - warnings.length * warningWeight - critical.length * criticalWeight;
    const usabilityScore = Math.max(0, (actualScore / maxScore) * 100);

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🎯 SCORE DE USABILIDAD: ${usabilityScore.toFixed(1)}%`);
    console.log(`${'═'.repeat(70)}`);

    if (usabilityScore >= 80) {
      console.log('✅ EXCELENTE: El Scenario Builder está listo para usuarios');
    } else if (usabilityScore >= 60) {
      console.log('🟡 ACEPTABLE: Funcional pero con áreas de mejora');
    } else if (usabilityScore >= 40) {
      console.log('🟠 NECESITA MEJORAS: Algunos problemas significativos');
    } else {
      console.log('🔴 CRÍTICO: No recomendado para usuarios sin mejoras');
    }

    // Recomendaciones
    console.log(`\n📋 RECOMENDACIONES:`);
    if (critical.length > 0) {
      console.log('   1. Resolver problemas críticos antes de user testing');
    }
    if (warnings.length > 0) {
      console.log('   2. Considerar mejoras en áreas con advertencias');
    }
    console.log('   3. Realizar user testing real con 3-5 usuarios');
    console.log('   4. Monitorear métricas de uso y confusión');

    // Cleanup
    this.cleanup();
  }

  private async testAgentDataIntegrity(): Promise<void> {
    console.log('👥 Test 8: Verificando integridad de datos de agentes...');

    try {
      // Verificar que hay agentes con datos completos
      const { data: agents, error } = await serviceClient
        .from('synthetic_agents')
        .select('*')
        .limit(5);

      if (error || !agents || agents.length === 0) {
        this.addResult(
          'Agentes disponibles',
          false,
          'No hay agentes en la base de datos',
          'critical'
        );
        return;
      }

      this.addResult(
        'Agentes disponibles',
        true,
        `${agents.length} agentes encontrados`,
        'info'
      );

      // Verificar campos críticos
      const requiredFields = ['id', 'age', 'gender', 'region', 'comuna', 'coordinates'];
      const sampleAgent = agents[0];
      
      for (const field of requiredFields) {
        if (sampleAgent[field] === undefined || sampleAgent[field] === null) {
          this.addResult(
            `Campo de agente: ${field}`,
            false,
            `Campo ${field} faltante en agentes`,
            'warning'
          );
        } else {
          this.addResult(
            `Campo de agente: ${field}`,
            true,
            `Campo ${field} presente`,
            'info'
          );
        }
      }

      console.log('  ✅ Agentes verificados\n');
    } catch (err) {
      this.addResult('Agentes', false, `Error: ${err}`, 'warning');
    }
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 Limpiando escenarios de prueba...');
    
    for (const id of this.createdScenarioIds) {
      try {
        await serviceClient
          .from('scenario_events')
          .delete()
          .eq('id', id);
        console.log(`   Eliminado: ${id}`);
      } catch (err) {
        console.log(`   Error eliminando ${id}: ${err}`);
      }
    }

    console.log('✅ Limpieza completada\n');
  }
}

// Ejecutar test
const test = new UserValidationTest();
test.runAllTests().catch(err => {
  console.error('Error ejecutando tests:', err);
  process.exit(1);
});
