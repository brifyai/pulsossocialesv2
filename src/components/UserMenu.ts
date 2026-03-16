/**
 * User Menu Component
 * Menú de usuario para la app protegida con perfil, configuración y logout
 */

import { logout, authService } from '../services/auth/index';
import { navigateTo } from '../router/index';

interface User {
  email: string;
  name?: string;
  avatar?: string;
}

/**
 * Create the User Menu component
 */
export function createUserMenu(user?: User): HTMLElement {
  // Get real user from auth service if not provided
  const currentUser = user || authService.getCurrentUser() || { email: 'usuario@pulsos.cl' };
  const container = document.createElement('div');
  container.className = 'user-menu-container';

  const displayName = currentUser.name || currentUser.email.split('@')[0];
  const initials = displayName.substring(0, 2).toUpperCase();

  container.innerHTML = `
    <button class="user-menu-trigger" id="user-menu-trigger">
      <div class="user-avatar">
        <span class="user-initials">${initials}</span>
        <div class="user-status"></div>
      </div>
      <span class="user-name">${displayName}</span>
      <span class="material-symbols-outlined user-chevron">expand_more</span>
    </button>
    
    <div class="user-menu-dropdown" id="user-menu-dropdown">
      <div class="user-menu-header">
        <div class="user-avatar large">
          <span class="user-initials">${initials}</span>
        </div>
        <div class="user-info">
          <span class="user-info-name">${displayName}</span>
          <span class="user-info-email">${currentUser.email}</span>
        </div>
      </div>
      
      <div class="user-menu-divider"></div>
      
      <div class="user-menu-items">
        <button class="user-menu-item" id="user-menu-profile">
          <span class="material-symbols-outlined">person</span>
          <span>Mi perfil</span>
        </button>
        
        <button class="user-menu-item" id="user-menu-settings">
          <span class="material-symbols-outlined">settings</span>
          <span>Configuración</span>
        </button>
        
        <div class="user-menu-divider"></div>
        
        <button class="user-menu-item user-menu-logout" id="user-menu-logout">
          <span class="material-symbols-outlined">logout</span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  `;

  // Setup event listeners
  setupEventListeners(container);

  return container;
}

/**
 * Setup event listeners for the user menu
 */
function setupEventListeners(container: HTMLElement): void {
  const trigger = container.querySelector('#user-menu-trigger') as HTMLButtonElement;
  const dropdown = container.querySelector('#user-menu-dropdown') as HTMLElement;
  const profileBtn = container.querySelector('#user-menu-profile') as HTMLButtonElement;
  const settingsBtn = container.querySelector('#user-menu-settings') as HTMLButtonElement;
  const logoutBtn = container.querySelector('#user-menu-logout') as HTMLButtonElement;

  let isOpen = false;

  // Toggle dropdown
  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    isOpen = !isOpen;
    dropdown?.classList.toggle('open', isOpen);
    trigger?.classList.toggle('active', isOpen);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (isOpen && !container.contains(e.target as Node)) {
      isOpen = false;
      dropdown?.classList.remove('open');
      trigger?.classList.remove('active');
    }
  });

  // Profile action
  profileBtn?.addEventListener('click', () => {
    closeMenu();
    navigateTo('profile');
  });

  // Settings action
  settingsBtn?.addEventListener('click', () => {
    closeMenu();
    navigateTo('settings');
  });

  // Logout action
  logoutBtn?.addEventListener('click', async () => {
    closeMenu();
    
    // Mostrar indicador de carga
    logoutBtn.innerHTML = `
      <span class="material-symbols-outlined spinning">refresh</span>
      <span>Cerrando sesión...</span>
    `;
    
    try {
      await logout();
      // Redirigir a landing después de logout
      navigateTo('landing');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Restaurar botón en caso de error
      logoutBtn.innerHTML = `
        <span class="material-symbols-outlined">logout</span>
        <span>Cerrar sesión</span>
      `;
    }
  });

  function closeMenu(): void {
    isOpen = false;
    dropdown?.classList.remove('open');
    trigger?.classList.remove('active');
  }
}

