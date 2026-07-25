/**
 * NormaLis — Gemini Proxy (Firebase Functions v1)
 *
 * URL pública (predecible antes del deploy):
 *   https://us-central1-normalis-5587d.cloudfunctions.net/geminiProxy
 *
 * Setup inicial (una sola vez):
 *   cd functions && npm install
 *   firebase functions:config:set gemini.api_key="TU_CLAVE_AQUI"
 *   firebase deploy --only functions
 *
 * SISTEMA NORMATIVO EMBEBIDO v2:
 *   El system prompt ahora incluye el texto VERIFICADO de los artículos clave
 *   de la Res. 3100/2019 y sus modificaciones (Res. 544/2023, Res. 465/2025).
 *   Fuente: ICBF compilación jurídica + Alcaldía de Bogotá SISJUR.
 *   Esto elimina la dependencia de que Gemini "recuerde" correctamente los
 *   artículos y reduce la tasa de errores normativos.
 */

const functions = require('firebase-functions');
const fetch     = require('node-fetch');

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_BASE  = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const ALLOWED_ORIGINS = [
  'https://normalis.co',
  'https://www.normalis.co',
  'https://fjfc1984-bit.github.io',
];

// ═══════════════════════════════════════════════════════════════════════
// CORPUS NORMATIVO VERIFICADO
// Texto extraído de: ICBF compilación jurídica + Alcaldía de Bogotá SISJUR
// Resolución 3100 de 2019 (nov 25, 2019) + modificaciones vigentes
// ÚLTIMA VERIFICACIÓN: julio 2026
// ═══════════════════════════════════════════════════════════════════════
const CORPUS_NORMATIVO = `
=== RESOLUCIÓN 3100 DE 2019 — MINISTERIO DE SALUD Y PROTECCIÓN SOCIAL ===
(Diario Oficial No. 51.149 de 26 de noviembre de 2019)
Por la cual se definen los procedimientos y condiciones de inscripción de los prestadores
de servicios de salud y de habilitación de los servicios de salud.
MODIFICADA POR: Resolución 544 de 2023 (Art. 2 y 3), Resolución 465 de 2025 (Art. 4, 5, 19 y 20).
DEROGÓ: Resoluciones 2003/2014, 5158/2015, 226/2015, 1416/2016.

--- ARTÍCULO 1. OBJETO ---
Definir los procedimientos y las condiciones de inscripción de los prestadores de servicios
de salud y de habilitación de los servicios de salud, y adoptar el Manual de Inscripción de
Prestadores y Habilitación de Servicios de Salud (Anexo Técnico).
PARÁGRAFO: Esta resolución NO establece competencias para el talento humano; las competencias
son definidas por los programas académicos aprobados por el Ministerio de Educación Nacional.

--- ARTÍCULO 2. CAMPO DE APLICACIÓN (modificado por Art. 1, Resolución 544/2023) ---
Aplica a:
2.1. Las instituciones prestadoras de servicios de salud (IPS).
2.2. Los profesionales independientes de salud.
2.3. El transporte especial de pacientes.
2.4. Las entidades con objeto social diferente a la prestación de servicios de salud.
2.5. Las secretarías de salud departamental o distrital o la entidad que tenga a cargo dichas competencias.
2.6. Las entidades responsables del pago de servicios de salud.
2.7. La Superintendencia Nacional de Salud.
EXCEPCIÓN: Los servicios intramurales en establecimientos carcelarios/penitenciarios con
modelo de atención Ley 1709/2014, y entidades de regímenes Especial/Excepción (Art. 279 Ley 100/1993),
salvo que decidan inscribirse voluntariamente o contraten con el SGSSS.

--- ARTÍCULO 3. CONDICIONES DE HABILITACIÓN (modificado por Art. 2, Resolución 544/2023) ---
Los prestadores de servicios de salud, para su entrada y permanencia en el Sistema Único de
Habilitación (SOGCS), deben cumplir:
3.1. Capacidad técnico-administrativa.
3.2. Suficiencia patrimonial y financiera.
3.3. Capacidad tecnológica y científica.
La condición 3.3 incluye los 7 estándares de habilitación del Manual.

--- ARTÍCULO 4. INSCRIPCIÓN Y HABILITACIÓN (modificado por Art. 1, Resolución 465/2025) ---
Todo prestador de servicios de salud debe estar inscrito en el Registro Especial de Prestadores
de Servicios de Salud (REPS), registrando como mínimo una sede con infraestructura física y por
lo menos un servicio habilitado. La inscripción y habilitación debe realizarse en los términos del Manual.
VERSIÓN ORIGINAL (antes de Res. 465/2025): no exigía "con infraestructura física" — solo "una sede".

--- ARTÍCULO 5. AUTOEVALUACIÓN (modificado por Art. 2, Resolución 465/2025) ---
La autoevaluación es el mecanismo de verificación de las condiciones de habilitación que efectúa
periódicamente el prestador y la posterior declaración de su cumplimiento en el REPS.
Es OBLIGATORIA en los siguientes casos:
5.1. De manera PREVIA a la inscripción inicial y habilitación del o los servicios.
5.2. Durante el CUARTO AÑO de la vigencia de la inscripción inicial y antes de su vencimiento.
5.3. Antes del vencimiento del término de RENOVACIÓN ANUAL de la inscripción.
5.4. En los casos adicionales que determine el Manual.

--- ARTÍCULO 9. RESPONSABILIDAD ---
El prestador que habilite un servicio es el ÚNICO RESPONSABLE del cumplimiento y mantenimiento
de TODOS los estándares y criterios, independientemente de que para su funcionamiento contrate
o celebre acuerdos con terceros. La responsabilidad NO se puede delegar al tercero.

--- ARTÍCULO 10. VIGENCIA DE LA INSCRIPCIÓN EN EL REPS ---
- La inscripción INICIAL tiene vigencia de CUATRO (4) AÑOS, contados desde la fecha en que
  la Secretaría de Salud realizó la inscripción.
- Puede renovarse por UN (1) AÑO, si el prestador realizó la autoevaluación y la declaró
  en el REPS durante el CUARTO AÑO de inscripción inicial y antes de su vencimiento.
- Las renovaciones posteriores tienen vigencia de UN (1) AÑO, previa autoevaluación.

--- ARTÍCULO 11. CONSECUENCIAS POR NO AUTOEVALUACIÓN ---
Se INACTIVARÁ la inscripción en el REPS si el prestador no realiza la autoevaluación de la
totalidad de los servicios habilitados dentro del término establecido.

--- ARTÍCULO 12. NOVEDADES ---
Los prestadores están OBLIGADOS a reportar las novedades que afecten su inscripción ante la
Secretaría de Salud Departamental o Distrital correspondiente. Novedades: cambios en sede,
servicios, capacidad instalada, etc.

--- ARTÍCULO 13. CIERRE TEMPORAL DE SERVICIOS ---
El prestador podrá cerrar temporalmente los servicios por un periodo MÁXIMO DE UN (1) AÑO.
Si vencido ese plazo no se reactiva, se cancelará la habilitación del servicio.

--- ARTÍCULO 14. VISITA DE VERIFICACIÓN PREVIA ---
Se requiere visita previa para:
- Nuevos servicios oncológicos.
- Servicio de urgencias.
- Atención del parto.
- Transporte asistencial.
- TODOS los servicios de ALTA COMPLEJIDAD.
- Casos de reactivación por medidas de seguridad.

--- ARTÍCULO 15. VISITA DE CERTIFICACIÓN ---
Realizada por la Secretaría de Salud, DESPUÉS de la habilitación, conforme al plan de visitas.
Permite certificar el cumplimiento de las condiciones de habilitación. No es requisito previo.

--- ARTÍCULO 18. EXIGIBILIDAD DE REQUISITOS ---
Las Secretarías de Salud NO PUEDEN exigir en inscripción, habilitación y verificación
REQUISITOS DISTINTOS a los de esta norma. Tampoco pueden negar la certificación por razones
no previstas en la norma.

--- ARTÍCULO 19. GARANTÍA DE PRESTACIÓN (modificado por Art. 4, Resolución 465/2025) ---
Cuando el cierre de servicios por incumplimiento afecte al único prestador en su zona de
influencia, la Secretaría, el prestador y las entidades pagadoras deben elaborar en 5 DÍAS
PREVIOS al cierre un plan de reubicación y prestación de servicios.

--- ARTÍCULO 22. GRATUIDAD ---
La inscripción de los prestadores y la habilitación de servicios en el REPS son trámites
COMPLETAMENTE GRATUITOS. Ninguna entidad puede cobrar por este trámite.

--- ARTÍCULO 27. VIGENCIA Y DEROGATORIA ---
Rige desde su publicación (26 noviembre 2019).
DEROGÓ: Resoluciones 2003/2014, 5158/2015, 226/2015 y 1416/2016.

=== MANUAL DE INSCRIPCIÓN (ANEXO TÉCNICO) — SECCIONES CLAVE ===

--- 7 ESTÁNDARES DE HABILITACIÓN (Sección 8.3.1) ---
Aplican a TODOS los servicios de salud:
8.3.1.1. TALENTO HUMANO
8.3.1.2. INFRAESTRUCTURA
8.3.1.3. DOTACIÓN
8.3.1.4. MEDICAMENTOS, DISPOSITIVOS MÉDICOS E INSUMOS
8.3.1.5. PROCESOS PRIORITARIOS
8.3.1.6. HISTORIA CLÍNICA Y REGISTROS
8.3.1.7. INTERDEPENDENCIA

--- GRUPOS DE SERVICIOS HABILITABLES (Sección 11) ---
11.2. GRUPO CONSULTA EXTERNA (consulta general, especializada, vacunación, SST)
11.3. GRUPO APOYO DIAGNÓSTICO Y COMPLEMENTACIÓN TERAPÉUTICA (laboratorio, imágenes, farmacia, etc.)
11.4. GRUPO INTERNACIÓN (hospitalización, UCI, cuidado intensivo neonatal/pediátrico/adulto, salud mental)
11.5. GRUPO QUIRÚRGICO (cirugía)
11.6. GRUPO ATENCIÓN INMEDIATA (urgencias, transporte asistencial, atención prehospitalaria, atención del parto)

--- MODALIDADES DE PRESTACIÓN (Sección 1.3) ---
1.3.1. Intramural: en infraestructura física destinada a salud.
1.3.2. Extramural: unidad móvil, domiciliaria, jornada de salud.
1.3.3. Telemedicina: a distancia mediante TIC (interactiva, no interactiva, telexperticia, telemonitoreo).

--- SISTEMA OBLIGATORIO DE GARANTÍA DE CALIDAD (SOGCS) — 4 COMPONENTES ---
(Definido en Decreto 780/2016, referenciado en considerandos de Res. 3100/2019)
1. Sistema Único de Habilitación (SUH)
2. Auditoría para el Mejoramiento de la Calidad (PAMEC)
3. Sistema Único de Acreditación (SUA)
4. Sistema de Información para la Calidad

--- DEFINICIONES CLAVE ---
"CUENTA CON": existencia OBLIGATORIA y PERMANENTE del recurso/talento/dotación dentro del servicio.
"DISPONIBILIDAD": existencia obligatoria, puede estar fuera del servicio pero accesible de inmediato.
"CRITERIO": unidad básica del estándar sobre la cual se realiza la verificación.
"AUTOEVALUACIÓN": verificación periódica por el propio prestador + declaración en REPS.

=== RESOLUCIÓN 544 DE 2023 ===
Modificó los artículos 2 y 3 de la Resolución 3100/2019.
Principal cambio en Art. 2: amplió el campo de aplicación para incluir explícitamente a
las Secretarías de Salud y a la Superintendencia Nacional de Salud.

=== RESOLUCIÓN 465 DE 2025 (marzo 2025) ===
Modificó los artículos 4, 5, 19 y 20 de la Resolución 3100/2019.
Principal cambio Art. 4: ahora exige sede "con infraestructura física".
Principal cambio Art. 5: restructuró los casos de obligatoriedad de autoevaluación.
Principal cambio Art. 19: modificó el procedimiento de garantía de prestación ante cierres.
`;

