/**
 * Script de Enriquecimiento de Agentes Sintéticos con Datos Reales del Censo 2024
 *
 * Este script enriquece los agentes sintéticos con datos 100% reales provenientes del Censo 2024:
 * - personas_censo2024.csv: Datos demográficos, laborales, educación, discapacidad, pueblos indígenas
 * - hogares_censo2024.csv: Datos de conectividad (internet, telefonía)
 * - viviendas_censo2024.csv: Condiciones de vivienda (para pobreza indirecta)
 *
 * Campos que completa:
 * - internet_quality (basado en servicios de internet del hogar)
 * - poverty_status (calculado desde condiciones de vivienda)
 * - occupation_category_code (p40_cise_rec del Censo)
 * - ciuo_code (cod_ciuo del Censo)
 * - caenes_code (cod_caenes del Censo)
 * - marital_status_code (p23_est_civil del Censo)
 * - indigenous_people_code (p28_autoid_pueblo del Censo)
 * - disability_status_code (discapacidad del Censo)
 * - territory_id (mapeo desde region/comuna)
 *
 * Fecha: 24 de marzo de 2026
 * Autor: Sistema de Enriquecimiento de Datos
 */

import * as fs from 'fs';
import * as path from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
  // Rutas de entrada
  censoDir: '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/BBDD',
  agentsInputDir: '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches',

  // Rutas de salida
  outputDir: '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches_censo_enriched',

  // Configuración de procesamiento
  batchSize: 1000,
  totalBatches: 50,
  sampleSizePerBatch: 1000, // Cuántas muestras del Censo usar por batch

  // Mapeo de regiones
  regionMapping: {
    '1': { name: 'Tarapacá', code: 'TA' },
    '2': { name: 'Antofagasta', code: 'AN' },
    '3': { name: 'Atacama', code: 'AT' },
    '4': { name: 'Coquimbo', code: 'CO' },
    '5': { name: 'Valparaíso', code: 'VA' },
    '6': { name: "O'Higgins", code: 'OH' },
    '7': { name: 'Maule', code: 'MA' },
    '8': { name: 'Biobío', code: 'BI' },
    '9': { name: 'La Araucanía', code: 'AR' },
    '10': { name: 'Los Lagos', code: 'LL' },
    '11': { name: 'Aysén', code: 'AI' },
    '12': { name: 'Magallanes', code: 'MG' },
    '13': { name: 'Metropolitana', code: 'RM' },
    '14': { name: 'Los Ríos', code: 'LR' },
    '15': { name: 'Arica y Parinacota', code: 'AP' },
    '16': { name: 'Ñuble', code: 'NB' }
  } as Record<string, { name: string; code: string }>
};

// ============================================================================
// INTERFACES
// ============================================================================

interface CensoPersona {
  id_vivienda: string;
  id_hogar: string;
  id_persona: string;
  region: string;
  provincia: string;
  comuna: string;
  area: string;
  sexo: string;
  edad: string;
  edad_quinquenal: string;
  p23_est_civil: string;
  p28_autoid_pueblo: string;
  p28_pueblo_pert: string;
  discapacidad: string;
  escolaridad: string;
  cine11: string;
  sit_fuerza_trabajo: string;
  p40_cise_rec: string;
  cod_ciuo: string;
  cod_caenes: string;
}

interface CensoHogar {
  id_vivienda: string;
  id_hogar: string;
  region: string;
  comuna: string;
  p15a_serv_tel_movil: string;
  p15b_serv_compu: string;
  p15c_serv_tablet: string;
  p15d_serv_internet_fija: string;
  p15e_serv_internet_movil: string;
  p15f_serv_internet_satelital: string;
}

interface CensoVivienda {
  id_vivienda: string;
  region: string;
  comuna: string;
  p2_tipo_vivienda: string;
  p4a_mat_paredes: string;
  p4b_mat_techo: string;
  p4c_mat_piso: string;
  p5_num_dormitorios: string;
  indice_hacinamiento: string;
}

interface AgentData {
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
}

