/**
 * ChileMapPage - Vista territorial de Chile por regiones
 * Mapa analítico más ligero que la escena local inmersiva
 * Sprint 12B - Mejoras de robustez: estados loading/error
 * ACTUALIZADO: Ahora lee regiones desde Supabase con fallback local
 */

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getRegions } from '../services/supabase/repositories/territoryRepository';
import { chileRegionsGeoJSON, getRegionByCode as getLocalRegionByCode } from '../data/chileRegions';

// Map instance
let map: maplibregl.Map | null = null;
let regionsFromDb: Array<{ code: string; name: string; centroid: [number, number] | null }> = [];
let usingDbData = false;

/**
 * Create the Chile territorial map page
 */
export async function createChileMapPage(): Promise<HTMLElement> {
  const page = document.createElement('div');
  page.className = 'page chile-map-page';
  page.id = 'chile-map-page';

  // Create map container
  const mapContainer = document.createElement('div');
  mapContainer.id = 'chile-map-container';
  mapContainer.className = 'chile-map-container';
  page.appendChild(mapContainer);

  // Create info panel
  const infoPanel = document.createElement('div');
  infoPanel.className = 'region-info-panel';
  infoPanel.id = 'region-info-panel';
  page.appendChild(infoPanel);

  // Check API key first
  const apiKey = import.meta.env.VITE_MAPTILER_KEY;
  if (!apiKey) {
    renderErrorState(infoPanel, 'API Key no configurada', 
      'Agrega VITE_MAPTILER_KEY al archivo .env para ver el mapa.');
    return page;
  }

  // Render initial state
  renderInitialState(infoPanel);

  // Load regions from Supabase first
  console.log('[ChileMapPage] Cargando regiones desde Supabase...');
  try {
    regionsFromDb = await getRegions();
    if (regionsFromDb.length > 0) {
      usingDbData = true;
      console.log(`[ChileMapPage] ✅ Regiones cargadas desde DB: ${regionsFromDb.length} regiones`);
    } else {
      console.log('[ChileMapPage] ⚠️ DB devolvió 0 regiones, usando fallback local');
      usingDbData = false;
    }
  } catch (error) {
    console.warn('[ChileMapPage] Error cargando regiones desde DB:', error);
    usingDbData = false;
  }

  // Initialize map after page is added to DOM
  setTimeout(() => {
    initChileMap(mapContainer.id, infoPanel);
  }, 0);

  return page;
}

/**
 * Render initial state in info panel
 */
function renderInitialState(panel: HTMLElement): void {
  panel.innerHTML = `
    <div class="region-info-header">
      <h2 class="region-info-title">Territorio Chile</h2>
      <p class="region-info-subtitle">16 regiones</p>
    </div>
    <div class="region-info-content">
      <div class="map-loading-state">
        <div class="loading-spinner"></div>
        <p>Cargando mapa...</p>
      </div>
    </div>
  `;
}

/**
 * Render error state in info panel
 */
function renderErrorState(panel: HTMLElement, title: string, message: string): void {
  panel.innerHTML = `
    <div class="region-info-header">
      <h2 class="region-info-title">⚠️ ${title}</h2>
    </div>
    <div class="region-info-content">
      <div class="map-error-state">
        <p class="error-message">${message}</p>
        <button class="btn btn-secondary" id="retry-map-btn">Reintentar</button>
      </div>
    </div>
  `;

  // Attach retry listener
  setTimeout(() => {
    const retryBtn = panel.querySelector('#retry-map-btn');
    retryBtn?.addEventListener('click', () => {
      location.reload();
    });
  }, 0);
}

/**
 * Initialize the Chile territorial map
 */
function initChileMap(containerId: string, infoPanel: HTMLElement): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('❌ Chile map container not found');
    renderErrorState(infoPanel, 'Error de carga', 'No se pudo inicializar el contenedor del mapa.');
    return;
  }

  // Get MapTiler API key
  const apiKey = import.meta.env.VITE_MAPTILER_KEY;
  if (!apiKey) {
    console.error('❌ MapTiler API key not found. Add VITE_MAPTILER_KEY to .env');
    renderErrorState(infoPanel, 'API Key no configurada', 
      'Agrega VITE_MAPTILER_KEY al archivo .env para ver el mapa.');
    return;
  }

  // Create map with lighter style for territorial view
  map = new maplibregl.Map({
    container: containerId,
    style: `https://api.maptiler.com/maps/bright-v2/style.json?key=${apiKey}`,
    center: [-70.65, -33.9], // Centered on Santiago
    zoom: 4,
    pitch: 0,
    bearing: 0,
  });

  map.on('load', () => {
    if (!map) return;

    console.log('🗺️ Chile territorial map loaded');
    
    // Update info panel to ready state
    renderReadyState(infoPanel);

    // Add regions source
    map.addSource('chile-regions', {
      type: 'geojson',
      data: chileRegionsGeoJSON as any,
    });

    // Add fill layer for regions
    map.addLayer({
      id: 'region-fills',
      type: 'fill',
      source: 'chile-regions',
      paint: {
        'fill-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          '#4a90d9', // Hover color
          '#2d3748'  // Default fill color
        ],
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          0.7,
          0.4
        ],
      },
    });

    // Add outline layer for regions
    map.addLayer({
      id: 'region-outlines',
      type: 'line',
      source: 'chile-regions',
      paint: {
        'line-color': '#4a5568',
        'line-width': 1,
        'line-opacity': 0.8,
      },
    });

    // Add region labels
    map.addLayer({
      id: 'region-labels',
      type: 'symbol',
      source: 'chile-regions',
      layout: {
        'text-field': ['get', 'code'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#1a202c',
        'text-halo-width': 2,
      },
    });

    // Hover effects
    map.on('mousemove', 'region-fills', (e) => {
      if (!map || !e.features || !e.features[0]) return;

      const featureId = e.features[0].id;
      if (featureId !== undefined) {
        map.setFeatureState(
          { source: 'chile-regions', id: featureId },
          { hover: true }
        );
      }
    });

    map.on('mouseleave', 'region-fills', (e) => {
      if (!map || !e.features || !e.features[0]) return;

      const featureId = e.features[0].id;
      if (featureId !== undefined) {
        map.setFeatureState(
          { source: 'chile-regions', id: featureId },
          { hover: false }
        );
      }
    });

    // Click to select region
    map.on('click', 'region-fills', (e) => {
      if (!map || !e.features || !e.features[0]) return;

      const feature = e.features[0];
      const code = feature.properties?.code;
      
      if (code) {
        console.log(`[ChileMapPage] Click en región: ${code}`, feature.properties);
        selectRegion(code);
      } else {
        console.warn('[ChileMapPage] Feature sin código:', feature);
      }
    });

    // Change cursor on hover
    map.on('mouseenter', 'region-fills', () => {
      if (map) map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'region-fills', () => {
      if (map) map.getCanvas().style.cursor = '';
    });
  });

  // Handle map errors
  map.on('error', (e) => {
    console.error('❌ Map error:', e);
    renderErrorState(infoPanel, 'Error del mapa', 
      'Ocurrió un error al cargar el mapa. Verifica tu conexión a internet.');
  });

  // Add navigation controls
  map.addControl(new maplibregl.NavigationControl(), 'top-right');
}

