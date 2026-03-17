# Estado de Conexión Supabase - Pulsos Sociales

**Fecha:** 17/03/2026  
**Servidor:** http://localhost:3173  
**Estado:** ✅ Configurado y funcionando

---

## Credenciales Configuradas

```env
VITE_SUPABASE_URL=https://supabase.pulsossociales.com
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Logs de Conexión (Consola del Navegador)

Los siguientes indicadores aparecerán en la consola del navegador:

### Cliente Supabase
- `[🔵 DB] Intentando conectar a: https://supabase.pulsossociales.com`
- `[🔵 DB] Probando conexión a tabla territories...`
- `[🔵 DB] ✅ Conectado exitosamente a Supabase`
- `[🟡 FALLBACK] Supabase no configurado - faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY`
- `[🔴 ERROR] Conexión fallida: {mensaje}`

### Repositorios

#### TerritoryRepository
- `[🔵 TerritoryRepository] Leyendo de SUPABASE: getTerritories`
- `[🔵 TerritoryRepository] ✅ Datos de SUPABASE: {N} territorios`
- `[🔵 TerritoryRepository] Usando FALLBACK LOCAL para getTerritories`
- `[🟡 TerritoryRepository] Error en DB, usando fallback`

#### AgentRepository
- `[🟢 AgentRepository] Leyendo de SUPABASE: getAgents`
- `[🟢 AgentRepository] ✅ Datos de SUPABASE: {N} agentes`
- `[🟢 AgentRepository] Usando FALLBACK LOCAL para getAgents`
- `[🟡 AgentRepository] Error en DB, usando fallback`

#### SurveyRepository
- `[📊 SurveyRepository] ✅ DB: Tabla survey_definitions disponible`
- `[📊 SurveyRepository] FALLBACK: Supabase no disponible`
- `[📊 SurveyRepository] FALLBACK: Error verificando tabla survey_definitions`

---

## Función de Estado de Conexión

```typescript
import { getConnectionStatus } from './services/supabase/client';

const status = getConnectionStatus();
// Retorna:
// {
//   mode: 'db' | 'fallback' | 'unknown',
//   details: string,
//   isConfigured: boolean
// }
```

---

## Módulos y Estado Esperado

| Módulo | Tabla DB | Estado Esperado |
|--------|----------|-----------------|
| Territories | `territories` | ✅ Lee de DB si conecta, fallback a `chileRegions` |
| Agents | `synthetic_agents` | ✅ Lee de DB si conecta, fallback a `syntheticAgents` |
| Surveys | `survey_definitions` | ✅ Persiste en DB si disponible, memoria si no |
| Survey Runs | `survey_runs` | ✅ Persiste metadata en DB |
| Survey Results | `survey_results` | ✅ Persiste resultados agregados en DB |

---

## Verificación de Conexión

Para verificar que la conexión está funcionando:

1. Abrir la aplicación en http://localhost:3173
2. Abrir DevTools (F12) → Console
3. Navegar a cualquier página (Territorios, Agentes, Encuestas)
4. Verificar que aparecen logs `[🔵 DB]` o `[🟢 ...]` indicando lectura de Supabase

---

## Solución de Problemas

### Si aparece `[🟡 FALLBACK]` o `[🔴 ERROR]`

1. Verificar que las credenciales en `.env` son correctas
2. Verificar que el servidor Supabase está accesible:
   ```bash
   curl -I https://supabase.pulsossociales.com
   ```
3. Verificar que las tablas existen en la base de datos
4. Revisar la consola del navegador para errores CORS

### Si el build falla

```bash
npm install tslib --save
npm run build
```

---

## Notas

- La aplicación está diseñada para funcionar **incluso sin conexión a Supabase**
- Los datos locales (fallback) se usan automáticamente si la DB no está disponible
- No se requiere reiniciar el servidor al cambiar `.env` (Vite lo detecta automáticamente)