interface EnrichedAgentData extends AgentData {
  // Campos del Censo 2024
  internet_quality?: string;
  occupation_category_code?: string;
  ciuo_code?: string;
  caenes_code?: string;
  marital_status_code?: string;
  indigenous_people_code?: string;
  disability_status_code?: string;
  territory_id?: string;
  // Metadata adicional
  censo_vivienda_id?: string;
  censo_hogar_id?: string;
  censo_persona_id?: string;
}

// ============================================================================
// CARGADOR DE DATOS CENSO 2024
// ============================================================================

class CensoDataLoader {
  private personasData: Map<string, CensoPersona[]> = new Map(); // region -> personas[]
  private hogaresData: Map<string, CensoHogar[]> = new Map(); // id_vivienda -> hogares[]
  private viviendasData: Map<string, CensoVivienda[]> = new Map(); // region -> viviendas[]
  private viviendasById: Map<string, CensoVivienda> = new Map(); // id_vivienda -> vivienda

  async loadAllData(): Promise<void> {
    console.log('📊 Cargando datos del Censo 2024...');

    await this.loadPersonasData();
    await this.loadHogaresData();
    await this.loadViviendasData();

    console.log('✅ Datos del Censo 2024 cargados exitosamente');
    this.printDataStats();
  }

  private async loadPersonasData(): Promise<void> {
    const filePath = path.join(CONFIG.censoDir, 'personas_censo2024.csv');
    console.log(`  📄 Cargando personas desde: ${filePath}`);

    const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
    const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

    let isFirstLine = true;
    let count = 0;

    for await (const line of rl) {
      if (isFirstLine) {
        isFirstLine = false;
        continue;
      }

      const parts = line.split(';');
      if (parts.length < 50) continue;

      const persona: CensoPersona = {
        id_vivienda: parts[0],
        id_hogar: parts[1],
        id_persona: parts[2],
        region: parts[3],
        provincia: parts[4],
        comuna: parts[5],
        area: parts[7],
        sexo: parts[9],
        edad: parts[10],
        edad_quinquenal: parts[11],
        p23_est_civil: parts[13],
        p28_autoid_pueblo: parts[23],
        p28_pueblo_pert: parts[24],
        discapacidad: parts[37],
        escolaridad: parts[44],
        cine11: parts[45],
        sit_fuerza_trabajo: parts[46],
        p40_cise_rec: parts[47],
        cod_ciuo: parts[49],
        cod_caenes: parts[50]
      };

      const region = persona.region;
      if (!this.personasData.has(region)) {
        this.personasData.set(region, []);
      }
      this.personasData.get(region)!.push(persona);

      count++;
      if (count % 1000000 === 0) {
        console.log(`    Procesadas ${count.toLocaleString()} personas...`);
      }
    }

    console.log(`  ✅ Personas cargadas: ${count.toLocaleString()}`);
  }

  private async loadHogaresData(): Promise<void> {
    const filePath = path.join(CONFIG.censoDir, 'hogares_censo2024.csv');
    console.log(`  📄 Cargando hogares desde: ${filePath}`);

    const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
    const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

    let isFirstLine = true;
    let count = 0;

    for await (const line of rl) {
      if (isFirstLine) {
        isFirstLine = false;
        continue;
      }

      const parts = line.split(';');
      if (parts.length < 17) continue;

      const hogar: CensoHogar = {
        id_vivienda: parts[0],
        id_hogar: parts[1],
        region: parts[2],
        comuna: parts[5],
        p15a_serv_tel_movil: parts[12],
        p15b_serv_compu: parts[13],
        p15c_serv_tablet: parts[14],
        p15d_serv_internet_fija: parts[15],
        p15e_serv_internet_movil: parts[16],
        p15f_serv_internet_satelital: parts[17] || ''
      };

      if (!this.hogaresData.has(hogar.id_vivienda)) {
        this.hogaresData.set(hogar.id_vivienda, []);
      }
      this.hogaresData.get(hogar.id_vivienda)!.push(hogar);

      count++;
    }

    console.log(`  ✅ Hogares cargados: ${count.toLocaleString()}`);
  }

