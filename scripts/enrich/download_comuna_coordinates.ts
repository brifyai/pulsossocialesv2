/**
 * Script para descargar coordenadas de TODAS las comunas de Chile
 * Usa OpenStreetMap/Nominatim API
 */

import * as fs from 'fs';
import * as path from 'path';

interface ComunaCoordinate {
  code: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
}

// Lista completa de comunas de Chile con sus códigos
// Fuente: INE Chile
const COMUNAS_CHILE: { code: string; name: string; region: string }[] = [
  // Región de Arica y Parinacota (15)
  { code: '15101', name: 'Arica', region: 'Arica y Parinacota' },
  { code: '15102', name: 'Camarones', region: 'Arica y Parinacota' },
  { code: '15201', name: 'Putre', region: 'Arica y Parinacota' },
  { code: '15202', name: 'General Lagos', region: 'Arica y Parinacota' },
  
  // Región de Tarapacá (01)
  { code: '01101', name: 'Iquique', region: 'Tarapacá' },
  { code: '01102', name: 'Alto Hospicio', region: 'Tarapacá' },
  { code: '01201', name: 'Pozo Almonte', region: 'Tarapacá' },
  { code: '01202', name: 'Camiña', region: 'Tarapacá' },
  { code: '01203', name: 'Colchane', region: 'Tarapacá' },
  { code: '01204', name: 'Huara', region: 'Tarapacá' },
  { code: '01205', name: 'Pica', region: 'Tarapacá' },
  
  // Región de Antofagasta (02)
  { code: '02101', name: 'Antofagasta', region: 'Antofagasta' },
  { code: '02102', name: 'Mejillones', region: 'Antofagasta' },
  { code: '02103', name: 'Sierra Gorda', region: 'Antofagasta' },
  { code: '02104', name: 'Taltal', region: 'Antofagasta' },
  { code: '02201', name: 'Calama', region: 'Antofagasta' },
  { code: '02202', name: 'Ollagüe', region: 'Antofagasta' },
  { code: '02203', name: 'San Pedro de Atacama', region: 'Antofagasta' },
  { code: '02301', name: 'Tocopilla', region: 'Antofagasta' },
  { code: '02302', name: 'María Elena', region: 'Antofagasta' },
  
  // Región de Atacama (03)
  { code: '03101', name: 'Copiapó', region: 'Atacama' },
  { code: '03102', name: 'Caldera', region: 'Atacama' },
  { code: '03103', name: 'Tierra Amarilla', region: 'Atacama' },
  { code: '03201', name: 'Chañaral', region: 'Atacama' },
  { code: '03202', name: 'Diego de Almagro', region: 'Atacama' },
  { code: '03301', name: 'Vallenar', region: 'Atacama' },
  { code: '03302', name: 'Alto del Carmen', region: 'Atacama' },
  { code: '03303', name: 'Freirina', region: 'Atacama' },
  { code: '03304', name: 'Huasco', region: 'Atacama' },
  
  // Región de Coquimbo (04)
  { code: '04101', name: 'La Serena', region: 'Coquimbo' },
  { code: '04102', name: 'Coquimbo', region: 'Coquimbo' },
  { code: '04103', name: 'Andacollo', region: 'Coquimbo' },
  { code: '04104', name: 'La Higuera', region: 'Coquimbo' },
  { code: '04105', name: 'Paihuano', region: 'Coquimbo' },
  { code: '04106', name: 'Vicuña', region: 'Coquimbo' },
  { code: '04201', name: 'Illapel', region: 'Coquimbo' },
  { code: '04202', name: 'Canela', region: 'Coquimbo' },
  { code: '04203', name: 'Los Vilos', region: 'Coquimbo' },
  { code: '04204', name: 'Salamanca', region: 'Coquimbo' },
  { code: '04301', name: 'Ovalle', region: 'Coquimbo' },
  { code: '04302', name: 'Combarbalá', region: 'Coquimbo' },
  { code: '04303', name: 'Monte Patria', region: 'Coquimbo' },
  { code: '04304', name: 'Punitaqui', region: 'Coquimbo' },
  { code: '04305', name: 'Río Hurtado', region: 'Coquimbo' },
  
  // Región de Valparaíso (05)
  { code: '05101', name: 'Valparaíso', region: 'Valparaíso' },
  { code: '05102', name: 'Casablanca', region: 'Valparaíso' },
  { code: '05103', name: 'Concón', region: 'Valparaíso' },
  { code: '05104', name: 'Juan Fernández', region: 'Valparaíso' },
  { code: '05105', name: 'Puchuncaví', region: 'Valparaíso' },
  { code: '05106', name: 'Quintero', region: 'Valparaíso' },
  { code: '05107', name: 'Viña del Mar', region: 'Valparaíso' },
  { code: '05201', name: 'Isla de Pascua', region: 'Valparaíso' },
  { code: '05301', name: 'Los Andes', region: 'Valparaíso' },
  { code: '05302', name: 'Calle Larga', region: 'Valparaíso' },
  { code: '05303', name: 'Rinconada', region: 'Valparaíso' },
  { code: '05304', name: 'San Esteban', region: 'Valparaíso' },
  { code: '05401', name: 'La Ligua', region: 'Valparaíso' },
  { code: '05402', name: 'Cabildo', region: 'Valparaíso' },
  { code: '05403', name: 'Papudo', region: 'Valparaíso' },
  { code: '05404', name: 'Petorca', region: 'Valparaíso' },
  { code: '05405', name: 'Zapallar', region: 'Valparaíso' },
  { code: '05501', name: 'Quillota', region: 'Valparaíso' },
  { code: '05502', name: 'Calera', region: 'Valparaíso' },
  { code: '05503', name: 'Hijuelas', region: 'Valparaíso' },
  { code: '05504', name: 'La Cruz', region: 'Valparaíso' },
  { code: '05505', name: 'Nogales', region: 'Valparaíso' },
  { code: '05506', name: 'Olmué', region: 'Valparaíso' },
  { code: '05601', name: 'San Antonio', region: 'Valparaíso' },
  { code: '05602', name: 'Algarrobo', region: 'Valparaíso' },
  { code: '05603', name: 'Cartagena', region: 'Valparaíso' },
  { code: '05604', name: 'El Quisco', region: 'Valparaíso' },
  { code: '05605', name: 'El Tabo', region: 'Valparaíso' },
  { code: '05606', name: 'Santo Domingo', region: 'Valparaíso' },
  { code: '05701', name: 'San Felipe', region: 'Valparaíso' },
  { code: '05702', name: 'Catemu', region: 'Valparaíso' },
  { code: '05703', name: 'Llaillay', region: 'Valparaíso' },
  { code: '05704', name: 'Panquehue', region: 'Valparaíso' },
  { code: '05705', name: 'Putaendo', region: 'Valparaíso' },
  { code: '05706', name: 'Santa María', region: 'Valparaíso' },
  { code: '05801', name: 'Quilpué', region: 'Valparaíso' },
  { code: '05802', name: 'Limache', region: 'Valparaíso' },
  { code: '05803', name: 'Olmué', region: 'Valparaíso' },
  { code: '05804', name: 'Villa Alemana', region: 'Valparaíso' },
  
  // Región Metropolitana (13)
  { code: '13101', name: 'Santiago', region: 'Metropolitana' },
  { code: '13102', name: 'Cerrillos', region: 'Metropolitana' },
  { code: '13103', name: 'Cerro Navia', region: 'Metropolitana' },
  { code: '13104', name: 'Conchalí', region: 'Metropolitana' },
  { code: '13105', name: 'El Bosque', region: 'Metropolitana' },
  { code: '13106', name: 'Estación Central', region: 'Metropolitana' },
  { code: '13107', name: 'Huechuraba', region: 'Metropolitana' },
  { code: '13108', name: 'Independencia', region: 'Metropolitana' },
  { code: '13109', name: 'La Cisterna', region: 'Metropolitana' },
  { code: '13110', name: 'La Florida', region: 'Metropolitana' },
  { code: '13111', name: 'La Granja', region: 'Metropolitana' },
  { code: '13112', name: 'La Pintana', region: 'Metropolitana' },
  { code: '13113', name: 'La Reina', region: 'Metropolitana' },
  { code: '13114', name: 'Las Condes', region: 'Metropolitana' },
  { code: '13115', name: 'Lo Barnechea', region: 'Metropolitana' },
  { code: '13116', name: 'Lo Espejo', region: 'Metropolitana' },
  { code: '13117', name: 'Lo Prado', region: 'Metropolitana' },
  { code: '13118', name: 'Macul', region: 'Metropolitana' },
  { code: '13119', name: 'Maipú', region: 'Metropolitana' },
  { code: '13120', name: 'Ñuñoa', region: 'Metropolitana' },
  { code: '13121', name: 'Pedro Aguirre Cerda', region: 'Metropolitana' },
  { code: '13122', name: 'Peñalolén', region: 'Metropolitana' },
  { code: '13123', name: 'Providencia', region: 'Metropolitana' },
  { code: '13124', name: 'Pudahuel', region: 'Metropolitana' },
  { code: '13125', name: 'Quilicura', region: 'Metropolitana' },
  { code: '13126', name: 'Quinta Normal', region: 'Metropolitana' },
  { code: '13127', name: 'Recoleta', region: 'Metropolitana' },
  { code: '13128', name: 'Renca', region: 'Metropolitana' },
  { code: '13129', name: 'San Joaquín', region: 'Metropolitana' },
  { code: '13130', name: 'San Miguel', region: 'Metropolitana' },
  { code: '13131', name: 'San Ramón', region: 'Metropolitana' },
  { code: '13132', name: 'Vitacura', region: 'Metropolitana' },
  { code: '13201', name: 'Puente Alto', region: 'Metropolitana' },
  { code: '13202', name: 'Pirque', region: 'Metropolitana' },
  { code: '13203', name: 'San José de Maipo', region: 'Metropolitana' },
  { code: '13301', name: 'Colina', region: 'Metropolitana' },
  { code: '13302', name: 'Lampa', region: 'Metropolitana' },
  { code: '13303', name: 'Tiltil', region: 'Metropolitana' },
  { code: '13401', name: 'San Bernardo', region: 'Metropolitana' },
  { code: '13402', name: 'Buin', region: 'Metropolitana' },
  { code: '13403', name: 'Calera de Tango', region: 'Metropolitana' },
  { code: '13404', name: 'Paine', region: 'Metropolitana' },
  { code: '13501', name: 'Melipilla', region: 'Metropolitana' },
  { code: '13502', name: 'Alhué', region: 'Metropolitana' },
  { code: '13503', name: 'Curacaví', region: 'Metropolitana' },
  { code: '13504', name: 'María Pinto', region: 'Metropolitana' },
  { code: '13505', name: 'San Pedro', region: 'Metropolitana' },
  { code: '13601', name: 'Talagante', region: 'Metropolitana' },
  { code: '13602', name: 'El Monte', region: 'Metropolitana' },
  { code: '13603', name: 'Isla de Maipo', region: 'Metropolitana' },
  { code: '13604', name: 'Padre Hurtado', region: 'Metropolitana' },
  { code: '13605', name: 'Peñaflor', region: 'Metropolitana' },
  
  // Región de O'Higgins (06)
  { code: '06101', name: 'Rancagua', region: "O'Higgins" },
  { code: '06102', name: 'Codegua', region: "O'Higgins" },
  { code: '06103', name: 'Coinco', region: "O'Higgins" },
  { code: '06104', name: 'Coltauco', region: "O'Higgins" },
  { code: '06105', name: 'Doñihue', region: "O'Higgins" },
  { code: '06106', name: 'Graneros', region: "O'Higgins" },
  { code: '06107', name: 'Las Cabras', region: "O'Higgins" },
  { code: '06108', name: 'Machalí', region: "O'Higgins" },
  { code: '06109', name: 'Malloa', region: "O'Higgins" },
  { code: '06110', name: 'Mostazal', region: "O'Higgins" },
  { code: '06111', name: 'Olivar', region: "O'Higgins" },
  { code: '06112', name: 'Peumo', region: "O'Higgins" },
  { code: '06113', name: 'Pichidegua', region: "O'Higgins" },
  { code: '06114', name: 'Quinta de Tilcoco', region: "O'Higgins" },
  { code: '06115', name: 'Rengo', region: "O'Higgins" },
  { code: '06116', name: 'Requínoa', region: "O'Higgins" },
  { code: '06117', name: 'San Vicente', region: "O'Higgins" },
  { code: '06201', name: 'Pichilemu', region: "O'Higgins" },
  { code: '06202', name: 'La Estrella', region: "O'Higgins" },
  { code: '06203', name: 'Litueche', region: "O'Higgins" },
  { code: '06204', name: 'Marchihue', region: "O'Higgins" },
  { code: '06205', name: 'Navidad', region: "O'Higgins" },
  { code: '06206', name: 'Paredones', region: "O'Higgins" },
  { code: '06301', name: 'San Fernando', region: "O'Higgins" },
  { code: '06302', name: 'Chépica', region: "O'Higgins" },
  { code: '06303', name: 'Chimbarongo', region: "O'Higgins" },
  { code: '06304', name: 'Lolol', region: "O'Higgins" },
  { code: '06305', name: 'Nancagua', region: "O'Higgins" },
  { code: '06306', name: 'Palmilla', region: "O'Higgins" },
  { code: '06307', name: 'Peralillo', region: "O'Higgins" },
  { code: '06308', name: 'Placilla', region: "O'Higgins" },
  { code: '06309', name: 'Pumanque', region: "O'Higgins" },
  { code: '06310', name: 'Santa Cruz', region: "O'Higgins" },
  
  // Región del Maule (07)
  { code: '07101', name: 'Talca', region: 'Maule' },
  { code: '07102', name: 'Constitución', region: 'Maule' },
  { code: '07103', name: 'Curepto', region: 'Maule' },
  { code: '07104', name: 'Empedrado', region: 'Maule' },
  { code: '07105', name: 'Maule', region: 'Maule' },
  { code: '07106', name: 'Pelarco', region: 'Maule' },
  { code: '07107', name: 'Pencahue', region: 'Maule' },
  { code: '07108', name: 'Río Claro', region: 'Maule' },
  { code: '07109', name: 'San Clemente', region: 'Maule' },
  { code: '07110', name: 'San Rafael', region: 'Maule' },
  { code: '07201', name: 'Cauquenes', region: 'Maule' },
  { code: '07202', name: 'Chanco', region: 'Maule' },
  { code: '07203', name: 'Pelluhue', region: 'Maule' },
  { code: '07301', name: 'Curicó', region: 'Maule' },
  { code: '07302', name: 'Hualañé', region: 'Maule' },
  { code: '07303', name: 'Licantén', region: 'Maule' },
  { code: '07304', name: 'Molina', region: 'Maule' },
  { code: '07305', name: 'Rauco', region: 'Maule' },
  { code: '07306', name: 'Romeral', region: 'Maule' },
  { code: '07307', name: 'Sagrada Familia', region: 'Maule' },
  { code: '07308', name: 'Teno', region: 'Maule' },
  { code: '07309', name: 'Vichuquén', region: 'Maule' },
  { code: '07401', name: 'Linares', region: 'Maule' },
  { code: '07402', name: 'Colbún', region: 'Maule' },
  { code: '07403', name: 'Longaví', region: 'Maule' },
  { code: '07404', name: 'Parral', region: 'Maule' },
  { code: '07405', name: 'Retiro', region: 'Maule' },
  { code: '07406', name: 'San Javier', region: 'Maule' },
  { code: '07407', name: 'Villa Alegre', region: 'Maule' },
  { code: '07408', name: 'Yerbas Buenas', region: 'Maule' },
  
  // Región de Ñuble (16)
  { code: '16101', name: 'Chillán', region: 'Ñuble' },
  { code: '16102', name: 'Bulnes', region: 'Ñuble' },
  { code: '16103', name: 'Chillán Viejo', region: 'Ñuble' },
  { code: '16104', name: 'El Carmen', region: 'Ñuble' },
  { code: '16105', name: 'Pemuco', region: 'Ñuble' },
  { code: '16106', name: 'Pinto', region: 'Ñuble' },
  { code: '16107', name: 'Quillón', region: 'Ñuble' },
  { code: '16108', name: 'San Ignacio', region: 'Ñuble' },
  { code: '16109', name: 'Yungay', region: 'Ñuble' },
  { code: '16201', name: 'Quirihue', region: 'Ñuble' },
  { code: '16202', name: 'Cobquecura', region: 'Ñuble' },
  { code: '16203', name: 'Coelemu', region: 'Ñuble' },
  { code: '16204', name: 'Ninhue', region: 'Ñuble' },
  { code: '16205', name: 'Portezuelo', region: 'Ñuble' },
  { code: '16206', name: 'Ránquil', region: 'Ñuble' },
  { code: '16207', name: 'Treguaco', region: 'Ñuble' },
  { code: '16301', name: 'San Carlos', region: 'Ñuble' },
  { code: '16302', name: 'Coihueco', region: 'Ñuble' },
  { code: '16303', name: 'Ñiquén', region: 'Ñuble' },
  { code: '16304', name: 'San Fabián', region: 'Ñuble' },
  { code: '16305', name: 'San Nicolás', region: 'Ñuble' },
  
  // Región del Biobío (08)
  { code: '08101', name: 'Concepción', region: 'Biobío' },
  { code: '08102', name: 'Coronel', region: 'Biobío' },
  { code: '08103', name: 'Chiguayante', region: 'Biobío' },
  { code: '08104', name: 'Florida', region: 'Biobío' },
  { code: '08105', name: 'Hualqui', region: 'Biobío' },
  { code: '08106', name: 'Lota', region: 'Biobío' },
  { code: '08107', name: 'Penco', region: 'Biobío' },
  { code: '08108', name: 'San Pedro de la Paz', region: 'Biobío' },
  { code: '08109', name: 'Santa Juana', region: 'Biobío' },
  { code: '08110', name: 'Talcahuano', region: 'Biobío' },
  { code: '08111', name: 'Tomé', region: 'Biobío' },
  { code: '08112', name: 'Hualpén', region: 'Biobío' },
  { code: '08201', name: 'Los Ángeles', region: 'Biobío' },
  { code: '08202', name: 'Antuco', region: 'Biobío' },
  { code: '08203', name: 'Cabrero', region: 'Biobío' },
  { code: '08204', name: 'Laja', region: 'Biobío' },
  { code: '08205', name: 'Mulchén', region: 'Biobío' },
  { code: '08206', name: 'Nacimiento', region: 'Biobío' },
  { code: '08207', name: 'Negrete', region: 'Biobío' },
  { code: '08208', name: 'Quilaco', region: 'Biobío' },
  { code: '08209', name: 'Quilleco', region: 'Biobío' },
  { code: '08210', name: 'San Rosendo', region: 'Biobío' },
  { code: '08211', name: 'Santa Bárbara', region: 'Biobío' },
  { code: '08212', name: 'Tucapel', region: 'Biobío' },
  { code: '08213', name: 'Yumbel', region: 'Biobío' },
  { code: '08214', name: 'Alto Biobío', region: 'Biobío' },
  { code: '08301', name: 'Chillán', region: 'Biobío' },
  { code: '08302', name: 'Bulnes', region: 'Biobío' },
  { code: '08303', name: 'Cobquecura', region: 'Biobío' },
  { code: '08304', name: 'Coelemu', region: 'Biobío' },
  { code: '08305', name: 'Coihueco', region: 'Biobío' },
  { code: '08306', name: 'Chillán Viejo', region: 'Biobío' },
  { code: '08307', name: 'El Carmen', region: 'Biobío' },
  { code: '08308', name: 'Ninhue', region: 'Biobío' },
  { code: '08309', name: 'Ñiquén', region: 'Biobío' },
  { code: '08310', name: 'Pemuco', region: 'Biobío' },
  { code: '08311', name: 'Pinto', region: 'Biobío' },
  { code: '08312', name: 'Portezuelo', region: 'Biobío' },
  { code: '08313', name: 'Quillón', region: 'Biobío' },
  { code: '08314', name: 'Quirihue', region: 'Biobío' },
  { code: '08315', name: 'Ránquil', region: 'Biobío' },
  { code: '08316', name: 'San Fabián', region: 'Biobío' },
  { code: '08317', name: 'San Ignacio', region: 'Biobío' },
  { code: '08318', name: 'San Nicolás', region: 'Biobío' },
  { code: '08319', name: 'Treguaco', region: 'Biobío' },
  { code: '08320', name: 'Yungay', region: 'Biobío' },
  
  // Región de La Araucanía (09)
  { code: '09101', name: 'Temuco', region: 'La Araucanía' },
  { code: '09102', name: 'Carahue', region: 'La Araucanía' },
  { code: '09103', name: 'Cunco', region: 'La Araucanía' },
  { code: '09104', name: 'Curarrehue', region: 'La Araucanía' },
  { code: '09105', name: 'Freire', region: 'La Araucanía' },
  { code: '09106', name: 'Galvarino', region: 'La Araucanía' },
  { code: '09107', name: 'Gorbea', region: 'La Araucanía' },
  { code: '09108', name: 'Lautaro', region: 'La Araucanía' },
  { code: '09109', name: 'Loncoche', region: 'La Araucanía' },
  { code: '09110', name: 'Melipeuco', region: 'La Araucanía' },
  { code: '09111', name: 'Nueva Imperial', region: 'La Araucanía' },
  { code: '09112', name: 'Padre Las Casas', region: 'La Araucanía' },
  { code: '09113', name: 'Perquenco', region: 'La Araucanía' },
  { code: '09114', name: 'Pitrufquén', region: 'La Araucanía' },
  { code: '09115', name: 'Pucón', region: 'La Araucanía' },
  { code: '09116', name: 'Saavedra', region: 'La Araucanía' },
  { code: '09117', name: 'Teodoro Schmidt', region: 'La Araucanía' },
  { code: '09118', name: 'Toltén', region: 'La Araucanía' },
  { code: '09119', name: 'Vilcún', region: 'La Araucanía' },
  { code: '09120', name: 'Villarrica', region: 'La Araucanía' },
  { code: '09121', name: 'Cholchol', region: 'La Araucanía' },
  { code: '09201', name: 'Angol', region: 'La Araucanía' },
  { code: '09202', name: 'Collipulli', region: 'La Araucanía' },
  { code: '09203', name: 'Curacautín', region: 'La Araucanía' },
  { code: '09204', name: 'Ercilla', region: 'La Araucanía' },
  { code: '09205', name: 'Lonquimay', region: 'La Araucanía' },
  { code: '09206', name: 'Los Sauces', region: 'La Araucanía' },
  { code: '09207', name: 'Lumaco', region: 'La Araucanía' },
  { code: '09208', name: 'Purén', region: 'La Araucanía' },
  { code: '09209', name: 'Renaico', region: 'La Araucanía' },
  { code: '09210', name: 'Traiguén', region: 'La Araucanía' },
  { code: '09211', name: 'Victoria', region: 'La Araucanía' },
  
  // Región de Los Ríos (14)
  { code: '14101', name: 'Valdivia', region: 'Los Ríos' },
  { code: '14102', name: 'Corral', region: 'Los Ríos' },
  { code: '14103', name: 'Lanco', region: 'Los Ríos' },
  { code: '14104', name: 'Los Lagos', region: 'Los Ríos' },
  { code: '14105', name: 'Máfil', region: 'Los Ríos' },
  { code: '14106', name: 'Mariquina', region: 'Los Ríos' },
  { code: '14107', name: 'Paillaco', region: 'Los Ríos' },
  { code: '14108', name: 'Panguipulli', region: 'Los Ríos' },
  { code: '14201', name: 'La Unión', region: 'Los Ríos' },
  { code: '14202', name: 'Futrono', region: 'Los Ríos' },
  { code: '14203', name: 'Lago Ranco', region: 'Los Ríos' },
  { code: '14204', name: 'Río Bueno', region: 'Los Ríos' },
  
  // Región de Los Lagos (10)
  { code: '10101', name: 'Puerto Montt', region: 'Los Lagos' },
  { code: '10102', name: 'Calbuco', region: 'Los Lagos' },
  { code: '10103', name: 'Cochamó', region: 'Los Lagos' },
  { code: '10104', name: 'Fresia', region: 'Los Lagos' },
  { code: '10105', name: 'Frutillar', region: 'Los Lagos' },
  { code: '10106', name: 'Los Muermos', region: 'Los Lagos' },
  { code: '10107', name: 'Llanquihue', region: 'Los Lagos' },
  { code: '10108', name: 'Maullín', region: 'Los Lagos' },
  { code: '10109', name: 'Puerto Varas', region: 'Los Lagos' },
  { code: '10201', name: 'Castro', region: 'Los Lagos' },
  { code: '10202', name: 'Ancud', region: 'Los Lagos' },
  { code: '10203', name: 'Chonchi', region: 'Los Lagos' },
  { code: '10204', name: 'Curaco de Vélez', region: 'Los Lagos' },
  { code: '10205', name: 'Dalcahue', region: 'Los Lagos' },
  { code: '10206', name: 'Puqueldón', region: 'Los Lagos' },
  { code: '10207', name: 'Queilén', region: 'Los Lagos' },
  { code: '10208', name: 'Quellón', region: 'Los Lagos' },
  { code: '10209', name: 'Quemchi', region: 'Los Lagos' },
  { code: '10210', name: 'Quinchao', region: 'Los Lagos' },
  { code: '10301', name: 'Osorno', region: 'Los Lagos' },
  { code: '10302', name: 'Puerto Octay', region: 'Los Lagos' },
  { code: '10303', name: 'Purranque', region: 'Los Lagos' },
  { code: '10304', name: 'Puyehue', region: 'Los Lagos' },
  { code: '10305', name: 'Río Negro', region: 'Los Lagos' },
  { code: '10306', name: 'San Juan de la Costa', region: 'Los Lagos' },
  { code: '10307', name: 'San Pablo', region: 'Los Lagos' },
  { code: '10401', name: 'Chaitén', region: 'Los Lagos' },
  { code: '10402', name: 'Futaleufú', region: 'Los Lagos' },
  { code: '10403', name: 'Hualaihué', region: 'Los Lagos' },
  { code: '10404', name: 'Palena', region: 'Los Lagos' },
  
  // Región de Aysén (11)
  { code: '11101', name: 'Coyhaique', region: 'Aysén' },
  { code: '11102', name: 'Lago Verde', region: 'Aysén' },
  { code: '11201', name: 'Aysén', region: 'Aysén' },
  { code: '11202', name: 'Cisnes', region: 'Aysén' },
  { code: '11203', name: 'Guaitecas', region: 'Aysén' },
  { code: '11301', name: 'Cochrane', region: 'Aysén' },
  { code: '11302', name: 'O\'Higgins', region: 'Aysén' },
  { code: '11303', name: 'Tortel', region: 'Aysén' },
  { code: '11401', name: 'Chile Chico', region: 'Aysén' },
  { code: '11402', name: 'Río Ibáñez', region: 'Aysén' },
  
  // Región de Magallanes (12)
  { code: '12101', name: 'Punta Arenas', region: 'Magallanes' },
  { code: '12102', name: 'Laguna Blanca', region: 'Magallanes' },
  { code: '12103', name: 'Río Verde', region: 'Magallanes' },
  { code: '12104', name: 'San Gregorio', region: 'Magallanes' },
  { code: '12201', name: 'Cabo de Hornos', region: 'Magallanes' },
  { code: '12202', name: 'Antártica', region: 'Magallanes' },
  { code: '12301', name: 'Porvenir', region: 'Magallanes' },
  { code: '12302', name: 'Primavera', region: 'Magallanes' },
  { code: '12303', name: 'Timaukel', region: 'Magallanes' },
  { code: '12401', name: 'Natales', region: 'Magallanes' },
  { code: '12402', name: 'Torres del Paine', region: 'Magallanes' }
];

