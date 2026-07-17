# Auditoría Experta NormaLis — Julio 2026

**Revisión:** Completa (todos los módulos JS + HTML + infraestructura)  
**Validador:** `normalis-validate.sh` → **0 errores críticos** ✅  
**Estado general:** Arquitectura sólida, pero hay bugs funcionales y de seguridad sin corregir.

---

## Resumen Ejecutivo

El codebase de NormaLis tiene buena arquitectura modular (12 módulos JS + CSS) y la infraestructura de CI/CD funciona correctamente. Sin embargo, la revisión detectó **3 bugs críticos** que afectan directamente la seguridad y el producto, más **5 bugs medios** que deben corregirse antes de escalar el producto.

El más urgente: **el chat IA (Cloudflare Worker) nunca se llama**. Aunque el Worker está desplegado y la clave Gemini está configurada, `normalis-firestore.js` sobreescribe la función antes de que llegue a ejecutarse.

---

## CRÍTICOS — Deben corregirse antes del próximo cliente

---

### BUG #1 — Chat IA nunca llega al Cloudflare Worker

**Archivo:** `normalis-firestore.js` líneas 240 y 327  
**Severidad:** 🔴 Crítico — el Worker se desplegó para nada

**Qué pasa:** `normalis-chat.js` define `async function sendMainChat()` que llama a `callGemini()` → Worker → Gemini. Luego `normalis-firestore.js` (que carga DESPUÉS, línea 2011 vs 2002) define `window.sendMainChat = function() { xaiResponder(pregunta) }` sobreescribiendo completamente la función. Un tercer wrapper en la línea 327 la envuelve otra vez para analytics.

**Resultado:** Todos los usuarios siempre reciben el responder local (`xaiResponder`), que solo contesta sobre PQRS/incidentes/vencimientos guardados en localStorage. Las preguntas normativas ("¿qué dice la Res. 3100 sobre...?") reciben solo el dashboard de riesgo genérico.

**Fix:**
```javascript
// En normalis-firestore.js, línea ~240
// ELIMINAR el bloque window.sendMainChat = function() { ... xaiResponder... }
// y REEMPLAZAR con un fallback que llama al chat.js:

window.sendMainChat = async function() {
  var input = document.getElementById('main-chat-input');
  if (!input) return;
  var pregunta = input.value.trim();
  if (!pregunta) return;
  
  // Intentar primero Gemini (normalis-chat.js)
  if (typeof callGemini === 'function') {
    // El chat.js tiene su propia UI — llamarlo directamente
    return _origSendMainChat && _origSendMainChat();
  }
  // Fallback local si no hay conectividad
  input.value = '';
  // ... lógica xaiResponder como fallback
};
```

La solución más limpia: en `normalis-chat.js`, exportar `sendMainChat` sin usar `window.*`, y en `normalis-firestore.js`, verificar si ya existe antes de sobreescribir:
```javascript
// Al inicio de normalis-firestore.js — guardar referencia ANTES de sobreescribir
var _chatSendMainChat = window.sendMainChat; // referencia al de normalis-chat.js
window.sendMainChat = function() {
  if (typeof _chatSendMainChat === 'function') {
    return _chatSendMainChat(); // Usar el Worker (Gemini)
  }
  // ... fallback xaiResponder solo si chat.js no está disponible
};
```

---

### BUG #2 — Acceso directo a la app sin verificación de rol Firebase

**Archivo:** `normativa-app-v2.html` → `initFirebaseAuth()` línea 7664  
**Severidad:** 🔴 Crítico — bypass de seguridad

**Qué pasa:** Cualquier usuario con una cuenta Firebase válida (incluso `rol: 'pendiente'` o `rol: 'rechazado'`) puede navegar directamente a `normativa-app-v2.html` y acceder al producto completo. El guard solo verifica `if(user)`, no el rol en Firestore.

Adicionalmente, el elemento `id="auth-screen"` **no existe en el HTML** — existe en el código JS pero nunca en el DOM. El guard es silenciosamente inoperativo (null checks pasan, pero no hacen nada visible).

**Demostración del bypass:**
1. Registrarse en `registro.html` → rol `pendiente`
2. Navegar directo a `normativa-app-v2.html` → app carga si Firebase confirma el usuario
3. El admin nunca aprobó, pero el usuario tiene acceso completo

**Fix en `normativa-app-v2.html`, función `initFirebaseAuth()`:**
```javascript
function initFirebaseAuth(){
  try {
    if(typeof firebase === 'undefined' || !firebase.apps.length) return;
    _fbAuth = firebase.auth();
    _fbAuth.onAuthStateChanged(function(user){
      if(user){
        _currentUser = user;
        // VERIFICAR ROL EN FIRESTORE antes de mostrar la app
        var db = firebase.firestore();
        db.collection('usuarios').doc(user.uid).get().then(function(doc){
          if(!doc.exists){
            // Usuario sin documento — redirigir
            window.location.href = 'login.html';
            return;
          }
          var rol = doc.data().rol;
          if(rol !== 'cliente' && rol !== 'piloto'){
            // Rol inválido — redirigir con mensaje
            _fbAuth.signOut();
            window.location.href = 'login.html?acceso=denegado';
            return;
          }
          hideAuthScreen(user);
        }).catch(function(){ window.location.href = 'login.html'; });
      } else {
        window.location.href = 'login.html';
      }
    });
  } catch(e) {
    console.warn('Firebase Auth not available:', e.message);
  }
}
```

