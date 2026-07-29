/**
 * firestore-admin.js — NormaLis
 * ─────────────────────────────────────────────────────────────────────────────
 * Acceso a Firestore desde Cloudflare Worker usando la REST API de Firestore
 * autenticada con un Service Account de Firebase.
 *
 * POR QUÉ NO SE USA EL FIREBASE ADMIN SDK:
 *   El Admin SDK requiere Node.js (usa 'fs', 'http', 'crypto' de Node).
 *   Cloudflare Workers corre en V8 isolates — no tiene Node.js.
 *   En cambio, usamos:
 *     1. crypto.subtle (Web Crypto API — disponible en Workers) para firmar JWTs.
 *     2. fetch (disponible en Workers) para llamar la REST API de Firestore.
 *
 * FLUJO DE AUTENTICACIÓN:
 *   Service Account JSON → JWT firmado con RS256 → OAuth 2.0 access token
 *   → Cloudflare Worker lo usa para llamar la REST API de Firestore.
 *   El access token tiene duración de 60 min; se cachea en memoria (55 min).
 *
 * SECRETS REQUERIDOS EN CLOUDFLARE (wrangler secret put):
 *   FIREBASE_CLIENT_EMAIL  → client_email del JSON de Service Account
 *   FIREBASE_PRIVATE_KEY   → private_key del JSON de Service Account
 *
 * VAR REQUERIDA EN wrangler.toml:
 *   [vars]
 *   FIREBASE_PROJECT_ID = "normalis-5587d"
 *
 * COLECCIONES FIRESTORE LEÍDAS:
 *   usuarios/{uid}           → perfil del usuario (para resolver el NIT)
 *   ips/{nit}                → perfil de la IPS
 *   vencimientos             → filtrado por uid (flat collection)
 *   capas                    → filtrado por uid (flat collection)
 *   indicadores              → filtrado por uid (flat collection)
 *
 * USO DESDE cloudflare-worker.js:
 *   import { fetchIPSContext, formatIPSContextForLLM } from './firestore-admin.js';
 *   const data = await fetchIPSContext(uid, nit, modulo, env);
 *   const ctx  = formatIPSContextForLLM(data);
 */

// ── Constantes ────────────────────────────────────────────────────────────────

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FIRESTORE_BASE   = 'https://firestore.googleapis.com/v1';

// Cache de access token en memoria del Worker isolate (persiste entre requests calientes)
let _cachedToken  = null;
let _tokenExpiry  = 0;         // epoch seconds

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 1: JWT + OAuth — obtener access token de Google
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Convierte un objeto o string a Base64URL (sin padding, - y _ en lugar de + y /)
 */
function b64url(input) {
  const str = typeof input === 'string' ? input : JSON.stringify(input);
  // btoa + encodeURIComponent para manejar caracteres Unicode
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Importa la clave privada PEM del Service Account al formato CryptoKey
 * que entiende crypto.subtle.
 *
 * NOTA: El private_key del JSON de Service Account tiene \n literales
 * (backslash-n). Los normalizamos a saltos de línea reales antes de parsear.
 */
async function importPrivateKey(pem) {
  // Normalizar: el secret de Cloudflare puede tener \n literales
  const normalized = pem.replace(/\\n/g, '\n');

  // Extraer solo el contenido Base64 (quitar encabezado/pie PEM y espacios)
  const b64 = normalized
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');

  // Decodificar a bytes
  const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));

  return crypto.subtle.importKey(
    'pkcs8',
    binary.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,   // no exportable
    ['sign']
  );
}

/**
 * Firma un JWT RS256 con el private_key del Service Account.
 * Retorna el JWT como string "header.payload.signature".
 */
async function signJWT(claims, privateKeyPem) {
  const header = b64url({ alg: 'RS256', typ: 'JWT' });
  const body   = b64url(claims);
  const input  = `${header}.${body}`;

  const key = await importPrivateKey(privateKeyPem);
  const sigBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(input)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${input}.${sig}`;
}

/**
 * Obtiene (o retorna del cache) un Google OAuth 2.0 access token
 * usando el Service Account del Worker.
 *
 * El token es válido 60 min; lo cacheamos 55 min para evitar expiración
 * en el medio de un request.
 *
 * @param {object} env — bindings del Worker (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
 * @returns {Promise<string>} access token
 */
export async function getAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);

  // Retornar del cache si aún es válido
  if (_cachedToken && now < _tokenExpiry) {
    return _cachedToken;
  }

  // Construir el JWT con los claims requeridos por Google OAuth
  const jwt = await signJWT({
    iss:   env.FIREBASE_CLIENT_EMAIL,   // "issuer" = service account email
    sub:   env.FIREBASE_CLIENT_EMAIL,   // "subject" = mismo email
    scope: 'https://www.googleapis.com/auth/datastore',  // scope de Firestore
    aud:   GOOGLE_TOKEN_URL,
    iat:   now,
    exp:   now + 3600,  // válido 1 hora
  }, env.FIREBASE_PRIVATE_KEY);

  // Intercambiar el JWT por un access token de Google
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Firebase auth failed (${resp.status}): ${err.slice(0, 200)}`);
  }

  const data = await resp.json();
  _cachedToken = data.access_token;
  _tokenExpiry = now + 3300;  // cache por 55 min
  return _cachedToken;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 2: Firestore REST API — leer documentos y colecciones
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Lee un documento de Firestore por su ruta exacta.
 * Ej: firestoreGet('usuarios/uid123', env) → documento raw de Firestore
 *
 * @param {string} path — ruta del documento (sin "projects/.../documents/")
 * @param {object} env
 * @returns {Promise<object|null>} documento raw de Firestore, o null si no existe
 */
