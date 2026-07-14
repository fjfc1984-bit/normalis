# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is NormaLis

Colombian SaaS for health regulatory compliance (Resolución 3100/2019 and 465/2025). Targets IPS (healthcare providers) to manage habilitación, PAMEC, and patient safety audits. Static site hosted on **GitHub Pages** at `normalis.co`. All backend is Firebase (Auth + Firestore). No build step — changes go live on push.

---

## Deployment

```bash
# All changes deploy via GitHub Desktop (commit + push to main)
# GitHub Pages serves directly from the repo root
# There is no build, no npm, no bundler
```

**Critical workflow for large files (>100KB):**
- **Never use the GitHub web editor** for `normativa-app-v2.html` (832KB) — CodeMirror 6 only renders visible lines; Replace All hits every match including those inside JS strings
- Always edit locally via file tools and commit through GitHub Desktop

---

## File Architecture

| File | Purpose | Size |
|------|---------|------|
| `index.html` | Public landing page + demo lead capture | 63KB |
| `login.html` | Auth + role-based routing | 28KB |
| `registro.html` | 2-step self-registration wizard | 25KB |
| `admin.html` | Admin panel (CRM, pilotos, analytics, solicitudes, leads) | 77KB |
| `normativa-app-v2.html` | Main app (13,120 lines — the entire product) | 858KB |
| `normalis-pilot.js` | Pilot banner + expiry guard (injected into app) | ~6KB |

---

## Firebase Setup

**Project:** `normalis-5587d`  
**SDK:** Firebase Compat v10.12.2 (all files use `firebase.initializeApp(...)` pattern, NOT modular imports)

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyArUb9rzv6lHeunq_bPgbbe0vmekysx5R4",
  authDomain: "normalis-5587d.firebaseapp.com",
  projectId: "normalis-5587d",
  storageBucket: "normalis-5587d.firebasestorage.app",
  messagingSenderId: "328915530941",
  appId: "1:328915530941:web:8e77246bd2e326e115b3d4"
};
```

**Firestore Security Rules** are set in the Firebase Console (not in this repo).

---

## Role System

Roles live in `Firestore > usuarios > {uid} > rol`. The full lifecycle:

```
registro.html → rol: 'pendiente'
admin.html (Solicitudes tab) → admin approves → rol: 'cliente' or 'piloto'
admin.html (Solicitudes tab) → admin rejects  → rol: 'rechazado'
admin.html (Nueva IPS tab)   → admin creates  → rol: 'piloto'  (direct creation)
```

| Role | Access |
|------|--------|
| `pendiente` | Blocked at login — awaiting review |
| `rechazado` | Blocked at login — access denied |
| `cliente` | → `normativa-app-v2.html` |
| `piloto` | → `normativa-app-v2.html` + pilot banner + expiry check |
| `admin` | → `admin.html` |

**There are no Firebase Custom Claims.** Do not add `token.claims.*` checks — they will always fail. Role verification must always query `db.collection('usuarios').doc(uid).get()`.

---

## Firestore Collections

### `usuarios/{uid}`
Created by `registro.html` on self-registration OR by `admin.html > crearIPS()` for admin-created pilots.

```javascript
{
  nombre:          string,  // IPS name (NOT person name) — used by login.html prefillAppData()
  nombreContacto:  string,  // Contact person full name
  cargo:           string,
  email:           string,
  telefono:        string,
  nit:             string,
  tipoIPS:         string,
  ciudad:          string,
  rol:             'pendiente' | 'cliente' | 'piloto' | 'admin' | 'rechazado',
  activo:          boolean,
  expiresAt:       Timestamp | null,  // Only for 'piloto' — checked in login.html
  fechaSolicitud:  Timestamp,
  estado:          string,
}
```

**`nombre` = IPS name** — this is critical. `login.html > prefillAppData()` reads `data.nombre` as the IPS name to prefill `normalis_cfg`. If a user document stores a person's name in `nombre`, the app will show the wrong name everywhere.

### `ips/{nit}`
IPS profile. Created by `admin.html > crearIPS()`.

### `pilotos/{nit}`
Pilot tracking. Created by `admin.html > crearIPS()`. Contains `salud`, `semana_actual`, `auditorias_completadas`, etc.

### `prospectos/{auto-id}`
CRM prospects. Managed entirely in `admin.html`.

### `leads/{auto-id}`
Demo requests from `index.html > submitDemo()`. Captured in real-time by `admin.html > Leads tab`.

---

## Session & Storage Architecture

**sessionStorage** (set by `login.html`, read by `normativa-app-v2.html` and `normalis-pilot.js`):
```
normalis_uid            Firebase Auth UID
normalis_rol            Role string
normalis_nombre         User display name
normalis_email          Email
normalis_expires        ISO string — pilot expiry date
normalis_dias_restantes Number string — days left for pilot
```

**localStorage** (set by `login.html > prefillAppData()`, read by `normativa-app-v2.html`):
```
normalis_cfg              JSON — {director, tipo, ciudad, nit, responsable, cargo, telefono}
normalis_ips_nombre       IPS display name
normalis_ips_ciudad       IPS city
normalis_onboarding_done  'true' — prevents onboarding wizard from showing
```

**Onboarding wizard logic:** `normativa-app-v2.html` calls `mostrarOnboarding()` on load. It checks `localStorage.getItem('normalis_onboarding_done')` — if `'true'`, it returns immediately. `login.html > prefillAppData()` sets this flag from Firestore data BEFORE redirecting. A fix script appended at the end of `normativa-app-v2.html` also sets it for returning users.

---

## admin.html Architecture

The file has **two `<script>` blocks** — this is intentional:

- **Block 1** (lines ~737–1432): Firebase init, auth guard, doLogin, CRM (prospectos), crearIPS, pilotos, analytics
- **Block 2** (lines ~1439–1576): cargarSolicitudes, cargarLeads, renderLeads, actualizarEstadoLead, showToast

Both blocks must remain. Do NOT merge them into one or the HTML elements between them (toast div) will end up inside a script tag.

**Auth flow in admin.html:**
```
doLogin() → auth.signInWithEmailAndPassword()
         → onAuthStateChanged fires
         → checks Firestore usuarios.rol === 'admin'
         → if yes: showScreen('app') + initApp()
         → if no: auth.signOut() + showScreen('auth')