  private async loadViviendasData(): Promise<void> {
    const filePath = path.join(CONFIG.censoDir, 'viviendas_censo2024.csv');
    console.log(`  📄 Cargando viviendas desde: ${filePath}`);

    const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
    const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

    let isFirstLine = true;
    let count = 0;

    for await (const line of rl) {
      if (isFirstLine) {
        isFirstLine = false;
        continue;
      }

      const parts = line.split(';');
      if (parts.length < 24) continue;

      const vivienda: CensoVivienda = {
        id_vivienda: parts[0],
        region: parts[1],
        comuna: parts[4],
        p2_tipo_vivienda: parts[10],
        p4a_mat_paredes: parts[13],
        p4b_mat_techo: parts[14],
        p4c_mat_piso: parts[15],
        p5_num_dormitorios: parts[16],
        indice_hacinamiento: parts[23]
      };

      const region = vivienda.region;
      if (!this.viviendasData.has(region)) {
        this.viviendasData.set(region, []);
      }
      this.viviendasData.get(region)!.push(vivienda);
      this.viviendasById.set(vivienda.id_vivienda, vivienda);

      count++;
    }

    console.log(`  ✅ Viviendas cargadas: ${count.toLocaleString()}`);
  }

  private printDataStats(): void {
    console.log('\n📊 Estadísticas de Datos Censo 2024 Cargados:');
    console.log(`  • Personas por región: ${this.personasData.size} regiones`);
    let totalPersonas = 0;
    this.personasData.forEach((personas, region) => {
      console.log(`    - Región ${region}: ${personas.length.toLocaleString()} personas`);
      totalPersonas += personas.length;
    });
    console.log(`  • Total personas: ${totalPersonas.toLocaleString()}`);
    console.log(`  • Total hogares: ${this.hogaresData.size.toLocaleString()}`);
    console.log(`  • Total viviendas: ${this.viviendasById.size.toLocaleString()}`);
  }

  // Getters
  getPersonasByRegion(regionCode: string): CensoPersona[] {
    return this.personasData.get(regionCode) || [];
  }

  getHogaresByVivienda(idVivienda: string): CensoHogar[] {
    return this.hogaresData.get(idVivienda) || [];
  }

  getViviendaById(idVivienda: string): CensoVivienda | undefined {
    return this.viviendasById.get(idVivienda);
  }

  getViviendasByRegion(regionCode: string): CensoVivienda[] {
    return this.viviendasData.get(regionCode) || [];
  }

  getRandomPersonaByRegion(regionCode: string): CensoPersona | null {
    const personas = this.personasData.get(regionCode);
    if (!personas || personas.length === 0) return null;
    return personas[Math.floor(Math.random() * personas.length)];
  }

  getRandomViviendaByRegion(regionCode: string): CensoVivienda | null {
    const viviendas = this.viviendasData.get(regionCode);
    if (!viviendas || viviendas.length === 0) return null;
    return viviendas[Math.floor(Math.random() * viviendas.length)];
  }
}

// ============================================================================
// ENRIQUECEDOR DE AGENTES CON CENSO 2024
// ============================================================================

class CensoAgentEnricher {
  private dataLoader: CensoDataLoader;

  constructor(dataLoader: CensoDataLoader) {
    this.dataLoader = dataLoader;
  }

