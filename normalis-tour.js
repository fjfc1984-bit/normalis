// normalis-tour.js — Tour interactivo de onboarding para NormaLis
// Se activa automáticamente en el primer ingreso.
// Para re-activar manualmente: startNormalisTour()

(function() {
'use strict';

const TOUR_KEY = 'normalis_tour_done';
const TOUR_VERSION = '2';  // Incrementar para re-mostrar el tour a usuarios existentes

// ── Pasos del tour ──────────────────────────────────────────────────────────
// target: selector CSS del elemento a destacar
// title: título del tooltip
// body: explicación
// position: 'bottom' | 'top' | 'right' | 'left' | 'center'
const TOUR_STEPS = [
  {
    target: null,
    title: '👋 Bienvenido a NormaLis',
    body: 'Te guiaremos en 60 segundos por las funciones principales. Puedes saltar el tour en cualquier momento o repetirlo desde el menú de ayuda.',
    position: 'center'
  },
  {
    target: '.sb-item[onclick*="dashboard"]',
    title: '📊 Dashboard',
    body: 'Tu panel de control. Aquí ves el estado de habilitación de tu IPS, alertas pendientes y accesos rápidos a las tareas más importantes.',
    position: 'right'
  },
  {
    target: '.sb-item[onclick*="cronograma"]',
    title: '🗓️ Cronograma de Visita',
    body: 'Cuenta regresiva para la visita de la Secretaría. El sistema te avisa con anticipación qué documentos y estándares debes tener listos.',
    position: 'right'
  },
  {
    target: '.sb-item[onclick*="auditoria"]',
    title: '🔍 Auditoría Simulada',
    body: 'El corazón del sistema. Simula una visita de habilitación con los estándares reales de la Res. 3100/2019 y 465/2025. Detecta incumplimientos antes de que llegue la Secretaría.',
    position: 'right'
  },
  {
    target: '.sb-item[onclick*="resultados"]',
    title: '📈 Resultados',
    body: 'Después de cada auditoría, aquí encuentras el puntaje de cumplimiento, los hallazgos críticos y el plan de mejora automático.',
    position: 'right'
  },
  {
    target: '.sb-item[onclick*="generador"]',
    title: '✨ Generar con IA',
    body: 'Genera documentos normativos listos para presentar: protocolos, manuales, formatos PAMEC, y más. Solo selecciona el documento y la IA lo crea con los datos de tu IPS.',
    position: 'right'
  },
  {
    target: '.sb-item[onclick*="documentos"]',
    title: '📁 Biblioteca Documental',
    body: 'Todos los documentos generados, organizados por categoría. Descarga en PDF o Word, filtra por servicio y lleva el control de versiones.',
    position: 'right'
  },
  {
    target: '.sb-item[onclick*="chat"]',
    title: '💬 Consultor Normativo IA',
    body: 'Pregunta en lenguaje natural sobre normativa de salud colombiana. El sistema responde con base en la Res. 3100/2019, 465/2025 y más. Disponible 24/7.',
    position: 'right'
  },
  {
    target: '.sb-item[onclick*="establecimiento"]',
    title: '🏥 Mi Establecimiento',
    body: 'Configura los datos de tu IPS: nombre, NIT, tipo de servicios, responsable. Esta información se usa en todos los documentos generados.',
    position: 'right'
  },
  {
    target: null,
    title: '🎉 ¡Listo para empezar!',
    body: 'Ya conoces lo esencial. Te recomendamos empezar por <strong>Mi Establecimiento</strong> para configurar tu IPS, y luego correr tu primera <strong>Auditoría Simulada</strong>.<br><br>Puedes repetir este tour desde el botón <strong>❓ Ayuda</strong> en el menú.',
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
    #nl-tour-overlay.active { background: rgba(0,0,0,0.55); pointer-events: all; }

    #nl-tour-spotlight {
      position: fixed; z-index: 99991;
      border-radius: 8px;
      box-shadow: 0 0 0 9999px rgba(0,0,0,0.55);
      transition: all 0.35s cubic-bezier(.4,0,.2,1);
      pointer-events: none;
      outline: 3px solid #06b6d4;
    }

    #nl-tour-tooltip {
      position: fixed; z-index: 99999;
      background: #fff; border-radius: 14px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.22);
      padding: 24px 26px 20px;
      max-width: 340px; min-width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transition: all 0.3s cubic-bezier(.4,0,.2,1);
      border: 1px solid #e5e7eb;
    }
    #nl-tour-tooltip .nl-tour-badge {
      font-size: 11px; font-weight: 700; letter-spacing: .05em;
      color: #06b6d4; text-transform: uppercase; margin-bottom: 6px;
    }
    #nl-tour-tooltip h3 {
      margin: 0 0 10px; font-size: 16px; font-weight: 700; color: #111827; line-height: 1.3;
    }
    #nl-tour-tooltip p {
      margin: 0 0 18px; font-size: 14px; color: #4b5563; line-height: 1.6;
    }
    #nl-tour-tooltip .nl-tour-footer {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
    }
    #nl-tour-tooltip .nl-tour-dots {
      display: flex; gap: 5px; align-items: center;
    }
    #nl-tour-tooltip .nl-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #d1d5db; transition: background 0.2s;
    }
    #nl-tour-tooltip .nl-dot.active { background: #06b6d4; width: 18px; border-radius: 4px; }
    #nl-tour-tooltip .nl-tour-btns { display: flex; gap: 8px; }
    #nl-tour-tooltip .nl-btn {
      padding: 8px 16px; border-radius: 8px; font-size: 13px;
      font-weight: 600; cursor: pointer; border: none; transition: all 0.15s;
    }
    #nl-tour-tooltip .nl-btn-skip {
      background: transparent; color: #9ca3af;
    }
    #nl-tour-tooltip .nl-btn-skip:hover { color: #ef4444; }
    #nl-tour-tooltip .nl-btn-next {
      background: #06b6d4; color: #fff;
    }
    #nl-tour-tooltip .nl-btn-next:hover { background: #0891b2; }
    #nl-tour-tooltip .nl-btn-finish {
      background: #10b981; color: #fff;
    }
    #nl-tour-tooltip .nl-btn-finish:hover { background: #059669; }

    #nl-tour-restart-btn {
      position: fixed; bottom: 20px; right: 20px; z-index: 9999;
      background: #06b6d4; color: #fff; border: none; border-radius: 50px;
      padding: 10px 18px; font-size: 13px; font-weight: 600;
      cursor: pointer; box-shadow: 0 4px 14px rgba(6,182,212,0.4);
      display: flex; align-items: center; gap: 6px;
      transition: all 0.2s;
    }
    #nl-tour-restart-btn:hover { background: #0891b2; transform: translateY(-1px); }
  `;
  document.head.appendChild(s);
}

// ── Estado del tour ──────────────────────────────────────────────────────────
let currentStep = 0;
let tourActive = false;
let overlay, spotlight, tooltip;

// ── Crear elementos DOM ──────────────────────────────────────────────────────
function createDOM() {
  if (document.getElementById('nl-tour-overlay')) return;

  overlay = document.createElement('div');
  overlay.id = 'nl-tour-overlay';
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) skipTour();
  });

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
    tt.style.top = '50%';
    tt.style.left = '50%';
    tt.style.transform = 'translate(-50%, -50%)';
    tt.style.right = 'auto';
    spotlight.style.display = 'none';
    return;
  }

  tt.style.transform = '';
  const rect = targetEl.getBoundingClientRect();
  const ttW = 340, ttH = tt.offsetHeight || 200;
  const pad = 14;

  // Spotlight
  spotlight.style.display = 'block';
  spotlight.style.top = (rect.top - 4) + 'px';
  spotlight.style.left = (rect.left - 4) + 'px';
  spotlight.style.width = (rect.width + 8) + 'px';
  spotlight.style.height = (rect.height + 8) + 'px';

  // Tooltip position
  if (position === 'right') {
    tt.style.top = Math.max(10, rect.top) + 'px';
    tt.style.left = (rect.right + pad) + 'px';
    tt.style.right = 'auto';
  } else if (position === 'left') {
    tt.style.top = Math.max(10, rect.top) + 'px';
    tt.style.left = (rect.left - ttW - pad) + 'px';
    tt.style.right = 'auto';
  } else if (position === 'bottom') {
    tt.style.top = (rect.bottom + pad) + 'px';
    tt.style.left = rect.left + 'px';
    tt.style.right = 'auto';
  } else if (position === 'top') {
    tt.style.top = (rect.top - ttH - pad) + 'px';
    tt.style.left = rect.left + 'px';
    tt.style.right = 'auto';
  }

  // Clamp to viewport
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
  const isLast = index === TOUR_STEPS.length - 1;
  const isFirst = index === 0;

  const targetEl = step.target ? document.querySelector(step.target) : null;

  // Si hay target, hacer scroll para que sea visible
  if (targetEl) {
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Dots
  let dotsHtml = '';
  TOUR_STEPS.forEach((_, i) => {
    dotsHtml += `<div class="nl-dot${i === index ? ' active' : ''}"></div>`;
  });

  // Botones
  let btnsHtml = '';
  if (!isFirst) {
    btnsHtml += `<button class="nl-btn nl-btn-skip" id="nl-btn-prev">← Anterior</button>`;
  }
  if (isLast) {
    btnsHtml += `<button class="nl-btn nl-btn-finish" id="nl-btn-finish">¡Empezar! 🚀</button>`;
  } else {
    btnsHtml += `<button class="nl-btn nl-btn-next" id="nl-btn-next">Siguiente →</button>`;
  }

  tooltip.innerHTML = `
    <div class="nl-tour-badge">NormaLis · Paso ${index + 1} de ${TOUR_STEPS.length}</div>
    <h3>${step.title}</h3>
    <p>${step.body}</p>
    <div class="nl-tour-footer">
      <div class="nl-tour-dots">${dotsHtml}</div>
      <div class="nl-tour-btns">
        ${!isLast ? `<button class="nl-btn nl-btn-skip" id="nl-btn-skip">Saltar</button>` : ''}
        ${btnsHtml}
      </div>
    </div>
  `;

  // Event listeners
  const btnNext = document.getElementById('nl-btn-next');
  const btnPrev = document.getElementById('nl-btn-prev');
  const btnSkip = document.getElementById('nl-btn-skip');
  const btnFinish = document.getElementById('nl-btn-finish');

  if (btnNext) btnNext.addEventListener('click', nextStep);
  if (btnPrev) btnPrev.addEventListener('click', prevStep);
  if (btnSkip) btnSkip.addEventListener('click', skipTour);
  if (btnFinish) btnFinish.addEventListener('click', finishTour);

  // Keyboard
  document.addEventListener('keydown', handleKey, { once: true });

  setTimeout(() => positionTooltip(targetEl, step.position), 80);
}

function handleKey(e) {
  if (!tourActive) return;
  if (e.key === 'ArrowRight' || e.key === 'Enter') nextStep();
  else if (e.key === 'ArrowLeft') prevStep();
  else if (e.key === 'Escape') skipTour();
}

// ── Navegación ───────────────────────────────────────────────────────────────
function nextStep() {
  if (currentStep < TOUR_STEPS.length - 1) {
    currentStep++;
    renderStep(currentStep);
  }
}

function prevStep() {
  if (currentStep > 0) {
    currentStep--;
    renderStep(currentStep);
  }
}

function skipTour() {
  endTour(false);
}

function finishTour() {
  endTour(true);
}

function endTour(completed) {
  tourActive = false;
  localStorage.setItem(TOUR_KEY, TOUR_VERSION);
  overlay.classList.remove('active');
  overlay.style.display = 'none';
  spotlight.style.display = 'none';
  tooltip.style.display = 'none';
  document.removeEventListener('keydown', handleKey);

  if (completed) {
    showRestartButton();
    // Navegar a Mi Establecimiento como primer paso sugerido
    setTimeout(() => {
      if (typeof nav === 'function') nav('establecimiento');
    }, 400);
  }
}

// ── Botón flotante para repetir el tour ─────────────────────────────────────
function showRestartButton() {
  if (document.getElementById('nl-tour-restart-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'nl-tour-restart-btn';
  btn.innerHTML = '❓ Ver tour';
  btn.title = 'Repetir el tour de introducción';
  btn.addEventListener('click', () => {
    btn.remove();
    startNormalisTour(true);
  });
  document.body.appendChild(btn);
}

// ── Iniciar tour ─────────────────────────────────────────────────────────────
function startNormalisTour(force) {
  if (tourActive) return;

  const done = localStorage.getItem(TOUR_KEY);
  if (done === TOUR_VERSION && !force) {
    // Ya completó el tour — solo mostrar botón de repetir
    showRestartButton();
    return;
  }

  injectStyles();
  createDOM();

  currentStep = 0;
  tourActive = true;
  overlay.style.display = 'block';
  overlay.classList.add('active');
  tooltip.style.display = 'block';
  spotlight.style.display = 'none';

  renderStep(0);
}

// ── Auto-inicio ──────────────────────────────────────────────────────────────
// Espera a que el app esté renderizado antes de iniciar
function autoStart() {
  const done = localStorage.getItem(TOUR_KEY);
  if (done === TOUR_VERSION) {
    // Mostrar solo el botón flotante para usuarios que ya completaron el tour
    setTimeout(showRestartButton, 2000);
    return;
  }
  // Primer ingreso — iniciar tour después de que el app cargue
  setTimeout(() => startNormalisTour(false), 1800);
}

// Exponer globalmente para poder llamar desde el botón del dashboard
window.startNormalisTour = startNormalisTour;

// Arrancar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoStart);
} else {
  autoStart();
}

})();

// END:normalis-tour.js — NormaLis integrity seal
