/**
 * web/lib/docTemplates.ts
 * Plantillas HTML de documentos normativos NormaLis
 * Portado desde normalis-docs.js — Res. 3100/2019, Decreto 351/2014, Decreto 4725/2005
 *
 * SEGURIDAD: todos los valores dinámicos provienen de Firestore (datos propios de la IPS,
 * no de input directo del usuario en este contexto), escapados via escH() antes de insertarse.
 */

import type { IPSConfig, DocId } from './docTypes';

// ── Escape HTML para prevenir XSS en dangerouslySetInnerHTML ─────────────────
function escH(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Helpers internos ──────────────────────────────────────────────────────────
function hoy(): string {
  return new Date().toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function header(cfg: IPSConfig, fullTitle: string, version: string, norma: string): string {
  const { nombre, nit, director, rm, ciudad } = cfg;
  return `
<div class="doc-header-meta">
  ${escH(nombre)}${nit ? ` · NIT ${escH(nit)}` : ''} · ${escH(ciudad)}<br>
  Director Técnico: ${escH(director)}${rm ? ` · ${escH(rm)}` : ''}<br>
  ${escH(version)} · Fecha: ${hoy()}<br>
  <em>${escH(norma)}</em>
</div>`;
}

function signBlock(cfg: IPSConfig, cargo2: string): string {
  const { nombre, director, rm } = cfg;
  return `
<div class="sign-block">
  <div><div class="sign-line">
    <strong>${escH(director)}</strong><br>
    Director Técnico${rm ? ` · ${escH(rm)}` : ''}<br>
    ${escH(nombre)}
  </div></div>
  <div><div class="sign-line">
    <strong>${escH(cargo2)}</strong><br>
    Cargo: _________________<br>
    ${escH(nombre)}
  </div></div>
</div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
//  1. MANUAL DE BIOSEGURIDAD
// ══════════════════════════════════════════════════════════════════════════════
function bioseguridad(cfg: IPSConfig): string {
  const { nombre, director } = cfg;
  return `
<h2>MANUAL DE BIOSEGURIDAD</h2>
${header(cfg, nombre, 'Versión 1.0', 'Res. 3100/2019 (Estándar 5) · Decreto 351/2014 · Res. 1138/2022')}

<h2>1. OBJETIVO Y ALCANCE</h2>
<p>El presente Manual de Bioseguridad establece las normas, procedimientos y medidas preventivas para minimizar el riesgo de transmisión de enfermedades infecciosas y garantizar un ambiente seguro para pacientes, talento humano y visitantes de <strong>${escH(nombre)}</strong>.</p>
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
<tr><td>Rojo</td><td>Infeccioso / Biológico</td><td>Gasas con sangre, guantes usados en procedimientos</td></tr>
<tr><td>Negro</td><td>Ordinario no reciclable</td><td>Empaques de alimentos, servilletas</td></tr>
<tr><td>Verde</td><td>Biodegradable</td><td>Residuos de alimentos</td></tr>
<tr><td>Gris</td><td>Reciclable</td><td>Papel, cartón, plástico limpio</td></tr>
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
<tr><td>1.0</td><td>${hoy()}</td><td>Elaboración inicial</td><td>${escH(director)}</td></tr></table>

${signBlock(cfg, 'Responsable de Bioseguridad')}`;
}

// ══════════════════════════════════════════════════════════════════════════════
//  2. PGIRH — RESIDUOS
// ══════════════════════════════════════════════════════════════════════════════
function residuos(cfg: IPSConfig): string {
  const { nombre, nit, director, ciudad } = cfg;
  return `
<h2>PLAN DE GESTIÓN INTEGRAL DE RESIDUOS HOSPITALARIOS Y SIMILARES</h2>
${header(cfg, nombre, 'PGIRH Versión 1.0', 'Decreto 351/2014 · Res. 1164/2002 · Ley 1333/2009')}

<h2>1. IDENTIFICACIÓN DEL GENERADOR</h2>
<table><tr><th>Campo</th><th>Información</th></tr>
<tr><td>Razón Social</td><td>${escH(nombre)}</td></tr>
<tr><td>NIT</td><td>${escH(nit) || '_____________'}</td></tr>
<tr><td>Ciudad / Municipio</td><td>${escH(ciudad)}</td></tr>
<tr><td>Responsable</td><td>${escH(director)}</td></tr>
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

${signBlock(cfg, 'Coordinador PGIRH')}`;
}

// ══════════════════════════════════════════════════════════════════════════════
//  3. PROTOCOLO DE ATENCIÓN AL PACIENTE
// ══════════════════════════════════════════════════════════════════════════════
function atencion(cfg: IPSConfig): string {
  const { nombre, director, esp } = cfg;
  return `
<h2>PROTOCOLO DE ATENCIÓN AL PACIENTE</h2>
${header(cfg, nombre, 'Versión 1.0', 'Res. 3100/2019 (Estándar 5) · Res. 13437/1991 · Res. 256/2016')}

<h2>1. OBJETIVO</h2>
<p>Establecer el flujo de atención, los derechos y deberes del paciente, y los procedimientos que garanticen una atención segura, oportuna y humanizada en <strong>${escH(nombre)}</strong>, en cumplimiento del Estándar 5 de Procesos Prioritarios de la Resolución 3100 de 2019.</p>

<h2>2. FLUJOGRAMA DE ATENCIÓN</h2>
<table><tr><th>Paso</th><th>Actividad</th><th>Responsable</th><th>Tiempo</th></tr>
<tr><td>1</td><td>Recepción e identificación del paciente (nombre, documento, fecha de nacimiento)</td><td>Recepcionista</td><td>≤5 min</td></tr>
<tr><td>2</td><td>Asignación de cita / triage (si aplica urgencia)</td><td>Auxiliar / Enfermería</td><td>≤5 min</td></tr>
<tr><td>3</td><td>Verificación de afiliación (ADRES) y derechos</td><td>Recepcionista</td><td>≤5 min</td></tr>
<tr><td>4</td><td>Apertura o activación de historia clínica</td><td>Auxiliar de salud</td><td>≤5 min</td></tr>
<tr><td>5</td><td>Toma de signos vitales y motivo de consulta</td><td>Auxiliar de enfermería</td><td>≤10 min</td></tr>
<tr><td>6</td><td>Consulta médica / Atención profesional (${escH(esp)})</td><td>${escH(director)}</td><td>≥20 min</td></tr>
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

${signBlock(cfg, 'Coordinador de Calidad')}`;
}

// ══════════════════════════════════════════════════════════════════════════════
//  4. PLAN HOSPITALARIO DE EMERGENCIAS
// ══════════════════════════════════════════════════════════════════════════════
function emergencias(cfg: IPSConfig): string {
  const { nombre, director } = cfg;
  return `
<h2>PLAN HOSPITALARIO DE EMERGENCIAS</h2>
${header(cfg, nombre, 'Versión 1.0', 'Res. 3100/2019 (Estándar 5) · Res. 0312/2019')}

<h2>1. PROPÓSITO</h2>
<p>El presente Plan establece las acciones, responsabilidades y procedimientos para responder ante situaciones de emergencia interna o externa que afecten a <strong>${escH(nombre)}</strong>, protegiendo la vida de pacientes, personal y visitantes.</p>

<h2>2. AMENAZAS IDENTIFICADAS</h2>
<table><tr><th>Amenaza</th><th>Probabilidad</th><th>Impacto</th><th>Prioridad</th></tr>
<tr><td>Incendio</td><td>Media</td><td>Alto</td><td>Alta</td></tr>
<tr><td>Sismo</td><td>Media</td><td>Alto</td><td>Alta</td></tr>
<tr><td>Derrame de sustancias peligrosas</td><td>Baja</td><td>Medio</td><td>Media</td></tr>
<tr><td>Corte de energía eléctrica</td><td>Alta</td><td>Medio</td><td>Alta</td></tr>
<tr><td>Amenaza de bomba / Orden público</td><td>Baja</td><td>Alto</td><td>Media</td></tr></table>

<h2>3. ESTRUCTURA DE RESPUESTA — BRIGADAS</h2>
<table><tr><th>Brigada</th><th>Responsable</th><th>Función</th></tr>
<tr><td>Coordinación General</td><td>${escH(director)}</td><td>Activar el plan, tomar decisiones de evacuación</td></tr>
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

${signBlock(cfg, 'Coordinador de Brigadas')}`;
}

// ══════════════════════════════════════════════════════════════════════════════
//  5. MANUAL DE TECNOVIGILANCIA
// ══════════════════════════════════════════════════════════════════════════════
function tecnovigilancia(cfg: IPSConfig): string {
  const { nombre } = cfg;
  return `
<h2>MANUAL DE TECNOVIGILANCIA Y DISPOSITIVOS MÉDICOS</h2>
${header(cfg, nombre, 'Versión 1.0', 'Decreto 4725/2005 · Res. 3100/2019 Estándar 3 · Res. 1138/2022')}

<h2>1. OBJETIVO</h2>
<p>Establecer el sistema de gestión de dispositivos médicos y tecnología biomédica de <strong>${escH(nombre)}</strong>, garantizando la seguridad, disponibilidad y correcto funcionamiento de los equipos utilizados en la prestación de servicios de salud, conforme al Decreto 4725 de 2005 y el Estándar 3 del Manual de Habilitación.</p>

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

${signBlock(cfg, 'Responsable de Equipos')}`;
}

// ══════════════════════════════════════════════════════════════════════════════
//  6. HOJA DE VIDA DE EQUIPO BIOMÉDICO
// ══════════════════════════════════════════════════════════════════════════════
function hojaVida(cfg: IPSConfig): string {
  const { nombre, nit, director } = cfg;
  return `
<h2>PLANTILLA — HOJA DE VIDA DE EQUIPO BIOMÉDICO</h2>
<div class="doc-header-meta">
  ${escH(nombre)}${nit ? ` · NIT ${escH(nit)}` : ''}<br>
  <em>Conforme a Decreto 4725/2005 · Res. 3100/2019 Estándar 3</em>
</div>

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
  <div><div class="sign-line">
    <strong>${escH(director)}</strong><br>
    Director Técnico · ${escH(nombre)}
  </div></div>
  <div><div class="sign-line">
    <strong>Fecha de actualización</strong><br>
    ${hoy()}
  </div></div>
</div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
//  7. MANUAL DE GESTIÓN DE MEDICAMENTOS, DISPOSITIVOS MÉDICOS E INSUMOS
// ══════════════════════════════════════════════════════════════════════════════
function medicamentos(cfg: IPSConfig): string {
  const { nombre, director } = cfg;
  return `
<h2>MANUAL DE GESTIÓN DE MEDICAMENTOS, DISPOSITIVOS MÉDICOS E INSUMOS</h2>
${header(cfg, nombre, 'Versión 1.0', 'Res. 1732/2026 (Estándar Medicamentos) · Decreto 780/2016 · Res. 1478/2006')}

<h2>1. OBJETIVO Y ALCANCE</h2>
<p>Establecer los procesos de selección, adquisición, almacenamiento, conservación, distribución, dispensación y disposición final de medicamentos, dispositivos médicos, insumos y reactivos de diagnóstico en <strong>${escH(nombre)}</strong>, conforme al Estándar de Medicamentos, Dispositivos Médicos, Insumos y Otras Tecnologías en Salud del Manual de Habilitación.</p>

<h2>2. MARCO NORMATIVO</h2>
<ul>
  <li>Resolución 1732 de 2026 — Manual de Habilitación · Estándar de Medicamentos y Dispositivos Médicos</li>
  <li>Decreto 780 de 2016 — Sistema General de Seguridad Social en Salud (compilación normativa)</li>
  <li>Resolución 1478 de 2006 — Control de medicamentos de control especial (Fondo Nacional de Estupefacientes)</li>
  <li>Decreto 4725 de 2005 — Régimen de registros sanitarios de dispositivos médicos</li>
  <li>Invima — Programas de Farmacovigilancia, Tecnovigilancia y Reactivovigilancia</li>
</ul>

<h2>3. CICLO DEL MEDICAMENTO Y DISPOSITIVO MÉDICO</h2>
<table><tr><th>Etapa</th><th>Responsable</th><th>Punto de control</th></tr>
<tr><td>Selección</td><td>${escH(director)}</td><td>Listado institucional según cartera de servicios</td></tr>
<tr><td>Adquisición</td><td>Compras</td><td>Proveedor con registro sanitario INVIMA vigente</td></tr>
<tr><td>Recepción</td><td>Auxiliar de farmacia</td><td>Verificación de lote, vencimiento y condiciones de transporte</td></tr>
<tr><td>Almacenamiento</td><td>Auxiliar de farmacia</td><td>Condiciones de temperatura, humedad y orden alfabético/FEFO</td></tr>
<tr><td>Conservación</td><td>Auxiliar de farmacia</td><td>Registro diario de temperatura y humedad</td></tr>
<tr><td>Distribución/Dispensación</td><td>Personal asistencial</td><td>Verificación de los 5 correctos</td></tr>
<tr><td>Devolución</td><td>Auxiliar de farmacia</td><td>Registro de motivo y destino</td></tr>
<tr><td>Disposición final</td><td>Gestor RESPEL</td><td>Medicamentos vencidos o deteriorados</td></tr></table>

<h2>4. MEDICAMENTOS DE CONTROL ESPECIAL</h2>
<p>El manejo de medicamentos de control especial (estupefacientes, psicotrópicos) requiere resolución de autorización vigente del Fondo Nacional de Estupefacientes o la entidad territorial competente. Se llevará libro de control foliado con existencias, entradas, salidas y saldo, conforme a la Resolución 1478 de 2006.</p>

<h2>5. CADENA DE FRÍO</h2>
<p>Los biológicos y medicamentos termolábiles se conservan entre 2°C y 8°C, con registro de temperatura mínimo dos veces al día (mañana y tarde) mediante termómetro calibrado o datalogger. Ante ruptura de cadena de frío se activa el plan de contingencia: notificación inmediata, aislamiento del producto afectado y evaluación de viabilidad.</p>

<h2>6. FARMACOVIGILANCIA, TECNOVIGILANCIA Y REACTIVOVIGILANCIA</h2>
<p>El establecimiento reporta ante el INVIMA:</p>
<ul>
  <li><strong>Farmacovigilancia:</strong> sospechas de reacciones adversas a medicamentos (RAM) y problemas relacionados con medicamentos (PRM)</li>
  <li><strong>Tecnovigilancia:</strong> eventos e incidentes adversos asociados a dispositivos médicos</li>
  <li><strong>Reactivovigilancia:</strong> fallas de reactivos de diagnóstico in vitro</li>
</ul>

<h2>7. CARRO DE PARO Y KIT DE DERRAMES</h2>
<p>El carro de paro se verifica diariamente por el responsable del servicio, con registro de existencias, vencimientos y sellos de seguridad. El kit para manejo de derrames de sustancias químicas o citotóxicas se ubica visiblemente, con señalización, y contiene los elementos de protección y absorción requeridos.</p>

<h2>8. REVISIÓN Y CONTROL DE VERSIONES</h2>
<table><tr><th>Versión</th><th>Fecha</th><th>Descripción</th><th>Elaboró</th></tr>
<tr><td>1.0</td><td>${hoy()}</td><td>Elaboración inicial</td><td>${escH(director)}</td></tr></table>

${signBlock(cfg, 'Responsable de Farmacia')}`;
}

// ══════════════════════════════════════════════════════════════════════════════
//  8. REGLAMENTO DE HISTORIA CLÍNICA Y REGISTROS ASISTENCIALES
// ══════════════════════════════════════════════════════════════════════════════
function historiaClinica(cfg: IPSConfig): string {
  const { nombre, director } = cfg;
  return `
<h2>REGLAMENTO DE HISTORIA CLÍNICA Y REGISTROS ASISTENCIALES</h2>
${header(cfg, nombre, 'Versión 1.0', 'Res. 1732/2026 (Estándar Historia Clínica) · Res. 1995/1999 · Ley 1581/2012')}

<h2>1. OBJETIVO Y ALCANCE</h2>
<p>Regular la elaboración, manejo, custodia, conservación y seguridad de la historia clínica y los registros asistenciales de <strong>${escH(nombre)}</strong>, garantizando su unicidad, confidencialidad y disponibilidad.</p>

<h2>2. MARCO NORMATIVO</h2>
<ul>
  <li>Resolución 1732 de 2026 — Manual de Habilitación · Estándar de Historia Clínica y Registros</li>
  <li>Resolución 1995 de 1999 — Manejo de la Historia Clínica</li>
  <li>Ley Estatutaria 1581 de 2012 — Protección de datos personales (Habeas Data)</li>
  <li>Resolución 866 de 2021 y normas complementarias — Historia Clínica Electrónica Interoperable</li>
  <li>Acuerdo del Archivo General de la Nación — Tablas de Retención Documental en salud</li>
</ul>

<h2>3. UNICIDAD Y CUSTODIA</h2>
<p>Cada paciente tiene una única historia clínica en el establecimiento, identificada con nombre completo y número de documento. El acceso físico o electrónico se restringe al personal asistencial autorizado que atiende al paciente. Se lleva registro de préstamo/consulta del expediente físico cuando aplique.</p>

<h2>4. CONTENIDO MÍNIMO</h2>
<p>La historia clínica incluye, como mínimo: datos de identificación, motivo de consulta, anamnesis, examen físico, impresión diagnóstica, órdenes médicas, evolución, notas de enfermería, resultados de laboratorio/imágenes, consentimientos informados y epicrisis cuando aplique.</p>

<h2>5. CONSENTIMIENTO INFORMADO</h2>
<p>Todo procedimiento diagnóstico o terapéutico que implique riesgo requiere consentimiento informado documentado y archivado en la historia clínica, con mecanismo de verificación de su correcta aplicación por parte del responsable de calidad.</p>

<h2>6. CONSERVACIÓN Y RETENCIÓN DOCUMENTAL</h2>
<p>La historia clínica se conserva por el término mínimo establecido en la normatividad vigente sobre retención documental en salud. <em>El establecimiento debe verificar el plazo exacto aplicable (Resolución 1995/1999 y tablas de retención del Archivo General de la Nación vigentes al momento de la consulta), ya que este término ha sido objeto de actualizaciones normativas.</em> Vencido el término, la disposición final se documenta en acta firmada por el Director Técnico.</p>

<h2>7. HISTORIA CLÍNICA ELECTRÓNICA (SI APLICA)</h2>
<p>Cuando el establecimiento utilice historia clínica electrónica, debe contar con documento de certificación técnica firmado por ingeniero de sistemas con tarjeta profesional vigente, que acredite el cumplimiento de los requisitos de seguridad, trazabilidad, respaldo (backup) y disponibilidad exigidos por el Ministerio de Salud, el Archivo General de la Nación, la SIC y el MinTIC.</p>

<h2>8. CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS</h2>
<p>La información contenida en la historia clínica es confidencial (Ley 1581/2012). Solo puede ser conocida por el paciente, el equipo de salud tratante, las autoridades judiciales y de salud competentes, y terceros autorizados por el paciente mediante consentimiento expreso.</p>

<h2>9. REVISIÓN Y CONTROL DE VERSIONES</h2>
<table><tr><th>Versión</th><th>Fecha</th><th>Descripción</th><th>Elaboró</th></tr>
<tr><td>1.0</td><td>${hoy()}</td><td>Elaboración inicial</td><td>${escH(director)}</td></tr></table>

${signBlock(cfg, 'Responsable de Historia Clínica')}`;
}

// ══════════════════════════════════════════════════════════════════════════════
//  9. POLÍTICA Y PROGRAMA DE SEGURIDAD DEL PACIENTE
// ══════════════════════════════════════════════════════════════════════════════
function seguridadPaciente(cfg: IPSConfig): string {
  const { nombre, director } = cfg;
  return `
<h2>POLÍTICA Y PROGRAMA DE SEGURIDAD DEL PACIENTE</h2>
${header(cfg, nombre, 'Versión 1.0', 'Res. 1732/2026 (Est. Procesos Prioritarios, Criterio 2) · Lineamientos MSPS')}

<h2>1. DECLARACIÓN DE POLÍTICA</h2>
<p><strong>${escH(nombre)}</strong> se compromete a brindar una atención segura, libre del mayor número posible de eventos adversos evitables, mediante la identificación, prevención y gestión de los riesgos asociados a la atención en salud. Esta política es liderada por la Dirección Técnica y aplica a todo el personal asistencial y administrativo.</p>

<h2>2. MARCO NORMATIVO</h2>
<ul>
  <li>Resolución 1732 de 2026 — Manual de Habilitación · Estándar de Procesos Prioritarios, Criterio 2</li>
  <li>Lineamientos del Ministerio de Salud y Protección Social para la Seguridad del Paciente</li>
  <li>Observatorio de Calidad de la Atención en Salud</li>
</ul>

<h2>3. PRÁCTICAS SEGURAS OBLIGATORIAS</h2>
<table><tr><th>Práctica segura</th><th>Medida de control</th></tr>
<tr><td>Identificación correcta del paciente</td><td>Mínimo dos datos (nombre completo + documento) antes de cualquier procedimiento</td></tr>
<tr><td>Comunicación efectiva</td><td>Reporte estructurado en cambios de turno y remisiones</td></tr>
<tr><td>Seguridad en la administración de medicamentos</td><td>Verificación de los 5 correctos: paciente, medicamento, dosis, vía, hora</td></tr>
<tr><td>Prevención de infecciones asociadas a la atención</td><td>Higiene de manos, técnica aséptica, aislamiento cuando aplique</td></tr>
<tr><td>Prevención de caídas</td><td>Escala de riesgo, señalización y barandas cuando aplique</td></tr>
<tr><td>Consentimiento informado</td><td>Documentado antes de procedimientos de riesgo</td></tr>
<tr><td>Cirugía/procedimiento seguro</td><td>Lista de chequeo de verificación (paciente, sitio y procedimiento correctos)</td></tr>
<tr><td>Atención segura a la gestante y el recién nacido</td><td>Protocolos según guías de práctica clínica vigentes</td></tr>
<tr><td>Prevención de úlceras por presión</td><td>Valoración de riesgo y cambios posturales</td></tr>
</table>

<h2>4. GESTIÓN DE EVENTOS ADVERSOS</h2>
<p>Todo evento adverso, incidente o "casi evento" debe reportarse mediante el formato institucional, sin fines punitivos. El análisis se realiza mediante metodología de causa raíz (protocolo de Londres o espina de pescado), documentando el plan de mejora resultante y su seguimiento.</p>

<h2>5. INDICADORES DE SEGURIDAD DEL PACIENTE</h2>
<table><tr><th>Indicador</th><th>Meta</th><th>Frecuencia</th></tr>
<tr><td>Eventos adversos reportados y analizados</td><td>100%</td><td>Mensual</td></tr>
<tr><td>Adherencia a identificación correcta del paciente</td><td>≥95%</td><td>Mensual</td></tr>
<tr><td>Adherencia a higiene de manos</td><td>≥90%</td><td>Mensual</td></tr>
<tr><td>Caídas de pacientes</td><td>0</td><td>Mensual</td></tr></table>

<h2>6. COMITÉ DE SEGURIDAD DEL PACIENTE</h2>
<p>Se reunirá con periodicidad mínima trimestral para el análisis de eventos, seguimiento de indicadores y actualización de esta política. Las actas se conservarán como evidencia para visitas de verificación.</p>

<h2>7. REVISIÓN Y CONTROL DE VERSIONES</h2>
<table><tr><th>Versión</th><th>Fecha</th><th>Descripción</th><th>Elaboró</th></tr>
<tr><td>1.0</td><td>${hoy()}</td><td>Elaboración inicial</td><td>${escH(director)}</td></tr></table>

${signBlock(cfg, 'Líder de Seguridad del Paciente')}`;
}

// ══════════════════════════════════════════════════════════════════════════════
//  10. PLAN INSTITUCIONAL DE ACCIONES DE FORMACIÓN CONTINUA
// ══════════════════════════════════════════════════════════════════════════════
function formacionContinua(cfg: IPSConfig): string {
  const { nombre, director } = cfg;
  return `
<h2>PLAN INSTITUCIONAL DE ACCIONES DE FORMACIÓN CONTINUA</h2>
${header(cfg, nombre, `Versión 1.0 · Vigencia ${new Date().getFullYear()}`, 'Res. 1732/2026 (Est. Talento Humano, Criterio 4) · Ley 1164/2007')}

<h2>1. OBJETIVO</h2>
<p>Mantener actualizadas las competencias del talento humano de <strong>${escH(nombre)}</strong> mediante un plan anual de formación continua, conforme al Criterio 4 del Estándar de Talento Humano de la Resolución 1732 de 2026.</p>

<h2>2. MARCO NORMATIVO</h2>
<ul>
  <li>Resolución 1732 de 2026 — Manual de Habilitación · Estándar de Talento Humano, Criterio 4</li>
  <li>Ley 1164 de 2007 — Talento Humano en Salud</li>
  <li>ReTHUS — Registro Único Nacional del Talento Humano en Salud</li>
</ul>

<h2>3. ANÁLISIS DE NECESIDADES DE FORMACIÓN</h2>
<p>El análisis de necesidades se realiza a partir de: resultados de auditoría interna, eventos adversos reportados, cambios normativos, resultados de evaluación de desempeño y solicitudes del personal asistencial y administrativo.</p>

<h2>4. PROGRAMACIÓN ANUAL</h2>
<table><tr><th>Tema</th><th>Dirigido a</th><th>Modalidad</th><th>Intensidad</th><th>Fecha estimada</th></tr>
<tr><td>Seguridad del paciente y eventos adversos</td><td>Todo el personal asistencial</td><td>Presencial</td><td>4 horas</td><td>_____________</td></tr>
<tr><td>Bioseguridad y manejo de residuos</td><td>Todo el personal</td><td>Presencial</td><td>2 horas</td><td>_____________</td></tr>
<tr><td>Reanimación cardiopulmonar básica</td><td>Personal asistencial</td><td>Práctica</td><td>4 horas</td><td>_____________</td></tr>
<tr><td>Actualización en historia clínica y habeas data</td><td>Todo el personal</td><td>Virtual</td><td>2 horas</td><td>_____________</td></tr>
<tr><td>Actualización normativa en habilitación</td><td>Coordinación de calidad</td><td>Virtual</td><td>4 horas</td><td>_____________</td></tr></table>

<h2>5. IDENTIFICACIÓN DE FORMADORES</h2>
<p>Las capacitaciones serán impartidas por personal interno idóneo, entidades certificadas, cajas de compensación, ARL o proveedores externos con experiencia acreditada en el tema.</p>

<h2>6. MECANISMOS DE EVALUACIÓN</h2>
<p>Cada acción de formación incluye evaluación de conocimientos adquiridos y/o evaluación de satisfacción, con resultados que retroalimentan la programación del año siguiente.</p>

<h2>7. REGISTRO Y EVIDENCIA DE PARTICIPACIÓN</h2>
<p>Se conservará listado de asistencia firmado, material entregado y certificados cuando aplique, como evidencia disponible para visitas de verificación de habilitación.</p>

<h2>8. VIGENCIA Y ACTUALIZACIÓN</h2>
<p>Este plan tiene vigencia anual y se actualiza cada año conforme al análisis de necesidades y a los resultados del período anterior.</p>

${signBlock(cfg, 'Responsable de Talento Humano')}`;
}

// ══════════════════════════════════════════════════════════════════════════════
//  11. PROGRAMA DE GESTIÓN AMBIENTAL Y ACCIÓN CLIMÁTICA (PIGCCS SALUD)
// ══════════════════════════════════════════════════════════════════════════════
function gestionAmbiental(cfg: IPSConfig): string {
  const { nombre, director } = cfg;
  return `
<h2>PROGRAMA DE GESTIÓN AMBIENTAL Y ACCIÓN CLIMÁTICA (PIGCCS SALUD)</h2>
${header(cfg, nombre, 'Versión 1.0', 'Res. 1732/2026 (Est. Procesos Prioritarios, Criterio 30) · Ley 1931/2018')}

<h2>1. OBJETIVO</h2>
<p>Establecer las acciones de gestión ambiental y adaptación al cambio climático de <strong>${escH(nombre)}</strong>, alineadas con el Plan Institucional de Gestión Ambiental y Cambio Climático en Salud (PIGCCS Salud) del Ministerio de Salud y Protección Social.</p>

<h2>2. MARCO NORMATIVO</h2>
<ul>
  <li>Resolución 1732 de 2026 — Manual de Habilitación · Estándar de Procesos Prioritarios, Criterio 30</li>
  <li>Ley 1931 de 2018 — Gestión del cambio climático</li>
  <li>Decreto 351 de 2014 — Gestión de residuos hospitalarios (complementario)</li>
  <li>Lineamientos PIGCCS Salud del Ministerio de Salud y Protección Social</li>
</ul>

<h2>3. DIAGNÓSTICO AMBIENTAL</h2>
<p>El establecimiento identifica sus principales aspectos ambientales: consumo de agua, consumo de energía eléctrica, generación de residuos (peligrosos y no peligrosos), uso de sustancias químicas y emisiones asociadas a la operación.</p>

<h2>4. LÍNEAS DE ACCIÓN</h2>
<table><tr><th>Línea</th><th>Acciones</th><th>Responsable</th></tr>
<tr><td>Uso eficiente del agua</td><td>Revisión periódica de fugas, dispositivos ahorradores</td><td>${escH(director)}</td></tr>
<tr><td>Uso eficiente de energía</td><td>Iluminación LED, apagado de equipos fuera de horario</td><td>________________</td></tr>
<tr><td>Gestión de residuos</td><td>Articulación con el PGIRH institucional</td><td>________________</td></tr>
<tr><td>Sustitución de sustancias de alto impacto</td><td>Eliminación progresiva de mercurio y reducción de PVC</td><td>________________</td></tr>
<tr><td>Movilidad sostenible</td><td>Fomento de transporte no motorizado o compartido</td><td>________________</td></tr>
<tr><td>Adaptación al cambio climático</td><td>Plan de contingencia ante eventos climáticos extremos</td><td>${escH(director)}</td></tr></table>

<h2>5. METAS E INDICADORES</h2>
<table><tr><th>Indicador</th><th>Meta</th><th>Frecuencia</th></tr>
<tr><td>Consumo de agua (m³/mes)</td><td>Reducción anual ≥5%</td><td>Mensual</td></tr>
<tr><td>Consumo de energía (kWh/mes)</td><td>Reducción anual ≥5%</td><td>Mensual</td></tr>
<tr><td>Generación de residuos peligrosos (kg/mes)</td><td>Seguimiento y minimización</td><td>Mensual</td></tr></table>

<h2>6. RESPONSABLES Y SEGUIMIENTO</h2>
<p>El Director Técnico designa un responsable del programa, quien reporta avances anualmente y actualiza el diagnóstico y las metas conforme a los resultados obtenidos.</p>

<h2>7. REVISIÓN Y CONTROL DE VERSIONES</h2>
<table><tr><th>Versión</th><th>Fecha</th><th>Descripción</th><th>Elaboró</th></tr>
<tr><td>1.0</td><td>${hoy()}</td><td>Elaboración inicial</td><td>${escH(director)}</td></tr></table>

${signBlock(cfg, 'Coordinador Ambiental')}`;
}

// ══════════════════════════════════════════════════════════════════════════════
//  12. MANUAL DE REFERENCIA Y CONTRARREFERENCIA
// ══════════════════════════════════════════════════════════════════════════════
function referenciaContrarreferencia(cfg: IPSConfig): string {
  const { nombre, director } = cfg;
  return `
<h2>MANUAL DE REFERENCIA Y CONTRARREFERENCIA</h2>
${header(cfg, nombre, 'Versión 1.0', 'Res. 1732/2026 (Estándar de Interdependencia) · Res. 3047/2008')}

<h2>1. OBJETIVO Y ALCANCE</h2>
<p>Establecer el procedimiento para la remisión segura de pacientes cuando <strong>${escH(nombre)}</strong> no cuente con el servicio requerido, y para la contrarreferencia (retorno) del paciente una vez resuelta la atención en la institución receptora.</p>

<h2>2. MARCO NORMATIVO</h2>
<ul>
  <li>Resolución 1732 de 2026 — Manual de Habilitación · Estándar de Interdependencia</li>
  <li>Resolución 3047 de 2008 — Formatos y mecanismos de referencia y contrarreferencia</li>
  <li>Ley Estatutaria 1751 de 2015 — Derecho fundamental a la salud</li>
</ul>

<h2>3. RED DE PRESTADORES Y CONVENIOS</h2>
<table><tr><th>Servicio no disponible</th><th>IPS de referencia</th><th>Nivel de complejidad</th><th>Convenio vigente</th></tr>
<tr><td>Urgencias de mayor complejidad</td><td>________________</td><td>II / III</td><td>________________</td></tr>
<tr><td>Hospitalización</td><td>________________</td><td>II / III</td><td>________________</td></tr>
<tr><td>Cuidado intensivo (UCI)</td><td>________________</td><td>III</td><td>________________</td></tr>
<tr><td>Apoyo diagnóstico especializado</td><td>________________</td><td>II</td><td>________________</td></tr></table>

<h2>4. PROCEDIMIENTO DE REFERENCIA</h2>
<ol>
  <li>Estabilización inicial del paciente conforme a su condición clínica</li>
  <li>Comunicación telefónica con la IPS receptora para confirmar disponibilidad</li>
  <li>Diligenciamiento del formato de referencia: motivo, diagnóstico, resumen de manejo, signos vitales y soporte requerido durante el traslado</li>
  <li>Coordinación del medio de transporte (asistencial básico o medicalizado según el caso)</li>
  <li>El paciente viaja acompañado de la epicrisis o resumen de atención y los resultados paraclínicos disponibles</li>
</ol>

<h2>5. PROCEDIMIENTO DE CONTRARREFERENCIA</h2>
<p>La IPS receptora remite informe de contrarreferencia con el resultado de la atención, indicaciones de seguimiento y recomendaciones. El establecimiento de origen incorpora este informe a la historia clínica del paciente y da continuidad al plan de manejo.</p>

<h2>6. FORMATO MÍNIMO DE REFERENCIA</h2>
<p>El formato de referencia incluye como mínimo: identificación del paciente, institución remisora y receptora, motivo de remisión, resumen clínico, diagnóstico, tratamiento instaurado, signos vitales al momento del traslado y nombre del profesional responsable.</p>

<h2>7. SEGUIMIENTO Y TRAZABILIDAD</h2>
<p>Se llevará registro de todas las referencias realizadas, con fecha, destino y desenlace, para efectos de seguimiento, auditoría e indicadores de oportunidad de la remisión.</p>

<h2>8. REVISIÓN Y CONTROL DE VERSIONES</h2>
<table><tr><th>Versión</th><th>Fecha</th><th>Descripción</th><th>Elaboró</th></tr>
<tr><td>1.0</td><td>${hoy()}</td><td>Elaboración inicial</td><td>${escH(director)}</td></tr></table>

${signBlock(cfg, 'Coordinador de Referencia y Contrarreferencia')}`;
}

// ── Mapa principal ────────────────────────────────────────────────────────────
const TEMPLATE_MAP: Record<DocId, (cfg: IPSConfig) => string> = {
  bioseguridad,
  residuos,
  atencion,
  emergencias,
  tecnovigilancia,
  'hoja-vida': hojaVida,
  medicamentos,
  'historia-clinica': historiaClinica,
  'seguridad-paciente': seguridadPaciente,
  'formacion-continua': formacionContinua,
  'gestion-ambiental': gestionAmbiental,
  'referencia-contrarreferencia': referenciaContrarreferencia,
};

/**
 * Genera el HTML interno de un documento normativo.
 * El HTML resultante debe usarse en dangerouslySetInnerHTML dentro de un
 * contenedor con la clase "doc-paper" que aplica los estilos de impresión.
 */
export function generarDocumento(id: DocId, cfg: IPSConfig): string {
  const fn = TEMPLATE_MAP[id];
  if (!fn) return '<p>Documento no disponible.</p>';
  return fn(cfg);
}

/** CSS de impresión para el documento (inyectar en window.open) */
export const DOC_PRINT_CSS = `
  body { font-family: Georgia, serif; font-size: 13px; line-height: 1.8;
         color: #1e293b; margin: 40px 56px; max-width: 760px; }
  h1 { font-size: 18px; font-weight: 800; text-align: center;
       margin-bottom: 4px; font-family: 'Segoe UI', sans-serif; }
  h2 { font-size: 14px; font-weight: 800; margin: 28px 0 10px;
       padding-bottom: 4px; border-bottom: 2px solid #0d9488;
       font-family: 'Segoe UI', sans-serif; color: #0f766e; }
  h3 { font-size: 13px; font-weight: 700; margin: 18px 0 6px;
       font-family: 'Segoe UI', sans-serif; }
  .doc-header-meta { text-align: center; color: #64748b; font-size: 12px;
                     margin-bottom: 32px; font-family: 'Segoe UI', sans-serif;
                     border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0;
          font-family: 'Segoe UI', sans-serif; font-size: 12px; }
  th { background: #0d9488; color: #fff; padding: 8px 10px;
       text-align: left; font-weight: 700; }
  td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .sign-block { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr;
                gap: 40px; font-family: 'Segoe UI', sans-serif; font-size: 12px; }
  .sign-line { border-top: 1px solid #1e293b; margin-top: 40px; padding-top: 6px; }
  ul { margin: 8px 0 8px 20px; } li { margin-bottom: 4px; }
  p { margin: 8px 0; text-align: justify; }
  @media print { body { margin: 20px 30px; } }
`;
