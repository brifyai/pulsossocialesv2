# Arquitectura de Persistencia - Sprint 9

## Resumen Ejecutivo

Este documento describe la arquitectura de persistencia implementada en el Sprint 9, que permite a la aplicación **Pulso Social** operar tanto con datos locales (modo offline) como con una base de datos PostgreSQL via Supabase (modo online).

**Principio clave**: La aplicación funciona **sin Supabase**. Si no hay configuración, usa datos locales automáticamente.

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Vite + TS)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   UI Layer   │  │  App Logic   │  │  Data Services   │  │
│  │  (Pages)     │  │  (Services)  │  │  (Repositories)  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                   │            │
│         └─────────────────┴───────────────────┘            │
│                           │                                │
│              ┌────────────┴────────────┐                   │
│              │                         │                   │
│     ┌────────▼────────┐      ┌─────────▼────────┐          │
│     │  Local Data     │      │  Supabase Client │          │
│     │  (Fallback)     │      │  (Optional)      │          │
│     └─────────────────┘      └────────┬─────────┘          │
│                                       │                    │
└───────────────────────────────────────┼────────────────────┘
                                        │
                              ┌─────────▼────────┐
                              │  Supabase        │
                              │  Self-Hosted     │
                              │  (PostgreSQL)    │
                              └──────────────────┘
```

---

## Estructura de Archivos

```
src/
├── services/
│   └── supabase/
│       ├── index.ts                    # Punto de entrada
│       ├── client.ts                   # Cliente Supabase + helpers
│       └── repositories/
│           └── territoryRepository.ts  # Ejemplo de repositorio
├── types/
│   └── database.ts                     # Tipos de tablas DB
└── data/
    └── chileRegions.ts                 # Fallback local
```

---

## Configuración

### Variables de Entorno

```bash
# .env (requerido para mapas)
VITE_MAPTILER_KEY=your_key_here

# .env (opcional para persistencia)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Comportamiento

| Configuración | Comportamiento |
|--------------|----------------|
| Sin Supabase | App usa datos locales, funciona 100% |
| Con Supabase | App intenta Supabase, fallback a local si falla |

---

## Tipos de Datos (Database Schema)

### Tablas Principales

#### 1. `territories`
Territorios administrativos de Chile.

```typescript
interface DbTerritory {
  id: string;                    // UUID
  country_code: string;          // 'CL'
  region_code: string;           // 'CL-13'
  region_name: string;
  comuna_code: string;           // '13101'
  comuna_name: string;
  geometry: GeoJSON.Geometry;
  bbox: [number, number, number, number];
  population_total: number | null;
  // ... timestamps, metadata
}
```

#### 2. `synthetic_agents`
Agentes sintéticos generados por el pipeline.

```typescript
interface DbSyntheticAgent {
  id: string;
  agent_id: string;              // 'AGENT-CL13-000001'
  batch_id: string;
  territory_id: string;
  
  // Demografía
  sex: 'male' | 'female';
  age: number;
  age_group: 'child' | 'youth' | 'adult' | ...;
  
  // Socioeconómico
  income_decile: number | null;
  education_level: 'none' | 'primary' | ...;
  
  // Digital
  connectivity_level: 'none' | 'low' | 'medium' | 'high';
  
  // Traceabilidad
  backbone_key: string;
  // ...
}
```

#### 3. `survey_definitions`
Definiciones de encuestas.

```typescript
interface DbSurveyDefinition {
  id: string;
  name: string;
  slug: string;
  segment: {
    region_codes?: string[];
    age_groups?: string[];
    // ...
  };
  questions: DbSurveyQuestion[];
  status: 'draft' | 'active' | 'completed';
}
```

#### 4. `survey_runs`
Ejecuciones de encuestas.

```typescript
interface DbSurveyRun {
  id: string;
  survey_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress_percent: number;
  sample_size_requested: number;
  sample_size_actual: number;
  // ...
}
```

#### 5. `survey_responses`
Respuestas individuales.

