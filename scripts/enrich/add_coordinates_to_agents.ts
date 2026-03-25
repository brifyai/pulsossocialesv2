/**
 * Script para agregar coordenadas GPS a los agentes sintéticos
 * 
 * Este script lee el archivo synthetic_agents_v1.json y agrega coordenadas
 * GPS (lat, lng) basadas en el código de comuna de cada agente.
 * 
 * Las coordenadas se obtienen del archivo comuna_coordinates.json y se
 * agrega un pequeño ruido aleatorio para dispersar los agentes dentro
 * de cada comuna.
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
  // Archivo de entrada con agentes
  inputFile: '/Users/camiloalegria/Desktop/AIntelligence/Pulso social/versionconesteroides/data/processed/synthetic_agents_v1.json',
  
  // Archivo con coordenadas de comunas
  coordinatesFile: '/Users/camiloalegria/Desktop/AIntelligence/Pulso social/versionconesteroides/data/comuna_coordinates.json',
  
  // Archivo de salida
  outputFile: '/Users/camiloalegria/Desktop/AIntelligence/Pulso social/versionconesteroides/data/processed/synthetic_agents_v1_with_coords.json',
  
  // Ruido máximo en grados (±0.02 ≈ ±2km)
  maxNoiseDegrees: 0.02
};

// Mapeo de códigos de comuna incorrectos a códigos válidos
// Los agentes tienen códigos como 01001-01009 que no existen
// Se mapean a comunas reales de la Región de Tarapacá
const COMUNA_CODE_MAPPING: Record<string, string> = {
  '01001': '01101', // Iquique
  '01002': '01102', // Alto Hospicio
  '01003': '01107', // Pica
  '01004': '01201', // Pozo Almonte
  '01005': '01202', // María Elena
  '01006': '01203', // Sierra Gorda
  '01007': '01204', // Calama
  '01008': '01401', // Ollagüe
  '01009': '01402'  // San Pedro de Atacama
};

// ============================================================================
// INTERFACES
// ============================================================================

interface ComunaCoordinates {
  code: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
}

interface SyntheticAgent {
  agent_id: string;
  batch_id: string;
  version: string;
  country_code: string;
  region_code: string;
  comuna_code: string;
  province_code: string;
  urbanicity: string;
  sex: string;
  age: number;
  age_group: string;
  household_type: string | null;
  poverty_status: string;
  education_level: string;
  occupation_status: string | null;
  connectivity_level: string;
  digital_exposure_level: string;
  preferred_survey_channel: string;
  created_at: string;
  updated_at: string;
  // Campos opcionales que pueden existir
  location_lat?: number;
  location_lng?: number;
}

interface EnrichedAgent extends SyntheticAgent {
  location_lat: number;
  location_lng: number;
}

interface AgentsFile {
  metadata: {
    version: string;
    batch_id: string;
    total_agents: number;
    generated_at: string;
    schema_version: string;
    fields_with_null: string[];
    [key: string]: any;
  };
  agents: SyntheticAgent[];
}

interface EnrichedAgentsFile {
  metadata: {
    version: string;
    batch_id: string;
    total_agents: number;
    generated_at: string;
    schema_version: string;
    fields_with_null: string[];
    enriched: boolean;
    enriched_at: string;
    enrichment_source: string;
  };
  agents: EnrichedAgent[];
}

// ============================================================================
// CARGADOR DE COORDENADAS
// ============================================================================

class CoordinatesLoader {
  private coordinatesMap: Map<string, ComunaCoordinates> = new Map();

  load(): void {
    console.log('📍 Cargando coordenadas de comunas...');
    
    const data: ComunaCoordinates[] = JSON.parse(
      fs.readFileSync(CONFIG.coordinatesFile, 'utf-8')
    );
    
    data.forEach(comuna => {
      this.coordinatesMap.set(comuna.code, comuna);
    });
    
    console.log(`✅ ${this.coordinatesMap.size} comunas cargadas`);
  }

  getCoordinates(comunaCode: string): ComunaCoordinates | undefined {
    // Primero intentar mapear códigos incorrectos a códigos válidos
    const mappedCode = COMUNA_CODE_MAPPING[comunaCode];
    if (mappedCode) {
      const coord = this.coordinatesMap.get(mappedCode);
      if (coord) return coord;
    }
    
    // Intentar con el código tal cual viene
    let coord = this.coordinatesMap.get(comunaCode);
    if (coord) return coord;
    
    // Si no encuentra, intentar normalizando el código
    // Los códigos pueden venir como '1101' (4 dígitos) o '01101' (5 dígitos)
    if (comunaCode.length === 4) {
      // Convertir '1101' -> '01101'
      const normalizedCode = '0' + comunaCode;
      coord = this.coordinatesMap.get(normalizedCode);
      if (coord) return coord;
    } else if (comunaCode.length === 5) {
      // Convertir '01101' -> '1101'
      const shortCode = comunaCode.substring(1);
      coord = this.coordinatesMap.get(shortCode);
      if (coord) return coord;
    }
    
    return undefined;
  }
}

// ============================================================================
// ENRIQUECEDOR DE AGENTES
// ============================================================================

class AgentEnricher {
  private coordinatesLoader: CoordinatesLoader;
  private stats = {
    totalAgents: 0,
    enrichedAgents: 0,
    missingCoordinates: 0
  };

  constructor(coordinatesLoader: CoordinatesLoader) {
    this.coordinatesLoader = coordinatesLoader;
  }

  enrichAgent(agent: SyntheticAgent): EnrichedAgent {
    this.stats.totalAgents++;
    
    const coordinates = this.coordinatesLoader.getCoordinates(agent.comuna_code);
    
    if (!coordinates) {
      this.stats.missingCoordinates++;
      console.warn(`⚠️  No se encontraron coordenadas para comuna: ${agent.comuna_code}`);
      
      // Usar coordenadas de respaldo (Santiago)
      return {
        ...agent,
        location_lat: -33.4372 + this.generateNoise(),
        location_lng: -70.6506 + this.generateNoise()
      };
    }
    
    this.stats.enrichedAgents++;
    
    return {
      ...agent,
      location_lat: coordinates.lat + this.generateNoise(),
      location_lng: coordinates.lng + this.generateNoise()
    };
  }

  private generateNoise(): number {
    // Generar ruido aleatorio entre -maxNoiseDegrees y +maxNoiseDegrees
    return (Math.random() - 0.5) * 2 * CONFIG.maxNoiseDegrees;
  }

  getStats() {
    return this.stats;
  }
}

// ============================================================================
// PROCESADOR PRINCIPAL
// ============================================================================

class AgentProcessor {
  async process(): Promise<void> {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     AGREGANDO COORDENADAS GPS A AGENTES SINTÉTICOS         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    // Cargar coordenadas
    const coordinatesLoader = new CoordinatesLoader();
    coordinatesLoader.load();

    // Cargar archivo de agentes
    console.log('\n📂 Cargando agentes sintéticos...');
    const fileData: AgentsFile = JSON.parse(
      fs.readFileSync(CONFIG.inputFile, 'utf-8')
    );
    console.log(`✅ ${fileData.agents.length} agentes cargados`);

    // Enriquecer agentes
    console.log('\n🔄 Agregando coordenadas GPS...');
    const enricher = new AgentEnricher(coordinatesLoader);
    const enrichedAgents = fileData.agents.map(agent => enricher.enrichAgent(agent));

    // Preparar archivo de salida
    const outputData: EnrichedAgentsFile = {
      metadata: {
        ...fileData.metadata,
        enriched: true,
        enriched_at: new Date().toISOString(),
        enrichment_source: 'comuna_coordinates.json'
      },
      agents: enrichedAgents
    };

    // Guardar resultado
    console.log('\n💾 Guardando agentes enriquecidos...');
    fs.writeFileSync(
      CONFIG.outputFile,
      JSON.stringify(outputData, null, 2)
    );

    // Mostrar estadísticas
    const stats = enricher.getStats();
    console.log('\n' + '='.repeat(60));
    console.log('📊 ESTADÍSTICAS');
    console.log('='.repeat(60));
    console.log(`Total de agentes: ${stats.totalAgents.toLocaleString()}`);
    console.log(`Agentes enriquecidos: ${stats.enrichedAgents.toLocaleString()} (${((stats.enrichedAgents/stats.totalAgents)*100).toFixed(1)}%)`);
    console.log(`Sin coordenadas: ${stats.missingCoordinates.toLocaleString()} (${((stats.missingCoordinates/stats.totalAgents)*100).toFixed(1)}%)`);
    console.log('');
    console.log(`✅ Archivo guardado en: ${CONFIG.outputFile}`);
    console.log('='.repeat(60));
  }
}

// ============================================================================
// EJECUCIÓN
// ============================================================================

async function main() {
  try {
    const processor = new AgentProcessor();
    await processor.process();
    console.log('\n🎉 Proceso completado exitosamente!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
