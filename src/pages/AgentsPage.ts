/**
 * Agents Page - Synthetic Agents Explorer
 * Sprint 10B: Integración con Supabase
 * 
 * Vista para explorar la población sintética con filtros y ficha de detalle.
 * Ahora lee desde Supabase con fallback a datos locales.
 */

import type { SyntheticAgent } from '../types/agent';
import { 
  getAgents, 
  getAgentById, 
  getUniqueRegions, 
  getUniqueCommunes 
} from '../services/supabase/repositories/agentRepository';
import type { AgentFilters } from '../types/database';

// State
let agents: SyntheticAgent[] = [];
let filteredAgents: SyntheticAgent[] = [];
let selectedAgent: SyntheticAgent | null = null;
let regions: Array<{ code: string; name: string }> = [];
let communes: Array<{ code: string; name: string }> = [];
let isLoading = true;

// Pagination state
let currentPage = 1;
let itemsPerPage = 50;

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

/**
 * Create the Agents page
 * Sprint 10B: Ahora usa agentRepository con fallback a datos locales
 * Sprint 12B: Mejoras de robustez - estados loading/error mejorados
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
 * Load agents data with error handling
 */
async function loadAgentsData(page: HTMLElement): Promise<void> {
  try {
    isLoading = true;
    
    // Cargar agents desde Supabase - todos los 25,000
    const result = await getAgents({ 
      page: 1, 
      pageSize: 30000, // Cargar todos los agentes (25,000 + margen)
      filters: {} 
    });
    
    agents = result.data;
    filteredAgents = [...agents];
    
    // Cargar regiones
    regions = await getUniqueRegions();
    
    // Cargar todas las comunas inicialmente
    communes = await getUniqueCommunes();
    
    isLoading = false;
    
    // Check if empty
    if (agents.length === 0) {
      page.innerHTML = renderEmptyState();
      attachRetryListener(page);
      return;
    }
    
    // Render page
    page.innerHTML = renderPage();
    attachEventListeners(page);
    
    // Log para debugging
    console.log(`[AgentsPage] Cargados ${agents.length} agentes desde ${result.total > 0 ? 'Supabase' : 'fallback local'}`);
    
  } catch (error) {
    console.error('[AgentsPage] Error cargando agentes:', error);
    isLoading = false;
    page.innerHTML = renderErrorState(error);
    attachRetryListener(page);
  }
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
    return `
      <div class="agents-loading">
        <div class="loading-spinner"></div>
        <p>Cargando agentes sintéticos...</p>
      </div>
    `;
  }

  return `
    <div class="agents-header">
      <h1 class="agents-title">Agentes Sintéticos</h1>
      <p class="agents-subtitle">Explora la población sintética generada por el pipeline de datos</p>
    </div>
    
    <div class="agents-layout">
      <!-- Sidebar: Filtros -->
      <aside class="agents-filters">
        <div class="filters-header">
          <h2>Filtros</h2>
          <button class="btn-reset-filters" id="reset-filters">Limpiar</button>
        </div>
        
        <div class="filter-group">
          <label for="filter-region">Región</label>
          <select id="filter-region" class="filter-select">
            <option value="">Todas las regiones</option>
            ${regions.map(r => `<option value="${r.code}">${r.name}</option>`).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label for="filter-comuna">Comuna</label>
          <select id="filter-comuna" class="filter-select">
            <option value="">Todas las comunas</option>
            ${communes.map(c => `<option value="${c.code}">${c.name}</option>`).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label for="filter-sex">Sexo</label>
          <select id="filter-sex" class="filter-select">
            <option value="">Todos</option>
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="filter-age-group">Grupo de edad</label>
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
          <label for="filter-income">Decil de ingreso</label>
          <select id="filter-income" class="filter-select">
            <option value="">Todos</option>
            ${[1,2,3,4,5,6,7,8,9,10].map(d => `<option value="${d}">${d}</option>`).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label for="filter-education">Nivel educativo</label>
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
          <label for="filter-connectivity">Nivel de conectividad</label>
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
          <label for="filter-agent-type">Tipo de agente</label>
          <select id="filter-agent-type" class="filter-select">
            <option value="">Todos</option>
            <option value="resident">Residente</option>
            <option value="retiree">Jubilado</option>
            <option value="student">Estudiante</option>
            <option value="entrepreneur">Emprendedor</option>
            <option value="worker">Trabajador</option>
          </select>
        </div>
        
        <div class="filters-results">
          <span id="results-count">${filteredAgents.length.toLocaleString()} agentes</span>
        </div>
      </aside>
      
      <!-- Main: Tabla + Paginación -->
      <main class="agents-content">
        <div class="agents-table-wrapper">
          <div class="agents-table-container">
            <table class="agents-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Región</th>
                  <th>Comuna</th>
                  <th>Sexo</th>
                  <th>Edad</th>
                  <th>Grupo</th>
                  <th>Tipo</th>
                  <th>Conectividad</th>
                </tr>
              </thead>
              <tbody id="agents-table-body">
                ${renderTableRows()}
              </tbody>
            </table>
            
            ${filteredAgents.length === 0 ? `
              <div class="no-results">
                <p>No se encontraron agentes con los filtros seleccionados</p>
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
 * Render table rows with pagination
 */