```typescript
interface DbSurveyResponse {
  id: string;
  survey_id: string;
  run_id: string;
  agent_id: string;
  question_id: string;
  value: string | number | string[] | null;
  confidence: number;            // 0-1
  reasoning: string;
}
```

#### 6. `benchmarks`
Datos de referencia (CASEN, SUBTEL, etc.).

```typescript
interface DbBenchmark {
  id: string;
  source: 'casen' | 'subtel' | 'cep' | ...;
  source_year: number;
  indicators: DbBenchmarkIndicator[];
  coverage: {
    geographic: string[];
    temporal: { start: string; end: string };
  };
}
```

#### 7. `benchmark_comparisons`
Comparaciones sintético vs benchmark.

```typescript
interface DbBenchmarkComparison {
  id: string;
  survey_id: string;
  benchmark_id: string;
  comparisons: DbIndicatorComparison[];
  summary: {
    total_indicators: number;
    matched_indicators: number;
    average_gap: number;
  };
}
```

---

## Patrón Repository

### Ejemplo: Territory Repository

```typescript
// Uso en componentes/pages
import { territoryRepo } from '../services/supabase';

// Obtener territorios con paginación
const { data, total, hasMore } = await territoryRepo.getTerritories({
  page: 1,
  pageSize: 50,
  filters: { regionCode: 'CL-13' }
});

// Obtener por ID (con fallback automático)
const territory = await territoryRepo.getTerritoryById('uuid-here');

// Buscar
const results = await territoryRepo.searchTerritories('Santiago');
```

### Características

1. **Fallback automático**: Si Supabase falla, usa datos locales
2. **Type-safe**: Todos los repositorios usan tipos estrictos
3. **Paginación**: Soporte nativo para paginación
4. **Filtros**: API consistente para filtrado

---

## Cliente Supabase

### Inicialización

```typescript
import { initSupabase, getSupabaseClient } from '../services/supabase';

// Opcional: inicializar explícitamente
const status = await initSupabase();
console.log(status.isAvailable);  // true si está configurado
console.log(status.isConnected);  // true si la conexión funciona

// Obtener cliente (lazy loading)
const client = await getSupabaseClient();
if (client) {
  // Usar cliente...
}
```

### Safe Query Helper

```typescript
import { safeQuery } from '../services/supabase';

const result = await safeQuery(
  async (client) => {
    const { data } = await client
      .from('territories')
      .select('*')
      .limit(10);
    return data;
  },
  [] // fallback si Supabase no disponible
);
```

---

## Pipeline de Datos

### Flujo de Datos

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Fuentes        │     │  Pipeline       │     │  Destinos       │
│  Externas       │────▶│  (Node/TS)      │────▶│  JSON Local     │
│                 │     │                 │     │  Supabase       │
│ - CENSO 2017    │     │  - Ingest       │     │                 │
│ - CASEN 2022    │     │  - Normalize    │     │                 │
│ - SUBTEL        │     │  - Integrate    │     │                 │
│ - GeoJSON       │     │  - Synthesize   │     │                 │
│                 │     │  - Validate     │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Scripts del Pipeline

```
scripts/
├── ingest/           # Descarga y carga de datos crudos
├── normalize/        # Normalización de formatos
├── integrate/        # Integración de fuentes
├── synthesize/       # Generación de agentes
└── validate/         # Validación de calidad
```

### Output del Pipeline

| Archivo | Descripción | Destino |
|---------|-------------|---------|
| `territories_master.json` | Territorios con geometría | Supabase + Local |
| `population_backbone.json` | Población backbone | Supabase |
| `synthetic_agents.json` | Agentes sintéticos | Supabase + Local |
| `benchmarks.json` | Benchmarks CASEN/SUBTEL | Supabase |

---

## Decisiones de Arquitectura

### 1. ¿Por qué Supabase y no Firebase/AWS?

- **PostgreSQL nativo**: Mejor para datos relacionales complejos
- **Self-hosted opción**: Podemos hostear nosotros mismos
- **Type safety**: Generación automática de tipos
- **Costo**: Generoso tier gratuito

### 2. ¿Por qué fallback a datos locales?

