// normalis-indicadores.js
// NormaLis — Módulo de Indicadores de Calidad
// Base legal: Resolución 256/2016 — Sistema de Información para la Calidad (SIC)
// Indicadores trazadores del SOGCS — reporte obligatorio al SISPRO
// ─────────────────────────────────────────────
(function() {
  'use strict';
  const escH = function(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };

  // ══════════════════════════════════════════════
  // CATÁLOGO DE INDICADORES — Res. 256/2016 Anexo 1
  // ══════════════════════════════════════════════
  const INDICADORES_CATALOGO = [
    {
      id: 'prop_queja',
      nombre: 'Proporción de pacientes que reportan haber sido tratados con respeto y dignidad',
      formula: '(Pacientes que reportan trato digno / Total encuestados) × 100',
      tipo: 'resultado',
      unidad: '%',
      meta: '≥ 90',
      metaDir: 'gte',
      grupo: 'Experiencia del Paciente',
      normativa: 'Res. 256/2016 Art. 5',
      periodicidad: 'trimestral',
      descripcion: 'Mide la percepción del paciente sobre el trato recibido por el personal.',
    },
    {
      id: 'tasa_infeccion',
      nombre: 'Tasa de infecciones asociadas a la atención en salud (IAAS)',
      formula: '(N° infecciones IAAS confirmadas / Total egresos) × 1000',
      tipo: 'resultado',
      unidad: 'por 1000 egresos',
      meta: '≤ 10',
      metaDir: 'lte',
      grupo: 'Seguridad del Paciente',
      normativa: 'Res. 256/2016 · Res. 3100/2019 estándar 3.17',
      periodicidad: 'mensual',
      descripcion: 'Monitorea infecciones nosocomiales como proxy de higiene y protocolos de esterilización.',
    },
    {
      id: 'tasa_caida',
      nombre: 'Tasa de caídas de pacientes',
      formula: '(N° caídas / Total días-paciente) × 1000',
      tipo: 'resultado',
      unidad: 'por 1000 días-paciente',
      meta: '≤ 3',
      metaDir: 'lte',
      grupo: 'Seguridad del Paciente',
      normativa: 'Res. 256/2016 · Protocolo de Londres',
      periodicidad: 'mensual',
      descripcion: 'Evalúa la efectividad de los protocolos de prevención de caídas.',
    },
    {
      id: 'prop_ulceras',
      nombre: 'Proporción de pacientes con úlceras por presión (adquiridas en la institución)',
      formula: '(Pacientes con úlceras adquiridas / Total pacientes hospitalizados) × 100',
      tipo: 'resultado',
      unidad: '%',
      meta: '≤ 2',
      metaDir: 'lte',
      grupo: 'Seguridad del Paciente',
      normativa: 'Res. 256/2016',
      periodicidad: 'mensual',
      descripcion: 'Refleja calidad del cuidado de enfermería en pacientes de larga estadía.',
    },
    {
      id: 'tasa_reingreso',
      nombre: 'Tasa de reingreso no planeado antes de 30 días',
      formula: '(Reingresos no planeados ≤ 30 días / Total egresos) × 100',
      tipo: 'resultado',
      unidad: '%',
      meta: '≤ 5',
      metaDir: 'lte',
      grupo: 'Continuidad y Efectividad',
      normativa: 'Res. 256/2016',
      periodicidad: 'mensual',
      descripcion: 'Mide la efectividad del alta y la coordinación del cuidado post-hospitalario.',
    },
    {
      id: 'prop_cx_cancelada',
      nombre: 'Proporción de cirugías canceladas',
      formula: '(Cirugías canceladas / Cirugías programadas) × 100',
      tipo: 'proceso',
      unidad: '%',
      meta: '≤ 5',
      metaDir: 'lte',
      grupo: 'Acceso y Oportunidad',
      normativa: 'Res. 256/2016',
      periodicidad: 'mensual',
      descripcion: 'Evalúa eficiencia del proceso quirúrgico y disponibilidad de recursos.',
    },
    {
      id: 'oportunidad_cx',
      nombre: 'Oportunidad de la cirugía programada (días de espera)',
      formula: 'Promedio de días entre solicitud y realización de cirugía electiva',
      tipo: 'proceso',
      unidad: 'días',
      meta: '≤ 30',
      metaDir: 'lte',
      grupo: 'Acceso y Oportunidad',
      normativa: 'Res. 256/2016 · Res. 1552/2013',
      periodicidad: 'mensual',
      descripcion: 'Tiempo de espera para cirugía electiva desde la solicitud médica.',
    },
    {
      id: 'oportunidad_consulta',
      nombre: 'Oportunidad de la consulta médica general (días de espera)',
      formula: 'Promedio de días entre solicitud y consulta médica general efectiva',
      tipo: 'proceso',
      unidad: 'días',
      meta: '≤ 3',
      metaDir: 'lte',
      grupo: 'Acceso y Oportunidad',
      normativa: 'Res. 256/2016 · Res. 1552/2013',
      periodicidad: 'mensual',
      descripcion: 'Oportunidad de acceso a consulta médica en el primer nivel de atención.',
    },
    {
      id: 'prop_transfusion',
      nombre: 'Proporción de eventos adversos relacionados con transfusión',
      formula: '(Eventos adversos transfusionales / Total transfusiones) × 1000',
      tipo: 'resultado',
      unidad: 'por 1000 transfusiones',
      meta: '≤ 1',
      metaDir: 'lte',
      grupo: 'Seguridad del Paciente',
      normativa: 'Res. 256/2016 · Hemovigilancia INS',
      periodicidad: 'mensual',
      descripcion: 'Monitorea seguridad transfusional y cumplimiento del proceso hemoterápico.',
    },
    {
      id: 'prop_complicacion_cx',
      nombre: 'Proporción de complicaciones quirúrgicas',
      formula: '(Cirugías con complicación / Total cirugías) × 100',
      tipo: 'resultado',
      unidad: '%',
      meta: '≤ 3',
      metaDir: 'lte',
      grupo: 'Seguridad del Paciente',
      normativa: 'Res. 256/2016',
      periodicidad: 'mensual',
      descripcion: 'Evalúa la seguridad del proceso quirúrgico y la competencia del equipo.',
    },
    {
      id: 'mortalidad_intrahospitalaria',
      nombre: 'Tasa de mortalidad intrahospitalaria',
      formula: '(N° muertes intrahospitalarias / Total egresos) × 100',
      tipo: 'resultado',
      unidad: '%',
      meta: '≤ 2',
      metaDir: 'lte',
      grupo: 'Resultado Clínico',
      normativa: 'Res. 256/2016',
      periodicidad: 'mensual',
      descripcion: 'Tasa general de mortalidad como indicador de resultado de la atención.',
    },
    {
      id: 'prop_consentimiento',
      nombre: 'Proporción de cirugías con consentimiento informado diligenciado',
      formula: '(Cirugías con CI firmado / Total cirugías) × 100',
      tipo: 'proceso',
      unidad: '%',
      meta: '= 100',
      metaDir: 'eq',
      grupo: 'Derechos del Paciente',
      normativa: 'Res. 256/2016 · Ley 1751/2015 Art. 10',
      periodicidad: 'mensual',
      descripcion: 'Cumplimiento del derecho a la información y consentimiento del paciente.',
    },
    {
      id: 'satisfaccion_usuario',
      nombre: 'Índice de satisfacción global del usuario',
      formula: '(Usuarios satisfechos o muy satisfechos / Total encuestados) × 100',
      tipo: 'resultado',
      unidad: '%',
      meta: '≥ 80',
      metaDir: 'gte',
      grupo: 'Experiencia del Paciente',
      normativa: 'Res. 256/2016 · Res. 1446/2006',
      periodicidad: 'trimestral',
      descripcion: 'Nivel de satisfacción global con la atención recibida.',
    },
    {
      id: 'prop_registro_completo',
      nombre: 'Proporción de historias clínicas con registro completo',
      formula: '(HC con todos los componentes obligatorios / Total HC auditadas) × 100',
      tipo: 'proceso',
      unidad: '%',
      meta: '≥ 95',
      metaDir: 'gte',
      grupo: 'Calidad del Registro',
      normativa: 'Res. 256/2016 · Res. 1995/1999',
      periodicidad: 'trimestral',
      descripcion: 'Calidad documental de la historia clínica como soporte de la atención.',
    },
  ];

  // ══════════════════════════════════════════════
  // ESTADO LOCAL
  // ══════════════════════════════════════════════
  let _indicRegistros = {}; // { indicId: [{ periodo, valor, meta, fecha }] }

  // ══════════════════════════════════════════════
  // RENDER PRINCIPAL
  // ══════════════════════════════════════════════
  function renderIndicadores() {
    const uid = sessionStorage.getItem('normalis_uid');
    if (!uid || typeof db === 'undefined') return;

    db.collection('indicadores').where('uid', '==', uid)
      .onSnapshot(snap => {
        _indicRegistros = {};
        snap.forEach(d => {
          const data = d.data();
          if (!_indicRegistros[data.indicId]) _indicRegistros[data.indicId] = [];
          _indicRegistros[data.indicId].push({ docId: d.id, ...data });
        });
        _renderIndicadoresList();
      }, () => {
        db.collection('indicadores').where('uid', '==', uid).get().then(snap => {
          _indicRegistros = {};
          snap.forEach(d => {
            const data = d.data();
            if (!_indicRegistros[data.indicId]) _indicRegistros[data.indicId] = [];
            _indicRegistros[data.indicId].push({ docId: d.id, ...data });
          });
          _renderIndicadoresList();
        });
      });
  }

  function _renderIndicadoresList() {
    const el = document.getElementById('indic-list');
    if (!el) return;

    // Agrupar por grupo
    const grupos = {};
    INDICADORES_CATALOGO.forEach(ind => {
      if (!grupos[ind.grupo]) grupos[ind.grupo] = [];
      grupos[ind.grupo].push(ind);
    });

    let html = '';
    Object.entries(grupos).forEach(([grupo, inds]) => {
      html += `<div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #f1f5f9">${grupo}</div>`;
      inds.forEach(ind => {
        const registros = (_indicRegistros[ind.id] || []).sort((a, b) => (b.periodo || '').localeCompare(a.periodo || ''));
        const ultimo = registros[0];
        const valor = ultimo ? parseFloat(ultimo.valor) : null;
        const metaNum = parseFloat(ind.meta.replace('≥','').replace('≤','').replace('=','').trim());
        let cumple = null, semaforo = '#94a3b8', semaforoBg = '#f8fafc';
        if (valor !== null && !isNaN(metaNum)) {
          if (ind.metaDir === 'gte') { cumple = valor >= metaNum; }
          else if (ind.metaDir === 'lte') { cumple = valor <= metaNum; }
          else if (ind.metaDir === 'eq') { cumple = valor === metaNum; }
          semaforo = cumple ? '#10b981' : '#ef4444';
          semaforoBg = cumple ? '#d1fae5' : '#fee2e2';
        }
        const histHTML = registros.slice(0, 3).map(r =>
          `<span style="font-size:11px;background:#f1f5f9;padding:2px 8px;border-radius:6px;color:#475569">${escH(r.periodo)}: <strong>${escH(r.valor)}${ind.unidad !== '%' && ind.unidad !== 'días' ? '' : ind.unidad === '%' ? '%' : 'd'}</strong></span>`
        ).join(' ');

        html += `
        <div style="background:#fff;border-radius:12px;padding:16px 18px;border:1px solid #e2e8f0;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
                ${valor !== null ? `<span style="background:${semaforoBg};color:${semaforo};padding:2px 10px;border-radius:20px;font-size:12px;font-weight:800">${cumple ? '✅ Cumple' : '❌ No cumple'} · ${valor}${ind.unidad === '%' ? '%' : ' ' + ind.unidad}</span>` : '<span style="background:#f1f5f9;color:#94a3b8;padding:2px 10px;border-radius:20px;font-size:12px">Sin datos</span>'}
                <span style="background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:20px;font-size:11px">${ind.periodicidad}</span>
              </div>
              <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:2px">${ind.nombre}</div>
              <div style="font-size:11px;color:#94a3b8;margin-bottom:6px">Meta: ${ind.meta} ${ind.unidad} · ${ind.normativa}</div>
              ${histHTML ? `<div style="display:flex;gap:6px;flex-wrap:wrap">${histHTML}</div>` : ''}
            </div>
            <button onclick="abrirIndicModal('${ind.id}')" style="background:#f1f5f9;border:none;padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;flex-shrink:0">+ Registrar</button>
          </div>
          <details style="margin-top:8px">
            <summary style="font-size:11px;color:#94a3b8;cursor:pointer">Fórmula y descripción</summary>
            <div style="margin-top:6px;font-size:12px;color:#475569;background:#f8fafc;padding:10px;border-radius:8px;line-height:1.5">
              <strong>Fórmula:</strong> ${ind.formula}<br>
              <strong>Descripción:</strong> ${ind.descripcion}
            </div>
          </details>
        </div>`;
      });
      html += '</div>';
    });

    el.innerHTML = html;
    _renderIndicStats();
  }

  function _renderIndicStats() {
    let total = INDICADORES_CATALOGO.length, conDatos = 0, cumplen = 0;
    INDICADORES_CATALOGO.forEach(ind => {
      const registros = _indicRegistros[ind.id] || [];
      if (!registros.length) return;
      conDatos++;
      const ultimo = registros.sort((a, b) => (b.periodo || '').localeCompare(a.periodo || ''))[0];
      const valor = parseFloat(ultimo.valor);
      const metaNum = parseFloat(ind.meta.replace('≥','').replace('≤','').replace('=','').trim());
      if (!isNaN(valor) && !isNaN(metaNum)) {
        let ok = false;
        if (ind.metaDir === 'gte') ok = valor >= metaNum;
        else if (ind.metaDir === 'lte') ok = valor <= metaNum;
        else if (ind.metaDir === 'eq') ok = valor === metaNum;
        if (ok) cumplen++;
      }
    });
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('indic-total', total);
    set('indic-con-datos', conDatos);
    set('indic-cumplen', cumplen);
    set('indic-pendientes', total - conDatos);
  }

  // ══════════════════════════════════════════════
  // MODAL REGISTRO DE VALOR
  // ══════════════════════════════════════════════
  let _indicModalId = null;

  function abrirIndicModal(indicId) {
    _indicModalId = indicId;
    const ind = INDICADORES_CATALOGO.find(i => i.id === indicId);
    if (!ind) return;
    const modal = document.getElementById('indic-modal');
    if (!modal) return;

    const titleEl = document.getElementById('indic-modal-title');
    if (titleEl) titleEl.textContent = ind.nombre;
    const metaEl = document.getElementById('indic-modal-meta');
    if (metaEl) metaEl.textContent = `Meta: ${ind.meta} ${ind.unidad} · Fórmula: ${ind.formula}`;

    // Default período = mes actual
    const now = new Date();
    const periodoDefault = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const periodoEl = document.getElementById('indic-periodo');
    if (periodoEl) periodoEl.value = periodoDefault;
    const valorEl = document.getElementById('indic-valor');
    if (valorEl) valorEl.value = '';

    modal.style.display = 'flex';
  }

  function cerrarIndicModal() {
    const modal = document.getElementById('indic-modal');
    if (modal) modal.style.display = 'none';
    _indicModalId = null;
  }

  async function saveIndicador() {
    const uid = sessionStorage.getItem('normalis_uid');
    if (!uid || !_indicModalId) return;

    const periodo = (document.getElementById('indic-periodo')?.value || '').trim();
    const valor   = (document.getElementById('indic-valor')?.value   || '').trim();
    const obs     = (document.getElementById('indic-obs')?.value     || '').trim();

    if (!periodo) { nlToast('El período es obligatorio.', 'warning'); return; }
    if (valor === '' || isNaN(parseFloat(valor))) { nlToast('Ingresa un valor numérico.', 'warning'); return; }

    const btn = document.querySelector('#indic-modal button[onclick="saveIndicador()"]');
    if (btn) { btn.disabled = true; btn.classList.add('btn-loading'); btn.textContent = 'Guardando'; }

    // NIT para dual-write (acceso multi-usuario por IPS)
    const nit = (() => { try { return JSON.parse(localStorage.getItem('normalis_cfg')||'{}').nit || ''; } catch(_){ return ''; } })();

    try {
      // Verificar si ya existe registro para ese período+indicador
      const snap = await db.collection('indicadores')
        .where('uid', '==', uid)
        .where('indicId', '==', _indicModalId)
        .where('periodo', '==', periodo)
        .get();

      if (!snap.empty) {
        // Actualizar existente
        await db.collection('indicadores').doc(snap.docs[0].id).update({
          valor, observacion: obs,
          fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // Crear nuevo con campo nit para acceso por equipo
        await db.collection('indicadores').add({
          uid, nit,                               // dual-write: individual + IPS
          indicId: _indicModalId, periodo, valor, observacion: obs,
          fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
      nlToast('Indicador guardado', 'success');
      cerrarIndicModal();
    } catch(e) {
      nlToast('Error al guardar: ' + e.message, 'error');
      console.error('[normalis-indicadores] saveIndicador:', e);
    } finally {
      if (btn) { btn.disabled = false; btn.classList.remove('btn-loading'); btn.textContent = 'Guardar'; }
    }
  }

  // ══════════════════════════════════════════════
  // EXPORTAR INFORME PDF
  // ══════════════════════════════════════════════
  function exportarIndicadoresPDF() {
    const ipsNombre = localStorage.getItem('normalis_ips_nombre') || 'IPS';
    const fecha = new Date().toLocaleDateString('es-CO', {day:'2-digit',month:'long',year:'numeric'});

    const filas = INDICADORES_CATALOGO.map(ind => {
      const registros = (_indicRegistros[ind.id] || []).sort((a, b) => (b.periodo||'').localeCompare(a.periodo||''));
      const ultimo = registros[0];
      const valor = ultimo ? ultimo.valor : '—';
      const periodo = ultimo ? ultimo.periodo : '—';
      const metaNum = parseFloat(ind.meta.replace('≥','').replace('≤','').replace('=','').trim());
      let estado = '—', color = '#64748b';
      if (ultimo) {
        const v = parseFloat(valor);
        let ok = false;
        if (ind.metaDir === 'gte') ok = v >= metaNum;
        else if (ind.metaDir === 'lte') ok = v <= metaNum;
        else if (ind.metaDir === 'eq') ok = v === metaNum;
        estado = ok ? 'CUMPLE' : 'NO CUMPLE';
        color = ok ? '#10b981' : '#ef4444';
      }
      return `<tr>
        <td style="padding:8px;border:1px solid #e2e8f0;font-size:11px">${ind.nombre.substring(0,60)}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;font-size:11px;text-align:center">${periodo}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;font-size:11px;text-align:center">${valor !== '—' ? valor + ' ' + (ind.unidad === '%' ? '%' : ind.unidad) : '—'}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;font-size:11px;text-align:center">${ind.meta} ${ind.unidad}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;font-size:11px;text-align:center;font-weight:700;color:${color}">${estado}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Indicadores de Calidad — ${ipsNombre}</title>
    <style>body{font-family:Arial,sans-serif;padding:30px;color:#1e293b}h1{color:#00A896;font-size:20px}h2{font-size:13px;color:#475569;font-weight:400;margin-top:4px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#00A896;color:#fff;padding:9px 8px;font-size:11px;text-align:left;border:1px solid #00A896}tr:nth-child(even){background:#f8fafc}.footer{margin-top:30px;font-size:10px;color:#94a3b8}</style></head>
    <body>
    <h1>📊 Indicadores de Calidad — SOGCS</h1>
    <h2>${ipsNombre} · Generado el ${fecha}</h2>
    <table><thead><tr><th>Indicador</th><th>Período</th><th>Valor</th><th>Meta</th><th>Estado</th></tr></thead>
    <tbody>${filas}</tbody></table>
    <div class="footer">Documento generado por NormaLis · Base legal: Res. 256/2016 · Reporte obligatorio SISPRO (anual)</div>
    </body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  }

  // ── Exports ──────────────────────────────
  window.renderIndicadores      = renderIndicadores;
  window.abrirIndicModal        = abrirIndicModal;
  window.cerrarIndicModal       = cerrarIndicModal;
  window.saveIndicador          = saveIndicador;
  window.exportarIndicadoresPDF = exportarIndicadoresPDF;
})();

// END:normalis-indicadores.js — NormaLis integrity seal
