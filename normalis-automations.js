// normalis-automations.js — v2.0
// NormaLis — Motor de Automatismos
// Mejoras: historial de puntajes, escalada automática, mapeo por área real (7 estándares),
//          CAPAs pendientes, auditoría vencida, email enriquecido, dual-normativa 1732/3100
// ─────────────────────────────────────────────

/* ── Historial de puntajes ──────────────────────── */
function saveScoreToHistory(score) {
  try {
    const history = getScoreHistory();
    const entry = { score, ts: Date.now(), fecha: new Date().toISOString() };
    history.unshift(entry);
    if (history.length > 10) history.length = 10;
    localStorage.setItem('normalis_score_history', JSON.stringify(history));
  } catch(e) {}
}

function getScoreHistory() {
  try { return JSON.parse(localStorage.getItem('normalis_score_history') || '[]'); }
  catch(e) { return []; }
}

function getScoreTrend() {
  // { current, previous, delta, trend: 'up'|'down'|'stable' }
  const h = getScoreHistory();
  if (h.length < 2) return { current: h[0]?.score || 0, previous: 0, delta: 0, trend: 'stable' };
  const current  = h[0].score;
  const previous = h[1].score;
  const delta    = current - previous;
  return { current, previous, delta, trend: delta > 2 ? 'up' : delta < -2 ? 'down' : 'stable' };
}

/* ── Orquestadores ──────────────────────────────── */
function runAllAutomations() {
  toast('⚡ Ejecutando todas las reglas…', 'success');
  scanExpiries();
  checkScoreDrop();
  checkWeeklyReport();
  checkRMExpiry();
  checkPendingCAPAs();
  checkNoAuditIn30Days();
  setTimeout(() => renderAutoView(), 400);
}

function runOnOpenAutomations() {
  loadAutoCfg();
  setTimeout(() => { try { scanExpiries();           } catch(e) {} }, 1200);
  setTimeout(() => { try { checkScoreDrop();         } catch(e) {} }, 2000);
  setTimeout(() => { try { checkWeeklyReport();      } catch(e) {} }, 3500);
  setTimeout(() => { try { checkMonthlyPDF();        } catch(e) {} }, 4500);
  setTimeout(() => { try { checkRMExpiry();          } catch(e) {} }, 5500);
  setTimeout(() => { try { checkPendingCAPAs();      } catch(e) {} }, 6500);
  setTimeout(() => { try { checkNoAuditIn30Days();   } catch(e) {} }, 7500);
  if ('Notification' in window && Notification.permission === 'default') {
    const card = document.getElementById('aut-notif-card');
    if (card && isRuleActive('notify_browser') === false) card.style.display = 'block';
  }
}

function runPostAuditAutomations() {
  const sc = calcAuditScore();

  // Guardar puntaje en historial en cada auditoría completada
  if (sc.total > 0) saveScoreToHistory(sc.score);

  /* ── 1. Puntaje crítico < 70 ──────────────────── */
  if (isRuleActive('audit_low') && sc.score < 70) {
    const ncAreas   = _getNCAreas();
    const areaNames = ncAreas.slice(0, 3).map(a => a.name).join(', ');
    const detail    = 'Puntaje: ' + sc.score + '% · ' + sc.no + ' no conformidades'
      + (areaNames ? ' en: ' + areaNames : '');
    logAutoEvent('audit_low', '⚠️ Plan de acción generado (puntaje <70%)', detail, 'nav:cronograma');
    showAutoBanner('⚠️ Puntaje crítico: ' + sc.score + '%',
      'Se detectaron ' + sc.no + ' no conformidades. ¿Ver plan de acción?',
      [{ label: 'Ver plan',   primary: true,  fn: () => nav('cronograma') },
       { label: 'Ver NC',     primary: false, fn: () => nav('resultados') }]);
    pushNotification('Auditoría completada', 'Puntaje: ' + sc.score + '% — Requiere acción correctiva.');
  }

  /* ── 2. Documentos a actualizar según área NC ─── */
  if (isRuleActive('audit_nc_docs') && sc.no > 0) {
    const ncAreas = _getNCAreas();
    const toUpdate = _getDocsForNCAreas(ncAreas);
    if (toUpdate.length > 0) {
      logAutoEvent('audit_nc_docs', '📄 Documentos sugeridos para actualizar',
        toUpdate.slice(0, 4).join(', '), 'nav:generador');
      setTimeout(() => {
        showAutoBanner('📄 ' + toUpdate.length + ' documento(s) a revisar',
          toUpdate.slice(0, 3).join(' · '),
          [{ label: 'Ir al generador', primary: true,  fn: () => nav('generador') },
           { label: 'Ignorar',         primary: false, fn: null }]);
      }, 3000);
    }
  }

  /* ── 3. PDF automático ────────────────────────── */
  if (isRuleActive('auto_pdf_audit')) {
    logAutoEvent('auto_pdf_audit', '🖨️ PDF de auditoría generado automáticamente', '', '');
    setTimeout(() => { if (typeof printAuditReport === 'function') printAuditReport(); }, 1500);
  }
}

