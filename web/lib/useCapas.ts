'use client';

// web/lib/useCapas.ts
// Hook React para CRUD de CAPAs vía Firestore en tiempo real.
// Soporta dual-write uid+nit para compatibilidad multi-usuario.

import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp, getCountFromServer,
  type Unsubscribe,
} from 'firebase/firestore';
import { db as fbDb } from '@/lib/firebase';
import type { Capa, CapaFormData, CapaEstado } from './capaTypes';

// ── Helpers ─────────────────────────────────────────────────
function computeVencida(c: Omit<Capa, '_vencida' | '_diasRestantes'>): boolean {
  if (c.estado === 'cerrada' || !c.fechaLimite) return false;
  return new Date(c.fechaLimite) < new Date();
}

function computeDiasRestantes(c: Omit<Capa, '_vencida' | '_diasRestantes'>): number | null {
  if (c.estado === 'cerrada' || !c.fechaLimite) return null;
  return Math.ceil((new Date(c.fechaLimite).getTime() - Date.now()) / 86_400_000);
}

function addComputedFields(raw: Omit<Capa, '_vencida' | '_diasRestantes'>): Capa {
  return {
    ...raw,
    _vencida: computeVencida(raw),
    _diasRestantes: computeDiasRestantes(raw),
  };
}

// ── Tipos del hook ───────────────────────────────────────────
export interface UseCapasResult {
  capas: Capa[];
  loading: boolean;
  error: string | null;
  stats: CapaStats;
  createCapa: (data: CapaFormData, uid: string, nit: string) => Promise<string>;
  updateCapa: (id: string, data: Partial<CapaFormData>) => Promise<void>;
  iniciarCapa: (id: string) => Promise<void>;
  cerrarCapa: (id: string, evidencia: string) => Promise<void>;
}

export interface CapaStats {
  total: number;
  abiertas: number;
  enProgreso: number;
  cerradas: number;
  vencidas: number;
}

// ── Hook principal ───────────────────────────────────────────
export function useCapas(uid: string | null, nit: string | null): UseCapasResult {
  const [capas,   setCapas]   = useState<Capa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }

    setLoading(true);
    setError(null);

    // Preferir query por NIT (multi-usuario) si existe, si no por UID
    const baseQuery = nit
      ? query(
          collection(fbDb, 'capas'),
          where('nit', '==', nit),
          orderBy('fechaCreacion', 'desc'),
        )
      : query(
          collection(fbDb, 'capas'),
          where('uid', '==', uid),
          orderBy('fechaCreacion', 'desc'),
        );

    let unsub: Unsubscribe;
    try {
      unsub = onSnapshot(
        baseQuery,
        snap => {
          const items = snap.docs.map(d =>
            addComputedFields({ id: d.id, ...(d.data() as Omit<Capa, 'id' | '_vencida' | '_diasRestantes'>) })
          );
          setCapas(items);
          setLoading(false);
        },
        (err) => {
          // Índice aún no existe — fallback sin orderBy
          const fallbackQ = nit
            ? query(collection(fbDb, 'capas'), where('nit', '==', nit))
            : query(collection(fbDb, 'capas'), where('uid', '==', uid));

          unsub = onSnapshot(
            fallbackQ,
            snap => {
              const items = snap.docs
                .map(d => addComputedFields({ id: d.id, ...(d.data() as Omit<Capa, 'id' | '_vencida' | '_diasRestantes'>) }))
                .sort((a, b) => {
                  const ta = a.fechaCreacion?.seconds ?? 0;
                  const tb = b.fechaCreacion?.seconds ?? 0;
                  return tb - ta;
                });
              setCapas(items);
              setLoading(false);
            },
            e => { setError(e.message); setLoading(false); }
          );
          void err; // supress unused warning
        }
      );
    } catch (e) {
      setError(String(e));
      setLoading(false);
      return;
    }

    return () => unsub?.();
  }, [uid, nit]);

  // Calcular stats derivadas
  const stats: CapaStats = {
    total:     capas.length,
    abiertas:  capas.filter(c => c.estado === 'abierta').length,
    enProgreso: capas.filter(c => c.estado === 'en_progreso').length,
    cerradas:  capas.filter(c => c.estado === 'cerrada').length,
    vencidas:  capas.filter(c => c._vencida).length,
  };

  // ── Crear CAPA ──────────────────────────────────────────
  const createCapa = useCallback(async (
    data: CapaFormData,
    uid: string,
    nit: string,
  ): Promise<string> => {
    // Número secuencial por IPS
    const countQ = nit
      ? query(collection(fbDb, 'capas'), where('nit', '==', nit))
      : query(collection(fbDb, 'capas'), where('uid', '==', uid));
    const snap = await getCountFromServer(countQ);
    const num  = String((snap.data().count ?? 0) + 1).padStart(3, '0');

    const ref = await addDoc(collection(fbDb, 'capas'), {
      uid,
      nit: nit ?? '',
      numero: `CAPA-${num}`,
      descripcion:      data.descripcion.trim(),
      causaRaiz:        data.causaRaiz.trim(),
      accionCorrectiva: data.accionCorrectiva.trim(),
      responsable:      data.responsable.trim(),
      area:             data.area.trim(),
      fechaLimite:      data.fechaLimite,
      origen:           data.origen || 'manual',
      evidencia:        data.evidencia.trim(),
      estado:           'abierta' as CapaEstado,
      fechaCreacion:    serverTimestamp(),
      fechaActualizacion: null,
      fechaInicio:      null,
      fechaCierre:      null,
    });
    return ref.id;
  }, []);

  // ── Actualizar CAPA ─────────────────────────────────────
  const updateCapa = useCallback(async (id: string, data: Partial<CapaFormData>): Promise<void> => {
    await updateDoc(doc(fbDb, 'capas', id), {
      ...(data.descripcion      !== undefined && { descripcion: data.descripcion.trim() }),
      ...(data.causaRaiz        !== undefined && { causaRaiz: data.causaRaiz.trim() }),
      ...(data.accionCorrectiva !== undefined && { accionCorrectiva: data.accionCorrectiva.trim() }),
      ...(data.responsable      !== undefined && { responsable: data.responsable.trim() }),
      ...(data.area             !== undefined && { area: data.area.trim() }),
      ...(data.fechaLimite      !== undefined && { fechaLimite: data.fechaLimite }),
      ...(data.origen           !== undefined && { origen: data.origen }),
      ...(data.evidencia        !== undefined && { evidencia: data.evidencia.trim() }),
      fechaActualizacion: serverTimestamp(),
    });
  }, []);

  // ── Iniciar CAPA ────────────────────────────────────────
  const iniciarCapa = useCallback(async (id: string): Promise<void> => {
    await updateDoc(doc(fbDb, 'capas', id), {
      estado: 'en_progreso' as CapaEstado,
      fechaInicio: serverTimestamp(),
      fechaActualizacion: serverTimestamp(),
    });
  }, []);

  // ── Cerrar CAPA ─────────────────────────────────────────
  const cerrarCapa = useCallback(async (id: string, evidencia: string): Promise<void> => {
    await updateDoc(doc(fbDb, 'capas', id), {
      estado: 'cerrada' as CapaEstado,
      evidencia: evidencia.trim(),
      fechaCierre: serverTimestamp(),
      fechaActualizacion: serverTimestamp(),
    });
  }, []);

  return { capas, loading, error, stats, createCapa, updateCapa, iniciarCapa, cerrarCapa };
}