```

`initApp()` calls: `escucharProspectos()`, `cargarPilotos()`, `cargarAnalytics()`, `cargarSolicitudes()`, `cargarLeads()`

---

## admin.html — Truncation Pattern (recurring risk)

`admin.html` has a known recurring truncation issue: the file consistently gets cut off around line 1570–1580, losing `showToast`, the closing `</script>`, `</body>`, and `</html>`. This happens silently — the file looks normal but is incomplete.

**Every time admin.html is edited, run the validator immediately after.** If it reports missing `showToast` or missing closing tags, append the missing tail:

```bash
cat >> admin.html << 'EOF'
}

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.className = `toast toast-${type} show`;
  toast.textContent = msg;
  setTimeout(() => { toast.classList.remove('show'); }, 3000);
}
</script>
</body>
</html>
EOF
```

---

## Known Bugs Fixed (do not re-introduce)

1. **Custom Claims**: `admin.html` previously used `token.claims.superadmin` — replaced with Firestore rol check. Never revert.
2. **Duplicate `onAuthStateChanged`**: Was two listeners; now exactly one. Do not add a second auth listener.
3. **Duplicate `initApp()`**: Was two definitions; now exactly one with all 5 function calls.
4. **Script block structure**: `<div class="toast" id="toast"></div>` must be in HTML, not inside a `<script>` tag. The two-block structure exists specifically to keep this element in the DOM.
5. **`crearIPS()` role**: Must use `rol: 'piloto'`, NOT `'admin_ips'` — login.html does not handle `admin_ips`.
6. **`crearIPS()` field naming**: `nombre` must be the IPS name; `nombreContacto` must be the person's name. login.html's `prefillAppData()` depends on this.

---

## Editing normativa-app-v2.html (858KB)

- Use file tools (Read/Edit) — never the GitHub web editor
- The file is technically truncated (ends mid-HTML of a modal) but renders fine in browser
- A fix script is appended at the very end (after the last `</body>`) — do not remove it
- The fix script intercepts `mostrarOnboarding()` and sets `normalis_onboarding_done` from Firestore
- When searching for `</body>` to insert code: there are 6 occurrences — 5 are inside JS strings (print/export functions), only 1 is the real closing tag. Always use the LAST occurrence or search for the fix script to find the real end.

---

## Pre-commit Validation

### Scripts de validación

| Script | Qué valida |
|--------|-----------|
| `validate-admin.sh` / `.ps1` | 9 reglas de integridad de admin.html |
| `validate-login.sh` | Funciones críticas, routing, flags de onboarding |
| `validate-registro.sh` | Rol pendiente, esquema Firestore, rollback |
| `validate-firebase.sh` | Config Firebase idéntica en todos los archivos |

Todos retornan exit code 0 si pasan, no-cero si hay errores críticos.

### Correr manualmente (Cowork / bash)

```bash
bash /sessions/.../mnt/normalis/validate-admin.sh
bash /sessions/.../mnt/normalis/validate-login.sh
bash /sessions/.../mnt/normalis/validate-registro.sh
bash /sessions/.../mnt/normalis/validate-firebase.sh
```

### PowerShell (Windows)
```powershell
.\validate-admin.ps1
```

### Hook automático (corre en cada `git commit`)

El repo tiene hooks en `.githooks/`. Se activan con un comando de una sola vez:

```bash
git config core.hooksPath .githooks
```

Después de eso: cada `git commit` valida automáticamente solo los archivos modificados. Si algo falla, el commit se bloquea con el error impreso. Para forzar validación completa:

```bash
NORMALIS_FULL_CHECK=1 git commit -m "mensaje"
```

**Este comando ya fue ejecutado en el clon actual.** Si clonas el repo de nuevo, corre `bash .githooks/install.sh` una vez.

### GitHub Actions

`.github/workflows/validate.yml` corre en cada push a `main`. Segunda red de seguridad — si algo pasa el hook local, GitHub lo atrapa antes de que llegue a producción. Ver resultados en la pestaña Actions del repo.

### admin.html — 9 reglas específicas
1. Exactly 2 inline `<script>` blocks (not counting CDN imports)
2. Toast div is in HTML between the two script blocks — not inside a script
3. `crearIPS` uses `rol: 'piloto'`, never `'admin_ips'`
4. No `token.claims` references (Firebase Custom Claims)
5. Exactly 1 active `onAuthStateChanged` listener
6. `initApp` defined exactly once
7. All 8 critical functions present: `doLogin`, `crearIPS`, `cargarSolicitudes`, `cargarLeads`, `showToast`, `escucharProspectos`, `cargarPilotos`, `cargarAnalytics`
8. File ends with `</body>` and `</html>` (not truncated)
9. `crearIPS` field `nombre` is IPS name (`datos.nombre`), not person name

---

## EmailJS

Used in `admin.html` to send welcome emails when creating a new IPS pilot via `crearIPS()`.
```
Service ID:   normalis_service
Template:     bienvenida_piloto
Public Key:   gxB8ZBpyoiJ6odC31
```
EmailJS is optional — `crearIPS()` wraps the send in try/catch and continues if it fails.