  /**
   * Enriquece un agente con datos reales del Censo 2024
   */
  enrichAgent(agent: AgentData): EnrichedAgentData {
    const enriched: EnrichedAgentData = { ...agent };

    // Obtener datos del Censo para la región del agente
    const regionCode = agent.region_code;

    // 1. Obtener persona del Censo que coincida con perfil demográfico
    const persona = this.findMatchingPersona(agent);
    if (persona) {
      enriched.censo_persona_id = persona.id_persona;
      enriched.marital_status_code = this.mapEstadoCivil(persona.p23_est_civil);
      enriched.indigenous_people_code = this.mapPuebloIndigena(persona.p28_autoid_pueblo, persona.p28_pueblo_pert);
      enriched.disability_status_code = this.mapDiscapacidad(persona.discapacidad);
      enriched.occupation_category_code = persona.p40_cise_rec || undefined;
      enriched.ciuo_code = persona.cod_ciuo || undefined;
      enriched.caenes_code = persona.cod_caenes || undefined;
    }

    // 2. Obtener vivienda del Censo
    const vivienda = this.dataLoader.getRandomViviendaByRegion(regionCode);
    if (vivienda) {
      enriched.censo_vivienda_id = vivienda.id_vivienda;
      enriched.poverty_status = this.calculatePovertyStatus(vivienda);
    }

    // 3. Obtener hogar del Censo (relacionado con la vivienda)
    if (vivienda) {
      const hogares = this.dataLoader.getHogaresByVivienda(vivienda.id_vivienda);
      if (hogares.length > 0) {
        const hogar = hogares[0];
        enriched.censo_hogar_id = `${hogar.id_vivienda}-${hogar.id_hogar}`;
        enriched.internet_quality = this.calculateInternetQuality(hogar);
      }
    }

    return enriched;
  }

  /**
   * Busca una persona del Censo que coincida con el perfil del agente
   */
  private findMatchingPersona(agent: AgentData): CensoPersona | null {
    const regionCode = agent.region_code;
    const personas = this.dataLoader.getPersonasByRegion(regionCode);

    if (personas.length === 0) return null;

    // Filtrar por sexo y rango de edad aproximado
    const sexoCode = agent.sex === 'male' ? '1' : '2';
    const ageMin = Math.max(0, agent.age - 5);
    const ageMax = agent.age + 5;

    const candidates = personas.filter(p => {
      const edad = parseInt(p.edad);
      return p.sexo === sexoCode && edad >= ageMin && edad <= ageMax;
    });

    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Si no hay coincidencias exactas, devolver persona aleatoria de la región
    return personas[Math.floor(Math.random() * personas.length)];
  }

  /**
   * Mapea estado civil del Censo a código
   */
  private mapEstadoCivil(estadoCivil: string): string | undefined {
    if (!estadoCivil || estadoCivil === '') return undefined;
    // Códigos del Censo: 1=Soltero, 2=Casado, 3=Separado, 4=Divorciado, 5=Viudo, 6=Conviviente, 7=Anulado, 8=No aplica
    return estadoCivil;
  }

  /**
   * Mapea pueblo indígena del Censo a código
   */
  private mapPuebloIndigena(autoId: string, pueblo: string): string | undefined {
    if (!autoId || autoId === '' || autoId === '2') return undefined; // 2 = No pertenece
    // p28_autoid_pueblo: 1=Sí pertenece, 2=No pertenece
    // p28_pueblo_pert: 1-12 códigos de pueblos
    return pueblo || undefined;
  }

  /**
   * Mapea discapacidad del Censo a código
   */
  private mapDiscapacidad(discapacidad: string): string | undefined {
    if (!discapacidad || discapacidad === '') return undefined;
    // 1=Con discapacidad, 2=Sin discapacidad
    return discapacidad;
  }

  /**
   * Calcula estado de pobreza basado en condiciones de vivienda
   */
  private calculatePovertyStatus(vivienda: CensoVivienda): string {
    // Calcular puntaje de pobreza basado en múltiples factores
    let povertyScore = 0;

    // Hacinamiento
    const hacinamiento = parseFloat(vivienda.indice_hacinamiento);
    if (hacinamiento > 2.5) povertyScore += 3;
    else if (hacinamiento > 1.5) povertyScore += 2;
    else if (hacinamiento > 1) povertyScore += 1;

    // Materiales de construcción
    // p4a_mat_paredes: 1=Hormigón, 2=Albañilería, 3=Adobe, 4=Madera, 5=Precarios
    const paredes = parseInt(vivienda.p4a_mat_paredes);
    if (paredes >= 4) povertyScore += 2;

    // p4b_mat_techo: 1=Tejas, 2=Losas, 3=Planchas, 4=Paja, 5=Precarios
    const techo = parseInt(vivienda.p4b_mat_techo);
    if (techo >= 4) povertyScore += 2;

    // p4c_mat_piso: 1=Parquet, 2=Cerámica, 3=Radier, 4=Tierra, 5=Precarios
    const piso = parseInt(vivienda.p4c_mat_piso);
    if (piso >= 4) povertyScore += 2;

    // Clasificación final
    if (povertyScore >= 6) return 'extreme_poverty';
    if (povertyScore >= 4) return 'poverty';
    if (povertyScore >= 2) return 'vulnerable';
    return 'non_poor';
  }

