/**
 * Landing Page - Pulsos Sociales
 * Dirección de Arte: Editorial Brutalista Cyberpunk Premium
 * Manifiesto visual, infraestructura social, narrativa territorial
 */

import { navigateTo } from '../router/index';

/**
 * Create the Landing page with editorial design
 */
export function createLandingPage(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'landing-editorial';

  container.innerHTML = `
    <!-- Navigation -->
    <nav class="editorial-nav">
      <div class="nav-brand">
        <span class="nav-brand-mark">◆</span>
        <span class="nav-brand-text">PULSOS SOCIALES</span>
      </div>
      <div class="nav-links">
        <a href="#sistema" class="nav-link">Sistema</a>
        <a href="#proceso" class="nav-link">Proceso</a>
        <a href="#escala" class="nav-link">Escala</a>
        <button class="nav-cta" id="nav-cta">Acceder</button>
      </div>
    </nav>

    <!-- Section 1: Hero Principal -->
    <section class="editorial-hero">
      <div class="hero-backdrop">
        <div class="hero-grid"></div>
        <div class="hero-glow"></div>
        <div class="hero-territory">
          <svg viewBox="0 0 100 300" class="territory-svg">
            <defs>
              <linearGradient id="territoryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#00f0ff;stop-opacity:0.3" />
                <stop offset="50%" style="stop-color:#ff0066;stop-opacity:0.2" />
                <stop offset="100%" style="stop-color:#00f0ff;stop-opacity:0.1" />
              </linearGradient>
            </defs>
            <path d="M50,5 C55,8 58,15 56,22 C54,28 52,35 54,42 C56,49 58,56 55,63 C52,70 50,77 51,84 C52,91 54,98 52,105 C50,112 48,119 46,126 C44,133 42,140 41,147 C40,154 39,161 37,168 C35,175 33,182 31,189 C29,196 27,203 25,210 C23,217 21,224 19,231 C17,238 15,245 13,252 C11,259 9,266 7,273 C5,280 3,287 2,294" 
                  fill="none" stroke="url(#territoryGrad)" stroke-width="1.5" opacity="0.6"/>
          </svg>
        </div>
      </div>
      
      <div class="hero-content">
        <div class="hero-pretitle">
          <span class="pretitle-line"></span>
          <span class="pretitle-text">INFRAESTRUCTURA DE SIMULACIÓN</span>
        </div>
        
        <h1 class="hero-title">
          <span class="title-line" data-line="1">PULSOS</span>
          <span class="title-line accent" data-line="2">SOCIALES</span>
        </h1>
        
        <p class="hero-statement">
          Territorio, población y datos operando como un sistema vivo.
          Simulación sintética para comprender Chile.
        </p>
        
        <div class="hero-actions">
          <button class="hero-cta-primary" id="hero-cta-primary">
            <span class="cta-text">ENTRAR AL SISTEMA</span>
            <span class="cta-arrow">→</span>
          </button>
          <a href="#sistema" class="hero-cta-secondary">
            <span class="cta-text">EXPLORAR PLATAFORMA</span>
          </a>
        </div>
        
        <div class="hero-meta">
          <div class="meta-item">
            <span class="meta-label">VERSIÓN</span>
            <span class="meta-value">2.0</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">COBERTURA</span>
            <span class="meta-value">NACIONAL</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">AGENTES</span>
            <span class="meta-value">19M+</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 2: Statement -->
    <section class="editorial-statement">
      <div class="statement-container">
        <div class="statement-mark">◆</div>
        <p class="statement-text">
          Pulsos Sociales es una plataforma de simulación territorial que replica 
          el comportamiento social de Chile mediante agentes sintéticos validados 
          contra datos oficiales CENSO y CASEN.
        </p>
        <div class="statement-accent">
          <span class="accent-line"></span>
        </div>
      </div>
    </section>

    <!-- Section 3: El Sistema -->
    <section class="editorial-system" id="sistema">
      <div class="system-container">
        <div class="system-header">
          <div class="header-index">
            <span class="index-number">01</span>
            <span class="index-line"></span>
          </div>
          <h2 class="header-title">EL SISTEMA</h2>
          <p class="header-subtitle">
            Tres capas de infraestructura operando en conjunto
          </p>
        </div>
        
        <div class="system-blocks">
          <!-- Bloque A: Territorio -->
          <div class="system-block" data-block="territorio">
            <div class="block-visual territory-visual">
              <div class="visual-grid">
                <div class="grid-h" style="top: 25%"></div>
                <div class="grid-h" style="top: 50%"></div>
                <div class="grid-h" style="top: 75%"></div>
                <div class="grid-v" style="left: 33%"></div>
                <div class="grid-v" style="left: 66%"></div>
              </div>
              <div class="visual-chile">
                <svg viewBox="0 0 60 200" class="chile-svg">
                  <defs>
                    <linearGradient id="chileBlock" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style="stop-color:#00f0ff;stop-opacity:0.8" />
                      <stop offset="100%" style="stop-color:#00f0ff;stop-opacity:0.2" />
                    </linearGradient>
                  </defs>
                  <path d="M30,5 C33,8 35,15 33,22 C31,29 29,36 31,43 C33,50 35,57 32,64 C29,71 27,78 28,85 C29,92 31,99 29,106 C27,113 25,120 23,127 C21,134 19,141 18,148 C17,155 16,162 14,169 C12,176 10,183 8,190" 
                        fill="none" stroke="url(#chileBlock)" stroke-width="2"/>
                </svg>
              </div>
              <div class="visual-nodes">
                <div class="node active" style="top: 15%; left: 45%"><span class="node-pulse"></span><span class="node-core"></span></div>
                <div class="node" style="top: 35%; left: 55%"><span class="node-core"></span></div>
                <div class="node active" style="top: 55%; left: 40%"><span class="node-pulse"></span><span class="node-core"></span></div>
                <div class="node" style="top: 75%; left: 50%"><span class="node-core"></span></div>
              </div>
              <svg class="visual-connections" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="45" y1="15" x2="55" y2="35" stroke="#00f0ff" stroke-width="0.5" opacity="0.4"/>
                <line x1="55" y1="35" x2="40" y2="55" stroke="#00f0ff" stroke-width="0.5" opacity="0.4"/>
                <line x1="40" y1="55" x2="50" y2="75" stroke="#00f0ff" stroke-width="0.5" opacity="0.3"/>
              </svg>
            </div>
            <div class="block-content">
              <div class="block-header">
                <span class="block-letter">A</span>
                <span class="block-name">TERRITORIO</span>
              </div>
              <p class="block-desc">16 regiones, 346 comunas, capas espaciales activas</p>
            </div>
          </div>
          
          <!-- Bloque B: Agentes -->
          <div class="system-block" data-block="agentes">
            <div class="block-visual agents-visual">
              <div class="agents-canvas">
                <div class="cluster cluster-1">
                  ${Array.from({ length: 6 }, (_, i) => {
                    const angle = (i / 6) * Math.PI * 2;
                    const r = 12 + Math.random() * 8;
                    return `<span class="cluster-dot" style="left:${50 + Math.cos(angle)*r}%;top:${50 + Math.sin(angle)*r}%"></span>`;
                  }).join('')}
                  <span class="cluster-center"></span>
                </div>
                <div class="cluster cluster-2">
                  ${Array.from({ length: 5 }, (_, i) => {
                    const angle = (i / 5) * Math.PI * 2;
                    const r = 10 + Math.random() * 6;
                    return `<span class="cluster-dot small" style="left:${50 + Math.cos(angle)*r}%;top:${50 + Math.sin(angle)*r}%"></span>`;
                  }).join('')}
                </div>
                ${Array.from({ length: 12 }, () => {
                  const x = 15 + Math.random() * 70;
                  const y = 15 + Math.random() * 70;
                  return `<span class="particle" style="left:${x}%;top:${y}%"></span>`;
                }).join('')}
              </div>
              <svg class="agents-routes" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M20,40 Q40,30 60,45 T80,55" fill="none" stroke="#ff0066" stroke-width="0.5" opacity="0.3" stroke-dasharray="3,3">
                  <animate attributeName="stroke-dashoffset" from="0" to="6" dur="2s" repeatCount="indefinite"/>
                </path>
              </svg>
            </div>
            <div class="block-content">
              <div class="block-header">
                <span class="block-letter">B</span>
                <span class="block-name">AGENTES</span>
              </div>
              <p class="block-desc">Población sintética, perfiles demográficos, movimiento</p>
            </div>
          </div>
          
          <!-- Bloque C: Resultados -->
          <div class="system-block" data-block="resultados">
            <div class="block-visual results-visual">
              <div class="results-panel">
                <div class="panel-metric">
                  <span class="metric-num">87.3%</span>
                  <span class="metric-label">precisión</span>
                </div>
                <div class="panel-chart">
                  <div class="chart-col">
                    <div class="col-stack">
                      <div class="col-seg cyan" style="height: 45%"></div>
                      <div class="col-seg white" style="height: 30%"></div>
                      <div class="col-seg magenta" style="height: 25%"></div>
                    </div>
                  </div>
                  <div class="chart-col">
                    <div class="col-stack">
                      <div class="col-seg cyan" style="height: 60%"></div>
                      <div class="col-seg white" style="height: 25%"></div>
                      <div class="col-seg magenta" style="height: 15%"></div>
                    </div>
                  </div>
                  <div class="chart-col">
                    <div class="col-stack">
                      <div class="col-seg cyan" style="height: 35%"></div>
                      <div class="col-seg white" style="height: 40%"></div>
                      <div class="col-seg magenta" style="height: 25%"></div>
                    </div>
                  </div>
                </div>
                <div class="panel-benchmark">
                  <span class="bench-label">vs CASEN</span>
                  <div class="bench-bar"><div class="bench-fill" style="width: 94%"></div></div>
                  <span class="bench-value">94%</span>
                </div>
              </div>
            </div>
            <div class="block-content">
              <div class="block-header">
                <span class="block-letter">C</span>
                <span class="block-name">RESULTADOS</span>
              </div>
              <p class="block-desc">Encuestas sintéticas, agregados, benchmarks</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 4: Proceso -->
    <section class="editorial-proceso" id="proceso">
      <div class="proceso-container">
        <div class="proceso-header">
          <div class="header-index">
            <span class="index-number">02</span>
            <span class="index-line"></span>
          </div>
          <h2 class="header-title">PROCESO</h2>
          <p class="header-subtitle">De la exploración territorial a la validación de datos</p>
        </div>
        
        <div class="proceso-steps">
          <div class="proceso-step" data-step="1">
            <div class="step-visual">
              <div class="visual-frame">
                <div class="frame-grid"></div>
                <div class="frame-content">
                  <svg viewBox="0 0 40 120" class="step-chile">
                    <path d="M20,5 C22,8 23,15 22,20 C21,25 20,30 21,35 C22,40 23,45 21,50 C20,55 19,60 20,65 C21,70 22,75 21,80 C20,85 19,90 18,95 C17,100 16,105 15,110" 
                          fill="none" stroke="#00f0ff" stroke-width="1.5" opacity="0.6"/>
                  </svg>
                  <div class="step-nodes">
                    <span class="s-node" style="top: 20%; left: 30%"></span>
                    <span class="s-node active" style="top: 50%; left: 60%"></span>
                    <span class="s-node" style="top: 80%; left: 40%"></span>
                  </div>
                </div>
              </div>
            </div>
            <div class="step-content">
              <span class="step-number">01</span>
              <h3 class="step-title">EXPLORA</h3>
              <p class="step-desc">Navega el mapa territorial de Chile. Selecciona regiones y comunas. Visualiza la geografía, densidad poblacional y características demográficas en tiempo real.</p>
            </div>
          </div>
          
          <div class="proceso-step" data-step="2">
            <div class="step-visual">
              <div class="visual-frame">
                <div class="frame-grid"></div>
                <div class="frame-content agents-content">
                  <div class="a-cluster">
                    ${Array.from({ length: 8 }, () => {
                      const x = 20 + Math.random() * 60;
                      const y = 20 + Math.random() * 60;
                      return `<span class="a-dot" style="left:${x}%;top:${y}%"></span>`;
                    }).join('')}
                  </div>
                </div>
              </div>
            </div>
            <div class="step-content">
              <span class="step-number">02</span>
              <h3 class="step-title">SIMULA</h3>
              <p class="step-desc">Despliega agentes sintéticos basados en datos CENSO/CASEN. Ejecuta encuestas virtuales con parámetros personalizados. Genera respuestas sintéticas validadas.</p>
            </div>
          </div>
          
          <div class="proceso-step" data-step="3">
            <div class="step-visual">
              <div class="visual-frame">
                <div class="frame-grid"></div>
                <div class="frame-content results-content">
                  <div class="r-bars">
                    <div class="r-bar" style="height: 40%"></div>
                    <div class="r-bar" style="height: 70%"></div>
                    <div class="r-bar" style="height: 55%"></div>
                    <div class="r-bar" style="height: 85%"></div>
                  </div>
                  <div class="r-line"></div>
                </div>
              </div>
            </div>
            <div class="step-content">
              <span class="step-number">03</span>
              <h3 class="step-title">COMPARA</h3>
              <p class="step-desc">Analiza resultados contra benchmarks oficiales CASEN, SUBTEL, CEP. Valida hipótesis con rigor científico. Exporta datos y genera reportes.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 5: Escala -->
    <section class="editorial-escala" id="escala">
      <div class="escala-container">
        <div class="escala-header">
          <div class="header-index">
            <span class="index-number">03</span>
            <span class="index-line"></span>
          </div>
          <h2 class="header-title">ESCALA</h2>
          <p class="header-subtitle">Dimensiones de la simulación</p>
        </div>
        
        <div class="escala-grid">
          <div class="escala-item primary" data-metric="agentes">
            <div class="item-value">
              <span class="value-num">19</span>
              <span class="value-unit">M+</span>
            </div>
            <div class="item-label">AGENTES SINTÉTICOS</div>
            <div class="item-context">Población completa de Chile</div>
            <div class="item-accent"></div>
          </div>
          
          <div class="escala-item" data-metric="regiones">
            <div class="item-value">
              <span class="value-num">16</span>
            </div>
            <div class="item-label">REGIONES</div>
            <div class="item-context">Cobertura nacional</div>
          </div>
          
          <div class="escala-item" data-metric="comunas">
            <div class="item-value">
              <span class="value-num">346</span>
            </div>
            <div class="item-label">COMUNAS</div>
            <div class="item-context">Precisión territorial</div>
          </div>
          
          <div class="escala-item accent" data-metric="precision">
            <div class="item-value">
              <span class="value-num">99</span>
              <span class="value-unit">%</span>
            </div>
            <div class="item-label">PRECISIÓN</div>
            <div class="item-context">Validación estadística</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 6: CTA Final -->
    <section class="editorial-cta-final">
      <div class="cta-container">
        <div class="cta-backdrop">
          <div class="backdrop-grid"></div>
          <div class="backdrop-glow"></div>
        </div>
        
        <div class="cta-content">
          <div class="cta-pretitle">
            <span class="pretitle-mark">◆</span>
            <span class="pretitle-text">ACCESO A LA PLATAFORMA</span>
          </div>
          
          <h2 class="cta-title">
            <span class="title-word">ENTRA</span>
            <span class="title-word accent">AL PULSO</span>
          </h2>
          
          <p class="cta-statement">
            Accede al sistema completo. Explora el territorio, despliega agentes, 
            ejecuta simulaciones y valida tus hipótesis con datos sintéticos de precisión.
          </p>
          
          <button class="cta-button" id="cta-final">
            <span class="btn-text">INICIAR SESIÓN</span>
            <span class="btn-icon">→</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="editorial-footer">
      <div class="footer-container">
        <div class="footer-brand">
          <span class="brand-mark">◆</span>
          <div class="brand-text">
            <span class="brand-name">PULSOS SOCIALES</span>
            <span class="brand-tagline">Simulación territorial para Chile</span>
          </div>
        </div>
        <div class="footer-meta">
          <span class="meta-item">2025</span>
          <span class="meta-separator">/</span>
          <span class="meta-item">v2.0</span>
        </div>
      </div>
    </footer>
  `;

  // Add event listeners
  setupEventListeners(container);

  return container;
}

/**
 * Setup event listeners for the landing page
 */
function setupEventListeners(container: HTMLElement): void {
  // Navigation CTA
  const navCta = container.querySelector('#nav-cta');
  navCta?.addEventListener('click', () => {
    navigateTo('login');
  });

  // Hero CTA
  const heroCta = container.querySelector('#hero-cta-primary');
  heroCta?.addEventListener('click', () => {
    navigateTo('login');
  });

  // Final CTA
  const ctaFinal = container.querySelector('#cta-final');
  ctaFinal?.addEventListener('click', () => {
    navigateTo('login');
  });

  // Smooth scroll for anchor links
  const anchorLinks = container.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#') && href.length > 1) {
        e.preventDefault();
        const target = container.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
}
