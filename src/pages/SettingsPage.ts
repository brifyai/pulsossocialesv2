/**
 * Settings Page - Pulsos Sociales
 * Vista de configuración de usuario 100% funcional con persistencia en Supabase
 */

import { navigateTo } from '../router';
import {
  getUserSettings,
  saveUserSettings,
  defaultSettings,
  type UserSettings,
  applySettings,
} from '../services/userSettingsService';

// Estado actual de las configuraciones
let currentSettings: UserSettings = { ...defaultSettings };
let hasUnsavedChanges = false;

interface SettingItem {
  id: string;
  label: string;
  description: string;
  type: 'toggle' | 'select' | 'button';
  key: keyof UserSettings;
  options?: { value: string; label: string }[];
}

const settingsGroups = [
  {
    title: 'Apariencia',
    icon: 'palette',
    settings: [
      {
        id: 'dark-mode',
        label: 'Modo oscuro',
        description: 'Usar tema oscuro en toda la aplicación',
        type: 'toggle' as const,
        key: 'darkMode' as keyof UserSettings,
      },
      {
        id: 'high-contrast',
        label: 'Alto contraste',
        description: 'Aumentar el contraste para mejor legibilidad',
        type: 'toggle' as const,
        key: 'highContrast' as keyof UserSettings,
      },
      {
        id: 'animations',
        label: 'Animaciones',
        description: 'Habilitar animaciones y transiciones',
        type: 'toggle' as const,
        key: 'animations' as keyof UserSettings,
      },
    ] as SettingItem[],
  },
  {
    title: 'Mapa y visualización',
    icon: 'map',
    settings: [
      {
        id: 'quality-mode',
        label: 'Modo calidad premium',
        description: 'Activar efectos visuales avanzados en el mapa',
        type: 'toggle' as const,
        key: 'qualityMode' as keyof UserSettings,
      },
      {
        id: 'agent-density',
        label: 'Densidad de agentes',
        description: 'Cantidad de agentes visibles en la simulación',
        type: 'select' as const,
        key: 'agentDensity' as keyof UserSettings,
        options: [
          { value: 'low', label: 'Baja (rendimiento)' },
          { value: 'medium', label: 'Media (balance)' },
          { value: 'high', label: 'Alta (visual)' },
        ],
      },
      {
        id: 'labels',
        label: 'Mostrar etiquetas',
        description: 'Mostrar nombres de calles y lugares en el mapa',
        type: 'toggle' as const,
        key: 'showLabels' as keyof UserSettings,
      },
    ] as SettingItem[],
  },
  {
    title: 'Notificaciones',
    icon: 'notifications',
    settings: [
      {
        id: 'email-notifications',
        label: 'Notificaciones por email',
        description: 'Recibir actualizaciones y alertas por correo',
        type: 'toggle' as const,
        key: 'emailNotifications' as keyof UserSettings,
      },
      {
        id: 'survey-alerts',
        label: 'Alertas de encuestas',
        description: 'Notificar cuando se completen encuestas sintéticas',
        type: 'toggle' as const,
        key: 'surveyAlerts' as keyof UserSettings,
      },
    ] as SettingItem[],
  },
  {
    title: 'Datos y privacidad',
    icon: 'security',
    settings: [
      {
        id: 'data-cache',
        label: 'Cache de datos',
        description: 'Almacenar datos territorialmente para acceso offline',
        type: 'toggle' as const,
        key: 'dataCache' as keyof UserSettings,
      },
      {
        id: 'analytics',
        label: 'Compartir analytics',
        description: 'Ayudar a mejorar la plataforma con datos de uso anónimos',
        type: 'toggle' as const,
        key: 'shareAnalytics' as keyof UserSettings,
      },
      {
        id: 'export-data',
        label: 'Exportar mis datos',
        description: 'Descargar una copia de todos tus datos',
        type: 'button' as const,
        key: 'dataCache' as keyof UserSettings, // placeholder, no se usa
      },
    ] as SettingItem[],
  },
];

/**
 * Create the Settings page
 */
