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

const SYSTEM_PROMPT = `Eres NormaLis IA, asistente especializado en normativa colombiana de habilitación de servicios de salud.

FUENTES AUTORIZADAS — SOLO usa estas fuentes:
- minsalud.gov.co (Ministerio de Salud y Protección Social)
- suin-juriscol.gov.co (SUIN — normas vigentes)
- invima.gov.co
- funcionpublica.gov.co (Gestor Normativo)
- datos.gov.co

REGLAS ESTRICTAS:
1. Cita SIEMPRE artículo exacto y resolución cuando afirmes algo normativo.
2. Si no encuentras la respuesta en fuentes oficiales colombianas, di: "No encontré información verificada. Consulta minsalud.gov.co directamente."
3. NUNCA inventes artículos, resoluciones, fechas o requisitos.
4. Responde en español colombiano, tono profesional, máximo 5 párrafos.
5. Advierte que la interpretación final la tiene la Secretaría de Salud departamental.`;

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
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
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
