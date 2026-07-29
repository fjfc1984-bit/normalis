/**
 * NormaLis — Groq Proxy + RAG (Cloudflare Worker) v4
 *
 * Flujo RAG:
 *   pregunta → embedding (Workers AI bge-m3) → Vectorize → chunks relevantes
 *   → system prompt enriquecido → Groq LLaMA → respuesta con fuentes
 *
 * Secrets requeridos (Workers → Settings → Variables):
 *   GROQ_API_KEY  → https://console.groq.com/keys
 *
 * Bindings requeridos (wrangler.toml):
 *   [ai]          binding = "AI"
 *   [[vectorize]] binding = "VECTORIZE", index_name = "normalis-rag"
 *
 * Setup inicial (una sola vez):
 *   1. wrangler vectorize create normalis-rag --dimensions=768 --metric=cosine
 *   2. python scripts/prepare_rag.py     (procesar PDFs)
 *   3. python scripts/upload_embeddings.py (indexar en Vectorize)
 *   4. wrangler deploy
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

// ═══════════════════════════════════════════════════════════════════════════
// RAG — Retrieval-Augmented Generation
// Enriquece cada pregunta con los fragmentos normativos más relevantes
// antes de llamar a Groq, mejorando precisión y citación de artículos.
// ═══════════════════════════════════════════════════════════════════════════

const RAG_MIN_SCORE = 0.55;  // Similitud coseno mínima (0–1). Ajustar si hay falsos positivos.
const RAG_TOP_K     = 5;     // Fragmentos máximos a recuperar por pregunta.

/**
 * Genera el embedding de la pregunta usando Cloudflare Workers AI.
 * Modelo: @cf/baai/bge-m3 — multilingüe, 768 dims, soporta español.
 */
async function getQueryEmbedding(question, env) {
  const result = await env.AI.run('@cf/baai/bge-m3', {
    text: [question.slice(0, 2000)]  // bge-m3 acepta hasta ~8K tokens
  });
  // Workers AI devuelve { data: [[...768 floats...]] }
  return result.data[0];
}

/**
 * Busca en Vectorize los fragmentos normativos más similares a la pregunta.
 * Devuelve array de { text, source, score }.
 */
async function searchRelevantChunks(embedding, env) {
  const results = await env.VECTORIZE.query(embedding, {
    topK: RAG_TOP_K,
    returnMetadata: 'all'
  });

  return (results.matches || [])
    .filter(m => m.score >= RAG_MIN_SCORE)
    .map(m => ({
      text:   m.metadata?.text   || '',
      source: m.metadata?.source || 'Normativa',
      score:  Math.round(m.score * 100) / 100
    }));
}

/**
 * Construye el bloque de contexto RAG para inyectar en el system prompt.
 * Si no hay fragmentos relevantes, devuelve null y se usa solo el prompt base.
 */
function buildRagContext(chunks) {
  if (!chunks || chunks.length === 0) return null;

  const contextBlocks = chunks
    .map((c, i) => `[Fuente ${i + 1}: ${c.source}]\n${c.text}`)
    .join('\n\n---\n\n');

  return `\n\n════════════════════════════════════════
CONTEXTO NORMATIVO RECUPERADO (fragmentos relevantes para esta consulta):

${contextBlocks}

════════════════════════════════════════
INSTRUCCIÓN: Usa los fragmentos anteriores como fuente principal.
Cita siempre el artículo exacto y la fuente indicada en corchetes.
Si el contexto no cubre la pregunta completamente, indícalo y recomienda
verificar en minsalud.gov.co o con la Secretaría de Salud departamental.`;
}

// ─────────────────────────────────────────────────────────────────────────────

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://normalis.co',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// ─── Rate limiter en memoria (por IP, por Worker isolate) ────────
// Protege la GROQ API key gratuita de abuso.
// Límites: 20 req/minuto por IP, 200 req/hora por IP.
const _rl = new Map(); // ip → { min: {count, ts}, hour: {count, ts} }