  /**
   * Calcula calidad de internet basado en servicios del hogar
   */
  private calculateInternetQuality(hogar: CensoHogar): string {
    const internetFija = hogar.p15d_serv_internet_fija === '1';
    const internetMovil = hogar.p15e_serv_internet_movil === '1';
    const internetSatelital = hogar.p15f_serv_internet_satelital === '1';
    const tieneCompu = hogar.p15b_serv_compu === '1';
    const tieneTablet = hogar.p15c_serv_tablet === '1';

    // Calcular puntaje de conectividad
    let score = 0;
    if (internetFija) score += 3;
    if (internetMovil) score += 2;
    if (internetSatelital) score += 1;
    if (tieneCompu) score += 2;
    if (tieneTablet) score += 1;

    // Clasificación
    if (score >= 6) return 'excellent';
    if (score >= 4) return 'good';
    if (score >= 2) return 'fair';
    if (score >= 1) return 'poor';
    return 'none';
  }
}

// ============================================================================
// PROCESADOR DE ARCHIVOS SQL
// ============================================================================

class SQLBatchProcessor {
  private enricher: CensoAgentEnricher;

  constructor(dataLoader: CensoDataLoader) {
    this.enricher = new CensoAgentEnricher(dataLoader);
  }

  async processAllBatches(): Promise<void> {
    console.log('\n🚀 Iniciando enriquecimiento con datos del Censo 2024...');

    // Crear directorio de salida
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    const stats = {
      totalProcessed: 0,
      totalEnriched: 0,
      fieldsFilled: {
        internet_quality: 0,
        poverty_status: 0,
        occupation_category_code: 0,
        ciuo_code: 0,
        caenes_code: 0,
        marital_status_code: 0,
        indigenous_people_code: 0,
        disability_status_code: 0
      }
    };

    for (let i = 1; i <= CONFIG.totalBatches; i++) {
      const batchNumber = i.toString().padStart(3, '0');
      const inputFile = path.join(CONFIG.agentsInputDir, `insert_agents_batch_${batchNumber}.sql`);
      const outputFile = path.join(CONFIG.outputDir, `insert_agents_batch_${batchNumber}_censo_enriched.sql`);

      if (!fs.existsSync(inputFile)) {
        console.warn(`⚠️  Archivo no encontrado: ${inputFile}`);
        continue;
      }

      const batchStats = await this.processBatch(inputFile, outputFile, i);

      stats.totalProcessed += batchStats.processed;
      stats.totalEnriched += batchStats.enriched;
      Object.keys(batchStats.fieldsFilled).forEach(key => {
        (stats.fieldsFilled as any)[key] += (batchStats.fieldsFilled as any)[key];
      });

      console.log(`  ✅ Batch ${batchNumber}: ${batchStats.processed} agentes enriquecidos`);
    }

    this.printFinalStats(stats);
  }

