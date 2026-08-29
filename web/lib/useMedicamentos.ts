'use client';

// web/lib/useMedicamentos.ts
// Hook React para el módulo de Gestión de Medicamentos y Dispositivos
// Médicos, vía Firestore en tiempo real. Dos colecciones planas
// (medicamentos_lotes, medicamentos_verificaciones), mismo patrón dual
// uid+nit que el resto de módulos compartidos por Equipo IPS.

import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db as fbDb, auth as fbAuth } from '@/lib/firebase';
import { registrarBitacora } from '@/lib/useBitacora';
import {
  calcEstadoLote, calcScoreVerificacion, calcEstadoVerificacion,
  type LoteMedicamento, type LoteFormData,
  type VerificacionFarmacia, type VerificacionFormData,
} from './medicamentosTypes';

function addComputedFieldsLote(raw: Omit<LoteMedicamento, '_estado' | '_diasParaVencer'>): LoteMedicamento {
  const { estado, diasParaVencer } = calcEstadoLote(raw.fechaVencimiento, raw.estadoManual);
  return { ...raw, _estado: estado, _diasParaVencer: diasParaVencer };
}

export interface LotesStats {
  total: number;
  activos: number;
  porVencer: number;
  vencidos: number;
  altoRiesgoOControlado: number;
  cadenaFrio: number;
}

export interface UseMedicamentosResult {
  lotes: LoteMedicamento[];
  loadingLotes: boolean;
  statsLotes: LotesStats;
  createLote: (data: LoteFormData, uid: string, nit: string) => Promise<string>;
  retirarLote: (id: string) => Promise<void>;

  verificaciones: VerificacionFarmacia[];
  loadingVerificaciones: boolean;
  registrarVerificacion: (data: VerificacionFormData, uid: string, nit: string | null) => Promise<void>;
  vincularCapaAVerificacion: (verificacionId: string, capaId: string) => Promise<void>;
}

