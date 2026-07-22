/**
 * NormaLis — Groq Proxy (Cloudflare Worker) v3
 *
 * Usa Groq free tier: 14,400 req/día, sin tarjeta de crédito.
 * Modelo: llama-3.1-8b-instant (rápido y preciso para consultas normativas)
 *
 * Secret requerido (Cloudflare Dashboard → Workers → normalis → Settings → Variables):
 *   GROQ_API_KEY  → crear en https://console.groq.com/keys
 *
 * SETUP (una sola vez):
 *   1. Ir a Cloudflare Dashboard → Workers & Pages → normalis → Edit code
 *   2. Pegar este código completo en el editor
 *   3. Settings → Variables → Add variable (tipo Secret):
 *      Name: GROQ_API_KEY   Value: tu clave de https://console.groq.com/keys
 *   4. Deploy
 */

const GROQ_MODEL    = 'llama-3.1-8b-instant';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const ALLOWED_ORIGINS = [
  'https://normalis.co',
  'https://www.normalis.co',
  'https://fjfc1984-bit.github.io',
];

const SYSTEM_PROMPT = `Eres NormaLis IA, asistente especializado en normativa colombiana de habilitación de servicios de salud.

CORPUS NORMATIVO VERIFICADO (julio 2026):

=== RESOLUCIÓN 3100 DE 2019 — MINISTERIO DE SALUD Y PROTECCIÓN SOCIAL ===
MODIFICADA POR: Resolución 544 de 2023 (Art. 2 y 3), Resolución 465 de 2025 (Art. 4, 5, 19 y 20).

ARTÍCULO 1. OBJETO: Definir los procedimientos y condiciones de inscripción de prestadores de servicios de salud y de habilitación de los servicios de salud (Anexo Técnico).

ARTÍCULO 2. CAMPO DE APLICACIÓN (modificado Res. 544/2023): Aplica a: IPS, profesionales independientes, transporte especial, entidades con objeto social diferente, secretarías de salud, entidades responsables del pago, Supersalud.

ARTÍCULO 3. CONDICIONES DE HABILITACIÓN (modificado Res. 544/2023):
3.1. Capacidad técnico-administrativa.
3.2. Suficiencia patrimonial y financiera.
3.3. Capacidad tecnológica y científica (incluye los 7 estándares del Manual).

ARTÍCULO 4. INSCRIPCIÓN Y HABILITACIÓN (modificado Res. 465/2025): Todo prestador debe estar inscrito en REPS con mínimo una sede con infraestructura física y al menos un servicio habilitado.

ARTÍCULO 5. AUTOEVALUACIÓN (modificado Res. 465/2025):
Obligatoria: 5.1. Previa a inscripción inicial. 5.2. Durante el CUARTO AÑO de vigencia. 5.3. Antes del vencimiento de renovación anual. 5.4. Casos adicionales del Manual.

ARTÍCULO 9. RESPONSABILIDAD: El prestador es el ÚNICO RESPONSABLE. No puede delegar a terceros contratados.

ARTÍCULO 10. VIGENCIA DE LA INSCRIPCIÓN: Inicial: CUATRO (4) AÑOS. Renovación: UN (1) AÑO con autoevaluación previa.

ARTÍCULO 11. CONSECUENCIAS POR NO AUTOEVALUACIÓN: Se INACTIVARÁ la inscripción si no realiza autoevaluación en el término establecido.

ARTÍCULO 13. CIERRE TEMPORAL: Máximo UN (1) AÑO.

ARTÍCULO 14. VISITA DE VERIFICACIÓN PREVIA: Requerida para servicios oncológicos, urgencias, atención del parto, transporte asistencial, TODOS los servicios de ALTA COMPLEJIDAD, reactivación por medidas de seguridad.

ARTÍCULO 22. GRATUIDAD: La inscripción y habilitación en REPS son COMPLETAMENTE GRATUITAS.

7 ESTÁNDARES DE HABILITACIÓN:
1. TALENTO HUMANO  2. INFRAESTRUCTURA  3. DOTACIÓN
4. MEDICAMENTOS, DISPOSITIVOS MÉDICOS E INSUMOS  5. PROCESOS PRIORITARIOS
6. HISTORIA CLÍNICA Y REGISTROS  7. INTERDEPENDENCIA

DEFINICIONES:
"CUENTA CON": existencia OBLIGATORIA y PERMANENTE.
"DISPONIBILIDAD": obligatoria, puede estar fuera del servicio pero accesible de inmediato.

=== RESOLUCIÓN 465 DE 2025 ===
Modifica artículos 4, 5, 19 y 20 de la Res. 3100/2019.
Actualiza procedimientos de inscripción y autoevaluación en el REPS.

=== PAMEC (Programa de Auditoría para el Mejoramiento de la Calidad) ===
Obligatorio para todas las IPS habilitadas.
Componentes: autoevaluación, planes de mejoramiento, seguimiento de indicadores.

REGLAS DE RESPUESTA:
1. Cita SIEMPRE el artículo exacto y la resolución.
2. Si el artículo fue MODIFICADO, cita la versión VIGENTE.
3. Si no está en el corpus, di: "No encontré información verificada. Verifica en minsalud.gov.co o contacta tu Secretaría de Salud."
4. NUNCA inventes artículos, fechas, plazos o requisitos.
5. Responde en español colombiano, tono profesional, máximo 5 párrafos.
6. Advierte que la interpretación final la tiene la Secretaría de Salud departamental competente.`;

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

    const apiKey = env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Servicio no configurado' }), {
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
      const groqRes = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: 0.1,
          max_tokens: 1024,
        }),
      });

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        return new Response(
          JSON.stringify({ error: 'Error al consultar Groq', status: groqRes.status, detail: errText }),
          { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }

      const data = await groqRes.json();
      const text = data?.choices?.[0]?.message?.content ?? null;
      if (!text) {
        return new Response(JSON.stringify({ error: 'Respuesta vacía de Groq' }), {
          status: 502,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ answer: text, sources: [] }), {
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

export async function scheduled(event, env, ctx) {
  console.log(`[NormaLis Cron] Heartbeat — ${new Date().toISOString()}`);
}
