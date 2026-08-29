'use client';

// web/lib/useSST.ts
// Hook React para leer/escribir progreso SG-SST vía Firestore.
// Path: usuarios/{uid}/sst/main (doc único por usuario)

import { useState, useEffect, useCallback } from 'react';
import {
  doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { db as fbDb } from '@/lib/firebase';
import { registrarBitacora } from '@/lib/useBitacora';
import type {
  SSTData, SSTFase, SSTItemEstado, SSTPlanItem, SSTVencimiento, SSTScore,
} from './sstTypes';
import { SST_DATA_EMPTY } from './sstTypes';

// ─── Score calculation (mirrors calcSSTScore in normalis-sst.js) ──────────────
import { SST_ESTANDARES } from './sstCatalog';

export function calcSSTScore(data: SSTData): SSTScore {
  const fase     = data.fase || 'fase1';
  const estandar = SST_ESTANDARES[fase];
  const saved    = data.autoevaluacion || {};
  let total = 0, obtenido = 0;

  estandar.grupos.forEach(g =>
    g.items.forEach(item => {
      total    += item.puntos;
      if (saved[item.id] === 'cumple')   obtenido += item.puntos;
      else if (saved[item.id] === 'parcial') obtenido += item.puntos * 0.5;
    })
  );

  const pct      = total > 0 ? Math.round((obtenido / total) * 100) : 0;
  const semaforo = pct < 60 ? 'critico' : pct < 85 ? 'moderado' : 'aceptable';
  const label    = pct < 60
    ? 'Crítico — Riesgo alto de sanción (< 60%)'
    : pct < 85
    ? 'Moderado — Requiere mejoras (60–84%)'
    : 'Aceptable — SG-SST en orden (≥ 85%)';

  return { pct, obtenido: Math.round(obtenido * 10) / 10, total, semaforo, label, fase };
}

// ─── Tipos del hook ───────────────────────────────────────────────────────────
export interface UseSST {
  data:        SSTData;
  score:       SSTScore;
  loading:     boolean;
  saving:      boolean;
  error:       string | null;
  setItemEstado:  (itemId: string, estado: SSTItemEstado) => Promise<void>;
  setFase:        (fase: SSTFase) => Promise<void>;
  marcarTodos:    (estado: SSTItemEstado) => Promise<void>;
  addPlanItem:    (item: Omit<SSTPlanItem, 'id'>) => Promise<void>;
  updatePlanItem: (id: string, changes: Partial<SSTPlanItem>) => Promise<void>;
  deletePlanItem: (id: string) => Promise<void>;
  addVencimiento: (v: Omit<SSTVencimiento, 'id'>) => Promise<void>;
  deleteVencimiento: (id: string) => Promise<void>;
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSST(uid: string | null, nit: string | null = null): UseSST {
  const [data,    setData]    = useState<SSTData>(SST_DATA_EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const score = calcSSTScore(data);

  // ── Load from Firestore ────────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    const ref = doc(fbDb, 'usuarios', uid, 'sst', 'main');
    getDoc(ref)
      .then(snap => {
        if (snap.exists()) {
          const raw = snap.data() as SSTData;
          delete (raw as unknown as Record<string, unknown>).updatedAt;
          setData({ ...SST_DATA_EMPTY, ...raw });
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [uid]);

  // ── Persist helper ─────────────────────────────────────────────────────────
  const persist = useCallback(async (next: SSTData) => {
    if (!uid) return;
    setSaving(true);
    try {
      const ref = doc(fbDb, 'usuarios', uid, 'sst', 'main');
      await setDoc(ref, { ...next, updatedAt: serverTimestamp() }, { merge: true });
      setData(next);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [uid]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const setItemEstado = useCallback(async (itemId: string, estado: SSTItemEstado) => {
    const next: SSTData = {
      ...data,
      autoevaluacion: { ...data.autoevaluacion, [itemId]: estado },
    };
    setData(next);           // optimistic
    await persist(next);
  }, [data, persist]);

  const setFase = useCallback(async (fase: SSTFase) => {
    const next: SSTData = { ...data, fase, autoevaluacion: {} };
    await persist(next);
    if (uid) registrarBitacora(uid, nit, 'SG-SST', `Avanzó a fase: ${fase}`);
  }, [data, persist, uid, nit]);

  const marcarTodos = useCallback(async (estado: SSTItemEstado) => {
    const estandar = SST_ESTANDARES[data.fase || 'fase1'];
    const autoevaluacion: Record<string, SSTItemEstado> = {};
    estandar.grupos.forEach(g =>
      g.items.forEach(item => { autoevaluacion[item.id] = estado; })
    );
    const next: SSTData = { ...data, autoevaluacion };
    await persist(next);
  }, [data, persist]);

  const addPlanItem = useCallback(async (item: Omit<SSTPlanItem, 'id'>) => {
    const next: SSTData = {
      ...data,
      plan: [...(data.plan || []), { ...item, id: nanoid() }],
    };
    await persist(next);
  }, [data, persist]);

  const updatePlanItem = useCallback(async (id: string, changes: Partial<SSTPlanItem>) => {
    const next: SSTData = {
      ...data,
      plan: (data.plan || []).map(p => p.id === id ? { ...p, ...changes } : p),
    };
    await persist(next);
  }, [data, persist]);

  const deletePlanItem = useCallback(async (id: string) => {
    const next: SSTData = { ...data, plan: (data.plan || []).filter(p => p.id !== id) };
    await persist(next);
  }, [data, persist]);

  const addVencimiento = useCallback(async (v: Omit<SSTVencimiento, 'id'>) => {
    const next: SSTData = {
      ...data,
      vencimientos: [...(data.vencimientos || []), { ...v, id: nanoid() }],
    };
    await persist(next);
  }, [data, persist]);

  const deleteVencimiento = useCallback(async (id: string) => {
    const next: SSTData = {
      ...data,
      vencimientos: (data.vencimientos || []).filter(v => v.id !== id),
    };
    await persist(next);
  }, [data, persist]);

  return {
    data, score, loading, saving, error,
    setItemEstado, setFase, marcarTodos,
    addPlanItem, updatePlanItem, deletePlanItem,
    addVencimiento, deleteVencimiento,
  };
}
