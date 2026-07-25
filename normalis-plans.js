// normalis-plans.js
// NormaLis — Sistema de permisos por plan (Phase 2)
// Controla qué módulos ve cada IPS según su plan contratado.
// ─────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════
// DEFINICIÓN DE PLANES
// ══════════════════════════════════════════════════════════════════

var NORMALIS_PLANS = {

  // Plan Esencial — módulos core de habilitación
  basico: {
    label:    'Esencial',
    color:    '#6366f1',
    modules:  [
      'dashboard', 'establecimiento', 'cronograma',
      'auditoria',  'resultados',      'documentos',
      'chat'
    ]
  },

  // Plan Profesional — cumplimiento completo
  profesional: {
    label:    'Profesional',
    color:    '#0d9488',
    modules:  [
      'dashboard', 'establecimiento', 'cronograma',
      'auditoria',  'resultados',      'generador',   'documentos',
      'pamec',      'sst',             'pqrs',        'incidentes',
      'talento',    'vencimientos-personal',
      'chat',
      'comparador', 'roi'
    ]
  },

  // Plan Empresarial — acceso total
  empresarial: {
    label:   'Empresarial',
    color:   '#f59e0b',
    modules: '*'
  }
};

var NORMALIS_PLAN_UPGRADE = {
  basico:      'profesional',
  profesional: 'empresarial'
};

// Módulos que necesitan upgrade y en qué plan los desbloquean
var NORMALIS_MODULE_UNLOCK = {
  generador:              'profesional',
  pamec:                  'profesional',
  sst:                    'profesional',
  pqrs:                   'profesional',
  incidentes:             'profesional',
  talento:                'profesional',
  'vencimientos-personal':'profesional',
  comparador:             'profesional',
  roi:                    'profesional',
  calidad:                'empresarial',
  calendario:             'empresarial',
  firma:                  'empresarial',
  consentimientos:        'empresarial',
  simulacro:              'empresarial',
  bitacora:               'empresarial'
};

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

function _getPlan() {
  var rol = sessionStorage.getItem('normalis_rol') || '';
  if (rol === 'piloto' || rol === 'admin') return '*';
  return sessionStorage.getItem('normalis_plan') || 'profesional';
}

function isModuleAllowed(modId) {
  var plan = _getPlan();
  if (plan === '*') return true;
  var cfg = NORMALIS_PLANS[plan] || NORMALIS_PLANS['profesional'];
  if (cfg.modules === '*') return true;
  return cfg.modules.indexOf(modId) !== -1;
}

// ══════════════════════════════════════════════════════════════════
// INIT — llama después de que el usuario está autenticado
// ══════════════════════════════════════════════════════════════════

function initPlanGating() {
  var plan = _getPlan();
  if (plan === '*') return;  // piloto/admin: acceso completo

  // Inyectar CSS de lock (una sola vez)
  if (!document.getElementById('normalis-plan-css')) {
    var style = document.createElement('style');
    style.id = 'normalis-plan-css';
    style.textContent = [
      '.sb-item-locked{opacity:.42;pointer-events:none;position:relative;cursor:default!important}',
      '.sb-item-locked::after{content:"🔒";position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:10px}',
      '.sb-item-locked:hover{background:transparent!important}',
      '.sb-item-locked-click{opacity:.55;cursor:pointer}',
      '.sb-item-locked-click::after{content:"🔒";position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:10px}',
      '#normalis-upgrade-modal{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.72);backdrop-filter:blur(4px)}',
      '#normalis-upgrade-box{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:32px;max-width:440px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)}',
      '#normalis-upgrade-box h3{color:#f1f5f9;font-size:20px;margin:0 0 8px}',
      '#normalis-upgrade-box p{color:#94a3b8;font-size:14px;margin:0 0 24px;line-height:1.5}',
      '.normalis-upgrade-plans{display:flex;gap:12px;justify-content:center;margin-bottom:24px}',
      '.normalis-plan-card{background:#0f172a;border:1px solid #334155;border-radius:10px;padding:14px 18px;flex:1;text-align:left}',
      '.normalis-plan-card.recommended{border-color:#0d9488}',
      '.normalis-plan-card .plan-name{font-size:13px;font-weight:700;color:#f1f5f9;margin-bottom:4px}',
      '.normalis-plan-card .plan-desc{font-size:11px;color:#64748b;line-height:1.4}',
      '.normalis-plan-card .plan-price{font-size:12px;color:#0d9488;font-weight:600;margin-top:6px}',
      '.normalis-upgrade-cta{display:inline-block;background:linear-gradient(135deg,#0d9488,#6366f1);color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;border:none;transition:opacity .2s}',
      '.normalis-upgrade-cta:hover{opacity:.88}',
      '.normalis-upgrade-close{background:none;border:1px solid #334155;color:#94a3b8;padding:10px 20px;border-radius:10px;font-size:13px;cursor:pointer;margin-left:10px;transition:color .2s}',
      '.normalis-upgrade-close:hover{color:#f1f5f9}'
    ].join('\n');
    document.head.appendChild(style);
  }

  // Aplicar lock a items del sidebar según plan
  var items = document.querySelectorAll('[data-mod]');
  items.forEach(function(item) {
    var mod = item.getAttribute('data-mod');
    if (!isModuleAllowed(mod)) {
      item.classList.add('sb-item-locked-click');
      // Sobreescribir onclick para mostrar prompt
      item.onclick = function() { showUpgradePrompt(mod); };
    }
  });
}

