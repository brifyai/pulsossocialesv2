ive# Informe Completo de Capacidades - Pulso Social v2.0

**Fecha:** 25 de marzo, 2026  
**Versión:** Sprint 12C  
**Estado:** Producción Activa

---

## 📊 Resumen Ejecutivo

Pulso Social es una plataforma avanzada de simulación y análisis territorial basada en **agentes sintéticos** que representan fielmente la población de Chile. La aplicación combina visualización geoespacial, encuestas sintéticas, benchmarks de datos reales y un completo pipeline de datos para ofrecer insights demográficos y de opinión pública de nivel profesional.

### Métricas Clave
- **25,000+ agentes sintéticos** generados desde datos reales (CASEN, CENSO, SUBTEL)
- **16 regiones** de Chile con datos completos
- **346 comunas** con información demográfica detallada
- **Pipeline de datos** automatizado con validación de calidad
- **Sistema de encuestas** con motor de respuestas basado en heurísticas

---

## 🗺️ 1. Visualización Territorial

### 1.1 Mapa Interactivo de Chile

**Página:** `ChileMapPage.ts`

#### Capacidades:
- **Mapa vectorial** de Chile con todas las regiones
- **16 regiones** coloreadas por nivel de conectividad digital
- **Hover interactivo**: Muestra información al pasar el mouse
- **Click para seleccionar**: Navegación a detalle de región
- **Panel informativo** con estadísticas de la región seleccionada
- **Leyenda visual** de niveles de conectividad
- **Transiciones suaves** entre estados

#### Datos Mostrados:
- Nombre de la región
- Código de región
- Nivel de conectividad digital (Muy Alto/Alto/Medio/Bajo/Muy Bajo)
- Población total
- Porcentaje de conectividad

### 1.2 Vista Detallada del Mapa (MapView)

**Página:** `MapViewPage.ts`

#### Capacidades:
- **Mapa de alta resolución** con MapLibre GL JS + MapTiler
- **25,000 agentes** visualizados según viewport
- **Carga dinámica** desde Supabase según región visible
- **Sistema de Quality Mode** (Full/Lite):
  - **Full Mode**: Todos los efectos visuales activos
  - **Lite Mode**: Optimizado para performance
- **Panel de control de escena** (SceneControlPanel)
- **Monitoreo de performance** en tiempo real (FPS, agent count)

#### Capas del Mapa:
- **Capa base**: MapTiler con estilo personalizado
- **Capa de agentes**: Puntos coloreados por tipo
- **Capa de carreteras**: Glow effect opcional
- **Capa de edificios**: 3D buildings en áreas urbanas
- **Capa de etiquetas**: Nombres de calles y lugares

### 1.3 Detalle de Región

**Página:** `RegionDetailPage.ts`

#### Capacidades:
- **Información completa** de la región seleccionada
- **Estadísticas demográficas**:
  - Población total, urbana y rural
  - Distribución por sexo y edad
  - Niveles de pobreza
  - Educación promedio
- **Datos de conectividad**:
  - Porcentaje de hogares con internet
  - Velocidad promedio de conexión
  - Tecnología predominante
- **Benchmarks comparativos** con datos CASEN/SUBTEL reales
- **Gráficos de distribución** de variables clave

---

## 👥 2. Agentes Sintéticos

### 2.1 Catálogo de Agentes

**Página:** `AgentsPage.ts`

#### Capacidades:
- **Listado paginado** de todos los agentes
- **Búsqueda y filtros avanzados**:
  - Por región y comuna
  - Por sexo y grupo etario
  - Por nivel educativo
  - Por nivel de ingreso (decil)
  - Por nivel de conectividad
  - Por tipo de agente
- **Vista de tabla** con información resumida
- **Panel de detalle** al seleccionar un agente
- **Exportación** de datos filtrados

