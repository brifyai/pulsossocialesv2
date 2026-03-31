/**
 * Agents Page - Synthetic Agents Explorer
 * Sprint 10B: Integración con Supabase
 * Sprint 20A: Rediseño visual - Explorador de Población
 * 
 * Vista para explorar la población sintética con filtros y ficha de detalle.
 * Ahora lee desde Supabase con fallback a datos locales.
 * 
 * CAMBIOS REDISEÑO:
 * - Header con KPIs y acciones
 * - Sidebar de filtros más compacto y visual
 * - Tabla con mejor jerarquía
 * - Panel de detalle mejorado
 */

import type { SyntheticAgent } from '../types/agent';
import { 
  getAgents, 
  getAgentById, 
  getUniqueRegions, 
  getUniqueCommunes,
  getAgentStats
} from '../services/supabase/repositories/agentRepository';
import type { AgentFilters } from '../types/database';

// State
let agents: SyntheticAgent[] = [];
let filteredAgents: SyntheticAgent[] = [];
let selectedAgent: SyntheticAgent | null = null;
let regions: Array<{ code: string; name: string }> = [];
let communes: Array<{ code: string; name: string }> = [];
let isLoading = true;
let isLoadingPage = false;

// Pagination state - Server-side pagination
let currentPage = 1;
let itemsPerPage = 50;
let totalAgents = 0;

// Filter state
const currentFilters = {
  regionCode: '',
  comunaCode: '',
  sex: '',
  ageGroup: '',
  incomeDecile: '',
  educationLevel: '',
  connectivityLevel: '',
  agentType: ''
};

// KPIs calculados - ahora con datos reales de toda la población
let kpis = {
  totalAgents: 0,
  dominantRegion: '-',
  avgAge: 0,
  dominantConnectivity: '-',
  malePercentage: 0,
  femalePercentage: 0
};

// Estadísticas reales de toda la población (desde Supabase)
let realStats: {
  totalAgents: number;
  byRegion: Array<{ region_code: string; count: number }>;
  bySex: Array<{ sex: string; count: number }>;
  byAgeGroup: Array<{ age_group: string; count: number }>;
  byAgentType: Array<{ agent_type: string; count: number }>;
} | null = null;

/**
 * Create the Agents page
 * Sprint 10B: Ahora usa agentRepository con fallback a datos locales
 * Sprint 12B: Mejoras de robustez - estados loading/error mejorados
 * Sprint 20A: Rediseño visual completo
 */
export async function createAgentsPage(): Promise<HTMLElement> {
  const page = document.createElement('div');
  page.className = 'page agents-page';
  page.id = 'agents-page';
  
  // Render initial loading state
  page.innerHTML = renderLoadingState();
  
  // Load data
  await loadAgentsData(page);
  
  return page;
}

/**
 * Load agents data with error handling - LAZY LOADING
 * Solo carga la primera página de agentes, no todos
 * AHORA también carga estadísticas reales de toda la población
 */
async function loadAgentsData(page: HTMLElement): Promise<void> {
  try {
    isLoading = true;
    
    // Cargar estadísticas reales de toda la población (en paralelo)
    const statsPromise = getAgentStats();
    
    // Cargar SOLO la primera página de agentes (server-side pagination)
    const resultPromise = getAgents({ 
      page: 1, 
      pageSize: itemsPerPage,
      filters: {} 
    });
    
    // Esperar ambas peticiones en paralelo
    const [stats, result] = await Promise.all([statsPromise, resultPromise]);
    
    // Guardar estadísticas reales
    realStats = stats;
    
    agents = result.data;
    filteredAgents = [...agents];
    totalAgents = result.total;
    currentPage = 1;
    
    // Calcular KPIs usando estadísticas reales
    await calculateKPIs();
    
    // Cargar regiones
    regions = await getUniqueRegions();
    
    // Cargar todas las comunas inicialmente
    communes = await getUniqueCommunes();
    
    isLoading = false;
    
    // Check if empty
    if (agents.length === 0 && totalAgents === 0) {
      page.innerHTML = renderEmptyState();
      attachRetryListener(page);
      return;
    }
    
    // Render page
    page.innerHTML = renderPage();
    attachEventListeners(page);
    
    // Log para debugging
    console.log(`[AgentsPage] Cargados ${agents.length} agentes (página 1 de ${Math.ceil(totalAgents / itemsPerPage)}). Total en DB: ${totalAgents}`);
    console.log(`[AgentsPage] Estadísticas reales:`, realStats);
    
  } catch (error) {
    console.error('[AgentsPage] Error cargando agentes:', error);
    isLoading = false;
    page.innerHTML = renderErrorState(error);
    attachRetryListener(page);
  }
}

/**
 * Calcular KPIs de la población usando estadísticas REALES de Supabase
 * Ahora muestra datos de toda la población, no solo la muestra visible
 */