/* ── Helpers internos ───────────────────────────── */
function _getNCAreas() {
  // Devuelve [{name, nc, areaId}] para áreas con al menos 1 NC o parcial
  const ncAreas = [];
  if (!window.auditAreas) return ncAreas;
  Object.keys(auditAreas).forEach(areaId => {
    const area = auditAreas[areaId];
    let aNo = 0;
    if (area.questions) {
      area.questions.forEach((_, qi) => {
        const gi = Object.keys(auditAreas).indexOf(areaId);
        const v  = auditAnswers['q' + (gi * 10 + qi)];
        if (v === 'no' || v === 'parcial') aNo++;
      });
    }
    if (aNo > 0) ncAreas.push({ name: area.name || areaId, nc: aNo, areaId });
  });
  return ncAreas;
}

function _getDocsForNCAreas(ncAreas) {
  // Mapeo de los 7 estándares de habilitación (Res. 3100/2019 / Res. 1732/2026) → documentos obligatorios
  const STD_DOC_MAP = {
    talento:         ['Perfiles y Descripción de Cargos', 'Carpetas de Hoja de Vida con Soportes', 'Plan de Educación Continuada'],
    infraestructura: ['Manual de Bioseguridad', 'Plan de Mantenimiento de Planta Física', 'Planos Actualizados de Instalaciones'],
    dotacion:        ['Manual de Tecnovigilancia', 'Plan de Mantenimiento de Equipos', 'Inventario y Hoja de Vida de Equipos'],
    medicamentos:    ['Manual de Farmacovigilancia', 'Listado de Medicamentos Esenciales', 'POE de Dispensación y Almacenamiento'],
    dispositivos:    ['Manual de Farmacovigilancia', 'POE de Dispositivos Médicos'],
    procesos:        ['Protocolos de Atención Prioritarios', 'Guías de Práctica Clínica Adoptadas', 'Plan de Emergencias y Evacuación'],
    historia:        ['Manual de Historia Clínica', 'Política de Gestión de Datos (Habeas Data)', 'POE de Historia Clínica'],
    interdependencia:['Contratos de Apoyo Diagnóstico', 'Manual de Referencia y Contrarreferencia'],
    residuos:        ['Plan de Gestión Integral de Residuos Hospitalarios (PGIRH)'],
    bioseguridad:    ['Manual de Bioseguridad', 'Plan de Prevención de IAAS'],
    farmacia:        ['Manual de Farmacovigilancia', 'POE de Almacenamiento de Medicamentos'],
    emergencias:     ['Plan de Emergencias y Evacuación', 'Mapa de Evacuación Actualizado'],
    equipos:         ['Manual de Tecnovigilancia', 'Plan de Mantenimiento de Equipos'],
    atencion:        ['Protocolos de Atención Prioritarios', 'Guías de Práctica Clínica Adoptadas'],
  };

  const docs  = new Set();
  const ids   = ncAreas.map(a => (a.areaId || a.name || '').toLowerCase());

  Object.keys(STD_DOC_MAP).forEach(key => {
    if (ids.some(id => id.includes(key))) STD_DOC_MAP[key].forEach(d => docs.add(d));
  });

  // Fallback si no hay match: documentos más comunes
  if (docs.size === 0 && ncAreas.length > 0) {
    docs.add('Protocolos de Atención Prioritarios');
    docs.add('Manual de Bioseguridad');
    docs.add('Plan de Mantenimiento de Equipos');
  }
  return [...docs];
}