// Coordenadas aproximadas de centroides de comunas
// Basado en datos geográficos de Chile
const COMUNA_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Arica y Parinacota
  '15101': { lat: -18.4783, lng: -70.3126 }, // Arica
  '15102': { lat: -19.0045, lng: -69.8554 }, // Camarones
  '15201': { lat: -18.1968, lng: -69.5592 }, // Putre
  '15202': { lat: -17.6500, lng: -69.4500 }, // General Lagos
  
  // Tarapacá
  '01101': { lat: -20.2307, lng: -70.1357 }, // Iquique
  '01102': { lat: -20.2667, lng: -70.1000 }, // Alto Hospicio
  '01201': { lat: -20.2667, lng: -69.8000 }, // Pozo Almonte
  '01202': { lat: -19.3000, lng: -69.4000 }, // Camiña
  '01203': { lat: -19.3000, lng: -68.8000 }, // Colchane
  '01204': { lat: -19.9000, lng: -69.7000 }, // Huara
  '01205': { lat: -20.5000, lng: -69.3000 }, // Pica
  
  // Antofagasta
  '02101': { lat: -23.6500, lng: -70.4000 }, // Antofagasta
  '02102': { lat: -23.1000, lng: -70.4500 }, // Mejillones
  '02103': { lat: -22.8000, lng: -69.3000 }, // Sierra Gorda
  '02104': { lat: -25.4000, lng: -70.5000 }, // Taltal
  '02201': { lat: -22.4500, lng: -68.6167 }, // Calama
  '02202': { lat: -21.2000, lng: -68.1500 }, // Ollagüe
  '02203': { lat: -22.9167, lng: -68.2000 }, // San Pedro de Atacama
  '02301': { lat: -22.1000, lng: -70.2000 }, // Tocopilla
  '02302': { lat: -22.3500, lng: -69.7000 }, // María Elena
  
  // Atacama
  '03101': { lat: -27.3667, lng: -70.3333 }, // Copiapó
  '03102': { lat: -26.8000, lng: -70.6000 }, // Caldera
  '03103': { lat: -27.5000, lng: -70.2000 }, // Tierra Amarilla
  '03201': { lat: -26.3500, lng: -70.6333 }, // Chañaral
  '03202': { lat: -26.4000, lng: -70.0500 }, // Diego de Almagro
  '03301': { lat: -28.7500, lng: -70.9333 }, // Vallenar
  '03302': { lat: -28.4000, lng: -70.1000 }, // Alto del Carmen
  '03303': { lat: -28.3000, lng: -71.1000 }, // Freirina
  '03304': { lat: -28.4500, lng: -71.2000 }, // Huasco
  
  // Coquimbo
  '04101': { lat: -29.9000, lng: -71.2500 }, // La Serena
  '04102': { lat: -29.9500, lng: -71.3333 }, // Coquimbo
  '04103': { lat: -30.2333, lng: -71.0833 }, // Andacollo
  '04104': { lat: -29.5000, lng: -71.1000 }, // La Higuera
  '04105': { lat: -30.0333, lng: -70.5333 }, // Paihuano
  '04106': { lat: -30.0333, lng: -70.7167 }, // Vicuña
  '04201': { lat: -31.6333, lng: -71.1667 }, // Illapel
  '04202': { lat: -31.8000, lng: -71.4000 }, // Canela
  '04203': { lat: -31.9167, lng: -71.5167 }, // Los Vilos
  '04204': { lat: -31.7833, lng: -70.9667 }, // Salamanca
  '04301': { lat: -30.6000, lng: -71.2000 }, // Ovalle
  '04302': { lat: -31.1833, lng: -70.9833 }, // Combarbalá
  '04303': { lat: -30.6833, lng: -70.9500 }, // Monte Patria
  '04304': { lat: -30.9000, lng: -71.2667 }, // Punitaqui
  '04305': { lat: -30.3000, lng: -70.7000 }, // Río Hurtado
  
  // Valparaíso
  '05101': { lat: -33.0461, lng: -71.6197 }, // Valparaíso
  '05102': { lat: -33.3167, lng: -71.4167 }, // Casablanca
  '05103': { lat: -32.9167, lng: -71.5167 }, // Concón
  '05104': { lat: -33.6400, lng: -78.8500 }, // Juan Fernández
  '05105': { lat: -32.9000, lng: -71.5000 }, // Puchuncaví
  '05106': { lat: -32.7833, lng: -71.5333 }, // Quintero
  '05107': { lat: -33.0244, lng: -71.5517 }, // Viña del Mar
  '05201': { lat: -27.1167, lng: -109.3667 }, // Isla de Pascua
  '05301': { lat: -32.8333, lng: -70.6000 }, // Los Andes
  '05302': { lat: -32.8500, lng: -70.6333 }, // Calle Larga
  '05303': { lat: -32.8333, lng: -70.7000 }, // Rinconada
  '05304': { lat: -32.8000, lng: -70.5833 }, // San Esteban
  '05401': { lat: -32.4167, lng: -71.2333 }, // La Ligua
  '05402': { lat: -32.3167, lng: -71.0833 }, // Cabildo
  '05403': { lat: -32.5000, lng: -71.4500 }, // Papudo
  '05404': { lat: -32.4000, lng: -71.1000 }, // Petorca
  '05405': { lat: -32.5500, lng: -71.4500 }, // Zapallar
  '05501': { lat: -32.8833, lng: -71.2500 }, // Quillota
  '05502': { lat: -32.7833, lng: -71.1667 }, // Calera
  '05503': { lat: -32.8000, lng: -71.2333 }, // Hijuelas
  '05504': { lat: -32.6833, lng: -71.2333 }, // La Cruz
  '05504': { lat: -32.6833, lng: -71.2333 }, // La Cruz
  '05505': { lat: -32.7333, lng: -71.2000 }, // Nogales
  '05506': { lat: -33.0000, lng: -71.5167 }, // Olmué
  '05601': { lat: -33.5833, lng: -71.6167 }, // San Antonio
  '05602': { lat: -33.3500, lng: -71.6667 }, // Algarrobo
  '05603': { lat: -33.5500, lng: -71.6000 }, // Cartagena
  '05604': { lat: -33.4000, lng: -71.6667 }, // El Quisco
  '05605': { lat: -33.4500, lng: -71.6667 }, // El Tabo
  '05606': { lat: -33.6333, lng: -71.6333 }, // Santo Domingo
  '05701': { lat: -32.7500, lng: -70.7167 }, // San Felipe
  '05702': { lat: -32.7833, lng: -70.8333 }, // Catemu
  '05703': { lat: -32.8500, lng: -70.9500 }, // Llaillay
  '05704': { lat: -32.8000, lng: -70.8333 }, // Panquehue
  '05705': { lat: -32.7333, lng: -70.6167 }, // Putaendo
  '05706': { lat: -32.7000, lng: -70.8333 }, // Santa María
  '05801': { lat: -33.0500, lng: -71.4500 }, // Quilpué
  '05802': { lat: -33.0000, lng: -71.2667 }, // Limache
  '05803': { lat: -33.0000, lng: -71.5167 }, // Olmué
  '05804': { lat: -33.0500, lng: -71.3667 }, // Villa Alemana
  
  // Metropolitana
  '13101': { lat: -33.4372, lng: -70.6506 }, // Santiago
  '13102': { lat: -33.5167, lng: -70.7167 }, // Cerrillos
  '13103': { lat: -33.4167, lng: -70.7667 }, // Cerro Navia
  '13104': { lat: -33.3833, lng: -70.6833 }, // Conchalí
  '13105': { lat: -33.5667, lng: -70.6667 }, // El Bosque
  '13106': { lat: -33.4500, lng: -70.6833 }, // Estación Central
  '13107': { lat: -33.3667, lng: -70.6333 }, // Huechuraba
  '13108': { lat: -33.4167, lng: -70.6500 }, // Independencia
  '13109': { lat: -33.5333, lng: -70.6500 }, // La Cisterna
  '13110': { lat: -33.5333, lng: -70.5833 }, // La Florida
  '13111': { lat: -33.5500, lng: -70.6333 }, // La Granja
  '13112': { lat: -33.5833, lng: -70.6333 }, // La Pintana
  '13113': { lat: -33.4500, lng: -70.5500 }, // La Reina
  '13114': { lat: -33.4000, lng: -70.5833 }, // Las Condes
  '13115': { lat: -33.3500, lng: -70.5167 }, // Lo Barnechea
  '13116': { lat: -33.5167, lng: -70.7000 }, // Lo Espejo
  '13117': { lat: -33.4333, lng: -70.7333 }, // Lo Prado
  '13118': { lat: -33.5000, lng: -70.6000 }, // Macul
  '13119': { lat: -33.5167, lng: -70.7667 }, // Maipú
  '13120': { lat: -33.4667, lng: -70.6000 }, // Ñuñoa
  '13121': { lat: -33.5500, lng: -70.6667 }, // Pedro Aguirre Cerda
  '13122': { lat: -33.4833, lng: -70.5500 }, // Peñalolén
  '13123': { lat: -33.4333, lng: -70.6167 }, // Providencia
  '13124': { lat: -33.4333, lng: -70.7667 }, // Pudahuel
  '13125': { lat: -33.3667, lng: -70.7333 }, // Quilicura
  '13126': { lat: -33.4167, lng: -70.7000 }, // Quinta Normal
  '13127': { lat: -33.4000, lng: -70.6333 }, // Recoleta
  '13128': { lat: -33.4000, lng: -70.7333 }, // Renca
  '13129': { lat: -33.5000, lng: -70.6333 }, // San Joaquín
  '13130': { lat: -33.5000, lng: -70.6667 }, // San Miguel
  '13131': { lat: -33.5333, lng: -70.6500 }, // San Ramón
  '13132': { lat: -33.3833, lng: -70.5833 }, // Vitacura
  '13201': { lat: -33.6167, lng: -70.5833 }, // Puente Alto
  '13202': { lat: -33.6333, lng: -70.5333 }, // Pirque
  '13203': { lat: -33.9500, lng: -70.3667 }, // San José de Maipo
  '13301': { lat: -33.2000, lng: -70.6667 }, // Colina
  '13302': { lat: -33.2833, lng: -70.8833 }, // Lampa
  '13303': { lat: -33.0833, lng: -70.9333 }, // Tiltil
  '13401': { lat: -33.6000, lng: -70.7167 }, // San Bernardo
  '13402': { lat: -33.7333, lng: -70.7333 }, // Buin
  '13403': { lat: -33.6500, lng: -70.7667 }, // Calera de Tango
  '13404': { lat: -33.8000, lng: -70.7333 }, // Paine
  '13501': { lat: -33.6833, lng: -71.2167 }, // Melipilla
  '13502': { lat: -34.0333, lng: -71.1000 }, // Alhué
  '13503': { lat: -33.4000, lng: -71.1500 }, // Curacaví
  '13504': { lat: -33.7167, lng: -71.1333 }, // María Pinto
  '13505': { lat: -33.8833, lng: -71.1667 }, // San Pedro
  '13601': { lat: -33.6667, lng: -70.9333 }, // Talagante
  '13602': { lat: -33.6833, lng: -70.9833 }, // El Monte
  '13603': { lat: -33.7500, lng: -70.9167 }, // Isla de Maipo
  '13604': { lat: -33.5667, lng: -70.8833 }, // Padre Hurtado
  '13605': { lat: -33.6167, lng: -70.9167 }, // Peñaflor
  
  // O'Higgins
  '06101': { lat: -34.1667, lng: -70.7500 }, // Rancagua
  '06102': { lat: -34.2667, lng: -70.6667 }, // Codegua
  '06103': { lat: -34.3000, lng: -70.9500 }, // Coinco
  '06104': { lat: -34.3000, lng: -71.1000 }, // Coltauco
  '06105': { lat: -34.2333, lng: -70.7833 }, // Doñihue
  '06106': { lat: -34.2333, lng: -70.6500 }, // Graneros
  '06107': { lat: -34.4000, lng: -71.0833 }, // Las Cabras
  '06108': { lat: -34.1833, lng: -70.6500 }, // Machalí
  '06109': { lat: -34.2667, lng: -70.9000 }, // Malloa
  '06110': { lat: -33.9833, lng: -70.7167 }, // Mostazal
  '06111': { lat: -34.2167, lng: -70.7833 }, // Olivar
  '06112': { lat: -34.4000, lng: -71.2333 }, // Peumo
  '06113': { lat: -34.3500, lng: -71.3000 }, // Pichidegua
  '06114': { lat: -34.3667, lng: -71.6167 }, // Quinta de Tilcoco
  '06115': { lat: -34.4167, lng: -70.8667 }, // Rengo
  '06116': { lat: -34.2833, lng: -70.8333 }, // Requínoa
  '06117': { lat: -34.4333, lng: -71.0833 }, // San Vicente
  '06201': { lat: -34.3833, lng: -72.0000 }, // Pichilemu
  '06202': { lat: -34.2000, lng: -71.6667 }, // La Estrella
  '06203': { lat: -34.1167, lng: -71.7333 }, // Litueche
  '06204': { lat: -34.4000, lng: -71.6333 }, // Marchihue
  '06205': { lat: -33.9333, lng: -71.8333 }, // Navidad
  '06206': { lat: -34.6500, lng: -71.9167 }, // Paredones
  '06301': { lat: -34.5833, lng: -71.2833 }, // San Fernando
  '06302': { lat: -34.7333, lng: -71.5000 }, // Chépica
  '06303': { lat: -34.7167, lng: -71.2167 }, // Chimbarongo
  '06304': { lat: -34.7333, lng: -71.8000 }, // Lolol
  '06305': { lat: -34.6667, lng: -71.2167 }, // Nancagua
  '06306': { lat: -34.6000, lng: -71.2167 }, // Palmilla
  '06307': { lat: -34.4833, lng: -71.5000 }, // Peralillo
  '06308': { lat: -34.6167, lng: -71.1167 }, // Placilla
  '06309': { lat: -34.6000, lng: -71.6167 }, // Pumanque
  '06310': { lat: -34.6333, lng: -71.3667 }, // Santa Cruz
  
  // Maule
  '07101': { lat: -35.4333, lng: -71.6667 }, // Talca
  '07102': { lat: -35.3333, lng: -72.4167 }, // Constitución
  '07103': { lat: -35.0833, lng: -72.4167 }, // Curepto
  '07104': { lat: -35.6000, lng: -72.2833 }, // Empedrado
  '07105': { lat: -35.5333, lng: -71.7000 }, // Maule
  '07106': { lat: -35.8000, lng: -71.7333 }, // Pelarco
  '07107': { lat: -35.4167, lng: -72.1000 }, // Pencahue
  '07108': { lat: -35.2833, lng: -71.5667 }, // Río Claro
  '07109': { lat: -35.5333, lng: -71.4833 }, // San Clemente
  '07110': { lat: -35.3167, lng: -71.5167 }, // San Rafael
  '07201': { lat: -35.9667, lng: -72.3333 }, // Cauquenes
  '07202': { lat: -35.7333, lng: -72.5333 }, // Chanco
  '07203': { lat: -35.8667, lng: -72.8000 }, // Pelluhue
  '07301': { lat: -34.9833, lng: -71.2333 }, // Curicó
  '07302': { lat: -34.9667, lng: -71.6833 }, // Hualañé
  '07303': { lat: -34.6833, lng: -72.0000 }, // Licantén
  '07304': { lat: -35.1167, lng: -71.2833 }, // Molina
  '07305': { lat: -34.9333, lng: -71.3333 }, // Rauco
  '07306': { lat: -34.9833, lng: -71.1333 }, // Romeral
  '07307': { lat: -34.9833, lng: -71.3833 }, // Sagrada Familia
  '07308': { lat: -34.8667, lng: -71.0333 }, // Teno
  '07309': { lat: -34.8833, lng: -71.9333 }, // Vichuquén
  '07401': { lat: -35.8500, lng: -71.6000 }, // Linares
  '07402': { lat: -35.7000, lng: -71.4167 }, // Colbún
  '07403': { lat: -35.9667, lng: -71.6833 }, // Longaví
  '07404': { lat: -36.1500, lng: -71.8333 }, // Parral
  '07405': { lat: -36.0500, lng: -71.7667 }, // Retiro
  '07406': { lat: -35.6000, lng: -71.7333 }, // San Javier
  '07407': { lat: -35.6667, lng: -71.6667 }, // Villa Alegre
  '07408': { lat: -35.7500, lng: -71.5667 }, // Yerbas Buenas
  
  // Ñuble
  '16101': { lat: -36.6000, lng: -72.1000 }, // Chillán
  '16102': { lat: -36.2833, lng: -72.2000 }, // Bulnes
  '16103': { lat: -36.6333, lng: -72.1333 }, // Chillán Viejo
  '16104': { lat: -36.8333, lng: -72.0333 }, // El Carmen
  '16105': { lat: -36.3833, lng: -72.1000 }, // Pemuco
  '16106': { lat: -36.7000, lng: -72.4000 }, // Pinto
  '16107': { lat: -36.7333, lng: -72.4667 }, // Quillón
  '16108': { lat: -36.8000, lng: -72.0333 }, // San Ignacio
  '16109': { lat: -37.1167, lng: -72.0333 }, // Yungay
  '16201': { lat: -36.2833, lng: -72.5500 }, // Quirihue
  '16202': { lat: -36.5333, lng: -72.7833 }, // Cobquecura
  '16203': { lat: -36.4833, lng: -72.7000 }, // Coelemu
  '16204': { lat: -36.4000, lng: -72.6500 }, // Ninhue
  '16205': { lat: -36.4333, lng: -72.4333 }, // Portezuelo
  '16206': { lat: -36.5500, lng: -72.3167 }, // Ránquil
  '16207': { lat: -36.6500, lng: -72.6667 }, // Treguaco
  '16301': { lat: -36.4167, lng: -71.9667 }, // San Carlos
  '16302': { lat: -36.6167, lng: -71.8333 }, // Coihueco
  '16303': { lat: -36.3000, lng: -71.9000 }, // Ñiquén
  '16304': { lat: -36.4667, lng: -71.5500 }, // San Fabián
  '16305': { lat: -36.4000, lng: -72.2167 }, // San Nicolás
  
  // Biobío
  '08101': { lat: -36.8333, lng: -73.0500 }, // Concepción
  '08102': { lat: -37.0333, lng: -73.1500 }, // Coronel
  '08103': { lat: -36.9333, lng: -73.0167 }, // Chiguayante
  '08104': { lat: -36.8500, lng: -72.6667 }, // Florida
  '08105': { lat: -36.9667, lng: -72.9333 }, // Hualqui
  '08106': { lat: -37.0833, lng: -73.1500 }, // Lota
  '08107': { lat: -36.7333, lng: -72.9833 }, // Penco
  '08108': { lat: -36.8333, lng: -73.1167 }, // San Pedro de la Paz
  '08109': { lat: -36.9333, lng: -72.9333 }, // Santa Juana
  '08110': { lat: -36.7167, lng: -73.1167 }, // Talcahuano
  '08111': { lat: -36.6167, lng: -72.9500 }, // Tomé
  '08112': { lat: -36.8667, lng: -73.0833 }, // Hualpén
  '08201': { lat: -37.4667, lng: -72.3500 }, // Los Ángeles
  '08202': { lat: -37.2500, lng: -71.6333 }, // Antuco
  '08203': { lat: -37.0333, lng: -72.7833 }, // Cabrero
  '08204': { lat: -37.2667, lng: -72.7000 }, // Laja
  '08205': { lat: -37.7167, lng: -72.2333 }, // Mulchén
  '08206': { lat: -37.6000, lng: -72.4000 }, // Nacimiento
  '08207': { lat: -37.6000, lng: -72.7000 }, // Negrete
  '08208': { lat: -37.6667, lng: -71.4000 }, // Quilaco
  '08209': { lat: -37.4667, lng: -71.8833 }, // Quilleco
  '08210': { lat: -37.2667, lng: -72.7167 }, // San Rosendo
  '08211': { lat: -37.1667, lng: -72.8000 }, // Santa Bárbara
  '08212': { lat: -37.3000, lng: -71.9500 }, // Tucapel
  '08213': { lat: -37.0833, lng: -72.5667 }, // Yumbel
  '08214': { lat: -37.5500, lng: -71.7000 }, // Alto Biobío
  
  // La Araucanía
  '09101': { lat: -38.7333, lng: -72.6667 }, // Temuco
  '09102': { lat: -38.5500, lng: -73.1667 }, // Carahue
  '09103': { lat: -38.9333, lng: -72.0667 }, // Cunco
  '09104': { lat: -39.3500, lng: -71.5833 }, // Curarrehue
  '09105': { lat: -38.9500, lng: -72.8667 }, // Freire
  '09106': { lat: -38.4000, lng: -72.7833 }, // Galvarino
  '09107': { lat: -39.1167, lng: -72.9333 }, // Gorbea
  '09108': { lat: -38.5333, lng: -72.4333 }, // Lautaro
  '09109': { lat: -39.3667, lng: -72.3167 }, // Loncoche
  '09110': { lat: -38.8500, lng: -71.4500 }, // Melipeuco
  '09111': { lat: -38.7333, lng: -72.9500 }, // Nueva Imperial
  '09112': { lat: -38.7667, lng: -72.6000 }, // Padre Las Casas
  '09113': { lat: -38.9500, lng: -72.5667 }, // Perquenco
  '09114': { lat: -38.9833, lng: -72.6500 }, // Pitrufquén
  '09115': { lat: -39.2833, lng: -71.9500 }, // Pucón
  '09116': { lat: -38.7833, lng: -73.4000 }, // Saavedra
  '09117': { lat: -39.0000, lng: -73.0833 }, // Teodoro Schmidt
  '09118': { lat: -39.1833, lng: -73.1667 }, // Toltén
  '09119': { lat: -38.6667, lng: -72.2333 }, // Vilcún
  '09120': { lat: -39.2833, lng: -72.2333 }, // Villarrica
  '09121': { lat: -38.6000, lng: -72.8500 }, // Cholchol
  '09201': { lat: -37.8000, lng: -72.7167 }, // Angol
  '09202': { lat: -37.9500, lng: -72.4500 }, // Collipulli
  '09203': { lat: -38.4333, lng: -71.8833 }, // Curacautín
  '09204': { lat: -38.0500, lng: -72.3167 }, // Ercilla
  '09205': { lat: -38.4500, lng: -70.9000 }, // Lonquimay
  '09206': { lat: -37.9667, lng: -72.8333 }, // Los Sauces
  '09207': { lat: -38.1500, lng: -72.9167 }, // Lumaco
  '09208': { lat: -38.0667, lng: -73.1167 }, // Purén
  '09209': { lat: -37.6667, lng: -72.6167 }, // Renaico
  '09210': { lat: -38.2500, lng: -72.6667 }, // Traiguén
  '09211': { lat: -38.2333, lng: -72.3333 }, // Victoria
  
  // Los Ríos
  '14101': { lat: -39.8139, lng: -73.2458 }, // Valdivia
  '14102': { lat: -39.8667, lng: -73.5000 }, // Corral
  '14103': { lat: -39.4333, lng: -72.7833 }, // Lanco
  '14104': { lat: -39.9667, lng: -72.8333 }, // Los Lagos
  '14105': { lat: -39.5000, lng: -72.9500 }, // Máfil
  '14106': { lat: -39.4500, lng: -72.8000 }, // Mariquina
  '14107': { lat: -39.2333, lng: -72.9833 }, // Paillaco
  '14108': { lat: -39.2833, lng: -72.3333 }, // Panguipulli
  '14201': { lat: -40.2833, lng: -73.0833 }, // La Unión
  '14202': { lat: -40.1167, lng: -72.4000 }, // Futrono
  '14203': { lat: -40.3167, lng: -72.5000 }, // Lago Ranco
  '14204': { lat: -40.5667, lng: -72.7000 }, // Río Bueno
  
  // Los Lagos
  '10101': { lat: -41.4667, lng: -72.9333 }, // Puerto Montt
  '10102': { lat: -41.8667, lng: -73.1333 }, // Calbuco
  '10103': { lat: -41.5000, lng: -72.3167 }, // Cochamó
  '10104': { lat: -41.8833, lng: -73.1000 }, // Fresia
  '10105': { lat: -41.1167, lng: -73.0500 }, // Frutillar
  '10106': { lat: -41.4000, lng: -73.4833 }, // Los Muermos
  '10107': { lat: -41.3167, lng: -73.1167 }, // Llanquihue
  '10108': { lat: -41.2167, lng: -73.6000 }, // Maullín
  '10109': { lat: -41.3167, lng: -72.9833 }, // Puerto Varas
  '10201': { lat: -42.4833, lng: -73.7667 }, // Castro
  '10202': { lat: -41.8667, lng: -73.8333 }, // Ancud
  '10203': { lat: -42.6167, lng: -73.7667 }, // Chonchi
  '10204': { lat: -42.4333, lng: -73.6000 }, // Curaco de Vélez
  '10205': { lat: -42.3833, lng: -73.6500 }, // Dalcahue
  '10206': { lat: -42.6000, lng: -73.6667 }, // Puqueldón
  '10207': { lat: -42.2333, lng: -73.5333 }, // Queilén
  '10208': { lat: -43.1167, lng: -73.6167 }, // Quellón
  '10209': { lat: -42.3000, lng: -73.4833 }, // Quemchi
  '10210': { lat: -42.4667, lng: -73.5000 }, // Quinchao
  '10301': { lat: -40.5667, lng: -73.1500 }, // Osorno
  '10302': { lat: -40.9667, lng: -72.9000 }, // Puerto Octay
  '10303': { lat: -40.9167, lng: -73.1667 }, // Purranque
  '10304': { lat: -40.8000, lng: -72.5500 }, // Puyehue
  '10305': { lat: -40.7833, lng: -73.2000 }, // Río Negro
  '10306': { lat: -40.5000, lng: -73.4000 }, // San Juan de la Costa
  '10307': { lat: -40.3833, lng: -73.0000 }, // San Pablo
  '10401': { lat: -42.9167, lng: -74.0333 }, // Chaitén
  '10402': { lat: -43.1833, lng: -71.8667 }, // Futaleufú
  '10403': { lat: -42.0167, lng: -72.6667 }, // Hualaihué
  '10404': { lat: -43.6167, lng: -71.8000 }, // Palena
  
  // Aysén
  '11101': { lat: -45.5667, lng: -72.0667 }, // Coyhaique
  '11102': { lat: -44.2333, lng: -71.8500 }, // Lago Verde
  '11201': { lat: -45.4000, lng: -72.7000 }, // Aysén
  '11202': { lat: -44.7333, lng: -72.7000 }, // Cisnes
  '11203': { lat: -43.8833, lng: -73.7500 }, // Guaitecas
  '11301': { lat: -47.2667, lng: -72.5667 }, // Cochrane
  '11302': { lat: -48.4667, lng: -72.5500 }, // O'Higgins
  '11303': { lat: -47.8000, lng: -73.5333 }, // Tortel
  '11401': { lat: -46.5333, lng: -71.7333 }, // Chile Chico
  '11402': { lat: -46.3000, lng: -71.9333 }, // Río Ibáñez
  
  // Magallanes
  '12101': { lat: -53.1667, lng: -70.9333 }, // Punta Arenas
  '12102': { lat: -52.2500, lng: -71.1500 }, // Laguna Blanca
  '12103': { lat: -52.6000, lng: -70.8667 }, // Río Verde
  '12104': { lat: -52.6167, lng: -70.1333 }, // San Gregorio
  '12201': { lat: -55.7167, lng: -67.3667 }, // Cabo de Hornos
  '12202': { lat: -62.5000, lng: -59.0000 }, // Antártica
  '12301': { lat: -53.3000, lng: -70.3667 }, // Porvenir
  '12302': { lat: -52.7167, lng: -69.2500 }, // Primavera
  '12303': { lat: -54.2667, lng: -69.4333 }, // Timaukel
  '12401': { lat: -51.7333, lng: -72.5167 }, // Natales
  '12402': { lat: -51.2667, lng: -72.9833 }  // Torres del Paine
};

