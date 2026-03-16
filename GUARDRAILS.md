# GUARDRAILS TÉCNICOS - Pulso Social
## Documento de Protección del Sistema Estable

**Versión:** 1.0  
**Fecha:** 14 de marzo 2026  
**Estado:** BASE ESTABLE CONGELADA

---

## ⚠️ ADVERTENCIA CRÍTICA

Este documento define los **ARCHIVOS SAGRADOS** del sistema.  
**NO MODIFICAR** sin autorización explícita y revisión de impacto.

---

## 🔴 ARCHIVOS PROHIBIDOS (Sagrados)

### 1. `src/app/initMap.ts`
**Riesgo:** CRÍTICO - Core del mapa  
**Contiene:**
- Inicialización de MapLibre
- Configuración de controles
- Aplicación de estilos cyberpunk
- Setup de eventos del mapa

**Por qué es frágil:**
- Cualquier cambio puede romper la visualización 3D
- Dependencias complejas con MapLibre GL JS
- Orden de inicialización es crítico

**Regla:** Solo tocar si:
- Hay bug crítico de inicialización
- Se agrega feature que REQUIERE cambio en init
- Se hace con PR y review exhaustivo

---

### 2. `src/styles/main.css`
**Riesgo:** CRÍTICO - Estilos globales  
**Contiene:**
- Variables CSS del tema cyberpunk
- Estilos del panel UI
- Customizaciones de MapLibre
- Animaciones y efectos visuales

**Por qué es frágil:**
- CSS global afecta todo
- Selectores pueden romper componentes
- Efectos visuales son parte de la identidad

**Regla:** Solo tocar si:
- Hay bug visual crítico
- Se agrega componente nuevo que necesita estilos
- Se hace con testing visual exhaustivo

---

### 3. `src/app/simulation/agentEngine.ts`
**Riesgo:** CRÍTICO - Motor de simulación  
**Contiene:**
- Loop de animación (requestAnimationFrame)
- Estado de agentes
- Control de simulación (start/pause/reset)
- Actualización de GeoJSON

**Por qué es frágil:**
- Performance crítica
- Estado complejo
- Race conditions posibles
- Integración con MapLibre

**Regla:** Solo tocar si:
- Hay bug en simulación
- Se optimiza performance
- Se agrega feature de simulación
- Se hace con testing de simulación

---

### 4. `src/app/simulation/network.ts`
**Riesgo:** ALTO - Lógica de red peatonal  
**Contiene:**
- Heurística angular
- Cálculo de segmentos
- Lógica de intersecciones

**Por qué es frágil:**
- Algoritmos complejos
- Afecta comportamiento de agentes
- Matemáticas de geodesia

**Regla:** Solo tocar si:
- Hay bug en navegación de agentes
- Se mejora heurística
- Se hace con tests de red

---

### 5. `src/data/elGolfNetwork.ts`
**Riesgo:** ALTO - Datos de red  
**Contiene:**
- Coordenadas de calles
- Segmentos de red
- Nodos de intersección

**Por qué es frágil:**
- Datos hardcodeados
- Referencias cruzadas en código
- Afecta spawning de agentes

**Regla:** Solo tocar si:
- Se corrigen coordenadas
- Se agregan calles
- Se valida con mapa real

---

## 🟡 ARCHIVOS DE ALTO RIESGO

### 6. `src/app/mapConfig.ts`
**Riesgo:** ALTO - Configuración visual  
**Contiene:**
- Colores del tema
- Configuración de cámara
- API keys

**Regla:** Cambios permitidos pero con cuidado. Verificar visual después.

---

### 7. `src/app/layers/*.ts`
**Riesgo:** MEDIO-ALTO - Capas del mapa  
**Contiene:**
- Buildings, Roads, Labels, Agents

**Regla:** Agregar capas nuevas OK. Modificar existentes con cuidado.

---

### 8. `src/ui/panel.ts`
**Riesgo:** MEDIO - UI principal  
**Contiene:**
- Panel de controles
- Event listeners

**Regla:** Agregar controles OK. Modificar existentes verificar funcionalidad.

---

## 🟢 ARCHIVOS SEGUROS PARA MODIFICAR

```
src/app/performance/*       # Nuevo módulo
src/router/*                # Nuevo módulo
src/pages/*                 # Nuevo módulo
src/components/*            # Nuevos componentes
src/services/*              # Nuevos servicios
docs/*                      # Documentación
*.md                        # Documentos
```

---

## 📋 REGLAS DE MODIFICACIÓN

### Antes de tocar cualquier archivo:

1. **Verificar** si está en lista de prohibidos
2. **Justificar** por qué es necesario el cambio
3. **Documentar** el cambio en commit
4. **Testear** exhaustivamente después
5. **Tener rollback plan** listo

### Commits atómicos:

```bash
# Formato: tipo(archivo): descripción

# Ejemplos válidos:
feat(router): agregar navegación básica
fix(panel): corregir z-index de toggle
docs(guardrails): actualizar lista de archivos

# Ejemplos inválidos (no hacer):
feat: cambios varios                    # No específico
fix: arreglos                           # No específico
refactor(initMap): reescribir todo      # Archivo prohibido
```

---

## 🚨 CHECKLIST PRE-MODIFICACIÓN

Antes de modificar cualquier archivo sagrado:

- [ ] ¿Está justificado el cambio?
- [ ] ¿Hay alternativa que no toque el archivo?
- [ ] ¿Se hizo backup o está en git?
- [ ] ¿Se entiende el código que se va a modificar?
- [ ] ¿Se probó en dev después del cambio?
- [ ] ¿Se hizo build y verificó que funciona?
- [ ] ¿Se documentó el cambio?

---

## 🔄 ROLLBACK PLAN

Si algo se rompe:

1. **Inmediato:** `git checkout -- <archivo>` para revertir
2. **Si es commit:** `git revert <commit-hash>`
3. **Si es complejo:** `git reset --hard HEAD~1` (último commit)
4. **Verificar:** `npm run build` debe funcionar
5. **Testear:** Abrir app y verificar mapa funciona

---

## 📞 ESCALACIÓN

Si necesitas modificar un archivo sagrado:

1. Documentar por qué es necesario
2. Proponer cambio mínimo
3. Revisar con otro desarrollador si es posible
4. Hacer en branch separado
5. Testear exhaustivamente

---

## ✅ ESTADO ACTUAL VERIFICADO

| Check | Estado |
|-------|--------|
| Build funciona | ✅ OK |
| Mapa carga | ✅ OK |
| Agentes se mueven | ✅ OK |
| Panel UI funciona | ✅ OK |
| Simulación estable | ✅ OK |

**Base estable congelada el:** 14 de marzo 2026

---

*Este documento es de lectura obligatoria antes de cualquier modificación al sistema.*
