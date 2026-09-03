# Bloqueo de la publicación automática en LinkedIn

**Estado:** el cron automático de `.github/workflows/linkedin-autopost.yml`
está desactivado a propósito (comentado). Los posts de
`normalis-linkedin-posts.json` se publican **manualmente** (copiar/pegar
el texto en LinkedIn) hasta que este bloqueo se resuelva.

## Qué funciona

- La app de LinkedIn ("NormaLis", Client ID `78gztm2h6qe243`) existe,
  tiene los productos **Share on LinkedIn** y **Sign In with LinkedIn
  using OpenID Connect**.
- El flujo OAuth 2.0 completo (login, autorización, intercambio de
  código por token) funciona de punta a punta.
- Los secretos `LINKEDIN_TOKEN` y `LINKEDIN_PERSON_URN` están
  configurados en GitHub Actions.
- El workflow detecta correctamente el post del día desde
  `normalis-linkedin-posts.json` (paso "Verificar post programado para
  hoy" siempre funciona).

## Qué no funciona

`scripts/linkedin-post.js` falla siempre al intentar publicar, con:

```
Error LinkedIn API: HTTP 422
{"message":"ERROR :: /author :: \"***\" does not match urn:li:company:\\d+|urn:li:member:-?\\d+\n","status":422}
```

## Causa raíz

El endpoint oficial de "Share on LinkedIn" (`POST /v2/ugcPosts`) exige
que el campo `author` tenga el formato **`urn:li:member:{número}`** —
un ID numérico del sistema *legado* de member IDs de LinkedIn.

El problema: **las apps creadas después de que LinkedIn migró a OpenID
Connect (2023+) ya no tienen forma de obtener ese ID numérico.** Solo
se puede obtener un identificador *opaco* (ej. `yEyFSrE7nh`) vía
`GET /v2/userinfo` (scope `openid`), que el validador de `/v2/ugcPosts`
rechaza porque no matchea su regex legado.

Se probaron y descartaron estas rutas:

1. **`urn:li:person:{id opaco}`** con `/v2/ugcPosts` → rechazado por el
   regex `urn:li:member:-?\d+` (no acepta prefijo `person`).
2. **`GET /v2/me`** (para obtener el ID numérico directamente) →
   `403 Forbidden`. Requiere el scope legado `r_liteprofile`, que solo
   viene con el producto "Sign In with LinkedIn" v1 (no la versión
   OpenID Connect), y ese producto ya no está disponible para apps
   nuevas.
3. **Endpoint moderno `/rest/posts`** (Posts API, con header
   `LinkedIn-Version`) → `403 Forbidden` sin detalle. Ese endpoint
   requiere el producto **Community Management API**, que LinkedIn
   exige que sea **el único producto de la app** — es decir, es
   incompatible con tener "Share on LinkedIn" en la misma app.

Es una inconsistencia conocida y reportada por otros desarrolladores
en la comunidad de LinkedIn: el endpoint documentado para "Share on
LinkedIn" nunca se actualizó para aceptar el formato de ID que la
propia migración a OpenID Connect de LinkedIn introdujo.

## Opciones para retomar

- **Reintentar `/v2/ugcPosts`** cada tanto — si LinkedIn corrige la
  validación del lado del servidor, solo hay que reactivar el cron
  (descomentar las 3 líneas en el workflow).
- **App separada solo con Community Management API** — crear una
  segunda app de LinkedIn *sin* "Share on LinkedIn", pedir el producto
  Community Management API (Development Tier, requiere aprobación) y
  usar `/rest/posts` desde ahí. No probado.
- **Herramienta externa con partnership de LinkedIn** (Buffer, Zapier,
  Hootsuite, etc.) — estas plataformas tienen acceso elevado que sí
  resuelve el problema del ID. Conectar la cuenta de LinkedIn de
  NormaLis ahí en vez de mantener la integración casera.
- **Foro de soporte de LinkedIn Developers** — reportar el caso
  puntual (Client ID `78gztm2h6qe243`) por si hay una vía de
  aprobación manual no documentada.

## Cómo reactivar (una vez resuelto)

1. Confirmar que `node scripts/linkedin-post.js` publica sin error
   corriendo el workflow con `workflow_dispatch` (dry_run desmarcado).
2. Descomentar las 3 líneas `- cron:` en
   `.github/workflows/linkedin-autopost.yml`.
3. Borrar o archivar este documento.