/**
 * Add user menu styles to the document
 */
export function addUserMenuStyles(): void {
  if (document.getElementById('user-menu-styles')) return;

  const style = document.createElement('style');
  style.id = 'user-menu-styles';
  style.textContent = `
    /* ============================================
       User Menu Styles
       ============================================ */
    .user-menu-container {
      position: relative;
    }

    /* Trigger Button */
    .user-menu-trigger {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      background: rgba(0, 240, 255, 0.05);
      border: 1px solid rgba(0, 240, 255, 0.15);
      border-radius: 12px;
      color: #ffffff;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .user-menu-trigger:hover {
      background: rgba(0, 240, 255, 0.1);
      border-color: rgba(0, 240, 255, 0.3);
    }

    .user-menu-trigger.active {
      background: rgba(0, 240, 255, 0.15);
      border-color: rgba(0, 240, 255, 0.4);
    }

    /* Avatar */
    .user-avatar {
      position: relative;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #00f0ff, #ff00a0);
      border-radius: 50%;
      font-weight: 600;
      font-size: 0.85rem;
      color: #020204;
    }

    .user-avatar.large {
      width: 48px;
      height: 48px;
      font-size: 1.1rem;
    }

    .user-initials {
      font-family: 'Inter', sans-serif;
    }

    .user-status {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 10px;
      height: 10px;
      background: #00ff88;
      border: 2px solid #0a0a12;
      border-radius: 50%;
    }

    /* User Name */
    .user-name {
      font-size: 0.9rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
    }

    .user-chevron {
      font-size: 1.2rem;
      color: rgba(255, 255, 255, 0.5);
      transition: transform 0.3s ease;
    }

    .user-menu-trigger.active .user-chevron {
      transform: rotate(180deg);
    }

    /* Dropdown */
    .user-menu-dropdown {
      position: absolute;
      top: calc(100% + 12px);
      right: 0;
      width: 280px;
      background: rgba(12, 12, 20, 0.95);
      border: 1px solid rgba(0, 240, 255, 0.2);
      border-radius: 16px;
      padding: 20px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: all 0.3s ease;
      backdrop-filter: blur(20px);
      box-shadow: 
        0 20px 60px rgba(0, 0, 0, 0.5),
        0 0 40px rgba(0, 240, 255, 0.1);
      z-index: 1000;
    }

    .user-menu-dropdown.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    /* Dropdown Header */
    .user-menu-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding-bottom: 16px;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .user-info-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: #ffffff;
    }

    .user-info-email {
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.5);
    }

    /* Divider */
    .user-menu-divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
      margin: 12px 0;
    }

    /* Menu Items */
    .user-menu-items {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .user-menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: transparent;
      border: none;
      border-radius: 10px;
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
      width: 100%;
    }

    .user-menu-item:hover {
      background: rgba(0, 240, 255, 0.1);
      color: #ffffff;
    }

    .user-menu-item .material-symbols-outlined {
      font-size: 1.2rem;
      color: rgba(0, 240, 255, 0.7);
    }

    .user-menu-item:hover .material-symbols-outlined {
      color: #00f0ff;
    }

    /* Logout Item */
    .user-menu-logout {
      color: rgba(255, 100, 100, 0.9);
    }

    .user-menu-logout:hover {
      background: rgba(255, 100, 100, 0.1);
      color: #ff6464;
    }

    .user-menu-logout .material-symbols-outlined {
      color: rgba(255, 100, 100, 0.7);
    }

    .user-menu-logout:hover .material-symbols-outlined {
      color: #ff6464;
    }

    /* Spinning animation for loading */
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .user-name {
        display: none;
      }
      
      .user-menu-trigger {
        padding: 8px;
      }
      
      .user-menu-dropdown {
        right: -10px;
        width: 260px;
      }
    }
  `;

  document.head.appendChild(style);
}
