/**
 * Quality Mode System - Sprint 8A
 * 
 * Sistema conservador de modos de calidad:
 * - Full: Configuración actual completa
 * - Lite: Reducción de agentes y complejidad visual
 * 
 * NOTA: Este módulo es independiente y no modifica
 * archivos sensibles directamente. Los cambios se
 * aplican mediante callbacks registrados.
 */

// ===========================================
// Types & Constants
// ===========================================

export type QualityMode = 'full' | 'lite';

export interface QualityConfig {
  mode: QualityMode;
  maxAgents: number;
  targetFPS: number;
  enableFog: boolean;
  enableBuildings3D: boolean;
  enableLabels: boolean;
  enableRoadsGlow: boolean;
  simulationSpeed: number;
}

const CONFIGS: Record<QualityMode, QualityConfig> = {
  full: {
    mode: 'full',
    maxAgents: 200,
    targetFPS: 60,
    enableFog: true,
    enableBuildings3D: true,
    enableLabels: true,
    enableRoadsGlow: true,
    simulationSpeed: 1.0,
  },
  lite: {
    mode: 'lite',
    maxAgents: 50,
    targetFPS: 30,
    enableFog: false,
    enableBuildings3D: true, // Mantener edificios para contexto
    enableLabels: false,     // Reducir labels
    enableRoadsGlow: false,  // Reducir glow
    simulationSpeed: 0.8,    // Ligeramente más lento
  },
};

// ===========================================
// State
// ===========================================

let currentMode: QualityMode = 'full';
let currentConfig: QualityConfig = { ...CONFIGS.full };

// Callbacks for mode changes
const modeChangeCallbacks: Array<(mode: QualityMode, config: QualityConfig) => void> = [];

// ===========================================
// Core Functions
// ===========================================

/**
 * Get current quality mode
 */
export function getQualityMode(): QualityMode {
  return currentMode;
}

/**
 * Get current quality configuration
 */
export function getQualityConfig(): QualityConfig {
  return { ...currentConfig };
}

/**
 * Set quality mode
 * Returns true if mode changed, false if same mode
 */
export function setQualityMode(mode: QualityMode): boolean {
  if (mode === currentMode) {
    return false;
  }

  currentMode = mode;
  currentConfig = { ...CONFIGS[mode] };

  console.log(`🎛️ Quality mode changed to: ${mode.toUpperCase()}`);
  console.log(`   Max agents: ${currentConfig.maxAgents}`);
  console.log(`   Target FPS: ${currentConfig.targetFPS}`);

  // Notify all registered callbacks
  modeChangeCallbacks.forEach(callback => {
    try {
      callback(currentMode, currentConfig);
    } catch (error) {
      console.warn('⚠️ Error in quality mode callback:', error);
    }
  });

  return true;
}

/**
 * Toggle between full and lite mode
 */
export function toggleQualityMode(): QualityMode {
  const newMode = currentMode === 'full' ? 'lite' : 'full';
  setQualityMode(newMode);
  return newMode;
}

/**
 * Register callback for mode changes
 * Returns unsubscribe function
 */
export function onQualityModeChange(
  callback: (mode: QualityMode, config: QualityConfig) => void
): () => void {
  modeChangeCallbacks.push(callback);

  // Return unsubscribe function
  return () => {
    const index = modeChangeCallbacks.indexOf(callback);
    if (index > -1) {
      modeChangeCallbacks.splice(index, 1);
    }
  };
}

/**
 * Check if current mode is lite
 */
export function isLiteMode(): boolean {
  return currentMode === 'lite';
}

/**
 * Check if current mode is full
 */
export function isFullMode(): boolean {
  return currentMode === 'full';
}

// ===========================================
// Performance Monitoring
// ===========================================

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  agentCount: number;
  mode: QualityMode;
  timestamp: number;
}

let metrics: PerformanceMetrics = {
  fps: 0,
  frameTime: 0,
  agentCount: 0,
  mode: 'full',
  timestamp: Date.now(),
};

let frameCount = 0;
let lastFrameTime = performance.now();
let metricsCallback: ((metrics: PerformanceMetrics) => void) | null = null;
let rafId: number | null = null;

