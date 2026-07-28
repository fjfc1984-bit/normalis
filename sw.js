// sw.js — NormaLis Service Worker
// Estrategia: cache-first para assets estáticos, network-first para HTML
// Versión: incrementar CACHE_VERSION para forzar actualización
const CACHE_VERSION = 'normalis-v7';
const CACHE_STATIC  = CACHE_VERSION + '-static';

// Todos los módulos JS y CSS del proyecto
const STATIC_ASSETS = [
  // CSS
  '/normalis-styles.css',

  // Módulos JS (27 archivos)
  '/normalis-analytics.js',
  '/normalis-audit-score.js',
  '/normalis-auth.js',
  '/normalis-autofix.js',
  '/normalis-automations.js',
  '/normalis-bitacora.js',
  '/normalis-capa.js',
  '/normalis-chat.js',
  '/normalis-checklist.js',
  '/normalis-data-audit.js',
  '/normalis-docs.js',
  '/normalis-export.js',
  '/normalis-firestore.js',
  '/normalis-incidentes.js',
  '/normalis-indicadores.js',
  '/normalis-multiusuario.js',
  '/normalis-pamec.js',
  '/normalis-pdf.js',
  '/normalis-pilot.js',
  '/normalis-plans.js',
  '/normalis-pqrs.js',
  '/normalis-simulacro.js',
  '/normalis-sst.js',
  '/normalis-tour.js',
  '/normalis-users.js',
  '/normalis-utils.js',
  '/normalis-vencimientos.js',

  // Páginas HTML
  '/normativa-app-v2.html',
  '/login.html',
  '/registro.html',
  '/index.html',
];

// ─── Install: pre-cache todos los assets estáticos ──────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      // addAll falla si cualquier recurso no responde — usar individual con catch
      return Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => {
            console.warn('[SW] No se pudo cachear:', url, err.message);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate: eliminar caches antiguas ─────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_STATIC)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: estrategia por tipo de recurso ──────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests no-GET y de otros orígenes (Firebase, Cloudflare, etc.)
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // API Worker y Firebase → siempre network (nunca cache)
  if (url.pathname.startsWith('/api/') ||
      url.hostname.includes('workers.dev') ||
      url.hostname.includes('firebaseapp.com') ||
      url.hostname.includes('googleapis.com')) {
    return;
  }

  // Archivos HTML → network-first con fallback a cache
  if (request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_STATIC).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // JS y CSS → cache-first con revalidación en background (stale-while-revalidate)
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      caches.open(CACHE_STATIC).then(cache =>
        cache.match(request).then(cached => {
          const networkFetch = fetch(request).then(response => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // Todo lo demás → network con fallback a cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ─── Mensajes del cliente ────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

// END:sw.js — NormaLis integrity seal
