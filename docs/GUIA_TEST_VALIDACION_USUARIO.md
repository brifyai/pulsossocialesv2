# Guía de Test de Validación de Usuario

## Test Automatizado: `userValidationTest.ts`

Este test simula las interacciones de un usuario real con el Scenario Builder y verifica que cumple con los criterios de usabilidad definidos.

---

## 📋 Qué Verifica el Test

### 1. Escenarios de Ejemplo
- ✅ Existen escenarios creados
- ✅ Variedad de categorías (≥3)
- ✅ Variedad de sentimientos (positivos y negativos)

### 2. Creación de Escenarios
- ✅ Claridad del título (5-100 caracteres)
- ✅ Claridad de la descripción
- ✅ Rangos de parámetros válidos
- ✅ Creación exitosa en base de datos

### 3. Claridad Baseline vs Escenario
- ✅ Existen runs baseline
- ✅ Identificación clara de escenarios
- ✅ Metadata apropiada

### 4. Comprensión de Parámetros
- ⚠️ Detecta patrones confusos (intensidad vs salience)
- ⚠️ Identifica valores extremos
- ⚠️ Verifica consistencia severidad/sentimiento

### 5. Comparación de Escenarios
- ✅ Runs con resultados disponibles
- ✅ Estructura de distribuciones correcta
- ✅ Parejas baseline/escenario para comparar

### 6. Confianza en Resultados
- ✅ Confidence scores disponibles
- ✅ Nivel de confianza aceptable (≥0.6)
- ✅ Tamaño de muestra visible

### 7. Comportamiento de q_direction
- ✅ Detecta valores negativos en distribuciones
- ✅ Identifica comportamientos inconsistentes

### 8. Integridad de Datos de Agentes
- ✅ Agentes disponibles en base de datos
- ✅ Campos críticos presentes (id, age, gender, region, comuna, coordinates)

---

## 🚀 Cómo Ejecutar

### Prerrequisitos
```bash
# Tener configuradas las variables de entorno
export SUPABASE_URL="tu-url"
export SUPABASE_SERVICE_KEY="tu-service-key"
```

### Ejecución (con tsx)
```bash
# Desde la raíz del proyecto
export $(grep -v '^#' .env.scripts | xargs) && npx tsx scripts/test/userValidationTest.ts
```

**Nota:** El test requiere `tsx` en lugar de `ts-node` debido a la configuración de módulos ES. Asegúrate de tener instalado `tsx` globalmente o usar `npx tsx`.

---

## 📊 Interpretación de Resultados

### Score de Usabilidad

| Score | Interpretación | Acción Recomendada |
|-------|----------------|-------------------|
| 80-100% | ✅ Excelente | Listo para user testing real |
| 60-79% | 🟡 Aceptable | Funcional con áreas de mejora |
| 40-59% | 🟠 Necesita mejoras | Problemas significativos |
| 0-39% | 🔴 Crítico | No recomendado sin mejoras |

### Severidad de Hallazgos

- **🔴 Crítico**: Bloquea el uso por parte de usuarios
- **🟡 Advertencia**: Afecta la experiencia pero no bloquea
- **ℹ️ Info**: Observaciones para considerar

---

## 🎯 Criterios de Éxito para User Testing

### Mínimo Aceptable (60%)
- [ ] Escenarios de ejemplo existen
- [ ] Se pueden crear escenarios
- [ ] Baseline vs escenario es claro
- [ ] Resultados son visibles

### Buen Resultado (75%)
- [ ] Variedad adecuada de escenarios
- [ ] Parámetros son comprensibles
- [ ] Comparación funciona bien
- [ ] Confidence scores visibles

### Excelente Resultado (90%+)
- [ ] Sin patrones confusos
- [ ] q_direction comportamiento correcto
- [ ] Datos de agentes completos
- [ ] Usuarios pueden operar sin ayuda

---

## 🔄 Flujo de Validación

```
┌─────────────────┐
│  Test Automático │
│  userValidation  │
│     Score ≥60%   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  User Testing   │
│   3-5 usuarios  │
│   Presencial    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Análisis      │
│   Feedback      │
│   Priorización  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Iteración     │
│   Mejoras       │
│   Re-test       │
└─────────────────┘
```

---

## 📝 Checklist Pre-Test

- [ ] Variables de entorno configuradas
- [ ] Base de datos accesible
- [ ] Escenarios de ejemplo creados
- [ ] Runs baseline ejecutados
- [ ] Service key con permisos adecuados

---

## 🐛 Troubleshooting

### Error: "No hay escenarios creados"
**Solución**: Ejecutar primero `scripts/test/prepareUserTestingScenarios.ts`

### Error: "No hay runs baseline"
**Solución**: Ejecutar una encuesta baseline sin escenario

### Error: "No hay agentes"
**Solución**: Verificar que `synthetic_agents` tiene datos

### Error de conexión a Supabase
**Solución**: Verificar `SUPABASE_URL` y `SUPABASE_SERVICE_KEY`

---

## 📈 Métricas a Monitorear

Durante el user testing real, monitorear:

1. **Tiempo para crear primer escenario**
   - Objetivo: < 5 minutos
   - Alerta: > 10 minutos

2. **Tasa de éxito en creación**
   - Objetivo: > 70%
   - Alerta: < 50%

3. **Comprensión de baseline vs escenario**
   - Objetivo: > 60% entiende la diferencia
   - Alerta: < 40%

4. **Confianza en resultados**
   - Objetivo: > 60% confía
   - Alerta: < 40%

---

## 📚 Documentación Relacionada

- [SCENARIO_BUILDER_USER_TESTING_GUIDE.md](./cadem-v3/SCENARIO_BUILDER_USER_TESTING_GUIDE.md) - Guía de sesiones presenciales
- [SCENARIO_BUILDER_VALIDATION_PLAN.md](./cadem-v3/SCENARIO_BUILDER_VALIDATION_PLAN.md) - Plan de validación técnica
- [INFORME_VALIDACION_PRE_BETA.md](./INFORME_VALIDACION_PRE_BETA.md) - Estado actual del sistema

---

**Última actualización:** 30 de marzo de 2026
**Versión:** 1.0
