'use client';

// web/lib/useIndicadores.ts
// Hook Firestore en tiempo real para el módulo de Indicadores.
// Dual-write uid+nit para compatibilidad multi-usuario.

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, getDocs,
  type Unsubscribe,
} from 'firebase/firestore';
import { db as fbDb } from '@/lib/firebase';
import {
  INDICADORES_CATALOGO,
  calcularEstado,
  calcularStats,
  type IndicadorRegistro,
  type IndicadorEstado,
  type IndicadorStats,
} from './indicadorTypes';

// ── Tipos del hook ───────────────────────────────────────
export interface SaveIndicadorData {
  indicId: string;
  periodo: string;
  valor: string;
  observacion: string;
}

export interface UseIndicadoresResult {
  estados: IndicadorEstado[];
  stats: IndicadorStats;
  loading: boolean;
  error: string | null;
  saveIndicador: (data: SaveIndicadorData, uid: string, nit: string) => Promise<void>;
}

// ── Hook ─────────────────────────────────────────────────
export function useIndicadores(uid: string | null, nit: string | null): UseIndicadoresResult {
  const [registros, setRegistros] = useState<IndicadorRegistro[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }

    setLoading(true);
    setError(null);

    // Preferir query por NIT si existe
    const baseQ = nit
      ? query(collection(fbDb, 'indicadores'), where('nit', '==', nit))
      : query(collection(fbDb, 'indicadores'), where('uid', '==', uid));

    let unsub: Unsubscribe;
    try {
      unsub = onSnapshot(
        baseQ,
        snap => {
          setRegistros(
            snap.docs.map(d => ({
              docId: d.id,
              ...(d.data() as Omit<IndicadorRegistro, 'docId'>),
            }))
          );
          setLoading(false);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (e) {
      setError(String(e));
      setLoading(false);
      return;
    }
    return () => unsub?.();
  }, [uid, nit]);

  // ── Calcular estados derivados ───────────────────────
  const estados = useMemo<IndicadorEstado[]>(() => {
    return INDICADORES_CATALOGO.map(def => {
      const regsDeEsteIndicador = registros.filter(r => r.indicId === def.id);
      return calcularEstado(def, regsDeEsteIndicador);
    });
  }, [registros]);

  const stats = useMemo<IndicadorStats>(() => calcularStats(estados), [estados]);

  // ── Guardar medición (upsert por indicId+periodo) ────
  const saveIndicador = useCallback(async (
    data: SaveIndicadorData,
    uid: string,
    nit: string,
  ): Promise<void> => {
    const { indicId, periodo, valor, observacion } = data;

    // Buscar si ya existe un registro para ese período
    const checkQ = nit
      ? query(
          collection(fbDb, 'indicadores'),
          where('nit',     '==', nit),
          where('indicId', '==', indicId),
          where('periodo', '==', periodo),
        )
      : query(
          collection(fbDb, 'indicadores'),
          where('uid',     '==', uid),
          where('indicId', '==', indicId),
          where('periodo', '==', periodo),
        );

    const snap = await getDocs(checkQ);

    if (!snap.empty) {
      // Actualizar existente
      await updateDoc(doc(fbDb, 'indicadores', snap.docs[0].id), {
        valor,
        observacion: observacion.trim(),
        fechaActualizacion: serverTimestamp(),
      });
    } else {
      // Crear nuevo
      await addDoc(collection(fbDb, 'indicadores'), {
        uid,
        nit:          nit ?? '',
        indicId,
        periodo,
        valor,
        observacion:  observacion.trim(),
        fechaCreacion: serverTimestamp(),
        fechaActualizacion: null,
      });
    }
  }, []);

  return { estados, stats, loading, error, saveIndicador };
}
