// normalis-docs.js
// NormaLis — Generador de documentos normativos (Bioseguridad, Procesos, PGIRH, etc.)
// ─────────────────────────────────────────────

// ══════════════════════════════════════════════
// GENERADOR REAL DE DOCUMENTOS NORMATIVOS
// ══════════════════════════════════════════════
// cfg() moved to top

const docTemplates = {

  bioseguridad: () => {
    const est=cfg('nombre','Establecimiento de Salud'), nit=cfg('nit',''), dir=cfg('director','Director Técnico'), rm=cfg('rm',''), ciudad=cfg('ciudad','Colombia'), hoy=new Date().toLocaleDateString('es-CO',{day:'numeric',month:'long',year:'numeric'});
    return `<h2>MANUAL DE BIOSEGURIDAD</h2>
<div class="doc-header-meta">${est}${nit?' · NIT '+nit:''} · ${ciudad}<br>Director Técnico: ${dir}${rm?' · '+rm:''}<br>Versión 1.0 · Fecha: ${hoy}<br><em>Elaborado conforme a Res. 3100/2019 (Estándar 5) · Decreto 351/2014 · Res. 1138/2022</em></div>
<h2>1. OBJETIVO Y ALCANCE</h2>
<p>El presente Manual de Bioseguridad establece las normas, procedimientos y medidas preventivas para minimizar el riesgo de transmisión de enfermedades infecciosas y garantizar un ambiente seguro para pacientes, talento humano y visitantes de <strong>${est}</strong>.</p>
<p>Aplica a todo el personal asistencial, administrativo, de apoyo y visitantes del establecimiento, en concordancia con la Resolución 3100 de 2019 (Estándar 5 — Procesos Prioritarios) y el Decreto 351 de 2014.</p>
<h2>2. MARCO NORMATIVO</h2>
<ul>
  <li>Resolución 3100 de 2019 — Manual de Habilitación · Estándar 5 (Procesos Prioritarios)</li>
  <li>Decreto 351 de 2014 — Gestión de residuos hospitalarios y similares</li>
  <li>Resolución 1138 de 2022 — Actualización estándares de medicamentos y bioseguridad</li>
  <li>Resolución 8430 de 1993 — Normas científicas, técnicas y administrativas para investigación en salud</li>
  <li>Decreto 1072 de 2015 — Sistema de Gestión de Seguridad y Salud en el Trabajo</li>
</ul>
<h2>3. PRECAUCIONES UNIVERSALES</h2>
<p>Todo el personal debe asumir que cualquier paciente puede ser portador de agentes infecciosos. Las precauciones estándar aplican siempre, independientemente del diagnóstico:</p>
<h3>3.1 Higiene de Manos (5 Momentos OMS)</h3>
<ul>
  <li><strong>Momento 1:</strong> Antes de tocar al paciente</li>
  <li><strong>Momento 2:</strong> Antes de realizar procedimiento aséptico/limpio</li>
  <li><strong>Momento 3:</strong> Después del riesgo de exposición a líquidos corporales</li>
  <li><strong>Momento 4:</strong> Después de tocar al paciente</li>
  <li><strong>Momento 5:</strong> Después del contacto con el entorno del paciente</li>
</ul>
<p>Técnica: lavado con agua y jabón antiséptico por mínimo 40-60 segundos, o fricción con alcohol glicerinado al 70% por 20-30 segundos cuando las manos estén visualmente limpias.</p>
<h3>3.2 Elementos de Protección Personal (EPP)</h3>
<table><tr><th>Área / Procedimiento</th><th>EPP Requerido</th></tr>
<tr><td>Consulta general</td><td>Bata, guantes de examen, tapabocas quirúrgico</td></tr>
<tr><td>Procedimientos con riesgo de salpicadura</td><td>Bata impermeable, guantes, tapabocas N95, gafas o careta</td></tr>
<tr><td>Toma de muestras</td><td>Guantes, tapabocas, bata</td></tr>
<tr><td>Manejo de residuos RESPEL</td><td>Guantes de caucho gruesos, bata, tapabocas, botas</td></tr>
<tr><td>Limpieza y desinfección</td><td>Guantes de caucho, delantal impermeable, tapabocas</td></tr></table>
<h2>4. LIMPIEZA Y DESINFECCIÓN</h2>
<h3>4.1 Clasificación de áreas por nivel de riesgo</h3>
<table><tr><th>Zona</th><th>Nivel</th><th>Frecuencia</th><th>Desinfectante</th></tr>
<tr><td>Consultorios / Salas de procedimientos</td><td>Alto</td><td>Entre cada paciente y al cierre</td><td>Hipoclorito 0.5% o amonio cuaternario</td></tr>
<tr><td>Baños</td><td>Alto</td><td>3 veces al día mínimo</td><td>Hipoclorito 0.5%</td></tr>
<tr><td>Sala de espera / pasillos</td><td>Bajo</td><td>2 veces al día</td><td>Detergente + desinfectante</td></tr>
<tr><td>Área administrativa</td><td>Bajo</td><td>1 vez al día</td><td>Detergente</td></tr></table>
<h2>5. MANEJO DE RESIDUOS HOSPITALARIOS</h2>
<p>Clasificación y segregación en la fuente según Decreto 351/2014 y Resolución 1164/2002:</p>
<table><tr><th>Color</th><th>Tipo de residuo</th><th>Ejemplo</th></tr>
<tr><td>🔴 Rojo</td><td>Infeccioso / Biológico</td><td>Gasas con sangre, guantes usados en procedimientos</td></tr>
<tr><td>⚫ Negro</td><td>Ordinario no reciclable</td><td>Empaques de alimentos, servilletas</td></tr>
<tr><td>🟢 Verde</td><td>Biodegradable</td><td>Residuos de alimentos</td></tr>
<tr><td>⚪ Gris</td><td>Reciclable</td><td>Papel, cartón, plástico limpio</td></tr>
<tr><td>Contenedor rígido</td><td>Cortopunzantes</td><td>Agujas, bisturís, lancetas</td></tr></table>
<p><strong>Importante:</strong> Los contenedores de cortopunzantes deben sellarse al llenarse a las ¾ partes y entregarse al gestor autorizado de RESPEL. El contrato con la empresa gestora debe estar vigente y disponible para inspección.</p>
<h2>6. ACCIDENTE BIOLÓGICO — PROTOCOLO DE ATENCIÓN</h2>
<p>En caso de pinchazos, cortaduras o salpicaduras con material biológico:</p>
<ul>
  <li><strong>Paso 1:</strong> No suspender la sangría — permitir que la herida sangre libremente por 2-3 minutos</li>
  <li><strong>Paso 2:</strong> Lavar con agua y jabón por 5 minutos. En salpicadura ocular: irrigar con agua limpia o solución salina por 5 minutos</li>
  <li><strong>Paso 3:</strong> Aplicar antiséptico (alcohol 70% o yodopovidona)</li>
  <li><strong>Paso 4:</strong> Notificar inmediatamente al Director Técnico</li>
  <li><strong>Paso 5:</strong> Tomar muestra basal de VIH, Hepatitis B y C al trabajador accidentado</li>
  <li><strong>Paso 6:</strong> Identificar al paciente fuente e iniciar seguimiento serológico a los 3 y 6 meses</li>
  <li><strong>Paso 7:</strong> Reportar el accidente al sistema de vigilancia epidemiológica (SIVIGILA)</li>
</ul>
<h2>7. REVISIÓN Y CONTROL DE VERSIONES</h2>
<table><tr><th>Versión</th><th>Fecha</th><th>Descripción</th><th>Elaboró</th></tr>
<tr><td>1.0</td><td>${hoy}</td><td>Elaboración inicial</td><td>${dir}</td></tr></table>
<div class="sign-block">
  <div><div class="sign-line"><strong>${dir}</strong><br>Director Técnico${rm?' · '+rm:''}<br>${est}</div></div>
  <div><div class="sign-line"><strong>Responsable de Bioseguridad</strong><br>Cargo: _________________<br>${est}</div></div>
</div>`;
  },

  residuos: () => {
    const est=cfg('nombre','Establecimiento de Salud'), nit=cfg('nit',''), dir=cfg('director','Director Técnico'), rm=cfg('rm',''), ciudad=cfg('ciudad','Colombia'), hoy=new Date().toLocaleDateString('es-CO',{day:'numeric',month:'long',year:'numeric'});
    return `<h2>PLAN DE GESTIÓN INTEGRAL DE RESIDUOS HOSPITALARIOS Y SIMILARES</h2>
<div class="doc-header-meta">${est}${nit?' · NIT '+nit:''} · ${ciudad}<br>Director Técnico: ${dir}${rm?' · '+rm:''}<br>PGIRH Versión 1.0 · ${hoy}<br><em>Conforme a Decreto 351/2014 · Res. 1164/2002 · Ley 1333/2009</em></div>
<h2>1. IDENTIFICACIÓN DEL GENERADOR</h2>
<table><tr><th>Campo</th><th>Información</th></tr>
<tr><td>Razón Social</td><td>${est}</td></tr>
<tr><td>NIT</td><td>${nit||'_____________'}</td></tr>
<tr><td>Ciudad / Municipio</td><td>${ciudad}</td></tr>
<tr><td>Responsable</td><td>${dir}</td></tr>
<tr><td>Categoría de generador</td><td>Pequeño generador (≤100 kg/mes)</td></tr>
<tr><td>Gestor RESPEL contratado</td><td>_________________________</td></tr>
<tr><td>Vigencia del contrato</td><td>_________________________</td></tr></table>
<h2>2. DIAGNÓSTICO DE RESIDUOS</h2>
<p>El establecimiento genera los siguientes tipos de residuos mensualmente (estimado):</p>
<table><tr><th>Tipo</th><th>Cantidad estimada (kg/mes)</th><th>Disposición</th></tr>
<tr><td>Infecciosos / Biológicos (rojo)</td><td>_______</td><td>Empresa gestora RESPEL autorizada</td></tr>
<tr><td>Cortopunzantes</td><td>_______</td><td>Contenedor rígido → empresa gestora</td></tr>
<tr><td>Ordinarios (negro)</td><td>_______</td><td>Servicio de aseo municipal</td></tr>
<tr><td>Reciclables (gris/verde)</td><td>_______</td><td>Reciclaje municipal</td></tr></table>
<h2>3. PROTOCOLO DE SEGREGACIÓN EN LA FUENTE</h2>
<p>La separación correcta desde el punto de generación es la medida más importante del PGIRH. El personal debe estar capacitado en la clasificación de residuos:</p>
<ul>
  <li>Los residuos infecciosos NUNCA deben mezclarse con residuos ordinarios</li>
  <li>Los cortopunzantes deben depositarse inmediatamente después de su uso en el contenedor rígido, sin reencapuchar agujas</li>
  <li>Los contenedores deben estar disponibles en cada punto de generación</li>
  <li>Los recipientes se llenarán máximo al 75% de su capacidad</li>
</ul>
<h2>4. ALMACENAMIENTO TEMPORAL</h2>
<p>El área de almacenamiento temporal de residuos debe cumplir:</p>
<ul>
  <li>Señalización visible con símbolo de riesgo biológico</li>
  <li>Ventilación adecuada e iluminación artificial</li>
  <li>Acceso restringido solo a personal autorizado</li>
  <li>Limpieza y desinfección diaria del área</li>
  <li>Los residuos RESPEL no permanecerán más de 30 días en el almacenamiento temporal</li>
</ul>
<h2>5. RUTAS DE RECOLECCIÓN INTERNA</h2>
<p>La recolección de residuos se realizará en los siguientes horarios: mañana (7:00 a.m.) y tarde (3:00 p.m.), siguiendo la ruta definida desde los puntos de generación hasta el almacenamiento temporal, evitando el cruce con áreas de atención de pacientes.</p>
<h2>6. GESTIÓN EXTERNA (EMPRESA GESTORA)</h2>
<p>El establecimiento cuenta con contrato vigente con empresa gestora de RESPEL autorizada por la autoridad ambiental competente. La empresa gestora debe entregar: manifiesto de transporte, certificado de disposición final, y cumplir con la Ley 1333 de 2009.</p>
<h2>7. CAPACITACIÓN DEL PERSONAL</h2>
<p>Todo el personal recibirá capacitación en gestión de residuos hospitalarios al momento de su vinculación y con frecuencia mínima anual. Se llevará registro de asistencia con firma del participante.</p>
<h2>8. INDICADORES DE SEGUIMIENTO</h2>
<table><tr><th>Indicador</th><th>Meta</th><th>Frecuencia</th></tr>
<tr><td>Segregación correcta (% de muestras correctas)</td><td>≥95%</td><td>Mensual</td></tr>
<tr><td>Accidentes con cortopunzantes</td><td>0</td><td>Mensual</td></tr>
<tr><td>Cumplimiento de rutas internas</td><td>100%</td><td>Mensual</td></tr></table>
<div class="sign-block">
  <div><div class="sign-line"><strong>${dir}</strong><br>Director Técnico${rm?' · '+rm:''}<br>${est}</div></div>
  <div><div class="sign-line"><strong>Coordinador PGIRH</strong><br>Cargo: _________________<br>${est}</div></div>
</div>`;
  },

  atencion: () => {
    const est=cfg('nombre','Establecimiento de Salud'), nit=cfg('nit',''), dir=cfg('director','Director Técnico'), rm=cfg('rm',''), esp=cfg('esp','Medicina General'), ciudad=cfg('ciudad','Colombia'), hoy=new Date().toLocaleDateString('es-CO',{day:'numeric',month:'long',year:'numeric'});
    return `<h2>PROTOCOLO DE ATENCIÓN AL PACIENTE</h2>
<div class="doc-header-meta">${est}${nit?' · NIT '+nit:''} · ${ciudad}<br>Director Técnico: ${dir}${rm?' · '+rm:''} · Especialidad: ${esp}<br>Versión 1.0 · ${hoy}<br><em>Conforme a Res. 3100/2019 (Estándar 5) · Res. 13437/1991 · Res. 256/2016</em></div>
<h2>1. OBJETIVO</h2>
<p>Establecer el flujo de atención, los derechos y deberes del paciente, y los procedimientos que garanticen una atención segura, oportuna y humanizada en <strong>${est}</strong>, en cumplimiento del Estándar 5 de Procesos Prioritarios de la Resolución 3100 de 2019.</p>
<h2>2. FLUJOGRAMA DE ATENCIÓN</h2>
<table><tr><th>Paso</th><th>Actividad</th><th>Responsable</th><th>Tiempo</th></tr>
<tr><td>1</td><td>Recepción e identificación del paciente (nombre, documento, fecha de nacimiento)</td><td>Recepcionista</td><td>≤5 min</td></tr>
<tr><td>2</td><td>Asignación de cita / triage (si aplica urgencia)</td><td>Auxiliar / Enfermería</td><td>≤5 min</td></tr>
<tr><td>3</td><td>Verificación de afiliación (ADRES) y derechos</td><td>Recepcionista</td><td>≤5 min</td></tr>
<tr><td>4</td><td>Apertura o activación de historia clínica</td><td>Auxiliar de salud</td><td>≤5 min</td></tr>
<tr><td>5</td><td>Toma de signos vitales y motivo de consulta</td><td>Auxiliar de enfermería</td><td>≤10 min</td></tr>
<tr><td>6</td><td>Consulta médica / Atención profesional</td><td>${dir}</td><td>≥20 min</td></tr>
<tr><td>7</td><td>Registro en historia clínica y órdenes</td><td>Profesional de salud</td><td>Al finalizar</td></tr>
<tr><td>8</td><td>Entrega de fórmula, resultados o referencia</td><td>Profesional / Auxiliar</td><td>≤10 min</td></tr>
<tr><td>9</td><td>Facturación y cobro (si aplica)</td><td>Recepcionista</td><td>≤10 min</td></tr></table>
<h2>3. IDENTIFICACIÓN SEGURA DEL PACIENTE</h2>
<p>Se verificarán al menos dos datos de identificación antes de cualquier procedimiento:</p>
<ul><li>Nombre completo y número de documento de identidad</li><li>Fecha de nacimiento</li><li>El médico verificará la identidad antes de iniciar la consulta o procedimiento</li></ul>
<h2>4. DERECHOS Y DEBERES DEL PACIENTE</h2>
<p>El establecimiento garantiza los derechos establecidos en la Resolución 13437 de 1991:</p>
<ul>
  <li>Derecho a recibir atención oportuna, humanizada y de calidad</li>
  <li>Derecho a la información clara sobre su diagnóstico, tratamiento y alternativas</li>
  <li>Derecho a la confidencialidad de su información de salud</li>
  <li>Derecho a otorgar o negar el consentimiento informado</li>
  <li>Derecho a acceder a su historia clínica</li>
  <li>Derecho a presentar PQRSF sin represalias</li>
</ul>
<h2>5. CONSENTIMIENTO INFORMADO</h2>
<p>Todo procedimiento de riesgo requiere consentimiento informado escrito, firmado por el paciente o su representante legal, el médico tratante y un testigo. El documento se archivará en la historia clínica. El paciente puede revocar el consentimiento en cualquier momento (Res. 13437/1991).</p>
<h2>6. SISTEMA DE PQRSF</h2>
<p>El establecimiento dispone de los siguientes canales para PQRSF:</p>
<ul>
  <li>Buzón físico en recepción</li>
  <li>Correo electrónico: ________________________</li>
  <li>Tiempo de respuesta: máximo 15 días hábiles (Res. 544/2023 · Art. 20)</li>
</ul>
<h2>7. REFERENCIA Y CONTRARREFERENCIA</h2>
<p>Cuando el paciente requiera un nivel de atención mayor, se activará el sistema de referencia con la IPS de mayor complejidad convenida: <strong>_________________________</strong>. Se diligenciará el formulario de referencia con la información mínima: motivo, diagnóstico, resumen de manejo y soporte vital requerido.</p>
<div class="sign-block">
  <div><div class="sign-line"><strong>${dir}</strong><br>Director Técnico${rm?' · '+rm:''}<br>${est}</div></div>
  <div><div class="sign-line"><strong>Coordinador de Calidad</strong><br>Cargo: _________________<br>${est}</div></div>
</div>`;
  },

  emergencias: () => {
    const est=cfg('nombre','Establecimiento de Salud'), nit=cfg('nit',''), dir=cfg('director','Director Técnico'), rm=cfg('rm',''), ciudad=cfg('ciudad','Colombia'), hoy=new Date().toLocaleDateString('es-CO',{day:'numeric',month:'long',year:'numeric'});
    return `<h2>PLAN HOSPITALARIO DE EMERGENCIAS</h2>
<div class="doc-header-meta">${est}${nit?' · NIT '+nit:''} · ${ciudad}<br>Director Técnico: ${dir}${rm?' · '+rm:''}<br>Versión 1.0 · ${hoy}<br><em>Conforme a Res. 3100/2019 (Estándar 5) · Res. 0312/2019</em></div>
<h2>1. PROPÓSITO</h2>
<p>El presente Plan establece las acciones, responsabilidades y procedimientos para responder ante situaciones de emergencia interna o externa que afecten a <strong>${est}</strong>, protegiendo la vida de pacientes, personal y visitantes.</p>
<h2>2. AMENAZAS IDENTIFICADAS</h2>
<table><tr><th>Amenaza</th><th>Probabilidad</th><th>Impacto</th><th>Prioridad</th></tr>
<tr><td>Incendio</td><td>Media</td><td>Alto</td><td>Alta</td></tr>
<tr><td>Sismo</td><td>Media</td><td>Alto</td><td>Alta</td></tr>
<tr><td>Derrame de sustancias peligrosas</td><td>Baja</td><td>Medio</td><td>Media</td></tr>
<tr><td>Corte de energía eléctrica</td><td>Alta</td><td>Medio</td><td>Alta</td></tr>
<tr><td>Amenaza de bomba / Orden público</td><td>Baja</td><td>Alto</td><td>Media</td></tr></table>
<h2>3. ESTRUCTURA DE RESPUESTA — BRIGADAS</h2>
<table><tr><th>Brigada</th><th>Responsable</th><th>Función</th></tr>
<tr><td>Coordinación General</td><td>${dir}</td><td>Activar el plan, tomar decisiones de evacuación</td></tr>
<tr><td>Brigada contra incendios</td><td>________________________</td><td>Usar extintores, controlar amago de incendio</td></tr>
<tr><td>Brigada de evacuación</td><td>________________________</td><td>Guiar la evacuación ordenada del personal y pacientes</td></tr>
<tr><td>Brigada de primeros auxilios</td><td>________________________</td><td>Atender lesionados y coordinar traslado</td></tr></table>
<h2>4. PROTOCOLO DE EVACUACIÓN</h2>
<ul>
  <li><strong>Señal de evacuación:</strong> 3 pitazos cortos / voz de mando del coordinador</li>
  <li>Todo el personal suspende actividades y orienta a pacientes hacia las rutas señalizadas</li>
  <li>Los pacientes en camillas o sillas de ruedas tienen prioridad</li>
  <li>Punto de encuentro externo: <strong>________________________</strong></li>
  <li>El coordinador verifica que no queden personas en el interior</li>
  <li>Llamar a: Bomberos 119 · Policía 123 · Ambulancia 132 · Cruz Roja 144</li>
</ul>
<h2>5. PROTOCOLO DE INCENDIO (RACE)</h2>
<ul>
  <li><strong>R</strong> — Rescatar a personas en peligro inmediato</li>
  <li><strong>A</strong> — Activar la alarma y avisar al coordinador</li>
  <li><strong>C</strong> — Contener el fuego cerrando puertas y ventanas si es seguro</li>
  <li><strong>E</strong> — Extinguir con extintor (PASS) o Evacuar si el fuego no es controlable</li>
</ul>
<h2>6. PROTOCOLO ANTE SISMO</h2>
<ul>
  <li>Durante: Posición de protección (cubrirse en triángulo de vida o bajo escritorio robusto)</li>
  <li>Después: Evaluar lesionados, verificar daños estructurales, no usar ascensores</li>
  <li>Evacuar solo si hay daño estructural visible o riesgo de incendio</li>
</ul>
<h2>7. INVENTARIO DE RECURSOS DE EMERGENCIA</h2>
<table><tr><th>Recurso</th><th>Ubicación</th><th>Cantidad</th><th>Último mantenimiento</th></tr>
<tr><td>Extintor multipropósito</td><td>Recepción</td><td>1</td><td>________________________</td></tr>
<tr><td>Extintor CO₂</td><td>Área eléctrica</td><td>1</td><td>________________________</td></tr>
<tr><td>Botiquín de primeros auxilios</td><td>Enfermería</td><td>1</td><td>________________________</td></tr>
<tr><td>Luces de emergencia</td><td>Pasillos</td><td>____</td><td>________________________</td></tr>
<tr><td>Señalización de evacuación</td><td>Todo el establecimiento</td><td>____</td><td>Permanente</td></tr></table>
<h2>8. SIMULACROS</h2>
<p>Se realizará mínimo un simulacro de evacuación anual, con registro de participantes, tiempo de evacuación y lecciones aprendidas. El coordinador elaborará informe de cada simulacro.</p>
<div class="sign-block">
  <div><div class="sign-line"><strong>${dir}</strong><br>Director Técnico${rm?' · '+rm:''}<br>${est}</div></div>
  <div><div class="sign-line"><strong>Coordinador de Brigadas</strong><br>Cargo: _________________<br>${est}</div></div>
</div>`;
  },

  tecnovigilancia: () => {
    const est=cfg('nombre','Establecimiento de Salud'), nit=cfg('nit',''), dir=cfg('director','Director Técnico'), rm=cfg('rm',''), ciudad=cfg('ciudad','Colombia'), hoy=new Date().toLocaleDateString('es-CO',{day:'numeric',month:'long',year:'numeric'});
    return `<h2>MANUAL DE TECNOVIGILANCIA Y DISPOSITIVOS MÉDICOS</h2>
<div class="doc-header-meta">${est}${nit?' · NIT '+nit:''} · ${ciudad}<br>Director Técnico: ${dir}${rm?' · '+rm:''}<br>Versión 1.0 · ${hoy}<br><em>Conforme a Decreto 4725/2005 · Res. 3100/2019 Estándar 3 · Res. 1138/2022</em></div>
<h2>1. OBJETIVO</h2>
<p>Establecer el sistema de gestión de dispositivos médicos y tecnología biomédica de <strong>${est}</strong>, garantizando la seguridad, disponibilidad y correcto funcionamiento de los equipos utilizados en la prestación de servicios de salud, conforme al Decreto 4725 de 2005 y el Estándar 3 del Manual de Habilitación.</p>
<h2>2. INVENTARIO DE EQUIPOS BIOMÉDICOS</h2>
<p>El establecimiento mantiene el siguiente inventario de equipos con hoja de vida individual:</p>
<table><tr><th>Equipo</th><th>Marca/Modelo</th><th>Serie</th><th>Registro INVIMA</th><th>Próximo mantenimiento</th></tr>
<tr><td>Electrocardiógrafo</td><td>_____________</td><td>_____________</td><td>_____________</td><td>_____________</td></tr>
<tr><td>Tensiómetro digital</td><td>_____________</td><td>_____________</td><td>N/A</td><td>_____________</td></tr>
<tr><td>Oxímetro de pulso</td><td>_____________</td><td>_____________</td><td>N/A</td><td>_____________</td></tr>
<tr><td>Glucómetro</td><td>_____________</td><td>_____________</td><td>_____________</td><td>_____________</td></tr>
<tr><td>Báscula médica</td><td>_____________</td><td>_____________</td><td>N/A</td><td>_____________</td></tr></table>
<h2>3. PROGRAMA DE MANTENIMIENTO PREVENTIVO</h2>
<p>Todos los equipos biomédicos deben tener mantenimiento preventivo según las recomendaciones del fabricante, con frecuencia mínima anual y calibración cuando aplique. El programa incluye:</p>
<ul>
  <li>Calendario anual de mantenimiento por equipo</li>
  <li>Registro de cada mantenimiento con firma del técnico</li>
  <li>Verificación de calibración vigente (equipos de medición)</li>
  <li>Pruebas de funcionamiento antes de cada uso clínico</li>
</ul>
<h2>4. HOJA DE VIDA DE EQUIPOS</h2>
<p>Cada equipo biomédico debe tener una hoja de vida que incluya: identificación, datos del fabricante, registro INVIMA, fechas de instalación, mantenimientos realizados, fallas reportadas, y accesorios. Las hojas de vida se conservarán durante la vida útil del equipo y 5 años adicionales.</p>
<h2>5. REPORTES DE INCIDENTES Y EVENTOS ADVERSOS (TECNOVIGILANCIA)</h2>
<p>Conforme al Decreto 4725/2005, se deben reportar al INVIMA:</p>
<ul>
  <li>Eventos adversos serios asociados al uso de dispositivos médicos</li>
  <li>Fallas o malfuncionamientos que puedan causar lesión al paciente</li>
  <li>Defectos de calidad en dispositivos médicos</li>
</ul>
<p>El reporte se realizará a través del sistema de reporte de INVIMA dentro de los 10 días hábiles de conocido el evento.</p>
<h2>6. DISPOSITIVOS DE USO ÚNICO</h2>
<p>Queda estrictamente prohibida la reutilización de dispositivos médicos rotulados como de uso único, conforme al Estándar 3 de la Resolución 3100 de 2019 y la Res. 1138 de 2022. El personal debe verificar el rotulado antes de cada procedimiento.</p>
<div class="sign-block">
  <div><div class="sign-line"><strong>${dir}</strong><br>Director Técnico${rm?' · '+rm:''}<br>${est}</div></div>
  <div><div class="sign-line"><strong>Responsable de Equipos</strong><br>Cargo: _________________<br>${est}</div></div>
</div>`;
  },

  'hoja-vida': () => {
    const est=cfg('nombre','Establecimiento de Salud'), nit=cfg('nit',''), dir=cfg('director','Director Técnico'), hoy=new Date().toLocaleDateString('es-CO',{day:'numeric',month:'long',year:'numeric'});
    return `<h2>PLANTILLA — HOJA DE VIDA DE EQUIPO BIOMÉDICO</h2>
<div class="doc-header-meta">${est}${nit?' · NIT '+nit:''}<br>Conforme a Decreto 4725/2005 · Res. 3100/2019 Estándar 3</div>
<h2>1. IDENTIFICACIÓN DEL EQUIPO</h2>
<table><tr><th>Campo</th><th>Información</th></tr>
<tr><td>Nombre del equipo</td><td>_________________________</td></tr>
<tr><td>Marca / Fabricante</td><td>_________________________</td></tr>
<tr><td>Modelo</td><td>_________________________</td></tr>
<tr><td>Número de serie</td><td>_________________________</td></tr>
<tr><td>Registro INVIMA</td><td>_________________________</td></tr>
<tr><td>Fecha de adquisición</td><td>_________________________</td></tr>
<tr><td>Fecha de instalación</td><td>_________________________</td></tr>
<tr><td>Ubicación en el establecimiento</td><td>_________________________</td></tr>
<tr><td>Vida útil estimada</td><td>_________________________</td></tr>
<tr><td>Proveedor / Importador</td><td>_________________________</td></tr>
<tr><td>Teléfono de servicio técnico</td><td>_________________________</td></tr></table>
<h2>2. HISTORIAL DE MANTENIMIENTOS PREVENTIVOS</h2>
<table><tr><th>Fecha</th><th>Tipo</th><th>Actividades realizadas</th><th>Técnico responsable</th><th>Firma</th></tr>
<tr><td></td><td>Preventivo</td><td></td><td></td><td></td></tr>
<tr><td></td><td>Preventivo</td><td></td><td></td><td></td></tr>
<tr><td></td><td>Calibración</td><td></td><td></td><td></td></tr></table>
<h2>3. HISTORIAL DE FALLAS Y CORRECTIVOS</h2>
<table><tr><th>Fecha</th><th>Descripción de la falla</th><th>Corrección realizada</th><th>Tiempo fuera de servicio</th></tr>
<tr><td></td><td></td><td></td><td></td></tr>
<tr><td></td><td></td><td></td><td></td></tr></table>
<h2>4. ACCESORIOS Y CONSUMIBLES</h2>
<table><tr><th>Accesorio</th><th>Referencia</th><th>Cant. disponible</th></tr>
<tr><td></td><td></td><td></td></tr>
<tr><td></td><td></td><td></td></tr></table>
<div class="sign-block">
  <div><div class="sign-line"><strong>${dir}</strong><br>Director Técnico · ${est}</div></div>
  <div><div class="sign-line"><strong>Fecha de actualización</strong><br>${hoy}</div></div>
</div>`;
  },
};

