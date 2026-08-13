/**
 * web/lib/talentoCargos.ts
 * Catálogo de cargos para Talento Humano (Res. 3100/2019 Est. 1)
 */

export const CARGOS = [
  'Médico General',
  'Médico Especialista',
  'Enfermero/a Profesional',
  'Auxiliar de Enfermería',
  'Odontólogo/a',
  'Bacteriólogo/a',
  'Fisioterapeuta',
  'Psicólogo/a',
  'Nutricionista',
  'Terapeuta Respiratorio/a',
  'Regente de Farmacia',
  'Técnico en Radiología',
  'Instrumentador/a Quirúrgico/a',
  'Auxiliar Administrativo',
  'Director Técnico',
  'Coordinador/a de Calidad',
  'Otro',
] as const;

export type CargoProfesional = (typeof CARGOS)[number];

export const DOC_TIPOS = [
  'Título Profesional',
  'Tarjeta Profesional',
  'Cédula de Ciudadanía',
  'Contrato / Vinculación',
  'Certificado de Vacunación',
  'Certificado de Inducción',
  'Certificado de Capacitación',
  'Resolución de Inscripción (REPS)',
  'Otro',
] as const;

export type DocTipoProfesional = (typeof DOC_TIPOS)[number];

export const CARGO_COLOR: Record<string, string> = {
  'Médico General':         'bg-blue-100 text-blue-800',
  'Médico Especialista':    'bg-indigo-100 text-indigo-800',
  'Enfermero/a Profesional':'bg-teal-100 text-teal-800',
  'Auxiliar de Enfermería': 'bg-cyan-100 text-cyan-800',
  'Director Técnico':       'bg-purple-100 text-purple-800',
  'Coordinador/a de Calidad':'bg-rose-100 text-rose-800',
};

export function cargoBadge(cargo: string) {
  return CARGO_COLOR[cargo] ?? 'bg-gray-100 text-gray-700';
}