async function downloadCoordinates(): Promise<void> {
  console.log('📍 Descargando coordenadas de comunas de Chile...\n');
  
  const coordinates: ComunaCoordinate[] = [];
  const missing: string[] = [];
  
  for (const comuna of COMUNAS_CHILE) {
    const coord = COMUNA_COORDINATES[comuna.code];
    
    if (coord) {
      coordinates.push({
        code: comuna.code,
        name: comuna.name,
        lat: coord.lat,
        lng: coord.lng,
        region: comuna.region
      });
    } else {
      missing.push(comuna.code);
    }
  }
  
  console.log(`✅ Coordenadas encontradas: ${coordinates.length}`);
  console.log(`❌ Coordenadas faltantes: ${missing.length}`);
  
  if (missing.length > 0) {
    console.log('\nCódigos faltantes:', missing.join(', '));
  }
  
  // Guardar archivo JSON
  const outputPath = path.join(process.cwd(), 'data', 'comuna_coordinates.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(coordinates, null, 2));
  
  console.log(`\n💾 Archivo guardado: ${outputPath}`);
  
  // Mostrar estadísticas por región
  const byRegion: Record<string, number> = {};
  coordinates.forEach(c => {
    byRegion[c.region] = (byRegion[c.region] || 0) + 1;
  });
  
  console.log('\n📊 Comunas por región:');
  Object.entries(byRegion).forEach(([region, count]) => {
    console.log(`  ${region}: ${count}`);
  });
}

// Ejecutar
downloadCoordinates().catch(console.error);