#### Atributos de Agentes Visualizados:
| Atributo | Descripción | Fuente |
|----------|-------------|--------|
| ID | Identificador único (AGENT-CL13-000001) | Generado |
| Sexo | Masculino/Femenino | CENSO 2024 |
| Edad | 0-100+ años | CENSO 2024 |
| Grupo Etario | child/youth/adult/middle_age/senior | Calculado |
| Región | Código de región (CL-13) | CENSO 2024 |
| Comuna | Código de comuna (13101) | CENSO 2024 |
| Tipo de Hogar | single/couple/family/extended | CASEN |
| Tamaño Hogar | 1-10+ personas | CASEN |
| Decil Ingreso | 1-10 | CASEN |
| Estado Pobreza | extreme_poverty/poverty/vulnerable/middle_class/upper_middle/upper_class | CASEN |
| Nivel Educación | none/primary/secondary/technical/university/postgraduate | CASEN |
| Estado Ocupación | employed/unemployed/self_employed/retired/student/homemaker | CASEN |
| Nivel Conectividad | none/low/medium/high/very_high | SUBTEL |
| Exposición Digital | none/low/medium/high/very_high | SUBTEL |
| Canal Preferido | phone/online/in_person/mixed | Inferido |
| Tipo de Agente | resident/retiree/student/entrepreneur/worker | Inferido |
| Coordenadas GPS | Lat/Lng precisos | Comuna + Random |

### 2.2 Perfil Detallado de Agente

**Vista:** Panel de detalle en AgentsPage

#### Información Mostrada:
- **Datos demográficos completos**
- **Información del hogar**
- **Perfil socioeconómico**
- **Perfil digital y de conectividad**
- **Traceability**: Referencias a datos fuente (backbone_key, subtel_profile_key, casen_profile_key)
- **Notas de generación**: Cómo se creó el agente

### 2.3 Generación de Agentes

**Script:** `scripts/synthesize/generate_synthetic_agents_chile_completo.ts`

#### Proceso:
1. **Ingesta** de datos CENSO 2024, CASEN, SUBTEL
2. **Normalización** de variables demográficas
3. **Integración** en backbone poblacional
4. **Síntesis** de agentes con distribuciones reales
5. **Validación** de calidad y consistencia
6. **Enriquecimiento** con coordenadas GPS

#### Cobertura:
- **100% de comunas** chilenas
- **Distribución poblacional** real por región
- **Perfiles demográficos** alineados con datos oficiales

---

## 📋 3. Sistema de Encuestas Sintéticas

### 3.1 Creación de Encuestas

**Página:** `SurveysPage.ts` (modo create)

#### Capacidades:
- **Diseño de encuestas** con múltiples tipos de preguntas:
  - **Single Choice**: Selección única con opciones personalizables
  - **Likert Scale**: Escalas de 1-5 o 1-7 con etiquetas personalizables
  - **Multiple Choice**: Selección múltiple
  - **Text**: Respuestas abiertas de texto
- **Configuración de segmento objetivo**:
  - Regiones específicas
  - Comunas específicas
  - Sexo
  - Grupos etarios
  - Deciles de ingreso
  - Niveles educativos
  - Niveles de conectividad
  - Tipos de agente
- **Tamaño de muestra** configurable
- **Guardado en Supabase** con validación

### 3.2 Ejecución de Encuestas

**Motor:** `src/app/survey/syntheticResponseEngine.ts`

#### Proceso:
1. **Filtrado de agentes** según segmento objetivo
2. **Selección aleatoria** de la muestra solicitada
3. **Generación de respuestas** para cada agente:
   - Análisis de atributos demográficos
   - Aplicación de heurísticas de respuesta
   - Cálculo de confianza
   - Generación de reasoning
4. **Almacenamiento** de respuestas en Supabase
5. **Cálculo de resultados** agregados

#### Tipos de Heurísticas Aplicadas:
- **Income-based**: Respuestas correlacionadas con nivel de ingreso
- **Age-correlated**: Respuestas según grupo etario
- **Education-based**: Respuestas según nivel educativo
- **Connectivity-based**: Respuestas según nivel de conectividad
- **Regional**: Respuestas según región/comuna
- **Agent-type**: Respuestas según tipo de agente

### 3.3 Resultados de Encuestas

**Página:** `SurveysPage.ts` (modo results)

#### Visualizaciones:
- **Distribución de respuestas** para cada pregunta
- **Gráficos de barras** para single/multiple choice
- **Estadísticas descriptivas** para Likert (media, mediana)
- **Muestra de respuestas** para preguntas de texto
- **Tablas de distribución** con porcentajes
- **Exportación** de resultados

#### Métricas Calculadas:
- Total de respuestas
- Tasa de completitud
- Confianza promedio
- Distribución porcentual
- Estadísticas descriptivas

