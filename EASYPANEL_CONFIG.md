# Configuración EXACTA para EasyPanel

## Variables de Entorno (Environment Variables)

```
VITE_MAPTILER_KEY=orWgcmF4NtAAER2Tgjp2
```

**SOLO esta variable. Nada más.**

---

## ❌ ELIMINA estas variables (NO sirven para esta app):

- ~~`NODE_ENV=production`~~ - No se usa
- ~~`REACT_APP_ENVIRONMENT=production`~~ - Es para React, no Vite
- ~~`PORT=4116`~~ - El contenedor usa puerto 80
- ~~`REACT_APP_SUPABASE_URL`~~ - Variable incorrecta
- ~~`REACT_APP_SUPABASE_ANON_KEY`~~ - Variable incorrecta
- ~~`SUPABASE_SERVICE_ROLE_KEY`~~ - No necesaria

---

## 🔧 Configuración de Puertos

| Configuración | Valor |
|---------------|-------|
| **Container Port** | `80` |
| **Service Port** | `80` |

---

## 📋 Resumen de Configuración en EasyPanel

### 1. Environment Variables:
```
VITE_MAPTILER_KEY=orWgcmF4NtAAER2Tgjp2
```

### 2. Ports:
- Container: `80`
- Service: `80`

### 3. Build:
- Type: `Dockerfile`
- Dockerfile: `Dockerfile` (en raíz del repo)

---

## 🚀 ¿Por qué funciona así?

- App hecha con **Vite** (no Create React App)
- Vite usa variables `VITE_*`
- Dockerfile configura `NODE_ENV=production` automáticamente
- Contenedor expone puerto **80** (Nginx)
- Sin `VITE_SUPABASE_URL`, app entra en **modo demo** automáticamente

---

## ⚡ Pasos para Configurar

1. Ve a tu proyecto en EasyPanel
2. Elimina TODAS las variables de entorno actuales
3. Agrega solo: `VITE_MAPTILER_KEY=orWgcmF4NtAAER2Tgjp2`
4. Asegúrate que Container Port sea `80`
5. Redeploy
