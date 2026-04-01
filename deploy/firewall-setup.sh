#!/bin/bash
# =============================================================================
# Firewall Setup Script - Pulsos Sociales
# =============================================================================
# Descripción: Configura UFW (Uncomplicated Firewall) para producción
# Versión: 1.0.0
# Autor: Pulsos Sociales Team
# Fecha: 2026-03-31
# =============================================================================
#
# INSTRUCCIONES DE USO:
# =====================
# 1. Ejecutar como root o con sudo:
#    sudo bash deploy/firewall-setup.sh
#
# 2. Verificar estado después de ejecutar:
#    sudo ufw status verbose
#
# 3. Para deshabilitar el firewall (emergencia):
#    sudo ufw disable
#
# 4. Para ver logs de bloqueo:
#    sudo tail -f /var/log/ufw.log
#
# =============================================================================

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar si se ejecuta como root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Este script debe ejecutarse como root o con sudo"
        exit 1
    fi
}

# Verificar si UFW está instalado
check_ufw_installed() {
    if ! command -v ufw &> /dev/null; then
        log_warn "UFW no está instalado. Instalando..."
        apt-get update && apt-get install -y ufw
    fi
}

# Función principal de configuración
configure_firewall() {
    log_info "Iniciando configuración del firewall..."
    
    # Resetear UFW a estado por defecto (idempotente)
    log_info "Reseteando configuración previa..."
    ufw --force reset
    
    # Política por defecto: denegar todo
    log_info "Configurando política por defecto: DENEGAR TODO"
    ufw default deny incoming
    ufw default allow outgoing
    
    # Permitir SSH (puerto 22) - CRÍTICO: No bloquear acceso SSH
    log_info "Permitiendo SSH (puerto 22)..."
    ufw allow 22/tcp comment 'SSH Access'
    
    # Permitir HTTP (puerto 80)
    log_info "Permitiendo HTTP (puerto 80)..."
    ufw allow 80/tcp comment 'HTTP - Pulsos Frontend'
    
    # Permitir HTTPS (puerto 443)
    log_info "Permitiendo HTTPS (puerto 443)..."
    ufw allow 443/tcp comment 'HTTPS - Pulsos Frontend'
    
    # NOTA: Los siguientes puertos están INTENCIONALMENTE BLOQUEADOS:
    # - 5432: PostgreSQL (solo acceso interno entre contenedores)
    # - 3000: Supabase Studio (no expuesto en producción)
    # - 8000: Kong API Gateway (solo si se usa externamente)
    # - 9999: Supabase Auth (solo acceso interno)
    # - 8080: Postgres Meta (solo acceso interno)
    
    log_info "Puertos bloqueados por seguridad:"
    log_info "  - 5432 (PostgreSQL - solo interno)"
    log_info "  - 3000 (Supabase Studio - deshabilitado en prod)"
    log_info "  - 9999 (Auth - solo interno)"
    log_info "  - 8080 (Meta - solo interno)"
    
    # Habilitar logging (medio)
    log_info "Configurando logging..."
    ufw logging medium
    
    # Mostrar reglas antes de habilitar
    log_info "Reglas configuradas:"
    ufw status numbered
    
    # Preguntar confirmación antes de habilitar
    echo ""
    log_warn "IMPORTANTE: Una vez habilitado, solo los puertos 22, 80 y 443 estarán abiertos."
    log_warn "Asegúrate de tener acceso SSH antes de continuar."
    echo ""
    
    # Habilitar UFW
    log_info "Habilitando UFW..."
    ufw --force enable
    
    log_info "Firewall configurado exitosamente!"
}

# Verificar estado final
verify_firewall() {
    echo ""
    log_info "Estado actual del firewall:"
    echo "========================================"
    ufw status verbose
    echo "========================================"
    
    # Verificar que los puertos críticos estén abiertos
    log_info "Verificando puertos críticos..."
    
    if ufw status | grep -q "22/tcp"; then
        log_info "✓ Puerto 22 (SSH) está abierto"
    else
        log_error "✗ Puerto 22 (SSH) NO está abierto - CRÍTICO!"
    fi
    
    if ufw status | grep -q "80/tcp"; then
        log_info "✓ Puerto 80 (HTTP) está abierto"
    else
        log_warn "✗ Puerto 80 (HTTP) NO está abierto"
    fi
    
    if ufw status | grep -q "443/tcp"; then
        log_info "✓ Puerto 443 (HTTPS) está abierto"
    else
        log_warn "✗ Puerto 443 (HTTPS) NO está abierto"
    fi
    
    # Verificar que PostgreSQL NO esté expuesto
    if ufw status | grep -q "5432"; then
        log_warn "⚠ Puerto 5432 (PostgreSQL) está expuesto - Debería estar bloqueado"
    else
        log_info "✓ Puerto 5432 (PostgreSQL) está correctamente bloqueado"
    fi
}

# Función para mostrar ayuda
show_help() {
    cat << EOF
Uso: sudo bash deploy/firewall-setup.sh [OPCIÓN]

Opciones:
    --verify    Solo verificar estado actual del firewall
    --reset     Resetear firewall a estado por defecto (abrir todo)
    --help      Mostrar esta ayuda

Ejemplos:
    sudo bash deploy/firewall-setup.sh           # Configurar firewall
    sudo bash deploy/firewall-setup.sh --verify  # Verificar estado
    sudo bash deploy/firewall-setup.sh --reset   # Resetear configuración

EOF
}

# Función para resetear firewall
reset_firewall() {
    log_warn "Reseteando firewall a estado por defecto..."
    ufw --force reset
    ufw default allow incoming
    ufw default allow outgoing
    ufw disable
    log_info "Firewall reseteado. Todos los puertos están abiertos."
}

# Función solo para verificar
verify_only() {
    log_info "Verificando estado del firewall..."
    verify_firewall
}

# Main
main() {
    case "${1:-}" in
        --help|-h)
            show_help
            exit 0
            ;;
        --verify|-v)
            check_root
            verify_only
            exit 0
            ;;
        --reset|-r)
            check_root
            reset_firewall
            exit 0
            ;;
        "")
            # Ejecución normal
            check_root
            check_ufw_installed
            configure_firewall
            verify_firewall
            log_info "Configuración completada!"
            log_info "Para verificar en cualquier momento: sudo ufw status verbose"
            ;;
        *)
            log_error "Opción desconocida: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
