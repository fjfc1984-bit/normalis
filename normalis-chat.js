// normalis-chat.js
// NormaLis — Consultor Normativo IA
// Toda respuesta pasa por el proxy Firebase Function — la API key NUNCA llega al browser.
// Proxy URL: https://us-central1-normalis-5587d.cloudfunctions.net/geminiProxy
// ─────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════
// PROXY — Cloudflare Worker (reemplaza Firebase Function — sin costo)
// Actualiza esta URL con tu Worker URL después del deploy en Cloudflare.
// ══════════════════════════════════════════════════════════════════
const GEMINI_PROXY_URL = 'https://normalis.fjfc1984.workers.dev';

// ── Contexto de la IPS (enviado al proxy como parte de la pregunta) ───────────
function buildIPSContext() {
  const cfg = JSON.parse(localStorage.getItem('normalis_cfg') || '{}');
  const ipsNombre = localStorage.getItem('normalis_ips_nombre') || '';
  const ipsCiudad = localStorage.getItem('normalis_ips_ciudad') || '';
  const tipoIPS   = cfg.tipo || '';

  if (!ipsNombre && !tipoIPS && !ipsCiudad) return '';
  return `\n[Contexto IPS: nombre="${ipsNombre}", tipo="${tipoIPS}", ciudad="${ipsCiudad}"]`;
}

// ── Llamada al proxy Firebase Function ──────────────────────────────────────
async function callGemini(userMessage, historial) {
  const questionWithCtx = userMessage + buildIPSContext();

  const resp = await fetch(GEMINI_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: questionWithCtx,
      sessionHistory: (historial || []).map(m => ({ role: m.role, text: m.text }))
    })
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || `Error ${resp.status}`);
  }

  const data = await resp.json();
  if (!data.answer) throw new Error('Respuesta vacía del proxy');

  const sources = (data.sources || [])
    .map(s => s.uri)
    .filter(u => u && u.includes('gov.co'))
    .slice(0, 3);

  return { text: data.answer, sources };
}

// ── Fallback mínimo — NO contiene normativa, solo orienta al usuario ──────────
function fallbackResponse(q) {
  return {
    text: 'En este momento no puedo conectarme al servicio de IA para verificar la información en fuentes oficiales. Para obtener información precisa sobre esta consulta, visita directamente:\n\n• **minsalud.gov.co** → Normatividad\n• **suin-juriscol.gov.co** → búsqueda de normas\n• **funcionpublica.gov.co** → Gestor Normativo\n\nO contacta la Secretaría de Salud de tu departamento.',
    sources: []
  };
}

// ── Renderizar respuesta con fuentes ─────────────────────────────────────────
function renderBotResponse(el, {text, sources}) {
  let html = text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\n/g,'<br>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>');

  if (sources && sources.length > 0) {
    html += '<br><br><small style="color:#6b7280;font-size:11px">📎 Fuentes oficiales consultadas:<br>' +
      sources.map(u => `<a href="${u}" target="_blank" rel="noopener" style="color:#06b6d4">${u.replace(/https?:\/\//, '').split('/')[0]}</a>`).join(' · ') +
      '</small>';
  }
  el.innerHTML = html;
}

// ── Historial de conversación ────────────────────────────────────────────────
let mainChatHistory = [];
let floatHistory    = [];

// ── Chat principal ────────────────────────────────────────────────────────────
function initMainChat() {
  mainChatHistory = [];
  addMainMsg(
    'Hola. Soy el Consultor Normativo IA de NormaLis.\n\n' +
    'Respondo preguntas sobre habilitación de servicios de salud en Colombia. ' +
    'Todas mis respuestas se verifican en tiempo real contra fuentes oficiales del gobierno (minsalud.gov.co, suin-juriscol.gov.co).\n\n' +
    '⚠️ Si no encuentro información verificada, lo digo explícitamente — nunca invento normativa.\n\n' +
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
    d.innerHTML = text.replace(/\n/g,'<br>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
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

  addMainMsg(val, 'user');
  inp.value = '';
  inp.disabled = true;

  const typingEl = addMainMsg('⏳ Verificando en fuentes oficiales...', 'bot');

  try {
    const result = await callGemini(val, mainChatHistory);
    mainChatHistory.push({ role: 'user',  text: val });
    mainChatHistory.push({ role: 'model', text: result.text });
    if (mainChatHistory.length > 20) mainChatHistory = mainChatHistory.slice(-20);
    if (typingEl) renderBotResponse(typingEl, result);
  } catch (err) {
    console.warn('Gemini error:', err.message);
    const fallback = fallbackResponse(val);
    if (typingEl) renderBotResponse(typingEl, fallback);
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

// ── Chat flotante ─────────────────────────────────────────────────────────────
let floatOpen = false;

function toggleFloat() {
  floatOpen = !floatOpen;
  document.getElementById('fcp').classList.toggle('open', floatOpen);
}

async function sendFloat() {
  const inp = document.getElementById('fcp-input');
  const val = inp.value.trim();
  if (!val) return;

  const box = document.getElementById('fcp-msgs');
  const u = document.createElement('div');
  u.className = 'fcp-msg usr';
  u.textContent = val;
  box.appendChild(u);
  inp.value = '';

  const b = document.createElement('div');
  b.className = 'fcp-msg bot';
  b.textContent = '⏳ Verificando...';
  box.appendChild(b);
  box.scrollTop = 9999;

  try {
    const result = await callGemini(val, floatHistory);
    floatHistory.push({ role: 'user',  text: val });
    floatHistory.push({ role: 'model', text: result.text });
    if (floatHistory.length > 10) floatHistory = floatHistory.slice(-10);
    renderBotResponse(b, result);
  } catch (err) {
    renderBotResponse(b, fallbackResponse(val));
  }
  box.scrollTop = 9999;
}

// getAnswer se mantiene para compatibilidad con llamadas externas
function getAnswer(q) {
  return 'Consulta en proceso. Usa el chat para obtener respuestas verificadas.';
}

// normAnswers eliminado — ya no existe normativa hardcodeada en este módulo.
// Toda respuesta viene de Gemini + Google Search sobre fuentes oficiales.
const normAnswers = {};

// END:normalis-chat.js — NormaLis integrity seal
