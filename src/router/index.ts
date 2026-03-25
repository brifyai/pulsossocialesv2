/**
 * Router - Pulsos Sociales
 * Navegación con soporte para rutas públicas y protegidas
 */

import { authService } from '../services/auth';

// Route types
export type PublicRoute = 'landing' | 'login' | 'methodology';
export type ProtectedRoute = 'home' | 'map' | 'territory' | 'region' | 'agents' | 'surveys' | 'benchmarks' | 'profile' | 'settings';
export type Route = PublicRoute | ProtectedRoute;

interface RouterState {
  currentRoute: Route;
  params: Record<string, string>;
  isAuthenticated: boolean;
}

const state: RouterState = {
  currentRoute: 'landing',
  params: {},
  isAuthenticated: false,
};

const listeners: Set<(route: Route) => void> = new Set();

// Public routes that don't require authentication
const publicRoutes: PublicRoute[] = ['landing', 'login', 'methodology'];

// Protected routes that require authentication
const protectedRoutes: ProtectedRoute[] = ['home', 'map', 'territory', 'region', 'agents', 'surveys', 'benchmarks', 'profile', 'settings'];

// All valid routes
const validRoutes: Route[] = [...publicRoutes, ...protectedRoutes];

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return authService.isAuthenticated() && authService.isSessionValid();
}

/**
 * Check if a route is public
 */
export function isPublicRoute(route: string): boolean {
  return publicRoutes.includes(route as PublicRoute);
}

/**
 * Check if a route is protected
 */
export function isProtectedRoute(route: string): boolean {
  return protectedRoutes.includes(route as ProtectedRoute);
}

/**
 * Navigate to a route
 * Automatically redirects to login if trying to access protected route without auth
 */
export function navigateTo(route: Route, params: Record<string, string> = {}): void {
  // Check if trying to access protected route without authentication
  if (isProtectedRoute(route) && !isAuthenticated()) {
    console.log('🔒 Protected route access denied, redirecting to login');
    route = 'login';
    params = { redirect: state.currentRoute };
  }

  // If already on landing and authenticated, go to home
  if (route === 'landing' && isAuthenticated()) {
    route = 'home';
  }

  // If going to login while authenticated, go to home instead
  if (route === 'login' && isAuthenticated()) {
    route = 'home';
  }

  state.currentRoute = route;
  state.params = params;
  state.isAuthenticated = isAuthenticated();

  // Save route to storage for persistence across page refreshes
  saveRouteToStorage(route);

  // Update URL hash for shareability
  if (Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params).toString();
    window.location.hash = `${route}?${queryString}`;
  } else {
    window.location.hash = route;
  }

  // Notify listeners
  listeners.forEach(listener => listener(route));

  console.log(`🧭 Navigated to: ${route}`, params);
}

/**
 * Navigate to a public route
 */
export function navigateToPublic(route: PublicRoute, params: Record<string, string> = {}): void {
  navigateTo(route, params);
}

/**
 * Navigate to a protected route (requires auth)
 */
export function navigateToProtected(route: ProtectedRoute, params: Record<string, string> = {}): void {
  if (!isAuthenticated()) {
    console.log('🔒 Authentication required for protected route');
    navigateTo('login', { redirect: route, ...params });
    return;
  }
  navigateTo(route, params);
}

/**
 * Get current route
 */
export function getCurrentRoute(): Route {
  return state.currentRoute;
}

/**
 * Get current params
 */
export function getParams(): Record<string, string> {
  return { ...state.params };
}

/**
 * Subscribe to route changes
 */