async function calculateKPIs(): Promise<void> {
  // Usar totalAgents del servidor como total
  kpis.totalAgents = totalAgents;
  
  // Si tenemos estadísticas reales, usarlas
  if (realStats) {
    // Calcular porcentajes de género reales
    const maleCount = realStats.bySex.find(s => s.sex === 'male')?.count || 0;
    const femaleCount = realStats.bySex.find(s => s.sex === 'female')?.count || 0;
    const totalSex = maleCount + femaleCount;
    
    if (totalSex > 0) {
      kpis.malePercentage = Math.round((maleCount / totalSex) * 100);
      kpis.femalePercentage = Math.round((femaleCount / totalSex) * 100);
    } else {
      kpis.malePercentage = 0;
      kpis.femalePercentage = 0;
    }
    
    // Encontrar región dominante (la que tiene más agentes)
    const dominantRegionStat = realStats.byRegion
      .sort((a, b) => b.count - a.count)[0];
    
    if (dominantRegionStat) {
      // Buscar el nombre de la región en el caché de regiones
      const regionName = await getRegionNameFromCode(dominantRegionStat.region_code);
      kpis.dominantRegion = regionName;
    } else {
      kpis.dominantRegion = '-';
    }
    
    // Para edad promedio y conectividad dominante, usamos la muestra visible
    // (requeriría un endpoint adicional para calcular promedio de edad de toda la población)
    calculateSampleKPIs();
    
    return;
  }
  
  // Fallback: calcular de la muestra visible
  calculateSampleKPIs();
}

/**
 * Calcular KPIs de la muestra visible (fallback)
 */
function calculateSampleKPIs(): void {
  if (filteredAgents.length === 0) {
    kpis.avgAge = 0;
    kpis.dominantConnectivity = '-';
    return;
  }
  
  // Calcular de los agentes visibles (muestra)
  const connectivityCounts: Record<string, number> = {};
  let totalAge = 0;
  
  filteredAgents.forEach(agent => {
    // Conectividad
    if (agent.connectivity_level) {
      connectivityCounts[agent.connectivity_level] = (connectivityCounts[agent.connectivity_level] || 0) + 1;
    }
    
    // Edad
    if (agent.age) {
      totalAge += agent.age;
    }
  });
  
  // Encontrar conectividad dominante
  kpis.dominantConnectivity = Object.entries(connectivityCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  
  // Promedio de edad de la muestra
  kpis.avgAge = filteredAgents.length > 0 ? Math.round(totalAge / filteredAgents.length) : 0;
}

/**
 * Obtener nombre de región desde su código
 */
async function getRegionNameFromCode(regionCode: string): Promise<string> {
  // Mapeo de códigos de región a nombres
  const regionNames: Record<string, string> = {
    'CL-15': 'Arica y Parinacota',
    'CL-01': 'Tarapacá',
    'CL-02': 'Antofagasta',
    'CL-03': 'Atacama',
    'CL-04': 'Coquimbo',
    'CL-05': 'Valparaíso',
    'CL-13': 'Metropolitana de Santiago',
    'CL-06': "Libertador General Bernardo O'Higgins",
    'CL-07': 'Maule',
    'CL-16': 'Ñuble',
    'CL-08': 'Biobío',
    'CL-09': 'La Araucanía',
    'CL-14': 'Los Ríos',
    'CL-10': 'Los Lagos',
    'CL-11': 'Aysén',
    'CL-12': 'Magallanes',
    // También soportar códigos cortos
    '15': 'Arica y Parinacota',
    '1': 'Tarapacá',
    '2': 'Antofagasta',
    '3': 'Atacama',
    '4': 'Coquimbo',
    '5': 'Valparaíso',
    '13': 'Metropolitana de Santiago',
    '6': "Libertador General Bernardo O'Higgins",
    '7': 'Maule',
    '16': 'Ñuble',
    '8': 'Biobío',
    '9': 'La Araucanía',
    '14': 'Los Ríos',
    '10': 'Los Lagos',
    '11': 'Aysén',
    '12': 'Magallanes',
  };
  
  return regionNames[regionCode] || regionCode;
}

/**
 * Attach retry button listener
 */
function attachRetryListener(page: HTMLElement): void {
  const retryBtn = page.querySelector('#retry-agents-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      page.innerHTML = renderLoadingState();
      loadAgentsData(page);
    });
  }
}

/**
 * Render the page HTML
 */
