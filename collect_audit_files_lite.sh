#!/bin/bash
# Script: collect_audit_files_lite.sh
# Versión: 2.1 - Versión reducida para auditoría (solo archivos obligatorios)
# Descripción: Recopila SOLO archivos críticos para auditoría técnica integral

set -euo pipefail

OUTPUT_FILE="audit_input_lite.txt"

echo "=========================================="
echo "RECOPILACIÓN LITE DE ARCHIVOS PARA AUDITORÍA"
echo "Fecha: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "Repositorio: $(basename $(pwd))"
echo "=========================================="
echo ""

{
echo "=========================================="
echo "RECOPILACIÓN LITE DE ARCHIVOS PARA AUDITORÍA"
echo "Fecha: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "Repositorio: $(basename $(pwd))"
echo "NOTA: Solo archivos obligatorios (Auth, Supabase, Config, CI/CD)"
echo "=========================================="
echo ""

# --- PROJECT STRUCTURE ---
echo "=== PROJECT TREE (depth 2) ==="
if command -v tree &> /dev/null; then
    tree -I 'node_modules|dist|.git|coverage' --dirsfirst -L 2
else
    find . -not -path '*/node_modules/*' -not -path '*/.git/*' \
      -not -path '*/dist/*' -not -path '*/coverage/*' \
      -maxdepth 2 | sort
fi
echo ""

# --- CONFIG FILES (OBLIGATORIOS) ---
echo "=== CONFIG FILES (OBLIGATORIOS) ==="
for config_file in package.json Dockerfile docker-compose.yml nginx.conf vite.config.ts tsconfig.json .env.example; do
    echo "=== $config_file ==="
    if [ -f "$config_file" ]; then
        cat "$config_file"
    else
        echo "[NO EXISTE]"
    fi
    echo ""
done

# --- AUTH SYSTEM (CRITICAL - OBLIGATORIO) ---
echo "=== AUTH SYSTEM FILES (OBLIGATORIOS) ==="
if [ -d "src/services/auth" ]; then
    find src/services/auth -type f -name "*.ts" | sort | while read file; do
        echo "=== $file ==="
        cat "$file"
        echo ""
    done
else
    echo "[DIRECTORIO src/services/auth NO EXISTE]"
fi
echo ""

# --- SUPABASE CLIENT (OBLIGATORIO) ---
echo "=== SUPABASE CLIENT FILES (OBLIGATORIOS) ==="
for supabase_file in \
  src/services/supabase/client.ts \
  src/services/supabase/repositories/userRepository.ts \
  scripts/utils/serviceClient.ts \
  scripts/utils/validateScriptEnv.ts; do
    echo "=== $supabase_file ==="
    if [ -f "$supabase_file" ]; then
        cat "$supabase_file"
    else
        echo "[NO EXISTE]"
    fi
    echo ""
done

# --- MAIN ENTRY (OBLIGATORIO) ---
echo "=== MAIN ENTRY FILE ==="
echo "=== src/main.ts ==="
if [ -f "src/main.ts" ]; then
    cat "src/main.ts"
else
    echo "[NO EXISTE]"
fi
echo ""

# --- CI/CD WORKFLOWS (OBLIGATORIO) ---
echo "=== CI/CD WORKFLOWS (OBLIGATORIOS) ==="
if [ -d ".github/workflows" ]; then
    find .github/workflows -type f -name "*.yml" | sort | \
      while read file; do
        echo "=== $file ==="
        cat "$file"
        echo ""
    done
else
    echo "[NO EXISTE .github/workflows]"
fi
echo ""

# --- SAMPLE MIGRATIONS (solo las más recientes, máximo 5) ---
echo "=== SAMPLE SQL MIGRATIONS (últimas 5) ==="
for dir in migrations supabase/migrations; do
    if [ -d "$dir" ]; then
        find "$dir" -type f -name "*.sql" | sort | tail -5 | while read file; do
            echo "=== $file ==="
            cat "$file"
            echo ""
        done
    fi
done
echo ""

# --- SAMPLE TESTS (máximo 3) ---
echo "=== SAMPLE TEST FILES (máximo 3) ==="
find src -path "*__tests__*" -name "*.ts" 2>/dev/null | \
  sort | head -3 | while read file; do
    echo "=== $file ==="
    cat "$file"
    echo ""
done
echo ""

# --- SECURITY DOCS (máximo 3) ---
echo "=== SECURITY DOCUMENTATION (máximo 3) ==="
if [ -d "docs" ]; then
    find docs -iname "*security*" -o -iname "*auth*" -o -iname "*rls*" 2>/dev/null | \
      sort | head -3 | while read file; do
        echo "=== $file ==="
        cat "$file"
        echo ""
    done
else
    echo "[DIRECTORIO docs/ NO EXISTE]"
fi
echo ""

# --- STATISTICS ---
echo "=========================================="
echo "ESTADÍSTICAS DEL REPOSITORIO"
echo "=========================================="
echo "Archivos TypeScript: $(find src -name '*.ts' -o -name '*.tsx' 2>/dev/null | wc -l | tr -d ' ')"
echo "Archivos SQL totales: $(find migrations supabase/migrations -name '*.sql' 2>/dev/null | wc -l | tr -d ' ')"
echo "Archivos de test: $(find src -path '*__tests__*' 2>/dev/null | wc -l | tr -d ' ')"
echo "=========================================="

} > "$OUTPUT_FILE" 2>&1

FILE_SIZE=$(wc -c < "$OUTPUT_FILE" | tr -d ' ')
echo "Archivo generado: $OUTPUT_FILE ($FILE_SIZE bytes)"

if [ "$FILE_SIZE" -gt 102400 ]; then
    echo "⚠️  ADVERTENCIA: Aún mayor a 100KB. Considerar recortar más."
else
    echo "✅ Tamaño aceptable para auditoría."
fi

echo ""
echo "✅ Recopilación LITE completada. Archivo: $OUTPUT_FILE"
echo ""
echo "Para auditoría completa con todas las migraciones SQL, usar:"
echo "  bash collect_audit_files.sh"
