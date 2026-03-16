/**
 * Variable Maps Configuration
 * 
 * Mapeos de variables entre las diferentes fuentes de datos.
 * Define la convención de nombres unificada para el pipeline.
 */

// Variables del Censo 2024
export const CENSO_VARIABLE_MAP = {
  // Demografía
  poblacion_total: 'total_population',
  poblacion_hombres: 'male_population',
  poblacion_mujeres: 'female_population',
  edad_0_14: 'age_0_14',
  edad_15_64: 'age_15_64',
  edad_65_mas: 'age_65_plus',
  
  // Vivienda
  viviendas_totales: 'total_dwellings',
  viviendas_ocupadas: 'occupied_dwellings',
  viviendas_particulares: 'private_dwellings',
  viviendas_colectivas: 'collective_dwellings',
  
  // Hogares
  hogares_totales: 'total_households',
  hogares_unipersonales: 'single_person_households',
  
  // Educación
  poblacion_educacion_basica: 'basic_education_population',
  poblacion_educacion_media: 'middle_education_population',
  poblacion_educacion_superior: 'higher_education_population',
  poblacion_sin_educacion: 'no_education_population',
  
  // Trabajo
  poblacion_economicamente_activa: 'economically_active_population',
  poblacion_ocupados: 'employed_population',
  poblacion_desocupados: 'unemployed_population',
  poblacion_inactiva: 'inactive_population',
  
  // Territorio
  region: 'region_code',
  provincia: 'province_code',
  comuna: 'commune_code',
} as const;

// Variables de CASEN
export const CASEN_VARIABLE_MAP = {
  // Identificación
  id_hogar: 'household_id',
  id_persona: 'person_id',
  region: 'region_code',
  comuna: 'commune_code',
  
  // Ingresos
  ingreso_monetario_hogar: 'household_monetary_income',
  ingreso_autonomo_hogar: 'household_autonomous_income',
  ingreso_per_capita: 'per_capita_income',
  quintil_ingreso: 'income_quintile',
  
  // Características del hogar
  tipo_vivienda: 'dwelling_type',
  material_paredes: 'wall_material',
  material_techo: 'roof_material',
  material_piso: 'floor_material',
  numero_personas_hogar: 'household_size',
  numero_dormitorios: 'bedrooms',
  
  // Características de la persona
  sexo: 'sex',
  edad: 'age',
  estado_civil: 'marital_status',
  nivel_educacional: 'education_level',
  ocupacion: 'occupation',
  categoria_empleo: 'employment_category',
  rama_actividad: 'economic_activity',
  
  // Pobreza
  pobreza: 'poverty_status',
  pobreza_extrema: 'extreme_poverty',
  situacion_vulnerabilidad: 'vulnerability_status',
} as const;

// Variables de SUBTEL
export const SUBTEL_VARIABLE_MAP = {
  // Identificación territorial
  region: 'region_code',
  comuna: 'commune_code',
  
  // Conectividad fija
  conexiones_fijas_internet: 'fixed_internet_connections',
  conexiones_fijas_banda_ancha: 'broadband_connections',
  velocidad_promedio: 'average_speed_mbps',
  
  // Conectividad móvil
  conexiones_moviles: 'mobile_connections',
  conexiones_4g: '4g_connections',
  conexiones_5g: '5g_connections',
  
  // Cobertura
  cobertura_4g_poblacion: '4g_population_coverage',
  cobertura_5g_poblacion: '5g_population_coverage',
  
  // Penetración
  penetracion_internet_hogares: 'internet_household_penetration',
  penetracion_movil: 'mobile_penetration',
  
  // Operadores
  operadores_activos: 'active_operators',
  mercado_compartido: 'shared_market',
} as const;

// Variables unificadas del pipeline
export const UNIFIED_VARIABLE_NAMES = {
  // Territorio
  territory_code: 'Código territorial',
  territory_name: 'Nombre del territorio',
  territory_level: 'Nivel territorial',
  
  // Población
  total_population: 'Población total',
  male_population: 'Población masculina',
  female_population: 'Población femenina',
  population_density: 'Densidad de población',
  
  // Edad
  age_0_14: 'Población 0-14 años',
  age_15_64: 'Población 15-64 años',
  age_65_plus: 'Población 65+ años',
  median_age: 'Edad mediana',
  
  // Vivienda
  total_dwellings: 'Total de viviendas',
  occupied_dwellings: 'Viviendas ocupadas',
  dwelling_density: 'Densidad de viviendas',
  
  // Ingresos
  per_capita_income: 'Ingreso per cápita',
  income_quintile: 'Quintil de ingreso',
  gini_coefficient: 'Coeficiente de Gini',
  
  // Educación
  higher_education_rate: 'Tasa educación superior',
  education_years_avg: 'Años promedio de educación',
  
  // Empleo
  employment_rate: 'Tasa de empleo',
  unemployment_rate: 'Tasa de desempleo',
  labor_participation_rate: 'Tasa de participación laboral',
  
  // Conectividad
  internet_penetration: 'Penetración de internet',
  broadband_penetration: 'Penetración banda ancha',
  mobile_penetration: 'Penetración móvil',
  5g_coverage: 'Cobertura 5G',
  
  // Pobreza
  poverty_rate: 'Tasa de pobreza',
  extreme_poverty_rate: 'Tasa de pobreza extrema',
} as const;

// Tipos de datos esperados
export const DATA_TYPES = {
  population: 'number',
  income: 'number',
  percentage: 'number',
  coordinate: 'array',
  code: 'string',
  name: 'string',
  boolean: 'boolean',
} as const;

// Conversiones de unidades
export const UNIT_CONVERSIONS = {
  // Velocidad
  kbps_to_mbps: (kbps: number) => kbps / 1000,
  mbps_to_kbps: (mbps: number) => mbps * 1000,
  
  // Área
  km2_to_m2: (km2: number) => km2 * 1000000,
  m2_to_km2: (m2: number) => m2 / 1000000,
  
  // Población
  population_to_density: (pop: number, areaKm2: number) => pop / areaKm2,
} as const;