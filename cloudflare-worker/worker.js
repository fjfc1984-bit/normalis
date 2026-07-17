/**
 * NormaLis — Gemini Proxy (Cloudflare Worker) v2
 *
 * Sin google_search grounding — usa corpus normativo embebido + Gemini free tier.
 * Compatible con cualquier key de Google AI Studio (free tier, 15 RPM).
 *
 * Deploy:
 *   cd cloudflare-worker
 *   npx wrangler deploy
 *
 * Secret (una sola vez):
 *   npx wrangler secret put GEMINI_API_KEY
 */

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_BASE  = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const ALLOWED_ORIGINS = [
  'https://normalis.co',
  'https://www.normalis.co',
  'https://fjfc1984-bit.github.io',
];

// ═══════════════════════════════════════════════════════════════════════
// CORPUS NORMATIVO VERIFICADO
// Resolución 3100 de 2019 + modificaciones (Res. 544/2023 y 465/2025)
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
PARÁGRAFO: Esta resolución NO establece competencias para el talento humano.

--- ARTÍCULO 2. CAMPO DE APLICACIÓN (modificado por Art. 1, Resolución 544/2023) ---
Aplica a: IPS, profesionales independientes, transporte especial de pacientes, entidades con
objeto social diferente a la prestación de servicios, secretarías de salud departamental o
distrital, entidades responsables del pago, y la Superintendencia Nacional de Salud.

--- ARTÍCULO 3. CONDICIONES DE HABILITACIÓN (modificado por Art. 2, Resolución 544/2023) ---
Los prestadores deben cumplir:
3.1. Capacidad técnico-administrativa.
3.2. Suficiencia patrimonial y financiera.
3.3. Capacidad tecnológica y científica (incluye los 7 estándares del Manual).

--- ARTÍCULO 4. INSCRIPCIÓN Y HABILITACIÓN (modificado por Art. 1, Resolución 465/2025) ---
Todo prestador debe estar inscrito en el REPS con mínimo una sede con infraestructura física
y al menos un servicio habilitado.

--- ARTÍCULO 5. AUTOEVALUACIÓN (modificado por Art. 2, Resolución 465/2025) ---
Obligatoria en:
5.1. Previo a la inscripción inicial.
5.2. Durante el CUARTO AÑO de la vigencia de inscripción inicial.
5.3. Antes del vencimiento del término de RENOVACIÓN ANUAL.
5.4. Casos adicionales del Manual.

--- ARTÍCULO 9. RESPONSABILIDAD ---
El prestador es el ÚNICO RESPONSABLE del cumplimiento de todos los estándares. No puede
delegar la responsabilidad a terceros contratados.

--- ARTÍCULO 10. VIGENCIA DE LA INSCRIPCIÓN EN EL REPS ---
- Inscripción INICIAL: vigencia de CUATRO (4) AÑOS.
- Puede renovarse por UN (1) AÑO si realizó autoevaluación en el cuarto año.
- Renovaciones posteriores: UN (1) AÑO con previa autoevaluación.

--- ARTÍCULO 11. CONSECUENCIAS POR NO AUTOEVALUACIÓN ---
Se INACTIVARÁ la inscripción si no realiza autoevaluación en el término establecido.

--- ARTÍCULO 12. NOVEDADES ---
Los prestadores deben reportar cambios que afecten su inscripción (sede, servicios, capacidad).

--- ARTÍCULO 13. CIERRE TEMPORAL ---
Máximo UN (1) AÑO. Si no reactiva al vencimiento, se cancela la habilitación del servicio.

--- ARTÍCULO 14. VISITA DE VERIFICACIÓN PREVIA ---
Requerida para: servicios oncológicos nuevos, urgencias, atención del parto, transporte
asistencial, TODOS los servicios de ALTA COMPLEJIDAD, y reactivación por medidas de seguridad.

--- ARTÍCULO 15. VISITA DE CERTIFICACIÓN ---
Realizada DESPUÉS de la habilitación conforme al plan de visitas. No es requisito previo.