/* ── Caída de puntaje con tendencia ─────────────── */
function checkScoreDrop() {
  if (!isRuleActive('score_drop')) return;
  const current = calcAuditScore().score;
  if (current === 0) return;

  const lastScore = parseInt(localStorage.getItem('normalis_last_known_score') || '0');

  if (lastScore > 0 && current < lastScore - 5) {
    const delta = lastScore - current;
    logAutoEvent('score_drop', '📉 Caída en puntaje de auditoría',
      'Anterior: ' + lastScore + '% → Actual: ' + current + '% (−' + delta + '%)', '');
    showAutoBanner('📉 El puntaje bajó ' + delta + '%',
      'De ' + lastScore + '% a ' + current + '%. Revisa las áreas afectadas.',
      [{ label: 'Ver resultados', primary: true,  fn: () => nav('resultados') },
       { label: 'Ignorar',        primary: false, fn: null }]);
  }
  if (current > 0) {
    localStorage.setItem('normalis_last_known_score', current);
    saveScoreToHistory(current);
  }
}

/* ── Reporte semanal con tendencia ──────────────── */
function checkWeeklyReport() {
  if (!isRuleActive('weekly_report')) return;
  const lastAudit = JSON.parse(localStorage.getItem('normalis_last_audit') || '{}');
  if (!lastAudit.score && !lastAudit.fecha) return;
  const sc0 = calcAuditScore();
  if (sc0.total === 0) return;

  const last      = parseInt(localStorage.getItem('normalis_last_report_prompt') || '0');
  const daysSince = Math.floor((Date.now() - last) / 86400000);
  const today     = new Date().getDay();

  if (daysSince >= 7 || (today === 1 && daysSince >= 1)) {
    const sc    = calcAuditScore();
    const trend = getScoreTrend();
    const trendEmoji = trend.trend === 'up' ? '📈' : trend.trend === 'down' ? '📉' : '➡️';
    const trendText  = trend.delta !== 0
      ? (trend.delta > 0 ? ' (+' : ' (') + trend.delta + '% vs anterior)'
      : '';
    logAutoEvent('weekly_report', '📊 Reporte semanal disponible',
      'Puntaje: ' + sc.score + '%' + trendText + ' · ' + sc.no + ' NC activas', '');
    showAutoBanner('📊 Reporte semanal ' + trendEmoji,
      'Puntaje: ' + sc.score + '%' + trendText + ' · ' + sc.no + ' NC activas',
      [{ label: 'Ver y enviar', primary: true,  fn: prepareWeeklyEmail },
       { label: 'Después',      primary: false, fn: null }]);
    localStorage.setItem('normalis_last_report_prompt', Date.now());
  }
}

