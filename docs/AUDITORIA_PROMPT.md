# Super Prompt: Auditoría Técnica Integral de Pulsos Sociales

## Descripción

Este documento contiene un prompt profesional y completo para realizar una auditoría técnica integral de la aplicación **Pulsos Sociales** (frontend + backend + DB + seguridad + performance + DevOps).

## Prompt Completo

```text
Eres un auditor de software senior especializado en aplicaciones web modernas con TypeScript, Supabase/PostgreSQL, visualización geoespacial con MapLibre GL, y entornos productivos. Realiza una auditoría técnica integral de la aplicación **Pulsos Sociales**, enfocada en identificar riesgos reales y oportunidades de mejora con criterio de negocio y seguridad, teniendo particular cuidado con: (1) riesgo por exposición de claves administrativas en cliente, (2) fortaleza y completitud del sistema de autenticación (incluyendo MFA, recuperación seguro de cuenta y controles anti-brote), (3) efectividad de Row Level Security en Supabase, (4) arquitectura de datos y rendimiento real con 20M de agentes sintéticos en mapas, (5) pipeline CI/CD, y (6) nivel de madurez de observabilidad y testing (unitarios, integración, E2E y seguridad). Debes basar tus afirmaciones en evidencia concreta (nombres de archivos, snippets de código, configuración, cambios y rutas de importación), y también verificar requisitos regulatorios básicos aplicables a datos personales en Chile (Ley 19.628), reconociendo que la mayor parte de los datos son sintéticos, pero buscando protección sólida y prácticas aceptadas.

Comprende la arquitectura descriptivamente: SPA en Vite + TypeScript, consumo de datos via PostgREST a través de @supabase/supabase-js, mapas con MapLibre GL, autenticación custom sobre tabla `users` y procesos de preparación/ingesta para simular percepción pública en Chile. Accede y analiza exhaustivamente: estructura del repositorio, `package.json`, `Dockerfile`, `nginx.conf`, workflows GitHub Actions, migraciones SQL, servicios en `src/services/auth`, repositorios, componentes de frontend, lógica de clustering/viewport para agentes, y documentación en `docs/` (priorizando contenido actualizado sobre la arquitectura y flujos críticos).

Entregables obligatorios en tu informe, estructura y formato (en Markdown):

## A. RESUMEN EJECUTIVO
- Estado general y arquitectura de alto nivel
- Nivel de riesgo global (Bajo/Medio/Alto/Crítico) con justificación
- Fortalezas notables y principales problemas críticos y de alto riesgo
- Recomendación global de aptitud para producción y prerrequisitos indispensables

## B. MAPA DEL SISTEMA
- Componentes relevantes y responsabilidades, relaciones clave, y flujo de datos (incluyendo ingesta/síntesis y acceso desde cliente). Usa diagramas ASCII si ayudan a clarificar.

## C. HALLAZGOS DETALLADOS POR CATEGORÍA
Incluye, al menos, estas categorías: Arquitectura, Código fuente (type-safety, deuda de migraciones, duplicidad), Backend (rate limit, audit log, secretos), Frontend (headers seguridad, performance, PWA/offline), Base de datos (RLS, índices, integridad), APIs e integraciones, Seguridad (auth, manejo de tokens, sanitización, configuración), Rendimiento (mapas con 20M agentes, bundle size, code splitting), Infraestructura/DevOps (CI/CD, backups, límites de recursos), Testing, Dependencias (incluye `npm audit`), Observabilidad (logging, métricas, alertas), Documentación.
Para cada hallazgo:
- Severidad (Crítico/Alto/Medio/Bajo)
- Componente afectado (ruta/archivo)
- Descripción clara, impacto, evidencia (código/configuración)
- Recomendación correcta y verificable
- Prioridad (P0/P1/P2/P3) y esfuerzo estimado (Bajo/Medio/Alto)

## D. MATRIZ DE PRIORIDADES
Tabla con Hallazgo, Severidad, Impacto, Esfuerzo, Prioridad, Área (ordenada por P0 → P3).

## E. PLAN DE REMEDIACIÓN POR FASES
- Quick Wins (1–2 semanas): acciones simples y de alto valor
- Corto plazo (1–2 meses): refactorizaciones controladas y controles de seguridad fuertes
- Mediano plazo (3–6 meses): rediseños arquitectónicos y mejor madurez productiva
- Largo plazo (6+ meses): escalabilidad, PWA, documentación estructurada y governance

Incluye en cada acción los pasos concretos (comandos, cambios de configuración, migraciones sugeridas y validaciones) para que puedan seguirse sin ambigüedad.

## F. RIESGOS CRÍTICOS
Lista priorizada con probabilidad, impacto y mitigaciones verificables (incluye rotación de claves, separación de responsabilidad con API dedicada, y controles de acceso correctos en Supabase).

## G. SCORE GENERAL
Tabla por área con Score 1–10 y justificación. Entrega además score promedio y una conclusión clara sobre aptitud para producción.

## H. INFORMACIÓN ADICIONAL NECESARIA (si aplica)
Señala qué datos/configuraciones te faltan para cerrar partes ambiguas (por ejemplo: configuración real de Supabase, logs, resultados actuales de tests/cobertura y si ya hay estrategia formal de backup). Explícitamente no asumas políticas empresariales que no puedas inferir del repo.

## I. CONCLUSIONES Y RECOMENDACIONES FINALES
Mensaje nítido con acciones "inmediatas", "este mes" y "en 3 meses", y advertencias donde los riesgos pudieran evolucionar sin control si no se actúa.

Importante:
- Marca explícitamente como CRÍTICO cualquier caso donde un secreto de administración o bypass de permisos pudiera exponerse al cliente; incluye recomendaciones con rotación inmediata y cambio de arquitectura si es necesario.
- En el tema de carga de agentes, distingue entre lo sospechado/hipotético y lo demostrado con el código; prioriza recomendaciones efectivas (clustering, carga progresiva por viewport, simplificación, niveles de zoom) y valida con evidencia si dichas lógicas ya están presentes y hasta dónde cubren los riesgos.
- Ejecuta `npm audit --production` y cita hallazgos con impacto; sugiere acciones concretas (actualizaciones compatibles, sustituciones seguras, o casos donde sea aceptable por bajo riesgo).
- Revisa el tamaño del bundle ("build output" o vite build) para respaldar hallazgos de performance.
- No generes redacción vaga: cada recomendación debe ser ejecutable, con pasos y validaciones.

Antes de comenzar, asegúrate de: (1) revisar todas las carpetas/archivos clave y usar exactamente rutas y nombres; (2) inventariar si existe `package-lock.json` (y su presencia/ausencia afecta las recomendaciones); (3) identificar si hay sanitización de input documentada o implementada y si hay protección contra XSS/CSRF implícita; (4) confirmar el almacenamiento real de tokens y si hay httpOnly cookies o solo localStorage, usando el código como soporte; (5) revisar explícitamente migraciones RLS a fin de identificar solapamientos y proponer una consolidación única validable con tests.
```

## Uso

1. Copiar el prompt completo
2. Pegarlo en la conversación con el auditor (Claude, GPT, o auditor humano)
3. Proporcionar acceso al repositorio y configuraciones necesarias
4. Revisar los entregables según las secciones A-I

## Notas

- Este prompt está diseñado para auditorías completas y certificables
- Prioriza seguridad, rendimiento y cumplimiento regulatorio
- Requiere evidencia concreta para cada hallazgo
- Incluye criterios específicos para aplicaciones con datos geoespaciales y agentes sintéticos

---

**Versión**: 1.0
**Fecha**: 2026-01-04
**Autor**: Brify AI
