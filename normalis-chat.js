// normalis-chat.js
// NormaLis — Consultor Normativo IA
// Proxy: Cloudflare Worker → Groq LLM (llama-3.1-8b-instant)
// La API key NUNCA llega al browser.
// ─────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════
// ENDPOINT — Cloudflare Worker (normalis.fjfc1984.workers.dev)
// ══════════════════════════════════════════════════════════════════
const NORMALIS_AI_URL    = 'https://normalis.fjfc1984.workers.dev';
const GEMINI_PROXY_URL   = NORMALIS_AI_URL; // alias legacy — no borrar

const AI_TIMEOUT_MS      = 25000; // 25s — Groq es rápido, si pasa es fallo
const AI_RETRY_DELAY_MS  = 1500;  // retry tras 1.5s en error de red

// ── Detectar módulo activo en la app ─────────────────────────────
// La app usa .sb-item.active[data-mod] (sidebar de normativa-app-v2.html).
// nav() también escribe window._moduloActual para lectura directa.
function detectarModuloActivo() {
  try {
    // 1. Variable global — escrita por nav() en normalis-main.js
    if (window._moduloActual) return window._moduloActual;

    // 2. Sidebar: .sb-item.active con data-mod
    const sbActivo = document.querySelector('.sb-item.active[data-mod]');
    if (sbActivo && sbActivo.dataset.mod) return sbActivo.dataset.mod;

    // 3. Fallback genérico (otros posibles selectores)
    const genActivo =
      document.querySelector('.tab-btn.active[data-modulo]') ||
      document.querySelector('[data-modulo].active');
    if (genActivo && genActivo.dataset.modulo) return genActivo.dataset.modulo;

    return 'general';
  } catch { return 'general'; }
}

// ── Contexto de la IPS (adjuntado a cada pregunta) ───────────────
function buildIPSContext() {
  try {
    const cfg      = JSON.parse(localStorage.getItem('normalis_cfg') || '{}');
    const nombre   = localStorage.getItem('normalis_ips_nombre') || '';
    const ciudad   = localStorage.getItem('normalis_ips_ciudad') || '';
    const tipo     = cfg.tipo || '';
    if (!nombre && !tipo && !ciudad) return '';
    return `\n[IPS: "${nombre}" | tipo: ${tipo || 'no especificado'} | ciudad: ${ciudad || 'no especificada'}]`;
  } catch { return ''; }
}

// ── Objeto de contexto completo para el Worker ────────────────────
function buildContextPayload() {
  try {
    const cfg = JSON.parse(localStorage.getItem('normalis_cfg') || '{}');
    return {
      modulo:     detectarModuloActivo(),
      uid:        sessionStorage.getItem('normalis_uid')    || '',
      nit:        cfg.nit                                   || '',
      ips_nombre: localStorage.getItem('normalis_ips_nombre') || '',
      ips_ciudad: localStorage.getItem('normalis_ips_ciudad') || '',
      ips_tipo:   cfg.tipo                                  || '',
    };
  } catch { return { modulo: 'general' }; }
}

