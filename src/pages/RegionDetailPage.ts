/**
 * RegionDetailPage - Página de detalle de región
 * Placeholder para mostrar información detallada de una región seleccionada
 */

import { getRegionByCode } from '../data/chileRegions';
import { getParams } from '../router/index';

/**
 * Create the region detail page
 */
export function createRegionDetailPage(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page region-detail-page';
  page.id = 'region-detail-page';

  // Get region code from params
  const params = getParams();
  const regionCode = params.code || 'RM';
  const region = getRegionByCode(regionCode);

  page.innerHTML = `
    <div class="region-detail-container">
      <div class="region-detail-header">
        <button class="back-button" id="back-to-territory">
          <span class="material-symbols-outlined">arrow_back</span>
          Volver a Chile
        </button>
      </div>
      
      <div class="region-detail-content">
        <div class="region-detail-hero">
          <h1 class="region-detail-title">${region?.name || 'Región'}</h1>
          <p class="region-detail-code">Código: ${regionCode}</p>
        </div>

        <div class="region-detail-placeholder">
          <div class="placeholder-icon">🚧</div>
          <h2>Detalle regional en construcción</h2>
          <p>Esta vista mostrará información detallada de la región:</p>
          <ul class="region-detail-features">
            <li>📊 Estadísticas demográficas</li>
            <li>🏙️ Comunas y centros urbanos</li>
            <li>📈 Indicadores económicos</li>
            <li>🗺️ Mapa interactivo de la región</li>
            <li><span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle;">assignment</span> Datos de encuestas y censos</li>
          </ul>
          
          ${region ? `
          <div class="region-quick-info">
            <h3>Información básica</h3>
            <div class="region-stat">
              <span class="region-stat-label">Capital</span>
              <span class="region-stat-value">${region.capital}</span>
            </div>
            <div class="region-stat">
              <span class="region-stat-label">Población</span>
              <span class="region-stat-value">${region.population?.toLocaleString('es-CL') || 'N/A'}</span>
            </div>
            <div class="region-stat">
              <span class="region-stat-label">Área</span>
              <span class="region-stat-value">${region.area?.toLocaleString('es-CL') || 'N/A'} km²</span>
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  // Add back button handler
  const backBtn = page.querySelector('#back-to-territory');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.hash = 'territory';
    });
  }

  return page;
}

/**
 * Cleanup region detail page
 */
export function cleanupRegionDetail(): void {
  console.log('🧹 Cleaning up region detail page');
}