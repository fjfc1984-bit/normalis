// web/lib/equiposCatalogo.ts
// Catálogo de referencia: servicios de salud + equipos biomédicos típicos
// por servicio, para el módulo CMMS (equipos-biomedicos).
//
// ── Origen de los datos ─────────────────────────────────────────────────
// 1) El LISTADO DE SERVICIOS (nombres y agrupación) sí está tomado de una
//    fuente primaria: el Anexo Técnico No. 1 de la Resolución 3100 de 2019
//    MSPS (numerales 11.2 a 11.6 — Consulta Externa, Apoyo Diagnóstico y
//    Complementación Terapéutica, Internación, Quirúrgico, Atención
//    Inmediata). Son los 38 servicios para los que la resolución define
//    estándares de habilitación diferenciados.
//
// 2) El EQUIPO BIOMÉDICO TÍPICO por servicio NO está tomado textualmente
//    de la Res. 3100/2019 — la resolución exige "los equipos biomédicos
//    necesarios según la complejidad del servicio" pero NO publica un
//    listado taxativo de equipos por servicio. Este catálogo es una
//    referencia práctica de ingeniería biomédica/uso hospitalario común en
//    Colombia, pensada para acelerar el registro (evitar escribir desde
//    cero), NO como un listado de obligatoriedad normativa. La dotación
//    mínima real depende de la complejidad, el volumen de atención y lo
//    que defina cada IPS en su portafolio de servicios — verifique con su
//    Secretaría de Salud territorial ante cualquier duda sobre dotación
//    exigida para un servicio específico.
//
// Por eso el formulario SIEMPRE deja la opción "Otro (especificar)" tanto
// en servicio como en equipo — este catálogo acelera la captura, no la
// limita.

export interface GrupoServicioSalud {
  grupo: string;
  servicios: string[];
}

export const SERVICIOS_SALUD_3100: GrupoServicioSalud[] = [
  {
    grupo: 'Consulta Externa',
    servicios: [
      'Consulta Externa General',
      'Consulta Externa Especializada',
      'Vacunación',
      'Seguridad y Salud en el Trabajo',
    ],
  },
  {
    grupo: 'Apoyo Diagnóstico y Complementación Terapéutica',
    servicios: [
      'Terapias',
      'Servicio Farmacéutico',
      'Radiología Odontológica',
      'Imágenes Diagnósticas',
      'Medicina Nuclear',
      'Radioterapia',
      'Quimioterapia',
      'Diagnóstico Vascular',
      'Hemodinamia e Intervencionismo',
      'Gestión Pre Transfusional',
      'Toma de Muestras de Laboratorio Clínico',
      'Laboratorio Clínico',
      'Toma de Muestras Cuello Uterino y Ginecológicas',
      'Laboratorio de Citologías Cervico-Uterinas',
      'Laboratorio de Histotecnología',
      'Patología',
      'Diálisis',
    ],
  },
  {
    grupo: 'Internación',
    servicios: [
      'Hospitalización',
      'Hospitalización Paciente Crónico',
      'Cuidado Básico Neonatal',
      'Cuidado Intermedio Neonatal',
      'Cuidado Intensivo Neonatal',
      'Cuidado Intermedio Pediátrico',
      'Cuidado Intensivo Pediátrico',
      'Cuidado Intermedio Adulto',
      'Cuidado Intensivo Adultos',
      'Hospitalización en Salud Mental o Consumo de Sustancias Psicoactivas',
      'Hospitalización Parcial',
      'Cuidado Básico del Consumo de Sustancias Psicoactivas',
    ],
  },
  {
    grupo: 'Quirúrgico',
    servicios: ['Cirugía'],
  },
  {
    grupo: 'Atención Inmediata',
    servicios: [
      'Urgencias',
      'Transporte Asistencial',
      'Atención Prehospitalaria',
      'Atención del Parto',
    ],
  },
];

export const TODOS_LOS_SERVICIOS_SALUD: string[] = SERVICIOS_SALUD_3100.flatMap(g => g.servicios);

// Sentinel usado en los <select> del formulario para activar el campo de
// texto libre — sigue la misma convención ya usada en sg-sst/page.tsx.
export const OTRO_VALOR = '__otro';

