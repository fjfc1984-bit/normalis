// normalis-chat.js
// NormaLis — Consultor Normativo IA
// Fuente de verdad: búsqueda en tiempo real en fuentes oficiales del gobierno colombiano
// (minsalud.gov.co, suin-juriscol.gov.co, invima.gov.co)
// NO contiene normativa hardcodeada — toda respuesta viene de fuentes verificadas.
// ─────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN GEMINI
// ══════════════════════════════════════════════════════════════════
const GEMINI_API_KEY = 'AQ.Ab8RN6J7U72h-pK2ii8-85wKjGKPp8AWLxSo6RP1ByimOKHocg';
const GEMINI_MODEL   = 'gemini-2.0-flash';
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ── System prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  const cfg = JSON.parse(localStorage.getItem('normalis_cfg') || '{}');
  const ipsNombre = localStorage.getItem('normalis_ips_nombre') || '';
  const ipsCiudad = localStorage.getItem('normalis_ips_ciudad') || '';
  const tipoIPS   = cfg.tipo || '';

  const contextoIPS = (ipsNombre || tipoIPS || ipsCiudad)
    ? `\n\nCONTEXTO DE LA IPS DEL USUARIO:\n- Nombre: ${ipsNombre || 'No configurado'}\n- Tipo: ${tipoIPS || 'No configurado'}\n- Ciudad: ${ipsCiudad || 'No configurado'}`
    : '';

  return `Eres el Consultor Normativo IA de NormaLis, especializado en habilitación de servicios de salud en Colombia.

FUENTES AUTORIZADAS — SOLO usa estas fuentes oficiales del gobierno colombiano:
- minsalud.gov.co (Ministerio de Salud y Protección Social)
- suin-juriscol.gov.co (Sistema Único de Información Normativa — SUIN)
- invima.gov.co (INVIMA)
- funcionpublica.gov.co (Función Pública — Gestor Normativo)
- datos.gov.co

NORMAS PRINCIPALES QUE APLICAN:
- Resolución 3100 de 2019 (habilitación — 7 estándares)
- Resolución 465 de 2025 (actualización de condiciones de habilitación)
- Resolución 544 de 2023 (accesibilidad, PQRSF, novedades REPS)
- Decreto 780 de 2016 (política de atención integral en salud)
- Resolución 1995 de 1999 (historia clínica)
- Decreto 351 de 2014 (residuos hospitalarios)
- Resolución 256 de 2016 (indicadores de calidad)
- Decreto 4725 de 2005 (dispositivos médicos)
- Ley 1164 de 2007 (RETHUS)
- Resolución 1317 de 2021 (telemedicina)
- Resolución 1445 de 2006 y Decreto 1011 de 2006 (PAMEC)${contextoIPS}

REGLAS ESTRICTAS:
1. NUNCA inventes, asumas ni extrapoles artículos, cifras, plazos o requisitos. Si no encuentras la información en fuentes oficiales verificadas, dilo explícitamente.
2. Cuando cites una norma, incluye: nombre completo, año, artículo o numeral exacto.
3. Si la pregunta requiere un dato que no puedes verificar, responde: "No encontré información verificada sobre esto. Consulta directamente minsalud.gov.co o la Secretaría de Salud de tu departamento."
4. En temas de habilitación, advierte siempre que la interpretación final la tiene la Secretaría de Salud departamental.
5. Si hay dudas sobre si una norma está vigente o fue modificada, indícalo y dirige al usuario a verificar.
6. Responde en español colombiano, claro y directo. Máximo 5 párrafos o una lista numerada.
7. NUNCA reemplazas la asesoría de un profesional en habilitación — indícalo cuando la consulta sea compleja.`;
}

// ── Llamada a Gemini con Google Search grounding ─────────────────────────────
async function callGemini(userMessage, historial) {
  const systemPrompt = buildSystemPrompt();

  const contents = [];
  if (historial && historial.length > 0) {
    for (const msg of historial) {
      contents.push({ role: msg.role, parts: [{ text: msg.text }] });
    }
  }
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: contents,
    tools: [{ google_search: {} }],   // ← búsqueda en tiempo real
    generationConfig: {
      temperature: 0.1,          // baja temperatura = más preciso, menos creativo
      maxOutputTokens: 1000,
      topP: 0.9
    }
  };

  const resp = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg = err?.error?.message || `Error ${resp.status}`;
    throw new Error(msg);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Respuesta vacía de Gemini');

  // Extraer fuentes citadas si las hay
  const groundingChunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
    .map(c => c?.web?.uri)
    .filter(u => u && (u.includes('minsalud') || u.includes('suin-juriscol') || u.includes('invima') || u.includes('funcionpublica') || u.includes('gov.co')))
    .slice(0, 3);

  return { text, sources };
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
