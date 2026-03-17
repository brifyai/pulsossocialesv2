# 🚀 Cómo empezar con Pulsos Sociales

Guía rápida para nuevos usuarios de la plataforma.

---

## 📋 Primeros Pasos

### 1. Explora el Mapa 3D

El punto de entrada principal es el **mapa interactivo** de El Golf/Tobalaba:

1. Haz clic en **"Explorar mapa"** desde la página principal
2. Navega el mapa 3D:
   - **Zoom**: Rueda del mouse o gestos de pinza
   - **Rotar**: Click + arrastrar
   - **Inclinar**: Click derecho + arrastrar
3. Observa los edificios, calles y la red peatonal

> 💡 **Tip**: El mapa muestra datos reales de OpenStreetMap con alturas de edificios.

---

### 2. Visualiza Agentes Sintéticos

Los agentes son personas simuladas basadas en datos reales de Chile:

1. Ve a **"Agentes"** en el menú de navegación
2. Explora la lista de agentes sintéticos
3. Usa los **filtros** para segmentar:
   - Región (RM, Valparaíso, etc.)
   - Rango de edad
   - Nivel educacional
   - Decil de ingreso
   - Tipo de agente

> 📊 **Dato**: La plataforma contiene **19.5 millones** de agentes sintéticos distribuidos en las 16 regiones de Chile.

---

### 3. Crea tu Primera Encuesta

Las encuestas sintéticas permiten obtener respuestas de agentes en segundos:

1. Ve a **"Encuestas"** en el menú
2. Haz clic en **"Nueva Encuesta"**
3. Configura el segmento objetivo:
   - Selecciona región/comuna
   - Define filtros demográficos
   - Establece tamaño de muestra
4. Diseña las preguntas:
   - Opción múltiple
   - Escala Likert (1-5)
   - Texto libre
5. Ejecuta la encuesta
6. Revisa los resultados agregados

> ⚡ **Velocidad**: Una encuesta de 1,000 agentes se completa en menos de 5 segundos.

---

### 4. Analiza Resultados

Después de ejecutar una encuesta:

1. Revisa el **dashboard de resultados**
2. Explora las métricas agregadas:
   - Distribución de respuestas
   - Estadísticas por segmento
   - Tasa de completitud
3. Exporta los datos si necesitas análisis externo

---

## 🔄 Flujo Típico de Trabajo

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Explorar  │ → │  Segmentar  │ → │   Diseñar   │ → │   Ejecutar  │
│    Mapa     │    │   Agentes   │    │   Encuesta  │    │   y Analizar│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                  │                  │                  │
      ▼                  ▼                  ▼                  ▼
• Visualizar       • Filtrar por      • Definir          • Obtener
  territorio         región/edad/       preguntas          resultados
• Entender           ingreso          • Configurar         en segundos
  contexto         • Ver datos        • segmento
  geográfico         demográficos
```

---

## 🎯 Casos de Uso Comunes

### Planificación Urbana
- Simular impacto de nuevas infraestructuras
- Entender patrones de movilidad
- Evaluar accesibilidad

### Marketing y Retail
- Testear mensajes con diferentes segmentos
- Simular adopción de productos
- Entender preferencias por región

### Políticas Públicas
- Evaluar receptividad de programas sociales
- Simular comportamiento ante incentivos
- Segmentar población objetivo

### Investigación Académica
- Generar datos sintéticos para estudios
- Simular escenarios hipotéticos
- Validar modelos de comportamiento

---

## 💡 Tips para Demos

### Antes de la Demo
1. **Crea 2-3 encuestas de ejemplo** para mostrar
2. **Testea el flujo completo**: Mapa → Agents → Surveys → Results
3. **Verifica la conexión**: Health check debe mostrar "Conectado"
4. **Prepara datos de contexto**: "19.5M agentes, 16 regiones..."

### Durante la Demo
1. **Empieza con el mapa**: Es visual e impactante
2. **Muestra filtros de agentes**: Demuestra la riqueza de datos
3. **Crea una encuesta simple**: 2-3 preguntas, segmento pequeño
4. **Enfatiza la velocidad**: "Resultados en segundos, no días"
5. **Ten un backup plan**: Si falla algo, muestra datos locales

### Narrativa Sugerida
> "Pulso Social es una plataforma de simulación territorial que modela el comportamiento de poblaciones en entornos urbanos chilenos. Con 19.5 millones de agentes sintéticos basados en datos reales del CASEN y SUBTEL, podemos ejecutar encuestas y análisis de movilidad con alta fidelidad en segundos."

---

## 🔧 Configuración Personal

### Ajustes Recomendados

Ve a **"Configuración"** para personalizar:

| Setting | Recomendación | Por qué |
|---------|---------------|---------|
| Modo calidad premium | ✅ Activado | Mejores visuales en demo |
| Densidad de agentes | Media | Balance visual/rendimiento |
| Mostrar etiquetas | ✅ Activado | Ayuda a orientarse en el mapa |
| Animaciones | ✅ Activado | Mejor experiencia de usuario |

---

## 🆘 Troubleshooting

### Problemas Comunes

#### El mapa no carga
- Verifica que `VITE_MAPTILER_KEY` esté configurado
- Revisa la consola del navegador (F12)
- Intenta recargar la página

#### "Sin datos" en Agents
- Revisa los logs: `[🔵 DB]` vs `[🟡 FALLBACK]`
- Verifica conexión a Supabase en `/health/ui`
- Si está en fallback, los datos son locales (más limitados)

#### Login no funciona
- Si Supabase Auth no está disponible, se crea automáticamente una sesión demo
- El usuario demo tiene acceso completo a la plataforma

#### Encuestas no se guardan
- Verifica que la tabla `survey_definitions` exista en Supabase
- Revisa permisos RLS (Row Level Security)
- En fallback, las encuestas se guardan en localStorage

---

## 📚 Recursos Adicionales

- **Health Check**: `/health/ui` - Estado del sistema
- **Documentación Técnica**: `OPERATIONS_GUIDE.md`
- **Checklist Demo**: `DEMO_CHECKLIST.md`
- **Reportes de Sprints**: `SPRINT_*.md`

---

## 🤝 Soporte

¿Preguntas o problemas?

1. Revisa los logs en la consola del navegador (F12)
2. Consulta el health check: `/health/ui`
3. Revisa la documentación técnica
4. Contacta al equipo de desarrollo

---

**¡Listo para comenzar!** 🚀

Haz clic en **"Explorar mapa"** y empieza a descubrir Pulsos Sociales.
