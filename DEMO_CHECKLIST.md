# ✅ Checklist Demo/Piloto - Pulsos Sociales

**Versión**: 1.2.0  
**Fecha**: 17 de Marzo, 2026  
**Propósito**: Verificar readiness antes de presentaciones serias o usuarios piloto

---

## 📋 Pre-Demo (8 items críticos)

### Build y Tests
- [ ] **Build exitoso**: `npm run build` completa sin errores
- [ ] **Tests pasan**: `npm test` → 69/69 tests ✅
- [ ] **TypeScript limpio**: `npx tsc --noEmit` sin errores

### Configuración
- [ ] **MAPTILER_KEY**: Variable configurada y válida
- [ ] **SUPABASE_URL**: Conexión a DB configurada (o fallback listo)
- [ ] **Health check**: `/health` responde "healthy"

### Datos
- [ ] **Territories**: 16 regiones cargadas desde DB
- [ ] **Agentes**: Datos accesibles (DB o fallback)

---

## 🎬 Durante Demo (7 items de verificación)

### Navegación y UI
- [ ] **Mapa 3D**: Carga en <3s, navegación fluida
- [ ] **Responsive**: Se ve bien en resolución de demo (laptop/tablet)
- [ ] **Sin errores visuales**: No hay glitches ni elementos rotos

### Funcionalidad Core
- [ ] **Agents**: Filtros funcionan, datos consistentes
- [ ] **Surveys**: Flujo completo Crear → Ejecutar → Ver resultados

### UX Polish
- [ ] **Perfil**: Información visible, UI pulida
- [ ] **Settings**: Cambios se guardan con feedback visual

---

## 📝 Post-Demo (5 items de cierre)

### Validación
- [ ] **Logs limpios**: Consola sin errores críticos (F12)
- [ ] **Datos persistidos**: Encuestas creadas siguen disponibles
- [ ] **Sesión estable**: No expiró durante la demo

### Documentación
- [ ] **Feedback recopilado**: Notas de observadores anotadas
- [ ] **Issues documentados**: Bugs menores registrados

---

## 🚨 Red Flags - Problemas Críticos

| Síntoma | Posible Causa | Acción Inmediata |
|---------|---------------|------------------|
| **Mapa negro/blank** | MAPTILER_KEY inválido | Verificar `.env` o variables de entorno |
| **"Sin datos" en Agents** | Fallo de conexión DB | Revisar logs `[🔵 DB]` vs `[🟡 FALLBACK]` |
| **Login infinito** | Supabase Auth down | Refrescar página → sesión demo automática |
| **Encuestas no guardan** | Tabla no existe | Verificar schema en Supabase |
| **UI extremadamente lenta** | Muchos agentes renderizados | Ir a Settings → reducir "Densidad de agentes" |
| **Errores 404 en assets** | Build incompleto | Reconstruir: `npm run build` |
| **Health check falla** | Servidor no responde | Verificar `docker ps` o `npm run dev` |

---

## 🎯 Escenarios de Demo

### Escenario 1: Demo con Conexión DB (Ideal)

**Setup**:
- Supabase configurado y accesible
- 19.5M agentes disponibles
- Encuestas persisten en DB

**Flujo**:
1. Login (o sesión demo)
2. Mapa 3D → "Como ven, tenemos datos reales de El Golf..."
3. Agents → "19.5 millones de agentes sintéticos..."
4. Surveys → Crear encuesta simple → Ejecutar
5. Results → "Resultados en segundos, no días"

**Duración**: 10-15 minutos

---

### Escenario 2: Demo sin Conexión DB (Fallback)

**Setup**:
- Supabase no disponible
- Fallback a datos locales activado
- Funcionalidad limitada pero estable

**Flujo**:
1. Login automático (demo session)
2. Mapa 3D → "Datos locales de El Golf..."
3. Agents → "Muestra representativa de agentes..."
4. Surveys → Crear encuesta → Guarda en localStorage
5. "En producción con DB, esto persiste..."

**Duración**: 8-12 minutos

---

### Escenario 3: Demo Rápida (5 min)

**Focus**: Impacto visual + Velocidad

