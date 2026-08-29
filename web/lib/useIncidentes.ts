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
import { registrarBitacora } from '@/lib/useBitacora';
import type {
  IncidenteItem, IncidenteTipo, IncidenteSeveridad, IncidenteEstado, AnalisisLondres,
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
export function useIncidentes(uid: string | null, nit: string | null = null) {
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
            analisisLondres: r.analisisLondres ?? null,
            capaId:      r.capaId      ?? null,
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
    registrarBitacora(uid, nit, 'Incidentes', `Nuevo incidente registrado — ${payload.tipo} (${payload.severidad})`, payload.desc);
  }, [uid, nit]);

  const cambiarEstado = useCallback(async (
    id: string, estado: IncidenteEstado,
  ): Promise<void> => {
    if (!uid) return;
    await updateDoc(doc(db, 'usuarios', uid, 'incidentes', id), {
      estado, updatedAt: Timestamp.now(),
    });
    setItems(prev => prev.map(i => i.id === id ? { ...i, estado } : i));
    if (estado === 'Cerrado') {
      registrarBitacora(uid, nit, 'Incidentes', `Incidente cerrado (id=${id})`);
    }
  }, [uid, nit]);

  const remove = useCallback(async (id: string): Promise<void> => {
    if (!uid) return;
    await deleteDoc(doc(db, 'usuarios', uid, 'incidentes', id));
    setItems(prev => prev.filter(i => i.id !== id));
  }, [uid]);

  // Persiste el análisis de causa raíz (Protocolo de Londres) generado por
  // IA en el propio documento del incidente — no requiere una colección ni
  // reglas nuevas, ya que el dueño del incidente ya puede escribirlo.
  const guardarAnalisis = useCallback(async (id: string, analisis: AnalisisLondres): Promise<void> => {
    if (!uid) return;
    await updateDoc(doc(db, 'usuarios', uid, 'incidentes', id), {
      analisisLondres: analisis, updatedAt: Timestamp.now(),
    });
    setItems(prev => prev.map(i => i.id === id ? { ...i, analisisLondres: analisis } : i));
  }, [uid]);

  // Marca qué CAPA se creó a partir del análisis de este incidente — evita
  // crear una CAPA duplicada si el usuario vuelve a hacer clic.
  const vincularCapa = useCallback(async (id: string, capaId: string): Promise<void> => {
    if (!uid) return;
    await updateDoc(doc(db, 'usuarios', uid, 'incidentes', id), {
      capaId, updatedAt: Timestamp.now(),
    });
    setItems(prev => prev.map(i => i.id === id ? { ...i, capaId } : i));
  }, [uid]);

  return { items, loading, error, add, cambiarEstado, remove, guardarAnalisis, vincularCapa };
}
