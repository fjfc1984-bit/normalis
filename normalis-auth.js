// normalis-auth.js
// NormaLis — módulo extraído del inline script de normativa-app-v2.html
// ─────────────────────────────────────────────

function authLogin(){
  if(!_fbAuth){ authShowMsg('auth-login-msg','Firebase no configurado — modo local activado','error'); setTimeout(function(){ document.getElementById('auth-screen').style.display='none'; },1500); return; }
  var email = document.getElementById('auth-email').value.trim();
  var pass = document.getElementById('auth-pass').value;
  if(!email||!pass){ authShowMsg('auth-login-msg','Completa todos los campos','error'); return; }
  authSetLoading('auth-login-btn', true);
  authShowMsg('auth-login-msg','','');
  _fbAuth.signInWithEmailAndPassword(email, pass)
    .then(function(){ authSetLoading('auth-login-btn', false); })
    .catch(function(err){ authSetLoading('auth-login-btn',false); authShowMsg('auth-login-msg', authErrorMsg(err.code), 'error'); });
}

function authLogout(){
  if(_fbAuth) _fbAuth.signOut().catch(function(){});
  else showAuthScreen();
}

function authRegister(){
  if(!_fbAuth){ document.getElementById('auth-screen').style.display='none'; return; }
  var nombre = document.getElementById('auth-nombre').value.trim();
  var email = document.getElementById('auth-reg-email').value.trim();
  var pass = document.getElementById('auth-reg-pass').value;
  if(!nombre||!email||!pass){ authShowMsg('auth-reg-msg','Completa todos los campos','error'); return; }
  if(pass.length < 6){ authShowMsg('auth-reg-msg','Mínimo 6 caracteres','error'); return; }
  authSetLoading('auth-reg-btn', true);
  authShowMsg('auth-reg-msg','','');
  _fbAuth.createUserWithEmailAndPassword(email, pass)
    .then(function(cred){
      // FIX BUG #3: crear documento Firestore con rol pendiente
      var uid = cred.user.uid;
      var db2; try { db2 = firebase.firestore(); } catch(fe) { db2 = null; }
      var fsWrite = db2
        ? db2.collection('usuarios').doc(uid).set({
            nombre: nombre,
            nombreContacto: nombre,
            email: email,
            rol: 'pendiente',
            activo: false,
            fechaSolicitud: firebase.firestore.FieldValue.serverTimestamp(),
            estado: 'pendiente'
          })
        : Promise.resolve();
      try{
        var cfg2 = JSON.parse(localStorage.getItem('normalis_cfg')||'{}');
        cfg2.nombre = nombre; cfg2.email = email;
        localStorage.setItem('normalis_cfg', JSON.stringify(cfg2));
      }catch(e){}
      return fsWrite.then(function(){ return cred.user.updateProfile({displayName: nombre}); });
    })
    .then(function(){ authSetLoading('auth-reg-btn',false); authShowMsg('auth-reg-msg','¡Solicitud enviada! Un administrador revisará tu cuenta pronto.','success'); })
    .catch(function(err){ authSetLoading('auth-reg-btn',false); authShowMsg('auth-reg-msg', authErrorMsg(err.code), 'error'); });
}

function authResetPass(){
  if(!_fbAuth) return;
  var email = document.getElementById('auth-email').value.trim();
  if(!email){ authShowMsg('auth-login-msg','Ingresa tu correo primero','error'); return; }
  _fbAuth.sendPasswordResetEmail(email)
    .then(function(){ authShowMsg('auth-login-msg','✅ Email de recuperación enviado a '+email,'success'); })
    .catch(function(err){ authShowMsg('auth-login-msg', authErrorMsg(err.code), 'error'); });
}

function authGoogle(){
  if(!_fbAuth){ document.getElementById('auth-screen').style.display='none'; return; }
  var provider = new firebase.auth.GoogleAuthProvider();
  _fbAuth.signInWithPopup(provider)
    .then(function(result){
      // FIX BUG #3: crear doc Firestore si es primer login con Google
      var user = result.user;
      var db2; try { db2 = firebase.firestore(); } catch(fe) { db2 = null; }
      if(!db2) return;
      db2.collection('usuarios').doc(user.uid).get().then(function(doc){
        if(!doc.exists){
          db2.collection('usuarios').doc(user.uid).set({
            nombre: user.displayName || '',
            nombreContacto: user.displayName || '',
            email: user.email || '',
            rol: 'pendiente',
            activo: false,
            fechaSolicitud: firebase.firestore.FieldValue.serverTimestamp(),
            estado: 'pendiente'
          }).catch(function(){});
          authShowMsg('auth-login-msg','Solicitud enviada. Un administrador revisará tu cuenta.','success');
        }
      }).catch(function(){});
    })
    .catch(function(err){
      authShowMsg('auth-login-msg', authErrorMsg(err.code), 'error');
      authShowMsg('auth-reg-msg', authErrorMsg(err.code), 'error');
    });
}

