/**
 * NormaLis — AI Proxy + Areas API (Cloudflare Worker) v4.2
 *
 * Endpoints:
 *   POST /         → proxy al chat LLM (Cloudflare Workers AI)
 *   GET  /api/areas → devuelve areasDB + segInfo (requiere Firebase ID token)
 *
 * Bindings requeridos:
 *   [ai]  → habilitar en wrangler.toml (Cloudflare Workers AI, sin key externa)
 */

const CF_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8';
const FIREBASE_PROJECT_ID = 'normalis-5587d';
const FIREBASE_API_KEY    = 'AIzaSyArUb9rzv6lHeunq_bPgbbe0vmekysx5R4';

const ALLOWED_ORIGINS = [
  'https://normalis.co',
  'https://www.normalis.co',
  'https://fjfc1984-bit.github.io',
  'https://app.normalis.co',
];

// ── Sentry error reporting (lightweight, no npm needed) ─────────────────────
// Usa la Sentry Store API directamente via fetch. Sin dependencias.
// Configurar: npx wrangler secret put SENTRY_DSN
// Formato DSN: https://<key>@<host>/api/<project>/
async function sentryCapture(error, ctx, env) {
  const dsn = env && env.SENTRY_DSN;
  if (!dsn) return; // Silencioso si no configurado
  try {
    const u = new URL(dsn);
    const key = u.username;
    const project = u.pathname.replace(/^\/|\/$/, '').split('/').pop();
    const storeUrl = `${u.protocol}//${u.host}/api/${project}/store/`;
    const payload = {
      event_id: crypto.randomUUID().replace(/-/g, ''),
      timestamp: new Date().toISOString(),
      platform: 'javascript',
      logger: 'cloudflare-worker',
      level: 'error',
      exception: {
        values: [{
          type: error && error.name ? error.name : 'Error',
          value: error && error.message ? error.message : String(error),
        }],
      },
      tags: { endpoint: (ctx && ctx.endpoint) || 'unknown' },
      extra: (ctx && ctx.extra) || {},
      environment: 'production',
      release: 'normalis-worker@1.0',
    };
    await fetch(storeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${key}, sentry_client=normalis-worker/1.0`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Nunca dejar que el reporting rompa el worker
  }
}



// ═══════════════════════════════════════════════════════════════
// DATOS PROTEGIDOS — NormaLis Secreto Empresarial
// Base de datos de preguntas de auditoría (Res. 3100/2019 · 465/2025)
// Solo accesible a usuarios autenticados con token Firebase válido
// ═══════════════════════════════════════════════════════════════
const AREAS_DB={
  general:[
    {id:'infraestructura',icon:'🏗️',name:'Infraestructura Física',norm:'Res. 3100/2019 Est. 2 · Res. 544/2023 · NSR-10',q:[
      '¿Todas las áreas asistenciales tienen pisos, paredes y techos de material liso, lavable, no poroso y resistente a productos de limpieza y desinfección?',
      '¿La iluminación artificial en áreas clínicas supera los 300 lux en superficies de trabajo y existen respaldos de energía (UPS/planta eléctrica) para zonas críticas?',
      '¿La ventilación de áreas asistenciales garantiza renovaciones de aire adecuadas, diferenciando zonas de presión positiva y negativa donde corresponde?',
      '¿Las áreas asistenciales garantizan privacidad visual y auditiva del paciente durante la atención mediante puerta con seguro, biombo o separación física?',
      '¿La señalización de rutas de evacuación, puntos de encuentro y salidas de emergencia es visible, fotoluminiscente y cubre todos los espacios del establecimiento?',
      '¿Los baños destinados a usuarios están dotados de jabón líquido, papel higiénico, toallas o secador de manos, y cuentan con mantenimiento documentado?',
      '¿Las instalaciones eléctricas tienen concepto técnico vigente emitido por profesional calificado RETIE y los tableros están señalizados e identificados?',
      '¿El establecimiento construido antes de 2010 con servicios críticos (urgencias, cirugía, UCI) cuenta con estudio de vulnerabilidad sísmica y plan de reforzamiento NSR-10?',
      '¿Las áreas de almacenamiento de insumos y medicamentos están separadas de áreas de atención, con temperatura, humedad y luz controladas?',
      '¿Existe un plan de mantenimiento locativo documentado con cronograma, responsables y registros de intervenciones de los últimos 12 meses?',
      '¿Los consultorios donde se atienden menores de 5 años cumplen los requisitos de infraestructura vigentes? (Res. 465/2025 · Art. 19: ya NO se requiere barrera física fija o móvil entre área de entrevista y examen — verificar que el consultorio no tenga restricciones de otro tipo que afecten la habilitación)'
    ]},
    {id:'accesibilidad',icon:'♿',name:'Accesibilidad y Derechos del Paciente',norm:'Res. 3100/2019 Est. 2 · Ley 1618/2013 · Res. 13437/1991 · Dec. 1011/2006',q:[
      '¿El establecimiento garantiza acceso físico sin barreras para personas con discapacidad: rampas con inclinación ≤8%, pasillos ≥1.2 m y baño adaptado?',
      '¿La carta de derechos y deberes del paciente (Res. 13437/1991) está publicada en lugar visible al ingreso y disponible en versión accesible?',
      '¿Existe un mecanismo activo de PQRSF con buzón físico o canal digital visible, con protocolo de respuesta en los plazos legales (15 días hábiles)?',
      '¿El personal conoce y aplica el procedimiento institucional para recibir, registrar y dar trámite a las PQRSF de los usuarios?',
      '¿Se garantiza atención sin discriminación por género, origen étnico, orientación sexual, condición migratoria, discapacidad o capacidad de pago?',
      '¿El establecimiento tiene protocolo de intérprete o mediación cultural para comunidades indígenas, afrodescendientes o pacientes extranjeros?',
      '¿Existe protocolo de atención prioritaria para adultos mayores, gestantes, niños menores de 5 años y personas con discapacidad en todos los servicios?',
      '¿Los pacientes reciben información comprensible sobre diagnóstico, tratamiento, alternativas y pronóstico antes de iniciar cualquier intervención?'
    ]},
    {id:'talento',icon:'👨‍⚕️',name:'Talento Humano',norm:'Res. 3100/2019 Est. 1 · RETHUS · Ley 23/1981 · Res. 2278/2021',q:[
      '¿Todos los profesionales de la salud que prestan servicios tienen tarjeta profesional vigente verificable en el RETHUS del Ministerio de Salud?',
      '¿Los médicos especialistas tienen su especialización reconocida y registrada en RETHUS correspondiente a los procedimientos que realizan?',
      '¿Existe un manual de funciones documentado para cada cargo asistencial y administrativo, con perfil de competencias y responsabilidades específicas?',
      '¿Los vínculos laborales o contractuales de todo el personal asistencial están formalizados mediante contratos escritos firmados y vigentes?',
      '¿El Director Técnico está designado formalmente y tiene inscripción vigente como responsable de la prestación ante la Secretaría de Salud?',
      '¿Existe programa documentado de inducción para el personal nuevo con verificación de competencias antes del inicio de actividades asistenciales?',
      '¿El establecimiento tiene plan de capacitación continua con registros de asistencia del último año: BLS/ACLS, bioseguridad y normativa vigente?',
      '¿El personal asistencial cuenta con carné de vacunación al día: Hepatitis B (esquema completo), tétanos y demás vacunas para riesgo biológico?',
      '¿Se realiza evaluación del desempeño del personal asistencial al menos una vez al año con registros y planes de mejoramiento documentados?',
      '¿Existe protocolo para manejo de accidente de trabajo con material biológico (pinchazo, salpicadura) conocido por TODO el personal y con insumos disponibles?'
    ]},
    {id:'dotacion',icon:'🩺',name:'Dotación y Gestión de Equipos',norm:'Res. 3100/2019 Est. 3 · Decreto 4725/2005 · INVIMA · Res. 4816/2008',q:[
      '¿Todos los equipos biomédicos en uso tienen hoja de vida individual con registros actualizados de mantenimiento preventivo y correctivo firmados?',
      '¿Los dispositivos médicos en uso tienen registro INVIMA vigente o están en la lista de dispositivos exentos verificable en la base INVIMA?',
      '¿Los equipos de medición clínica (tensiómetro, báscula, termómetro, glucómetro) tienen certificado de calibración metrológica vigente del último año?',
      '¿Existe cronograma de mantenimiento preventivo anual de equipos biomédicos con fechas, responsables y registros de cumplimiento efectivo?',
      '¿El establecimiento aplica Tecnovigilancia: reporta al INVIMA los incidentes o eventos adversos asociados a dispositivos médicos (Res. 4816/2008)?',
      '¿Los equipos en mal estado están claramente identificados con etiqueta de "NO USAR - En mantenimiento" y retirados del área asistencial?',
      '¿Existe recipiente para cortopunzantes (guardián) en cada área asistencial, sin superar el 75% de su capacidad y sin riesgo de volcamiento?',
      '¿Los equipos de emergencia (DEA, oxígeno, ambú) están disponibles, operativos y con revisión documentada en la última semana?',
      '¿Hay inventario actualizado de equipos biomédicos con número de serie, proveedor, fecha de adquisición y vida útil estimada?'
    ]},
    {id:'procesos',icon:'📋',name:'Procesos Prioritarios y Protocolos',norm:'Res. 3100/2019 Est. 5 · Res. 256/2016 · Dec. 1011/2006 · OMS Seguridad Paciente',q:[
      '¿Existe Manual de Bioseguridad actualizado en los últimos 12 meses, firmado por el responsable, con evidencia de socialización a todo el personal?',
      '¿Hay protocolos escritos de atención para todos los servicios habilitados, basados en evidencia actualizada y accesibles al personal en el área?',
      '¿El protocolo de referencia y contrarreferencia está documentado con IPS de mayor complejidad de la red territorial y es conocido por el personal?',
      '¿Se aplica consentimiento informado previo a procedimientos invasivos con formato específico por procedimiento, debidamente archivado en la HC?',
      '¿El establecimiento tiene sistema documentado de reporte, análisis de causa raíz y seguimiento de eventos adversos e incidentes de seguridad?',
      '¿Existe protocolo de identificación correcta del paciente con al menos dos identificadores antes de cualquier procedimiento?',
      '¿Hay protocolo de comunicación efectiva entre turnos (entrega de turno SBAR o equivalente) documentado y aplicado en todos los servicios?',
      '¿El establecimiento tiene protocolo de caídas con evaluación de riesgo al ingreso (Escala Morse), intervenciones preventivas y registro de caídas?',
      '¿Existe protocolo de úlceras por presión con escala de valoración (Braden o Norton) para pacientes en cama y registro de lesiones al ingreso?',
      '¿El plan de emergencias y desastres está actualizado, con simulacros en los últimos 12 meses y evidencia de participación del personal?',
      '¿Si el establecimiento tiene cámaras de videovigilancia que graban procedimientos de salud, existe documento escrito de autorización firmado por el paciente/representante Y por el profesional responsable, y dicho documento hace parte de la Historia Clínica? (Res. 465/2025 · Art. 19 · Sentencia T-144/2024)',
      '¿Si el establecimiento realiza vacunación fuera del servicio habilitado específicamente para ello, documenta en Procesos Prioritarios: garantía de cadena de frío, procedimiento para obtención de biológicos y registros clínicos requeridos? (Res. 465/2025 · Art. 7)',
      '¿La autoevaluación de las condiciones de habilitación está documentada y actualizada conforme a los 4 momentos obligatorios: previa inscripción, 4° año de vigencia, previa renovación anual, y previa al reporte de novedades? (Res. 465/2025 · Art. 5)'
    ]},
    {id:'historiaclinica',icon:'📄',name:'Historia Clínica y Registros',norm:'Res. 1995/1999 · Res. 3100/2019 Est. 6 · Res. 839/2017 · Ley 1581/2012',q:[
      '¿Las historias clínicas cumplen componentes mínimos: identificación, motivo de consulta, anamnesis, examen físico, diagnóstico CIE-10, plan de manejo y evolución firmada?',
      '¿El sistema de custodia garantiza confidencialidad, acceso restringido e integridad, con conservación mínima de 20 años desde la última atención?',
      '¿Si se usa historia clínica electrónica, el sistema genera log de auditoría con fecha, hora y usuario de cada acceso o modificación, con respaldo periódico?',
      '¿Existe protocolo de cierre del establecimiento con destinación del archivo de historias clínicas a entidad competente según Res. 839/2017?',
      '¿El establecimiento tiene autorización de tratamiento de datos personales de salud actualizada y el personal conoce la Ley 1581/2012 (habeas data)?',
      '¿Los registros de notas de enfermería son completos, firmados con nombre y matrícula, distinguibles claramente de las notas médicas?',
      '¿Las epicrisis o resúmenes de alta se elaboran dentro de las 24 horas del egreso con diagnóstico definitivo, tratamiento y recomendaciones?',
      '¿El acceso a historias clínicas tiene registro de préstamo y devolución, garantizando que solo personal autorizado accede a los expedientes?'
    ]},
    {id:'residuos',icon:'🗑️',name:'Gestión de Residuos Hospitalarios (PGIRH)',norm:'Decreto 351/2014 · Res. 1164/2002 · Res. 3100/2019 Est. 5',q:[
      '¿Existen recipientes diferenciados según Dec. 351/2014: rojo (infeccioso/biológico), negro (ordinario no aprovechable), verde (biodegradable), blanco o gris (reciclable) y guardián rígido (cortopunzantes) en cada área asistencial?',
      '¿El contrato con empresa gestora de RESPEL autorizada está vigente con manifiestos de disposición final de las últimas tres recolecciones?',
      '¿El Plan de Gestión Integral de Residuos Hospitalarios (PGIRH) está actualizado, registrado ante la autoridad ambiental y con cronograma activo?',
      '¿El personal tiene capacitación documentada en segregación de residuos hospitalarios en los últimos 12 meses con registro de asistencia?',
      '¿El área de almacenamiento temporal de RESPEL cumple: techo, piso lavable, ventilación, señalización y acceso restringido?',
      '¿Los residuos anatomopatológicos tienen manejo diferenciado con contrato específico para su tratamiento y disposición final?',
      '¿Se llevan registros mensuales de peso/volumen de residuos generados por tipo con reporte a la autoridad ambiental según la norma?',
      '¿El personal de aseo usa EPP completo (guantes industriales, delantal, botas, gafas) para la recolección y transporte de residuos peligrosos?'
    ]},
    {id:'insumos',icon:'📦',name:'Medicamentos e Insumos Médico-Quirúrgicos',norm:'Res. 3100/2019 Est. 4 · Decreto 677/1995 · INVIMA · Res. 1403/2007',q:[
      '¿Los medicamentos están almacenados separados de alimentos, con temperatura controlada según ficha técnica y termómetro calibrado?',
      '¿Se aplica metodología PEPS (Primero en Entrar, Primero en Salir) y los medicamentos próximos a vencer (menos de 3 meses) están identificados?',
      '¿Los medicamentos de alto riesgo (anticoagulantes, insulinas, opioides, electrolitos concentrados KCl) tienen alerta visual y doble verificación?',
      '¿Los medicamentos controlados (psicotrópicos, estupefacientes) están bajo llave con inventario actualizado, libro de control y responsable designado?',
      '¿Los insumos de uso único están diferenciados de los reutilizables y no hay evidencia de reutilización de insumos de un solo uso?',
      '¿Existe lista de medicamentos esenciales o formulario institucional aprobado, disponible y de uso obligatorio para el personal?',
      '¿Los medicamentos vencidos, deteriorados o con empaque comprometido están segregados con proceso documentado de devolución o destrucción?',
      '¿Los registros de dispensación de medicamentos permiten rastrear: qué medicamento, a qué paciente, por quién, cuándo y en qué dosis?'
    ]},
  ],
  domiciliaria:[
    {id:'dom-coordinacion',icon:'📋',name:'Coordinación Clínica y Administrativa',norm:'Dec. 780/2016 · Res. 3100/2019 · Atención Domiciliaria',q:[
      '¿Existe director médico o coordinador clínico con designación formal y tarjeta profesional vigente para el servicio domiciliario?',
      '¿Hay protocolos específicos y actualizados para cada tipo de atención domiciliaria prestada (curación, sonda, oxigenoterapia, manejo de heridas)?',
      '¿El sistema de referencia y contrarreferencia domiciliaria está documentado con rutas claras hacia urgencias y la IPS de mayor complejidad?',
      '¿El equipo multidisciplinario tiene roles, responsabilidades y protocolos de comunicación entre sí claramente definidos y documentados?',
      '¿Existe cronograma de visitas con asignación de rutas, tiempos estimados y sistema de confirmación de cumplimiento?',
      '¿Hay sistema de asignación de casos que considera complejidad, carga de trabajo del profesional y distancia geográfica?',
      '¿El servicio tiene indicadores de gestión: visitas realizadas vs. programadas, reingresos hospitalarios, satisfacción del cuidador?'
    ]},
    {id:'dom-dotacion',icon:'🎒',name:'Dotación del Maletín de Atención',norm:'Res. 3100/2019 Est. 3 · Dotación domiciliaria',q:[
      '¿El maletín contiene tensiómetro, pulsioxímetro, glucómetro, termómetro y estetoscopio en buen estado y calibrados?',
      '¿Los insumos del maletín tienen revisión de vencimiento en los últimos 30 días con lista de verificación firmada?',
      '¿Existe guardián portátil para manejo seguro de cortopunzantes en el domicilio del paciente?',
      '¿Los EPP (guantes por talla, mascarilla quirúrgica o N95, bata) están disponibles en cantidad suficiente para cada visita?',
      '¿El maletín incluye kit de primeros auxilios y medicamentos básicos de emergencia según el tipo de paciente atendido?',
      '¿Los equipos del maletín tienen hoja de vida individual con registro de mantenimiento y calibración vigente?',
      '¿El maletín está equipado con materiales de curación, vendajes, apósitos y materiales para los procedimientos programados en la ruta?',
      '¿Existe protocolo documentado de reposición de insumos del maletín con responsable y frecuencia definida?'
    ]},
    {id:'dom-hc',icon:'📄',name:'Historia Clínica Domiciliaria y Registros',norm:'Res. 1995/1999 · Res. 3100/2019 Est. 6',q:[
      '¿Cada visita genera nota de evolución con: fecha, hora, profesional, hallazgos clínicos, intervención y plan?',
      '¿La historia clínica diferencia las atenciones domiciliarias de las presenciales y permite reconstruir la trayectoria del paciente?',
      '¿Existe nota de evolución firmada por el profesional tratante con nombre legible y número de registro profesional en cada visita?',
      '¿Los signos vitales tomados en domicilio están registrados con valores numéricos y hora exacta?',
      '¿El consentimiento informado para atención domiciliaria está firmado por el paciente o cuidador legal antes del inicio del servicio?',
      '¿Se registra la persona responsable (cuidador) presente, su comprensión de las instrucciones y los compromisos adquiridos?',
      '¿El plan de alta domiciliaria está documentado con criterios de egreso, recomendaciones al cuidador y señales de alarma para urgencias?'
    ]},
    {id:'dom-seguridad',icon:'🛡️',name:'Seguridad del Paciente en Domicilio',norm:'Res. 256/2016 · Programa Seguridad del Paciente',q:[
      '¿Se realiza valoración del riesgo del entorno domiciliario (caídas, barreras arquitectónicas, cuidador disponible) al inicio del servicio?',
      '¿Existe protocolo de actuación ante emergencia en domicilio: deterioro súbito, paro cardiorrespiratorio, caída durante la visita?',
      '¿El establecimiento realiza seguimiento post-visita para confirmar adherencia y detectar complicaciones?',
      '¿Los eventos adversos en atenciones domiciliarias se reportan al sistema institucional con análisis de causa?',
      '¿Se aplica reconciliación de medicamentos al inicio del servicio domiciliario para identificar polifarmacia e interacciones?',
      '¿El profesional verifica en cada visita que el paciente o cuidador conoce las señales de alarma y el procedimiento para contactar urgencias?',
      '¿Existe registro de evaluación de la capacidad funcional del paciente (índice de Barthel) al inicio y en el seguimiento periódico?'
    ]},
    {id:'dom-bioseg',icon:'🦠',name:'Bioseguridad en Atención Domiciliaria',norm:'Res. 3100/2019 Est. 5 · Dec. 351/2014 · Precauciones Estándar OMS',q:[
      '¿El profesional realiza higiene de manos (lavado o alcohol gel) antes y después de cada procedimiento en el domicilio?',
      '¿Se aplican precauciones estándar (guantes, mascarilla, bata según riesgo) en todos los procedimientos con exposición a fluidos?',
      '¿El profesional retira del domicilio TODOS los residuos peligrosos generados (cortopunzantes, material biológico, gasas) en bolsa roja?',
      '¿Existe protocolo escrito para transporte seguro de residuos biológicos desde el domicilio hasta la sede?',
      '¿El personal tiene capacitación documentada en bioseguridad domiciliaria y manejo de accidente biológico fuera de la institución?',
      '¿El establecimiento asegura disponibilidad de alcohol al 70%, hipoclorito y elementos de desinfección de equipos portátiles?'
    ]},
    {id:'dom-transporte',icon:'🚐',name:'Transporte y Desplazamiento',norm:'Dec. 2376/2011 · Res. 3100/2019 · Min. Transporte',q:[
      '¿El vehículo utilizado para atención domiciliaria está autorizado según el tipo de servicio y normativa vigente de transporte?',
      '¿El conductor tiene licencia de conducción vigente y categoría adecuada para el vehículo utilizado?',
      '¿Existe plan de rutas con protocolos de seguridad vial para personal que se desplaza a domicilios en zonas de difícil acceso?',
      '¿El establecimiento tiene cobertura de seguro de accidentes para el personal durante los desplazamientos a domicilios?',
      '¿Si el establecimiento cuenta con ambulancias o vehículos de transporte asistencial, estos portan la "estrella de la vida" (azul o verde reflectivo) en costados, puertas posteriores y techo, y el emblema protector de la Misión Médica? (Res. 465/2025 · Art. 20 · Res. 4481/2012)'
    ]},
    {id:'dom-comunicacion',icon:'📞',name:'Comunicación y Disponibilidad 24 Horas',norm:'Res. 3100/2019 · Estándar Atención al Usuario',q:[
      '¿Existe línea telefónica disponible 24 horas los 7 días de la semana para pacientes y cuidadores del servicio domiciliario?',
      '¿Hay protocolo documentado de escalamiento a urgencias o activación de transporte asistencial ante descompensación del paciente?',
      '¿Los pacientes y cuidadores reciben instrucciones escritas comprensibles sobre señales de alarma, cuidados en casa y cómo actuar ante emergencia?',
      '¿El tiempo de respuesta ante llamado de urgencia del servicio domiciliario está definido, es medido y cumple el estándar institucional?',
      '¿Existe registro de llamadas de seguimiento realizadas a los pacientes entre visitas con resultado y acciones tomadas?'
    ]},
    {id:'dom-calidad',icon:'📊',name:'Indicadores y Mejoramiento',norm:'Res. 256/2016 · Res. 3100/2019 Est. 6 · PAMEC',q:[
      '¿El servicio domiciliario tiene indicadores propios: adherencia al tratamiento, reingresos hospitalarios, satisfacción del cuidador?',
      '¿Se realiza auditoría periódica de historias clínicas domiciliarias para verificar calidad del registro y adherencia a protocolos?',
      '¿El servicio domiciliario participa activamente en el PAMEC institucional con planes de mejoramiento documentados?',
      '¿Existe encuesta de satisfacción aplicada al cuidador con análisis de resultados y acciones de mejora documentadas?'
    ]},
  ],
  imagenologia:[
    {id:'img-planta',icon:'🏗️',name:'Planta Física y Blindaje Radiológico',norm:'Res. 4445/1996 · Res. 9031/1990 · ICRP 60 · NTC 4509',q:[
      '¿Las paredes, piso, techo, puerta y ventanas del área de rayos X tienen blindaje de plomo certificado (mínimo 1.5 mm Pb equivalente) verificado por informe técnico?',
      '¿La puerta del cuarto de rayos X tiene hoja plomada con sello perimetral y sistema de cierre seguro que impide el ingreso durante la exposición?',
      '¿Existe señalización internacional de radiación ionizante (trébol amarillo) en TODAS las entradas al área controlada?',
      '¿Hay sistema de semáforo o señal luminosa de "RAYOS X EN USO - No ingrese" activo y sincronizado con el disparador del equipo?',
      '¿La separación entre zona controlada, zona supervisada y zona pública está delimitada con señalización permanente?',
      '¿La sala de ecografía y demás áreas de apoyo diagnóstico están diferenciadas de la sala de rayos X y la sala de lectura?',
      '¿Existe vestuario o área de preparación del paciente adecuada y diferenciada del área de exposición?',
      '¿El informe técnico de blindaje está vigente y fue emitido por profesional con certificación en protección radiológica reconocida en Colombia?'
    ]},
    {id:'img-equipos',icon:'⚙️',name:'Equipos de Diagnóstico por Imagen',norm:'Dec. 4725/2005 · INVIMA · Res. 4445/1996 · Res. 1642/1998',q:[
      '¿Todos los equipos de imagenología tienen registro INVIMA vigente o autorización de uso del Invima visible y verificable?',
      '¿Cada equipo tiene hoja de vida individual con historial completo de mantenimiento preventivo y correctivo, firmado por técnico calificado?',
      '¿El programa de garantía de calidad incluye pruebas de aceptación inicial, pruebas de constancia periódicas y pruebas de estado?',
      '¿Los dosímetros de área para monitoreo de radiación ambiental están calibrados, ubicados en puntos representativos y con lectura mensual?',
      '¿El rendimiento del generador de rayos X (kVp, mAs, tiempo) ha sido verificado en el último año con equipo de medición calibrado?',
      '¿Los chasis radiográficos o detectores digitales tienen prueba de contacto o de calidad de imagen con frecuencia definida?',
      '¿El equipo de mamografía tiene pruebas adicionales (phantom ACR, dosis glandular media, contraste-detalle) realizadas en el último año?',
      '¿Los equipos de ultrasonido tienen mantenimiento preventivo documentado incluyendo verificación de transductores y calidad de imagen?'
    ]},
    {id:'img-radioproteccion',icon:'🦺',name:'Radioprotección del Personal Expuesto (TOE)',norm:'Res. 9031/1990 · Dec. 2644/1994 · ICRP 60 · NTC 2883',q:[
      '¿Todos los trabajadores ocupacionalmente expuestos (TOE) usan dosímetro personal (TLD u OSL) con lectura mínima trimestral registrada y archivada?',
      '¿Los delantales plomados (mínimo 0.25 mm Pb equivalente) están disponibles para CADA operador y para acompañantes cuando aplica?',
      '¿Los collarines tiroideos y guantes plomados están disponibles y en buen estado para procedimientos de alto riesgo de exposición?',
      '¿Se verifica integridad de los delantales plomados mediante radiografía o fluoroscopía del delantal con frecuencia semestral y registro del resultado?',
      '¿Los operadores tienen certificado vigente en protección radiológica emitido por institución autorizada reconocida en Colombia?',
      '¿Las dosis individuales de los TOE se registran y analizan frente a los límites anuales (20 mSv/año dosis efectiva)?',
      '¿Existe programa de vigilancia médica ocupacional para los TOE con exámenes periódicos y seguimiento de la dosis acumulada?',
      '¿Las gestantes o personal en lactancia están excluidas de actividades con exposición a radiación ionizante y esta medida está documentada?'
    ]},
    {id:'img-paciente',icon:'🩻',name:'Protección al Paciente y Principio ALARA',norm:'Res. 9031/1990 · ICRP 103 · OMS Seguridad Radiológica',q:[
      '¿Se aplica el principio ALARA mediante colimación estricta al área anatómica de interés, reduciendo el campo de exposición al mínimo necesario?',
      '¿Existe protocolo escrito y aplicado para identificar el embarazo en toda mujer en edad fértil antes de cualquier exposición a radiación?',
      '¿Se usan delantales de protección gonadal en pacientes en edad reproductiva cuando el campo de exposición está en región pélvica o abdominal?',
      '¿Los protocolos de técnica radiológica están estandarizados por tipo de estudio y grupo etario para minimizar la dosis al paciente?',
      '¿Existe estimación de dosis al paciente en estudios de mayor dosis (TAC, fluoroscopía) con registro individualizado cuando aplica?',
      '¿Se informa al paciente sobre el propósito del estudio y la radiación que recibirá, obteniendo consentimiento para estudios con contraste?',
      '¿El sistema de control de calidad de imagen evalúa la tasa de repetición (objetivo: < 5%) con análisis de causas y corrección?',
      '¿Los niños y pacientes pediátricos tienen protocolo específico de técnica ajustada al peso/talla con criterios de justificación especiales?'
    ]},
    {id:'img-talento',icon:'👨‍⚕️',name:'Talento Humano Especializado',norm:'Res. 3100/2019 Est. 1 · Ley 657/2001 · Res. 4445/1996',q:[
      '¿El tecnólogo en radiología e imágenes diagnósticas tiene tarjeta profesional vigente en RETHUS conforme a la Ley 657/2001?',
      '¿El médico radiólogo responsable tiene especialización registrada en RETHUS y firma los informes de los estudios que requieren interpretación médica?',
      '¿El personal de ecografía tiene certificación específica en la modalidad que practica (ginecobstétrica, abdominal, cardiaca)?',
      '¿Existe disponibilidad verificable de médico radiólogo para consultas urgentes, interpretación en línea o teleconsulta para estudios complejos?',
      '¿El personal de apoyo tiene funciones delimitadas y NO opera equipos de rayos X sin supervisión del tecnólogo certificado?',
      '¿Se lleva registro de los estudios realizados por cada operador con número de exámenes y tipo de estudio para seguimiento de competencia?'
    ]},
    {id:'img-calidad',icon:'📊',name:'Control de Calidad e Indicadores',norm:'Res. 4445/1996 Art. 15 · Programa Garantía Calidad · IAEA',q:[
      '¿El libro de rechazo/repetición de imágenes está actualizado con análisis mensual de causas y tasa de rechazo documentada (objetivo ≤5%)?',
      '¿Se realizan pruebas periódicas de control de calidad del sistema digital (uniformidad, resolución, artefactos) con registro de resultados?',
      '¿Los criterios de calidad de imagen están documentados para cada tipo de estudio (criterios CEC o equivalentes)?',
      '¿Existe revisión periódica de protocolos técnicos con participación del radiólogo y tecnólogo jefe con registros de las revisiones?',
      '¿El servicio mide y reporta el tiempo de entrega de resultados por tipo de estudio (urgente ≤2h, rutina ≤24h)?',
      '¿Hay sistema de segunda lectura o correlación clínico-radiológica para casos complejos u oncológicos?'
    ]},
    {id:'img-residuos',icon:'☢️',name:'Residuos Especiales y Medioambiente',norm:'Dec. 351/2014 · Res. 1164/2002 · IDEAM · RAEE',q:[
      '¿Existe contrato vigente con empresa gestora autorizada para residuos con plata (reveladores y fijadores de Rx analógico, si aplica)?',
      '¿Los residuos de equipos digitales (cartuchos, cables, detectores dañados) se gestionan como Residuos de Aparatos Eléctricos (RAEE)?',
      '¿El material de contraste yodado o de bario vencido tiene protocolo de devolución o disposición especial según la normativa?',
      '¿Existe registro actualizado de disposición final de residuos especiales con certificados de la empresa gestora de los últimos 6 meses?',
      '¿El personal tiene capacitación específica en manejo de residuos especiales del servicio de imagenología, incluyendo los de radioactividad si aplica?'
    ]},
  ],
  urgencias:[
    {id:'urg-th',icon:'👨‍⚕️',name:'Talento Humano 24/7 y Competencias',norm:'Res. 3100/2019 Est. 1 · Ley 23/1981 · RETHUS · BLS/ACLS',q:[
      '¿Hay médico con presencia FÍSICA en el servicio de urgencias las 24 horas los 365 días del año, sin delegación a personal no médico?',
      '¿La enfermera profesional está presente de forma continua e ininterrumpida en urgencias en todos los turnos?',
      '¿La dotación de auxiliares de enfermería en cada turno es suficiente para la carga de pacientes, con ratio definido y documentado?',
      '¿Todo el personal asistencial de urgencias tiene tarjeta profesional vigente en RETHUS y contratos o vinculación formalizados?',
      '¿El 100% del personal de urgencias tiene certificado BLS (Basic Life Support) vigente (máximo 2 años) de institución reconocida?',
      '¿El médico jefe o coordinador de urgencias tiene entrenamiento documentado en ATLS (Trauma) o equivalente para urgencias de mediana o alta complejidad?',
      '¿Existe personal de camillero disponible en el servicio durante todos los turnos para apoyo en movilización y traslado intrahospitalario?',
      '¿El personal tiene capacitación documentada en triage, situaciones de múltiples víctimas y protocolos de alerta masiva?',
      '¿Se realizan simulacros periódicos de emergencias masivas en urgencias con registro y evaluación de desempeño del personal?',
      '¿El personal conoce el protocolo de activación del CRUE y las rutas de derivación de la red de urgencias territorial?'
    ]},
    {id:'urg-triage',icon:'🚨',name:'Sistema de Clasificación por Triage',norm:'Res. 3100/2019 Est. 6 · Protocolo MPS · Sistema Manchester',q:[
      '¿Se aplica el protocolo de triage de 5 niveles (Manchester, MPS o equivalente) con criterios explícitos por nivel de prioridad?',
      '¿La clasificación del triage se realiza en los primeros 10 minutos desde el ingreso, con registro de la hora en la historia clínica?',
      '¿Existe área física diferenciada, señalizada y con acceso directo para el triage separada de la sala de espera general?',
      '¿Los tiempos de atención efectiva por nivel están definidos: I (inmediato), II (<15 min), III (<30 min), IV (<60 min), V (<120 min)?',
      '¿Los tiempos de espera reales son medidos periódicamente y se toman acciones cuando se incumplen los estándares?',
      '¿El área de triage cuenta con pulsioxímetro, termómetro, tensiómetro, glucómetro, escala de dolor, linterna y camilla de exploración?',
      '¿El personal de triage tiene entrenamiento certificado en el sistema utilizado con evaluación periódica de competencias?',
      '¿Existe proceso de re-triage para pacientes que permanecen en espera más del tiempo definido para su nivel de prioridad?',
      '¿El sistema de triage incluye categorías especiales para gestantes, niños y adultos mayores con criterios diferenciados?',
      '¿Los resultados del triage (nivel, hora, profesional) se registran en la historia clínica desde el primer contacto con el paciente?'
    ]},
    {id:'urg-dotacion',icon:'🏥',name:'Dotación y Equipos de Emergencia',norm:'Res. 3100/2019 Est. 2 · INVIMA · Dec. 4725/2005',q:[
      '¿El carro de paro está completo, sellado con sello numerado, con lista de chequeo verificada y firmada en la fecha del turno en curso?',
      '¿El desfibrilador está operativo, con baterías cargadas, electrodos vigentes y revisión de funcionamiento registrada semanalmente?',
      '¿Hay fuente de oxígeno medicinal disponible (central o cilindros de respaldo) con indicador de nivel verificado al inicio de cada turno?',
      '¿El monitor de signos vitales con ECG, SpO2, ETCO2 y PANI está operativo, calibrado y con repuestos disponibles?',
      '¿El ambú (mascarilla-válvula-bolsa) en tallas adulto y pediátrico está disponible y en buen estado en el área de reanimación?',
      '¿El aspirador de secreciones está operativo con catéteres disponibles y equipo limpio para uso inmediato?',
      '¿El laringoscopio con hojas de diferentes tamaños y tubos endotraqueales de tallas 6.0 a 9.0 están disponibles y con batería cargada?',
      '¿Los medicamentos de emergencia (epinefrina 1 mg, atropina, adenosina, glucosa al 50%, bicarbonato) están en el carro de paro y vigentes?',
      '¿Las camillas de urgencias tienen colchones en buen estado, barandas funcionales y capacidad de posición Trendelenburg?',
      '¿El servicio tiene equipos de inmovilización (collarín cervical, tabla espinal, férulas) disponibles y en buen estado?'
    ]},
    {id:'urg-bioseg',icon:'🛡️',name:'Bioseguridad y Control de Infecciones',norm:'Res. 3100/2019 Est. 5 · OMS 5 Momentos · Precauciones Estándar',q:[
      '¿Existe área de aislamiento o protocolo documentado para pacientes con sospecha de enfermedad transmisible de alta contagiosidad?',
      '¿El personal aplica precauciones estándar (guantes, mascarilla, gafas, bata) en TODAS las atenciones con riesgo de contacto con fluidos?',
      '¿Hay dispensadores de alcohol gel operativos en cada puesto de atención, en la entrada del servicio y en el área de triage?',
      '¿Los 5 momentos del lavado de manos OMS están señalizados y la adherencia se mide periódicamente con retroalimentación al personal?',
      '¿Los residuos peligrosos se separan desde el punto de generación en bolsas rojas (biológicos) y guardianes (cortopunzantes)?',
      '¿Las camillas y superficies de contacto se desinfectan entre cada paciente con producto de amplio espectro a dilución correcta?',
      '¿Los pacientes con sospecha de infección respiratoria reciben mascarilla desde el triage y se evalúan en área separada cuando es posible?',
      '¿El protocolo de accidente biológico está disponible en el área con insumos para lavado inmediato y reporte del evento?',
      '¿Existe protocolo de limpieza y desinfección terminal de cuartos de aislamiento o áreas de uso de pacientes con precauciones especiales?'
    ]},
    {id:'urg-hc',icon:'📄',name:'Historia Clínica de Urgencias y Registros',norm:'Res. 1995/1999 · Res. 3100/2019 Est. 6 · Res. 13437/1991',q:[
      '¿Cada paciente tiene historia clínica abierta desde el primer contacto con identificación completa y hora de ingreso registrada?',
      '¿Las notas médicas incluyen: hora, motivo de consulta, anamnesis, examen físico, diagnóstico CIE-10, plan de manejo y firma del médico?',
      '¿Se registra el nivel de triage asignado, hora de clasificación y hora de atención efectiva en la historia clínica?',
      '¿Las notas de enfermería documentan: signos vitales, medicamentos administrados (nombre, dosis, vía, hora), procedimientos y respuesta?',
      '¿El egreso está registrado con: hora, destino (alta, hospitalización, remisión, fallecimiento), diagnóstico de egreso y condición clínica?',
      '¿Los consentimientos para procedimientos urgentes están disponibles y se diligencian cuando el estado del paciente lo permite?',
      '¿Los eventos adversos en urgencias se reportan al sistema institucional de seguridad del paciente?',
      '¿Las remisiones tienen formato completo: datos del paciente, diagnóstico, tratamiento dado, motivo, firma del médico remitente?',
      '¿Se lleva estadística mensual: número de atenciones, distribución por nivel de triage, diagnósticos más frecuentes y tiempos de atención?'
    ]},
    {id:'urg-planta',icon:'🏗️',name:'Planta Física de Urgencias',norm:'Res. 3100/2019 Est. 2 · NSR-10 · Res. 544/2023',q:[
      '¿El área de urgencias tiene acceso directo desde el exterior con rampa para camillas y señalización visible desde la vía pública?',
      '¿La sala de reanimación/choque está equipada, señalizada y tiene dimensiones para al menos 2 operadores simultáneos?',
      '¿El área de observación tiene al menos 4 m² por cama con separación entre camillas ≥1 m y cortinas que garanticen privacidad?',
      '¿El servicio tiene sala de espera diferenciada para acompañantes con sillas suficientes, buena iluminación y ventilación adecuada?',
      '¿Existe área limpia (preparación de medicamentos) separada del área sucia (deposición de residuos, materiales contaminados)?',
      '¿Los baños de urgencias son de acceso independiente y cumplen condiciones de accesibilidad para pacientes con movilidad reducida?',
      '¿El piso es antideslizante, sin desniveles que dificulten el desplazamiento de camillas o sillas de ruedas?'
    ]},
    {id:'urg-interdep',icon:'🔗',name:'Interdependencias y Red de Urgencias',norm:'Res. 3100/2019 Est. 7 · Res. 544/2023 Art. 17 · CRUE',q:[
      '¿Existe convenio activo con laboratorio clínico con capacidad de respuesta urgente (resultados en menos de 60 minutos para pruebas básicas)?',
      '¿Hay acceso garantizado a banco de sangre o servicio transfusional propio o por convenio disponible las 24 horas?',
      '¿El establecimiento tiene convenio formal vigente con IPS de mayor complejidad para referencia de pacientes que superen su capacidad?',
      '¿El protocolo de referencia está documentado con criterios, datos de contacto actualizados y formato de remisión?',
      '¿El sistema de comunicaciones (teléfono fijo, celular, radio) funciona permanentemente para coordinación con el CRUE de la región?',
      '¿Existe convenio o acceso a servicio de imágenes diagnósticas (Rx, TAC, ecografía) para apoyo en la toma de decisiones?',
      '¿El tiempo de respuesta del laboratorio para pruebas urgentes es medido y cumple el estándar definido?',
      '¿Existe registro de todas las remisiones realizadas con su desenlace (aceptada, rechazada, completada) y tiempo de traslado?'
    ]},
  ],
  internacion:[
    {id:'int-th',icon:'👩‍⚕️',name:'Talento Humano y Suficiencia',norm:'Res. 3100/2019 Est. 1 · RETHUS · Res. 2278/2021',q:[
      '¿Hay médico con presencia física o disponibilidad garantizada y documentada para pacientes hospitalizados las 24 horas?',
      '¿El ratio enfermera profesional-paciente cumple el estándar: máximo 1 enfermera por 8 pacientes en hospitalización general?',
      '¿Los auxiliares de enfermería están distribuidos en cada turno con ratio adecuado a la carga y nivel de dependencia de los pacientes?',
      '¿Existe jefe de enfermería o coordinadora del servicio con designación formal y funciones documentadas?',
      '¿Los especialistas que realizan interconsultas tienen tarjeta profesional con especialidad registrada en RETHUS?',
      '¿El personal médico de hospitalización tiene contratos o vinculación formal con funciones definidas en el manual de funciones?',
      '¿Existe nutricionista disponible para evaluación y soporte nutricional de pacientes con riesgo nutricional identificado?',
      '¿El personal de trabajo social está disponible para apoyo a pacientes con necesidades sociales y coordinación familiar?',
      '¿El personal recibe inducción específica al servicio de hospitalización con documentación de competencias verificadas?'
    ]},
    {id:'int-planta',icon:'🏢',name:'Planta Física e Instalaciones',norm:'Res. 3100/2019 Est. 2 · NSR-10 · Ley 361/1997',q:[
      '¿Las habitaciones tienen superficie mínima de 7.5 m² por cama en habitación individual y 6 m² en habitación compartida?',
      '¿Cada unidad del paciente tiene toma de oxígeno medicinal empotrada, aspiración de vacío y sistema de llamado de enfermería funcional?',
      '¿Los baños son accesibles para pacientes con movilidad reducida: pasamanos, espacio de giro ≥1.5 m, ducha de nivel o silla disponible?',
      '¿Las áreas sucia y limpia están separadas físicamente: cuarto de limpieza diferente del cuarto de preparación de medicamentos?',
      '¿La iluminación permite lectura y examen físico sin encandilamiento, con control de luz nocturna para descanso del paciente?',
      '¿El sistema de ventilación garantiza mínimo 6 renovaciones de aire por hora en habitaciones generales y 12 en aislamiento?',
      '¿Los pasillos de hospitalización tienen ancho mínimo de 2.4 m para paso simultáneo de camillas y sillas de ruedas?',
      '¿Existe cuarto o habitación de aislamiento disponible con presión negativa o protocolo de aislamiento en habitación individual?',
      '¿Las camas hospitalarias tienen barandas funcionales en los cuatro lados, altura regulable y freno operativo en todas las ruedas?'
    ]},
    {id:'int-dotacion',icon:'🛏️',name:'Dotación y Gestión de Equipos',norm:'Res. 3100/2019 Est. 2 · Dec. 4725/2005 · Tecnovigilancia',q:[
      '¿Hay al menos un carro de paro por piso o unidad, completo según lista de chequeo, sellado y con verificación diaria documentada?',
      '¿Los monitores de signos vitales están disponibles en número suficiente para los pacientes con necesidad de monitorización continua?',
      '¿Las bombas de infusión volumétricas y de jeringa tienen calibración vigente y mantenimiento preventivo al día?',
      '¿Los colchones antiescaras están disponibles para pacientes con riesgo de úlceras por presión (Braden ≤16) y en buen estado?',
      '¿La ropa de cama es suficiente para cambio diario y según necesidad, con proceso de lavado industrial que garantice desinfección?',
      '¿Los equipos de fisioterapia respiratoria (nebulizadores, incentivadores espirométricos) están disponibles y con mantenimiento al día?',
      '¿El servicio farmacéutico de piso tiene nevera con temperatura controlada para medicamentos de cadena de frío con registro diario?'
    ]},
    {id:'int-iaas',icon:'🦠',name:'Prevención y Control de IAAS',norm:'Res. 256/2016 · Res. 3100/2019 Est. 5 · OMS · CDC',q:[
      '¿Existe Comité de IAAS activo con reuniones documentadas (actas, asistencia y seguimiento a planes de acción, mínimo bimestral)?',
      '¿Se realizan vigilancia epidemiológica activa y reporte de IAAS al SIVIGILA según el protocolo de vigilancia?',
      '¿La adherencia a higiene de manos (5 momentos OMS) se mide mensualmente con observación directa y retroalimentación al personal?',
      '¿Hay protocolos de bundles preventivos para: catéter venoso central, catéter urinario y ventilador mecánico?',
      '¿Los cuartos de aislamiento tienen señalización activa con tipo de precaución, EPP requerido y protocolo de visitas?',
      '¿Las tasas de IAAS se calculan mensualmente y se comparan con metas institucionales y benchmarks nacionales?',
      '¿Se realizan cultivos ambientales periódicos en áreas de alto riesgo (quirófano, UCI) con análisis de resultados?',
      '¿El protocolo de aislamiento de contacto incluye: cuarto individual o cohorte, bata y guantes antes de entrar?',
      '¿Existe protocolo de manejo de brotes con identificación, análisis epidemiológico, medidas de control y reporte a la Secretaría?'
    ]},
    {id:'int-farmacia',icon:'💊',name:'Gestión de Medicamentos en Hospitalización',norm:'Res. 3100/2019 Est. 3 · Res. 1403/2007 · Dec. 780/2016',q:[
      '¿Existe servicio farmacéutico con Químico Farmacéutico responsable, habilitado y con tarjeta profesional vigente en RETHUS?',
      '¿Los medicamentos se almacenan con control de temperatura documentado (registro diario mínima/máxima), humedad y luz?',
      '¿El sistema de dispensación de medicamentos de alto riesgo garantiza doble verificación por dos profesionales antes de la administración?',
      '¿Se realiza conciliación de medicamentos al ingreso (historial pre-hospitalario) y al egreso (plan de medicación post-alta)?',
      '¿Los psicotrópicos y estupefacientes tienen control bajo llave, libro de registro con doble firma y conteo diario?',
      '¿Existe sistema de reporte de eventos relacionados con medicamentos (errores de prescripción, dispensación, administración)?',
      '¿Los medicamentos vencidos o con problemas de calidad se segregan inmediatamente con procedimiento documentado?',
      '¿Los medicamentos parenterales de preparación extemporánea se preparan en área con cabina de flujo laminar?'
    ]},
    {id:'int-hc',icon:'📋',name:'Historia Clínica Hospitalaria y Epicrisis',norm:'Res. 1995/1999 · Res. 3100/2019 Est. 6 · Res. 839/2017',q:[
      '¿Cada paciente tiene historia clínica con anamnesis completa, examen físico por sistemas, diagnóstico CIE-10 y plan de manejo al ingreso?',
      '¿Las notas de evolución médica se registran al menos una vez al día con hora, hallazgos, respuesta al tratamiento y plan?',
      '¿Las notas de enfermería son completas: signos vitales numéricos, medicamentos administrados (nombre, dosis, vía, hora) y procedimientos?',
      '¿La epicrisis se elabora y firma dentro de las 24 horas del egreso con diagnóstico definitivo, resumen del tratamiento y recomendaciones?',
      '¿El plan de alta incluye: medicamentos (nombre, dosis, frecuencia, duración), citas de seguimiento y señales de alarma para urgencias?',
      '¿Las interconsultas solicitadas tienen respuesta documentada dentro del tiempo definido (<4h urgente, <24h electiva)?',
      '¿El archivo de historias clínicas activas garantiza disponibilidad inmediata durante la atención y custodia ≥20 años post-egreso?',
      '¿Los procedimientos invasivos tienen nota procedimentral firmada con descripción técnica completa y complicaciones si las hubo?'
    ]},
    {id:'int-calidad',icon:'📊',name:'Indicadores y Seguridad del Paciente',norm:'Res. 256/2016 · PAMEC · OMS Seguridad del Paciente',q:[
      '¿El servicio mide indicadores de hospitalización: días de estancia, reingreso ≤30 días, tasa de eventos adversos, mortalidad?',
      '¿Existe comité de seguridad del paciente con análisis de eventos adversos, Análisis de Causa Raíz (ACR) y planes de acción?',
      '¿Se aplica protocolo de identificación con brazalete con nombre completo y documento desde el ingreso en TODO paciente?',
      '¿El protocolo de prevención de caídas incluye: evaluación de riesgo (Morse), cama baja, barandas arriba y llamador al alcance?',
      '¿Los pacientes con riesgo de úlcera por presión tienen plan de cambios de posición cada 2 horas documentado en enfermería?',
      '¿Existe ronda de seguridad del paciente periódica con verificación de identificación, medicamentos y dispositivos invasivos?'
    ]},
  ],
  quirurgicos:[
    {id:'qui-th',icon:'👨‍⚕️',name:'Equipo Quirúrgico y Competencias',norm:'Res. 3100/2019 Est. 1 · RETHUS · Ley 23/1981',q:[
      '¿El cirujano tiene tarjeta profesional vigente en RETHUS con la especialidad quirúrgica específica del procedimiento que realiza?',
      '¿El anestesiólogo tiene especialización en anestesiología y reanimación registrada en RETHUS y está físicamente presente durante TODO el procedimiento?',
      '¿La instrumentadora quirúrgica tiene título universitario en instrumentación quirúrgica con tarjeta profesional vigente en RETHUS?',
      '¿La enfermera circulante tiene formación en enfermería y entrenamiento documentado en su rol en el área quirúrgica?',
      '¿Existe coordinador o jefe de sala de cirugía con designación formal, funciones definidas y tarjeta profesional vigente?',
      '¿El personal de recuperación post-anestésica tiene entrenamiento certificado en manejo post-anestésico y complicaciones inmediatas?',
      '¿El cirujano ha realizado los procedimientos programados dentro de sus competencias verificadas y registradas?',
      '¿El equipo completo está identificado y disponible antes del inicio de la cirugía, sin sustituciones no documentadas?',
      '¿Existe protocolo de verificación de credenciales del cirujano visitante o locum antes de permitirle operar?'
    ]},
    {id:'qui-planta',icon:'🔪',name:'Quirófano y Áreas de Apoyo',norm:'Res. 3100/2019 Est. 2 · NSR-10 · NTC 4166',q:[
      '¿El quirófano tiene superficie mínima de 36 m² con acabados lisos, sin uniones ni ranuras, lavables con desinfectantes de alto nivel?',
      '¿Los flujos separan claramente zona no restringida (cambio de ropa), semirrestringida (pasillos) y restringida (quirófano)?',
      '¿La sala de recuperación post-anestésica (URPA) tiene camilla con monitor y toma de oxígeno por cada puesto asignado?',
      '¿Existe área de preparación del paciente (pre-quirúrgico) separada físicamente del área de cirugía con privacidad?',
      '¿La iluminación del campo operatorio cumple los mínimos (40.000-100.000 lux) con lámparas cialíticas en buen estado?',
      '¿El sistema de gases médicos (O2, aire comprimido, aspiración de vacío) tiene válvulas de seguridad y alarmas visibles?',
      '¿La temperatura del quirófano se mantiene entre 18-23°C y la humedad entre 45-65% con registros verificables?',
      '¿La central de esterilización está próxima al área quirúrgica con sistema de comunicación eficiente para solicitud de material?',
      '¿Existe bodega de material quirúrgico dentro del área restringida con control de inventario y condiciones de almacenamiento?'
    ]},
    {id:'qui-esterilizacion',icon:'🧪',name:'Central de Esterilización y Control',norm:'Res. 3100/2019 Est. 5 · AAMI ST79 · ICONTEC 4166',q:[
      '¿La central tiene autoclave de vapor saturado clase B con impresión o registro digital de cada ciclo (temperatura, presión, tiempo)?',
      '¿Se realiza control biológico semanal con indicador biológico (Geobacillus stearothermophilus ATCC 7953) con resultado archivado?',
      '¿Los indicadores químicos de proceso (clase 5 o 6) se incluyen dentro de los paquetes y en el exterior de cada unidad esterilizada?',
      '¿El instrumental esterilizado tiene empaques íntegros sin roturas, fecha de esterilización y fecha de vencimiento claramente visibles?',
      '¿El proceso sigue el ciclo completo: pre-limpieza → limpieza manual o ultrasónica → inspección → empaque → esterilización → almacenamiento?',
      '¿El almacenamiento del material estéril garantiza temperatura <24°C, humedad <70%, libre de polvo, en estantes cerrados con rotación PEPS?',
      '¿Los equipos tienen mantenimiento preventivo, calibración anual de manómetros y termómetros, y certificado de presión de caldera?',
      '¿Existe trazabilidad del instrumental: qué set fue esterilizado, en qué ciclo, con qué parámetros y a qué paciente fue utilizado?',
      '¿El instrumental de endoscopía flexible tiene protocolo de alto nivel de desinfección (glutaraldehído ≥20 min o equivalente) por procedimiento?'
    ]},
    {id:'qui-consentimiento',icon:'✍️',name:'Consentimiento Informado y Ética',norm:'Ley 23/1981 · Res. 13437/1991 · Res. 3100/2019 Est. 6',q:[
      '¿Existe consentimiento informado específico para cada tipo de procedimiento quirúrgico, diferenciado del consentimiento general?',
      '¿El consentimiento describe comprensiblemente: nombre del procedimiento, objetivo, técnica resumida, riesgos frecuentes y alternativas?',
      '¿El consentimiento es firmado por el paciente o su representante ANTES de la premedicación o sedación, en plena capacidad mental?',
      '¿El cirujano firma el consentimiento como médico informante con registro del momento en que se entregó la información al paciente?',
      '¿Se obtiene consentimiento adicional para: anestesia general/regional, transfusión y uso de implantes o prótesis?',
      '¿En urgencias donde el paciente no puede firmar, el consentimiento por representante o nota médica justificada está documentada?',
      '¿Existe proceso de revocación del consentimiento documentado y el personal conoce cómo proceder ante esta situación?'
    ]},
    {id:'qui-seguridad',icon:'✅',name:'Lista de Verificación OMS y Seguridad Quirúrgica',norm:'OMS Cirugía Segura · Res. 3100/2019 · Res. 256/2016',q:[
      '¿Se aplica la Lista de Verificación Quirúrgica OMS en los 3 momentos (Sign In, Time Out, Sign Out) en el 100% de los procedimientos?',
      '¿El sitio quirúrgico es marcado de forma indeleble con el paciente despierto cuando aplica (lateralidad, nivel vertebral)?',
      '¿El conteo de instrumentos, gasas y agujas se realiza antes del inicio, antes del cierre y al final con registro firmado?',
      '¿El Time Out incluye: identidad del paciente, procedimiento, sitio, posición, alergias conocidas, profilaxis antibiótica y disponibilidad de implantes?',
      '¿Los eventos adversos quirúrgicos (retención de cuerpos extraños, cirugía en sitio incorrecto) se reportan al sistema institucional?',
      '¿Existe protocolo de profilaxis antibiótica con antibiótico, dosis y tiempo definidos por tipo de procedimiento y nivel de contaminación?',
      '¿El tiempo de profilaxis antibiótica se controla: debe administrarse en los 60 minutos previos a la incisión?',
      '¿La prevención de tromboembolismo venoso tiene protocolo con valoración de riesgo (Caprini) y medidas de profilaxis farmacológica y mecánica?'
    ]},
    {id:'qui-interdep',icon:'🔗',name:'Apoyo Clínico e Interdependencias',norm:'Res. 3100/2019 Est. 7 · Res. 544/2023',q:[
      '¿El establecimiento tiene acceso garantizado a UCI propia o por convenio activo y vigente para manejo postoperatorio de pacientes críticos?',
      '¿Hay convenio activo con banco de sangre con disponibilidad de hemocomponentes para cirugía programada y urgente?',
      '¿El laboratorio tiene respuesta urgente para apoyo intraoperatorio (gasometría, hemograma, coagulación) con tiempo ≤30 min?',
      '¿Existe protocolo de traslado para complicaciones quirúrgicas que superen la capacidad del establecimiento con IPS de destino predefinida?',
      '¿El servicio de imagenología tiene disponibilidad de arco en C o fluoroscopía para procedimientos ortopédicos o de mínima invasión?',
      '¿El servicio farmacéutico garantiza disponibilidad de medicamentos de emergencia anestésica (succinilcolina, sugammadex, dantroleno)?',
      '¿Existe intercomunicación efectiva entre sala de cirugía, URPA, laboratorio, banco de sangre e imágenes durante cirugías complejas?'
    ]},
  ],
  laboratorio:[
    {id:'lab-th',icon:'🔬',name:'Talento Humano del Laboratorio',norm:'Res. 3100/2019 Est. 1 · Ley 841/2003 · RETHUS',q:[
      '¿El bacteriólogo director/responsable técnico tiene título universitario y tarjeta profesional vigente en RETHUS conforme a la Ley 841/2003?',
      '¿Los auxiliares o técnicos de laboratorio tienen certificado SENA de técnico en laboratorio clínico o título de institución técnica reconocida?',
      '¿El bacteriólogo jefe firma TODOS los informes de resultados emitidos con su nombre completo y número de registro profesional?',
      '¿El personal operativo tiene carné de vacunación con Hepatitis B (esquema completo), tétanos y Varicela si no tiene historia de infección?',
      '¿Existe manual de funciones para cada cargo con responsabilidades, competencias y cadena de autoridad claramente definidas?',
      '¿El personal tiene capacitación documentada en: bioseguridad, control de calidad, manejo de muestras y procedimientos específicos?',
      '¿Hay programa de competencia del personal con evaluación periódica de habilidades técnicas por el bacteriólogo responsable?',
      '¿Existe protocolo conocido por TODO el personal para manejo de accidente biológico con insumos disponibles en el área?'
    ]},
    {id:'lab-equipos',icon:'🧫',name:'Equipos y Calibración Metrológica',norm:'Res. 3100/2019 Est. 2 · Dec. 4725/2005 · NTC-ISO 15189',q:[
      '¿Los analizadores hematológico y de química sanguínea tienen cronograma de mantenimiento preventivo documentado y registros de cumplimiento?',
      '¿Cada equipo tiene hoja de vida individual con: número de serie, fecha de instalación, calibraciones y mantenimientos realizados?',
      '¿La centrífuga tiene control de velocidad (rpm) verificado periódicamente con tacómetro calibrado y balanceo verificado antes de cada uso?',
      '¿El microscopio tiene verificación periódica de la óptica, iluminación y ajuste del condensador con registro de mantenimiento?',
      '¿La incubadora y el baño maría tienen termómetros calibrados con registro de temperatura al inicio de jornada y al final del turno?',
      '¿Las neveras de reactivos tienen termómetros de máxima-mínima con registro DIARIO de temperatura verificado?',
      '¿Los equipos tienen registro INVIMA vigente o autorización de uso, verificable en la base de datos INVIMA de dispositivos médicos?',
      '¿Las pipetas automáticas tienen certificado de calibración metrológica vigente y se verifican contra material de referencia certificado?',
      '¿El sistema de información del laboratorio (LIS) tiene trazabilidad completa desde la solicitud hasta la entrega del resultado?'
    ]},
    {id:'lab-calidad',icon:'📊',name:'Control de Calidad y PEEC',norm:'Res. 3100/2019 Est. 5 · PEEC MinSalud · Westgard · NTC-ISO 15189',q:[
      '¿El laboratorio participa ACTIVAMENTE en el Programa de Evaluación Externa de la Calidad (PEEC) del MinSalud con cronograma al día?',
      '¿Se realizan controles de calidad internos con suero control de 3 niveles (bajo, normal, alto) con cada corrida analítica o diariamente?',
      '¿Los resultados del control se grafican en carta de Levey-Jennings con análisis de tendencias y aplicación de reglas de Westgard?',
      '¿Existe procedimiento documentado para manejo de resultados fuera de rango de control: qué hacer, quién decide y cómo reportar?',
      '¿Los resultados del PEEC se analizan, comparan con el grupo par y se elaboran planes de mejoramiento ante desempeño insatisfactorio?',
      '¿El laboratorio tiene definidos y documentados los rangos de referencia para cada analito con especificación de la población de referencia?',
      '¿Se realiza correlación de métodos cuando se cambia de equipo o reactivo para verificar equivalencia antes de la implementación?',
      '¿Existe sistema de alertas para valores críticos con procedimiento de notificación inmediata al médico y registro de la comunicación?'
    ]},
    {id:'lab-muestras',icon:'🩸',name:'Fase Pre-analítica y Manejo de Muestras',norm:'Res. 3100/2019 Est. 5 · Manual de Procedimientos · CLSI GP33',q:[
      '¿Existe manual de toma de muestras disponible y actualizado en el área de toma, con instrucciones para cada tipo de muestra y contenedor?',
      '¿El personal verifica la identificación del paciente (nombre + documento) y la concordancia con la solicitud ANTES de la toma?',
      '¿Las muestras se transportan en recipientes herméticos, dentro de bolsas de bioseguridad, a temperatura adecuada y en tiempo definido?',
      '¿El área de toma tiene todos los insumos de bioseguridad: guantes de diferentes tallas, mascarilla, desinfectante de piel, torundas?',
      '¿Las muestras rechazadas tienen registro con: tipo de muestra, causa del rechazo, fecha y notificación al médico solicitante?',
      '¿Existe protocolo de manejo de muestras de pacientes en aislamiento con medidas adicionales de bioseguridad en transporte y procesamiento?',
      '¿El tiempo máximo entre toma y procesamiento para cada tipo de muestra está definido y se verifica con registro de hora de recepción?',
      '¿Las órdenes médicas se verifican antes del procesamiento: nombre, cédula, pruebas, diagnóstico y datos del médico solicitante?'
    ]},
    {id:'lab-bioseg',icon:'🛡️',name:'Bioseguridad y Seguridad del Personal',norm:'Dec. 351/2014 · NTC-ISO 15189 · Precauciones Estándar OMS',q:[
      '¿El laboratorio tiene cabina de seguridad biológica (CSB) clase II certificada con flujo laminar para muestras de riesgo biológico?',
      '¿La CSB tiene certificación de desempeño vigente (prueba NSF 49 o equivalente) realizada por empresa autorizada en el último año?',
      '¿Existe protocolo escrito de manejo de accidente biológico conocido y accesible a todo el personal, con insumos en el área?',
      '¿Los residuos biológicos (medios de cultivo, muestras procesadas) se desactivan en autoclave antes de su disposición como residuo infeccioso?',
      '¿Los guardianes para cortopunzantes no superan las tres cuartas partes de su capacidad y se descartan según el protocolo?',
      '¿Los trabajadores usan bata de manga larga, guantes, gafas de seguridad y mascarilla cuando procesan muestras biológicas?',
      '¿No se pipetea con boca, no se come, no se bebe ni se aplica cosméticos dentro del área de laboratorio?',
      '¿El personal está vacunado contra Hepatitis B con esquema completo y tiene seguimiento de anti-HBs para confirmación de inmunidad?'
    ]},
    {id:'lab-informes',icon:'📋',name:'Informes, Trazabilidad y Comunicación',norm:'Res. 3100/2019 Est. 6 · Res. 1995/1999 · Ley 841/2003',q:[
      '¿Los informes contienen: nombre completo del paciente, documento, médico solicitante, fecha de toma, fecha de resultado, valores de referencia y firma del bacteriólogo?',
      '¿Los tiempos de entrega están definidos por tipo y urgencia (urgente ≤60 min, rutina ≤2h para básicos) y se miden periódicamente?',
      '¿El sistema de valores críticos tiene: lista de analitos y rangos, procedimiento de notificación inmediata y registro de cada comunicación?',
      '¿El sistema de información permite rastrear la trayectoria completa de la muestra: solicitud → recepción → procesamiento → resultado → entrega?',
      '¿Los resultados históricos del paciente están disponibles para comparación con resultados actuales (delta check)?',
      '¿Los resultados de exámenes especiales tienen indicación del tiempo de respuesta esperado comunicado al médico solicitante?',
      '¿Existe procedimiento para corrección de resultados erróneos emitidos: anulación documentada, nuevo informe y notificación al médico?',
      '¿La confidencialidad está garantizada: acceso solo al médico solicitante y al paciente, con restricción de acceso a terceros?'
    ]},
  ],
  transporte:[
    {id:'tra-vehiculo',icon:'🚑',name:'Vehículo, Habilitación y Condiciones Técnicas',norm:'Res. 3100/2019 · Dec. 2309/2002 · Min. Transporte · SOAT',q:[
      '¿El vehículo tiene resolución de habilitación vigente como ambulancia expedida por la Secretaría de Salud departamental o distrital?',
      '¿El SOAT del vehículo está vigente y cubre específicamente el transporte de pacientes como actividad principal?',
      '¿La revisión técnico-mecánica (RTM) está vigente y el conductor tiene licencia de conducción categoría C2 o superior activa?',
      '¿El vehículo tiene luces de emergencia, sirena de dos tonos y logotipo visible de "AMBULANCIA" en todos los laterales y parte trasera?',
      '¿El GPS o sistema de rastreo satelital funciona correctamente y está activo durante todos los traslados?',
      '¿El interior del vehículo está en condiciones de higiene verificables: pisos y paredes lavables, con desinfección terminal documentada?',
      '¿El vehículo tiene extintor de polvo ABC vigente (mínimo 2 kg) instalado en posición accesible desde el interior?',
      '¿El sistema de fijación de la camilla principal al piso está operativo con seguros de bloqueo verificados antes de cada traslado?',
      '¿El vehículo tiene capacidad de temperatura controlada (incubadora de transporte) si el servicio habilitado incluye traslados neonatales?'
    ]},
    {id:'tra-th',icon:'👩‍⚕️',name:'Talento Humano por Nivel de Complejidad',norm:'Res. 3100/2019 Est. 1 · RETHUS · BLS/ACLS',q:[
      '¿El TAB (Traslado Asistencial Básico) cuenta con conductor más auxiliar de salud con certificado en primeros auxilios (mínimo 100 horas)?',
      '¿El TAM (Traslado Asistencial Medicalizado) tiene médico o enfermera profesional ADEMÁS del conductor, con tarjeta profesional vigente?',
      '¿El personal de TAM tiene certificación en BLS y ACLS vigente según el nivel de complejidad del servicio habilitado?',
      '¿Todo el personal tiene carné de vacunación con Hepatitis B completo y demás vacunas para riesgo biológico?',
      '¿El personal de traslado neonatal tiene entrenamiento específico en manejo de recién nacido crítico y manejo de incubadora de transporte?',
      '¿Se verifica el estado del conductor (fatiga, alcohol) antes de cada turno largo o traslado de larga distancia?',
      '¿Existe coordinador operativo del servicio disponible para consultas del personal durante traslados complejos o situaciones de emergencia?'
    ]},
    {id:'tra-dotacion',icon:'🏥',name:'Dotación por Nivel y Verificación',norm:'Res. 3100/2019 Est. 2 · Dec. 4725/2005 · Lista Chequeo',q:[
      '¿El TAB tiene: camilla plegable, inmovilizadores, equipo básico de signos vitales (TA, SpO2, FC), botiquín de primeros auxilios?',
      '¿El TAM tiene adicionalmente: monitor desfibrilador bifásico, ventilador de transporte, bomba de infusión y set de intubación completo?',
      '¿El oxígeno está en cilindro con manómetro funcional en cantidad suficiente para el traslado más un 50% de margen adicional?',
      '¿Los equipos biomédicos del vehículo tienen mantenimiento preventivo al día con hoja de vida individual y calibración vigente?',
      '¿Los medicamentos a bordo están vigentes, almacenados a temperatura adecuada y dentro de la lista de autorización por nivel?',
      '¿La camilla principal tiene ruedas operativas con frenos funcionales, barandas laterales y cinturones de seguridad para el paciente?',
      '¿Se realiza verificación de la dotación al inicio de CADA turno con lista de chequeo firmada por el tripulante y archivada?',
      '¿El set de ventilación manual (ambú con mascarillas de diferentes tamaños) está disponible, limpio y con válvula PEEP funcional?'
    ]},
    {id:'tra-registro',icon:'📋',name:'Registro de Traslados y Documentación',norm:'Res. 3100/2019 Est. 6 · Res. 1995/1999',q:[
      '¿Se diligencia hoja de traslado para CADA paciente con: identificación, diagnóstico de remisión, tratamiento previo, origen y destino?',
      '¿Se registran signos vitales al inicio del traslado, durante (cada 15-30 min según complejidad) y al momento de la entrega?',
      '¿La entrega del paciente está documentada con: hora, condición clínica, nombre y firma del profesional receptor?',
      '¿Los registros de traslado se conservan en el establecimiento de origen por mínimo 5 años como parte del expediente clínico?',
      '¿Los medicamentos administrados durante el traslado están registrados con nombre, dosis, vía, hora y firma del profesional?',
      '¿Existe registro de incidentes o eventos ocurridos durante el traslado con reporte al sistema de seguridad del paciente?',
      '¿Los datos de traslados se consolidan en base de datos mensual para calcular indicadores operacionales (volumen, tipo, tiempo)?'
    ]},
    {id:'tra-comunicaciones',icon:'📡',name:'Comunicaciones, Operaciones y CRUE',norm:'Res. 3100/2019 · CRUE · Min. Salud Red de Urgencias',q:[
      '¿El vehículo tiene sistema de comunicación operativo en todo momento: radio, teléfono celular o dispositivo satelital?',
      '¿Existe protocolo documentado de activación del CRUE de la región con datos de contacto actualizados y procedimiento de solicitud?',
      '¿El personal conoce el proceso de notificación al CRUE para traslados secundarios, incluyendo información requerida y tiempos?',
      '¿La central de despacho registra la hora de salida, llegada a destino y regreso a la base de cada traslado realizado?',
      '¿Existe protocolo de comunicación durante el traslado para reporte de cambios en condición del paciente e instrucciones remotas?',
      '¿Se realiza verificación del vehículo, dotación y comunicaciones al INICIO de cada turno con lista de chequeo firmada?'
    ]},
  ],
  rehabilitacion:[
    {id:'reh-th',icon:'🦽',name:'Talento Humano en Rehabilitación',norm:'Res. 3100/2019 Est. 1 · RETHUS · Ley 528/1999 · Ley 376/1997',q:[
      '¿El fisioterapeuta tiene tarjeta profesional vigente en RETHUS conforme a la Ley 528/1999 y está registrado en el REPS?',
      '¿El terapeuta ocupacional tiene tarjeta profesional vigente en RETHUS según Ley 949/2005 para los servicios que presta?',
      '¿El fonoaudiólogo tiene tarjeta profesional vigente en RETHUS conforme a la Ley 376/1997 para los servicios habilitados?',
      '¿Los especialistas en rehabilitación tienen especialización registrada en RETHUS correspondiente a los procedimientos realizados?',
      '¿Los auxiliares de rehabilitación tienen formación técnica o certificado de entrenamiento específico con función definida?',
      '¿El número de profesionales es suficiente para el volumen de pacientes, con máximo de pacientes por profesional documentado?',
      '¿El personal tiene formación documentada en: manejo de paciente con discapacidad, uso de ayudas técnicas y precauciones específicas?',
      '¿Existe protocolo de atención interdisciplinaria con comunicación documentada entre fisioterapia, terapia ocupacional y fonoaudiología?'
    ]},
    {id:'reh-planta',icon:'🏃',name:'Planta Física y Accesibilidad Universal',norm:'Res. 3100/2019 Est. 2 · NSR-10 · Ley 361/1997 · NTC 4143',q:[
      '¿El área de fisioterapia tiene mínimo 20 m² por puesto de atención permitiendo la circulación de sillas de ruedas y camillas sin obstrucción?',
      '¿Las instalaciones cumplen accesibilidad universal: rampas, pasamanos bilaterales, piso antideslizante, puertas ≥90 cm y baño adaptado?',
      '¿El piso es antideslizante, sin desniveles o bordes, resistente a la humedad y de fácil limpieza y desinfección?',
      '¿Las paredes están libres de esquinas cortantes, con recubrimiento lavable y sin elementos de riesgo para el paciente durante los ejercicios?',
      '¿Las camillas están a altura regulable (60-90 cm), en buen estado estructural y sin daños en el recubrimiento con papel protector cambiable?',
      '¿El área de hidroterapia (si aplica) tiene sistema de drenaje eficiente, piso antideslizante especial y control de temperatura del agua?',
      '¿Existe área de espera con sillas, espacio para sillas de ruedas y señalización con buenas condiciones de iluminación y ventilación?',
      '¿Las áreas de ejercicio grupal tienen espacio mínimo de 4 m² por paciente con iluminación adecuada y ventilación que garantice confort?'
    ]},
    {id:'reh-equipos',icon:'⚡',name:'Equipos de Rehabilitación y Tecnovigilancia',norm:'Res. 3100/2019 Est. 2 · Dec. 4725/2005 · INVIMA · Tecnovigilancia',q:[
      '¿Los equipos de electroterapia (ultrasonido, TENS/NMES, láser terapéutico) tienen registros de calibración de salida de energía del último año?',
      '¿Las hojas de vida de cada equipo están actualizadas con historial de mantenimiento preventivo y correctivo documentados?',
      '¿Todos los equipos tienen registro INVIMA vigente como dispositivo médico o autorización de uso explícita del INVIMA?',
      '¿Los equipos dañados están identificados con "NO USAR - En mantenimiento" y retirados del área de atención?',
      '¿Los equipos de ejercicio pasivo-asistido (CPM, plataformas de vibración) tienen verificación de funcionamiento con registro periódico?',
      '¿El establecimiento aplica Tecnovigilancia: reporta al INVIMA incidentes asociados al uso de equipos de rehabilitación?',
      '¿Los accesorios de electrodo (almohadillas, cables, electrodos) se reemplazan según vida útil y se desinfectan entre pacientes?',
      '¿El equipamiento de ayudas técnicas disponible para préstamo está inventariado, limpio y en buen estado funcional?'
    ]},
    {id:'reh-plan',icon:'📋',name:'Plan de Tratamiento y Seguimiento Clínico',norm:'Res. 3100/2019 Est. 6 · Res. 1995/1999 · CIF (OMS)',q:[
      '¿Cada paciente tiene evaluación inicial con: motivo de consulta, diagnóstico médico, diagnóstico funcional en términos de CIF y metas de rehabilitación?',
      '¿El plan de tratamiento está escrito con objetivos SMART y firmado por el profesional responsable?',
      '¿Se registra nota de evolución en CADA sesión con: descripción de la sesión, respuesta del paciente y ajustes al plan terapéutico?',
      '¿El alta está documentada con: criterios de egreso cumplidos, resultados de escalas funcionales al egreso y recomendaciones de mantenimiento?',
      '¿Se aplican escalas funcionales validadas al ingreso, a mitad del tratamiento y al egreso: Barthel, FIM, MRC, Berg, Tinetti?',
      '¿Existe comunicación documentada con el médico remitente sobre evolución, ajustes al plan y resultado del tratamiento?',
      '¿Los consentimientos para procedimientos de fisioterapia (ejercicio de alta intensidad, electroterapia en zonas específicas) están firmados?',
      '¿Existe programa de ejercicio en casa entregado por escrito al paciente con instrucciones comprensibles y verificación de comprensión?'
    ]},
    {id:'reh-bioseg',icon:'🧼',name:'Bioseguridad y Control de Infecciones',norm:'Res. 3100/2019 Est. 5 · Precauciones Estándar OMS',q:[
      '¿Las camillas y superficies de contacto se desinfectan entre cada paciente con producto de espectro de acción adecuado?',
      '¿El papel protector de camilla es de un solo uso y se cambia entre cada paciente, o la cubierta de tela se lava y desinfecta entre pacientes?',
      '¿El personal usa EPP adecuado en procedimientos con riesgo de contacto con fluidos corporales: guantes, mascarilla, gafas cuando aplica?',
      '¿Los equipos en contacto directo con el paciente tienen protocolo de limpieza y desinfección documentado entre cada uso?',
      '¿El personal realiza higiene de manos antes y después de cada paciente con alcohol gel disponible en cada área de tratamiento?',
      '¿Existe protocolo específico para atención de pacientes en aislamiento con EPP requerido y desinfección post-atención?',
      '¿El agua de hidroterapia se renueva entre pacientes o tiene sistema de desinfección activa con niveles monitoreados y registrados?'
    ]},
    {id:'reh-calidad',icon:'📊',name:'Indicadores y Mejoramiento Continuo',norm:'Res. 256/2016 · PAMEC · CIF · OMS',q:[
      '¿El servicio mide indicadores propios: efectividad (cambio en escala funcional), tasa de abandono, satisfacción del paciente?',
      '¿Se realizan auditorías periódicas de historias clínicas de rehabilitación para verificar completitud de escalas y adherencia a protocolos?',
      '¿El servicio tiene planes de mejoramiento activos con acciones concretas, responsables y fechas de cierre vinculados al PAMEC?',
      '¿Existe reunión clínica periódica del equipo para revisión de casos complejos y discusión de protocolos de tratamiento?'
    ]},
  ],
  salud_mental:[
    {id:'sm-th',icon:'🧠',name:'Equipo Interdisciplinario de Salud Mental',norm:'Ley 1616/2013 · Res. 3100/2019 Est. 1 · RETHUS',q:[
      '¿El psiquiatra responsable tiene especialización en psiquiatría registrada en RETHUS y tarjeta profesional vigente?',
      '¿El psicólogo clínico tiene título de psicología con tarjeta profesional vigente y formación en psicología clínica o de la salud?',
      '¿El trabajador social del equipo tiene título profesional en trabajo social con tarjeta profesional vigente en RETHUS?',
      '¿La enfermera especializada en salud mental tiene tarjeta profesional vigente y capacitación documentada en atención psiquiátrica?',
      '¿El terapeuta ocupacional tiene tarjeta profesional vigente y experiencia documentada en rehabilitación psicosocial?',
      '¿Todo el personal tiene capacitación documentada en: derechos del paciente mental (Ley 1616/2013), consentimiento informado y manejo de crisis?',
      '¿Existe médico o psiquiatra disponible para atención de crisis psiquiátricas fuera del horario habitual del servicio?',
      '¿El equipo realiza reuniones clínicas periódicas para revisión de casos, planes terapéuticos y coordinación de alta?'
    ]},
    {id:'sm-planta',icon:'🏢',name:'Planta Física Segura y Terapéutica',norm:'Ley 1616/2013 · Res. 3100/2019 Est. 2 · OPS/OMS Hospitales Seguros',q:[
      '¿Los consultorios de salud mental garantizan privacidad visual y auditiva completa durante la atención con aislamiento acústico?',
      '¿El entorno físico de las unidades de hospitalización está libre de objetos que puedan usarse como instrumentos de autolesión?',
      '¿Los baños tienen diseño seguro: sin bisagras o accesorios que permitan colgamiento, con apertura de emergencia desde fuera?',
      '¿Las ventanas tienen mecanismos de apertura limitada que impiden la salida involuntaria de pacientes en unidades cerradas?',
      '¿Existe sala de actividades terapéuticas separada de los cuartos de descanso, con espacio para terapias grupales y de rehabilitación?',
      '¿El ambiente físico es tranquilizador y terapéutico: iluminación cálida, colores no agresivos, ruido controlado y acceso a espacios exteriores?',
      '¿Existe sala de observación directa o cuarto de alta vigilancia para pacientes en crisis aguda o con conducta autolesiva activa?',
      '¿La unidad tiene salida de emergencia diferenciada de la entrada principal con sistema de alarma ante apertura no autorizada?'
    ]},
    {id:'sm-derechos',icon:'⚖️',name:'Derechos del Paciente Mental y Marco Legal',norm:'Ley 1616/2013 Art. 6 · Ley 1751/2015 · CDPD-ONU',q:[
      '¿Existe protocolo que garantiza el derecho del paciente a recibir información sobre diagnóstico, tratamiento y alternativas en lenguaje comprensible?',
      '¿El consentimiento informado en salud mental se obtiene con valoración previa de la capacidad mental del paciente?',
      '¿Está prohibido explícitamente y se verifica que el aislamiento y la contención física no se usan como medidas disciplinarias o punitivas?',
      '¿El establecimiento reporta a Supersalud y Secretaría de Salud TODOS los casos de contención física con justificación clínica y duración?',
      '¿Los pacientes hospitalizados tienen acceso a comunicación con su familia o representante legal en condiciones de confidencialidad?',
      '¿Existe mecanismo de PQRSF específico para el servicio con análisis de quejas relacionadas con derechos de pacientes con enfermedad mental?',
      '¿El establecimiento tiene protocolo para hospitalización involuntaria con verificación de la orden judicial o criterios médicos justificantes?',
      '¿El personal conoce y aplica el enfoque de recuperación y la filosofía de atención centrada en la persona con enfermedad mental?'
    ]},
    {id:'sm-hc',icon:'📄',name:'Historia Clínica Psiquiátrica y Registros',norm:'Res. 1995/1999 · Ley 1616/2013 · CIE-10/DSM-5',q:[
      '¿La historia clínica incluye anamnesis completa con antecedentes psiquiátricos propios y familiares, historia de tratamientos previos y respuesta?',
      '¿El examen mental inicial está estructurado y documenta: apariencia, actitud, psicomotricidad, lenguaje, pensamiento, percepción, afecto, cognición y juicio?',
      '¿El diagnóstico está formulado con criterios del CIE-10 o DSM-5 con especificación de subtipos y gravedad cuando aplica?',
      '¿Se aplican escalas diagnósticas validadas al ingreso y seguimiento: HAM-D, BPRS, PHQ-9, YMRS, GAF?',
      '¿El plan terapéutico está documentado con: metas a corto y largo plazo, intervenciones farmacológicas, psicoterapéuticas y psicosociales?',
      '¿Las notas de evolución de psiquiatría, psicología y trabajo social están en la historia con fechas, firmas y son coherentes entre sí?',
      '¿Los resultados de evaluaciones psicológicas formales están en la historia con interpretación profesional?',
      '¿El plan de alta incluye: diagnóstico de egreso, medicamentos con dosis y duración, citas de seguimiento, señales de alarma y plan de crisis?'
    ]},
    {id:'sm-crisis',icon:'🚨',name:'Manejo de Crisis y Emergencias Psiquiátricas',norm:'Ley 1616/2013 Art. 22 · Res. 3100/2019 · Guías Clínicas MSPS',q:[
      '¿Existe protocolo escrito para manejo de crisis psiquiátrica aguda con: algoritmo de decisión, criterios de hospitalización y derivación a urgencias?',
      '¿El personal tiene entrenamiento certificado en técnicas de des-escalada verbal y manejo no violento de la agresión en salud mental?',
      '¿Está disponible medicación para sedación de urgencia (haloperidol, risperidona, diazepam, lorazepam) con autorización médica y protocolo de uso?',
      '¿Se realiza evaluación de riesgo suicida en TODA consulta de salud mental con escala validada (Columbia SSRS, SAFE-T) y se registra en HC?',
      '¿El protocolo de manejo de conducta suicida incluye: plan de seguridad, restricción de medios letales, compromiso del paciente y seguimiento?',
      '¿Existe protocolo de contención mecánica para agitación extrema: indicaciones, técnica, tiempo máximo, monitoreo y registro obligatorio?',
      '¿El personal conoce el código de respuesta a emergencia psiquiátrica con roles definidos para cada miembro del equipo?',
      '¿Existe enlace y protocolo coordinado con urgencias para traslado inmediato de pacientes en crisis que superen la capacidad del servicio?'
    ]},
    {id:'sm-rehab',icon:'🌱',name:'Rehabilitación Psicosocial e Integración',norm:'Ley 1616/2013 Art. 8 · OMS Mental Health Action Plan 2013-2030',q:[
      '¿Existe programa de rehabilitación psicosocial con actividades grupales documentadas: psicoeducación, habilidades sociales, terapia ocupacional?',
      '¿La familia o cuidador recibe psicoeducación formal sobre la enfermedad, el tratamiento, señales de alarma y estrategias de apoyo en casa?',
      '¿Hay seguimiento post-egreso con citas programadas de control ambulatorio en la primera semana y al mes para pacientes de alto riesgo?',
      '¿Se mide la funcionalidad del paciente al inicio y al final de cada episodio con escala GAF, WHODAS 2.0 u otra validada?',
      '¿El programa de rehabilitación contempla apoyo para la reinserción laboral, educativa y social del paciente con trastorno mental grave?',
      '¿Existe articulación con servicios comunitarios de salud mental para la continuidad del tratamiento post-alta?',
      '¿El plan de rehabilitación considera las barreras del entorno social y económico del paciente con estrategias para abordarlas?'
    ]},
  ],
  odontologia:[
    {id:'odo-th',icon:'🦷',name:'Talento Humano Odontológico',norm:'Res. 3100/2019 Est. 1 · Ley 35/1989 · RETHUS · Ley 711/2001',q:[
      '¿El odontólogo general tiene tarjeta profesional vigente en RETHUS conforme a la Ley 35/1989?',
      '¿Los especialistas tienen especialización registrada en RETHUS para los procedimientos específicos que realizan (ortodoncia, endodoncia, periodoncia, cirugía, odontopediatría)?',
      '¿El auxiliar de odontología tiene certificado vigente de auxiliar de consultorio odontológico de institución técnica reconocida conforme a la Ley 711/2001?',
      '¿El personal tiene carné de vacunación con Hepatitis B (3 dosis) completo y vigente como requisito para trabajar en el consultorio?',
      '¿Existe manual de funciones para cada cargo con responsabilidades del auxiliar diferenciadas claramente de las del odontólogo?',
      '¿El personal tiene capacitación documentada en: bioseguridad odontológica, manejo de residuos RESPEL y accidente biológico en los últimos 12 meses?',
      '¿El odontólogo tiene actualización documentada en el protocolo de emergencias médicas en consultorio dental en los últimos 2 años?',
      '¿El odontólogo conoce y aplica las normas éticas de la profesión en cuanto a consentimiento informado y relación odontólogo-paciente?'
    ]},
    {id:'odo-dotacion',icon:'🪥',name:'Unidad Odontológica y Equipos',norm:'Res. 3100/2019 Est. 2 · Dec. 4725/2005 · INVIMA · Res. 4445/1996',q:[
      '¿Cada consultorio tiene unidad completa (sillón dental regulable, escupidera funcional, lámpara de luz fría, jeringa triple) en buen estado?',
      '¿El compresor dental es libre de aceite (oil-free) o tiene filtros de aceite y humedad certificados con cambio según indicaciones del fabricante?',
      '¿El equipo de rayos X intraoral tiene registro INVIMA vigente y el odontólogo operador tiene dosímetro personal con lectura mensual registrada?',
      '¿Las piezas de mano de alta y baja velocidad se esterilizan en autoclave clase B después de CADA paciente sin excepción?',
      '¿Los equipos de rayos X tienen blindaje plomado verificado, señalización de radiación y el operador se ubica a distancia segura o detrás de barrera?',
      '¿La lámpara de fotopolimerización tiene intensidad de luz verificada periódicamente con radiómetro, con registro de las mediciones?',
      '¿El equipo de ultrasonido para detartraje tiene punta en buen estado sin fisuras y el equipo tiene mantenimiento preventivo al día?',
      '¿Los equipos tienen hoja de vida individual con registro de mantenimiento y el registro INVIMA vigente o autorización de uso?',
      '¿El kit de emergencias del consultorio incluye: epinefrina 1:1000, vasodilatadores, glucosa, aspirina, jeringas y protocolo de uso?'
    ]},
    {id:'odo-esterilizacion',icon:'♻️',name:'Esterilización y Reprocesamiento de Instrumental',norm:'Res. 3100/2019 Est. 5 · AAMI ST79 · CDC Esterilización Dental',q:[
      '¿El consultorio tiene autoclave de vapor saturado clase B con impresión de registro de cada ciclo (temperatura, presión, tiempo, resultado)?',
      '¿Se realizan controles biológicos semanales con indicador biológico (Geobacillus stearothermophilus) con resultado archivado por mínimo 1 año?',
      '¿Los indicadores químicos de proceso (tipo 5 o 6) se incluyen dentro de CADA paquete esterilizado y se revisan antes del uso?',
      '¿El instrumental se somete al ciclo completo: pre-limpieza inmediata → limpieza → inspección → secado → empaque → esterilización?',
      '¿Los empaques tienen: fecha de esterilización, fecha de vencimiento de esterilidad, número de ciclo e iniciales del responsable?',
      '¿El almacenamiento del instrumental estéril garantiza temperatura <24°C, humedad <70%, estantes cerrados y protección contra daño del empaque?',
      '¿El instrumental de un solo uso (agujas, carpules, eyectores, fresas de uso único) se descarta sin excepción después de cada paciente?',
      '¿Existe registro de cada carga esterilizada con: contenido, fecha, ciclo, parámetros y resultado del indicador interno y biológico?',
      '¿El manejo de cuerpos cortantes (fresas, limas de endodoncia) se realiza con guardián al lado de la unidad para descarte seguro?'
    ]},
    {id:'odo-bioseg',icon:'🛡️',name:'Bioseguridad Odontológica Integral',norm:'Res. 3100/2019 Est. 5 · Dec. 351/2014 · Precauciones Estándar OMS',q:[
      '¿El profesional usa en CADA atención: guantes de nitrilo o látex, mascarilla N95/FFP2 o quirúrgica, gafas protectoras o pantalla facial y bata de manga larga?',
      '¿El protocolo de lavado de manos clínico (6 pasos OMS, mínimo 40 segundos) se aplica antes de ponerse guantes y después de quitarlos?',
      '¿Los guardianes para agujas dentales y cortopunzantes están disponibles AL LADO de la unidad y se reemplazan sin superar el 75% de capacidad?',
      '¿La superficie de la unidad (sillón, lámpara, jeringa triple, mangos) se cubre con barreras de protección (plástico) que se cambian entre cada paciente?',
      '¿Los residuos RESPEL se segregan correctamente: cortopunzantes en guardián rígido, tejidos (dientes) en bolsa roja, amalgama en recipiente especial?',
      '¿Los dientes extraídos se manejan como residuo anatomopatológico en bolsa roja con contrato de gestión específico para disposición final?',
      '¿La amalgama residual y residuos de amalgama tienen recipiente especial y contrato de gestión con empresa autorizada?',
      '¿Existe protocolo de manejo de aerosoles: uso de dique de goma, succión de alta potencia y ventilación adecuada del consultorio?',
      '¿El establecimiento tiene protocolo de accidente biológico (pinchazo, salpicadura) con: lavado inmediato, reporte al jefe, valoración médica y seguimiento?'
    ]},
    {id:'odo-hc',icon:'📋',name:'Historia Clínica Odontológica y Documentación',norm:'Res. 1995/1999 · Res. 3100/2019 Est. 6 · Ley 35/1989',q:[
      '¿Cada paciente tiene historia clínica odontológica con odontograma actualizado desde la primera consulta y actualizado en cada cambio significativo?',
      '¿El consentimiento informado para cada procedimiento (extracción, endodoncia, cirugía, blanqueamiento) especifica: diagnóstico, procedimiento, riesgos, alternativas y cuidados post?',
      '¿El plan de tratamiento está registrado con: procedimientos a realizar, secuencia lógica y firma del paciente aceptando el plan?',
      '¿Las notas de evolución por sesión describen: procedimiento realizado, materiales usados (con lote y fecha de vencimiento), anestesia aplicada y condición al finalizar?',
      '¿Los registros de radiografías incluyen: tipo de radiografía, fecha, interpretación por el odontólogo y vinculación al caso clínico?',
      '¿Existe registro de alergias del paciente (lidocaína, latex, penicilina) con alerta visible en la portada de la historia clínica?',
      '¿Las historias clínicas se conservan por mínimo 20 años post-última atención con acceso restringido y custodia documentada?',
      '¿Los cambios al tratamiento (modificaciones del plan, complicaciones, derivaciones) están documentados con justificación clínica?'
    ]},
    {id:'odo-calidad',icon:'📊',name:'Indicadores y Mejoramiento del Consultorio',norm:'Res. 256/2016 · PAMEC · Res. 3100/2019 Est. 6',q:[
      '¿El consultorio mide indicadores propios: tasa de accidentes biológicos, controles biológicos fallidos, satisfacción del usuario?',
      '¿Existe revisión periódica del protocolo de esterilización con acciones de mejoramiento ante controles biológicos positivos?',
      '¿Se realizan auditorías de historias clínicas para verificar completitud del odontograma, consentimientos y notas de evolución?',
      '¿El consultorio tiene plan de mejoramiento activo vinculado al PAMEC de la institución o a la autoevaluación del sistema de gestión?'
    ]},
  ],
};

const SEG_INFO={
  general:{norm:'📋 Normativa: Res. 3100/2019 + modificaciones (2215/2020, 1317/2021, 1138/2022, 544/2023)',areas:'8 estándares del Manual de Habilitación'},
  domiciliaria:{norm:'📋 Normativa: Decreto 780/2016 · Res. 3100/2019 · Servicios domiciliarios',areas:'7 áreas operativas'},
  urgencias:{norm:'📋 Normativa: Res. 3100/2019 · Urgencias · Triage 5 niveles · CRUE',areas:'6 áreas de urgencias'},
  internacion:{norm:'📋 Normativa: Res. 3100/2019 · Internación · IAAS · Res. 256/2016',areas:'6 áreas de hospitalización'},
  quirurgicos:{norm:'📋 Normativa: Res. 3100/2019 · Quirúrgicos · OMS Lista Chequeo · Est. 5',areas:'6 áreas quirúrgicas'},
  laboratorio:{norm:'📋 Normativa: Res. 3100/2019 · PEEC MinSalud · Decreto 4725/2005',areas:'6 áreas de laboratorio'},
  transporte:{norm:'📋 Normativa: Res. 3100/2019 · Dec. 2309/2002 · Ministerio de Transporte',areas:'5 áreas de transporte'},
  rehabilitacion:{norm:'📋 Normativa: Res. 3100/2019 · Est. 1,2,5,6 · Rehabilitación · Decreto 4725',areas:'5 áreas de rehabilitación'},
  salud_mental:{norm:'📋 Normativa: Ley 1616/2013 · Res. 3100/2019 · Derechos del paciente mental',areas:'6 áreas de salud mental'},
  odontologia:{norm:'📋 Normativa: Res. 3100/2019 · Est. 5 Esterilización · Decreto 351/2014',areas:'5 áreas odontológicas'},
  imagenologia:{norm:'📋 Normativa: Res. 4445/1996 · Res. 9031/1990 · Decreto 4725/2005',areas:'7 áreas radiológicas'},
};

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT — NormaLis IA
// ═══════════════════════════════════════════════════════════════
const SYSTEM_PROMPT = `Eres NormaLis IA, asistente especializado en normativa colombiana de habilitación de servicios de salud, PAMEC, SG-SST y calidad en salud.

CORPUS NORMATIVO VERIFICADO (julio 2026):

=== RESOLUCIÓN 3100 DE 2019 — HABILITACIÓN DE SERVICIOS DE SALUD ===
MODIFICADA POR: Resolución 544/2023 (Art. 2 y 3), Resolución 465/2025 (Art. 4, 5, 19 y 20).

ART. 1. OBJETO: Definir procedimientos y condiciones de inscripción de prestadores y habilitación de servicios de salud (Anexo Técnico con estándares).

ART. 2. CAMPO DE APLICACIÓN (mod. Res. 544/2023): IPS, profesionales independientes, transporte especial de pacientes, entidades con objeto social diferente, secretarías de salud, entidades responsables del pago, Supersalud.

ART. 3. CONDICIONES DE HABILITACIÓN (mod. Res. 544/2023):
3.1. Capacidad técnico-administrativa.
3.2. Suficiencia patrimonial y financiera.
3.3. Capacidad tecnológica y científica (7 estándares del Manual de Habilitación).

ART. 4. INSCRIPCIÓN Y HABILITACIÓN (mod. Res. 465/2025): Todo prestador debe estar inscrito en REPS con mínimo una sede con infraestructura física y al menos un servicio habilitado. La inscripción se realiza ante la Secretaría de Salud departamental o distrital.

ART. 5. AUTOEVALUACIÓN (mod. Res. 465/2025) — OBLIGATORIA EN 4 MOMENTOS:
5.1. Previa a inscripción inicial.
5.2. Durante el CUARTO AÑO de vigencia.
5.3. Antes del vencimiento de renovación anual.
5.4. Casos adicionales definidos en el Manual de Habilitación.
Consecuencia por no autoevaluación: INACTIVACIÓN de la inscripción (Art. 11).

ART. 9. RESPONSABILIDAD: El prestador es el ÚNICO RESPONSABLE. No puede delegar en terceros.

ART. 10. VIGENCIA: Inscripción inicial: CUATRO (4) AÑOS. Renovación: UN (1) AÑO.

ART. 13. CIERRE TEMPORAL: Máximo UN (1) AÑO.

ART. 14. VISITA DE VERIFICACIÓN PREVIA — obligatoria para: oncología, urgencias, atención del parto, transporte asistencial, TODOS los servicios de alta complejidad, reactivación por medidas de seguridad.

ART. 22. GRATUIDAD: La inscripción y habilitación en REPS son COMPLETAMENTE GRATUITAS.

7 ESTÁNDARES DE HABILITACIÓN:
1. TALENTO HUMANO — perfiles, contratos, matrículas RETHUS, inducción, capacitación.
2. INFRAESTRUCTURA — condiciones físicas, accesibilidad, señalización, mantenimiento locativo.
3. DOTACIÓN — equipos biomédicos, hojas de vida, mantenimiento, calibración, INVIMA.
4. MEDICAMENTOS, DISPOSITIVOS MÉDICOS E INSUMOS — cadena de frío, almacenamiento, farmacovigilancia.
5. PROCESOS PRIORITARIOS — protocolos, bioseguridad, referencia/contrarreferencia, consentimiento informado, gestión del riesgo.
6. HISTORIA CLÍNICA Y REGISTROS — custodia 20 años, confidencialidad, componentes mínimos, HCE con log.
7. INTERDEPENDENCIA — servicios de apoyo necesarios para la prestación segura.

DEFINICIONES CLAVE:
"CUENTA CON": existencia OBLIGATORIA y PERMANENTE en el servicio.
"DISPONIBILIDAD": obligatoria pero puede estar fuera del área, accesible de inmediato.

REQUISITOS ESPECÍFICOS POR TIPO DE SERVICIO:
— CONSULTA EXTERNA: consultorio ≥10 m², camilla, lavamanos, privacidad auditiva/visual, médico con contrato, horarios definidos.
— URGENCIAS: atención 24h/365, médico PERMANENTE en sitio, área de triage, camillas, DEA operativo, oxígeno medicinal, carro de paro, acceso sin barreras.
— HOSPITALIZACIÓN: 6 m² por cama (hospitalización general), 10 m² (UCI), llamado de enfermería, unidad sanitaria diferenciada por sexo, ciclo de rondas documentado.
— CIRUGÍA AMBULATORIA: quirófano con presión positiva, mesa quirúrgica, lámpara cialítica, electrobisturí, anestesiólogo disponible, área de recuperación.
— UCI/UCIN: mínimo 10 m² por puesto, ventilador mecánico por puesto, monitor multiparámetro, médico intensivista 24h, relación enfermera 1:2 (UCI adultos) o 1:3 (UCIN).
— IMAGENOLOGÍA: operador con tarjeta RNTT, equipos con licencia de funcionamiento Ministerio de Minas, dosimetría del personal, protocolo de protección radiológica.
— LABORATORIO CLÍNICO: área de toma de muestras separada, bioseguridad nivel II mínimo, participación en programa de evaluación externa de calidad (PEEC).

=== RESOLUCIÓN 465 DE 2025 ===
Modifica Arts. 4, 5, 19 y 20 de Res. 3100/2019.
ART. 19 ACTUALIZADO: Elimina requisito de barrera física fija/móvil entre área de entrevista y examen en consultorios para menores de 5 años. Exige documento de autorización del paciente/representante Y del profesional si hay videovigilancia que grabe procedimientos, archivado en Historia Clínica (Sentencia T-144/2024).
ART. 7 (vacunación fuera del servicio): Si se vacuna fuera del servicio habilitado, documentar en Procesos Prioritarios: garantía de cadena de frío, obtención de biológicos y registros clínicos.

=== DECRETO 1011 DE 2006 — SOGCS (Sistema Obligatorio de Garantía de Calidad) ===
4 COMPONENTES DEL SOGCS:
1. HABILITACIÓN: condiciones básicas de capacidad tecnológica y científica (Res. 3100/2019).
2. PAMEC: auditoría para el mejoramiento continuo de la calidad.
3. SISTEMA ÚNICO DE ACREDITACIÓN: nivel superior de calidad (voluntario).
4. SISTEMA DE INFORMACIÓN PARA LA CALIDAD: indicadores obligatorios.

=== PAMEC — Programa de Auditoría para el Mejoramiento de la Calidad en Salud ===
BASE LEGAL: Dec. 1011/2006 Arts. 32-38. Res. 1446/2006 (SIC). Res. 256/2016 (indicadores).
OBLIGATORIO para: todas las IPS habilitadas, EPS, entidades responsables del pago.

CICLO PAMEC (PHVA aplicado a salud):
1. AUTOEVALUACIÓN: identificar brechas entre calidad esperada y observada.
2. SELECCIÓN DE PROCESOS A MEJORAR: priorizar por impacto en seguridad del paciente.
3. DEFINICIÓN DE PLANES DE MEJORAMIENTO: acciones, responsables, tiempos, indicadores.
4. SEGUIMIENTO: medición periódica de indicadores, ajuste de planes.

PROCESOS PRIORITARIOS DE SEGURIDAD DEL PACIENTE (Res. 256/2016 — Res. 2003/2014):
1. Identificación correcta del paciente (2 identificadores antes de todo procedimiento).
2. Higiene de manos (5 momentos OMS).
3. Comunicación efectiva (entrega de turno SBAR o equivalente).
4. Medicamentos de alto riesgo (etiquetado "LASA", doble chequeo, almacenamiento diferenciado).
5. Cirugía segura (lista de verificación OMS: antes de anestesia, antes de incisión, antes de salir).
6. Prevención de caídas (Escala Morse al ingreso, intervenciones preventivas, registro).
7. Prevención de úlceras por presión — UPP (Escala Braden/Norton, movilización, colchón especial).

INDICADORES DE CALIDAD OBLIGATORIOS (Res. 256/2016):
— Tasa de infección de sitio operatorio.
— Tasa de infección asociada a dispositivo (catéter venoso central, sonda vesical, ventilador).
— Tasa de reingresos no programados a urgencias en 72h.
— Prevalencia de úlceras por presión.
— Tasa de eventos adversos reportados.
— Satisfacción global del usuario.
Reporte: al Sistema de Información para la Calidad según cronograma del Ministerio.

=== RESOLUCIÓN 0312 DE 2019 — ESTÁNDARES MÍNIMOS SG-SST ===
BASE LEGAL: Dec. 1072/2015 (Libro 2, Parte 2, Título 4, Capítulo 6).
APLICA A: todos los empleadores del sector privado y público de Colombia.

ESTÁNDARES SEGÚN TAMAÑO Y NIVEL DE RIESGO:

GRUPO A — ≤10 trabajadores, riesgo I o II: 7 ESTÁNDARES MÍNIMOS
1. Asignar responsable del SG-SST (puede ser el empleador).
2. Afiliación a ARL, EPS y pensiones de todos los trabajadores.
3. Capacitación mínima en seguridad y salud (mínimo 4 temas/año).
4. Plan anual de trabajo documentado.
5. Evaluaciones médicas ocupacionales (ingreso, periódicas, egreso).
6. Identificación de peligros y valoración de riesgos.
7. Medidas de prevención y control de peligros.

GRUPO B — 11-50 trabajadores, riesgo I, II o III: 21 ESTÁNDARES
Incluye Grupo A más:
— Política de SST firmada por el representante legal y comunicada.
— Objetivos del SG-SST medibles y documentados.
— Rendición de cuentas interna anual.
— Normativa vigente aplicable al SG-SST.
— Comunicación interna y externa sobre SST.
— Adquisiciones con criterios de SST.
— Contratistas: verificación de afiliación y capacitación.
— COPASST (Comité Paritario) o Vigía de SST: conformación y registro.
— Comité de Convivencia Laboral.
— Investigación de incidentes, accidentes y enfermedades laborales.
— Medición y evaluación del SG-SST (indicadores de estructura, proceso y resultado).

GRUPO C — ≥50 trabajadores o riesgo IV o V: 60 ESTÁNDARES COMPLETOS
Incluye todos los anteriores más:
— Revisión anual por la alta dirección.
— Acciones preventivas y correctivas.
— Auditoría anual del SG-SST.
— Plan de emergencias y simulacros documentados.
— Brigada de emergencias capacitada.
— Programa de vigilancia epidemiológica (según peligros prioritarios).
— Indicadores del SG-SST: estructura, proceso y resultado.

FASES DE IMPLEMENTACIÓN (vigentes):
Fase 1 — Evaluación inicial: diagnóstico del estado del SG-SST.
Fase 2 — Plan de mejoramiento: acciones para cerrar brechas.
Fase 3 — Ejecución: implementación del SG-SST.
Fase 4 — Seguimiento y plan de mejora: auditoría y revisión anual.
Fase 5 — Inspección, vigilancia y control: verificación por Ministerio o ARL.

SANCIONES POR INCUMPLIMIENTO SG-SST:
— Multas hasta 500 SMMLV (Art. 91 Dec. 1295/1994 mod. Ley 1562/2012).
— Cierre temporal o definitivo del establecimiento.
— Responsabilidad penal del representante legal en caso de accidente grave o muerte.

=== RESOLUCIÓN 1446 DE 2006 — SISTEMA DE INFORMACIÓN PARA LA CALIDAD ===
Establece indicadores de calidad de obligatorio cumplimiento y reporte al Ministerio.
Complementada y actualizada por Res. 256/2016.

=== REGLAS PARA APLICAR EN AUDITORÍAS NormaLis ===
Las preguntas de auditoría de NormaLis se basan en estos estándares. Cuando un usuario pregunte sobre un criterio de habilitación:
— Citar el estándar y artículo exacto.
— Indicar si es "CUENTA CON" (obligatorio permanente) o "DISPONIBILIDAD".
— Mencionar la consecuencia de incumplimiento (no habilitación, medida de seguridad).

REGLAS DE RESPUESTA:
1. Citar SIEMPRE el artículo exacto, la resolución y el año.
2. Si el artículo fue MODIFICADO, citar la versión VIGENTE (no la original).
3. Si la pregunta es sobre PAMEC: citar Dec. 1011/2006 y Res. 256/2016.
4. Si la pregunta es sobre SG-SST: identificar el grupo (A/B/C) según tamaño y riesgo antes de responder.
5. Si no está en el corpus: decir "No encontré información verificada en mi corpus. Verifica en minsalud.gov.co, mintrabajo.gov.co o contacta tu Secretaría de Salud."
6. NUNCA inventar artículos, fechas, plazos, porcentajes o requisitos.
7. Responder en español colombiano, tono profesional, máximo 6 párrafos.
8. Advertir que la interpretación definitiva la tiene la autoridad competente (Secretaría de Salud departamental o Ministerio de Trabajo).`;

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://normalis.co',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}


// ── /api/areas handler ────────────────────────────────────────────────────
async function handleAreas(request, cors) {
  const authHeader = request.headers.get('Authorization') || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) {
    return new Response(JSON.stringify({ error: 'Token requerido' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // Verificar token con Firebase REST API
  try {
    const fbRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }) }
    );
    if (!fbRes.ok) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const fbData = await fbRes.json();
    if (!fbData.users || fbData.users.length === 0) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Error verificando token' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ areasDB: AREAS_DB, segInfo: SEG_INFO }), {
    status: 200,
    headers: {
      ...cors,
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL SERVICE — Resend API (server-side, clave nunca expuesta al cliente)
// ═══════════════════════════════════════════════════════════════════════════════

// Rate limiting simple para endpoints públicos (lead emails)
// Usa Map en memoria — se resetea en cada nuevo Worker instance (~minutos)
const _leadRateMap = new Map();
function checkLeadRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minuto
  const maxPerWindow = 3;      // máx 3 leads por IP por minuto
  const key = ip || 'unknown';
  const entry = _leadRateMap.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
  entry.count++;
  _leadRateMap.set(key, entry);
  return entry.count <= maxPerWindow;
}

// Rate limiting para el formulario público de PQRS — ventana más larga porque
// son envíos deliberados de pacientes, no autocompletado ni scraping
const _pqrsRateMap = new Map();
function checkPqrsRateLimit(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutos
  const maxPerWindow = 5;           // máx 5 PQRS por IP cada 10 minutos
  const key = ip || 'unknown';
  const entry = _pqrsRateMap.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
  entry.count++;
  _pqrsRateMap.set(key, entry);
  return entry.count <= maxPerWindow;
}

// Verificar Firebase ID token → retorna { uid, email } o null
async function verifyFirebaseToken(idToken) {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const user = data?.users?.[0];
    return user ? { uid: user.localId, email: user.email } : null;
  } catch { return null; }
}

// Plantillas HTML de email
function tplBienvenidaPiloto({ ips_nombre, to_name, email_acceso, password_temporal, fecha_onboarding, meet_link }) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
  .header{background:#00544B;padding:32px 40px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:24px}
  .body{padding:32px 40px;color:#1e293b;line-height:1.6}
  .box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0}
  .box code{background:#00544B;color:#fff;padding:4px 10px;border-radius:4px;font-size:15px}
  .btn{display:inline-block;background:#00796B;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:16px}
  .footer{background:#f8fafc;padding:16px 40px;font-size:12px;color:#94a3b8;text-align:center}
  </style></head><body>
  <div class="wrap">
    <div class="header"><h1>🏥 Bienvenidos a NormaLis</h1></div>
    <div class="body">
      <p>Hola <strong>${to_name || ips_nombre}</strong>,</p>
      <p>Tu IPS <strong>${ips_nombre}</strong> ya está registrada en NormaLis. Aquí están tus credenciales de acceso:</p>
      <div class="box">
        <p><strong>📧 Correo:</strong> ${email_acceso}</p>
        <p><strong>🔑 Contraseña temporal:</strong> <code>${password_temporal || 'NormaLis2026!'}</code></p>
        <p><em>Por seguridad, cambia tu contraseña en el primer ingreso.</em></p>
      </div>
      ${fecha_onboarding ? `<p><strong>📅 Sesión de onboarding:</strong> ${fecha_onboarding}</p>` : ''}
      ${meet_link ? `<p><strong>🎥 Enlace reunión:</strong> <a href="${meet_link}">${meet_link}</a></p>` : ''}
      <a href="https://normalis.co/login.html" class="btn">Ingresar a NormaLis →</a>
      <p style="margin-top:24px;font-size:13px;color:#64748b">¿Tienes preguntas? Escríbenos a <a href="mailto:fjfc1984@gmail.com">fjfc1984@gmail.com</a></p>
    </div>
    <div class="footer">NormaLis — Cumplimiento normativo inteligente para IPS colombianas<br>© 2026 NormaLis. Todos los derechos reservados.</div>
  </div></body></html>`;
}

function tplBienvenidaAprobado({ ips_nombre, nombre_contacto, login_url }) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
  .header{background:#00544B;padding:32px 40px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:24px}
  .body{padding:32px 40px;color:#1e293b;line-height:1.6}
  .badge{display:inline-block;background:#dcfce7;color:#166534;border:1px solid #86efac;border-radius:20px;padding:6px 16px;font-weight:700;font-size:14px;margin-bottom:16px}
  .btn{display:inline-block;background:#00796B;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:16px}
  .footer{background:#f8fafc;padding:16px 40px;font-size:12px;color:#94a3b8;text-align:center}
  </style></head><body>
  <div class="wrap">
    <div class="header"><h1>✅ Acceso Aprobado</h1></div>
    <div class="body">
      <div class="badge">✅ Tu cuenta ha sido aprobada</div>
      <p>Hola <strong>${nombre_contacto || ips_nombre}</strong>,</p>
      <p>Nos complace informarte que el acceso de <strong>${ips_nombre}</strong> a NormaLis ha sido <strong>aprobado</strong>.</p>
      <p>Ya puedes ingresar a la plataforma y comenzar a gestionar el cumplimiento normativo de tu IPS con las herramientas de auditoría de la Res. 3100/2019 y Res. 465/2025.</p>
      <a href="${login_url || 'https://normalis.co/login.html'}" class="btn">Ingresar ahora →</a>
      <p style="margin-top:24px;font-size:13px;color:#64748b">¿Tienes preguntas? Escríbenos a <a href="mailto:fjfc1984@gmail.com">fjfc1984@gmail.com</a></p>
    </div>
    <div class="footer">NormaLis — Cumplimiento normativo inteligente para IPS colombianas<br>© 2026 NormaLis. Todos los derechos reservados.</div>
  </div></body></html>`;
}

function tplLeadAdmin({ nombre, email, ips, tipo }) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
  .header{background:#1e293b;padding:24px 40px}
  .header h1{color:#fff;margin:0;font-size:20px}
  .body{padding:28px 40px;color:#1e293b;line-height:1.6}
  .row{display:flex;margin:8px 0;gap:12px}
  .label{font-weight:700;min-width:80px;color:#64748b}
  .badge{display:inline-block;background:#fef3c7;color:#92400e;border-radius:12px;padding:3px 12px;font-size:12px;font-weight:700}
  </style></head><body>
  <div class="wrap">
    <div class="header"><h1>📥 Nuevo Lead — NormaLis</h1></div>
    <div class="body">
      <p><strong>Nuevo prospecto capturado:</strong></p>
      <div class="row"><span class="label">Nombre:</span><span>${nombre}</span></div>
      <div class="row"><span class="label">Email:</span><span><a href="mailto:${email}">${email}</a></span></div>
      <div class="row"><span class="label">IPS:</span><span>${ips || '—'}</span></div>
      <div class="row"><span class="label">Origen:</span><span><span class="badge">${tipo || 'demo'}</span></span></div>
      <p style="margin-top:16px;font-size:13px;color:#64748b">Contactar dentro de las próximas 24 horas.</p>
    </div>
  </div></body></html>`;
}

function tplLeadAutoreply({ nombre, email }) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
  .header{background:#00544B;padding:32px 40px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:22px}
  .body{padding:32px 40px;color:#1e293b;line-height:1.7}
  .footer{background:#f8fafc;padding:16px 40px;font-size:12px;color:#94a3b8;text-align:center}
  </style></head><body>
  <div class="wrap">
    <div class="header"><h1>¡Gracias por tu interés en NormaLis!</h1></div>
    <div class="body">
      <p>Hola <strong>${nombre}</strong>,</p>
      <p>Recibimos tu solicitud. En las próximas <strong>24 horas hábiles</strong> un asesor de NormaLis se pondrá en contacto contigo para mostrarte cómo la plataforma puede simplificar el proceso de habilitación de tu IPS.</p>
      <p>Mientras tanto, puedes conocer más sobre nuestras funcionalidades en <a href="https://normalis.co">normalis.co</a>.</p>
      <p style="margin-top:24px;color:#64748b;font-size:13px">Si tienes una pregunta urgente, escríbenos directamente a <a href="mailto:fjfc1984@gmail.com">fjfc1984@gmail.com</a></p>
    </div>
    <div class="footer">NormaLis — Cumplimiento normativo inteligente para IPS colombianas<br>© 2026 NormaLis. Todos los derechos reservados.</div>
  </div></body></html>`;
}


function tplNuevaSolicitudAdmin({ ips_nombre, nit, tipo_ips, ciudad, nombre_contacto, cargo, email, telefono, uid }) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
  .header{background:#00544B;padding:24px 40px}
  .header h1{color:#fff;margin:0;font-size:20px}
  .header p{color:#a7f3d0;margin:4px 0 0;font-size:13px}
  .body{padding:28px 40px;color:#1e293b;line-height:1.6}
  .row{display:flex;margin:8px 0;gap:12px;border-bottom:1px solid #f1f5f9;padding-bottom:8px}
  .label{font-weight:700;min-width:110px;color:#64748b;flex-shrink:0}
  .badge{display:inline-block;background:#d1fae5;color:#065f46;border-radius:12px;padding:3px 12px;font-size:12px;font-weight:700}
  .actions{margin-top:24px;padding:16px;background:#f0fdf4;border-radius:8px;border-left:4px solid #00544B}
  .footer{background:#f8fafc;padding:16px 40px;font-size:12px;color:#94a3b8;text-align:center}
  </style></head><body>
  <div class="wrap">
    <div class="header">
      <h1>🏥 Nueva Solicitud de Acceso — NormaLis</h1>
      <p>Una IPS acaba de completar el formulario de registro</p>
    </div>
    <div class="body">
      <div class="row"><span class="label">IPS:</span><span><strong>${ips_nombre}</strong></span></div>
      <div class="row"><span class="label">NIT:</span><span>${nit || '—'}</span></div>
      <div class="row"><span class="label">Tipo IPS:</span><span>${tipo_ips || '—'}</span></div>
      <div class="row"><span class="label">Ciudad:</span><span>${ciudad || '—'}</span></div>
      <div class="row"><span class="label">Contacto:</span><span>${nombre_contacto}</span></div>
      <div class="row"><span class="label">Cargo:</span><span>${cargo || '—'}</span></div>
      <div class="row"><span class="label">Email:</span><span><a href="mailto:${email}" style="color:#00544B">${email}</a></span></div>
      <div class="row"><span class="label">Teléfono:</span><span>${telefono || '—'}</span></div>
      <div class="row"><span class="label">UID Firebase:</span><span style="font-size:12px;color:#94a3b8">${uid || '—'}</span></div>
      <div class="actions">
        <p style="margin:0;font-weight:700;color:#065f46">⚡ Acción requerida</p>
        <p style="margin:6px 0 0;font-size:13px">Ve a <a href="https://normalis.co/admin.html" style="color:#00544B">admin.html → Solicitudes</a> para aprobar o rechazar esta cuenta.</p>
      </div>
    </div>
    <div class="footer">NormaLis — Panel de administración | Este email es automático</div>
  </div></body></html>`;
}

// ── Plantilla: aviso al staff de la IPS — nueva PQRS recibida ────────────────────
function tplPqrsNuevaAdmin({ ips_nombre, tipo, nombre, desc, area, email, telefono }) {
  const contacto = [email, telefono].filter(Boolean).join(' · ') || 'Sin contacto registrado';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
  .header{background:#00544B;padding:24px 40px}
  .header h1{color:#fff;margin:0;font-size:20px}
  .header p{color:#a7f3d0;margin:4px 0 0;font-size:13px}
  .body{padding:28px 40px;color:#1e293b;line-height:1.6}
  .row{display:flex;margin:8px 0;gap:12px;border-bottom:1px solid #f1f5f9;padding-bottom:8px}
  .label{font-weight:700;min-width:110px;color:#64748b;flex-shrink:0}
  .desc{background:#f8fafc;border-radius:8px;padding:14px 16px;margin-top:12px;font-size:14px;white-space:pre-wrap}
  .actions{margin-top:24px;padding:16px;background:#f0fdf4;border-radius:8px;border-left:4px solid #00544B}
  .footer{background:#f8fafc;padding:16px 40px;font-size:12px;color:#94a3b8;text-align:center}
  </style></head><body>
  <div class="wrap">
    <div class="header">
      <h1>📬 Nueva PQRS recibida — ${ips_nombre || 'tu IPS'}</h1>
      <p>Un paciente envió una solicitud desde el formulario público</p>
    </div>
    <div class="body">
      <div class="row"><span class="label">Tipo:</span><span><strong>${tipo || '—'}</strong></span></div>
      <div class="row"><span class="label">Nombre:</span><span>${nombre || '—'}</span></div>
      <div class="row"><span class="label">Área:</span><span>${area || '—'}</span></div>
      <div class="row"><span class="label">Contacto:</span><span>${contacto}</span></div>
      <p style="font-weight:700;color:#64748b;font-size:13px;margin-top:16px">Descripción:</p>
      <div class="desc">${desc || '—'}</div>
      <div class="actions">
        <p style="margin:0;font-weight:700;color:#065f46">⚡ Responde desde NormaLis</p>
        <p style="margin:6px 0 0;font-size:13px">Ve a <a href="https://app.normalis.co/dashboard/pqrs" style="color:#00544B">tu módulo de PQRS</a> para gestionar y responder este caso.</p>
      </div>
    </div>
    <div class="footer">NormaLis — Buzón de PQRS | Este email es automático</div>
  </div></body></html>`;
}

// ── Plantilla: respuesta de la IPS al solicitante ────────────────────────────────
function tplPqrsRespuesta({ ips_nombre, nombre, tipo, desc, respuesta }) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
  .header{background:#0d9488;padding:24px 40px}
  .header h1{color:#fff;margin:0;font-size:20px}
  .header p{color:#ccfbf1;margin:4px 0 0;font-size:13px}
  .body{padding:28px 40px;color:#1e293b;line-height:1.6;font-size:14px}
  .original{background:#f8fafc;border-left:3px solid #cbd5e1;padding:12px 16px;margin:16px 0;font-size:13px;color:#64748b;white-space:pre-wrap}
  .respuesta{background:#f0fdfa;border-left:3px solid #0d9488;padding:14px 16px;margin:12px 0;white-space:pre-wrap}
  .footer{background:#f8fafc;padding:16px 40px;font-size:12px;color:#94a3b8;text-align:center}
  </style></head><body>
  <div class="wrap">
    <div class="header">
      <h1>Respuesta a tu ${(tipo || 'solicitud').toLowerCase()}</h1>
      <p>${ips_nombre || 'NormaLis'}</p>
    </div>
    <div class="body">
      <p>Hola ${nombre || ''},</p>
      <p>Gracias por escribirnos. Esta es la respuesta a tu solicitud:</p>
      <p style="font-weight:700;color:#64748b;font-size:12px;margin-top:16px">Tu mensaje original:</p>
      <div class="original">${desc || '—'}</div>
      <p style="font-weight:700;color:#0f766e;font-size:12px;margin-top:16px">Nuestra respuesta:</p>
      <div class="respuesta">${respuesta || ''}</div>
      <p style="color:#64748b;font-size:12px;margin-top:20px">Si tienes dudas adicionales, puedes responder directamente a este correo.</p>
    </div>
    <div class="footer">${ips_nombre || 'NormaLis'} · Gestionado con NormaLis</div>
  </div></body></html>`;
}

// ── /email handler ─────────────────────────────────────────────────────────────
async function handleEmail(request, env, cors) {
  const resendKey = env.RESEND_API_KEY;
  if (!resendKey) {
    return new Response(JSON.stringify({ error: 'Servicio de email no configurado' }), {
      status: 503, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  let body;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }); }

  const { type, data } = body || {};
  const VALID_TYPES = ['bienvenida_piloto', 'bienvenida_aprobado', 'lead_admin', 'lead_autoreply', 'nueva_solicitud_admin', 'pqrs_respuesta'];
  if (!VALID_TYPES.includes(type)) {
    return new Response(JSON.stringify({ error: 'Tipo de email inválido' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // Emails de admin → requieren Firebase ID token válido
  if (type === 'bienvenida_piloto' || type === 'bienvenida_aprobado' || type === 'pqrs_respuesta') {
    const authHeader = request.headers.get('Authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
      return new Response(JSON.stringify({ error: 'Autenticación requerida' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const verified = await verifyFirebaseToken(idToken);
    if (!verified) {
      return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  }

  // Emails públicos (lead) → rate limiting por IP
  if (type === 'lead_admin' || type === 'lead_autoreply' || type === 'nueva_solicitud_admin') {
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '';
    if (!checkLeadRateLimit(ip)) {
      return new Response(JSON.stringify({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }), {
        status: 429, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  }

  // Construir payload de email según tipo
  const SENDER = 'NormaLis <hola@normalis.co>';
  const SENDER_FALLBACK = 'NormaLis <onboarding@resend.dev>';  // fallback pre-verificación dominio
  let emailPayload;

  if (type === 'bienvenida_piloto') {
    if (!data?.to_email) return new Response(JSON.stringify({ error: 'Campo to_email requerido' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    emailPayload = {
      from: SENDER,
      to: [data.to_email],
      subject: `Bienvenido a NormaLis — ${data.ips_nombre || 'Tu IPS'}`,
      html: tplBienvenidaPiloto(data),
    };
  } else if (type === 'bienvenida_aprobado') {
    if (!data?.to_email) return new Response(JSON.stringify({ error: 'Campo to_email requerido' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    emailPayload = {
      from: SENDER,
      to: [data.to_email],
      subject: `✅ Tu acceso a NormaLis fue aprobado — ${data.ips_nombre || ''}`,
      html: tplBienvenidaAprobado(data),
    };
  } else if (type === 'lead_admin') {
    if (!data?.email) return new Response(JSON.stringify({ error: 'Campo email requerido' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    emailPayload = {
      from: SENDER,
      to: ['fjfc1984@gmail.com'],
      subject: `📥 Nuevo lead NormaLis — ${data.nombre || data.email}`,
      html: tplLeadAdmin(data),
    };
  } else if (type === 'lead_autoreply') {
    if (!data?.email) return new Response(JSON.stringify({ error: 'Campo email requerido' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    emailPayload = {
      from: SENDER,
      to: [data.email],
      subject: 'Gracias por contactar a NormaLis — Te responderemos pronto',
      html: tplLeadAutoreply(data),
    };
  } else if (type === 'nueva_solicitud_admin') {
    if (!data?.email) return new Response(JSON.stringify({ error: 'Campo email requerido' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    emailPayload = {
      from: SENDER,
      to: ['fjfc1984@gmail.com'],
      subject: `🏥 Nueva solicitud NormaLis — ${data.ips_nombre || data.email}`,
      html: tplNuevaSolicitudAdmin(data),
    };
  } else if (type === 'pqrs_respuesta') {
    if (!data?.to) return new Response(JSON.stringify({ error: 'Campo to requerido' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    emailPayload = {
      from: SENDER,
      to: [data.to],
      subject: `Respuesta a tu ${(data.tipo || 'solicitud').toLowerCase()} — ${data.ips_nombre || 'NormaLis'}`,
      html: tplPqrsRespuesta(data),
    };
  }

  // Enviar con Resend
  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify(emailPayload),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      // Si el dominio no está verificado, intentar con dominio de fallback
      if (resendData?.name === 'validation_error' && resendData?.message?.includes('domain')) {
        emailPayload.from = SENDER_FALLBACK;
        const retry = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
          body: JSON.stringify(emailPayload),
        });
        const retryData = await retry.json();
        if (!retry.ok) {
          return new Response(JSON.stringify({ error: 'Error enviando email', detail: retryData }), {
            status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ ok: true, id: retryData.id, fallback: true }), {
          status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Error enviando email', detail: resendData }), {
        status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: resendData.id }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    await sentryCapture(err, { endpoint: 'POST /email', extra: { type: body && body.type } }, env);
    return new Response(JSON.stringify({ error: 'Error interno email', detail: String(err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    // ── GET /api/areas — datos de auditoría (requiere auth) ──────────────────
    if (request.method === 'GET' && url.pathname === '/api/areas') {
      return handleAreas(request, cors);
    }

    // ── POST /email — envío de emails via Resend (server-side) ───────────────
    if (request.method === 'POST' && url.pathname === '/email') {
      return handleEmail(request, env, cors);
    }

    // ── POST /pqrs — envío público de PQRS (sin login) ────────────────────────
    if (request.method === 'POST' && url.pathname === '/pqrs') {
      return handlePqrsPublico(request, env, cors);
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'JSON inválido' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { question, sessionHistory } = body || {};
    if (!question || typeof question !== 'string' || !question.trim()) {
      return new Response(JSON.stringify({ error: 'Campo "question" requerido' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (question.length > 2000) {
      return new Response(JSON.stringify({ error: 'Pregunta demasiado larga (máx 2000 caracteres)' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (!env.AI) {
      return new Response(JSON.stringify({ error: 'Servicio no configurado (binding AI ausente)' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Construir mensajes en formato OpenAI
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

    if (Array.isArray(sessionHistory)) {
      for (const turn of sessionHistory.slice(-6)) {
        if (turn.role && turn.text) {
          messages.push({ role: turn.role === 'model' ? 'assistant' : 'user', content: turn.text });
        }
      }
    }
    messages.push({ role: 'user', content: question.trim() });

    try {
      const aiRes = await env.AI.run(CF_AI_MODEL, {
        messages,
        temperature: 0.1,
        max_tokens: 1024,
      });

      const text = aiRes?.response ?? null;
      if (!text) {
        return new Response(JSON.stringify({ error: 'Respuesta vacía del modelo' }), {
          status: 502,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ answer: text, sources: [] }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });

    } catch (err) {
      await sentryCapture(err, { endpoint: 'POST / (chat/cf-ai)' }, env);
      return new Response(JSON.stringify({ error: 'Error interno del proxy', detail: String(err) }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  },
};

// ── Firestore REST helper ───────────────────────────────────────────────────
// Autentica como usuario de servicio (cron@normalis.co) via Firebase Auth REST
async function getFirestoreToken(env) {
  const apiKey    = env.FIREBASE_API_KEY;
  const cronEmail = env.CRON_EMAIL;
  const cronPass  = env.CRON_PASSWORD;
  if (!apiKey || !cronEmail || !cronPass) throw new Error('CRON secrets not configured');

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cronEmail, password: cronPass, returnSecureToken: true }),
    }
  );
  if (!res.ok) throw new Error(`Firebase Auth failed: ${res.status}`);
  const data = await res.json();
  return data.idToken;
}

async function firestoreQuery(projectId, collection, filters, token) {
  // Build structuredQuery
  const fieldFilters = filters.map(f => ({
    fieldFilter: {
      field: { fieldPath: f.field },
      op: f.op,
      value: f.value,
    },
  }));
  const query = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      where: fieldFilters.length === 1
        ? fieldFilters[0]
        : { compositeFilter: { op: 'AND', filters: fieldFilters } },
    },
  };
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(query),
  });
  if (!res.ok) throw new Error(`Firestore query failed: ${res.status}`);
  return res.json();
}

// Lee un documento puntual de Firestore por su ruta (ej. 'usuarios/abc123')
async function firestoreGetDoc(projectId, path, token) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore get failed: ${res.status}`);
  return res.json();
}

// Crea un documento en una colección de Firestore vía REST (con token de servicio)
async function firestoreCreateDoc(projectId, collectionPath, fields, token) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionPath}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Firestore create failed: ${res.status}`);
  return res.json();
}

// ── POST /pqrs — envío público de PQRS (sin login) ───────────────────────────────
// Escribe el caso en Firestore con el token de servicio (cron@normalis.co, rol
// admin) y notifica a la IPS por email. Evita abrir una regla pública de
// escritura directa en Firestore: el único camino de entrada es este endpoint,
// que sí puede rate-limitarse por IP.
async function handlePqrsPublico(request, env, cors) {
  let body;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }); }

  const { uid, tipo, nombre, desc, area, email, telefono } = body || {};
  const TIPOS_VALIDOS = ['Petición', 'Queja', 'Reclamo', 'Sugerencia', 'Felicitación'];

  if (!uid || typeof uid !== 'string') {
    return new Response(JSON.stringify({ error: 'Solicitud inválida' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  if (!TIPOS_VALIDOS.includes(tipo)) {
    return new Response(JSON.stringify({ error: 'Tipo de solicitud inválido' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  if (!nombre || typeof nombre !== 'string' || !nombre.trim() || nombre.length > 200) {
    return new Response(JSON.stringify({ error: 'Nombre requerido' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  if (!desc || typeof desc !== 'string' || !desc.trim() || desc.length > 3000) {
    return new Response(JSON.stringify({ error: 'Descripción requerida' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  if ((!email || !String(email).trim()) && (!telefono || !String(telefono).trim())) {
    return new Response(JSON.stringify({ error: 'Deja un correo o un teléfono de contacto' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '';
  if (!checkPqrsRateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Demasiadas solicitudes. Intenta más tarde.' }), { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const projectId = 'normalis-5587d';
  let token;
  try {
    token = await getFirestoreToken(env);
  } catch (e) {
    await sentryCapture(e, { endpoint: 'POST /pqrs', extra: { step: 'auth' } }, env);
    return new Response(JSON.stringify({ error: 'Servicio no disponible' }), { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // Verificar que la IPS existe y obtener su correo de contacto (el registrado
  // al crear la cuenta en NormaLis) + nombre para el email de aviso
  let adminEmail, ipsNombre;
  try {
    const doc = await firestoreGetDoc(projectId, `usuarios/${uid}`, token);
    if (!doc) {
      return new Response(JSON.stringify({ error: 'Enlace inválido' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    adminEmail = doc.fields?.email?.stringValue;
    ipsNombre  = doc.fields?.nombre?.stringValue || 'tu IPS';
  } catch (e) {
    await sentryCapture(e, { endpoint: 'POST /pqrs', extra: { step: 'lookup' } }, env);
    return new Response(JSON.stringify({ error: 'Enlace inválido' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // Escribir el caso en Firestore
  const now = new Date();
  const fields = {
    tipo:      { stringValue: tipo },
    nombre:    { stringValue: nombre.trim() },
    desc:      { stringValue: desc.trim() },
    area:      { stringValue: area || '' },
    estado:    { stringValue: 'Pendiente' },
    origen:    { stringValue: 'publico' },
    fecha:     { stringValue: now.toLocaleDateString('es-CO') },
    creadoEn:  { integerValue: String(now.getTime()) },
    updatedAt: { timestampValue: now.toISOString() },
  };
  if (email && String(email).trim())    fields.email    = { stringValue: String(email).trim() };
  if (telefono && String(telefono).trim()) fields.telefono = { stringValue: String(telefono).trim() };

  try {
    await firestoreCreateDoc(projectId, `usuarios/${uid}/pqrs`, fields, token);
  } catch (e) {
    await sentryCapture(e, { endpoint: 'POST /pqrs', extra: { step: 'create' } }, env);
    return new Response(JSON.stringify({ error: 'No se pudo registrar la solicitud' }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // Notificar a la IPS por email (best-effort — no bloquea la respuesta al paciente)
  const resendKey = env.RESEND_API_KEY;
  if (resendKey && adminEmail) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'NormaLis <hola@normalis.co>',
          to: [adminEmail],
          subject: `📬 Nueva PQRS recibida — ${tipo}`,
          html: tplPqrsNuevaAdmin({ ips_nombre: ipsNombre, tipo, nombre: nombre.trim(), desc: desc.trim(), area, email, telefono }),
        }),
      });
    } catch (e) {
      await sentryCapture(e, { endpoint: 'POST /pqrs', extra: { step: 'notify' } }, env);
      // no interrumpe — el caso ya quedó guardado
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
}

// ── Scheduled cron — runs daily at 08:00 COT ─────────────────────────────────
export async function scheduled(event, env, ctx) {
  const now = new Date();
  console.log(`[NormaLis Cron] Start — ${now.toISOString()}`);

  const resendKey = env.RESEND_API_KEY;
  const projectId = 'normalis-5587d';

  if (!resendKey) {
    console.log('[NormaLis Cron] RESEND_API_KEY not set — skipping email sends');
    return;
  }

  let token;
  try {
    token = await getFirestoreToken(env);
  } catch (e) {
    console.log('[NormaLis Cron] Auth skipped (CRON secrets not set):', e.message);
    return;
  }

  const in7  = new Date(now); in7.setDate(in7.getDate() + 7);
  const in30 = new Date(now); in30.setDate(in30.getDate() + 30);
  const fmt  = (d) => d.toISOString().split('T')[0]; // YYYY-MM-DD

  let emailsSent = 0, errors = 0;

  // ─────────────────────────────────────────────────────
  // 1. PILOTOS próximos a vencer (expiresAt en 7 días)
  // ─────────────────────────────────────────────────────
  try {
    const rows = await firestoreQuery(projectId, 'usuarios', [
      { field: 'rol',    op: 'EQUAL',             value: { stringValue: 'piloto' } },
      { field: 'activo', op: 'EQUAL',             value: { booleanValue: true } },
    ], token);

    for (const row of rows) {
      if (!row.document) continue;
      const fields = row.document.fields || {};
      const expiresAt = fields.expiresAt?.timestampValue;
      if (!expiresAt) continue;

      const expDate = new Date(expiresAt);
      const diasRestantes = Math.round((expDate - now) / 86400000);
      if (diasRestantes !== 7 && diasRestantes !== 3 && diasRestantes !== 1) continue;

      const email     = fields.email?.stringValue;
      const nombre    = fields.nombre?.stringValue || 'IPS';
      const contacto  = fields.nombreContacto?.stringValue || nombre;
      if (!email) continue;

      const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px">
        <div style="background:#00A896;padding:20px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">⏰ Tu piloto vence en ${diasRestantes} día${diasRestantes>1?'s':''}</h1>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:28px;border-radius:0 0 12px 12px">
          <p>Hola ${contacto},</p>
          <p>Tu acceso piloto a NormaLis para <strong>${nombre}</strong> vence el <strong>${expDate.toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'})}</strong>.</p>
          <p>Para no perder tu progreso, auditorías y documentos generados, activa tu plan:</p>
          <div style="text-align:center;margin:24px 0">
            <a href="https://normalis.co/pricing.html" style="background:#00A896;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px">
              Ver planes →
            </a>
          </div>
          <p style="color:#64748b;font-size:13px">¿Preguntas? Responde este email o escríbenos a fjfc1984@gmail.com</p>
        </div>
        <div style="text-align:center;margin-top:16px;font-size:11px;color:#94a3b8">NormaLis — Habilitación sin complicaciones · normalis.co</div>
      </div>`;

      const sendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'NormaLis <fjfc1984@gmail.com>',
          to: [email],
          subject: `⏰ Tu piloto NormaLis vence en ${diasRestantes} día${diasRestantes>1?'s':''} — ${nombre}`,
          html,
        }),
      });
      if (sendRes.ok) emailsSent++;
      else errors++;
    }
  } catch (e) {
    console.error('[NormaLis Cron] Pilots check error:', e.message);
    await sentryCapture(e, { endpoint: 'cron/pilots' }, env);
    errors++;
  }

  // ─────────────────────────────────────────────────────
  // 2. VENCIMIENTOS de personal próximos (7 días)
  // ─────────────────────────────────────────────────────
  try {
    const rows = await firestoreQuery(projectId, 'vencimientos', [
      { field: 'active', op: 'EQUAL', value: { booleanValue: true } },
    ], token);

    // Group by user email
    const byUser = {};
    for (const row of rows) {
      if (!row.document) continue;
      const f = row.document.fields || {};
      const fechaStr = f.fechaVencimiento?.stringValue;
      if (!fechaStr) continue;

      const vencDate = new Date(fechaStr + 'T00:00:00');
      const dias = Math.round((vencDate - now) / 86400000);
      if (dias < 0 || dias > 7) continue; // Only next 7 days

      const email = f.email?.stringValue;
      if (!email) continue;
      if (!byUser[email]) byUser[email] = { nombre: f.ipsNombre?.stringValue || '', items: [] };
      byUser[email].items.push({
        profesional: f.profesional?.stringValue || '—',
        tipo:        f.tipo?.stringValue        || '—',
        fecha:       fechaStr,
        dias,
      });
    }

    for (const [email, { nombre, items }] of Object.entries(byUser)) {
      const filas = items.map(i =>
        `<tr><td style="padding:8px;border-bottom:1px solid #f1f5f9">${i.profesional}</td>
         <td style="padding:8px;border-bottom:1px solid #f1f5f9">${i.tipo}</td>
         <td style="padding:8px;border-bottom:1px solid #f1f5f9;color:${i.dias===0?'#ef4444':i.dias<=3?'#f59e0b':'#475569'};font-weight:600">
           ${i.dias===0?'VENCE HOY':'En '+i.dias+' día'+(i.dias>1?'s':'')} (${new Date(i.fecha+'T00:00:00').toLocaleDateString('es-CO',{day:'2-digit',month:'short'})})</td></tr>`
      ).join('');

      const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px">
        <div style="background:#f59e0b;padding:20px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:20px">⚠️ Documentos por vencer — ${nombre || 'NormaLis'}</h1>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:28px;border-radius:0 0 12px 12px">
          <p>Tienes <strong>${items.length} documento${items.length>1?'s':''}</strong> de personal que vencen en los próximos 7 días:</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr style="background:#f8fafc">
              <th style="padding:8px;text-align:left">Profesional</th>
              <th style="padding:8px;text-align:left">Tipo</th>
              <th style="padding:8px;text-align:left">Estado</th>
            </tr></thead>
            <tbody>${filas}</tbody>
          </table>
          <div style="text-align:center;margin:24px 0">
            <a href="https://normalis.co/normativa-app-v2.html" style="background:#f59e0b;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700">
              Gestionar vencimientos →
            </a>
          </div>
        </div>
        <div style="text-align:center;margin-top:16px;font-size:11px;color:#94a3b8">NormaLis · normalis.co</div>
      </div>`;

      const sendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'NormaLis <fjfc1984@gmail.com>',
          to: [email],
          subject: `⚠️ ${items.length} documento${items.length>1?'s':''} por vencer esta semana — NormaLis`,
          html,
        }),
      });
      if (sendRes.ok) emailsSent++;
      else errors++;
    }
  } catch (e) {
    console.error('[NormaLis Cron] Vencimientos check error:', e.message);
    await sentryCapture(e, { endpoint: 'cron/vencimientos' }, env);
    errors++;
  }

  console.log(`[NormaLis Cron] Done — ${emailsSent} emails sent, ${errors} errors`);
}