function renderPage(): string {
  if (isLoading) {
    return renderLoadingState();
  }

  return `
    <!-- Header Principal -->
    <header class="agents-header">
      <div class="agents-header-content">
        <div class="agents-header-title">
          <h1 class="agents-title">
            <span class="title-icon">👥</span>
            Agentes Sintéticos
          </h1>
          <p class="agents-subtitle">
            Explora la población sintética generada con datos censales y socioeconómicos reales
          </p>
        </div>
        <div class="agents-header-actions">
          <button class="btn-header-action" id="export-agents-btn" title="Exportar segmento">
            <span class="action-icon">download</span>
            Exportar
          </button>
          <button class="btn-header-action btn-primary" id="clear-filters-btn" title="Limpiar todos los filtros">
            <span class="action-icon">filter_alt_off</span>
            Limpiar filtros
          </button>
        </div>
      </div>
    </header>
    
    <!-- KPIs Dashboard -->
    <section class="agents-kpis">
      ${renderKPICards()}
    </section>
    
    <div class="agents-layout">
      <!-- Sidebar: Filtros Mejorado -->
      <aside class="agents-filters">
        <div class="filters-header">
          <h2>
            <span class="filter-icon">filter_list</span>
            Filtros
          </h2>
          <span class="filters-badge" id="active-filters-count">0 activos</span>
        </div>
        
        <!-- Resumen del segmento actual -->
        <div class="filters-summary">
          <h3>Segmento actual</h3>
          <div class="summary-tags" id="filter-summary-tags">
            ${renderFilterSummaryTags()}
          </div>
        </div>
        
        <div class="filters-scroll">
          <div class="filter-group">
            <label for="filter-region">
              <span class="filter-label-icon">location_on</span>
              Región
            </label>
            <select id="filter-region" class="filter-select">
              <option value="">Todas las regiones</option>
              ${regions.map(r => `<option value="${r.code}">${r.name}</option>`).join('')}
            </select>
          </div>
          
          <div class="filter-group">
            <label for="filter-comuna">
              <span class="filter-label-icon">place</span>
              Comuna
            </label>
            <select id="filter-comuna" class="filter-select">
              <option value="">Todas las comunas</option>
              ${communes.map(c => `<option value="${c.code}">${c.name}</option>`).join('')}
            </select>
          </div>
          
          <div class="filter-group">
            <label for="filter-sex">
              <span class="filter-label-icon">wc</span>
              Sexo
            </label>
            <select id="filter-sex" class="filter-select">
              <option value="">Todos</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="filter-age-group">
              <span class="filter-label-icon">calendar_today</span>
              Grupo de edad
            </label>
            <select id="filter-age-group" class="filter-select">
              <option value="">Todos</option>
              <option value="child">Niño</option>
              <option value="youth">Joven</option>
              <option value="adult">Adulto</option>
              <option value="middle_age">Mediana edad</option>
              <option value="senior">Adulto mayor</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="filter-income">
              <span class="filter-label-icon">attach_money</span>
              Decil de ingreso
            </label>
            <select id="filter-income" class="filter-select">
              <option value="">Todos</option>
              ${[1,2,3,4,5,6,7,8,9,10].map(d => `<option value="${d}">Decil ${d}</option>`).join('')}
            </select>
          </div>
          
          <div class="filter-group">
            <label for="filter-education">
              <span class="filter-label-icon">school</span>
              Nivel educativo
            </label>
            <select id="filter-education" class="filter-select">
              <option value="">Todos</option>
              <option value="none">Sin educación</option>
              <option value="primary">Primaria</option>
              <option value="secondary">Secundaria</option>
              <option value="technical">Técnico</option>
              <option value="university">Universitario</option>
              <option value="postgraduate">Posgrado</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="filter-connectivity">
              <span class="filter-label-icon">wifi</span>
              Conectividad
            </label>
            <select id="filter-connectivity" class="filter-select">
              <option value="">Todos</option>
              <option value="none">Sin conexión</option>
              <option value="low">Bajo</option>
              <option value="medium">Medio</option>
              <option value="high">Alto</option>
              <option value="very_high">Muy alto</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="filter-agent-type">
              <span class="filter-label-icon">person</span>
              Tipo de agente
            </label>
            <select id="filter-agent-type" class="filter-select">
              <option value="">Todos</option>
              <option value="resident">Residente</option>
              <option value="retiree">Jubilado</option>
              <option value="student">Estudiante</option>
              <option value="entrepreneur">Emprendedor</option>
              <option value="worker">Trabajador</option>
            </select>
          </div>
        </div>
        
        <div class="filters-footer">
          <div class="results-count">
            <span class="results-icon">people</span>
            <span id="results-count">${totalAgents.toLocaleString()}</span>
            <span class="results-label">agentes</span>
          </div>
        </div>
      </aside>
      
      <!-- Main: Tabla + Paginación -->
      <main class="agents-content">
        <div class="agents-table-wrapper">
          <div class="agents-table-container">
            <table class="agents-table">
              <thead>
                <tr>
                  <th class="col-id">ID</th>
                  <th class="col-region">Región</th>
                  <th class="col-comuna">Comuna</th>
                  <th class="col-sex">Sexo</th>
                  <th class="col-age">Edad</th>
                  <th class="col-group">Grupo</th>
                  <th class="col-type">Tipo</th>
                  <th class="col-connectivity">Conectividad</th>
                </tr>
              </thead>
              <tbody id="agents-table-body">
                ${renderTableRows()}
              </tbody>
            </table>
            
            ${filteredAgents.length === 0 ? `
              <div class="no-results">
                <div class="no-results-icon">search_off</div>
                <p>No se encontraron agentes con los filtros seleccionados</p>
                <button class="btn-clear-filters" id="clear-filters-no-results">Limpiar filtros</button>
              </div>
            ` : ''}
            
            ${filteredAgents.length > 0 ? renderPagination() : ''}
          </div>
        </div>
      </main>
    </div>
    
    <!-- Overlay para cerrar panel al hacer click fuera -->
    <div class="agent-detail-overlay ${selectedAgent ? 'active' : ''}" id="agent-detail-overlay"></div>
    
    <!-- Panel de detalle: Overlay que aparece solo con selección -->
    <aside class="agent-detail-panel ${selectedAgent ? 'active' : ''}" id="agent-detail-panel">
      ${selectedAgent ? renderAgentDetail(selectedAgent) : ''}
    </aside>
  `;
}

/**
 * Render KPI Cards
 */
function renderKPICards(): string {
  return `
    <div class="kpi-card kpi-total">
      <div class="kpi-icon">people</div>
      <div class="kpi-content">
        <div class="kpi-value">${kpis.totalAgents.toLocaleString()}</div>
        <div class="kpi-label">Total agentes</div>
      </div>
    </div>
    
    <div class="kpi-card kpi-region">
      <div class="kpi-icon">location_on</div>
      <div class="kpi-content">
        <div class="kpi-value">${kpis.dominantRegion}</div>
        <div class="kpi-label">Región dominante</div>
      </div>
    </div>
    
    <div class="kpi-card kpi-age">
      <div class="kpi-icon">calendar_today</div>
      <div class="kpi-content">
        <div class="kpi-value">${kpis.avgAge || '-'}</div>
        <div class="kpi-label">Edad promedio</div>
      </div>
    </div>
    
    <div class="kpi-card kpi-connectivity">
      <div class="kpi-icon">wifi</div>
      <div class="kpi-content">
        <div class="kpi-value">${formatConnectivityShort(kpis.dominantConnectivity)}</div>
        <div class="kpi-label">Conectividad</div>
      </div>
    </div>
    
    <div class="kpi-card kpi-gender">
      <div class="kpi-icon">wc</div>
      <div class="kpi-content">
        <div class="kpi-value">${kpis.malePercentage}% / ${kpis.femalePercentage}%</div>
        <div class="kpi-label">Hombres / Mujeres</div>
      </div>
    </div>
  `;
}

