/**
 * NormaLis — Stripe Payments Worker v1
 *
 * Maneja:
 *   POST /create-checkout  → crea sesión de Stripe Checkout y devuelve la URL
 *   POST /webhook          → procesa eventos de Stripe (payment.succeeded) y actualiza Firestore
 *
 * Secrets requeridos (Cloudflare Dashboard → Workers → normalis-stripe → Settings → Variables):
 *   STRIPE_SECRET_KEY      → sk_live_... (o sk_test_... en pruebas)
 *   STRIPE_WEBHOOK_SECRET  → whsec_... (del endpoint de webhook en Stripe Dashboard)
 *   FIREBASE_SERVICE_KEY   → JSON stringify del service account de Firebase (para Admin SDK)
 *
 * Productos Stripe que debes crear en el Dashboard (Stripe → Products):
 *   - "NormaLis Básico"  → precio mensual recurrente en COP 129.000  → copiar price_ID → PRICE_BASICO
 *   - "NormaLis Pro"     → precio mensual recurrente en COP 249.000  → copiar price_ID → PRICE_PRO
 */

const ALLOWED_ORIGINS = [
  'https://normalis.co',
  'https://www.normalis.co',
];

// ─── Reemplaza estos IDs con los de tus productos reales en Stripe Dashboard ───
const PRICE_IDS = {
  basico: 'price_1Tv4n8Rpw0Rg1EVknJlk8ZDc',  // COP 129.000/mes — NormaLis Básico (test)
  pro:    'price_1Tv51IRpw0Rg1EVkk6uFLBNG',  // COP 249.000/mes — NormaLis Pro (test)
};

const SUCCESS_URL = 'https://normalis.co/success.html?session_id={CHECKOUT_SESSION_ID}';
const CANCEL_URL  = 'https://normalis.co/pricing.html';

// ─── Firestore REST endpoint ───────────────────────────────────────────────────
const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/normalis-5587d/databases/(default)/documents';

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://normalis.co',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
  };
}

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors   = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // ── POST /create-checkout ────────────────────────────────────────────────
    if (url.pathname === '/create-checkout' && request.method === 'POST') {
      return handleCreateCheckout(request, env, cors);
    }

    // ── POST /webhook ────────────────────────────────────────────────────────
    if (url.pathname === '/webhook' && request.method === 'POST') {
      return handleWebhook(request, env);
    }

    return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), {
      status: 404,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};

// ────────────────────────────────────────────────────────────────────────────────
async function handleCreateCheckout(request, env, cors) {
  let body;
  try { body = await request.json(); } catch {
    return jsonError('JSON inválido', 400, cors);
  }

  const { plan, email } = body || {};
  if (!plan || !PRICE_IDS[plan]) return jsonError('Plan inválido', 400, cors);

  const priceId = PRICE_IDS[plan];
  const stripeKey = env.STRIPE_SECRET_KEY;
  if (!stripeKey) return jsonError('Stripe no configurado', 500, cors);

  // Crear sesión de Checkout via Stripe API
  const params = new URLSearchParams({
    'mode':                          'subscription',
    'line_items[0][price]':           priceId,
    'line_items[0][quantity]':        '1',
    'success_url':                    SUCCESS_URL,
    'cancel_url':                     CANCEL_URL,
    'payment_method_types[0]':        'card',
    'billing_address_collection':     'auto',
    'allow_promotion_codes':          'true',
  });

  if (email) params.set('customer_email', email);

  // metadata para el webhook
  params.set('metadata[plan]',   plan);
  params.set('metadata[source]', 'normalis_pricing');

  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!stripeRes.ok) {
    const err = await stripeRes.text();
    return jsonError('Error Stripe: ' + err, 502, cors);
  }

  const session = await stripeRes.json();
  return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// ────────────────────────────────────────────────────────────────────────────────
