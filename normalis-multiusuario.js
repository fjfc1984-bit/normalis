// normalis-multiusuario.js
// NormaLis — Sistema de equipo multi-usuario por IPS
// ─────────────────────────────────────────────
// ARQUITECTURA: No modifica queries existentes (que usan normalis_uid).
// Agrega un sistema de invitaciones + vista de equipo encima del modelo actual.
// Los miembros invitados comparten acceso visual, el director mantiene su UID de datos.

// ─── Definición de roles ─────────────────────────────────────

const ROLES_IPS = {
  director:    { label: 'Director / Gerente',  color: '#0f766e', ico: 'ti-crown', desc: 'Acceso total. Gestiona el equipo y la configuración.' },
  auditor:     { label: 'Auditor de Calidad',  color: '#0284c7', ico: 'ti-clipboard-check', desc: 'Realiza auditorías, CAPA, indicadores y reportes.' },
  colaborador: { label: 'Colaborador',          color: '#7c3aed', ico: 'ti-user', desc: 'Consulta y registro de vencimientos propios.' }
};

// ─── Helpers de sesión ────────────────────────────────────────

function getRolIPS() {
  return sessionStorage.getItem('normalis_rol_ips') || 'director';
}

function getNitIPS() {
  try {
    return JSON.parse(localStorage.getItem('normalis_cfg') || '{}').nit || '';
  } catch(e) { return ''; }
}

function generarCodigoInvite() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 10; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

// ─── Render principal ─────────────────────────────────────────

function renderEquipoIPS() {
  const view = document.getElementById('view-equipo');
  if (!view) return;

  const rolActual = getRolIPS();
  const nit       = getNitIPS();
  const uid       = sessionStorage.getItem('normalis_uid') || '';
  const esDir     = rolActual === 'director';

  view.innerHTML = `
    <div class="view-header">
      <h2 class="view-title">Equipo IPS</h2>
      <div class="view-sub">Gestión de accesos y roles para tu establecimiento · NIT: ${nit || '(configura el NIT en Ajustes)'}</div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-size:13px;font-weight:700">Miembros del equipo</div>
        ${esDir ? `<button class="btn btn-primary btn-sm" onclick="abrirModalInvitar()">
          <i class="ti ti-user-plus" style="margin-right:4px;vertical-align:-2px"></i>Invitar miembro
        </button>` : ''}
      </div>
      <div id="equipo-lista-miembros">
        <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px">Cargando equipo…</div>
      </div>
    </div>

    ${esDir ? `
    <div class="card">
      <div style="font-size:13px;font-weight:700;margin-bottom:12px">
        <i class="ti ti-send" style="margin-right:6px;vertical-align:-2px;color:var(--primary)"></i>Invitaciones pendientes
      </div>
      <div id="equipo-lista-invitaciones">
        <div style="text-align:center;padding:12px;color:var(--text-muted);font-size:12px">Sin invitaciones activas</div>
      </div>
    </div>

    <div class="card" style="margin-top:16px;background:var(--surface-1);border:1px dashed var(--border)">
      <div style="font-size:12px;font-weight:700;color:var(--primary);margin-bottom:6px">
        <i class="ti ti-info-circle" style="margin-right:4px"></i>Cómo funciona el sistema de equipo
      </div>
      <div style="font-size:11.5px;color:var(--text-muted);line-height:1.6">
        1. Genera un link de invitación para un colaborador.<br>
        2. El colaborador se registra usando ese link y queda vinculado a tu IPS.<br>
        3. Puedes cambiar su rol en cualquier momento desde esta pantalla.<br>
        <strong>Nota:</strong> Los datos de auditoría, CAPA e indicadores son compartidos entre todo el equipo del mismo NIT.
      </div>
    </div>
    ` : `
    <div class="card" style="background:var(--surface-1)">
      <div style="font-size:12px;color:var(--text-muted);line-height:1.6">
        Tu rol actual es <strong>${ROLES_IPS[rolActual]?.label || rolActual}</strong>.
        Si necesitas acceso a funciones adicionales, contacta al director de tu IPS.
      </div>
    </div>
    `}

    <!-- Modal de invitación -->
    <div id="modal-invitar" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10000;align-items:center;justify-content:center">
      <div class="card" style="width:100%;max-width:440px;margin:24px;position:relative">
        <button onclick="cerrarModalInvitar()" style="position:absolute;top:12px;right:12px;background:none;border:none;cursor:pointer;font-size:18px;color:var(--text-muted)">&times;</button>
        <div style="font-weight:700;font-size:15px;margin-bottom:20px">
          <i class="ti ti-user-plus" style="color:var(--primary);margin-right:6px;vertical-align:-2px"></i>Invitar nuevo miembro
        </div>

        <label style="font-size:12px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px">Email del colaborador</label>
        <input id="inv-email" type="email" class="input" placeholder="correo@clinica.com.co" style="width:100%;margin-bottom:14px" autocomplete="off">

        <label style="font-size:12px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px">Rol a asignar</label>
        <select id="inv-rol" class="select" style="width:100%;margin-bottom:20px">
          <option value="auditor">Auditor de Calidad — acceso a módulos de cumplimiento</option>
          <option value="colaborador">Colaborador — consulta y vencimientos propios</option>
        </select>

        <div id="inv-resultado" style="display:none;margin-bottom:16px;background:var(--surface-1);border-radius:8px;padding:12px;border:1px solid var(--border)">
          <div style="font-size:11px;font-weight:700;color:var(--primary);margin-bottom:6px">
            <i class="ti ti-check"></i> Link de invitación generado (válido 7 días):
          </div>
          <div id="inv-link-texto" style="font-size:11px;color:var(--text-muted);word-break:break-all;margin-bottom:8px"></div>
          <button class="btn btn-outline btn-sm" onclick="copiarLinkInvitacion()">
            <i class="ti ti-copy" style="margin-right:4px"></i>Copiar link
          </button>
        </div>

        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="cerrarModalInvitar()" style="flex:1">Cancelar</button>
          <button class="btn btn-primary btn-sm" onclick="ejecutarCrearInvitacion()" style="flex:1">
            <i class="ti ti-send" style="margin-right:4px"></i>Generar invitación
          </button>
        </div>
      </div>
    </div>
  `;

  if (nit) {
    _cargarMiembrosEquipo(nit, uid);
    if (esDir) _cargarInvitacionesPendientes(nit);
  }
}