/**
 * Render filter summary tags
 */
function renderFilterSummaryTags(): string {
  const tags: string[] = [];
  
  if (currentFilters.regionCode) {
    const region = regions.find(r => r.code === currentFilters.regionCode);
    tags.push(`<span class="filter-tag">${region?.name || currentFilters.regionCode}</span>`);
  }
  
  if (currentFilters.comunaCode) {
    const comuna = communes.find(c => c.code === currentFilters.comunaCode);
    tags.push(`<span class="filter-tag">${comuna?.name || currentFilters.comunaCode}</span>`);
  }
  
  if (currentFilters.sex) {
    tags.push(`<span class="filter-tag">${formatSex(currentFilters.sex)}</span>`);
  }
  
  if (currentFilters.ageGroup) {
    tags.push(`<span class="filter-tag">${formatAgeGroup(currentFilters.ageGroup)}</span>`);
  }
  
  if (currentFilters.incomeDecile) {
    tags.push(`<span class="filter-tag">Decil ${currentFilters.incomeDecile}</span>`);
  }
  
  if (currentFilters.educationLevel) {
    tags.push(`<span class="filter-tag">${formatEducationLevel(currentFilters.educationLevel)}</span>`);
  }
  
  if (currentFilters.connectivityLevel) {
    tags.push(`<span class="filter-tag">${formatConnectivity(currentFilters.connectivityLevel)}</span>`);
  }
  
  if (currentFilters.agentType) {
    tags.push(`<span class="filter-tag">${formatAgentType(currentFilters.agentType)}</span>`);
  }
  
  if (tags.length === 0) {
    return '<span class="filter-tag filter-tag-empty">Sin filtros activos</span>';
  }
  
  return tags.join('');
}

/**
 * Render table rows - Los agentes ya vienen paginados del servidor
 */
function renderTableRows(): string {
  // Los agentes ya vienen paginados del servidor, no necesitamos slice
  if (filteredAgents.length === 0) {
    return '';
  }
  
  return filteredAgents.map(agent => `
    <tr class="agent-row" data-agent-id="${agent.agent_id}">
      <td class="col-id">
        <span class="agent-id-badge">${agent.agent_id}</span>
      </td>
      <td class="col-region">${agent.region_name}</td>
      <td class="col-comuna">${agent.comuna_name}</td>
      <td class="col-sex">
        <span class="sex-badge sex-${agent.sex}">${formatSex(agent.sex)}</span>
      </td>
      <td class="col-age">${agent.age}</td>
      <td class="col-group">${formatAgeGroup(agent.age_group)}</td>
      <td class="col-type">
        <span class="type-badge type-${agent.agent_type}">${formatAgentType(agent.agent_type)}</span>
      </td>
      <td class="col-connectivity">
        <span class="connectivity-indicator connectivity-${agent.connectivity_level}">
          ${formatConnectivityShort(agent.connectivity_level)}
        </span>
      </td>
    </tr>
  `).join('');
}

/**
 * Render pagination controls - Usa totalAgents del servidor
 */
function renderPagination(): string {
  const totalPages = Math.ceil(totalAgents / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalAgents);
  
  return `
    <div class="pagination-container">
      <div class="pagination-info">
        <span class="pagination-range">${startItem.toLocaleString()}-${endItem.toLocaleString()}</span>
        <span class="pagination-of">de</span>
        <span class="pagination-total">${totalAgents.toLocaleString()}</span>
        <span class="pagination-label">agentes</span>
      </div>
      
      <div class="pagination-controls">
        <button class="pagination-btn" id="pagination-prev" ${currentPage === 1 || isLoadingPage ? 'disabled' : ''}>
          <span class="btn-icon">chevron_left</span>
        </button>
        
        <span class="pagination-page">${currentPage} / ${totalPages}</span>
        
        <button class="pagination-btn" id="pagination-next" ${currentPage >= totalPages || isLoadingPage ? 'disabled' : ''}>
          <span class="btn-icon">chevron_right</span>
        </button>
      </div>
      
      <div class="pagination-size">
        <select id="items-per-page" class="pagination-select" ${isLoadingPage ? 'disabled' : ''}>
          <option value="20" ${itemsPerPage === 20 ? 'selected' : ''}>20</option>
          <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50</option>
          <option value="100" ${itemsPerPage === 100 ? 'selected' : ''}>100</option>
        </select>
        <span class="size-label">por página</span>
      </div>
      
      ${isLoadingPage ? '<div class="pagination-loading">Cargando...</div>' : ''}
    </div>
  `;
}

/**
 * Render agent detail panel
 */