function authErrorMsg(code){
  var msgs = {
    'auth/user-not-found': 'Correo no registrado. Crea una cuenta primero.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-email': 'Correo inválido.',
    'auth/email-already-in-use': 'Este correo ya tiene una cuenta. Ingresa en lugar de registrarte.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
    'auth/network-request-failed': 'Sin conexión. Verifica tu internet.',
    'auth/popup-closed-by-user': 'Ventana cerrada. Intenta de nuevo.',
    'auth/invalid-credential': 'Credenciales inválidas. Verifica tu correo y contraseña.',
  };
  return msgs[code] || 'Error: ' + code;
}

function authSetLoading(id, loading){
  var btn = document.getElementById(id);
  if(btn){ btn.disabled = loading; btn.textContent = loading ? 'Cargando...' : (id==='auth-login-btn' ? 'Ingresar →' : 'Crear cuenta gratis →'); }
}

function authShowMsg(id, msg, type){
  var el = document.getElementById(id);
  if(el){ el.textContent = msg; el.className = 'auth-msg ' + (type||''); }
}

function authSwitchTab(tab){
  document.getElementById('auth-login-form').style.display = tab==='login' ? '' : 'none';
  document.getElementById('auth-register-form').style.display = tab==='register' ? '' : 'none';
  document.getElementById('tab-login').classList.toggle('active', tab==='login');
  document.getElementById('tab-register').classList.toggle('active', tab==='register');
}

async function verifyPin(){
  const h = await pinHash(_pinBuffer);
  const isLegacy = _pinTarget && _pinTarget.pinHash && _pinTarget.pinHash.length < 64;
  const match = isLegacy ? (pinHashLegacy(_pinBuffer) === _pinTarget.pinHash) : (h === _pinTarget.pinHash);
  if(match){
    document.getElementById('pin-overlay').style.display='none';
    hideLogin();
    startSession(_pinTarget, true);
  } else {
    document.getElementById('pin-error').textContent='PIN incorrecto. Intenta de nuevo.';
    _pinBuffer=''; updatePinDots();
    const box=document.getElementById('pin-box');
    if(box){ box.style.animation='none'; void box.offsetWidth; box.style.animation='shake .35s ease'; }
  }
}

function pinPress(d){
  if(_pinBuffer.length>=4) return;
  _pinBuffer+=d; updatePinDots();
  if(_pinBuffer.length===4) setTimeout(verifyPin,200);
}

function pinDel(){ _pinBuffer=_pinBuffer.slice(0,-1); updatePinDots(); }

function pinCancel(){
  document.getElementById('pin-overlay').style.display='none';
  _pinTarget=null; _pinBuffer='';
}

function forceLogout(){
  if(!_session) return;
  logActivity('logout','sistema','Cierre automático por inactividad (30 min)');
  saveSession(null); _session = null;
  clearTimeout(_sessionTimer);
  const sb = document.getElementById('sb-session-user');
  if(sb) sb.style.display = 'none';
  document.querySelectorAll('.sb-item[onclick]').forEach(function(el){ el.style.display=''; });
  document.querySelectorAll('.sb-section').forEach(function(el){ el.style.display=''; });
  if(typeof hideAutoBanner==='function') hideAutoBanner();
  showLogin();
  if(typeof toast==='function') toast('🔒 Sesión cerrada por inactividad','info');
}

function logout(){
  if(!confirm('µ×Errar sesión?')) return;
  logActivity('logout','sistema','Cierre de sesión');
  saveSession(null); _session=null;
  // FIX BUG #4: cerrar sesión Firebase + limpiar sessionStorage
  sessionStorage.clear();
  if(typeof _fbAuth !== 'undefined' && _fbAuth) _fbAuth.signOut().catch(function(){});
  var sbUser = document.getElementById('sb-session-user');
  if(sbUser) sbUser.style.display='none';
  document.querySelectorAll('.sb-item[onclick]').forEach(function(el){ el.style.display=''; });
  document.querySelectorAll('.sb-section').forEach(function(el){ el.style.display=''; });
  showLogin();
}

function forceLogoutFirebase(){
  // Cierre completo incluyendo Firebase Auth (para timeout o pilot expiry)
  sessionStorage.clear();
  if(typeof _fbAuth !== 'undefined' && _fbAuth) _fbAuth.signOut().catch(function(){});
  window.location.href = 'login.html';
}

function _getFirebaseCfg(){
  try { return JSON.parse(localStorage.getItem('normalis_firebase')||'null'); } catch(e){ return null; }
}

// END:normalis-auth.js — NormaLis integrity seal
