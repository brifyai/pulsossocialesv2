#!/bin/bash
# Script: collect_audit_files.sh
# Versión: 2.1 - Corregido y optimizado
# Descripción: Recopila archivos clave del repositorio para auditoría técnica integral

set -euo pipefail

OUTPUT_FILE="audit_input.txt"

echo "=========================================="
echo "RECOPILACIÓN DE ARCHIVOS PARA AUDITORÍA"
echo "Fecha: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "Repositorio: $(basename $(pwd))"
echo "=========================================="
echo ""

{
echo "=========================================="
echo "RECOPILACIÓN DE ARCHIVOS PARA AUDITORÍA"
echo "Fecha: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "Repositorio: $(basename $(pwd))"
echo "=========================================="
echo ""

# --- PROJECT STRUCTURE ---
echo "=== PROJECT TREE (depth 3) ==="
if command -v tree &> /dev/null; then
    tree -I 'node_modules|dist|.git|coverage' --dirsfirst -L 3
else
    find . -not -path '*/node_modules/*' -not -path '*/.git/*' \
      -not -path '*/dist/*' -not -path '*/coverage/*' \
      -maxdepth 3 | sort
fi
echo ""

# --- CONFIG FILES ---
for config_file in package.json package-lock.json Dockerfile \
  docker-compose.yml nginx.conf vite.config.ts tsconfig.json \
  .env.example .env.scripts; do
    echo "=== $config_file ==="
    if [ -f "$config_file" ]; then
        cat "$config_file"
    else
        echo "[NO EXISTE]"
    fi
    echo ""
done

# --- AUTH SYSTEM (CRITICAL) ---
echo "=== AUTH SYSTEM FILES ==="
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

# --- SUPABASE CLIENT ---
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

# --- MAIN ENTRY + KEY FILES ---
for key_file in src/main.ts src/app/layers/agentsViewport.ts; do
    echo "=== $key_file ==="
    if [ -f "$key_file" ]; then
        cat "$key_file"
    else
        echo "[NO EXISTE]"
    fi
    echo ""
done

# --- CI/CD WORKFLOWS ---
echo "=== CI/CD WORKFLOWS ==="
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

# --- ALL MIGRATIONS ---
echo "=== ALL SQL MIGRATIONS ==="
for dir in migrations supabase/migrations; do
    if [ -d "$dir" ]; then
        find "$dir" -type f -name "*.sql" | sort | while read file; do
            echo "=== $file ==="
            cat "$file"
            echo ""
        done
    fi
done
echo ""

# --- TESTS ---
echo "=== TEST FILES ==="
find src -path "*__tests__*" -name "*.ts" -o \
  -path "*__tests__*" -name "*.tsx" 2>/dev/null | \
  sort | head -10 | while read file; do
    echo "=== $file ==="
    cat "$file"
    echo ""
done
echo ""

# --- SECURITY DOCS ---
echo "=== SECURITY DOCUMENTATION ==="
if [ -d "docs" ]; then
    find docs -iname "*security*" -o -iname "*auth*" \
      -o -iname "*rls*" 2>/dev/null | \
      sort | head -5 | while read file; do
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
echo "Archivos TypeScript: $(find src -name '*.ts' \
  -o -name '*.tsx' 2>/dev/null | wc -l | tr -d ' ')"
echo "Archivos SQL: $(find migrations supabase/migrations \
  -name '*.sql' 2>/dev/null | wc -l | tr -d ' ')"
echo "Archivos de test: $(find src -path '*__tests__*' \
  2>/dev/null | wc -l | tr -d ' ')"
echo "Líneas de código TS: $(find src -name '*.ts' \
  -exec cat {} \; 2>/dev/null | wc -l | tr -d ' ')"
echo "=========================================="

} > "$OUTPUT_FILE" 2>&1

FILE_SIZE=$(wc -c < "$OUTPUT_FILE" | tr -d ' ')
echo "Archivo generado: $OUTPUT_FILE ($FILE_SIZE bytes)"

if [ "$FILE_SIZE" -gt 102400 ]; then
    echo "⚠️  ADVERTENCIA: Output mayor a 100KB."
    echo "   Considerar reducir archivos incluidos."
    echo ""
    echo "Prioridad de archivos (si necesita recortar):"
    echo "1. Auth system (OBLIGATORIO)"
    echo "2. Supabase client y config (OBLIGATORIO)"
    echo "3. Dockerfile, nginx.conf, CI/CD (OBLIGATORIO)"
    echo "4. Migraciones SQL (OBLIGATORIO)"
    echo "5. Tests (IMPORTANTE)"
    echo "6. Resto de archivos (SI HAY ESPACIO)"
fi

echo ""
echo "✅ Recopilación completada. Archivo: $OUTPUT_FILE"