**Flujo**:
1. Mapa 3D (30s) → "Visualización 3D de territorio"
2. Agents (1min) → "19.5M agentes sintéticos"
3. Surveys (2min) → Crear + Ejecutar rápido
4. Results (1min) → "Resultados instantáneos"
5. Cierre (30s) → "¿Preguntas?"

---

## 💬 Narrativa Sugerida

### Intro (30s)
> "Pulso Social es una plataforma de simulación territorial que modela el comportamiento de poblaciones en entornos urbanos chilenos. Con 19.5 millones de agentes sintéticos basados en datos reales del CASEN y SUBTEL, podemos ejecutar encuestas y análisis de movilidad con alta fidelidad en segundos."

### Demo Mapa (2min)
> "Aquí vemos El Golf/Tobalaba en Santiago. El mapa usa datos reales de OpenStreetMap con alturas de edificios. Podemos navegar, hacer zoom, y explorar la red peatonal."

### Demo Agents (3min)
> "Estos son nuestros agentes sintéticos. Cada uno representa una persona real en términos demográficos: edad, ingreso, educación, conectividad. Podemos filtrar por cualquier criterio."

### Demo Surveys (4min)
> "Ahora creamos una encuesta. Definimos el segmento objetivo, diseñamos preguntas, y ejecutamos. En producción, esto consulta 19.5M agentes y genera respuestas sintéticas basadas en sus perfiles."

### Cierre (30s)
> "Los resultados están listos. Tasa de completitud, distribución de respuestas, todo en segundos. ¿Preguntas?"

---

## 🔧 Comandos de Emergencia

### Verificar Estado
```bash
# Health check
curl http://localhost/health

# Ver logs
docker logs -f pulsos-frontend

# Verificar build
ls -la dist/
```

### Recuperación Rápida
```bash
# Rebuild completo
npm run build

# Reiniciar dev server
npm run dev

# Docker rebuild
docker-compose down && docker-compose up -d --build
```

### Fallback Manual
```bash
# Si Supabase falla, la app automáticamente usa fallback
# Verificar en logs:
grep "FALLBACK" dist/assets/*.js
```

---

## 📊 Métricas de Éxito

### Técnicas
- **Tiempo de carga inicial**: <3s
- **Tiempo entre páginas**: <1s
- **Tiempo de ejecución de encuesta**: <5s para 1,000 agentes
- **Uptime durante demo**: 100%

### UX
- **Navegación fluida**: Sin lag ni freezes
- **Sin errores visuales**: ✅
- **Feedback claro**: Usuario entiende qué está pasando

### Funcionalidad
- **Flujo completo**: Mapa → Agents → Surveys → Results
- **Datos consistentes**: Sin discrepancias
- **Persistencia**: Encuestas guardadas permanecen

---

## 🎓 Tips para Presentadores

### DO ✅
1. **Practica el flujo** 2-3 veces antes
2. **Ten datos de contexto** listos: "19.5M agentes, 16 regiones..."
3. **Prepara 2-3 encuestas** de ejemplo
4. **Ten un backup plan**: Si falla algo, muestra fallback
5. **Mantén calma**: Los fallos menores no arruinan la demo

### DON'T ❌
1. **No improvises** el flujo principal
2. **No crees encuestas complejas** durante la demo
3. **No ignores** errores visuales
4. **No dependas 100%** de la conexión a internet
5. **No muestres** features marcadas como "Próximamente"

---

## 📞 Contactos de Emergencia

| Rol | Contacto | Cuándo llamar |
|-----|----------|---------------|
| **Tech Lead** | [Nombre] | Fallo técnico crítico |
| **Product Owner** | [Nombre] | Preguntas de negocio |
| **DevOps** | [Nombre] | Problemas de deploy |

---

## ✅ Checklist Final

Antes de empezar la demo, verifica:

- [ ] Este checklist está completo
- [ ] Tienes acceso a los logs
- [ ] Tienes acceso al servidor
- [ ] Tienes plan B listo
- [ ] Estás cómodo con la narrativa

---

**¡Buena suerte con la demo!** 🚀

*Recuerda: Una demo perfecta no existe. Lo importante es mostrar el valor de la plataforma.*