- **Desarrollo**: No necesitas Supabase para desarrollar
- **Demo**: Puedes mostrar la app sin backend
- **Resiliencia**: La app nunca se rompe por falta de DB
- **Testing**: Fácil de testear sin mocks complejos

### 3. ¿Por qué repositorios y no queries directas?

- **Abstracción**: Cambiar de Supabase a otro proveedor es fácil
- **Testing**: Mock de repositorios es trivial
- **Reusabilidad**: Misma API en toda la app
- **Fallback**: Lógica de fallback centralizada

### 4. ¿Qué va a Supabase vs qué queda local?

| Datos | Supabase | Local | Notas |
|-------|----------|-------|-------|
| Territorios | ✅ | ✅ | Fallback esencial |
| Agentes | ✅ | ✅ | Millones de registros |
| Encuestas | ✅ | ⚠️ | Solo metadata local |
| Respuestas | ✅ | ❌ | Solo en DB |
| Benchmarks | ✅ | ✅ | Referencia estática |
| Configuración | ❌ | ✅ | .env, localStorage |

---

## Setup de Supabase (Self-Hosted)

### Opción 1: Supabase Cloud (Rápido)

1. Crear cuenta en [supabase.com](https://supabase.com)
2. Crear un nuevo proyecto
3. En Settings > API, copia:
   - `URL` → `VITE_SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`
4. Configura en tu `.env` del frontend

### Opción 2: Docker Local (Desarrollo)

Usa los archivos en el directorio `deploy/`:

```bash
# 1. Ir al directorio deploy
cd deploy

# 2. Copiar variables de entorno
cp .env.supabase.example .env

# 3. Editar .env con tus valores (opcional para dev)
# Los valores por defecto funcionan para desarrollo

# 4. Iniciar Supabase
docker-compose -f docker-compose.supabase.yml up -d

# 5. Esperar a que los servicios estén listos (30-60 segundos)
docker-compose -f docker-compose.supabase.yml ps

# 6. Acceder a:
#    - Supabase Studio: http://localhost:3000
#    - API: http://localhost:8000
#    - PostgreSQL: localhost:5432
```

### Opción 3: Easypanel (Producción Self-Hosted)

Easypanel es una alternativa self-hosted a Heroku/Railway.

```bash
# Instalar Easypanel en tu VPS
curl -fsSL https://easypanel.io/get.sh | bash
```

Luego usa el template en `deploy/easypanel/pulsos-sociales.json` o configura manualmente los servicios.

### Crear Tablas

Ejecutar SQL en el SQL Editor de Supabase (http://localhost:3000):

```sql
-- Ver archivo: deploy/init/01-schema.sql
-- Contiene el schema completo de Pulsos Sociales
```

O ejecuta automáticamente al iniciar PostgreSQL (ya configurado en docker-compose):
```bash
# El volumen ./init se monta en /docker-entrypoint-initdb.d
docker-compose -f docker-compose.supabase.yml logs db
```

---

## Roadmap de Persistencia

### Sprint 9 (Actual) ✅
- [x] Arquitectura base
- [x] Tipos de datos
- [x] Cliente Supabase con fallback
- [x] Repository pattern (territories)
- [x] Documentación

### Sprint 10 (Próximo)
- [ ] Repositorios completos (agents, surveys, benchmarks)
- [ ] Sync offline/online
- [ ] Migrations SQL
- [ ] Seed data

### Sprint 11 (Futuro)
- [ ] Real-time subscriptions
- [ ] Auth (si necesario)
- [ ] Edge functions
- [ ] Optimizaciones de performance

---

## Troubleshooting

### "Supabase not configured"

**Normal**: La app funciona con datos locales. Configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` si quieres persistencia.

### "Table not found"

Las tablas deben crearse manualmente en Supabase. Ver `scripts/supabase/schema.sql`.

### Datos no se actualizan

El cliente usa lazy loading. Llama `initSupabase()` al inicio de la app para forzar conexión.

---

## Referencias

- [Supabase Docs](https://supabase.com/docs)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