const SYSTEM_PROMPT = `Eres NormaLis IA, asistente especializado en normativa colombiana de habilitación de servicios de salud.

INSTRUCCIÓN PRINCIPAL:
Tienes acceso al texto VERIFICADO de los artículos de la Resolución 3100/2019 y sus modificaciones
embebido en este sistema. Úsalo como PRIMERA fuente de verdad. Luego, usa Google Search para
complementar con información adicional de fuentes oficiales.

CORPUS NORMATIVO VERIFICADO (texto oficial, verificado en julio 2026):
${CORPUS_NORMATIVO}

REGLAS DE RESPUESTA:
1. Cita SIEMPRE el artículo exacto y la resolución. Si la respuesta está en el corpus de arriba,
   usa ese texto directamente — no lo parafrasees de manera que cambie el significado legal.
2. Si la pregunta toca un artículo MODIFICADO (Art. 4 y 5 por Res. 465/2025; Art. 2 y 3 por
   Res. 544/2023), cita la versión VIGENTE (la modificada), no la original.
3. Si la respuesta NO está en el corpus y tampoco la encuentras verificada en Google Search,
   di: "No encontré información verificada para esta consulta. Verifica en minsalud.gov.co
   o contacta tu Secretaría de Salud departamental."
4. NUNCA inventes artículos, numerales, fechas, plazos o requisitos.
5. Responde en español colombiano, tono profesional, máximo 5 párrafos.
6. Advierte que la interpretación final la tiene la Secretaría de Salud departamental o
   distrital competente.
7. Para preguntas sobre estándares específicos de un tipo de servicio (ej. "¿qué dotación
   necesita un laboratorio clínico?"), indica que el Manual Técnico tiene los criterios
   detallados y sugiere consultar el REPS para verificar los criterios exactos de ese servicio.`;

