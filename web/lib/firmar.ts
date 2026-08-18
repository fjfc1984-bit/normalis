/**
 * web/lib/firmar.ts
 * Cliente para el módulo de firma electrónica — Ley 527/1999 Art. 7,
 * Decreto 1074/2015 Art. 2.2.2.47.1 (definición de firma electrónica).
 *
 * DISEÑO: el navegador nunca calcula ni guarda la prueba de firma por su
 * cuenta. El contenido firmado se hashea (SHA-256) y se envía al Worker
 * junto con el ID token de Firebase; el Worker recalcula el hash, arma un
 * HMAC-SHA256 con un secreto que el cliente nunca ve, y escribe un registro
 * INMUTABLE en la colección `firmas` (mismo patrón que bitacora_seguridad).
 * Así, ni un usuario con acceso de escritura a Firestore ni un fallo del
 * cliente pueden fabricar una firma válida — la evidencia vive fuera del
 * alcance del navegador.
 *
 * Esto implementa el nivel "firma electrónica" (Art. 7 Ley 527/1999): un
 * método confiable y apropiado para identificar al firmante y vincular su
 * aprobación al contenido exacto firmado, con invalidación detectable si el
 * contenido cambia después. NO es "firma digital" certificada (Art. 28,
 * Decreto 2364/2012 — requiere una Entidad de Certificación Digital
 * acreditada como Certicámara o Andes SCD); para documentos de alto valor
 * jurídico, complementa con esa vía.
 */

import { auth } from '@/lib/firebase';
import { WORKER_URL } from '@/lib/worker';

export type TipoFirma = 'documento' | 'consentimiento_paciente' | 'consentimiento_medico';

export interface FirmaResultado {
  id:            string;
  contenidoHash: string;
  hmac:          string;
  timestamp:     string;
}

export interface DatosFirma {
  tipo:      TipoFirma;
  refId:     string;
  contenido: string;   // texto/HTML exacto que se está aprobando — se hashea aquí y en el Worker
  firmante:  string;   // nombre de quien firma (puede no tener cuenta NormaLis, ej. paciente)
  cedula?:   string;   // solo consentimiento_paciente
  firmaImgBase64?: string; // PNG dataURL de la firma dibujada (canvas), opcional
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Crea una firma electrónica: hashea el contenido localmente (para no
 * enviar documentos completos por la red si no es necesario) y pide al
 * Worker que la selle con el HMAC del servidor.
 */
export async function crearFirma(datos: DatosFirma): Promise<FirmaResultado> {
  const user = auth.currentUser;
  if (!user) throw new Error('Debes iniciar sesión para firmar.');
  const idToken = await user.getIdToken();

  const contenidoHash = await sha256Hex(datos.contenido);
  const firmaImgHash  = datos.firmaImgBase64 ? await sha256Hex(datos.firmaImgBase64) : undefined;

  // Nota: la imagen de la firma dibujada NO se envía al Worker — solo su
  // hash, para vincularla al sello sin ampliar innecesariamente lo que
  // pasa por el endpoint. La imagen en sí se guarda directamente en el
  // documento de Firestore del consentimiento (ya escribible por su dueño).
  const res = await fetch(`${WORKER_URL}/firmar`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({
      tipo:      datos.tipo,
      refId:     datos.refId,
      contenidoHash,
      firmante:  datos.firmante,
      cedula:    datos.cedula,
      firmaImgHash,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `No se pudo registrar la firma (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Verifica la integridad de una firma existente: recalcula el hash del
 * contenido ACTUAL y le pide al Worker que confirme si el HMAC almacenado
 * sigue siendo válido para ese hash. Si el documento cambió después de
 * firmarse, contenidoCoincide vendrá en false.
 */
export async function verificarFirma(firmaId: string, contenidoActual: string): Promise<{
  valido: boolean;
  contenidoCoincide: boolean;
  firmadoPor: string;
  timestamp: string;
}> {
  const user = auth.currentUser;
  if (!user) throw new Error('Debes iniciar sesión.');
  const idToken = await user.getIdToken();
  const contenidoHash = await sha256Hex(contenidoActual);

  const res = await fetch(
    `${WORKER_URL}/firmar/verificar?id=${encodeURIComponent(firmaId)}&hash=${encodeURIComponent(contenidoHash)}`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `No se pudo verificar la firma (HTTP ${res.status})`);
  }
  return res.json();
}
