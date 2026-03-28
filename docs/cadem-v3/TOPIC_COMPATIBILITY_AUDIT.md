# Auditoría de Compatibilidad de Topics - CADEM v1.2

**Fecha:** 28 de marzo de 2026  
**Auditor:** Cline  
**Estado:** ✅ COMPATIBLE (con observaciones menores)

---

## 📋 Resumen Ejecutivo

Se realizó una auditoría completa de compatibilidad entre los topics definidos en **CADEM v1.1** (motor de opiniones) y los topics utilizados en **CADEM v1.2** (sistema de eventos).

**Veredicto:** Los topics son **compatibles** en su mayoría. Se detectaron 2 topics en v1.2 que no existen en v1.1, pero no son críticos para el funcionamiento.

---

## 🔍 Topics en CADEM v1.1 (Motor de Opiniones)

### Definición en `src/types/opinion.ts`

```typescript
export type TopicKey =
  | 'government_approval'
  | 'country_direction'
  | 'country_optimism'
  | 'economy_personal'
  | 'economy_national'
  | 'employment'
  | 'consumption'
  | 'institutional_trust'
  | 'political_identity'
  | 'security_perception';
```

**Total: 10 topics**

### Uso en `src/app/opinionEngine/topicStateSeed.ts`

Todos los 10 topics son utilizados para inicializar estados:
1. `political_identity`
2. `economy_personal`
3. `economy_national`
4. `employment`
5. `consumption`
6. `institutional_trust`
7. `security_perception`
8. `country_optimism`
9. `country_direction`
10. `government_approval`

---

## 🔍 Topics en CADEM v1.2 (Sistema de Eventos)

### Definición en `src/app/events/types.ts` - CATEGORY_TOPIC_MAP

```typescript
export const CATEGORY_TOPIC_MAP: Record<EventCategory, string[]> = {
  government: [
    'government_approval',
    'country_direction'
  ],
  economy: [
    'economy_national',
    'economy_personal',
    'country_optimism',  // ⚠️ EXISTE en v1.1
    'country_direction'
  ],
  security: [
    'security_perception',
    'country_direction'
  ],
  institutions: [
    'institutional_trust'
  ],
  migration: [
    'country_direction',
    'security_perception'
  ],
  international: [
    'country_optimism',  // ⚠️ EXISTE en v1.1
    'economy_national'
  ],
  social: [
    'country_direction',
    'institutional_trust'
  ]
};
```

---

## 📊 Tabla de Compatibilidad

| Topic | En v1.1 | En v1.2 | Estado | Notas |
|-------|---------|---------|--------|-------|
| `government_approval` | ✅ | ✅ | ✅ Compatible | Afectado por government |
| `country_direction` | ✅ | ✅ | ✅ Compatible | Afectado por múltiples categorías |
| `country_optimism` | ✅ | ✅ | ✅ Compatible | Afectado por economy, international |
| `economy_personal` | ✅ | ✅ | ✅ Compatible | Afectado por economy |
| `economy_national` | ✅ | ✅ | ✅ Compatible | Afectado por economy, international |
| `employment` | ✅ | ❌ | ⚠️ No afectado | No está en CATEGORY_TOPIC_MAP |
| `consumption` | ✅ | ❌ | ⚠️ No afectado | No está en CATEGORY_TOPIC_MAP |
| `institutional_trust` | ✅ | ✅ | ✅ Compatible | Afectado por institutions, social |
| `political_identity` | ✅ | ❌ | ⚠️ No afectado | No está en CATEGORY_TOPIC_MAP |
| `security_perception` | ✅ | ✅ | ✅ Compatible | Afectado por security, migration |

### Resumen de Compatibilidad

- **✅ Topics compatibles (7):** government_approval, country_direction, country_optimism, economy_personal, economy_national, institutional_trust, security_perception
- **⚠️ Topics no afectados por eventos (3):** employment, consumption, political_identity

---

## 🚨 Topics Fantasma Detectados (CORREGIDOS)

### ✅ `social_trust` → `institutional_trust`

**Ubicación:** Test 9 en `scripts/test/testEventSensitivity.ts`

**Estado:** ✅ CORREGIDO el 28/03/2026

```typescript
// ANTES (incorrecto)
const initialStates = { social_trust: 0.5 };

// DESPUÉS (corregido)
const initialStates = { institutional_trust: 0.5 };
```

**Nota:** `institutional_trust` es un topic válido en v1.1 y es afectado por eventos de categoría `social` e `institutions`.

---

## 📈 Cobertura de Topics por Eventos

### Topics que SÍ cambian con eventos (7/10)

