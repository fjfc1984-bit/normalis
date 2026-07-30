/**
 * GET /api/health
 * Server-side health check — avoids CORS al consultar Firebase desde el cliente.
 * Verifica Firebase Auth REST API (público, no requiere credenciales).
 */

import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  let firebase: 'ok' | 'error' = 'error';

  try {
    // getProjectConfig es un endpoint público que Firebase SDK usa al inicializar.
    // Devuelve 200 + config del proyecto si Firebase está activo.
    const apiKey = 'AIzaSyArUb9rzv6lHeunq_bPgbbe0vmekysx5R4';
    const r = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${apiKey}`,
      { method: 'GET' },
    );
    firebase = r.ok ? 'ok' : 'error';
  } catch {
    firebase = 'error';
  }

  return NextResponse.json({ firebase }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
