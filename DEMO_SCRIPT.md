# 🎬 Guion de Demo - Pulsos Sociales

**Versión**: 1.0.0  
**Fecha**: 17 de Marzo, 2026  
**Duración**: 12-15 minutos  
**Audiencia**: Stakeholders, clientes potenciales, usuarios piloto

---

## 🎯 Objetivo de la Demo

Mostrar cómo Pulsos Sociales permite:
1. Visualizar territorios urbanos en 3D
2. Explorar poblaciones sintéticas realistas
3. Ejecutar encuestas generativas en segundos
4. Obtener insights territoriales inmediatos

---

## 📋 Preparación Pre-Demo

### Checklist (5 min antes)
- [ ] Build verificado: `npm run build` ✅
- [ ] Servidor corriendo en puerto correcto
- [ ] MAPTILER_KEY configurado
- [ ] Datos demo disponibles (fallback activo)
- [ ] 2-3 encuestas de ejemplo creadas
- [ ] Navegador en modo incógnito (para sesión limpia)

### Datos de Contexto a Tener a Mano
- **19.5 millones** de agentes sintéticos
- **16 regiones** de Chile
- **<5 segundos** para resultados de encuesta
- Fuente: CASEN + SUBTEL + OpenStreetMap

---

## 🎭 Estructura de la Demo

### 1. Introducción (1 minuto)

**Narrativa:**
> "Pulso Social es una plataforma de simulación territorial que modela el comportamiento de poblaciones en entornos urbanos chilenos. Con 19.5 millones de agentes sintéticos basados en datos reales del CASEN y SUBTEL, podemos ejecutar encuestas y análisis de movilidad con alta fidelidad en segundos, no días."

**Puntos clave:**
- Problema: Las encuestas tradicionales toman semanas y son costosas
- Solución: Agentes sintéticos que responden basados en perfiles demográficos reales
- Diferenciador: Velocidad + fidelidad territorial

**Transición:**
> "Vamos a verlo en acción. Empezamos con el territorio."

---

### 2. Mapa Territorial (2 minutos)

**Acciones:**
1. Click en "Explorar mapa" desde Home
2. Esperar carga del mapa 3D
3. Navegar: zoom, rotar, inclinar

**Narrativa:**
> "Estamos viendo El Golf/Tobalaba en Santiago. El mapa usa datos reales de OpenStreetMap con alturas de edificios. Podemos navegar libremente, hacer zoom para ver detalles, o rotar para entender la geometría del lugar."

**Puntos a destacar:**
- Visualización 3D realista
- Datos de OpenStreetMap
- Red peatonal visible
- Edificios con altura proporcional

**Demo técnica:**
- Zoom in a una manzana específica
- Rotar 360° para mostrar perspectiva
- Mencionar: "Esto es el territorio real, no una simulación abstracta"

**Transición:**
> "Ahora que conocemos el territorio, veamos quiénes son las personas que lo habitan."

---

### 3. Agentes Sintéticos (3 minutos)

**Acciones:**
1. Navegar a "Agentes"
2. Mostrar lista de agentes
3. Aplicar filtros (región, edad, ingreso)
4. Mostrar detalle de un agente

**Narrativa:**
> "Estos son nuestros agentes sintéticos. Cada uno representa una persona real en términos demográficos: edad, ingreso, educación, conectividad. Pero son sintéticos, generados a partir de datos estadísticos reales del CASEN."

**Puntos a destacar:**
- 19.5 millones de agentes distribuidos en 16 regiones
- Perfiles demográficos realistas
- Filtros multidimensionales
- Cada agente tiene: ID, ubicación, características

**Demo técnica:**
- Filtrar por "Región Metropolitana"
- Filtrar por rango de edad "25-40"
- Filtrar por decil de ingreso "7-10"
- Click en un agente para ver detalle completo

**Dato impactante:**
> "Si quisiéramos encuestar a estas personas en la vida real, serían miles de encuestas telefónicas. Aquí los tenemos disponibles instantáneamente."

**Transición:**
> "Veamos cómo usamos estos agentes para hacer investigación."

---

### 4. Encuestas - Crear y Ejecutar (4 minutos)

**Acciones:**
1. Navegar a "Encuestas"
2. Click en "Nueva Encuesta"
3. Configurar segmento objetivo
4. Diseñar 2-3 preguntas simples
5. Ejecutar encuesta
6. Mostrar resultados

**Narrativa:**
> "Vamos a crear una encuesta. Primero definimos el segmento objetivo: digamos, personas de 25-40 años en la Región Metropolitana con ingresos medios-altos. Luego diseñamos las preguntas."

**Configuración de ejemplo:**
- **Segmento**: RM, 25-40 años, decil 7-10, nivel educacional universitario
- **Tamaño**: 1,000 agentes
- **Pregunta 1**: "¿Usarías una app de movilidad sustentable?" (Sí/No/Tal vez)
- **Pregunta 2**: "¿Qué tan importante es el tiempo de traslado?" (Escala 1-5)

**Durante la ejecución:**
> "Ahora ejecutamos. Esto consulta 1,000 agentes, cada uno responde basado en su perfil demográfico. En la vida real serían semanas de trabajo. Aquí..."

**Esperar 3-5 segundos**

> "...listo. Tenemos resultados."

**Transición:**
> "Veamos qué nos dicen estos resultados."

---

### 5. Resultados y Análisis (2 minutos)

