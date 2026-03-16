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
  `;

  // Add event listener to CTA button
  const ctaButton = page.querySelector('#btn-explore-map');
  ctaButton?.addEventListener('click', () => {
    navigateTo('map');
  });

  return page;
}