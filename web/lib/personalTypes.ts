// web/lib/personalTypes.ts
// Tipos para el módulo Talento Humano — Res. 3100/2019 Estándar 1

export type TipoPersonal =
  | 'Médico general'
  | 'Médico especialista'
  | 'Enfermero(a)'
  | 'Auxiliar de enfermería'
  | 'Odontólogo(a)'
  | 'Bacteriólogo(a)'
  | 'Fisioterapeuta'
  | 'Nutricionista'
  | 'Psicólogo(a)'
  | 'Regente de farmacia'
  | 'Auxiliar administrativo'
  | 'Gerente / Director'
  | 'Otro';

export type VinculacionTipo =
  | 'Planta'
  | 'Contrato'
  | 'Prestación de servicios'
  | 'Cooperativa';

export interface PersonalDocs {
  hojaVida:        boolean;   // Hoja de vida con soportes
  tarjetaProfesional: boolean; // Tarjeta profesional / diploma
  rethusVerificado:   boolean; // Verificado en RETHUS
  contrato:           boolean; // Contrato o vinculación
  carnetVacunacion:   boolean; // Carnet de vacunación (HepB, tétanos)
  examenIngreso:      boolean; // Examen médico de ingreso
  induccion:          boolean; // Inducción documentada
}

export interface PersonalItem {
  id:           string;
  uid:          string;
  nit:          string;
  nombre:       string;
  tipo:         TipoPersonal;
  vinculacion:  VinculacionTipo;
  tarjetaNum:   string;       // N° tarjeta profesional
  rethusNum:    string;       // N° RETHUS
  telefono:     string;
  email:        string;
  docs:         PersonalDocs;
  firmaUrl:     string;       // Data URL de la firma digital
  notas:        string;
  fechaIngreso: string;       // ISO date
  activo:       boolean;
  creadoEn:     string;       // ISO timestamp
}

export interface PersonalFormData {
  nombre:       string;
  tipo:         TipoPersonal;
  vinculacion:  VinculacionTipo;
  tarjetaNum:   string;
  rethusNum:    string;
  telefono:     string;
  email:        string;
  docs:         PersonalDocs;
  firmaUrl:     string;
  notas:        string;
  fechaIngreso: string;
  activo:       boolean;
}

// ── Capacitaciones ───────────────────────────────────────────────────────────

export interface CapacitacionSesion {
  id:          string;
  uid:         string;
  nit:         string;
  tema:        string;
  instructor:  string;
  fecha:       string;   // ISO date
  duracion:    string;   // ej: "2h"
  lugar:       string;
  asistentes:  AsistenteEntry[];
  acta:        string;   // texto libre del acta
  creadoEn:    string;
}

export interface AsistenteEntry {
  personalId:  string;
  nombre:      string;
  firmaUrl:    string;   // firma digital del asistente
  asistio:     boolean;
}

export type TemaCapacitacion =
  | 'Seguridad del paciente'
  | 'Bioseguridad'
  | 'Manejo de residuos'
  | 'RCP / BLS'
  | 'Habilitación y normativa'
  | 'PAMEC'
  | 'Humanización de la atención'
  | 'SG-SST'
  | 'Manejo de medicamentos'
  | 'Derechos del paciente'
  | 'Otro';

export const TEMAS_CAPACITACION: TemaCapacitacion[] = [
  'Seguridad del paciente',
  'Bioseguridad',
  'Manejo de residuos',
  'RCP / BLS',
  'Habilitación y normativa',
  'PAMEC',
  'Humanización de la atención',
  'SG-SST',
  'Manejo de medicamentos',
  'Derechos del paciente',
  'Otro',
];

export const TIPOS_PERSONAL: TipoPersonal[] = [
  'Médico general',
  'Médico especialista',
  'Enfermero(a)',
  'Auxiliar de enfermería',
  'Odontólogo(a)',
  'Bacteriólogo(a)',
  'Fisioterapeuta',
  'Nutricionista',
  'Psicólogo(a)',
  'Regente de farmacia',
  'Auxiliar administrativo',
  'Gerente / Director',
  'Otro',
];

export const VINCULACION_TIPOS: VinculacionTipo[] = [
  'Planta',
  'Contrato',
  'Prestación de servicios',
  'Cooperativa',
];

export const DOCS_LABELS: Record<keyof PersonalDocs, string> = {
  hojaVida:           'Hoja de vida con soportes',
  tarjetaProfesional: 'Tarjeta profesional / diploma',
  rethusVerificado:   'RETHUS verificado',
  contrato:           'Contrato o vinculación',
  carnetVacunacion:   'Carnet de vacunación',
  examenIngreso:      'Examen médico de ingreso',
  induccion:          'Inducción documentada',
};

export const EMPTY_DOCS: PersonalDocs = {
  hojaVida:           false,
  tarjetaProfesional: false,
  rethusVerificado:   false,
  contrato:           false,
  carnetVacunacion:   false,
  examenIngreso:      false,
  induccion:          false,
};

export function docCompliance(docs: PersonalDocs): number {
  const keys = Object.keys(docs) as (keyof PersonalDocs)[];
  const ok = keys.filter(k => docs[k]).length;
  return Math.round((ok / keys.length) * 100);
}