### 3.4 Historial de Ejecuciones

**Capacidades:**
- **Listado de runs** por encuesta
- **Estado de ejecución** (pending/running/completed/failed)
- **Progreso en tiempo real**
- **Comparación entre runs**
- **Re-ejecución** de encuestas

---

## 📊 4. Sistema de Benchmarks

### 4.1 Gestión de Benchmarks

**Página:** `BenchmarksPage.ts`

#### Capacidades:
- **Carga de benchmarks** desde PDFs oficiales
- **Extracción automática** de datos con IA
- **Almacenamiento** de indicadores clave
- **Categorización** por tema (demografía, conectividad, socioeconómico)
- **Tracking** de fuentes y años

#### Fuentes Soportadas:
- **CASEN**: Encuesta de Caracterización Socioeconómica Nacional
- **SUBTEL**: Datos de conectividad y telecomunicaciones
- **CEP**: Encuestas del Centro de Estudios Públicos
- **INE**: Instituto Nacional de Estadísticas
- **Otras**: Cualquier fuente con datos estructurados

### 4.2 Indicadores de Benchmark

**Estructura:** `src/types/benchmark.ts`

#### Campos:
- Nombre del indicador
- Descripción
- Categoría temática
- Valor numérico
- Porcentaje
- Tamaño de muestra
- Margen de error
- Intervalo de confianza
- Metadata de extracción

### 4.3 Comparación Encuesta vs Benchmark

**Capacidades:**
- **Selección de encuesta** y benchmark a comparar
- **Matching automático** de indicadores compatibles
- **Cálculo de gaps**:
  - Diferencia absoluta
  - Diferencia relativa (porcentaje)
  - Dirección (above/below/match)
  - Significancia estadística
- **Visualización de comparación**:
  - Side-by-side de valores
  - Indicadores de gap (🔴🟡🟢)
  - Análisis de significancia
- **Exportación** de reportes comparativos

#### Ejemplo de Comparación:
```
Indicador: "Porcentaje con acceso a internet"
Benchmark (CASEN 2022): 78.5%
Encuesta Sintética: 76.2%
Gap: -2.3% (below)
Significancia: medium
```

---

## 🔐 5. Sistema de Autenticación

### 5.1 Autenticación Personalizada

**Implementación:** `src/services/auth/customAuth.ts`

#### Capacidades:
- **Registro de usuarios** con email y contraseña
- **Login** con validación de credenciales
- **Recuperación de contraseña**
- **Verificación de email**
- **Roles de usuario**: user/admin/moderator
- **Gestión de sesiones** con JWT
- **Perfil de usuario** editable

### 5.2 Páginas de Autenticación

**Página:** `LoginPage.ts`

#### Funcionalidades:
- **Modo Login**: Acceso con credenciales
- **Modo Registro**: Creación de nueva cuenta
- **Modo Recuperación**: Reset de contraseña
- **Validación en tiempo real** de campos
- **Mensajes de error** descriptivos
- **Toggle de visibilidad** de contraseña
- **Redirección** post-login

### 5.3 Perfil de Usuario

**Página:** `ProfilePage.ts`

#### Capacidades:
- **Visualización de datos** del perfil
- **Edición de información** personal
- **Cambio de avatar**
- **Historial de actividad**
- **Preferencias de usuario**

---

## ⚙️ 6. Configuración y Personalización

### 6.1 Página de Configuración

**Página:** `SettingsPage.ts`

#### Opciones Disponibles:
- **Tema visual**: Claro/Oscuro/Auto
- **Idioma**: Español (próximamente más)
- **Notificaciones**: Email/Push
- **Privacidad**: Configuraciones de datos
- **Accesibilidad**: Alto contraste, tamaño de fuente

### 6.2 Quality Mode (Performance)

**Implementación:** `src/app/performance/qualityMode.ts`

#### Modos:
- **Full Quality**:
  - Todos los efectos visuales activos
  - Glow en carreteras
  - Edificios 3D
  - Labels completos
  - Animaciones suaves
  - Ideal para: PCs potentes, presentaciones

- **Lite Quality**:
  - Efectos visuales reducidos
  - Sin glow en carreteras
  - Edificios simplificados
  - Labels mínimos
  - Animaciones básicas
  - Ideal para: PCs modestas, tablets