function renderAgentDetail(agent: SyntheticAgent): string {
  return `
    <div class="detail-header">
      <div class="detail-title">
        <span class="detail-icon">person</span>
        <h2>${agent.agent_id}</h2>
      </div>
      <button class="btn-close-detail" id="close-detail">✕</button>
    </div>
    
    <div class="detail-content">
      <section class="detail-section">
        <h3>
          <span class="section-icon">badge</span>
          Identidad
        </h3>
        <dl class="detail-list">
          <dt>ID</dt><dd>${agent.agent_id}</dd>
          <dt>Batch</dt><dd>${agent.synthetic_batch_id}</dd>
          <dt>Versión</dt><dd>${agent.source_version}</dd>
          <dt>Creado</dt><dd>${formatDate(agent.created_at)}</dd>
        </dl>
      </section>
      
      <section class="detail-section">
        <h3>
          <span class="section-icon">location_on</span>
          Territorio
        </h3>
        <dl class="detail-list">
          <dt>País</dt><dd>${agent.country_code}</dd>
          <dt>Región</dt><dd>${agent.region_name} (${agent.region_code})</dd>
          <dt>Comuna</dt><dd>${agent.comuna_name} (${agent.comuna_code})</dd>
          <dt>Urbanicidad</dt><dd>${formatUrbanicity(agent.urbanicity)}</dd>
        </dl>
      </section>
      
      <section class="detail-section">
        <h3>
          <span class="section-icon">face</span>
          Demografía
        </h3>
        <dl class="detail-list">
          <dt>Sexo</dt><dd>${formatSex(agent.sex)}</dd>
          <dt>Edad</dt><dd>${agent.age} años</dd>
          <dt>Grupo</dt><dd>${formatAgeGroup(agent.age_group)}</dd>
        </dl>
      </section>
      
      <section class="detail-section">
        <h3>
          <span class="section-icon">home</span>
          Hogar
        </h3>
        <dl class="detail-list">
          <dt>Tamaño</dt><dd>${agent.household_size !== undefined && agent.household_size !== null ? agent.household_size : 'N/A'} personas</dd>
          <dt>Tipo</dt><dd>${formatHouseholdType(agent.household_type)}</dd>
        </dl>
      </section>
      
      <section class="detail-section">
        <h3>
          <span class="section-icon">attach_money</span>
          Socioeconómico
        </h3>
        <dl class="detail-list">
          <dt>Decil ingreso</dt><dd>${agent.income_decile !== undefined && agent.income_decile !== null ? agent.income_decile : 'N/A'}</dd>
          <dt>Pobreza</dt><dd>${formatPovertyStatus(agent.poverty_status)}</dd>
          <dt>Educación</dt><dd>${formatEducationLevel(agent.education_level)}</dd>
          <dt>Ocupación</dt><dd>${formatOccupationStatus(agent.occupation_status)}</dd>
          <dt>Nivel socioec.</dt><dd>${formatSocioeconomicLevel(agent.socioeconomic_level)}</dd>
        </dl>
      </section>
      
      <section class="detail-section">
        <h3>
          <span class="section-icon">wifi</span>
          Digital
        </h3>
        <dl class="detail-list">
          <dt>Conectividad</dt><dd>${formatConnectivity(agent.connectivity_level)}</dd>
          <dt>Exposición digital</dt><dd>${formatDigitalExposure(agent.digital_exposure_level)}</dd>
          <dt>Canal preferido</dt><dd>${formatSurveyChannel(agent.preferred_survey_channel)}</dd>
        </dl>
      </section>
      
      <section class="detail-section">
        <h3>
          <span class="section-icon">category</span>
          Funcional
        </h3>
        <dl class="detail-list">
          <dt>Tipo de agente</dt><dd>${formatAgentType(agent.agent_type) || 'N/A'}</dd>
        </dl>
      </section>
      
      <section class="detail-section detail-section-notes">
        <h3>
          <span class="section-icon">notes</span>
          Notas
        </h3>
        <p class="detail-notes">${agent.generation_notes !== undefined && agent.generation_notes !== null ? agent.generation_notes : 'Sin notas de generación'}</p>
      </section>
    </div>
  `;
}

/**
 * Render loading state
 */
function renderLoadingState(): string {
  return `
    <div class="state-container state-loading">
      <div class="state-spinner"></div>
      <p class="state-message">Cargando agentes sintéticos...</p>
      <p class="state-hint">Esto puede tomar unos segundos</p>
    </div>
  `;
}

/**
 * Render error state
 */
function renderErrorState(error: unknown): string {
  return `
    <div class="state-container state-error">
      <div class="state-icon">error_outline</div>
      <h3 class="state-title">Error al cargar agentes</h3>
      <p class="state-message">${error instanceof Error ? error.message : 'Error desconocido'}</p>
      <p class="state-hint">Asegúrate de haber ejecutado el pipeline: npm run pipeline</p>
      <button class="btn btn-primary state-action" id="retry-agents-btn">
        <span class="btn-icon">refresh</span>
        Reintentar
      </button>
    </div>
  `;
}

/**
 * Render empty state
 */
function renderEmptyState(): string {
  return `
    <div class="state-container state-empty">
      <div class="state-icon">people_outline</div>
      <h3 class="state-title">No hay agentes disponibles</h3>
      <p class="state-message">No se encontraron agentes sintéticos en el sistema.</p>
      <p class="state-hint">Ejecuta el pipeline para generar la población sintética.</p>
      <button class="btn btn-primary state-action" id="retry-agents-btn">
        <span class="btn-icon">refresh</span>
        Reintentar
      </button>
    </div>
  `;
}

// ===========================================
// Event Handlers
// ===========================================

