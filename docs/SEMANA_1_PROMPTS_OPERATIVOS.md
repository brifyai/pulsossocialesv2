# SEMANA 1: PROMPTS OPERATIVOS SECUENCIALES
## Seguridad y RLS - Ejecución Paso a Paso

**ADVERTENCIA:** Ejecutar estos prompts EN ORDEN. No saltear pasos.
**BACKUP:** Asegurarse de tener backup de la base de datos antes de empezar.

---

## PROMPT 1: Análisis del Estado Actual

```
Necesito analizar el estado actual de las migraciones RLS de scenario_events antes de tocar nada.

Por favor:
1. Lee los 3 archivos de migración RLS:
   - migrations/20250330_fix_scenario_events_rls.sql
   - migrations/20250330_fix_scenario_events_rls_v2.sql
   - migrations/20250330_fix_scenario_events_rls_v3.sql

2. Para cada archivo, identifica:
   - Qué policies crea
   - Qué tablas afecta
   - Qué roles menciona (anon, authenticated, service_role)
   - Si hay DROP POLICY antes de CREATE

3. Crea un resumen comparativo:
   | Archivo | Policies creadas | Tablas | Notas |

4. Identifica:
   - Cuál es la última versión que debería aplicarse
   - Si hay conflictos entre versiones
   - Qué tablas necesitan RLS que no lo tienen

NO ejecutes ningún SQL todavía. Solo análisis.
```

**Entregable esperado:** Tabla comparativa de las 3 migraciones con recomendación de cuál usar como base.

---

## PROMPT 2: Verificar Estado Actual en Base de Datos

```
Antes de aplicar cualquier migración, necesito saber qué RLS policies existen ACTUALMENTE en la base de datos.

Por favor:
1. Conecta a la base de datos local (o la que estés usando)
2. Ejecuta estas queries y muestra los resultados:

```sql
-- Ver todas las policies existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

```sql
-- Ver específicamente scenario_events
SELECT * FROM pg_policies WHERE tablename = 'scenario_events';
```

```sql
-- Ver si RLS está habilitado en las tablas
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname IN ('scenario_events', 'weekly_events', 'event_impact_logs', 'survey_definitions', 'survey_results')
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

3. Compara con las migraciones del Prompt 1:
   - ¿Qué policies ya están aplicadas?
   - ¿Qué falta?
   - ¿Hay policies que deberían eliminarse?

NO modifiques nada todavía. Solo diagnóstico.
```

**Entregable esperado:** Lista de policies actuales vs. policies requeridas. Gap analysis.

---

## PROMPT 3: Crear Migración RLS Final Consolidada

```
Basado en el análisis de los prompts 1 y 2, necesito crear UNA SOLA migración RLS final que:

1. Limpie policies existentes de scenario_events (si están mal)
2. Cree policies correctas desde cero
3. Sea idempotente (poder ejecutarla múltiples veces sin error)

La migración debe:

**Para scenario_events:**
- Habilitar RLS en la tabla
- Policy SELECT: usuarios autenticados solo ven sus propios escenarios
- Policy INSERT: usuarios autenticados pueden crear escenarios
- Policy UPDATE: usuarios autenticados solo pueden editar sus propios escenarios
- Policy DELETE: usuarios autenticados solo pueden borrar sus propios escenarios
- Excepción: service_role puede todo (para scripts)

**Para weekly_events:**
- Habilitar RLS
- Solo usuarios autenticados pueden ver (todos los eventos, son públicos)
- Solo admin/service_role pueden crear/editar/borrar

**Para event_impact_logs:**
- Habilitar RLS
- Solo service_role puede insertar (los logs son del sistema)
- Usuarios autenticados pueden ver logs de sus propias encuestas

Por favor:
1. Crea el archivo: migrations/20250401_rls_final_consolidated.sql
2. Incluye comentarios explicando cada policy
3. Incluye queries de verificación al final
4. Asegúrate de que sea idempotente (DROP IF EXISTS antes de CREATE)

NO la ejecutes todavía. Solo créala.
```

**Entregable esperado:** Archivo SQL completo y revisado.

---

## PROMPT 4: Revisión de Seguridad de la Migración