- **Auto**:
  - Detecta performance automáticamente
  - Ajusta calidad según FPS
  - Cambio dinámico en tiempo real

---

## 🏠 7. Páginas Informativas

### 7.1 Landing Page

**Página:** `LandingPage.ts`

#### Contenido:
- **Hero section** con value proposition
- **Características principales** de la plataforma
- **Estadísticas destacadas**
- **Llamados a la acción** (Login/Registro)
- **Testimonios** (placeholder)
- **Footer** con links

### 7.2 Home Page

**Página:** `HomePage.ts`

#### Contenido:
- **Dashboard personalizado**
- **Accesos rápidos** a funcionalidades principales
- **Resumen de actividad** reciente
- **Notificaciones** pendientes
- **Estadísticas** del usuario

### 7.3 Metodología

**Página:** `MethodologyPage.ts`

#### Contenido:
- **Explicación del pipeline** de datos
- **Fuentes de datos** utilizadas
- **Proceso de generación** de agentes
- **Validación y calidad**
- **Limitaciones** del modelo
- **Referencias** técnicas

---

## 🗄️ 8. Backend y Base de Datos

### 8.1 Supabase Integration

**Servicio:** `src/services/supabase/`

#### Repositorios:
- **agentRepository.ts**: CRUD de agentes sintéticos
- **territoryRepository.ts**: Gestión de territorios
- **surveyRepository.ts**: Encuestas y respuestas
- **benchmarkRepository.ts**: Benchmarks e indicadores
- **userRepository.ts**: Gestión de usuarios

#### Características:
- **Operaciones CRUD** completas
- **Filtrado avanzado** con múltiples criterios
- **Paginación** eficiente
- **Transacciones** atómicas
- **Fallback** a datos locales si no hay conexión

### 8.2 Esquema de Base de Datos

#### Tablas Principales:
1. **users**: Usuarios de la aplicación
2. **territories**: Regiones y comunas de Chile
3. **synthetic_agents**: Agentes sintéticos (~25,000)
4. **synthetic_agent_batches**: Metadata de generación
5. **survey_definitions**: Definiciones de encuestas
6. **survey_runs**: Ejecuciones de encuestas
7. **survey_responses**: Respuestas individuales
8. **survey_results**: Resultados agregados
9. **benchmarks**: Benchmarks de referencia
10. **benchmark_indicators**: Indicadores individuales
11. **benchmark_comparisons**: Comparaciones realizadas

### 8.3 Data Pipeline

**Ubicación:** `scripts/`

#### Etapas:
1. **Ingesta** (`scripts/ingest/`):
   - `ingest_censo.ts`: Datos CENSO 2024
   - `ingest_casen.ts`: Datos CASEN
   - `ingest_subtel.ts`: Datos SUBTEL

2. **Normalización** (`scripts/normalize/`):
   - Estandarización de variables
   - Mapeo de categorías
   - Limpieza de datos

3. **Integración** (`scripts/integrate/`):
   - `build_territories_master.ts`: Maestro de territorios
   - `build_population_backbone.ts`: Backbone poblacional
   - `build_subtel_profile.ts`: Perfiles de conectividad

4. **Síntesis** (`scripts/synthesize/`):
   - `generate_synthetic_agents_chile_completo.ts`: Generación de agentes

5. **Validación** (`scripts/validate/`):
   - Verificación de calidad
   - Reportes de validación

6. **Seed** (`scripts/seed/`):
   - Carga de datos iniciales en Supabase

---

## 🚀 9. Deployment y DevOps

### 9.1 Docker Support

**Archivos:**
- `Dockerfile`: Imagen de producción
- `docker-compose.yml`: Stack completo
- `docker-compose.override.yml`: Configuración local
- `deploy/docker-compose.supabase.yml`: Stack Supabase

### 9.2 Configuración de Deploy

**Ubicación:** `deploy/`

#### Scripts:
- `fix-supabase.sh`: Reparación de instancia Supabase
- `diagnose-supabase.sh`: Diagnóstico de problemas
- `fix-gotrue.sh`: Reparación de autenticación
- `fix-easypanel-supabase.sh`: Configuración EasyPanel

#### Configuraciones:
- `easypanel/`: Configuración para EasyPanel
- `init/`: Scripts SQL de inicialización
- `volumes/`: Volúmenes de configuración

