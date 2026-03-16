import type { Map } from 'maplibre-gl';

export type MapInstance = Map;

export interface MapConfig {
  container: string;
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  hash: boolean;
  antialias: boolean;
  style: string;
}

export interface CameraOptions {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface FogOptions {
  color: string;
  'high-color': string;
  'horizon-blend': number;
  'space-color'?: string;
  'star-intensity'?: number;
}

export interface BuildingLayerConfig {
  source: string;
  sourceLayer: string;
  color: string;
  opacity: number;
  outlineColor?: string;
}

export interface RoadColorScheme {
  motorway: string;
  trunk: string;
  primary: string;
  secondary: string;
  tertiary: string;
  street: string;
  residential: string;
}

export interface AgentFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    id: string;
    name?: string;
    type?: string;
    status?: string;
    speed?: number;
    heading?: number;
    state?: string;
    color?: string;
    age?: number;
  };
}

export interface AgentGeoJSON {
  type: 'FeatureCollection';
  features: AgentFeature[];
}

// Allow GeoJSON.FeatureCollection to be used as AgentGeoJSON
export type AnyGeoJSON = AgentGeoJSON | GeoJSON.FeatureCollection;