function renderTableRows(): string {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayAgents = filteredAgents.slice(startIndex, endIndex);
  
  return displayAgents.map(agent => `
    <tr class="agent-row" data-agent-id="${agent.agent_id}">
      <td class="agent-id">${agent.agent_id}</td>
      <td>${agent.region_name}</td>
      <td>${agent.comuna_name}</td>
      <td>${formatSex(agent.sex)}</td>
      <td>${agent.age}</td>
      <td>${formatAgeGroup(agent.age_group)}</td>
      <td>${formatAgentType(agent.agent_type)}</td>
      <td>${formatConnectivity(agent.connectivity_level)}</td>
    </tr>
  `).join('');
}

/**
 * Render pagination controls
 */
function renderPagination(): string {
  const totalItems = filteredAgents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  return `
    <div class="pagination-container">
      <div class="pagination-info">
        Mostrando <strong>${startItem}-${endItem}</strong> de <strong>${totalItems}</strong> agentes
      </div>
      
      <div class="pagination-controls">
        <button class="pagination-btn" id="pagination-prev" ${currentPage === 1 ? 'disabled' : ''}>
          ← Anterior
        </button>
        
        <span class="pagination-page">Página ${currentPage} de ${totalPages}</span>
        
        <button class="pagination-btn" id="pagination-next" ${currentPage >= totalPages ? 'disabled' : ''}>
          Siguiente →
        </button>
      </div>
      
      <div class="pagination-size">
        <label for="items-per-page">Mostrar:</label>
        <select id="items-per-page" class="pagination-select">
          <option value="20" ${itemsPerPage === 20 ? 'selected' : ''}>20</option>
          <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50</option>
          <option value="100" ${itemsPerPage === 100 ? 'selected' : ''}>100</option>
        </select>
        <span>por página</span>
      </div>
    </div>
  `;
}

/**
 * Render agent detail panel
 */
function renderAgentDetail(agent: SyntheticAgent): string {
  return `
    <div class="detail-header">
      <h2>${agent.agent_id}</h2>
      <button class="btn-close-detail" id="close-detail">✕</button>
    </div>
    
    <div class="detail-content">
      <section class="detail-section">
        <h3>Identidad / Metadata</h3>
        <dl class="detail-list">
          <dt>ID</dt><dd>${agent.agent_id}</dd>
          <dt>Batch</dt><dd>${agent.synthetic_batch_id}</dd>
          <dt>Versión</dt><dd>${agent.source_version}</dd>
          <dt>Creado</dt><dd>${formatDate(agent.created_at)}</dd>
        </dl>
      </section>
      
      <section class="detail-section">
        <h3>Territorio</h3>
        <dl class="detail-list">
          <dt>País</dt><dd>${agent.country_code}</dd>
          <dt>Región</dt><dd>${agent.region_name} (${agent.region_code})</dd>
          <dt>Comuna</dt><dd>${agent.comuna_name} (${agent.comuna_code})</dd>
          <dt>Urbanicidad</dt><dd>${formatUrbanicity(agent.urbanicity)}</dd>
        </dl>
      </section>
      
      <section class="detail-section">
        <h3>Demografía</h3>
        <dl class="detail-list">
          <dt>Sexo</dt><dd>${formatSex(agent.sex)}</dd>
          <dt>Edad</dt><dd>${agent.age} años</dd>
          <dt>Grupo</dt><dd>${formatAgeGroup(agent.age_group)}</dd>
        </dl>
      </section>
      
      <section class="detail-section">
        <h3>Hogar</h3>
        <dl class="detail-list">
          <dt>Tamaño</dt><dd>${agent.household_size !== undefined && agent.household_size !== null ? agent.household_size : 'No disponible'} personas</dd>
          <dt>Tipo</dt><dd>${formatHouseholdType(agent.household_type)}</dd>
        </dl>
      </section>
      
      <section class="detail-section">
        <h3>Socioeconómico</h3>
        <dl class="detail-list">
          <dt>Decil ingreso</dt><dd>${agent.income_decile !== undefined && agent.income_decile !== null ? agent.income_decile : 'No disponible'}</dd>
          <dt>Pobreza</dt><dd>${formatPovertyStatus(agent.poverty_status)}</dd>
          <dt>Educación</dt><dd>${formatEducationLevel(agent.education_level)}</dd>
          <dt>Ocupación</dt><dd>${formatOccupationStatus(agent.occupation_status)}</dd>
          <dt>Nivel socioec.</dt><dd>${formatSocioeconomicLevel(agent.socioeconomic_level)}</dd>
        </dl>
      </section>
      
      <section class="detail-section">
        <h3>Digital</h3>
        <dl class="detail-list">
          <dt>Conectividad</dt><dd>${formatConnectivity(agent.connectivity_level)}</dd>
          <dt>Exposición digital</dt><dd>${formatDigitalExposure(agent.digital_exposure_level)}</dd>
          <dt>Canal preferido</dt><dd>${formatSurveyChannel(agent.preferred_survey_channel)}</dd>
        </dl>
      </section>
      
      <section class="detail-section">
        <h3>Funcional</h3>
        <dl class="detail-list">
          <dt>Tipo de agente</dt><dd>${formatAgentType(agent.agent_type) || 'No disponible'}</dd>
        </dl>
      </section>
      
      <section class="detail-section">
        <h3>Trazabilidad</h3>
        <dl class="detail-list">
          <dt>Backbone key</dt><dd>${agent.backbone_key !== undefined && agent.backbone_key !== null ? agent.backbone_key : 'No disponible'}</dd>
          <dt>SUBTEL profile</dt><dd>${agent.subtel_profile_key !== undefined && agent.subtel_profile_key !== null ? agent.subtel_profile_key : 'No disponible'}</dd>
          <dt>CASEN profile</dt><dd>${agent.casen_profile_key !== undefined && agent.casen_profile_key !== null ? agent.casen_profile_key : 'No disponible'}</dd>
          <dt>Notas</dt><dd class="notes">${agent.generation_notes !== undefined && agent.generation_notes !== null ? agent.generation_notes : 'Sin notas'}</dd>
        </dl>
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
    </div>
  `;
}

