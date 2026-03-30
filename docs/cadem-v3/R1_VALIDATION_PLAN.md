# Plan de Validación Manual - R1 Modal de Selección de Escenario

**Fecha:** 29/03/2026  
**Versión:** CADEM v1.2  
**Estado:** Listo para validación

---

## Resumen de Implementación R1

R1 está completamente implementado y listo para validación manual:

### Archivos Modificados
1. ✅ `src/pages/SurveysPage.ts` - Modal de selección de escenario implementado
2. ✅ `src/app/survey/surveyService.ts` - Función `runSurvey(surveyId, scenarioEventId?)` lista
3. ✅ `src/styles/surveys.css` - Estilos CSS para el modal agregados

### Funcionalidad Implementada
- Modal de pre-ejecución que aparece al hacer clic en "Ejecutar"
- Opción "Baseline (sin escenario)" siempre visible
- Lista de escenarios activos con metadata (nombre, descripción, categoría, sentimiento, severidad)
- Visualización de escenarios con badges de intensidad y sentimiento
- Cierre del modal al hacer clic fuera o en el botón X
- Ejecución de encuesta con o sin escenario seleccionado

---

## Casos de Prueba

### Caso 1: Ejecución Baseline (sin escenario)

**Pasos:**
1. Navegar a la página de Encuestas (`/surveys`)
2. Localizar una encuesta existente
3. Hacer clic en el botón "Ejecutar"
4. Verificar que aparece el modal de selección de escenario
5. Seleccionar "Baseline (sin escenario)" (opción verde)
6. Hacer clic en "Ejecutar baseline"
7. Verificar que la encuesta se ejecuta correctamente
8. Verificar que no hay errores en consola

**Resultado Esperado:**
- ✅ Modal aparece con animación
- ✅ Opción baseline está seleccionable
- ✅ Encuesta se ejecuta sin errores
- ✅ Resultados se muestran correctamente
- ✅ No hay errores en consola del navegador

---

### Caso 2: Ejecución con Escenario

**Prerrequisitos:**
- Tener al menos un escenario activo creado en Scenario Builder

**Pasos:**
1. Navegar a la página de Encuestas (`/surveys`)
2. Localizar una encuesta existente
3. Hacer clic en el botón "Ejecutar"
4. Verificar que aparece el modal con la lista de escenarios
5. Seleccionar un escenario de la lista (no el baseline)
6. Verificar que el escenario seleccionado se resalta visualmente
7. Hacer clic en "Ejecutar con escenario"
8. Verificar que la encuesta se ejecuta correctamente
9. Verificar en consola que aparece el mensaje del escenario aplicado

**Resultado Esperado:**
- ✅ Modal muestra escenarios activos con metadata completa
- ✅ Escenario seleccionable con clic
- ✅ Visualización de categoría, sentimiento y severidad
- ✅ Encuesta se ejecuta aplicando el escenario
- ✅ Mensaje en consola: `[SurveyRunner] Escenario aplicado: ...`
- ✅ Resultados se muestran correctamente

---

### Caso 3: Sin Escenarios Activos

**Prerrequisitos:**
- No tener escenarios activos (o desactivar todos temporalmente)

**Pasos:**
1. Navegar a la página de Encuestas (`/surveys`)
2. Localizar una encuesta existente
3. Hacer clic en el botón "Ejecutar"
4. Verificar que el modal muestra mensaje "No hay escenarios activos disponibles"
5. Verificar que la opción baseline está preseleccionada
6. Hacer clic en "Ejecutar baseline"
7. Verificar que la encuesta se ejecuta correctamente

**Resultado Esperado:**
- ✅ Modal muestra mensaje de escenarios vacíos
- ✅ Opción baseline está preseleccionada y habilitada
- ✅ Botón de ejecución muestra "Ejecutar baseline"
- ✅ Encuesta se ejecuta sin errores

---

### Caso 4: Cancelar Ejecución

**Pasos:**
1. Navegar a la página de Encuestas (`/surveys`)
2. Hacer clic en "Ejecutar" en una encuesta
3. Verificar que aparece el modal
4. Hacer clic en "Cancelar" o en la X de cerrar
5. Verificar que el modal se cierra
6. Verificar que no se ejecuta la encuesta

