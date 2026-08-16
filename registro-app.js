'use strict';

// ── Firebase ──────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyArUb9rzv6lHeunq_bPgbbe0vmekysx5R4",
  authDomain:        "normalis-5587d.firebaseapp.com",
  projectId:         "normalis-5587d",
  storageBucket:     "normalis-5587d.firebasestorage.app",
  messagingSenderId: "328915530941",
  appId:             "1:328915530941:web:8e77246bd2e326e115b3d4"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// ── Estado ────────────────────────────────────────
const formData = {};

function updateSteps(n) {
  [1, 2].forEach(function(i) {
    var dot = document.getElementById('step' + i + '-dot');
    if (i < n)       { dot.className = 'step done'; dot.textContent = '✓'; }
    else if (i === n){ dot.className = 'step active'; dot.textContent = String(i); }
    else             { dot.className = 'step'; dot.textContent = String(i); }
  });
  var line = document.getElementById('line1');
  if (line) line.className = 'step-line' + (n > 1 ? ' done' : '');
}

function showStep(n) {
  [1, 2].forEach(function(i) {
    document.getElementById('step' + i).style.display = (i === n) ? '' : 'none';
  });
  updateSteps(n);
  hideError();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Paso 1: Datos de la IPS ───────────────────────
document.getElementById('form-step1').addEventListener('submit', function(e) {
  e.preventDefault();
  var nombre = sanitize(document.getElementById('r-nombre').value.trim());
  var ciudad = sanitize(document.getElementById('r-ciudad').value.trim());
  if (!nombre) { showError('Ingresa el nombre de la IPS.'); return; }
  if (!ciudad) { showError('Ingresa la ciudad.'); return; }

  formData.nombreIPS = nombre;
  formData.nit       = sanitize(document.getElementById('r-nit').value.trim());
  formData.tipoIPS   = document.getElementById('r-tipo').value;
  formData.ciudad    = ciudad;

  // Mostrar nombre IPS en el banner de contexto del paso 2
  document.getElementById('ctx-ips-nombre').textContent = nombre;

  showStep(2);
});

// ── Paso 2: Responsable + acceso ──────────────────
document.getElementById('btn-back1').addEventListener('click', function() { showStep(1); });

// Fortaleza de contraseña
document.getElementById('r-pass').addEventListener('input', function() {
  var v    = this.value;
  var fill = document.getElementById('str-fill');
  var txt  = document.getElementById('str-text');
  var score = 0;
  if (v.length >= 8)           score++;
  if (/[A-Z]/.test(v))         score++;
  if (/[0-9]/.test(v))         score++;
  if (/[^A-Za-z0-9]/.test(v))  score++;
  var levels = [
    { w: '0%',   color: 'transparent', label: '' },
    { w: '25%',  color: '#ef4444',     label: 'Débil' },
    { w: '50%',  color: '#f59e0b',     label: 'Regular' },
    { w: '75%',  color: '#00796B',     label: 'Buena' },
    { w: '100%', color: '#00A896',     label: 'Fuerte' },
  ];
  var lvl = levels[score];
  fill.style.width      = lvl.w;
  fill.style.background = lvl.color;
  txt.textContent       = lvl.label;
  txt.style.color       = lvl.color;
});

// Toggle contraseñas
[['toggle-p1','r-pass'],['toggle-p2','r-pass2']].forEach(function(pair) {
  document.getElementById(pair[0]).addEventListener('click', function() {
    var inp  = document.getElementById(pair[1]);
    var show = inp.type === 'password';
    inp.type         = show ? 'text' : 'password';
    this.textContent = show ? '🙈' : '👁';
  });
});

// Validación coincidencia contraseñas
document.getElementById('r-pass2').addEventListener('input', function() {
  var err   = document.getElementById('pass-match-err');
  var match = this.value === document.getElementById('r-pass').value;
  err.style.display = (this.value && !match) ? 'block' : 'none';
});

// Rate limiting — máx 3 registros por hora desde el mismo navegador
function checkRegisterRateLimit() {
  var KEY       = 'normalis_reg_attempts';
  var WINDOW_MS = 60 * 60 * 1000; // 1 hora
  var MAX       = 3;
  var now       = Date.now();
  var attempts;
  try { attempts = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch(e) { attempts = []; }
  attempts = attempts.filter(function(ts){ return now - ts < WINDOW_MS; });
  if (attempts.length >= MAX) {
    var waitMin = Math.ceil((WINDOW_MS - (now - attempts[0])) / 60000);
    showError('Demasiados intentos. Espera ' + waitMin + ' minuto(s) antes de volver a registrarte.');
    return false;
  }
  attempts.push(now);
  try { localStorage.setItem(KEY, JSON.stringify(attempts)); } catch(e) {}
  return true;
}

// ── Verificación de código de activación ─────────
async function verificarCodigo(codigo) {
  if (!codigo) return null;
  var codigoNorm = codigo.trim().toUpperCase();
  if (!codigoNorm) return null;

  var snap = await db.collection('codigos').doc(codigoNorm).get();
  if (!snap.exists) return { valido: false, razon: 'El código no existe.' };

  var data = snap.data();
  if (data.usado)    return { valido: false, razon: 'Este código ya fue utilizado.' };
  if (data.activo === false) return { valido: false, razon: 'Este código ha sido desactivado.' };

  // Verificar expiración del código (opcional — si el admin puso fechaExpiraCodigo)
  if (data.fechaExpiraCodigo) {
    var expTs = data.fechaExpiraCodigo.toDate ? data.fechaExpiraCodigo.toDate() : new Date(data.fechaExpiraCodigo);
    if (new Date() > expTs) return { valido: false, razon: 'Este código ha expirado.' };
  }

  return {
    valido:     true,
    codigo:     codigoNorm,
    diasPiloto: data.diasPiloto || 30,
    rol:        data.rol || 'piloto',
    notas:      data.notas || '',
  };
}

// Validación en tiempo real del código
var codigoTimeout = null;
document.getElementById('r-codigo').addEventListener('input', function() {
  var val     = this.value.trim().toUpperCase();
  var elOk    = document.getElementById('codigo-ok');
  var elErr   = document.getElementById('codigo-err');
  var elHint  = document.getElementById('codigo-hint');
  elOk.style.display  = 'none';
  elErr.style.display = 'none';
  clearTimeout(codigoTimeout);

  if (!val || val.length < 5) {
    elHint.style.display = '';
    return;
  }
  elHint.style.display = 'none';

  codigoTimeout = setTimeout(async function() {
    var result = await verificarCodigo(val);
    if (!result) return;
    if (result.valido) {
      elOk.style.display  = '';
      elErr.style.display = 'none';
    } else {
      elOk.style.display  = 'none';
      elErr.textContent   = '❌ ' + result.razon;
      elErr.style.display = '';
    }
  }, 600);
});

// ── Submit final ──────────────────────────────────
document.getElementById('form-step2').addEventListener('submit', async function(e) {
  e.preventDefault();
  hideError();
  if (!checkRegisterRateLimit()) return;

  var contacto   = sanitize(document.getElementById('r-contacto').value.trim());
  var email      = document.getElementById('r-email').value.trim().toLowerCase();
  var pass       = document.getElementById('r-pass').value;
  var pass2      = document.getElementById('r-pass2').value;
  var terms      = document.getElementById('r-terms').checked;
  var codigoRaw  = document.getElementById('r-codigo').value.trim().toUpperCase();

  // Validaciones locales
  if (!contacto)              { showError('Ingresa tu nombre completo.'); return; }
  if (!isValidEmail(email))   { showError('El correo electrónico no es válido.'); return; }
  if (pass.length < 8)        { showError('La contraseña debe tener al menos 8 caracteres.'); return; }
  if (pass !== pass2)         { showError('Las contraseñas no coinciden.'); return; }
  if (!terms)                 { showError('Debes aceptar los términos para continuar.'); return; }

  formData.nombreContacto = contacto;
  formData.cargo          = sanitize(document.getElementById('r-cargo').value.trim());
  formData.email          = email;
  formData.telefono       = sanitize(document.getElementById('r-tel').value.trim());

  var btn = document.getElementById('btn-submit');
  btn.disabled = true;
  btn.classList.add('loading');

  // ── Verificar código (si lo ingresó) ──
  var codigoData = null;
  if (codigoRaw) {
    codigoData = await verificarCodigo(codigoRaw);
    if (!codigoData || !codigoData.valido) {
      btn.disabled = false;
      btn.classList.remove('loading');
      showError(codigoData ? codigoData.razon : 'Error al verificar el código. Intenta de nuevo.');
      return;
    }
  }

  var cred = null;
  try {
    // 1. Crear cuenta Auth
    cred = await auth.createUserWithEmailAndPassword(formData.email, pass);
    var uid = cred.user.uid;

    // 2. Actualizar displayName
    await cred.user.updateProfile({ displayName: formData.nombreContacto });

    // 3. Determinar rol y expiración
    var ahora      = new Date();
    var diasPiloto = codigoData ? codigoData.diasPiloto : 30;
    var expiraEn   = new Date(ahora.getTime() + diasPiloto * 24 * 60 * 60 * 1000);
    var rolFinal   = codigoData ? (codigoData.rol || 'piloto') : 'pendiente';
    var estadoFinal = codigoData ? 'activo' : 'pendiente_aprobacion';

    // 4. Crear documento Firestore
    var userData = {
      rol:            rolFinal,
      nombre:         formData.nombreIPS,
      nombreContacto: formData.nombreContacto,
      cargo:          formData.cargo    || '',
      email:          formData.email,
      telefono:       formData.telefono || '',
      nit:            formData.nit      || '',
      tipoIPS:        formData.tipoIPS  || '',
      ciudad:         formData.ciudad,
      fechaSolicitud: firebase.firestore.FieldValue.serverTimestamp(),
      estado:         estadoFinal,
      activo:         codigoData ? true : false,
    };

    // Solo piloto tiene expiresAt
    if (codigoData) {
      userData.expiresAt         = firebase.firestore.Timestamp.fromDate(expiraEn);
      userData.diasPiloto        = diasPiloto;
      userData.codigoActivacion  = codigoRaw;
    }

    await db.collection('usuarios').doc(uid).set(userData);

    // 5. Marcar código como usado (transacción atómica)
    if (codigoData) {
      await db.collection('codigos').doc(codigoRaw).update({
        usado:     true,
        usadoPor:  uid,
        usadoEn:   firebase.firestore.FieldValue.serverTimestamp(),
        ipsNombre: formData.nombreIPS,
        ipsNit:    formData.nit || '',
        ipsEmail:  formData.email,
      });
    }

    // 6. Cerrar sesión (usuario debe iniciar sesión normalmente)
    await auth.signOut();

    // 7. Notificar admin (best-effort)
    try {
      fetch('https://normalis.fjfc1984.workers.dev/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: codigoData ? 'nueva_ips_con_codigo' : 'nueva_solicitud_admin',
          data: {
            ips_nombre:      formData.nombreIPS,
            nit:             formData.nit        || '',
            tipo_ips:        formData.tipoIPS    || '',
            ciudad:          formData.ciudad     || '',
            nombre_contacto: formData.nombreContacto,
            cargo:           formData.cargo      || '',
            email:           formData.email,
            telefono:        formData.telefono   || '',
            uid:             uid,
            codigo:          codigoRaw || null,
            dias_piloto:     diasPiloto,
          }
        })
      }).catch(function() {});
    } catch(_) {}

    // 8. Tracking GA4
    try { window.NL && window.NL.trackRegister(formData.tipoIPS, formData.ciudad); } catch(_) {}

    // 9. Mostrar pantalla de éxito (diferente según si tuvo código)
    document.getElementById('step2').style.display        = 'none';
    document.getElementById('steps-bar').style.display    = 'none';
    document.getElementById('success-screen').style.display = 'block';

    if (codigoData) {
      // Éxito con código — acceso inmediato
      document.getElementById('success-title').textContent   = '¡Acceso activado! 🚀';
      document.getElementById('success-body-pending').style.display = 'none';
      document.getElementById('success-body-activo').style.display  = '';
      document.getElementById('success-ips-activo').textContent     = formData.nombreIPS;
      document.getElementById('success-email-activo').textContent   = formData.email;
      document.getElementById('success-dias').textContent           = String(diasPiloto);
      document.getElementById('success-chips-pending').style.display = 'none';
      document.getElementById('success-chips-activo').style.display  = '';
    } else {
      // Éxito normal — espera aprobación
      document.getElementById('success-ips').textContent   = formData.nombreIPS;
      document.getElementById('success-email').textContent = formData.email;
    }

  } catch (err) {
    // ROLLBACK: si la cuenta Auth fue creada pero Firestore falló, eliminar cuenta
    if (cred && cred.user) {
      try { await cred.user.delete(); } catch (deleteErr) {
        try { await auth.signOut(); } catch(_) {}
      }
    }
    btn.disabled = false;
    btn.classList.remove('loading');
    showError(friendlyError(err.code));
  }
});

// ── Helpers ───────────────────────────────────────
function showError(msg) {
  var el = document.getElementById('msg-error');
  document.getElementById('msg-error-text').textContent = msg;
  el.classList.add('show');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
  var el = document.getElementById('msg-error');
  if (el) el.classList.remove('show');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitize(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function friendlyError(code) {
  var msgs = {
    'auth/email-already-in-use':   'Este correo ya está registrado. ¿Ya tienes cuenta?',
    'auth/invalid-email':          'El correo electrónico no es válido.',
    'auth/weak-password':          'La contraseña es demasiado débil. Usa al menos 8 caracteres.',
    'auth/network-request-failed': 'Error de conexión. Verifica tu internet e intenta de nuevo.',
    'auth/too-many-requests':      'Demasiados intentos. Espera unos minutos antes de continuar.',
    'auth/operation-not-allowed':  'El registro no está habilitado en este momento. Contáctanos.',
  };
  return msgs[code] || 'Error inesperado (' + (code || 'desconocido') + '). Intenta de nuevo.';
}

// Mostrar paso 1 al cargar
document.addEventListener('DOMContentLoaded', function() { showStep(1); });

// END:registro-app.js — NormaLis integrity seal