// ── Llamada al Worker con timeout + 1 retry ───────────────────────
async function callNormalisAI(userMessage, historial, attempt) {
  attempt = attempt || 1;

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const resp = await fetch(NORMALIS_AI_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal:  controller.signal,
      body: JSON.stringify({
        question:       userMessage + buildIPSContext(),
        sessionHistory: (historial || []).slice(-10).map(m => ({
          role: m.role,
          text: m.text
        })),
        context: buildContextPayload()   // módulo activo + datos IPS
      })
    });

    clearTimeout(tid);

    // 5xx → retry una vez
    if (resp.status >= 500 && attempt === 1) {
      console.warn('[NormaLis AI] Error 5xx — reintentando en', AI_RETRY_DELAY_MS, 'ms');
      await new Promise(r => setTimeout(r, AI_RETRY_DELAY_MS));
      return callNormalisAI(userMessage, historial, 2);
    }

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error || `Error del servidor (${resp.status})`);
    }

    const data = await resp.json();
    if (!data.answer) throw new Error('El servicio no devolvió respuesta');

    // fuentes: el Worker retorna sources[] con URLs oficiales
    const sources = (data.sources || [])
      .map(s => (typeof s === 'string' ? s : s?.uri || ''))
      .filter(u => u && (u.includes('gov.co') || u.includes('minsalud')))
      .slice(0, 3);

    // acciones: botones sugeridos por el LLM (sugerirAccion tool)
    const ACCIONES_VALIDAS = ['navegar', 'crearCAPA', 'crearVencimiento', 'crearIndicador'];
    const acciones = (Array.isArray(data.acciones) ? data.acciones : [])
      .filter(a => a && a.texto && ACCIONES_VALIDAS.includes(a.accion))
      .slice(0, 3);

    return { text: data.answer, sources, acciones };

  } catch (err) {
    clearTimeout(tid);

    // Error de red o timeout → retry una vez
    if (attempt === 1 && (err.name === 'AbortError' || err.name === 'TypeError' || err.message === 'Failed to fetch')) {
      console.warn('[NormaLis AI] Error de red — reintentando...', err.message);
      await new Promise(r => setTimeout(r, AI_RETRY_DELAY_MS));
      return callNormalisAI(userMessage, historial, 2);
    }

    throw err;
  }
}

// Alias legacy para compatibilidad (sendMainChat y sendFloat llaman callGemini)
const callGemini = callNormalisAI;

// ── Fallback cuando el servicio no responde ───────────────────────
function fallbackResponse(errMsg) {
  const isConfig = errMsg && errMsg.toLowerCase().includes('configurado');
  return {
    text: isConfig
      ? '⚙️ El servicio de IA no está configurado aún. El administrador debe desplegar el Worker con la API key de Groq.\n\nMientras tanto, consulta directamente en:\n• **minsalud.gov.co** → Normatividad\n• **suin-juriscol.gov.co** → Normas\n• **habilitacion.sispro.gov.co** → REPS'
      : '🔌 No se pudo conectar al servicio de IA. Revisa tu conexión a internet.\n\nPara consultas urgentes visita:\n• **minsalud.gov.co** → Normatividad\n• **suin-juriscol.gov.co** → búsqueda de normas\n• **funcionpublica.gov.co** → Gestor Normativo\n\nO contacta la Secretaría de Salud de tu departamento.',
    sources: [],
    acciones: [],
  };
}

// ── Ejecutar acción sugerida por el LLM ───────────────────────────
// Llamada cuando el usuario hace clic en un botón de acción del chat.
// Las acciones llaman funciones globales definidas en normalis-main.js.
function nlEjecutarAccion(accion, modulo) {
  try {
    switch (accion) {
      case 'navegar':
        if (typeof nav === 'function' && modulo) {
          nav(modulo);
          // Cerrar el chat flotante si estaba abierto
          const floatPanel = document.getElementById('float-chat-panel');
          if (floatPanel && !floatPanel.classList.contains('hidden')) {
            floatPanel.classList.add('hidden');
          }
        }
        break;
      case 'crearCAPA':
        if (typeof nav === 'function') nav('capa');
        break;
      case 'crearVencimiento':
        if (typeof nav === 'function') nav('vencimientos');
        break;
      case 'crearIndicador':
        if (typeof nav === 'function') nav('indicadores');
        break;
    }
  } catch (e) {
    console.warn('[NormaLis Actions]', e);
  }
}
// Exponer globalmente para los data-onclick de los botones de acción
window.nlEjecutarAccion = nlEjecutarAccion;

// Delegated listener: captura clics en botones .nl-action-btn generados dinámicamente
document.addEventListener('click', function(e) {
  const btn = e.target.closest('.nl-action-btn');
  if (!btn) return;
  const accion = btn.dataset.accion || '';
  const modulo = btn.dataset.modulo || '';
  nlEjecutarAccion(accion, modulo);
});