/* ── Vencimiento de RM / Habilitación (con fechas reales) ── */
function checkRMExpiry() {
  if (!isRuleActive('date_alert_rm')) return;
  const rm     = (_cfg && _cfg.rm) || '';
  const rmVenc = (_cfg && _cfg.rm_vencimiento) || (_cfg && _cfg.rmVencimiento) || '';

  if (!rm) {
    logAutoEvent('date_alert_rm', '🏥 RM no configurado',
      'El registro de habilitación no está registrado en Mi Establecimiento', '');
    showAutoBanner('🏥 Registro de habilitación no configurado',
      'Ingresa la fecha de vencimiento de tu RM en Mi Establecimiento para recibir alertas.',
      [{ label: 'Configurar ahora', primary: true,  fn: () => nav('establecimiento') },
       { label: 'Después',          primary: false, fn: null }]);
    return;
  }

  const vencDate = rmVenc ? new Date(rmVenc) : _parseRMDate(rm);
  if (!vencDate || isNaN(vencDate.getTime())) return; // sin fecha parseable: no alertar

  const hoy           = new Date();
  const diasRestantes = Math.floor((vencDate - hoy) / 86400000);
  const fechaStr      = vencDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

  if (diasRestantes < 0) {
    logAutoEvent('date_alert_rm', '🚨 RM VENCIDO',
      'Venció hace ' + Math.abs(diasRestantes) + ' días · ' + fechaStr, '');
    showAutoBanner('🚨 ¡Registro de habilitación VENCIDO!',
      'Venció hace ' + Math.abs(diasRestantes) + ' días. Renueva inmediatamente.',
      [{ label: 'Ver alertas',    primary: true,  fn: () => nav('vencimientos') },
       { label: 'Contactar asesor', primary: false, fn: null }]);
    pushNotification('⚠️ RM VENCIDO', 'Venció hace ' + Math.abs(diasRestantes) + ' días.');
    _autoEscalateEmail('🚨 RM VENCIDO',
      'El RM de ' + ((_cfg && _cfg.nombre) || 'tu IPS') + ' venció hace ' + Math.abs(diasRestantes) + ' días (' + fechaStr + ').');

  } else if (diasRestantes <= 7) {
    logAutoEvent('date_alert_rm', '🚨 RM vence en ' + diasRestantes + ' días', 'Vence el ' + fechaStr, '');
    showAutoBanner('🚨 RM vence en ' + diasRestantes + ' días',
      'Fecha: ' + fechaStr + '. Actúa de inmediato.',
      [{ label: 'Ver vencimientos', primary: true,  fn: () => nav('vencimientos') },
       { label: 'Ignorar',          primary: false, fn: null }]);
    pushNotification('⚠️ RM próximo a vencer', 'Vence en ' + diasRestantes + ' días.');
    _autoEscalateEmail('RM próximo a vencer (' + diasRestantes + ' días)',
      'El RM de ' + ((_cfg && _cfg.nombre) || 'tu IPS') + ' vence en ' + diasRestantes + ' días el ' + fechaStr + '.');

  } else if (diasRestantes <= 30) {
    logAutoEvent('date_alert_rm', '⚠️ RM vence en ' + diasRestantes + ' días', 'Vence el ' + fechaStr, '');
    showAutoBanner('⚠️ RM vence en ' + diasRestantes + ' días',
      'Fecha: ' + fechaStr + '. Prepara la documentación para renovación.',
      [{ label: 'Ver vencimientos', primary: true,  fn: () => nav('vencimientos') },
       { label: 'Después',          primary: false, fn: null }]);
  }
  // Si diasRestantes > 30: sin banner (sin ruido innecesario)
}

