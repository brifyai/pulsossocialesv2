# Pulso Social

Plataforma de simulación y análisis territorial basada en agentes sintéticos para Chile.

## 🚀 Descripción

Pulso Social es una aplicación web que permite:

- **Visualización territorial**: Mapa interactivo de Chile con datos de regiones y comunas
- **Simulación de agentes**: Agentes sintéticos que representan la población chilena
- **Encuestas sintéticas**: Generación de respuestas basadas en perfiles demográficos
- **Benchmarks**: Comparación de territorios con datos reales (CASEN, SUBTEL, CEP)
- **Análisis de datos**: Pipeline completo de ingesta, normalización y validación

## 🏗️ Arquitectura

### Frontend
- **TypeScript** + **Vite**
- **MapLibre GL JS** para visualización de mapas
- **CSS puro** con tema cyberpunk
- **Router** propio basado en hash

### Backend (Opcional)
- **Supabase** (PostgreSQL + Auth)
- **Docker Compose** para self-hosting
- **Fallback automático** a datos locales si no hay backend

### Data Pipeline
- **Ingesta**: CASEN, Censo, SUBTEL
- **Normalización**: Estandarización de variables
- **Integración**: Construcción de backbone poblacional
- **Síntesis**: Generación de agentes sintéticos
- **Validación**: Verificación de calidad

## 📁 Estructura del Proyecto

```
├── src/                    # Código fuente
│   ├── app/               # Lógica de la aplicación
│   ├── components/        # Componentes UI
│   ├── data/              # Datos estáticos
│   ├── pages/             # Páginas de la aplicación
│   ├── router/            # Sistema de routing
│   ├── services/          # Servicios (Supabase, etc.)
│   ├── styles/            # Estilos CSS
│   ├── types/             # Tipos TypeScript
│   └── ui/                # Componentes UI base
├── scripts/               # Scripts de data pipeline
│   ├── config/            # Configuraciones
│   ├── ingest/            # Ingesta de datos
│   ├── normalize/         # Normalización
│   ├── integrate/         # Integración
│   ├── synthesize/        # Síntesis
│   ├── validate/          # Validación
│   └── seed/              # Seed de base de datos
├── deploy/                # Configuración de deploy
├── docs/                  # Documentación
└── data/                  # Datos procesados
```

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+
- npm o yarn

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/brifyai/pulsossocialesv2.git
cd pulsossocialesv2

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu API key de MapTiler

# Iniciar servidor de desarrollo
npm run dev
```

### Build de Producción

```bash
npm run build
```

## 📚 Documentación

- [GETTING_STARTED.md](GETTING_STARTED.md) - Guía de inicio detallada
- [GUARDRAILS.md](GUARDRAILS.md) - Reglas de protección del código
- [CHECKPOINTS.md](CHECKPOINTS.md) - Versiones y cambios
- [docs/README.md](docs/README.md) - Índice de documentación técnica
- [deploy/README.md](deploy/README.md) - Guía de deploy

## 🛡️ Archivos Protegidos

Ver [GUARDRAILS.md](GUARDRAILS.md) para la lista de archivos que requieren autorización explícita para modificar.

## 📝 Licencia

Proyecto privado - Todos los derechos reservados.

## 👥 Autor

**Brify AI** - [brify.ai](https://brify.ai)
