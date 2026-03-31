/**
 * Operations Page - Centro de Operaciones Moderno
 * Dashboard de operaciones con dark theme y jerarquía visual clara
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
let lastUpdated: Date | null = null;

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
    lastUpdated = new Date();
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

  // Header - Centro de Operaciones
  const header = document.createElement('div');
  header.className = 'operations-header';
  header.innerHTML = `
    <div class="operations-header-top">
      <div class="operations-title-section">
        <h1 class="page-title">
          <span class="material-symbols-outlined">dashboard</span>
          Centro de Operaciones
        </h1>
        <p class="page-subtitle">Monitorea ejecuciones, estabilidad del motor, escenarios y eventos en tiempo real</p>
      </div>
      <div class="operations-actions">
        <span class="last-updated" id="last-updated">
          ${lastUpdated ? `Actualizado: ${formatTime(lastUpdated)}` : ''}
        </span>
        <button class="btn btn-secondary btn-refresh" id="btn-refresh" ${loading ? 'disabled' : ''}>
          <span class="btn-icon material-symbols-outlined ${loading ? 'spin' : ''}">refresh</span>
          ${loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>
    </div>
  `;
  container.appendChild(header);

  // Panel de Alertas/Insights
  const alertsSection = createAlertsSection();
  if (alertsSection) {
    container.appendChild(alertsSection);
  }

  // Stats cards - KPI Dashboard
  if (stats) {
    const statsSection = document.createElement('div');
    statsSection.className = 'operations-stats-section';
    statsSection.innerHTML = `
      <div class="stats-grid">
        <!-- Total Runs -->
        <div class="stat-card stat-card-total">
          <div class="stat-card-header">
            <div class="stat-card-icon">
              <span class="material-symbols-outlined">analytics</span>
            </div>
          </div>
          <span class="stat-value">${stats.total}</span>
          <span class="stat-label">Total Runs</span>
          <span class="stat-card-subtitle">Ejecuciones registradas</span>
        </div>

        <!-- Completados -->
        <div class="stat-card stat-card-success">
          <div class="stat-card-header">
            <div class="stat-card-icon">
              <span class="material-symbols-outlined">check_circle</span>
            </div>
            ${stats.completed > 0 ? `<span class="stat-card-trend positive">+${Math.round((stats.completed / stats.total) * 100)}%</span>` : ''}
          </div>
          <span class="stat-value">${stats.completed}</span>
          <span class="stat-label">Completados</span>
          <span class="stat-card-subtitle">Ejecuciones exitosas</span>
        </div>

        <!-- Errores -->
        <div class="stat-card stat-card-error">
          <div class="stat-card-header">
            <div class="stat-card-icon">
              <span class="material-symbols-outlined">error</span>
            </div>
            ${stats.errors > 0 ? `<span class="stat-card-trend negative">Requiere atención</span>` : ''}
          </div>
          <span class="stat-value">${stats.errors}</span>
          <span class="stat-label">Errores</span>
          <span class="stat-card-subtitle">Runs con fallos</span>
        </div>

        <!-- En Progreso -->
        <div class="stat-card stat-card-info">
          <div class="stat-card-header">
            <div class="stat-card-icon">
              <span class="material-symbols-outlined">sync</span>
            </div>
            ${stats.in_progress > 0 ? `<span class="stat-card-trend">En ejecución</span>` : ''}
          </div>
          <span class="stat-value">${stats.in_progress}</span>
          <span class="stat-label">En Progreso</span>
          <span class="stat-card-subtitle">Runs activos</span>
        </div>

        <!-- Confidence Promedio -->
        <div class="stat-card stat-card-purple">
          <div class="stat-card-header">
            <div class="stat-card-icon">
              <span class="material-symbols-outlined">verified</span>
            </div>
          </div>
          <span class="stat-value">${formatConfidence(stats.avg_confidence)}</span>
          <span class="stat-label">Confidence</span>
          <span class="stat-card-subtitle">Promedio global</span>
        </div>

        <!-- Último Run -->
        <div class="stat-card stat-card-warning">
          <div class="stat-card-header">
            <div class="stat-card-icon">
              <span class="material-symbols-outlined">schedule</span>
            </div>
          </div>
          <span class="stat-value">${getLastRunTime()}</span>
          <span class="stat-label">Último Run</span>
          <span class="stat-card-subtitle">Tiempo transcurrido</span>
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
      ${runs.length > 0 ? `<span class="tab-badge">${runs.length}</span>` : ''}
    </button>
    <button class="tab-btn" data-tab="engines">
      <span class="tab-icon material-symbols-outlined">memory</span>
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
 * Crea la sección de alertas/insights
 */
function createAlertsSection(): HTMLElement | null {
  if (!stats && !runs.length) return null;

  const alerts: Array<{ type: 'success' | 'warning' | 'error' | 'info'; icon: string; message: string }> = [];

  // Alerta de errores
  if (stats && stats.errors > 0) {
    alerts.push({
      type: 'error',
      icon: 'error',
      message: `${stats.errors} run${stats.errors > 1 ? 's' : ''} con error${stats.errors > 1 ? 'es' : ''} requiere${stats.errors > 1 ? 'n' : ''} atención`
    });
  }

  // Alerta de runs en progreso
  if (stats && stats.in_progress > 0) {
    alerts.push({
      type: 'info',
      icon: 'sync',
      message: `${stats.in_progress} run${stats.in_progress > 1 ? 's' : ''} en ejecución`
    });
  }

  // Alerta de confidence bajo
  if (stats && stats.avg_confidence > 0 && stats.avg_confidence < 0.7) {
    alerts.push({
      type: 'warning',
      icon: 'trending_down',
      message: `Confidence promedio bajo: ${formatConfidence(stats.avg_confidence)}`
    });
  }

  // Alerta de éxito si todo está bien
  if (stats && stats.errors === 0 && stats.completed > 0) {
    alerts.push({
      type: 'success',
      icon: 'check_circle',
      message: `Sistema estable: ${stats.completed} runs completados sin errores`
    });
  }

  // Alerta de último run
  if (runs.length > 0) {
    const lastRun = runs[0];
    const lastRunDate = new Date(lastRun.created_at);
    const hoursSinceLastRun = (Date.now() - lastRunDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastRun > 24) {
      alerts.push({
        type: 'warning',
        icon: 'schedule',
        message: `Última ejecución hace ${Math.round(hoursSinceLastRun)} horas`
      });
    }
  }

  if (alerts.length === 0) return null;

  const section = document.createElement('div');
  section.className = 'operations-alerts';
  section.innerHTML = `
    <div class="alerts-container">
      ${alerts.map(alert => `
        <div class="alert-item alert-${alert.type}">
          <span class="material-symbols-outlined">${alert.icon}</span>
          <span class="alert-message">${alert.message}</span>
        </div>
      `).join('')}
    </div>
  `;

  return section;
}

/**
 * Obtiene el tiempo del último run en formato legible
 */
function getLastRunTime(): string {
  if (runs.length === 0) return '—';

  const lastRun = runs[0];
  const date = new Date(lastRun.created_at);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

/**
 * Formatea una hora
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Maneja el click en un run de la tabla
 */
function handleRunClick(run: SurveyRunSummary): void {
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
  lastUpdated = null;
  console.log('Operations page cleaned up');
}
