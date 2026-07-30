/**
 * web/lib/useBitacora.ts
 * Hook Firestore para el módulo Bitácora
 * Colección: usuarios/{uid}/bitacora/{id}
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, getDocs, addDoc, deleteDoc,
  orderBy, query, limit, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { BitacoraEntry, BitacoraModulo } from '@/lib/bitacoraTypes';

export interface NuevoRegistro {
  modulo:  BitacoraModulo;
  accion:  string;
  detalle: string;
}

export function useBitacora(uid: string | null, userName: string) {
  const [entries, setEntries] = useState<BitacoraEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    // Load up to 500 most recent entries
    const q = query(
      collection(db, 'usuarios', uid, 'bitacora'),
      orderBy('creadoEn', 'desc'),
      limit(500),
    );
    getDocs(q)
      .then(snap => {
        setEntries(snap.docs.map(d => {
          const r = d.data();
          return {
            id:       d.id,
            ts:       r.ts       ?? new Date().toISOString(),
            usuario:  r.usuario  ?? '',
            modulo:   r.modulo   as BitacoraModulo,
            accion:   r.accion   ?? '',
            detalle:  r.detalle  ?? '',
            creadoEn: r.creadoEn ?? 0,
          };
        }));
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [uid]);

  const add = useCallback(async (payload: NuevoRegistro): Promise<void> => {
    if (!uid) return;
    const now = Date.now();
    const entry: Omit<BitacoraEntry, 'id'> = {
      ts:       new Date(now).toISOString(),
      usuario:  userName || 'Usuario',
      modulo:   payload.modulo,
      accion:   payload.accion,
      detalle:  payload.detalle,
      creadoEn: now,
    };
    const ref = await addDoc(collection(db, 'usuarios', uid, 'bitacora'), {
      ...entry,
      savedAt: Timestamp.now(),
    });
    setEntries(prev => [{ ...entry, id: ref.id }, ...prev]);
  }, [uid, userName]);

  const remove = useCallback(async (id: string): Promise<void> => {
    if (!uid) return;
    await deleteDoc(doc(db, 'usuarios', uid, 'bitacora', id));
    setEntries(prev => prev.filter(e => e.id !== id));
  }, [uid]);

  return { entries, loading, error, add, remove };
}
