// normalis-tour.js — Tour interactivo de onboarding para NormaLis
// Se activa automáticamente en el primer ingreso.
// Para re-activar manualmente: startNormalisTour()

(function() {
'use strict';

const TOUR_KEY = 'normalis_tour_done';
const TOUR_VERSION = '3';  // v3 — tour completo con todos los módulos

// ── Pasos del tour ──────────────────────────────────────────────────────────
const TOUR_STEPS = [
  // ── Bienvenida ──
  {
    target: null,
    title: '👋 Bienvenido a NormaLis',
    body: 'Tu plataforma de habilitación médica bajo la <strong>Res. 3100/2019</strong>. En 2 minutos conocerás todos los módulos. Puedes saltar el tour o repetirlo desde el botón <strong>❓ Tour</strong>.',
    position: 'center'
  },

  // ── PRINCIPAL ──
  {
    target: '.sb-item[data-mod="dashboard"]',
    title: '📊 Dashboard',
    body: '<strong>Tu panel de control.</strong> Estado de habilitación en tiempo real, alertas de vencimientos, accesos rápidos y días restantes para la visita de la Secretaría.',
    position: 'right'
  },
  {
    target: '.sb-item[data-mod="establecimiento"]',
    title: '🏥 Mi Establecimiento',
    body: '<strong>Configura primero aquí.</strong> Nombre de la IPS, NIT, servicios habilitados, responsable. Esta información se usa automáticamente en todos los documentos generados.',
    position: 'right'
  },
  {
    target: '.sb-item[data-mod="cronograma"]',
    title: '🗓️ Cronograma de Visita',
    body: 'Registra la fecha de la visita de la Secretaría. El sistema calcula <strong>cuántos días quedan</strong> y ajusta la prioridad de tus tareas automáticamente.',
    position: 'right'
  },

  // ── HABILITACIÓN ──
  {
    target: null,
    title: '🔍 Módulos de Habilitación',
    body: 'Los 4 módulos siguientes son el núcleo de NormaLis: <strong>auditoría simulada, resultados, generación IA y biblioteca</strong>. Úsalos en ese orden.',
    position: 'center'
  },
  {
    target: '.sb-item[data-mod="auditoria"]',
    title: '🔍 Auditoría Simulada',
    body: '⭐ <strong>El módulo más importante.</strong> 559 criterios de la Res. 3100/2019. Detecta incumplimientos antes de que llegue la Secretaría. Filtra por servicio habilitado.',
    position: 'right'
  },
  {
    target: '.sb-item[data-mod="resultados"]',
    title: '📈 Resultados',
    body: 'Después de auditar, aquí ves el <strong>puntaje de cumplimiento</strong> por estándar, los hallazgos priorizados por riesgo y el plan de mejora automático.',
    position: 'right'
  },
  {
    target: '.sb-item[data-mod="generador"]',
    title: '✨ Generar con IA',
    body: '80+ <strong>documentos normativos generados por IA</strong> con los datos de tu IPS: protocolos, manuales, formatos PAMEC. Descarga en PDF o Word listo para firmar.',
    position: 'right'
  },
  {
    target: '.sb-item[data-mod="documentos"]',
    title: '📁 Biblioteca Documental',
    body: 'Todos los documentos generados, organizados por categoría. <strong>Control de versiones</strong>, indicadores de vigencia y descarga individual o por lote.',
    position: 'right'
  },

  // ── CUMPLIMIENTO ──
  {
    target: null,
    title: '📋 Módulos de Cumplimiento',
    body: 'Gestión continua de calidad: <strong>PAMEC, SG-SST, Plan CAPA, Indicadores, PQRS e Incidentes</strong>. Obligatorios por ley.',
    position: 'center'
  },
  {
    target: '.sb-item[data-mod="pamec"]',
    title: '🔄 PAMEC',
    body: '<strong>Obligatorio para toda IPS.</strong> Ciclo PHVA de mejoramiento continuo. Alimenta el PAMEC con los hallazgos de tu auditoría. Genera el informe anual para la Secretaría.',
    position: 'right'
  },
  {
    target: '.sb-item[data-mod="sst"]',
    title: '🛡️ SG-SST',
    body: '<strong>Res. 0312/2019.</strong> Estándares mínimos según el tamaño de tu IPS. Accidentes, inspecciones, indicadores de ausentismo y rendición de cuentas anual.',
    position: 'right'
  },
  {
    target: '.sb-item[data-mod="capa"]',
    title: '✅ Plan de Mejoramiento',
    body: '<strong>Gestión CAPA.</strong> Acciones correctivas y preventivas para cada hallazgo. Responsable, fecha límite, seguimiento y cierre con evidencia.',
    position: 'right'
  },
  {
    target: '.sb-item[data-mod="indicadores"]',
    title: '📊 Indicadores Res. 256',
    body: '<strong>30+ indicadores obligatorios</strong> de la Res. 256/2016. Registro mensual, tendencias y comparativa con estándares nacionales.',
    position: 'right'
  },
  {
    target: '.sb-item[data-mod="pqrs"]',
    title: '📬 Gestor PQRS',
    body: 'Ciclo completo de <strong>Peticiones, Quejas, Reclamos y Sugerencias</strong>. Tiempos de respuesta legales con alertas de vencimiento.',
    position: 'right'
  },
  {
    target: '.sb-item[data-mod="incidentes"]',
    title: '⚠️ Incidentes y Eventos',
    body: '<strong>Eventos adversos y near miss.</strong> Análisis de causa raíz, plan de acción y estadísticas de seguridad del paciente.',
    position: 'right'
  },

  // ── EQUIPO ──
  {
    target: null,
    title: '👥 Módulos de Equipo',
    body: 'Gestión del <strong>Talento Humano</strong>: carpetas digitales, verificación RETHUS y control de vencimientos de documentos del personal.',
    position: 'center'
  },
  {
    target: '.sb-item[data-mod="talento"]',
    title: '👨‍⚕️ Talento Humano',
    body: '<strong>Estándar 1 — Res. 3100.</strong> Carpeta digital por profesional: título, RETHUS, contrato, vacunas, bioseguridad. Verificación directa en el Ministerio de Salud.',
    position: 'right'
  },
  {
    target: '.sb-item[data-mod="equipo"]',
    title: '👥 Equipo IPS',
    body: 'Perfiles de usuario de NormaLis con <strong>control de acceso por rol</strong>. Director, coordinador, auxiliar y auditor — cada uno con sus permisos.',
    position: 'right'
  },
  {
    target: '.sb-item[data-mod="vencimientos-personal"]',
    title: '📅 Vencimientos Personal',
    body: '<strong>Semáforo de documentos.</strong> Vista centralizada de todo lo que está por vencer: rojo (vencido), naranja (próximo), verde (vigente). Revísalo cada semana.',
    position: 'right'
  },

  // ── IA ──
  {
    target: '.sb-item[data-mod="chat"]',
    title: '💬 Consultor Normativo IA',
    body: 'Pregunta en lenguaje natural sobre <strong>normativa colombiana de salud</strong>. Responde con base en Res. 3100/2019, 465/2025 y normas concordantes. Disponible 24/7.',
    position: 'right'
  },

  // ── AVANZADO ──
  {
    target: null,
    title: '⚙️ Módulos Avanzados',
    body: 'Herramientas especializadas: <strong>comparador normativo, ROI, consentimientos, simulacro, firma digital y bitácora</strong>. Despliega "Avanzado" en el menú lateral.',
    position: 'center'
  },
  {
    target: '.sb-item[data-mod="comparador"]',
    title: '⚖️ Comparador Normativo',
    body: 'Diferencias <strong>artículo por artículo</strong> entre la Res. 3100/2019 y la 465/2025. Identifica criterios nuevos, modificados o eliminados antes de tu próxima auditoría.',
    position: 'right'
  },
  {
    target: '.sb-item[data-mod="simulacro"]',
    title: '🎯 Simulacro Secretaría',
    body: '<strong>Practica la visita real.</strong> Mismos formularios y secuencia que usa el funcionario. Hazlo 30 días antes de la visita oficial.',
    position: 'right'
  },
  {
    target: '.sb-item[data-mod="consentimientos"]',
    title: '📄 Consentimientos Informados',
    body: 'Genera <strong>consentimientos válidos por procedimiento</strong> con todos los elementos obligatorios: riesgos, beneficios, alternativas. PDF para firma.',
    position: 'right'
  },
  {
    target: '.sb-item[data-mod="firma"]',
    title: '✍️ Firma y Versiones',
    body: '<strong>Trazabilidad documental.</strong> Control de versiones, firmas de aprobación e historial de cambios por documento.',
    position: 'right'
  },
  {
    target: '.sb-item[data-mod="roi"]',
    title: '💰 Calculadora ROI',
    body: 'Demuestra en números el valor del cumplimiento: <strong>multas evitadas, glosas reducidas, ingresos por nuevos servicios</strong>. Reporte para la gerencia.',
    position: 'right'
  },
  {
    target: '.sb-item[data-mod="bitacora"]',
    title: '🕰️ Bitácora',
    body: '<strong>Historial de todas las acciones.</strong> Quién hizo qué y cuándo. Evidencia de gestión para auditorías externas.',
    position: 'right'
  },

  // ── Guía ──
  {
    target: null,
    title: '📖 Guía Interactiva',
    body: 'Hay una <strong>Guía Interactiva completa</strong> con descripción detallada, funciones, consejos y referencia normativa de cada módulo. Accede desde el botón <strong>📖 Guía completa</strong> en la esquina inferior izquierda.',
    position: 'center'
  },

  // ── Fin ──
  {
    target: null,
    title: '🎉 ¡Listo para habilitarte!',
    body: '1️⃣ <strong>Mi Establecimiento</strong> → Configura tu IPS.<br>2️⃣ <strong>Auditoría Simulada</strong> → Identifica brechas.<br>3️⃣ <strong>Generar con IA</strong> → Crea los documentos faltantes.<br><br>Repite el tour desde <strong>❓ Tour</strong> en la esquina inferior derecha.',
    position: 'center'
  }
];

// ── Estilos ──────────────────────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('normalis-tour-styles')) return;
  const s = document.createElement('style');
  s.id = 'normalis-tour-styles';
  s.textContent = `
    #nl-tour-overlay {
      position: fixed; inset: 0; z-index: 99990;
      background: rgba(0,0,0,0); pointer-events: none;
      transition: background 0.3s;
    }
    #nl-tour-overlay.active { background: rgba(0,0,0,0.6); pointer-events: all; }

    #nl-tour-spotlight {
      position: fixed; z-index: 99991;
      border-radius: 10px;
      box-shadow: 0 0 0 9999px rgba(0,0,0,0.6);
      transition: all 0.35s cubic-bezier(.4,0,.2,1);
      pointer-events: none;
      outline: 3px solid #06b6d4;
      outline-offset: 2px;
    }

    #nl-tour-tooltip {
      position: fixed; z-index: 99999;
      background: #141e30;
      border: 1px solid rgba(6,182,212,0.3);
      border-radius: 16px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(6,182,212,0.1);
      padding: 22px 24px 18px;
      max-width: 360px; min-width: 290px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transition: all 0.3s cubic-bezier(.4,0,.2,1);
    }
    #nl-tour-tooltip .nl-tour-badge {
      font-size: 11px; font-weight: 700; letter-spacing: .06em;
      color: #06b6d4; text-transform: uppercase; margin-bottom: 8px;
      display: flex; align-items: center; justify-content: space-between;
    }
    #nl-tour-tooltip h3 {
      margin: 0 0 9px; font-size: 16px; font-weight: 800; color: #f1f5f9; line-height: 1.3;
    }
    #nl-tour-tooltip p {
      margin: 0 0 16px; font-size: 13.5px; color: #94a3b8; line-height: 1.65;
    }
    #nl-tour-tooltip p strong { color: #e2e8f0; }
    #nl-tour-tooltip p a { color: #22d3ee; }
    #nl-tour-tooltip .nl-tour-footer {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
    }
    #nl-tour-tooltip .nl-tour-dots {
      display: flex; gap: 4px; align-items: center; flex-wrap: wrap; max-width: 120px;
    }
    #nl-tour-tooltip .nl-dot {
      width: 5px; height: 5px; border-radius: 50%;
      background: rgba(255,255,255,0.12); transition: all 0.2s; flex-shrink: 0;
    }
    #nl-tour-tooltip .nl-dot.active { background: #06b6d4; width: 14px; border-radius: 3px; }
    #nl-tour-tooltip .nl-dot.done { background: rgba(6,182,212,0.35); }
    #nl-tour-tooltip .nl-tour-btns { display: flex; gap: 7px; }
    #nl-tour-tooltip .nl-btn {
      padding: 8px 14px; border-radius: 9px; font-size: 13px;
      font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; white-space: nowrap;
    }
    #nl-tour-tooltip .nl-btn-skip { background: rgba(255,255,255,0.06); color: #64748b; }
    #nl-tour-tooltip .nl-btn-skip:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
    #nl-tour-tooltip .nl-btn-prev { background: rgba(255,255,255,0.06); color: #94a3b8; }
    #nl-tour-tooltip .nl-btn-prev:hover { color: #e2e8f0; }
    #nl-tour-tooltip .nl-btn-next { background: #06b6d4; color: #fff; }
    #nl-tour-tooltip .nl-btn-next:hover { background: #0891b2; }
    #nl-tour-tooltip .nl-btn-finish { background: linear-gradient(135deg, #10b981, #059669); color: #fff; }
    #nl-tour-tooltip .nl-btn-finish:hover { opacity: 0.9; }

    #nl-tour-restart-btn {
      position: fixed; bottom: 20px; right: 20px; z-index: 9999;
      background: #06b6d4; color: #fff; border: none; border-radius: 50px;
      padding: 10px 18px; font-size: 13px; font-weight: 600;
      cursor: pointer; box-shadow: 0 4px 20px rgba(6,182,212,0.4);
      display: flex; align-items: center; gap: 6px; transition: all 0.2s;
    }
    #nl-tour-restart-btn:hover { background: #0891b2; transform: translateY(-2px); }

    #nl-tour-guide-link {
      position: fixed; bottom: 20px; left: 20px; z-index: 9999;
      background: rgba(20,30,48,0.95); color: #06b6d4;
      border: 1px solid rgba(6,182,212,0.3); border-radius: 50px;
      padding: 9px 16px; font-size: 12px; font-weight: 600;
      cursor: pointer; text-decoration: none;
      display: flex; align-items: center; gap: 6px;
      transition: all 0.2s; backdrop-filter: blur(8px);
    }
    #nl-tour-guide-link:hover { border-color: #06b6d4; background: rgba(6,182,212,0.1); }
  `;
  document.head.appendChild(s);
}

// ── Estado ──────────────────────────────────────────────────────────────────
let currentStep = 0;
let tourActive = false;
let overlay, spotlight, tooltip;

// ── DOM ──────────────────────────────────────────────────────────────────────
function createDOM() {
  if (document.getElementById('nl-tour-overlay')) return;
  overlay = document.createElement('div');
  overlay.id = 'nl-tour-overlay';
  overlay.addEventListener('click', function(e) { if (e.target === overlay) skipTour(); });
  spotlight = document.createElement('div');
  spotlight.id = 'nl-tour-spotlight';
  spotlight.style.display = 'none';
  tooltip = document.createElement('div');
  tooltip.id = 'nl-tour-tooltip';
  tooltip.style.display = 'none';
  document.body.appendChild(overlay);
  document.body.appendChild(spotlight);
  document.body.appendChild(tooltip);
}

// ── Posicionar tooltip ───────────────────────────────────────────────────────
function positionTooltip(targetEl, position) {
  const tt = tooltip;
  tt.style.display = 'block';

  if (position === 'center' || !targetEl) {
    tt.style.top = '50%'; tt.style.left = '50%';
    tt.style.transform = 'translate(-50%, -50%)'; tt.style.right = 'auto';
    spotlight.style.display = 'none';
    return;
  }

  tt.style.transform = '';
  const rect = targetEl.getBoundingClientRect();
  const ttW = 360, ttH = tt.offsetHeight || 200, pad = 16;

  spotlight.style.display = 'block';
  spotlight.style.top    = (rect.top  - 5) + 'px';
  spotlight.style.left   = (rect.left - 5) + 'px';
  spotlight.style.width  = (rect.width  + 10) + 'px';
  spotlight.style.height = (rect.height + 10) + 'px';

  if (position === 'right') {
    tt.style.top = Math.max(10, rect.top) + 'px';
    tt.style.left = (rect.right + pad) + 'px'; tt.style.right = 'auto';
  } else if (position === 'left') {
    tt.style.top = Math.max(10, rect.top) + 'px';
    tt.style.left = (rect.left - ttW - pad) + 'px'; tt.style.right = 'auto';
  } else if (position === 'bottom') {
    tt.style.top = (rect.bottom + pad) + 'px';
    tt.style.left = rect.left + 'px'; tt.style.right = 'auto';
  } else if (position === 'top') {
    tt.style.top = (rect.top - ttH - pad) + 'px';
    tt.style.left = rect.left + 'px'; tt.style.right = 'auto';
  }

  const vw = window.innerWidth, vh = window.innerHeight;
  const left = parseFloat(tt.style.left);
  if (left + ttW > vw - 10) tt.style.left = (vw - ttW - 10) + 'px';
  if (left < 10) tt.style.left = '10px';
  const top = parseFloat(tt.style.top);
  if (top + ttH > vh - 10) tt.style.top = (vh - ttH - 10) + 'px';
  if (top < 10) tt.style.top = '10px';
}

// ── Renderizar paso ──────────────────────────────────────────────────────────
function renderStep(index) {
  const step = TOUR_STEPS[index];
  const isLast  = index === TOUR_STEPS.length - 1;
  const isFirst = index === 0;
  const targetEl = step.target ? document.querySelector(step.target) : null;

  if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

  let dotsHtml = '';
  TOUR_STEPS.forEach((_, i) => {
    const cls = i === index ? 'active' : i < index ? 'done' : '';
    dotsHtml += '<div class="nl-dot ' + cls + '"></div>';
  });

  tooltip.innerHTML =
    '<div class="nl-tour-badge"><span>NormaLis · Guía</span><span style="font-size:11px;color:#475569;font-weight:600">' + (index + 1) + ' / ' + TOUR_STEPS.length + '</span></div>' +
    '<h3>' + step.title + '</h3>' +
    '<p>' + step.body + '</p>' +
    '<div class="nl-tour-footer">' +
      '<div class="nl-tour-dots">' + dotsHtml + '</div>' +
      '<div class="nl-tour-btns">' +
        (!isFirst && !isLast ? '<button class="nl-btn nl-btn-prev" id="nl-btn-prev">←</button>' : '') +
        (!isLast ? '<button class="nl-btn nl-btn-skip" id="nl-btn-skip">Saltar</button>' : '') +
        (isLast
          ? '<button class="nl-btn nl-btn-prev" id="nl-btn-prev">← Anterior</button><button class="nl-btn nl-btn-finish" id="nl-btn-finish">¡Empezar! 🚀</button>'
          : '<button class="nl-btn nl-btn-next" id="nl-btn-next">Siguiente →</button>') +
      '</div>' +
    '</div>';

  var btnNext   = document.getElementById('nl-btn-next');
  var btnPrev   = document.getElementById('nl-btn-prev');
  var btnSkip   = document.getElementById('nl-btn-skip');
  var btnFinish = document.getElementById('nl-btn-finish');

  if (btnNext)   btnNext.addEventListener('click',   nextStep);
  if (btnPrev)   btnPrev.addEventListener('click',   prevStep);
  if (btnSkip)   btnSkip.addEventListener('click',   skipTour);
  if (btnFinish) btnFinish.addEventListener('click', finishTour);

  document.addEventListener('keydown', handleKey, { once: true });
  setTimeout(function() { positionTooltip(targetEl, step.position); }, 100);
}

function handleKey(e) {
  if (!tourActive) return;
  if (e.key === 'ArrowRight' || e.key === 'Enter') nextStep();
  else if (e.key === 'ArrowLeft') prevStep();
  else if (e.key === 'Escape') skipTour();
}

// ── Navegación ───────────────────────────────────────────────────────────────
function nextStep() { if (currentStep < TOUR_STEPS.length - 1) { currentStep++; renderStep(currentStep); } }
function prevStep() { if (currentStep > 0) { currentStep--; renderStep(currentStep); } }
function skipTour()   { endTour(false); }
function finishTour() { endTour(true);  }

function endTour(completed) {
  tourActive = false;
  localStorage.setItem(TOUR_KEY, TOUR_VERSION);
  overlay.classList.remove('active');
  overlay.style.display = 'none';
  spotlight.style.display = 'none';
  tooltip.style.display = 'none';
  document.removeEventListener('keydown', handleKey);
  showRestartButton();
  showGuideLink();
  if (completed) {
    setTimeout(function() { if (typeof nav === 'function') nav('establecimiento'); }, 400);
  }
}

// ── Botones flotantes ─────────────────────────────────────────────────────────
function showRestartButton() {
  if (document.getElementById('nl-tour-restart-btn')) return;
  var btn = document.createElement('button');
  btn.id = 'nl-tour-restart-btn';
  btn.innerHTML = '❓ Tour';
  btn.title = 'Repetir el tour de introducción';
  btn.addEventListener('click', function() {
    var gl = document.getElementById('nl-tour-guide-link');
    if (gl) gl.remove();
    btn.remove();
    startNormalisTour(true);
  });
  document.body.appendChild(btn);
}

function showGuideLink() {
  if (document.getElementById('nl-tour-guide-link')) return;
  var a = document.createElement('a');
  a.id = 'nl-tour-guide-link';
  a.href = 'https://fjfc1984-bit.github.io/normalis/guia.html';
  a.target = '_blank';
  a.innerHTML = '📖 Guía completa';
  a.title = 'Ver la guía interactiva completa de todos los módulos';
  document.body.appendChild(a);
}

// ── Iniciar tour ─────────────────────────────────────────────────────────────
function startNormalisTour(force) {
  if (tourActive) return;
  var done = localStorage.getItem(TOUR_KEY);
  if (done === TOUR_VERSION && !force) {
    showRestartButton();
    showGuideLink();
    return;
  }
  injectStyles();
  createDOM();
  currentStep = 0;
  tourActive  = true;
  overlay.style.display = 'block';
  overlay.classList.add('active');
  tooltip.style.display = 'block';
  spotlight.style.display = 'none';
  renderStep(0);
}

// ── Auto-inicio ──────────────────────────────────────────────────────────────
function autoStart() {
  var done = localStorage.getItem(TOUR_KEY);
  if (done === TOUR_VERSION) {
    setTimeout(function() { showRestartButton(); showGuideLink(); }, 2000);
    return;
  }
  setTimeout(function() { startNormalisTour(false); }, 1800);
}

window.startNormalisTour = startNormalisTour;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoStart);
} else {
  autoStart();
}

})();

// END:normalis-tour.js — NormaLis integrity seal