```
Antes de ejecutar la migración RLS, necesito una revisión de seguridad.

Por favor revisa el archivo migrations/20250401_rls_final_consolidated.sql:

1. Verifica que NO haya:
   - Policies que permitan a anon usuarios ver/crear escenarios
   - Policies que permitan a usuarios ver escenarios de otros
   - Uso de "*" en lugar de roles específicos sin justificación

2. Verifica que SÍ haya:
   - RLS habilitado en todas las tablas sensibles
   - service_role excluido de las restricciones (para scripts)
   - created_by = auth.uid() en las policies de usuario

3. Identifica cualquier riesgo potencial

4. Si encuentras problemas, corrígelos antes de continuar

NO ejecutes la migración hasta que esté aprobada.
```

**Entregable esperado:** Checklist de seguridad firmado (mentalmente) antes de ejecución.

---

## PROMPT 5: Backup Antes de Ejecutar

```
Antes de tocar RLS en la base de datos, necesito un backup.

Por favor:
1. Crea un backup de la base de datos:
   ```bash
   pg_dump $DATABASE_URL > backups/backup_pre_rls_$(date +%Y%m%d_%H%M%S).sql
   ```

2. Verifica que el backup se creó correctamente:
   - Tamaño razonable (> 0 bytes)
   - Contiene las tablas scenario_events, weekly_events, etc.

3. Si estás usando Docker:
   ```bash
   docker exec -t your-db-container pg_dump -U postgres postgres > backup_pre_rls.sql
   ```

4. Confirma que tienes el backup antes de continuar.

NO ejecutes la migración sin confirmar el backup.
```

**Entregable esperado:** Confirmación de backup creado y verificado.

---

## PROMPT 6: Ejecutar Migración RLS

```
Ahora sí, con backup hecho y migración revisada, ejecuta la migración RLS.

Por favor:
1. Ejecuta la migración:
   ```bash
   psql $DATABASE_URL -f migrations/20250401_rls_final_consolidated.sql
   ```

2. Captura la salida completa (stdout y stderr)

3. Verifica que no haya errores

4. Si hay errores:
   - NO continues
   - Muestra el error completo
   - Restaura el backup si es necesario
   - Corrige y reintenta

5. Si todo OK, confirma: "Migración aplicada exitosamente"
```

**Entregable esperado:** Confirmación de migración aplicada sin errores.

---

## PROMPT 7: Verificar Migración Aplicada

```
Después de ejecutar la migración, necesito verificar que las policies se aplicaron correctamente.

Por favor ejecuta:

```sql
-- Verificar RLS habilitado
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname IN ('scenario_events', 'weekly_events', 'event_impact_logs')
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

```sql
-- Verificar policies creadas
SELECT policyname, tablename, cmd, qual
FROM pg_policies
WHERE tablename IN ('scenario_events', 'weekly_events', 'event_impact_logs')
ORDER BY tablename, policyname;
```

```sql
-- Contar policies por tabla
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('scenario_events', 'weekly_events', 'event_impact_logs')
GROUP BY tablename;
```

Confirma que:
1. RLS está habilitado (relrowsecurity = true)
2. Las policies esperadas existen
3. No hay policies duplicadas o faltantes
```

**Entregable esperado:** Resultados de verificación confirmando policies correctas.

---

## PROMPT 8: Test de Seguridad - Usuario No Autenticado

```
Ahora necesito probar que la seguridad funciona. Empezamos con usuario no autenticado (anon).

Por favor:

1. Conecta como usuario anon (sin autenticar):
   ```sql
   -- Simular conexión anon
   SET ROLE anon;
   ```

2. Intenta SELECT en scenario_events:
   ```sql
   SELECT * FROM scenario_events LIMIT 1;
   ```
   Debe fallar o retornar 0 filas.

3. Intenta INSERT:
   ```sql
   INSERT INTO scenario_events (name, description, category, sentiment, intensity, salience, severity)
   VALUES ('Test', 'Test', 'economy', 0, 0.5, 0.5, 'minor');
   ```
   Debe fallar con permiso denegado.

4. Vuelve al rol normal:
   ```sql
   RESET ROLE;
   ```

5. Documenta el resultado:
   - ¿Falló como esperábamos?
   - ¿Qué error mostró?

