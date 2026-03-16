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
  { route: 'surveys', label: 'Encuestas', icon: 'poll' },
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
    <div class="nav-user-menu-container"></div>
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

  // Add user menu
  addUserMenuStyles();
  const userMenuContainer = nav.querySelector('.nav-user-menu-container');
  if (userMenuContainer) {
    const userMenu = createUserMenu({ email: 'usuario@pulsos.cl' });
    userMenuContainer.appendChild(userMenu);
  }

  return nav;
}
