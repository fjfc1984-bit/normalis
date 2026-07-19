# Configuración de Stripe para NormaLis

## Paso 1 — Crear cuenta Stripe

1. Ve a https://stripe.com y crea tu cuenta
2. Completa la verificación de identidad y datos bancarios colombianos
3. Activa el modo **live** cuando estés listo (durante pruebas usa test mode)

## Paso 2 — Crear los productos en Stripe Dashboard

En Stripe Dashboard → **Products** → Add Product:

### Producto 1: NormaLis Básico
- Nombre: `NormaLis Básico`
- Descripción: `Habilitación IPS — 1 sede, todos los servicios`
- Precio: `129.000` COP, recurrente mensual
- Copiar el **Price ID** (empieza con `price_`) → pegarlo en `stripe-worker.js` → `PRICE_IDS.basico`

### Producto 2: NormaLis Pro
- Nombre: `NormaLis Pro`
- Descripción: `Habilitación IPS — Sedes ilimitadas, equipo hasta 5 usuarios`
- Precio: `249.000` COP, recurrente mensual
- Copiar el **Price ID** → pegarlo en `stripe-worker.js` → `PRICE_IDS.pro`

## Paso 3 — Desplegar el Stripe Worker en Cloudflare

1. En Cloudflare Dashboard → Workers → Create Worker
2. Nombre: `normalis-stripe`
3. Pegar el contenido de `stripe-worker.js`
4. Deploy

## Paso 4 — Configurar secrets en el Worker

En el Worker → Settings → Variables → Add Variable (con cifrado):

| Variable | Valor |
|----------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` (o `sk_test_...` para pruebas) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (del paso 5) |
| `FIREBASE_SERVICE_KEY` | JSON del Service Account de Firebase (ver paso 6) |

## Paso 5 — Configurar el Webhook en Stripe

En Stripe Dashboard → Developers → Webhooks → Add endpoint:

- URL: `https://normalis-stripe.TU-SUBDOMINIO.workers.dev/webhook`
- Eventos a escuchar:
  - `checkout.session.completed`
  - `customer.subscription.deleted`
  
Después de crear, copiar el **Signing secret** (`whsec_...`) → pegarlo en `STRIPE_WEBHOOK_SECRET`

## Paso 6 — Firebase Service Account

Para que el Worker pueda actualizar Firestore:

1. Firebase Console → Configuración del proyecto → Cuentas de servicio
2. Generar nueva clave privada → descarga JSON
3. Copiar todo el contenido del JSON
4. Pegarlo como valor de `FIREBASE_SERVICE_KEY` (el Worker lo parsea con `JSON.parse`)

## Paso 7 — Actualizar la URL del Worker en pricing.html

En `pricing.html`, línea con `const STRIPE_WORKER`:
```javascript
const STRIPE_WORKER = 'https://normalis-stripe.TU-SUBDOMINIO.workers.dev';
```

## Pruebas

En modo **test**, Stripe provee tarjetas de prueba:
- `4242 4242 4242 4242` — pago exitoso
- `4000 0000 0000 0002` — pago rechazado

El webhook también puede probarse con `stripe listen --forward-to localhost` (Stripe CLI).

## Flujo completo

```
Usuario en pricing.html
  → clic "Suscribirme"
  → POST /create-checkout al Worker
  → Worker crea sesión en Stripe API
  → Usuario llega a página de Stripe Checkout
  → Paga
  → Stripe redirige a success.html
  → Stripe envía webhook al Worker (/webhook)
  → Worker verifica firma
  → Worker busca usuario en Firestore por email
  → Worker actualiza rol a 'cliente' en Firestore
  → Usuario ya tiene acceso completo
```