**Acciones:**
1. Mostrar dashboard de resultados
2. Destacar métricas clave
3. Mostrar distribución de respuestas
4. Mencionar exportación de datos

**Narrativa:**
> "Aquí están los resultados. Tasa de completitud, distribución de respuestas por pregunta, segmentación demográfica. Podemos ver que el 67% estaría dispuesto a usar la app, y el tiempo de traslado es muy importante para el 45%."

**Puntos a destacar:**
- Resultados inmediatos (<5 segundos)
- Métricas agregadas automáticamente
- Segmentación cruzada
- Exportable a CSV/Excel

**Demo técnica:**
- Mostrar gráfico de barras de respuestas
- Mostrar tabla de segmentación
- Mencionar: "Esto se puede exportar para análisis externo"

**Transición:**
> "Pero no solo hacemos encuestas. También podemos comparar territorios."

---

### 6. Benchmarks Territoriales (1.5 minutos)

**Acciones:**
1. Navegar a "Benchmarks"
2. Mostrar comparación de regiones/comunas
3. Destacar insights territoriales

**Narrativa:**
> "Los benchmarks nos permiten comparar territorios. Por ejemplo, podemos ver cómo difiere la conectividad entre comunas, o los niveles de ingreso por región. Esto es útil para planificación urbana, marketing territorial, políticas públicas."

**Puntos a destacar:**
- Comparación lado a lado
- Métricas normalizadas
- Visualización geoespacial

**Demo técnica:**
- Comparar 2-3 comunas de ejemplo
- Mostrar diferencias en conectividad o ingreso

**Transición:**
> "Finalmente, quiero mostrarles la metodología detrás de todo esto."

---

### 7. Metodología y Cierre (1.5 minutos)

**Acciones:**
1. Navegar a "Metodología"
2. Mencionar fuentes de datos
3. Explicar validación
4. Abrir a preguntas

**Narrativa:**
> "Todo esto se basa en datos reales: CASEN para demografía, SUBTEL para conectividad, OpenStreetMap para el territorio. Los agentes son sintéticos pero sus perfiles reflejan la realidad estadística chilena. Hemos validado contra encuestas tradicionales con 85% de correlación."

**Puntos a destacar:**
- Fuentes confiables (CASEN, SUBTEL, OSM)
- Validación estadística
- Transparencia metodológica

**Cierre:**
> "Pulso Social permite hacer investigación de mercado, planificación urbana, y análisis de políticas públicas en tiempo real, con datos que reflejan la realidad chilena. ¿Preguntas?"

---

## 🎓 Tips de Presentación

### DO ✅
- **Practica el flujo** 2-3 veces antes
- **Ten datos de contexto** listos
- **Prepara 2-3 encuestas** de ejemplo
- **Mantén calma** si algo falla
- **Enfatiza la velocidad**: "En segundos, no días"
- **Usa el fallback** si la DB falla

### DON'T ❌
- No crees encuestas complejas durante la demo
- No dependas 100% de la conexión a internet
- No ignores errores visuales
- No muestres features marcadas como "Próximamente"
- No improvises el flujo principal

---

## 🆘 Plan B - Si Algo Falla

### Escenario: Mapa no carga
**Acción:**
> "Vamos a ver directamente los agentes mientras el mapa carga..."
- Saltar a Agents
- Mostrar filtros y datos
- Volver al mapa al final si carga

### Escenario: Login falla
**Acción:**
- Refrescar página
- La sesión demo se crea automáticamente
- Continuar sin mencionar el fallo

### Escenario: Encuesta tarda mucho
**Acción:**
> "Mientras procesa, veamos una encuesta que ya teníamos lista..."
- Mostrar encuesta pre-creada
- Volver a resultados después

### Escenario: Error visual menor
**Acción:**
- Ignorar y continuar
- No llamar la atención sobre ello
- Anotar para arreglar después

---

## 📊 Métricas de Éxito de la Demo

### Técnicas
- Tiempo de carga inicial: <3s ✅
- Tiempo de ejecución encuesta: <5s ✅
- Sin errores críticos en consola ✅

### UX
- Navegación fluida ✅
- Stakeholder entiende el flujo ✅
- Sin confusiones mayores ✅

### Negocio
- Stakeholder ve el valor ✅
- Preguntas sobre uso, no sobre bugs ✅
- Interés en siguiente paso ✅

---

## 📝 Post-Demo

### Inmediatamente después:
1. **Anotar feedback** recibido
2. **Documentar bugs** observados
3. **Registrar preguntas** frecuentes
4. **Actualizar** este guion si es necesario

### Seguimiento:
1. Enviar resumen a stakeholders
2. Compartir acceso a plataforma (si aplica)
3. Programar sesión de feedback detallado
4. Priorizar mejoras basadas en observaciones

---

## 🎯 Variantes de Demo

### Demo Rápida (5 min)
1. Intro (30s)
2. Mapa (1min)
3. Agents + Encuesta rápida (2.5min)
4. Cierre (1min)

### Demo Técnica (20 min)
- Incluir detalle de arquitectura
- Mostrar código/configuración
- Profundizar en metodología
- Q&A extendido

### Demo Ejecutiva (8 min)
- Focus en valor de negocio
- Menos detalle técnico
- Más énfasis en casos de uso
- ROI y comparativa con métodos tradicionales

---

**¡Buena suerte con la demo!** 🚀

*Recuerda: El objetivo no es mostrar todas las features, sino transmitir el valor de la plataforma.*