/**
 * Render error state
 */
function renderErrorState(error: unknown): string {
  return `
    <div class="state-container state-error">
      <div class="state-icon">⚠️</div>
      <h3 class="state-title">Error al cargar agentes</h3>
      <p class="state-message">${error instanceof Error ? error.message : 'Error desconocido'}</p>
      <p class="state-hint">Asegúrate de haber ejecutado el pipeline: npm run pipeline</p>
      <button class="btn btn-primary state-action" id="retry-agents-btn">Reintentar</button>
    </div>
  `;
}

/**
 * Render empty state
 */
function renderEmptyState(): string {
  return `
    <div class="state-container state-empty">
      <div class="state-icon">👤</div>
      <h3 class="state-title">No hay agentes disponibles</h3>
      <p class="state-message">No se encontraron agentes sintéticos en el sistema.</p>
      <p class="state-hint">Ejecuta el pipeline para generar la población sintética.</p>
      <button class="btn btn-primary state-action" id="retry-agents-btn">Reintentar</button>
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
  
  // Reset filters button
  const resetBtn = page.querySelector('#reset-filters');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
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
}

/**
 * Apply filters and update table
 * Sprint 10B: Ahora usa agentRepository con filtros en Supabase
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
  
  // Cargar agents filtrados desde Supabase (con fallback local)
  const result = await getAgents({ 
    page: 1, 
    pageSize: 30000, // Cargar todos los agentes filtrados
    filters 
  });
  
  filteredAgents = result.data;
  
  // Reset to page 1 when filters change
  currentPage = 1;
  
  // Update results count
  const resultsCount = page.querySelector('#results-count');
  if (resultsCount) {
    resultsCount.textContent = `${result.total} agentes`;
  }
  
  // Update table and pagination
  updateTableAndPagination(page);
  
  // Log para debugging
  console.log(`[AgentsPage] Filtros aplicados: ${filteredAgents.length} agentes`);
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
}

/**
 * Attach pagination event listeners
 */
function attachPaginationListeners(page: HTMLElement): void {
  // Previous page button
  const prevBtn = page.querySelector('#pagination-prev') as HTMLButtonElement | null;
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        updateTableAndPagination(page);
      }
    });
  }
  
  // Next page button
  const nextBtn = page.querySelector('#pagination-next') as HTMLButtonElement | null;
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredAgents.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        updateTableAndPagination(page);
      }
    });
  }
  
  // Items per page selector
  const itemsPerPageSelect = page.querySelector('#items-per-page') as HTMLSelectElement | null;
  if (itemsPerPageSelect) {
    itemsPerPageSelect.addEventListener('change', () => {
      itemsPerPage = parseInt(itemsPerPageSelect.value);
      currentPage = 1; // Reset to first page when changing page size
      updateTableAndPagination(page);
    });
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
  if (!sex) return 'No disponible';
  return sex === 'male' ? 'Masculino' : 'Femenino';
}

function formatAgeGroup(ageGroup: string | null): string {
  if (!ageGroup) return 'No disponible';
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
  if (!type) return 'No disponible';
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
  if (!level) return 'No disponible';
  const map: Record<string, string> = {
    none: 'Sin conexión',
    low: 'Bajo',
    medium: 'Medio',
    high: 'Alto',
    very_high: 'Muy alto'
  };
  return map[level] || level;
}

function formatDigitalExposure(level: string | null): string {
  if (!level) return 'No disponible';
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
  if (!channel) return 'No disponible';
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
  if (!s) return 'No disponible';
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
  if (!l) return 'No disponible';
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
  if (!s) return 'No disponible';
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
  if (!l) return 'No disponible';
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
}