export async function firestoreGet(path, env) {
  const token = await getAccessToken(env);
  const url = `${FIRESTORE_BASE}/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (resp.status === 404) return null;  // documento no existe — no es un error

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Firestore GET "${path}" falló (${resp.status}): ${err.slice(0, 200)}`);
  }

  return resp.json();
}

/**
 * Hace una consulta estructurada en Firestore (equivalente a un WHERE query).
 * Usa el endpoint :runQuery de la REST API.
 *
 * Ej: firestoreQuery('vencimientos', 'uid', 'abc123', env, 20)
 *     → documentos de la colección 'vencimientos' donde uid == 'abc123'
 *
 * @param {string}  collectionId — nombre de la colección (ej: 'vencimientos')
 * @param {string}  filterField  — campo por el que filtrar (ej: 'uid')
 * @param {string}  filterValue  — valor a igualar
 * @param {object}  env
 * @param {number}  limit        — máximo de documentos a retornar (default: 20)
 * @returns {Promise<object[]>} array de documentos ya parseados (plain JS objects)
 */
export async function firestoreQuery(collectionId, filterField, filterValue, env, limit = 20) {
  const token = await getAccessToken(env);
  // El endpoint :runQuery va sobre la base de datos, no sobre una colección específica
  const url = `${FIRESTORE_BASE}/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;

  const body = {
    structuredQuery: {
      from: [{ collectionId }],
      where: {
        fieldFilter: {
          field: { fieldPath: filterField },
          op:    'EQUAL',
          value: { stringValue: filterValue },
        },
      },
      limit,
    },
  };

  const resp = await fetch(url, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Firestore query "${collectionId}" WHERE ${filterField}=="${filterValue}" falló (${resp.status}): ${err.slice(0, 200)}`);
  }

  const results = await resp.json();

  // :runQuery devuelve un array de objetos {document: {...}} o {readTime: ...} si no hay resultados
  return results
    .filter(r => r.document)
    .map(r => parseFirestoreDoc(r.document));
}

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 3: Parser de documentos Firestore
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Convierte un documento de Firestore (formato REST API con tipos) a un
 * objeto JavaScript plano.
 *
 * La REST API de Firestore retorna campos con tipos explícitos así:
 *   { "nombre": { "stringValue": "Clínica Norte" } }
 *   { "activo": { "booleanValue": true } }
 *   { "puntaje": { "integerValue": "87" } }
 *
 * Esta función los convierte a:
 *   { nombre: "Clínica Norte", activo: true, puntaje: 87 }
 *
 * @param {object} doc — documento raw con { name, fields }
 * @returns {object|null}
 */
export function parseFirestoreDoc(doc) {
  if (!doc || !doc.fields) return null;
  const result = {};
  for (const [key, typedVal] of Object.entries(doc.fields)) {
    result[key] = parseFirestoreValue(typedVal);
  }
  return result;
}

/**
 * Parsea un valor tipado de Firestore a su equivalente JS nativo.
 * Soporta: string, integer, double, boolean, null, timestamp, map, array, reference.
 */