Si no falló, hay un problema grave con las policies.
```

**Entregable esperado:** Confirmación de que anon no puede ver/crear escenarios.

---

## PROMPT 9: Test de Seguridad - Usuario Autenticado (Propio)

```
Ahora probamos con un usuario autenticado viendo sus propios escenarios.

Por favor:

1. Crea un escenario de prueba como usuario autenticado:
   ```sql
   -- Como usuario autenticado (simulado)
   INSERT INTO scenario_events (name, description, category, sentiment, intensity, salience, severity, created_by)
   VALUES ('Mi Escenario', 'Test', 'economy', 0, 0.5, 0.5, 'minor', auth.uid());
   ```

2. Verifica que puedes verlo:
   ```sql
   SELECT * FROM scenario_events WHERE created_by = auth.uid();
   ```
   Debe retornar el escenario creado.

3. Verifica que puedes editarlo:
   ```sql
   UPDATE scenario_events 
   SET name = 'Mi Escenario Editado'
   WHERE created_by = auth.uid() AND name = 'Mi Escenario';
   ```
   Debe actualizar 1 fila.

4. Verifica que puedes borrarlo:
   ```sql
   DELETE FROM scenario_events 
   WHERE created_by = auth.uid() AND name = 'Mi Escenario Editado';
   ```
   Debe borrar 1 fila.

Documenta cada resultado.
```

**Entregable esperado:** Confirmación de que usuarios pueden CRUD sus propios escenarios.

---

## PROMPT 10: Test de Seguridad - Aislamiento Entre Usuarios

```
El test más importante: un usuario NO debe ver escenarios de otro.

Por favor:

1. Crea un escenario simulando ser Usuario A:
   ```sql
   INSERT INTO scenario_events (name, description, category, sentiment, intensity, salience, severity, created_by)
   VALUES ('Escenario Usuario A', 'Test', 'economy', 0, 0.5, 0.5, 'minor', '00000000-0000-0000-0000-000000000001'::uuid);
   ```

2. Simula ser Usuario B (diferente UUID) e intenta ver el escenario:
   ```sql
   -- Esto debería retornar 0 filas si RLS funciona correctamente
   SELECT * FROM scenario_events 
   WHERE created_by = '00000000-0000-0000-0000-000000000001'::uuid;
   ```
   Nota: Esto solo funciona si la query se ejecuta con el contexto de RLS del usuario B.
   
   Alternativa: Verifica que la policy tiene la condición correcta:
   ```sql
   SELECT qual FROM pg_policies WHERE policyname LIKE '%select%' AND tablename = 'scenario_events';
   ```
   Debe mostrar algo como: ((created_by = auth.uid()) OR (role() = 'service_role'::name))

3. Limpia el escenario de prueba:
   ```sql
   DELETE FROM scenario_events WHERE name = 'Escenario Usuario A';
   ```

Confirma que el aislamiento entre usuarios funciona.
```

**Entregable esperado:** Confirmación de aislamiento entre usuarios.

---

## PROMPT 11: Documentar Policies Aplicadas

```
Necesito documentar las policies aplicadas para referencia futura.

Por favor crea el archivo: docs/SECURITY_RLS_POLICIES.md

Contenido requerido:

```markdown
# Políticas RLS - Documentación

## Fecha de aplicación: [fecha]
## Migración: 20250401_rls_final_consolidated.sql

## Resumen por Tabla

### scenario_events
| Policy | Rol | Operación | Condición |
|--------|-----|-----------|-----------|
| ... | ... | ... | ... |

### weekly_events
...

### event_impact_logs
...

## Matriz de Permisos

| Rol | scenario_events | weekly_events | event_impact_logs |
|-----|-----------------|---------------|-------------------|
| anon | ❌ Ninguno | ❌ Ninguno | ❌ Ninguno |
| authenticated | ✅ CRUD propios | ✅ Solo lectura | ✅ Ver propios |
| service_role | ✅ Todo | ✅ Todo | ✅ Todo |

## Notas de Implementación
- [Cualquier consideración especial]
```

Incluye la salida real de las queries de verificación.
```

**Entregable esperado:** Documento de seguridad completo.

---

## PROMPT 12: Auditar Otras Tablas Críticas

```
Necesito verificar que otras tablas críticas también tengan RLS apropiado.

Por favor:

1. Identifica tablas críticas sin RLS:
   ```sql
   SELECT relname
   FROM pg_class c
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
   AND c.relkind = 'r'
   AND relrowsecurity = false
   AND relname IN (
     'survey_definitions', 'survey_results', 'agent_topic_state',
     'agent_panel_state', 'synthetic_agents', 'users'
   );
   ```

2. Para cada tabla sin RLS, evalúa:
   - ¿Debería tener RLS?
   - ¿Qué nivel de acceso es apropiado?

3. Crea migraciones adicionales si es necesario:
   - survey_definitions: ¿Quién puede crear encuestas?
   - survey_results: ¿Quién puede ver resultados?
   - agent_topic_state: ¿Solo service_role puede modificar?

4. Prioriza: ¿Cuáles son P0 para esta semana y cuáles pueden esperar?

NO apliques migraciones adicionales sin revisar primero.
```

**Entregable esperado:** Lista de tablas críticas con recomendaciones de RLS.

---

## PROMPT 13: Verificar Service Keys

```
Necesito verificar que las service keys no estén expuestas.

Por favor:

1. Busca archivos que puedan contener service keys:
   ```bash
   grep -r "SUPABASE_SERVICE_KEY" --include="*.ts" --include="*.js" --include="*.json" . 2>/dev/null | grep -v node_modules | grep -v ".env"
   ```

2. Verifica que solo estén en:
   - .env
   - .env.scripts
   - .env.local (si existe)

3. Verifica que NO estén en:
   - Código fuente
   - Git (git status debe mostrar .env como untracked o en .gitignore)
   - Logs
   - Documentación pública

4. Si encuentras keys expuestas:
   - Elimínalas del código inmediatamente
   - Rota las keys (genera nuevas en Supabase)
   - Actualiza .env con las nuevas keys

Documenta el estado de seguridad de las keys.
```

**Entregable esperado:** Confirmación de que service keys están seguras.

---

## PROMPT 14: Checklist Final Semana 1

```
Necesito un checklist final para cerrar la Semana 1.

Por favor verifica:

## RLS Policies ✅
- [ ] scenario_events tiene RLS habilitado
- [ ] scenario_events tiene policies SELECT/INSERT/UPDATE/DELETE
- [ ] weekly_events tiene RLS habilitado
- [ ] event_impact_logs tiene RLS habilitado
- [ ] Usuarios solo ven sus propios escenarios
- [ ] Anon no puede ver/crear nada
- [ ] service_role puede todo (para scripts)

## Tests de Seguridad ✅
- [ ] Test anon ejecutado y pasado
- [ ] Test usuario propio ejecutado y pasado
- [ ] Test aislamiento entre usuarios ejecutado y pasado

## Documentación ✅
- [ ] docs/SECURITY_RLS_POLICIES.md creado
- [ ] Migración 20250401_rls_final_consolidated.sql documentada
- [ ] Backup pre-RLS verificado y accesible

## Service Keys ✅
- [ ] No expuestas en código
- [ ] Solo en .env files
- [ ] Roteadas si fue necesario

## Tablas Adicionales (Opcional esta semana)
- [ ] Identificadas tablas críticas sin RLS
- [ ] Plan para aplicar RLS en semanas siguientes

Si todo está chequeado, la Semana 1 está COMPLETA.
```

**Entregable esperado:** Checklist firmado con todo completado.

---

## NOTAS IMPORTANTES

### Si algo falla:
1. NO continues al siguiente prompt
2. Documenta el error
3. Restaura el backup si es necesario: `psql $DATABASE_URL < backup_pre_rls_YYYYMMDD_HHMMSS.sql`
4. Corrige y reintenta

### Si todo funciona:
1. Guarda el backup por 7 días mínimo
2. Documenta cualquier anomalía
3. Procede a Semana 2 (Operations UI)

### Contacto/Escalación:
- Si una policy no funciona como esperado: revisar condición qual
- Si RLS no se aplica: verificar que la tabla tenga relrowsecurity = true
- Si service_role no puede acceder: verificar que esté excluido de las restricciones

---

**Inicio:** [Fecha de inicio]
**Fin estimado:** [Fecha de inicio + 5 días]
**Estado:** ⏳ Listo para ejecutar
