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

// ── Gemini API config ──────────────────────────────────────────────────────
const GEMINI_API_KEY = 'AQ.Ab8RN6J7U72h-pK2ii8-85wKjGKPp8AWLxSo6RP1ByimOKHocg';
const GEMINI_MODEL   = 'gemini-2.0-flash';
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ── System prompt — ancla el modelo a normativa colombiana de salud ──────────
function buildSystemPrompt() {
  const cfg = JSON.parse(localStorage.getItem('normalis_cfg') || '{}');
  const ipsNombre = localStorage.getItem('normalis_ips_nombre') || '';
  const ipsCiudad = localStorage.getItem('normalis_ips_ciudad') || '';
  const tipoIPS = cfg.tipo || '';
  const contextoIPS = (ipsNombre || tipoIPS || ipsCiudad)
    ? `\n\nCONTEXTO DE LA IPS:\n- Nombre: ${ipsNombre || 'No configurado'}\n- Tipo: ${tipoIPS || 'No configurado'}\n- Ciudad: ${ipsCiudad || 'No configurado'}`
    : '';

  return `Eres el Consultor Normativo de NormaLis, un sistema especializado en habilitación de servicios de salud en Colombia.

MARCO NORMATIVO QUE CONOCES:
- Resolución 3100/2019 (estándares de habilitación — talento humano, infraestructura, dotación, medicamentos, procesos prioritarios, historia clínica, interdependencia)
- Resolución 465/2025 (actualización de estándares, nuevos requisitos 2025)
- Resolución 544/2023 (accesibilidad, PQRSF, REPS)
- Decreto 780/2016 (política de atención integral en salud)
- Resolución 1995/1999 (historia clínica)
- Decreto 351/2014 (residuos hospitalarios y similares)
- Resolución 256/2016 (indicadores de calidad)
- Decreto 4725/2005 (dispositivos médicos)
- Ley 1164/2007 (RETHUS — talento humano en salud)
- Resolución 1317/2021 (telemedicina)
- Resolución 1445/2006 y Decreto 1011/2006 (PAMEC)
- Resolución 1138/2022 (medicamentos de control especial)${contextoIPS}

REGLAS DE RESPUESTA:
1. Responde siempre en español colombiano, claro y directo.
2. Sé específico: cita el artículo o estándar exacto cuando sea posible.
3. Si la pregunta es sobre una situación específica de la IPS (tipo de servicio, número de camas, etc.), pide ese dato si no lo tienes.
4. Nunca inventes normas. Si no sabes algo con certeza, di "Te recomiendo verificar directamente con la Secretaría de Salud de tu departamento."
5. Evita respuestas genéricas. Si el usuario pregunta "¿qué necesito para urgencias?", pregunta el nivel de complejidad antes de responder.
6. Sé conciso: máximo 4 párrafos por respuesta. Para respuestas largas, usa listas numeradas.
7. Nunca reemplazas la asesoría de un profesional en habilitación — indica esto cuando corresponda.`;
}

