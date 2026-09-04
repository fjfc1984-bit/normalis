// web/data/auditData.ts
// Datos de auditoría — portado desde normalis-data-audit.js
// Fuente: Res. 1732/2026 (reemplazó la Res. 3100/2019 + Res. 465/2025 —
// mismos 7 estándares, contenido heredado y citas de norma actualizadas).
// Novedades propias de la 1732/2026 (IHCE, RDA, 4 modalidades de
// telemedicina, Plan de Adecuación Progresiva) agregadas como áreas nuevas
// — ver segmentos "general" y "telemedicina". Fuente de esas novedades:
// checklist ya verificado en app/dashboard/gap-1732/page.tsx.
//
// PONDERACIÓN POR CRITERIO (peso/obligatorio, ver lib/auditTypes.ts):
// piloto aplicado SOLO a 9 preguntas del segmento "general" — evacuación,
// personal habilitado (RETHUS, Director Técnico), bioseguridad,
// identificación del paciente, equipos de emergencia y medicamentos
// controlados. Son las que se pudieron justificar con confianza sin el
// instrumento oficial de criticidad de la Res. 1732/2026 en mano. El resto
// de "general" y los otros 21 segmentos quedan en peso=1/obligatorio=false
// (comportamiento idéntico al motor anterior) — pendientes de una revisión
// real por un auditor con el instrumento oficial, no de que alguien más
// "complete" los que faltan a ojo.

import type { AuditArea } from '@/lib/auditTypes';

export const SEGMENT_META: Record<string, { label: string; icon: string; norm: string }> = {
  "general": {
    "label": "Establecimiento General",
    "icon": "🏥",
    "norm": "Res. 1732/2026"
  },
  "profesional_independiente": {
    "label": "Profesional Independiente de Salud",
    "icon": "🩺",
    "norm": "Res. 1732/2026 Art. 2 y 3"
  },
  "domiciliaria": {
    "label": "Salud Domiciliaria",
    "icon": "🏠",
    "norm": "Dec. 780/2016 · Res. 1732/2026"
  },
  "imagenologia": {
    "label": "Imagenología",
    "icon": "🩻",
    "norm": "Res. 4445/1996 · Dec. 4725/2005"
  },
  "urgencias": {
    "label": "Urgencias",
    "icon": "🚨",
    "norm": "Res. 1732/2026 · Triage 5 niveles"
  },
  "internacion": {
    "label": "Internación",
    "icon": "🛏️",
    "norm": "Res. 1732/2026 · IAAS"
  },
  "quirurgicos": {
    "label": "Quirúrgicos",
    "icon": "🔪",
    "norm": "Res. 1732/2026 · OMS Lista Verificación"
  },
  "laboratorio": {
    "label": "Laboratorio Clínico",
    "icon": "🔬",
    "norm": "Res. 1732/2026 · PEEC MinSalud"
  },
  "transporte": {
    "label": "Transporte Asistencial",
    "icon": "🚑",
    "norm": "Dec. 2309/2002 · Min. Transporte"
  },
  "rehabilitacion": {
    "label": "Rehabilitación",
    "icon": "♿",
    "norm": "Res. 1732/2026 · Ley 528/1999"
  },
  "salud_mental": {
    "label": "Salud Mental",
    "icon": "🧠",
    "norm": "Ley 1616/2013 · Res. 1732/2026"
  },
  "odontologia": {
    "label": "Odontología",
    "icon": "🦷",
    "norm": "Res. 1732/2026 · Ley 35/1989"
  },
  "consulta_externa": {
    "label": "Consulta Externa",
    "icon": "🩺",
    "norm": "Res. 1732/2026 · Consulta Externa · Res. 3280/2018"
  },
  "cuidado_intensivo": {
    "label": "Cuidado Intensivo (UCI)",
    "icon": "🏥",
    "norm": "Res. 1732/2026 · UCI · Res. 544/2023 · Neonatología"
  },
  "obstetricia": {
    "label": "Obstetricia y Parto",
    "icon": "👶",
    "norm": "Res. 1732/2026 · Atención del parto · OMS"
  },
  "banco_sangre": {
    "label": "Banco de Sangre",
    "icon": "🩸",
    "norm": "Res. 1285/2010 · Decreto 1571/1993 · Res. 1732/2026"
  },
  "oncologia": {
    "label": "Oncología",
    "icon": "🎗️",
    "norm": "Res. 1732/2026 · Res. 1383/2013 · Guías IETS oncología"
  },
  "hemodialisis": {
    "label": "Hemodiálisis",
    "icon": "💉",
    "norm": "Res. 1732/2026 · KDIGO 2012 · Manual habilitación"
  },
  "farmacia": {
    "label": "Servicio Farmacéutico",
    "icon": "💊",
    "norm": "Res. 1403/2007 · Decreto 780/2016 · Res. 1732/2026"
  },
  "vacunacion": {
    "label": "Vacunación (PAI)",
    "icon": "🔬",
    "norm": "Res. 1732/2026 · PAI MSPS · Res. 2184/2019"
  },
  "proteccion_especifica": {
    "label": "Protección Específica y Detección Temprana",
    "icon": "🩺",
    "norm": "Res. 1732/2026 · Res. 3280/2018"
  },
  "telemedicina": {
    "label": "Telemedicina",
    "icon": "💻",
    "norm": "Res. 2654/2019 · Res. 1317/2021 · Res. 1732/2026"
  },
  "esterilizacion": {
    "label": "Central de Esterilización",
    "icon": "🧪",
    "norm": "Res. 1732/2026 · Decreto 4725/2005 · ANSI/AAMI ST79"
  },
  "trasplante": {
    "label": "Trasplante de Órganos",
    "icon": "🫀",
    "norm": "Decreto 2493/2004 · Res. 1732/2026 · Red de Donación"
  }
};

