/**
 * NormaLis — Gemini Proxy (Cloudflare Worker)
 *
 * Reemplaza la Firebase Function geminiProxy.
 * Deploy gratuito en Cloudflare Workers (100k requests/día sin costo).
 *
 * SETUP (una sola vez):
 *   1. Ir a https://workers.cloudflare.com/ → crear cuenta gratuita
 *   2. Workers & Pages → Create application → Create Worker
 *   3. Pegar este código completo en el editor
 *   4. Settings → Variables → Add variable (tipo Secret):
 *      Name: GEMINI_API_KEY   Value: tu clave de https://aistudio.google.com/app/apikey
 *   5. Deploy → copiar la URL (ej: https://normalis-proxy.TU-USUARIO.workers.dev)
 *   6. En normalis-chat.js cambiar GEMINI_PROXY_URL a esa URL
 */

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_BASE  = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const ALLOWED_ORIGINS = [
  'https://normalis.co',
  'https://www.normalis.co',
  'https://fjfc1984-bit.github.io',
];

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

--- ARTÍCULO 2. CAMPO DE APLICACIÓN (modificado por Art. 1, Resolución 544/2023) ---
Aplica a IPS, profesionales independientes, transporte especial, entidades con objeto diferente
a salud, Secretarías de Salud, entidades responsables del pago, y Superintendencia Nacional de Salud.

--- ARTÍCULO 3. CONDICIONES DE HABILITACIÓN ---
3.1. Capacidad técnico-administrativa.
3.2. Suficiencia patrimonial y financiera.
3.3. Capacidad tecnológica y científica (incluye los 7 estándares del Manual).

--- ARTÍCULO 4. INSCRIPCIÓN Y HABILITACIÓN (modificado Res. 465/2025) ---
Todo prestador debe inscribirse en el REPS con al menos una sede con infraestructura física
y un servicio habilitado.

--- ARTÍCULO 5. AUTOEVALUACIÓN (modificado Res. 465/2025) ---
Obligatoria: previa a inscripción inicial, durante el 4to año de vigencia, antes de renovación anual.

--- ARTÍCULO 9. RESPONSABILIDAD ---
El prestador es el ÚNICO RESPONSABLE del cumplimiento de todos los estándares. No se delega a terceros.

--- ARTÍCULO 10. VIGENCIA ---
Inscripción inicial: 4 AÑOS. Renovaciones: 1 AÑO, previa autoevaluación.

--- ARTÍCULO 11. INACTIVACIÓN ---
Se inactivará la inscripción si no realiza autoevaluación en el término establecido.

--- ARTÍCULO 13. CIERRE TEMPORAL ---
Máximo 1 AÑO. Si vence sin reactivación, se cancela la habilitación.

--- ARTÍCULO 14. VISITA PREVIA ---
Requerida para: oncología, urgencias, atención del parto, transporte asistencial,
TODOS los servicios de ALTA COMPLEJIDAD.

--- ARTÍCULO 22. GRATUIDAD ---
La inscripción y habilitación en el REPS son COMPLETAMENTE GRATUITAS.

--- 7 ESTÁNDARES DE HABILITACIÓN ---
1. TALENTO HUMANO  2. INFRAESTRUCTURA  3. DOTACIÓN
4. MEDICAMENTOS E INSUMOS  5. PROCESOS PRIORITARIOS
6. HISTORIA CLÍNICA  7. INTERDEPENDENCIA

=== RESOLUCIÓN 544 DE 2023 ===
Modificó Art. 2 y 3 de la Res. 3100/2019.

=== RESOLUCIÓN 465 DE 2025 ===
Modificó Art. 4, 5, 19 y 20 de la Res. 3100/2019.
`;

function buildSystemPrompt() {
  return `Eres NormaLis IA, asistente especializado en normativa colombiana de habilitación de servicios de salud.

INSTRUCCIÓN PRINCIPAL:
Tienes acceso al texto VERIFICADO de los artículos de la Resolución 3100/2019 y sus modificaciones.
Úsalo como PRIMERA fuente de verdad. Luego usa Google Search para complementar con fuentes oficiales.

CORPUS NORMATIVO VERIFICADO (julio 2026):
${CORPUS_NORMATIVO}

REGLAS:
1. Cita SIEMPRE el artículo exacto y la resolución.
2. Para artículos modificados (Art. 4,5 por Res.465/2025; Art.2,3 por Res.544/2023), cita la versión VIGENTE.
3. Si no encuentras información verificada: "No encontré información verificada. Verifica en minsalud.gov.co."
4. NUNCA inventes artículos, numerales, fechas o requisitos.
5. Responde en español colombiano, tono profesional, máximo 5 párrafos.
6. Advierte que la interpretación final la tiene la Secretaría de Salud competente.`;
}

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://normalis.co',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
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

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Servicio no configurado' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const contents = [];
    if (Array.isArray(sessionHistory)) {
      for (const turn of sessionHistory.slice(-6)) {
        if (turn.role && turn.text) {
          contents.push({ role: turn.role, parts: [{ text: turn.text }] });
        }
      }
    }
    contents.push({ role: 'user', parts: [{ text: question.trim() }] });

    const geminiBody = {
      system_instruction: { parts: [{ text: buildSystemPrompt() }] },
      contents,
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    };

    try {
      const geminiRes = await fetch(`${GEMINI_BASE}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        return new Response(
          JSON.stringify({ error: 'Error al consultar Gemini', status: geminiRes.status, detail: errText }),
          { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }

      const data = await geminiRes.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
      if (!text) {
        return new Response(JSON.stringify({ error: 'Respuesta vacía de Gemini' }), {
          status: 502,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const chunks  = data?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources = chunks
        .filter(c => c?.web?.uri)
        .map(c => ({ uri: c.web.uri, title: c.web.title ?? c.web.uri }))
        .slice(0, 4);

      return new Response(JSON.stringify({ answer: text, sources }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: 'Error interno del proxy', detail: String(err) }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  },
};
