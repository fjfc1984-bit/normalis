/**
 * web/lib/usePremProm.ts
 * Hook Firestore para el módulo PREM/PROM (solo lectura + moderación).
 * Colección: usuarios/{uid}/prem_prom/{id}
 *
 * Las respuestas SOLO se crean desde el formulario público
 * (app/prem-prom/[uid]/page.tsx) a través del endpoint /prem-prom del
 * Worker, igual que PQRS — así se evita abrir una regla de escritura
 * pública directa en Firestore. Este hook solo lee y permite moderar
 * (eliminar) respuestas desde el dashboard.
 */

import { useState, useEffect, useCallback } from 'react';
import { collection, doc, getDocs, deleteDoc, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PremPromItem, PremPromRespuestas } from '@/lib/premPromTypes';

export interface UsePremPromState {
  items:   PremPromItem[];
  loading: boolean;
  error:   string | null;
}

export function usePremProm(uid: string | null) {
  const [items, setItems]     = useState<PremPromItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const col = collection(db, 'usuarios', uid, 'prem_prom');
    const q = query(col, orderBy('creadoEn', 'desc'));
    getDocs(q)
      .then(snap => {
        const data: PremPromItem[] = snap.docs.map(d => {
          const raw = d.data();
          return {
            id:         d.id,
            servicioId: raw.servicioId ?? 'general',
            respuestas: (raw.respuestas ?? {}) as PremPromRespuestas,
            comentario: raw.comentario || undefined,
            fecha:      raw.fecha ?? '',
            creadoEn:   raw.creadoEn ?? 0,
            origen:     'publico' as const,
          };
        });
        setItems(data);
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [uid]);

  const eliminar = useCallback(async (id: string): Promise<void> => {
    if (!uid) return;
    await deleteDoc(doc(db, 'usuarios', uid, 'prem_prom', id));
    setItems(prev => prev.filter(i => i.id !== id));
  }, [uid]);

  return { items, loading, error, eliminar };
}
