/**
 * lib/worker.ts
 * Cliente tipado para el Cloudflare Worker de NormaLis.
 * Mismo endpoint que usa el sitio legacy — sin duplicar lógica de negocio.
 */

export const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? 'https://normalis.fjfc1984.workers.dev';

export interface WorkerContext {
  modulo:     string;
  uid:        string;
  nit:        string;
  ips_nombre: string;
  ips_tipo?:  string;
}

export interface WorkerAccion {
  texto:  string;
  accion: 'navegar' | 'crearCAPA' | 'crearVencimiento' | 'crearIndicador';
  modulo: string;
}

export interface WorkerResponse {
  answer:    string;
  sources:   { source: string; score: number }[];
  toolsUsed: string[];
  acciones:  WorkerAccion[];
}

/**
 * Envía un email a través del endpoint /email del Worker (Resend server-side).
 * idToken solo es necesario para tipos que requieren autenticación (ej. pqrs_respuesta).
 * Lanza si el envío falla — el llamador decide cómo mostrarlo al usuario.
 */
export async function sendWorkerEmail(
  type: string,
  data: Record<string, unknown>,
  idToken?: string,
): Promise<void> {
  const res = await fetch(`${WORKER_URL}/email`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ type, data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Email error ${res.status}`);
  }
}

// ── PQRS público ─────────────────────────────────────────────────────────────
export interface PqrsPublicoPayload {
  uid:       string;
  tipo:      string;
  nombre:    string;
  desc:      string;
  area?:     string;
  email?:    string;
  telefono?: string;
}

/**
 * Envía una PQRS desde el formulario público (sin login) al endpoint /pqrs
 * del Worker, que la escribe en Firestore y notifica a la IPS por email.
 */
export async function submitPqrsPublico(payload: PqrsPublicoPayload): Promise<void> {
  const res = await fetch(`${WORKER_URL}/pqrs`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Error ${res.status}`);
  }
}

// ── Análisis de causa raíz — Protocolo de Londres ───────────────────────────
export interface FactorContribuyentePayload {
  categoria: string;
  detalle:   string;
}

export interface AnalisisIncidenteResponse {
  ok:                     true;
  estructurado:           boolean;
  factoresContribuyentes?: FactorContribuyentePayload[];
  causaRaiz?:             string;
  accionRecomendada?:     string;
  textoCrudo?:            string;
}

/**
 * Pide al Worker un análisis de causa raíz (Protocolo de Londres) de un
 * incidente ya registrado. Requiere el ID token de Firebase del usuario —
 * es una función interna del dashboard, no la API pública de integraciones.
 */
export async function analizarIncidente(
  payload: { tipo: string; severidad: string; desc: string; accion?: string },
  idToken: string,
): Promise<AnalisisIncidenteResponse> {
  const res = await fetch(`${WORKER_URL}/api/analizar-incidente`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Error ${res.status}`);
  }
  return res.json() as Promise<AnalisisIncidenteResponse>;
}

export async function askWorker(
  question: string,
  context:  WorkerContext,
  history:  { role: 'user' | 'model'; text: string }[] = [],
): Promise<WorkerResponse> {
  const res = await fetch(WORKER_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, context, sessionHistory: history }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Worker error ${res.status}`);
  }

  return res.json() as Promise<WorkerResponse>;
}
