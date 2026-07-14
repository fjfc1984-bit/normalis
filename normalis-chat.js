// normalis-chat.js
// NormaLis — Motor del chat normativo
// Contiene: normAnswers (base de conocimiento), getAnswer() con scoring,
//           initMainChat(), addMainMsg(), sendChatQ(), sendFloatChat()
// Para actualizar respuestas: editar normAnswers en este archivo
// ─────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════
// CHAT NORMATIVO (main + flotante)
// ═══════════════════════════════════════════
const normAnswers={
  'bioseguridad':'La Res. 3100/2019 (Estándar 5 · Procesos Prioritarios) exige Manual de Bioseguridad documentado, actualizado mínimo cada año y firmado por el Director Técnico. Debe incluir: higiene de manos (5 momentos OMS), EPP por área de riesgo, manejo de residuos RESPEL (Decreto 351/2014), limpieza y desinfección por superficies (nivel bajo, intermedio, alto), y protocolo de accidente biológico con seguimiento a 6 meses. La ausencia del manual o su desactualización es causal de no conformidad en visita.',
  'odontólogo':'Sí. El Decreto 351/2014 aplica a TODOS los generadores de residuos peligrosos en salud, incluyendo odontólogos independientes. Debes tener un PGIRH con contrato vigente con empresa gestora de RESPEL autorizada. Los residuos de amalgama son RESPEL clase Y (mercurio) — requieren contenedor diferenciado. Multas por incumplimiento: hasta 10.000 SMLMV (Ley 1333/2009).',
  'residuos':'El Decreto 351/2014 y Res. 1164/2002 regulan los residuos hospitalarios. Clasificación por color: ROJO (infeccioso/biológico), NEGRO (ordinario no aprovechable), VERDE (biodegradable), BLANCO o GRIS (reciclable), y contenedor GUARDIÁN rígido (cortopunzantes). El PGIRH debe actualizarse anualmente. El contrato con el gestor de RESPEL autorizado debe estar vigente y disponible para verificación.',
  'rethus':'El RETHUS (Registro del Talento Humano en Salud) es obligatorio para todos los profesionales de la salud (Ley 1164/2007). El verificador lo consulta en línea durante la visita. Sin RETHUS activo, el profesional NO puede prestar servicios. El Director Técnico también debe tener RETHUS activo y registro ante la Secretaría de Salud departamental.',
  'historia clínica':'La Res. 1995/1999 define los componentes mínimos: identificación, anamnesis, examen físico, diagnóstico, plan de manejo y evoluciones. Custodia mínima: 20 años. El Estándar 6 de la Res. 3100/2019 exige protocolo de apertura, manejo, custodia y cierre. La historia clínica electrónica (HCE) debe cumplir los mismos requisitos. Es propiedad del paciente y del establecimiento de salud.',
  'habilitación':'La habilitación se rige por la Res. 3100/2019 y el Decreto 780/2016. Los 7 estándares son: 1) Talento Humano, 2) Infraestructura, 3) Dotación, 4) Medicamentos y Dispositivos, 5) Procesos Prioritarios, 6) Historia Clínica, 7) Interdependencia. Pasos: inscripción en REPS → declaración de condiciones de habilitación → visita de verificación por la Secretaría de Salud → resolución de habilitación. No hay plazo fijo de renovación — se actualiza ante cambios.',
  'reps':'El REPS (Registro Especial de Prestadores de Servicios de Salud) es el sistema oficial de inscripción (Decreto 780/2016). Todo cambio en servicios, talento humano o sede debe reportarse dentro de 30 días (Res. 544/2023 · Art. 26). El REPS es público — las EPS lo consultan antes de contratar. La Res. 465/2025 estableció 4 momentos de autoevaluación obligatoria antes de reportar novedades al REPS.',
  'telemedicina':'La Res. 1317/2021 regula la telemedicina. Modalidades: interactiva (video en tiempo real), no interactiva (diferida) y telexperticia. Requieren: plataforma tecnológica segura, consentimiento informado específico, historia clínica electrónica, y talento humano con las mismas competencias que en presencial. La telemedicina NO puede usarse para atención de urgencias.',
  'ips':'Una IPS (Institución Prestadora de Servicios de Salud) debe habilitarse ante la Secretaría de Salud de su departamento cumpliendo los 7 estándares de la Res. 3100/2019. También requiere inscripción en el REPS, Director Técnico con RETHUS activo e infraestructura adecuada. Cada servicio habilitado tiene condiciones específicas por tipo y complejidad.',
  'multa':'Las sanciones por prestar servicios sin habilitación incluyen: multas de 100 a 10.000 SMLMV según gravedad (Ley 1122/2007 · Ley 715/2001), clausura del establecimiento, procesos disciplinarios ante el tribunal ético, y responsabilidad penal en casos con daño al paciente. La Superintendencia de Salud y las Secretarías de Salud tienen facultad sancionatoria.',
  'equipos':'El Estándar 3 (Dotación) de la Res. 3100/2019 exige para cada equipo biomédico: hoja de vida actualizada, plan de mantenimiento preventivo y correctivo documentado, calibración vigente según el fabricante, y registro INVIMA si aplica (Decreto 4725/2005). Equipos sin mantenimiento o con calibración vencida son causal de medida sanitaria inmediata.',
  'accesibilidad':'La Res. 544/2023 (Art. 19) exige accesibilidad universal: rampas de acceso, baños adaptados para personas con discapacidad, señalización visual y táctil, y puertas con ancho mínimo para silla de ruedas. La Ley 1618/2013 garantiza atención en igualdad de condiciones. La ausencia de accesibilidad es causal de no conformidad en visita.',
  'pqrsf':'El sistema PQRSF (Peticiones, Quejas, Reclamos, Sugerencias y Felicitaciones) es obligatorio (Ley 1437/2011 · Res. 544/2023 Art. 20). Debe existir canal virtual además del presencial. Tiempo máximo de respuesta: 15 días hábiles. Las quejas frecuentes deben incluirse en el PAMEC. Los incidentes graves deben reportarse a la Superintendencia de Salud.',
  'consentimiento':'El consentimiento informado se rige por la Res. 13437/1991 y la Ley 23/1981. Debe ser: escrito para procedimientos de riesgo, firmado por el paciente o representante legal y el profesional, en lenguaje comprensible y revocable en cualquier momento. Para telemedicina debe ser específico. Para menores de edad, firma el acudiente. Se archiva en la historia clínica.',
  'pamec':'El PAMEC (Programa de Auditoría para el Mejoramiento de la Calidad) es obligatorio para todos los prestadores habilitados (Res. 1445/2006 · Decreto 1011/2006). Componentes: autoevaluación anual, identificación de procesos prioritarios, plan de intervención con metas medibles y evaluación del mejoramiento. Debe estar documentado con evidencias y disponible para visita.',
  'indicadores':'La Res. 256/2016 define los indicadores de calidad obligatorios: satisfacción de usuarios (meta ≥80%), oportunidad de cita medicina general (meta ≤3 días), oportunidad cita especializada (meta ≤15 días), tasa de eventos adversos, y proporción de reingresos hospitalarios no programados. Se reportan al SISPRO según la periodicidad definida por la Supersalud.',
  'medicamentos':'El Estándar 4 (Medicamentos y Dispositivos) de la Res. 3100/2019 exige: temperatura y humedad controladas en almacenamiento, sistema PEPS (primero en entrar, primero en salir), doble llave para medicamentos de control especial (Res. 1138/2022), identificación de medicamentos de alto riesgo, y protocolo de farmacovigilancia con reporte al INVIMA.',
  'director técnico':'El Director Técnico debe ser profesional de la salud con título habilitante para los servicios ofertados, RETHUS activo e inscrito ante la Secretaría de Salud. Puede dirigir máximo 2 establecimientos en el mismo municipio. Su ausencia temporal requiere suplente designado y habilitado. Sin Director Técnico activo, la IPS no puede operar legalmente.',
  'infraestructura':'El Estándar 2 (Infraestructura) de la Res. 3100/2019 define requisitos de espacio mínimo, ventilación, iluminación y circulación diferenciada por riesgo. La Res. 544/2023 (Art. 7) exige concepto de vulnerabilidad sísmica para establecimientos construidos antes del 2010. Las áreas deben estar diferenciadas, señalizadas y con acceso para personas con discapacidad.',
  'urgencias':'Para urgencias, el establecimiento debe habilitarse específicamente (Res. 3100/2019 · Estándar 5). Exige: protocolo de triage documentado y aplicado, acuerdo de referencia con IPS de mayor complejidad firmado y vigente (Res. 544/2023 · Art. 17), medicamentos esenciales disponibles, disponibilidad 24/7, y protocolos de atención inicial por tipo de urgencia.',
  'referencia':'El Estándar 7 (Interdependencia) de la Res. 3100/2019 y la Res. 544/2023 (Art. 17) exigen acuerdo formal de referencia y contrarreferencia con al menos una IPS de mayor complejidad. Debe estar firmado, vigente, con datos de contacto actualizados. El personal asistencial debe conocerlo. Su ausencia es causal de no conformidad en visita de verificación.',
  'manuales':'Los documentos obligatorios (Res. 3100/2019) son: Manual de Bioseguridad, Plan de Gestión Integral de Residuos (PGIRH), Protocolo de Historia Clínica, Manual de Procesos y Procedimientos Asistenciales, Protocolo de Referencia y Contrarreferencia, Plan de Emergencias y Desastres, Protocolo de Seguridad del Paciente, y Protocolo de Consentimiento Informado. Todos deben tener firma del Director Técnico y fecha de revisión vigente.',
  'res. 465':'La Resolución 465 del 25 de marzo de 2025 modificó los artículos 4, 5, 7, 19 y 20 de la Res. 3100/2019. Cambios: 1) CÁMARAS: si graban procedimientos de salud, requiere autorización escrita del paciente Y el profesional en la Historia Clínica (Sentencia T-144/2024 · Ley 1581/2012). 2) VACUNACIÓN: puede hacerse en cualquier servicio con talento humano competente — no exclusivo del servicio de vacunación — documentar en Procesos Prioritarios. 3) CONSULTORIOS MENORES 5 AÑOS: se elimina la barrera física entre área de entrevista y examen. 4) AUTOEVALUACIÓN: obligatoria en 4 momentos (previa inscripción, año 4, previa renovación, previa novedades). 5) AMBULANCIAS: deben portar estrella de la vida y emblema Misión Médica.',
  'seguridad del paciente':'La Seguridad del Paciente es parte del Estándar 5 (Procesos Prioritarios) de la Res. 3100/2019. Exige: identificación inequívoca del paciente (pulsera o doble verificación), protocolo de prevención de caídas con escala de riesgo documentada, protocolo de prevención de úlceras por presión (escala Braden), reporte y análisis de eventos adversos e incidentes (Res. 256/2016), y rondas de seguridad documentadas. Los eventos adversos graves deben reportarse a la Superintendencia de Salud.',
  'talento humano':'El Estándar 1 (Talento Humano) de la Res. 3100/2019 exige: perfiles de cargo documentados para cada puesto asistencial, certificados de estudios o tarjeta profesional vigente, RETHUS activo para cada profesional, contrato o vinculación formal vigente, y disponibilidad del personal acorde al servicio habilitado. Para servicios 24/7 se requiere cobertura en todos los turnos. El verificador revisa la hoja de vida de cada profesional.',
  'vacuna':'La Res. 465/2025 (Art. 7) permite vacunar en cualquier servicio habilitado cuyo talento humano tenga competencias comprobadas — ya no es obligatorio el servicio específico de vacunación. Se debe documentar en Procesos Prioritarios: garantía de cadena de frío, procedimiento de obtención de biológicos y registros clínicos. El PAI (Programa Ampliado de Inmunizaciones) rige el esquema nacional de vacunación.',
  'ambulancia':'La Res. 465/2025 (Art. 20) y la Res. 4481/2012 establecen que los vehículos de transporte asistencial deben portar la "estrella de la vida" (azul o verde reflectivo) en costados, puertas posteriores y techo, y el emblema de la Misión Médica. Las ambulancias aéreas requieren talento humano técnico profesional o tecnólogo en atención prehospitalaria. Los vehículos deben estar habilitados ante la Secretaría de Salud.',
  'plan de emergencias':'El Plan de Emergencias y Desastres es obligatorio (Estándar 5 · Res. 3100/2019). Debe incluir: identificación de amenazas y riesgos, rutas de evacuación señalizadas, brigada de emergencias con roles asignados, botiquín y extintores vigentes, y al menos un simulacro documentado por año. Su ausencia o falta de simulacros es causal de no conformidad en visita de verificación.',
  'laboratorio':'Los servicios de laboratorio clínico se rigen por el Decreto 2323/2006 y la Res. 3100/2019. Requieren: habilitación específica, director de laboratorio con RETHUS activo (bacteriólogo o médico especialista), participación en control de calidad externo, condiciones diferenciadas de bioseguridad, y protocolo de toma, transporte y conservación de muestras. Las pruebas de VIH requieren consentimiento informado previo (Res. 3442/2006).',
  'imágenes diagnósticas':'Los servicios de imágenes diagnósticas (radiología, ecografía, tomografía, resonancia) requieren habilitación específica. La Res. 3100/2019 exige: blindaje de salas, dosimetría personal vigente para trabajadores expuestos (Res. 9031/1990), registro de dosis al paciente, y consentimiento informado para procedimientos con radiación ionizante. Médico radiólogo como responsable para servicios con radiación ionizante.',
  'derechos del paciente':'Los derechos del paciente están en la Res. 13437/1991 (10 derechos fundamentales) y la Ley 1751/2015. Todo establecimiento debe tener la carta de derechos y deberes visible y en formato accesible. El Estándar 5 de la Res. 3100/2019 exige protocolo de atención humanizada, información clara sobre diagnóstico y alternativas terapéuticas, y respeto a la autonomía del paciente.',
  'eps':'Las EPS (Entidades Promotoras de Salud) son las aseguradoras del SGSSS (Ley 100/1993). Para contratar con una EPS, la IPS debe estar habilitada e inscrita en el REPS. El Plan de Beneficios en Salud (PBS) define los servicios cubiertos. Los servicios no cubiertos por el PBS se gestionan mediante MIPRES (Res. 1885/2018) y son reconocidos por ADRES.',
  'sede':'Cada sede de prestación de servicios se habilita de forma independiente, aunque pertenezca a la misma IPS (Res. 3100/2019 · Decreto 780/2016). La apertura de nueva sede requiere inscripción en el REPS, declaración de condiciones de habilitación y visita de verificación. El cambio de dirección debe actualizarse en el REPS dentro de 30 días (Res. 544/2023 · Art. 26).',
  'default':'Con gusto te ayudo con normativa de habilitación en salud colombiana. Puedo responder sobre: proceso de habilitación · los 7 estándares Res. 3100/2019 · REPS · RETHUS · historia clínica · bioseguridad · residuos hospitalarios · equipos biomédicos · medicamentos · urgencias y triage · referencia y contrarreferencia · PAMEC · indicadores Res. 256/2016 · seguridad del paciente · talento humano · vacunación · ambulancias · plan de emergencias · laboratorio · imágenes diagnósticas · telemedicina · consentimiento informado · derechos del paciente · PQRSF · EPS · apertura de sede · Res. 465/2025 · multas y sanciones. ¿Sobre cuál tema quieres información?',
};

