/**
 * Auth Service - Pulsos Sociales
 * Servicio de autenticación con soporte para Supabase y modo demo
 */

import { getSupabaseClient, type SupabaseClient } from '../supabase/client';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  demo?: boolean;
  timestamp?: number;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

// Session storage key
const SESSION_KEY = 'pulsos_session';

/**
 * Auth Service
 * Maneja la autenticación de usuarios
 */
class AuthService {
  private session: AuthSession | null = null;
  private initialized = false;
  private supabaseClient: SupabaseClient | null = null;

  constructor() {
    this.loadSession();
  }

  /**
   * Check if Supabase auth is available
   */
  isAvailable(): boolean {
    return !!this.supabaseClient?.auth;
  }

  /**
   * Initialize auth service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Try to get Supabase client
    this.supabaseClient = await getSupabaseClient();

    if (this.isAvailable() && this.supabaseClient) {
      // Listen for auth state changes
      this.supabaseClient.auth.onAuthStateChange((event: string, session: { user: { id: string; email?: string; user_metadata?: { name?: string; avatar_url?: string } }; access_token?: string; refresh_token?: string; expires_at?: number } | null) => {
        if (event === 'SIGNED_IN' && session) {
          this.session = {
            user: {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
              avatar: session.user.user_metadata?.avatar_url
            },
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresAt: session.expires_at
          };
          this.saveSession();
        } else if (event === 'SIGNED_OUT') {
          this.session = null;
          this.clearSession();
        }
      });

      // Check for existing session
      const { data: { session } } = await this.supabaseClient.auth.getSession();
      if (session) {
        this.session = {
          user: {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
            avatar: session.user.user_metadata?.avatar_url
          },
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at
        };
        this.saveSession();
      }
    }

    this.initialized = true;
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      // If Supabase is not available, create a demo session
      if (!this.isAvailable() || !this.supabaseClient) {
        console.log('[Auth] Supabase not available, creating demo session');
        const demoUser: AuthUser = {
          id: 'demo-user-' + Date.now(),
          email: email,
          name: email.split('@')[0] || 'Demo User'
        };

        this.session = {
          user: demoUser,
          demo: true,
          timestamp: Date.now()
        };
        this.saveSession();

        return { success: true, user: demoUser };
      }

      const { data, error } = await this.supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const user: AuthUser = {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0],
          avatar: data.user.user_metadata?.avatar_url
        };

        this.session = {
          user,
          accessToken: data.session?.access_token,
          refreshToken: data.session?.refresh_token,
          expiresAt: data.session?.expires_at
        };
        this.saveSession();

        return { success: true, user };
      }

      return { success: false, error: 'No user data returned' };
    } catch (error) {
      return { success: false, error: 'An error occurred during sign in' };
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, metadata?: { name?: string }): Promise<AuthResult> {
    // If Supabase is not available, create a demo user
    if (!this.isAvailable() || !this.supabaseClient) {
      console.log('[Auth] Supabase not available, creating demo user');
      const demoUser: AuthUser = {
        id: 'demo-user-' + Date.now(),
        email: email,
        name: metadata?.name || email.split('@')[0] || 'Demo User'
      };

      this.session = {
        user: demoUser,
        demo: true,
        timestamp: Date.now()
      };
      this.saveSession();

      return { success: true, user: demoUser };
    }

    try {
      const { data, error } = await this.supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const user: AuthUser = {
          id: data.user.id,
          email: data.user.email || '',
          name: metadata?.name || data.user.email?.split('@')[0],
          avatar: data.user.user_metadata?.avatar_url
        };

        // Note: User needs to confirm email before session is created
        return { success: true, user };
      }

      return { success: false, error: 'No user data returned' };
    } catch (error) {
      return { success: false, error: 'An error occurred during sign up' };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    if (this.isAvailable() && this.supabaseClient) {
      await this.supabaseClient.auth.signOut();
    }
    this.session = null;
    this.clearSession();
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<AuthResult> {
    // If Supabase is not available, simulate success
    if (!this.isAvailable() || !this.supabaseClient) {
      console.log('[Auth] Supabase not available, simulating password reset');
      return { success: true };
    }

    try {
      const { error } = await this.supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An error occurred' };
    }
  }

  /**
   * Update password
   */
  async updatePassword(password: string): Promise<AuthResult> {
    if (!this.isAvailable() || !this.supabaseClient) {
      return { success: false, error: 'Auth service not available' };
    }

    try {
      const { error } = await this.supabaseClient.auth.updateUser({
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An error occurred' };
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthUser | null {
    return this.session?.user || null;
  }

  /**
   * Get current session
   */
  getSession(): AuthSession | null {
    return this.session;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    // Check localStorage session (for demo mode)
    if (!this.session) {
      this.loadSession();
    }
    return !!this.session;
  }

  /**
   * Check if session is valid (not expired)
   */
  isSessionValid(): boolean {
    if (!this.session) return false;

    // For demo sessions, check if created within last 7 days
    if (this.session.expiresAt) {
      return Date.now() < this.session.expiresAt * 1000;
    }

    // Demo sessions are valid for 7 days
    const sessionData = localStorage.getItem(SESSION_KEY);
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        if (parsed.demo && parsed.timestamp) {
          const sevenDays = 7 * 24 * 60 * 60 * 1000;
          return Date.now() - parsed.timestamp < sevenDays;
        }
      } catch {
        // Invalid session data
      }
    }

    return true;
  }

  /**
   * Check if current session is a demo session
   */
  isDemoSession(): boolean {
    return !!this.session?.demo;
  }

  /**
   * Load session from storage
   */
  private loadSession(): void {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY);
      if (sessionData) {
        this.session = JSON.parse(sessionData);
      }
    } catch {
      this.session = null;
    }
  }

  /**
   * Save session to storage
   */
  private saveSession(): void {
    if (this.session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
    }
  }

  /**
   * Clear session from storage
   */
  private clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export for use in other modules
export default authService;

// Convenience exports for common operations
export const logout = () => authService.signOut();
export const getCurrentUser = () => authService.getCurrentUser();
export const isAuthenticated = () => authService.isAuthenticated();
