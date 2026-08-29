'use client';

// web/lib/useInterdependencia.ts
// Hook React para el módulo de Gestión de Interdependencia (red de
// prestadores), vía Firestore en tiempo real. Dos colecciones planas
// (interdependencia_convenios, interdependencia_verificaciones), mismo
// patrón dual uid+nit que el resto de módulos compartidos por Equipo IPS.

import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db as fbDb } from '@/lib/firebase';
import { registrarBitacora } from '@/lib/useBitacora';
import {
  calcEstadoConvenio, calcScoreVerificacion, calcEstadoVerificacion,
  type ConvenioInterdependencia, type ConvenioFormData,
  type VerificacionInterdependencia, type VerificacionFormData,
} from './interdependenciaTypes';

function addComputedFieldsConvenio(raw: Omit<ConvenioInterdependencia, '_estado'>): ConvenioInterdependencia {
  return { ...raw, _estado: calcEstadoConvenio(raw.tieneConvenioFormal, raw.vigenciaHasta) };
}

export interface ConveniosStats {
  total: number;
  vigentes: number;
  porVencer: number;
  vencidos: number;
  sinConvenioFormal: number;
}

export interface UseInterdependenciaResult {
  convenios: ConvenioInterdependencia[];
  loadingConvenios: boolean;
  statsConvenios: ConveniosStats;
  createConvenio: (data: ConvenioFormData, uid: string, nit: string) => Promise<string>;
  actualizarConvenio: (id: string, data: ConvenioFormData) => Promise<void>;

  verificaciones: VerificacionInterdependencia[];
  loadingVerificaciones: boolean;
  registrarVerificacion: (data: VerificacionFormData, uid: string, nit: string | null) => Promise<void>;
  vincularCapaAVerificacion: (verificacionId: string, capaId: string) => Promise<void>;
}

