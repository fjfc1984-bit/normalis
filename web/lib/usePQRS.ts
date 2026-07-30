/**
 * web/lib/usePQRS.ts
 * Hook Firestore para el módulo PQRS
 * Colección: usuarios/{uid}/pqrs/{id}
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc,
  getDocs, addDoc, updateDoc, deleteDoc,
  orderBy, query,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PQRSItem, PQRSTipo, PQRSEstado } from '@/lib/pqrsTypes';

// ── Estado del hook ───────────────────────────────────────────────────────────
export interface UsePQRSState {
  items:   PQRSItem[];
  loading: boolean;
  error:   string | null;
}

// ── Payload para crear una nueva PQRS ─────────────────────────────────────────
export interface NuevaPQRS {
  tipo:   PQRSTipo;
  nombre: string;
  desc:   string;
  area:   string;
}

// ── Hook principal ────────────────────────────────────────────────────────────
export function usePQRS(uid: string | null) {
  const [items, setItems]   = useState<PQRSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  // Cargar desde Firestore
  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const col = collection(db, 'usuarios', uid, 'pqrs');
    const q = query(col, orderBy('creadoEn', 'desc'));
    getDocs(q)
      .then(snap => {
        const data: PQRSItem[] = snap.docs.map(d => {
          const raw = d.data();
          return {
            id:       d.id,
            tipo:     raw.tipo     as PQRSTipo,
            nombre:   raw.nombre   ?? '',
            desc:     raw.desc     ?? '',
            area:     raw.area     ?? '',
            estado:   raw.estado   as PQRSEstado,
            fecha:    raw.fecha    ?? '',
            creadoEn: raw.creadoEn ?? 0,
          };
        });
        setItems(data);
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [uid]);

  // Agregar nueva PQRS
  const add = useCallback(async (payload: NuevaPQRS): Promise<void> => {
    if (!uid) return;
    const ahora = Date.now();
    const nueva: Omit<PQRSItem, 'id'> = {
      ...payload,
      estado:   'Pendiente',
      fecha:    new Date().toLocaleDateString('es-CO'),
      creadoEn: ahora,
    };
    const col = collection(db, 'usuarios', uid, 'pqrs');
    const ref = await addDoc(col, {
      ...nueva,
      updatedAt: Timestamp.now(),
    });
    setItems(prev => [{ ...nueva, id: ref.id }, ...prev]);
  }, [uid]);

  // Cambiar estado
  const cambiarEstado = useCallback(async (id: string, estado: PQRSEstado): Promise<void> => {
    if (!uid) return;
    const ref = doc(db, 'usuarios', uid, 'pqrs', id);
    await updateDoc(ref, { estado, updatedAt: Timestamp.now() });
    setItems(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
  }, [uid]);

  // Eliminar
  const remove = useCallback(async (id: string): Promise<void> => {
    if (!uid) return;
    await deleteDoc(doc(db, 'usuarios', uid, 'pqrs', id));
    setItems(prev => prev.filter(p => p.id !== id));
  }, [uid]);

  return { items, loading, error, add, cambiarEstado, remove };
}
