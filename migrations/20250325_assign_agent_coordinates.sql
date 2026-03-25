-- =============================================================================
-- MIGRACIÓN: ASIGNAR COORDENADAS GPS A AGENTES SINTÉTICOS
-- Asigna coordenadas basadas en el centroide de la comuna + ruido aleatorio
-- =============================================================================

-- Primero, verificar que tenemos el diccionario de coordenadas
-- Si no existe, crear tabla temporal con coordenadas de comunas
CREATE TABLE IF NOT EXISTS temp_comuna_coordinates (
    comuna_code VARCHAR(10) PRIMARY KEY,
    lat NUMERIC(10, 8) NOT NULL,
    lng NUMERIC(11, 8) NOT NULL,
    region_code VARCHAR(5)
);

-- Insertar coordenadas de comunas principales (ampliar según necesidad)
INSERT INTO temp_comuna_coordinates (comuna_code, lat, lng, region_code) VALUES
    -- Región Metropolitana (13)
    ('13101', -33.4372, -70.6506, '13'), -- Santiago
    ('13102', -33.5000, -70.7500, '13'), -- Cerrillos
    ('13103', -33.5667, -70.7167, '13'), -- Cerro Navia
    ('13104', -33.5333, -70.6833, '13'), -- Conchalí
    ('13105', -33.4333, -70.5500, '13'), -- El Bosque
    ('13106', -33.4833, -70.6667, '13'), -- Estación Central
    ('13107', -33.5333, -70.5833, '13'), -- Huechuraba
    ('13108', -33.4667, -70.6333, '13'), -- Independencia
    ('13109', -33.5167, -70.6667, '13'), -- La Cisterna
    ('13110', -33.4500, -70.5667, '13'), -- La Florida
    ('13111', -33.5333, -70.7333, '13'), -- La Pintana
    ('13112', -33.4500, -70.6167, '13'), -- La Reina
    ('13113', -33.4333, -70.6167, '13'), -- Las Condes
    ('13114', -33.4167, -70.5333, '13'), -- Lo Espejo
    ('13115', -33.4333, -70.7167, '13'), -- Lo Prado
    ('13116', -33.4667, -70.6000, '13'), -- Macul
    ('13117', -33.5000, -70.6333, '13'), -- Maipú
    ('13118', -33.4833, -70.5333, '13'), -- Ñuñoa
    ('13119', -33.4167, -70.7333, '13'), -- Pedro Aguirre Cerda
    ('13120', -33.4833, -70.6167, '13'), -- Peñalolén
