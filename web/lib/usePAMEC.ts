'use client';
/**
 * usePAMEC.ts
 * Hook para gestión del PAMEC — lectura y escritura en Firestore.
 * Colección: pamec/{nit}
 */

import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth';
import type { PamecDoc, PamecItem, PamecAccion, PamecFase } from './pamecTypes';
const nanoid = () => crypto.randomUUID();

function emptyDoc(nit: string): PamecDoc {
  return { nit, fase: 'autoeval', items: [], acciones: [], updatedAt: new Date().toISOString() };
}

export function usePAMEC() {
  const { nit, loading: authLoading } = useAuth();
  const [pamec, setPamec]   = useState<PamecDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // ── Cargar ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;         // auth aún resolviendo — esperar
    if (!nit) {                      // auth resuelta pero sin NIT (admin u otros)
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const snap = await getDoc(doc(db, 'pamec', nit));
        setPamec(snap.exists() ? (snap.data() as PamecDoc) : emptyDoc(nit));
      } catch {
        setPamec(emptyDoc(nit));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [nit, authLoading]);

  // ── Guardar ─────────────────────────────────────────────────────────────
  const save = useCallback(async (updates: Partial<PamecDoc>) => {
    if (!nit) return;
    setSaving(true);
    try {
      const updated = { ...(pamec ?? emptyDoc(nit)), ...updates, nit, updatedAt: new Date().toISOString() };
      await setDoc(doc(db, 'pamec', nit), { ...updated, _ts: serverTimestamp() }, { merge: true });
      setPamec(updated as PamecDoc);
    } finally {
      setSaving(false);
    }
  }, [nit, pamec]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const setFase = (fase: PamecFase) => save({ fase });

  const addItem = (partial: Omit<PamecItem, 'id' | 'creadoEn' | 'estado'>) => {
    const item: PamecItem = { ...partial, id: nanoid(), estado: 'pendiente', creadoEn: new Date().toISOString() };
    save({ items: [...(pamec?.items ?? []), item] });
  };

  const updateItem = (id: string, changes: Partial<PamecItem>) => {
    save({ items: (pamec?.items ?? []).map(i => i.id === id ? { ...i, ...changes } : i) });
  };

  const deleteItem = (id: string) => {
    save({
      items:    (pamec?.items    ?? []).filter(i => i.id !== id),
      acciones: (pamec?.acciones ?? []).filter(a => a.itemId !== id),
    });
  };

  const addAccion = (partial: Omit<PamecAccion, 'id' | 'estado'>) => {
    const accion: PamecAccion = { ...partial, id: nanoid(), estado: 'pendiente' };
    save({ acciones: [...(pamec?.acciones ?? []), accion] });
  };

  const updateAccion = (id: string, changes: Partial<PamecAccion>) => {
    save({ acciones: (pamec?.acciones ?? []).map(a => a.id === id ? { ...a, ...changes } : a) });
  };

  return { pamec, loading: loading || authLoading, saving, setFase, addItem, updateItem, deleteItem, addAccion, updateAccion };
}
