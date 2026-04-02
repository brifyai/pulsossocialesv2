#!/bin/bash
# Script: collect_audit_files_parts.sh
# Versión: 2.1 - Divide la auditoría completa en partes manejables
# Descripción: Genera múltiples archivos de ~50KB cada uno para auditoría por partes

set -euo pipefail

OUTPUT_DIR="audit_parts"
mkdir -p "$OUTPUT_DIR"

echo "=========================================="
echo "GENERACIÓN DE ARCHIVOS POR PARTES"
echo "Fecha: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "Repositorio: $(basename $(pwd))"
echo "=========================================="
echo ""

# Función para generar encabezado
generate_header() {
    local part_num=$1
    local part_name=$2
    cat << EOF
==========================================
AUDITORÍA TÉCNICA INTEGRAL - PARTE ${part_num}/6
${part_name}
Fecha: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
Repositorio: $(basename $(pwd))
==========================================

INSTRUCCIONES:
1. Usar con: docs/PROMPT_AUDITORIA_DEFINITIVO_V2.md
2. Esta es la Parte ${part_num} de 6
3. Procesar en orden: Parte 1 → Parte 2 → ... → Parte 6
4. Cada parte debe analizarse secuencialmente

EOF
}

# ==========================================
# PARTE 1: ESTRUCTURA Y CONFIGURACIÓN
# ==========================================
PART1_FILE="$OUTPUT_DIR/audit_part_1_structure_config.txt"
{
    generate_header "1" "ESTRUCTURA DEL PROYECTO Y CONFIGURACIÓN"
    
    echo "=== PROJECT TREE (depth 3) ==="
    if command -v tree &> /dev/null; then
        tree -I 'node_modules|dist|.git|coverage' --dirsfirst -L 3
    else
        find . -not -path '*/node_modules/*' -not -path '*/.git/*' \
          -not -path '*/dist/*' -not -path '*/coverage/*' \
          -maxdepth 3 | sort
    fi
    echo ""
    
    echo "=== CONFIG FILES ==="
    for config_file in package.json Dockerfile docker-compose.yml nginx.conf vite.config.ts tsconfig.json .env.example .gitignore; do
        echo "=== $config_file ==="
        if [ -f "$config_file" ]; then
            cat "$config_file"
        else
            echo "[NO EXISTE]"
        fi
        echo ""
    done
    
    echo "=== CI/CD WORKFLOWS ==="
    if [ -d ".github/workflows" ]; then
        find .github/workflows -type f -name "*.yml" | sort | while read file; do
            echo "=== $file ==="
            cat "$file"
            echo ""
        done
    fi
    
} > "$PART1_FILE"

# ==========================================
# PARTE 2: SISTEMA DE AUTENTICACIÓN
# ==========================================
PART2_FILE="$OUTPUT_DIR/audit_part_2_auth.txt"
{
    generate_header "2" "SISTEMA DE AUTENTICACIÓN Y SEGURIDAD"
    
    echo "=== AUTH SYSTEM FILES ==="
    if [ -d "src/services/auth" ]; then
        find src/services/auth -type f -name "*.ts" | sort | while read file; do
            echo "=== $file ==="
            cat "$file"
            echo ""
        done
    fi
    
    echo "=== LOGIN PAGE ==="
    if [ -f "src/pages/LoginPage.ts" ]; then
        echo "=== src/pages/LoginPage.ts ==="
        cat "src/pages/LoginPage.ts"
        echo ""
    fi
    
    echo "=== USER MENU ==="
    if [ -f "src/components/UserMenu.ts" ]; then
        echo "=== src/components/UserMenu.ts ==="
        cat "src/components/UserMenu.ts"
        echo ""
    fi
    
    echo "=== AUTH STYLES ==="
    if [ -f "src/styles/auth.css" ]; then
        echo "=== src/styles/auth.css ==="
        cat "src/styles/auth.css"
        echo ""
    fi
    
} > "$PART2_FILE"

# ==========================================
# PARTE 3: SUPABASE Y BASE DE DATOS
# ==========================================
PART3_FILE="$OUTPUT_DIR/audit_part_3_supabase.txt"
{
    generate_header "3" "SUPABASE CLIENT Y REPOSITORIOS"
    
    echo "=== SUPABASE CLIENT ==="
    for file in src/services/supabase/client.ts src/services/supabase/index.ts; do
        if [ -f "$file" ]; then
            echo "=== $file ==="
            cat "$file"
            echo ""
        fi
    done
    
    echo "=== REPOSITORIES (Core) ==="
    for file in src/services/supabase/repositories/userRepository.ts \
                src/services/supabase/repositories/agentRepository.ts \
                src/services/supabase/repositories/surveyRepository.ts; do
        if [ -f "$file" ]; then
            echo "=== $file ==="
            cat "$file"
            echo ""
        fi
    done
    
    echo "=== SCRIPT UTILS ==="
    for file in scripts/utils/serviceClient.ts scripts/utils/validateScriptEnv.ts; do
        if [ -f "$file" ]; then
            echo "=== $file ==="
            cat "$file"
            echo ""
        fi
    done
    
} > "$PART3_FILE"