export const EQUIPOS_TIPICOS_POR_SERVICIO: Record<string, string[]> = {
  'Consulta Externa General': [
    'Tensiómetro', 'Fonendoscopio', 'Camilla de examen', 'Báscula con tallímetro',
    'Termómetro clínico', 'Otoscopio', 'Oftalmoscopio', 'Negatoscopio', 'Pulsioxímetro', 'Glucómetro',
  ],
  'Consulta Externa Especializada': [
    'Tensiómetro', 'Fonendoscopio', 'Camilla de examen', 'Electrocardiógrafo', 'Doppler fetal',
    'Colposcopio', 'Dermatoscopio', 'Espirómetro', 'Audiómetro', 'Lámpara de hendidura', 'Negatoscopio',
  ],
  'Vacunación': [
    'Refrigerador para biológicos (cadena de frío)', 'Termómetro/data logger de refrigerador',
    'Congelador para paquetes fríos', 'Termo transportador (caja fría)', 'Tensiómetro', 'Camilla',
  ],
  'Seguridad y Salud en el Trabajo': [
    'Audiómetro', 'Espirómetro', 'Optotipo / Cartilla de Snellen', 'Vibrómetro', 'Tensiómetro',
    'Electrocardiógrafo', 'Báscula con tallímetro',
  ],
  'Terapias': [
    'Camilla', 'Banda de marcha / bicicleta estática', 'Equipo de electroterapia (TENS)',
    'Equipo de ultrasonido terapéutico', 'Nebulizador', 'Compresor de aire', 'Barras paralelas', 'Espejo terapéutico',
  ],
  'Servicio Farmacéutico': [
    'Refrigerador para medicamentos termolábiles', 'Termohigrómetro', 'Cámara de flujo laminar',
    'Balanza de precisión', 'Contador de comprimidos',
  ],
  'Radiología Odontológica': [
    'Equipo de rayos X dental periapical', 'Equipo de rayos X panorámico', 'Delantal plomado',
    'Negatoscopio', 'Sistema de revelado/sensor digital',
  ],
  'Imágenes Diagnósticas': [
    'Equipo de rayos X convencional', 'Ecógrafo', 'Tomógrafo (TAC)', 'Resonador magnético (RMN)',
    'Mamógrafo', 'Mesa de fluoroscopia', 'Negatoscopio', 'Inyector de contraste',
  ],
  'Medicina Nuclear': [
    'Gammacámara', 'Cámara SPECT/SPECT-CT', 'Calibrador de dosis (activímetro)',
    'Detector de contaminación radiactiva', 'Blindajes plomados',
  ],
  'Radioterapia': [
    'Acelerador lineal', 'Equipo de braquiterapia', 'Simulador de radioterapia',
    'TAC de simulación', 'Sistema de planificación de tratamiento (TPS)',
  ],
  'Quimioterapia': [
    'Cabina de bioseguridad para citostáticos', 'Bomba de infusión', 'Sillón de quimioterapia',
    'Refrigerador para medicamentos',
  ],
  'Diagnóstico Vascular': [
    'Ecógrafo Doppler vascular', 'Pletismógrafo', 'Equipo de índice tobillo-brazo',
  ],
  'Hemodinamia e Intervencionismo': [
    'Arco en C / angiógrafo digital', 'Monitor de signos vitales', 'Bomba inyectora de contraste',
    'Desfibrilador', 'Sistema de registro poligráfico',
  ],
  'Gestión Pre Transfusional': [
    'Refrigerador de banco de sangre', 'Congelador de plasma', 'Centrífuga refrigerada',
    'Agitador de plaquetas', 'Baño de maría', 'Lector de tarjetas de tipificación (gel)',
  ],
  'Toma de Muestras de Laboratorio Clínico': [
    'Silla/camilla de toma de muestras', 'Centrífuga', 'Refrigerador de muestras', 'Torniquete',
  ],
  'Laboratorio Clínico': [
    'Analizador de química clínica', 'Analizador hematológico', 'Analizador de electrolitos',
    'Microscopio', 'Centrífuga', 'Incubadora de laboratorio', 'Autoclave', 'Refrigerador de reactivos',
  ],
  'Toma de Muestras Cuello Uterino y Ginecológicas': [
    'Camilla ginecológica', 'Espéculos', 'Lámpara de cuello de ganso',
  ],
  'Laboratorio de Citologías Cervico-Uterinas': [
    'Microscopio', 'Citocentrífuga', 'Procesador de citología en base líquida',
  ],
  'Laboratorio de Histotecnología': [
    'Procesador de tejidos', 'Micrótomo', 'Baño de flotación', 'Cabina de inclusión (embedding center)', 'Criostato',
  ],
  'Patología': [
    'Microscopio', 'Cabina de bioseguridad', 'Mesa de disección/necropsia',
  ],
  'Diálisis': [
    'Máquina de hemodiálisis', 'Planta de tratamiento de agua (ósmosis inversa)',
    'Sillón/cama de diálisis', 'Báscula', 'Monitor de signos vitales',
  ],
  'Hospitalización': [
    'Cama hospitalaria', 'Monitor de signos vitales', 'Bomba de infusión', 'Carro de paro',
    'Desfibrilador', 'Silla de ruedas', 'Grúa para pacientes',
  ],
  'Hospitalización Paciente Crónico': [
    'Cama hospitalaria con colchón antiescaras', 'Monitor de signos vitales', 'Silla de ruedas',
    'Grúa para pacientes', 'Concentrador de oxígeno',
  ],
  'Cuidado Básico Neonatal': [
    'Cuna', 'Incubadora', 'Cuna de calor radiante', 'Báscula pediátrica', 'Bomba de infusión',
  ],
  'Cuidado Intermedio Neonatal': [
    'Incubadora', 'Cuna de calor radiante', 'Monitor multiparámetro neonatal', 'Ventilador neonatal',
    'Bomba de infusión', 'Equipo de fototerapia',
  ],
  'Cuidado Intensivo Neonatal': [
    'Incubadora de cuidados intensivos', 'Ventilador neonatal de alta frecuencia',
    'Monitor multiparámetro neonatal', 'Bomba de infusión de precisión', 'Equipo de fototerapia', 'Equipo de CPAP',
  ],
  'Cuidado Intermedio Pediátrico': [
    'Cama pediátrica', 'Monitor multiparámetro', 'Bomba de infusión', 'Ventilador pediátrico',
  ],
  'Cuidado Intensivo Pediátrico': [
    'Ventilador mecánico pediátrico', 'Monitor multiparámetro', 'Bomba de infusión de precisión',
    'Desfibrilador', 'Carro de paro',
  ],
  'Cuidado Intermedio Adulto': [
    'Cama hospitalaria', 'Monitor multiparámetro', 'Bomba de infusión', 'Ventilador mecánico',
  ],
  'Cuidado Intensivo Adultos': [
    'Ventilador mecánico', 'Monitor multiparámetro', 'Bomba de infusión de precisión', 'Desfibrilador',
    'Carro de paro', 'Máquina de gases arteriales (point of care)', 'Cama eléctrica UCI',
  ],
  'Hospitalización en Salud Mental o Consumo de Sustancias Psicoactivas': [
    'Cama hospitalaria', 'Monitor de signos vitales', 'Kit de contención (según protocolo institucional)',
  ],
  'Hospitalización Parcial': [
    'Cama o camilla', 'Monitor de signos vitales',
  ],
  'Cuidado Básico del Consumo de Sustancias Psicoactivas': [
    'Cama hospitalaria', 'Monitor de signos vitales', 'Glucómetro',
  ],
  'Cirugía': [
    'Mesa quirúrgica', 'Lámpara cialítica', 'Máquina de anestesia', 'Monitor multiparámetro',
    'Electrobisturí', 'Desfibrilador', 'Bomba de infusión', 'Torre de laparoscopia',
    'Aspirador de secreciones', 'Carro de paro',
  ],
  'Urgencias': [
    'Monitor multiparámetro', 'Desfibrilador / DEA', 'Carro de paro', 'Ventilador de transporte',
    'Bomba de infusión', 'Electrocardiógrafo', 'Glucómetro', 'Aspirador de secreciones', 'Nebulizador',
  ],
  'Transporte Asistencial': [
    'Camilla de ambulancia', 'Monitor de signos vitales portátil', 'Desfibrilador / DEA portátil',
    'Ventilador de transporte', 'Cilindro de oxígeno portátil', 'Aspirador de secreciones portátil',
    'Silla de ruedas plegable',
  ],
  'Atención Prehospitalaria': [
    'Monitor desfibrilador portátil', 'Collar cervical', 'Camilla rígida / férulas', 'Kit de vía aérea',
    'Tensiómetro portátil', 'Glucómetro',
  ],
  'Atención del Parto': [
    'Mesa de partos', 'Monitor fetal (cardiotocógrafo)', 'Cuna de calor radiante',
    'Aspirador de secreciones neonatal', 'Equipo de reanimación neonatal', 'Doppler fetal', 'Lámpara de cuello de ganso',
  ],
};