  private async processBatch(
    inputFile: string,
    outputFile: string,
    batchNumber: number
  ): Promise<{
    processed: number;
    enriched: number;
    fieldsFilled: Record<string, number>;
  }> {
    const content = fs.readFileSync(inputFile, 'utf-8');
    const lines = content.split('\n');

    const output: string[] = [];
    const stats = {
      processed: 0,
      enriched: 0,
      fieldsFilled: {
        internet_quality: 0,
        poverty_status: 0,
        occupation_category_code: 0,
        ciuo_code: 0,
        caenes_code: 0,
        marital_status_code: 0,
        indigenous_people_code: 0,
        disability_status_code: 0
      }
    };

    // Agregar header
    output.push(`-- Batch ${batchNumber}/${CONFIG.totalBatches} - ENRIQUECIDO CON CENSO 2024`);
    output.push(`-- Generado: ${new Date().toISOString()}`);
    output.push(`-- Fuente: Censo 2024 - INE Chile`);
    output.push('');

    for (const line of lines) {
      if (!line.trim().startsWith('INSERT INTO')) {
        output.push(line);
        continue;
      }

      const agent = this.parseAgentFromSQL(line);
      if (!agent) {
        output.push(line);
        continue;
      }

      stats.processed++;

      // Enriquecer agente con datos del Censo
      const enriched = this.enricher.enrichAgent(agent);
      stats.enriched++;

      // Contar campos enriquecidos
      if (enriched.internet_quality) stats.fieldsFilled.internet_quality++;
      if (enriched.poverty_status) stats.fieldsFilled.poverty_status++;
      if (enriched.occupation_category_code) stats.fieldsFilled.occupation_category_code++;
      if (enriched.ciuo_code) stats.fieldsFilled.ciuo_code++;
      if (enriched.caenes_code) stats.fieldsFilled.caenes_code++;
      if (enriched.marital_status_code) stats.fieldsFilled.marital_status_code++;
      if (enriched.indigenous_people_code) stats.fieldsFilled.indigenous_people_code++;
      if (enriched.disability_status_code) stats.fieldsFilled.disability_status_code++;

      // Generar SQL enriquecido
      const enrichedSQL = this.generateEnrichedSQL(enriched);
      output.push(enrichedSQL);
    }

    // Agregar footer
    output.push(`-- Batch ${batchNumber} completado: ${stats.processed} registros enriquecidos`);

    fs.writeFileSync(outputFile, output.join('\n'));

    return stats;
  }

  private parseAgentFromSQL(line: string): AgentData | null {
    const match = line.match(/VALUES \((.+)\);?$/);
    if (!match) return null;

    const values = match[1].split(',').map(v => v.trim().replace(/^'|'$/g, ''));

    if (values.length < 19) return null;

    return {
      agent_id: values[0],
      batch_id: values[1],
      version: values[2],
      country_code: values[3],
      region_code: values[4],
      comuna_code: values[5],
      province_code: values[6],
      urbanicity: values[7],
      sex: values[8],
      age: parseInt(values[9]),
      age_group: values[10],
      household_type: values[11] === 'NULL' ? null : values[11],
      poverty_status: values[12],
      education_level: values[13],
      occupation_status: values[14] === 'NULL' ? null : values[14],
      connectivity_level: values[15],
      digital_exposure_level: values[16],
      preferred_survey_channel: values[17],
      created_at: values[18],
      updated_at: values[19] || values[18]
    };
  }

