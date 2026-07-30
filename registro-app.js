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
  if (v.length >= 8)         score++;
  if (/[A-Z]/.test(v))       score++;
  if (/[0-9]/.test(v))       score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;
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
    inp.type        = show ? 'text' : 'password';
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
  var KEY = 'normalis_reg_attempts';
  var WINDOW_MS = 60 * 60 * 1000; // 1 hora
  var MAX = 3;
  var now = Date.now();
  var attempts;
  try { attempts = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch(e) { attempts = []; }
  attempts = attempts.filter(function(ts){ return now - ts < WINDOW_MS; });
  if(attempts.length >= MAX) {
    var waitMin = Math.ceil((WINDOW_MS - (now - attempts[0])) / 60000);
    showError('Demasiados intentos. Espera ' + waitMin + ' minuto(s) antes de volver a registrarte.');
    return false;
  }
  attempts.push(now);
  try { localStorage.setItem(KEY, JSON.stringify(attempts)); } catch(e) {}
  return true;
}

// Submit final ─────────────────────────────────────
document.getElementById('form-step2').addEventListener('submit', async function(e) {
  e.preventDefault();
  hideError();
  if(!checkRegisterRateLimit()) return;

  var contacto = sanitize(document.getElementById('r-contacto').value.trim());
  var email    = document.getElementById('r-email').value.trim().toLowerCase();
  var pass     = document.getElementById('r-pass').value;
  var pass2    = document.getElementById('r-pass2').value;
  var terms    = document.getElementById('r-terms').checked;

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

  var cred = null;
  try {
    // 1. Crear cuenta Auth
    cred = await auth.createUserWithEmailAndPassword(formData.email, pass);
    var uid = cred.user.uid;

    // 2. Actualizar displayName
    await cred.user.updateProfile({ displayName: formData.nombreContacto });

    // 3. Crear documento Firestore
    await db.collection('usuarios').doc(uid).set({
      rol:            'pendiente',
      nombre:         formData.nombreIPS,
      nombreContacto: formData.nombreContacto,
      cargo:          formData.cargo    || '',
      email:          formData.email,
      telefono:       formData.telefono || '',
      nit:            formData.nit      || '',
      tipoIPS:        formData.tipoIPS  || '',
      ciudad:         formData.ciudad,
      fechaSolicitud: firebase.firestore.FieldValue.serverTimestamp(),
      estado:         'pendiente_aprobacion',
    });

    // 4. Cerrar sesión (espera aprobación del admin)
    await auth.signOut();

    // 5. Notificar admin por email via Worker (best-effort — no bloquea el flujo)
    try {
      fetch('https://normalis.fjfc1984.workers.dev/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'nueva_solicitud_admin',
          data: {
            ips_nombre:      formData.nombreIPS,
            nit:             formData.nit        || '',
            tipo_ips:        formData.tipoIPS    || '',
            ciudad:          formData.ciudad     || '',
            nombre_contacto: formData.nombreContacto,
            cargo:           formData.cargo      || '',
            email:           formData.email,
            telefono:        formData.telefono   || '',
            uid:             uid
          }
        })
      }).catch(function() {}); // silencioso — el registro ya ocurrió
    } catch(_) {}

    // 6. Tracking GA4
    try { window.NL && window.NL.trackRegister(formData.tipoIPS, formData.ciudad); } catch(_) {}

    // 7. Mostrar pantalla de éxito
    document.getElementById('success-ips').textContent   = formData.nombreIPS;
    document.getElementById('success-email').textContent = formData.email;
    document.getElementById('step2').style.display       = 'none';
    document.getElementById('steps-bar').style.display   = 'none';
    document.getElementById('success-screen').style.display = 'block';

  } catch (err) {
    // ROLLBACK: si la cuenta Auth fue creada pero Firestore falló, eliminar cuenta
    if (cred && cred.user) {
      try {
        await cred.user.delete();
      } catch (deleteErr) {
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
    'auth/email-already-in-use':    'Este correo ya está registrado. ¿Ya tienes cuenta?',
    'auth/invalid-email':           'El correo electrónico no es válido.',
    'auth/weak-password':           'La contraseña es demasiado débil. Usa al menos 8 caracteres.',
    'auth/network-request-failed':  'Error de conexión. Verifica tu internet e intenta de nuevo.',
    'auth/too-many-requests':       'Demasiados intentos. Espera unos minutos antes de continuar.',
    'auth/operation-not-allowed':   'El registro no está habilitado en este momento. Contáctanos.',
  };
  return msgs[code] || 'Error inesperado (' + (code || 'desconocido') + '). Intenta de nuevo.';
}

// Mostrar paso 1 al cargar
document.addEventListener('DOMContentLoaded', function() { showStep(1); });

// END:registro-app.js — NormaLis integrity seal
