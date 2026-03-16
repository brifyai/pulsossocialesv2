/**
 * Profile Page - Pulsos Sociales
 * Vista de perfil de usuario
 */

import { authService } from '../services/auth';
import { navigateTo } from '../router';

/**
 * Create the Profile page
 */
export function createProfilePage(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'profile-page';

  const user = authService.getCurrentUser();
  const displayName = user?.name || user?.email?.split('@')[0] || 'Usuario';
  const initials = displayName.substring(0, 2).toUpperCase();

  container.innerHTML = `
    <div class="profile-container">
      <div class="profile-header">
        <div class="profile-avatar">
          <span class="profile-initials">${initials}</span>
        </div>
        <div class="profile-info">
          <h1 class="profile-name">${displayName}</h1>
          <p class="profile-email">${user?.email || 'usuario@pulsos.cl'}</p>
          <span class="profile-badge">Cuenta activa</span>
        </div>
      </div>

      <div class="profile-sections">
        <div class="profile-section">
          <h2 class="section-title">
            <span class="material-symbols-outlined">person</span>
            Información personal
          </h2>
          <div class="section-content">
            <div class="info-row">
              <span class="info-label">Nombre</span>
              <span class="info-value">${displayName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email</span>
              <span class="info-value">${user?.email || 'usuario@pulsos.cl'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">ID de usuario</span>
              <span class="info-value id">${user?.id || 'demo-user-123'}</span>
            </div>
          </div>
        </div>

        <div class="profile-section">
          <h2 class="section-title">
            <span class="material-symbols-outlined">workspace_premium</span>
            Plan y uso
          </h2>
          <div class="section-content">
            <div class="plan-card">
              <div class="plan-header">
                <span class="plan-name">Plan Profesional</span>
                <span class="plan-status">Activo</span>
              </div>
              <div class="plan-usage">
                <div class="usage-item">
                  <span class="usage-label">Agentes sintéticos</span>
                  <span class="usage-value">19.5M / ∞</span>
                </div>
                <div class="usage-item">
                  <span class="usage-label">Encuestas generadas</span>
                  <span class="usage-value">1,247 / ∞</span>
                </div>
                <div class="usage-item">
                  <span class="usage-label">Territorios analizados</span>
                  <span class="usage-value">16 / 16</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="profile-section">
          <h2 class="section-title">
            <span class="material-symbols-outlined">security</span>
            Seguridad
          </h2>
          <div class="section-content">
            <button class="profile-action" id="change-password-btn">
              <span class="material-symbols-outlined">lock</span>
              <span>Cambiar contraseña</span>
            </button>
            <button class="profile-action" id="two-factor-btn">
              <span class="material-symbols-outlined">shield</span>
              <span>Autenticación de dos factores</span>
              <span class="action-status">Próximamente</span>
            </button>
          </div>
        </div>
      </div>

      <div class="profile-actions">
        <button class="btn-back" id="back-btn">
          <span class="material-symbols-outlined">arrow_back</span>
          Volver al dashboard
        </button>
      </div>
    </div>
  `;

  // Add styles
  addProfileStyles();

  // Event listeners
  const backBtn = container.querySelector('#back-btn');
  backBtn?.addEventListener('click', () => navigateTo('home'));

  const changePasswordBtn = container.querySelector('#change-password-btn');
  changePasswordBtn?.addEventListener('click', () => {
    alert('Funcionalidad de cambio de contraseña en desarrollo');
  });

  return container;
}

/**
 * Add profile page styles
 */
function addProfileStyles(): void {
  if (document.getElementById('profile-page-styles')) return;

  const style = document.createElement('style');
  style.id = 'profile-page-styles';
  style.textContent = `
    .profile-page {
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }

    .profile-container {
      background: rgba(12, 12, 20, 0.6);
      border: 1px solid rgba(0, 240, 255, 0.1);
      border-radius: 16px;
      padding: 2rem;
    }

    .profile-header {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      margin-bottom: 2rem;
    }

    .profile-avatar {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #00f0ff, #ff00a0);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 700;
      color: #020204;
    }

    .profile-info {
      flex: 1;
    }

    .profile-name {
      font-size: 1.75rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 0.25rem;
    }

    .profile-email {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.5);
      margin: 0 0 0.75rem;
    }

    .profile-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.75rem;
      background: rgba(0, 255, 136, 0.1);
      border: 1px solid rgba(0, 255, 136, 0.3);
      border-radius: 20px;
      font-size: 0.75rem;
      color: #00ff88;
    }

    .profile-sections {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .profile-section {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 1.5rem;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1rem;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 1rem;
    }

    .section-title .material-symbols-outlined {
      color: #00f0ff;
      font-size: 1.25rem;
    }

    .section-content {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .info-label {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.5);
    }

    .info-value {
      font-size: 0.875rem;
      color: #ffffff;
      font-weight: 500;
    }

    .info-value.id {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.4);
    }

    .plan-card {
      background: rgba(0, 240, 255, 0.05);
      border: 1px solid rgba(0, 240, 255, 0.1);
      border-radius: 8px;
      padding: 1rem;
    }

    .plan-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .plan-name {
      font-weight: 600;
      color: #ffffff;
    }

    .plan-status {
      padding: 0.25rem 0.5rem;
      background: rgba(0, 255, 136, 0.1);
      border-radius: 4px;
      font-size: 0.75rem;
      color: #00ff88;
    }

    .plan-usage {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .usage-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .usage-label {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.5);
    }

    .usage-value {
      font-size: 0.875rem;
      color: #00f0ff;
      font-family: 'JetBrains Mono', monospace;
    }

    .profile-action {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #ffffff;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
    }

    .profile-action:hover {
      background: rgba(0, 240, 255, 0.1);
      border-color: rgba(0, 240, 255, 0.3);
    }

    .profile-action .material-symbols-outlined {
      color: rgba(255, 255, 255, 0.5);
    }

    .action-status {
      margin-left: auto;
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.3);
      font-style: italic;
    }

    .profile-actions {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
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

    @media (max-width: 768px) {
      .profile-page {
        padding: 1rem;
      }

      .profile-header {
        flex-direction: column;
        text-align: center;
      }

      .info-row {
        flex-direction: column;
        gap: 0.25rem;
        align-items: flex-start;
      }
    }
  `;

  document.head.appendChild(style);
}

/**
 * Cleanup function (required by main.ts pattern)
 */
export function cleanupProfilePage(): void {
  // Cleanup if needed
}
