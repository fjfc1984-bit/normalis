/**
 * NormaLis — Groq Proxy + RAG + Firestore Context + Function Calling (v6)
 *
 * NUEVO en v6 — Paso C: Function Calling (Tools) con LLaMA 3.1
 *   El LLM decide de forma autónoma cuándo consultar datos reales de Firestore.
 *   Si la pregunta lo requiere, Groq devuelve una "tool_call" → el Worker
 *   ejecuta la función → envía el resultado de vuelta → el LLM genera la
 *   respuesta final con datos reales integrados.
 *
 *   Herramientas disponibles:
 *     consultarVencimientos  — vencimientos próximos de la IPS
 *     consultarCAPAs         — CAPAs abiertas de la IPS
 *     consultarIndicadores   — indicadores de calidad registrados
 *
 * FIX v5 → v6: bug de Temporal Dead Zone (TDZ) en systemContent
 *   v5 usaba systemContent antes de declararlo con `let` → ReferenceError
 *   cuando los secrets de Firebase estaban configurados.
 *
 * Degradación elegante:
 *   Sin FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY → sin tools → igual que v4.
 *   Sin VECTORIZE / AI bindings → sin RAG → igual que v3.
 */

import { fetchIPSContext, formatIPSContextForLLM, firestoreQuery } from './firestore-admin.js';

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
6. Advierte que la interpretación final la tiene la Secretaría de Salud departamental competente.
7. Cuando uses datos reales de la IPS (vencimientos, CAPAs, indicadores), menciona que los obtuviste de su registro en NormaLis.`;

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN CALLING — Herramientas disponibles para el LLM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Definición de herramientas en formato OpenAI/Groq.
 * LLaMA 3.1 soporta tool use nativo con este formato.
 * El LLM decide automáticamente cuándo llamar cada herramienta.
 */
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'consultarVencimientos',
      description: 'Consulta los vencimientos (documentos, certificaciones, permisos) próximos a vencer de la IPS activa. '
        + 'Úsala cuando el usuario pregunte: qué está por vencer, cuándo vence X, alertas de vencimiento, '
        + 'fechas límite pendientes, o cualquier pregunta sobre plazos de documentos de su IPS.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultarCAPAs',
      description: 'Consulta las Correcciones y Acciones Preventivas (CAPAs) abiertas de la IPS activa. '
        + 'Úsala cuando el usuario pregunte: qué acciones correctivas hay pendientes, planes de mejoramiento abiertos, '
        + 'no conformidades sin resolver, o cualquier pregunta sobre el plan de mejora de su IPS.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultarIndicadores',
      description: 'Consulta los indicadores de calidad registrados por la IPS activa (Res. 256/2016 / PAMEC). '
        + 'Úsala cuando el usuario pregunte: cómo van mis indicadores, cuáles indicadores tengo registrados, '
        + 'resultados vs metas, o cualquier pregunta sobre métricas de calidad de su IPS.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

/**
 * Ejecuta una herramienta solicitada por el LLM.
 * Retorna siempre un string (resultado o mensaje de error) para enviarlo
 * de vuelta al LLM en el mensaje role: 'tool'.
 *
 * @param {string} toolName   — nombre de la herramienta
 * @param {string} uid        — Firebase UID del usuario
 * @param {object} env        — Worker env bindings
 * @returns {Promise<string>} — resultado legible por el LLM
 */
async function ejecutarTool(toolName, uid, env) {
  if (!uid) return 'No se pudo identificar al usuario. Pide al usuario que recargue la página.';

  try {
    switch (toolName) {

      case 'consultarVencimientos': {
        const docs = await firestoreQuery('vencimientos', 'uid', uid, env, 20);
        if (!docs || docs.length === 0) {
          return 'No se encontraron vencimientos registrados en NormaLis para esta IPS.';
        }
        const hoy = Date.now();
        const items = docs
          .map(d => {
            const fecha = d.fecha ? new Date(d.fecha) : null;
            const diasRest = fecha ? Math.ceil((fecha - hoy) / 86_400_000) : null;
            const estado   = diasRest === null ? 'sin fecha' :
                             diasRest < 0      ? 'VENCIDO' :
                             diasRest <= 30    ? `vence en ${diasRest} días (URGENTE)` :
                             diasRest <= 90    ? `vence en ${diasRest} días (próximo)` :
                             `vence en ${diasRest} días`;
            return `- ${d.nombre || d.documento || 'Sin nombre'}: ${estado}${d.estado ? \` [${d.estado}]\` : ''}`;
          })
          .join('\n');
        return `Vencimientos registrados en NormaLis:\n${items}`;
      }

      case 'consultarCAPAs': {
        const docs = await firestoreQuery('capas', 'uid', uid, env, 20);
        if (!docs || docs.length === 0) {
          return 'No se encontraron CAPAs registradas en NormaLis para esta IPS.';
        }
        const abiertas = docs.filter(d =>
          !d.estado || d.estado === 'abierta' || d.estado === 'en_progreso' || d.estado === 'pendiente'
        );
        if (abiertas.length === 0) return 'No hay CAPAs abiertas. Todas han sido cerradas.';
        const items = abiertas
          .map(d => {
            const limite = d.fecha_limite ? new Date(d.fecha_limite).toLocaleDateString('es-CO') : 'sin fecha';
            return `- [${d.estado || 'abierta'}] ${d.titulo || d.descripcion || 'Sin título'} | Responsable: ${d.responsable || 'no asignado'} | Límite: ${limite}`;
          })
          .join('\n');
        return `CAPAs abiertas (${abiertas.length}):\n${items}`;
      }

      case 'consultarIndicadores': {
        const docs = await firestoreQuery('indicadores', 'uid', uid, env, 20);
        if (!docs || docs.length === 0) {
          return 'No se encontraron indicadores registrados en NormaLis para esta IPS.';
        }
        const items = docs
          .map(d => {
            const cumple = d.resultado !== undefined && d.meta !== undefined
              ? (Number(d.resultado) >= Number(d.meta) ? 'CUMPLE' : 'NO CUMPLE')
              : '';
            return `- ${d.nombre || 'Sin nombre'}: Meta=${d.meta ?? 'N/A'}, Resultado=${d.resultado ?? 'pendiente'}, Periodo=${d.periodo || 'N/A'} ${cumple ? '[' + cumple + ']' : ''}`;
          })
          .join('\n');
        return `Indicadores de calidad (${docs.length}):\n${items}`;
      }

      default:
        return `Herramienta "${toolName}" no reconocida.`;
    }
  } catch (err) {
    console.warn(`[Tool] Error en ${toolName}:`, String(err).slice(0, 150));
    return `No fue posible consultar ${toolName} en este momento. Intenta de nuevo o revisa el módulo correspondiente en NormaLis.`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RAG — Retrieval-Augmented Generation
// ═══════════════════════════════════════════════════════════════════════════

const RAG_MIN_SCORE = 0.55;
const RAG_TOP_K     = 5;

async function getQueryEmbedding(question, env) {
  const result = await env.AI.run('@cf/baai/bge-m3', {
    text: [question.slice(0, 2000)],
  });
  return result.data[0];
}

async function searchRelevantChunks(embedding, env) {
  const results = await env.VECTORIZE.query(embedding, {
    topK: RAG_TOP_K,
    returnMetadata: 'all',
  });
  return (results.matches || [])
    .filter(m => m.score >= RAG_MIN_SCORE)
    .map(m => ({
      text:   m.metadata?.text   || '',
      source: m.metadata?.source || 'Normativa',
      score:  Math.round(m.score * 100) / 100,
    }));
}

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
const _rl = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  let rec = _rl.get(ip);
  if (!rec) {
    rec = { min: { count: 0, ts: now }, hour: { count: 0, ts: now } };
    _rl.set(ip, rec);
  }
  if (now - rec.min.ts  >    60_000) { rec.min  = { count: 0, ts: now }; }
  if (now - rec.hour.ts > 3_600_000) { rec.hour = { count: 0, ts: now }; }
  rec.min.count++;
  rec.hour.count++;
  if (rec.min.count  >  20) return { limited: true, reason: 'Demasiadas solicitudes. Espera 1 minuto.',  retry: 60 };
  if (rec.hour.count > 200) return { limited: true, reason: 'Cuota horaria alcanzada. Espera 1 hora.', retry: 3600 };
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
    const cors   = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405, headers: { ...cors, 'Content-Type': 'application/json' },
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
        headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': String(rl.retry) },
      });
    }

    let body;
    try { body = await request.json(); }
    catch {
      return new Response(JSON.stringify({ error: 'JSON inválido' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { question, sessionHistory, context } = body || {};
    if (!question || typeof question !== 'string' || !question.trim()) {
      return new Response(JSON.stringify({ error: 'Campo "question" requerido' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (question.length > 2000) {
      return new Response(JSON.stringify({ error: 'Pregunta demasiado larga (máx 2000 caracteres)' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Servicio no configurado' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // ── Contexto de la IPS y módulo activo ───────────────────────
    const moduloActivo = context?.modulo    || 'general';
    const ipsNombre    = context?.ips_nombre || '';
    const ipsTipo      = context?.ips_tipo   || '';
    const ipsNit       = context?.nit        || '';
    const clientUID    = context?.uid        || '';

    const MODULO_HINTS = {
      auditoria:    'El usuario está gestionando una AUDITORÍA DE HABILITACIÓN. Orienta tus respuestas a los 7 estándares (talento humano, infraestructura, dotación, medicamentos, procesos, historia clínica, interdependencia) y a los criterios de cumplimiento de la Res. 3100/2019.',
      vencimientos: 'El usuario está en el módulo de VENCIMIENTOS. Prioriza respuestas sobre plazos normativos, fechas límite de renovación (Art. 10 Res. 3100), autoevaluación (Art. 5) y consecuencias por incumplimiento (Art. 11). Si el usuario pregunta qué tiene por vencer, usa la herramienta consultarVencimientos.',
      capa:         'El usuario está trabajando en CORRECCIONES Y ACCIONES PREVENTIVAS (CAPA). Enfócate en PAMEC, planes de mejoramiento, análisis de causa raíz y seguimiento de indicadores de calidad. Si el usuario pregunta por sus CAPAs abiertas, usa la herramienta consultarCAPAs.',
      pamec:        'El usuario está en el módulo PAMEC. Responde sobre el Programa de Auditoría para el Mejoramiento de la Calidad, sus componentes y obligatoriedad.',
      sst:          'El usuario está en SG-SST. Orienta hacia la Resolución 0312/2019, los estándares mínimos y las 3 fases de implementación.',
      indicadores:  'El usuario está revisando INDICADORES DE CALIDAD. Prioriza la Resolución 256/2016, las fichas técnicas de indicadores y su periodicidad de reporte. Si el usuario pregunta por sus indicadores registrados, usa la herramienta consultarIndicadores.',
      pqrs:         'El usuario está en el módulo de PQRS. Responde sobre gestión de peticiones, quejas, reclamos y sugerencias en el contexto de la habilitación.',
      incidentes:   'El usuario está registrando INCIDENTES O EVENTOS ADVERSOS. Enfócate en seguridad del paciente, protocolo de Londres y reporte al SIVIGILA.',
      simulacro:    'El usuario está en el módulo de SIMULACROS. Responde sobre planes de emergencia, evacuación y los requisitos de infraestructura de la Res. 3100.',
      bitacora:     'El usuario está en la BITÁCORA DE AUDITORÍA. Enfócate en trazabilidad, registros obligatorios e historia clínica.',
      documentos:   'El usuario está gestionando DOCUMENTOS INSTITUCIONALES. Prioriza requisitos documentales de los 7 estándares y el Manual de Habilitación.',
      multiusuario: 'El usuario está en la gestión del EQUIPO o configuración multi-usuario.',
      dashboard:    'El usuario está en el DASHBOARD general. Puede tener preguntas de cualquier módulo; responde de forma integral.',
      general:      '',
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

    // ── DECLARAR systemContent AQUÍ (fix TDZ bug de v5) ─────────────────
    // Ahora la declaración está ANTES de cualquier uso.
    let systemContent = SYSTEM_PROMPT + ipsCtxBlock + moduloInstruccion;

    // ── RAG: recuperar fragmentos normativos relevantes ──────────────────
    let ragChunks = [];
    if (env.VECTORIZE && env.AI) {
      try {
        const embedding = await getQueryEmbedding(question.trim(), env);
        ragChunks       = await searchRelevantChunks(embedding, env);
        const ragCtx    = buildRagContext(ragChunks);
        if (ragCtx) {
          systemContent += ragCtx;
          console.log(`[RAG] ${ragChunks.length} fragmentos | módulo: ${moduloActivo}`);
        }
      } catch (ragErr) {
        console.warn('[RAG] Fallo, continuando sin RAG:', String(ragErr).slice(0, 80));
      }
    }

    // ── Construir mensajes en formato OpenAI ─────────────────────────────
    const messages = [{ role: 'system', content: systemContent }];
    if (Array.isArray(sessionHistory)) {
      for (const turn of sessionHistory.slice(-6)) {
        if (turn.role && turn.text) {
          messages.push({ role: turn.role === 'model' ? 'assistant' : 'user', content: turn.text });
        }
      }
    }
    messages.push({ role: 'user', content: question.trim() });

    // ── Determinar si usar Function Calling ─────────────────────────────
    // Solo si los secrets de Firebase están configurados.
    // Sin secrets → comportamiento igual que v4 (sin tools).
    const useTools = !!(env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY && clientUID);

    try {
      // ── LLAMADA 1: con o sin tools ───────────────────────────────────
      const firstBody = {
        model:       GROQ_MODEL,
        messages,
        temperature: 0.1,
        max_tokens:  1024,
      };
      if (useTools) {
        firstBody.tools       = TOOLS;
        firstBody.tool_choice = 'auto';  // el LLM decide si usar alguna herramienta
      }

      const firstRes = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(firstBody),
      });

      if (!firstRes.ok) {
        const errText = await firstRes.text();
        return new Response(
          JSON.stringify({ error: 'Error al consultar Groq', status: firstRes.status, detail: errText }),
          { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }

      const firstData   = await firstRes.json();
      const firstChoice = firstData?.choices?.[0];

      // ── LOOP DE HERRAMIENTAS ────────────────────────────────────────
      // Si el LLM pidió usar una herramienta, la ejecutamos y volvemos a llamar.
      // Limitamos a 1 ronda de tool calls para evitar loops infinitos.
      let finalText = null;
      const toolsUsed = [];

      if (useTools && firstChoice?.finish_reason === 'tool_calls') {
        const toolCalls = firstChoice.message?.tool_calls || [];
        console.log(`[Tools] LLM solicitó ${toolCalls.length} herramienta(s): ${toolCalls.map(t => t.function?.name).join(', ')}`);

        // Agregar la respuesta del asistente (con las tool_calls) al historial
        messages.push(firstChoice.message);

        // Ejecutar cada herramienta y agregar su resultado
        for (const tc of toolCalls) {
          const toolName   = tc.function?.name || '';
          const toolResult = await ejecutarTool(toolName, clientUID, env);
          toolsUsed.push(toolName);

          console.log(`[Tools] ${toolName} → ${toolResult.slice(0, 80)}...`);

          messages.push({
            role:         'tool',
            tool_call_id: tc.id,
            content:      toolResult,
          });
        }

        // ── LLAMADA 2: el LLM genera la respuesta final con los datos ──
        const secondRes = await fetch(GROQ_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model:       GROQ_MODEL,
            messages,
            temperature: 0.1,
            max_tokens:  1024,
          }),
        });

        if (!secondRes.ok) {
          const errText = await secondRes.text();
          return new Response(
            JSON.stringify({ error: 'Error en llamada secundaria a Groq', status: secondRes.status, detail: errText }),
            { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
          );
        }

        const secondData = await secondRes.json();
        finalText = secondData?.choices?.[0]?.message?.content ?? null;

      } else {
        // El LLM respondió directamente sin herramientas
        finalText = firstChoice?.message?.content ?? null;
      }

      if (!finalText) {
        return new Response(JSON.stringify({ error: 'Respuesta vacía de Groq' }), {
          status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      // Devolver respuesta + fuentes RAG + herramientas usadas
      const sources = ragChunks.map(c => ({ source: c.source, score: c.score }));
      return new Response(JSON.stringify({ answer: finalText, sources, toolsUsed }), {
        status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: 'Error interno del proxy', detail: String(err) }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  },
};

export async function scheduled(event, env, ctx) {
  console.log(`[NormaLis Cron] Heartbeat — ${new Date().toISOString()}`);
}
