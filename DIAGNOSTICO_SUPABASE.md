# Diagnóstico de Conexión Supabase - Sprint 13

**Fecha:** 2026-03-17  
**Estado:** ✅ Mejoras implementadas - Diagnóstico mejorado

## Resumen de Cambios Realizados

### 1. Mejoras en Diagnóstico de Errores (`client.ts`)

Se agregó diagnóstico detallado de errores de conexión:

```typescript
// Tipos de errores detectados:
- network: Error de red - verifica la URL de Supabase y tu conexión
- auth: Error de autenticación - el anon key puede ser inválido
- rls: Error de permisos (RLS) - se necesitan políticas de acceso para anon
- schema: La tabla no existe - verifica el schema de la base de datos
- postgrest: Error de PostgREST - verifica que la extensión esté habilitada
```

### 2. Integración de ChileMapPage con TerritoryRepository

**Antes:** ChileMapPage usaba directamente datos locales (`chileRegions`)

**Después:** 
- ChileMapPage ahora intenta cargar regiones desde Supabase primero
- Si falla, usa fallback local automáticamente
- Muestra indicador visual de la fuente de datos (📊 DB vs 💾 Local)

### 3. Logs Detallados en Repositorios

Se agregaron logs con prefijos identificables:
- `[🔵 DB]` - Operaciones de base de datos
- `[🟢 Repository]` - Lectura exitosa de Supabase
- `[🟡 FALLBACK]` - Usando datos locales
- `[🔴 ERROR]` - Errores de conexión/query

## Cómo Verificar la Conexión

### 1. Abrir la Consola del Navegador

Al cargar la aplicación, busca estos mensajes:

```
[🔵 DB] Intentando conectar a: https://supabase.pulsossociales.com
[🔵 DB] Probando conexión a tabla territories...
```

### 2. Mensajes de Éxito

Si la conexión funciona:
```
[🔵 DB] ✅ Conexión exitosa - tabla territories accesible (16 registros)
[🟢 TerritoryRepository] ✅ Datos de SUPABASE: 16 regiones
[🟢 AgentRepository] ✅ Datos de SUPABASE: 100 agentes
```

### 3. Mensajes de Error

Si hay problemas, verás el tipo específico:
```
[🔴 ERROR] Conexión fallida [network]: Error de red - verifica la URL de Supabase y tu conexión
[🔴 ERROR] Código de error: ...
[🟡 FALLBACK] Usando datos locales
```

## Posibles Causas de Fallback

### 1. Error de Red (`[network]`)
- **Causa:** URL incorrecta o servidor no accesible
- **Verificación:** `curl https://supabase.pulsossociales.com`

### 2. Error de Autenticación (`[auth]`)
- **Causa:** Anon key inválido o expirado
- **Verificación:** Revisar `.env` - el key debe ser válido

### 3. Error de Permisos (`[rls]`)
- **Causa:** Row Level Security bloqueando acceso anon
- **Solución:** Crear políticas en Supabase:
```sql
CREATE POLICY "Allow anon read territories" ON territories
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read synthetic_agents" ON synthetic_agents
  FOR SELECT TO anon USING (true);
```

### 4. Error de Schema (`[schema]`)
- **Causa:** Tablas no existen en la base de datos
- **Verificación:** Revisar schema en Supabase Dashboard

## Configuración Actual

Archivo `.env`:
```
VITE_SUPABASE_URL=https://supabase.pulsossociales.com
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Próximos Pasos para Verificar

1. **Iniciar la aplicación:** `npm run dev`
2. **Abrir consola del navegador** (F12)
3. **Navegar a:**
   - Mapa de Chile → Verificar `[ChileMapPage]` logs
   - Agentes → Verificar `[AgentRepository]` logs
4. **Identificar el tipo de error** si aparece `[🔴 ERROR]`
5. **Corregir según el tipo:**
   - Network → Verificar URL
   - Auth → Verificar anon key
   - RLS → Crear políticas en Supabase
   - Schema → Verificar tablas existen

## Estado de las Páginas

| Página | Usa Supabase | Fallback Local | Logs Detallados |
|--------|--------------|----------------|-----------------|
| ChileMapPage | ✅ Sí | ✅ Sí | ✅ Sí |
| AgentsPage | ✅ Sí | ✅ Sí | ✅ Sí |
| SurveysPage | ✅ Sí | ✅ Sí | ✅ Sí |
| BenchmarksPage | ✅ Sí | ✅ Sí | ✅ Sí |

## Notas

- La aplicación **siempre funciona** gracias al fallback local
- Los logs ahora permiten identificar exactamente por qué se usa fallback
- El build es exitoso y no hay errores de TypeScript