// ── Renderizar respuesta con markdown básico + fuentes + acciones ─
function renderBotResponse(el, { text, sources, acciones }) {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:12px">$1</code>');

  if (sources && sources.length > 0) {
    // Sanitizar URLs: solo https:// hacia dominios gov.co / minsalud para prevenir javascript: / data: XSS
    const safeUrls = sources.filter(function(u) {
      return typeof u === 'string' && /^https:\/\/[a-z0-9._-]+(\.gov\.co|minsalud|sispro|suin-juriscol|funcionpublica)\b/i.test(u);
    });
    if (safeUrls.length > 0) {
      html += '<br><br><small style="color:#6b7280;font-size:11px">&#128206; Fuentes oficiales:<br>' +
        safeUrls.map(function(u) {
          const safeHref = u.replace(/"/g, '%22').replace(/'/g, '%27').replace(/</g, '%3C').replace(/>/g, '%3E');
          const display  = u.replace(/https?:\/\//, '').split('/')[0];
          return '<a href="' + safeHref + '" target="_blank" rel="noopener noreferrer" style="color:#0d9488">' + display + '</a>';
        }).join(' &middot; ') +
        '</small>';
    }
  }

  // Botones de acción sugeridos por el LLM (Paso D)
  if (acciones && acciones.length > 0) {
    const ACCIONES_VALIDAS = ['navegar', 'crearCAPA', 'crearVencimiento', 'crearIndicador'];
    const botonesHtml = acciones
      .filter(function(a) { return a.texto && ACCIONES_VALIDAS.includes(a.accion); })
      .slice(0, 3)
      .map(function(a) {
        // Sanitizar: solo caracteres alfanuméricos/guión para accion y modulo
        const safeTexto  = String(a.texto).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').slice(0, 50);
        const safeAccion = String(a.accion).replace(/[^a-zA-Z]/g, '');
        const safeModulo = String(a.modulo || '').replace(/[^a-zA-Z0-9_-]/g, '');
        return '<button class="nl-action-btn" data-accion="' + safeAccion + '" data-modulo="' + safeModulo + '" ' +
          'style="background:#0d9488;color:#fff;border:none;padding:7px 14px;border-radius:6px;' +
          'cursor:pointer;font-size:13px;font-weight:500;margin-top:2px;transition:opacity .15s" ' +
          'onmouseover="this.style.opacity=\'0.85\'" onmouseout="this.style.opacity=\'1\'">' +
          '&#9654; ' + safeTexto + '</button>';
      }).join('');
    if (botonesHtml) {
      html += '<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px">' + botonesHtml + '</div>';
    }
  }

  // Aviso legal IA — Circular SIC 002/2024 · AI Act EU 2024/1689
  html += '<div style="margin-top:10px;padding:7px 10px;background:#fef3c7;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;font-size:11px;color:#92400e">&#9888; <strong>Contenido generado por Inteligencia Artificial.</strong> No reemplaza asesor&iacute;a jur&iacute;dica profesional. Verifique con un experto antes de tomar decisiones oficiales. &middot; <a href="/politica-privacidad.html" style="color:#92400e" target="_blank">Pol&iacute;tica de privacidad</a></div>';
  el.innerHTML = html;
}

// ── Historial de conversación ─────────────────────────────────────
let mainChatHistory = [];
let floatHistory    = [];

// ── Chat principal ────────────────────────────────────────────────
function initMainChat() {
  mainChatHistory = [];
  addMainMsg(
    'Hola. Soy **NormaLis IA**, tu consultor de normativa colombiana de habilitación en salud.\n\n' +
    'Respondo preguntas sobre la **Res. 1732/2026** (vigente desde agosto 2026) y la **Res. 3100/2019** ' +
    '(que actualiza con sus modificaciones Res. 544/2023 y 465/2025). Cuando cito un requisito, te digo ' +
    'qué decía la Res. 3100/2019 **y** cómo lo recoge la Res. 1732/2026.\n\n' +
    'También cubro PAMEC, REPS y habilitación de servicios.\n\n' +
    '&#9888; Si no encuentro informaci&oacute;n verificada, lo digo &mdash; nunca invento art&iacute;culos ni plazos.\n\n' +
    '¿Cuál es tu consulta?',
    'bot'
  );
}

function addMainMsg(text, type) {
  const box = document.getElementById('main-chat-msgs');
  if (!box) return null;
  const d = document.createElement('div');
  d.className = `msg ${type === 'bot' ? 'bot' : 'user-msg'}`;
  if (type === 'bot') {
    // Sanitizar primero para prevenir XSS, luego aplicar markdown básico
    const safe = String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    d.innerHTML = safe
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  } else {
    d.textContent = text;
  }
  box.appendChild(d);
  box.scrollTop = box.scrollHeight;
  return d;
}

async function sendMainChat() {
  const inp = document.getElementById('main-chat-input');
  if (!inp) return;
  const val = inp.value.trim();
  if (!val) return;

  try { window.NL && window.NL.trackChat(); } catch(_) {}
  addMainMsg(val, 'user');
  inp.value    = '';
  inp.disabled = true;

  const typingEl = addMainMsg('⏳ Consultando fuentes oficiales...', 'bot');

  try {
    const result = await callNormalisAI(val, mainChatHistory);
    mainChatHistory.push({ role: 'user',  text: val });
    mainChatHistory.push({ role: 'model', text: result.text });
    if (mainChatHistory.length > 20) mainChatHistory = mainChatHistory.slice(-20);
    if (typingEl) renderBotResponse(typingEl, result);
  } catch (err) {
    console.warn('[NormaLis AI] Error final:', err.message);
    if (typingEl) renderBotResponse(typingEl, fallbackResponse(err.message));
  } finally {
    inp.disabled = false;
    inp.focus();
    const box = document.getElementById('main-chat-msgs');
    if (box) box.scrollTop = box.scrollHeight;
  }
}

function sendChatQ(el) {
  const inp = document.getElementById('main-chat-input');
  if (inp) { inp.value = el.textContent; sendMainChat(); }
}

// ── Chat flotante ──────────────────────────────────────────────────
let floatOpen = false;

function toggleFloat() {
  floatOpen = !floatOpen;
  document.getElementById('fcp').classList.toggle('open', floatOpen);
}

async function sendFloat() {
  const inp = document.getElementById('fcp-input');
  if (!inp) return;
  const val = inp.value.trim();
  if (!val) return;

  const box = document.getElementById('fcp-msgs');
  const u = document.createElement('div');
  u.className  = 'fcp-msg usr';
  u.textContent = val;
  box.appendChild(u);
  inp.value    = '';
  inp.disabled = true;

  const b = document.createElement('div');
  b.className  = 'fcp-msg bot';
  b.textContent = '⏳ Consultando...';
  box.appendChild(b);
  box.scrollTop = 9999;

  try {
    const result = await callNormalisAI(val, floatHistory);
    floatHistory.push({ role: 'user',  text: val });
    floatHistory.push({ role: 'model', text: result.text });
    if (floatHistory.length > 10) floatHistory = floatHistory.slice(-10);
    renderBotResponse(b, result);
  } catch (err) {
    renderBotResponse(b, fallbackResponse(err.message));
  } finally {
    inp.disabled = false;
    inp.focus();
    box.scrollTop = 9999;
  }
}

// ── Stubs para compatibilidad con llamadas externas ───────────────
function getAnswer(q) {
  return 'Consulta en proceso. Usa el chat para obtener respuestas verificadas.';
}
const normAnswers = {};

// END:normalis-chat.js — NormaLis integrity seal
