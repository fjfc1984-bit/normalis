'use client';

// web/lib/useInformesAuditoria.ts
// Hook Firestore para CRUD de Informes de Auditoría (colección
// informes_auditoria). Sigue el mismo patrón dual uid/nit que useCapas.ts —
// query por nit cuando existe (visible a todo el equipo IPS), si no por uid.

import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { registrarBitacora } from './useBitacora';
import type { InformeAuditoria, InformeFormData } from './informeAuditoriaTypes';

export interface UseInformesAuditoriaResult {
  informes: InformeAuditoria[];
  loading: boolean;
  error: string | null;
  crearInforme: (uid: string, nit: string, data: InformeFormData) => Promise<string>;
  actualizarInforme: (id: string, data: InformeFormData) => Promise<void>;
  eliminarInforme: (id: string) => Promise<void>;
}

export function useInformesAuditoria(uid: string | null, nit: string | null): UseInformesAuditoriaResult {
  const [informes, setInformes] = useState<InformeAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    const baseQuery = nit
      ? query(collection(db, 'informes_auditoria'), where('nit', '==', nit), orderBy('fechaCreacion', 'desc'))
      : query(collection(db, 'informes_auditoria'), where('uid', '==', uid), orderBy('fechaCreacion', 'desc'));

    let unsub: Unsubscribe;
    try {
      unsub = onSnapshot(
        baseQuery,
        snap => {
          setInformes(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<InformeAuditoria, 'id'>) })));
          setLoading(false);
        },
        () => {
          // Índice compuesto aún no existe — fallback sin orderBy
          const fallbackQ = nit
            ? query(collection(db, 'informes_auditoria'), where('nit', '==', nit))
            : query(collection(db, 'informes_auditoria'), where('uid', '==', uid));
          unsub = onSnapshot(
            fallbackQ,
            snap => {
              const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<InformeAuditoria, 'id'>) }));
              items.sort((a, b) => (b.fechaCreacion?.seconds ?? 0) - (a.fechaCreacion?.seconds ?? 0));
              setInformes(items);
              setLoading(false);
            },
            e => { setError(e.message); setLoading(false); },
          );
        },
      );
    } catch (e) {
      setError(String(e));
      setLoading(false);
      return;
    }

    return () => unsub?.();
  }, [uid, nit]);

  const crearInforme = useCallback(async (uid: string, nit: string, data: InformeFormData): Promise<string> => {
    const ref = await addDoc(collection(db, 'informes_auditoria'), {
      uid,
      nit: nit ?? '',
      ...data,
      fechaCreacion: serverTimestamp(),
      fechaActualizacion: null,
    });
    registrarBitacora(uid, nit, 'Informes de Auditoría', `Informe creado — ${data.titulo}`);
    return ref.id;
  }, []);

  const actualizarInforme = useCallback(async (id: string, data: InformeFormData): Promise<void> => {
    await updateDoc(doc(db, 'informes_auditoria', id), {
      ...data,
      fechaActualizacion: serverTimestamp(),
    });
  }, []);

  const eliminarInforme = useCallback(async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'informes_auditoria', id));
  }, []);

  return { informes, loading, error, crearInforme, actualizarInforme, eliminarInforme };
}
