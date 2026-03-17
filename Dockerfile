# =============================================================================
# Dockerfile - Pulsos Sociales Frontend
# =============================================================================
# Versión: 1.1.0
# Descripción: Build multi-stage optimizado para producción
# =============================================================================
#
# Uso:
#   docker build -t pulsos-sociales .
#   docker run -p 80:80 pulsos-sociales
#
# Con variables de entorno:
#   docker build -t pulsos-sociales \
#     --build-arg VITE_MAPTILER_KEY=xxx \
#     --build-arg VITE_SUPABASE_URL=xxx \
#     --build-arg VITE_SUPABASE_ANON_KEY=xxx .
#
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Copiar solo package.json para aprovechar cache
COPY package*.json ./

# Instalar dependencias con npm ci (más rápido y reproducible)
RUN npm ci --only=production && npm cache clean --force

# -----------------------------------------------------------------------------
# Stage 2: Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Instalar dependencias necesarias para build
RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Copiar dependencias desde stage deps
COPY --from=deps /app/node_modules ./node_modules

# Copiar archivos de configuración
COPY package*.json tsconfig.json vitest.config.ts ./

# Copiar código fuente
COPY src ./src
COPY public ./public
COPY index.html ./

# Argumentos para build (pasados desde docker build --build-arg)
ARG VITE_MAPTILER_KEY
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG BUILD_DATE
ARG VCS_REF

# Exportar ARGs como ENV para que Vite las vea durante el build
ENV VITE_MAPTILER_KEY=$VITE_MAPTILER_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_BUILD_DATE=$BUILD_DATE
ENV VITE_VCS_REF=$VCS_REF

# Build de producción
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production (Nginx)
# -----------------------------------------------------------------------------
FROM nginx:alpine

# Labels para identificación
LABEL maintainer="Pulsos Sociales Team"
LABEL version="1.1.0"
LABEL description="Pulsos Sociales - Frontend Application"

# Crear directorio para logs
RUN mkdir -p /var/log/nginx

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build desde stage builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Crear archivo de versión
RUN echo "{\"version\":\"1.1.0\",\"buildDate\":\"${BUILD_DATE}\",\"vcsRef\":\"${VCS_REF}\"}" > /usr/share/nginx/html/version.json

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Exponer puerto
EXPOSE 80

# Script de inicio para logs
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'echo "========================================"' >> /docker-entrypoint.sh && \
    echo 'echo "Pulsos Sociales - Starting..."' >> /docker-entrypoint.sh && \
    echo 'echo "Version: 1.1.0"' >> /docker-entrypoint.sh && \
    echo 'echo "Build Date: ${BUILD_DATE:-unknown}"' >> /docker-entrypoint.sh && \
    echo 'echo "Git Ref: ${VCS_REF:-unknown}"' >> /docker-entrypoint.sh && \
    echo 'echo "========================================"' >> /docker-entrypoint.sh && \
    echo 'nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Iniciar nginx
ENTRYPOINT ["/docker-entrypoint.sh"]
