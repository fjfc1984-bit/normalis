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