# ==========================================
# PARTE 4: MIGRACIONES SQL (Parte 1)
# ==========================================
PART4_FILE="$OUTPUT_DIR/audit_part_4_migrations_1.txt"
{
    generate_header "4" "MIGRACIONES SQL - SEGURIDAD Y RLS"
    
    echo "=== SECURITY MIGRATIONS ==="
    for file in migrations/20250329_security_rls_policies.sql \
                migrations/20250330_fix_agent_state_rls_secure.sql \
                migrations/20250330_fix_scenario_events_rls_v4_SECURE.sql \
                migrations/20250330_fix_scenario_events_fk.sql; do
        if [ -f "$file" ]; then
            echo "=== $file ==="
            cat "$file"
            echo ""
        fi
    done
    
    echo "=== DEPLOY INIT SCHEMA ==="
    if [ -f "deploy/init/01-schema.sql" ]; then
        echo "=== deploy/init/01-schema.sql ==="
        cat "deploy/init/01-schema.sql"
        echo ""
    fi
    
    echo "=== SAMPLE RECENT MIGRATIONS ==="
    find migrations -name "*.sql" -type f | sort | tail -10 | while read file; do
        echo "=== $file ==="
        cat "$file"
        echo ""
    done
    
} > "$PART4_FILE"

# ==========================================
# PARTE 5: MIGRACIONES SQL (Parte 2) Y TIPOS
# ==========================================
PART5_FILE="$OUTPUT_DIR/audit_part_5_migrations_2_types.txt"
{
    generate_header "5" "MIGRACIONES SQL - DATOS Y TIPOS TYPESCRIPT"
    
    echo "=== DATA MIGRATIONS (Sample) ==="
    find migrations -name "*.sql" -type f | sort | head -15 | while read file; do
        echo "=== $file ==="
        cat "$file"
        echo ""
    done
    
    echo "=== TYPESCRIPT TYPES ==="
    for file in src/types/database.ts src/types/agent.ts src/types/survey.ts src/types/opinion.ts; do
        if [ -f "$file" ]; then
            echo "=== $file ==="
            cat "$file"
            echo ""
        fi
    done
    
} > "$PART5_FILE"

# ==========================================
# PARTE 6: CÓDIGO FUENTE PRINCIPAL
# ==========================================
PART6_FILE="$OUTPUT_DIR/audit_part_6_source_code.txt"
{
    generate_header "6" "CÓDIGO FUENTE PRINCIPAL"
    
    echo "=== MAIN ENTRY ==="
    if [ -f "src/main.ts" ]; then
        echo "=== src/main.ts ==="
        cat "src/main.ts"
        echo ""
    fi
    
    echo "=== ROUTER ==="
    if [ -f "src/router/index.ts" ]; then
        echo "=== src/router/index.ts ==="
        cat "src/router/index.ts"
        echo ""
    fi
    
    echo "=== CORE SERVICES (Sample) ==="
    for file in src/app/survey/surveyService.ts \
                src/app/survey/surveyRunner.ts \
                src/app/opinionEngine/opinionEngine.ts; do
        if [ -f "$file" ]; then
            echo "=== $file ==="
            cat "$file"
            echo ""
        fi
    done
    
    echo "=== TESTS (Sample) ==="
    find src -path "*__tests__*" -name "*.ts" | sort | head -3 | while read file; do
        echo "=== $file ==="
        cat "$file"
        echo ""
    done
    
    echo "=========================================="
    echo "ESTADÍSTICAS DEL REPOSITORIO"
    echo "=========================================="
    echo "Archivos TypeScript: $(find src -name '*.ts' -o -name '*.tsx' 2>/dev/null | wc -l | tr -d ' ')"
    echo "Archivos SQL totales: $(find migrations supabase/migrations -name '*.sql' 2>/dev/null | wc -l | tr -d ' ')"
    echo "Archivos de test: $(find src -path '*__tests__*' 2>/dev/null | wc -l | tr -d ' ')"
    echo "=========================================="
    
} > "$PART6_FILE"

# ==========================================
# RESUMEN
# ==========================================
echo ""
echo "=========================================="
echo "ARCHIVOS GENERADOS EN: $OUTPUT_DIR/"
echo "=========================================="

for i in 1 2 3 4 5 6; do
    file="$OUTPUT_DIR/audit_part_${i}_*.txt"
    actual_file=$(ls $file 2>/dev/null | head -1)
    if [ -f "$actual_file" ]; then
        size=$(wc -c < "$actual_file" | tr -d ' ')
        size_kb=$((size / 1024))
        echo "Parte $i: $(basename "$actual_file") (${size_kb}KB)"
    fi
done

echo ""
echo "=========================================="
echo "INSTRUCCIONES DE USO"
echo "=========================================="
echo ""
echo "1. Abrir NUEVA conversación con Claude (contexto limpio)"
echo ""
echo "2. Pegar el contenido de: docs/PROMPT_AUDITORIA_DEFINITIVO_V2.md"
echo ""
echo "3. Luego pegar cada parte EN ORDEN:"
echo "   - Parte 1: Estructura y Configuración"
echo "   - Parte 2: Sistema de Autenticación"
echo "   - Parte 3: Supabase y Repositorios"
echo "   - Parte 4: Migraciones SQL - Seguridad"
echo "   - Parte 5: Migraciones SQL - Datos y Tipos"
echo "   - Parte 6: Código Fuente Principal"
echo ""
echo "4. Después de cada parte, esperar el análisis antes de continuar"
echo ""
echo "✅ Generación completada en: $OUTPUT_DIR/"
