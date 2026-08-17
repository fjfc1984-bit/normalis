/**
 * web/lib/useIncidentes.ts
 * Hook Firestore para el módulo de Incidentes
 * Colección: usuarios/{uid}/incidentes/{id}
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc,
  getDocs, addDoc, updateDoc, deleteDoc,
  orderBy, query, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  IncidenteItem, IncidenteTipo, IncidenteSeveridad, IncidenteEstado,
} from '@/lib/incidenteTypes';

// ── Payload para crear un incidente ──────────────────────────────────────────
export interface NuevoIncidente {
  tipo:        IncidenteTipo;
  severidad:   IncidenteSeveridad;
  desc:        string;
  accion:      string;
  responsable: string;
}

// ── Hook principal ────────────────────────────────────────────────────────────
export function useIncidentes(uid: string | null) {
  const [items,   setItems]   = useState<IncidenteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const q = query(
      collection(db, 'usuarios', uid, 'incidentes'),
      orderBy('creadoEn', 'desc'),
    );
    getDocs(q)
      .then(snap => {
        setItems(snap.docs.map(d => {
          const r = d.data();
          return {
            id:          d.id,
            tipo:        r.tipo        as IncidenteTipo,
            severidad:   r.severidad   as IncidenteSeveridad,
            desc:        r.desc        ?? '',
            accion:      r.accion      ?? '',
            responsable: r.responsable ?? '',
            estado:      r.estado      as IncidenteEstado,
            fecha:       r.fecha       ?? '',
            creadoEn:    r.creadoEn    ?? 0,
            origen:      r.origen      || 'interno',
          };
        }));
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [uid]);

  const add = useCallback(async (payload: NuevoIncidente): Promise<void> => {
    if (!uid) return;
    const nuevo: Omit<IncidenteItem, 'id'> = {
      ...payload,
      estado:   'Abierto',
      fecha:    new Date().toLocaleDateString('es-CO'),
      creadoEn: Date.now(),
      origen:   'interno',
    };
    const ref = await addDoc(collection(db, 'usuarios', uid, 'incidentes'), {
      ...nuevo,
      updatedAt: Timestamp.now(),
    });
    setItems(prev => [{ ...nuevo, id: ref.id }, ...prev]);
  }, [uid]);

  const cambiarEstado = useCallback(async (
    id: string, estado: IncidenteEstado,
  ): Promise<void> => {
    if (!uid) return;
    await updateDoc(doc(db, 'usuarios', uid, 'incidentes', id), {
      estado, updatedAt: Timestamp.now(),
    });
    setItems(prev => prev.map(i => i.id === id ? { ...i, estado } : i));
  }, [uid]);

  const remove = useCallback(async (id: string): Promise<void> => {
    if (!uid) return;
    await deleteDoc(doc(db, 'usuarios', uid, 'incidentes', id));
    setItems(prev => prev.filter(i => i.id !== id));
  }, [uid]);

  return { items, loading, error, add, cambiarEstado, remove };
}