export const areasDB: Record<string, AuditArea[]> = {
  "profesional_independiente": [
    {
      "id": "pi-alcance",
      "icon": "📋",
      "name": "Alcance de la Habilitación",
      "norm": "Res. 1732/2026 Art. 2 y 3",
      "q": [
        "¿Tienes claro que como Profesional Independiente de salud solo debes demostrar la condición de Capacidad Tecnológica y Científica? La Res. 1732/2026 (Art. 2) te exime de Capacidad Técnico-Administrativa y de Suficiencia Patrimonial y Financiera, que solo aplican a instituciones (IPS), entidades con objeto social diferente y transporte especial de pacientes.",
        "¿Realizaste tu inscripción y autoevaluación de servicios en el REPS bajo la categoría 'Profesional Independiente', y no como Institución Prestadora de Servicios de Salud (IPS)?"
      ]
    },
    {
      "id": "pi-talento",
      "icon": "🩺",
      "name": "Talento Humano",
      "norm": "Res. 1732/2026 · RETHUS",
      "q": [
        "¿Tu tarjeta o registro profesional está vigente y verificable en el RETHUS?",
        "¿Tienes al día tus certificaciones de soporte vital básico o avanzado, si tu especialidad o los procedimientos que realizas lo requieren?",
        "Si cuentas con personal de apoyo (auxiliar, secretaria clínica), ¿está vinculado formalmente y con la certificación correspondiente cuando aplique?"
      ]
    },
    {
      "id": "pi-infraestructura",
      "icon": "🏢",
      "name": "Infraestructura del Consultorio",
      "norm": "Res. 1732/2026",
      "q": [
        "¿El consultorio cuenta con iluminación y ventilación adecuadas para la atención, y con acceso para personas con movilidad reducida?",
        "¿Existe señalización clara de salida de emergencia y ruta de evacuación del consultorio o del edificio donde funciona?",
        "¿El área de atención garantiza la privacidad del paciente durante la consulta y el examen físico?"
      ]
    },
    {
      "id": "pi-dotacion",
      "icon": "🧰",
      "name": "Dotación y Bioseguridad",
      "norm": "Res. 1732/2026",
      "q": [
        "¿Cuentas con los equipos e insumos mínimos para el servicio que prestas, con mantenimiento o calibración vigente cuando aplique?",
        "¿Tienes elementos de protección personal y un protocolo de bioseguridad (lavado de manos, desinfección de superficies e instrumental) documentado?",
        "¿Los residuos generados en la consulta (cortopunzantes, biosanitarios) tienen ruta de recolección y disposición con un gestor autorizado?"
      ]
    },
    {
      "id": "pi-procesos",
      "icon": "📋",
      "name": "Procesos Prioritarios y Seguridad del Paciente",
      "norm": "Res. 1732/2026",
      "q": [
        "¿Verificas la identidad del paciente antes de cada atención?",
        "¿Obtienes y documentas el consentimiento informado cuando el procedimiento que realizas lo requiere?",
        "¿Tienes definido a qué IPS o servicio remites a un paciente si se presenta una urgencia o una condición que supera tu capacidad de atención?"
      ]
    },
    {
      "id": "pi-historiaclinica",
      "icon": "📄",
      "name": "Historia Clínica",
      "norm": "Res. 1732/2026 · Res. 1995/1999",
      "q": [
        "¿Llevas historia clínica de cada paciente con los componentes mínimos (motivo de consulta, anamnesis, examen físico, diagnóstico, plan de manejo) firmada?",
        "¿La historia clínica se conserva con confidencialidad y acceso restringido, con respaldo periódico si es electrónica?",
        "¿Generas un Resumen Digital de Atención (RDA) o su equivalente en papel al finalizar cada episodio, con diagnóstico, tratamiento e indicaciones de seguimiento?"
      ]
    }
  ],
  "general": [
    {
      "id": "infraestructura",
      "icon": "🏗️",
      "name": "Infraestructura Física",
      "norm": "Res. 1732/2026 Est. 2 · Res. 544/2023 · NSR-10",
      "q": [
        "¿Todas las áreas asistenciales tienen pisos, paredes y techos de material liso, lavable, no poroso y resistente a productos de limpieza y desinfección?",
        "¿La iluminación artificial en áreas clínicas supera los 300 lux en superficies de trabajo y existen respaldos de energía (UPS/planta eléctrica) para zonas críticas?",
        "¿La ventilación de áreas asistenciales garantiza renovaciones de aire adecuadas, diferenciando zonas de presión positiva y negativa donde corresponde?",
        "¿Las áreas asistenciales garantizan privacidad visual y auditiva del paciente durante la atención mediante puerta con seguro, biombo o separación física?",
        { "texto": "¿La señalización de rutas de evacuación, puntos de encuentro y salidas de emergencia es visible, fotoluminiscente y cubre todos los espacios del establecimiento?", "obligatorio": true },
        "¿Los baños destinados a usuarios están dotados de jabón líquido, papel higiénico, toallas o secador de manos, y cuentan con mantenimiento documentado?",
        "¿Las instalaciones eléctricas tienen concepto técnico vigente emitido por profesional calificado RETIE y los tableros están señalizados e identificados?",
        "¿El establecimiento construido antes de 2010 con servicios críticos (urgencias, cirugía, UCI) cuenta con estudio de vulnerabilidad sísmica y plan de reforzamiento NSR-10?",
        "¿Las áreas de almacenamiento de insumos y medicamentos están separadas de áreas de atención, con temperatura, humedad y luz controladas?",
        "¿Existe un plan de mantenimiento locativo documentado con cronograma, responsables y registros de intervenciones de los últimos 12 meses?",
        "¿Los consultorios donde se atienden menores de 5 años cumplen los requisitos de infraestructura vigentes? (Res. 1732/2026 · Art. 19: ya NO se requiere barrera física fija o móvil entre área de entrevista y examen — verificar que el consultorio no tenga restricciones de otro tipo que afecten la habilitación)"
      ]
    },
    {
      "id": "accesibilidad",
      "icon": "♿",
      "name": "Accesibilidad y Derechos del Paciente",
      "norm": "Res. 1732/2026 Est. 2 · Ley 1618/2013 · Res. 13437/1991 · Dec. 1011/2006",
      "q": [
        "¿El establecimiento garantiza acceso físico sin barreras para personas con discapacidad: rampas con inclinación ≤8%, pasillos ≥1.2 m y baño adaptado?",
        "¿La carta de derechos y deberes del paciente (Res. 13437/1991) está publicada en lugar visible al ingreso y disponible en versión accesible?",
        "¿Existe un mecanismo activo de PQRSF con buzón físico o canal digital visible, con protocolo de respuesta en los plazos legales (15 días hábiles)?",
        "¿El personal conoce y aplica el procedimiento institucional para recibir, registrar y dar trámite a las PQRSF de los usuarios?",
        "¿Se garantiza atención sin discriminación por género, origen étnico, orientación sexual, condición migratoria, discapacidad o capacidad de pago?",
        "¿El establecimiento tiene protocolo de intérprete o mediación cultural para comunidades indígenas, afrodescendientes o pacientes extranjeros?",
        "¿Existe protocolo de atención prioritaria para adultos mayores, gestantes, niños menores de 5 años y personas con discapacidad en todos los servicios?",
        "¿Los pacientes reciben información comprensible sobre diagnóstico, tratamiento, alternativas y pronóstico antes de iniciar cualquier intervención?"
      ]
    },
    {
      "id": "talento",
      "icon": "👨‍⚕️",
      "name": "Talento Humano",
      "norm": "Res. 1732/2026 Est. 1 · RETHUS · Ley 23/1981 · Res. 2278/2021",
      "q": [
        { "texto": "¿Todos los profesionales de la salud que prestan servicios tienen tarjeta profesional vigente verificable en el RETHUS del Ministerio de Salud?", "obligatorio": true },
        "¿Los médicos especialistas tienen su especialización reconocida y registrada en RETHUS correspondiente a los procedimientos que realizan?",
        "¿Existe un manual de funciones documentado para cada cargo asistencial y administrativo, con perfil de competencias y responsabilidades específicas?",
        "¿Los vínculos laborales o contractuales de todo el personal asistencial están formalizados mediante contratos escritos firmados y vigentes?",
        { "texto": "¿El Director Técnico está designado formalmente y tiene inscripción vigente como responsable de la prestación ante la Secretaría de Salud?", "obligatorio": true },
        "¿Existe programa documentado de inducción para el personal nuevo con verificación de competencias antes del inicio de actividades asistenciales?",
        "¿El establecimiento tiene plan de capacitación continua con registros de asistencia del último año: BLS/ACLS, bioseguridad y normativa vigente?",
        "¿El personal asistencial cuenta con carné de vacunación al día: Hepatitis B (esquema completo), tétanos y demás vacunas para riesgo biológico?",
        "¿Se realiza evaluación del desempeño del personal asistencial al menos una vez al año con registros y planes de mejoramiento documentados?",
        "¿Existe protocolo para manejo de accidente de trabajo con material biológico (pinchazo, salpicadura) conocido por TODO el personal y con insumos disponibles?"
      ]
    },
    {
      "id": "dotacion",
      "icon": "🩺",
      "name": "Dotación y Gestión de Equipos",
      "norm": "Res. 1732/2026 Est. 3 · Decreto 4725/2005 · INVIMA · Res. 4816/2008",
      "q": [
        "¿Todos los equipos biomédicos en uso tienen hoja de vida individual con registros actualizados de mantenimiento preventivo y correctivo firmados?",
        "¿Los dispositivos médicos en uso tienen registro INVIMA vigente o están en la lista de dispositivos exentos verificable en la base INVIMA?",
        "¿Los equipos de medición clínica (tensiómetro, báscula, termómetro, glucómetro) tienen certificado de calibración metrológica vigente del último año?",
        "¿Existe cronograma de mantenimiento preventivo anual de equipos biomédicos con fechas, responsables y registros de cumplimiento efectivo?",
        "¿El establecimiento aplica Tecnovigilancia: reporta al INVIMA los incidentes o eventos adversos asociados a dispositivos médicos (Res. 4816/2008)?",
        "¿Los equipos en mal estado están claramente identificados con etiqueta de \"NO USAR - En mantenimiento\" y retirados del área asistencial?",
        "¿Existe recipiente para cortopunzantes (guardián) en cada área asistencial, sin superar el 75% de su capacidad y sin riesgo de volcamiento?",
        { "texto": "¿Los equipos de emergencia (DEA, oxígeno, ambú) están disponibles, operativos y con revisión documentada en la última semana?", "obligatorio": true },
        "¿Hay inventario actualizado de equipos biomédicos con número de serie, proveedor, fecha de adquisición y vida útil estimada?"
      ]
    },
    {
      "id": "procesos",
      "icon": "📋",
      "name": "Procesos Prioritarios y Protocolos",
      "norm": "Res. 1732/2026 Est. 5 · Res. 256/2016 · Dec. 1011/2006 · OMS Seguridad Paciente",
      "estandar": "procesos_prioritarios",
      "q": [
        { "texto": "¿Existe Manual de Bioseguridad actualizado en los últimos 12 meses, firmado por el responsable, con evidencia de socialización a todo el personal?", "obligatorio": true },
        "¿Hay protocolos escritos de atención para todos los servicios habilitados, basados en evidencia actualizada y accesibles al personal en el área?",
        "¿El protocolo de referencia y contrarreferencia está documentado con IPS de mayor complejidad de la red territorial y es conocido por el personal?",
        { "texto": "¿Se aplica consentimiento informado previo a procedimientos invasivos con formato específico por procedimiento, debidamente archivado en la HC?", "obligatorio": true },
        "¿El establecimiento tiene sistema documentado de reporte, análisis de causa raíz y seguimiento de eventos adversos e incidentes de seguridad?",
        { "texto": "¿Existe protocolo de identificación correcta del paciente con al menos dos identificadores antes de cualquier procedimiento?", "obligatorio": true },
        "¿Hay protocolo de comunicación efectiva entre turnos (entrega de turno SBAR o equivalente) documentado y aplicado en todos los servicios?",
        "¿El establecimiento tiene protocolo de caídas con evaluación de riesgo al ingreso (Escala Morse), intervenciones preventivas y registro de caídas?",
        "¿Existe protocolo de úlceras por presión con escala de valoración (Braden o Norton) para pacientes en cama y registro de lesiones al ingreso?",
        "¿El plan de emergencias y desastres está actualizado, con simulacros en los últimos 12 meses y evidencia de participación del personal?",
        "¿Si el establecimiento tiene cámaras de videovigilancia que graban procedimientos de salud, existe documento escrito de autorización firmado por el paciente/representante Y por el profesional responsable, y dicho documento hace parte de la Historia Clínica? (Res. 1732/2026 · Art. 19 · Sentencia T-144/2024)",
        "¿Si el establecimiento realiza vacunación fuera del servicio habilitado específicamente para ello, documenta en Procesos Prioritarios: garantía de cadena de frío, procedimiento para obtención de biológicos y registros clínicos requeridos? (Res. 1732/2026 · Art. 7)",
        "¿La autoevaluación de las condiciones de habilitación está documentada y actualizada conforme a los 4 momentos obligatorios: previa inscripción, 4° año de vigencia, previa renovación anual, y previa al reporte de novedades? (Res. 1732/2026 · Art. 5)"
      ]
    },
    {
      "id": "historiaclinica",
      "icon": "📄",
      "name": "Historia Clínica y Registros",
      "norm": "Res. 1995/1999 · Res. 1732/2026 Est. 6 · Res. 839/2017 · Ley 1581/2012",
      "q": [
        "¿Las historias clínicas cumplen componentes mínimos: identificación, motivo de consulta, anamnesis, examen físico, diagnóstico CIE-10, plan de manejo y evolución firmada?",
        "¿El sistema de custodia garantiza confidencialidad, acceso restringido e integridad, con conservación mínima de 20 años desde la última atención?",
        "¿Si se usa historia clínica electrónica, el sistema genera log de auditoría con fecha, hora y usuario de cada acceso o modificación, con respaldo periódico?",
        "¿Existe protocolo de cierre del establecimiento con destinación del archivo de historias clínicas a entidad competente según Res. 839/2017?",
        "¿El establecimiento tiene autorización de tratamiento de datos personales de salud actualizada y el personal conoce la Ley 1581/2012 (habeas data)?",
        "¿Los registros de notas de enfermería son completos, firmados con nombre y matrícula, distinguibles claramente de las notas médicas?",
        "¿Las epicrisis o resúmenes de alta se elaboran dentro de las 24 horas del egreso con diagnóstico definitivo, tratamiento y recomendaciones?",
        "¿El acceso a historias clínicas tiene registro de préstamo y devolución, garantizando que solo personal autorizado accede a los expedientes?"
      ]
    },
    {
      "id": "ihce",
      "icon": "🔗",
      "name": "Historia Clínica Electrónica Interoperable (IHCE)",
      "norm": "Res. 1732/2026 · HL7 FHIR/CDA · Ley 1581/2012",
      "q": [
        "¿El sistema de historia clínica tiene capacidad de interoperabilidad (API o mecanismo de exportación en formato estándar HL7 FHIR o CDA) para intercambiar información clínica con otras IPS y el sistema nacional de salud, como exige la IHCE de la Res. 1732/2026?",
        "¿Existe política documentada de seguridad de la información clínica electrónica que incluya autenticación, trazabilidad de accesos (log de auditoría) y cifrado de datos en tránsito y en reposo?",
        "¿Los documentos clínicos electrónicos usan un mecanismo de firma electrónica con validez legal equivalente a la firma manuscrita?"
      ]
    },
    {
      "id": "rda",
      "icon": "📝",
      "name": "Resumen Digital de Atención (RDA)",
      "norm": "Res. 1732/2026",
      "q": [
        "¿La IPS genera un Resumen Digital de Atención (RDA) al momento del alta de cada episodio, y lo entrega al paciente, según exige la Res. 1732/2026?",
        "¿El RDA incluye como mínimo: diagnóstico (CIE-10), tratamiento administrado, medicamentos prescritos, indicaciones de seguimiento y datos de contacto de la IPS?",
        "¿El RDA generado queda incorporado y trazable dentro de la historia clínica del episodio para auditorías posteriores?"
      ]
    },
    {
      "id": "residuos",
      "icon": "🗑️",
      "name": "Gestión de Residuos Hospitalarios (PGIRH)",
      "norm": "Decreto 351/2014 · Res. 1164/2002 · Res. 1732/2026 Est. 5",
      "estandar": "procesos_prioritarios",
      "q": [
        { "texto": "¿Existen recipientes diferenciados según Dec. 351/2014: rojo (infeccioso/biológico), negro (ordinario no aprovechable), verde (biodegradable), blanco o gris (reciclable) y guardián rígido (cortopunzantes) en cada área asistencial?", "obligatorio": true },
        "¿El contrato con empresa gestora de RESPEL autorizada está vigente con manifiestos de disposición final de las últimas tres recolecciones?",
        "¿El Plan de Gestión Integral de Residuos Hospitalarios (PGIRH) está actualizado, registrado ante la autoridad ambiental y con cronograma activo?",
        "¿El personal tiene capacitación documentada en segregación de residuos hospitalarios en los últimos 12 meses con registro de asistencia?",
        "¿El área de almacenamiento temporal de RESPEL cumple: techo, piso lavable, ventilación, señalización y acceso restringido?",
        "¿Los residuos anatomopatológicos tienen manejo diferenciado con contrato específico para su tratamiento y disposición final?",
        "¿Se llevan registros mensuales de peso/volumen de residuos generados por tipo con reporte a la autoridad ambiental según la norma?",
        "¿El personal de aseo usa EPP completo (guantes industriales, delantal, botas, gafas) para la recolección y transporte de residuos peligrosos?"
      ]
    },
    {
      "id": "insumos",
      "icon": "📦",
      "name": "Medicamentos e Insumos Médico-Quirúrgicos",
      "norm": "Res. 1732/2026 Est. 4 · Decreto 677/1995 · INVIMA · Res. 1403/2007",
      "q": [
        "¿Los medicamentos están almacenados separados de alimentos, con temperatura controlada según ficha técnica y termómetro calibrado?",
        "¿Se aplica metodología PEPS (Primero en Entrar, Primero en Salir) y los medicamentos próximos a vencer (menos de 3 meses) están identificados?",
        "¿Los medicamentos de alto riesgo (anticoagulantes, insulinas, opioides, electrolitos concentrados KCl) tienen alerta visual y doble verificación?",
        { "texto": "¿Los medicamentos controlados (psicotrópicos, estupefacientes) están bajo llave con inventario actualizado, libro de control y responsable designado?", "obligatorio": true },
        "¿Los insumos de uso único están diferenciados de los reutilizables y no hay evidencia de reutilización de insumos de un solo uso?",
        "¿Existe lista de medicamentos esenciales o formulario institucional aprobado, disponible y de uso obligatorio para el personal?",
        "¿Los medicamentos vencidos, deteriorados o con empaque comprometido están segregados con proceso documentado de devolución o destrucción?",
        "¿Los registros de dispensación de medicamentos permiten rastrear: qué medicamento, a qué paciente, por quién, cuándo y en qué dosis?"
      ]
    },
    {
      "id": "adecuacion-progresiva",
      "icon": "🗺️",
      "name": "Plan de Adecuación Progresiva (territorios especiales)",
      "norm": "Res. 1732/2026",
      "q": [
        "¿La IPS está ubicada en un municipio con dispersión geográfica, zona PDET o de difícil acceso? (si la respuesta es 'no', el resto de esta área no aplica)",
        "Si aplica: ¿la IPS solicitó ante la Secretaría de Salud departamental el Plan de Adecuación Progresiva, con cronograma de adecuación y brechas identificadas?"
      ]
    }
  ],
  "domiciliaria": [
    {
      "id": "dom-coordinacion",
      "icon": "📋",
      "name": "Coordinación Clínica y Administrativa",
      "norm": "Dec. 780/2016 · Res. 1732/2026 · Atención Domiciliaria",
      "q": [
        "¿Existe director médico o coordinador clínico con designación formal y tarjeta profesional vigente para el servicio domiciliario?",
        "¿Hay protocolos específicos y actualizados para cada tipo de atención domiciliaria prestada (curación, sonda, oxigenoterapia, manejo de heridas)?",
        "¿El sistema de referencia y contrarreferencia domiciliaria está documentado con rutas claras hacia urgencias y la IPS de mayor complejidad?",
        "¿El equipo multidisciplinario tiene roles, responsabilidades y protocolos de comunicación entre sí claramente definidos y documentados?",
        "¿Existe cronograma de visitas con asignación de rutas, tiempos estimados y sistema de confirmación de cumplimiento?",
        "¿Hay sistema de asignación de casos que considera complejidad, carga de trabajo del profesional y distancia geográfica?",
        "¿El servicio tiene indicadores de gestión: visitas realizadas vs. programadas, reingresos hospitalarios, satisfacción del cuidador?"
      ]
    },
    {
      "id": "dom-dotacion",
      "icon": "🎒",
      "name": "Dotación del Maletín de Atención",
      "norm": "Res. 1732/2026 Est. 3 · Dotación domiciliaria",
      "q": [
        "¿El maletín contiene tensiómetro, pulsioxímetro, glucómetro, termómetro y estetoscopio en buen estado y calibrados?",
        "¿Los insumos del maletín tienen revisión de vencimiento en los últimos 30 días con lista de verificación firmada?",
        "¿Existe guardián portátil para manejo seguro de cortopunzantes en el domicilio del paciente?",
        "¿Los EPP (guantes por talla, mascarilla quirúrgica o N95, bata) están disponibles en cantidad suficiente para cada visita?",
        "¿El maletín incluye kit de primeros auxilios y medicamentos básicos de emergencia según el tipo de paciente atendido?",
        "¿Los equipos del maletín tienen hoja de vida individual con registro de mantenimiento y calibración vigente?",
        "¿El maletín está equipado con materiales de curación, vendajes, apósitos y materiales para los procedimientos programados en la ruta?",
        "¿Existe protocolo documentado de reposición de insumos del maletín con responsable y frecuencia definida?"
      ]
    },
    {
      "id": "dom-hc",
      "icon": "📄",
      "name": "Historia Clínica Domiciliaria y Registros",
      "norm": "Res. 1995/1999 · Res. 1732/2026 Est. 6",
      "q": [
        "¿Cada visita genera nota de evolución con: fecha, hora, profesional, hallazgos clínicos, intervención y plan?",
        "¿La historia clínica diferencia las atenciones domiciliarias de las presenciales y permite reconstruir la trayectoria del paciente?",
        "¿Existe nota de evolución firmada por el profesional tratante con nombre legible y número de registro profesional en cada visita?",
        "¿Los signos vitales tomados en domicilio están registrados con valores numéricos y hora exacta?",
        "¿El consentimiento informado para atención domiciliaria está firmado por el paciente o cuidador legal antes del inicio del servicio?",
        "¿Se registra la persona responsable (cuidador) presente, su comprensión de las instrucciones y los compromisos adquiridos?",
        "¿El plan de alta domiciliaria está documentado con criterios de egreso, recomendaciones al cuidador y señales de alarma para urgencias?"
      ]
    },
    {
      "id": "dom-seguridad",
      "icon": "🛡️",
      "name": "Seguridad del Paciente en Domicilio",
      "norm": "Res. 256/2016 · Programa Seguridad del Paciente",
      "q": [
        "¿Se realiza valoración del riesgo del entorno domiciliario (caídas, barreras arquitectónicas, cuidador disponible) al inicio del servicio?",
        "¿Existe protocolo de actuación ante emergencia en domicilio: deterioro súbito, paro cardiorrespiratorio, caída durante la visita?",
        "¿El establecimiento realiza seguimiento post-visita para confirmar adherencia y detectar complicaciones?",
        "¿Los eventos adversos en atenciones domiciliarias se reportan al sistema institucional con análisis de causa?",
        "¿Se aplica reconciliación de medicamentos al inicio del servicio domiciliario para identificar polifarmacia e interacciones?",
        "¿El profesional verifica en cada visita que el paciente o cuidador conoce las señales de alarma y el procedimiento para contactar urgencias?",
        "¿Existe registro de evaluación de la capacidad funcional del paciente (índice de Barthel) al inicio y en el seguimiento periódico?"
      ]
    },
    {
      "id": "dom-bioseg",
      "icon": "🦠",
      "name": "Bioseguridad en Atención Domiciliaria",
      "norm": "Res. 1732/2026 Est. 5 · Dec. 351/2014 · Precauciones Estándar OMS",
      "estandar": "procesos_prioritarios",
      "q": [
        "¿El profesional realiza higiene de manos (lavado o alcohol gel) antes y después de cada procedimiento en el domicilio?",
        "¿Se aplican precauciones estándar (guantes, mascarilla, bata según riesgo) en todos los procedimientos con exposición a fluidos?",
        "¿El profesional retira del domicilio TODOS los residuos peligrosos generados (cortopunzantes, material biológico, gasas) en bolsa roja?",
        "¿Existe protocolo escrito para transporte seguro de residuos biológicos desde el domicilio hasta la sede?",
        "¿El personal tiene capacitación documentada en bioseguridad domiciliaria y manejo de accidente biológico fuera de la institución?",
        "¿El establecimiento asegura disponibilidad de alcohol al 70%, hipoclorito y elementos de desinfección de equipos portátiles?"
      ]
    },
    {
      "id": "dom-transporte",
      "icon": "🚐",
      "name": "Transporte y Desplazamiento",
      "norm": "Dec. 2376/2011 · Res. 1732/2026 · Min. Transporte",
      "q": [
        "¿El vehículo utilizado para atención domiciliaria está autorizado según el tipo de servicio y normativa vigente de transporte?",
        "¿El conductor tiene licencia de conducción vigente y categoría adecuada para el vehículo utilizado?",
        "¿Existe plan de rutas con protocolos de seguridad vial para personal que se desplaza a domicilios en zonas de difícil acceso?",
        "¿El establecimiento tiene cobertura de seguro de accidentes para el personal durante los desplazamientos a domicilios?",
        "¿Si el establecimiento cuenta con ambulancias o vehículos de transporte asistencial, estos portan la \"estrella de la vida\" (azul o verde reflectivo) en costados, puertas posteriores y techo, y el emblema protector de la Misión Médica? (Res. 1732/2026 · Art. 20 · Res. 4481/2012)"
      ]
    },
    {
      "id": "dom-comunicacion",
      "icon": "📞",
      "name": "Comunicación y Disponibilidad 24 Horas",
      "norm": "Res. 1732/2026 · Estándar Atención al Usuario",
      "q": [
        "¿Existe línea telefónica disponible 24 horas los 7 días de la semana para pacientes y cuidadores del servicio domiciliario?",
        "¿Hay protocolo documentado de escalamiento a urgencias o activación de transporte asistencial ante descompensación del paciente?",
        "¿Los pacientes y cuidadores reciben instrucciones escritas comprensibles sobre señales de alarma, cuidados en casa y cómo actuar ante emergencia?",
        "¿El tiempo de respuesta ante llamado de urgencia del servicio domiciliario está definido, es medido y cumple el estándar institucional?",
        "¿Existe registro de llamadas de seguimiento realizadas a los pacientes entre visitas con resultado y acciones tomadas?"
      ]
    },
    {
      "id": "dom-calidad",
      "icon": "📊",
      "name": "Indicadores y Mejoramiento",
      "norm": "Res. 256/2016 · Res. 1732/2026 Est. 6 · PAMEC",
      "q": [
        "¿El servicio domiciliario tiene indicadores propios: adherencia al tratamiento, reingresos hospitalarios, satisfacción del cuidador?",
        "¿Se realiza auditoría periódica de historias clínicas domiciliarias para verificar calidad del registro y adherencia a protocolos?",
        "¿El servicio domiciliario participa activamente en el PAMEC institucional con planes de mejoramiento documentados?",
        "¿Existe encuesta de satisfacción aplicada al cuidador con análisis de resultados y acciones de mejora documentadas?"
      ]
    }
  ],
  "imagenologia": [
    {
      "id": "img-planta",
      "icon": "🏗️",
      "name": "Planta Física y Blindaje Radiológico",
      "norm": "Res. 4445/1996 · Res. 9031/1990 · ICRP 60 · NTC 4509",
      "q": [
        "¿Las paredes, piso, techo, puerta y ventanas del área de rayos X tienen blindaje de plomo certificado (mínimo 1.5 mm Pb equivalente) verificado por informe técnico?",
        "¿La puerta del cuarto de rayos X tiene hoja plomada con sello perimetral y sistema de cierre seguro que impide el ingreso durante la exposición?",
        "¿Existe señalización internacional de radiación ionizante (trébol amarillo) en TODAS las entradas al área controlada?",
        "¿Hay sistema de semáforo o señal luminosa de \"RAYOS X EN USO - No ingrese\" activo y sincronizado con el disparador del equipo?",
        "¿La separación entre zona controlada, zona supervisada y zona pública está delimitada con señalización permanente?",
        "¿La sala de ecografía y demás áreas de apoyo diagnóstico están diferenciadas de la sala de rayos X y la sala de lectura?",
        "¿Existe vestuario o área de preparación del paciente adecuada y diferenciada del área de exposición?",
        "¿El informe técnico de blindaje está vigente y fue emitido por profesional con certificación en protección radiológica reconocida en Colombia?"
      ]
    },
    {
      "id": "img-equipos",
      "icon": "⚙️",
      "name": "Equipos de Diagnóstico por Imagen",
      "norm": "Dec. 4725/2005 · INVIMA · Res. 4445/1996 · Res. 1642/1998",
      "q": [
        "¿Todos los equipos de imagenología tienen registro INVIMA vigente o autorización de uso del Invima visible y verificable?",
        "¿Cada equipo tiene hoja de vida individual con historial completo de mantenimiento preventivo y correctivo, firmado por técnico calificado?",
        "¿El programa de garantía de calidad incluye pruebas de aceptación inicial, pruebas de constancia periódicas y pruebas de estado?",
        "¿Los dosímetros de área para monitoreo de radiación ambiental están calibrados, ubicados en puntos representativos y con lectura mensual?",
        "¿El rendimiento del generador de rayos X (kVp, mAs, tiempo) ha sido verificado en el último año con equipo de medición calibrado?",
        "¿Los chasis radiográficos o detectores digitales tienen prueba de contacto o de calidad de imagen con frecuencia definida?",
        "¿El equipo de mamografía tiene pruebas adicionales (phantom ACR, dosis glandular media, contraste-detalle) realizadas en el último año?",
        "¿Los equipos de ultrasonido tienen mantenimiento preventivo documentado incluyendo verificación de transductores y calidad de imagen?"
      ]
    },
    {
      "id": "img-radioproteccion",
      "icon": "🦺",
      "name": "Radioprotección del Personal Expuesto (TOE)",
      "norm": "Res. 9031/1990 · Dec. 2644/1994 · ICRP 60 · NTC 2883",
      "q": [
        "¿Todos los trabajadores ocupacionalmente expuestos (TOE) usan dosímetro personal (TLD u OSL) con lectura mínima trimestral registrada y archivada?",
        "¿Los delantales plomados (mínimo 0.25 mm Pb equivalente) están disponibles para CADA operador y para acompañantes cuando aplica?",
        "¿Los collarines tiroideos y guantes plomados están disponibles y en buen estado para procedimientos de alto riesgo de exposición?",
        "¿Se verifica integridad de los delantales plomados mediante radiografía o fluoroscopía del delantal con frecuencia semestral y registro del resultado?",
        "¿Los operadores tienen certificado vigente en protección radiológica emitido por institución autorizada reconocida en Colombia?",
        "¿Las dosis individuales de los TOE se registran y analizan frente a los límites anuales (20 mSv/año dosis efectiva)?",
        "¿Existe programa de vigilancia médica ocupacional para los TOE con exámenes periódicos y seguimiento de la dosis acumulada?",
        "¿Las gestantes o personal en lactancia están excluidas de actividades con exposición a radiación ionizante y esta medida está documentada?"
      ]
    },
    {
      "id": "img-paciente",
      "icon": "🩻",
      "name": "Protección al Paciente y Principio ALARA",
      "norm": "Res. 9031/1990 · ICRP 103 · OMS Seguridad Radiológica",
      "q": [
        "¿Se aplica el principio ALARA mediante colimación estricta al área anatómica de interés, reduciendo el campo de exposición al mínimo necesario?",
        "¿Existe protocolo escrito y aplicado para identificar el embarazo en toda mujer en edad fértil antes de cualquier exposición a radiación?",
        "¿Se usan delantales de protección gonadal en pacientes en edad reproductiva cuando el campo de exposición está en región pélvica o abdominal?",
        "¿Los protocolos de técnica radiológica están estandarizados por tipo de estudio y grupo etario para minimizar la dosis al paciente?",
        "¿Existe estimación de dosis al paciente en estudios de mayor dosis (TAC, fluoroscopía) con registro individualizado cuando aplica?",
        "¿Se informa al paciente sobre el propósito del estudio y la radiación que recibirá, obteniendo consentimiento para estudios con contraste?",
        "¿El sistema de control de calidad de imagen evalúa la tasa de repetición (objetivo: < 5%) con análisis de causas y corrección?",
        "¿Los niños y pacientes pediátricos tienen protocolo específico de técnica ajustada al peso/talla con criterios de justificación especiales?"
      ]
    },
    {
      "id": "img-talento",
      "icon": "👨‍⚕️",
      "name": "Talento Humano Especializado",
      "norm": "Res. 1732/2026 Est. 1 · Ley 657/2001 · Res. 4445/1996",
      "q": [
        "¿El tecnólogo en radiología e imágenes diagnósticas tiene tarjeta profesional vigente en RETHUS conforme a la Ley 657/2001?",
        "¿El médico radiólogo responsable tiene especialización registrada en RETHUS y firma los informes de los estudios que requieren interpretación médica?",
        "¿El personal de ecografía tiene certificación específica en la modalidad que practica (ginecobstétrica, abdominal, cardiaca)?",
        "¿Existe disponibilidad verificable de médico radiólogo para consultas urgentes, interpretación en línea o teleconsulta para estudios complejos?",
        "¿El personal de apoyo tiene funciones delimitadas y NO opera equipos de rayos X sin supervisión del tecnólogo certificado?",
        "¿Se lleva registro de los estudios realizados por cada operador con número de exámenes y tipo de estudio para seguimiento de competencia?"
      ]
    },
    {
      "id": "img-calidad",
      "icon": "📊",
      "name": "Control de Calidad e Indicadores",
      "norm": "Res. 4445/1996 Art. 15 · Programa Garantía Calidad · IAEA",
      "q": [
        "¿El libro de rechazo/repetición de imágenes está actualizado con análisis mensual de causas y tasa de rechazo documentada (objetivo ≤5%)?",
        "¿Se realizan pruebas periódicas de control de calidad del sistema digital (uniformidad, resolución, artefactos) con registro de resultados?",
        "¿Los criterios de calidad de imagen están documentados para cada tipo de estudio (criterios CEC o equivalentes)?",
        "¿Existe revisión periódica de protocolos técnicos con participación del radiólogo y tecnólogo jefe con registros de las revisiones?",
        "¿El servicio mide y reporta el tiempo de entrega de resultados por tipo de estudio (urgente ≤2h, rutina ≤24h)?",
        "¿Hay sistema de segunda lectura o correlación clínico-radiológica para casos complejos u oncológicos?"
      ]
    },
    {
      "id": "img-residuos",
      "icon": "☢️",
      "name": "Residuos Especiales y Medioambiente",
      "norm": "Dec. 351/2014 · Res. 1164/2002 · IDEAM · RAEE",
      "q": [
        "¿Existe contrato vigente con empresa gestora autorizada para residuos con plata (reveladores y fijadores de Rx analógico, si aplica)?",
        "¿Los residuos de equipos digitales (cartuchos, cables, detectores dañados) se gestionan como Residuos de Aparatos Eléctricos (RAEE)?",
        "¿El material de contraste yodado o de bario vencido tiene protocolo de devolución o disposición especial según la normativa?",
        "¿Existe registro actualizado de disposición final de residuos especiales con certificados de la empresa gestora de los últimos 6 meses?",
        "¿El personal tiene capacitación específica en manejo de residuos especiales del servicio de imagenología, incluyendo los de radioactividad si aplica?"
      ]
    }
  ],
  "urgencias": [
    {
      "id": "urg-th",
      "icon": "👨‍⚕️",
      "name": "Talento Humano 24/7 y Competencias",
      "norm": "Res. 1732/2026 Est. 1 · Ley 23/1981 · RETHUS · BLS/ACLS",
      "q": [
        "¿Hay médico con presencia FÍSICA en el servicio de urgencias las 24 horas los 365 días del año, sin delegación a personal no médico?",
        "¿La enfermera profesional está presente de forma continua e ininterrumpida en urgencias en todos los turnos?",
        "¿La dotación de auxiliares de enfermería en cada turno es suficiente para la carga de pacientes, con ratio definido y documentado?",
        "¿Todo el personal asistencial de urgencias tiene tarjeta profesional vigente en RETHUS y contratos o vinculación formalizados?",
        "¿El 100% del personal de urgencias tiene certificado BLS (Basic Life Support) vigente (máximo 2 años) de institución reconocida?",
        "¿El médico jefe o coordinador de urgencias tiene entrenamiento documentado en ATLS (Trauma) o equivalente para urgencias de mediana o alta complejidad?",
        "¿Existe personal de camillero disponible en el servicio durante todos los turnos para apoyo en movilización y traslado intrahospitalario?",
        "¿El personal tiene capacitación documentada en triage, situaciones de múltiples víctimas y protocolos de alerta masiva?",
        "¿Se realizan simulacros periódicos de emergencias masivas en urgencias con registro y evaluación de desempeño del personal?",
        "¿El personal conoce el protocolo de activación del CRUE y las rutas de derivación de la red de urgencias territorial?"
      ]
    },
    {
      "id": "urg-triage",
      "icon": "🚨",
      "name": "Sistema de Clasificación por Triage",
      "norm": "Res. 1732/2026 Est. 6 · Protocolo MPS · Sistema Manchester",
      "q": [
        "¿Se aplica el protocolo de triage de 5 niveles (Manchester, MPS o equivalente) con criterios explícitos por nivel de prioridad?",
        "¿La clasificación del triage se realiza en los primeros 10 minutos desde el ingreso, con registro de la hora en la historia clínica?",
        "¿Existe área física diferenciada, señalizada y con acceso directo para el triage separada de la sala de espera general?",
        "¿Los tiempos de atención efectiva por nivel están definidos: I (inmediato), II (<15 min), III (<30 min), IV (<60 min), V (<120 min)?",
        "¿Los tiempos de espera reales son medidos periódicamente y se toman acciones cuando se incumplen los estándares?",
        "¿El área de triage cuenta con pulsioxímetro, termómetro, tensiómetro, glucómetro, escala de dolor, linterna y camilla de exploración?",
        "¿El personal de triage tiene entrenamiento certificado en el sistema utilizado con evaluación periódica de competencias?",
        "¿Existe proceso de re-triage para pacientes que permanecen en espera más del tiempo definido para su nivel de prioridad?",
        "¿El sistema de triage incluye categorías especiales para gestantes, niños y adultos mayores con criterios diferenciados?",
        "¿Los resultados del triage (nivel, hora, profesional) se registran en la historia clínica desde el primer contacto con el paciente?"
      ]
    },
    {
      "id": "urg-dotacion",
      "icon": "🏥",
      "name": "Dotación y Equipos de Emergencia",
      "norm": "Res. 1732/2026 Est. 2 · INVIMA · Dec. 4725/2005",
      "q": [
        "¿El carro de paro está completo, sellado con sello numerado, con lista de chequeo verificada y firmada en la fecha del turno en curso?",
        "¿El desfibrilador está operativo, con baterías cargadas, electrodos vigentes y revisión de funcionamiento registrada semanalmente?",
        "¿Hay fuente de oxígeno medicinal disponible (central o cilindros de respaldo) con indicador de nivel verificado al inicio de cada turno?",
        "¿El monitor de signos vitales con ECG, SpO2, ETCO2 y PANI está operativo, calibrado y con repuestos disponibles?",
        "¿El ambú (mascarilla-válvula-bolsa) en tallas adulto y pediátrico está disponible y en buen estado en el área de reanimación?",
        "¿El aspirador de secreciones está operativo con catéteres disponibles y equipo limpio para uso inmediato?",
        "¿El laringoscopio con hojas de diferentes tamaños y tubos endotraqueales de tallas 6.0 a 9.0 están disponibles y con batería cargada?",
        "¿Los medicamentos de emergencia (epinefrina 1 mg, atropina, adenosina, glucosa al 50%, bicarbonato) están en el carro de paro y vigentes?",
        "¿Las camillas de urgencias tienen colchones en buen estado, barandas funcionales y capacidad de posición Trendelenburg?",
        "¿El servicio tiene equipos de inmovilización (collarín cervical, tabla espinal, férulas) disponibles y en buen estado?"
      ]
    },
    {
      "id": "urg-bioseg",
      "icon": "🛡️",
      "name": "Bioseguridad y Control de Infecciones",
      "norm": "Res. 1732/2026 Est. 5 · OMS 5 Momentos · Precauciones Estándar",
      "estandar": "procesos_prioritarios",
      "q": [
        "¿Existe área de aislamiento o protocolo documentado para pacientes con sospecha de enfermedad transmisible de alta contagiosidad?",
        "¿El personal aplica precauciones estándar (guantes, mascarilla, gafas, bata) en TODAS las atenciones con riesgo de contacto con fluidos?",
        "¿Hay dispensadores de alcohol gel operativos en cada puesto de atención, en la entrada del servicio y en el área de triage?",
        "¿Los 5 momentos del lavado de manos OMS están señalizados y la adherencia se mide periódicamente con retroalimentación al personal?",
        "¿Los residuos peligrosos se separan desde el punto de generación en bolsas rojas (biológicos) y guardianes (cortopunzantes)?",
        "¿Las camillas y superficies de contacto se desinfectan entre cada paciente con producto de amplio espectro a dilución correcta?",
        "¿Los pacientes con sospecha de infección respiratoria reciben mascarilla desde el triage y se evalúan en área separada cuando es posible?",
        "¿El protocolo de accidente biológico está disponible en el área con insumos para lavado inmediato y reporte del evento?",
        "¿Existe protocolo de limpieza y desinfección terminal de cuartos de aislamiento o áreas de uso de pacientes con precauciones especiales?"
      ]
    },
    {
      "id": "urg-hc",
      "icon": "📄",
      "name": "Historia Clínica de Urgencias y Registros",
      "norm": "Res. 1995/1999 · Res. 1732/2026 Est. 6 · Res. 13437/1991",
      "q": [
        "¿Cada paciente tiene historia clínica abierta desde el primer contacto con identificación completa y hora de ingreso registrada?",
        "¿Las notas médicas incluyen: hora, motivo de consulta, anamnesis, examen físico, diagnóstico CIE-10, plan de manejo y firma del médico?",
        "¿Se registra el nivel de triage asignado, hora de clasificación y hora de atención efectiva en la historia clínica?",
        "¿Las notas de enfermería documentan: signos vitales, medicamentos administrados (nombre, dosis, vía, hora), procedimientos y respuesta?",
        "¿El egreso está registrado con: hora, destino (alta, hospitalización, remisión, fallecimiento), diagnóstico de egreso y condición clínica?",
        "¿Los consentimientos para procedimientos urgentes están disponibles y se diligencian cuando el estado del paciente lo permite?",
        "¿Los eventos adversos en urgencias se reportan al sistema institucional de seguridad del paciente?",
        "¿Las remisiones tienen formato completo: datos del paciente, diagnóstico, tratamiento dado, motivo, firma del médico remitente?",
        "¿Se lleva estadística mensual: número de atenciones, distribución por nivel de triage, diagnósticos más frecuentes y tiempos de atención?"
      ]
    },
    {
      "id": "urg-planta",
      "icon": "🏗️",
      "name": "Planta Física de Urgencias",
      "norm": "Res. 1732/2026 Est. 2 · NSR-10 · Res. 544/2023",
      "q": [
        "¿El área de urgencias tiene acceso directo desde el exterior con rampa para camillas y señalización visible desde la vía pública?",
        "¿La sala de reanimación/choque está equipada, señalizada y tiene dimensiones para al menos 2 operadores simultáneos?",
        "¿El área de observación tiene al menos 4 m² por cama con separación entre camillas ≥1 m y cortinas que garanticen privacidad?",
        "¿El servicio tiene sala de espera diferenciada para acompañantes con sillas suficientes, buena iluminación y ventilación adecuada?",
        "¿Existe área limpia (preparación de medicamentos) separada del área sucia (deposición de residuos, materiales contaminados)?",
        "¿Los baños de urgencias son de acceso independiente y cumplen condiciones de accesibilidad para pacientes con movilidad reducida?",
        "¿El piso es antideslizante, sin desniveles que dificulten el desplazamiento de camillas o sillas de ruedas?"
      ]
    },
    {
      "id": "urg-interdep",
      "icon": "🔗",
      "name": "Interdependencias y Red de Urgencias",
      "norm": "Res. 1732/2026 Est. 7 · Res. 544/2023 Art. 17 · CRUE",
      "estandar": "interdependencia",
      "q": [
        "¿Existe convenio activo con laboratorio clínico con capacidad de respuesta urgente (resultados en menos de 60 minutos para pruebas básicas)?",
        "¿Hay acceso garantizado a banco de sangre o servicio transfusional propio o por convenio disponible las 24 horas?",
        "¿El establecimiento tiene convenio formal vigente con IPS de mayor complejidad para referencia de pacientes que superen su capacidad?",
        "¿El protocolo de referencia está documentado con criterios, datos de contacto actualizados y formato de remisión?",
        "¿El sistema de comunicaciones (teléfono fijo, celular, radio) funciona permanentemente para coordinación con el CRUE de la región?",
        "¿Existe convenio o acceso a servicio de imágenes diagnósticas (Rx, TAC, ecografía) para apoyo en la toma de decisiones?",
        "¿El tiempo de respuesta del laboratorio para pruebas urgentes es medido y cumple el estándar definido?",
        "¿Existe registro de todas las remisiones realizadas con su desenlace (aceptada, rechazada, completada) y tiempo de traslado?"
      ]
    }
  ],
  "internacion": [
    {
      "id": "int-th",
      "icon": "👩‍⚕️",
      "name": "Talento Humano y Suficiencia",
      "norm": "Res. 1732/2026 Est. 1 · RETHUS · Res. 2278/2021",
      "q": [
        "¿Hay médico con presencia física o disponibilidad garantizada y documentada para pacientes hospitalizados las 24 horas?",
        "¿El ratio enfermera profesional-paciente cumple el estándar: máximo 1 enfermera por 8 pacientes en hospitalización general?",
        "¿Los auxiliares de enfermería están distribuidos en cada turno con ratio adecuado a la carga y nivel de dependencia de los pacientes?",
        "¿Existe jefe de enfermería o coordinadora del servicio con designación formal y funciones documentadas?",
        "¿Los especialistas que realizan interconsultas tienen tarjeta profesional con especialidad registrada en RETHUS?",
        "¿El personal médico de hospitalización tiene contratos o vinculación formal con funciones definidas en el manual de funciones?",
        "¿Existe nutricionista disponible para evaluación y soporte nutricional de pacientes con riesgo nutricional identificado?",
        "¿El personal de trabajo social está disponible para apoyo a pacientes con necesidades sociales y coordinación familiar?",
        "¿El personal recibe inducción específica al servicio de hospitalización con documentación de competencias verificadas?"
      ]
    },
    {
      "id": "int-planta",
      "icon": "🏢",
      "name": "Planta Física e Instalaciones",
      "norm": "Res. 1732/2026 Est. 2 · NSR-10 · Ley 361/1997",
      "q": [
        "¿Las habitaciones tienen superficie mínima de 7.5 m² por cama en habitación individual y 6 m² en habitación compartida?",
        "¿Cada unidad del paciente tiene toma de oxígeno medicinal empotrada, aspiración de vacío y sistema de llamado de enfermería funcional?",
        "¿Los baños son accesibles para pacientes con movilidad reducida: pasamanos, espacio de giro ≥1.5 m, ducha de nivel o silla disponible?",
        "¿Las áreas sucia y limpia están separadas físicamente: cuarto de limpieza diferente del cuarto de preparación de medicamentos?",
        "¿La iluminación permite lectura y examen físico sin encandilamiento, con control de luz nocturna para descanso del paciente?",
        "¿El sistema de ventilación garantiza mínimo 6 renovaciones de aire por hora en habitaciones generales y 12 en aislamiento?",
        "¿Los pasillos de hospitalización tienen ancho mínimo de 2.4 m para paso simultáneo de camillas y sillas de ruedas?",
        "¿Existe cuarto o habitación de aislamiento disponible con presión negativa o protocolo de aislamiento en habitación individual?",
        "¿Las camas hospitalarias tienen barandas funcionales en los cuatro lados, altura regulable y freno operativo en todas las ruedas?"
      ]
    },
    {
      "id": "int-dotacion",
      "icon": "🛏️",
      "name": "Dotación y Gestión de Equipos",
      "norm": "Res. 1732/2026 Est. 2 · Dec. 4725/2005 · Tecnovigilancia",
      "q": [
        "¿Hay al menos un carro de paro por piso o unidad, completo según lista de chequeo, sellado y con verificación diaria documentada?",
        "¿Los monitores de signos vitales están disponibles en número suficiente para los pacientes con necesidad de monitorización continua?",
        "¿Las bombas de infusión volumétricas y de jeringa tienen calibración vigente y mantenimiento preventivo al día?",
        "¿Los colchones antiescaras están disponibles para pacientes con riesgo de úlceras por presión (Braden ≤16) y en buen estado?",
        "¿La ropa de cama es suficiente para cambio diario y según necesidad, con proceso de lavado industrial que garantice desinfección?",
        "¿Los equipos de fisioterapia respiratoria (nebulizadores, incentivadores espirométricos) están disponibles y con mantenimiento al día?",
        "¿El servicio farmacéutico de piso tiene nevera con temperatura controlada para medicamentos de cadena de frío con registro diario?"
      ]
    },
    {
      "id": "int-iaas",
      "icon": "🦠",
      "name": "Prevención y Control de IAAS",
      "norm": "Res. 256/2016 · Res. 1732/2026 Est. 5 · OMS · CDC",
      "estandar": "procesos_prioritarios",
      "q": [
        "¿Existe Comité de IAAS activo con reuniones documentadas (actas, asistencia y seguimiento a planes de acción, mínimo bimestral)?",
        "¿Se realizan vigilancia epidemiológica activa y reporte de IAAS al SIVIGILA según el protocolo de vigilancia?",
        "¿La adherencia a higiene de manos (5 momentos OMS) se mide mensualmente con observación directa y retroalimentación al personal?",
        "¿Hay protocolos de bundles preventivos para: catéter venoso central, catéter urinario y ventilador mecánico?",
        "¿Los cuartos de aislamiento tienen señalización activa con tipo de precaución, EPP requerido y protocolo de visitas?",
        "¿Las tasas de IAAS se calculan mensualmente y se comparan con metas institucionales y benchmarks nacionales?",
        "¿Se realizan cultivos ambientales periódicos en áreas de alto riesgo (quirófano, UCI) con análisis de resultados?",
        "¿El protocolo de aislamiento de contacto incluye: cuarto individual o cohorte, bata y guantes antes de entrar?",
        "¿Existe protocolo de manejo de brotes con identificación, análisis epidemiológico, medidas de control y reporte a la Secretaría?"
      ]
    },
    {
      "id": "int-farmacia",
      "icon": "💊",
      "name": "Gestión de Medicamentos en Hospitalización",
      "norm": "Res. 1732/2026 Est. 3 · Res. 1403/2007 · Dec. 780/2016",
      "q": [
        "¿Existe servicio farmacéutico con Químico Farmacéutico responsable, habilitado y con tarjeta profesional vigente en RETHUS?",
        "¿Los medicamentos se almacenan con control de temperatura documentado (registro diario mínima/máxima), humedad y luz?",
        "¿El sistema de dispensación de medicamentos de alto riesgo garantiza doble verificación por dos profesionales antes de la administración?",
        "¿Se realiza conciliación de medicamentos al ingreso (historial pre-hospitalario) y al egreso (plan de medicación post-alta)?",
        "¿Los psicotrópicos y estupefacientes tienen control bajo llave, libro de registro con doble firma y conteo diario?",
        "¿Existe sistema de reporte de eventos relacionados con medicamentos (errores de prescripción, dispensación, administración)?",
        "¿Los medicamentos vencidos o con problemas de calidad se segregan inmediatamente con procedimiento documentado?",
        "¿Los medicamentos parenterales de preparación extemporánea se preparan en área con cabina de flujo laminar?"
      ]
    },
    {
      "id": "int-hc",
      "icon": "📋",
      "name": "Historia Clínica Hospitalaria y Epicrisis",
      "norm": "Res. 1995/1999 · Res. 1732/2026 Est. 6 · Res. 839/2017",
      "q": [
        "¿Cada paciente tiene historia clínica con anamnesis completa, examen físico por sistemas, diagnóstico CIE-10 y plan de manejo al ingreso?",
        "¿Las notas de evolución médica se registran al menos una vez al día con hora, hallazgos, respuesta al tratamiento y plan?",
        "¿Las notas de enfermería son completas: signos vitales numéricos, medicamentos administrados (nombre, dosis, vía, hora) y procedimientos?",
        "¿La epicrisis se elabora y firma dentro de las 24 horas del egreso con diagnóstico definitivo, resumen del tratamiento y recomendaciones?",
        "¿El plan de alta incluye: medicamentos (nombre, dosis, frecuencia, duración), citas de seguimiento y señales de alarma para urgencias?",
        "¿Las interconsultas solicitadas tienen respuesta documentada dentro del tiempo definido (<4h urgente, <24h electiva)?",
        "¿El archivo de historias clínicas activas garantiza disponibilidad inmediata durante la atención y custodia ≥20 años post-egreso?",
        "¿Los procedimientos invasivos tienen nota procedimentral firmada con descripción técnica completa y complicaciones si las hubo?"
      ]
    },
    {
      "id": "int-calidad",
      "icon": "📊",
      "name": "Indicadores y Seguridad del Paciente",
      "norm": "Res. 256/2016 · PAMEC · OMS Seguridad del Paciente",
      "q": [
        "¿El servicio mide indicadores de hospitalización: días de estancia, reingreso ≤30 días, tasa de eventos adversos, mortalidad?",
        "¿Existe comité de seguridad del paciente con análisis de eventos adversos, Análisis de Causa Raíz (ACR) y planes de acción?",
        "¿Se aplica protocolo de identificación con brazalete con nombre completo y documento desde el ingreso en TODO paciente?",
        "¿El protocolo de prevención de caídas incluye: evaluación de riesgo (Morse), cama baja, barandas arriba y llamador al alcance?",
        "¿Los pacientes con riesgo de úlcera por presión tienen plan de cambios de posición cada 2 horas documentado en enfermería?",
        "¿Existe ronda de seguridad del paciente periódica con verificación de identificación, medicamentos y dispositivos invasivos?"
      ]
    }
  ],
  "quirurgicos": [
    {
      "id": "qui-th",
      "icon": "👨‍⚕️",
      "name": "Equipo Quirúrgico y Competencias",
      "norm": "Res. 1732/2026 Est. 1 · RETHUS · Ley 23/1981",
      "q": [
        "¿El cirujano tiene tarjeta profesional vigente en RETHUS con la especialidad quirúrgica específica del procedimiento que realiza?",
        "¿El anestesiólogo tiene especialización en anestesiología y reanimación registrada en RETHUS y está físicamente presente durante TODO el procedimiento?",
        "¿La instrumentadora quirúrgica tiene título universitario en instrumentación quirúrgica con tarjeta profesional vigente en RETHUS?",
        "¿La enfermera circulante tiene formación en enfermería y entrenamiento documentado en su rol en el área quirúrgica?",
        "¿Existe coordinador o jefe de sala de cirugía con designación formal, funciones definidas y tarjeta profesional vigente?",
        "¿El personal de recuperación post-anestésica tiene entrenamiento certificado en manejo post-anestésico y complicaciones inmediatas?",
        "¿El cirujano ha realizado los procedimientos programados dentro de sus competencias verificadas y registradas?",
        "¿El equipo completo está identificado y disponible antes del inicio de la cirugía, sin sustituciones no documentadas?",
        "¿Existe protocolo de verificación de credenciales del cirujano visitante o locum antes de permitirle operar?"
      ]
    },
    {
      "id": "qui-planta",
      "icon": "🔪",
      "name": "Quirófano y Áreas de Apoyo",
      "norm": "Res. 1732/2026 Est. 2 · NSR-10 · NTC 4166",
      "q": [
        "¿El quirófano tiene superficie mínima de 36 m² con acabados lisos, sin uniones ni ranuras, lavables con desinfectantes de alto nivel?",
        "¿Los flujos separan claramente zona no restringida (cambio de ropa), semirrestringida (pasillos) y restringida (quirófano)?",
        "¿La sala de recuperación post-anestésica (URPA) tiene camilla con monitor y toma de oxígeno por cada puesto asignado?",
        "¿Existe área de preparación del paciente (pre-quirúrgico) separada físicamente del área de cirugía con privacidad?",
        "¿La iluminación del campo operatorio cumple los mínimos (40.000-100.000 lux) con lámparas cialíticas en buen estado?",
        "¿El sistema de gases médicos (O2, aire comprimido, aspiración de vacío) tiene válvulas de seguridad y alarmas visibles?",
        "¿La temperatura del quirófano se mantiene entre 18-23°C y la humedad entre 45-65% con registros verificables?",
        "¿La central de esterilización está próxima al área quirúrgica con sistema de comunicación eficiente para solicitud de material?",
        "¿Existe bodega de material quirúrgico dentro del área restringida con control de inventario y condiciones de almacenamiento?"
      ]
    },
    {
      "id": "qui-esterilizacion",
      "icon": "🧪",
      "name": "Central de Esterilización y Control",
      "norm": "Res. 1732/2026 Est. 5 · AAMI ST79 · ICONTEC 4166",
      "estandar": "procesos_prioritarios",
      "q": [
        "¿La central tiene autoclave de vapor saturado clase B con impresión o registro digital de cada ciclo (temperatura, presión, tiempo)?",
        "¿Se realiza control biológico semanal con indicador biológico (Geobacillus stearothermophilus ATCC 7953) con resultado archivado?",
        "¿Los indicadores químicos de proceso (clase 5 o 6) se incluyen dentro de los paquetes y en el exterior de cada unidad esterilizada?",
        "¿El instrumental esterilizado tiene empaques íntegros sin roturas, fecha de esterilización y fecha de vencimiento claramente visibles?",
        "¿El proceso sigue el ciclo completo: pre-limpieza → limpieza manual o ultrasónica → inspección → empaque → esterilización → almacenamiento?",
        "¿El almacenamiento del material estéril garantiza temperatura <24°C, humedad <70%, libre de polvo, en estantes cerrados con rotación PEPS?",
        "¿Los equipos tienen mantenimiento preventivo, calibración anual de manómetros y termómetros, y certificado de presión de caldera?",
        "¿Existe trazabilidad del instrumental: qué set fue esterilizado, en qué ciclo, con qué parámetros y a qué paciente fue utilizado?",
        "¿El instrumental de endoscopía flexible tiene protocolo de alto nivel de desinfección (glutaraldehído ≥20 min o equivalente) por procedimiento?"
      ]
    },
    {
      "id": "qui-consentimiento",
      "icon": "✍️",
      "name": "Consentimiento Informado y Ética",
      "norm": "Ley 23/1981 · Res. 13437/1991 · Res. 1732/2026 Est. 6",
      "q": [
        "¿Existe consentimiento informado específico para cada tipo de procedimiento quirúrgico, diferenciado del consentimiento general?",
        "¿El consentimiento describe comprensiblemente: nombre del procedimiento, objetivo, técnica resumida, riesgos frecuentes y alternativas?",
        "¿El consentimiento es firmado por el paciente o su representante ANTES de la premedicación o sedación, en plena capacidad mental?",
        "¿El cirujano firma el consentimiento como médico informante con registro del momento en que se entregó la información al paciente?",
        "¿Se obtiene consentimiento adicional para: anestesia general/regional, transfusión y uso de implantes o prótesis?",
        "¿En urgencias donde el paciente no puede firmar, el consentimiento por representante o nota médica justificada está documentada?",
        "¿Existe proceso de revocación del consentimiento documentado y el personal conoce cómo proceder ante esta situación?"
      ]
    },
    {
      "id": "qui-seguridad",
      "icon": "✅",
      "name": "Lista de Verificación OMS y Seguridad Quirúrgica",
      "norm": "OMS Cirugía Segura · Res. 1732/2026 · Res. 256/2016",
      "q": [
        "¿Se aplica la Lista de Verificación Quirúrgica OMS en los 3 momentos (Sign In, Time Out, Sign Out) en el 100% de los procedimientos?",
        "¿El sitio quirúrgico es marcado de forma indeleble con el paciente despierto cuando aplica (lateralidad, nivel vertebral)?",
        "¿El conteo de instrumentos, gasas y agujas se realiza antes del inicio, antes del cierre y al final con registro firmado?",
        "¿El Time Out incluye: identidad del paciente, procedimiento, sitio, posición, alergias conocidas, profilaxis antibiótica y disponibilidad de implantes?",
        "¿Los eventos adversos quirúrgicos (retención de cuerpos extraños, cirugía en sitio incorrecto) se reportan al sistema institucional?",
        "¿Existe protocolo de profilaxis antibiótica con antibiótico, dosis y tiempo definidos por tipo de procedimiento y nivel de contaminación?",
        "¿El tiempo de profilaxis antibiótica se controla: debe administrarse en los 60 minutos previos a la incisión?",
        "¿La prevención de tromboembolismo venoso tiene protocolo con valoración de riesgo (Caprini) y medidas de profilaxis farmacológica y mecánica?"
      ]
    },
    {
      "id": "qui-interdep",
      "icon": "🔗",
      "name": "Apoyo Clínico e Interdependencias",
      "norm": "Res. 1732/2026 Est. 7 · Res. 544/2023",
      "estandar": "interdependencia",
      "q": [
        "¿El establecimiento tiene acceso garantizado a UCI propia o por convenio activo y vigente para manejo postoperatorio de pacientes críticos?",
        "¿Hay convenio activo con banco de sangre con disponibilidad de hemocomponentes para cirugía programada y urgente?",
        "¿El laboratorio tiene respuesta urgente para apoyo intraoperatorio (gasometría, hemograma, coagulación) con tiempo ≤30 min?",
        "¿Existe protocolo de traslado para complicaciones quirúrgicas que superen la capacidad del establecimiento con IPS de destino predefinida?",
        "¿El servicio de imagenología tiene disponibilidad de arco en C o fluoroscopía para procedimientos ortopédicos o de mínima invasión?",
        "¿El servicio farmacéutico garantiza disponibilidad de medicamentos de emergencia anestésica (succinilcolina, sugammadex, dantroleno)?",
        "¿Existe intercomunicación efectiva entre sala de cirugía, URPA, laboratorio, banco de sangre e imágenes durante cirugías complejas?"
      ]
    }
  ],
  "laboratorio": [
    {
      "id": "lab-th",
      "icon": "🔬",
      "name": "Talento Humano del Laboratorio",
      "norm": "Res. 1732/2026 Est. 1 · Ley 841/2003 · RETHUS",
      "q": [
        "¿El bacteriólogo director/responsable técnico tiene título universitario y tarjeta profesional vigente en RETHUS conforme a la Ley 841/2003?",
        "¿Los auxiliares o técnicos de laboratorio tienen certificado SENA de técnico en laboratorio clínico o título de institución técnica reconocida?",
        "¿El bacteriólogo jefe firma TODOS los informes de resultados emitidos con su nombre completo y número de registro profesional?",
        "¿El personal operativo tiene carné de vacunación con Hepatitis B (esquema completo), tétanos y Varicela si no tiene historia de infección?",
        "¿Existe manual de funciones para cada cargo con responsabilidades, competencias y cadena de autoridad claramente definidas?",
        "¿El personal tiene capacitación documentada en: bioseguridad, control de calidad, manejo de muestras y procedimientos específicos?",
        "¿Hay programa de competencia del personal con evaluación periódica de habilidades técnicas por el bacteriólogo responsable?",
        "¿Existe protocolo conocido por TODO el personal para manejo de accidente biológico con insumos disponibles en el área?"
      ]
    },
    {
      "id": "lab-equipos",
      "icon": "🧫",
      "name": "Equipos y Calibración Metrológica",
      "norm": "Res. 1732/2026 Est. 2 · Dec. 4725/2005 · NTC-ISO 15189",
      "q": [
        "¿Los analizadores hematológico y de química sanguínea tienen cronograma de mantenimiento preventivo documentado y registros de cumplimiento?",
        "¿Cada equipo tiene hoja de vida individual con: número de serie, fecha de instalación, calibraciones y mantenimientos realizados?",
        "¿La centrífuga tiene control de velocidad (rpm) verificado periódicamente con tacómetro calibrado y balanceo verificado antes de cada uso?",
        "¿El microscopio tiene verificación periódica de la óptica, iluminación y ajuste del condensador con registro de mantenimiento?",
        "¿La incubadora y el baño maría tienen termómetros calibrados con registro de temperatura al inicio de jornada y al final del turno?",
        "¿Las neveras de reactivos tienen termómetros de máxima-mínima con registro DIARIO de temperatura verificado?",
        "¿Los equipos tienen registro INVIMA vigente o autorización de uso, verificable en la base de datos INVIMA de dispositivos médicos?",
        "¿Las pipetas automáticas tienen certificado de calibración metrológica vigente y se verifican contra material de referencia certificado?",
        "¿El sistema de información del laboratorio (LIS) tiene trazabilidad completa desde la solicitud hasta la entrega del resultado?"
      ]
    },
    {
      "id": "lab-calidad",
      "icon": "📊",
      "name": "Control de Calidad y PEEC",
      "norm": "Res. 1732/2026 Est. 5 · PEEC MinSalud · Westgard · NTC-ISO 15189",
      "estandar": "procesos_prioritarios",
      "q": [
        "¿El laboratorio participa ACTIVAMENTE en el Programa de Evaluación Externa de la Calidad (PEEC) del MinSalud con cronograma al día?",
        "¿Se realizan controles de calidad internos con suero control de 3 niveles (bajo, normal, alto) con cada corrida analítica o diariamente?",
        "¿Los resultados del control se grafican en carta de Levey-Jennings con análisis de tendencias y aplicación de reglas de Westgard?",
        "¿Existe procedimiento documentado para manejo de resultados fuera de rango de control: qué hacer, quién decide y cómo reportar?",
        "¿Los resultados del PEEC se analizan, comparan con el grupo par y se elaboran planes de mejoramiento ante desempeño insatisfactorio?",
        "¿El laboratorio tiene definidos y documentados los rangos de referencia para cada analito con especificación de la población de referencia?",
        "¿Se realiza correlación de métodos cuando se cambia de equipo o reactivo para verificar equivalencia antes de la implementación?",
        "¿Existe sistema de alertas para valores críticos con procedimiento de notificación inmediata al médico y registro de la comunicación?"
      ]
    },
    {
      "id": "lab-muestras",
      "icon": "🩸",
      "name": "Fase Pre-analítica y Manejo de Muestras",
      "norm": "Res. 1732/2026 Est. 5 · Manual de Procedimientos · CLSI GP33",
      "estandar": "procesos_prioritarios",
      "q": [
        "¿Existe manual de toma de muestras disponible y actualizado en el área de toma, con instrucciones para cada tipo de muestra y contenedor?",
        "¿El personal verifica la identificación del paciente (nombre + documento) y la concordancia con la solicitud ANTES de la toma?",
        "¿Las muestras se transportan en recipientes herméticos, dentro de bolsas de bioseguridad, a temperatura adecuada y en tiempo definido?",
        "¿El área de toma tiene todos los insumos de bioseguridad: guantes de diferentes tallas, mascarilla, desinfectante de piel, torundas?",
        "¿Las muestras rechazadas tienen registro con: tipo de muestra, causa del rechazo, fecha y notificación al médico solicitante?",
        "¿Existe protocolo de manejo de muestras de pacientes en aislamiento con medidas adicionales de bioseguridad en transporte y procesamiento?",
        "¿El tiempo máximo entre toma y procesamiento para cada tipo de muestra está definido y se verifica con registro de hora de recepción?",
        "¿Las órdenes médicas se verifican antes del procesamiento: nombre, cédula, pruebas, diagnóstico y datos del médico solicitante?"
      ]
    },
    {
      "id": "lab-bioseg",
      "icon": "🛡️",
      "name": "Bioseguridad y Seguridad del Personal",
      "norm": "Dec. 351/2014 · NTC-ISO 15189 · Precauciones Estándar OMS",
      "q": [
        "¿El laboratorio tiene cabina de seguridad biológica (CSB) clase II certificada con flujo laminar para muestras de riesgo biológico?",
        "¿La CSB tiene certificación de desempeño vigente (prueba NSF 49 o equivalente) realizada por empresa autorizada en el último año?",
        "¿Existe protocolo escrito de manejo de accidente biológico conocido y accesible a todo el personal, con insumos en el área?",
        "¿Los residuos biológicos (medios de cultivo, muestras procesadas) se desactivan en autoclave antes de su disposición como residuo infeccioso?",
        "¿Los guardianes para cortopunzantes no superan las tres cuartas partes de su capacidad y se descartan según el protocolo?",
        "¿Los trabajadores usan bata de manga larga, guantes, gafas de seguridad y mascarilla cuando procesan muestras biológicas?",
        "¿No se pipetea con boca, no se come, no se bebe ni se aplica cosméticos dentro del área de laboratorio?",
        "¿El personal está vacunado contra Hepatitis B con esquema completo y tiene seguimiento de anti-HBs para confirmación de inmunidad?"
      ]
    },
    {
      "id": "lab-informes",
      "icon": "📋",
      "name": "Informes, Trazabilidad y Comunicación",
      "norm": "Res. 1732/2026 Est. 6 · Res. 1995/1999 · Ley 841/2003",
      "q": [
        "¿Los informes contienen: nombre completo del paciente, documento, médico solicitante, fecha de toma, fecha de resultado, valores de referencia y firma del bacteriólogo?",
        "¿Los tiempos de entrega están definidos por tipo y urgencia (urgente ≤60 min, rutina ≤2h para básicos) y se miden periódicamente?",
        "¿El sistema de valores críticos tiene: lista de analitos y rangos, procedimiento de notificación inmediata y registro de cada comunicación?",
        "¿El sistema de información permite rastrear la trayectoria completa de la muestra: solicitud → recepción → procesamiento → resultado → entrega?",
        "¿Los resultados históricos del paciente están disponibles para comparación con resultados actuales (delta check)?",
        "¿Los resultados de exámenes especiales tienen indicación del tiempo de respuesta esperado comunicado al médico solicitante?",
        "¿Existe procedimiento para corrección de resultados erróneos emitidos: anulación documentada, nuevo informe y notificación al médico?",
        "¿La confidencialidad está garantizada: acceso solo al médico solicitante y al paciente, con restricción de acceso a terceros?"
      ]
    }
  ],
  "transporte": [
    {
      "id": "tra-vehiculo",
      "icon": "🚑",
      "name": "Vehículo, Habilitación y Condiciones Técnicas",
      "norm": "Res. 1732/2026 · Dec. 2309/2002 · Min. Transporte · SOAT",
      "q": [
        "¿El vehículo tiene resolución de habilitación vigente como ambulancia expedida por la Secretaría de Salud departamental o distrital?",
        "¿El SOAT del vehículo está vigente y cubre específicamente el transporte de pacientes como actividad principal?",
        "¿La revisión técnico-mecánica (RTM) está vigente y el conductor tiene licencia de conducción categoría C2 o superior activa?",
        "¿El vehículo tiene luces de emergencia, sirena de dos tonos y logotipo visible de \"AMBULANCIA\" en todos los laterales y parte trasera?",
        "¿El GPS o sistema de rastreo satelital funciona correctamente y está activo durante todos los traslados?",
        "¿El interior del vehículo está en condiciones de higiene verificables: pisos y paredes lavables, con desinfección terminal documentada?",
        "¿El vehículo tiene extintor de polvo ABC vigente (mínimo 2 kg) instalado en posición accesible desde el interior?",
        "¿El sistema de fijación de la camilla principal al piso está operativo con seguros de bloqueo verificados antes de cada traslado?",
        "¿El vehículo tiene capacidad de temperatura controlada (incubadora de transporte) si el servicio habilitado incluye traslados neonatales?"
      ]
    },
    {
      "id": "tra-th",
      "icon": "👩‍⚕️",
      "name": "Talento Humano por Nivel de Complejidad",
      "norm": "Res. 1732/2026 Est. 1 · RETHUS · BLS/ACLS",
      "q": [
        "¿El TAB (Traslado Asistencial Básico) cuenta con conductor más auxiliar de salud con certificado en primeros auxilios (mínimo 100 horas)?",
        "¿El TAM (Traslado Asistencial Medicalizado) tiene médico o enfermera profesional ADEMÁS del conductor, con tarjeta profesional vigente?",
        "¿El personal de TAM tiene certificación en BLS y ACLS vigente según el nivel de complejidad del servicio habilitado?",
        "¿Todo el personal tiene carné de vacunación con Hepatitis B completo y demás vacunas para riesgo biológico?",
        "¿El personal de traslado neonatal tiene entrenamiento específico en manejo de recién nacido crítico y manejo de incubadora de transporte?",
        "¿Se verifica el estado del conductor (fatiga, alcohol) antes de cada turno largo o traslado de larga distancia?",
        "¿Existe coordinador operativo del servicio disponible para consultas del personal durante traslados complejos o situaciones de emergencia?"
      ]
    },
    {
      "id": "tra-dotacion",
      "icon": "🏥",
      "name": "Dotación por Nivel y Verificación",
      "norm": "Res. 1732/2026 Est. 2 · Dec. 4725/2005 · Lista Chequeo",
      "q": [
        "¿El TAB tiene: camilla plegable, inmovilizadores, equipo básico de signos vitales (TA, SpO2, FC), botiquín de primeros auxilios?",
        "¿El TAM tiene adicionalmente: monitor desfibrilador bifásico, ventilador de transporte, bomba de infusión y set de intubación completo?",
        "¿El oxígeno está en cilindro con manómetro funcional en cantidad suficiente para el traslado más un 50% de margen adicional?",
        "¿Los equipos biomédicos del vehículo tienen mantenimiento preventivo al día con hoja de vida individual y calibración vigente?",
        "¿Los medicamentos a bordo están vigentes, almacenados a temperatura adecuada y dentro de la lista de autorización por nivel?",
        "¿La camilla principal tiene ruedas operativas con frenos funcionales, barandas laterales y cinturones de seguridad para el paciente?",
        "¿Se realiza verificación de la dotación al inicio de CADA turno con lista de chequeo firmada por el tripulante y archivada?",
        "¿El set de ventilación manual (ambú con mascarillas de diferentes tamaños) está disponible, limpio y con válvula PEEP funcional?"
      ]
    },
    {
      "id": "tra-registro",
      "icon": "📋",
      "name": "Registro de Traslados y Documentación",
      "norm": "Res. 1732/2026 Est. 6 · Res. 1995/1999",
      "q": [
        "¿Se diligencia hoja de traslado para CADA paciente con: identificación, diagnóstico de remisión, tratamiento previo, origen y destino?",
        "¿Se registran signos vitales al inicio del traslado, durante (cada 15-30 min según complejidad) y al momento de la entrega?",
        "¿La entrega del paciente está documentada con: hora, condición clínica, nombre y firma del profesional receptor?",
        "¿Los registros de traslado se conservan en el establecimiento de origen por mínimo 5 años como parte del expediente clínico?",
        "¿Los medicamentos administrados durante el traslado están registrados con nombre, dosis, vía, hora y firma del profesional?",
        "¿Existe registro de incidentes o eventos ocurridos durante el traslado con reporte al sistema de seguridad del paciente?",
        "¿Los datos de traslados se consolidan en base de datos mensual para calcular indicadores operacionales (volumen, tipo, tiempo)?"
      ]
    },
    {
      "id": "tra-comunicaciones",
      "icon": "📡",
      "name": "Comunicaciones, Operaciones y CRUE",
      "norm": "Res. 1732/2026 · CRUE · Min. Salud Red de Urgencias",
      "q": [
        "¿El vehículo tiene sistema de comunicación operativo en todo momento: radio, teléfono celular o dispositivo satelital?",
        "¿Existe protocolo documentado de activación del CRUE de la región con datos de contacto actualizados y procedimiento de solicitud?",
        "¿El personal conoce el proceso de notificación al CRUE para traslados secundarios, incluyendo información requerida y tiempos?",
        "¿La central de despacho registra la hora de salida, llegada a destino y regreso a la base de cada traslado realizado?",
        "¿Existe protocolo de comunicación durante el traslado para reporte de cambios en condición del paciente e instrucciones remotas?",
        "¿Se realiza verificación del vehículo, dotación y comunicaciones al INICIO de cada turno con lista de chequeo firmada?"
      ]
    }
  ],
  "rehabilitacion": [
    {
      "id": "reh-th",
      "icon": "🦽",
      "name": "Talento Humano en Rehabilitación",
      "norm": "Res. 1732/2026 Est. 1 · RETHUS · Ley 528/1999 · Ley 376/1997",
      "q": [
        "¿El fisioterapeuta tiene tarjeta profesional vigente en RETHUS conforme a la Ley 528/1999 y está registrado en el REPS?",
        "¿El terapeuta ocupacional tiene tarjeta profesional vigente en RETHUS según Ley 949/2005 para los servicios que presta?",
        "¿El fonoaudiólogo tiene tarjeta profesional vigente en RETHUS conforme a la Ley 376/1997 para los servicios habilitados?",
        "¿Los especialistas en rehabilitación tienen especialización registrada en RETHUS correspondiente a los procedimientos realizados?",
        "¿Los auxiliares de rehabilitación tienen formación técnica o certificado de entrenamiento específico con función definida?",
        "¿El número de profesionales es suficiente para el volumen de pacientes, con máximo de pacientes por profesional documentado?",
        "¿El personal tiene formación documentada en: manejo de paciente con discapacidad, uso de ayudas técnicas y precauciones específicas?",
        "¿Existe protocolo de atención interdisciplinaria con comunicación documentada entre fisioterapia, terapia ocupacional y fonoaudiología?"
      ]
    },
    {
      "id": "reh-planta",
      "icon": "🏃",
      "name": "Planta Física y Accesibilidad Universal",
      "norm": "Res. 1732/2026 Est. 2 · NSR-10 · Ley 361/1997 · NTC 4143",
      "q": [
        "¿El área de fisioterapia tiene mínimo 20 m² por puesto de atención permitiendo la circulación de sillas de ruedas y camillas sin obstrucción?",
        "¿Las instalaciones cumplen accesibilidad universal: rampas, pasamanos bilaterales, piso antideslizante, puertas ≥90 cm y baño adaptado?",
        "¿El piso es antideslizante, sin desniveles o bordes, resistente a la humedad y de fácil limpieza y desinfección?",
        "¿Las paredes están libres de esquinas cortantes, con recubrimiento lavable y sin elementos de riesgo para el paciente durante los ejercicios?",
        "¿Las camillas están a altura regulable (60-90 cm), en buen estado estructural y sin daños en el recubrimiento con papel protector cambiable?",
        "¿El área de hidroterapia (si aplica) tiene sistema de drenaje eficiente, piso antideslizante especial y control de temperatura del agua?",
        "¿Existe área de espera con sillas, espacio para sillas de ruedas y señalización con buenas condiciones de iluminación y ventilación?",
        "¿Las áreas de ejercicio grupal tienen espacio mínimo de 4 m² por paciente con iluminación adecuada y ventilación que garantice confort?"
      ]
    },
    {
      "id": "reh-equipos",
      "icon": "⚡",
      "name": "Equipos de Rehabilitación y Tecnovigilancia",
      "norm": "Res. 1732/2026 Est. 2 · Dec. 4725/2005 · INVIMA · Tecnovigilancia",
      "q": [
        "¿Los equipos de electroterapia (ultrasonido, TENS/NMES, láser terapéutico) tienen registros de calibración de salida de energía del último año?",
        "¿Las hojas de vida de cada equipo están actualizadas con historial de mantenimiento preventivo y correctivo documentados?",
        "¿Todos los equipos tienen registro INVIMA vigente como dispositivo médico o autorización de uso explícita del INVIMA?",
        "¿Los equipos dañados están identificados con \"NO USAR - En mantenimiento\" y retirados del área de atención?",
        "¿Los equipos de ejercicio pasivo-asistido (CPM, plataformas de vibración) tienen verificación de funcionamiento con registro periódico?",
        "¿El establecimiento aplica Tecnovigilancia: reporta al INVIMA incidentes asociados al uso de equipos de rehabilitación?",
        "¿Los accesorios de electrodo (almohadillas, cables, electrodos) se reemplazan según vida útil y se desinfectan entre pacientes?",
        "¿El equipamiento de ayudas técnicas disponible para préstamo está inventariado, limpio y en buen estado funcional?"
      ]
    },
    {
      "id": "reh-plan",
      "icon": "📋",
      "name": "Plan de Tratamiento y Seguimiento Clínico",
      "norm": "Res. 1732/2026 Est. 6 · Res. 1995/1999 · CIF (OMS)",
      "q": [
        "¿Cada paciente tiene evaluación inicial con: motivo de consulta, diagnóstico médico, diagnóstico funcional en términos de CIF y metas de rehabilitación?",
        "¿El plan de tratamiento está escrito con objetivos SMART y firmado por el profesional responsable?",
        "¿Se registra nota de evolución en CADA sesión con: descripción de la sesión, respuesta del paciente y ajustes al plan terapéutico?",
        "¿El alta está documentada con: criterios de egreso cumplidos, resultados de escalas funcionales al egreso y recomendaciones de mantenimiento?",
        "¿Se aplican escalas funcionales validadas al ingreso, a mitad del tratamiento y al egreso: Barthel, FIM, MRC, Berg, Tinetti?",
        "¿Existe comunicación documentada con el médico remitente sobre evolución, ajustes al plan y resultado del tratamiento?",
        "¿Los consentimientos para procedimientos de fisioterapia (ejercicio de alta intensidad, electroterapia en zonas específicas) están firmados?",
        "¿Existe programa de ejercicio en casa entregado por escrito al paciente con instrucciones comprensibles y verificación de comprensión?"
      ]
    },
    {
      "id": "reh-bioseg",
      "icon": "🧼",
      "name": "Bioseguridad y Control de Infecciones",
      "norm": "Res. 1732/2026 Est. 5 · Precauciones Estándar OMS",
      "estandar": "procesos_prioritarios",
      "q": [
        "¿Las camillas y superficies de contacto se desinfectan entre cada paciente con producto de espectro de acción adecuado?",
        "¿El papel protector de camilla es de un solo uso y se cambia entre cada paciente, o la cubierta de tela se lava y desinfecta entre pacientes?",
        "¿El personal usa EPP adecuado en procedimientos con riesgo de contacto con fluidos corporales: guantes, mascarilla, gafas cuando aplica?",
        "¿Los equipos en contacto directo con el paciente tienen protocolo de limpieza y desinfección documentado entre cada uso?",
        "¿El personal realiza higiene de manos antes y después de cada paciente con alcohol gel disponible en cada área de tratamiento?",
        "¿Existe protocolo específico para atención de pacientes en aislamiento con EPP requerido y desinfección post-atención?",
        "¿El agua de hidroterapia se renueva entre pacientes o tiene sistema de desinfección activa con niveles monitoreados y registrados?"
      ]
    },
    {
      "id": "reh-calidad",
      "icon": "📊",
      "name": "Indicadores y Mejoramiento Continuo",
      "norm": "Res. 256/2016 · PAMEC · CIF · OMS",
      "q": [
        "¿El servicio mide indicadores propios: efectividad (cambio en escala funcional), tasa de abandono, satisfacción del paciente?",
        "¿Se realizan auditorías periódicas de historias clínicas de rehabilitación para verificar completitud de escalas y adherencia a protocolos?",
        "¿El servicio tiene planes de mejoramiento activos con acciones concretas, responsables y fechas de cierre vinculados al PAMEC?",
        "¿Existe reunión clínica periódica del equipo para revisión de casos complejos y discusión de protocolos de tratamiento?"
      ]
    }
  ],
  "salud_mental": [
    {
      "id": "sm-th",
      "icon": "🧠",
      "name": "Equipo Interdisciplinario de Salud Mental",
      "norm": "Ley 1616/2013 · Res. 1732/2026 Est. 1 · RETHUS",
      "q": [
        "¿El psiquiatra responsable tiene especialización en psiquiatría registrada en RETHUS y tarjeta profesional vigente?",
        "¿El psicólogo clínico tiene título de psicología con tarjeta profesional vigente y formación en psicología clínica o de la salud?",
        "¿El trabajador social del equipo tiene título profesional en trabajo social con tarjeta profesional vigente en RETHUS?",
        "¿La enfermera especializada en salud mental tiene tarjeta profesional vigente y capacitación documentada en atención psiquiátrica?",
        "¿El terapeuta ocupacional tiene tarjeta profesional vigente y experiencia documentada en rehabilitación psicosocial?",
        "¿Todo el personal tiene capacitación documentada en: derechos del paciente mental (Ley 1616/2013), consentimiento informado y manejo de crisis?",
        "¿Existe médico o psiquiatra disponible para atención de crisis psiquiátricas fuera del horario habitual del servicio?",
        "¿El equipo realiza reuniones clínicas periódicas para revisión de casos, planes terapéuticos y coordinación de alta?"
      ]
    },
    {
      "id": "sm-planta",
      "icon": "🏢",
      "name": "Planta Física Segura y Terapéutica",
      "norm": "Ley 1616/2013 · Res. 1732/2026 Est. 2 · OPS/OMS Hospitales Seguros",
      "q": [
        "¿Los consultorios de salud mental garantizan privacidad visual y auditiva completa durante la atención con aislamiento acústico?",
        "¿El entorno físico de las unidades de hospitalización está libre de objetos que puedan usarse como instrumentos de autolesión?",
        "¿Los baños tienen diseño seguro: sin bisagras o accesorios que permitan colgamiento, con apertura de emergencia desde fuera?",
        "¿Las ventanas tienen mecanismos de apertura limitada que impiden la salida involuntaria de pacientes en unidades cerradas?",
        "¿Existe sala de actividades terapéuticas separada de los cuartos de descanso, con espacio para terapias grupales y de rehabilitación?",
        "¿El ambiente físico es tranquilizador y terapéutico: iluminación cálida, colores no agresivos, ruido controlado y acceso a espacios exteriores?",
        "¿Existe sala de observación directa o cuarto de alta vigilancia para pacientes en crisis aguda o con conducta autolesiva activa?",
        "¿La unidad tiene salida de emergencia diferenciada de la entrada principal con sistema de alarma ante apertura no autorizada?"
      ]
    },
    {
      "id": "sm-derechos",
      "icon": "⚖️",
      "name": "Derechos del Paciente Mental y Marco Legal",
      "norm": "Ley 1616/2013 Art. 6 · Ley 1751/2015 · CDPD-ONU",
      "q": [
        "¿Existe protocolo que garantiza el derecho del paciente a recibir información sobre diagnóstico, tratamiento y alternativas en lenguaje comprensible?",
        "¿El consentimiento informado en salud mental se obtiene con valoración previa de la capacidad mental del paciente?",
        "¿Está prohibido explícitamente y se verifica que el aislamiento y la contención física no se usan como medidas disciplinarias o punitivas?",
        "¿El establecimiento reporta a Supersalud y Secretaría de Salud TODOS los casos de contención física con justificación clínica y duración?",
        "¿Los pacientes hospitalizados tienen acceso a comunicación con su familia o representante legal en condiciones de confidencialidad?",
        "¿Existe mecanismo de PQRSF específico para el servicio con análisis de quejas relacionadas con derechos de pacientes con enfermedad mental?",
        "¿El establecimiento tiene protocolo para hospitalización involuntaria con verificación de la orden judicial o criterios médicos justificantes?",
        "¿El personal conoce y aplica el enfoque de recuperación y la filosofía de atención centrada en la persona con enfermedad mental?"
      ]
    },
    {
      "id": "sm-hc",
      "icon": "📄",
      "name": "Historia Clínica Psiquiátrica y Registros",
      "norm": "Res. 1995/1999 · Ley 1616/2013 · CIE-10/DSM-5",
      "q": [
        "¿La historia clínica incluye anamnesis completa con antecedentes psiquiátricos propios y familiares, historia de tratamientos previos y respuesta?",
        "¿El examen mental inicial está estructurado y documenta: apariencia, actitud, psicomotricidad, lenguaje, pensamiento, percepción, afecto, cognición y juicio?",
        "¿El diagnóstico está formulado con criterios del CIE-10 o DSM-5 con especificación de subtipos y gravedad cuando aplica?",
        "¿Se aplican escalas diagnósticas validadas al ingreso y seguimiento: HAM-D, BPRS, PHQ-9, YMRS, GAF?",
        "¿El plan terapéutico está documentado con: metas a corto y largo plazo, intervenciones farmacológicas, psicoterapéuticas y psicosociales?",
        "¿Las notas de evolución de psiquiatría, psicología y trabajo social están en la historia con fechas, firmas y son coherentes entre sí?",
        "¿Los resultados de evaluaciones psicológicas formales están en la historia con interpretación profesional?",
        "¿El plan de alta incluye: diagnóstico de egreso, medicamentos con dosis y duración, citas de seguimiento, señales de alarma y plan de crisis?"
      ]
    },
    {
      "id": "sm-crisis",
      "icon": "🚨",
      "name": "Manejo de Crisis y Emergencias Psiquiátricas",
      "norm": "Ley 1616/2013 Art. 22 · Res. 1732/2026 · Guías Clínicas MSPS",
      "q": [
        "¿Existe protocolo escrito para manejo de crisis psiquiátrica aguda con: algoritmo de decisión, criterios de hospitalización y derivación a urgencias?",
        "¿El personal tiene entrenamiento certificado en técnicas de des-escalada verbal y manejo no violento de la agresión en salud mental?",
        "¿Está disponible medicación para sedación de urgencia (haloperidol, risperidona, diazepam, lorazepam) con autorización médica y protocolo de uso?",
        "¿Se realiza evaluación de riesgo suicida en TODA consulta de salud mental con escala validada (Columbia SSRS, SAFE-T) y se registra en HC?",
        "¿El protocolo de manejo de conducta suicida incluye: plan de seguridad, restricción de medios letales, compromiso del paciente y seguimiento?",
        "¿Existe protocolo de contención mecánica para agitación extrema: indicaciones, técnica, tiempo máximo, monitoreo y registro obligatorio?",
        "¿El personal conoce el código de respuesta a emergencia psiquiátrica con roles definidos para cada miembro del equipo?",
        "¿Existe enlace y protocolo coordinado con urgencias para traslado inmediato de pacientes en crisis que superen la capacidad del servicio?"
      ]
    },
    {
      "id": "sm-rehab",
      "icon": "🌱",
      "name": "Rehabilitación Psicosocial e Integración",
      "norm": "Ley 1616/2013 Art. 8 · OMS Mental Health Action Plan 2013-2030",
      "q": [
        "¿Existe programa de rehabilitación psicosocial con actividades grupales documentadas: psicoeducación, habilidades sociales, terapia ocupacional?",
        "¿La familia o cuidador recibe psicoeducación formal sobre la enfermedad, el tratamiento, señales de alarma y estrategias de apoyo en casa?",
        "¿Hay seguimiento post-egreso con citas programadas de control ambulatorio en la primera semana y al mes para pacientes de alto riesgo?",
        "¿Se mide la funcionalidad del paciente al inicio y al final de cada episodio con escala GAF, WHODAS 2.0 u otra validada?",
        "¿El programa de rehabilitación contempla apoyo para la reinserción laboral, educativa y social del paciente con trastorno mental grave?",
        "¿Existe articulación con servicios comunitarios de salud mental para la continuidad del tratamiento post-alta?",
        "¿El plan de rehabilitación considera las barreras del entorno social y económico del paciente con estrategias para abordarlas?"
      ]
    }
  ],
  "odontologia": [
    {
      "id": "odo-th",
      "icon": "🦷",
      "name": "Talento Humano Odontológico",
      "norm": "Res. 1732/2026 Est. 1 · Ley 35/1989 · RETHUS · Ley 711/2001",
      "q": [
        "¿El odontólogo general tiene tarjeta profesional vigente en RETHUS conforme a la Ley 35/1989?",
        "¿Los especialistas tienen especialización registrada en RETHUS para los procedimientos específicos que realizan (ortodoncia, endodoncia, periodoncia, cirugía, odontopediatría)?",
        "¿El auxiliar de odontología tiene certificado vigente de auxiliar de consultorio odontológico de institución técnica reconocida conforme a la Ley 711/2001?",
        "¿El personal tiene carné de vacunación con Hepatitis B (3 dosis) completo y vigente como requisito para trabajar en el consultorio?",
        "¿Existe manual de funciones para cada cargo con responsabilidades del auxiliar diferenciadas claramente de las del odontólogo?",
        "¿El personal tiene capacitación documentada en: bioseguridad odontológica, manejo de residuos RESPEL y accidente biológico en los últimos 12 meses?",
        "¿El odontólogo tiene actualización documentada en el protocolo de emergencias médicas en consultorio dental en los últimos 2 años?",
        "¿El odontólogo conoce y aplica las normas éticas de la profesión en cuanto a consentimiento informado y relación odontólogo-paciente?"
      ]
    },
    {
      "id": "odo-dotacion",
      "icon": "🪥",
      "name": "Unidad Odontológica y Equipos",
      "norm": "Res. 1732/2026 Est. 2 · Dec. 4725/2005 · INVIMA · Res. 4445/1996",
      "q": [
        "¿Cada consultorio tiene unidad completa (sillón dental regulable, escupidera funcional, lámpara de luz fría, jeringa triple) en buen estado?",
        "¿El compresor dental es libre de aceite (oil-free) o tiene filtros de aceite y humedad certificados con cambio según indicaciones del fabricante?",
        "¿El equipo de rayos X intraoral tiene registro INVIMA vigente y el odontólogo operador tiene dosímetro personal con lectura mensual registrada?",
        "¿Las piezas de mano de alta y baja velocidad se esterilizan en autoclave clase B después de CADA paciente sin excepción?",
        "¿Los equipos de rayos X tienen blindaje plomado verificado, señalización de radiación y el operador se ubica a distancia segura o detrás de barrera?",
        "¿La lámpara de fotopolimerización tiene intensidad de luz verificada periódicamente con radiómetro, con registro de las mediciones?",
        "¿El equipo de ultrasonido para detartraje tiene punta en buen estado sin fisuras y el equipo tiene mantenimiento preventivo al día?",
        "¿Los equipos tienen hoja de vida individual con registro de mantenimiento y el registro INVIMA vigente o autorización de uso?",
        "¿El kit de emergencias del consultorio incluye: epinefrina 1:1000, vasodilatadores, glucosa, aspirina, jeringas y protocolo de uso?"
      ]
    },
    {
      "id": "odo-esterilizacion",
      "icon": "♻️",
      "name": "Esterilización y Reprocesamiento de Instrumental",
      "norm": "Res. 1732/2026 Est. 5 · AAMI ST79 · CDC Esterilización Dental",
      "estandar": "procesos_prioritarios",
      "q": [
        "¿El consultorio tiene autoclave de vapor saturado clase B con impresión de registro de cada ciclo (temperatura, presión, tiempo, resultado)?",
        "¿Se realizan controles biológicos semanales con indicador biológico (Geobacillus stearothermophilus) con resultado archivado por mínimo 1 año?",
        "¿Los indicadores químicos de proceso (tipo 5 o 6) se incluyen dentro de CADA paquete esterilizado y se revisan antes del uso?",
        "¿El instrumental se somete al ciclo completo: pre-limpieza inmediata → limpieza → inspección → secado → empaque → esterilización?",
        "¿Los empaques tienen: fecha de esterilización, fecha de vencimiento de esterilidad, número de ciclo e iniciales del responsable?",
        "¿El almacenamiento del instrumental estéril garantiza temperatura <24°C, humedad <70%, estantes cerrados y protección contra daño del empaque?",
        "¿El instrumental de un solo uso (agujas, carpules, eyectores, fresas de uso único) se descarta sin excepción después de cada paciente?",
        "¿Existe registro de cada carga esterilizada con: contenido, fecha, ciclo, parámetros y resultado del indicador interno y biológico?",
        "¿El manejo de cuerpos cortantes (fresas, limas de endodoncia) se realiza con guardián al lado de la unidad para descarte seguro?"
      ]
    },
    {
      "id": "odo-bioseg",
      "icon": "🛡️",
      "name": "Bioseguridad Odontológica Integral",
      "norm": "Res. 1732/2026 Est. 5 · Dec. 351/2014 · Precauciones Estándar OMS",
      "estandar": "procesos_prioritarios",
      "q": [
        "¿El profesional usa en CADA atención: guantes de nitrilo o látex, mascarilla N95/FFP2 o quirúrgica, gafas protectoras o pantalla facial y bata de manga larga?",
        "¿El protocolo de lavado de manos clínico (6 pasos OMS, mínimo 40 segundos) se aplica antes de ponerse guantes y después de quitarlos?",
        "¿Los guardianes para agujas dentales y cortopunzantes están disponibles AL LADO de la unidad y se reemplazan sin superar el 75% de capacidad?",
        "¿La superficie de la unidad (sillón, lámpara, jeringa triple, mangos) se cubre con barreras de protección (plástico) que se cambian entre cada paciente?",
        "¿Los residuos RESPEL se segregan correctamente: cortopunzantes en guardián rígido, tejidos (dientes) en bolsa roja, amalgama en recipiente especial?",
        "¿Los dientes extraídos se manejan como residuo anatomopatológico en bolsa roja con contrato de gestión específico para disposición final?",
        "¿La amalgama residual y residuos de amalgama tienen recipiente especial y contrato de gestión con empresa autorizada?",
        "¿Existe protocolo de manejo de aerosoles: uso de dique de goma, succión de alta potencia y ventilación adecuada del consultorio?",
        "¿El establecimiento tiene protocolo de accidente biológico (pinchazo, salpicadura) con: lavado inmediato, reporte al jefe, valoración médica y seguimiento?"
      ]
    },
    {
      "id": "odo-hc",
      "icon": "📋",
      "name": "Historia Clínica Odontológica y Documentación",
      "norm": "Res. 1995/1999 · Res. 1732/2026 Est. 6 · Ley 35/1989",
      "q": [
        "¿Cada paciente tiene historia clínica odontológica con odontograma actualizado desde la primera consulta y actualizado en cada cambio significativo?",
        "¿El consentimiento informado para cada procedimiento (extracción, endodoncia, cirugía, blanqueamiento) especifica: diagnóstico, procedimiento, riesgos, alternativas y cuidados post?",
        "¿El plan de tratamiento está registrado con: procedimientos a realizar, secuencia lógica y firma del paciente aceptando el plan?",
        "¿Las notas de evolución por sesión describen: procedimiento realizado, materiales usados (con lote y fecha de vencimiento), anestesia aplicada y condición al finalizar?",
        "¿Los registros de radiografías incluyen: tipo de radiografía, fecha, interpretación por el odontólogo y vinculación al caso clínico?",
        "¿Existe registro de alergias del paciente (lidocaína, latex, penicilina) con alerta visible en la portada de la historia clínica?",
        "¿Las historias clínicas se conservan por mínimo 20 años post-última atención con acceso restringido y custodia documentada?",
        "¿Los cambios al tratamiento (modificaciones del plan, complicaciones, derivaciones) están documentados con justificación clínica?"
      ]
    },
    {
      "id": "odo-calidad",
      "icon": "📊",
      "name": "Indicadores y Mejoramiento del Consultorio",
      "norm": "Res. 256/2016 · PAMEC · Res. 1732/2026 Est. 6",
      "q": [
        "¿El consultorio mide indicadores propios: tasa de accidentes biológicos, controles biológicos fallidos, satisfacción del usuario?",
        "¿Existe revisión periódica del protocolo de esterilización con acciones de mejoramiento ante controles biológicos positivos?",
        "¿Se realizan auditorías de historias clínicas para verificar completitud del odontograma, consentimientos y notas de evolución?",
        "¿El consultorio tiene plan de mejoramiento activo vinculado al PAMEC de la institución o a la autoevaluación del sistema de gestión?"
      ]
    }
  ],
  "consulta_externa": [
    {
      "id": "ce-talento",
      "icon": "👨‍⚕️",
      "name": "Talento Humano — Consulta Externa",
      "norm": "Res. 1732/2026 Est. 1 · Perfiles TH consulta externa",
      "q": [
        "¿Todo el personal profesional que realiza consulta tiene tarjeta profesional vigente y sin sanción disciplinaria activa?",
        "¿Los médicos especialistas tienen certificado de especialización registrado ante el Ministerio de Salud?",
        "¿Se lleva registro actualizado de TH habilitado con nombre, profesión, tarjeta y horario de prestación?",
        "¿El personal que atiende poblaciones especiales (niños, adulto mayor, discapacitados) tiene entrenamiento documentado?",
        "¿Hay médico de cabecera o coordinador disponible en el horario de prestación del servicio de consulta externa?",
        "¿Se verifica anualmente la vigencia de tarjetas profesionales y se documentan los resultados?"
      ]
    },
    {
      "id": "ce-infraestructura",
      "icon": "🏢",
      "name": "Infraestructura y Consultorios",
      "norm": "Res. 1732/2026 Est. 2 · Criterios físicos consulta externa",
      "q": [
        "¿Cada consultorio tiene área mínima de 9 m², con puerta con seguro y privacidad visual y auditiva adecuada?",
        "¿Los consultorios cuentan con lavamanos de pedal o codo, jabón antiséptico y toallas desechables dentro del espacio?",
        "¿La iluminación y ventilación del consultorio cumple los estándares de habitabilidad definidos en el manual de habilitación?",
        "¿Las rutas de acceso al servicio son accesibles para personas en silla de ruedas, con bastón o movilidad reducida?",
        "¿Existe sala de espera diferenciada con capacidad adecuada a la demanda, con sillas suficientes y señalización clara?",
        "¿Los baños para usuarios son accesibles, con adecuada señalización de género y acceso para discapacidad?"
      ]
    },
    {
      "id": "ce-dotacion",
      "icon": "🩺",
      "name": "Dotación y Equipos",
      "norm": "Res. 1732/2026 Est. 3 · Dotación consultorios · Decreto 4725/2005",
      "q": [
        "¿Cada consultorio dispone de camilla de examen, tensiómetro calibrado, estetoscopio, termómetro y linterna clínica?",
        "¿Los equipos médicos tienen hoja de vida, mantenimiento preventivo vigente y calibración al día?",
        "¿Los consultorios especializados tienen el equipamiento específico exigido para la especialidad (ej: oftalmoscopio, otoscopio, espirómetro)?",
        "¿Se dispone de glucómetro calibrado y oxímetro de pulso disponibles en el área de consulta externa?",
        "¿El instrumental médico-quirúrgico menor tiene proceso documentado de esterilización y empaque sellado?"
      ]
    },
    {
      "id": "ce-procesos",
      "icon": "📋",
      "name": "Procesos Asistenciales",
      "norm": "Res. 1732/2026 Est. 6 · Guías de práctica clínica MINSALUD",
      "q": [
        "¿Existen guías de práctica clínica adoptadas para las 10 condiciones de mayor demanda del servicio de consulta externa?",
        "¿Los protocolos de referencia y contrarreferencia están documentados y son conocidos por todo el personal?",
        "¿El proceso de asignación de citas garantiza oportunidad según los tiempos máximos de espera definidos por el MSPS?",
        "¿Se realiza verificación de derechos del paciente (afiliación SGSSS) antes o en el momento de la consulta?",
        "¿Existe proceso para gestión de paciente crónico con citas programadas, seguimiento y control de tratamiento?",
        "¿Se aplican listas de chequeo o protocolos de seguridad del paciente específicos para consulta externa?"
      ]
    },
    {
      "id": "ce-hc",
      "icon": "📁",
      "name": "Historia Clínica y Registros",
      "norm": "Res. 1995/1999 · Res. 1732/2026 Est. 6 · Ley 23/1981",
      "q": [
        "¿Cada consulta genera historia clínica con anamnesis, examen físico, diagnóstico (CIE-10), plan y firma del profesional?",
        "¿El sistema de historia clínica (física o electrónica) garantiza confidencialidad, acceso restringido y respaldo?",
        "¿Los tiempos de conservación de historias clínicas cumplen los 20 años establecidos en la Res. 1995/1999?",
        "¿Los registros de consulta incluyen consentimiento informado cuando aplica y están correctamente archivados?",
        "¿La historia clínica electrónica, si existe, está certificada y cumple los estándares de interoperabilidad del MSPS?"
      ]
    }
  ],
  "cuidado_intensivo": [
    {
      "id": "uci-talento",
      "icon": "👨‍⚕️",
      "name": "Talento Humano UCI",
      "norm": "Res. 1732/2026 · Medicina crítica · Res. 544/2023 · Telexperticia UCI",
      "q": [
        "¿El servicio cuenta con médico intensivista (especialista en medicina crítica) disponible 24/7 con certificación vigente?",
        "¿La razón enfermera-paciente en UCI cumple mínimo 1:2 en UCI adultos y 1:1 en UCI neonatal?",
        "¿El personal de enfermería de la UCI tiene entrenamiento documentado en cuidado intensivo y manejo de ventilador?",
        "¿Hay terapeuta respiratorio disponible en el horario de mayor demanda, con certificación técnica o profesional?",
        "¿Existe protocolo para uso de telexperticia sincrónica con intensivista cuando aplique (Res. 544/2023)?",
        "Si la UCI está en un municipio con dispersión geográfica: ¿tiene disponible telexperticia sincrónica como mecanismo de apoyo clínico especializado, según exige el Plan de Adecuación Progresiva de la Res. 1732/2026?",
        "¿Se realiza inducción formal a todo el personal nuevo que ingresa a UCI con evaluación de competencias documentada?"
      ]
    },
    {
      "id": "uci-infraestructura",
      "icon": "🏥",
      "name": "Infraestructura UCI",
      "norm": "Res. 1732/2026 Est. 2 · Requisitos físicos UCI · NSR-10",
      "q": [
        "¿Cada cama de UCI tiene área mínima de 12 m² con espacio para acceso lateral del equipo asistencial?",
        "¿Las instalaciones de gases medicinales (oxígeno, aire medicinal, vacío) son independientes y cuentan con alarmas?",
        "¿Existe aislamiento especial (presión negativa o positiva) disponible para pacientes en riesgo infeccioso o inmunodeprimidos?",
        "¿Las puertas de la UCI son de doble hoja, con acceso controlado y facilidad para ingreso de equipos de gran tamaño?",
        "¿La central de enfermería de la UCI permite visibilidad directa o por monitor de todas las camas?",
        "¿El área cuenta con generador eléctrico de respaldo con tiempo de autonomía certificado y prueba periódica documentada?"
      ]
    },
    {
      "id": "uci-dotacion",
      "icon": "🫀",
      "name": "Dotación y Tecnología",
      "norm": "Res. 1732/2026 Est. 3 · Decreto 4725/2005 · UCI",
      "q": [
        "¿Cada cama de UCI tiene monitor multiparamétrico (ECG, SpO2, NIBP, temperatura, capnografía) calibrado?",
        "¿Hay ventilador mecánico por cama de UCI con número de ventiladores igual al de camas habilitadas?",
        "¿La UCI dispone de equipos de infusión (bombas de jeringa e infusión), desfibrilador con cardioversión sincronizada?",
        "¿Los equipos de la UCI tienen mantenimiento preventivo documentado y calibración vigente según Decreto 4725/2005?",
        "¿Hay carro de paro equipado dentro de la UCI con medicamentos verificados mensualmente con firma responsable?",
        "¿Se dispone de ecógrafo portátil o acceso garantizado para ecocardiografía a pie de cama dentro de la UCI?"
      ]
    },
    {
      "id": "uci-procesos",
      "icon": "📋",
      "name": "Procesos Clínicos y Seguridad",
      "norm": "Res. 1732/2026 Est. 6 · Res. 2003/2014 · Bundles UCI",
      "q": [
        "¿Existe protocolo de prevención de infecciones asociadas al cuidado (IAAS): NAVM, ITS, bacteriuria, bacteriemia?",
        "¿Se implementan bundles de prevención (higiene de manos, baño diario con clorhexidina, elevación cabecera 30°)?",
        "¿Hay protocolo de destete de ventilación mecánica con criterios clínicos documentados y evaluación diaria?",
        "¿Se realiza visita médica multidisciplinaria diaria con registro en historia clínica de objetivos del día?",
        "¿Existe sistema de alerta temprana o score de deterioro para detectar precozmente el empeoramiento del paciente?",
        "¿Los indicadores de la UCI (mortalidad, estancia, infecciones, días ventilación) se miden mensualmente y se revisan en comité?"
      ]
    },
    {
      "id": "uci-neo",
      "icon": "👶",
      "name": "UCI Neonatal (UCIN) — Requisitos Específicos",
      "norm": "Res. 1732/2026 · UCIN · Neonatología · Res. 1732/2026",
      "q": [
        "¿La UCIN tiene neonatólogo disponible 24/7 o con tiempo de respuesta documentado inferior a 15 minutos?",
        "¿Cada incubadora o cuna de calor radiante tiene monitor neonatal con alarmas de SpO2, FC y temperatura?",
        "¿Existe protocolo canguro (método madre canguro) documentado con criterios de inicio, seguimiento y egreso?",
        "¿Se garantiza banco de leche materna o alternativa nutricional con trazabilidad de donantes y receptores?",
        "¿El personal de UCIN tiene entrenamiento en reanimación neonatal avanzada (programa NRP o equivalente)?",
        "¿Existe protocolo de prevención de retinopatía del prematuro con control oftalmológico programado para RN <32 semanas?"
      ]
    }
  ],
  "obstetricia": [
    {
      "id": "obs-talento",
      "icon": "👩‍⚕️",
      "name": "Talento Humano — Obstetricia y Parto",
      "norm": "Res. 1732/2026 · Atención del parto · Res. 3280/2018",
      "q": [
        "¿El equipo de atención del parto incluye médico obstetra o médico con entrenamiento documentado en atención del parto?",
        "¿Hay enfermera o auxiliar de enfermería con capacitación en asistencia al parto disponible en el horario de atención?",
        "¿El servicio cuenta con neonatólogo o médico con competencia en reanimación neonatal disponible 24/7?",
        "¿El personal tiene actualización documentada en prevención de hemorragia posparto y eclampsia cada 2 años?",
        "¿Existe anestesiólogo disponible o en tiempo de respuesta definido y documentado para cesárea de emergencia?"
      ]
    },
    {
      "id": "obs-infraestructura",
      "icon": "🏥",
      "name": "Infraestructura Sala de Partos",
      "norm": "Res. 1732/2026 Est. 2 · Sala de partos · NSR-10",
      "q": [
        "¿La sala de partos tiene área mínima de 20 m² por sala, con lavamanos de pedal y sistema de gases medicinales?",
        "¿Existe sala de preparto o admisión obstétrica diferenciada de la sala de alumbramiento?",
        "¿Se dispone de quirófano para cesárea de emergencia en tiempo de acceso máximo de 30 minutos?",
        "¿Las instalaciones de la sala de partos permiten atención a la madre y reanimación del recién nacido en el mismo espacio?",
        "¿El área de puerperio tiene camas diferenciadas para madre e hijo, con baño accesible y privacidad garantizada?"
      ]
    },
    {
      "id": "obs-dotacion",
      "icon": "🩺",
      "name": "Dotación Sala de Partos",
      "norm": "Res. 1732/2026 Est. 3 · Equipos obstetricia",
      "q": [
        "¿La sala de partos tiene mesa obstétrica, cuna de calor radiante, oxímetro neonatal y balanza neonatal calibrada?",
        "¿Se dispone de kit de reanimación neonatal completo: ambú neonatal, laringoscopio neonatal, tubos endotraqueales, aspirador?",
        "¿Hay acceso a oxitocina, sulfato de magnesio y otros medicamentos de emergencia obstétrica con verificación periódica?",
        "¿El cardiotocógrafo (monitor fetal) está disponible, calibrado y con mantenimiento vigente?",
        "¿Se dispone de ecógrafo obstétrico para evaluación del bienestar fetal intraparto?"
      ]
    },
    {
      "id": "obs-procesos",
      "icon": "📋",
      "name": "Procesos — Atención del Parto Seguro",
      "norm": "Res. 1732/2026 Est. 6 · OMS atención parto · Res. 3280/2018",
      "q": [
        "¿Se implementa la lista de verificación de seguridad del parto de la OMS adaptada o equivalente en cada parto?",
        "¿Existe protocolo para prevención y manejo de hemorragia posparto (AMTSL: manejo activo del tercer período)?",
        "¿Se aplica protocolo de eclampsia/preeclampsia con criterios de hospitalización, manejo con sulfato de magnesio y traslado?",
        "¿El partograma es diligenciado en todos los trabajos de parto con registro de progresión y toma de decisiones?",
        "¿Existe protocolo de apego precoz, lactancia materna exclusiva y contacto piel a piel documentado y aplicado?",
        "¿Los indicadores de atención del parto (cesáreas, hemorragia posparto, mortalidad perinatal) se miden y revisan periódicamente?"
      ]
    }
  ],
  "banco_sangre": [
    {
      "id": "bs-talento",
      "icon": "🔬",
      "name": "Talento Humano — Banco de Sangre",
      "norm": "Res. 1732/2026 · Res. 1285/2010 · Decreto 1571/1993",
      "q": [
        "¿El banco de sangre cuenta con bacteriólogo o médico especialista en medicina transfusional como responsable técnico?",
        "¿El personal del banco de sangre tiene capacitación documentada en biosseguridad y manejo de material biológico?",
        "¿Existe manual de funciones actualizado para cada cargo en el banco de sangre con capacitaciones periódicas?",
        "¿El personal tiene vacunación completa contra hepatitis B y se conservan los registros de inmunización?"
      ]
    },
    {
      "id": "bs-infraestructura",
      "icon": "🏢",
      "name": "Infraestructura y Condiciones Físicas",
      "norm": "Res. 1732/2026 · Res. 1285/2010 · Banco de sangre",
      "q": [
        "¿El banco de sangre tiene áreas diferenciadas para recepción de donantes, extracción, procesamiento y almacenamiento?",
        "¿Las unidades de sangre se almacenan en refrigeradores específicos para sangre con alarma de temperatura y registro continuo?",
        "¿El área de trabajo tiene sistema de presión negativa o ventilación controlada para prevención de contaminación cruzada?",
        "¿Las instalaciones eléctricas incluyen UPS o generador para garantizar cadena de frío en fallo del suministro eléctrico?"
      ]
    },
    {
      "id": "bs-dotacion",
      "icon": "🩸",
      "name": "Dotación y Equipos",
      "norm": "Res. 1732/2026 · Decreto 4725/2005 · Banco de sangre",
      "q": [
        "¿Los equipos de centrifugación, procesamiento y fraccionamiento de sangre tienen mantenimiento preventivo al día?",
        "¿Se dispone de analizadores para tipificación ABO/Rh, pruebas de compatibilidad y tamización infecciosa (VIH, HBsAg, HCV, sífilis)?",
        "¿Los equipos de la cadena de frío (refrigeradores, congeladores, cavas de transporte) tienen calibración y registro de temperatura continuo?",
        "¿El banco cuenta con irradiadores para hemocomponentes cuando atiende pacientes inmunodeprimidos, o tiene acceso garantizado?"
      ]
    },
    {
      "id": "bs-procesos",
      "icon": "📋",
      "name": "Procesos — Selección y Trazabilidad",
      "norm": "Res. 1732/2026 · Res. 1285/2010 · Manual Técnico AABB",
      "q": [
        "¿Existe protocolo documentado para selección del donante con criterios de inclusión/exclusión actualizados?",
        "¿Cada unidad de sangre tiene trazabilidad completa: donante → extracción → procesamiento → tamización → distribución → receptor?",
        "¿Se realizan pruebas serológicas para VIH 1/2, HBsAg, anti-HCV, VDRL y Chagas en el 100% de las unidades?",
        "¿Existe protocolo de reacciones transfusionales con sistema de reporte, investigación y seguimiento del receptor?",
        "¿Los hemocomponentes vencidos o rechazados tienen procedimiento documentado de destrucción y registro?",
        "¿Se participa en programa de control externo de calidad para pruebas de tamización y serología?"
      ]
    }
  ],
  "oncologia": [
    {
      "id": "onco-talento",
      "icon": "👨‍⚕️",
      "name": "Talento Humano — Oncología",
      "norm": "Res. 1732/2026 · Guías IETS oncología · Res. 1383/2013",
      "q": [
        "¿El servicio oncológico cuenta con oncólogo clínico o hematólogo con registro de especialista ante el MSPS?",
        "¿El personal de enfermería oncológica tiene entrenamiento certificado en preparación y administración de citotóxicos?",
        "¿Hay farmacéutico con competencia en oncología responsable de la preparación de quimioterapia en campana de flujo laminar?",
        "¿Se realiza comité oncológico multidisciplinario periódico con participación de cirugía, radioterapia, patología y nutrición?",
        "¿El personal tiene capacitación en manejo de derrames de citotóxicos y uso de equipo de protección personal específico?"
      ]
    },
    {
      "id": "onco-infraestructura",
      "icon": "🏥",
      "name": "Infraestructura — Servicio de Oncología",
      "norm": "Res. 1732/2026 Est. 2 · ISOPP estándares oncología",
      "q": [
        "¿La sala de quimioterapia tiene sillas reclinables o camas individuales con privacidad visual entre pacientes?",
        "¿La farmacia oncológica dispone de campana de flujo laminar clase II tipo B2 o cabina de seguridad biológica certificada?",
        "¿Existe área de aislamiento disponible para pacientes neutropénicos o en riesgo de infección grave?",
        "¿El servicio cuenta con sistema de ventilación que evita recirculación de aire en el área de preparación de citotóxicos?"
      ]
    },
    {
      "id": "onco-dotacion",
      "icon": "💊",
      "name": "Dotación y Medicamentos",
      "norm": "Res. 1732/2026 Est. 3 · INVIMA · Farmacias oncológicas",
      "q": [
        "¿Los citotóxicos se preparan en campana de flujo laminar con EPP completo (mascarilla N95, guantes dobles, gafas, bata)?",
        "¿Existe kit de derrame de citotóxicos disponible en el área de preparación y administración?",
        "¿Los medicamentos oncológicos tienen sistema de doble verificación antes de la administración al paciente?",
        "¿Se dispone de antídotos o medicamentos para manejo de extravasación de citotóxicos disponibles en el servicio?",
        "¿Los residuos de citotóxicos tienen disposición diferenciada como residuo peligroso según Decreto 351/2014?"
      ]
    },
    {
      "id": "onco-procesos",
      "icon": "📋",
      "name": "Procesos Clínicos y Seguridad",
      "norm": "Res. 1732/2026 Est. 6 · Guías IETS · OMS lista verificación oncológica",
      "q": [
        "¿Cada paciente oncológico tiene plan terapéutico documentado y aprobado por comité tumores o médico tratante?",
        "¿Se aplica protocolo de verificación de identidad del paciente y correcta prescripción antes de cada ciclo de quimioterapia?",
        "¿Existen protocolos de manejo de toxicidades por quimioterapia: neutropenia febril, náuseas, mucositis, extravasación?",
        "¿Se miden indicadores de calidad en oncología: oportunidad de inicio de tratamiento, toxicidades grado 3-4, hospitalizaciones no programadas?",
        "¿El consentimiento informado para quimioterapia es específico, incluye riesgos y alternativas, y está firmado por el paciente?"
      ]
    }
  ],
  "hemodialisis": [
    {
      "id": "hemo-talento",
      "icon": "👨‍⚕️",
      "name": "Talento Humano — Hemodiálisis",
      "norm": "Res. 1732/2026 · Nefrología · Manual Habilitación Hemodiálisis",
      "q": [
        "¿El servicio de hemodiálisis tiene nefrólogo responsable con especialización registrada ante el MSPS?",
        "¿La razón personal de enfermería-paciente cumple el estándar definido (mínimo 1 enfermera por cada 4 pacientes en diálisis)?",
        "¿El personal de enfermería y auxiliares tiene capacitación documentada en manejo de accesos vasculares y máquinas de diálisis?",
        "¿Existe protocolo de atención de emergencias durante la sesión de hemodiálisis con personal entrenado disponible?"
      ]
    },
    {
      "id": "hemo-infraestructura",
      "icon": "🏥",
      "name": "Infraestructura — Unidad de Hemodiálisis",
      "norm": "Res. 1732/2026 Est. 2 · KDIGO · Manual habilitación",
      "q": [
        "¿Cada estación de hemodiálisis tiene el espacio mínimo requerido para la máquina, la camilla y el acceso lateral del personal?",
        "¿El sistema de tratamiento de agua (ósmosis inversa) tiene monitoreo continuo de calidad y pureza del agua de diálisis?",
        "¿Existe área de aislamiento para pacientes con VIH, HCV activo u otras infecciones transmisibles, con máquinas dedicadas?",
        "¿El sistema de drenaje de la unidad de hemodiálisis cumple la normativa sanitaria para efluentes de establecimientos de salud?"
      ]
    },
    {
      "id": "hemo-dotacion",
      "icon": "🔧",
      "name": "Dotación y Equipos",
      "norm": "Res. 1732/2026 Est. 3 · Decreto 4725/2005 · Hemodiálisis",
      "q": [
        "¿Cada máquina de hemodiálisis tiene hoja de vida, mantenimiento preventivo vigente y calificación de instalación y funcionamiento?",
        "¿Los monitores de agua (conductividad, temperatura, alarmas) del sistema de tratamiento están calibrados y en buen estado?",
        "¿Se dispone de carro de paro equipado para emergencias durante la sesión con desfibrilador de fácil acceso?",
        "¿Las máquinas de diálisis tienen desinfección y purga documentada entre cada sesión y después de paciente con infección?"
      ]
    },
    {
      "id": "hemo-procesos",
      "icon": "📋",
      "name": "Procesos Clínicos y Control",
      "norm": "Res. 1732/2026 Est. 6 · KDIGO 2012 · Manual diálisis MSPS",
      "q": [
        "¿Cada paciente tiene prescripción de diálisis individualizada con parámetros (Kt/V, flujo, dializador, anticoagulación)?",
        "¿Se realiza evaluación mensual de adecuación de diálisis (Kt/V) con registro en historia clínica?",
        "¿Existe protocolo de vigilancia de acceso vascular (fístula, catéter) con evaluación periódica y registro de complicaciones?",
        "¿El agua de diálisis tiene control microbiológico y de endotoxinas mensual con valores dentro de los límites AAMI/ISO?",
        "¿Se monitorean indicadores de calidad: hospitalización, mortalidad, adecuación de diálisis, complicaciones de acceso?"
      ]
    }
  ],
  "farmacia": [
    {
      "id": "far-talento",
      "icon": "💊",
      "name": "Talento Humano — Servicio Farmacéutico",
      "norm": "Res. 1403/2007 · Decreto 780/2016 · Res. 1732/2026",
      "q": [
        "¿El servicio farmacéutico cuenta con regente de farmacia o químico farmacéutico como director técnico?",
        "¿La razón de regentes o químicos farmacéuticos por auxiliares cumple la normativa según complejidad del servicio?",
        "¿Todo el personal del servicio farmacéutico tiene capacitación documentada en buenas prácticas de almacenamiento y dispensación?",
        "¿El químico farmacéutico o regente asume formalmente la dirección técnica con acta de posesión o contrato vigente?"
      ]
    },
    {
      "id": "far-infraestructura",
      "icon": "🏢",
      "name": "Infraestructura — Área Farmacéutica",
      "norm": "Res. 1403/2007 · Res. 1732/2026 Est. 2 · Farmacias",
      "q": [
        "¿El servicio farmacéutico tiene áreas diferenciadas para recepción, almacenamiento, dispensación y distribución de medicamentos?",
        "¿Las condiciones de temperatura y humedad del área de almacenamiento son monitoreadas y registradas diariamente?",
        "¿Existe área de refrigeración con termómetro calibrado para medicamentos que requieren cadena de frío?",
        "¿El acceso al área de dispensación está restringido al personal autorizado y los medicamentos están bajo llave?"
      ]
    },
    {
      "id": "far-dotacion",
      "icon": "🔬",
      "name": "Dotación y Tecnología",
      "norm": "Res. 1403/2007 · Decreto 780/2016 · Buenas prácticas farmacéuticas",
      "q": [
        "¿Se dispone de sistema de información para la gestión de inventarios con control de fechas de vencimiento?",
        "¿El área de preparación de mezclas (si aplica) tiene campana de flujo laminar, equipos de medición y condiciones de asepsia?",
        "¿Se cuenta con refrigerador exclusivo para medicamentos con registro gráfico de temperatura y alarma?",
        "¿El servicio tiene acceso a información farmacológica actualizada: vademécum, interacciones, ajuste por función renal?"
      ]
    },
    {
      "id": "far-procesos",
      "icon": "📋",
      "name": "Procesos — Dispensación y Farmacovigilancia",
      "norm": "Res. 1403/2007 · INVIMA · Farmacovigilancia · Res. 2003/2014",
      "q": [
        "¿Existe sistema de doble verificación antes de dispensar medicamentos de alto riesgo (anticoagulantes, insulinas, citotóxicos)?",
        "¿Se realiza conciliación de medicamentos en ingresos, egresos y traslados de pacientes con registro en historia clínica?",
        "¿El servicio participa en el programa de farmacovigilancia con reporte de eventos adversos a medicamentos al INVIMA?",
        "¿Hay proceso documentado para manejo de medicamentos vencidos, deteriorados o retirados del mercado?",
        "¿Se realizan auditorías periódicas de uso de antibióticos como parte del programa de uso racional de antimicrobianos?",
        "¿Los pacientes reciben educación sobre sus medicamentos: indicación, dosis, horario, efectos adversos a vigilar?"
      ]
    }
  ],
  "vacunacion": [
    {
      "id": "vac-talento",
      "icon": "💉",
      "name": "Talento Humano — Vacunación",
      "norm": "Res. 1732/2026 · PAI MSPS · Decreto 1011/2006",
      "q": [
        "¿El personal que aplica vacunas tiene entrenamiento documentado en el Programa Ampliado de Inmunización (PAI)?",
        "¿Se realiza capacitación periódica al personal en manejo de cadena de frío, reconstitución de vacunas y manejo de eventos adversos?",
        "¿Existe personal entrenado en manejo de reacciones adversas inmediatas post-vacunación (anafilaxia)?",
        "¿El responsable del programa de vacunación tiene designación formal y asiste a las reuniones convocadas por la Secretaría de Salud?"
      ]
    },
    {
      "id": "vac-cadena-frio",
      "icon": "❄️",
      "name": "Cadena de Frío — Conservación de Vacunas",
      "norm": "Res. 1732/2026 · Manual PAI MSPS · Cadena de frío",
      "q": [
        "¿Las vacunas se almacenan en refrigerador exclusivo para vacunas con temperatura entre +2°C y +8°C?",
        "¿La temperatura del refrigerador de vacunas se registra dos veces al día (mañana y tarde) con firma del responsable?",
        "¿Existe plan de contingencia documentado para fallo de la cadena de frío con alternativas de conservación de emergencia?",
        "¿Las vacunas se organizan según la norma del PAI: más antiguas adelante, separadas por tipo, con identificación clara?",
        "¿Se registran las alertas o fallas de temperatura con su análisis de impacto y decisión documentada sobre el lote afectado?"
      ]
    },
    {
      "id": "vac-procesos",
      "icon": "📋",
      "name": "Procesos de Vacunación Segura",
      "norm": "Res. 1732/2026 Est. 6 · PAI MSPS · Res. 2184/2019",
      "q": [
        "¿Existe protocolo de verificación de identidad y carnet de vacunación antes de aplicar cualquier biológico?",
        "¿El proceso de reconstitución de vacunas se realiza según la guía del fabricante y se documenta hora y lote?",
        "¿Se aplica lista de verificación de contraindicaciones antes de cada vacuna con registro en historia clínica?",
        "¿El usuario espera mínimo 20 minutos post-vacunación en el servicio para observar reacciones adversas inmediatas?",
        "¿Los eventos adversos post-vacunación se registran, analizan y reportan al SIVIGILA según la normativa?",
        "¿Los indicadores de cobertura se reportan a la Secretaría de Salud en los formatos y tiempos establecidos?"
      ]
    }
  ],
  "proteccion_especifica": [
    {
      "id": "pyp-deteccion",
      "icon": "🔍",
      "name": "Detección Temprana de Alteraciones",
      "norm": "Res. 1732/2026 · Res. 3280/2018",
      "q": [
        "¿La IPS realiza consulta de detección temprana de alteraciones del crecimiento y desarrollo en menores de 10 años, con talla, peso e hitos de desarrollo registrados según la Res. 3280/2018?",
        "¿Existe consulta de detección temprana de alteraciones del desarrollo del joven (10 a 29 años) con valoración integral documentada?",
        "¿Se realiza detección temprana de alteraciones del embarazo (control prenatal) según la Ruta Integral de Atención en Salud Materno-Perinatal?",
        "¿La IPS realiza consulta de detección temprana de alteraciones en el adulto mayor de 45 años (tamización cardiovascular y metabólica) con seguimiento documentado?",
        "¿Se realiza tamización de agudeza visual con remisión a optometría u oftalmología cuando hay hallazgo positivo?"
      ]
    },
    {
      "id": "pyp-cancer",
      "icon": "🎗️",
      "name": "Tamización de Cáncer de Cuello Uterino y Seno",
      "norm": "Res. 1732/2026 · Res. 3280/2018",
      "q": [
        "¿La IPS realiza tamización de cáncer de cuello uterino (citología, prueba de VPH o inspección visual según protocolo vigente) con seguimiento documentado de resultados positivos?",
        "¿Se realiza tamización de cáncer de seno (examen clínico y/o remisión a mamografía según edad y riesgo) con ruta de remisión documentada ante hallazgo sospechoso?",
        "¿Los resultados de tamización se reportan al sistema de información correspondiente (SISPRO / Cuenta de Alto Costo) según la normativa vigente?"
      ]
    },
    {
      "id": "pyp-planificacion",
      "icon": "👨‍👩‍👧",
      "name": "Planificación Familiar y Salud Bucal Preventiva",
      "norm": "Res. 1732/2026 · Res. 3280/2018",
      "q": [
        "¿La IPS ofrece atención en planificación familiar para hombres y mujeres, con consejería y oferta de métodos anticonceptivos según la Res. 3280/2018?",
        "¿Existe atención preventiva en salud bucal (educación en higiene oral, control de placa bacteriana, aplicación de flúor o sellantes) diferenciada de la consulta de odontología general?"
      ]
    }
  ],
  "telemedicina": [
    {
      "id": "tele-modalidades",
      "icon": "📡",
      "name": "Modalidades de Telemedicina (Res. 1732/2026)",
      "norm": "Res. 1732/2026",
      "q": [
        "¿La IPS identificó cuáles de las 4 modalidades de telemedicina que define la Res. 1732/2026 (Teleconsulta, Telexperticia, Teleconcepto, Telemonitoreo) presta actualmente, aunque sea de forma informal (ej. por videollamada sin registro)?",
        { "texto": "¿Cada modalidad de telemedicina que presta la IPS está registrada de forma independiente en el REPS?", "obligatorio": true },
        { "texto": "¿La plataforma tecnológica usada garantiza cifrado extremo a extremo y autenticación (no se usa WhatsApp ni videollamada sin cifrar) para proteger la privacidad del paciente (Ley 1581/2012)?", "obligatorio": true },
        "¿Existe protocolo documentado que defina cómo se activa una referencia urgente cuando el profesional detecta una emergencia durante la atención por telemedicina?"
      ]
    },
    {
      "id": "tele-talento",
      "icon": "💻",
      "name": "Talento Humano — Telemedicina",
      "norm": "Res. 2654/2019 · Res. 1317/2021 · Res. 1732/2026",
      "q": [
        "¿El médico que actúa como prestador de referencia en telemedicina tiene tarjeta profesional vigente y contrato activo?",
        "¿El personal de salud que usa telemedicina tiene capacitación documentada en el uso de la plataforma tecnológica?",
        "¿Existe responsable del programa de telemedicina con funciones definidas en manual de funciones o contrato?",
        "¿Los profesionales de salud en telemedicina conocen y aplican los criterios de derivación a consulta presencial?"
      ]
    },
    {
      "id": "tele-tecnologia",
      "icon": "🖥️",
      "name": "Plataforma Tecnológica y Conectividad",
      "norm": "Res. 2654/2019 Art. 4 · Res. 1317/2021 · Estándares telemedicina",
      "q": [
        "¿La plataforma de telemedicina permite consulta síncrona o asíncrona según el tipo habilitado (interactiva/no interactiva)?",
        "¿La conexión a internet garantiza la calidad mínima para transmisión de imágenes diagnósticas y comunicación en tiempo real?",
        "¿La plataforma tiene protocolos de seguridad de la información (cifrado, autenticación, control de acceso) documentados?",
        "¿Existe plan de contingencia ante falla tecnológica con protocolo de derivación a consulta presencial urgente?",
        "¿La plataforma permite registro de la consulta, generación de historia clínica y formulación electrónica cuando aplica?"
      ]
    },
    {
      "id": "tele-procesos",
      "icon": "📋",
      "name": "Procesos Clínicos — Telemedicina",
      "norm": "Res. 2654/2019 · Res. 1732/2026 · Manual telemedicina MSPS",
      "q": [
        "¿Existe protocolo que define qué patologías y condiciones son aptas para atención por telemedicina y cuáles requieren presencial?",
        "¿El consentimiento informado del paciente para la consulta por telemedicina está documentado antes de cada sesión?",
        "¿La historia clínica de telemedicina es equivalente en contenido a la presencial: anamnesis, diagnóstico, plan, firma?",
        "¿Existe protocolo de referencia urgente para pacientes que durante la teleconsulta presenten criterios de atención inmediata presencial?",
        "¿Se monitorean indicadores de telemedicina: número de consultas, patologías, satisfacción del usuario, referencias derivadas?",
        "¿Los registros de las teleconsultas están disponibles para auditoría y tienen el mismo tiempo de conservación que la HC tradicional?"
      ]
    },
    {
      "id": "tele-privacidad",
      "icon": "🔒",
      "name": "Privacidad y Protección de Datos",
      "norm": "Ley 1581/2012 · Res. 2654/2019 · HABEAS DATA salud",
      "q": [
        "¿La plataforma de telemedicina cumple la Ley 1581/2012 de protección de datos personales en salud?",
        "¿Los datos de las teleconsultas se almacenan en servidores con ubicación conocida y con medidas de seguridad certificadas?",
        "¿Existe política de privacidad específica para telemedicina que el paciente conoce y acepta antes de la consulta?",
        "¿El acceso a grabaciones de teleconsultas (si aplica) está restringido y controlado con registro de auditoría de accesos?"
      ]
    }
  ],
  "esterilizacion": [
    {
      "id": "est-talento",
      "icon": "🧪",
      "name": "Talento Humano — Central de Esterilización",
      "norm": "Res. 1732/2026 · Decreto 4725/2005 · ANSI/AAMI ST79",
      "q": [
        "¿El personal de la central de esterilización tiene capacitación documentada en procesamiento de dispositivos médicos (PDM)?",
        "¿Existe responsable técnico de la central con funciones definidas y capacitación específica en esterilización?",
        "¿El personal conoce y aplica correctamente los protocolos de limpieza, desinfección y esterilización para cada tipo de material?",
        "¿Se realizan evaluaciones periódicas de competencia del personal en los procesos de esterilización con registro?"
      ]
    },
    {
      "id": "est-infraestructura",
      "icon": "🏢",
      "name": "Infraestructura — Central de Esterilización",
      "norm": "Res. 1732/2026 Est. 2 · Zona limpia/sucia · Flujo unidireccional",
      "q": [
        "¿La central de esterilización tiene zonas diferenciadas: zona sucia (recepción y lavado), zona limpia (empaque) y zona estéril (almacenamiento)?",
        "¿El flujo del material sigue sentido único (sucia → limpia → estéril) sin cruces entre material contaminado y estéril?",
        "¿Las superficies de las áreas de esterilización son de fácil limpieza, sin grietas ni uniones que acumulen suciedad?",
        "¿El almacenamiento del material estéril es en estantería cerrada, con temperatura controlada y lejos de pisos y paredes?"
      ]
    },
    {
      "id": "est-dotacion",
      "icon": "🔧",
      "name": "Equipos y Control del Proceso",
      "norm": "Res. 1732/2026 Est. 3 · Decreto 4725/2005 · ANSI/AAMI",
      "q": [
        "¿Los autoclaves tienen calificación de instalación, operación y desempeño (IQ/OQ/PQ) documentada y vigente?",
        "¿Se realizan pruebas de eficacia del proceso (Bowie-Dick, indicadores biológicos, químicos) en cada ciclo y se registran los resultados?",
        "¿Los termómetros, manómetros y demás instrumentos de control de los autoclaves tienen calibración vigente?",
        "¿Los empaques de material estéril tienen indicador químico externo e interno visible para validar la exposición al proceso?",
        "¿Existe sistema de trazabilidad del material estéril: qué se esterilizó, cuándo, en qué ciclo y a qué paciente se usó?"
      ]
    },
    {
      "id": "est-procesos",
      "icon": "📋",
      "name": "Procesos de Esterilización y Trazabilidad",
      "norm": "Res. 1732/2026 Est. 6 · ANSI/AAMI ST79 · Decreto 351/2014",
      "q": [
        "¿Existe protocolo documentado para cada tipo de material (metálico, plástico, textil) con el método y parámetros de esterilización?",
        "¿Los artículos de uso único (single use) tienen proceso documentado para su resterilización si aplica, o se descartan correctamente?",
        "¿El material esterilizado tiene etiqueta con fecha de esterilización, número de ciclo, fecha de vencimiento y responsable?",
        "¿Se conservan los registros de ciclos de esterilización por el tiempo establecido para trazabilidad de incidentes?",
        "¿Existe programa de mantenimiento preventivo documentado para autoclaves y demás equipos de la central?"
      ]
    }
  ],
  "trasplante": [
    {
      "id": "trsp-talento",
      "icon": "🏥",
      "name": "Talento Humano — Trasplante de Órganos y Tejidos",
      "norm": "Res. 1732/2026 · Ley 9/1979 · Decreto 2493/2004 · Red de Donación",
      "q": [
        "¿El equipo de trasplante incluye médico especialista en trasplante con certificación reconocida y registrada?",
        "¿Existe coordinador de trasplantes con funciones definidas y capacitación específica en gestión de donación?",
        "¿El personal de UCI tiene entrenamiento en diagnóstico y mantenimiento del potencial donante en muerte encefálica?",
        "¿El equipo de trasplante participa activamente en la Red de Donación y Trasplante del MSPS?"
      ]
    },
    {
      "id": "trsp-procesos",
      "icon": "📋",
      "name": "Procesos — Donación y Lista de Espera",
      "norm": "Decreto 2493/2004 · Res. 1732/2026 · Red de donación MSPS",
      "q": [
        "¿Existe protocolo documentado para detección, notificación y mantenimiento del potencial donante en muerte encefálica?",
        "¿Se notifica de manera oportuna a la Red de Donación y Trasplante cada potencial donante detectado en la institución?",
        "¿La gestión de la lista de espera de receptores cumple los criterios de asignación de órganos establecidos por el MSPS?",
        "¿Existen protocolos de inmunosupresión post-trasplante con seguimiento definido y control de adherencia al tratamiento?",
        "¿Se registran y reportan los resultados de los trasplantes (supervivencia injerto, supervivencia paciente) a la Red Nacional?"
      ]
    },
    {
      "id": "trsp-tejidos",
      "icon": "🔬",
      "name": "Banco de Tejidos (si aplica)",
      "norm": "Res. 1732/2026 · Decreto 2493/2004 · Red de donación tejidos",
      "q": [
        "¿El banco de tejidos tiene habilitación vigente ante la Red de Donación y Trasplante del MSPS?",
        "¿Los tejidos almacenados (córneas, piel, hueso) tienen control de calidad, trazabilidad del donante y tiempo de vida útil?",
        "¿Existe comunicación documentada y continua con las IPS trasplantadoras para gestión oportuna de tejidos (Res. 544/2023)?",
        "¿El banco dispone de sistema de almacenamiento con temperatura controlada y alarmas para cada tipo de tejido?"
      ]
    }
  ]
};

export const SEGMENT_KEYS = Object.keys(areasDB) as string[];