---

### BUG #3 — `authRegister` y `authGoogle` crean usuarios Firebase sin documento Firestore

**Archivo:** `normalis-auth.js` líneas 22–43 y 54–63  
**Severidad:** 🔴 Crítico — produce usuarios "huérfanos"

**Qué pasa:** El formulario de registro interno de la app (`normativa-app-v2.html`) crea usuarios con `createUserWithEmailAndPassword()` y `signInWithPopup(Google)` pero NO crea el documento `usuarios/{uid}` en Firestore. Resultado: usuario autenticado en Firebase, pero sin rol. El BUG #2 empeoraría esto — esos usuarios accederían a la app sin rol definido.

**Nota:** Este formulario de registro interno en la app principal parece ser un artefacto de desarrollo. El flujo correcto (registro via `registro.html`) sí crea el documento Firestore con `rol: 'pendiente'`. Sin embargo, mientras el formulario interno exista en el HTML, es un vector de entrada no controlado.

**Fix en `normalis-auth.js`:**
```javascript
function authRegister(){
  // ... validaciones existentes ...
  _fbAuth.createUserWithEmailAndPassword(email, pass)
    .then(function(cred){
      // AGREGAR: crear documento Firestore con rol pendiente
      var db = firebase.firestore();
      return db.collection('usuarios').doc(cred.user.uid).set({
        nombre: nombre,        // nombre de la IPS (o persona si es registro interno)
        nombreContacto: nombre,
        email: email,
        rol: 'pendiente',
        activo: false,
        fechaSolicitud: firebase.firestore.FieldValue.serverTimestamp(),
        estado: 'pendiente'
      }).then(function(){
        return cred.user.updateProfile({displayName: nombre});
      });
    })
    // ...
}
```

---

## MEDIOS — Corregir antes de lanzamiento masivo

---

### BUG #4 — `logout()` no cierra sesión Firebase

**Archivo:** `normalis-auth.js` línea 137  
**Severidad:** 🟡 Medio

`logout()` limpia `_session` (sesión interna de PIN) y hace `showLogin()`, pero NO llama a `_fbAuth.signOut()`. Cuando el usuario vuelve a `login.html`, Firebase puede auto-restaurar la sesión sin pedir credenciales. `authLogout()` (línea 18) sí llama a `signOut()` pero no limpia sessionStorage.

**Fix:** Combinar ambas funciones:
```javascript
function logout(){
  if(!confirm('¿Cerrar sesión?')) return;
  logActivity('logout','sistema','Cierre de sesión');
  saveSession(null); _session = null;
  sessionStorage.clear();           // AGREGAR
  localStorage.removeItem('normalis_onboarding_done'); // OPCIONAL: forzar re-verificación
  if(_fbAuth) _fbAuth.signOut().catch(function(){});   // AGREGAR
  // ... resto del código ...
}
```

---

### BUG #5 — Dos `onAuthStateChanged` simultáneos (race condition)

**Archivos:** `normalis-firestore.js` línea 36 + `normativa-app-v2.html` línea 7669  
**Severidad:** 🟡 Medio

Cuando Firebase detecta un usuario autenticado, AMBOS listeners se ejecutan casi simultáneamente. `normalis-firestore.js` empieza a sincronizar datos de Firestore (`fsSync.pullAll()`) al mismo tiempo que `initFirebaseAuth()` intenta mostrar la pantalla de auth. Esto puede causar:
- Datos sincronizados antes de verificar si el usuario tiene acceso
- Condición de carrera si `initFirebaseAuth()` redirige mientras `fsSync` está en medio de una operación

**Fix:** Inicializar `fsSync` solo desde el listener de `initFirebaseAuth()`, después de verificar el rol:
```javascript
// En normalis-firestore.js: eliminar el onAuthStateChanged interno
// En normativa-app-v2.html: después de verificar rol, llamar fsSync.init() manualmente
```

---

### BUG #6 — `registro.html` sin rate limiting

**Archivo:** `registro.html`  
**Severidad:** 🟡 Medio

El formulario de 2 pasos no tiene ninguna protección contra envíos repetidos. Un atacante puede registrar miles de cuentas `pendiente` para saturar la cola de aprobación del admin. `login.html` sí tiene rate limiting (5 intentos, bloqueo 15 min) pero `registro.html` no tiene nada.

**Fix:** Agregar debounce en el botón de envío + throttle por IP en Firestore Rules:
```javascript
// En registro.html, botón submit:
var _regSubmitting = false;
function enviarRegistro(){
  if(_regSubmitting) return;
  _regSubmitting = true;
  setTimeout(function(){ _regSubmitting = false; }, 10000); // 10s cooldown
  // ... lógica existente
}
```

---

