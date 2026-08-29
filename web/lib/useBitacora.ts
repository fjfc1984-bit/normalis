'use client';

/**
 * web/lib/useBitacora.ts
 * Hook Firestore para el módulo Bitácora de Gobernanza — compartida por IPS.
 * Colección: bitacora_gobernanza/{id} (top-level, mismo patrón que
 * capas/indicadores/documentos_dms: filtra por nit si el usuario tiene uno,
 * si no por uid).
 *
 * ANTES vivía en usuarios/{uid}/bitacora — subcolección visible solo para el
 * dueño de la cuenta. Se migró a colección de nivel superior para que todo
 * el Equipo IPS (Feature 1) vea la misma bitácora. Los registros que existan
 * en la subcolección vieja quedan huérfanos (no se migran automáticamente).
 *
 * Además de la edición manual desde la pantalla, otros módulos (CAPAs,
 * PQRS, Incidentes, Indicadores, SG-SST, Documentos DMS, Auditoría,
 * Vencimientos) dejan su propio rastro automático llamando a
 * `registrarBitacora()` — ver cada hook para el punto exacto donde se llama.
 * Un fallo al registrar NUNCA debe romper la operación principal del módulo
 * que la originó: `registrarBitacora` es best-effort y solo hace
 * console.error si falla.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, addDoc, deleteDoc, onSnapshot,
  orderBy, query, where, limit, serverTimestamp, Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db as fbDb, auth as fbAuth } from '@/lib/firebase';
import type { BitacoraEntry, BitacoraModulo } from '@/lib/bitacoraTypes';

export interface NuevoRegistro {
  modulo:  BitacoraModulo;
  accion:  string;
  detalle: string;
}

const MAX_ENTRIES = 500;

// ── Registro automático desde CUALQUIER módulo ─────────────────────────────
// Standalone (no depende del hook de React) para que cualquier otro hook
// pueda importarla y dejar su rastro sin necesidad de montar la pantalla de
// Bitácora. `nit` puede ir vacío ('') si el módulo que llama no maneja NIT
// compartido — el registro queda visible solo para su dueño, igual que hoy.
export async function registrarBitacora(
  uid: string,
  nit: string | null | undefined,
  modulo: BitacoraModulo,
  accion: string,
  detalle: string = '',
): Promise<void> {
  try {
    const now = Date.now();
    await addDoc(collection(fbDb, 'bitacora_gobernanza'), {
      uid,
      nit: nit || '',
      usuario: fbAuth.currentUser?.displayName || fbAuth.currentUser?.email || 'Usuario',
      modulo,
      accion,
      detalle,
      ts: new Date(now).toISOString(),
      creadoEn: now,
      origen: 'auto' as const,
      savedAt: serverTimestamp(),
    });
  } catch (e) {
    // Best-effort: nunca debe romper la operación del módulo que la originó.
    console.error('[Bitácora] No se pudo registrar automáticamente:', e);
  }
}

export function useBitacora(uid: string | null, nit: string | null, userName: string) {
  const [entries, setEntries] = useState<BitacoraEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!uid) { setEntries([]); setLoading(false); return; }
    setLoading(true);
    setError(null);

    const mapDocs = (docs: Array<{ id: string; data: () => Record<string, unknown> }>): BitacoraEntry[] =>
      docs.map(d => {
        const r = d.data();
        return {
          id:       d.id,
          uid:      (r.uid as string)  ?? '',
          nit:      (r.nit as string)  ?? '',
          ts:       (r.ts as string)   ?? new Date().toISOString(),
          usuario:  (r.usuario as string) ?? '',
          modulo:   r.modulo as BitacoraModulo,
          accion:   (r.accion as string)  ?? '',
          detalle:  (r.detalle as string) ?? '',
          creadoEn: (r.creadoEn as number) ?? 0,
          origen:   (r.origen as BitacoraEntry['origen']) ?? 'manual',
        };
      });

    // Preferir query por NIT (compartida por Equipo IPS) si el usuario tiene
    // uno; si no, por uid (mismo criterio que capas/indicadores).
    const baseQuery = nit
      ? query(collection(fbDb, 'bitacora_gobernanza'), where('nit', '==', nit), orderBy('creadoEn', 'desc'), limit(MAX_ENTRIES))
      : query(collection(fbDb, 'bitacora_gobernanza'), where('uid', '==', uid), orderBy('creadoEn', 'desc'), limit(MAX_ENTRIES));

    let unsub: Unsubscribe;
    try {
      unsub = onSnapshot(
        baseQuery,
        snap => { setEntries(mapDocs(snap.docs)); setLoading(false); },
        () => {
          // Índice aún no existe — fallback sin orderBy, ordenando client-side
          const fallbackQ = nit
            ? query(collection(fbDb, 'bitacora_gobernanza'), where('nit', '==', nit), limit(MAX_ENTRIES))
            : query(collection(fbDb, 'bitacora_gobernanza'), where('uid', '==', uid), limit(MAX_ENTRIES));
          unsub = onSnapshot(
            fallbackQ,
            snap => {
              const items = mapDocs(snap.docs).sort((a, b) => b.creadoEn - a.creadoEn);
              setEntries(items);
              setLoading(false);
            },
            e => { setError(e.message); setLoading(false); },
          );
        },
      );
    } catch (e) {
      setError(String(e));
      setLoading(false);
      return;
    }
    return () => unsub?.();
  }, [uid, nit]);

  const add = useCallback(async (payload: NuevoRegistro): Promise<void> => {
    if (!uid) return;
    const now = Date.now();
    await addDoc(collection(fbDb, 'bitacora_gobernanza'), {
      uid,
      nit: nit || '',
      usuario: userName || 'Usuario',
      modulo:   payload.modulo,
      accion:   payload.accion,
      detalle:  payload.detalle,
      ts:       new Date(now).toISOString(),
      creadoEn: now,
      origen:   'manual' as const,
      savedAt:  Timestamp.now(),
    });
    // El onSnapshot ya en curso recibe el nuevo doc y actualiza `entries` —
    // no hace falta actualizar estado local a mano.
  }, [uid, nit, userName]);

  const remove = useCallback(async (id: string): Promise<void> => {
    await deleteDoc(doc(fbDb, 'bitacora_gobernanza', id));
  }, []);

  return { entries, loading, error, add, remove };
}