function checkRateLimit(ip) {
  const now = Date.now();
  let rec = _rl.get(ip);
  if (!rec) {
    rec = { min: { count: 0, ts: now }, hour: { count: 0, ts: now } };
    _rl.set(ip, rec);
  }
  // Reset ventana por minuto
  if (now - rec.min.ts > 60_000) { rec.min = { count: 0, ts: now }; }
  // Reset ventana por hora
  if (now - rec.hour.ts > 3_600_000) { rec.hour = { count: 0, ts: now }; }

  rec.min.count++;
  rec.hour.count++;

  if (rec.min.count > 20)  return { limited: true, reason: 'Demasiadas solicitudes. Espera 1 minuto.', retry: 60 };
  if (rec.hour.count > 200) return { limited: true, reason: 'Cuota horaria alcanzada. Espera 1 hora.', retry: 3600 };

  // Limpiar entradas antiguas periódicamente (cada 500 IPs)
  if (_rl.size > 500) {
    for (const [k, v] of _rl) {
      if (now - v.hour.ts > 7_200_000) _rl.delete(k);
    }
  }
  return { limited: false };
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

    // ── Rate limiting ────────────────────────────────────────────
    const clientIP = request.headers.get('CF-Connecting-IP') ||
                     request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
                     'unknown';
    const rl = checkRateLimit(clientIP);
    if (rl.limited) {
      return new Response(JSON.stringify({ error: rl.reason }), {
        status: 429,
        headers: {
          ...cors,
          'Content-Type': 'application/json',
          'Retry-After': String(rl.retry),
        },
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

    const { question, sessionHistory, context } = body || {};
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

    // ── Contexto del módulo activo — personaliza el system prompt ──────
    const moduloActivo = context?.modulo    || 'general';
    const ipsNombre    = context?.ips_nombre || '';
    const ipsTipo      = context?.ips_tipo   || '';
    const ipsNit       = context?.nit        || '';

    // Instrucciones específicas por módulo — el LLM sabe exactamente dónde está el usuario
    const MODULO_HINTS = {
      auditoria:     'El usuario está gestionando una AUDITORÍA DE HABILITACIÓN. Orienta tus respuestas a los 7 estándares (talento humano, infraestructura, dotación, medicamentos, procesos, historia clínica, interdependencia) y a los criterios de cumplimiento de la Res. 3100/2019.',
      vencimientos:  'El usuario está en el módulo de VENCIMIENTOS. Prioriza respuestas sobre plazos normativos, fechas límite de renovación (Art. 10 Res. 3100), autoevaluación (Art. 5) y consecuencias por incumplimiento (Art. 11).',
      capa:          'El usuario está trabajando en CORRECCIONES Y ACCIONES PREVENTIVAS (CAPA). Enfócate en PAMEC, planes de mejoramiento, análisis de causa raíz y seguimiento de indicadores de calidad.',
      pamec:         'El usuario está en el módulo PAMEC. Responde sobre el Programa de Auditoría para el Mejoramiento de la Calidad, sus componentes y obligatoriedad.',
      sst:           'El usuario está en SG-SST. Orienta hacia la Resolución 0312/2019, los estándares mínimos y las 3 fases de implementación.',
      indicadores:   'El usuario está revisando INDICADORES DE CALIDAD. Prioriza la Resolución 256/2016, las fichas técnicas de indicadores y su periodicidad de reporte.',
      pqrs:          'El usuario está en el módulo de PQRS. Responde sobre gestión de peticiones, quejas, reclamos y sugerencias en el contexto de la habilitación.',
      incidentes:    'El usuario está registrando INCIDENTES O EVENTOS ADVERSOS. Enfócate en seguridad del paciente, protocolo de Londres y reporte al SIVIGILA.',
      simulacro:     'El usuario está en el módulo de SIMULACROS. Responde sobre planes de emergencia, evacuación y los requisitos de infraestructura de la Res. 3100.',
      bitacora:      'El usuario está en la BITÁCORA DE AUDITORÍA. Enfócate en trazabilidad, registros obligatorios e historia clínica.',
      documentos:    'El usuario está gestionando DOCUMENTOS INSTITUCIONALES. Prioriza requisitos documentales de los 7 estándares y el Manual de Habilitación.',
      multiusuario:  'El usuario está en la gestión del EQUIPO o configuración multi-usuario.',
      dashboard:     'El usuario está en el DASHBOARD general. Puede tener preguntas de cualquier módulo; responde de forma integral.',
      general:       '',
    };

    const moduloHint = MODULO_HINTS[moduloActivo] || '';

    // Construir encabezado de contexto de IPS
    let ipsCtxBlock = '';
    if (ipsNombre || ipsTipo || ipsNit) {
      ipsCtxBlock = `\n\nCONTEXTO DE LA IPS CONSULTANTE:
- Nombre: ${ipsNombre || 'no especificado'}
- Tipo: ${ipsTipo || 'no especificado'}
- NIT: ${ipsNit || 'no especificado'}
${moduloHint ? `- Módulo activo: ${moduloActivo}` : ''}`;
    } else if (moduloHint) {
      ipsCtxBlock = `\n\nCONTEXTO ACTUAL: Módulo "${moduloActivo}".`;
    }

    const moduloInstruccion = moduloHint
      ? `\n\nINSTRUCCIÓN DE CONTEXTO: ${moduloHint}`
      : '';

    // ── RAG: recuperar fragmentos normativos relevantes ─────────────────
    let ragChunks   = [];
    let systemContent = SYSTEM_PROMPT + ipsCtxBlock + moduloInstruccion;

    if (env.VECTORIZE && env.AI) {
      try {
        const embedding = await getQueryEmbedding(question.trim(), env);
        ragChunks       = await searchRelevantChunks(embedding, env);
        const ragCtx    = buildRagContext(ragChunks);
        if (ragCtx) {
          systemContent = systemContent + ragCtx;  // base + contexto IPS + RAG
          console.log(`[RAG] ${ragChunks.length} fragmentos recuperados (scores: ${ragChunks.map(c => c.score).join(', ')}) | módulo: ${moduloActivo}`);
        } else {
          console.log(`[RAG] Sin fragmentos relevantes — módulo: ${moduloActivo}`);
        }
      } catch (ragErr) {
        // Degradación elegante: si RAG falla, continuar sin contexto adicional
        console.warn('[RAG] Fallo en recuperación, continuando sin RAG:', String(ragErr));
      }
    } else {
      console.log('[RAG] Bindings no disponibles (VECTORIZE/AI) — modo sin RAG');
    }

    // ── Construir mensajes en formato OpenAI ────────────────────────────
    const messages = [{ role: 'system', content: systemContent }];

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

      // Devolver fuentes RAG junto con la respuesta (el frontend puede mostrarlas)
      const sources = ragChunks.map(c => ({ source: c.source, score: c.score }));

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

export async function scheduled(event, env, ctx) {
  console.log(`[NormaLis Cron] Heartbeat — ${new Date().toISOString()}`);
}
