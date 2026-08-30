# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is NormaLis

Colombian SaaS for health regulatory compliance. Primary regulation: **Resolución 1732 de 2026** (published August 5, 2026 — replaces Res. 3100/2019, Res. 465/2025, and all modifications; 12-month transition period). Targets IPS (healthcare providers) to manage habilitación, PAMEC, and patient safety audits. Backend is Firebase (Auth + Firestore). Frontend is a **Next.js 15 App Router app** in `web/`, deployed to **Vercel** at `normalis.co`.

**Marco Regulatorio (agosto 2026):**
- **Res. 1732/2026** — Marco principal de habilitación (reemplaza Res. 3100/2019 + todas sus modificaciones + Res. 77/2007). Mismos 7 estándares. Nuevos: Telemedicina (Telexperticia, Teleconcepto, Teleconsulta, Telemonitoreo), IHCE (Historia Clínica Electrónica Interoperable), RDA (Resumen Digital de Atención), Plan de Adecuación Progresiva para territorios especiales.
- **Res. 256/2016** — Indicadores de calidad (sigue vigente).
- **Res. 1774/2025 (SG-SST)** — Seguridad y salud en el trabajo.

---

## ⚠️ Migración a Next.js — leer antes de tocar nada

El producto vivió originalmente como sitio estático servido por GitHub Pages
(`index.html`, `admin.html`, `login.html`, `registro.html`, `normativa-app-v2.html`
+ ~25 módulos `normalis-*.js`). **Esa arquitectura fue reemplazada** por la app
Next.js en `web/`. Los archivos HTML/JS legados fueron eliminados del repo; lo
único que sobrevive en la raíz es `normativa-app-v2.html`, y quedó roto: carga
25 `<script src>` de módulos de los que solo 9 siguen existiendo. **No lo
edites ni lo uses como referencia de arquitectura** — es un resto sin limpiar,
no un shell activo. `next.config.ts` ya redirige las rutas `.html` antiguas a
sus equivalentes en Next.js (`/login.html` → `/login`, etc.), así que enlaces
externos con la URL vieja siguen funcionando.

**Todo el trabajo de producto va en `web/`.** El resto del repo (raíz) es:
Cloudflare Worker (`cloudflare-worker.js`, `cloudflare-worker/`), Firestore
rules/indexes, scripts de validación legados, contenido de marketing/blog, y
el `normativa-app-v2.html` obsoleto pendiente de borrar.

**Gap conocido:** `normalis-validate.sh` y el hook de pre-commit (abajo) solo
validan los archivos legados de la raíz — no corren type-check, lint ni build
de `web/`. Un commit puede pasar el hook y aun así romper la app Next.js.
Antes de commitear cambios en `web/`, correr manualmente:
```bash
cd web && npm run type-check && npm run lint
```

---

## Estructura de `web/` (Next.js 15, App Router)

```bash
cd web
npm install       # primera vez / tras pull con cambios en package.json
npm run dev        # servidor local, http://localhost:3000
npm run build       # build de producción (lo que corre Vercel)
npm run type-check   # tsc --noEmit
npm run lint          # eslint
```

**Deploy:** Vercel se dispara automáticamente al hacer push a `main` (integración
de GitHub, no hay workflow de CI que lo haga). `web/vercel.json` fija
`buildCommand: npm run build` y reescribe `/api/worker/*` hacia el Cloudflare
Worker (`https://normalis.fjfc1984.workers.dev`).

**Layout de directorios:**

| Ruta | Contenido |
|------|-----------|
| `web/app/` | Rutas (App Router). Páginas públicas (`/`, `/login`, `/registro`, `/admin`, `/demo`, `/status`, `/terminos`, `/politica-privacidad`) + `web/app/dashboard/*` con ~35 módulos del producto (ver abajo). |
| `web/lib/` | Lógica compartida: hooks Firestore por módulo (`use*.ts`), tipos (`*Types.ts`), `firebase.ts`, `auth.ts` (hook `useAuth`), catálogos. |
| `web/data/auditData.ts` | `areasDB` + `SEGMENT_META` — preguntas de auditoría por segmento de servicio (portado desde el legado `normalis-data-audit.js`). |
| `web/components/` | Componentes UI compartidos. |
| `web/e2e/` | Tests end-to-end. |

**Patrón de cada módulo:** una ruta en `web/app/dashboard/<modulo>/page.tsx`
('use client') que consume un hook `web/lib/use<Modulo>.ts`, que a su vez lee/
escribe Firestore con el SDK modular (no compat). Los tipos del dominio viven
en `web/lib/<modulo>Types.ts`. Ver `web/lib/useAudit.ts` +
`web/app/dashboard/auditoria/[segmento]/page.tsx` + `web/data/auditData.ts`
como ejemplo completo de esta tríada.

