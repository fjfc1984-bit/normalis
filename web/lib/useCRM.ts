/**
 * web/lib/useCRM.ts
 * Hook Firestore para el CRM interno de NormaLis.
 * Colecciones: crm_contactos/{id}, crm_actividad/{id}
 * Acceso: solo admin (ver firestore.rules).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, query, onSnapshot, orderBy, where,
  addDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CRMContacto, CRMEtapa, CRMFuente, CRMNota } from '@/lib/crmTypes';

export interface NuevoContacto {
  nombre:         string;
  contactoNombre: string;
  email:          string;
  telefono:       string;
  ciudad:         string;
  tipoIPS?:       string;
  fuente:         CRMFuente;
  valorEstimado?: number;
}

export function useCRM() {
  const [contactos, setContactos] = useState<CRMContacto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'crm_contactos'), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(
      q,
      snap => {
        setContactos(snap.docs.map(d => ({ id: d.id, ...d.data() } as CRMContacto)));
        setLoading(false);
      },
      () => {
        // Sin índice para el orderBy (aún no existe o falta desplegar) — fallback sin ordenar
        const qFallback = query(collection(db, 'crm_contactos'));
        onSnapshot(qFallback, snap2 => {
          setContactos(snap2.docs.map(d => ({ id: d.id, ...d.data() } as CRMContacto)));
          setLoading(false);
        }, e2 => { setError(e2.message); setLoading(false); });
      }
    );
    return unsub;
  }, []);

  const crear = useCallback(async (payload: NuevoContacto): Promise<void> => {
    await addDoc(collection(db, 'crm_contactos'), {
      ...payload,
      etapa:     'nuevo' as CRMEtapa,
      origen:    'manual',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }, []);

  const cambiarEtapa = useCallback(async (id: string, etapa: CRMEtapa): Promise<void> => {
    await updateDoc(doc(db, 'crm_contactos', id), { etapa, updatedAt: serverTimestamp() });
  }, []);

  const actualizar = useCallback(async (id: string, cambios: Partial<CRMContacto>): Promise<void> => {
    await updateDoc(doc(db, 'crm_contactos', id), { ...cambios, updatedAt: serverTimestamp() });
  }, []);

  const eliminar = useCallback(async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'crm_contactos', id));
  }, []);

  return { contactos, loading, error, crear, cambiarEtapa, actualizar, eliminar };
}

export function useCRMNotas(contactoId: string | null) {
  const [notas, setNotas]     = useState<CRMNota[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contactoId) { setNotas([]); setLoading(false); return; }
    const q = query(
      collection(db, 'crm_actividad'),
      where('contactoId', '==', contactoId),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      snap => { setNotas(snap.docs.map(d => ({ id: d.id, ...d.data() } as CRMNota))); setLoading(false); },
      () => {
        const qFallback = query(collection(db, 'crm_actividad'), where('contactoId', '==', contactoId));
        onSnapshot(qFallback, snap2 => {
          const data = snap2.docs.map(d => ({ id: d.id, ...d.data() } as CRMNota));
          data.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
          setNotas(data);
          setLoading(false);
        });
      }
    );
    return unsub;
  }, [contactoId]);

  const agregarNota = useCallback(async (contactoId: string, texto: string, autor: string): Promise<void> => {
    await addDoc(collection(db, 'crm_actividad'), {
      contactoId, texto, autor, createdAt: serverTimestamp(),
    });
  }, []);

  const eliminarNota = useCallback(async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'crm_actividad', id));
  }, []);

  return { notas, loading, agregarNota, eliminarNota };
}
