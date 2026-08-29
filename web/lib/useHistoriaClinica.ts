'use client';

// web/lib/useHistoriaClinica.ts
// Hook React para el módulo de Auditoría de Historia Clínica (por
// muestreo), vía Firestore en tiempo real. Colección plana, mismo patrón
// dual uid+nit compartido por Equipo IPS.

import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db as fbDb } from '@/lib/firebase';
import { registrarBitacora } from '@/lib/useBitacora';
import {
  calcScoreHC, calcEstadoHC,
  type AuditoriaHC, type AuditoriaHCFormData,
} from './historiaClinicaTypes';

export interface HCStats {
  total: number;
  cumple: number;
  parcial: number;
  noCumple: number;
  promedioScore: number;
}

export interface UseHistoriaClinicaResult {
  auditorias: AuditoriaHC[];
  loading: boolean;
  stats: HCStats;
  registrarAuditoria: (data: AuditoriaHCFormData, uid: string, nit: string | null) => Promise<void>;
  vincularCapa: (auditoriaId: string, capaId: string) => Promise<void>;
}

export function useHistoriaClinica(uid: string | null, nit: string | null): UseHistoriaClinicaResult {
  const [auditorias, setAuditorias] = useState<AuditoriaHC[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);

    const baseQuery = nit
      ? query(collection(fbDb, 'historia_clinica_auditorias'), where('nit', '==', nit), orderBy('fechaCreacion', 'desc'))
      : query(collection(fbDb, 'historia_clinica_auditorias'), where('uid', '==', uid), orderBy('fechaCreacion', 'desc'));

    let unsub: Unsubscribe;
    try {
      unsub = onSnapshot(
        baseQuery,
        snap => {
          setAuditorias(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<AuditoriaHC, 'id'>) })));
          setLoading(false);
        },
        () => {
          const fallbackQ = nit
            ? query(collection(fbDb, 'historia_clinica_auditorias'), where('nit', '==', nit))
            : query(collection(fbDb, 'historia_clinica_auditorias'), where('uid', '==', uid));
          unsub = onSnapshot(
            fallbackQ,
            snap => {
              const items = snap.docs
                .map(d => ({ id: d.id, ...(d.data() as Omit<AuditoriaHC, 'id'>) }))
                .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
              setAuditorias(items);
              setLoading(false);
            },
            () => setLoading(false)
          );
        }
      );
    } catch { setLoading(false); return; }

    return () => unsub?.();
  }, [uid, nit]);

  const stats: HCStats = {
    total:    auditorias.length,
    cumple:   auditorias.filter(a => calcEstadoHC(a.score, a.respuestas) === 'cumple').length,
    parcial:  auditorias.filter(a => calcEstadoHC(a.score, a.respuestas) === 'parcial').length,
    noCumple: auditorias.filter(a => calcEstadoHC(a.score, a.respuestas) === 'no_cumple').length,
    promedioScore: auditorias.length
      ? Math.round(auditorias.reduce((s, a) => s + a.score, 0) / auditorias.length)
      : 0,
  };

  const registrarAuditoria = useCallback(async (
    data: AuditoriaHCFormData, uid: string, nit: string | null,
  ): Promise<void> => {
    const score = calcScoreHC(data.respuestas);
    const estado = calcEstadoHC(score, data.respuestas);
    await addDoc(collection(fbDb, 'historia_clinica_auditorias'), {
      uid, nit: nit ?? '',
      fecha: data.fecha,
      auditor: data.auditor.trim(),
      servicio: data.servicio.trim(),
      tamanoMuestra: data.tamanoMuestra,
      respuestas: data.respuestas,
      hallazgos: data.hallazgos.trim(),
      score,
      capaId: null,
      fechaCreacion: serverTimestamp(),
    });
    registrarBitacora(
      uid, nit, 'Historia Clínica',
      `Auditoría de HC registrada — muestra de ${data.tamanoMuestra} — score ${score}/100 (${estado === 'cumple' ? 'cumple' : estado === 'parcial' ? 'cumplimiento parcial' : 'no cumple'})`,
      data.hallazgos.trim(),
    );
  }, []);

  const vincularCapa = useCallback(async (auditoriaId: string, capaId: string): Promise<void> => {
    await updateDoc(doc(fbDb, 'historia_clinica_auditorias', auditoriaId), { capaId });
  }, []);

  return { auditorias, loading, stats, registrarAuditoria, vincularCapa };
}
