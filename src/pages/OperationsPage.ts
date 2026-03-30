/**
 * Operations Page - Dashboard de Operaciones
 * Semana 2 - Etapa 1: MVP Dashboard Operativo
 *
 * Vista de solo lectura para monitorear runs de encuestas.
 * NO permite ejecutar encuestas (eso está en SurveysPage).
 */

import type { SurveyRunSummary, OperationsStats } from '../types/operations';
import { operationsService } from '../services/operations/operationsService';
import { createRunTable, addRunTableStyles } from '../components/RunTable';
import { showRunDetailModal } from '../components/RunDetailModal';

// Estado local
let runs: SurveyRunSummary[] = [];
let stats: OperationsStats | null = null;
let loading = false;
let error: string | null = null;
let refreshInterval: number | null = null;

/**
 * Crea la página de operaciones
 */
export async function createOperationsPage(): Promise<HTMLElement> {
  const page = document.createElement('div');
  page.className = 'page operations-page';
  page.id = 'operations-page';

  // Agregar estilos del componente RunTable
  addRunTableStyles();

  // Cargar datos iniciales
  await loadData();

  // Renderizar contenido
  renderContent(page);

  // Iniciar auto-refresh cada 30 segundos
  startAutoRefresh();

  return page;
}

/**
 * Carga los datos de runs y estadísticas
 */
async function loadData(): Promise<void> {
  console.log('[DEBUG OperationsPage] loadData called');
  loading = true;
  error = null;
  refreshPage();

  try {
    // Cargar runs y stats en paralelo
    console.log('[DEBUG OperationsPage] Calling operationsService.getRecentRuns...');
    const [runsData, statsData] = await Promise.all([
      operationsService.getRecentRuns(20),
      operationsService.getStats()
    ]);
    
    console.log('[DEBUG OperationsPage] Data loaded:', { runsCount: runsData.length, stats: statsData });
    console.log('[DEBUG OperationsPage] First run:', { 
      survey_name: runsData[0]?.survey_name,
      survey_id: (runsData[0] as any)?.survey_id,
      id: runsData[0]?.id
    });

    runs = runsData;
    stats = statsData;
  } catch (err) {
    console.error('Error loading operations data:', err);
    error = err instanceof Error ? err.message : 'Error desconocido al cargar datos';
  } finally {
    loading = false;
    refreshPage();
  }
}

/**
 * Renderiza el contenido de la página
 */