export function useMedicamentos(uid: string | null, nit: string | null): UseMedicamentosResult {
  const [lotes, setLotes] = useState<LoteMedicamento[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(true);

  const [verificaciones, setVerificaciones] = useState<VerificacionFarmacia[]>([]);
  const [loadingVerificaciones, setLoadingVerificaciones] = useState(true);

  // ── Suscripción — lotes ──────────────────────────────────
  useEffect(() => {
    if (!uid) { setLoadingLotes(false); return; }
    setLoadingLotes(true);

    const baseQuery = nit
      ? query(collection(fbDb, 'medicamentos_lotes'), where('nit', '==', nit), orderBy('fechaVencimiento', 'asc'))
      : query(collection(fbDb, 'medicamentos_lotes'), where('uid', '==', uid), orderBy('fechaVencimiento', 'asc'));

    let unsub: Unsubscribe;
    try {
      unsub = onSnapshot(
        baseQuery,
        snap => {
          setLotes(snap.docs.map(d => addComputedFieldsLote({ id: d.id, ...(d.data() as Omit<LoteMedicamento, 'id' | '_estado' | '_diasParaVencer'>) })));
          setLoadingLotes(false);
        },
        () => {
          const fallbackQ = nit
            ? query(collection(fbDb, 'medicamentos_lotes'), where('nit', '==', nit))
            : query(collection(fbDb, 'medicamentos_lotes'), where('uid', '==', uid));
          unsub = onSnapshot(
            fallbackQ,
            snap => {
              const items = snap.docs
                .map(d => addComputedFieldsLote({ id: d.id, ...(d.data() as Omit<LoteMedicamento, 'id' | '_estado' | '_diasParaVencer'>) }))
                .sort((a, b) => (a.fechaVencimiento || '').localeCompare(b.fechaVencimiento || ''));
              setLotes(items);
              setLoadingLotes(false);
            },
            () => setLoadingLotes(false)
          );
        }
      );
    } catch { setLoadingLotes(false); return; }

    return () => unsub?.();
  }, [uid, nit]);

  // ── Suscripción — verificaciones del Servicio Farmacéutico ──
  useEffect(() => {
    if (!uid) { setLoadingVerificaciones(false); return; }
    setLoadingVerificaciones(true);

    const baseQuery = nit
      ? query(collection(fbDb, 'medicamentos_verificaciones'), where('nit', '==', nit), orderBy('fechaCreacion', 'desc'))
      : query(collection(fbDb, 'medicamentos_verificaciones'), where('uid', '==', uid), orderBy('fechaCreacion', 'desc'));

    let unsub: Unsubscribe;
    try {
      unsub = onSnapshot(
        baseQuery,
        snap => {
          setVerificaciones(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<VerificacionFarmacia, 'id'>) })));
          setLoadingVerificaciones(false);
        },
        () => {
          const fallbackQ = nit
            ? query(collection(fbDb, 'medicamentos_verificaciones'), where('nit', '==', nit))
            : query(collection(fbDb, 'medicamentos_verificaciones'), where('uid', '==', uid));
          unsub = onSnapshot(
            fallbackQ,
            snap => {
              const items = snap.docs
                .map(d => ({ id: d.id, ...(d.data() as Omit<VerificacionFarmacia, 'id'>) }))
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

  const statsLotes: LotesStats = {
    total:      lotes.length,
    activos:    lotes.filter(l => l._estado === 'activo').length,
    porVencer:  lotes.filter(l => l._estado === 'por_vencer').length,
    vencidos:   lotes.filter(l => l._estado === 'vencido').length,
    altoRiesgoOControlado: lotes.filter(l => l.tipo !== 'regular' && l._estado !== 'retirado').length,
    cadenaFrio: lotes.filter(l => l.requiereCadenaFrio && l._estado !== 'retirado').length,
  };

  // ── Crear lote ────────────────────────────────────────────
  const createLote = useCallback(async (data: LoteFormData, uid: string, nit: string): Promise<string> => {
    const ref = await addDoc(collection(fbDb, 'medicamentos_lotes'), {
      uid, nit: nit ?? '',
      nombre: data.nombre.trim(),
      lote: data.lote.trim(),
      tipo: data.tipo,
      cantidad: data.cantidad,
      unidadMedida: data.unidadMedida.trim(),
      fechaVencimiento: data.fechaVencimiento,
      requiereCadenaFrio: data.requiereCadenaFrio,
      ubicacion: data.ubicacion.trim(),
      estadoManual: 'activo',
      fechaCreacion: serverTimestamp(),
      fechaActualizacion: null,
    });
    registrarBitacora(uid, nit, 'Medicamentos', `Lote registrado — ${data.nombre.trim()} (${data.lote.trim() || 's/n'})`, `Vence: ${data.fechaVencimiento}`);
    return ref.id;
  }, []);

  // ── Retirar/destruir lote (proceso documentado, criterio real q6) ──
  const retirarLote = useCallback(async (id: string): Promise<void> => {
    await updateDoc(doc(fbDb, 'medicamentos_lotes', id), {
      estadoManual: 'retirado',
      fechaActualizacion: serverTimestamp(),
      modificadoPor: fbAuth.currentUser?.uid ?? null,
      modificadoPorNombre: fbAuth.currentUser?.displayName ?? '',
      modificadoEn: serverTimestamp(),
    });
  }, []);

  // ── Registrar verificación del Servicio Farmacéutico ────────
  const registrarVerificacion = useCallback(async (
    data: VerificacionFormData, uid: string, nit: string | null,
  ): Promise<void> => {
    const score = calcScoreVerificacion(data.respuestas);
    const estado = calcEstadoVerificacion(score, data.respuestas);
    await addDoc(collection(fbDb, 'medicamentos_verificaciones'), {
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
      uid, nit, 'Medicamentos',
      `Verificación del Servicio Farmacéutico — score ${score}/100 (${estado === 'cumple' ? 'cumple' : estado === 'parcial' ? 'cumplimiento parcial' : 'no cumple'})`,
      data.hallazgos.trim(),
    );
  }, []);

  const vincularCapaAVerificacion = useCallback(async (verificacionId: string, capaId: string): Promise<void> => {
    await updateDoc(doc(fbDb, 'medicamentos_verificaciones', verificacionId), { capaId });
  }, []);

  return {
    lotes, loadingLotes, statsLotes, createLote, retirarLote,
    verificaciones, loadingVerificaciones, registrarVerificacion, vincularCapaAVerificacion,
  };
}