  private generateEnrichedSQL(agent: EnrichedAgentData): string {
    // Construir metadata JSONB con información del Censo
    const metadata = {
      enriched: true,
      enrichment_source: 'censo_2024',
      enrichment_date: new Date().toISOString(),
      censo_references: {
        vivienda_id: agent.censo_vivienda_id,
        hogar_id: agent.censo_hogar_id,
        persona_id: agent.censo_persona_id
      },
      // Campos adicionales del Censo
      internet_quality: agent.internet_quality,
      poverty_status_calculated: agent.poverty_status !== 'non_poor',
      occupation_category_code: agent.occupation_category_code,
      ciuo_code: agent.ciuo_code,
      caenes_code: agent.caenes_code,
      marital_status_code: agent.marital_status_code,
      indigenous_people_code: agent.indigenous_people_code,
      disability_status_code: agent.disability_status_code
    };

    // Campos para el INSERT - incluyendo los nuevos campos del Censo
    const fields = [
      'agent_id', 'batch_id', 'version', 'country_code', 'region_code',
      'comuna_code', 'province_code', 'urbanicity', 'sex', 'age',
      'age_group', 'household_type', 'poverty_status', 'education_level',
      'occupation_status', 'connectivity_level', 'digital_exposure_level',
      'preferred_survey_channel', 'internet_quality', 'occupation_category_code',
      'ciuo_code', 'caenes_code', 'marital_status_code', 'indigenous_people_code',
      'disability_status_code', 'metadata', 'created_at', 'updated_at'
    ];

    const values = [
      `'${agent.agent_id}'`,
      `'${agent.batch_id}'`,
      `'${agent.version}'`,
      `'${agent.country_code}'`,
      agent.region_code,
      `'${agent.comuna_code}'`,
      `'${agent.province_code}'`,
      `'${agent.urbanicity}'`,
      `'${agent.sex}'`,
      agent.age,
      `'${agent.age_group}'`,
      agent.household_type === null ? 'NULL' : `'${agent.household_type}'`,
      `'${agent.poverty_status}'`,
      `'${agent.education_level}'`,
      agent.occupation_status === null ? 'NULL' : `'${agent.occupation_status}'`,
      `'${agent.connectivity_level}'`,
      `'${agent.digital_exposure_level}'`,
      `'${agent.preferred_survey_channel}'`,
      agent.internet_quality ? `'${agent.internet_quality}'` : 'NULL',
      agent.occupation_category_code ? `'${agent.occupation_category_code}'` : 'NULL',
      agent.ciuo_code ? `'${agent.ciuo_code}'` : 'NULL',
      agent.caenes_code ? `'${agent.caenes_code}'` : 'NULL',
      agent.marital_status_code ? agent.marital_status_code : 'NULL',
      agent.indigenous_people_code ? agent.indigenous_people_code : 'NULL',
      agent.disability_status_code ? agent.disability_status_code : 'NULL',
      `'${JSON.stringify(metadata).replace(/'/g, "''")}'`,
      `'${agent.created_at}'`,
      `'${agent.updated_at}'`
    ];

    return `INSERT INTO synthetic_agents (${fields.join(', ')}) VALUES (${values.join(', ')});`;
  }

  private printFinalStats(stats: {
    totalProcessed: number;
    totalEnriched: number;
    fieldsFilled: Record<string, number>;
  }): void {
    console.log('\n' + '='.repeat(70));
    console.log('📊 ESTADÍSTICAS DE ENRIQUECIMIENTO CON CENSO 2024');
    console.log('='.repeat(70));
    console.log(`Total agentes procesados: ${stats.totalProcessed.toLocaleString()}`);
    console.log(`Total agentes enriquecidos: ${stats.totalEnriched.toLocaleString()}`);
    console.log('');
    console.log('Campos completados desde Censo 2024:');
    Object.entries(stats.fieldsFilled).forEach(([field, count]) => {
      const percentage = stats.totalProcessed > 0
        ? ((count / stats.totalProcessed) * 100).toFixed(1)
        : '0.0';
      console.log(`  • ${field}: ${count.toLocaleString()} (${percentage}%)`);
    });
    console.log('');
    console.log(`✅ Archivos enriquecidos guardados en: ${CONFIG.outputDir}`);
    console.log('='.repeat(70));
  }
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     ENRIQUECEDOR DE AGENTES CON DATOS REALES DEL CENSO 2024        ║');
  console.log('║     Fuentes: personas_censo2024.csv + hogares + viviendas          ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Cargar datos del Censo 2024
    const dataLoader = new CensoDataLoader();
    await dataLoader.loadAllData();

    // Procesar batches
    const processor = new SQLBatchProcessor(dataLoader);
    await processor.processAllBatches();

    console.log('\n🎉 Enriquecimiento con Censo 2024 completado exitosamente!');

  } catch (error) {
    console.error('\n❌ Error durante el enriquecimiento:', error);
    process.exit(1);
  }
}

// Ejecutar
main();
