# Auditoría de Despliegue - Pulsos Sociales en EasyPanel

## 🔍 Análisis de Archivos Actuales

### 1. Dockerfile
```dockerfile
ARG VITE_MAPTILER_KEY
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
RUN npm run build
```
**Problema identificado**: Los ARGs se declaran pero NO se pasan como ENV al build.
Vite necesita las variables como ENV, no solo ARG.

### 2. nginx.conf
✅ Configuración correcta para SPA:
- `try_files $uri $uri/ /index.html` - Fallback SPA correcto
- Gzip habilitado
- Assets cacheados

### 3. EasyPanel Config
```json
"buildArgs": {
  "VITE_MAPTILER_KEY": "orWgcmF4NtAAER2Tgjp2"
}
```
✅ buildArgs está bien configurado

---

## 🚨 PROBLEMA PRINCIPAL ENCONTRADO

### El Dockerfile no exporta los ARGs como ENV

```dockerfile
# ASÍ ESTÁ (mal):
ARG VITE_MAPTILER_KEY
RUN npm run build

# DEBERÍA SER:
ARG VITE_MAPTILER_KEY
ENV VITE_MAPTILER_KEY=$VITE_MAPTILER_KEY
RUN npm run build
```

**Por qué falla:**
- `ARG` = disponible solo en tiempo de build del Dockerfile
- `ENV` = disponible para los procesos que corren (como `npm run build`)
- Vite lee `process.env.VITE_*` durante el build
- Sin `ENV`, Vite no ve la variable

---

## ✅ CORRECCIÓN MÍNIMA REQUERIDA

### Dockerfile corregido:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Argumentos del build
ARG VITE_MAPTILER_KEY
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# ✅ EXPORTAR COMO ENV (esto faltaba)
ENV VITE_MAPTILER_KEY=$VITE_MAPTILER_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# Stage 2: Production
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🔧 CHECKLIST DE DIAGNÓSTICO

### Paso 1: Verificar Build Logs en EasyPanel
Busca estas líneas en los logs de build:
```
# ✅ Debería aparecer:
Step X/XX : ARG VITE_MAPTILER_KEY
Step X/XX : ENV VITE_MAPTILER_KEY=orWgcmF4NtAAER2Tgjp2

# ❌ Si no aparece ENV, el build no tiene la variable
```

### Paso 2: Verificar en DevTools del Navegador

#### Console:
Busca errores tipo:
- `VITE_MAPTILER_KEY is not defined`
- `Cannot read properties of undefined`
- `MapTiler key required`

#### Network:
- ¿Carga `index.html`? (debería ser 200)
- ¿Cargan los assets JS/CSS? (deberían ser 200)
- ¿Algún 404 en assets?

### Paso 3: Verificar Runtime
Si el HTML carga pero la app no funciona:
1. Abre DevTools → Sources
2. Busca el archivo JS principal
3. Busca `"orWgcmF4NtAAER2Tgjp2"` o `"VITE_MAPTILER_KEY"`
4. Si no aparece, la variable no se inyectó en build

---

## 📋 CONFIGURACIÓN CORRECTA PARA EASYPANEL

### Opción A: Usar buildArgs (recomendado)

```json
{
  "build": {
    "type": "dockerfile",
    "dockerfile": "Dockerfile",
    "buildArgs": {
      "VITE_MAPTILER_KEY": "orWgcmF4NtAAER2Tgjp2"
    }
  }
}
```

**Requiere**: Dockerfile con `ENV` después de `ARG`

### Opción B: Usar ENV (alternativa)

```json
{
  "build": {
    "type": "dockerfile",
    "dockerfile": "Dockerfile"
  },
  "env": {
    "VITE_MAPTILER_KEY": "orWgcmF4NtAAER2Tgjp2"
  }
}
```

**Requiere**: Dockerfile que lea ENV en build time

---

## 🎯 HIPÓTESIS ORDENADAS

### 1. Más probable: Variables no inyectadas en build
**Evidencia**: Dockerfile tiene ARG pero no ENV
**Impacto**: App compila sin `VITE_MAPTILER_KEY`
**Solución**: Agregar `ENV` después de `ARG` en Dockerfile

### 2. Segunda opción: EasyPanel no pasa buildArgs
**Evidencia**: Config parece correcta pero no funciona
**Verificación**: Revisar build logs en EasyPanel
**Solución**: Probar con ENV en lugar de buildArgs

### 3. Tercera opción: Problema de assets
**Evidencia**: HTML carga pero JS no
**Verificación**: Tab Network en DevTools
**Solución**: Verificar nginx.conf (parece correcto)

---

## ✅ ACCIÓN INMEDIATA

### 1. Corregir Dockerfile
Agregar líneas `ENV` después de `ARG`

### 2. Hacer commit y push

### 3. En EasyPanel:
- Forzar rebuild (no solo restart)
- Verificar build logs
- Probar URL

### 4. Si sigue fallando:
- Abrir DevTools → Console
- Copiar errores
- Revisar Network tab

---

## 📝 COMANDOS PARA DEBUG LOCAL

```bash
# Build local con variable
docker build \
  --build-arg VITE_MAPTILER_KEY=orWgcmF4NtAAER2Tgjp2 \
  -t pulsos-test .

# Correr local
docker run -p 8080:80 pulsos-test

# Verificar variable inyectada
docker run --rm pulsos-test sh -c "cat /usr/share/nginx/html/assets/index-*.js | grep -o 'orWgcmF4NtAAER2Tgjp2' || echo 'NO ENCONTRADO'"
```

---

## RESUMEN EJECUTIVO

| Aspecto | Estado | Nota |
|---------|--------|------|
| nginx.conf | ✅ OK | SPA fallback correcto |
| EasyPanel config | ✅ OK | buildArgs bien configurado |
| Dockerfile | ❌ FALTA | Falta `ENV` después de `ARG` |
| Variable inyección | ❌ ROTA | Vite no ve la variable |

**Fix requerido**: Agregar `ENV VITE_MAPTILER_KEY=$VITE_MAPTILER_KEY` en Dockerfile