**Módulos del dashboard** (bajo `web/app/dashboard/`): ajustes, analisis-riesgo,
aprobaciones, auditoria (+ `[segmento]` dinámico), benchmarking, bitacora,
capas (+ `[id]`, nueva), chat, comparador, consentimientos, cumplimiento,
documentos, documentos-dms, equipo, equipos-biomedicos, firma, gap-1732,
historia-clinica, iaas, incidentes, indicadores, infraestructura,
integraciones, interdependencia, medicamentos, mis-ips, pamec, pqrs,
prem-prom, proa, seguridad, sg-sst, simulacros, talento, vencimientos,
vigilancia-sanitaria. Antes de crear un módulo nuevo, revisar si alguno de
estos ya cubre el mismo dominio — varios llegaron a existir por duplicación
accidental durante la migración.

---

## Commits desde Claude (OneDrive lock workaround)

El repo está en OneDrive. OneDrive sincroniza `.git` y puede dejar
`index.lock` / `HEAD.lock` / `refs/remotes/origin/*.lock` huérfanos —
archivos de 0 bytes que bloquean git aunque ningún proceso esté corriendo.

**Antes de cualquier commit o fetch/push, verificar:**
```bash
find .git -name "*.lock"
```
Si aparece alguno y no hay ningún proceso `git` corriendo, es huérfano —
borrarlo es seguro:
```bash
rm -f .git/index.lock .git/HEAD.lock .git/refs/remotes/origin/main.lock
```

**Un `origin/main.lock` huérfano es especialmente peligroso**: impide que
`git fetch` actualice la referencia local de `origin/main`, así que
`git status` sigue mostrando la divergencia vieja indefinidamente — puede
parecer que el remoto no avanzó cuando en realidad lleva semanas por delante.
Si `git status -sb` muestra un ahead/behind que no cuadra con lo que
recuerdas haber pusheado, sospecha de este lock antes que de cualquier otra
cosa.

No hace falta el patrón antiguo de `GIT_INDEX_FILE` en un índice temporal —
con los locks huérfanos limpios, `git add` / `git commit` / `git push`
normales funcionan. Evitar `git add -A` / `git add -u` salvo que se haya
revisado `git status` primero: con trabajo en curso sin commitear de otra
sesión, un stage indiscriminado mezcla cambios no relacionados en el mismo
commit.

**Nunca editar `normativa-app-v2.html` con el tool `Edit`** si en algún
momento hay que tocarlo (p. ej. para terminar de borrarlo) — supera 500KB y
`Edit` puede truncarlo silenciosamente. Leer → modificar en memoria → escribir
completo (Python/Node), nunca reemplazos parciales de gran tamaño.

---

## Firebase Setup

**Project:** `normalis-5587d`

**`web/`** usa el SDK modular (`firebase/app`, `firebase/auth`,
`firebase/firestore`) vía `web/lib/firebase.ts`, configurado con variables
`NEXT_PUBLIC_FIREBASE_*` (ver `web/.env.local`, plantilla en
`web/.env.local.example`; ambos gitignored — no commitear claves ahí, aunque
`apiKey` de Firebase es pública por diseño).

**Firestore Security Rules** viven en `firestore.rules` en este repo (1000+
líneas — muchas más colecciones que las documentadas abajo; ver el comentario
de cabecera del archivo para la lista completa) y `firebase.json` las apunta.

```bash
# Aplicar
firebase deploy --only firestore:rules --project normalis-5587d

# Validar sin aplicar (compila contra el servidor, no cambia nada)
firebase deploy --only firestore:rules --project normalis-5587d --dry-run
```

**Importante:** las rules NO se despliegan con el push a `main` — Vercel solo
construye la app Next.js. Un cambio en `firestore.rules` requiere el comando
de arriba por separado, o queda sin efecto en producción aunque esté en `main`.

---

## Role System

Roles viven en `Firestore > usuarios/{uid} > rol`, ahora leídos vía el hook
centralizado `web/lib/auth.ts > useAuth()` en vez de código de routing
repetido por página.

```
web/app/registro   → rol: 'pendiente'
web/app/admin (aprobar)  → rol: 'cliente' | 'piloto'
web/app/admin (rechazar) → rol: 'rechazado'
web/app/admin (crearIPS) → rol: 'piloto'  (creación directa)
```

| Role | Acceso |
|------|--------|
| `pendiente` | Bloqueado en login — esperando revisión |
| `rechazado` | Bloqueado en login — acceso denegado |
| `cliente` | → `/dashboard` |
| `piloto` | → `/dashboard` + banner de piloto + chequeo de expiración |
| `admin` | → `/admin` |