function attachEventListeners(page: HTMLElement): void {
  // Filter selects
  const filterIds = [
    'filter-region', 'filter-comuna', 'filter-sex', 'filter-age-group',
    'filter-income', 'filter-education', 'filter-connectivity', 'filter-agent-type'
  ];
  
  filterIds.forEach(id => {
    const select = page.querySelector(`#${id}`) as HTMLSelectElement;
    if (select) {
      select.addEventListener('change', async () => {
        // Update filter state
        currentFilters.regionCode = (page.querySelector('#filter-region') as HTMLSelectElement).value;
        currentFilters.comunaCode = (page.querySelector('#filter-comuna') as HTMLSelectElement).value;
        currentFilters.sex = (page.querySelector('#filter-sex') as HTMLSelectElement).value;
        currentFilters.ageGroup = (page.querySelector('#filter-age-group') as HTMLSelectElement).value;
        currentFilters.incomeDecile = (page.querySelector('#filter-income') as HTMLSelectElement).value;
        currentFilters.educationLevel = (page.querySelector('#filter-education') as HTMLSelectElement).value;
        currentFilters.connectivityLevel = (page.querySelector('#filter-connectivity') as HTMLSelectElement).value;
        currentFilters.agentType = (page.querySelector('#filter-agent-type') as HTMLSelectElement).value;
        
        // If region changed, update communes
        if (id === 'filter-region') {
          const regionCode = currentFilters.regionCode;
          if (regionCode) {
            // Filtrar comunas por región seleccionada
            communes = await getUniqueCommunes(regionCode);
            const comunaSelect = page.querySelector('#filter-comuna') as HTMLSelectElement;
            if (comunaSelect) {
              comunaSelect.innerHTML = `
                <option value="">Todas las comunas</option>
                ${communes.map(c => `<option value="${c.code}">${c.name}</option>`).join('')}
              `;
            }
          } else {
            // Si no hay región seleccionada, mostrar todas las comunas
            communes = await getUniqueCommunes();
            const comunaSelect = page.querySelector('#filter-comuna') as HTMLSelectElement;
            if (comunaSelect) {
              comunaSelect.innerHTML = `
                <option value="">Todas las comunas</option>
                ${communes.map(c => `<option value="${c.code}">${c.name}</option>`).join('')}
              `;
            }
          }
        }
        
        // Apply filters
        await applyFilters(page);
      });
    }
  });
  
  // Clear filters buttons
  const clearFiltersBtns = page.querySelectorAll('#clear-filters-btn, #clear-filters-no-results');
  clearFiltersBtns.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', async () => {
        currentFilters.regionCode = '';
        currentFilters.comunaCode = '';
        currentFilters.sex = '';
        currentFilters.ageGroup = '';
        currentFilters.incomeDecile = '';
        currentFilters.educationLevel = '';
        currentFilters.connectivityLevel = '';
        currentFilters.agentType = '';
        
        // Reset selects
        (page.querySelectorAll('.filter-select') as NodeListOf<HTMLSelectElement>).forEach(select => {
          select.value = '';
        });
        
        // Recargar todas las comunas
        communes = await getUniqueCommunes();
        const comunaSelect = page.querySelector('#filter-comuna') as HTMLSelectElement;
        if (comunaSelect) {
          comunaSelect.innerHTML = `
            <option value="">Todas las comunas</option>
            ${communes.map(c => `<option value="${c.code}">${c.name}</option>`).join('')}
          `;
        }
        
        // Apply filters (all) - this will also reset pagination to page 1
        await applyFilters(page);
      });
    }
  });
  
  // Attach pagination listeners
  attachPaginationListeners(page);
  
  // Agent row clicks
  const rows = page.querySelectorAll('.agent-row');
  rows.forEach(row => {
    row.addEventListener('click', async () => {
      const agentId = (row as HTMLElement).dataset.agentId;
      if (agentId) {
        const agent = await getAgentById(agentId);
        if (agent) {
          selectedAgent = agent;
          updateDetailPanel(page);
        }
      }
    });
  });
  
  // Close detail button
  const closeBtn = page.querySelector('#close-detail');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      selectedAgent = null;
      updateDetailPanel(page);
    });
  }
  
  // Overlay click to close
  const overlay = page.querySelector('#agent-detail-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      selectedAgent = null;
      updateDetailPanel(page);
    });
  }
  
  // Export button (placeholder)
  const exportBtn = page.querySelector('#export-agents-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      alert('Exportación de agentes - Funcionalidad en desarrollo');
    });
  }
}

/**
 * Apply filters and update table - SERVER-SIDE
 * Los filtros se aplican en la base de datos, no en el cliente
 */
async function applyFilters(page: HTMLElement): Promise<void> {
  const filters: AgentFilters = {};
  
  if (currentFilters.regionCode) filters.regionCode = currentFilters.regionCode;
  if (currentFilters.comunaCode) filters.comunaCode = currentFilters.comunaCode;
  if (currentFilters.sex) filters.sex = currentFilters.sex as any;
  if (currentFilters.ageGroup) filters.ageGroup = currentFilters.ageGroup as any;
  if (currentFilters.incomeDecile) filters.incomeDecile = parseInt(currentFilters.incomeDecile);
  if (currentFilters.educationLevel) filters.educationLevel = currentFilters.educationLevel as any;
  if (currentFilters.connectivityLevel) filters.connectivityLevel = currentFilters.connectivityLevel as any;
  if (currentFilters.agentType) filters.agentType = currentFilters.agentType as any;
  
  // Cargar SOLO la primera página de agentes filtrados (server-side)
  const result = await getAgents({ 
    page: 1, 
    pageSize: itemsPerPage,
    filters 
  });
  
  filteredAgents = result.data;
  totalAgents = result.total;
  
  // Recalcular KPIs
  await calculateKPIs();
  
  // Reset to page 1 when filters change
  currentPage = 1;
  
  // Update results count
  const resultsCount = page.querySelector('#results-count');
  if (resultsCount) {
    resultsCount.textContent = totalAgents.toLocaleString();
  }
  
  // Update active filters count
  const activeFiltersCount = Object.values(currentFilters).filter(v => v !== '').length;
  const filtersBadge = page.querySelector('#active-filters-count');
  if (filtersBadge) {
    filtersBadge.textContent = `${activeFiltersCount} activo${activeFiltersCount !== 1 ? 's' : ''}`;
    filtersBadge.classList.toggle('has-filters', activeFiltersCount > 0);
  }
  
  // Update filter summary tags
  const summaryTags = page.querySelector('#filter-summary-tags');
  if (summaryTags) {
    summaryTags.innerHTML = renderFilterSummaryTags();
  }
  
  // Update KPIs
  const kpisSection = page.querySelector('.agents-kpis');
  if (kpisSection) {
    kpisSection.innerHTML = renderKPICards();
  }
  
  // Update table and pagination
  updateTableAndPagination(page);
  
  // Log para debugging
  console.log(`[AgentsPage] Filtros aplicados: ${filteredAgents.length} agentes mostrados de ${totalAgents} total`);
}

