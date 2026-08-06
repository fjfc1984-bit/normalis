'use client';
// web/lib/usePersonal.ts
// CRUD para personal e IPS vía Firestore (colecciones: personal, capacitaciones)

import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  PersonalItem, PersonalFormData,
  CapacitacionSesion,
} from './personalTypes';

// ── Hook: Personal ────────────────────────────────────────────────────────────
export function usePersonal(uid: string | null, nit: string | null) {
  const [personal, setPersonal] = useState<PersonalItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);

    const q = nit
      ? query(collection(db, 'personal'), where('nit', '==', nit), orderBy('nombre', 'asc'))
      : query(collection(db, 'personal'), where('uid', '==', uid), orderBy('nombre', 'asc'));

    let unsub: Unsubscribe;
    try {
      unsub = onSnapshot(q,
        snap => {
          setPersonal(snap.docs.map(d => ({ id: d.id, ...d.data() } as PersonalItem)));
          setLoading(false);
        },
        err => { setError(err.message); setLoading(false); },
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
      setLoading(false);
      return;
    }
    return () => unsub?.();
  }, [uid, nit]);

  const addPersonal = useCallback(async (data: PersonalFormData): Promise<string> => {
    const ref = await addDoc(collection(db, 'personal'), {
      ...data,
      uid:      uid ?? '',
      nit:      nit ?? '',
      creadoEn: new Date().toISOString(),
    });
    return ref.id;
  }, [uid, nit]);

  const updatePersonal = useCallback(async (id: string, data: Partial<PersonalFormData>): Promise<void> => {
    await updateDoc(doc(db, 'personal', id), { ...data, actualizadoEn: new Date().toISOString() });
  }, []);

  return { personal, loading, error, addPersonal, updatePersonal };
}

// ── Hook: Capacitaciones ──────────────────────────────────────────────────────
export function useCapacitaciones(uid: string | null, nit: string | null) {
  const [sesiones, setSesiones] = useState<CapacitacionSesion[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);

    const q = nit
      ? query(collection(db, 'capacitaciones'), where('nit', '==', nit), orderBy('fecha', 'desc'))
      : query(collection(db, 'capacitaciones'), where('uid', '==', uid), orderBy('fecha', 'desc'));

    let unsub: Unsubscribe;
    try {
      unsub = onSnapshot(q,
        snap => {
          setSesiones(snap.docs.map(d => ({ id: d.id, ...d.data() } as CapacitacionSesion)));
          setLoading(false);
        },
        err => { setError(err.message); setLoading(false); },
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
      setLoading(false);
      return;
    }
    return () => unsub?.();
  }, [uid, nit]);

  const addSesion = useCallback(async (data: Omit<CapacitacionSesion, 'id' | 'uid' | 'nit' | 'creadoEn'>): Promise<string> => {
    const ref = await addDoc(collection(db, 'capacitaciones'), {
      ...data,
      uid:      uid ?? '',
      nit:      nit ?? '',
      creadoEn: new Date().toISOString(),
    });
    return ref.id;
  }, [uid, nit]);

  const updateSesion = useCallback(async (id: string, data: Partial<CapacitacionSesion>): Promise<void> => {
    await updateDoc(doc(db, 'capacitaciones', id), data);
  }, []);

  return { sesiones, loading, error, addSesion, updateSesion };
}