function getAnswer(q){
  const ql=q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[¿?¡!]/g,'');
  // Sistema de puntuación: cada tema tiene palabras clave con peso
  const topicKw={
    'res. 465':       ['465','2025','nueva resolucion','cambio reciente','que cambio','ultimas modificaciones','camaras de video','estrella de la vida','mision medica','barrera fisica','menores de 5','consultorios','autoevaluacion momentos'],
    'bioseguridad':   ['bioseguridad','higiene de manos','epp','equipo de proteccion','accidente biologico','accidente laboral','lavado de manos','desinfeccion','esterilizacion','protocolo de limpieza','guantes','mascarilla','proteccion personal'],
    'odontólogo':     ['odontologo','odontologia','amalgama','dental','diente','consultorio dental','odontologica'],
    'residuos':       ['residuo','respel','pgirh','desecho','bolsa roja','bolsa negra','cortopunzante','guardian','reciclable','residuos peligrosos','contenedor de color','color de bolsa','manejo de residuos','basura hospital','gestor','empresa gestora'],
    'rethus':         ['rethus','registro talento humano','tarjeta profesional','matricula profesional','inscripcion profesional','profesional inscrito','titulo profesional'],
    'historia clínica':['historia clinica','expediente','registro clinico','hce','apertura historia','custodia historia','archivo clinico','20 anos','20 años','historia electronica','folio','epicrisis','nota de evolucion','historia del paciente','anotar en la historia','documentar en historia'],
    'reps':           ['reps','registro especial de prestadores','inscripcion reps','novedades reps','actualizar reps','registro de prestadores','codigo reps','tramite reps'],
    'telemedicina':   ['telemedicina','teleconsulta','telexperticia','atencion virtual','consulta virtual','consulta en linea','consulta por video','no interactiva','interactiva','plataforma digital'],
    'multa':          ['multa','sancion','clausura','proceso penal','responsabilidad','infraccion','castigo','10000 smlmv','sin habilitacion opera','operando sin habilitacion','consecuencia','que pasa si no','pena'],
    'equipos':        ['equipo biomedico','dispositivo medico','calibracion','mantenimiento preventivo','hoja de vida equipo','tecnologia biomedica','decreto 4725','invima','maquina','aparato medico','desfibrilador','ecografo','monitor','camilla','equipo medico','mantenimiento de equipo'],
    'accesibilidad':  ['accesibilidad','rampa','bano adaptado','discapacidad','movilidad reducida','silla de ruedas','personas con discapacidad','señalizacion','acceso universal','barreras arquitectonicas'],
    'pqrsf':          ['pqrs','queja','reclamo','peticion','sugerencia','felicitacion','canal de atencion','buzon','derecho de peticion','15 dias','reclamacion','inconformidad'],
    'consentimiento': ['consentimiento informado','autorizar','autorizacion del paciente','firmar','firma del paciente','consentimiento escrito','paciente autoriza','acepta el procedimiento'],
    'pamec':          ['pamec','programa de auditoria','mejoramiento de la calidad','procesos prioritarios','ciclo pamec','auditoria interna','plan de mejoramiento','mejora continua'],
    'indicadores':    ['indicador','res. 256','resolucion 256','sispro','oportunidad de cita','satisfaccion del usuario','tasa de eventos adversos','reporte de indicadores','medir calidad','indicadores de calidad'],
    'medicamentos':   ['medicamento','farmaco','farmacia','psicotr','opioide','control especial','peps','almacenamiento de medicamentos','farmacovigilancia','doble llave','cadena de custodia farmaco','medicamento vencido','nevera medicamentos','temperatura medicamento'],
    'director técnico':['director tecnico','responsable del establecimiento','cargo director','suplente del director','quien dirige','director de la ips','responsable tecnico','jefe medico'],
    'infraestructura':['infraestructura','planta fisica','instalaciones','sismica','vulnerabilidad sismica','iluminacion','ventilacion','metros cuadrados','señalizacion de areas','espacios','sala de espera','consultorio','bano','paredes','piso','techo','construccion','obra'],
    'urgencias':      ['urgencia','emergencia','triage','sala de urgencias','atencion de urgencias','nivel de triage','urgencias 24','manchester','clasificacion de urgencias'],
    'referencia':     ['referencia','contrarreferencia','remision','derivacion','mayor complejidad','acuerdo de referencia','remitir paciente','enviar a otro hospital','red de prestadores'],
    'seguridad del paciente':['seguridad del paciente','evento adverso','incidente clinico','caida del paciente','caidas','ulcera por presion','escaras','identificacion del paciente','pulsera','rondas de seguridad','barrera de seguridad','error medico','incidente','error en medicamento','confundir paciente'],
    'talento humano': ['talento humano','personal de salud','perfil de cargo','personal asistencial','dotacion de personal','enfermera','enfermero','profesional de salud','medico contratado','contratar personal','turno','personal medico','auxiliar de enfermeria','tecnico','recurso humano'],
    'vacuna':         ['vacuna','vacunacion','inmunobiologico','cadena de frio','pai','esquema de vacunacion','inmunizacion','biológico','biologico','vacunar','aplicar vacuna'],
    'ambulancia':     ['ambulancia','transporte asistencial','vehiculo asistencial','unidad movil','estrella de la vida','mision medica','traslado de paciente','transporte medico'],
    'plan de emergencias':['plan de emergencia','plan de desastre','simulacro','evacuacion','brigada de emergencia','extintor','riesgo de incendio','emergencia hospitalaria','sismo','terremoto','inundacion','brigada'],
    'laboratorio':    ['laboratorio clinico','laboratorio de','bacteriologo','muestra de laboratorio','control de calidad externo','hemograma','cultivo bacteriologico','vih laboratorio','examen de laboratorio','prueba de laboratorio','resultado laboratorio'],
    'imágenes diagnósticas':['imagen diagnostica','radiologia','ecografia','tomografia','resonancia','rayos x','blindaje','dosimetria','radiacion ionizante','rx ','scanner','ultrasonido','gammagrafia'],
    'derechos del paciente':['derechos del paciente','deberes del paciente','carta de derechos','atencion humanizada','ley 1751','autonomia del paciente','derecho a la salud','derechos del usuario'],
    'eps':            ['eps','aseguradora','plan de beneficios','pbs','contrato con eps','ley 100','sgsss','red de prestadores','afiliado','eps-s','conveniada','entidad promotora'],
    'sede':           ['apertura de sede','nueva sede','cambio de sede','cambio de domicilio','cambio de direccion','nueva sucursal','abrir sede','otra sede','sucursal'],
    'manuales':       ['documentos obligatorios','documentacion obligatoria','que documentos necesito','cuales documentos','protocolos obligatorios','manual de procesos','que papeles','que archivos','documentos para habilitacion'],
    'habilitación':   ['habilitar','habilitacion','como me habilito','requisitos de habilitacion','visita de verificacion','decreto 780','7 estandares','proceso de habilitacion','estandares','inscripcion','como registro','paso a paso habilitacion'],
    'ips':            ['ips','institucion prestadora','clinica','centro de salud','consultorio medico','prestador de salud','hospital','que es una ips'],
  };
  // Normalizar la query eliminando stop words muy comunes
  const stopWords=['que','como','cuando','donde','por','para','los','las','del','una','uno','con','sin','hay','puedo','debo','debe','tiene','tienen','necesito','necesita','cual','cuales','sobre','segun','tengo','esta'];
  const words = ql.split(/\s+/).filter(w=>w.length>2 && !stopWords.includes(w));
  // Puntuar cada tema
  let scores={};
  for(const [topic, kws] of Object.entries(topicKw)){
    let score=0;
    for(const kw of kws){
      if(ql.includes(kw)) score += (kw.split(' ').length > 1 ? 3 : 1); // frases valen más
    }
    // También revisar palabras individuales de la query contra las kw
    for(const word of words){
      if(word.length>3){
        for(const kw of kws){
          if(kw.includes(word) && word.length>4) score += 0.5;
        }
      }
    }
    if(score>0) scores[topic]=score;
  }
  // Elegir el tema con mayor puntaje
  if(Object.keys(scores).length>0){
    const best=Object.keys(scores).reduce((a,b)=>scores[a]>scores[b]?a:b);
    if(scores[best]>=1) return normAnswers[best];
  }
  // Fallback inteligente: si la pregunta tiene signos de ser una pregunta sobre normativa
  if(ql.length<10) return '¿Sobre qué tema de normativa de salud quieres información? Puedo ayudarte con habilitación, REPS, historia clínica, bioseguridad, residuos, equipos, urgencias, medicamentos, PAMEC, indicadores, seguridad del paciente, telemedicina, y más.';
  return normAnswers['default'];
}