/**
 * Update table rows and pagination controls
 */
function updateTableAndPagination(page: HTMLElement): void {
  // Update table body
  const tbody = page.querySelector('#agents-table-body');
  if (tbody) {
    tbody.innerHTML = renderTableRows();
    
    // Re-attach click listeners
    const rows = tbody.querySelectorAll('.agent-row');
    rows.forEach(row => {
      row.addEventListener('click', async () => {
        const agentId = (row as HTMLElement).dataset.agentId;
        if (agentId) {
          const agent = await getAgentById(agentId);
          if (agent) {
            selectedAgent = agent;
            updateDetailPanel(page);
          }
        }
      });
    });
  }
  
  // Update pagination
  const paginationContainer = page.querySelector('.pagination-container');
  if (paginationContainer) {
    paginationContainer.outerHTML = renderPagination();
    attachPaginationListeners(page);
  }
  
  // Show/hide no results message
  const noResults = page.querySelector('.no-results') as HTMLElement | null;
  if (noResults) {
    noResults.style.display = filteredAgents.length === 0 ? 'block' : 'none';
  }
  
  // Hide loading state if present
  const loadingRow = page.querySelector('.table-loading-row');
  if (loadingRow) {
    loadingRow.remove();
  }
}

/**
 * Attach pagination event listeners - SERVER-SIDE PAGINATION
 * Cada cambio de página hace una nueva consulta a la base de datos
 */
function attachPaginationListeners(page: HTMLElement): void {
  // Previous page button
  const prevBtn = page.querySelector('#pagination-prev') as HTMLButtonElement | null;
  if (prevBtn) {
    prevBtn.addEventListener('click', async () => {
      if (currentPage > 1 && !isLoadingPage) {
        await loadPage(page, currentPage - 1);
      }
    });
  }
  
  // Next page button
  const nextBtn = page.querySelector('#pagination-next') as HTMLButtonElement | null;
  if (nextBtn) {
    nextBtn.addEventListener('click', async () => {
      const totalPages = Math.ceil(totalAgents / itemsPerPage);
      if (currentPage < totalPages && !isLoadingPage) {
        await loadPage(page, currentPage + 1);
      }
    });
  }
  
  // Items per page selector
  const itemsPerPageSelect = page.querySelector('#items-per-page') as HTMLSelectElement | null;
  if (itemsPerPageSelect) {
    itemsPerPageSelect.addEventListener('change', async () => {
      itemsPerPage = parseInt(itemsPerPageSelect.value);
      currentPage = 1; // Reset to first page when changing page size
      await loadPage(page, 1);
    });
  }
}

/**
 * Load a specific page from the server
 */