// ─── Carga de miembros ────────────────────────────────────────

async function _cargarMiembrosEquipo(nit, uidActual) {
  const el = document.getElementById('equipo-lista-miembros');
  if (!el || !nit || typeof db === 'undefined') return;

  try {
    // Director: usuario que registró esta IPS (nit en su propio documento)
    const snapDir = await db.collection('usuarios')
      .where('nit', '==', nit)
      .limit(5)
      .get();

    // Miembros invitados: tienen nit_ips = nit
    const snapMiembros = await db.collection('usuarios')
      .where('nit_ips', '==', nit)
      .limit(20)
      .get();

    const map = new Map();

    snapDir.forEach(doc => {
      const d = doc.data();
      if (d.rol === 'cliente' || d.rol === 'piloto' || d.rol === 'admin') {
        map.set(doc.id, {
          uid: doc.id, esYo: doc.id === uidActual,
          nombre: d.nombreContacto || d.nombre || '—',
          email: d.email || '—', cargo: d.cargo || '',
          rol_ips: 'director'
        });
      }
    });

    snapMiembros.forEach(doc => {
      if (!map.has(doc.id)) {
        const d = doc.data();
        map.set(doc.id, {
          uid: doc.id, esYo: doc.id === uidActual,
          nombre: d.nombreContacto || d.nombre || '—',
          email: d.email || '—', cargo: d.cargo || '',
          rol_ips: d.rol_ips || 'colaborador'
        });
      }
    });

    const miembros = Array.from(map.values());
    if (!miembros.length) {
      el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:12px">No hay miembros registrados aún.</div>';
      return;
    }

    const rolActual = getRolIPS();
    el.innerHTML = miembros.map(m => {
      const def  = ROLES_IPS[m.rol_ips] || ROLES_IPS.colaborador;
      const ini  = (m.nombre||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
      const puedeEditar = rolActual === 'director' && !m.esYo && m.rol_ips !== 'director';
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="width:38px;height:38px;border-radius:50%;background:${def.color}22;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:${def.color};flex-shrink:0">${ini}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600">
              ${m.nombre}
              ${m.esYo ? '<span style="font-size:10px;background:var(--primary-bg,rgba(0,121,107,.12));color:var(--primary);padding:1px 7px;border-radius:10px;margin-left:4px">tú</span>' : ''}
            </div>
            <div style="font-size:11px;color:var(--text-muted)">${m.email}${m.cargo ? ' · ' + m.cargo : ''}</div>
          </div>
          <div>
            ${puedeEditar ? `
              <select onchange="_cambiarRolMiembro('${m.uid}',this.value)" style="font-size:11px;padding:3px 6px;border:1px solid var(--border);border-radius:6px;background:var(--surface-1);color:var(--text)">
                <option value="auditor" ${m.rol_ips==='auditor'?'selected':''}>Auditor</option>
                <option value="colaborador" ${m.rol_ips==='colaborador'?'selected':''}>Colaborador</option>
              </select>` :
              `<span style="font-size:10px;font-weight:700;padding:3px 9px;border-radius:10px;background:${def.color}22;color:${def.color}">${def.label}</span>`
            }
          </div>
        </div>`;
    }).join('');

  } catch(e) {
    console.error('_cargarMiembrosEquipo:', e);
    el.innerHTML = '<div style="color:var(--danger);font-size:12px;padding:12px">Error al cargar los miembros del equipo.</div>';
  }
}

async function _cargarInvitacionesPendientes(nit) {
  const el = document.getElementById('equipo-lista-invitaciones');
  if (!el || !nit || typeof db === 'undefined') return;
  try {
    const ahora = firebase.firestore.Timestamp.now();
    const snap = await db.collection('invitaciones')
      .where('nit', '==', nit)
      .where('usado', '==', false)
      .where('fechaExpira', '>', ahora)
      .orderBy('fechaExpira', 'desc')
      .limit(10)
      .get();

    if (snap.empty) {
      el.innerHTML = '<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:12px">Sin invitaciones activas</div>';
      return;
    }

    el.innerHTML = snap.docs.map(doc => {
      const d   = doc.data();
      const def = ROLES_IPS[d.rol_ips] || ROLES_IPS.colaborador;
      const exp = d.fechaExpira.toDate().toLocaleDateString('es-CO');
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
          <i class="ti ti-mail" style="color:var(--text-muted);font-size:15px;flex-shrink:0"></i>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600">${d.email}</div>
            <div style="font-size:10px;color:var(--text-muted)">Expira: ${exp}</div>
          </div>
          <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:${def.color}22;color:${def.color}">${def.label}</span>
          <button onclick="_revocarInvitacion('${doc.id}')" style="font-size:10px;padding:3px 8px;border:1px solid var(--danger,#ef4444);border-radius:5px;background:transparent;cursor:pointer;color:var(--danger,#ef4444)">Revocar</button>
        </div>`;
    }).join('');
  } catch(e) {
    console.error('_cargarInvitacionesPendientes:', e);
  }
}

// ─── Acciones de invitación ───────────────────────────────────

function abrirModalInvitar() {
  const m = document.getElementById('modal-invitar');
  if (m) { m.style.display = 'flex'; }
}

function cerrarModalInvitar() {
  const m = document.getElementById('modal-invitar');
  if (m) m.style.display = 'none';
  const r = document.getElementById('inv-resultado');
  if (r) r.style.display = 'none';
  const e = document.getElementById('inv-email');
  if (e) e.value = '';
}

async function ejecutarCrearInvitacion() {
  const email   = (document.getElementById('inv-email')?.value || '').trim().toLowerCase();
  const rol_ips = document.getElementById('inv-rol')?.value || 'auditor';

  if (!email || !email.includes('@') || !email.includes('.')) {
    if (typeof toast === 'function') toast('Ingresa un email válido', 'warning');
    return;
  }

  const nit      = getNitIPS();
  const uid      = sessionStorage.getItem('normalis_uid') || '';
  const nombreIPS= localStorage.getItem('normalis_ips_nombre') ||
                   (JSON.parse(localStorage.getItem('normalis_cfg')||'{}').director) || 'IPS';

  if (!nit) {
    if (typeof toast === 'function') toast('Configura el NIT del establecimiento en Ajustes primero', 'warning');
    return;
  }

  if (typeof db === 'undefined') {
    if (typeof toast === 'function') toast('Error: base de datos no disponible', 'error');
    return;
  }

  const codigo = generarCodigoInvite();
  const expira = new Date();
  expira.setDate(expira.getDate() + 7);

  try {
    await db.collection('invitaciones').doc(codigo).set({
      nit, nombreIPS, email, rol_ips,
      creadoPor: uid,
      codigo,
      usado: false,
      fechaExpira: firebase.firestore.Timestamp.fromDate(expira),
      fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
    });

    const link = `${window.location.origin}/registro.html?invite=${codigo}`;
    const el   = document.getElementById('inv-link-texto');
    if (el) el.textContent = link;
    const res  = document.getElementById('inv-resultado');
    if (res) res.style.display = 'block';

    if (typeof logActivity === 'function')
      logActivity('invitacion_creada', 'equipo', `Invitación para ${email} (${rol_ips})`);
    if (typeof toast === 'function')
      toast(`Invitación generada para ${email}`, 'success');

    _cargarInvitacionesPendientes(nit);
  } catch(e) {
    console.error('ejecutarCrearInvitacion:', e);
    if (typeof toast === 'function') toast('Error al crear la invitación', 'error');
  }
}

function copiarLinkInvitacion() {
  const link = document.getElementById('inv-link-texto')?.textContent || '';
  if (!link) return;
  navigator.clipboard.writeText(link)
    .then(() => { if (typeof toast === 'function') toast('Link copiado al portapapeles', 'success'); })
    .catch(() => {
      const t = document.createElement('textarea');
      t.value = link; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch(_) {}
      document.body.removeChild(t);
      if (typeof toast === 'function') toast('Link copiado', 'success');
    });
}

async function _cambiarRolMiembro(memberUid, nuevoRol) {
  if (!memberUid || !nuevoRol || typeof db === 'undefined') return;
  try {
    await db.collection('usuarios').doc(memberUid).update({ rol_ips: nuevoRol });
    if (typeof toast === 'function')
      toast('Rol actualizado: ' + (ROLES_IPS[nuevoRol]?.label || nuevoRol), 'success');
    if (typeof logActivity === 'function')
      logActivity('rol_ips_actualizado', 'equipo', `UID ${memberUid} → ${nuevoRol}`);
  } catch(e) {
    console.error('_cambiarRolMiembro:', e);
    if (typeof toast === 'function') toast('Error al actualizar el rol', 'error');
  }
}

async function _revocarInvitacion(codigo) {
  if (!codigo || typeof db === 'undefined') return;
  try {
    await db.collection('invitaciones').doc(codigo).update({ usado: true });
    if (typeof toast === 'function') toast('Invitación revocada', 'info');
    _cargarInvitacionesPendientes(getNitIPS());
  } catch(e) {
    console.error('_revocarInvitacion:', e);
    if (typeof toast === 'function') toast('Error al revocar', 'error');
  }
}

// ─── Indicador de rol en el sidebar ──────────────────────────

function aplicarInsigniaRolIPS() {
  const rol = getRolIPS();
  if (rol === 'director') return;
  const def    = ROLES_IPS[rol];
  const sesRole= document.getElementById('ses-role');
  if (sesRole && def) {
    sesRole.textContent = def.label;
    sesRole.style.color = def.color;
  }
}

// ─── Verificar código de invitación (usado desde registro.html) ─

async function verificarCodigoInvitacion(codigo) {
  if (!codigo || typeof db === 'undefined') return null;
  try {
    const doc = await db.collection('invitaciones').doc(codigo).get();
    if (!doc.exists) return null;
    const d = doc.data();
    if (d.usado) return null;
    if (d.fechaExpira && d.fechaExpira.toDate() < new Date()) return null;
    return d; // { nit, nombreIPS, email, rol_ips }
  } catch(e) {
    console.error('verificarCodigoInvitacion:', e);
    return null;
  }
}

// END:normalis-multiusuario.js — NormaLis integrity seal
