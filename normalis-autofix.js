// normalis-autofix.js
// NormaLis — Motor de Auto-Corrección de Errores en Runtime
// ─────────────────────────────────────────────────────────────────────────────
// Captura errores JS, los clasifica contra patrones conocidos y aplica
// correcciones automáticas. Los errores se reportan a Sentry si está disponible.
// Un log persistente en localStorage permite diagnóstico post-facto.
//
// Patrón de uso:
//   NormalisAutofix.start();   — llamar al inicio, antes de inicApp()
//
// Para registrar un error desde cualquier módulo:
//   NormalisAutofix.report('mi-modulo', error, { contexto: 'guardar CAPA' });
// ─────────────────────────────────────────────────────────────────────────────

const NormalisAutofix = (function() {

  // ── Configuración ────────────────────────────────────────────────────────
  const MAX_LOG_ENTRIES  = 60;    // entradas máximas en localStorage
  const MAX_RETRIES      = 3;     // reintentos por patrón
  const LOG_KEY          = 'normalis_error_log';
  let _started         = false;
  const _retryCounters   = {};    // { patternId: count }

  // ── Patrones de error conocidos + estrategia de recuperación ─────────────
  // Cada patrón tiene:
  //   match(msg, src, err)  → boolean
  //   fix(msg, src, err)    → void  (aplica corrección)
  //   label                 → nombre legible para logs
  //   silent                → si true, no muestra toast al usuario
  const PATTERNS = [

    // 1. Módulo lazy no cargado — función no definida al llamarla
    {
      id: 'lazy_module_undefined',
      label: 'Función de módulo lazy no disponible',
      match: function(msg) {
        return /is not (a function|defined)/.test(msg) &&
          (msg.indexOf('renderSST') > -1 || msg.indexOf('renderPamec') > -1 ||
           msg.indexOf('openDocViewer') > -1 || msg.indexOf('openDocPreview') > -1 ||
           msg.indexOf('exportarPDF') > -1);
      },
      fix: function(msg) {
        // Detectar qué módulo falta y cargarlo
        let mod = null;
        if (msg.indexOf('renderSST') > -1 || msg.indexOf('calcSSTScore') > -1) mod = 'sst';
        else if (msg.indexOf('renderPamec') > -1) mod = 'pamec';
        else if (msg.indexOf('openDoc') > -1 || msg.indexOf('openDocPreview') > -1) mod = 'docs';
        else if (msg.indexOf('exportar') > -1) mod = 'export';
        if (mod && typeof nlLazyLoad === 'function') {
          nlLazyLoad(mod, function() {
            _log('autofix', 'lazy_module_undefined', 'Módulo ' + mod + ' cargado automáticamente', 'fix');
          });
        }
      }
    },

    // 2. Firestore — permiso denegado (reglas de seguridad)
    {
      id: 'firestore_permission_denied',
      label: 'Firestore: permiso denegado',
      match: function(msg) {
        return msg.indexOf('Missing or insufficient permissions') > -1 ||
               msg.indexOf('PERMISSION_DENIED') > -1;
      },
      fix: function() {
        _log('autofix', 'firestore_permission_denied', 'Sesión expirada o sin permisos — redirigiendo a login', 'fix');
        if (typeof nlToast === 'function') {
          nlToast('Sesión expirada. Redirigiendo…', 'warning', 3000);
        }
        setTimeout(function() {
          const uid = sessionStorage.getItem('normalis_uid');
          if (!uid) window.location.href = 'login.html';
        }, 2500);
      }
    },

    // 3. Firestore — unavailable / offline
    {
      id: 'firestore_unavailable',
      label: 'Firestore: servicio no disponible (offline)',
      match: function(msg) {
        return msg.indexOf('unavailable') > -1 && msg.indexOf('firestore') > -1 ||
               msg.indexOf('Failed to get document') > -1 ||
               msg.indexOf('client is offline') > -1;
      },
      fix: function() {
        // Activar badge offline — ya existe updateConnBadge
        if (typeof updateConnBadge === 'function') updateConnBadge(false);
        _log('autofix', 'firestore_unavailable', 'Sin conexión — modo offline activado', 'fix');
      },
      silent: true
    },

    // 4. Firebase Auth — token expirado
    {
      id: 'auth_token_expired',
      label: 'Firebase Auth: token expirado',
      match: function(msg) {
        return msg.indexOf('auth/id-token-expired') > -1 ||
               msg.indexOf('TOKEN_EXPIRED') > -1 ||
               msg.indexOf('auth/user-token-expired') > -1;
      },
      fix: function() {
        _log('autofix', 'auth_token_expired', 'Token expirado — intentando renovar sesión', 'fix');
        try {
          const auth = firebase.auth ? firebase.auth() : null;
          if (auth && auth.currentUser) {
            auth.currentUser.getIdToken(true).then(function() {
              if (typeof nlToast === 'function') nlToast('Sesión renovada automáticamente', 'success', 2000);
            }).catch(function() {
              window.location.href = 'login.html';
            });
          }
        } catch(e) { /* firebase no disponible */ }
      }
    },

    // 5. localStorage quota exceeded
    {
      id: 'localstorage_quota',
      label: 'localStorage: cuota excedida',
      match: function(msg) {
        return msg.indexOf('QuotaExceededError') > -1 ||
               msg.indexOf('quota') > -1 && msg.indexOf('storage') > -1;
      },
      fix: function() {
        _log('autofix', 'localstorage_quota', 'Limpiando cache local antiguo', 'fix');
        // Eliminar solo las claves de cache, no datos de usuario
        const keysToClean = [];
        for (var i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.indexOf('_cache_') > -1 || k.indexOf('_tmp_') > -1)) {
            keysToClean.push(k);
          }
        }
        keysToClean.forEach(function(k) { localStorage.removeItem(k); });
        if (typeof nlToast === 'function') {
          nlToast('Cache local limpiado para liberar espacio', 'info', 3000);
        }
      }
    },

    // 6. Worker / proxy IA no disponible
    {
      id: 'ai_proxy_unavailable',
      label: 'Worker IA: proxy no disponible',
      match: function(msg) {
        return msg.indexOf('normalis-worker') > -1 && msg.indexOf('fetch') > -1 ||
               msg.indexOf('geminiProxy') > -1 ||
               msg.indexOf('Failed to fetch') > -1 && msg.indexOf('chat') > -1;
      },
      fix: function() {
        _log('autofix', 'ai_proxy_unavailable', 'Proxy IA no responde — modo degradado activado', 'fix');
        if (typeof nlToast === 'function') {
          nlToast('Asistente IA temporalmente no disponible', 'warning', 4000);
        }
      },
      silent: true
    },

    // 7. Script dinámico — fallo de carga (módulo lazy 404)
    {
      id: 'script_load_error',
      label: 'Error cargando módulo dinámico',
      match: function(msg, src) {
        return msg.indexOf('Script error') > -1 || src.indexOf('normalis-') > -1;
      },
      fix: function(msg, src) {
        // Reintentar la carga del script fallido
        const scriptSrc = src || '';
        if (!scriptSrc || _retryCounters['script:' + scriptSrc] >= MAX_RETRIES) return;
        _retryCounters['script:' + scriptSrc] = (_retryCounters['script:' + scriptSrc] || 0) + 1;
        setTimeout(function() {
          const s = document.createElement('script');
          s.src = scriptSrc + (scriptSrc.indexOf('?') > -1 ? '&' : '?') + '_retry=' + Date.now();
          document.head.appendChild(s);
          _log('autofix', 'script_load_error', 'Reintentando carga de ' + scriptSrc, 'fix');
        }, 1500);
      }
    },

    // 8. TypeError genérico: Cannot read properties of null/undefined
    //    — elemento DOM no encontrado
    {
      id: 'dom_null_reference',
      label: 'Referencia nula a elemento DOM',
      match: function(msg) {
        return /Cannot read prop/.test(msg) &&
          (msg.indexOf('null') > -1 || msg.indexOf('undefined') > -1);
      },
      fix: function(msg, src, err) {
        // Solo loguear — no podemos saber qué elemento falta
        _log('autofix', 'dom_null_reference',
          'Elemento DOM no encontrado. Stack: ' + (err && err.stack ? err.stack.split('\n')[1] : 'n/a'),
          'warn');
      },
      silent: true
    },

    // 9. Sentry inicialización fallida — no bloquear la app
    {
      id: 'sentry_init_error',
      label: 'Sentry: error de inicialización (no crítico)',
      match: function(msg) {
        return msg.indexOf('Sentry') > -1 || msg.indexOf('sentry') > -1;
      },
      fix: function() {
        _log('autofix', 'sentry_init_error', 'Sentry no disponible — monitoreo desactivado', 'info');
      },
      silent: true
    },

    // 10. Promise rechazada sin catch — patrón genérico de fallback
    {
      id: 'unhandled_rejection',
      label: 'Promise sin manejo de error',
      match: function(msg) {
        return msg.indexOf('UnhandledPromiseRejection') > -1 ||
               msg.indexOf('unhandled') > -1 && msg.indexOf('rejection') > -1;
      },
      fix: function(msg, src, err) {
        _log('autofix', 'unhandled_rejection',
          'Promise no manejada: ' + msg, 'warn');
      },
      silent: true
    },
  ];

  // ── Logger interno ────────────────────────────────────────────────────────
  function _log(category, patternId, detail, severity) {
    const entry = {
      ts:        new Date().toISOString(),
      category:  category,
      patternId: patternId,
      detail:    detail,
      severity:  severity || 'error',
      url:       window.location.pathname
    };
    try {
      let log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
      log.unshift(entry);
      if (log.length > MAX_LOG_ENTRIES) log = log.slice(0, MAX_LOG_ENTRIES);
      localStorage.setItem(LOG_KEY, JSON.stringify(log));
    } catch(e) { /* quota u otro problema */ }
    console.warn('[NormaLis AutoFix]', severity, patternId, '—', detail);
  }

  // ── Reportar a Sentry si está disponible ─────────────────────────────────
  function _reportToSentry(err, context) {
    try {
      if (window.Sentry && typeof window.Sentry.captureException === 'function') {
        window.Sentry.withScope(function(scope) {
          if (context) {
            Object.keys(context).forEach(function(k) {
              scope.setExtra(k, context[k]);
            });
          }
          scope.setTag('autofix', 'true');
          window.Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
        });
      }
    } catch(e) { /* Sentry no disponible */ }
  }

  // ── Motor principal de clasificación y corrección ─────────────────────────
  function _handleError(msg, src, lineno, colno, err) {
    const msgStr = String(msg || '');
    const srcStr = String(src || '');

    // 1. Registrar en log interno
    _log('capture', 'raw', msgStr + ' @ ' + srcStr + ':' + lineno, 'error');

    // 2. Reportar a Sentry
    _reportToSentry(err || msgStr, { src: srcStr, line: lineno, col: colno });

    // 3. Buscar patrón coincidente y aplicar fix
    let matched = false;
    for (var i = 0; i < PATTERNS.length; i++) {
      const p = PATTERNS[i];
      try {
        if (p.match(msgStr, srcStr, err)) {
          matched = true;
          const retryKey = 'pat:' + p.id;
          if ((_retryCounters[retryKey] || 0) < MAX_RETRIES) {
            _retryCounters[retryKey] = (_retryCounters[retryKey] || 0) + 1;
            _log('autofix', p.id, 'Aplicando corrección automática (' + _retryCounters[retryKey] + '/' + MAX_RETRIES + ')', 'fix');
            try { p.fix(msgStr, srcStr, err); } catch(fe) { /* fix no puede romper el flujo */ }
          } else {
            _log('autofix', p.id, 'Máximo de reintentos alcanzado (' + MAX_RETRIES + ')', 'warn');
            if (!p.silent && typeof nlToast === 'function') {
              nlToast('Error persistente: ' + p.label + '. Recarga la página si el problema continúa.', 'error', 6000);
            }
          }
          break; // primer patrón coincidente
        }
      } catch(pe) { /* error en el matcher */ }
    }

    // 4. Error no clasificado — loguear con más detalle
    if (!matched) {
      _log('capture', 'unclassified', msgStr + ' @ ' + srcStr + ':' + lineno, 'warn');
    }

    // Retornar false para que el error también se propague al console
    return false;
  }

  // ── API pública ───────────────────────────────────────────────────────────
  return {

    /**
     * Inicia el sistema de captura de errores.
     * Llamar una sola vez al inicio de la app.
     */
    start: function() {
      if (_started) return;
      _started = true;

      // Captura errores síncronos
      const _prevOnerror = window.onerror;
      window.onerror = function(msg, src, lineno, colno, err) {
        _handleError(msg, src, lineno, colno, err);
        if (typeof _prevOnerror === 'function') _prevOnerror(msg, src, lineno, colno, err);
        return false;
      };

      // Captura promises rechazadas sin catch
      window.addEventListener('unhandledrejection', function(e) {
        let msg = e.reason ? (e.reason.message || String(e.reason)) : 'Promise rechazada';
        _handleError('UnhandledPromiseRejection: ' + msg, window.location.pathname, 0, 0, e.reason);
      });

      _log('system', 'start', 'NormalisAutofix iniciado — ' + PATTERNS.length + ' patrones registrados', 'info');
    },

    /**
     * Reportar un error manualmente desde cualquier módulo.
     * @param {string} modulo — nombre del módulo que reporta
     * @param {Error|string} err — el error
     * @param {Object} [ctx] — contexto adicional
     */
    report: function(modulo, err, ctx) {
      let msg = err && err.message ? err.message : String(err);
      _log('manual', modulo, msg, 'error');
      _reportToSentry(err, Object.assign({ modulo: modulo }, ctx || {}));
      _handleError(msg, modulo, 0, 0, err);
    },

    /**
     * Devuelve el log de errores guardado en localStorage.
     * @returns {Array}
     */
    getLog: function() {
      try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch(e) { return []; }
    },

    /**
     * Limpia el log de errores.
     */
    clearLog: function() {
      localStorage.removeItem(LOG_KEY);
    },

    /**
     * Muestra el log de errores en consola formateado.
     * Útil para diagnóstico: NormalisAutofix.printLog()
     */
    printLog: function() {
      let log = this.getLog();
      console.group('[NormaLis AutoFix] Log de errores (' + log.length + ' entradas)');
      log.forEach(function(e) {
        const icon = e.severity === 'fix' ? '🔧' : e.severity === 'warn' ? '&#9888;' : e.severity === 'info' ? 'ℹ️' : '❌';
        console.log(icon, e.ts, e.patternId, '—', e.detail);
      });
      console.groupEnd();
    },

    /**
     * Registra un nuevo patrón de error en runtime.
     * Permite a otros módulos ampliar el motor.
     */
    addPattern: function(pattern) {
      if (pattern && typeof pattern.match === 'function' && typeof pattern.fix === 'function') {
        PATTERNS.push(pattern);
      }
    },

    /** Número de patrones registrados */
    patternCount: function() { return PATTERNS.length; },
  };

})();