export function useInterdependencia(uid: string | null, nit: string | null): UseInterdependenciaResult {
  const [convenios, setConvenios] = useState<ConvenioInterdependencia[]>([]);
  const [loadingConvenios, setLoadingConvenios] = useState(true);

  const [verificaciones, setVerificaciones] = useState<VerificacionInterdependencia[]>([]);
  const [loadingVerificaciones, setLoadingVerificaciones] = useState(true);

  // ── Suscripción — convenios ──────────────────────────────
  useEffect(() => {
    if (!uid) { setLoadingConvenios(false); return; }
    setLoadingConvenios(true);

    const baseQuery = nit
      ? query(collection(fbDb, 'interdependencia_convenios'), where('nit', '==', nit), orderBy('prestador', 'asc'))
      : query(collection(fbDb, 'interdependencia_convenios'), where('uid', '==', uid), orderBy('prestador', 'asc'));

    let unsub: Unsubscribe;
    try {
      unsub = onSnapshot(
        baseQuery,
        snap => {
          setConvenios(snap.docs.map(d => addComputedFieldsConvenio({ id: d.id, ...(d.data() as Omit<ConvenioInterdependencia, 'id' | '_estado'>) })));
          setLoadingConvenios(false);
        },
        () => {
          const fallbackQ = nit
            ? query(collection(fbDb, 'interdependencia_convenios'), where('nit', '==', nit))
            : query(collection(fbDb, 'interdependencia_convenios'), where('uid', '==', uid));
          unsub = onSnapshot(
            fallbackQ,
            snap => {
              const items = snap.docs
                .map(d => addComputedFieldsConvenio({ id: d.id, ...(d.data() as Omit<ConvenioInterdependencia, 'id' | '_estado'>) }))
                .sort((a, b) => (a.prestador || '').localeCompare(b.prestador || ''));
              setConvenios(items);
              setLoadingConvenios(false);
            },
            () => setLoadingConvenios(false)
          );
        }
      );
    } catch { setLoadingConvenios(false); return; }

    return () => unsub?.();
  }, [uid, nit]);

  // ── Suscripción — verificaciones de Interdependencia ──────
  useEffect(() => {
    if (!uid) { setLoadingVerificaciones(false); return; }
    setLoadingVerificaciones(true);

    const baseQuery = nit
      ? query(collection(fbDb, 'interdependencia_verificaciones'), where('nit', '==', nit), orderBy('fechaCreacion', 'desc'))
      : query(collection(fbDb, 'interdependencia_verificaciones'), where('uid', '==', uid), orderBy('fechaCreacion', 'desc'));

    let unsub: Unsubscribe;
    try {
      unsub = onSnapshot(
        baseQuery,
        snap => {
          setVerificaciones(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<VerificacionInterdependencia, 'id'>) })));
          setLoadingVerificaciones(false);
        },
        () => {
          const fallbackQ = nit
            ? query(collection(fbDb, 'interdependencia_verificaciones'), where('nit', '==', nit))
            : query(collection(fbDb, 'interdependencia_verificaciones'), where('uid', '==', uid));
          unsub = onSnapshot(
            fallbackQ,
            snap => {
              const items = snap.docs
                .map(d => ({ id: d.id, ...(d.data() as Omit<VerificacionInterdependencia, 'id'>) }))
                .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
              setVerificaciones(items);
              setLoadingVerificaciones(false);
            },
            () => setLoadingVerificaciones(false)
          );
        }
      );
    } catch { setLoadingVerificaciones(false); return; }

    return () => unsub?.();
  }, [uid, nit]);

  const statsConvenios: ConveniosStats = {
    total:             convenios.length,
    vigentes:          convenios.filter(c => c._estado === 'vigente').length,
    porVencer:         convenios.filter(c => c._estado === 'por_vencer').length,
    vencidos:          convenios.filter(c => c._estado === 'vencido').length,
    sinConvenioFormal: convenios.filter(c => c._estado === 'sin_convenio_formal').length,
  };

  // ── Crear convenio ────────────────────────────────────────
  const createConvenio = useCallback(async (data: ConvenioFormData, uid: string, nit: string): Promise<string> => {
    const ref = await addDoc(collection(fbDb, 'interdependencia_convenios'), {
      uid, nit: nit ?? '',
      prestador: data.prestador.trim(),
      tipoServicio: data.tipoServicio,
      contacto: data.contacto.trim(),
      tieneConvenioFormal: data.tieneConvenioFormal,
      vigenciaHasta: data.vigenciaHasta || null,
      tiempoRespuestaAcordado: data.tiempoRespuestaAcordado.trim(),
      fechaCreacion: serverTimestamp(),
      fechaActualizacion: null,
    });
    registrarBitacora(uid, nit, 'Interdependencia', `Convenio registrado — ${data.prestador.trim()} (${data.tipoServicio})`, data.tiempoRespuestaAcordado.trim());
    return ref.id;
  }, []);

  // ── Actualizar convenio (renovación de vigencia, cambio de contacto, etc.) ──
  const actualizarConvenio = useCallback(async (id: string, data: ConvenioFormData): Promise<void> => {
    await updateDoc(doc(fbDb, 'interdependencia_convenios', id), {
      prestador: data.prestador.trim(),
      tipoServicio: data.tipoServicio,
      contacto: data.contacto.trim(),
      tieneConvenioFormal: data.tieneConvenioFormal,
      vigenciaHasta: data.vigenciaHasta || null,
      tiempoRespuestaAcordado: data.tiempoRespuestaAcordado.trim(),
      fechaActualizacion: serverTimestamp(),
    });
  }, []);

  // ── Registrar verificación de Interdependencia ───────────
  const registrarVerificacion = useCallback(async (
    data: VerificacionFormData, uid: string, nit: string | null,
  ): Promise<void> => {
    const score = calcScoreVerificacion(data.respuestas);
    const estado = calcEstadoVerificacion(score, data.respuestas);
    await addDoc(collection(fbDb, 'interdependencia_verificaciones'), {
      uid, nit: nit ?? '',
      fecha: data.fecha,
      responsable: data.responsable.trim(),
      respuestas: data.respuestas,
      hallazgos: data.hallazgos.trim(),
      score,
      capaId: null,
      fechaCreacion: serverTimestamp(),
    });
    registrarBitacora(
      uid, nit, 'Interdependencia',
      `Verificación de Interdependencia — score ${score}/100 (${estado === 'cumple' ? 'cumple' : estado === 'parcial' ? 'cumplimiento parcial' : 'no cumple'})`,
      data.hallazgos.trim(),
    );
  }, []);

  const vincularCapaAVerificacion = useCallback(async (verificacionId: string, capaId: string): Promise<void> => {
    await updateDoc(doc(fbDb, 'interdependencia_verificaciones', verificacionId), { capaId });
  }, []);

  return {
    convenios, loadingConvenios, statsConvenios, createConvenio, actualizarConvenio,
    verificaciones, loadingVerificaciones, registrarVerificacion, vincularCapaAVerificacion,
  };
}