function initMainChat(){
  addMainMsg('¡Hola! Soy tu consultor de normativa de habilitación en salud colombiana. Respondo preguntas sobre la Res. 3100/2019 (actualizada hasta Res. 544/2023), Dec. 4725/2005, Decreto 351/2014 y otras normas vigentes. ¿En qué te ayudo hoy?','bot');
}

function addMainMsg(text,type){
  const box=document.getElementById('main-chat-msgs');
  const d=document.createElement('div');
  d.className=`msg ${type==='bot'?'bot':'user-msg'}`;
  d.textContent=text;
  box.appendChild(d);
  box.scrollTop=box.scrollHeight;
}

function sendMainChat(){
  const inp=document.getElementById('main-chat-input');
  const val=inp.value.trim();if(!val)return;
  addMainMsg(val,'user');
  inp.value='';
  setTimeout(()=>{addMainMsg('…','bot');setTimeout(()=>{const msgs=document.querySelectorAll('#main-chat-msgs .msg');msgs[msgs.length-1].textContent=getAnswer(val);document.getElementById('main-chat-msgs').scrollTop=9999;},800);},300);
}

function sendChatQ(el){
  const q=el.textContent;
  document.getElementById('main-chat-input').value=q;
  sendMainChat();
}

// FLOAT CHAT
let floatOpen=false;
function toggleFloat(){
  floatOpen=!floatOpen;
  document.getElementById('fcp').classList.toggle('open',floatOpen);
}
function sendFloat(){
  const inp=document.getElementById('fcp-input');
  const val=inp.value.trim();if(!val)return;
  const box=document.getElementById('fcp-msgs');
  const u=document.createElement('div');u.className='fcp-msg usr';u.textContent=val;box.appendChild(u);
  inp.value='';
  setTimeout(()=>{const b=document.createElement('div');b.className='fcp-msg bot';b.textContent=getAnswer(val);box.appendChild(b);box.scrollTop=9999;},700);
}