--- ARTÍCULO 18. EXIGIBILIDAD ---
Las Secretarías NO PUEDEN exigir requisitos distintos a los de esta norma.

--- ARTÍCULO 19. GARANTÍA DE PRESTACIÓN (modificado por Art. 4, Resolución 465/2025) ---
Cuando cierre afecta al único prestador en su zona: plan de reubicación en 5 DÍAS PREVIOS.

--- ARTÍCULO 22. GRATUIDAD ---
La inscripción y habilitación en el REPS son COMPLETAMENTE GRATUITAS.

=== MANUAL DE INSCRIPCIÓN (ANEXO TÉCNICO) — SECCIONES CLAVE ===

--- 7 ESTÁNDARES DE HABILITACIÓN (Sección 8.3.1) ---
Aplican a TODOS los servicios:
8.3.1.1. TALENTO HUMANO
8.3.1.2. INFRAESTRUCTURA
8.3.1.3. DOTACIÓN
8.3.1.4. MEDICAMENTOS, DISPOSITIVOS MÉDICOS E INSUMOS
8.3.1.5. PROCESOS PRIORITARIOS
8.3.1.6. HISTORIA CLÍNICA Y REGISTROS
8.3.1.7. INTERDEPENDENCIA

--- GRUPOS DE SERVICIOS HABILITABLES (Sección 11) ---
11.2. CONSULTA EXTERNA (general, especializada, vacunación, SST)
11.3. APOYO DIAGNÓSTICO (laboratorio, imágenes, farmacia, etc.)
11.4. INTERNACIÓN (hospitalización, UCI, cuidado intensivo, salud mental)
11.5. QUIRÚRGICO (cirugía)
11.6. ATENCIÓN INMEDIATA (urgencias, transporte, parto prehospitalario)

--- MODALIDADES DE PRESTACIÓN (Sección 1.3) ---
1.3.1. Intramural: en infraestructura física de salud.
1.3.2. Extramural: unidad móvil, domiciliaria, jornada de salud.
1.3.3. Telemedicina: interactiva, no interactiva, telexperticia, telemonitoreo.

--- DEFINICIONES CLAVE ---
"CUENTA CON": existencia OBLIGATORIA y PERMANENTE del recurso.
"DISPONIBILIDAD": obligatoria, puede estar fuera del servicio pero accesible de inmediato.
"CRITERIO": unidad básica del estándar para la verificación.

=== RESOLUCIÓN 544 DE 2023 ===
Modificó Art. 2 y 3 de Res. 3100/2019. Amplió campo de aplicación.

=== RESOLUCIÓN 465 DE 2025 (marzo 2025) ===
Modificó Art. 4, 5, 19 y 20 de Res. 3100/2019.
Art. 4: exige sede "con infraestructura física".
Art. 5: restructuró obligatoriedad de autoevaluación.
Art. 19: modificó procedimiento ante cierres por incumplimiento.
`;

function buildSystemPrompt() {
  return `Eres NormaLis IA, asistente especializado en normativa colombiana de habilitación de servicios de salud.

CORPUS NORMATIVO VERIFICADO (texto oficial, verificado julio 2026):
${CORPUS_NORMATIVO}

REGLAS DE RESPUESTA:
1. Cita SIEMPRE el artículo exacto y la resolución.
2. Si la pregunta toca un artículo MODIFICADO, cita la versión VIGENTE.
3. Si la respuesta NO está en el corpus, di: "No encontré información verificada para esta consulta. Verifica en minsalud.gov.co o contacta tu Secretaría de Salud departamental."
4. NUNCA inventes artículos, numerales, fechas, plazos o requisitos.
5. Responde en español colombiano, tono profesional, máximo 5 párrafos.
6. Advierte que la interpretación final la tiene la Secretaría de Salud departamental competente.
7. Para estándares específicos de un servicio, indica que el Manual Técnico tiene los criterios detallados.`;
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

    // Sin tools — compatible con free tier (15 RPM, sin grounding)
    const geminiBody = {
      system_instruction: { parts: [{ text: buildSystemPrompt() }] },
      contents,
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