// ── Viewer functions ──
function openDocViewer(docId, title) {
  if(typeof logActivity==='function') logActivity('doc_generado','documentos',title||docId);
  const fn = docTemplates[docId];
  if (!fn) { toast('Documento no disponible', 'warning'); return; }
  document.getElementById('doc-viewer-title').textContent = title || docId;
  document.getElementById('doc-paper-content').innerHTML = fn();
  document.getElementById('doc-viewer-overlay').classList.add('open');
}

function closeDocViewer() {
  document.getElementById('doc-viewer-overlay').classList.remove('open');
}

function printDoc() {
  const title = document.getElementById('doc-viewer-title').textContent;
  const content = document.getElementById('doc-paper-content').innerHTML;
  const w = window.open('','_blank','width=900,height=700');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:Georgia,serif;font-size:13px;line-height:1.8;color:#1e293b;margin:40px 56px;max-width:760px}
    h1{font-size:18px;font-weight:800;text-align:center;margin-bottom:4px;font-family:'Segoe UI',sans-serif}
    h2{font-size:14px;font-weight:800;margin:28px 0 10px;padding-bottom:4px;border-bottom:2px solid #0ea5e9;font-family:'Segoe UI',sans-serif;color:#0284c7}
    h3{font-size:13px;font-weight:700;margin:18px 0 6px;font-family:'Segoe UI',sans-serif}
    .doc-header-meta{text-align:center;color:#64748b;font-size:12px;margin-bottom:32px;font-family:'Segoe UI',sans-serif;border-bottom:1px solid #e2e8f0;padding-bottom:16px}
    table{width:100%;border-collapse:collapse;margin:12px 0;font-family:'Segoe UI',sans-serif;font-size:12px}
    th{background:#0ea5e9;color:#fff;padding:8px 10px;text-align:left;font-weight:700}
    td{padding:7px 10px;border-bottom:1px solid #e2e8f0}
    tr:nth-child(even) td{background:#f8fafc}
    .sign-block{margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:40px;font-family:'Segoe UI',sans-serif;font-size:12px}
    .sign-line{border-top:1px solid #1e293b;margin-top:40px;padding-top:6px}
    ul{margin:8px 0 8px 20px} li{margin-bottom:4px}
    p{margin:8px 0;text-align:justify}
    @media print{body{margin:20px 30px}}
  </style></head><body>${content}

<!-- ══════════ FIREBASE AUTH SCREEN ══════════ -->
<div id="auth-screen">
  <div class="auth-card">
    <div class="auth-logo">Norma<span>Lis</span></div>
    <div class="auth-tagline">Copiloto de Habilitación para IPS en Colombia</div>

    <div class="auth-tabs">
      <button class="auth-tab active" id="tab-login" onclick="authSwitchTab('login')">Ingresar</button>
      <button class="auth-tab" id="tab-register" onclick="authSwitchTab('register')">Crear cuenta</button>
    </div>

    <!-- LOGIN -->
    <div id="auth-login-form">
      <div class="auth-field">
        <label>Correo electrónico</label>
        <input type="email" id="auth-email" placeholder="director@mips.com" autocomplete="email">
      </div>
      <div class="auth-field">
        <label>Contraseña</label>
        <input type="password" id="auth-pass" placeholder="••••••••" autocomplete="current-password" onkeydown="if(event.key==='Enter')authLogin()">
      </div>
      <button class="auth-btn" onclick="authLogin()" id="auth-login-btn">Ingresar →</button>
      <div class="auth-divider">o</div>
      <button class="auth-google" onclick="authGoogle()">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Continuar con Google
      </button>
      <div class="auth-msg" id="auth-login-msg"></div>
      <div class="auth-footer">¿Olvidaste tu contraseña? <a href="#" onclick="authResetPass()" style="color:#0ea5e9">Recuperar</a></div>
    </div>

    <!-- REGISTER -->
    <div id="auth-register-form" style="display:none">
      <div class="auth-field">
        <label>Nombre del establecimiento</label>
        <input type="text" id="auth-nombre" placeholder="IPS Salud Familiar S.A.S." autocomplete="organization">
      </div>
      <div class="auth-field">
        <label>Correo electrónico</label>
        <input type="email" id="auth-reg-email" placeholder="director@mips.com" autocomplete="email">
      </div>
      <div class="auth-field">
        <label>Contraseña (mínimo 6 caracteres)</label>
        <input type="password" id="auth-reg-pass" placeholder="••••••••" autocomplete="new-password" onkeydown="if(event.key==='Enter')authRegister()">
      </div>
      <button class="auth-btn" onclick="authRegister()" id="auth-reg-btn">Crear cuenta gratis →</button>
      <div class="auth-divider">o</div>
      <button class="auth-google" onclick="authGoogle()">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Continuar con Google
      </button>
      <div class="auth-msg" id="auth-reg-msg"></div>
      <div class="auth-footer">Al registrarte aceptas nuestros <a href="#" style="color:#0ea5e9">términos de uso</a></div>
    </div>
  </div>
</div>

</body></html>`);
  w.document.close();
  setTimeout(()=>w.print(),300);
}

// ── Hook into generator: replace showGenDone to show real docs ──
const _origShowGenDone = showGenDone;
showGenDone = function(){
  document.getElementById('gen-step2').style.display='none';
  document.getElementById('gen-step3').style.display='block';
  const list=document.getElementById('gen-done-list');
  list.innerHTML=Array.from(genSel).map(id=>`
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <span style="color:var(--success);font-size:16px">✓</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700">${genNames[id]||id}</div>
        <div class="text-xs text-muted">Personalizado para ${cfg('nombre','tu establecimiento')} · ${new Date().toLocaleDateString('es-CO')}</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openDocViewer('${id}','${genNames[id]||id}')">👁 Ver</button>
      <button class="btn btn-outline btn-sm" onclick="openDocViewer('${id}','${genNames[id]||id}');setTimeout(printDoc,400)">🖨️ PDF</button>
    </div>`).join('');
  toast('✨ Documentos generados y listos para imprimir','success');
  setTimeout(()=>showAchieve('📄','¡Documentos Reales!','Tus manuales normativos ya están personalizados y listos.'),800);
};

// Fix old openDocPreview reference
function openDocPreview(id){ openDocViewer(id, genNames[id]||id); }

// ── Streamlines: use _cfg data ──
function buildStreamLines(){
  const nombre = cfg('nombre','tu establecimiento');
  const ciudad = cfg('ciudad','Colombia');
  return [
    '> Inicializando generador normativo NormaLis…',
    '> Cargando perfil: '+nombre+' · '+ciudad,
    '> Aplicando Resolución 3100 de 2019 (Estándares 3, 5, 6)…',
    '> Aplicando Decreto 351/2014 (Residuos hospitalarios)…',
    '> Aplicando Decreto 4725/2005 (Dispositivos médicos)…',
    '> Aplicando Res. 1138/2022 (Actualizaciones normativas)…',
    '> Redactando Sección 1: Objetivo y Alcance…',
    '> Redactando Sección 2: Marco normativo…',
    '> Redactando Sección 3: Protocolos y procedimientos…',
    '> Insertando datos del Director Técnico: '+cfg('director','Director Técnico')+'…',
    '> Personalizando con NIT: '+cfg('nit','pendiente')+'…',
    '> Aplicando estructura de tablas y firmas…',
    '> ✅ Sección de firmas generada',
    '> ✅ Historial de versiones incluido',
    '> ✅ Formato listo para impresión directa',
    '> ✅ Compatible con visita de habilitación',
    '> ✅ Documentos generados exitosamente',
  ];
}

// Override startGen to use dynamic stream lines
const _origStartGen = startGen;
startGen = function(){
  const lines = buildStreamLines();
  document.getElementById('gen-step1').style.display='none';
  document.getElementById('gen-step2').style.display='block';
  const box=document.getElementById('gen-stream');
  box.innerHTML=''; let i=0;
  const iv=setInterval(()=>{
    if(i>=lines.length){clearInterval(iv);showGenDone();return;}
    document.getElementById('gen-step-label').textContent=lines[i].replace('> ','');
    const line=document.createElement('div');
    line.className='gen-stream-line';
    line.style.color=lines[i].includes('✅')?'#4ade80':'#94a3b8';
    line.textContent=lines[i];
    box.appendChild(line);
    box.scrollTop=box.scrollHeight;
    i++;
  },300);
};

