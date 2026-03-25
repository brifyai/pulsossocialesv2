/**
 * Benchmarks Page - Sprint 7 + 12B
 * 
 * Vista para comparar resultados sintéticos con benchmarks de referencia.
 * Sprint 12B: Mejoras de robustez - estados loading/error mejorados
 */

import type { Benchmark, SurveyBenchmarkComparison, IndicatorComparison } from '../types/benchmark';
import { 
  getAllBenchmarks, 
  compareSurveyWithBenchmark,
  formatGap,
  getGapColor,
  getCategories
} from '../app/benchmark/benchmarkService';
import { getAllSurveys, getSurveyResults } from '../app/survey/surveyService';

// ===========================================
// State
// ===========================================

let selectedBenchmarkId: string | null = null;
let selectedSurveyId: string | null = null;

// State for current comparison (stored for future features)
const comparisonHistory: SurveyBenchmarkComparison[] = [];

// ===========================================
// Page Creation
// ===========================================

export async function createBenchmarksPage(): Promise<HTMLElement> {
  const page = document.createElement('div');
  page.className = 'page benchmarks-page';
  page.id = 'benchmarks-page';
  
  page.innerHTML = renderPage();

  // Initialize
  await initializePage(page);
  
  return page;
}

function renderPage(): string {
  return `
    <div class="benchmarks-container">
      <header class="benchmarks-header">
        <h1 class="benchmarks-title">
          <span class="icon material-symbols-outlined">bar_chart</span>
          Benchmarks
        </h1>
        <p class="benchmarks-subtitle">
          Compara resultados sintéticos con benchmarks de referencia
        </p>
      </header>

      <div class="benchmarks-content">
        <!-- Selector Section -->
        <section class="benchmarks-selector">
          <div class="selector-grid">
            <div class="selector-group">
              <label class="selector-label">Encuesta Sintética</label>
              <select id="survey-select" class="selector-select">
                <option value="">Selecciona una encuesta...</option>
              </select>
            </div>
            <div class="selector-group">
              <label class="selector-label">Benchmark de Referencia</label>
              <select id="benchmark-select" class="selector-select">
                <option value="">Selecciona un benchmark...</option>
              </select>
            </div>
          </div>
          <button id="compare-btn" class="compare-button" disabled>
            <span class="icon material-symbols-outlined">search</span>
            Comparar
          </button>
        </section>

        <!-- Results Section -->
        <section id="comparison-results" class="comparison-results" style="display: none;">
          <!-- Results will be rendered here -->
        </section>

        <!-- Benchmarks List Section -->
        <section class="benchmarks-list-section">
          <h2 class="section-title">Benchmarks Disponibles</h2>
          <div id="benchmarks-list" class="benchmarks-list">
            ${renderLoadingState()}
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderLoadingState(): string {
  return `
    <div class="benchmarks-loading-state">
      <div class="loading-spinner"></div>
      <p>Cargando benchmarks...</p>
    </div>
  `;
}

function renderErrorState(message: string): string {
  return `
    <div class="benchmarks-error-state">
      <span class="error-icon material-symbols-outlined">warning</span>
      <h3>Error al cargar benchmarks</h3>
      <p>${message}</p>
      <button class="btn btn-secondary" id="retry-benchmarks-btn">Reintentar</button>
    </div>
  `;
}

async function initializePage(page: HTMLElement): Promise<void> {
  try {
    // Populate survey select
    const surveySelect = page.querySelector('#survey-select') as HTMLSelectElement;
    const surveys = await getAllSurveys();
    
    if (surveys.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No hay encuestas disponibles';
      option.disabled = true;
      surveySelect.appendChild(option);
    } else {
      surveys.forEach(survey => {
        const option = document.createElement('option');
        option.value = survey.id;
        option.textContent = survey.name;
        surveySelect.appendChild(option);
      });
    }

    // Populate benchmark select
    const benchmarkSelect = page.querySelector('#benchmark-select') as HTMLSelectElement;
    const benchmarks = await getAllBenchmarks();

    benchmarks.forEach(benchmark => {
      const option = document.createElement('option');
      option.value = benchmark.id;
      option.textContent = `${benchmark.source.name} (${benchmark.source.year})`;
      benchmarkSelect.appendChild(option);
    });

    // Render benchmarks list
    await renderBenchmarksList(page);

    // Event listeners
    surveySelect.addEventListener('change', (e) => {
      selectedSurveyId = (e.target as HTMLSelectElement).value;
      updateCompareButton(page);
    });

    benchmarkSelect.addEventListener('change', (e) => {
      selectedBenchmarkId = (e.target as HTMLSelectElement).value;
      updateCompareButton(page);
    });

    const compareBtn = page.querySelector('#compare-btn') as HTMLButtonElement;
    compareBtn.addEventListener('click', () => runComparison(page));
    
  } catch (error) {
    console.error('[BenchmarksPage] Error initializing:', error);
    const listContainer = page.querySelector('#benchmarks-list') as HTMLElement;
    if (listContainer) {
      listContainer.innerHTML = renderErrorState(
        error instanceof Error ? error.message : 'Error desconocido al cargar datos'
      );
      
      // Attach retry listener
      setTimeout(() => {
        const retryBtn = listContainer.querySelector('#retry-benchmarks-btn');
        retryBtn?.addEventListener('click', () => {
          location.reload();
        });
      }, 0);
    }
  }
}

function updateCompareButton(page: HTMLElement): void {
  const compareBtn = page.querySelector('#compare-btn') as HTMLButtonElement;
  compareBtn.disabled = !selectedSurveyId || !selectedBenchmarkId;
}

async function runComparison(page: HTMLElement): Promise<void> {
  if (!selectedSurveyId || !selectedBenchmarkId) return;

  const resultsContainer = page.querySelector('#comparison-results') as HTMLElement;
  resultsContainer.innerHTML = `
    <div class="comparison-loading">
      <div class="loading-spinner"></div>
      <p>Analizando resultados...</p>
    </div>
  `;
  resultsContainer.style.display = 'block';

  try {
    // Get survey results (async - Sprint 11C)
    const surveyResults = await getSurveyResults(selectedSurveyId);
    if (!surveyResults) {
      resultsContainer.innerHTML = renderComparisonError(
        'No hay resultados para esta encuesta',
        'Ejecuta la encuesta primero para poder comparar con benchmarks.'
      );
      return;
    }

    // Run comparison
    const comparison = await compareSurveyWithBenchmark(surveyResults, selectedBenchmarkId);

    if (!comparison) {
      resultsContainer.innerHTML = renderComparisonError(
        'No se pudo realizar la comparación',
        'El benchmark seleccionado no tiene indicadores compatibles con esta encuesta.'
      );
      return;
    }

    comparisonHistory.push(comparison);
    renderComparisonResults(resultsContainer, comparison);
    
  } catch (error) {
    console.error('[BenchmarksPage] Error in comparison:', error);
    resultsContainer.innerHTML = renderComparisonError(
      'Error al comparar',
      error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
    );
  }
}

function renderComparisonError(title: string, message: string): string {
  return `
    <div class="comparison-error">
      <span class="error-icon material-symbols-outlined">warning</span>
      <h3>${title}</h3>
      <p>${message}</p>
      <button class="btn btn-secondary" onclick="this.closest('.comparison-results').style.display='none'">
        Cerrar
      </button>
    </div>
  `;
}

function renderComparisonResults(container: HTMLElement, comparison: SurveyBenchmarkComparison): void {
  const summary = comparison.summary;
  
  container.innerHTML = `
    <div class="comparison-card">
      <header class="comparison-header">
        <h3 class="comparison-title">Resultados de Comparación</h3>
        <div class="comparison-meta">
          <span class="meta-item">
            <span class="icon material-symbols-outlined">assignment</span>
            ${comparison.surveyName}
          </span>
          <span class="meta-item">
            <span class="icon material-symbols-outlined">bar_chart</span>
            ${comparison.benchmarkName}
          </span>
          <span class="meta-item">
            <span class="icon material-symbols-outlined">schedule</span>
            ${new Date(comparison.comparedAt).toLocaleString()}
          </span>
        </div>
      </header>

      <div class="comparison-summary">
        <div class="summary-stat">
          <span class="stat-value">${summary.matchedIndicators}/${summary.totalIndicators}</span>
          <span class="stat-label">Indicadores comparados</span>
        </div>
        <div class="summary-stat ${summary.aboveBenchmark > 0 ? 'above' : ''}">
          <span class="stat-value">${summary.aboveBenchmark}</span>
          <span class="stat-label">Sobre benchmark</span>
        </div>
        <div class="summary-stat ${summary.belowBenchmark > 0 ? 'below' : ''}">
          <span class="stat-value">${summary.belowBenchmark}</span>
          <span class="stat-label">Bajo benchmark</span>
        </div>
        <div class="summary-stat ${summary.matchBenchmark > 0 ? 'match' : ''}">
          <span class="stat-value">${summary.matchBenchmark}</span>
          <span class="stat-label">Coinciden</span>
        </div>
        <div class="summary-stat">
          <span class="stat-value">±${summary.averageGap}</span>
          <span class="stat-label">Gap promedio</span>
        </div>
      </div>

      <div class="comparison-indicators">
        <h4 class="indicators-title">Detalle por Indicador</h4>
        <div class="indicators-list">
          ${comparison.comparisons.map(comp => renderIndicatorComparison(comp)).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderIndicatorComparison(comp: IndicatorComparison): string {
  const gapFormatted = formatGap(comp.gap);
  const gapColor = getGapColor(comp.gap);
  const gapClass = comp.gap.direction;
  
  return `
    <div class="indicator-item ${gapClass}">
      <div class="indicator-header">
        <span class="indicator-category">${comp.category}</span>
        <span class="indicator-gap" style="color: ${gapColor}">
          ${comp.gap.direction === 'above' ? '▲' : comp.gap.direction === 'below' ? '▼' : '●'}
          ${gapFormatted}
        </span>
      </div>
      <h5 class="indicator-name">${comp.indicatorName}</h5>
      <div class="indicator-values">
        <div class="value-box synthetic">
          <span class="value-label">Sintético</span>
          <span class="value-number">${comp.syntheticValue}${comp.unit === 'percentage' ? '%' : ''}</span>
          <span class="value-meta">n=${comp.syntheticSampleSize}</span>
        </div>
        <div class="value-box benchmark">
          <span class="value-label">Benchmark</span>
          <span class="value-number">${comp.benchmarkValue}${comp.unit === 'percentage' ? '%' : ''}</span>
          <span class="value-meta">n=${comp.benchmarkSampleSize || 'N/A'}</span>
        </div>
        <div class="value-box gap">
          <span class="value-label">Diferencia</span>
          <span class="value-number" style="color: ${gapColor}">
            ${comp.gap.absolute > 0 ? '+' : ''}${comp.gap.absolute}${comp.unit === 'percentage' ? '%' : ''}
          </span>
          <span class="value-meta">${comp.gap.significance === 'high' ? 'Alta' : comp.gap.significance === 'medium' ? 'Media' : 'Baja'}</span>
        </div>
      </div>
    </div>
  `;
}

function renderEmptyState(): string {
  return `
    <div class="benchmarks-empty-state">
      <span class="empty-icon material-symbols-outlined">help</span>
      <h3>No hay benchmarks disponibles</h3>
      <p>Los benchmarks de referencia se cargan desde archivos de configuración.</p>
    </div>
  `;
}

async function renderBenchmarksList(page: HTMLElement): Promise<void> {
  const listContainer = page.querySelector('#benchmarks-list') as HTMLElement;

  try {
    const benchmarks = await getAllBenchmarks();
    const categories = await getCategories();

    if (benchmarks.length === 0) {
      listContainer.innerHTML = renderEmptyState();
      return;
    }

    listContainer.innerHTML = categories.map(category => {
      const categoryBenchmarks = benchmarks.filter(b =>
        b.indicators.some(i => i.category === category)
      );

      if (categoryBenchmarks.length === 0) return '';

      return `
        <div class="benchmark-category">
          <h3 class="category-title">${category}</h3>
          <div class="category-benchmarks">
            ${categoryBenchmarks.map(b => renderBenchmarkCard(b)).join('')}
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('[BenchmarksPage] Error rendering benchmarks list:', error);
    listContainer.innerHTML = renderErrorState(
      error instanceof Error ? error.message : 'Error al cargar benchmarks'
    );
  }
}

function renderBenchmarkCard(benchmark: Benchmark): string {
  return `
    <div class="benchmark-card" data-id="${benchmark.id}">
      <div class="benchmark-header">
        <h4 class="benchmark-name">${benchmark.source.name}</h4>
        <span class="benchmark-year">${benchmark.source.year}</span>
      </div>
      <p class="benchmark-org">${benchmark.source.organization}</p>
      <p class="benchmark-description">${benchmark.source.description || ''}</p>
      <div class="benchmark-meta">
        <span class="meta-tag">
          <span class="icon material-symbols-outlined">location_on</span>
          ${benchmark.coverage.geographic.join(', ')}
        </span>
        <span class="meta-tag">
          <span class="icon material-symbols-outlined">trending_up</span>
          ${benchmark.indicators.length} indicadores
        </span>
      </div>
    </div>
  `;
}

// ===========================================
// Cleanup
// ===========================================

export function cleanupBenchmarksPage(): void {
  comparisonHistory.length = 0;
  selectedBenchmarkId = null;
  selectedSurveyId = null;
  console.log('[BenchmarksPage] Cleaned up');
}
