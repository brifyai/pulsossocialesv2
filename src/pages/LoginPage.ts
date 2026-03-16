/**
 * Login Page - Pulsos Sociales
 * Página de autenticación visual premium
 */

import { navigateTo } from '../router/index';
import { authService } from '../services/auth';

export type AuthMode = 'login' | 'register' | 'forgot';

interface LoginState {
  mode: AuthMode;
  loading: boolean;
  error: string | null;
  success: string | null;
}

const state: LoginState = {
  mode: 'login',
  loading: false,
  error: null,
  success: null
};

/**
 * Create the Login page
 */
export function createLoginPage(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'auth-container';

  container.innerHTML = `
    <!-- Background -->
    <div class="auth-bg">
      <div class="auth-grid"></div>
    </div>

    <!-- Back Link -->
    <a href="#" class="auth-back" id="auth-back">
      <span class="material-symbols-outlined">arrow_back</span>
      <span>Volver</span>
    </a>

    <!-- Auth Card -->
    <div class="auth-card">
      <!-- Header -->
      <div class="auth-header">
        <div class="auth-logo">◉</div>
        <h1 class="auth-title">PULSOS SOCIALES</h1>
        <p class="auth-subtitle" id="auth-subtitle">Inicia sesión para continuar</p>
      </div>

      <!-- Messages -->
      <div class="auth-messages" id="auth-messages"></div>

      <!-- Tabs -->
      <div class="auth-tabs" id="auth-tabs">
        <button class="auth-tab active" data-mode="login">Iniciar sesión</button>
        <button class="auth-tab" data-mode="register">Crear cuenta</button>
      </div>

      <!-- Login Form -->
      <form class="auth-form" id="login-form">
        <div class="auth-field">
          <label class="auth-label">Email</label>
          <input 
            type="email" 
            class="auth-input" 
            id="login-email" 
            placeholder="tu@email.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="auth-field auth-field-password">
          <label class="auth-label">Contraseña</label>
          <input 
            type="password" 
            class="auth-input" 
            id="login-password" 
            placeholder="••••••••"
            required
            autocomplete="current-password"
          />
          <button type="button" class="auth-password-toggle" id="toggle-password">
            <span class="material-symbols-outlined">visibility_off</span>
          </button>
        </div>

        <div class="auth-options">
          <label class="auth-remember">
            <input type="checkbox" id="remember-me" />
            <span class="auth-checkbox"></span>
            <span class="auth-remember-text">Recordarme</span>
          </label>
          <a href="#" class="auth-forgot" id="forgot-link">¿Olvidaste tu contraseña?</a>
        </div>

        <button type="submit" class="auth-button" id="login-button">
          <span>Iniciar sesión</span>
        </button>
      </form>

      <!-- Register Form -->
      <form class="auth-form" id="register-form" style="display: none;">
        <div class="auth-field">
          <label class="auth-label">Nombre</label>
          <input 
            type="text" 
            class="auth-input" 
            id="register-name" 
            placeholder="Tu nombre"
            required
            autocomplete="name"
          />
        </div>

        <div class="auth-field">
          <label class="auth-label">Email</label>
          <input 
            type="email" 
            class="auth-input" 
            id="register-email" 
            placeholder="tu@email.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="auth-field auth-field-password">
          <label class="auth-label">Contraseña</label>
          <input 
            type="password" 
            class="auth-input" 
            id="register-password" 
            placeholder="Mínimo 8 caracteres"
            required
            minlength="8"
            autocomplete="new-password"
          />
          <button type="button" class="auth-password-toggle" id="toggle-register-password">
            <span class="material-symbols-outlined">visibility_off</span>
          </button>
        </div>

        <div class="auth-field auth-field-password">
          <label class="auth-label">Confirmar contraseña</label>
          <input 
            type="password" 
            class="auth-input" 
            id="register-password-confirm" 
            placeholder="Repite tu contraseña"
            required
            autocomplete="new-password"
          />
        </div>

        <button type="submit" class="auth-button" id="register-button">
          <span>Crear cuenta</span>
        </button>
      </form>

      <!-- Forgot Password Form -->
      <form class="auth-form" id="forgot-form" style="display: none;">
        <div class="auth-field">
          <label class="auth-label">Email</label>
          <input 
            type="email" 
            class="auth-input" 
            id="forgot-email" 
            placeholder="tu@email.com"
            required
            autocomplete="email"
          />
        </div>

        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.6); margin-bottom: 20px;">
          Te enviaremos un enlace para restablecer tu contraseña.
        </p>

        <button type="submit" class="auth-button" id="forgot-button">
          <span>Enviar enlace</span>
        </button>

        <button type="button" class="auth-button" style="background: transparent; border: 1px solid rgba(255,255,255,0.2); margin-top: 10px;" id="back-to-login">
          <span>Volver al inicio de sesión</span>
        </button>
      </form>

      <!-- Divider -->
      <div class="auth-divider" id="auth-divider">o continúa con</div>

      <!-- Social Login -->
      <div class="auth-social" id="auth-social">
        <button class="auth-social-button" id="google-login">
          <span class="material-symbols-outlined">account_circle</span>
          <span>Google</span>
        </button>
        <button class="auth-social-button" id="github-login">
          <span class="material-symbols-outlined">code</span>
          <span>GitHub</span>
        </button>
      </div>

      <!-- Footer -->
      <div class="auth-footer" id="auth-footer">
        <span class="auth-footer-text">
          ¿No tienes cuenta? 
          <a href="#" class="auth-footer-link" id="switch-to-register">Regístrate</a>
        </span>
      </div>
    </div>
  `;

  // Setup event listeners
  setupEventListeners(container);

  return container;
}

