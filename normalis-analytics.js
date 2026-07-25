/**
 * normalis-analytics.js â Google Analytics 4 para NormaLis
 * Measurement ID: G-R74LQ03RWF
 * Setup: analytics.google.com â Admin â Create Property â Web â normalis.co
 *
 * Eventos personalizados rastreados:
 *   user_register        â nueva IPS completa registro.html
 *   user_login           â usuario autenticado correctamente
 *   audit_started        â usuario inicia una auditorÃ­a de habilitaciÃ³n
 *   audit_completed      â usuario finaliza una auditorÃ­a (con score)
 *   module_viewed        â usuario abre un mÃ³dulo del sidebar
 *   chat_message         â mensaje enviado al asistente IA normativo
 *   document_generated   â documento generado (acta, protocolo, etc.)
 *   demo_requested       â solicitud de demo desde index.html
 *   plan_activated       â plan activado (basico/profesional)
 */

(function() {
  'use strict';

  const GA_ID = 'G-XXXXXXXXXX'; // â Reemplaza con tu Measurement ID

  // ââ Cargar gtag.js si no estÃ¡ cargado ââââââââââââââââââââââââââââââââââââââ
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

  // ââ Helpers ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

  // ââ API pÃºblica ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

  /** Inicio de auditorÃ­a */
  window.NL.trackAuditStart = function(serviceType) {
    track('audit_started', { service_type: serviceType || 'unknown' });
  };

  /** AuditorÃ­a completada */
  window.NL.trackAuditComplete = function(serviceType, score, totalQuestions) {
    track('audit_completed', {
      service_type:    serviceType || 'unknown',
      score:           Math.round(score || 0),
      total_questions: totalQuestions || 0,
      value:           Math.round(score || 0), // GA4 usa 'value' para avg
    });
  };

  /** MÃ³dulo del sidebar abierto */
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

  // ââ Auto-tracking: clicks en sidebar ââââââââââââââââââââââââââââââââââââââ
  document.addEventListener('click', function(e) {
    var item = e.target.closest('[data-mod]');
    if (item) {
      var mod = item.getAttribute('data-mod');
      if (mod) window.NL.trackModule(mod);
    }
  }, { passive: true });

})();
// END:normalis-analytics.js â NormaLis integrity seal