function parseFirestoreValue(val) {
  if (val.stringValue    !== undefined) return val.stringValue;
  if (val.integerValue   !== undefined) return Number(val.integerValue);
  if (val.doubleValue    !== undefined) return val.doubleValue;
  if (val.booleanValue   !== undefined) return val.booleanValue;
  if (val.nullValue      !== undefined) return null;
  if (val.timestampValue !== undefined) return val.timestampValue;  // ISO string
  if (val.referenceValue !== undefined) return val.referenceValue;  // path string
  if (val.mapValue)   return parseFirestoreDoc(val.mapValue);
  if (val.arrayValue) return (val.arrayValue.values || []).map(parseFirestoreValue);
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 4: fetchIPSContext — punto de entrada principal
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetches the real Firestore data for a specific user/IPS and module.
 * Reads only what's relevant for the active module to stay within LLM token limits.
 *
 * SEGURIDAD: El uid viene del frontend (usuario autenticado). Para V1 lo
 * confiamos, ya que:
 *   1. El Worker solo lee datos propios del usuario (filtrado por uid/nit).
 *   2. Los errores de acceso a datos de otro usuario solo afectarían el contexto
 *      del chat, no datos críticos (el Worker es read-only desde Firestore).
 *
 * @param {string} uid     — Firebase Auth UID del usuario
 * @param {string} nit     — NIT de la IPS (puede venir del frontend o de Firestore)
 * @param {string} modulo  — módulo activo (ej: 'vencimientos', 'capa', etc.)
 * @param {object} env     — Worker env bindings
 * @returns {Promise<object|null>} datos o null si falla/no hay datos
 */
export async function fetchIPSContext(uid, nit, modulo, env) {
  // Sin credenciales configuradas → degradación elegante
  if (!env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) return null;
  if (!uid && !nit) return null;

  const result = {};

  try {
    // ── 1. Perfil del usuario + resolver NIT si no lo tenemos ────────────────
    if (uid) {
      const userDoc = await firestoreGet(`usuarios/${uid}`, env);
      if (userDoc) {
        const user = parseFirestoreDoc(userDoc);
        // Usar el NIT del Firestore si el frontend no lo envió (o para verificación)
        if (!nit && user?.nit) nit = user.nit;
        // Guardar datos básicos del usuario para el LLM
        if (user) {
          result.usuario = {
            nombre:        user.nombre        || '',
            nombreContacto:user.nombreContacto|| '',
            rol:           user.rol           || '',
            plan:          user.plan          || 'basico',
          };
        }
      }
    }

    // ── 2. Perfil de la IPS (documento raíz) ────────────────────────────────
    if (nit) {
      const ipsDoc = await firestoreGet(`ips/${nit}`, env);
      if (ipsDoc) {
        const ips = parseFirestoreDoc(ipsDoc);
        if (ips) {
          result.ips = {
            nombre:  ips.nombre  || ips.nombreIPS || '',
            tipo:    ips.tipoIPS || ips.tipo      || '',
            ciudad:  ips.ciudad  || '',
            nit:     ips.nit     || nit,
          };
        }
      }
    }

    // ── 3. Datos específicos del módulo activo ───────────────────────────────
    // Solo buscamos lo que es relevante para el módulo actual.
    // Esto reduce latencia y mantiene el contexto del LLM dentro de límites.
    if (uid) {
      switch (modulo) {

        case 'vencimientos': {
          // Vencimientos del usuario — colección flat, filtrado por uid
          const items = await firestoreQuery('vencimientos', 'uid', uid, env, 20);
          if (items.length > 0) {
            // Ordenar por fecha ascendente (más próximos primero)
            result.vencimientos = items
              .filter(v => v)
              .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
              .slice(0, 10)
              .map(v => ({
                titulo:  v.titulo  || v.nombre     || 'Sin título',
                fecha:   v.fecha   || v.fechaLimite|| 'Sin fecha',
                estado:  v.estado  || 'pendiente',
                tipo:    v.tipo    || '',
              }));
          }
          break;
        }

        case 'capa': {
          // CAPAs del usuario — colección flat, filtrado por uid
          const items = await firestoreQuery('capas', 'uid', uid, env, 15);
          if (items.length > 0) {
            const abiertas = items
              .filter(c => c && c.estado !== 'cerrada' && c.estado !== 'completada');
            result.capas = {
              total:    items.length,
              abiertas: abiertas.length,
              items:    abiertas.slice(0, 5).map(c => ({
                titulo:    c.titulo    || c.descripcion || 'Sin título',
                prioridad: c.prioridad || 'media',
                estado:    c.estado    || 'abierta',
                fecha:     c.fecha     || c.fechaCreacion || '',
              })),
            };
          }
          break;
        }

        case 'indicadores': {
          // Indicadores del usuario
          const items = await firestoreQuery('indicadores', 'uid', uid, env, 15);
          if (items.length > 0) {
            result.indicadores = {
              total: items.length,
              items: items.filter(i => i).slice(0, 5).map(i => ({
                nombre:   i.nombre   || i.indicador || 'Sin nombre',
                valor:    i.valor    !== undefined ? i.valor : '?',
                meta:     i.meta     !== undefined ? i.meta  : '?',
                periodo:  i.periodo  || i.mes  || '',
                cumple:   i.cumple   !== undefined ? i.cumple : null,
              })),
            };
          }
          break;
        }

        case 'auditoria':
        case 'resultados': {
          // Resultados de auditoría guardados en el perfil del usuario
          const userDoc = await firestoreGet(`usuarios/${uid}`, env);
          if (userDoc) {
            const user = parseFirestoreDoc(userDoc);
            if (user?.auditorias_completadas || user?.ultimo_puntaje) {
              result.auditoria = {
                completadas: user.auditorias_completadas || 0,
                ultimo_puntaje: user.ultimo_puntaje || null,
                ultima_fecha:   user.ultima_auditoria || null,
              };
            }
          }
          break;
        }

        case 'sst': {
          // Datos SST — guardados en ips/{nit}/data/sst o como campo del usuario
          if (nit) {
            const sstDoc = await firestoreGet(`ips/${nit}/data/sst`, env);
            if (sstDoc) result.sst = parseFirestoreDoc(sstDoc);
          }
          break;
        }

        // Para pamec, pqrs, incidentes, simulacro, bitacora, documentos:
        // Solo con el perfil de la IPS y el módulo hint ya hay suficiente contexto.
        default:
          break;
      }
    }

    // Retornar null si no hay datos útiles (solo evita inyectar contexto vacío)
    return Object.keys(result).length > 0 ? result : null;

  } catch (err) {
    // Degradación elegante: si Firestore falla, el chat sigue funcionando
    // sin datos de contexto real. No rompemos el flujo principal.
    console.warn(`[Firestore] fetchIPSContext failed (uid:${uid}, mod:${modulo}):`, err.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 5: formatIPSContextForLLM — preparar los datos para el LLM
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Convierte los datos de Firestore a un bloque de texto optimizado para LLM.
 * El bloque se inyecta en el system prompt antes del RAG.
 *
 * IMPORTANTE: Mantener este bloque CONCISO para no consumir demasiados tokens.
 * El LLM solo necesita los hechos clave, no un dump completo de Firestore.
 *
 * @param {object|null} data — resultado de fetchIPSContext()
 * @returns {string} bloque de texto para inyectar en systemContent, o '' si no hay datos
 */
export function formatIPSContextForLLM(data) {
  if (!data) return '';

  const lines = ['\n\n════ DATOS REALES DE ESTA IPS (Firestore) ════'];

  // Perfil IPS
  if (data.ips) {
    const { nombre, tipo, ciudad, nit } = data.ips;
    if (nombre) lines.push(`IPS: "${nombre}" | Tipo: ${tipo || '?'} | Ciudad: ${ciudad || '?'} | NIT: ${nit || '?'}`);
  }

  // Plan del usuario
  if (data.usuario?.plan && data.usuario.plan !== 'basico') {
    lines.push(`Plan: ${data.usuario.plan}`);
  }

  // Vencimientos
  if (data.vencimientos?.length > 0) {
    const prox = data.vencimientos.slice(0, 5);
    lines.push(`\nVENCIMIENTOS PROXIMOS (${data.vencimientos.length} registros):`);
    prox.forEach(v => {
      const estado = v.estado !== 'pendiente' ? ` [${v.estado}]` : '';
      lines.push(`  - ${v.titulo}: ${v.fecha}${estado}`);
    });
  }

  // CAPAs
  if (data.capas) {
    lines.push(`\nCAPAs: ${data.capas.total} total, ${data.capas.abiertas} abiertas`);
    if (data.capas.items?.length > 0) {
      data.capas.items.forEach(c => {
        lines.push(`  - "${c.titulo}" [${c.prioridad}] — ${c.estado}`);
      });
    }
  }

  // Indicadores
  if (data.indicadores) {
    lines.push(`\nINDICADORES: ${data.indicadores.total} registrados`);
    data.indicadores.items?.forEach(i => {
      const cumple = i.cumple === true ? 'CUMPLE' : i.cumple === false ? 'NO CUMPLE' : '?';
      lines.push(`  - ${i.nombre}: valor=${i.valor} / meta=${i.meta} [${cumple}]`);
    });
  }

  // Auditoría
  if (data.auditoria) {
    const { completadas, ultimo_puntaje, ultima_fecha } = data.auditoria;
    if (completadas || ultimo_puntaje) {
      lines.push(`\nAUDITORIAS: ${completadas || 0} completadas${ultimo_puntaje ? ` | Último puntaje: ${ultimo_puntaje}%` : ''}${ultima_fecha ? ` (${ultima_fecha})` : ''}`);
    }
  }

  // SST
  if (data.sst) {
    const fase = data.sst.fase_actual || data.sst.fase || null;
    if (fase) lines.push(`\nSG-SST: Fase actual ${fase}`);
  }

  // Si solo tenemos el header, no inyectar nada
  if (lines.length <= 1) return '';

  lines.push('════ USA ESTOS DATOS REALES en tu respuesta. No los inventes. ════');
  return lines.join('\n');
}