### BUG #7 — `fsSync` escribe en `ips/{uid}/data` — colección separada de `usuarios/{uid}`

**Archivo:** `normalis-firestore.js` línea 60  
**Severidad:** 🟡 Medio — riesgo en Firestore Rules

Los datos de auditoría se sincronizan bajo `ips/{uid}/data/{key}`, pero la información de roles y acceso está en `usuarios/{uid}`. Son dos rutas completamente distintas. Las Firestore Security Rules **deben cubrir ambas rutas** o la sincronización puede fallar silenciosamente (o peor, ser accesible sin auth).

Verificar en Firebase Console que las rules incluyan:
```
match /ips/{userId}/data/{key} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

### BUG #8 — Sin Content-Security-Policy en ningún archivo HTML

**Archivos:** `index.html`, `login.html`, `registro.html`, `admin.html`, `normativa-app-v2.html`  
**Severidad:** 🟡 Medio — protección XSS reducida

Ningún archivo tiene meta CSP. Dado que el producto maneja datos de salud de IPS colombianas y cumplimiento normativo, una política básica agregaría defensa en profundidad.

**Fix — agregar en el `<head>` de cada archivo:**
```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self' https:; 
           script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdnjs.cloudflare.com https://cdn.emailjs.com; 
           connect-src 'self' https://*.firebaseapp.com https://*.googleapis.com https://normalis.fjfc1984.workers.dev;
           frame-ancestors 'none';">
```

---

## BAJO — Mejoras recomendadas

| # | Hallazgo | Archivo | Impacto |
|---|----------|---------|---------|
| 9 | No se envía email de confirmación al usuario al registrarse | `registro.html` | UX — usuario no sabe si llegó |
| 10 | `authGoogle()` en la app interna tampoco crea Firestore doc | `normalis-auth.js` | Igual que BUG #3 |
| 11 | Múltiples archivos sin commit: `functions/index.js`, `normalis-checklist.js`, `validate.yml`, etc. | git | GitHub desincronizado del local |
| 12 | `normalis-firestore.js` — no maneja error de Firestore quota/offline en `push()` | `normalis-firestore.js` | Pérdida silenciosa de datos |
| 13 | `xaiResponder` no responde preguntas normativas — solo dashboard de riesgo | `normalis-firestore.js` | UX del chat degradada sin Gemini |
| 14 | `cloudflare-worker.js` subido a GitHub tiene 221 líneas vs 335 líneas local | `cloudflare-worker.js` | Versión GitHub desactualizada |

---

## Estado del Cloudflare Worker

El Worker en `https://normalis.fjfc1984.workers.dev` está desplegado y la clave `GEMINI_API_KEY` está configurada. El Worker devuelve **HTTP 429** (cuota agotada) no 401, confirmando que la autenticación es correcta. La cuota de Google AI Studio se restablece a la medianoche (hora del Pacífico, ~7am Colombia).

Cuando la cuota se restablezca, el Worker funcionará — **pero el BUG #1 impedirá que sea llamado**. Corregir BUG #1 es prioritario.

---

## Plan de Acción Priorizado

| Prioridad | Bug | Tiempo estimado | Riesgo de no hacerlo |
|-----------|-----|----------------|----------------------|
| 🔴 1 | BUG #1 — sendMainChat override | 30 min | El chat IA (producto principal) no funciona |
| 🔴 2 | BUG #2 — No role check en app | 45 min | Cualquier usuario Firebase accede al producto |
| 🔴 3 | BUG #3 — authRegister sin Firestore doc | 20 min | Usuarios huérfanos que burlan el sistema de roles |
| 🟡 4 | BUG #4 — logout sin signOut Firebase | 15 min | Sesiones Firebase persistentes no deseadas |
| 🟡 5 | BUG #5 — Doble onAuthStateChanged | 30 min | Race condition en datos |
| 🟡 6 | BUG #7 — Verificar Firestore Rules para ips/{uid} | 10 min | Datos de auditoría expuestos |
| 🟡 7 | Commit archivos pendientes | 15 min | GitHub desincronizado |
| 🟢 8 | BUG #6 — Rate limiting en registro | 20 min | Spam de cuentas pendientes |
| 🟢 9 | BUG #8 — CSP headers | 20 min | Menor protección XSS |

---

## Lo que funciona bien ✅

- Validador maestro `normalis-validate.sh`: 80+ checks, pasa 0 errores
- Arquitectura modular de 12 módulos con sellos de integridad
- `login.html`: rate limiting, routing por roles, pre-fill Firestore → localStorage
- `admin.html`: 9 reglas de integridad, sin Custom Claims, flujo completo de aprobación
- `registro.html`: sanitización de inputs, rol `pendiente` asignado correctamente
- `normalis-pilot.js`: verificación de expiración de pilotos con overlay bloqueante
- Sesión interna con PIN y timeout de 30 minutos de inactividad
- Firebase Compat v10 usado consistentemente en todos los archivos
- EmailJS para emails de bienvenida en `crearIPS()`
- GitHub Actions + pre-commit hook automatizados

---

*Auditoría realizada: 2026-07-16 | Herramientas: análisis estático completo del código fuente*
