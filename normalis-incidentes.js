// normalis-incidentes.js
// NormaLis — Módulo de Eventos Adversos y Protocolo de Londres v2.0
// Migrado de localStorage → Firestore con análisis de causas estructurado
// ─────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════
// CONSTANTES Y CLASIFICACIONES
// ═══════════════════════════════════════════════════════════════════

const NCCMERP_CATEGORIAS = {
  near_miss:  { label: '⚪ Near Miss',     color: '#94a3b8', bg: '#f1f5f9', desc: 'El error no llegó al paciente' },
  sin_danio:  { label: '🟢 Sin daño',      color: '#10b981', bg: '#ecfdf5', desc: 'Llegó al paciente pero no causó daño' },
  leve:       { label: '🔵 Daño leve',     color: '#3b82f6', bg: '#eff6ff', desc: 'Daño temporal, requirió intervención mínima' },
  moderado:   { label: '🟡 Daño moderado', color: '#f59e0b', bg: '#fffbeb', desc: 'Daño temporal, requirió intervención significativa' },
  grave:      { label: '🔴 Daño grave',    color: '#ef4444', bg: '#fef2f2', desc: 'Daño permanente o requirió intervención mayor' },
  muerte:     { label: '⚫ Muerte',         color: '#1e293b', bg: '#f8fafc', desc: 'El evento contribuyó a la muerte del paciente' }
};

const TIPOS_EVENTO = [
  'Medicación / Dosis incorrecta',
  'Caída del paciente',
  'Identificación incorrecta del paciente',
  'Infección asociada a la atención (IAAS)',
  'Complicación de procedimiento',
  'Falla de equipo biomédico',
  'Reacción adversa a medicamento',
  'Quemadura / Lesión por presión',
  'Error de diagnóstico',
  'Error de comunicación entre profesionales',
  'Evento relacionado con transfusión',
  'Otro'
];

// Factores causales del Protocolo de Londres
const PROTOCOLO_LONDRES_FACTORES = {
  paciente:    { label: '👤 Factores del Paciente',      items: ['Complejidad de la enfermedad', 'Barreras de comunicación (idioma, cognición)', 'No adherencia del paciente', 'Condición emocional / psicológica'] },
  tarea:       { label: '📋 Tarea y Tecnología',         items: ['Protocolos ausentes o no disponibles', 'Guías desactualizadas o ambiguas', 'Falla de equipos o tecnología', 'Diseño de tarea complejo o propenso a error'] },
  individuo:   { label: '🧑‍⚕️ Factores Individuales',  items: ['Conocimiento o habilidades insuficientes', 'Carga de trabajo excesiva', 'Fatiga o estrés del profesional', 'Falta de supervisión o experiencia'] },
  equipo:      { label: '👥 Factores del Equipo',        items: ['Comunicación verbal deficiente entre equipo', 'Falta de liderazgo claro', 'Ausencia de cultura de reporte de errores', 'Fallas en el traspaso de turno'] },
  ambiente:    { label: '🏥 Ambiente de Trabajo',        items: ['Dotación de personal inadecuada', 'Condiciones físicas del ambiente (luz, ruido)', 'Falta de insumos o materiales', 'Distribución inadecuada del espacio'] },
  organizacion:{ label: '🏛️ Organización y Gestión',   items: ['Ausencia de política de seguridad del paciente', 'Prioridades institucionales en conflicto', 'Recursos financieros insuficientes', 'Cultura organizacional punitiva'] },
  contexto:    { label: '⚖️ Contexto Institucional',    items: ['Regulaciones externas inflexibles', 'Financiamiento del sistema de salud', 'Historia de incidentes similares no atendidos', 'Presión por indicadores de productividad'] }
};

// ═══════════════════════════════════════════════════════════════════
// ESTADO LOCAL
// ═══════════════════════════════════════════════════════════════════

let _incidentes_cache = [];
let _incidentes_unsubscribe = null;

// ═══════════════════════════════════════════════════════════════════
// INICIALIZACIÓN Y CARGA DESDE FIRESTORE
// ═══════════════════════════════════════════════════════════════════

