/**
 * Benchmarks Page - Rediseño Sprint UX
 *
 * Experiencia de validación y comparación de benchmarks
 * Workflow de 3 pasos: Cargar → Comparar → Explorar
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
import { uploadBenchmarkPdf, createBenchmark, updateBenchmark } from '../services/supabase/repositories/benchmarkRepository';

// ===========================================
// State
// ===========================================

let selectedBenchmarkId: string | null = null;
let selectedSurveyId: string | null = null;
let benchmarksCount = 0;
let lastComparisonDate: Date | null = null;

// State for current comparison (stored for future features)
const comparisonHistory: SurveyBenchmarkComparison[] = [];

// ===========================================
// Page Creation
// ===========================================

export async function createBenchmarksPage(): Promise<HTMLElement> {
  const page = document.createElement('div');
  page.className = 'page benchmarks-page';
  page.id = 'benchmarks-page';

  // Agregar estilos
  addBenchmarksStyles();

  // Renderizar estructura base
  page.innerHTML = renderPageStructure();

  // Inicializar
  await initializePage(page);

  return page;
}

function renderPageStructure(): string {
  return `
    <div class="benchmarks-container">
      <!-- Header -->
      <header class="benchmarks-header">
        <div class="benchmarks-header-content">
          <div class="benchmarks-title-section">
            <h1 class="benchmarks-title">
              <span class="material-symbols-outlined">verified</span>
              Benchmarks
            </h1>
            <p class="benchmarks-subtitle">
              Compara encuestas sintéticas con referencias reales para validar calidad y detectar desvíos
            </p>
          </div>
          <div class="benchmarks-metrics" id="benchmarks-metrics">
            <!-- Se llenará dinámicamente -->
          </div>
        </div>
      </header>

      <!-- Workflow de 3 pasos -->
      <div class="benchmarks-workflow">

        <!-- Paso 1: Cargar Benchmark -->
        <section class="workflow-step step-1">
          <div class="step-header">
            <div class="step-number">1</div>
            <div class="step-title-section">
              <h2 class="step-title">Cargar benchmark de referencia</h2>
              <p class="step-description">
                Sube un PDF o documento con datos de una encuesta o estudio oficial para convertirlo en una referencia utilizable
              </p>
            </div>
          </div>

          <div class="upload-card">
            <div class="upload-form-grid">
              <div class="form-group">
                <label for="benchmark-name">
                  <span class="material-symbols-outlined">label</span>
                  Nombre del benchmark
                </label>
                <input type="text" id="benchmark-name" placeholder="Ej: CASEN 2023" class="form-input">
              </div>

              <div class="form-group">
                <label for="benchmark-org">
                  <span class="material-symbols-outlined">business</span>
                  Organización
                </label>
                <input type="text" id="benchmark-org" placeholder="Ej: Ministerio de Desarrollo Social" class="form-input">
              </div>

              <div class="form-group">
                <label for="benchmark-year">
                  <span class="material-symbols-outlined">calendar_today</span>
                  Año
                </label>
                <input type="number" id="benchmark-year" placeholder="2023" class="form-input" min="2000" max="2099">
              </div>

              <div class="form-group form-group-file">
                <label for="benchmark-file">
                  <span class="material-symbols-outlined">upload_file</span>
                  Archivo PDF
                </label>
                <div class="file-input-wrapper">
                  <input type="file" id="benchmark-file" accept=".pdf" class="form-file-input">
                  <div class="file-dropzone" id="file-dropzone">
                    <span class="material-symbols-outlined">cloud_upload</span>
                    <span class="dropzone-text">Arrastra un PDF o haz clic para seleccionar</span>
                    <span class="dropzone-hint">Formatos: PDF de Cadem, CEP, CASEN, Criteria</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="upload-actions">
              <button id="upload-btn" class="btn btn-primary btn-upload">
                <span class="material-symbols-outlined">cloud_upload</span>
                Subir y procesar benchmark
              </button>
              <span class="upload-hint">
                <span class="material-symbols-outlined">info</span>
                El sistema extraerá indicadores automáticamente del PDF
              </span>
            </div>

            <div id="upload-status" class="upload-status" style="display: none;"></div>
          </div>
        </section>

        <!-- Paso 2: Comparar -->
        <section class="workflow-step step-2">
          <div class="step-header">
            <div class="step-number">2</div>
            <div class="step-title-section">
              <h2 class="step-title">Comparar resultados</h2>
              <p class="step-description">
                Selecciona una encuesta sintética y un benchmark para ver diferencias en aprobación, economía, optimismo y otras métricas
              </p>
            </div>
          </div>

          <div class="compare-card">
            <div class="compare-selectors">
              <div class="compare-field">
                <label for="survey-select">
                  <span class="material-symbols-outlined">assignment</span>
                  Encuesta sintética
                </label>
                <select id="survey-select" class="form-select">
                  <option value="">Selecciona una encuesta...</option>
                </select>
              </div>

              <div class="compare-divider">
                <span class="material-symbols-outlined">compare_arrows</span>
              </div>

              <div class="compare-field">
                <label for="benchmark-select">
                  <span class="material-symbols-outlined">verified</span>
                  Benchmark de referencia
                </label>
                <select id="benchmark-select" class="form-select">
                  <option value="">Selecciona un benchmark...</option>
                </select>
              </div>
            </div>

            <div class="compare-actions">
              <button id="compare-btn" class="btn btn-primary btn-compare" disabled>
                <span class="material-symbols-outlined">search</span>
                Comparar
              </button>
              <p class="compare-help">
                Las comparaciones resaltan diferencias porcentuales, consistencia y nivel de confianza del motor
              </p>
            </div>
          </div>

          <!-- Resultados de comparación -->
          <section id="comparison-results" class="comparison-results" style="display: none;">
            <!-- Se renderizarán dinámicamente -->
          </section>
        </section>

        <!-- Paso 3: Explorar Benchmarks -->
        <section class="workflow-step step-3">
          <div class="step-header">
            <div class="step-number">3</div>
            <div class="step-title-section">
              <h2 class="step-title">Benchmarks disponibles</h2>
              <p class="step-description">
                Explora los benchmarks cargados y su cobertura de indicadores
              </p>
            </div>
          </div>

          <div id="benchmarks-list" class="benchmarks-list-container">
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
      <span class="material-symbols-outlined error-icon">error</span>
      <h3>Error al cargar benchmarks</h3>
      <p>${message}</p>
      <button class="btn btn-secondary" id="retry-benchmarks-btn">Reintentar</button>
    </div>
  `;
}

function renderEmptyState(): string {
  return `
    <div class="benchmarks-empty-state">
      <div class="empty-illustration">
        <span class="material-symbols-outlined">folder_open</span>
      </div>
      <h3>No tienes benchmarks cargados todavía</h3>
      <p class="empty-description">
        Los benchmarks te permiten comparar encuestas sintéticas con datos reales de referencia.
      </p>
      <div class="empty-actions">
        <div class="empty-action-item">
          <span class="material-symbols-outlined">upload_file</span>
          <span>Sube un PDF de Cadem, CEP o CASEN</span>
        </div>
        <div class="empty-action-item">
          <span class="material-symbols-outlined">auto_fix</span>
          <span>Extrae indicadores automáticamente</span>
        </div>
        <div class="empty-action-item">
          <span class="material-symbols-outlined">compare_arrows</span>
          <span>Compara resultados y detecta desviaciones</span>
        </div>
      </div>
      <button class="btn btn-primary" onclick="document.getElementById('benchmark-name').focus()">
        <span class="material-symbols-outlined">add</span>
        Subir primer benchmark
      </button>
    </div>
  `;
}

async function initializePage(page: HTMLElement): Promise<void> {
  try {
    // Cargar datos
    const [surveys, benchmarks] = await Promise.all([
      getAllSurveys(),
      getAllBenchmarks()
    ]);

    benchmarksCount = benchmarks.length;
    if (comparisonHistory.length > 0) {
      lastComparisonDate = new Date(comparisonHistory[comparisonHistory.length - 1].comparedAt);
    }

    // Actualizar métricas
    updateMetrics(page);

    // Poblar selects
    populateSurveySelect(page, surveys);
    populateBenchmarkSelect(page, benchmarks);

    // Renderizar lista de benchmarks
    await renderBenchmarksList(page);

    // Setup event listeners
    setupEventListeners(page);
    setupFileDropzone(page);

  } catch (error) {
    console.error('[BenchmarksPage] Error initializing:', error);
    const listContainer = page.querySelector('#benchmarks-list') as HTMLElement;
    if (listContainer) {
      listContainer.innerHTML = renderErrorState(
        error instanceof Error ? error.message : 'Error desconocido al cargar datos'
      );

      const retryBtn = listContainer.querySelector('#retry-benchmarks-btn');
      retryBtn?.addEventListener('click', () => location.reload());
    }
  }
}

function updateMetrics(page: HTMLElement): void {
  const metricsContainer = page.querySelector('#benchmarks-metrics') as HTMLElement;
  if (!metricsContainer) return;

  if (benchmarksCount === 0) {
    metricsContainer.style.display = 'none';
    return;
  }

  metricsContainer.style.display = 'flex';
  metricsContainer.innerHTML = `
    <div class="metric-item">
      <span class="metric-value">${benchmarksCount}</span>
      <span class="metric-label">Benchmarks cargados</span>
    </div>
    <div class="metric-item">
      <span class="metric-value">${comparisonHistory.length}</span>
      <span class="metric-label">Comparaciones realizadas</span>
    </div>
    ${lastComparisonDate ? `
      <div class="metric-item">
        <span class="metric-value">${formatTimeAgo(lastComparisonDate)}</span>
        <span class="metric-label">Última comparación</span>
      </div>
    ` : ''}
  `;
}

function formatTimeAgo(date: Date): string {
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

function populateSurveySelect(page: HTMLElement, surveys: any[]): void {
  const surveySelect = page.querySelector('#survey-select') as HTMLSelectElement;
  if (!surveySelect) return;

  surveySelect.innerHTML = '<option value="">Selecciona una encuesta...</option>';

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
}

function populateBenchmarkSelect(page: HTMLElement, benchmarks: Benchmark[]): void {
  const benchmarkSelect = page.querySelector('#benchmark-select') as HTMLSelectElement;
  if (!benchmarkSelect) return;

  benchmarkSelect.innerHTML = '<option value="">Selecciona un benchmark...</option>';

  benchmarks.forEach(benchmark => {
    const option = document.createElement('option');
    option.value = benchmark.id;
    option.textContent = `${benchmark.source.name} (${benchmark.source.year})`;
    benchmarkSelect.appendChild(option);
  });
}

function setupEventListeners(page: HTMLElement): void {
  const surveySelect = page.querySelector('#survey-select') as HTMLSelectElement;
  const benchmarkSelect = page.querySelector('#benchmark-select') as HTMLSelectElement;
  const compareBtn = page.querySelector('#compare-btn') as HTMLButtonElement;
  const uploadBtn = page.querySelector('#upload-btn') as HTMLButtonElement;

  surveySelect?.addEventListener('change', (e) => {
    selectedSurveyId = (e.target as HTMLSelectElement).value;
    updateCompareButton(page);
  });

  benchmarkSelect?.addEventListener('change', (e) => {
    selectedBenchmarkId = (e.target as HTMLSelectElement).value;
    updateCompareButton(page);
  });

  compareBtn?.addEventListener('click', () => runComparison(page));
  uploadBtn?.addEventListener('click', () => handlePdfUpload(page));
}

function setupFileDropzone(page: HTMLElement): void {
  const fileInput = page.querySelector('#benchmark-file') as HTMLInputElement;
  const dropzone = page.querySelector('#file-dropzone') as HTMLElement;

  if (!fileInput || !dropzone) return;

  // Click en dropzone abre file input
  dropzone.addEventListener('click', () => fileInput.click());

  // Drag & drop
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      fileInput.files = files;
      updateDropzoneText(dropzone, files[0].name);
    }
  });

  // Cambio en file input
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      updateDropzoneText(dropzone, fileInput.files[0].name);
    }
  });
}

function updateDropzoneText(dropzone: HTMLElement, filename: string): void {
  const textSpan = dropzone.querySelector('.dropzone-text') as HTMLElement;
  if (textSpan) {
    textSpan.textContent = filename;
    textSpan.classList.add('file-selected');
  }
  dropzone.classList.add('has-file');
}

function updateCompareButton(page: HTMLElement): void {
  const compareBtn = page.querySelector('#compare-btn') as HTMLButtonElement;
  if (compareBtn) {
    compareBtn.disabled = !selectedSurveyId || !selectedBenchmarkId;
  }
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
    const surveyResults = await getSurveyResults(selectedSurveyId);
    if (!surveyResults) {
      resultsContainer.innerHTML = renderComparisonError(
        'No hay resultados para esta encuesta',
        'Ejecuta la encuesta primero para poder comparar con benchmarks.'
      );
      return;
    }

    const comparison = await compareSurveyWithBenchmark(surveyResults, selectedBenchmarkId);

    if (!comparison) {
      resultsContainer.innerHTML = renderComparisonError(
        'No se pudo realizar la comparación',
        'El benchmark seleccionado no tiene indicadores compatibles con esta encuesta.'
      );
      return;
    }

    comparisonHistory.push(comparison);
    lastComparisonDate = new Date();
    updateMetrics(page);
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
      <span class="material-symbols-outlined">warning</span>
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
        <div class="comparison-header-title">
          <span class="material-symbols-outlined">analytics</span>
          <h3>Resultados de Comparación</h3>
        </div>
        <div class="comparison-meta">
          <span class="meta-badge">
            <span class="material-symbols-outlined">assignment</span>
            ${comparison.surveyName}
          </span>
          <span class="meta-badge">
            <span class="material-symbols-outlined">verified</span>
            ${comparison.benchmarkName}
          </span>
          <span class="meta-time">
            ${new Date(comparison.comparedAt).toLocaleString('es-CL')}
          </span>
        </div>
      </header>

      <div class="comparison-summary">
        <div class="summary-card">
          <span class="summary-value">${summary.matchedIndicators}/${summary.totalIndicators}</span>
          <span class="summary-label">Indicadores comparados</span>
        </div>
        <div class="summary-card success">
          <span class="summary-value">${summary.aboveBenchmark}</span>
          <span class="summary-label">Sobre benchmark</span>
        </div>
        <div class="summary-card error">
          <span class="summary-value">${summary.belowBenchmark}</span>
          <span class="summary-label">Bajo benchmark</span>
        </div>
        <div class="summary-card info">
          <span class="summary-value">${summary.matchBenchmark}</span>
          <span class="summary-label">Coinciden</span>
        </div>
        <div class="summary-card">
          <span class="summary-value">±${summary.averageGap}</span>
          <span class="summary-label">Gap promedio</span>
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
        <div class="indicator-info">
          <span class="indicator-category">${comp.category}</span>
          <h5 class="indicator-name">${comp.indicatorName}</h5>
        </div>
        <span class="indicator-gap" style="color: ${gapColor}">
          ${comp.gap.direction === 'above' ? '▲' : comp.gap.direction === 'below' ? '▼' : '●'}
          ${gapFormatted}
        </span>
      </div>
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

async function renderBenchmarksList(page: HTMLElement): Promise<void> {
  const listContainer = page.querySelector('#benchmarks-list') as HTMLElement;
  if (!listContainer) return;

  try {
    const benchmarks = await getAllBenchmarks();
    benchmarksCount = benchmarks.length;
    updateMetrics(page);

    if (benchmarks.length === 0) {
      listContainer.innerHTML = renderEmptyState();
      return;
    }

    const categories = await getCategories();

    listContainer.innerHTML = `
      <div class="benchmarks-grid">
        ${categories.map(category => {
          const categoryBenchmarks = benchmarks.filter(b =>
            b.indicators.some(i => i.category === category)
          );
          if (categoryBenchmarks.length === 0) return '';

          return `
            <div class="benchmark-category-card">
              <div class="category-header">
                <span class="material-symbols-outlined">folder</span>
                <h3>${category}</h3>
                <span class="category-count">${categoryBenchmarks.length}</span>
              </div>
              <div class="category-benchmarks">
                ${categoryBenchmarks.map(b => renderBenchmarkCard(b)).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (error) {
    console.error('[BenchmarksPage] Error rendering benchmarks list:', error);
    listContainer.innerHTML = renderErrorState(
      error instanceof Error ? error.message : 'Error al cargar benchmarks'
    );
  }
}

function renderBenchmarkCard(benchmark: Benchmark): string {
  return `
    <div class="benchmark-card-item" data-id="${benchmark.id}">
      <div class="benchmark-card-header">
        <h4 class="benchmark-name">${benchmark.source.name}</h4>
        <span class="benchmark-year-badge">${benchmark.source.year}</span>
      </div>
      <p class="benchmark-org">${benchmark.source.organization}</p>
      ${benchmark.source.description ? `<p class="benchmark-description">${benchmark.source.description}</p>` : ''}
      <div class="benchmark-card-meta">
        <span class="meta-chip">
          <span class="material-symbols-outlined">location_on</span>
          ${benchmark.coverage.geographic.join(', ')}
        </span>
        <span class="meta-chip">
          <span class="material-symbols-outlined">trending_up</span>
          ${benchmark.indicators.length} indicadores
        </span>
      </div>
    </div>
  `;
}

async function handlePdfUpload(page: HTMLElement): Promise<void> {
  const nameInput = page.querySelector('#benchmark-name') as HTMLInputElement;
  const orgInput = page.querySelector('#benchmark-org') as HTMLInputElement;
  const yearInput = page.querySelector('#benchmark-year') as HTMLInputElement;
  const fileInput = page.querySelector('#benchmark-file') as HTMLInputElement;
  const statusDiv = page.querySelector('#upload-status') as HTMLElement;
  const uploadBtn = page.querySelector('#upload-btn') as HTMLButtonElement;

  // Validación
  if (!nameInput.value.trim()) {
    showUploadStatus(statusDiv, 'error', 'Por favor ingresa el nombre del benchmark');
    return;
  }
  if (!orgInput.value.trim()) {
    showUploadStatus(statusDiv, 'error', 'Por favor ingresa la organización');
    return;
  }
  if (!yearInput.value || parseInt(yearInput.value) < 2000 || parseInt(yearInput.value) > 2099) {
    showUploadStatus(statusDiv, 'error', 'Por favor ingresa un año válido (2000-2099)');
    return;
  }
  if (!fileInput.files || fileInput.files.length === 0) {
    showUploadStatus(statusDiv, 'error', 'Por favor selecciona un archivo PDF');
    return;
  }

  const file = fileInput.files[0];
  if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
    showUploadStatus(statusDiv, 'error', 'El archivo debe ser un PDF');
    return;
  }

  // Mostrar estado de carga
  uploadBtn.disabled = true;
  uploadBtn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> Subiendo...';
  showUploadStatus(statusDiv, 'info', 'Subiendo PDF... Por favor espera.');

  try {
    const benchmark = await createBenchmark({
      source_id: `benchmark_${Date.now()}`,
      name: nameInput.value.trim(),
      organization: orgInput.value.trim(),
      year: parseInt(yearInput.value),
      description: `Benchmark cargado desde PDF: ${file.name}`
    });

    const pdfUrl = await uploadBenchmarkPdf(file, benchmark.id);

    await updateBenchmark(benchmark.id, {
      pdf_url: pdfUrl,
      status: 'processing'
    });

    showUploadStatus(statusDiv, 'success',
      `✅ Benchmark "${benchmark.name}" creado exitosamente. El PDF está siendo procesado para extraer los indicadores.`);

    // Limpiar formulario
    nameInput.value = '';
    orgInput.value = '';
    yearInput.value = '';
    fileInput.value = '';

    // Reset dropzone
    const dropzone = page.querySelector('#file-dropzone') as HTMLElement;
    const textSpan = dropzone?.querySelector('.dropzone-text') as HTMLElement;
    if (textSpan) {
      textSpan.textContent = 'Arrastra un PDF o haz clic para seleccionar';
      textSpan.classList.remove('file-selected');
    }
    dropzone?.classList.remove('has-file');

    // Recargar lista
    await renderBenchmarksList(page);

    // Actualizar select
    const benchmarks = await getAllBenchmarks();
    populateBenchmarkSelect(page, benchmarks);

  } catch (error) {
    console.error('[BenchmarksPage] Error uploading PDF:', error);
    showUploadStatus(statusDiv, 'error',
      `Error al subir el PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = '<span class="material-symbols-outlined">cloud_upload</span> Subir y procesar benchmark';
  }
}

function showUploadStatus(container: HTMLElement, type: 'error' | 'success' | 'info', message: string): void {
  container.style.display = 'block';
  container.className = `upload-status ${type}`;
  container.innerHTML = `
    <span class="material-symbols-outlined">
      ${type === 'error' ? 'error' : type === 'success' ? 'check_circle' : 'info'}
    </span>
    <span>${message}</span>
  `;
}

// ===========================================
// Styles
// ===========================================

function addBenchmarksStyles(): void {
  if (document.getElementById('benchmarks-styles')) return;

  const style = document.createElement('style');
  style.id = 'benchmarks-styles';
  style.textContent = `
    /* ============================================
       Benchmarks Page - Modern Dark Theme
       ============================================ */

    .benchmarks-page {
      --bm-bg-primary: #0f172a;
      --bm-bg-secondary: #1e293b;
      --bm-bg-card: #1e293b;
      --bm-bg-elevated: #334155;
      --bm-border: #334155;
      --bm-border-subtle: #475569;
      --bm-text-primary: #f1f5f9;
      --bm-text-secondary: #94a3b8;
      --bm-text-muted: #64748b;
      --bm-accent-cyan: #06b6d4;
      --bm-accent-blue: #3b82f6;
      --bm-accent-green: #10b981;
      --bm-accent-yellow: #f59e0b;
      --bm-accent-red: #ef4444;
      --bm-accent-purple: #8b5cf6;

      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
      background: var(--bm-bg-primary);
      min-height: 100vh;
    }

    /* ============================================
       Header
       ============================================ */

    .benchmarks-header {
      margin-bottom: 2rem;
      background: linear-gradient(135deg, var(--bm-bg-secondary) 0%, var(--bm-bg-elevated) 100%);
      border: 1px solid var(--bm-border);
      border-radius: 1rem;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
    }

    .benchmarks-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--bm-accent-cyan), var(--bm-accent-blue), var(--bm-accent-purple));
    }

    .benchmarks-header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5rem;
    }

    .benchmarks-title-section {
      flex: 1;
    }

    .benchmarks-title {
      font-size: 1.875rem;
      font-weight: 700;
      color: var(--bm-text-primary);
      margin: 0 0 0.5rem 0;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      letter-spacing: -0.025em;
    }

    .benchmarks-title .material-symbols-outlined {
      font-size: 2rem;
      color: var(--bm-accent-cyan);
    }

    .benchmarks-subtitle {
      font-size: 0.9375rem;
      color: var(--bm-text-secondary);
      margin: 0;
      line-height: 1.5;
    }

    .benchmarks-metrics {
      display: flex;
      gap: 1.5rem;
    }

    .metric-item {
      text-align: center;
      padding: 0.75rem 1rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 0.5rem;
      border: 1px solid var(--bm-border);
    }

    .metric-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--bm-text-primary);
    }

    .metric-label {
      display: block;
      font-size: 0.75rem;
      color: var(--bm-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ============================================
       Workflow Steps
       ============================================ */

    .benchmarks-workflow {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .workflow-step {
      background: var(--bm-bg-card);
      border: 1px solid var(--bm-border);
      border-radius: 1rem;
      overflow: hidden;
    }

    .step-header {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, transparent 100%);
      border-bottom: 1px solid var(--bm-border);
    }

    .step-number {
      width: 2.5rem;
      height: 2.5rem;
      background: var(--bm-accent-cyan);
      color: #0f172a;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.125rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .step-title-section {
      flex: 1;
    }

    .step-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--bm-text-primary);
      margin: 0 0 0.25rem 0;
    }

    .step-description {
      font-size: 0.875rem;
      color: var(--bm-text-secondary);
      margin: 0;
      line-height: 1.5;
    }

    /* ============================================
       Upload Card
       ============================================ */

    .upload-card {
      padding: 1.5rem;
    }

    .upload-form-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr) 1.5fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--bm-text-secondary);
    }

    .form-group label .material-symbols-outlined {
      font-size: 1rem;
      color: var(--bm-accent-cyan);
    }

    .form-input,
    .form-select {
      padding: 0.75rem;
      border: 1px solid var(--bm-border);
      border-radius: 0.5rem;
      font-size: 0.875rem;
      background: var(--bm-bg-primary);
      color: var(--bm-text-primary);
      transition: all 0.2s;
    }

    .form-input:focus,
    .form-select:focus {
      outline: none;
      border-color: var(--bm-accent-cyan);
      box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
    }

    .form-input::placeholder {
      color: var(--bm-text-muted);
    }

    /* File Dropzone */
    .file-input-wrapper {
      position: relative;
    }

    .form-file-input {
      position: absolute;
      opacity: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }

    .file-dropzone {
      padding: 1rem;
      border: 2px dashed var(--bm-border);
      border-radius: 0.5rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      background: var(--bm-bg-primary);
    }

    .file-dropzone:hover,
    .file-dropzone.dragover {
      border-color: var(--bm-accent-cyan);
      background: rgba(6, 182, 212, 0.05);
    }

    .file-dropzone.has-file {
      border-color: var(--bm-accent-green);
      background: rgba(16, 185, 129, 0.05);
    }

    .file-dropzone .material-symbols-outlined {
      font-size: 1.5rem;
      color: var(--bm-text-muted);
      margin-bottom: 0.5rem;
    }

    .dropzone-text {
      display: block;
      font-size: 0.875rem;
      color: var(--bm-text-secondary);
      margin-bottom: 0.25rem;
    }

    .dropzone-text.file-selected {
      color: var(--bm-accent-green);
      font-weight: 500;
    }

    .dropzone-hint {
      display: block;
      font-size: 0.75rem;
      color: var(--bm-text-muted);
    }

    /* Upload Actions */
    .upload-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .upload-hint {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      color: var(--bm-text-muted);
    }

    .upload-hint .material-symbols-outlined {
      font-size: 1rem;
    }

    /* ============================================
       Buttons
       ============================================ */

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.625rem 1.125rem;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 0.5rem;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: var(--bm-accent-cyan);
      color: #0f172a;
      border-color: var(--bm-accent-cyan);
      font-weight: 600;
    }

    .btn-primary:hover:not(:disabled) {
      background: #22d3ee;
      border-color: #22d3ee;
      box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);
    }

    .btn-secondary {
      background: var(--bm-bg-elevated);
      color: var(--bm-text-primary);
      border-color: var(--bm-border);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--bm-border-subtle);
      border-color: var(--bm-border-subtle);
    }

    /* ============================================
       Compare Card
       ============================================ */

    .compare-card {
      padding: 1.5rem;
    }

    .compare-selectors {
      display: flex;
      align-items: flex-end;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .compare-field {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .compare-field label {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--bm-text-secondary);
    }

    .compare-field label .material-symbols-outlined {
      font-size: 1rem;
      color: var(--bm-accent-cyan);
    }

    .compare-divider {
      padding-bottom: 0.5rem;
    }

    .compare-divider .material-symbols-outlined {
      font-size: 1.5rem;
      color: var(--bm-text-muted);
    }

    .compare-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .compare-help {
      font-size: 0.8125rem;
      color: var(--bm-text-muted);
      margin: 0;
    }

    /* ============================================
       Comparison Results
       ============================================ */

    .comparison-results {
      margin: 1.5rem;
      margin-top: 0;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .comparison-card {
      background: var(--bm-bg-secondary);
      border: 1px solid var(--bm-border);
      border-radius: 0.75rem;
      overflow: hidden;
    }

    .comparison-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--bm-border);
    }

    .comparison-header-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .comparison-header-title .material-symbols-outlined {
      font-size: 1.25rem;
      color: var(--bm-accent-cyan);
    }

    .comparison-header-title h3 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--bm-text-primary);
      margin: 0;
    }

    .comparison-meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .meta-badge {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.375rem 0.75rem;
      background: var(--bm-bg-elevated);
      border-radius: 9999px;
      font-size: 0.75rem;
      color: var(--bm-text-secondary);
    }

    .meta-badge .material-symbols-outlined {
      font-size: 0.875rem;
    }

    .meta-time {
      font-size: 0.75rem;
      color: var(--bm-text-muted);
    }

    .comparison-summary {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 1rem;
      padding: 1.25rem;
      background: rgba(0, 0, 0, 0.1);
      border-bottom: 1px solid var(--bm-border);
    }

    .summary-card {
      text-align: center;
      padding: 1rem;
      background: var(--bm-bg-primary);
      border-radius: 0.5rem;
      border: 1px solid var(--bm-border);
    }

    .summary-card.success {
      border-color: var(--bm-accent-green);
      background: rgba(16, 185, 129, 0.1);
    }

    .summary-card.error {
      border-color: var(--bm-accent-red);
      background: rgba(239, 68, 68, 0.1);
    }

    .summary-card.info {
      border-color: var(--bm-accent-cyan);
      background: rgba(6, 182, 212, 0.1);
    }

    .summary-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--bm-text-primary);
      margin-bottom: 0.25rem;
    }

    .summary-label {
      display: block;
      font-size: 0.75rem;
      color: var(--bm-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .comparison-indicators {
      padding: 1.25rem;
    }

    .indicators-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--bm-text-secondary);
      margin: 0 0 1rem 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .indicators-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .indicator-item {
      background: var(--bm-bg-primary);
      border: 1px solid var(--bm-border);
      border-radius: 0.5rem;
      padding: 1rem;
      border-left: 3px solid var(--bm-border);
    }

    .indicator-item.above {
      border-left-color: var(--bm-accent-green);
    }

    .indicator-item.below {
      border-left-color: var(--bm-accent-red);
    }

    .indicator-item.match {
      border-left-color: var(--bm-accent-cyan);
    }

    .indicator-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }

    .indicator-info {
      flex: 1;
    }

    .indicator-category {
      display: block;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--bm-accent-purple);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.25rem;
    }

    .indicator-name {
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--bm-text-primary);
      margin: 0;
    }

    .indicator-gap {
      font-size: 0.875rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .indicator-values {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }

    .value-box {
      text-align: center;
      padding: 0.75rem;
      background: var(--bm-bg-secondary);
      border-radius: 0.375rem;
      border: 1px solid var(--bm-border);
    }

    .value-box.synthetic {
      border-color: var(--bm-accent-cyan);
    }

    .value-box.benchmark {
      border-color: var(--bm-accent-purple);
    }

    .value-box.gap {
      border-color: var(--bm-accent-yellow);
    }

    .value-label {
      display: block;
      font-size: 0.625rem;
      font-weight: 500;
      color: var(--bm-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.25rem;
    }

    .value-number {
      display: block;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--bm-text-primary);
      margin-bottom: 0.25rem;
    }

    .value-meta {
      display: block;
      font-size: 0.625rem;
      color: var(--bm-text-muted);
    }

    /* ============================================
       Benchmarks List
       ============================================ */

    .benchmarks-list-container {
      padding: 1.5rem;
    }

    .benchmarks-grid {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .benchmark-category-card {
      background: var(--bm-bg-secondary);
      border: 1px solid var(--bm-border);
      border-radius: 0.75rem;
      padding: 1.25rem;
    }

    .category-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .category-header .material-symbols-outlined {
      font-size: 1.25rem;
      color: var(--bm-accent-cyan);
    }

    .category-header h3 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--bm-text-primary);
      margin: 0;
      flex: 1;
    }

    .category-count {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--bm-bg-primary);
      background: var(--bm-accent-cyan);
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
    }

    .category-benchmarks {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }

    .benchmark-card-item {
      background: var(--bm-bg-primary);
      border: 1px solid var(--bm-border);
      border-radius: 0.5rem;
      padding: 1rem;
      transition: all 0.2s;
      cursor: pointer;
    }

    .benchmark-card-item:hover {
      border-color: var(--bm-accent-cyan);
      box-shadow: 0 4px 12px rgba(6, 182, 212, 0.1);
      transform: translateY(-2px);
    }

    .benchmark-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .benchmark-name {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--bm-text-primary);
      margin: 0;
      flex: 1;
    }

    .benchmark-year-badge {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--bm-bg-primary);
      background: var(--bm-accent-cyan);
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      flex-shrink: 0;
    }

    .benchmark-org {
      font-size: 0.8125rem;
      color: var(--bm-text-secondary);
      margin: 0 0 0.5rem 0;
    }

    .benchmark-description {
      font-size: 0.75rem;
      color: var(--bm-text-muted);
      margin: 0 0 0.75rem 0;
      line-height: 1.4;
    }

    .benchmark-card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .meta-chip {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.6875rem;
      color: var(--bm-text-muted);
      background: var(--bm-bg-secondary);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      border: 1px solid var(--bm-border);
    }

    .meta-chip .material-symbols-outlined {
      font-size: 0.875rem;
    }

    /* ============================================
       Empty State
       ============================================ */

    .benchmarks-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 3rem;
      gap: 1rem;
    }

    .empty-illustration {
      width: 5rem;
      height: 5rem;
      background: var(--bm-bg-secondary);
      border-radius: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.5rem;
    }

    .empty-illustration .material-symbols-outlined {
      font-size: 2.5rem;
      color: var(--bm-text-muted);
    }

    .benchmarks-empty-state h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--bm-text-primary);
      margin: 0;
    }

    .empty-description {
      font-size: 0.9375rem;
      color: var(--bm-text-secondary);
      margin: 0;
      max-width: 400px;
    }

    .empty-actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin: 1rem 0;
    }

    .empty-action-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--bm-text-secondary);
    }

    .empty-action-item .material-symbols-outlined {
      font-size: 1rem;
      color: var(--bm-accent-cyan);
    }

    /* ============================================
       Loading & Error States
       ============================================ */

    .benchmarks-loading-state,
    .benchmarks-error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      text-align: center;
      gap: 1rem;
    }

    .benchmarks-loading-state p,
    .benchmarks-error-state p {
      color: var(--bm-text-secondary);
      margin: 0;
    }

    .benchmarks-error-state h3 {
      color: var(--bm-text-primary);
      margin: 0;
    }

    .error-icon {
      font-size: 3rem;
      color: var(--bm-accent-red);
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(6, 182, 212, 0.2);
      border-top-color: var(--bm-accent-cyan);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .comparison-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      gap: 1rem;
    }

    .comparison-loading p {
      color: var(--bm-text-secondary);
      margin: 0;
    }

    .comparison-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--bm-accent-red);
      border-radius: 0.5rem;
      gap: 0.5rem;
    }

    .comparison-error h3 {
      color: var(--bm-accent-red);
      margin: 0;
    }

    .comparison-error p {
      color: var(--bm-text-secondary);
      margin: 0;
    }

    /* Upload Status */
    .upload-status {
      margin-top: 1rem;
      padding: 0.875rem 1rem;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.875rem;
    }

    .upload-status.error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--bm-accent-red);
      color: var(--bm-accent-red);
    }

    .upload-status.success {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid var(--bm-accent-green);
      color: var(--bm-accent-green);
    }

    .upload-status.info {
      background: rgba(6, 182, 212, 0.1);
      border: 1px solid var(--bm-accent-cyan);
      color: var(--bm-accent-cyan);
    }

    .upload-status .material-symbols-outlined {
      font-size: 1.25rem;
    }

    /* ============================================
       Responsive
       ============================================ */

    @media (max-width: 1024px) {
      .upload-form-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .comparison-summary {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (max-width: 768px) {
      .benchmarks-page {
        padding: 1rem;
      }

      .benchmarks-header-content {
        flex-direction: column;
      }

      .benchmarks-metrics {
        width: 100%;
        justify-content: flex-start;
      }

      .upload-form-grid {
        grid-template-columns: 1fr;
      }

      .compare-selectors {
        flex-direction: column;
        align-items: stretch;
      }

      .compare-divider {
        display: none;
      }

      .comparison-summary {
        grid-template-columns: repeat(2, 1fr);
      }

      .indicator-values {
        grid-template-columns: 1fr;
      }

      .category-benchmarks {
        grid-template-columns: 1fr;
      }

      .comparison-header {
        flex-direction: column;
        gap: 0.75rem;
      }

      .comparison-meta {
        flex-wrap: wrap;
      }
    }
  `;
  document.head.appendChild(style);
}

// ===========================================
// Cleanup
// ===========================================

export function cleanupBenchmarksPage(): void {
  comparisonHistory.length = 0;
  selectedBenchmarkId = null;
  selectedSurveyId = null;
  benchmarksCount = 0;
  lastComparisonDate = null;

  // Remove styles
  const styles = document.getElementById('benchmarks-styles');
  if (styles) {
    styles.remove();
  }

  console.log('[BenchmarksPage] Cleaned up');
}
