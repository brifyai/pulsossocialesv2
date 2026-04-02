# Diagnóstico de Conexión a Supabase

**Fecha:** 2 de abril de 2026
**Servidor:** `https://supabase.pulsossociales.com`
**IP:** `184.174.36.17`

## Resumen Ejecutivo

❌ **No se puede conectar a Supabase desde el entorno actual**

El problema es de **conectividad de red**, no de configuración del código o credenciales.

---

## Pruebas Realizadas

### 1. Test HTTP (curl)
```bash
curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 https://supabase.pulsossociales.com
```
**Resultado:** `000` (Connection failed)

**Interpretación:**
- Código HTTP 000 significa que curl no pudo establecer ninguna conexión TCP
- No es un error HTTP (4xx, 5xx), es un error de red a nivel de transporte

### 2. Test ICMP (ping)
```bash
ping -c 3 supabase.pulsossociales.com
```
**Resultado:**
```
PING supabase.pulsossociales.com (184.174.36.17): 56 data bytes
Request timeout for icmp_seq 0
Request timeout for icmp_seq 1
Request timeout for icmp_seq 2

--- supabase.pulsossociales.com ping statistics ---
3 packets transmitted, 0 packets received, 100.0% packet loss
```

**Interpretación:**
- El servidor DNS resuelve el dominio a la IP `184.174.36.17`
- Los paquetes ICMP no llegan al destino
- Posibles causas: firewall bloqueando ICMP, servidor apagado, o red inalcanzable

### 3. Test GitHub (conectividad general)
```bash
git clone https://github.com/jgm/pandoc.git
```
**Resultado:** `Failed to connect to github.com port 443 after 21015 ms: Could not connect to server`

**Interpretación:**
- El problema no es específico de Supabase
- Hay un problema general de conectividad de red saliente
- Posiblemente el entorno está aislado o tiene restricciones de red

### 4. Verificación de Docker
```bash
docker ps | grep supabase
```
**Resultado:** `No hay contenedores de Supabase corriendo`

**Interpretación:**
- No hay una instancia local de Supabase ejecutándose
- El script intenta conectarse a un servidor remoto que no es accesible

---

## Análisis de la Configuración

### Variables de Entorno (.env.scripts)
```
SUPABASE_URL=https://supabase.pulsossociales.com
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

✅ **Configuración correcta:**
- URL válida con formato HTTPS
- Service key presente y con formato JWT válido (contiene puntos)
- El archivo `.env.scripts` está correctamente configurado

### Código de Conexión (serviceClient.ts)
```typescript
export const serviceClient: SupabaseClient = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

✅ **Implementación correcta:**
- Uso correcto de `@supabase/supabase-js`
- Configuración de auth apropiada para scripts
- No hay problemas en el código

---

## Causas Raíz Identificadas

### Causa #1 (RESUELTA): Falta de carga de variables de entorno ✅

**Problema:** El script `validateWithRealRuns.ts` no cargaba el archivo `.env.scripts`

**Solución aplicada:** Agregar al inicio del script:
```typescript
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.scripts') });
dotenv.config({ path: resolve(process.cwd(), '.env') });
```

**Estado:** ✅ RESUELTO - El script ahora carga correctamente las variables

---

### Causa #2 (PENDIENTE): Problema de Red/Conectividad ❌

El entorno actual tiene **restricciones de red** que impiden:
1. Conexiones salientes HTTPS (puerto 443)
2. Conexiones ICMP (ping)
3. Conexiones a servidores externos en general

### Posibles Escenarios

#### Escenario A: Entorno Aislado/Offline
- El entorno de desarrollo está en una red aislada
- No tiene acceso a internet o está restringido
- Común en entornos de CI/CD o máquinas de desarrollo con restricciones

#### Escenario B: Firewall/Proxy Corporativo
- Hay un firewall bloqueando conexiones salientes
- Requiere configuración de proxy HTTP/HTTPS
- Las variables `HTTP_PROXY`/`HTTPS_PROXY` podrían ser necesarias

#### Escenario C: VPN Requerida
- El servidor Supabase está en una red privada
- Requiere conexión VPN para acceder
- La IP `184.174.36.17` podría ser interna o restringida

#### Escenario D: Servidor Supabase No Disponible
- El servidor está apagado o en mantenimiento
- El dominio no está apuntando al servidor correcto
- Problemas de infraestructura en el servidor

---

## Evidencia de que el Código Funciona

### Tests Unitarios Pasan ✅
```
Test Files  4 passed (4)
Tests       80 passed (80)
```

Los tests unitarios del módulo de análisis pasan correctamente porque:
- Usan datos mock/simulados
- No requieren conexión a base de datos
- La lógica del código está correctamente implementada

### Validación del Service Client
El código de validación de entorno (`validateScriptEnv.ts`) funciona correctamente:
- Detecta variables faltantes
- Valida formato de URL y JWT
- Lanza errores descriptivos si hay problemas de configuración

---

## Soluciones Recomendadas

### Opción 1: Verificar Conectividad de Red (Inmediata)
```bash
# Verificar si hay acceso a internet
curl -I https://www.google.com

# Verificar configuración de proxy
echo $HTTP_PROXY
echo $HTTPS_PROXY

# Verificar tabla de rutas
netstat -rn
```

### Opción 2: Configurar Proxy (Si aplica)
```bash
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
```

### Opción 3: Usar VPN (Si aplica)
Conectarse a la VPN de la organización antes de ejecutar scripts.

### Opción 4: Ejecutar desde Entorno con Acceso
Ejecutar los scripts desde:
- Un servidor con acceso a la red de Supabase
- Un entorno de CI/CD configurado con las credenciales correctas
- Una máquina de desarrollo con acceso a internet sin restricciones

### Opción 5: Levantar Supabase Local (Desarrollo)
```bash
# Usando Docker Compose
cd deploy
docker-compose -f docker-compose.supabase.yml up -d

# Actualizar .env.scripts para apuntar a localhost
SUPABASE_URL=http://localhost:8000
```

---

## Conclusión

### Estado del Código: ✅ FUNCIONAL
- El módulo de análisis está correctamente implementado
- Los tests unitarios pasan (80/80)
- La arquitectura es válida y mantenible

### Estado de la Conexión: ❌ NO DISPONIBLE
- El entorno actual no tiene acceso a `supabase.pulsossociales.com`
- Es un problema de infraestructura/red, no de código
- Requiere intervención del equipo de DevOps/Infraestructura

### Recomendación
Para validar con datos reales, ejecutar el script `validateWithRealRuns.ts` desde un entorno que tenga:
1. ✅ Acceso a internet
2. ✅ Conectividad al servidor `supabase.pulsossociales.com`
3. ✅ Variables de entorno correctamente configuradas

---

## Comandos para Diagnóstico Futuro

```bash
# Verificar resolución DNS
dig supabase.pulsossociales.com

# Verificar ruta de red
traceroute supabase.pulsossociales.com

# Verificar conexión TCP en puerto 443
telnet supabase.pulsossociales.com 443

# Verificar configuración de red
ifconfig
netstat -rn

# Verificar variables de proxy
env | grep -i proxy
```

---

**Documento generado:** 2026-04-02
**Análisis realizado por:** Cline (AI Assistant)