/**
 * Update performance metrics
 * Call this in animation loop or periodically
 */
export function updatePerformanceMetrics(agentCount: number = 0): void {
  const now = performance.now();
  const delta = now - lastFrameTime;
  frameCount++;

  // Calculate FPS every 500ms
  if (delta >= 500) {
    const fps = Math.round((frameCount * 1000) / delta);
    const frameTime = Math.round(delta / frameCount);

    metrics = {
      fps,
      frameTime,
      agentCount,
      mode: currentMode,
      timestamp: now,
    };

    if (metricsCallback) {
      metricsCallback({ ...metrics });
    }

    frameCount = 0;
    lastFrameTime = now;
  }
}

/**
 * Start performance monitoring
 */
export function startPerformanceMonitoring(
  onMetrics: (metrics: PerformanceMetrics) => void
): void {
  metricsCallback = onMetrics;
  lastFrameTime = performance.now();
  frameCount = 0;

  // Monitor loop
  const monitor = () => {
    updatePerformanceMetrics(metrics.agentCount);
    rafId = requestAnimationFrame(monitor);
  };

  rafId = requestAnimationFrame(monitor);
  console.log('📊 Performance monitoring started');
}

/**
 * Stop performance monitoring
 */
export function stopPerformanceMonitoring(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  metricsCallback = null;
  console.log('📊 Performance monitoring stopped');
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  return { ...metrics };
}

/**
 * Get recommended mode based on performance
 * Returns 'lite' if FPS is consistently low
 */
export function getRecommendedMode(): QualityMode {
  if (metrics.fps > 0 && metrics.fps < 25) {
    return 'lite';
  }
  return 'full';
}

// ===========================================
// Auto-detection (optional)
// ===========================================

let autoDetectionEnabled = false;
let autoDetectionInterval: number | null = null;

/**
 * Enable auto-detection of quality mode
 * Automatically switches to lite if performance is poor
 */
export function enableAutoDetection(checkIntervalMs: number = 5000): void {
  if (autoDetectionEnabled) return;

  autoDetectionEnabled = true;

  autoDetectionInterval = window.setInterval(() => {
    const recommended = getRecommendedMode();
    if (recommended !== currentMode) {
      console.log(`🤖 Auto-detect: Switching to ${recommended.toUpperCase()} mode`);
      setQualityMode(recommended);
    }
  }, checkIntervalMs);

  console.log('🤖 Auto-detection enabled');
}

/**
 * Disable auto-detection
 */
export function disableAutoDetection(): void {
  autoDetectionEnabled = false;
  if (autoDetectionInterval !== null) {
    clearInterval(autoDetectionInterval);
    autoDetectionInterval = null;
  }
  console.log('🤖 Auto-detection disabled');
}

/**
 * Check if auto-detection is enabled
 */
export function isAutoDetectionEnabled(): boolean {
  return autoDetectionEnabled;
}

// ===========================================
// Initialization
// ===========================================

/**
 * Initialize quality mode system
 * Optionally restore saved mode from localStorage
 */
export function initQualityMode(restoreSaved: boolean = true): void {
  if (restoreSaved) {
    try {
      const saved = localStorage.getItem('pulso-quality-mode');
      if (saved === 'lite' || saved === 'full') {
        currentMode = saved;
        currentConfig = { ...CONFIGS[saved] };
        console.log(`🎛️ Restored quality mode: ${saved.toUpperCase()}`);
      }
    } catch {
      // localStorage not available, use default
    }
  }

  console.log('🎛️ Quality mode system initialized');
}

/**
 * Save current mode to localStorage
 */
export function saveQualityMode(): void {
  try {
    localStorage.setItem('pulso-quality-mode', currentMode);
  } catch {
    // localStorage not available
  }
}

/**
 * Cleanup quality mode system
 */
export function cleanupQualityMode(): void {
  stopPerformanceMonitoring();
  disableAutoDetection();
  modeChangeCallbacks.length = 0;
  console.log('🧹 Quality mode system cleaned up');
}
