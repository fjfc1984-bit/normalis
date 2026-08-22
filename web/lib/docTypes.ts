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
  | 'hoja-vida'
  | 'medicamentos'
  | 'historia-clinica'
  | 'seguridad-paciente'
  | 'formacion-continua'
  | 'gestion-ambiental'
  | 'referencia-contrarreferencia';

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
  | 'Tecnología Biomédica'
  | 'Medicamentos y Dispositivos'
  | 'Historia Clínica'
  | 'Seguridad del Paciente'
  | 'Talento Humano'
  | 'Gestión Ambiental'
  | 'Interdependencia';

// ── Catálogo de documentos ─────────────────────────────────────────────────────
export const DOC_CATALOGO: DocMeta[] = [
  {
    id:          'bioseguridad',
    title:       'Manual de Bioseguridad',
    fullTitle:   'MANUAL DE BIOSEGURIDAD',
    norma:       'Res. 1732/2026 Est. 5 · Decreto 351/2014',
    categoria:   'Bioseguridad',
    icon:        '🧤',
    descripcion: 'Precauciones universales, EPP, limpieza, residuos y accidente biológico.',
    color:       'text-teal-700',
    borderColor: 'border-teal-200',
  },
  {
    id:          'residuos',
    title:       'PGIRASA',
    fullTitle:   'PLAN DE GESTIÓN INTEGRAL DE RESIDUOS GENERADOS EN LA ATENCIÓN EN SALUD Y OTRAS ACTIVIDADES (PGIRASA)',
    norma:       'Res. 591/2024 (Manual PGIRASA) · Decreto 351/2014',
    categoria:   'Residuos',
    icon:        '♻️',
    descripcion: 'Segregación, almacenamiento, rutas internas y gestión externa RESPEL — antes "PGIRH".',
    color:       'text-emerald-700',
    borderColor: 'border-emerald-200',
  },
  {
    id:          'atencion',
    title:       'Protocolo de Atención',
    fullTitle:   'PROTOCOLO DE ATENCIÓN AL PACIENTE',
    norma:       'Res. 1732/2026 Est. 5 · Res. 13437/1991',
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
    norma:       'Res. 1732/2026 Est. 5 · Res. 0312/2019',
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
    norma:       'Decreto 4725/2005 · Res. 1732/2026 Est. 3',
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
    norma:       'Decreto 4725/2005 · Res. 1732/2026 Est. 3',
    categoria:   'Tecnología Biomédica',
    icon:        '📋',
    descripcion: 'Plantilla individual por equipo: identificación, mantenimientos, fallas.',
    color:       'text-amber-700',
    borderColor: 'border-amber-200',
  },
  {
    id:          'medicamentos',
    title:       'Manual de Medicamentos y Dispositivos',
    fullTitle:   'MANUAL DE GESTIÓN DE MEDICAMENTOS, DISPOSITIVOS MÉDICOS E INSUMOS',
    norma:       'Res. 1732/2026 Est. Medicamentos · Decreto 780/2016 · Res. 1478/2006',
    categoria:   'Medicamentos y Dispositivos',
    icon:        '💊',
    descripcion: 'Ciclo del medicamento, control especial, cadena de frío y farmacovigilancia.',
    color:       'text-rose-700',
    borderColor: 'border-rose-200',
  },
  {
    id:          'historia-clinica',
    title:       'Reglamento de Historia Clínica',
    fullTitle:   'REGLAMENTO DE HISTORIA CLÍNICA Y REGISTROS ASISTENCIALES',
    norma:       'Res. 1732/2026 Est. Historia Clínica · Res. 1995/1999 · Res. 866/2021',
    categoria:   'Historia Clínica',
    icon:        '📁',
    descripcion: 'Unicidad, custodia, retención documental y seguridad de la HC.',
    color:       'text-indigo-700',
    borderColor: 'border-indigo-200',
  },
  {
    id:          'seguridad-paciente',
    title:       'Política de Seguridad del Paciente',
    fullTitle:   'POLÍTICA Y PROGRAMA DE SEGURIDAD DEL PACIENTE',
    norma:       'Res. 1732/2026 Est. Procesos Prioritarios Crit. 2 · Lineamientos MSPS',
    categoria:   'Seguridad del Paciente',
    icon:        '🛡️',
    descripcion: 'Prácticas seguras, gestión de eventos adversos e indicadores.',
    color:       'text-cyan-700',
    borderColor: 'border-cyan-200',
  },
  {
    id:          'formacion-continua',
    title:       'Plan de Formación Continua',
    fullTitle:   'PLAN INSTITUCIONAL DE ACCIONES DE FORMACIÓN CONTINUA',
    norma:       'Res. 1732/2026 Est. Talento Humano Crit. 4 · Ley 1164/2007',
    categoria:   'Talento Humano',
    icon:        '🎓',
    descripcion: 'Programación anual de capacitación del talento humano en salud.',
    color:       'text-orange-700',
    borderColor: 'border-orange-200',
  },
  {
    id:          'gestion-ambiental',
    title:       'Programa de Gestión Ambiental',
    fullTitle:   'PROGRAMA DE GESTIÓN AMBIENTAL Y ACCIÓN CLIMÁTICA (PIGCCS SALUD)',
    norma:       'Res. 1732/2026 Est. Procesos Prioritarios Crit. 30 · Ley 1931/2018',
    categoria:   'Gestión Ambiental',
    icon:        '🌱',
    descripcion: 'Uso eficiente de agua/energía, sustitución de mercurio y huella de carbono.',
    color:       'text-lime-700',
    borderColor: 'border-lime-200',
  },
  {
    id:          'referencia-contrarreferencia',
    title:       'Referencia y Contrarreferencia',
    fullTitle:   'MANUAL DE REFERENCIA Y CONTRARREFERENCIA',
    norma:       'Res. 1732/2026 Est. Interdependencia · Res. 3047/2008',
    categoria:   'Interdependencia',
    icon:        '🔄',
    descripcion: 'Red de prestadores, convenios y procedimiento de traslado de pacientes.',
    color:       'text-fuchsia-700',
    borderColor: 'border-fuchsia-200',
  },
];

// Helper
export function getDocMeta(id: DocId): DocMeta | undefined {
  return DOC_CATALOGO.find(d => d.id === id);
}