async function handleWebhook(request, env) {
  const body      = await request.text();
  const sigHeader = request.headers.get('Stripe-Signature') || '';
  const secret    = env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[Webhook] STRIPE_WEBHOOK_SECRET no configurado');
    return new Response('Config error', { status: 500 });
  }

  // Verificar firma del webhook
  let event;
  try {
    event = await verifyStripeSignature(body, sigHeader, secret);
  } catch (err) {
    console.error('[Webhook] Firma inválida:', err.message);
    return new Response('Firma inválida', { status: 400 });
  }

  console.log(`[Webhook] Evento recibido: ${event.type}`);

  // Procesar eventos relevantes
  if (event.type === 'checkout.session.completed') {
    const session  = event.data.object;
    const email    = session.customer_details?.email || session.customer_email;
    const plan     = session.metadata?.plan || 'basico';
    const customerId = session.customer;

    console.log(`[Webhook] Pago exitoso — email: ${email}, plan: ${plan}`);

    if (email) {
      await activateSubscription(email, plan, customerId, env);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    // Suscripción cancelada — bajar a rol pendiente o cliente sin acceso
    const subscription = event.data.object;
    const customerId   = subscription.customer;
    await deactivateSubscription(customerId, env);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ────────────────────────────────────────────────────────────────────────────────
// Busca el usuario en Firestore por email y actualiza su rol a 'cliente'
async function activateSubscription(email, plan, customerId, env) {
  try {
    // Obtener token de Firebase Admin via Service Account
    const token = await getFirebaseToken(env);

    // Buscar usuario por email en Firestore
    const queryRes = await fetch(
      `${FIRESTORE_BASE}:runQuery`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'usuarios' }],
            where: {
              fieldFilter: {
                field:  { fieldPath: 'email' },
                op:     'EQUAL',
                value:  { stringValue: email },
              },
            },
            limit: 1,
          },
        }),
      }
    );

    const results = await queryRes.json();
    const docRef  = results?.[0]?.document?.name;

    if (!docRef) {
      console.warn(`[Webhook] No se encontró usuario con email: ${email}`);
      return;
    }

    const uid = docRef.split('/').pop();

    // Actualizar rol y metadata de pago
    const updateRes = await fetch(
      `${FIRESTORE_BASE}/usuarios/${uid}?updateMask.fieldPaths=rol&updateMask.fieldPaths=plan&updateMask.fieldPaths=stripeCustomerId&updateMask.fieldPaths=activo`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          fields: {
            rol:             { stringValue: 'cliente' },
            plan:            { stringValue: plan },
            stripeCustomerId: { stringValue: customerId || '' },
            activo:          { booleanValue: true },
          },
        }),
      }
    );

    if (updateRes.ok) {
      console.log(`[Webhook] ✅ Usuario ${uid} activado como '${plan}'`);
    } else {
      const err = await updateRes.text();
      console.error(`[Webhook] Error actualizando Firestore: ${err}`);
    }
  } catch (err) {
    console.error('[Webhook] activateSubscription error:', err.message);
  }
}

async function deactivateSubscription(customerId, env) {
  try {
    const token = await getFirebaseToken(env);

    // Buscar usuario por stripeCustomerId en Firestore
    const queryRes = await fetch(
      `${FIRESTORE_BASE}:runQuery`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'usuarios' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'stripeCustomerId' },
                op:    'EQUAL',
                value: { stringValue: customerId },
              },
            },
            limit: 1,
          },
        }),
      }
    );

    const results = await queryRes.json();
    const docRef  = results?.[0]?.document?.name;

    if (!docRef) {
      console.warn(`[Webhook] No se encontró usuario con stripeCustomerId: ${customerId}`);
      return;
    }

    const uid = docRef.split('/').pop();

    // Marcar activo:false y bajar a 'pendiente' para bloquear acceso
    const updateRes = await fetch(
      `${FIRESTORE_BASE}/usuarios/${uid}?updateMask.fieldPaths=activo&updateMask.fieldPaths=rol`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          fields: {
            activo: { booleanValue: false },
            rol:    { stringValue: 'pendiente' },
          },
        }),
      }
    );

    if (updateRes.ok) {
      console.log(`[Webhook] ✅ Suscripción cancelada — usuario ${uid} → pendiente, activo:false`);
    } else {
      const err = await updateRes.text();
      console.error(`[Webhook] Error desactivando en Firestore: ${err}`);
    }
  } catch (err) {
    console.error('[Webhook] deactivateSubscription error:', err.message);
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// Genera un token de acceso de Firebase Admin via Service Account (JWT → OAuth2)
async function getFirebaseToken(env) {
  const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_KEY);
  const now = Math.floor(Date.now() / 1000);

  const header  = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss:   serviceAccount.client_email,
    sub:   serviceAccount.client_email,
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
    scope: 'https://www.googleapis.com/auth/datastore',
  };

  const encode = (obj) => btoa(JSON.stringify(obj)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const signingInput = encode(header) + '.' + encode(payload);

  // Importar clave privada RSA
  const pemKey = serviceAccount.private_key;
  const keyData = pemKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const encoder  = new TextEncoder();
  const sigBytes = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, encoder.encode(signingInput));
  const sig      = btoa(String.fromCharCode(...new Uint8Array(sigBytes))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const jwt      = signingInput + '.' + sig;

  // Intercambiar JWT por access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

// ────────────────────────────────────────────────────────────────────────────────
// Verificación de firma HMAC-SHA256 de Stripe (sin librería externa)
async function verifyStripeSignature(body, header, secret) {
  const parts     = header.split(',').reduce((acc, part) => {
    const [k, v] = part.split('=');
    acc[k.trim()] = v;
    return acc;
  }, {});
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) throw new Error('Cabecera Stripe-Signature malformada');

  const encoder      = new TextEncoder();
  const key          = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signedPayload = encoder.encode(`${timestamp}.${body}`);
  const expectedSig   = await crypto.subtle.sign('HMAC', key, signedPayload);
  const expectedHex   = Array.from(new Uint8Array(expectedSig)).map(b => b.toString(16).padStart(2,'0')).join('');

  if (expectedHex !== signature) throw new Error('Firma no coincide');

  // Protección contra replay attacks (máx 5 minutos)
  const diff = Math.abs(Date.now() / 1000 - parseInt(timestamp));
  if (diff > 300) throw new Error('Timestamp demasiado antiguo');

  return JSON.parse(body);
}

function jsonError(msg, status, cors) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