export function createSettingsPage(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'settings-page';

  container.innerHTML = `
    <div class="settings-container">
      <div class="settings-header">
        <h1 class="settings-title">Configuración</h1>
        <p class="settings-subtitle">Personaliza tu experiencia en Pulsos Sociales</p>
        <div class="settings-status" id="settings-status">
          <span class="loading-spinner"></span>
          Cargando preferencias...
        </div>
      </div>

      <div class="settings-groups" id="settings-groups">
        <!-- Los grupos se renderizarán dinámicamente -->
      </div>

      <div class="settings-actions">
        <button class="btn-save" id="save-btn" disabled>
          <span class="material-symbols-outlined">save</span>
          Guardar cambios
        </button>
        <button class="btn-reset" id="reset-btn">
          <span class="material-symbols-outlined">restart_alt</span>
          Restaurar predeterminados
        </button>
      </div>

      <div class="settings-footer">
        <button class="btn-back" id="back-btn">
          <span class="material-symbols-outlined">arrow_back</span>
          Volver al dashboard
        </button>
      </div>
    </div>
  `;

  // Add styles
  addSettingsStyles();

  // Cargar configuraciones
  loadSettings(container);

  // Event listeners
  const backBtn = container.querySelector('#back-btn');
  backBtn?.addEventListener('click', () => navigateTo('home'));

  const saveBtn = container.querySelector('#save-btn') as HTMLButtonElement;
  saveBtn?.addEventListener('click', () => handleSave(container, saveBtn));

  const resetBtn = container.querySelector('#reset-btn');
  resetBtn?.addEventListener('click', () => handleReset(container));

  return container;
}

/**
 * Carga las configuraciones desde Supabase
 */
async function loadSettings(container: HTMLElement): Promise<void> {
  const statusEl = container.querySelector('#settings-status');
  const groupsEl = container.querySelector('#settings-groups');

  try {
    const settings = await getUserSettings();
    currentSettings = settings;

    // Renderizar grupos de configuraciones
    if (groupsEl) {
      groupsEl.innerHTML = settingsGroups
        .map((group) => `
          <div class="settings-group">
            <h2 class="group-title">
              <span class="material-symbols-outlined">${group.icon}</span>
              ${group.title}
            </h2>
            <div class="group-settings">
              ${group.settings.map((setting) => renderSetting(setting)).join('')}
            </div>
          </div>
        `)
        .join('');
    }

    // Actualizar estado
    if (statusEl) {
      statusEl.innerHTML = '<span class="status-success">✓ Preferencias cargadas</span>';
      statusEl.classList.add('loaded');
    }

    // Configurar event listeners
    setupEventListeners(container);
  } catch (error) {
    console.error('[SettingsPage] Error cargando configuraciones:', error);
    if (statusEl) {
      statusEl.innerHTML = '<span class="status-error">✗ Error cargando preferencias</span>';
    }
  }
}

/**
 * Renderiza una configuración individual
 */
function renderSetting(setting: SettingItem): string {
  const value = currentSettings[setting.key];

  switch (setting.type) {
    case 'toggle':
      return `
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">${setting.label}</span>
            <span class="setting-description">${setting.description}</span>
          </div>
          <label class="setting-toggle">
            <input type="checkbox" id="${setting.id}" ${value ? 'checked' : ''} data-key="${setting.key}">
            <span class="toggle-slider"></span>
          </label>
        </div>
      `;
    case 'select':
      return `
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">${setting.label}</span>
            <span class="setting-description">${setting.description}</span>
          </div>
          <select class="setting-select" id="${setting.id}" data-key="${setting.key}">
            ${setting.options
              ?.map(
                (opt) => `
              <option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${opt.label}</option>
            `
              )
              .join('')}
          </select>
        </div>
      `;
    case 'button':
      return `
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">${setting.label}</span>
            <span class="setting-description">${setting.description}</span>
          </div>
          <button class="setting-button" id="${setting.id}-btn" data-key="${setting.key}">
            <span class="material-symbols-outlined">download</span>
            Exportar
          </button>
        </div>
      `;
    default:
      return '';
  }
}

/**
 * Helper para actualizar settings de forma type-safe
 */
function updateSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]): void {
  currentSettings[key] = value;
}

/**
 * Configura los event listeners para los controles
 */
function setupEventListeners(container: HTMLElement): void {
  const saveBtn = container.querySelector('#save-btn') as HTMLButtonElement;

  // Toggle handlers
  container.querySelectorAll('.setting-toggle input').forEach((toggle) => {
    toggle.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const key = target.dataset.key as keyof UserSettings;
      updateSetting(key as 'darkMode' | 'highContrast' | 'animations' | 'qualityMode' | 'showLabels' | 'emailNotifications' | 'surveyAlerts' | 'dataCache' | 'shareAnalytics', target.checked);
      hasUnsavedChanges = true;
      updateSaveButton(saveBtn);

      // Aplicar cambio inmediatamente para feedback visual
      applySettings(currentSettings);
    });
  });

  // Select handlers
  container.querySelectorAll('.setting-select').forEach((select) => {
    select.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      const key = target.dataset.key as keyof UserSettings;
      updateSetting(key as 'agentDensity', target.value as 'low' | 'medium' | 'high');
      hasUnsavedChanges = true;
      updateSaveButton(saveBtn);

      // Aplicar cambio inmediatamente
      applySettings(currentSettings);
    });
  });

  // Button handlers
  container.querySelectorAll('.setting-button').forEach((button) => {
    button.addEventListener('click', () => {
      handleExportData();
    });
  });
}

