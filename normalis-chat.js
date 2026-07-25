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
        }))
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

    // fuentes: el Worker actualmente retorna [] pero puede crecer
    const sources = (data.sources || [])
      .map(s => (typeof s === 'string' ? s : s?.uri || ''))
      .filter(u => u && (u.includes('gov.co') || u.includes('minsalud')))
      .slice(0, 3);

    return { text: data.answer, sources };

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
    sources: []
  };
}

// ── Renderizar respuesta con markdown básico + fuentes ────────────
function renderBotResponse(el, { text, sources }) {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:12px">$1</code>');

  if (sources && sources.length > 0) {
    html += '<br><br><small style="color:#6b7280;font-size:11px">📎 Fuentes oficiales:<br>' +
      sources.map(u =>
        `<a href="${u}" target="_blank" rel="noopener noreferrer" style="color:#0d9488">${u.replace(/https?:\/\//, '').split('/')[0]}</a>`
      ).join(' · ') +
      '</small>';
  }
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
    'Respondo preguntas sobre la **Res. 3100/2019**, sus modificaciones (Res. 544/2023 y 465/2025), ' +
    'PAMEC, REPS y habilitación de servicios.\n\n' +
    '⚠️ Si no encuentro información verificada, lo digo — nunca invento artículos ni plazos.\n\n' +
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
    d.innerHTML = text
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
