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
          <span class="material-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/>
            </svg>
          </span>
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
                <div class="source-icon material-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
                  </svg>
                </div>
                <h3 class="source-name">Censo 2024</h3>
                <p class="source-desc">
                  Instituto Nacional de Estadísticas (INE). Proporciona la estructura demográfica 
                  base: distribución por edad, sexo, nivel educacional y ubicación geográfica.
                </p>
                <span class="source-status">Fuente primaria</span>
              </div>
              
              <div class="source-card">
                <div class="source-icon material-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
                </div>
                <h3 class="source-name">CASEN</h3>
                <p class="source-desc">
                  Encuesta de Caracterización Socioeconómica Nacional. Ministerio de Desarrollo Social. 
                  Aporta variables de ingreso, pobreza, salud, vivienda y redes sociales.
                </p>
                <span class="source-status">Fuente primaria</span>
              </div>
              
              <div class="source-card">
                <div class="source-icon material-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                </div>
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
                <div class="limitation-icon material-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                  </svg>
                </div>
                <h3>No reemplaza encuestas reales</h3>
                <p>
                  Pulso Social es una herramienta de exploración y análisis, no un sustituto 
                  de los estudios de opinión tradicionales. No debe usarse para tomar decisiones 
                  críticas sin validación empírica adicional.
                </p>
              </div>
              
              <div class="limitation-card">
                <div class="limitation-icon material-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zM16 17H8v-2h8v2zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z"/>
                  </svg>
                </div>
                <h3>Agentes sintéticos ≠ Personas reales</h3>
                <p>
                  Los agentes no tienen conciencia, emociones ni experiencias genuinas. 
                  Sus "respuestas" son proyecciones estadísticas, no opiniones auténticas.
                </p>
              </div>
              
              <div class="limitation-card">
                <div class="limitation-icon material-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
                  </svg>
                </div>
                <h3>Datos con fecha de vencimiento</h3>
                <p>
                  Los modelos se basan en datos históricos. Eventos recientes (pandemias, 
                  crisis económicas, cambios políticos) pueden no estar reflejados.
                </p>
              </div>
              
              <div class="limitation-card">
                <div class="limitation-icon material-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.88-11.71L10 14.17l-1.88-1.88a.996.996 0 1 0-1.41 1.41l2.59 2.59c.39.39 1.02.39 1.41 0L17.3 9.7a.996.996 0 0 0 0-1.41c-.39-.39-1.03-.39-1.42 0z"/>
                  </svg>
                </div>
                <h3>Validez contextual</h3>
                <p>
                  Los resultados son más confiables para variables demográficas y socioeconómicas 
                  que para actitudes, preferencias o comportamientos complejos.
                </p>
              </div>
              
              <div class="limitation-card">
                <div class="limitation-icon material-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                </div>
                <h3>Benchmarks parciales</h3>
                <p>
                  Las comparaciones con benchmarks dependen de la disponibilidad de datos 
                  oficiales recientes. No todos los indicadores tienen referencias válidas.
                </p>
              </div>
              
              <div class="limitation-card">
                <div class="limitation-icon material-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.5 3l-6 1.5-5.5-1.5-6 1.5v15l6-1.5 5.5 1.5 6-1.5V3zM12.5 17.5l-5.5-1.5V6l5.5 1.5v10zm6 1.5l-5-1.25V6.75l5 1.25v10.5z"/>
                  </svg>
                </div>
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
