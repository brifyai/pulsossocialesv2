/**
 * Methodology Page - Sprint 7B
 * 
 * Página de metodología transparente y profesional que explica
 * cómo funciona Pulso Social, sus fuentes de datos, limitaciones
 * y cómo interpretar los resultados.
 */

// ===========================================
// Page Creation
// ===========================================

export function createMethodologyPage(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page methodology-page';
  page.id = 'methodology-page';
  
  page.innerHTML = `
    <div class="methodology-container">
      <header class="methodology-header">
        <h1 class="methodology-title">
          <span class="icon">📖</span>
          Metodología
        </h1>
        <p class="methodology-subtitle">
          Cómo funciona Pulso Social y cómo interpretar sus resultados
        </p>
      </header>

      <div class="methodology-content">
        <!-- Introducción -->
        <section class="methodology-section">
          <h2 class="section-title">¿Qué es Pulso Social?</h2>
          <div class="section-content">
            <p>
              <strong>Pulso Social</strong> es una plataforma de simulación analítica que utiliza 
              <em>agentes sintéticos</em> para modelar comportamientos, preferencias y respuestas 
              de poblaciones específicas en territorios definidos.
            </p>
            <p>
              A diferencia de las encuestas tradicionales que recolectan datos de personas reales, 
              Pulso Social genera una <strong>población sintética</strong> basada en datos censales 
              y estadísticos oficiales, luego simula cómo estos agentes virtuales responderían 
              ante diversas preguntas y escenarios.
            </p>
            <div class="highlight-box">
              <strong>Propósito:</strong> Explorar hipótesis, identificar tendencias y generar 
              insights exploratorios que complementen —no reemplacen— los estudios tradicionales.
            </div>
          </div>
        </section>

        <!-- Agentes Sintéticos -->
        <section class="methodology-section">
          <h2 class="section-title">¿Qué es un Agente Sintético?</h2>
          <div class="section-content">
            <p>
              Un <strong>agente sintético</strong> es una entidad computacional que representa a una 
              persona virtual con características demográficas, socioeconómicas y comportamentales 
              definidas estadísticamente.
            </p>
            <p>
              Cada agente tiene atributos como:
            </p>
            <ul class="feature-list">
              <li><strong>Demografía:</strong> edad, sexo, nivel educacional</li>
              <li><strong>Ubicación:</strong> región, comuna, tipo de zona (urbano/rural)</li>
              <li><strong>Socioeconomía:</strong> quintil de ingreso, ocupación</li>
              <li><strong>Conectividad:</strong> acceso a internet, dispositivos</li>
              <li><strong>Preferencias:</strong> modeladas según perfiles estadísticos</li>
            </ul>
            <div class="warning-box">
              <strong>Importante:</strong> Los agentes sintéticos <em>no son personas reales</em>. 
              Son construcciones estadísticas que representan patrones poblacionales, no individuos 
              específicos ni sus opiniones personales.
            </div>
          </div>
        </section>

        <!-- Fuentes de Datos -->
        <section class="methodology-section">
          <h2 class="section-title">Fuentes de Datos</h2>
          <div class="section-content">
            <p>
              Pulso Social utiliza datos oficiales y abiertos para construir sus modelos. 
              Las principales fuentes incluyen:
            </p>
            
            <div class="source-cards">
              <div class="source-card">
                <div class="source-icon">🏛️</div>
                <h3 class="source-name">Censo 2024</h3>
                <p class="source-desc">
                  Instituto Nacional de Estadísticas (INE). Proporciona la estructura demográfica 
                  base: distribución por edad, sexo, nivel educacional y ubicación geográfica.
                </p>
                <span class="source-status">Fuente primaria</span>
              </div>
              
              <div class="source-card">
                <div class="source-icon">📊</div>
                <h3 class="source-name">CASEN</h3>
                <p class="source-desc">
                  Encuesta de Caracterización Socioeconómica Nacional. Ministerio de Desarrollo Social. 
                  Aporta variables de ingreso, pobreza, salud, vivienda y redes sociales.
                </p>
                <span class="source-status">Fuente primaria</span>
              </div>
              
              <div class="source-card">
                <div class="source-icon">📡</div>
                <h3 class="source-name">SUBTEL</h3>
                <p class="source-desc">
                  Subsecretaría de Telecomunicaciones. Datos de acceso a internet, 
                  cobertura móvil, velocidades de conexión y brechas digitales.
                </p>
                <span class="source-status">Fuente primaria</span>
              </div>
            </div>
            
            <div class="info-box">
              <strong>Nota metodológica:</strong> Los datos se procesan y normalizan para 
              garantizar consistencia entre fuentes. Las proyecciones se actualizan periódicamente 
              según disponibilidad de nuevos datos oficiales.
            </div>
          </div>
        </section>

        <!-- Población Sintética -->
        <section class="methodology-section">
          <h2 class="section-title">Construcción de la Población Sintética</h2>
          <div class="section-content">
            <p>
              El proceso de generación de población sintética sigue estos pasos:
            </p>
            
            <ol class="process-list">
              <li>
                <strong>Integración de fuentes:</strong> Se combinan datos del Censo, CASEN y SUBTEL 
                para crear un perfil demográfico-socioeconómico completo por territorio.
              </li>
              <li>
                <strong>Síntesis de agentes:</strong> Se generan agentes individuales cuyos atributos 
                respetan las distribuciones marginales y correlaciones observadas en los datos reales.
              </li>
              <li>
                <strong>Validación:</strong> La población sintética se compara contra estadísticas 
                oficiales para verificar que reproduce correctamente los patrones conocidos.
              </li>
              <li>
                <strong>Asignación territorial:</strong> Los agentes se distribuyen espacialmente 
                según densidades poblacionales y características zonales.
              </li>
            </ol>
            
            <div class="highlight-box">
              <strong>Resultado:</strong> Una población virtual que "se parece" estadísticamente 
              a la población real del territorio modelado, pero compuesta por individuos sintéticos.
            </div>
          </div>
        </section>

        <!-- Simulación Territorial -->
        <section class="methodology-section">
          <h2 class="section-title">Simulación Territorial</h2>
          <div class="section-content">
            <p>
              Pulso Social modela el comportamiento espacial de los agentes mediante:
            </p>
            
            <ul class="feature-list">
              <li>
                <strong>Redes de movilidad:</strong> Rutas peatonales, redes viales y 
                patrones de desplazamiento basados en datos de transporte.
              </li>
              <li>
                <strong>Zonas de influencia:</strong> Áreas donde los agentes interactúan, 
                trabajan, estudian o realizan actividades cotidianas.
              </li>
              <li>
                <strong>Contexto ambiental:</strong> Edificios, espacios públicos, 
                infraestructura digital y otros elementos del entorno urbano.
              </li>
            </ul>
            
            <p>
              La simulación permite observar cómo se distribuyen los agentes en el espacio 
              y cómo sus características varían geográficamente.
            </p>
          </div>
        </section>

        <!-- Encuestas Sintéticas -->
        <section class="methodology-section">
          <h2 class="section-title">Encuestas Sintéticas</h2>
          <div class="section-content">
            <p>
              Las <strong>encuestas sintéticas</strong> simulan respuestas a cuestionarios 
              aplicados a la población virtual. El proceso funciona así:
            </p>
            
            <ol class="process-list">
              <li>
                <strong>Diseño del cuestionario:</strong> Se definen preguntas con opciones 
                de respuesta, similar a una encuesta tradicional.
              </li>
              <li>
                <strong>Motor de respuesta:</strong> Cada agente sintético "responde" basándose 
                en sus atributos demográficos y en modelos probabilísticos derivados de datos reales.
              </li>
              <li>
                <strong>Agregación:</strong> Se calculan estadísticas descriptivas (frecuencias, 
                promedios, distribuciones) sobre el conjunto de respuestas.
              </li>
              <li>
                <strong>Visualización:</strong> Los resultados se presentan en tablas, gráficos 
                y mapas de calor territoriales.
              </li>
            </ol>
            
            <div class="warning-box">
              <strong>Limitación clave:</strong> Las respuestas sintéticas son inferencias 
              estadísticas, no opiniones reales. Reflejan <em>probabilidades condicionadas</em> 
              por atributos demográficos, no preferencias auténticas de personas.
            </div>
          </div>
        </section>

        <!-- Benchmarks -->
        <section class="methodology-section">
          <h2 class="section-title">Benchmarks de Referencia</h2>
          <div class="section-content">
            <p>
              Los <strong>benchmarks</strong> permiten comparar los resultados sintéticos contra 
              datos de referencia de encuestas reales (CASEN, SUBTEL, CEP, etc.).
            </p>
            
            <p>
              Esta comparación ayuda a:
            </p>
            <ul class="feature-list">
              <li>Validar la calidad de las simulaciones</li>
              <li>Identificar desviaciones significativas</li>
              <li>Calibrar modelos de respuesta</li>
              <li>Comunicar limitaciones metodológicas</li>
            </ul>
            
            <div class="info-box">
              <strong>Interpretación:</strong> Un resultado sintético "cercano" al benchmark 
              sugiere que el modelo captura bien el fenómeno. Una desviación grande indica 
              que el modelo puede estar omitiendo variables importantes o que el fenómeno 
              ha cambiado desde la recolección de datos originales.
            </div>
          </div>
        </section>

        <!-- Limitaciones -->
        <section class="methodology-section limitations">
          <h2 class="section-title">Limitaciones y Advertencias</h2>
          <div class="section-content">
            <div class="limitation-cards">
              <div class="limitation-card">
                <div class="limitation-icon">⚠️</div>
                <h3>No reemplaza encuestas reales</h3>
                <p>
                  Pulso Social es una herramienta de exploración y análisis, no un sustituto 
                  de los estudios de opinión tradicionales. No debe usarse para tomar decisiones 
                  críticas sin validación empírica adicional.
                </p>
              </div>
              
              <div class="limitation-card">
                <div class="limitation-icon">🤖</div>
                <h3>Agentes sintéticos ≠ Personas reales</h3>
                <p>
                  Los agentes no tienen conciencia, emociones ni experiencias genuinas. 
                  Sus "respuestas" son proyecciones estadísticas, no opiniones auténticas.
                </p>
              </div>
              
              <div class="limitation-card">
                <div class="limitation-icon">📅</div>
                <h3>Datos con fecha de vencimiento</h3>
                <p>
                  Los modelos se basan en datos históricos. Eventos recientes (pandemias, 
                  crisis económicas, cambios políticos) pueden no estar reflejados.
                </p>
              </div>
              
              <div class="limitation-card">
                <div class="limitation-icon">🎯</div>
                <h3>Validez contextual</h3>
                <p>
                  Los resultados son más confiables para variables demográficas y socioeconómicas 
                  que para actitudes, preferencias o comportamientos complejos.
                </p>
              </div>
              
              <div class="limitation-card">
                <div class="limitation-icon">🔍</div>
                <h3>Benchmarks parciales</h3>
                <p>
                  Las comparaciones con benchmarks dependen de la disponibilidad de datos 
                  oficiales recientes. No todos los indicadores tienen referencias válidas.
                </p>
              </div>
              
              <div class="limitation-card">
                <div class="limitation-icon">🗺️</div>
                <h3>Cobertura geográfica limitada</h3>
                <p>
                  La granularidad territorial depende de la disponibilidad de datos censales. 
                  Algunas zonas pueden tener estimaciones menos precisas.
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- Cómo Interpretar -->
        <section class="methodology-section">
          <h2 class="section-title">Cómo Interpretar los Resultados</h2>
          <div class="section-content">
            <div class="interpretation-guide">
              <div class="interpretation-do">
                <h3>✅ Interpretar como</h3>
                <ul>
                  <li>Hipótesis exploratorias para investigación</li>
                  <li>Tendencias generales y patrones poblacionales</li>
                  <li>Complemento de otras fuentes de datos</li>
                  <li>Base para diseñar estudios empíricos</li>
                  <li>Escenarios "qué pasaría si"</li>
                </ul>
              </div>
              
              <div class="interpretation-dont">
                <h3>❌ No interpretar como</h3>
                <ul>
                  <li>Verdad absoluta o datos definitivos</li>
                  <li>Opiniones reales de personas específicas</li>
                  <li>Base única para decisiones críticas</li>
                  <li>Predicciones exactas de comportamiento</li>
                  <li>Reemplazo de consulta ciudadana real</li>
                </ul>
              </div>
            </div>
            
            <div class="highlight-box">
              <strong>Recomendación:</strong> Use Pulso Social como punto de partida para 
              generar preguntas de investigación, identificar áreas de interés y orientar 
              el diseño de estudios empíricos más profundos.
            </div>
          </div>
        </section>

        <!-- Contacto -->
        <section class="methodology-section">
          <h2 class="section-title">Transparencia y Contacto</h2>
          <div class="section-content">
            <p>
              En Pulso Social creemos en la investigación abierta y transparente. 
              Si tienes preguntas sobre la metodología, quieres reportar un problema 
              o estás interesado en colaborar:
            </p>
            
            <div class="contact-box">
              <p>
                <strong>Documentación técnica:</strong> Disponible en repositorio GitHub<br>
                <strong>Reportes de issues:</strong> Sistema de tickets del proyecto<br>
                <strong>Colaboraciones:</strong> Equipo de investigación y desarrollo
              </p>
            </div>
            
            <div class="version-info">
              <p>
                <strong>Versión actual:</strong> v0.9.0 | 
                <strong>Última actualización:</strong> Marzo 2026 |
                <strong>Estado:</strong> En desarrollo activo
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;

  return page;
}

// ===========================================
// Cleanup
// ===========================================

export function cleanupMethodologyPage(): void {
  // No hay recursos que limpiar en esta página estática
  console.log('🧹 Methodology page cleaned up');
}