function initIncidentes() {
  const uid = sessionStorage.getItem('normalis_uid');
  if (!uid || typeof firebase === 'undefined') return;

  // Migrar datos legacy de localStorage si existen
  _migrarIncidentesLegacy(uid);

  // Suscripción en tiempo real
  if (_incidentes_unsubscribe) _incidentes_unsubscribe();
  const db = firebase.firestore();
  _incidentes_unsubscribe = db.collection('usuarios').doc(uid)
    .collection('incidentes')
    .orderBy('fechaISO', 'desc')
    .onSnapshot(snap => {
      _incidentes_cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderIncidentes();
    }, err => {
      console.warn('NormaLis incidentes — error Firestore:', err);
      // Fallback a cache local
      renderIncidentes();
    });
}

async function _migrarIncidentesLegacy(uid) {
  const legacyRaw = localStorage.getItem('normalis_incidentes');
  if (!legacyRaw) return;
  try {
    const legacy = JSON.parse(legacyRaw);
    if (!legacy.length) return;
    const db = firebase.firestore();
    const batch = db.batch();
    legacy.forEach(inc => {
      const ref = db.collection('usuarios').doc(uid).collection('incidentes').doc();
      batch.set(ref, {
        tipo: inc.tipo || 'Otro',
        nccmerp: inc.severidad === 'critico' ? 'grave' : (inc.severidad === 'moderado' ? 'moderado' : 'leve'),
        descripcion: inc.desc || '',
        accionInmediata: inc.accion || '',
        responsable: inc.responsable || '',
        estado: inc.estado || 'Abierto',
        fechaISO: new Date().toISOString(),
        fecha: inc.fecha || new Date().toLocaleDateString('es-CO'),
        londresFactores: {},
        causaRaiz: '',
        uid,
        migradoDeLegacy: true
      });
    });
    await batch.commit();
    localStorage.removeItem('normalis_incidentes');
    console.log('NormaLis: incidentes legacy migrados a Firestore');
  } catch (e) {
    console.warn('NormaLis: error migrando incidentes legacy', e);
  }
}

// ═══════════════════════════════════════════════════════════════════
// MODAL — ABRIR / CERRAR
// ═══════════════════════════════════════════════════════════════════

function openIncidenteForm() {
  _renderModalIncidente();
  document.getElementById('incidente-modal').style.display = 'flex';
}

function closeIncidenteModal() {
  document.getElementById('incidente-modal').style.display = 'none';
}

// ═══════════════════════════════════════════════════════════════════
// CONSTRUCCIÓN DINÁMICA DEL MODAL CON PROTOCOLO DE LONDRES
// ═══════════════════════════════════════════════════════════════════

