/**
 * web/lib/useCRM.ts
 * Hook Firestore para el CRM interno de NormaLis.
 * Colecciones: crm_contactos/{id}, crm_actividad/{id}
 * Acceso: solo admin (ver firestore.rules).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, query, onSnapshot, orderBy, where,
  addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch,
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
    let cancelado = false;
    let unsubActivo: (() => void) | null = null;

    const q = query(collection(db, 'crm_contactos'), orderBy('updatedAt', 'desc'));
    unsubActivo = onSnapshot(
      q,
      snap => {
        if (cancelado) return;
        setContactos(snap.docs.map(d => ({ id: d.id, ...d.data() } as CRMContacto)));
        setLoading(false);
      },
      () => {
        if (cancelado) return;
        // Sin índice para el orderBy (aún no existe o falta desplegar) — fallback sin ordenar.
        // Se cierra el listener que falló antes de abrir el de respaldo para no dejarlo huérfano.
        unsubActivo?.();
        const qFallback = query(collection(db, 'crm_contactos'));
        unsubActivo = onSnapshot(qFallback, snap2 => {
          if (cancelado) return;
          setContactos(snap2.docs.map(d => ({ id: d.id, ...d.data() } as CRMContacto)));
          setLoading(false);
        }, e2 => { if (!cancelado) { setError(e2.message); setLoading(false); } });
      }
    );
    return () => { cancelado = true; unsubActivo?.(); };
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

  // Importación masiva (ej. desde un CSV de prospección en frío). Idempotente por email:
  // omite filas cuyo email ya exista en el CRM para no duplicar en reimportaciones.
  const importarLote = useCallback(async (filas: NuevoContacto[]): Promise<{ importados: number; duplicados: number }> => {
    const existentes = new Set(
      contactos.map(c => c.email.trim().toLowerCase()).filter(Boolean)
    );
    const nuevos = filas.filter(f => {
      const email = f.email.trim().toLowerCase();
      if (!email || existentes.has(email)) return false;
      existentes.add(email); // evita duplicados dentro del mismo archivo
      return true;
    });

    const TAMANO_LOTE = 400; // margen bajo el límite de 500 writes por batch de Firestore
    for (let i = 0; i < nuevos.length; i += TAMANO_LOTE) {
      const batch = writeBatch(db);
      for (const f of nuevos.slice(i, i + TAMANO_LOTE)) {
        const ref = doc(collection(db, 'crm_contactos'));
        batch.set(ref, {
          ...f,
          etapa:     'nuevo' as CRMEtapa,
          origen:    'manual',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }
    return { importados: nuevos.length, duplicados: filas.length - nuevos.length };
  }, [contactos]);

  return { contactos, loading, error, crear, cambiarEtapa, actualizar, eliminar, importarLote };
}

export function useCRMNotas(contactoId: string | null) {
  const [notas, setNotas]     = useState<CRMNota[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contactoId) { setNotas([]); setLoading(false); return; }
    let cancelado = false;
    let unsubActivo: (() => void) | null = null;

    const q = query(
      collection(db, 'crm_actividad'),
      where('contactoId', '==', contactoId),
      orderBy('createdAt', 'desc'),
    );
    unsubActivo = onSnapshot(
      q,
      snap => {
        if (cancelado) return;
        setNotas(snap.docs.map(d => ({ id: d.id, ...d.data() } as CRMNota)));
        setLoading(false);
      },
      () => {
        if (cancelado) return;
        // Sin índice compuesto (aún no existe o falta desplegar) — fallback sin ordenar en
        // el servidor. Se cierra el listener que falló antes de abrir el de respaldo.
        unsubActivo?.();
        const qFallback = query(collection(db, 'crm_actividad'), where('contactoId', '==', contactoId));
        unsubActivo = onSnapshot(qFallback, snap2 => {
          if (cancelado) return;
          const data = snap2.docs.map(d => ({ id: d.id, ...d.data() } as CRMNota));
          data.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
          setNotas(data);
          setLoading(false);
        });
      }
    );
    return () => { cancelado = true; unsubActivo?.(); };
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