/**
 * Render ready state in info panel
 */
function renderReadyState(panel: HTMLElement): void {
  panel.innerHTML = `
    <div class="region-info-header">
      <h2 class="region-info-title">Territorio Chile</h2>
      <p class="region-info-subtitle">16 regiones</p>
    </div>
    <div class="region-info-content">
      <p class="region-info-hint">Selecciona una región para ver detalles</p>
    </div>
  `;
}

/**
 * Get region by code - tries DB first, then fallback
 */
async function getRegionByCode(code: string): Promise<{ 
  code: string; 
  name: string; 
  capital?: string;
  population?: number;
  area?: number;
} | null> {
  // First try DB if we have data
  if (usingDbData && regionsFromDb.length > 0) {
    const dbRegion = regionsFromDb.find(r => r.code === code);
    if (dbRegion) {
      console.log(`[ChileMapPage] Región encontrada en DB: ${dbRegion.name}`);
      return {
        code: dbRegion.code,
        name: dbRegion.name,
        // DB doesn't have capital/area/population, use local data for those
        ...getLocalRegionByCode(code)
      };
    }
  }
  
  // Fallback to local data
  const localRegion = getLocalRegionByCode(code);
  if (localRegion) {
    console.log(`[ChileMapPage] Región encontrada en fallback local: ${localRegion.name}`);
    return localRegion;
  }
  
  return null;
}

/**
 * Select a region and show info
 */
async function selectRegion(code: string): Promise<void> {
  const region = await getRegionByCode(code);
  if (!region) return;

  console.log(`📍 Selected region: ${region.name} (fuente: ${usingDbData ? 'DB' : 'local'})`);

  // Update info panel
  const panel = document.getElementById('region-info-panel');
  if (panel) {
    panel.innerHTML = `
      <div class="region-info-header">
        <h2 class="region-info-title">${region.name}</h2>
        <p class="region-info-subtitle">Código: ${region.code}</p>
        ${usingDbData ? '<span class="db-badge">📊 DB</span>' : '<span class="local-badge">💾 Local</span>'}
      </div>
      <div class="region-info-content">
        <div class="region-stat">
          <span class="region-stat-label">Capital</span>
          <span class="region-stat-value">${region.capital || 'N/A'}</span>
        </div>
        <div class="region-stat">
          <span class="region-stat-label">Población</span>
          <span class="region-stat-value">${region.population?.toLocaleString('es-CL') || 'N/A'}</span>
        </div>
        <div class="region-stat">
          <span class="region-stat-label">Área</span>
          <span class="region-stat-value">${region.area?.toLocaleString('es-CL') || 'N/A'} km²</span>
        </div>
        <button class="region-detail-btn" id="view-detail-btn">
          <span class="material-symbols-outlined">arrow_forward</span>
          Ver detalle
        </button>
      </div>
    `;

    // Add click handler for detail button - navigate to region detail page
    const btn = document.getElementById('view-detail-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        console.log(`🔍 Navigate to detail for ${region.name} (${region.code})`);
        // Navigate to region detail page with region code as param
        window.location.hash = `region?code=${region.code}`;
      });
    }
  }

  // Fly to region if map is available
  if (map) {
    // Get region bounds from GeoJSON
    const feature = chileRegionsGeoJSON.features.find(f => f.properties.code === code);
    if (feature && feature.geometry.type === 'Polygon') {
      const coords = feature.geometry.coordinates[0] as unknown as [number, number][];
      const bounds = coords.reduce((b, c) => {
        return b.extend(c);
      }, new maplibregl.LngLatBounds(coords[0], coords[0]));

      map.fitBounds(bounds, { padding: 50, duration: 1000 });
    }
  }
}

/**
 * Cleanup Chile map when leaving the page
 */
export function cleanupChileMap(): void {
  if (map) {
    console.log('🧹 Cleaning up Chile map');
    map.remove();
    map = null;
  }
}
