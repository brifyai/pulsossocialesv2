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
  
  // Parse hash and query params (use 'landing' only as default, not replacement)
  const hashPart = rawHash || 'landing';
  const [hash, queryString] = hashPart.split('?');
  const route = hash as Route;

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
  }

  // Only redirect to home if:
  // - User is authenticated AND
  // - Current route is landing/login AND  
  // - No explicit hash was in the URL (user visited root /)
  // This preserves the current route on page refresh
  if (state.isAuthenticated && (state.currentRoute === 'landing' || state.currentRoute === 'login') && !hasExplicitHash) {
    console.log('🏠 No explicit hash, redirecting authenticated user to home');
    state.currentRoute = 'home';
    state.params = {};
  }

  // Update URL to match state only if we changed it
  if (state.currentRoute !== route || (state.params.redirect && state.currentRoute !== 'login')) {
    if (Object.keys(state.params).length > 0) {
      const newQueryString = new URLSearchParams(state.params).toString();
      window.location.hash = `${state.currentRoute}?${newQueryString}`;
    } else {
      window.location.hash = state.currentRoute;
    }
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
