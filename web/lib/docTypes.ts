/**
 * web/lib/docTypes.ts
 * Tipos y catálogo del módulo de Documentos Normativos
 * Base legal: Res. 3100/2019 · Decreto 351/2014 · Decreto 4725/2005
 */

// ── Configuración de IPS que usan las plantillas ──────────────────────────────
export interface IPSConfig {
  nombre:    string;   // Nombre o razón social de la IPS
  nit:       string;   // NIT del establecimiento
  director:  string;   // Director Técnico
  rm:        string;   // Registro médico / tarjeta profesional
  ciudad:    string;   // Ciudad / municipio
  esp:       string;   // Especialidad principal (para protocolo atención)
}

export const IPS_CONFIG_DEFAULTS: IPSConfig = {
  nombre:   'Establecimiento de Salud',
  nit:      '',
  director: 'Director Técnico',
  rm:       '',
  ciudad:   'Colombia',
  esp:      'Medicina General',
};

// ── IDs de documentos ─────────────────────────────────────────────────────────
export type DocId =
  | 'bioseguridad'
  | 'residuos'
  | 'atencion'
  | 'emergencias'
  | 'tecnovigilancia'
  | 'hoja-vida';

// ── Metadatos de cada documento ───────────────────────────────────────────────
export interface DocMeta {
  id:         DocId;
  title:      string;        // Título corto para la tarjeta
  fullTitle:  string;        // Título completo del documento generado
  norma:      string;        // Base normativa principal
  categoria:  DocCategoria;
  icon:       string;        // Emoji representativo
  descripcion: string;       // Una línea descriptiva para la tarjeta
  color:      string;        // Clase Tailwind para el acento de color
  borderColor: string;
}

export type DocCategoria =
  | 'Bioseguridad'
  | 'Residuos'
  | 'Atención al Paciente'
  | 'Emergencias'
  | 'Tecnología Biomédica';

// ── Catálogo de los 6 documentos ──────────────────────────────────────────────
export const DOC_CATALOGO: DocMeta[] = [
  {
    id:          'bioseguridad',
    title:       'Manual de Bioseguridad',
    fullTitle:   'MANUAL DE BIOSEGURIDAD',
    norma:       'Res. 3100/2019 Est. 5 · Decreto 351/2014',
    categoria:   'Bioseguridad',
    icon:        '🧤',
    descripcion: 'Precauciones universales, EPP, limpieza, residuos y accidente biológico.',
    color:       'text-teal-700',
    borderColor: 'border-teal-200',
  },
  {
    id:          'residuos',
    title:       'PGIRH',
    fullTitle:   'PLAN DE GESTIÓN INTEGRAL DE RESIDUOS HOSPITALARIOS Y SIMILARES',
    norma:       'Decreto 351/2014 · Res. 1164/2002',
    categoria:   'Residuos',
    icon:        '♻️',
    descripcion: 'Segregación, almacenamiento, rutas internas y gestión externa RESPEL.',
    color:       'text-emerald-700',
    borderColor: 'border-emerald-200',
  },
  {
    id:          'atencion',
    title:       'Protocolo de Atención',
    fullTitle:   'PROTOCOLO DE ATENCIÓN AL PACIENTE',
    norma:       'Res. 3100/2019 Est. 5 · Res. 13437/1991',
    categoria:   'Atención al Paciente',
    icon:        '🏥',
    descripcion: 'Flujograma de atención, derechos/deberes, consentimiento y PQRSF.',
    color:       'text-blue-700',
    borderColor: 'border-blue-200',
  },
  {
    id:          'emergencias',
    title:       'Plan de Emergencias',
    fullTitle:   'PLAN HOSPITALARIO DE EMERGENCIAS',
    norma:       'Res. 3100/2019 Est. 5 · Res. 0312/2019',
    categoria:   'Emergencias',
    icon:        '🚨',
    descripcion: 'Brigadas, evacuación, protocolos RACE/sismo e inventario de recursos.',
    color:       'text-red-700',
    borderColor: 'border-red-200',
  },
  {
    id:          'tecnovigilancia',
    title:       'Manual de Tecnovigilancia',
    fullTitle:   'MANUAL DE TECNOVIGILANCIA Y DISPOSITIVOS MÉDICOS',
    norma:       'Decreto 4725/2005 · Res. 3100/2019 Est. 3',
    categoria:   'Tecnología Biomédica',
    icon:        '🔬',
    descripcion: 'Inventario biomédico, mantenimiento preventivo y reportes INVIMA.',
    color:       'text-purple-700',
    borderColor: 'border-purple-200',
  },
  {
    id:          'hoja-vida',
    title:       'Hoja de Vida Equipo',
    fullTitle:   'PLANTILLA — HOJA DE VIDA DE EQUIPO BIOMÉDICO',
    norma:       'Decreto 4725/2005 · Res. 3100/2019 Est. 3',
    categoria:   'Tecnología Biomédica',
    icon:        '📋',
    descripcion: 'Plantilla individual por equipo: identificación, mantenimientos, fallas.',
    color:       'text-amber-700',
    borderColor: 'border-amber-200',
  },
];

// Helper
export function getDocMeta(id: DocId): DocMeta | undefined {
  return DOC_CATALOGO.find(d => d.id === id);
}
