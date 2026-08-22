/**
 * web/lib/consentimientoCatalogo.ts
 * Catálogo de disciplinas/profesiones de la salud y procedimientos típicos
 * para el módulo de Consentimientos Informados.
 *
 * Base legal del consentimiento informado en sí: Ley 23/1981 Art. 15 ·
 * Res. 13437/1991 (Derechos del Paciente) · Res. 1732/2026 Est. Historia
 * Clínica. Esa normativa exige el consentimiento informado para todo
 * procedimiento diagnóstico o terapéutico que implique riesgo para el
 * paciente, pero NO enumera taxativamente cuáles procedimientos lo requieren
 * — eso depende de la valoración clínica y la política institucional de
 * cada IPS.
 *
 * IMPORTANTE — naturaleza de este catálogo: la lista de disciplinas y de
 * procedimientos por disciplina que sigue es un catálogo de referencia de
 * práctica clínica (para agilizar el registro), NO una enumeración legal
 * cerrada. Cualquier profesión o procedimiento no incluido puede añadirse
 * con la opción "Otro (especificar)" — el consentimiento informado aplica
 * igual aunque el procedimiento exacto no aparezca en esta lista.
 */

// Sentinel usado en el <select> de procedimiento para revelar el campo de
// texto libre — mismo patrón ya usado en sg-sst y equipos-biomedicos.
export const OTRO_PROCEDIMIENTO = '__otro_procedimiento';
export const OTRO_PROCEDIMIENTO_LABEL = 'Otro (especificar procedimiento)';