// ══════════════════════════════════════════════════════════════════
// MODAL DE UPGRADE
// ══════════════════════════════════════════════════════════════════

function showUpgradePrompt(modId) {
  // Quitar modal anterior si existe
  var old = document.getElementById('normalis-upgrade-modal');
  if (old) old.remove();

  var plan       = sessionStorage.getItem('normalis_plan') || 'profesional';
  var upgradeTo  = NORMALIS_PLAN_UPGRADE[plan] || 'empresarial';
  var unlockPlan = NORMALIS_MODULE_UNLOCK[modId] || upgradeTo;
  var upCfg      = NORMALIS_PLANS[unlockPlan] || NORMALIS_PLANS['empresarial'];

  // Nombres amigables de módulos
  var modNames = {
    generador:             'Generador con IA',
    pamec:                 'PAMEC',
    sst:                   'SG-SST',
    pqrs:                  'Gestor PQRS',
    incidentes:            'Incidentes y Eventos',
    talento:               'Talento Humano',
    'vencimientos-personal':'Vencimientos Personal',
    comparador:            'Comparador Normativo',
    roi:                   'Calculadora ROI',
    calidad:               'Calidad en Salud',
    calendario:            'Calendario',
    firma:                 'Firma y Versiones',
    consentimientos:       'Consentimientos',
    simulacro:             'Simulacro Secretaría',
    bitacora:              'Bitácora'
  };
  var modLabel = modNames[modId] || modId;

  var modal = document.createElement('div');
  modal.id  = 'normalis-upgrade-modal';
  modal.innerHTML =
    '<div id="normalis-upgrade-box">' +
      '<div style="font-size:36px;margin-bottom:12px">🔓</div>' +
      '<h3>Desbloquea <em style="color:' + upCfg.color + '">' + modLabel + '</em></h3>' +
      '<p>Este módulo está disponible en el plan <strong style="color:' + upCfg.color + '">' + upCfg.label + '</strong>.<br>' +
         'Actualiza tu plan para acceder a esta y otras herramientas.</p>' +
      '<div class="normalis-upgrade-plans">' +
        _buildPlanCard('profesional', plan) +
        _buildPlanCard('empresarial', plan) +
      '</div>' +
      '<button class="normalis-upgrade-cta" onclick="window.open(\'https://normalis.co/#precios\',\'_blank\')">Ver planes y precios →</button>' +
      '<button class="normalis-upgrade-close" onclick="document.getElementById(\'normalis-upgrade-modal\').remove()">Ahora no</button>' +
    '</div>';

  // Cerrar al hacer click fuera
  modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.remove();
  });

  document.body.appendChild(modal);
}

function _buildPlanCard(planId, currentPlan) {
  var cfg  = NORMALIS_PLANS[planId];
  var mods = cfg.modules === '*' ? 'Todos los módulos' : cfg.modules.length + ' módulos';
  var prices = { profesional: 'COP $299.000/mes', empresarial: 'COP $499.000/mes' };
  var reco = (planId === 'empresarial') ? ' recommended' : '';
  return '<div class="normalis-plan-card' + reco + '">' +
    '<div class="plan-name">' + (reco ? '⭐ ' : '') + cfg.label + '</div>' +
    '<div class="plan-desc">' + mods + ' incluidos</div>' +
    '<div class="plan-price">' + (prices[planId] || '') + '</div>' +
  '</div>';
}

// ══════════════════════════════════════════════════════════════════
// BADGE DE PLAN EN EL SIDEBAR
// ══════════════════════════════════════════════════════════════════

function renderPlanBadge() {
  var plan = _getPlan();
  var el   = document.getElementById('sb-plan-badge');
  if (!el) return;
  if (plan === '*') {
    el.textContent = '✦ Empresarial';
    el.style.background = 'rgba(245,158,11,.15)';
    el.style.color      = '#f59e0b';
  } else {
    var cfg = NORMALIS_PLANS[plan] || NORMALIS_PLANS['profesional'];
    el.textContent      = '✦ ' + cfg.label;
    el.style.background = 'rgba(99,102,241,.15)';
    el.style.color      = cfg.color || '#6366f1';
  }
}

// END:normalis-plans.js — NormaLis integrity seal