function _parseRMDate(rmString) {
  // Extrae fecha de un campo RM libre (p.ej. "RM-2024-123 vence 2026-12-31")
  if (!rmString) return null;
  const m = rmString.match(/(\d{4}[-\/]\d{2}[-\/]\d{2})|(\d{2}[-\/]\d{2}[-\/]\d{4})/);
  if (m) return new Date(m[0].replace(/\//g, '-'));
  return null;
}

/* ── CAPAs pendientes > 30 días ──────────────────── */
function checkPendingCAPAs() {
  if (!isRuleActive('capa_overdue')) return;
  try {
    const capas = JSON.parse(localStorage.getItem('normalis_capas_cache') || '[]');
    const ahora = Date.now();
    const DIAS  = 30;
    const overdue = capas.filter(c => {
      if (c.estado === 'cerrada' || c.estado === 'cerrado') return false;
      const created    = c.fechaCreacion      ? new Date(c.fechaCreacion).getTime()      : 0;
      const lastUpdate = c.fechaActualizacion ? new Date(c.fechaActualizacion).getTime() : created;
      return lastUpdate > 0 && Math.floor((ahora - lastUpdate) / 86400000) > DIAS;
    });
    if (overdue.length > 0) {
      const detail = overdue.length + ' CAPA(s) sin actualización hace más de ' + DIAS + ' días';
      logAutoEvent('capa_overdue', '📋 CAPAs pendientes sin actualizar', detail, 'nav:cronograma');
      showAutoBanner('📋 ' + overdue.length + ' CAPA(s) sin actualizar',
        'Sin actividad por más de ' + DIAS + ' días. Revisa el plan de acción.',
        [{ label: 'Ver CAPAs', primary: true,  fn: () => nav('cronograma') },
         { label: 'Ignorar',   primary: false, fn: null }]);
    }
  } catch(e) {}
}

/* ── Sin auditoría en 30 días ────────────────────── */
function checkNoAuditIn30Days() {
  if (!isRuleActive('audit_overdue')) return;
  try {
    const lastAudit = JSON.parse(localStorage.getItem('normalis_last_audit') || '{}');
    if (!lastAudit.fecha && !lastAudit.ts) return;
    const lastTs            = lastAudit.ts || new Date(lastAudit.fecha).getTime();
    const diasSinAuditoria  = Math.floor((Date.now() - lastTs) / 86400000);
    if (diasSinAuditoria > 30) {
      logAutoEvent('audit_overdue', '⏰ Auditoría no realizada en 30+ días',
        'Última auditoría hace ' + diasSinAuditoria + ' días (recomendado: cada 30 días)', 'nav:auditoria');
      showAutoBanner('⏰ ' + diasSinAuditoria + ' días sin auditoría',
        'La Res. 1732/2026 / Res. 3100/2019 exigen auditoría periódica. Realiza una ahora.',
        [{ label: 'Iniciar auditoría', primary: true,  fn: () => nav('auditoria') },
         { label: 'Después',           primary: false, fn: null }]);
    }
  } catch(e) {}
}

/* ── Escalada automática por email ───────────────── */
function _autoEscalateEmail(asunto, cuerpo) {
  const ejs = JSON.parse(localStorage.getItem('normalis_emailjs') || '{}');
  if (!ejs.publicKey || !ejs.serviceId || !ejs.templateId) return;
  try {
    const sc  = calcAuditScore();
    const est = (_cfg && _cfg.nombre) || 'Establecimiento';
    emailjs.init(ejs.publicKey);
    emailjs.send(ejs.serviceId, ejs.templateId, {
      to_email:           ejs.toEmail || '',
      establecimiento:    est,
      nit:                (_cfg && _cfg.nit)    || '',
      director:           (_cfg && _cfg.director) || '',
      ciudad:             (_cfg && _cfg.ciudad) || 'Colombia',
      fecha:              new Date().toLocaleDateString('es-CO'),
      score:              sc.score + '%',
      status:             '🚨 ALERTA CRÍTICA — ' + asunto,
      total:              sc.total,
      conformes:          sc.si,
      no_conformes:       sc.no,
      parciales:          sc.parcial,
      no_conformidades:   cuerpo,
      tendencia:          '',
    }).then(() => { toast('🚨 Alerta crítica enviada por email', 'warn'); }).catch(() => {});
  } catch(e) {}
}

/* ── Log de eventos ─────────────────────────────── */
function logAutoEvent(ruleId, title, detail, action) {
  if (ruleId === 'weekly_report') {
    try { const sc0 = calcAuditScore(); if (sc0.total === 0) return; } catch(e) {}
  }
  _autoEvents.unshift({ id: Date.now(), ruleId, title, detail, action: action || '', ts: new Date().toISOString() });
  if (_autoEvents.length > 200) _autoEvents.length = 200;
  saveAutoEvents();
  const badge = document.getElementById('auto-sb-badge');
  if (badge) badge.style.display = '';
}

function clearAutoLog() {
  nlConfirm('¿Limpiar el historial de automatismos?').then(function(ok) {
    if (!ok) return;
    _autoEvents = []; saveAutoEvents();
    const badge = document.getElementById('auto-sb-badge');
    if (badge) badge.style.display = 'none';
    renderAutoView(); toast('Historial limpiado', 'success');
  });
}

function isRuleActive(id) {
  if (_autoCfg[id] !== undefined) return _autoCfg[id];
  const def = AUTO_RULES_DEF.find(r => r.id === id);
  return def ? def.active : false;
}

function setRuleActive(id, val) {
  _autoCfg[id] = val; saveAutoCfg();
  if (id === 'notify_browser' && val) requestBrowserNotifications();
}

/* ── Email de reporte enriquecido ─────────────────── */
function sendEmailReport() {
  const sc     = calcAuditScore();
  const est    = (_cfg && _cfg.nombre)   || 'Establecimiento de Salud';
  const nit    = (_cfg && _cfg.nit)      || '';
  const dir    = (_cfg && _cfg.director) || 'Director Técnico';
  const ciudad = (_cfg && _cfg.ciudad)   || 'Colombia';
  const fecha  = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  const score  = sc.score || 0;
  const status = score >= 85 ? 'Habilitación probable' : score >= 70 ? 'Riesgo moderado' : 'Riesgo alto — acción urgente';
  const trend  = getScoreTrend();
  const trendLine = trend.delta !== 0
    ? (trend.delta > 0 ? '📈 +' : '📉 ') + trend.delta + '% vs auditoría anterior'
    : '➡️ Sin variación vs auditoría anterior';

  let ncLines = '';
  if (window.areas && areas.length) {
    let qOff = 0, ncCount = 0;
    areas.forEach(function(area) {
      (area.q || []).forEach(function(q, qi) {
        const v = auditAnswers['q' + (qOff + qi)];
        if ((v === 'no' || v === 'parcial') && ncCount < 5) {
          ncLines += '%0A  • ' + encodeURIComponent((v === 'no' ? '[NO] ' : '[PARCIAL] ') + area.name + ': ' + (q.length > 70 ? q.slice(0, 70) + '…' : q));
          ncCount++;
        }
      });
      qOff += (area.q || []).length;
    });
  }

  const subject = encodeURIComponent('Reporte de Cumplimiento Normativo — ' + est + ' — ' + fecha);
  const body =
    encodeURIComponent('Estimado/a equipo,') +
    '%0A%0A' + encodeURIComponent('Reporte de cumplimiento normativo:') +
    '%0A%0A' + encodeURIComponent('━━━━━━━━━━━━━━━━━━━━━━━━━━━━') +
    '%0A'    + encodeURIComponent('🏥 ESTABLECIMIENTO: ' + est + (nit ? ' · NIT ' + nit : '')) +
    '%0A'    + encodeURIComponent('📍 Ciudad: ' + ciudad) +
    '%0A'    + encodeURIComponent('👤 Director Técnico: ' + dir) +
    '%0A'    + encodeURIComponent('📅 Fecha: ' + fecha) +
    '%0A'    + encodeURIComponent('━━━━━━━━━━━━━━━━━━━━━━━━━━━━') +
    '%0A%0A' + encodeURIComponent('PUNTAJE DE HABILITACIÓN: ' + score + '% — ' + status) +
    '%0A'    + encodeURIComponent(trendLine) +
    '%0A'    + encodeURIComponent('Preguntas evaluadas: ' + sc.total) +
    '%0A'    + encodeURIComponent('✅ Conformes: ' + sc.si + ' | 🔴 No conformes: ' + sc.no + ' | 🟡 Parciales: ' + sc.parcial) +
    (ncLines ? '%0A%0A' + encodeURIComponent('PRINCIPALES NO CONFORMIDADES:') + ncLines : '') +
    '%0A%0A' + encodeURIComponent('━━━━━━━━━━━━━━━━━━━━━━━━━━━━') +
    '%0A'    + encodeURIComponent('Reporte generado con NormaLis — Habilitación IPS · Res. 3100/2019 / Res. 1732/2026');

  const ejsCfg = JSON.parse(localStorage.getItem('normalis_emailjs') || '{}');
  if (ejsCfg.publicKey && ejsCfg.serviceId && ejsCfg.templateId) {
    emailjs.init(ejsCfg.publicKey);
    const ncList = [];
    if (window.areas && areas.length) {
      let qOff2 = 0;
      areas.forEach(function(area) {
        (area.q || []).forEach(function(q, qi) {
          const v = auditAnswers['q' + (qOff2 + qi)];
          if (v === 'no' || v === 'parcial')
            ncList.push((v === 'no' ? '[NO] ' : '[PARCIAL] ') + area.name + ': ' + (q.length > 80 ? q.slice(0, 80) + '…' : q));
        });
        qOff2 += (area.q || []).length;
      });
    }
    emailjs.send(ejsCfg.serviceId, ejsCfg.templateId, {
      to_email:         ejsCfg.toEmail || est,
      establecimiento:  est,
      nit,
      director:         dir,
      ciudad,
      fecha,
      score:            score + '%',
      status,
      total:            sc.total,
      conformes:        sc.si,
      no_conformes:     sc.no,
      parciales:        sc.parcial,
      no_conformidades: ncList.slice(0, 10).join('\n') || 'Ninguna registrada',
      tendencia:        trendLine,
    }).then(function() {
      logAutoEvent('email_report', '📧 Email enviado via EmailJS', est + ' · ' + score + '%', '');
      toast('✅ Email enviado correctamente via EmailJS', 'success');
    }).catch(function(err) {
      console.warn('EmailJS error:', err);
      toast('⚠️ Error EmailJS. Abriendo cliente de correo…', 'warn');
      window.open('mailto:?subject=' + subject + '&body=' + body, '_blank');
    });
  } else {
    window.open('mailto:?subject=' + subject + '&body=' + body, '_blank');
    logAutoEvent('email_report', '📧 Email pre-redactado (configurar EmailJS para envío real)', est + ' · ' + score + '%', '');
    toast('📧 Cliente de correo abierto. Configura EmailJS en Automatismos para envío directo.', 'info');
    setTimeout(function() { showEmailJSSetupHint(); }, 1500);
  }
}

/* ── Recordatorio masivo a equipo (real) ─────────── */
function sendReminderMasivo() {
  const ejs = JSON.parse(localStorage.getItem('normalis_emailjs') || '{}');
  if (!ejs.serviceId || !ejs.templateId || !ejs.publicKey) {
    toast('⚙️ Configura EmailJS en Automatismos para enviar recordatorios reales', 'warn');
    return;
  }
  const sc          = calcAuditScore();
  const est         = (_cfg && _cfg.nombre) || 'Establecimiento';
  const fecha       = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  const staffEmails = JSON.parse(localStorage.getItem('normalis_staff_emails') || '[]');
  const targets     = staffEmails.length > 0 ? staffEmails : (ejs.toEmail ? [ejs.toEmail] : []);

  if (targets.length === 0) {
    toast('⚙️ Agrega destinatarios en la configuración de EmailJS', 'warn');
    return;
  }

  emailjs.init(ejs.publicKey);
  let sent = 0;
  targets.forEach((email, idx) => {
    setTimeout(() => {
      emailjs.send(ejs.serviceId, ejs.templateId, {
        to_email:         email,
        establecimiento:  est,
        nit:              (_cfg && _cfg.nit)      || '',
        director:         (_cfg && _cfg.director) || '',
        ciudad:           (_cfg && _cfg.ciudad)   || 'Colombia',
        fecha,
        score:            sc.score + '%',
        status:           '📢 Recordatorio de cumplimiento normativo — Res. 1732/2026 / Res. 3100/2019',
        total:            sc.total,
        conformes:        sc.si,
        no_conformes:     sc.no,
        parciales:        sc.parcial,
        no_conformidades: 'Recuerda revisar y actualizar las no conformidades asignadas.',
        tendencia:        '',
      }).then(() => {
        sent++;
        if (sent === targets.length) {
          logAutoEvent('bulk_reminder', '📧 Recordatorio enviado a ' + sent + ' destinatario(s)', est, '');
          toast('✅ Recordatorio enviado a ' + sent + ' persona(s)', 'success');
        }
      }).catch(err => console.warn('EmailJS masivo error:', email, err));
    }, idx * 350); // 350ms entre envíos para evitar rate limiting
  });
}

/* ── Reporte semanal enriquecido con tendencia ─────── */
function prepareWeeklyEmail() {
  const sc    = calcAuditScore();
  const est   = (_cfg && _cfg.nombre)   || 'Establecimiento';
  const dir   = (_cfg && _cfg.director) || 'Director';
  const today = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const trend = getScoreTrend();
  const trendLine = trend.delta !== 0
    ? (trend.delta > 0 ? '📈 Tendencia: ↑+' : '📉 Tendencia: ↓') + trend.delta + '% vs auditoría anterior'
    : '➡️ Tendencia: Sin variación';

  // Desglose NC por área
  let ncByArea = '';
  if (window.areas && areas.length) {
    let qOff = 0;
    const areaStats = [];
    areas.forEach(function(area) {
      let aNo = 0, aParcial = 0;
      (area.q || []).forEach(function(_, qi) {
        const v = auditAnswers['q' + (qOff + qi)];
        if (v === 'no') aNo++;
        else if (v === 'parcial') aParcial++;
      });
      if (aNo > 0 || aParcial > 0)
        areaStats.push(area.name + ': ' + aNo + ' NC' + (aParcial ? ', ' + aParcial + ' parc.' : ''));
      qOff += (area.q || []).length;
    });
    if (areaStats.length > 0)
      ncByArea = '%0A' + encodeURIComponent('NC por área: ' + areaStats.slice(0, 5).join(' | '));
  }

  const ejs = JSON.parse(localStorage.getItem('normalis_emailjs') || '{}');
  if (ejs.publicKey && ejs.serviceId && ejs.templateId) {
    emailjs.init(ejs.publicKey);
    emailjs.send(ejs.serviceId, ejs.templateId, {
      to_email:         ejs.toEmail || '',
      establecimiento:  est,
      nit:              (_cfg && _cfg.nit)    || '',
      director:         dir,
      ciudad:           (_cfg && _cfg.ciudad) || 'Colombia',
      fecha:            today,
      score:            sc.score + '%',
      status:           '📊 Reporte Semanal NormaLis',
      total:            sc.total,
      conformes:        sc.si,
      no_conformes:     sc.no,
      parciales:        sc.parcial,
      no_conformidades: trendLine,
      tendencia:        trendLine,
    }).then(() => {
      logAutoEvent('weekly_report', '📊 Reporte semanal enviado via EmailJS', est + ' · ' + sc.score + '%', '');
      toast('✅ Reporte semanal enviado', 'success');
    }).catch(() => {
      _fallbackWeeklyMailto(sc, est, dir, today, trendLine, ncByArea);
    });
  } else {
    _fallbackWeeklyMailto(sc, est, dir, today, trendLine, ncByArea);
  }
  nav('resultados');
}

function _fallbackWeeklyMailto(sc, est, dir, today, trendLine, ncByArea) {
  const body =
    encodeURIComponent('Reporte semanal de cumplimiento normativo') +
    '%0A' + encodeURIComponent('Establecimiento: ' + est) +
    '%0A' + encodeURIComponent('Director: ' + dir) +
    '%0A' + encodeURIComponent('Fecha: ' + today) +
    '%0A%0A' + encodeURIComponent('PUNTAJE DE HABILITACIÓN: ' + sc.score + '%') +
    '%0A' + encodeURIComponent(trendLine) +
    '%0A' + encodeURIComponent('Conformes: ' + sc.si + ' | No conformes: ' + sc.no + ' | Parciales: ' + sc.parcial) +
    (ncByArea || '') +
    '%0A%0A' + encodeURIComponent('Generado con NormaLis · Res. 3100/2019 / Res. 1732/2026');
  const subject = encodeURIComponent('Reporte Semanal NormaLis — ' + est + ' — ' + sc.score + '%');
  window.open('mailto:?subject=' + subject + '&body=' + body);
}

/* ── Test EmailJS ────────────────────────────────── */
function testEmailJS() {
  const ejsCfg = JSON.parse(localStorage.getItem('normalis_emailjs') || '{}');
  if (!ejsCfg.publicKey) { toast('Configura EmailJS primero', 'warn'); return; }
  emailjs.init(ejsCfg.publicKey);
  emailjs.send(ejsCfg.serviceId, ejsCfg.templateId, {
    to_email:         ejsCfg.toEmail || '',
    establecimiento:  (_cfg && _cfg.nombre)   || 'IPS Demo',
    nit:              (_cfg && _cfg.nit)      || '000000000',
    director:         (_cfg && _cfg.director) || 'Director',
    ciudad:           (_cfg && _cfg.ciudad)   || 'Colombia',
    fecha:            new Date().toLocaleDateString('es-CO'),
    score:            '75%',
    status:           'Riesgo moderado (prueba)',
    total:            '40', conformes: '30', no_conformes: '5', parciales: '5',
    no_conformidades: '[PRUEBA] Email de prueba NormaLis · Res. 1732/2026 / Res. 3100/2019',
    tendencia:        '➡️ Sin variación',
  }).then(function() {
    toast('✅ Email de prueba enviado correctamente', 'success');
  }).catch(function(e) {
    toast('❌ Error: ' + JSON.stringify(e), 'error');
  });
}

/* ── Limpiar configuraciones ─────────────────────── */
function clearEmailJSConfig() {
  nlConfirm('¿Borrar configuración de EmailJS?', 'Borrar', '#ef4444').then(function(ok) {
    if (!ok) return;
    localStorage.removeItem('normalis_emailjs');
    toast('Configuración eliminada', 'info');
    renderEmailJSConfig();
  });
}

function clearFirebaseConfig() {
  nlConfirm('¿Desconectar Firebase? Los datos quedarán solo en este navegador.', 'Desconectar', '#ef4444').then(function(ok) {
    if (!ok) return;
    localStorage.removeItem('normalis_firebase');
    _fb = null; _db = null; _fbSyncing = false; _fbOrgId = null;
    toast('Firebase desconectado', 'info');
    renderFirebaseConfig();
  });
}

// END:normalis-automations.js — NormaLis integrity seal