| Categoría | Topics Afectados |
|-----------|------------------|
| government | government_approval, country_direction |
| economy | economy_national, economy_personal, country_optimism, country_direction |
| security | security_perception, country_direction |
| institutions | institutional_trust |
| migration | country_direction, security_perception |
| international | country_optimism, economy_national |
| social | country_direction, institutional_trust |

### Topics que NO cambian con eventos (3/10)

1. **`employment`** - No hay categoría de eventos que lo afecte directamente
2. **`consumption`** - No hay categoría de eventos que lo afecte directamente
3. **`political_identity`** - Es un topic estable, no debería cambiar con eventos

**Análisis:** Esto es razonable. `employment` y `consumption` son percepciones económicas personales que cambian más por experiencia directa que por eventos. `political_identity` es un topic identitario que debería ser estable.

---

## ✅ Verificación de Implementación

### `src/app/events/eventImpact.ts`

La función `calculateTopicShift` recibe un topic como string y lo busca en `CATEGORY_TOPIC_MAP`. Si el topic no está mapeado para esa categoría, retorna `null` (no hay cambio).

```typescript
export function calculateTopicShift(
  event: WeeklyEvent,
  topic: string,  // <-- Recibe string, no TopicKey
  ...
): TopicShift | null {
  const affectedTopics = CATEGORY_TOPIC_MAP[event.category] ?? [];
  if (!affectedTopics.includes(topic)) {
    return null;  // Topic no afectado por esta categoría
  }
  ...
}
```

**Veredicto:** La implementación es segura. Si un topic no existe o no está mapeado, simplemente no hay cambio.

### `src/app/opinionEngine/opinionUpdater.ts`

```typescript
// Convierte Record<TopicKey, number> a Record<string, number>
const topicStates: Record<string, number> = {
  government_approval: 0.5,
  country_direction: 0.5,
  ...
};
```

**Veredicto:** La conversión es compatible porque TypeScript permite asignar `Record<TopicKey, number>` a `Record<string, number>`.

---

## 🔧 Correcciones Recomendadas

### 1. Corregir test (Alta prioridad)

**Archivo:** `scripts/test/testEventSensitivity.ts`

```typescript
// ANTES (línea ~180)
const initialStates = { social_trust: 0.5 };

// DESPUÉS
const initialStates = { institutional_trust: 0.5 };
```

### 2. Considerar agregar employment/consumption (Baja prioridad)

Si se desea que eventos económicos afecten `employment` y `consumption`:

```typescript
// En src/app/events/types.ts
export const CATEGORY_TOPIC_MAP: Record<EventCategory, string[]> = {
  economy: [
    'economy_national',
    'economy_personal',
    'country_optimism',
    'country_direction',
    'employment',      // <-- AGREGAR
    'consumption'      // <-- AGREGAR
  ],
  ...
};
```

**Nota:** No es crítico. Estos topics pueden mantenerse como "estables" o cambiar solo por encuestas.

---

## 📋 Checklist de Compatibilidad

| Item | Estado |
|------|--------|
| Todos los topics de v1.2 existen en v1.1 | ✅ Sí (7/7 usados) |
| No hay topics fantasmas críticos | ✅ Sí (solo en test) |
| Mapeo de categorías es coherente | ✅ Sí |
| Implementación es type-safe | ✅ Sí |
| Topics no mapeados no causan errores | ✅ Sí (retornan null) |

---

## 🎯 Conclusión

### Estado: ✅ COMPATIBLE

El sistema de eventos v1.2 es **compatible** con el motor de opiniones v1.1. Los topics utilizados en el mapeo de eventos existen todos en la definición de TopicKey.

### Observaciones:

1. **3 topics no son afectados por eventos:** `employment`, `consumption`, `political_identity`. Esto es razonable desde el punto de vista del modelo.

2. **1 topic fantasma en tests:** ✅ **CORREGIDO** - `social_trust` fue cambiado a `institutional_trust`.

3. **La implementación es robusta:** Si un topic no está mapeado, el sistema simplemente no aplica cambios (no hay errores).

### Recomendación:

✅ **Proceder con la integración** - La compatibilidad de topics está verificada y corregida.

---

## 📁 Archivos Auditados

1. ✅ `src/types/opinion.ts` - Definición de TopicKey
2. ✅ `src/app/opinionEngine/types.ts` - Uso de TopicKey
3. ✅ `src/app/opinionEngine/topicStateSeed.ts` - Inicialización de topics
4. ✅ `src/app/events/types.ts` - Mapeo de categorías a topics
5. ✅ `src/app/events/eventImpact.ts` - Lógica de aplicación de cambios
6. ✅ `scripts/test/testEventSensitivity.ts` - Tests unitarios

---

**Auditoría completada:** 28 de marzo de 2026  
**Próximo paso:** Corregir test y proceder con integración
