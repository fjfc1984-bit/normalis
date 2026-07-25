/**
 * normalis-analytics.js — Google Analytics 4 para NormaLis
 * Measurement ID: G-R74LQ03RWF
 * Propiedad: normalis.co (Google Analytics 4)
 *
 * Eventos personalizados rastreados:
 *   user_register        — nueva IPS completa registro.html
 *   user_login           — usuario autenticado correctamente
 *   audit_started        — usuario inicia una auditoría de habilitación
 *   audit_completed      — usuario finaliza una auditoría (con score)
 *   module_viewed        — usuario abre un módulo del sidebar
 *   chat_message         — mensaje enviado al asistente IA normativo
 *   document_generated   — documento generado (acta, protocolo, etc.)
 *   demo_requested       — solicitud de demo desde index.html
 *   plan_activated       — plan activado (basico/profesional)
 */

(function() {
  'use strict';

  const GA_ID = 'G-R74LQ03RWF';

  // ── Cargar gtag.js si no está cargado ──────────────────────────────────────────
  if (!window.gtag) {
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function() { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA_ID, {
      send_page_view: true,
      cookie_flags: 'SameSite=None;Secure',
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function track(eventName, params) {
    if (typeof gtag !== 'function') return;
    try {
      var base = {
        app_name: 'NormaLis',
        app_version: '2.0',
      };
      var plan = sessionStorage.getItem('normalis_plan') || 'unknown';
      var rol  = sessionStorage.getItem('normalis_rol')  || 'unknown';
      if (rol !== 'unknown') base.user_role = rol;
      if (plan !== 'unknown') base.user_plan = plan;
      gtag('event', eventName, Object.assign(base, params || {}));
    } catch(e) {}
  }

  // ── API pública ────────────────────────────────────────────────────────────
  window.NL = window.NL || {};

  /** Registro de nueva IPS */
  window.NL.trackRegister = function(tipoIPS, ciudad) {
    track('user_register', {
      ips_tipo: tipoIPS || 'unknown',
      ciudad:   ciudad  || 'unknown',
    });
  };

  /** Login exitoso */
  window.NL.trackLogin = function(rol, plan) {
    track('user_login', { user_role: rol || 'unknown', user_plan: plan || 'unknown' });
  };

  /** Inicio de auditoría */
  window.NL.trackAuditStart = function(serviceType) {
    track('audit_started', { service_type: serviceType || 'unknown' });
  };

  /** Auditoría completada */
  window.NL.trackAuditComplete = function(serviceType, score, totalQuestions) {
    track('audit_completed', {
      service_type:    serviceType || 'unknown',
      score:           Math.round(score || 0),
      total_questions: totalQuestions || 0,
      value:           Math.round(score || 0),
    });
  };

  /** Módulo del sidebar abierto */
  window.NL.trackModule = function(moduleName) {
    track('module_viewed', { module_name: moduleName || 'unknown' });
  };

  /** Mensaje al asistente IA */
  window.NL.trackChat = function() {
    track('chat_message', {});
  };

  /** Documento generado */
  window.NL.trackDocument = function(docType) {
    track('document_generated', { document_type: docType || 'unknown' });
  };

  /** Demo solicitado desde index.html */
  window.NL.trackDemo = function(tipoIPS) {
    track('demo_requested', { ips_tipo: tipoIPS || 'unknown' });
  };

  /** Plan activado */
  window.NL.trackPlanActivated = function(plan) {
    track('plan_activated', { plan_name: plan || 'unknown' });
  };

  // ── Auto-tracking: clicks en sidebar ──────────────────────────────────────
  document.addEventListener('click', function(e) {
    var item = e.target.closest('[data-mod]');
    if (item) {
      var mod = item.getAttribute('data-mod');
      if (mod) window.NL.trackModule(mod);
    }
  }, { passive: true });

})();
// END:normalis-analytics.js — NormaLis integrity seal