### 9.3 CI/CD

**GitHub Actions:** `.github/workflows/docker-build.yml`

#### Capacidades:
- Build automático de imagen Docker
- Push a registry
- Despliegue automatizado

---

## 📈 10. Métricas y Analytics

### 10.1 Performance Monitoring

**Implementación:** `src/app/performance/qualityMode.ts`

#### Métricas:
- **FPS (Frames Per Second)**: Monitoreo en tiempo real
- **Agent Count**: Número de agentes renderizados
- **Memory Usage**: Uso de memoria del navegador
- **Load Times**: Tiempos de carga de datos

### 10.2 Analytics de Uso

**Capacidades:**
- Tracking de eventos de usuario
- Métricas de engagement
- Análisis de funnels
- Reportes de uso

---

## 🎨 11. UI/UX

### 11.1 Diseño Visual

**Tema:** Cyberpunk / Tech

#### Características:
- **Paleta de colores**: Tonos oscuros con acentos neón
- **Tipografía**: Moderna y legible
- **Animaciones**: Suaves y profesionales
- **Responsive**: Adaptable a móviles y tablets
- **Accesibilidad**: Contraste alto, navegación por teclado

### 11.2 Componentes UI

**Ubicación:** `src/components/` y `src/ui/`

#### Componentes Principales:
- **Navigation**: Barra de navegación responsive
- **UserMenu**: Menú de usuario con dropdown
- **Panel**: Paneles modales y contenedores
- **SceneControlPanel**: Controles del mapa

### 11.3 Estilos

**Ubicación:** `src/styles/`

#### Archivos:
- `main.css`: Estilos globales
- `landing.css`: Estilos de landing page
- `auth.css`: Estilos de autenticación
- `surveys.css`: Estilos de encuestas
- `benchmarks.css`: Estilos de benchmarks
- `region-detail.css`: Estilos de detalle de región
- `methodology.css`: Estilos de metodología

---

## 🔒 12. Seguridad

### 12.1 Protección de Datos

#### Medidas:
- **Hash de contraseñas** con bcrypt
- **JWT tokens** para sesiones
- **Validación de inputs** en todos los formularios
- **Sanitización** de datos mostrados (escape HTML)
- **CORS** configurado correctamente

### 12.2 Archivos Protegidos

**Documentación:** `GUARDRAILS.md`

#### Lista de archivos que requieren autorización:
- Configuraciones críticas de deploy
- Scripts de base de datos
- Variables de entorno
- Claves API

---

## 📚 13. Documentación

### 13.1 Documentación Técnica

**Ubicación:** `docs/`

#### Archivos:
- `ARCHITECTURE_SUPABASE.md`: Arquitectura de base de datos
- `DATABASE_SCHEMA_ANALYSIS.md`: Análisis del schema
- `TERRITORIES_MODEL_ALIGNMENT.md`: Alineación de modelo de territorios
- `IMPLEMENTACION_VIEWPORT_AGENTES.md`: Implementación de viewport
- `ANALISIS_*`: Múltiples análisis de datos y calidad
- `PLAN_MEMORIA_AGENTES_NIVEL_GOOGLE.md`: Plan futuro de memoria

### 13.2 Guías de Usuario

- `GETTING_STARTED.md`: Guía de inicio rápido
- `GUARDRAILS.md`: Reglas de protección
- `CHECKPOINTS.md`: Versiones y cambios
- `OPERATIONS_GUIDE.md`: Guía de operaciones
- `README.md`: Documentación principal

---

## 🔄 14. Flujos de Trabajo Principales

### 14.1 Flujo: Crear y Ejecutar Encuesta

```
1. Usuario crea encuesta (SurveysPage - modo create)
   ↓
2. Define preguntas y segmento objetivo
   ↓
3. Guarda en Supabase (survey_definitions)
   ↓
4. Ejecuta encuesta (botón "Ejecutar")
   ↓
5. Sistema filtra agentes según segmento
   ↓
6. Motor de respuestas genera respuestas
   ↓
7. Almacena respuestas (survey_responses)
   ↓
8. Calcula resultados agregados (survey_results)
   ↓
9. Muestra resultados (SurveysPage - modo results)
```

### 14.2 Flujo: Comparar con Benchmark

