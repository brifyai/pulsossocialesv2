/**
 * Navigation component - Barra de navegación global del producto
 * Separada del panel de control de escena local
 */

import type { Route } from '../router/index';
import { navigateTo, getCurrentRoute, onRouteChange } from '../router/index';
import { createUserMenu, addUserMenuStyles } from './UserMenu';

interface NavItem {
  route: Route;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { route: 'home', label: 'Home', icon: 'home' },
  { route: 'map', label: 'Mapa', icon: 'map' },
  { route: 'territory', label: 'Territorio', icon: 'public' },
  { route: 'agents', label: 'Agentes', icon: 'groups' },
  { route: 'surveys', label: 'Encuestas', icon: 'assignment' },
  { route: 'scenarios', label: 'Escenarios', icon: 'psychology' },
  { route: 'benchmarks', label: 'Benchmarks', icon: 'insights' },
  { route: 'methodology', label: 'Metodología', icon: 'menu_book' },
];

/**
 * Create the global navigation bar
 */
export function createNavigation(): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'global-nav';
  nav.innerHTML = `
    <div class="nav-brand">
      <div class="nav-logo-pulse">
        <div class="nav-logo-core"></div>
        <div class="nav-logo-ring"></div>
      </div>
      <span class="nav-title">Pulsos Sociales</span>
    </div>
    <ul class="nav-links">
      ${navItems.map(item => `
        <li class="nav-item" data-route="${item.route}">
          <a href="#${item.route}" class="nav-link">
            <span class="nav-icon material-symbols-outlined">${item.icon}</span>
            <span class="nav-label">${item.label}</span>
          </a>
        </li>
      `).join('')}
    </ul>
    <div class="nav-actions">
      <button class="nav-feedback-btn" id="nav-feedback-btn" title="Reportar observación">
        <span class="material-symbols-outlined">feedback</span>
      </button>
      <div class="nav-user-menu-container"></div>
    </div>
  `;

  // Add event listeners
  const links = nav.querySelectorAll('.nav-link');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href) {
        const route = href.slice(1) as Route;
        navigateTo(route);
      }
    });
  });

  // Update active state on route change
  const updateActiveState = (route: Route) => {
    const items = nav.querySelectorAll('.nav-item');
    items.forEach(item => {
      const itemRoute = item.getAttribute('data-route');
      if (itemRoute === route) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  };

  // Set initial active state
  updateActiveState(getCurrentRoute());

  // Subscribe to route changes
  onRouteChange(updateActiveState);

  // Add feedback button event listener
  const feedbackBtn = nav.querySelector('#nav-feedback-btn');
  feedbackBtn?.addEventListener('click', () => {
    showFeedbackModal();
  });

  // Add user menu
  addUserMenuStyles();
  const userMenuContainer = nav.querySelector('.nav-user-menu-container');
  if (userMenuContainer) {
    const userMenu = createUserMenu({ email: 'usuario@pulsos.cl' });
    userMenuContainer.appendChild(userMenu);
  }

  return nav;
}

/**
 * Show feedback modal
 */
function showFeedbackModal(): void {
  const modal = document.createElement('div');
  modal.className = 'feedback-modal-overlay';
  modal.innerHTML = `
    <div class="feedback-modal">
      <div class="feedback-modal-header">
        <h3>Reportar observación</h3>
        <button class="feedback-modal-close" id="feedback-close-btn">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="feedback-modal-content">
        <p class="feedback-description">
          Tu feedback nos ayuda a mejorar Pulsos Sociales. 
          Reporta bugs, sugerencias o comentarios.
        </p>
        <div class="feedback-options">
          <a href="mailto:feedback@pulsos.cl?subject=Feedback%20Pulsos%20Sociales" class="feedback-option">
            <span class="material-symbols-outlined">email</span>
            <span>Enviar email</span>
          </a>
          <a href="https://forms.gle/EXAMPLE" target="_blank" class="feedback-option">
            <span class="material-symbols-outlined">description</span>
            <span>Formulario online</span>
          </a>
          <button class="feedback-option" id="feedback-copy-btn">
            <span class="material-symbols-outlined">content_copy</span>
            <span>Copiar logs</span>
          </button>
        </div>
        <div class="feedback-note">
          <strong>Versión:</strong> 1.2.0 | 
          <strong>Sesión:</strong> ${new Date().toISOString().split('T')[0]}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close button
  const closeBtn = modal.querySelector('#feedback-close-btn');
  closeBtn?.addEventListener('click', () => {
    modal.remove();
  });

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Copy logs button
  const copyBtn = modal.querySelector('#feedback-copy-btn');
  copyBtn?.addEventListener('click', () => {
    const logs = `[Pulsos Sociales Feedback]
Fecha: ${new Date().toISOString()}
URL: ${window.location.href}
UserAgent: ${navigator.userAgent}
Versión: 1.2.0
`;
    navigator.clipboard.writeText(logs).then(() => {
      alert('Información copiada al portapapeles. Pégala en tu email o formulario.');
    });
  });
}
