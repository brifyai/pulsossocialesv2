/**
 * Pulsos Sociales - Main Entry Point
 * 
 * Arquitectura de producto con:
 * - Landing pública (cyberpunk premium)
 * - Login/Registro (visual premium)
 * - App protegida (Home, Mapa, Agentes, etc.)
 * - Router con guard de autenticación
 */

// Styles
import './styles/main.css';
import './styles/region-detail.css';
import './styles/surveys.css';
import './styles/benchmarks.css';
import './styles/methodology.css';
import './styles/landing.css';
import './styles/auth.css';

// Router & Auth
import { 
  initRouter, 
  onRouteChange, 
  getCurrentRoute, 
  isPublicRoute, 
  isProtectedRoute,
  isAuthenticated,
  type Route 
} from './router/index';
import { authService } from './services/auth';

// Public Pages
import { createLandingPage } from './pages/LandingPage';
import { createLoginPage } from './pages/LoginPage';

// Protected Pages
import { createNavigation } from './components/Navigation';
import { createHomePage } from './pages/HomePage';
import { createMapViewPage, cleanupMapView } from './pages/MapViewPage';
import { createChileMapPage, cleanupChileMap } from './pages/ChileMapPage';
import { createRegionDetailPage, cleanupRegionDetail } from './pages/RegionDetailPage';
import { createAgentsPage, cleanupAgentsPage } from './pages/AgentsPage';
import { createSurveysPage, cleanupSurveysPage } from './pages/SurveysPage';
import { createBenchmarksPage, cleanupBenchmarksPage } from './pages/BenchmarksPage';
import { createMethodologyPage, cleanupMethodologyPage } from './pages/MethodologyPage';
import { createProfilePage, cleanupProfilePage } from './pages/ProfilePage';
import { createSettingsPage, cleanupSettingsPage } from './pages/SettingsPage';

// App state
let navigation: HTMLElement | null = null;
let currentPage: HTMLElement | null = null;
let appContainer: HTMLElement | null = null;
let isAppShellCreated = false;

/**
 * Initialize the application
 */
async function initApp(): Promise<void> {
  console.log('🚀 PULSOS SOCIALES - Initializing...');

  // Initialize auth service
  await authService.initialize();

  // Create base app structure
  appContainer = document.createElement('div');
  appContainer.id = 'app';
  document.body.appendChild(appContainer);

  // Initialize router (handles auth redirects)
  initRouter();

  // Render initial route
  await renderRoute(getCurrentRoute());

  // Subscribe to route changes
  onRouteChange(async (route) => {
    await renderRoute(route);
  });

  console.log('✅ PULSOS SOCIALES initialized');
  console.log('🔒 Auth status:', isAuthenticated() ? 'Authenticated' : 'Not authenticated');
}

/**
 * Render the current route
 * Handles public vs protected routes differently
 */
async function renderRoute(route: Route): Promise<void> {
  if (!appContainer) return;

  const isPublic = isPublicRoute(route);
  const isProtected = isProtectedRoute(route);
  const hasAuth = isAuthenticated();

  console.log(`🎨 Rendering route: ${route}`, { isPublic, isProtected, hasAuth });

  // Cleanup previous page
  if (currentPage) {
    currentPage.remove();
    currentPage = null;
  }

  // Cleanup map resources if leaving map routes
  cleanupMapResources(route);

  // Handle public routes (landing, login, methodology-public)
  if (isPublic) {
    // Remove app shell if exists (for public routes we want clean layout)
    if (isAppShellCreated && route !== 'methodology') {
      removeAppShell();
    }

    // Render public page
    currentPage = renderPublicPage(route);
    if (currentPage) {
      appContainer.appendChild(currentPage);
    }
    return;
  }

  // Handle protected routes - require auth
  if (isProtected) {
    if (!hasAuth) {
      console.log('🔒 Access denied to protected route, redirect handled by router');
      return;
    }

    // Ensure app shell exists for protected routes
    if (!isAppShellCreated) {
      createAppShell();
    }

    // Render protected page inside main content
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      currentPage = await renderProtectedPage(route);
      if (currentPage) {
        mainContent.appendChild(currentPage);
      }
    }
  }
}

/**
 * Render a public page
 */
function renderPublicPage(route: Route): HTMLElement | null {
  switch (route) {
    case 'landing':
      return createLandingPage();
    case 'login':
      return createLoginPage();
    case 'methodology':
      // Methodology can be public or protected - here we treat it as public
      return createMethodologyPage();
    default:
      return createLandingPage();
  }
}

/**
 * Render a protected page
 */
async function renderProtectedPage(route: Route): Promise<HTMLElement | null> {
  switch (route) {
    case 'home':
      return createHomePage();
    case 'map':
      return createMapViewPage();
    case 'territory':
      return createChileMapPage();
    case 'region':
      return createRegionDetailPage();
    case 'agents':
      return await createAgentsPage();
    case 'surveys':
      return await createSurveysPage();
    case 'benchmarks':
      return await createBenchmarksPage();
    case 'methodology':
      return createMethodologyPage();
    case 'profile':
      return createProfilePage();
    case 'settings':
      return createSettingsPage();
    default:
      return createHomePage();
  }
}

/**
 * Create the protected app shell (navigation + main content area)
 */
function createAppShell(): void {
  if (!appContainer || isAppShellCreated) return;

  console.log('🏗️ Creating app shell...');

  // Clear container
  appContainer.innerHTML = '';

  // Add navigation
  navigation = createNavigation();
  appContainer.appendChild(navigation);

  // Create main content area
  const main = document.createElement('main');
  main.id = 'main-content';
  appContainer.appendChild(main);

  isAppShellCreated = true;
}

/**
 * Remove the app shell (for public routes)
 */
function removeAppShell(): void {
  if (!appContainer) return;

  console.log('🗑️ Removing app shell...');

  appContainer.innerHTML = '';
  navigation = null;
  isAppShellCreated = false;
}

/**
 * Cleanup map resources when leaving map routes
 */
function cleanupMapResources(currentRoute: Route): void {
  // Cleanup map if leaving map route
  if (currentRoute !== 'map') {
    cleanupMapView();
    removeFloatingPanels();
  }

  // Cleanup Chile map if leaving territory route
  if (currentRoute !== 'territory') {
    cleanupChileMap();
  }

  // Cleanup region detail if leaving region route
  if (currentRoute !== 'region') {
    cleanupRegionDetail();
  }

  // Cleanup agents page if leaving agents route
  if (currentRoute !== 'agents') {
    cleanupAgentsPage();
  }

  // Cleanup surveys page if leaving surveys route
  if (currentRoute !== 'surveys') {
    cleanupSurveysPage();
  }

  // Cleanup benchmarks page if leaving benchmarks route
  if (currentRoute !== 'benchmarks') {
    cleanupBenchmarksPage();
  }

  // Cleanup methodology page if leaving methodology route
  if (currentRoute !== 'methodology') {
    cleanupMethodologyPage();
  }

  // Cleanup profile page if leaving profile route
  if (currentRoute !== 'profile') {
    cleanupProfilePage();
  }

  // Cleanup settings page if leaving settings route
  if (currentRoute !== 'settings') {
    cleanupSettingsPage();
  }
}

/**
 * Remove floating panels from document.body
 */
function removeFloatingPanels(): void {
  const panels = document.querySelectorAll('.cyberpunk-panel');
  panels.forEach((panel) => {
    panel.remove();
  });
  console.log('🧹 Floating panels removed');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