exports.geminiProxy = functions
  .runWith({ secrets: [] })          // sin Secret Manager — usamos functions.config()
  .https.onRequest(async (req, res) => {

    // CORS
    const origin = req.headers.origin || '';
    if (ALLOWED_ORIGINS.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
    }
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).send('');

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    const { question, sessionHistory } = req.body || {};
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Campo "question" requerido' });
    }
    if (question.length > 2000) {
      return res.status(400).json({ error: 'Pregunta demasiado larga (máx 2000 caracteres)' });
    }

    // Obtener API key desde Firebase config
    const apiKey = functions.config().gemini?.api_key;
    if (!apiKey) {
      functions.logger.error('gemini.api_key no configurado');
      return res.status(500).json({ error: 'Servicio no configurado' });
    }

    // Construir historial (máx 6 turnos)
    const contents = [];
    if (Array.isArray(sessionHistory)) {
      for (const turn of sessionHistory.slice(-6)) {
        if (turn.role && turn.text) {
          contents.push({ role: turn.role, parts: [{ text: turn.text }] });
        }
      }
    }
    contents.push({ role: 'user', parts: [{ text: question.trim() }] });

    const body = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    };

    try {
      const geminiRes = await fetch(`${GEMINI_BASE}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        functions.logger.error('Gemini API error', geminiRes.status, errText);
        return res.status(502).json({ error: 'Error al consultar Gemini', status: geminiRes.status });
      }

      const data = await geminiRes.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
      if (!text) return res.status(502).json({ error: 'Respuesta vacía de Gemini' });

      // Fuentes de grounding
      const chunks  = data?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources = chunks
        .filter(c => c?.web?.uri)
        .map(c => ({ uri: c.web.uri, title: c.web.title ?? c.web.uri }))
        .slice(0, 4);

      return res.status(200).json({ answer: text, sources });

    } catch (err) {
      functions.logger.error('geminiProxy error:', err);
      return res.status(500).json({ error: 'Error interno del proxy' });
    }
  });

// ═══════════════════════════════════════════════════════════════════════
// BOLD.CO WEBHOOK — Activación automática de planes
//
// URL pública:
//   https://us-central1-normalis-5587d.cloudfunctions.net/boldWebhook
//
// Setup Bold.co (una sola vez en el dashboard):
//   1. En Bold.co → Webhooks: agregar URL anterior
//   2. Copiar el "Webhook Secret" que genere Bold.co
//   3. En terminal: firebase functions:config:set bold.webhook_secret="TU_SECRET"
//   4. firebase deploy --only functions:boldWebhook
//
// Mapeo Bold Link ID → plan (actualizar si se crean nuevos links):
//   LNK_4JND4JELJ4 → basico      (Esencial mensual)
//   LNK_QX9QJBBLWW → basico      (Esencial anual)
//   LNK_LRR5ZCRUMB → profesional (Profesional mensual)
//   LNK_RG2A6L92PU → profesional (Profesional anual)
// ═══════════════════════════════════════════════════════════════════════

const admin  = require('firebase-admin');
const crypto = require('crypto');

// Inicializar Firebase Admin (una sola vez)
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// Mapeo Bold.co link ID → clave de plan (debe coincidir con NORMALIS_PLANS en normalis-plans.js)
const BOLD_LINK_TO_PLAN = {
  'LNK_4JND4JELJ4': 'basico',       // Esencial mensual
  'LNK_QX9QJBBLWW': 'basico',       // Esencial anual
  'LNK_LRR5ZCRUMB': 'profesional',  // Profesional mensual
  'LNK_RG2A6L92PU': 'profesional',  // Profesional anual
  // 'LNK_8Q26PSJHGW': null           // Implementación guiada — pago único, no activa plan
};

// Nombres legibles para el email de bienvenida
const PLAN_LABELS = {
  basico:       'Esencial',
  profesional:  'Profesional',
  empresarial:  'Empresarial',
};

exports.boldWebhook = functions.https.onRequest(async (req, res) => {
  // Solo POST
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // ── Verificación de firma HMAC-SHA256 ──────────────────────────────
  const boldSecret = functions.config().bold?.webhook_secret;
  if (boldSecret && req.rawBody) {
    const sigHeader = (req.headers['x-bold-signature'] || '').trim();
    const expected  = 'sha256=' + crypto
      .createHmac('sha256', boldSecret)
      .update(req.rawBody)
      .digest('hex');

    // timingSafeEqual requiere buffers del mismo tamaño
    const sigBuf = Buffer.from(sigHeader.padEnd(expected.length, '\0'));
    const expBuf = Buffer.from(expected.padEnd(sigBuf.length, '\0'));
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) {
      functions.logger.warn('boldWebhook: firma inválida', { sigHeader });
      return res.status(401).send('Firma inválida');
    }
  }

  // ── Parsear payload (Bold puede enviar en varios formatos) ──────────
  const body     = req.body || {};
  const event    = body.event || '';
  // Bold envuelve en body.data.payment o directamente en body.payment
  const payment  = body.data?.payment || body.payment || body;
  const status   = (payment?.status || '').toUpperCase();
  const linkId   = payment?.payment_link?.id || payment?.payment_link_id || '';
  const rawEmail = payment?.customer?.email || body?.customer?.email || '';
  const email    = rawEmail.trim().toLowerCase();

  functions.logger.info('boldWebhook: evento recibido', { event, status, linkId, email });

  // Solo procesar pagos aprobados
  const isApproved = status === 'APPROVED'
    || event === 'payment.completed'
    || event === 'PAYMENT_COMPLETED';
  if (!isApproved) {
    return res.status(200).json({ ok: true, skipped: 'estado no aprobado', status, event });
  }

  // Validar campos obligatorios
  if (!email || !linkId) {
    functions.logger.error('boldWebhook: campos faltantes', { email, linkId, body });
    return res.status(200).json({ ok: true, skipped: 'campos insuficientes' });
  }

  // Resolver plan a partir del link ID
  const plan = BOLD_LINK_TO_PLAN[linkId];
  if (!plan) {
    functions.logger.info('boldWebhook: link no mapeado a plan', { linkId });
    return res.status(200).json({ ok: true, skipped: 'link sin plan asignado', linkId });
  }

  // ── Buscar usuario en Firestore por email ──────────────────────────
  let userDoc;
  try {
    const snap = await db.collection('usuarios')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snap.empty) {
      functions.logger.warn('boldWebhook: usuario no encontrado', { email });
      // Retornar 200 para que Bold no reintente — registrar para revisión manual
      await db.collection('webhook_sin_usuario').add({
        email, linkId, plan, event, status,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.status(200).json({ ok: true, skipped: 'usuario no encontrado', email });
    }

    userDoc = snap.docs[0];
  } catch (firestoreErr) {
    functions.logger.error('boldWebhook: error buscando usuario', firestoreErr);
    return res.status(500).send('Error de base de datos');
  }

  const uid      = userDoc.id;
  const userData = userDoc.data();

  // ── Activar plan en Firestore ──────────────────────────────────────
  try {
    await db.collection('usuarios').doc(uid).update({
      plan:            plan,
      planActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
      planSource:      'bold',
      planLinkId:      linkId,
      activo:          true,
      // Si era piloto, mantener rol piloto (no degradar); si era pendiente → cliente
      ...(userData.rol === 'pendiente' ? { rol: 'cliente' } : {}),
    });
    functions.logger.info('boldWebhook: plan activado', { uid, email, plan });
  } catch (updateErr) {
    functions.logger.error('boldWebhook: error actualizando plan', updateErr);
    return res.status(500).send('Error al activar plan');
  }

  // ── Enviar email de bienvenida vía Worker /email ───────────────────
  const planLabel   = PLAN_LABELS[plan] || plan;
  const ipsNombre   = userData.nombre        || '';
  const contactName = userData.nombreContacto || userData.nombre || 'equipo';

  const emailHtml = `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:'Segoe UI',Arial,sans-serif;background:#f0fdfa;margin:0;padding:40px 0;">
<div style="max-width:540px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,121,107,.12);">
  <div style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:40px 40px 32px;text-align:center;">
    <div style="width:48px;height:48px;background:rgba(255,255,255,.2);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#fff;margin-bottom:16px;">N</div>
    <h1 style="color:#fff;font-size:26px;font-weight:800;margin:0;">¡Plan ${planLabel} activado!</h1>
  </div>
  <div style="padding:36px 40px;">
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 20px;">Hola <strong>${contactName}</strong>,</p>
    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 28px;">Tu plan <strong style="color:#0d9488;">NormaLis ${planLabel}</strong>${ipsNombre ? ' para <strong>' + ipsNombre + '</strong>' : ''} fue activado exitosamente. Ya tienes acceso completo a todos los módulos incluidos.</p>
    <div style="text-align:center;margin-bottom:32px;">
      <a href="https://normalis.co/login.html" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#6366f1);color:#fff;padding:14px 36px;border-radius:30px;font-size:16px;font-weight:700;text-decoration:none;">Ingresar a NormaLis →</a>
    </div>
    <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#0f766e;font-size:14px;font-weight:700;margin:0 0 8px;">¿Qué hacer ahora?</p>
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0;">Inicia sesión y lanza tu primera autoevaluación de habilitación. El resultado en tiempo real te mostrará el estado real de cumplimiento de tu IPS.</p>
    </div>
    <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0;">¿Tienes dudas? Responde este correo — revisamos cada mensaje.<br>Equipo NormaLis</p>
  </div>
</div>
</body></html>`;

  try {
    await fetch('https://normalis.fjfc1984.workers.dev/email', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to:      email,
        subject: `¡Tu plan NormaLis ${planLabel} está activo!`,
        html:    emailHtml,
      }),
    });
    functions.logger.info('boldWebhook: email enviado', { email, plan });
  } catch (emailErr) {
    // No fallar el webhook por un error de email
    functions.logger.warn('boldWebhook: email falló (no crítico)', emailErr.message);
  }

  return res.status(200).json({ success: true, uid, plan, email });
});
