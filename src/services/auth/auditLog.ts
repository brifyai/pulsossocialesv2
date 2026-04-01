/**
 * Audit logging para eventos de autenticación.
 * Registra intentos de login, cambios de password, etc.
 * En producción, esto debería enviarse a un servicio de logging.
 */

export type AuditEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGIN_BLOCKED'
  | 'LOGOUT'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'SESSION_EXPIRED'
  | 'SESSION_INVALIDATED';

export interface AuditEvent {
  type: AuditEventType;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

class AuditLogger {
  private events: AuditEvent[] = [];
  private maxEvents = 1000; // Mantener últimos 1000 eventos en memoria

  /**
   * Registrar un evento de auditoría
   */
  log(event: Omit<AuditEvent, 'timestamp'>): void {
    const fullEvent: AuditEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.events.push(fullEvent);

    // Mantener solo los últimos eventos
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // En desarrollo, log a consola
    if (import.meta.env?.DEV) {
      console.log('[AUDIT]', fullEvent.type, fullEvent.email || fullEvent.userId, fullEvent.details);
    }

    // TODO: En producción, enviar a servicio de logging (e.g., Supabase, LogRocket, etc.)
    this.sendToRemote(fullEvent).catch((_error) => {
      // Silenciar errores de logging remoto
    });
  }

  /**
   * Obtener eventos recientes (para debugging)
   */
  getRecentEvents(count = 100): AuditEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Obtener eventos por usuario
   */
  getEventsByUser(userId: string): AuditEvent[] {
    return this.events.filter(e => e.userId === userId);
  }

  /**
   * Limpiar eventos antiguos
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Enviar evento a servicio remoto (placeholder)
   */
  private async sendToRemote(_event: AuditEvent): Promise<void> {
    // Placeholder: implementar envío a Supabase o servicio de logging
    // Ejemplo:
    // await supabase.from('audit_logs').insert(event);

    // Por ahora, no hacer nada
    return Promise.resolve();
  }
}

export const auditLogger = new AuditLogger();