function _renderModalIncidente() {
  const modal = document.getElementById('incidente-modal');
  if (!modal) return;

  const nccmerpOpts = Object.entries(NCCMERP_CATEGORIAS)
    .map(([k, v]) => `<option value="${k}">${v.label} — ${v.desc}</option>`).join('');

  const tiposOpts = TIPOS_EVENTO.map(t => `<option value="${t}">${t}</option>`).join('');

  const londreSections = Object.entries(PROTOCOLO_LONDRES_FACTORES).map(([key, grupo]) => `
    <div style="margin-bottom:12px">
      <div style="font-weight:600;font-size:13px;color:#334155;margin-bottom:6px">${grupo.label}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        ${grupo.items.map(item => `
          <label style="display:flex;align-items:flex-start;gap:6px;font-size:12px;color:#475569;cursor:pointer;padding:4px 6px;border-radius:6px;border:1px solid #e2e8f0">
            <input type="checkbox" name="londres_${key}" value="${item}" style="margin-top:2px;accent-color:#0d9488">
            <span>${item}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');

  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:min(780px,95vw);max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.2);display:flex;flex-direction:column">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0d9488,#0369a1);padding:20px 24px;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="color:#fff;font-size:18px;font-weight:700">🔔 Nuevo Evento Adverso</div>
          <div style="color:rgba(255,255,255,0.8);font-size:12px;margin-top:2px">Protocolo de Londres — Análisis de causas raíz</div>
        </div>
        <button onclick="closeIncidenteModal()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:18px;line-height:1">×</button>
      </div>

      <!-- Body -->
      <div style="padding:24px;display:flex;flex-direction:column;gap:16px">

        <!-- Paso 1: Qué pasó -->
        <div style="background:#f8fafc;border-radius:10px;padding:16px">
          <div style="font-weight:700;color:#0f172a;margin-bottom:12px;font-size:14px">📌 Paso 1 — ¿Qué ocurrió?</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px">Tipo de evento</label>
              <select id="inc-tipo" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
                ${tiposOpts}
              </select>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px">Fecha y hora del evento</label>
              <input type="datetime-local" id="inc-fecha-evento" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box" value="${new Date().toISOString().slice(0,16)}">
            </div>
          </div>
          <div style="margin-bottom:12px">
            <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px">Clasificación NCCMERP (severidad)</label>
            <select id="inc-nccmerp" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
              ${nccmerpOpts}
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px">Descripción del evento <span style="color:#ef4444">*</span></label>
            <textarea id="inc-desc" rows="3" placeholder="Describa qué ocurrió, en qué contexto, y qué paciente se vio involucrado..." style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;resize:vertical;box-sizing:border-box"></textarea>
          </div>
        </div>

        <!-- Paso 2: Protocolo de Londres -->
        <div style="background:#f8fafc;border-radius:10px;padding:16px">
          <div style="font-weight:700;color:#0f172a;margin-bottom:4px;font-size:14px">🔍 Paso 2 — Protocolo de Londres (factores causales)</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:12px">Marque todos los factores que contribuyeron al evento. Esta información es confidencial y sirve para mejorar los procesos.</div>
          ${londreSections}
        </div>

        <!-- Paso 3: Causa raíz y acciones -->
        <div style="background:#f8fafc;border-radius:10px;padding:16px">
          <div style="font-weight:700;color:#0f172a;margin-bottom:12px;font-size:14px">🎯 Paso 3 — Causa raíz y acciones</div>
          <div style="margin-bottom:12px">
            <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px">Causa raíz identificada</label>
            <textarea id="inc-causa-raiz" rows="2" placeholder="Con base en los factores marcados, ¿cuál fue la causa principal del evento?" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;resize:vertical;box-sizing:border-box"></textarea>
          </div>
          <div style="margin-bottom:12px">
            <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px">Acciones inmediatas tomadas</label>
            <textarea id="inc-accion" rows="2" placeholder="¿Qué se hizo de inmediato para atender al paciente y controlar el evento?" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;resize:vertical;box-sizing:border-box"></textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px">Responsable del seguimiento</label>
              <input type="text" id="inc-responsable" placeholder="Nombre del profesional" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px">Área / Servicio</label>
              <input type="text" id="inc-area" placeholder="Ej: UCI, Urgencias, Hospitalización" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
            </div>
          </div>
        </div>

        <!-- Nota sobre CAPA automática -->
        <div id="inc-capa-aviso" style="display:none;background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px;font-size:12px;color:#92400e">
          ⚡ <strong>Aviso:</strong> Los eventos de tipo <em>grave</em> o <em>muerte</em> generan automáticamente una CAPA (Plan de Mejoramiento) en el módulo PAMEC al guardar.
        </div>

      </div>

      <!-- Footer -->
      <div style="padding:16px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:10px">
        <button onclick="closeIncidenteModal()" style="padding:10px 20px;border:1px solid #e2e8f0;background:#fff;border-radius:8px;cursor:pointer;font-size:13px;color:#64748b">Cancelar</button>
        <button onclick="saveIncidente()" style="padding:10px 24px;background:linear-gradient(135deg,#0d9488,#0369a1);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">💾 Guardar evento</button>
      </div>
    </div>
  `;

  // Mostrar aviso de CAPA automática al cambiar severidad
  const nccmerpSel = document.getElementById('inc-nccmerp');
  if (nccmerpSel) {
    nccmerpSel.addEventListener('change', () => {
      const aviso = document.getElementById('inc-capa-aviso');
      if (aviso) aviso.style.display = ['grave','muerte'].includes(nccmerpSel.value) ? 'block' : 'none';
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// GUARDAR EVENTO EN FIRESTORE
// ═══════════════════════════════════════════════════════════════════

async function saveIncidente() {
  const uid = sessionStorage.getItem('normalis_uid');
  const nit = JSON.parse(localStorage.getItem('normalis_cfg') || '{}').nit || '';

  const desc = (document.getElementById('inc-desc')?.value || '').trim();
  if (!desc) {
    if (typeof toast === 'function') toast('Por favor describa el evento', 'warning');
    return;
  }

  const nccmerp    = document.getElementById('inc-nccmerp')?.value || 'leve';
  const tipo       = document.getElementById('inc-tipo')?.value || 'Otro';
  const causaRaiz  = document.getElementById('inc-causa-raiz')?.value?.trim() || '';
  const accion     = document.getElementById('inc-accion')?.value?.trim() || '';
  const responsable= document.getElementById('inc-responsable')?.value?.trim() || '';
  const area       = document.getElementById('inc-area')?.value?.trim() || '';
  const fechaEvento= document.getElementById('inc-fecha-evento')?.value || new Date().toISOString().slice(0,16);

  // Recopilar factores del Protocolo de Londres
  const londresFactores = {};
  Object.keys(PROTOCOLO_LONDRES_FACTORES).forEach(key => {
    const checked = [...document.querySelectorAll(`input[name="londres_${key}"]:checked`)].map(cb => cb.value);
    if (checked.length) londresFactores[key] = checked;
  });

  const ahora = new Date();
  const incidente = {
    uid, nit, tipo, nccmerp,
    descripcion: desc,
    causaRaiz,
    accionInmediata: accion,
    responsable, area,
    londresFactores,
    fechaEvento: fechaEvento,
    fechaISO: ahora.toISOString(),
    fecha: ahora.toLocaleDateString('es-CO'),
    estado: 'Abierto',
    version: 2
  };

  try {
    const db = firebase.firestore();
    const docRef = await db.collection('usuarios').doc(uid).collection('incidentes').add(incidente);

    // Crear CAPA automática en PAMEC si el evento es grave o fatal
    if (['grave', 'muerte'].includes(nccmerp)) {
      await _crearCapaAutomatica(uid, nit, docRef.id, incidente);
    }

    closeIncidenteModal();
    if (typeof toast === 'function') toast('Evento registrado correctamente', 'success');
    if (typeof logAction === 'function') logAction('evento_adverso_registrado', `${tipo} — ${NCCMERP_CATEGORIAS[nccmerp]?.label}`);

  } catch (err) {
    console.error('NormaLis incidentes — error al guardar:', err);
    if (typeof toast === 'function') toast('Error al guardar. Intente de nuevo.', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════
// CAPA AUTOMÁTICA EN PAMEC (para eventos graves/muerte)
// ═══════════════════════════════════════════════════════════════════

async function _crearCapaAutomatica(uid, nit, incidenteId, inc) {
  try {
    const db = firebase.firestore();
    const ahora = new Date();
    const fechaLimite = new Date(ahora.getTime() + 15 * 24 * 60 * 60 * 1000); // +15 días

    await db.collection('capas').add({
      uid, nit,
      codigo: `CAPA-EA-${Date.now()}`,
      origen: 'evento_adverso',
      eventoAdversoId: incidenteId,
      titulo: `Evento adverso ${NCCMERP_CATEGORIAS[inc.nccmerp]?.label}: ${inc.tipo}`,
      descripcion: `Evento registrado el ${inc.fecha}. ${inc.descripcion}`,
      causaRaiz: inc.causaRaiz || 'Pendiente de análisis completo',
      responsable: inc.responsable || '',
      area: inc.area || '',
      estado: 'Abierto',
      fasePHVA: 'Planear',
      fechaCreacion: ahora.toISOString(),
      fechaLimite: fechaLimite.toLocaleDateString('es-CO'),
      acciones: [],
      prioridad: inc.nccmerp === 'muerte' ? 'Alta' : 'Media',
      autoGenerada: true
    });

    if (typeof toast === 'function') {
      setTimeout(() => toast('⚡ CAPA creada automáticamente en PAMEC', 'info'), 1200);
    }
  } catch (e) {
    console.warn('NormaLis: no se pudo crear CAPA automática', e);
  }
}

// ═══════════════════════════════════════════════════════════════════
// CAMBIAR ESTADO DE UN INCIDENTE
// ═══════════════════════════════════════════════════════════════════

async function cambiarEstadoInc(incId, nuevoEstado) {
  const uid = sessionStorage.getItem('normalis_uid');
  if (!uid) return;
  try {
    await firebase.firestore()
      .collection('usuarios').doc(uid)
      .collection('incidentes').doc(incId)
      .update({ estado: nuevoEstado });
  } catch (e) {
    console.warn('NormaLis: error actualizando estado de incidente', e);
  }
}

// ═══════════════════════════════════════════════════════════════════
// RENDER — LISTA DE EVENTOS
// ═══════════════════════════════════════════════════════════════════

function renderIncidentes() {
  const list = document.getElementById('incidentes-list');
  if (!list) return;

  const incs = _incidentes_cache;

  // Contadores por categoría
  const count = (cat) => incs.filter(i => i.nccmerp === cat || i.severidad === cat).length;
  const graves  = incs.filter(i => ['grave','muerte'].includes(i.nccmerp || i.severidad)).length;
  const moderados = incs.filter(i => ['moderado'].includes(i.nccmerp || i.severidad)).length;
  const leves   = incs.filter(i => ['leve','sin_danio','near_miss'].includes(i.nccmerp || i.severidad)).length;
  const cerrados= incs.filter(i => i.estado === 'Cerrado').length;

  // Actualizar contadores en el DOM
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('inc-criticos', graves);
  setEl('inc-moderados', moderados);
  setEl('inc-leves', leves);
  setEl('inc-cerrados', cerrados);

  if (!incs.length) {
    list.innerHTML = `<div style="text-align:center;padding:48px;color:#94a3b8">
      <div style="font-size:40px;margin-bottom:12px">🛡️</div>
      <div style="font-weight:600;margin-bottom:4px">Sin eventos registrados</div>
      <div style="font-size:13px">El reporte oportuno de eventos es la base de la seguridad del paciente.</div>
    </div>`;
    return;
  }

  list.innerHTML = incs.map(inc => {
    const cat = NCCMERP_CATEGORIAS[inc.nccmerp] || NCCMERP_CATEGORIAS['leve'];
    const londresTotales = Object.values(inc.londresFactores || {}).flat().length;
    const capaTag = (inc.capaGenerada || ['grave','muerte'].includes(inc.nccmerp))
      ? `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700">⚡ CAPA</span>` : '';

    return `
      <div style="border-left:4px solid ${cat.color};border:1px solid #e2e8f0;border-left-width:4px;border-left-color:${cat.color};border-radius:10px;padding:16px;background:${cat.bg}08;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div style="flex:1;min-width:0">
            <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap">
              <span style="background:${cat.bg};color:${cat.color};padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid ${cat.color}30">${cat.label}</span>
              <span style="color:#64748b;font-size:12px">${inc.tipo || ''}</span>
              ${capaTag}
            </div>
            <div style="font-size:13px;color:#1e293b;margin-bottom:6px;line-height:1.5">${inc.descripcion || inc.desc || ''}</div>
            ${inc.causaRaiz ? `<div style="font-size:12px;color:#7c3aed;margin-bottom:4px">🎯 <strong>Causa raíz:</strong> ${inc.causaRaiz}</div>` : ''}
            ${inc.accionInmediata || inc.accion ? `<div style="font-size:12px;color:#10b981">✅ ${inc.accionInmediata || inc.accion}</div>` : ''}
            <div style="display:flex;gap:12px;margin-top:6px;flex-wrap:wrap">
              ${inc.responsable ? `<span style="font-size:11px;color:#64748b">👤 ${inc.responsable}</span>` : ''}
              ${inc.area ? `<span style="font-size:11px;color:#64748b">🏥 ${inc.area}</span>` : ''}
              <span style="font-size:11px;color:#64748b">📅 ${inc.fecha || ''}</span>
              ${londresTotales ? `<span style="font-size:11px;color:#6366f1">🔍 ${londresTotales} factores causales</span>` : ''}
            </div>
          </div>
          <select onchange="cambiarEstadoInc('${inc.id}',this.value)" style="font-size:11px;padding:4px 6px;border:1px solid #e2e8f0;border-radius:6px;white-space:nowrap;flex-shrink:0">
            <option ${inc.estado==='Abierto'?'selected':''}>Abierto</option>
            <option ${inc.estado==='En seguimiento'?'selected':''}>En seguimiento</option>
            <option ${inc.estado==='Cerrado'?'selected':''}>Cerrado</option>
          </select>
        </div>
      </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════
// INICIALIZAR AL CARGAR LA PÁGINA
// ═══════════════════════════════════════════════════════════════════

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIncidentes);
} else {
  initIncidentes();
}

// END:normalis-incidentes.js — NormaLis integrity seal
