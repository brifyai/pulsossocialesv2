# =============================================================================
# Dockerfile - Pulsos Sociales Frontend
# =============================================================================
#
# Este Dockerfile construye la aplicación frontend de Pulsos Sociales
# usando Nginx como servidor web estático.
#
# Uso:
#   docker build -t pulsos-sociales .
#   docker run -p 80:80 -e VITE_SUPABASE_URL=... pulsos-sociales
#
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Instalar dependencias necesarias para build
RUN apk add --no-cache git

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Build de producción
# Nota: Las variables de entorno VITE_* deben estar disponibles en build time
# o configurarse en runtime via envsubst (ver stage 2)
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production (Nginx)
# -----------------------------------------------------------------------------
FROM nginx:alpine

# Instalar envsubst para reemplazar variables en runtime
RUN apk add --no-cache gettext

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build desde stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Script de entrypoint para reemplazar variables de entorno
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo '# Reemplazar variables de entorno en archivos JS' >> /docker-entrypoint.sh && \
    echo 'for file in /usr/share/nginx/html/assets/index-*.js; do' >> /docker-entrypoint.sh && \
    echo '  if [ -f "$file" ]; then' >> /docker-entrypoint.sh && \
    echo '    echo "Processing: $file"' >> /docker-entrypoint.sh && \
    echo '    envsubst < "$file" > /tmp/replaced.js' >> /docker-entrypoint.sh && \
    echo '    mv /tmp/replaced.js "$file"' >> /docker-entrypoint.sh && \
    echo '  fi' >> /docker-entrypoint.sh && \
    echo 'done' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo '# Iniciar nginx' >> /docker-entrypoint.sh && \
    echo 'nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Exponer puerto
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