async function loadPage(page: HTMLElement, pageNum: number): Promise<void> {
  if (isLoadingPage) return;
  
  isLoadingPage = true;
  
  // Show loading indicator in table
  const tbody = page.querySelector('#agents-table-body');
  if (tbody) {
    tbody.innerHTML = `
      <tr class="table-loading-row">
        <td colspan="8" class="table-loading-cell">
          <div class="table-loading-spinner"></div>
          <span>Cargando agentes...</span>
        </td>
      </tr>
    `;
  }
  
  try {
    const filters: AgentFilters = {};
    
    if (currentFilters.regionCode) filters.regionCode = currentFilters.regionCode;
    if (currentFilters.comunaCode) filters.comunaCode = currentFilters.comunaCode;
    if (currentFilters.sex) filters.sex = currentFilters.sex as any;
    if (currentFilters.ageGroup) filters.ageGroup = currentFilters.ageGroup as any;
    if (currentFilters.incomeDecile) filters.incomeDecile = parseInt(currentFilters.incomeDecile);
    if (currentFilters.educationLevel) filters.educationLevel = currentFilters.educationLevel as any;
    if (currentFilters.connectivityLevel) filters.connectivityLevel = currentFilters.connectivityLevel as any;
    if (currentFilters.agentType) filters.agentType = currentFilters.agentType as any;
    
    // Cargar la página específica desde el servidor
    const result = await getAgents({ 
      page: pageNum, 
      pageSize: itemsPerPage,
      filters 
    });
    
    filteredAgents = result.data;
    totalAgents = result.total;
    currentPage = pageNum;
    
    // Update table and pagination
    updateTableAndPagination(page);
    
    console.log(`[AgentsPage] Página ${pageNum} cargada: ${filteredAgents.length} agentes`);
    
  } catch (error) {
    console.error('[AgentsPage] Error cargando página:', error);
    // Show error in table
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="table-error-cell">
            Error al cargar los agentes. <button class="btn-retry" id="retry-page">Reintentar</button>
          </td>
        </tr>
      `;
      const retryBtn = tbody.querySelector('#retry-page');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => loadPage(page, pageNum));
      }
    }
  } finally {
    isLoadingPage = false;
  }
}

/**
 * Update detail panel and overlay
 */
function updateDetailPanel(page: HTMLElement): void {
  const panel = page.querySelector('#agent-detail-panel');
  const overlay = page.querySelector('#agent-detail-overlay');
  
  if (panel) {
    panel.className = `agent-detail-panel ${selectedAgent ? 'active' : ''}`;
    panel.innerHTML = selectedAgent ? renderAgentDetail(selectedAgent) : '';
    
    // Re-attach close button listener
    const closeBtn = panel.querySelector('#close-detail');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        selectedAgent = null;
        updateDetailPanel(page);
      });
    }
  }
  
  // Update overlay
  if (overlay) {
    overlay.className = `agent-detail-overlay ${selectedAgent ? 'active' : ''}`;
  }
}

// ===========================================
// Formatters
// ===========================================

function formatSex(sex: string | null): string {
  if (!sex) return 'N/A';
  return sex === 'male' ? 'Masculino' : 'Femenino';
}

function formatAgeGroup(ageGroup: string | null): string {
  if (!ageGroup) return 'N/A';
  const map: Record<string, string> = {
    child: 'Niño',
    youth: 'Joven',
    adult: 'Adulto',
    middle_age: 'Mediana edad',
    senior: 'Adulto mayor'
  };
  return map[ageGroup] || ageGroup;
}

function formatAgentType(type: string | null): string {
  if (!type) return 'N/A';
  const map: Record<string, string> = {
    resident: 'Residente',
    retiree: 'Jubilado',
    student: 'Estudiante',
    entrepreneur: 'Emprendedor',
    worker: 'Trabajador'
  };
  return map[type] || type;
}

function formatConnectivity(level: string | null): string {
  if (!level) return 'N/A';
  const map: Record<string, string> = {
    none: 'Sin conexión',
    low: 'Bajo',
    medium: 'Medio',
    high: 'Alto',
    very_high: 'Muy alto'
  };
  return map[level] || level;
}

function formatConnectivityShort(level: string | null): string {
  if (!level) return '-';
  const map: Record<string, string> = {
    none: 'Sin',
    low: 'Bajo',
    medium: 'Medio',
    high: 'Alto',
    very_high: 'Muy alto'
  };
  return map[level] || level;
}

function formatDigitalExposure(level: string | null): string {
  if (!level) return 'N/A';
  const map: Record<string, string> = {
    none: 'Sin exposición',
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    very_high: 'Muy alta'
  };
  return map[level] || level;
}

function formatSurveyChannel(channel: string | null): string {
  if (!channel) return 'N/A';
  const map: Record<string, string> = {
    phone: 'Teléfono',
    online: 'En línea',
    in_person: 'Presencial',
    mixed: 'Mixto'
  };
  return map[channel] || channel;
}

function formatUrbanicity(u: string): string {
  return u === 'urban' ? 'Urbano' : 'Rural';
}

function formatHouseholdType(t: string): string {
  const map: Record<string, string> = {
    single: 'Unipersonal',
    couple: 'Pareja',
    family: 'Familiar',
    extended: 'Extendido'
  };
  return map[t] || t;
}

function formatPovertyStatus(s: string | null): string {
  // Manejar valores nulos, undefined, o strings como "NULL", "null", "NaN"
  if (!s || s === 'NULL' || s === 'null' || s === 'NaN' || s === 'undefined') return 'N/A';
  const map: Record<string, string> = {
    extreme_poverty: 'Pobreza extrema',
    poverty: 'Pobreza',
    vulnerable: 'Vulnerable',
    middle_class: 'Clase media',
    upper_middle: 'Clase media-alta',
    upper_class: 'Clase alta'
  };
  return map[s] || s;
}

function formatEducationLevel(l: string | null): string {
  if (!l) return 'N/A';
  const map: Record<string, string> = {
    none: 'Sin educación',
    primary: 'Primaria',
    secondary: 'Secundaria',
    technical: 'Técnico',
    university: 'Universitario',
    postgraduate: 'Posgrado'
  };
  return map[l] || l;
}

function formatOccupationStatus(s: string | null): string {
  // Manejar valores nulos, undefined, o strings como "NULL", "null", "NaN"
  if (!s || s === 'NULL' || s === 'null' || s === 'NaN' || s === 'undefined') return 'N/A';
  const map: Record<string, string> = {
    employed: 'Empleado',
    unemployed: 'Desempleado',
    self_employed: 'Autónomo',
    retired: 'Jubilado',
    student: 'Estudiante',
    homemaker: 'Ama de casa'
  };
  return map[s] || s;
}

function formatSocioeconomicLevel(l: string | null): string {
  if (!l) return 'N/A';
  const map: Record<string, string> = {
    low: 'Bajo',
    medium: 'Medio',
    high: 'Alto'
  };
  return map[l] || l;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Cleanup function
 */
export function cleanupAgentsPage(): void {
  agents = [];
  filteredAgents = [];
  selectedAgent = null;
  regions = [];
  communes = [];
  isLoading = true;
  isLoadingPage = false;
  currentPage = 1;
  totalAgents = 0;
  kpis = {
    totalAgents: 0,
    dominantRegion: '-',
    avgAge: 0,
    dominantConnectivity: '-',
    malePercentage: 0,
    femalePercentage: 0
  };
}
