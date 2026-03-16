# =============================================================================
# Dockerfile - Pulsos Sociales Frontend
# =============================================================================
#
# Este Dockerfile construye la aplicación frontend de Pulsos Sociales
# usando Nginx como servidor web estático.
#
# Uso:
#   docker build -t pulsos-sociales .
#   docker run -p 80:80 pulsos-sociales
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

# Argumentos para build (pasados desde docker build --build-arg)
ARG VITE_MAPTILER_KEY
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# ✅ EXPORTAR ARGs COMO ENV para que Vite las vea durante el build
ENV VITE_MAPTILER_KEY=$VITE_MAPTILER_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build de producción con variables de entorno
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production (Nginx)
# -----------------------------------------------------------------------------
FROM nginx:alpine

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build desde stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer puerto
EXPOSE 80

# Health check - usa /health endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Iniciar nginx
CMD ["nginx", "-g", "daemon off;"]