export const ESPECIALIDADES_CON: Record<string, string[]> = {
  'Medicina General': [
    'Consulta médica general',
    'Curación y manejo de heridas',
    'Sutura de heridas menores',
    'Infiltración con anestésico local',
    'Aplicación de vacunas e inmunobiológicos',
    'Electrocardiograma con interpretación',
    OTRO_PROCEDIMIENTO,
  ],
  'Medicina Interna / Especialidades Clínicas': [
    'Consulta de valoración por especialista',
    'Punción lumbar diagnóstica',
    'Paracentesis (punción abdominal evacuadora)',
    'Toracentesis (punción pleural)',
    'Biopsia de médula ósea',
    'Colocación de catéter venoso central',
    OTRO_PROCEDIMIENTO,
  ],
  'Pediatría': [
    'Consulta de crecimiento y desarrollo',
    'Aplicación de esquema de vacunación PAI',
    'Circuncisión pediátrica',
    'Punción lumbar pediátrica',
    'Sedación para procedimiento diagnóstico',
    OTRO_PROCEDIMIENTO,
  ],
  'Ginecología y Obstetricia': [
    'Citología cérvico-vaginal',
    'Inserción de dispositivo intrauterino (DIU)',
    'Retiro de dispositivo intrauterino (DIU)',
    'Colposcopia con toma de biopsia',
    'Histeroscopia diagnóstica',
    'Legrado uterino',
    'Amniocentesis',
    'Parto vaginal',
    'Cesárea',
    'Ligadura de trompas (esterilización quirúrgica)',
    OTRO_PROCEDIMIENTO,
  ],
  'Cirugía General': [
    'Apendicectomía',
    'Colecistectomía laparoscópica',
    'Hernioplastia (reparación de hernia)',
    'Biopsia excisional de tejido',
    'Drenaje quirúrgico de absceso',
    'Cirugía con anestesia general',
    'Cirugía ambulatoria bajo sedación',
    OTRO_PROCEDIMIENTO,
  ],
  'Cirugía Plástica y Estética': [
    'Rinoplastia',
    'Mamoplastia de aumento',
    'Mamoplastia de reducción',
    'Abdominoplastia',
    'Liposucción / lipoescultura',
    'Blefaroplastia',
    'Otoplastia',
    'Aplicación de toxina botulínica',
    'Aplicación de ácido hialurónico / rellenos dérmicos',
    OTRO_PROCEDIMIENTO,
  ],
  'Ortopedia y Traumatología': [
    'Reducción cerrada de fractura',
    'Osteosíntesis (fijación quirúrgica de fractura)',
    'Artroscopia diagnóstica/terapéutica',
    'Infiltración articular',
    'Retiro de material de osteosíntesis',
    'Artroplastia (reemplazo articular)',
    OTRO_PROCEDIMIENTO,
  ],
  'Anestesiología': [
    'Anestesia general',
    'Anestesia regional (raquídea/epidural)',
    'Sedación consciente para procedimiento',
    'Bloqueo nervioso periférico',
    OTRO_PROCEDIMIENTO,
  ],
  'Oftalmología': [
    'Cirugía de cataratas (facoemulsificación)',
    'Cirugía refractiva (LASIK)',
    'Inyección intravítrea',
    'Resección quirúrgica de pterigión',
    OTRO_PROCEDIMIENTO,
  ],
  'Otorrinolaringología': [
    'Amigdalectomía',
    'Adenoidectomía',
    'Septoplastia',
    'Timpanoplastia',
    'Endoscopia nasal',
    OTRO_PROCEDIMIENTO,
  ],
  'Urología': [
    'Cistoscopia',
    'Vasectomía',
    'Circuncisión (adulto)',
    'Biopsia de próstata',
    'Litotripsia',
    OTRO_PROCEDIMIENTO,
  ],
  'Dermatología': [
    'Biopsia de piel',
    'Crioterapia de lesiones cutáneas',
    'Escisión de lesión dermatológica',
    'Terapia con láser dermatológico',
    OTRO_PROCEDIMIENTO,
  ],
  'Odontología': [
    'Extracción dental simple',
    'Extracción de tercer molar (cordal)',
    'Tratamiento de conductos (endodoncia)',
    'Cirugía oral menor',
    'Cirugía periodontal',
    'Blanqueamiento dental',
    'Implante dental',
    'Colocación de aparatología de ortodoncia',
    OTRO_PROCEDIMIENTO,
  ],
  'Psicología': [
    'Evaluación psicológica',
    'Psicoterapia individual',
    'Terapia de pareja o familiar',
    'Pruebas psicométricas',
    'Intervención en crisis',
    OTRO_PROCEDIMIENTO,
  ],
  'Fisioterapia': [
    'Terapia física y rehabilitación',
    'Electroterapia',
    'Aplicación de calor/frío terapéutico',
    'Fisioterapia respiratoria',
    'Punción seca',
    OTRO_PROCEDIMIENTO,
  ],
  'Fonoaudiología': [
    'Evaluación fonoaudiológica',
    'Terapia de lenguaje',
    'Terapia de deglución',
    'Audiometría',
    OTRO_PROCEDIMIENTO,
  ],
  'Terapia Ocupacional': [
    'Evaluación ocupacional',
    'Terapia de rehabilitación funcional',
    'Adaptación de ayudas técnicas',
    OTRO_PROCEDIMIENTO,
  ],
  'Nutrición y Dietética': [
    'Valoración nutricional',
    'Plan de soporte nutricional enteral',
    'Educación nutricional individual',
    OTRO_PROCEDIMIENTO,
  ],
  'Optometría': [
    'Examen visual optométrico',
    'Adaptación de lentes de contacto',
    'Terapia visual',
    OTRO_PROCEDIMIENTO,
  ],
  'Imágenes Diagnósticas': [
    'Radiografía simple',
    'Ecografía',
    'Tomografía computarizada con contraste',
    'Tomografía computarizada sin contraste',
    'Resonancia magnética',
    'Endoscopia digestiva alta',
    'Colonoscopia',
    'Mamografía con biopsia guiada',
    OTRO_PROCEDIMIENTO,
  ],
  'Laboratorio Clínico': [
    'Toma de muestra sanguínea venosa',
    'Toma de muestra arterial (gases arteriales)',
    'Biopsia por aspiración con aguja fina (BACAF)',
    'Punción de médula ósea',
    OTRO_PROCEDIMIENTO,
  ],
  'Enfermería': [
    'Canalización de vena periférica',
    'Colocación de sonda vesical',
    'Colocación de sonda nasogástrica',
    'Curación avanzada de heridas',
    'Administración de medicamentos por vía parenteral',
    OTRO_PROCEDIMIENTO,
  ],
  'Medicina Transfusional / Banco de Sangre': [
    'Transfusión de glóbulos rojos',
    'Transfusión de plasma fresco congelado',
    'Transfusión de plaquetas',
    'Donación de sangre',
    OTRO_PROCEDIMIENTO,
  ],
  'Otra profesión / especialidad': [OTRO_PROCEDIMIENTO],
};