/**
 * Setup event listeners
 */
function setupEventListeners(container: HTMLElement): void {
  // Back button
  const backBtn = container.querySelector('#auth-back');
  backBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('landing');
  });

  // Tab switching
  const tabs = container.querySelectorAll('.auth-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.getAttribute('data-mode') as AuthMode;
      switchMode(mode, container);
    });
  });

  // Password toggles
  setupPasswordToggle(container, '#toggle-password', '#login-password');
  setupPasswordToggle(container, '#toggle-register-password', '#register-password');

  // Form submissions
  const loginForm = container.querySelector('#login-form') as HTMLFormElement;
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleLogin(container);
  });

  const registerForm = container.querySelector('#register-form') as HTMLFormElement;
  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleRegister(container);
  });

  const forgotForm = container.querySelector('#forgot-form') as HTMLFormElement;
  forgotForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleForgot(container);
  });

  // Forgot password link
  const forgotLink = container.querySelector('#forgot-link');
  forgotLink?.addEventListener('click', (e) => {
    e.preventDefault();
    switchMode('forgot', container);
  });

  // Back to login
  const backToLogin = container.querySelector('#back-to-login');
  backToLogin?.addEventListener('click', () => {
    switchMode('login', container);
  });

  // Switch to register link
  const switchToRegister = container.querySelector('#switch-to-register');
  switchToRegister?.addEventListener('click', (e) => {
    e.preventDefault();
    switchMode('register', container);
  });

  // Social login (placeholders)
  const googleLogin = container.querySelector('#google-login');
  googleLogin?.addEventListener('click', () => {
    showMessage(container, 'Login con Google - Integración pendiente', 'info');
  });

  const githubLogin = container.querySelector('#github-login');
  githubLogin?.addEventListener('click', () => {
    showMessage(container, 'Login con GitHub - Integración pendiente', 'info');
  });
}

/**
 * Setup password visibility toggle
 */
function setupPasswordToggle(container: HTMLElement, toggleSelector: string, inputSelector: string): void {
  const toggle = container.querySelector(toggleSelector);
  const input = container.querySelector(inputSelector) as HTMLInputElement;
  
  if (!toggle || !input) return;

  toggle.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    
    const icon = toggle.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.textContent = isPassword ? 'visibility' : 'visibility_off';
    }
  });
}

/**
 * Switch between auth modes
 */
