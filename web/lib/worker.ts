/**
 * lib/worker.ts
 * Cliente tipado para el Cloudflare Worker de NormaLis.
 * Mismo endpoint que usa el sitio legacy — sin duplicar lógica de negocio.
 */

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? 'https://normalis.fjfc1984.workers.dev';

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
