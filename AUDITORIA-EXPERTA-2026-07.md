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
**Estado:** ⏳ Pendiente (Fernando lo corrige)

**Qué pasa:** `normalis-chat.js` define `async function sendMainChat()` que llama a `callGemini()` → Worker → Gemini. Luego `normalis-firestore.js` (que carga DESPUÉS, línea 2011 vs 2002) define `window.sendMainChat = function() { xaiResponder(pregunta) }` sobreescribiendo completamente la función.

**Fix:** En `normalis-firestore.js`, antes del override, guardar la referencia original:
```javascript
var _chatSendMainChat = window.sendMainChat;
window.sendMainChat = function() {
  if (typeof _chatSendMainChat === 'function') return _chatSendMainChat();
  // fallback xaiResponder solo si chat.js no está disponible
  ...
};
```

---

### BUG #2 — Acceso directo a la app sin verificación de rol Firebase ✅ CORREGIDO

**Archivo:** `normativa-app-v2.html` → `initFirebaseAuth()`
**Severidad:** 🔴 Crítico
**Estado:** ✅ Corregido en commit `security: BUG#2 role check Firestore en initFirebaseAuth`

Ahora `initFirebaseAuth()` verifica el rol en Firestore antes de mostrar la app. Usuarios con rol distinto de `cliente` o `piloto` son redirigidos a `login.html`.

---

### BUG #3 — authRegister/authGoogle crean usuarios Firebase sin documento Firestore ✅ CORREGIDO

**Archivo:** `normalis-auth.js`
**Severidad:** 🔴 Crítico
**Estado:** ✅ Corregido en commit `security: BUG#3 authRegister/Google crea doc Firestore pendiente`

Ahora ambas funciones crean `usuarios/{uid}` con `rol: 'pendiente'` en Firestore.

---

## MEDIOS — Corregir antes de lanzamiento masivo

---

### BUG #4 — logout() no cierra sesión Firebase ✅ CORREGIDO

**Estado:** ✅ Corregido — `logout()` ahora llama `_fbAuth.signOut()` + `sessionStorage.clear()`

---

### BUG #5 — Dos onAuthStateChanged simultáneos (race condition)

**Archivos:** `normalis-firestore.js` línea 36 + `normativa-app-v2.html` línea 7669
**Severidad:** 🟡 Medio — mitigado por el redirect del BUG #2
**Estado:** ⏳ Pendiente

---

### BUG #6 — registro.html sin rate limiting ✅ CORREGIDO

**Estado:** ✅ Corregido — máx 3 registros por hora por navegador. Commit `security: CSP + rate limiting registro.html`

---

### BUG #7 — fsSync escribe en ips/{uid}/data — verificar Firestore Rules

**Archivos:** `normalis-firestore.js` + Firebase Console
**Severidad:** 🟡 Medio
**Estado:** ⏳ Verificar en Firebase Console que las rules incluyan:
```
match /ips/{userId}/data/{key} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

### BUG #8 — Sin Content-Security-Policy en ningún archivo HTML ✅ CORREGIDO

**Estado:** ✅ CSP + X-Frame-Options + X-Content-Type-Options agregados a los 5 archivos HTML

---

## Plan de Acción — Estado Final

| Bug | Severidad | Estado |
|-----|-----------|--------|
| #1 sendMainChat override | 🔴 Crítico | ⏳ Fernando corrige |
| #2 No role check en app | 🔴 Crítico | ✅ Corregido |
| #3 authRegister sin Firestore | 🔴 Crítico | ✅ Corregido |
| #4 logout sin Firebase signOut | 🟡 Medio | ✅ Corregido |
| #5 Doble onAuthStateChanged | 🟡 Medio | ⏳ Pendiente |
| #6 Sin rate limiting registro | 🟡 Medio | ✅ Corregido |
| #7 Firestore Rules ips/{uid} | 🟡 Medio | ⏳ Verificar |
| #8 Sin CSP headers | 🟡 Medio | ✅ Corregido |

---

## Lo que funciona bien ✅

- Validador maestro `normalis-validate.sh`: 80+ checks, 0 errores
- Arquitectura modular de 12 módulos con sellos de integridad
- `login.html`: rate limiting, routing por roles, pre-fill Firestore → localStorage
- `admin.html`: 9 reglas de integridad, sin Custom Claims, flujo completo de aprobación
- `registro.html`: sanitización de inputs, rol `pendiente` asignado correctamente
- `normalis-pilot.js`: verificación de expiración con overlay bloqueante
- Sesión interna con PIN y timeout de 30 minutos de inactividad
- GitHub Actions + pre-commit hook automatizados
- Cloudflare Worker desplegado con clave Gemini configurada

---

*Auditoría realizada: 2026-07-16*
