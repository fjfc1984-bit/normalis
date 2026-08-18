/**
 * web/lib/securityLog.ts
 * Bitácora de seguridad inmutable — ISO 27001 Anexo A.12 (registro de
 * eventos), A.9 (trazabilidad de accesos).
 *
 * Diseño: el navegador NUNCA escribe directamente en Firestore
 * (`bitacora_seguridad` solo admite `create` desde isAdmin() — ver
 * firestore.rules). Cada evento se envía al Worker vía POST /audit, que lo
 * valida y lo escribe con el token de servicio (cron@normalis.co). Así,
 * ni siquiera un usuario con acceso a las devtools puede fabricar o borrar
 * una entrada de su propio historial.
 *
 * Lectura: sí es directa contra Firestore (respeta las rules — cada quien
 * ve su propio historial o el de su IPS por NIT).
 */

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { WORKER_URL } from '@/lib/worker';

export type SecurityLogAccion =
  | 'login'
  | 'admin_aprobar_usuario'
  | 'admin_rechazar_usuario'
  | 'llave_api_creada'
  | 'llave_api_revocada'
  | 'llave_api_reactivada'
  | 'llave_api_eliminada'
  | 'pqrs_respondida'
  | 'mfa_enrolado'
  | 'documento_firmado'
  | 'consentimiento_firmado';

export const ACCION_LABEL: Record<SecurityLogAccion, string> = {
  login:                   'Inicio de sesión',
  admin_aprobar_usuario:   'Usuario aprobado',
  admin_rechazar_usuario:  'Usuario rechazado',
  llave_api_creada:        'Llave API creada',
  llave_api_revocada:      'Llave API revocada',
  llave_api_reactivada:    'Llave API reactivada',
  llave_api_eliminada:     'Llave API eliminada',
  pqrs_respondida:         'PQRS respondida',
  mfa_enrolado:            'Verificación en dos pasos activada',
  documento_firmado:       'Documento firmado electrónicamente',
  consentimiento_firmado:  'Consentimiento informado firmado',
};

export interface SecurityLogItem {
  id:        string;
  uid:       string;
  email:     string;
  nit:       string;
  accion:    SecurityLogAccion;
  modulo:    string;
  detalle:   string;
  origen:    string;
  ip:        string;
  timestamp: number; // epoch ms
}

/**
 * Registra un evento en la bitácora de seguridad. Falla en silencio (best
 * effort, logueado a consola) — un fallo de auditoría nunca debe bloquear
 * la acción real del usuario.
 */
export async function logSecurityEvent(
  accion:  SecurityLogAccion,
  modulo?: string,
  detalle?: string,
): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) return;
    const idToken = await user.getIdToken();
    await fetch(`${WORKER_URL}/audit`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body:    JSON.stringify({ accion, modulo, detalle }),
    });
  } catch (e) {
    console.error('[securityLog] No se pudo registrar el evento:', e);
  }
}

/**
 * Lee el historial de la bitácora de seguridad — el propio del usuario, o
 * el de toda su IPS si tiene NIT configurado (mismo criterio que otros
 * módulos: filtro simple por NIT + orden en cliente, sin índice compuesto).
 */
export function useBitacoraSeguridad(uid: string | null, nit: string | null) {
  const [items,   setItems]   = useState<SecurityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const q = nit
        ? query(collection(db, 'bitacora_seguridad'), where('nit', '==', nit))
        : query(collection(db, 'bitacora_seguridad'), where('uid', '==', uid));
      const snap = await getDocs(q);
      const data: SecurityLogItem[] = snap.docs.map(d => {
        const r = d.data();
        const ts = r.timestamp as Timestamp | undefined;
        return {
          id:        d.id,
          uid:       r.uid       ?? '',
          email:     r.email     ?? '',
          nit:       r.nit       ?? '',
          accion:    r.accion    ?? 'login',
          modulo:    r.modulo    ?? '',
          detalle:   r.detalle   ?? '',
          origen:    r.origen    ?? 'web',
          ip:        r.ip        ?? '',
          timestamp: ts ? ts.toMillis() : 0,
        };
      });
      data.sort((a, b) => b.timestamp - a.timestamp);
      setItems(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [uid, nit]);

  useEffect(() => { cargar(); }, [cargar]);

  return { items, loading, error, recargar: cargar };
}