export function onRouteChange(callback: (route: Route) => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// Storage key for preserving route
const ROUTE_STORAGE_KEY = 'pulsossociales_last_route';

/**
 * Save current route to sessionStorage
 */
function saveRouteToStorage(route: Route): void {
  try {
    sessionStorage.setItem(ROUTE_STORAGE_KEY, route);
  } catch (e) {
    // Ignore storage errors
  }
}

/**
 * Get last route from sessionStorage
 */
function getRouteFromStorage(): Route | null {
  try {
    const saved = sessionStorage.getItem(ROUTE_STORAGE_KEY);
    if (saved && validRoutes.includes(saved as Route)) {
      return saved as Route;
    }
  } catch (e) {
    // Ignore storage errors
  }
  return null;
}

/**
 * Initialize router from URL hash
 * Handles authentication check on init
 * PRESERVES current route on page refresh if authenticated
 */
export function initRouter(): void {
  // Check authentication status
  state.isAuthenticated = isAuthenticated();

  // Get raw hash (without the #) - preserve empty string if no hash
  const rawHash = window.location.hash.slice(1);
  const hasExplicitHash = rawHash.length > 0;
  
  console.log('🔍 Router init - rawHash:', rawHash, 'hasExplicitHash:', hasExplicitHash);
  console.log('🔍 Router init - window.location.href:', window.location.href);
  
  // Try to get saved route from storage (for page refresh scenarios)
  const savedRoute = getRouteFromStorage();
  console.log('🔍 Router init - savedRoute from storage:', savedRoute);
  
  // Parse hash and query params
  // Priority: 1) URL hash, 2) saved route from storage, 3) default 'landing'
  let hashPart: string;
  if (hasExplicitHash) {
    hashPart = rawHash;
  } else if (savedRoute && state.isAuthenticated) {
    // Use saved route if authenticated and no hash in URL
    hashPart = savedRoute;
    console.log('📦 Using saved route from storage:', savedRoute);
  } else {
    hashPart = 'landing';
  }
  
  const [hash, queryString] = hashPart.split('?');
  const route = hash as Route;

  console.log('🔍 Router init - parsed route:', route, 'hashPart:', hashPart);

  // Parse query params if present
  if (queryString) {
    const params = new URLSearchParams(queryString);
    state.params = Object.fromEntries(params.entries());
  }

  // Validate and set initial route
  if (validRoutes.includes(route)) {
    // Check if protected route without auth
    if (isProtectedRoute(route) && !state.isAuthenticated) {
      console.log('🔒 Initial protected route access denied, redirecting to login');
      state.currentRoute = 'login';
      state.params = { redirect: route };
    } else {
      // Preserve the requested route (don't redirect to home)
      state.currentRoute = route;
      console.log('✅ Preserving current route:', route);
    }
  } else {
    // Default to landing if invalid route
    state.currentRoute = 'landing';
    console.log('⚠️ Invalid route, defaulting to landing');
  }

  // Only redirect to home if:
  // - User is authenticated AND
  // - Current route is landing/login AND  
  // - No explicit hash was in the URL AND
  // - No saved route in storage
  // This preserves the current route on page refresh
  if (state.isAuthenticated && (state.currentRoute === 'landing' || state.currentRoute === 'login') && !hasExplicitHash && !savedRoute) {
    console.log('🏠 No explicit hash or saved route, redirecting authenticated user to home');
    state.currentRoute = 'home';
    state.params = {};
  }

  // Save the current route to storage for next refresh
  saveRouteToStorage(state.currentRoute);
  console.log('💾 Saved route to storage:', state.currentRoute);

  console.log('🔍 Router init - final state.currentRoute:', state.currentRoute);

  // Update URL to match state only if we changed it
  if (state.currentRoute !== route || (state.params.redirect && state.currentRoute !== 'login')) {
    console.log('📝 Updating URL hash to:', state.currentRoute);
    if (Object.keys(state.params).length > 0) {
      const newQueryString = new URLSearchParams(state.params).toString();
      window.location.hash = `${state.currentRoute}?${newQueryString}`;
    } else {
      window.location.hash = state.currentRoute;
    }
  } else {
    console.log('📝 Not updating URL hash (route unchanged)');
  }

  // Listen for hash changes
  window.addEventListener('hashchange', () => {
    const newHashPart = window.location.hash.slice(1);
    const [newHash, newQueryString] = newHashPart.split('?');
    const newRoute = newHash as Route;

    if (validRoutes.includes(newRoute)) {
      // Check authentication for protected routes
      if (isProtectedRoute(newRoute) && !isAuthenticated()) {
        console.log('🔒 Hash change to protected route denied');
        navigateTo('login', { redirect: newRoute });
        return;
      }

      // Parse new query params
      const newParams: Record<string, string> = {};
      if (newQueryString) {
        const params = new URLSearchParams(newQueryString);
        Object.assign(newParams, Object.fromEntries(params.entries()));
      }

      state.currentRoute = newRoute;
      state.params = newParams;
      state.isAuthenticated = isAuthenticated();

      // Save route to storage for persistence
      saveRouteToStorage(newRoute);

      // Notify listeners
      listeners.forEach(listener => listener(newRoute));
    }
  });

  console.log('🧭 Router initialized', { 
    route: state.currentRoute, 
    params: state.params,
    isAuthenticated: state.isAuthenticated 
  });
}

/**
 * Check if a route is active
 */
export function isRouteActive(route: Route): boolean {
  return state.currentRoute === route;
}

/**
 * Require authentication for current route
 * Redirects to login if not authenticated
 */
export function requireAuth(): boolean {
  if (!isAuthenticated()) {
    navigateTo('login', { redirect: state.currentRoute });
    return false;
  }
  return true;
}

/**
 * Logout and redirect to landing
 */
export async function logout(): Promise<void> {
  await authService.signOut();
  state.isAuthenticated = false;
  
  // Clear saved route from storage on logout
  try {
    sessionStorage.removeItem(ROUTE_STORAGE_KEY);
    console.log('🗑️ Cleared saved route from storage on logout');
  } catch (e) {
    // Ignore storage errors
  }
  
  navigateTo('landing');
}

/**
 * Get redirect URL from params
 */
export function getRedirectRoute(): Route | null {
  const redirect = state.params.redirect;
  if (redirect && validRoutes.includes(redirect as Route)) {
    return redirect as Route;
  }
  return null;
}
