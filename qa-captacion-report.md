# QA Report — Flujos de Captación y Pago NormaLis
**Fecha:** 2026-07-30  
**Tester:** Claude (automatizado, escalado)  
**Alcance:** 4 flujos de captación y conversión

---

## Resumen Ejecutivo

| Flujo | Resultado | Severidad |
|-------|-----------|-----------|
| 1. Solicitud de Demo (index.html) | ✅ PASS | — |
| 2. Toggle Mensual/Anual + Links Bold.co | ✅ PASS | — |
| 3. Enterprise CTA (mailto) | ✅ PASS | — |
| 4. Registro legacy (registro.html) | 🔴 FAIL | **Crítico** |

**3 de 4 flujos funcionan correctamente en producción.**  
El flujo de auto-registro legacy tiene un bug crítico que impide que cualquier usuario se registre por sí mismo.

---

## Flujo 1 — Solicitud de Demo ✅ PASS

**URL:** `https://www.normalis.co/`  
**Elemento:** Modal "Solicitar Demo Gratis"

### Casos probados
- Envío vacío → bloquea con mensaje "Completa los campos requeridos." ✅
- Envío con datos válidos → muestra pantalla de confirmación ✅
- Escritura en Firestore → 2x POST 200 a `firestore.googleapis.com` confirmados ✅

**Veredicto:** Flujo completamente funcional.

---

## Flujo 2 — Toggle Mensual/Anual + Links Bold.co ✅ PASS

**URL:** `https://www.normalis.co/#precios` (Next.js en Vercel)

### Links verificados (inspección DOM via JavaScript)

| Plan | Toggle | URL | Estado |
|------|--------|-----|--------|
| Básico | Mensual | `https://checkout.bold.co/payment/LNK_QH7C9QNC61` | ✅ Correcto |
| Básico | Anual | `https://checkout.bold.co/payment/LNK_QX9QJBBLWW` | ✅ Correcto |
| Profesional | Mensual | `https://checkout.bold.co/payment/LNK_JTRUHD363J` | ✅ Correcto |
| Profesional | Anual | `https://checkout.bold.co/payment/LNK_RG2A6L92PU` | ✅ Correcto |

El toggle React alterna correctamente entre los 4 links. Estado anual muestra precios anuales, estado mensual muestra mensuales.

**Veredicto:** Todos los links de pago correctamente mapeados.

---

## Flujo 3 — Enterprise CTA ✅ PASS

**URL:** `https://www.normalis.co/#precios`  
**Elemento:** Botón "Contactar" del plan Enterprise

### Comportamiento verificado
- Toggle en **mensual** → href = `mailto:hola@normalis.co?subject=NormaLis%20Enterprise` ✅
- Toggle en **anual** → href = `mailto:hola@normalis.co?subject=NormaLis%20Enterprise` ✅
- Inmune al toggle — siempre abre el cliente de correo ✅

**Veredicto:** CTA Enterprise no afectado por el estado del toggle.

---

## Flujo 4 — Registro Legacy (registro.html) 🔴 FAIL

**URL:** `https://normalis.co/registro.html` (mismo servidor que `fjfc1984-bit.github.io/normalis/`)

### Bug Crítico: Script inline bloqueado por CSP de GitHub Pages

**Descripción:** El `<script>` inline principal de `registro.html` no ejecuta en el navegador. GitHub Pages agrega HTTP headers de `Content-Security-Policy` que bloquean scripts inline (`'unsafe-inline'`), sobrescribiendo el meta CSP del archivo HTML. Los CDN externos (Firebase, Sentry) cargan correctamente porque están whitelisteados por dominio.

**Evidencia técnica:**
```javascript
// En consola del browser:
typeof showStep   // → 'undefined'  (debería ser 'function')
typeof sanitize   // → 'undefined'  (debería ser 'function')
typeof formData   // → 'undefined'  (debería ser 'object')
typeof firebase   // → 'object'     (CDN externo, sí carga)
```

**Consecuencia:** Al hacer click en "Continuar →" en el paso 1, el form realiza un GET submit (comportamiento nativo del browser sin JS), recargando la página y borrando todos los campos. El wizard de 2 pasos es completamente inoperable.

**Impacto:** Ningún usuario puede auto-registrarse a través de este formulario. El único canal de onboarding disponible actualmente es la creación manual desde `admin.html`.

### Fix recomendado

Extraer el script inline a un archivo externo `registro-app.js`:

**registro.html:** Reemplazar `<script>` inline por:
```html
<script src="registro-app.js?v=1"></script>
```

**registro-app.js:** Contener el código actual del inline script.

Los scripts externos con origen `'self'` son permitidos por la CSP de GitHub Pages sin necesitar `'unsafe-inline'`. Este es el mismo patrón ya usado exitosamente en `normativa-app-v2.html` con sus 12 módulos JS externos.

### Bugs secundarios identificados (consecuencia del bug principal)

Dado que el JS no ejecuta, los siguientes comportamientos también están rotos pero se resolverían automáticamente con el fix del script:

- **Step display:** Ambos `#step1` y `#step2` tienen `display: block` simultáneamente en el DOM (falta la llamada inicial a `showStep(1)` que aplica `display: none` al paso 2)
- **Validación de campos:** Sin JS, el form nativo no valida campos requeridos
- **Fortaleza de contraseña:** El indicador visual no funciona

---

## Recomendaciones Prioritarias

### P0 — Crítico (bloquea conversiones)
1. **Extraer script de registro.html a registro-app.js** — Sin esto, el auto-registro está completamente roto. Fix estimado: 15 min.

### P1 — Importante
2. **Agregar llamada inicial `showStep(1)` en `registro-app.js`** — Para asegurar que el paso 2 esté oculto al cargar la página, incluso si el JS ejecuta tarde.
3. **Verificar que `login.html` y `admin.html` no tienen el mismo problema** — También tienen scripts inline que podrían estar afectados por la CSP de GitHub Pages.

### P2 — Mejora
4. **Agregar `nonce` o `hash` al meta CSP** — Para no depender de `'unsafe-inline'` como mecanismo de seguridad.

---

## Notas de Entorno

- **Landing page (Next.js):** Desplegada en Vercel — no afectada por CSP de GitHub Pages ✅
- **App principal (normativa-app-v2.html):** Usa scripts externos, no inline — no afectada ✅  
- **registro.html:** Único archivo con script inline crítico — afectado 🔴
- **login.html y admin.html:** También tienen scripts inline — verificar por separado

---

*Reporte generado automáticamente por Claude QA — NormaLis captación y flujos de pago*
