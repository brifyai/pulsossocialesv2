/**
 * User Settings Service
 * Servicio para gestionar preferencias de usuario con persistencia en Supabase
 */

import { getSupabaseClient } from './supabase/client';

export interface UserSettings {
  // Apariencia
  darkMode: boolean;
  highContrast: boolean;
  animations: boolean;

  // Mapa y visualización
  qualityMode: boolean;
  agentDensity: 'low' | 'medium' | 'high';
  showLabels: boolean;

  // Notificaciones
  emailNotifications: boolean;
  surveyAlerts: boolean;

  // Datos y privacidad
  dataCache: boolean;
  shareAnalytics: boolean;
}

// Valores por defecto
export const defaultSettings: UserSettings = {
  darkMode: true,
  highContrast: false,
  animations: true,
  qualityMode: true,
  agentDensity: 'medium',
  showLabels: true,
  emailNotifications: true,
  surveyAlerts: false,
  dataCache: true,
  shareAnalytics: true,
};

// Cache local para acceso rápido
let settingsCache: UserSettings | null = null;
let lastFetch: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene las preferencias del usuario desde Supabase
 */
export async function getUserSettings(): Promise<UserSettings> {
  // Verificar cache
  if (settingsCache && Date.now() - lastFetch < CACHE_TTL) {
    return settingsCache;
  }

  const client = await getSupabaseClient();
  if (!client) {
    console.warn('[UserSettings] Supabase no disponible, usando valores por defecto');
    return getSettingsFromLocalStorage();
  }

  try {
    const { data: user } = await client.auth.getUser();
    if (!user.user) {
      return getSettingsFromLocalStorage();
    }

    const { data, error } = await client
      .from('user_settings')
      .select('*')
      .eq('user_id', user.user.id)
      .single();

    if (error) {
      // Si no existe, crear con valores por defecto
      if (error.code === 'PGRST116') {
        await createDefaultSettings(user.user.id);
        return defaultSettings;
      }
      console.warn('[UserSettings] Error obteniendo settings:', error);
      return getSettingsFromLocalStorage();
    }

    const settings = mapDbToSettings(data);
    settingsCache = settings;
    lastFetch = Date.now();
    saveSettingsToLocalStorage(settings);
    return settings;
  } catch (error) {
    console.error('[UserSettings] Error:', error);
    return getSettingsFromLocalStorage();
  }
}

/**
 * Guarda las preferencias del usuario en Supabase
 */