**No hay Firebase Custom Claims.** No agregar checks de `token.claims.*` —
siempre fallarán. La verificación de rol siempre consulta
`usuarios/{uid}.rol` vía Firestore.

**Soporte de equipo (multi-usuario por NIT):** `useAuth()` expone `nit`
(NIT *efectivo*: el propio si existe, o el heredado `nit_ips` si el usuario
entró por invitación a un equipo) y `nitPropio` (sin resolver, para
distinguir dueño de miembro vía `esMiembroEquipo`). Los módulos deben leer
`useAuth().nit`, no `nitPropio`, para que funcionen igual para dueños y
miembros de equipo.

**`crearIPS()` en `web/app/admin/page.tsx`:** crea el usuario Auth con una
**app Firebase secundaria** (`initializeApp(firebaseConfig, 'normalis-create-'+Date.now())`),
nunca con la app principal — `createUserWithEmailAndPassword` en la app
principal auto-loguea al usuario recién creado y desloguea al admin que lo
está creando. Patrón: crear en la app secundaria → `deleteApp(secondaryApp)`
en `finally`. No revertir a la app principal.

`crearIPS()` sigue exigiendo `rol: 'piloto'` (nunca `'admin_ips'`, que no
existe en el routing) y sigue distinguiendo `nombre` (IPS) de
`nombreContacto` (persona) — ver el esquema de `usuarios/{uid}` abajo.

**Gap conocido:** el legado enviaba un correo de bienvenida vía EmailJS al
crear un piloto (`admin.html > crearIPS()`). Esa integración no se migró a
`web/app/admin/page.tsx > crearIPS()` — hoy no se envía correo de bienvenida.

---

## Firestore Collections (esquema de `usuarios/{uid}`)

Creado por `web/app/registro` en auto-registro, o por
`web/app/admin > crearIPS()` para pilotos creados por un admin.

```typescript
{
  nombre:          string,  // Nombre de la IPS (NO el de una persona)
  nombreContacto:  string,  // Nombre completo de la persona de contacto
  cargo:           string,
  email:           string,
  telefono:        string,
  nit:             string,
  nit_ips:         string,  // Presente solo si es miembro de equipo (NIT heredado por invitación)
  tipoIPS:         string,
  ciudad:          string,
  rol:             'pendiente' | 'cliente' | 'piloto' | 'admin' | 'rechazado',
  plan:            'basico' | 'profesional' | 'enterprise' | null,  // asignado a mano por un admin
  activo:          boolean,
  expiresAt:       Timestamp | null,  // Solo 'piloto' — chequeado por useAuth()/gating de planes
  fechaSolicitud:  Timestamp,
  estado:          string,
  onboardingCompleto: boolean,
}
```

**`nombre` = nombre de la IPS.** Sigue siendo crítico: código que prefilla
datos del establecimiento depende de que `nombre` sea el nombre de la IPS y
no el de una persona.

Ver el comentario de cabecera de `firestore.rules` para el inventario
completo de colecciones — creció mucho más allá de `usuarios`/`ips`/`pilotos`/
`prospectos`/`leads` (agregó, entre otras: `documentos_dms`, `equipos_biomedicos`,
`infraestructura_areas`, `medicamentos_lotes`, `historia_clinica_auditorias`,
`interdependencia_convenios`, `iaas_casos`, `bitacora_seguridad`, `firmas` —
estas dos últimas escritas solo por el Cloudflare Worker, nunca desde el
cliente).

---

## Pre-commit Validation (legado — solo cubre la raíz, no `web/`)

```bash
bash normalis-validate.sh           # validación normal
bash normalis-validate.sh --verbose  # con detalles de cada archivo
```

Valida integridad de los archivos legados de la raíz (sellos de módulo,
Firebase config consistente entre HTMLs, etc.). **No toca nada dentro de
`web/`** — ver el gap documentado arriba. El hook en `.githooks/pre-commit`
corre este validador automáticamente en cada commit que toque `.html`/`.js`/
`.css`, con auto-reparación vía `normalis-repair.sh` cuando es posible.

```bash
git config core.hooksPath .githooks  # una sola vez por clon
```

Para forzar validación completa en cualquier commit:
```bash
NORMALIS_FULL_CHECK=1 git commit -m "mensaje"
```

`.github/workflows/validate.yml` corre lo mismo en cada push a `main`, y
`.github/workflows/smoke-tests.yml` corre `tests/smoke.test.js` (análisis
estático) más tests unitarios de la lógica runtime.