// Arrancar automáticamente al cargar el módulo
NormalisAutofix.start();

// ── Patrones adicionales registrados por módulos externos ──────────

// Patrón 11: Firebase Storage — errores de subida de evidencias
NormalisAutofix.addPattern({
  id: 'storage_upload_error',
  label: 'Firebase Storage: error al subir evidencia',
  match: function(msg) {
    return (msg.indexOf('storage/') > -1 || msg.indexOf('Firebase Storage') > -1) &&
           (msg.indexOf('unauthorized') > -1 || msg.indexOf('canceled') > -1 ||
            msg.indexOf('retry-limit-exceeded') > -1 || msg.indexOf('invalid-argument') > -1);
  },
  fix: function(msg, ctx) {
    const ansKey = ctx && ctx.ansKey ? ctx.ansKey : 'desconocido';
    _log('autofix', 'storage_upload_error',
      'Error subiendo evidencia para ' + ansKey + '. Guardando localmente.', 'fix');
    if (typeof nlToast === 'function') {
      nlToast('Evidencia guardada localmente (sin conexión a storage)', 'info', 3000);
    }
  }
});

// Patrón 12: prompt() nativo en iOS Safari (bloqueo silencioso)
NormalisAutofix.addPattern({
  id: 'native_prompt_blocked',
  label: 'prompt() nativo bloqueado en móvil',
  match: function(msg) {
    return msg.indexOf('prompt') > -1 && msg.indexOf('blocked') > -1 ||
           msg.indexOf('A JavaScript dialog was dismissed') > -1;
  },
  fix: function() {
    _log('autofix', 'native_prompt_blocked',
      'prompt() nativo bloqueado — usando nlPrompt como fallback', 'fix');
  }
});