export async function saveUserSettings(settings: Partial<UserSettings>): Promise<boolean> {
  const client = await getSupabaseClient();
  if (!client) {
    console.warn('[UserSettings] Supabase no disponible, guardando en localStorage');
    saveSettingsToLocalStorage({ ...defaultSettings, ...settings });
    return false;
  }

  try {
    const { data: user } = await client.auth.getUser();
    if (!user.user) {
      saveSettingsToLocalStorage({ ...defaultSettings, ...settings });
      return false;
    }

    const dbSettings = mapSettingsToDb(settings);

    const { error } = await client
      .from('user_settings')
      .upsert({
        user_id: user.user.id,
        ...dbSettings,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('[UserSettings] Error guardando settings:', error);
      return false;
    }

    // Actualizar cache
    const currentSettings = await getUserSettings();
    settingsCache = { ...currentSettings, ...settings };
    saveSettingsToLocalStorage(settingsCache);

    // Aplicar cambios inmediatamente
    applySettings(settingsCache);

    return true;
  } catch (error) {
    console.error('[UserSettings] Error:', error);
    return false;
  }
}

/**
 * Crea settings por defecto para un nuevo usuario
 */
async function createDefaultSettings(userId: string): Promise<void> {
  const client = await getSupabaseClient();
  if (!client) return;

  try {
    await client
      .from('user_settings')
      .insert({
        user_id: userId,
        ...mapSettingsToDb(defaultSettings),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
  } catch (error) {
    console.error('[UserSettings] Error creando settings por defecto:', error);
  }
}

/**
 * Aplica las configuraciones a la aplicación
 */
export function applySettings(settings: UserSettings): void {
  // Aplicar modo oscuro
  if (settings.darkMode) {
    document.documentElement.classList.add('dark-mode');
    document.documentElement.classList.remove('light-mode');
  } else {
    document.documentElement.classList.add('light-mode');
    document.documentElement.classList.remove('dark-mode');
  }

  // Aplicar alto contraste
  if (settings.highContrast) {
    document.documentElement.classList.add('high-contrast');
  } else {
    document.documentElement.classList.remove('high-contrast');
  }

  // Aplicar animaciones
  if (settings.animations) {
    document.documentElement.classList.remove('no-animations');
  } else {
    document.documentElement.classList.add('no-animations');
  }

  // Guardar en localStorage para acceso rápido
  localStorage.setItem('pulsos_settings', JSON.stringify(settings));

  // Emitir evento para que otros componentes sepan que cambiaron las settings
  window.dispatchEvent(new CustomEvent('settingsChanged', { detail: settings }));
}

/**
 * Obtiene settings desde localStorage (fallback)
 */
function getSettingsFromLocalStorage(): UserSettings {
  try {
    const stored = localStorage.getItem('pulsos_settings');
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('[UserSettings] Error leyendo localStorage:', e);
  }
  return defaultSettings;
}

/**
 * Guarda settings en localStorage
 */
function saveSettingsToLocalStorage(settings: UserSettings): void {
  try {
    localStorage.setItem('pulsos_settings', JSON.stringify(settings));
  } catch (e) {
    console.warn('[UserSettings] Error guardando en localStorage:', e);
  }
}

/**
 * Mapea datos de la BD a la interfaz UserSettings
 */
function mapDbToSettings(data: any): UserSettings {
  return {
    darkMode: data.dark_mode ?? defaultSettings.darkMode,
    highContrast: data.high_contrast ?? defaultSettings.highContrast,
    animations: data.animations ?? defaultSettings.animations,
    qualityMode: data.quality_mode ?? defaultSettings.qualityMode,
    agentDensity: (data.agent_density as 'low' | 'medium' | 'high') ?? defaultSettings.agentDensity,
    showLabels: data.show_labels ?? defaultSettings.showLabels,
    emailNotifications: data.email_notifications ?? defaultSettings.emailNotifications,
    surveyAlerts: data.survey_alerts ?? defaultSettings.surveyAlerts,
    dataCache: data.data_cache ?? defaultSettings.dataCache,
    shareAnalytics: data.share_analytics ?? defaultSettings.shareAnalytics,
  };
}

/**
 * Mapea la interfaz UserSettings a formato de BD (snake_case)
 */
function mapSettingsToDb(settings: Partial<UserSettings>): any {
  const dbSettings: any = {};

  if ('darkMode' in settings) dbSettings.dark_mode = settings.darkMode;
  if ('highContrast' in settings) dbSettings.high_contrast = settings.highContrast;
  if ('animations' in settings) dbSettings.animations = settings.animations;
  if ('qualityMode' in settings) dbSettings.quality_mode = settings.qualityMode;
  if ('agentDensity' in settings) dbSettings.agent_density = settings.agentDensity;
  if ('showLabels' in settings) dbSettings.show_labels = settings.showLabels;
  if ('emailNotifications' in settings) dbSettings.email_notifications = settings.emailNotifications;
  if ('surveyAlerts' in settings) dbSettings.survey_alerts = settings.surveyAlerts;
  if ('dataCache' in settings) dbSettings.data_cache = settings.dataCache;
  if ('shareAnalytics' in settings) dbSettings.share_analytics = settings.shareAnalytics;

  return dbSettings;
}

/**
 * Hook para usar settings en componentes
 */
export function useUserSettings(
  onSettingsLoaded: (settings: UserSettings) => void,
  onError?: (error: Error) => void
): { refresh: () => void; save: (settings: Partial<UserSettings>) => Promise<boolean> } {
  const loadSettings = async () => {
    try {
      const settings = await getUserSettings();
      applySettings(settings);
      onSettingsLoaded(settings);
    } catch (error) {
      console.error('[UserSettings] Error cargando settings:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  // Cargar inmediatamente
  loadSettings();

  return {
    refresh: loadSettings,
    save: saveUserSettings,
  };
}

/**
 * Inicializa las settings al cargar la aplicación
 */
export async function initUserSettings(): Promise<void> {
  const settings = await getUserSettings();
  applySettings(settings);
}