/**
 * Actualiza el estado del botón de guardar
 */
function updateSaveButton(saveBtn: HTMLButtonElement): void {
  if (hasUnsavedChanges) {
    saveBtn.disabled = false;
    saveBtn.classList.add('has-changes');
  } else {
    saveBtn.disabled = true;
    saveBtn.classList.remove('has-changes');
  }
}

/**
 * Maneja el guardado de configuraciones
 */
async function handleSave(container: HTMLElement, saveBtn: HTMLButtonElement): Promise<void> {
  const originalText = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = `
    <span class="material-symbols-outlined">hourglass_empty</span>
    Guardando...
  `;

  try {
    const success = await saveUserSettings(currentSettings);

    if (success) {
      hasUnsavedChanges = false;
      updateSaveButton(saveBtn);

      saveBtn.innerHTML = `
        <span class="material-symbols-outlined">check</span>
        Guardado
      `;
      saveBtn.classList.add('saved');

      // Mostrar notificación
      showNotification(container, 'Configuraciones guardadas correctamente', 'success');
    } else {
      saveBtn.innerHTML = originalText;
      saveBtn.disabled = false;
      showNotification(container, 'Error al guardar. Se guardó localmente.', 'warning');
    }

    setTimeout(() => {
      saveBtn.innerHTML = originalText;
      saveBtn.classList.remove('saved');
      updateSaveButton(saveBtn);
    }, 2000);
  } catch (error) {
    console.error('[SettingsPage] Error guardando:', error);
    saveBtn.innerHTML = originalText;
    saveBtn.disabled = false;
    showNotification(container, 'Error al guardar configuraciones', 'error');
  }
}

/**
 * Maneja el reset a valores predeterminados
 */
async function handleReset(container: HTMLElement): Promise<void> {
  if (!confirm('¿Restaurar todas las configuraciones a los valores predeterminados?')) {
    return;
  }

  currentSettings = { ...defaultSettings };
  hasUnsavedChanges = true;

  // Actualizar UI
  const groupsEl = container.querySelector('#settings-groups');
  if (groupsEl) {
    groupsEl.innerHTML = settingsGroups
      .map((group) => `
        <div class="settings-group">
          <h2 class="group-title">
            <span class="material-symbols-outlined">${group.icon}</span>
            ${group.title}
          </h2>
          <div class="group-settings">
            ${group.settings.map((setting) => renderSetting(setting)).join('')}
          </div>
        </div>
      `)
      .join('');
  }

  // Reconfigurar event listeners
  setupEventListeners(container);

  // Aplicar cambios
  applySettings(currentSettings);

  // Actualizar botón de guardar
  const saveBtn = container.querySelector('#save-btn') as HTMLButtonElement;
  updateSaveButton(saveBtn);

  showNotification(container, 'Configuraciones restauradas. Guarda para aplicar.', 'info');
}

/**
 * Maneja la exportación de datos
 */
async function handleExportData(): Promise<void> {
  try {
    // Crear datos de exportación
    const exportData = {
      userSettings: currentSettings,
      exportDate: new Date().toISOString(),
      version: '1.0',
    };

    // Crear blob y descargar
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulsos-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification(document.body, 'Datos exportados correctamente', 'success');
  } catch (error) {
    console.error('[SettingsPage] Error exportando:', error);
    showNotification(document.body, 'Error al exportar datos', 'error');
  }
}

/**
 * Muestra una notificación temporal
 */