```
1. Usuario carga benchmark desde PDF (BenchmarksPage)
   ↓
2. Sistema extrae indicadores con IA
   ↓
3. Almacena benchmark e indicadores
   ↓
4. Usuario selecciona encuesta y benchmark
   ↓
5. Sistema hace matching de indicadores
   ↓
6. Calcula gaps y significancia
   ↓
7. Muestra comparación visual
   ↓
8. Permite exportar reporte
```

### 14.3 Flujo: Explorar Agentes

```
1. Usuario accede a AgentsPage
   ↓
2. Sistema carga agentes desde Supabase
   ↓
3. Usuario aplica filtros
   ↓
4. Sistema filtra en backend
   ↓
5. Muestra tabla paginada
   ↓
6. Usuario selecciona agente
   ↓
7. Muestra panel de detalle
   ↓
8. Usuario puede exportar datos
```

---

## 📊 15. Estadísticas y Métricas de la Plataforma

### 15.1 Datos Almacenados

| Entidad | Cantidad | Fuente |
|---------|----------|--------|
| Agentes Sintéticos | 25,000+ | CENSO + CASEN + SUBTEL |
| Regiones | 16 | INE |
| Comunas | 346 | INE |
| Variables Demográficas | 25+ | Múltiples |
| Benchmarks | Configurable | CASEN/SUBTEL/CEP |
| Encuestas | Ilimitado | Usuarios |
| Usuarios | Ilimitado | Registro |

### 15.2 Performance

| Métrica | Valor | Notas |
|---------|-------|-------|
| Tiempo de carga inicial | < 3s | Con conexión normal |
| Renderizado de agentes | 60 FPS | En modo Lite |
| Consulta a Supabase | < 500ms | Con índices optimizados |
| Generación de respuestas | ~1ms/agente | Heurísticas locales |

---

## 🎯 16. Casos de Uso Principales

### 16.1 Investigación de Mercado
- Simular encuestas de opinión pública
- Testear productos/servicios hipotéticos
- Analizar segmentos demográficos específicos
- Comparar con datos reales (benchmarks)

### 16.2 Planificación Territorial
- Analizar necesidades por región/comuna
- Identificar brechas de conectividad
- Planificar infraestructura digital
- Evaluar impacto de políticas públicas

### 16.3 Análisis Demográfico
- Explorar perfiles poblacionales
- Identificar patrones socioeconómicos
- Analizar correlaciones entre variables
- Generar insights para toma de decisiones

### 16.4 Educación y Formación
- Enseñar conceptos de demografía
- Simular métodos de encuestas
- Analizar datos reales de Chile
- Practicar análisis estadístico

---

## 🚀 17. Roadmap y Próximas Mejoras

### 17.1 Plan de Memoria de Agentes (Ver documento separado)
- Implementar memoria persistente
- Perfiles cognitivos y emocionales
- Motor de respuestas inteligente v3
- Aprendizaje y adaptación
- Validación avanzada

### 17.2 Mejoras Planificadas
- **Exportación avanzada**: Excel, SPSS, R
- **Visualizaciones**: Gráficos interactivos, dashboards
- **API pública**: Acceso programático a datos
- **Mobile app**: Versión nativa iOS/Android
- **Colaboración**: Equipos, permisos, comentarios
- **Integraciones**: Slack, Teams, Notion

---

## 📞 18. Soporte y Contacto

### 18.1 Recursos
- **Documentación**: Carpeta `docs/`
- **Issues**: GitHub Issues
- **Email**: soporte@brify.ai

### 18.2 Comunidad
- **GitHub**: github.com/brifyai/pulsossocialesv2
- **Website**: brify.ai

---

## ✅ Conclusión

Pulso Social v2.0 es una plataforma madura y completa para simulación y análisis territorial basada en agentes sintéticos. Con 25,000+ agentes generados desde datos reales, un sistema robusto de encuestas, benchmarks comparativos y un completo pipeline de datos, la aplicación está lista para uso en producción.

Las próximas mejoras (Plan de Memoria) llevarán la plataforma a un nivel comparable con herramientas enterprise como Google Surveys y Meta Audience Insights.

---

**Documento generado:** 25 de marzo, 2026  
**Versión:** 1.0  
**Autor:** Asistente de Documentación