function renderContent(container: HTMLElement): void {
  container.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.className = 'operations-header';
  header.innerHTML = `
    <div class="operations-header-top">
      <div class="operations-title-section">
        <h1 class="page-title">
          <span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 8px;">monitoring</span>
          Operaciones
        </h1>
        <p class="page-subtitle">Monitoreo de runs de encuestas y estado del sistema</p>
      </div>
      <div class="operations-actions">
        <button class="btn btn-secondary btn-refresh" id="btn-refresh" ${loading ? 'disabled' : ''}>
          <span class="btn-icon material-symbols-outlined ${loading ? 'spin' : ''}">refresh</span>
          ${loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>
    </div>
  `;
  container.appendChild(header);

  // Stats cards
  if (stats) {
    const statsSection = document.createElement('div');
    statsSection.className = 'operations-stats-section';
    statsSection.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">${stats.total}</span>
          <span class="stat-label">Total Runs</span>
        </div>
        <div class="stat-card stat-card-success">
          <span class="stat-value">${stats.completed}</span>
          <span class="stat-label">Completados</span>
        </div>
        <div class="stat-card stat-card-error">
          <span class="stat-value">${stats.errors}</span>
          <span class="stat-label">Errores</span>
        </div>
        <div class="stat-card stat-card-info">
          <span class="stat-value">${stats.in_progress}</span>
          <span class="stat-label">En Progreso</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${formatConfidence(stats.avg_confidence)}</span>
          <span class="stat-label">Confidence Promedio</span>
        </div>
      </div>
    `;
    container.appendChild(statsSection);
  }

  // Content area
  const content = document.createElement('div');
  content.className = 'operations-content';
  content.id = 'operations-content';
  container.appendChild(content);

  // Tabs
  const tabs = document.createElement('div');
  tabs.className = 'operations-tabs';
  tabs.innerHTML = `
    <button class="tab-btn active" data-tab="runs">
      <span class="tab-icon material-symbols-outlined">list</span>
      Runs Recientes
    </button>
    <button class="tab-btn" data-tab="engines">
      <span class="tab-icon material-symbols-outlined">settings</span>
      Engines
    </button>
  `;
  content.appendChild(tabs);

  // Tab content
  const tabContent = document.createElement('div');
  tabContent.className = 'operations-tab-content';
  tabContent.id = 'operations-tab-content';
  content.appendChild(tabContent);

  // Render tabla de runs
  const runTable = createRunTable({
    runs,
    loading,
    error,
    onRunClick: handleRunClick
  });
  tabContent.appendChild(runTable);

  // Attach event listeners
  attachEventListeners(container);
}

/**
 * Maneja el click en un run de la tabla
 * Etapa 2: Muestra modal de detalle en lugar de alert
 */
function handleRunClick(run: SurveyRunSummary): void {
  // Mostrar modal de detalle del run
  showRunDetailModal(run);
}

/**
 * Agrega event listeners a los elementos de la página
 */
function attachEventListeners(container: HTMLElement): void {
  // Botón de refresh
  const refreshBtn = container.querySelector('#btn-refresh');
  refreshBtn?.addEventListener('click', () => {
    loadData();
  });

  // Tabs
  const tabBtns = container.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = (e.currentTarget as HTMLElement).dataset.tab;
      if (tab) {
        switchTab(tab);
      }
    });
  });
}

/**
 * Cambia entre tabs
 */
function switchTab(tab: string): void {
  // Actualizar estado activo de tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    const htmlBtn = btn as HTMLElement;
    htmlBtn.classList.toggle('active', htmlBtn.dataset.tab === tab);
  });

  // Actualizar contenido del tab
  const tabContent = document.getElementById('operations-tab-content');
  if (!tabContent) return;

  tabContent.innerHTML = '';

  switch (tab) {
    case 'runs':
      const runTable = createRunTable({
        runs,
        loading,
        error,
        onRunClick: handleRunClick
      });
      tabContent.appendChild(runTable);
      break;

    case 'engines':
      tabContent.innerHTML = `
        <div class="engines-info">
          <h3>Configuración de Engines</h3>
          <div class="engine-cards">
            <div class="engine-card">
              <div class="engine-card-header">
                <span class="engine-version">v1.1</span>
                <span class="engine-status engine-stable">Estable</span>
              </div>
              <p class="engine-description">Engine síncrono con respuestas inmediatas</p>
              <ul class="engine-features">
                <li>Respuestas síncronas</li>
                <li>Ideal para pruebas rápidas</li>
                <li>Límite: 100 agentes</li>
              </ul>
            </div>
            <div class="engine-card">
              <div class="engine-card-header">
                <span class="engine-version">v1.2</span>
                <span class="engine-status engine-beta">Beta</span>
              </div>
              <p class="engine-description">Engine asíncrono con soporte para eventos</p>
              <ul class="engine-features">
                <li>Respuestas asíncronas</li>
                <li>Soporte para eventos</li>
                <li>Sin límite de agentes</li>
              </ul>
            </div>
          </div>
        </div>
      `;
      break;
  }
}

/**
 * Inicia el auto-refresh cada 30 segundos
 */
function startAutoRefresh(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  refreshInterval = window.setInterval(() => {
    // Solo refrescar si no está cargando
    if (!loading) {
      loadData();
    }
  }, 30000); // 30 segundos
}

/**
 * Detiene el auto-refresh
 */
function stopAutoRefresh(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

/**
 * Refresca la página actual
 */
function refreshPage(): void {
  const page = document.getElementById('operations-page');
  if (page) {
    renderContent(page);
  }
}

/**
 * Formatea el confidence como porcentaje
 */
function formatConfidence(confidence: number): string {
  if (confidence === 0) return '—';
  return `${(confidence * 100).toFixed(0)}%`;
}

/**
 * Cleanup function (required by main.ts)
 */
export function cleanupOperationsPage(): void {
  stopAutoRefresh();
  runs = [];
  stats = null;
  loading = false;
  error = null;
  console.log('Operations page cleaned up');
}