function showNotification(
  container: HTMLElement | Element,
  message: string,
  type: 'success' | 'error' | 'warning' | 'info'
): void {
  const notification = document.createElement('div');
  notification.className = `settings-notification ${type}`;
  notification.textContent = message;

  container.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Add settings page styles
 */
function addSettingsStyles(): void {
  if (document.getElementById('settings-page-styles')) return;

  const style = document.createElement('style');
  style.id = 'settings-page-styles';
  style.textContent = `
    .settings-page {
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }

    .settings-container {
      background: rgba(12, 12, 20, 0.6);
      border: 1px solid rgba(0, 240, 255, 0.1);
      border-radius: 16px;
      padding: 2rem;
    }

    .settings-header {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .settings-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 0.5rem;
    }

    .settings-subtitle {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.5);
      margin: 0 0 1rem;
    }

    .settings-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.5);
    }

    .settings-status.loaded {
      color: #00ff88;
    }

    .loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-top-color: #00f0ff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .status-success {
      color: #00ff88;
    }

    .status-error {
      color: #ff6464;
    }

    .settings-groups {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .settings-group {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 1.5rem;
    }

    .group-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1rem;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 1rem;
    }

    .group-title .material-symbols-outlined {
      color: #00f0ff;
      font-size: 1.25rem;
    }

    .group-settings {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      transition: background 0.2s ease;
    }

    .setting-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .setting-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
    }

    .setting-label {
      font-size: 0.9rem;
      font-weight: 500;
      color: #ffffff;
    }

    .setting-description {
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.4);
    }

    /* Toggle Switch */
    .setting-toggle {
      position: relative;
      display: inline-block;
      width: 48px;
      height: 24px;
      cursor: pointer;
    }

    .setting-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      transition: all 0.3s ease;
    }

    .toggle-slider::before {
      content: '';
      position: absolute;
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background: #ffffff;
      border-radius: 50%;
      transition: all 0.3s ease;
    }

    .setting-toggle input:checked + .toggle-slider {
      background: rgba(0, 240, 255, 0.3);
    }

    .setting-toggle input:checked + .toggle-slider::before {
      transform: translateX(24px);
      background: #00f0ff;
    }

    /* Select */
    .setting-select {
      padding: 0.5rem 1rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: #ffffff;
      font-size: 0.875rem;
      cursor: pointer;
      min-width: 150px;
    }

    .setting-select:focus {
      outline: none;
      border-color: #00f0ff;
    }

    .setting-select option {
      background: #0a0a12;
      color: #ffffff;
    }

    /* Button */
    .setting-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(0, 240, 255, 0.1);
      border: 1px solid rgba(0, 240, 255, 0.2);
      border-radius: 6px;
      color: #00f0ff;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .setting-button:hover {
      background: rgba(0, 240, 255, 0.2);
      border-color: rgba(0, 240, 255, 0.4);
    }

    .setting-button .material-symbols-outlined {
      font-size: 1rem;
    }

    /* Actions */
    .settings-actions {
      display: flex;
      gap: 1rem;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .btn-save {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #00f0ff, #00a0ff);
      border: none;
      border-radius: 8px;
      color: #020204;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      opacity: 0.5;
    }

    .btn-save:not(:disabled) {
      opacity: 1;
    }

    .btn-save:not(:disabled):hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 20px rgba(0, 240, 255, 0.3);
    }

    .btn-save.has-changes {
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(0, 240, 255, 0.4); }
      50% { box-shadow: 0 0 0 10px rgba(0, 240, 255, 0); }
    }

    .btn-save.saved {
      background: linear-gradient(135deg, #00ff88, #00cc6a);
    }

    .btn-reset {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-reset:hover {
      border-color: rgba(255, 100, 100, 0.5);
      color: #ff6464;
    }

    .settings-footer {
      margin-top: 1.5rem;
    }

    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-back:hover {
      border-color: #00f0ff;
      color: #00f0ff;
    }

    /* Notifications */
    .settings-notification {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .settings-notification.fade-out {
      animation: fadeOut 0.3s ease forwards;
    }

    @keyframes fadeOut {
      to {
        opacity: 0;
        transform: translateX(100%);
      }
    }

    .settings-notification.success {
      background: rgba(0, 255, 136, 0.9);
      color: #020204;
    }

    .settings-notification.error {
      background: rgba(255, 100, 100, 0.9);
      color: #ffffff;
    }

    .settings-notification.warning {
      background: rgba(255, 193, 7, 0.9);
      color: #020204;
    }

    .settings-notification.info {
      background: rgba(0, 240, 255, 0.9);
      color: #020204;
    }

    @media (max-width: 768px) {
      .settings-page {
        padding: 1rem;
      }

      .setting-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .settings-actions {
        flex-direction: column;
      }

      .btn-save,
      .btn-reset {
        width: 100%;
        justify-content: center;
      }
    }
  `;

  document.head.appendChild(style);
}

/**
 * Cleanup function (required by main.ts pattern)
 */
export function cleanupSettingsPage(): void {
  // Cleanup if needed
}
