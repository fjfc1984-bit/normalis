/**
 * web/lib/useTalento.ts
 * Hook Firestore para Talento Humano
 * Colección: usuarios/{uid}/profesionales/{id}
 * Base legal: Res. 3100/2019 Estándar 1 — Talento Humano
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc,
  getDocs, addDoc, updateDoc, deleteDoc,
  orderBy, query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CargoProfesional, DocTipoProfesional } from '@/lib/talentoCargos';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface DocumentoProf {
  tipo:    DocTipoProfesional;
  nombre:  string;
  vence:   string; // YYYY-MM-DD o ''
  cargado: boolean;
}

export interface Profesional {
  id:           string;
  nombre:       string;
  cargo:        CargoProfesional;
  cedula:       string;
  telefono:     string;
  email:        string;
  fechaIngreso: string; // YYYY-MM-DD
  estado:       'activo' | 'inactivo';
  documentos:   DocumentoProf[];
  creadoEn:     number;
}

export interface NuevoProfesional {
  nombre:       string;
  cargo:        CargoProfesional;
  cedula:       string;
  telefono:     string;
  email:        string;
  fechaIngreso: string;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTalento(uid: string | null) {
  const [items,   setItems]   = useState<Profesional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const col = collection(db, 'usuarios', uid, 'profesionales');
    const q   = query(col, orderBy('creadoEn', 'desc'));
    getDocs(q)
      .then(snap => {
        const data: Profesional[] = snap.docs.map(d => {
          const r = d.data();
          return {
            id:           d.id,
            nombre:       r.nombre       ?? '',
            cargo:        r.cargo        ?? 'Otro',
            cedula:       r.cedula       ?? '',
            telefono:     r.telefono     ?? '',
            email:        r.email        ?? '',
            fechaIngreso: r.fechaIngreso ?? '',
            estado:       r.estado       ?? 'activo',
            documentos:   r.documentos   ?? [],
            creadoEn:     r.creadoEn     ?? 0,
          };
        });
        setItems(data);
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [uid]);

  const agregar = useCallback(async (data: NuevoProfesional) => {
    if (!uid) return;
    const payload = {
      ...data,
      estado:     'activo' as const,
      documentos: [] as DocumentoProf[],
      creadoEn:   Date.now(),
    };
    const ref = await addDoc(
      collection(db, 'usuarios', uid, 'profesionales'),
      payload,
    );
    setItems(prev => [{ id: ref.id, ...payload }, ...prev]);
  }, [uid]);

  const actualizar = useCallback(async (
    id: string,
    updates: Partial<Omit<Profesional, 'id'>>,
  ) => {
    if (!uid) return;
    await updateDoc(
      doc(db, 'usuarios', uid, 'profesionales', id),
      updates as Record<string, unknown>,
    );
    setItems(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, [uid]);

  const eliminar = useCallback(async (id: string) => {
    if (!uid) return;
    await deleteDoc(doc(db, 'usuarios', uid, 'profesionales', id));
    setItems(prev => prev.filter(p => p.id !== id));
  }, [uid]);

  return { items, loading, error, agregar, actualizar, eliminar };
}