function switchMode(mode: AuthMode, container: HTMLElement): void {
  state.mode = mode;
  state.error = null;
  state.success = null;

  // Update tabs
  const tabs = container.querySelectorAll('.auth-tab');
  tabs.forEach(tab => {
    const tabMode = tab.getAttribute('data-mode');
    if (tabMode === mode) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Show/hide forms
  const loginForm = container.querySelector('#login-form') as HTMLElement;
  const registerForm = container.querySelector('#register-form') as HTMLElement;
  const forgotForm = container.querySelector('#forgot-form') as HTMLElement;
  const tabsContainer = container.querySelector('#auth-tabs') as HTMLElement;
  const divider = container.querySelector('#auth-divider') as HTMLElement;
  const social = container.querySelector('#auth-social') as HTMLElement;
  const footer = container.querySelector('#auth-footer') as HTMLElement;
  const subtitle = container.querySelector('#auth-subtitle') as HTMLElement;

  // Reset visibility
  loginForm.style.display = 'none';
  registerForm.style.display = 'none';
  forgotForm.style.display = 'none';

  switch (mode) {
    case 'login':
      loginForm.style.display = 'flex';
      tabsContainer.style.display = 'flex';
      divider.style.display = 'flex';
      social.style.display = 'flex';
      footer.style.display = 'block';
      subtitle.textContent = 'Inicia sesión para continuar';
      break;
    case 'register':
      registerForm.style.display = 'flex';
      tabsContainer.style.display = 'flex';
      divider.style.display = 'flex';
      social.style.display = 'flex';
      footer.style.display = 'none';
      subtitle.textContent = 'Crea tu cuenta para comenzar';
      break;
    case 'forgot':
      forgotForm.style.display = 'flex';
      tabsContainer.style.display = 'none';
      divider.style.display = 'none';
      social.style.display = 'none';
      footer.style.display = 'none';
      subtitle.textContent = 'Recupera tu contraseña';
      break;
  }

  // Clear messages
  clearMessages(container);
}

/**
 * Handle login submission
 */
async function handleLogin(container: HTMLElement): Promise<void> {
  const emailInput = container.querySelector('#login-email') as HTMLInputElement;
  const passwordInput = container.querySelector('#login-password') as HTMLInputElement;
  const rememberInput = container.querySelector('#remember-me') as HTMLInputElement;

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const remember = rememberInput.checked;

  if (!email || !password) {
    showMessage(container, 'Por favor completa todos los campos', 'error');
    return;
  }

  setLoading(container, true);

  try {
    // Try to use auth service if available
    if (authService.isAvailable()) {
      const result = await authService.signIn(email, password);
      if (result.success) {
        showMessage(container, '¡Bienvenido! Redirigiendo...', 'success');
        setTimeout(() => {
          navigateTo('home');
        }, 1000);
      } else {
        showMessage(container, result.error || 'Error al iniciar sesión', 'error');
      }
    } else {
      // Demo mode - simulate successful login
      console.log('🔓 Demo login:', { email, remember });
      
      // Store session in localStorage for demo
      localStorage.setItem('pulsos_session', JSON.stringify({
        user: { email, name: email.split('@')[0] },
        demo: true,
        timestamp: Date.now()
      }));
      
      showMessage(container, '¡Bienvenido! Redirigiendo...', 'success');
      setTimeout(() => {
        navigateTo('home');
      }, 1000);
    }
  } catch (error) {
    showMessage(container, 'Error al iniciar sesión. Intenta nuevamente.', 'error');
  } finally {
    setLoading(container, false);
  }
}

/**
 * Handle register submission
 */
async function handleRegister(container: HTMLElement): Promise<void> {
  const nameInput = container.querySelector('#register-name') as HTMLInputElement;
  const emailInput = container.querySelector('#register-email') as HTMLInputElement;
  const passwordInput = container.querySelector('#register-password') as HTMLInputElement;
  const confirmInput = container.querySelector('#register-password-confirm') as HTMLInputElement;

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirm = confirmInput.value;

  if (!name || !email || !password || !confirm) {
    showMessage(container, 'Por favor completa todos los campos', 'error');
    return;
  }

  if (password.length < 8) {
    showMessage(container, 'La contraseña debe tener al menos 8 caracteres', 'error');
    return;
  }

  if (password !== confirm) {
    showMessage(container, 'Las contraseñas no coinciden', 'error');
    return;
  }

  setLoading(container, true);

  try {
    // Try to use auth service if available
    if (authService.isAvailable()) {
      const result = await authService.signUp(email, password, { name });
      if (result.success) {
        showMessage(container, '¡Cuenta creada! Redirigiendo...', 'success');
        setTimeout(() => {
          navigateTo('home');
        }, 1000);
      } else {
        showMessage(container, result.error || 'Error al crear cuenta', 'error');
      }
    } else {
      // Demo mode - simulate successful registration
      console.log('🔓 Demo register:', { name, email });
      
      // Store session in localStorage for demo
      localStorage.setItem('pulsos_session', JSON.stringify({
        user: { email, name },
        demo: true,
        timestamp: Date.now()
      }));
      
      showMessage(container, '¡Cuenta creada! Redirigiendo...', 'success');
      setTimeout(() => {
        navigateTo('home');
      }, 1000);
    }
  } catch (error) {
    showMessage(container, 'Error al crear cuenta. Intenta nuevamente.', 'error');
  } finally {
    setLoading(container, false);
  }
}

/**
 * Handle forgot password submission
 */
async function handleForgot(container: HTMLElement): Promise<void> {
  const emailInput = container.querySelector('#forgot-email') as HTMLInputElement;
  const email = emailInput.value.trim();

  if (!email) {
    showMessage(container, 'Por favor ingresa tu email', 'error');
    return;
  }

  setLoading(container, true);

  try {
    // Try to use auth service if available
    if (authService.isAvailable()) {
      const result = await authService.resetPassword(email);
      if (result.success) {
        showMessage(container, 'Revisa tu email para restablecer la contraseña', 'success');
        setTimeout(() => {
          switchMode('login', container);
        }, 2000);
      } else {
        showMessage(container, result.error || 'Error al enviar el enlace', 'error');
      }
    } else {
      // Demo mode
      console.log('🔓 Demo forgot password:', { email });
      showMessage(container, 'Revisa tu email para restablecer la contraseña (Demo)', 'success');
      setTimeout(() => {
        switchMode('login', container);
      }, 2000);
    }
  } catch (error) {
    showMessage(container, 'Error al enviar el enlace. Intenta nuevamente.', 'error');
  } finally {
    setLoading(container, false);
  }
}

/**
 * Show message
 */
function showMessage(container: HTMLElement, message: string, type: 'error' | 'success' | 'info'): void {
  const messagesContainer = container.querySelector('#auth-messages');
  if (!messagesContainer) return;

  const colors = {
    error: { bg: 'rgba(255, 68, 68, 0.1)', border: 'rgba(255, 68, 68, 0.3)', color: '#ff6464' },
    success: { bg: 'rgba(0, 255, 136, 0.1)', border: 'rgba(0, 255, 136, 0.3)', color: '#00ff88' },
    info: { bg: 'rgba(0, 240, 255, 0.1)', border: 'rgba(0, 240, 255, 0.3)', color: '#00f0ff' }
  };

  const style = colors[type];

  messagesContainer.innerHTML = `
    <div style="
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 0.9rem;
      background: ${style.bg};
      border: 1px solid ${style.border};
      color: ${style.color};
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    ">
      <span class="material-symbols-outlined" style="font-size: 1.1rem;">
        ${type === 'error' ? 'error' : type === 'success' ? 'check_circle' : 'info'}
      </span>
      <span>${message}</span>
    </div>
  `;
}

/**
 * Clear messages
 */
function clearMessages(container: HTMLElement): void {
  const messagesContainer = container.querySelector('#auth-messages');
  if (messagesContainer) {
    messagesContainer.innerHTML = '';
  }
}

/**
 * Set loading state
 */
function setLoading(container: HTMLElement, loading: boolean): void {
  state.loading = loading;
  
  const buttons = container.querySelectorAll('.auth-button');
  buttons.forEach(button => {
    if (loading) {
      button.setAttribute('disabled', 'true');
      button.classList.add('auth-button-loading');
    } else {
      button.removeAttribute('disabled');
      button.classList.remove('auth-button-loading');
    }
  });
}
