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
import { logSecurityEvent } from '@/lib/securityLog';
import { registrarBitacora } from '@/lib/useBitacora';
import type { PQRSItem, PQRSTipo, PQRSEstado, PQRSPrioridad } from '@/lib/pqrsTypes';

// ── Estado del hook ───────────────────────────────────────────────────────────
export interface UsePQRSState {
  items:   PQRSItem[];
  loading: boolean;
  error:   string | null;
}

// ── Payload para crear una nueva PQRS ─────────────────────────────────────────
export interface NuevaPQRS {
  tipo:       PQRSTipo;
  nombre:     string;
  desc:       string;
  area:       string;
  prioridad?: PQRSPrioridad;  // por defecto 'General' si no se especifica
  email?:     string;
  telefono?:  string;
}

// ── Hook principal ────────────────────────────────────────────────────────────
export function usePQRS(uid: string | null, nit: string | null = null) {
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
            id:             d.id,
            tipo:           raw.tipo     as PQRSTipo,
            nombre:         raw.nombre   ?? '',
            desc:           raw.desc     ?? '',
            area:           raw.area     ?? '',
            estado:         raw.estado   as PQRSEstado,
            prioridad:      (raw.prioridad as PQRSPrioridad) ?? 'General',
            fecha:          raw.fecha    ?? '',
            creadoEn:       raw.creadoEn ?? 0,
            email:          raw.email          || undefined,
            telefono:       raw.telefono       || undefined,
            origen:         raw.origen         || 'interno',
            respuesta:      raw.respuesta      || undefined,
            respuestaFecha: raw.respuestaFecha || undefined,
          };
        });
        setItems(data);
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [uid]);

  // Agregar nueva PQRS (registro manual desde el dashboard)
  const add = useCallback(async (payload: NuevaPQRS): Promise<void> => {
    if (!uid) return;
    const ahora = Date.now();
    const nueva: Omit<PQRSItem, 'id'> = {
      ...payload,
      prioridad: payload.prioridad ?? 'General',
      estado:    'Pendiente',
      fecha:     new Date().toLocaleDateString('es-CO'),
      creadoEn:  ahora,
      origen:    'interno',
    };
    const col = collection(db, 'usuarios', uid, 'pqrs');
    const ref = await addDoc(col, {
      ...nueva,
      updatedAt: Timestamp.now(),
    });
    setItems(prev => [{ ...nueva, id: ref.id }, ...prev]);
    registrarBitacora(uid, nit, 'PQRS', `Nueva PQRS registrada — ${payload.tipo}`, payload.desc?.slice(0, 200));
  }, [uid, nit]);

  // Registrar la respuesta enviada al solicitante
  const responder = useCallback(async (id: string, respuesta: string): Promise<void> => {
    if (!uid) return;
    const respuestaFecha = new Date().toLocaleDateString('es-CO');
    const ref = doc(db, 'usuarios', uid, 'pqrs', id);
    await updateDoc(ref, { respuesta, respuestaFecha, updatedAt: Timestamp.now() });
    setItems(prev => prev.map(p => p.id === id ? { ...p, respuesta, respuestaFecha } : p));
    logSecurityEvent('pqrs_respondida', 'pqrs', `id=${id}`);
    registrarBitacora(uid, nit, 'PQRS', `PQRS respondida (id=${id})`);
  }, [uid, nit]);

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

  return { items, loading, error, add, cambiarEstado, remove, responder };
}
