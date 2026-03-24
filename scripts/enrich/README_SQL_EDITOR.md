# Guía para Ejecutar SQL en el Editor de Supabase

## Archivos Generados (100 ARCHIVOS - TAMAÑO REDUCIDO)

Se han creado **100 archivos SQL** listos para ejecutar en el SQL Editor de Supabase.

### Ubicación
```
/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_for_editor_final/
```

### Estructura de Archivos
- **100 archivos** totales (batch_001.sql hasta batch_100.sql)
- Cada archivo contiene **250 registros**
- Tamaño aproximado: **~735 KB por archivo** (mucho más pequeño que antes)
- Formato: `batch_XXX.sql` (donde XXX es 001-100)

### Correcciones Aplicadas ✅

1. **Tamaño reducido**: 100 archivos de 250 registros (~735KB cada uno)
2. **Eliminado ON CONFLICT**: Se quitó el `ON CONFLICT DO UPDATE` que causaba el error "multiple assignments to same column"
3. **Corregido paréntesis extra**: Se eliminó el paréntesis doble `) );` que causaba error de sintaxis
4. **Corregido valores NaN**: Se reemplazaron 1,574 valores `NaN` por `NULL` (PostgreSQL no acepta NaN)
5. **DELETE + INSERT simple**: Cada registro primero elimina el existente (si hay) y luego inserta el nuevo

Ejemplo de formato:
```sql
DELETE FROM synthetic_agents WHERE agent_id = '2807908_1_1';
INSERT INTO synthetic_agents (...) VALUES (...);
```

**Nota**: No hay `ON CONFLICT` - el DELETE asegura que no haya duplicados.

## Instrucciones de Uso

### Ejecución Manual en SQL Editor

1. **Abre el SQL Editor de Supabase**
   - Ve a tu proyecto en Supabase
   - Navega a "SQL Editor"

2. **Crea un New Query**
   - Haz clic en "New Query"

3. **Copia y Pega el Contenido**
   - Abre el archivo `batch_001.sql` en tu editor de texto
   - Copia TODO el contenido
   - Pégalo en el SQL Editor de Supabase

4. **Ejecuta el Query**
   - Haz clic en "Run"
   - Verifica que se ejecutó correctamente

5. **Repite para cada archivo**
   - Continúa con `batch_002.sql`, `batch_003.sql`, etc.
   - hasta completar los 100 batches

## Progreso de Carga

### Total de Archivos
- **100 archivos** (uno por batch)
- **25,000 registros** totales
- **250 registros por archivo**

### Verificación de Progreso

Puedes verificar cuántos registros se han cargado ejecutando en el SQL Editor:

```sql
SELECT COUNT(*) FROM synthetic_agents;
```

### Orden de Ejecución Recomendado

1. **Batch 001**: 250 registros (~735KB)
2. **Batch 002**: 250 registros (~735KB)
3. ...continuar hasta Batch 100

## Solución de Problemas

### Error: "Query is too large to be run via the SQL Editor" ✅ RESUELTO
- Los archivos ahora son de **~735KB** (antes eran de ~1.5MB)
- Cada archivo tiene **250 registros** (antes tenían 500)
- Esto debería funcionar en el SQL Editor de Supabase

### Error: "Connection timeout"
- Espera unos segundos entre ejecuciones
- No ejecutes múltiples archivos simultáneamente

### Error: "Duplicate key" ✅ RESUELTO
- Los archivos incluyen DELETE antes de cada INSERT
- Esto elimina cualquier registro existente antes de insertar el nuevo

### Error: "multiple assignments to same column 'updated_at'" ✅ RESUELTO
- Se eliminó el `ON CONFLICT DO UPDATE` de todos los archivos
- Ahora solo usamos DELETE + INSERT simple
- El DELETE asegura que no haya duplicados sin necesidad de ON CONFLICT

### Error: "syntax error at or near )" ✅ RESUELTO
- Se corrigió el paréntesis extra `) );` por `);`
- Ahora los INSERT tienen la sintaxis correcta

### Error: "column 'nan' does not exist" ✅ RESUELTO
- Se reemplazaron 1,574 valores `NaN` por `NULL`
- PostgreSQL no reconoce `NaN` como valor válido en coordenadas
- Ahora las coordenadas usan `NULL` cuando no hay datos

## Comandos Útiles

### Verificar archivos generados
```bash
ls -la /Users/camiloalegria/Desktop/AIntelligence/Simulador\ 1MM\ usuarios/output/sql_for_editor_final/
```

### Contar archivos
```bash
ls /Users/camiloalegria/Desktop/AIntelligence/Simulador\ 1MM\ usuarios/output/sql_for_editor_final/*.sql | wc -l
```

### Verificar tamaño total
```bash
du -h /Users/camiloalegria/Desktop/AIntelligence/Simulador\ 1MM\ usuarios/output/sql_for_editor_final/
```

## Notas Importantes

1. **Cada archivo es independiente**: Puedes ejecutarlos en cualquier orden
2. **DELETE + INSERT simple**: Cada registro primero elimina el existente (si hay) y luego inserta
3. **Sin ON CONFLICT**: Se eliminó el `ON CONFLICT DO UPDATE` que causaba errores
4. **Transacciones**: Cada archivo se ejecuta como una transacción separada
5. **Tiempo estimado**: Aproximadamente 30-60 segundos por archivo

## Historial de Cambios

### Versión Anterior (50 archivos)
- 50 archivos de 500 registros cada uno
- ~1.5MB por archivo
- **Problema**: "Query is too large to be run via the SQL Editor"

### Versión Actual (100 archivos) ✅
- 100 archivos de 250 registros cada uno
- ~735KB por archivo
- **Solucionado**: Tamaño reducido a la mitad

## Soporte

Si encuentras problemas:
1. Verifica que el schema de la tabla esté actualizado
2. Asegúrate de tener permisos de escritura en la tabla
3. Contacta al equipo de desarrollo si el problema persiste

---

**Nota**: Los archivos están en `sql_for_editor_final/` (100 archivos de 250 registros cada uno, con todas las correcciones aplicadas).
