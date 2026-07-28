// normalis-pdf.js
// NormaLis — Generación de informes PDF institucionales
// ─────────────────────────────────────────────

function logAuditCompleted(){
  const sc = (typeof calcAuditScore === 'function') ? calcAuditScore() : {};
  if (typeof logActivity === 'function')
    logActivity('auditoria_completada', 'auditoria', 'Puntaje: ' + (sc.score||0) + '% · ' + (sc.si||0) + ' conformes, ' + (sc.no||0) + ' no conformes');
}

// ══════════════════════════════════════════════
// HELPERS INTERNOS
// ══════════════════════════════════════════════

function _pdfCfg(k, def) {
  try { return JSON.parse(localStorage.getItem('normalis_cfg')||'{}')[k] || def; } catch(e) { return def; }
}

function _fmtFecha(d) {
  return (d||new Date()).toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' });
}

function _fmtFechaCorta(d) {
  return (d||new Date()).toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function _codigoDoc(tipo) {
  const nit = _pdfCfg('nit','000') .replace(/\D/g,'').slice(-6);
  const seq = String(Math.floor(Math.random()*900)+100);
  return tipo.toUpperCase() + '-' + nit + '-' + seq + '-' + new Date().getFullYear();
}

function _version() {
  return 'v' + new Date().getFullYear() + '.' + String(new Date().getMonth()+1).padStart(2,'0');
}

// ─── CSS compartido para todos los PDFs ──────────────────────
function _pdfCSS(accentColor) {
  accentColor = accentColor || '#005d50';
  return `
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Segoe UI', Arial, sans-serif; font-size:11px; color:#1a1a1a; background:#fff; }
    @page { margin:18mm 15mm 18mm 15mm; size:A4; }
    @media print {
      body { padding:0; }
      .no-print { display:none !important; }
      .page-break { page-break-before:always; }
      * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
    }
    /* — Header institucional — */
    .hdr { border-bottom:3px solid ${accentColor}; padding-bottom:10px; margin-bottom:16px; display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
    .hdr-logo { width:52px; height:52px; border-radius:8px; background:${accentColor}; display:flex; align-items:center; justify-content:center; color:#fff; font-size:22px; font-weight:900; flex-shrink:0; }
    .hdr-ips h1 { font-size:15px; font-weight:800; color:${accentColor}; }
    .hdr-ips p  { font-size:10px; color:#555; margin-top:2px; line-height:1.4; }
    .hdr-meta { text-align:right; font-size:9.5px; color:#555; line-height:1.8; }
    .hdr-meta b { color:#1a1a1a; }
    /* — Título del documento — */
    .doc-title { background:${accentColor}; color:#fff; border-radius:8px; padding:12px 20px; margin-bottom:16px; text-align:center; }
    .doc-title h2 { font-size:14px; font-weight:800; letter-spacing:.03em; }
    .doc-title p  { font-size:10px; opacity:.85; margin-top:3px; }
    /* — Score hero (auditoría) — */
    .score-hero { display:flex; align-items:center; gap:24px; border:1.5px solid #e5e7eb; border-radius:10px; padding:16px 20px; margin-bottom:16px; }
    .score-circle { width:72px; height:72px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .score-circle span { font-size:24px; font-weight:900; color:#fff; }
    .score-data h3 { font-size:14px; font-weight:800; margin-bottom:4px; }
    .score-data p  { font-size:10px; color:#555; line-height:1.6; }
    .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:9.5px; font-weight:700; margin-top:6px; }
    /* — Secciones — */
    h3.sec { font-size:11px; font-weight:800; color:${accentColor}; text-transform:uppercase; letter-spacing:.06em; border-bottom:1px solid #d1fae5; padding-bottom:4px; margin:18px 0 8px; }
    /* — Tablas — */
    table { width:100%; border-collapse:collapse; font-size:10.5px; margin-bottom:12px; }
    th { background:${accentColor}; color:#fff; padding:6px 8px; text-align:left; font-weight:700; font-size:10px; }
    td { padding:5px 8px; border-bottom:0.5px solid #e5e7eb; vertical-align:top; }
    tr:nth-child(even) td { background:#f9fafb; }
    /* — Meta cards — */
    .meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
    .meta-card { background:#f9fafb; border:0.5px solid #e5e7eb; border-radius:8px; padding:10px 12px; }
    .meta-lbl { font-size:9px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:.05em; margin-bottom:2px; }
    .meta-val { font-size:12px; font-weight:700; color:#1a1a1a; }
    /* — Firma — */
    .firma-grid { display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:40px; }
    .firma-box { border-top:1px solid #1a1a1a; padding-top:8px; }
    .firma-box p  { font-size:10px; line-height:1.7; }
    .firma-box b  { font-size:11px; }
    /* — Footer — */
    .doc-footer { margin-top:24px; padding-top:10px; border-top:0.5px solid #e5e7eb; font-size:9px; color:#888; display:flex; justify-content:space-between; align-items:center; }
    /* — Botones — */
    .print-btn { position:fixed; top:20px; right:20px; background:${accentColor}; color:#fff; border:none; padding:10px 20px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; z-index:9999; box-shadow:0 2px 8px rgba(0,0,0,.2); }
    .print-btn:hover { opacity:.9; }
  `;
}

// ─── Header institucional reutilizable ───────────────────────
function _pdfHeader(opts) {
  opts = opts || {};
  const ips    = opts.ips    || _pdfCfg('nombre', '') || localStorage.getItem('normalis_ips_nombre') || 'Establecimiento de Salud';
  const nit    = opts.nit    || _pdfCfg('nit','');
  const ciudad = opts.ciudad || _pdfCfg('ciudad','') || localStorage.getItem('normalis_ips_ciudad') || '';
  const codigo = opts.codigo || _codigoDoc(opts.tipo || 'DOC');
  const fecha  = _fmtFechaCorta(new Date());
  const version= _version();
  const ini    = ips.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase().slice(0,2);

  return `
  <div class="hdr">
    <div class="hdr-logo">${ini}</div>
    <div class="hdr-ips" style="flex:1">
      <h1>${ips}</h1>
      <p>${nit ? 'NIT: ' + nit : ''}${ciudad ? ' &nbsp;·&nbsp; ' + ciudad : ''}</p>
      <p>Prestador de Servicios de Salud · Habilitado ante la Secretaría de Salud</p>
    </div>
    <div class="hdr-meta">
      <div><b>Código:</b> ${codigo}</div>
      <div><b>Versión:</b> ${version}</div>
      <div><b>Fecha:</b> ${fecha}</div>
      <div><b>Páginas:</b> <span class="page-count">1</span></div>
    </div>
  </div>`;
}

// ─── Footer del documento ────────────────────────────────────
function _pdfFooter(normativa) {
  const hoy = _fmtFechaCorta(new Date());
  return `
  <div class="doc-footer">
    <span>NormaLis · Copiloto de Habilitación Normativa · ${normativa || 'Resolución 3100/2019'}</span>
    <span>Generado: ${hoy} · Documento de uso interno. No reemplaza la visita oficial de habilitación.</span>
  </div>`;
}

// ─── Ventana de impresión ─────────────────────────────────────
function _abrirVentanaPDF(titulo, html, accentColor) {
  const w = window.open('', '_blank', 'width=960,height=740');
  if (!w) { alert('Permite las ventanas emergentes para generar el PDF.'); return; }
  w.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${titulo}</title>
  <style>${_pdfCSS(accentColor)}</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">&#128438; Imprimir / Guardar PDF</button>
${html}
</body>
</html>`);
  w.document.close();
}

// ══════════════════════════════════════════════
// INFORME PDF DE AUDITORÍA DE HABILITACIÓN
// ══════════════════════════════════════════════
function printAuditReport() {
  const r = (typeof calcAuditScore === 'function') ? calcAuditScore() : { score:0, si:0, no:0, parcial:0, na:0, total:0 };
  const score      = r.score || 0;
  const scoreColor = score >= 85 ? '#059669' : score >= 70 ? '#d97706' : '#dc2626';
  const riskLabel  = score >= 85 ? 'Habilitación probable' : score >= 70 ? 'Riesgo moderado' : 'Riesgo alto';
  const riskBg     = score >= 85 ? '#d1fae5' : score >= 70 ? '#fef3c7' : '#fee2e2';
  const riskTxt    = score >= 85 ? '#065f46' : score >= 70 ? '#92400e' : '#991b1b';
  const dir        = _pdfCfg('director', 'Director Técnico');
  const rm         = _pdfCfg('rm', '');
  const hoy        = _fmtFecha(new Date());

  const segNombres = {
    general:'Establecimiento General', domiciliaria:'Salud Domiciliaria',
    imagenologia:'Imagenología', calidad:'Calidad en Salud',
    urgencias:'Urgencias', internacion:'Internación',
    quirurgicos:'Servicios Quirúrgicos', laboratorio:'Laboratorio Clínico',
    transporte:'Transporte Asistencial', rehabilitacion:'Rehabilitación',
    salud_mental:'Salud Mental', odontologia:'Odontología'
  };
  const seg = segNombres[typeof segActivo !== 'undefined' ? segActivo : ''] || 'General';

  // Tabla de áreas
  let areasHTML = '';
  if (typeof areas !== 'undefined' && areas && areas.length && typeof auditAnswers !== 'undefined' && Object.keys(auditAnswers).length > 0) {
    let qOffset = 0;
    areas.forEach(area => {
      let si = 0, no = 0, par = 0, na = 0;
      (area.q||[]).forEach((_, qi) => {
        const v = auditAnswers['q'+(qOffset+qi)];
        if (v==='si') si++; else if (v==='no') no++; else if (v==='parcial') par++; else if (v==='na') na++;
      });
      const eff = (area.q||[]).length - na;
      const pct = eff > 0 ? Math.round(((si + par*0.5)/eff)*100) : 100;
      const c   = pct >= 85 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626';
      const bar = `<div style="background:#e5e7eb;border-radius:4px;height:6px;margin-top:3px"><div style="background:${c};width:${pct}%;height:6px;border-radius:4px"></div></div>`;
      areasHTML += `<tr>
        <td>${area.name || ''}</td>
        <td style="text-align:center">${si}</td>
        <td style="text-align:center">${no}</td>
        <td style="text-align:center">${par}</td>
        <td style="text-align:center"><b style="color:${c}">${pct}%</b>${bar}</td>
      </tr>`;
      qOffset += (area.q||[]).length;
    });
  } else {
    areasHTML = '<tr><td colspan="5" style="text-align:center;color:#888;padding:16px">Complete la auditoría para ver el desglose por área</td></tr>';
  }

  // No conformidades
  let ncHTML = '', ncCount = 0;
  if (typeof areas !== 'undefined' && areas && areas.length && typeof auditAnswers !== 'undefined' && Object.keys(auditAnswers).length > 0) {
    let qOffset = 0;
    areas.forEach(area => {
      (area.q||[]).forEach((q, qi) => {
        const v = auditAnswers['q'+(qOffset+qi)];
        if (v === 'no' || v === 'parcial') {
          ncCount++;
          const c = v === 'no' ? '#dc2626' : '#d97706';
          const lbl = v === 'no' ? 'No cumple' : 'Parcial';
          ncHTML += `<tr>
            <td style="color:${c};font-weight:700;white-space:nowrap">${lbl}</td>
            <td>${area.name || ''}</td>
            <td style="font-size:10px">${q.length > 120 ? q.slice(0,120)+'…' : q}</td>
          </tr>`;
        }
      });
      qOffset += (area.q||[]).length;
    });
  }
  if (!ncHTML) ncHTML = '<tr><td colspan="3" style="text-align:center;color:#059669;padding:12px">Sin no conformidades detectadas en esta auditoría</td></tr>';

  const cod = _codigoDoc('AUD');
  const ips = _pdfCfg('nombre','') || localStorage.getItem('normalis_ips_nombre') || 'Establecimiento de Salud';
  const nit = _pdfCfg('nit','');

  const html = `
${_pdfHeader({ tipo:'AUD', codigo: cod })}

<div class="doc-title">
  <h2>INFORME DE AUDITORÍA SIMULADA DE HABILITACIÓN</h2>
  <p>Conforme a Resolución 3100/2019 &nbsp;·&nbsp; Segmento: ${seg} &nbsp;·&nbsp; ${hoy}</p>
</div>

<div class="score-hero">
  <div class="score-circle" style="background:${scoreColor}">
    <span>${score}</span>
  </div>
  <div class="score-data">
    <h3>Puntaje de Cumplimiento: ${score} / 100</h3>
    <p>Preguntas evaluadas: ${r.total||0} &nbsp;|&nbsp; Conformes: ${r.si||0} &nbsp;|&nbsp; No conformes: ${r.no||0} &nbsp;|&nbsp; Parciales: ${r.parcial||0} &nbsp;|&nbsp; N/A: ${r.na||0}</p>
    <span class="badge" style="background:${riskBg};color:${riskTxt}">${riskLabel}</span>
  </div>
</div>

<div class="meta-grid">
  <div class="meta-card"><div class="meta-lbl">Establecimiento</div><div class="meta-val">${ips}</div></div>
  <div class="meta-card"><div class="meta-lbl">NIT</div><div class="meta-val">${nit || '—'}</div></div>
  <div class="meta-card"><div class="meta-lbl">Director Técnico</div><div class="meta-val">${dir}${rm ? ' · ' + rm : ''}</div></div>
  <div class="meta-card"><div class="meta-lbl">Normativa base</div><div class="meta-val">Resolución 3100 de 2019 y modificaciones</div></div>
</div>

<h3 class="sec">Cumplimiento por área</h3>
<table>
  <tr><th>Área</th><th style="text-align:center;width:40px">Sí</th><th style="text-align:center;width:40px">No</th><th style="text-align:center;width:55px">Parcial</th><th style="text-align:center;width:80px">Puntaje</th></tr>
  ${areasHTML}
</table>

<h3 class="sec">No conformidades detectadas (${ncCount})</h3>
<table>
  <tr><th style="width:80px">Estado</th><th style="width:140px">Área</th><th>Criterio evaluado</th></tr>
  ${ncHTML}
</table>

<h3 class="sec">Recomendaciones prioritarias</h3>
<table>
  <tr><th style="width:28px">#</th><th>Acción recomendada</th><th style="width:70px">Prioridad</th><th style="width:80px">Plazo</th></tr>
  <tr><td>1</td><td>Revisar y actualizar todos los documentos con no conformidades identificadas</td><td style="color:#dc2626;font-weight:700">Alta</td><td>30 días</td></tr>
  <tr><td>2</td><td>Verificar vigencia de RETHUS de todo el talento humano asistencial</td><td style="color:#dc2626;font-weight:700">Alta</td><td>15 días</td></tr>
  <tr><td>3</td><td>Actualizar el REPS si ha habido cambios estructurales en los últimos 30 días</td><td style="color:#d97706;font-weight:700">Media</td><td>30 días</td></tr>
  <tr><td>4</td><td>Programar mantenimiento preventivo de equipos biomédicos pendientes</td><td style="color:#d97706;font-weight:700">Media</td><td>60 días</td></tr>
  <tr><td>5</td><td>Realizar simulacro de evacuación, documentar informe y socializar resultados</td><td style="color:#059669;font-weight:700">Baja</td><td>90 días</td></tr>
</table>

<div class="firma-grid">
  <div class="firma-box">
    <p><b>${dir}</b></p>
    <p>Director Técnico${rm ? ' · ' + rm : ''}</p>
    <p>${ips}</p>
    <p style="font-size:9px;color:#888;margin-top:4px">Firma y sello</p>
  </div>
  <div class="firma-box">
    <p><b>Responsable de Calidad</b></p>
    <p>Cargo: _______________________</p>
    <p>${ips}</p>
    <p style="font-size:9px;color:#888;margin-top:4px">Firma y sello</p>
  </div>
</div>

${_pdfFooter('Resolución 3100/2019')}`;

  _abrirVentanaPDF('Informe Auditoría — ' + ips, html, '#005d50');
}

// ══════════════════════════════════════════════
// PDF PLAN DE MEJORAMIENTO (CAPA)
// ══════════════════════════════════════════════
function printPlanMejoramiento(capas) {
  capas = capas || [];
  const ips  = _pdfCfg('nombre','') || localStorage.getItem('normalis_ips_nombre') || 'Establecimiento de Salud';
  const dir  = _pdfCfg('director', '—');
  const hoy  = _fmtFecha(new Date());
  const cod  = _codigoDoc('CAPA');

  const estadoBadge = { pendiente:'#d97706', en_proceso:'#2563eb', cerrada:'#059669', vencida:'#dc2626' };
  const estadoLabel = { pendiente:'Pendiente', en_proceso:'En proceso', cerrada:'Cerrada', vencida:'Vencida' };

  const filas = capas.length ? capas.map((c,i) => {
    const bc = estadoBadge[c.estado] || '#888';
    const bl = estadoLabel[c.estado] || c.estado || '—';
    return `<tr>
      <td style="white-space:nowrap;font-weight:700">${c.numero || ('CAPA-'+(i+1))}</td>
      <td>${c.descripcion || '—'}</td>
      <td>${c.accionCorrectiva || '—'}</td>
      <td>${c.responsable || '—'}</td>
      <td style="white-space:nowrap">${c.fechaLimite || '—'}</td>
      <td><span style="background:${bc}22;color:${bc};padding:2px 7px;border-radius:10px;font-size:9px;font-weight:700">${bl}</span></td>
    </tr>`;
  }).join('') : '<tr><td colspan="6" style="text-align:center;color:#888;padding:14px">No hay acciones CAPA registradas</td></tr>';

  const html = `
${_pdfHeader({ tipo:'CAPA', codigo: cod })}

<div class="doc-title" style="background:#1e40af">
  <h2>PLAN DE MEJORAMIENTO — PAMEC</h2>
  <p>Ciclo de Auditoría para el Mejoramiento de la Calidad en Salud &nbsp;·&nbsp; ${hoy}</p>
</div>

<div class="meta-grid">
  <div class="meta-card"><div class="meta-lbl">Establecimiento</div><div class="meta-val">${ips}</div></div>
  <div class="meta-card"><div class="meta-lbl">Responsable del PAMEC</div><div class="meta-val">${dir}</div></div>
  <div class="meta-card"><div class="meta-lbl">Total acciones CAPA</div><div class="meta-val">${capas.length}</div></div>
  <div class="meta-card"><div class="meta-lbl">Normativa</div><div class="meta-val">Resolución 1446/2006 · Dec. 1011/2006</div></div>
</div>

<h3 class="sec">Acciones de mejora registradas</h3>
<table>
  <tr>
    <th style="width:72px">Código</th>
    <th>Descripción / hallazgo</th>
    <th>Acción correctiva</th>
    <th style="width:90px">Responsable</th>
    <th style="width:70px">Fecha límite</th>
    <th style="width:70px">Estado</th>
  </tr>
  ${filas}
</table>

<div class="firma-grid">
  <div class="firma-box">
    <p><b>${dir}</b></p>
    <p>Responsable PAMEC</p>
    <p>${ips}</p>
    <p style="font-size:9px;color:#888;margin-top:4px">Firma y sello</p>
  </div>
  <div class="firma-box">
    <p><b>Auditor Externo / Interventor</b></p>
    <p>Cargo: _______________________</p>
    <p style="font-size:9px;color:#888;margin-top:4px">Firma y sello</p>
  </div>
</div>

${_pdfFooter('Resolución 1446/2006 · Dec. 1011/2006')}`;

  _abrirVentanaPDF('Plan de Mejoramiento PAMEC — ' + ips, html, '#1e40af');
}

// ══════════════════════════════════════════════
// PDF INDICADORES DE CALIDAD Res. 256/2016
// ══════════════════════════════════════════════
function printIndicadoresPDF(registros, catalogo) {
  registros = registros || [];
  catalogo  = catalogo  || [];
  const ips = _pdfCfg('nombre','') || localStorage.getItem('normalis_ips_nombre') || 'Establecimiento de Salud';
  const hoy = _fmtFecha(new Date());
  const cod = _codigoDoc('IND');

  const filas = registros.length ? registros.map(r => {
    const ind = (catalogo||[]).find(c => c.id === r.indicId) || {};
    const cumple = ind.meta ? (parseFloat(r.valor) >= parseFloat(ind.meta) ? '059669' : 'dc2626') : '888';
    return `<tr>
      <td style="font-size:10px">${ind.nombre || r.indicId || '—'}</td>
      <td style="text-align:center">${r.periodo || '—'}</td>
      <td style="text-align:center;font-weight:700;color:#${cumple}">${r.valor !== undefined ? r.valor + ' ' + (ind.unidad||'') : '—'}</td>
      <td style="text-align:center;color:#888">${ind.meta !== undefined ? ind.meta + ' ' + (ind.unidad||'') : '—'}</td>
      <td style="font-size:10px;color:#555">${r.observacion || ''}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="5" style="text-align:center;color:#888;padding:14px">No hay registros de indicadores</td></tr>';

  const html = `
${_pdfHeader({ tipo:'IND', codigo: cod })}

<div class="doc-title" style="background:#0e7490">
  <h2>REPORTE DE INDICADORES DE CALIDAD EN SALUD</h2>
  <p>Resolución 256 de 2016 · Ministerio de Salud y Protección Social &nbsp;·&nbsp; ${hoy}</p>
</div>

<h3 class="sec">Indicadores registrados</h3>
<table>
  <tr>
    <th>Indicador</th>
    <th style="text-align:center;width:70px">Período</th>
    <th style="text-align:center;width:80px">Resultado</th>
    <th style="text-align:center;width:80px">Meta</th>
    <th>Observación</th>
  </tr>
  ${filas}
</table>

<div class="firma-grid">
  <div class="firma-box">
    <p><b>Responsable de Calidad</b></p>
    <p>Cargo: _______________________</p>
    <p>${ips}</p>
    <p style="font-size:9px;color:#888;margin-top:4px">Firma y sello</p>
  </div>
  <div class="firma-box">
    <p><b>Director / Gerente</b></p>
    <p>${_pdfCfg('director','—')}</p>
    <p>${ips}</p>
    <p style="font-size:9px;color:#888;margin-top:4px">Firma y sello</p>
  </div>
</div>

${_pdfFooter('Resolución 256/2016')}`;

  _abrirVentanaPDF('Indicadores de Calidad — ' + ips, html, '#0e7490');
}

// END:normalis-pdf.js — NormaLis integrity seal
