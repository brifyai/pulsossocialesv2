/**
 * ChileMapPage - Vista territorial de Chile por regiones
 * Mapa analítico más ligero que la escena local inmersiva
 */

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { chileRegionsGeoJSON, getRegionByCode } from '../data/chileRegions';

// Map instance
let map: maplibregl.Map | null = null;

/**
 * Create the Chile territorial map page
 */
export function createChileMapPage(): HTMLElement {
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
  infoPanel.innerHTML = `
    <div class="region-info-header">
      <h2 class="region-info-title">Territorio Chile</h2>
      <p class="region-info-subtitle">16 regiones</p>
    </div>
    <div class="region-info-content">
      <p class="region-info-hint">Selecciona una región para ver detalles</p>
    </div>
  `;
  page.appendChild(infoPanel);

  // Initialize map after page is added to DOM
  setTimeout(() => {
    initChileMap(mapContainer.id);
  }, 0);

  return page;
}

/**
 * Initialize the Chile territorial map
 */
function initChileMap(containerId: string): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('❌ Chile map container not found');
    return;
  }

  // Get MapTiler API key
  const apiKey = import.meta.env.VITE_MAPTILER_KEY;
  if (!apiKey) {
    console.error('❌ MapTiler API key not found. Add VITE_MAPTILER_KEY to .env');
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

      const props = e.features[0].properties;
      if (props && props.code) {
        selectRegion(props.code);
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

  // Add navigation controls
  map.addControl(new maplibregl.NavigationControl(), 'top-right');
}

/**
 * Select a region and show info
 */
function selectRegion(code: string): void {
  const region = getRegionByCode(code);
  if (!region) return;

  console.log(`📍 Selected region: ${region.name}`);

  // Update info panel
  const panel = document.getElementById('region-info-panel');
  if (panel) {
    panel.innerHTML = `
      <div class="region-info-header">
        <h2 class="region-info-title">${region.name}</h2>
        <p class="region-info-subtitle">Código: ${region.code}</p>
      </div>
      <div class="region-info-content">
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