**Resultado Esperado:**
- ✅ Modal se cierra al hacer clic en Cancelar
- ✅ Modal se cierra al hacer clic en la X
- ✅ Modal se cierra al hacer clic fuera del modal
- ✅ No se ejecuta la encuesta
- ✅ UI vuelve al estado anterior

---

### Caso 5: UI y Estilos

**Pasos:**
1. Abrir el modal de selección de escenario
2. Verificar visualmente:
   - Fondo oscuro con blur (backdrop-filter)
   - Animación de entrada (slideUp)
   - Estilos de las tarjetas de escenario
   - Badges de severidad (low/medium/high) con colores correctos
   - Badges de sentimiento (positive/negative/neutral)
   - Hover effects en las opciones
   - Estado seleccionado resaltado
3. Probar en modo responsive (si es posible)

**Resultado Esperado:**
- ✅ Fondo oscuro con blur aplicado
- ✅ Animación suave de entrada
- ✅ Tarjetas con bordes y sombras correctas
- ✅ Colores de badges: low=verde, medium=amarillo, high=rojo
- ✅ Colores de sentimiento: positive=verde, negative=rojo, neutral=gris
- ✅ Hover cambia el borde a cyan
- ✅ Opción seleccionada tiene borde cyan y fondo destacado
- ✅ Opción baseline tiene estilo verde especial

---

## Checklist de Validación

### Funcionalidad Core
- [ ] Modal aparece al hacer clic en "Ejecutar"
- [ ] Lista de escenarios se carga correctamente
- [ ] Opción baseline siempre disponible
- [ ] Selección de escenario funciona
- [ ] Ejecución con escenario aplica el impacto
- [ ] Ejecución baseline no aplica escenario
- [ ] Cancelar cierra el modal sin ejecutar

### UI/UX
- [ ] Estilos CSS aplicados correctamente
- [ ] Animaciones suaves
- [ ] Responsive design funciona
- [ ] Estados de hover correctos
- [ ] Estados de selección visibles
- [ ] Badges de metadata visibles

### Robustez
- [ ] Sin escenarios activos: UI no se rompe
- [ ] Errores de red manejados graceful
- [ ] Consola sin errores JavaScript
- [ ] Botón de ejecución deshabilitado durante carga

---

## Cómo Reportar Resultados

Por favor proporciona:

1. **¿El modal abre bien?** (Sí/No)
2. **¿Baseline funciona?** (Sí/No)
3. **¿Con escenario funciona?** (Sí/No)
4. **¿Viste algún bug visual o funcional?** (Descripción)
5. **¿El run termina correctamente?** (Sí/No)

Si hay errores, incluye:
- Mensajes de error en consola
- Screenshots si aplica
- Pasos exactos para reproducir

---

## Próximos Pasos Post-Validación

### Si R1 pasa validación:
1. ✅ Aprobar R1
2. 🔄 Implementar R2: Badge de escenario en resultados
3. 🔄 Validar R2

### Si R1 falla:
1. 🐛 Documentar bugs encontrados
2. 🐛 Corregir issues
3. 🔄 Re-validar

---

## Notas Técnicas

### Logs Esperados en Consola (modo debug)
```
[SurveysPage] Mostrando modal de selección de escenario
[SurveysPage] Escenarios cargados: N
[SurveysPage] Ejecutando encuesta X con escenario Y
[SurveyRunner] Escenario aplicado: Nombre del Escenario
[SurveyRunner] Ejecutando encuesta con X agentes
```

### Endpoints Involucrados
- `GET /scenario_events?status=active` - Listar escenarios
- `POST /survey_runs` - Ejecutar encuesta (con scenario_event_id opcional)

### Estados del Botón de Ejecución
- Inicial: "Ejecutar" (deshabilitado hasta seleccionar)
- Seleccionado baseline: "Ejecutar baseline"
- Seleccionado escenario: "Ejecutar con escenario"
- Ejecutando: "Ejecutando..." (deshabilitado)
