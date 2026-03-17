/**
 * Home Page - Página principal de Pulso Social
 */

import { navigateTo } from '../router/index';

/**
 * Create the Home page
 */
export function createHomePage(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page home-page';
  page.innerHTML = `
    <div class="home-hero">
      <div class="hero-content">
        <div class="hero-logo">◉</div>
        <h1 class="hero-title">Pulso Social</h1>
        <p class="hero-subtitle">Simulación territorial y encuestas sintéticas para Chile</p>
        
        <div class="hero-description">
          <p>
            Pulso Social es una plataforma de simulación territorial que permite 
            modelar el comportamiento de poblaciones en entornos urbanos chilenos.
          </p>
          <p>
            Utilizamos agentes sintéticos basados en redes peatonales reales para 
            generar encuestas y análisis de movilidad con alta fidelidad.
          </p>
        </div>

        <button class="hero-cta" id="btn-explore-map">
          <span class="cta-icon material-symbols-outlined">map</span>
          <span class="cta-text">Explorar mapa</span>
        </button>

        <div class="hero-features">
          <div class="feature">
            <span class="feature-icon material-symbols-outlined">groups</span>
            <span class="feature-label">Agentes sintéticos</span>
          </div>
          <div class="feature">
            <span class="feature-icon material-symbols-outlined">poll</span>
            <span class="feature-label">Encuestas generativas</span>
          </div>
          <div class="feature">
            <span class="feature-icon material-symbols-outlined">map</span>
            <span class="feature-label">Mapas 3D</span>
          </div>
          <div class="feature">
            <span class="feature-icon material-symbols-outlined">insights</span>
            <span class="feature-label">Análisis territorial</span>
          </div>
        </div>
      </div>
    </div>

    <div class="home-info">
      <div class="info-section">
        <h2>Zona de Demo</h2>
        <p>El Golf / Tobalaba, Santiago</p>
        <p class="info-note">Demo interactiva con agentes en tiempo real</p>
      </div>
    </div>

    <div class="home-getting-started">
      <div class="getting-started-container">
        <h2 class="getting-started-title">
          <span class="material-symbols-outlined">rocket_launch</span>
          Cómo empezar con Pulsos Sociales
        </h2>
        
        <div class="getting-started-steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h3>Explora el mapa</h3>
              <p>Haz clic en "Explorar mapa" para ver El Golf/Tobalaba. Navega el mapa 3D con zoom y rotación.</p>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h3>Visualiza agentes</h3>
              <p>Ve a "Agentes" para ver la población simulada. Filtra por región, edad, ingreso y más.</p>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h3>Crea encuestas</h3>
              <p>En "Encuestas" diseña tu estudio. Define segmento objetivo y preguntas, luego ejecuta.</p>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">4</div>
            <div class="step-content">
              <h3>Analiza resultados</h3>
              <p>Revisa métricas agregadas en segundos. Exporta datos para análisis externo.</p>
            </div>
          </div>
        </div>

        <div class="getting-started-stats">
          <div class="stat">
            <span class="stat-value">19.5M</span>
            <span class="stat-label">Agentes sintéticos</span>
          </div>
          <div class="stat">
            <span class="stat-value">16</span>
            <span class="stat-label">Regiones de Chile</span>
          </div>
          <div class="stat">
            <span class="stat-value"><5s</span>
            <span class="stat-label">Resultados instantáneos</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add event listener to CTA button
  const ctaButton = page.querySelector('#btn-explore-map');
  ctaButton?.addEventListener('click', () => {
    navigateTo('map');
  });

  return page;
}