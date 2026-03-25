import type { MapConfig, CameraOptions, FogOptions, RoadColorScheme } from '../types/map';

// MapTiler API Key from environment
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

if (!MAPTILER_KEY || MAPTILER_KEY === 'your_key_here') {
  console.error('❌ ERROR: VITE_MAPTILER_KEY no está configurada. Por favor crea un archivo .env con tu API key de MapTiler.');
  console.error('   Obtén tu key gratuita en: https://cloud.maptiler.com/account/keys/');
}

// MapTiler style URL - using dark/basic style as base
export const MAPTILER_STYLE_URL = `https://api.maptiler.com/maps/basic-v2/style.json?key=${MAPTILER_KEY}`;

// Alternative styles available:
// - basic-v2 (clean, good for customization)
// - streets-v2 (more detailed)
// - darkmatter (dark theme)
// - positron (light)

// Initial camera position - Chile overview with 3D perspective
// Shows a good portion of Chile while maintaining the 3D effect
export const INITIAL_CAMERA: CameraOptions = {
  center: [-70.5, -33.5], // Center on Santiago area but showing more of Chile
  zoom: 6.5, // Zoomed out to see a large portion of Chile
  pitch: 60, // Angled view for 3D effect (was 75, now 60 for better overview)
  bearing: 0, // North orientation (0 = north)
};

// Map configuration
export const mapConfig: MapConfig = {
  container: 'map',
  style: MAPTILER_STYLE_URL,
  ...INITIAL_CAMERA,
  hash: true,
  antialias: true,
};

// Cyberpunk fog configuration
export const cyberpunkFog: FogOptions = {
  color: '#0a0a1a',           // Deep dark blue
  'high-color': '#1a0a2e',    // Dark purple at horizon
  'horizon-blend': 0.3,       // Medium blend
  'space-color': '#050510',   // Almost black space
  'star-intensity': 0.2,      // Subtle stars
};

// Cyberpunk road color scheme
export const roadColors: RoadColorScheme = {
  motorway: '#ff00ff',    // Magenta strong
  trunk: '#ff00cc',       // Magenta-pink
  primary: '#ff33cc',     // Fuchsia
  secondary: '#cc33ff',   // Violet
  tertiary: '#9933ff',    // Purple
  street: '#6633cc',      // Blue-purple
  residential: '#4d3399', // Dark purple-blue
};

// Building colors - Height-based gradient
export const buildingColors = {
  // Low buildings (0-20m): Almost black blue
  low: '#0a0f1a',
  // Medium buildings (20-50m): Blue petroleum
  medium: '#0d1b2a',
  // High buildings (50-100m): Teal visible
  high: '#1a3a4a',
  // Skyscrapers (100m+): Bright cyan soft
  skyscraper: '#2a5a6a',
  // Highlight colors for emphasis
  fillHighlight: '#1b263b',
  // Outlines
  outline: '#00ffff',
  outlineStrong: '#44ffff',
  outlineOpacity: 0.7,
  fillOpacity: 0.95,
  // Height multiplier for visual exaggeration
  heightMultiplier: 1.6,
};

// Building height thresholds (meters)
export const buildingHeightThresholds = {
  low: 20,
  medium: 50,
  high: 100,
};

// Label colors
export const labelColors = {
  text: '#ff66cc',        // Pink
  textSecondary: '#cc99ff', // Light purple
  halo: '#0a0a1a',        // Dark halo
  icon: '#ff33cc',        // Magenta icons
};

// Background and land colors
export const backgroundColors = {
  background: '#050510',      // Almost black
  water: '#0a1628',           // Deep navy
  park: '#0d1f0d',            // Dark green
  land: '#0a0a15',            // Very dark
  landuse: '#0f0f1a',         // Dark blue-gray
};

// Agent layer configuration
export const agentConfig = {
  sourceId: 'agents-source',
  layerId: 'agents-layer',
  color: '#00ffff',           // Cyan bright
  radius: 6,
  strokeColor: '#ffffff',
  strokeWidth: 2,
  opacity: 0.9,
};