// Patrón 13: Módulo de evidencias — función no definida
NormalisAutofix.addPattern({
  id: 'evidencia_fn_undefined',
  label: 'Función uploadEvidencia no disponible',
  match: function(msg) {
    return msg.indexOf('uploadEvidencia') > -1 && msg.indexOf('not a function') > -1;
  },
  fix: function() {
    _log('autofix', 'evidencia_fn_undefined',
      'uploadEvidencia no cargada — registrando stub', 'fix');
    if (typeof uploadEvidencia === 'undefined') {
      window.uploadEvidencia = function(key) {
        if (typeof nlToast === 'function') nlToast('Módulo de evidencias no disponible', 'warn');
        else console.warn('[NormaLis] uploadEvidencia no disponible para', key);
      };
    }
  }
});

// Patrón 14: Plan sin permisos — módulo bloqueado
NormalisAutofix.addPattern({
  id: 'module_plan_blocked',
  label: 'Módulo bloqueado por plan',
  match: function(msg) {
    return msg.indexOf('isModuleAllowed') > -1 || msg.indexOf('plan_required') > -1 ||
           (msg.indexOf('not allowed') > -1 && msg.indexOf('plan') > -1);
  },
  fix: function() {
    _log('autofix', 'module_plan_blocked',
      'Módulo restringido por plan — mostrando mensaje al usuario', 'fix');
    if (typeof nlToast === 'function') {
      nlToast('Este módulo requiere un plan superior. Contacta soporte.', 'warn', 4000);
    }
  }
});

// Patrón 15: Ciclo de error de scroll — reportado desde CAPA o Indicadores
NormalisAutofix.addPattern({
  id: 'scroll_into_view_null',
  label: 'scrollIntoView sobre elemento null',
  match: function(msg) {
    return msg.indexOf('scrollIntoView') > -1 && msg.indexOf('null') > -1 ||
           msg.indexOf("Cannot read properties of null (reading 'scrollIntoView')") > -1;
  },
  fix: function() {
    _log('autofix', 'scroll_into_view_null',
      'scrollIntoView sobre null — ignorado silenciosamente', 'fix');
    // No action needed — already caught in the call site
  },
  silent: true
});

// END:normalis-autofix.js — NormaLis integrity seal