// ── Llamada a Gemini API ──────────────────────────────────────────────────────
async function callGemini(userMessage, historial) {
  const systemPrompt = buildSystemPrompt();
  
  // Construir contents con historial de conversación
  const contents = [];
  
  // Agregar historial previo
  if (historial && historial.length > 0) {
    for (const msg of historial) {
      contents.push({
        role: msg.role,
        parts: [{ text: msg.text }]
      });
    }
  }
  
  // Agregar mensaje actual
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: contents,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 800,
      topP: 0.8
    }
  };

  const resp = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Error ${resp.status}`);
  }

  const data = await resp.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude generar una respuesta. Intenta de nuevo.';
}

// ── Fallback: sistema de keywords (respaldo si Gemini falla) ────────────────
function getAnswerFallback(q){
  const ql=q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!]/g,'');
  const topicKw={
    'bioseguridad':   ['bioseguridad','higiene de manos','epp','accidente biologico','lavado de manos','desinfeccion'],
    'residuos':       ['residuo','respel','pgirh','bolsa roja','cortopunzante','guardian','gestor'],
    'rethus':         ['rethus','registro talento humano','tarjeta profesional','matricula profesional'],
    'historia clínica':['historia clinica','hce','custodia historia','20 anos','historia electronica'],
    'reps':           ['reps','registro especial de prestadores','novedades reps','actualizar reps'],
    'habilitación':   ['habilitar','habilitacion','requisitos de habilitacion','visita de verificacion','7 estandares'],
    'pamec':          ['pamec','programa de auditoria','mejoramiento de la calidad'],
    'medicamentos':   ['medicamento','farmaco','farmacia','control especial','peps','farmacovigilancia'],
    'equipos':        ['equipo biomedico','calibracion','mantenimiento preventivo','hoja de vida equipo'],
    'seguridad del paciente':['seguridad del paciente','evento adverso','caida del paciente','error medico'],
  };
  const stopWords=['que','como','cuando','donde','por','para','los','las','del','una','con','sin','hay','puedo','debo','tiene','tengo'];
  const words = ql.split(/\s+/).filter(w=>w.length>2 && !stopWords.includes(w));
  let scores={};
  for(const [topic, kws] of Object.entries(topicKw)){
    let score=0;
    for(const kw of kws){ if(ql.includes(kw)) score += (kw.split(' ').length > 1 ? 3 : 1); }
    for(const word of words){ if(word.length>3) for(const kw of kws) if(kw.includes(word) && word.length>4) score += 0.5; }
    if(score>0) scores[topic]=score;
  }
  if(Object.keys(scores).length>0){
    const best=Object.keys(scores).reduce((a,b)=>scores[a]>scores[b]?a:b);
    if(scores[best]>=1) return normAnswers[best];
  }
  return normAnswers['default'] || 'Puedo ayudarte con habilitación, REPS, historia clínica, bioseguridad, residuos, equipos, urgencias, medicamentos, PAMEC, seguridad del paciente y más. ¿Sobre qué tema tienes dudas?';
}

// ── Historial de conversación (main chat) ───────────────────────────────────
let mainChatHistory = [];

// ── Chat principal ────────────────────────────────────────────────────────────
function initMainChat(){
  mainChatHistory = [];
  addMainMsg('¡Hola! Soy el Consultor Normativo IA de NormaLis. Respondo preguntas sobre habilitación, Res. 3100/2019, Res. 465/2025, historia clínica, residuos, PAMEC y toda la normativa de salud colombiana.\n\n¿Cuál es tu pregunta?','bot');
}

function addMainMsg(text, type){
  const box=document.getElementById('main-chat-msgs');
  if(!box) return;
  const d=document.createElement('div');
  d.className=`msg ${type==='bot'?'bot':'user-msg'}`;
  d.innerHTML = type==='bot' ? text.replace(/\n/g,'<br>') : escapeHtml(text);
  box.appendChild(d);
  box.scrollTop=box.scrollHeight;
  return d;
}

function escapeHtml(t){ return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

async function sendMainChat(){
  const inp=document.getElementById('main-chat-input');
  if(!inp) return;
  const val=inp.value.trim();
  if(!val) return;
  
  addMainMsg(val,'user');
  inp.value='';
  inp.disabled=true;
  
  // Indicador de escritura
  const typingEl = addMainMsg('⏳ Consultando normativa...','bot');
  
  try {
    const respuesta = await callGemini(val, mainChatHistory);
    
    // Guardar en historial
    mainChatHistory.push({ role:'user', text: val });
    mainChatHistory.push({ role:'model', text: respuesta });
    // Limitar historial a últimas 10 interacciones
    if(mainChatHistory.length > 20) mainChatHistory = mainChatHistory.slice(-20);
    
    if(typingEl) typingEl.innerHTML = respuesta.replace(/\n/g,'<br>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  } catch(err) {
    console.warn('Gemini API error:', err.message);
    // Fallback al sistema de keywords
    const fallback = getAnswerFallback(val);
    if(typingEl) typingEl.innerHTML = fallback.replace(/\n/g,'<br>') + '<br><br><em style="font-size:11px;color:#9ca3af">⚠ Respuesta desde base local (sin conexión a IA)</em>';
  } finally {
    inp.disabled=false;
    inp.focus();
    const box=document.getElementById('main-chat-msgs');
    if(box) box.scrollTop=box.scrollHeight;
  }
}

function sendChatQ(el){
  const q=el.textContent;
  const inp=document.getElementById('main-chat-input');
  if(inp){ inp.value=q; sendMainChat(); }
}

// ── Chat flotante ─────────────────────────────────────────────────────────────
let floatOpen=false;
let floatHistory=[];

function toggleFloat(){
  floatOpen=!floatOpen;
  document.getElementById('fcp').classList.toggle('open',floatOpen);
}

async function sendFloat(){
  const inp=document.getElementById('fcp-input');
  const val=inp.value.trim();
  if(!val) return;
  
  const box=document.getElementById('fcp-msgs');
  const u=document.createElement('div');
  u.className='fcp-msg usr';
  u.textContent=val;
  box.appendChild(u);
  inp.value='';
  
  const b=document.createElement('div');
  b.className='fcp-msg bot';
  b.textContent='⏳ Consultando...';
  box.appendChild(b);
  box.scrollTop=9999;
  
  try {
    const respuesta = await callGemini(val, floatHistory);
    floatHistory.push({ role:'user', text:val });
    floatHistory.push({ role:'model', text:respuesta });
    if(floatHistory.length > 10) floatHistory = floatHistory.slice(-10);
    b.innerHTML = respuesta.replace(/\n/g,'<br>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  } catch(err) {
    b.textContent = getAnswerFallback(val);
  }
  box.scrollTop=9999;
}

// getAnswer se mantiene para compatibilidad con código externo que la llame
function getAnswer(q){ return getAnswerFallback(q); }

// END:normalis-chat.js — NormaLis integrity seal
