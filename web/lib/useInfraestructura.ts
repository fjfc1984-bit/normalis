'use client';

// web/lib/useInfraestructura.ts
// Hook React para el módulo de Gestión de Infraestructura Física, vía
// Firestore en tiempo real. Mismo patrón dual uid+nit y de hoja de vida
// (registro histórico inmutable) que useEquiposBiomedicos.ts — aquí la
// "hoja de vida" es la bitácora de inspecciones periódicas contra el
// checklist real del Estándar de Infraestructura.

import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, orderBy, onSnapshot, getDocs,
  addDoc, updateDoc, doc, serverTimestamp,
  type Unsubscribe, Timestamp,
} from 'firebase/firestore';
import { db as fbDb, auth as fbAuth } from '@/lib/firebase';
import { registrarBitacora } from '@/lib/useBitacora';
import {
  calcScoreInspeccion, calcEstadoDesdeScore,
  type AreaFisica, type AreaFisicaFormData,
  type Inspeccion, type InspeccionFormData,
} from './infraestructuraTypes';

const hoyISO = () => new Date().toISOString().slice(0, 10);

function addMeses(fechaISO: string, meses: number): string {
  const d = new Date(fechaISO + 'T00:00:00');
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

function addComputedFields(raw: Omit<AreaFisica, '_inspeccionVencida'>): AreaFisica {
  const hoy = hoyISO();
  return {
    ...raw,
    _inspeccionVencida: !!raw.proximaInspeccion && raw.proximaInspeccion < hoy,
  };
}

export interface InfraestructuraStats {
  total: number;
  cumple: number;
  parcial: number;
  noCumple: number;
  sinInspeccionar: number;
  inspeccionVencida: number;
}

export interface UseInfraestructuraResult {
  areas: AreaFisica[];
  loading: boolean;
  error: string | null;
  stats: InfraestructuraStats;
  createArea: (data: AreaFisicaFormData, uid: string, nit: string) => Promise<string>;
  updateArea: (id: string, data: Partial<AreaFisicaFormData>) => Promise<void>;
  listarInspecciones: (areaId: string) => Promise<Inspeccion[]>;
  registrarInspeccion: (
    areaId: string,
    data: InspeccionFormData,
    registradoPor: string,
    frecuenciaInspeccionMeses: number,
    nit: string | null,
  ) => Promise<{ inspeccionScore: number; inspeccionEstado: ReturnType<typeof calcEstadoDesdeScore> }>;
  vincularCapaAInspeccion: (areaId: string, inspeccionId: string, capaId: string) => Promise<void>;
}

export function useInfraestructura(uid: string | null, nit: string | null): UseInfraestructuraResult {
  const [areas,   setAreas]   = useState<AreaFisica[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    const baseQuery = nit
      ? query(collection(fbDb, 'infraestructura_areas'), where('nit', '==', nit), orderBy('fechaCreacion', 'desc'))
      : query(collection(fbDb, 'infraestructura_areas'), where('uid', '==', uid), orderBy('fechaCreacion', 'desc'));

    let unsub: Unsubscribe;
    try {
      unsub = onSnapshot(
        baseQuery,
        snap => {
          const items = snap.docs.map(d =>
            addComputedFields({ id: d.id, ...(d.data() as Omit<AreaFisica, 'id' | '_inspeccionVencida'>) })
          );
          setAreas(items);
          setLoading(false);
        },
        () => {
          // Índice compuesto aún no existe — fallback sin orderBy
          const fallbackQ = nit
            ? query(collection(fbDb, 'infraestructura_areas'), where('nit', '==', nit))
            : query(collection(fbDb, 'infraestructura_areas'), where('uid', '==', uid));

          unsub = onSnapshot(
            fallbackQ,
            snap => {
              const items = snap.docs
                .map(d => addComputedFields({ id: d.id, ...(d.data() as Omit<AreaFisica, 'id' | '_inspeccionVencida'>) }))
                .sort((a, b) => {
                  const ta = a.fechaCreacion?.seconds ?? 0;
                  const tb = b.fechaCreacion?.seconds ?? 0;
                  return tb - ta;
                });
              setAreas(items);
              setLoading(false);
            },
            e => { setError(e.message); setLoading(false); }
          );
        }
      );
    } catch (e) {
      setError(String(e));
      setLoading(false);
      return;
    }

    return () => unsub?.();
  }, [uid, nit]);

  const stats: InfraestructuraStats = {
    total:             areas.length,
    cumple:            areas.filter(a => a.estado === 'cumple').length,
    parcial:           areas.filter(a => a.estado === 'parcial').length,
    noCumple:          areas.filter(a => a.estado === 'no_cumple').length,
    sinInspeccionar:   areas.filter(a => a.estado === 'sin_inspeccionar').length,
    inspeccionVencida: areas.filter(a => a._inspeccionVencida).length,
  };

  // ── Crear área física ────────────────────────────────────
  const createArea = useCallback(async (
    data: AreaFisicaFormData,
    uid: string,
    nit: string,
  ): Promise<string> => {
    const ref = await addDoc(collection(fbDb, 'infraestructura_areas'), {
      uid,
      nit: nit ?? '',
      nombre: data.nombre.trim(),
      tipoArea: data.tipoArea.trim(),
      responsable: data.responsable.trim(),
      frecuenciaInspeccionMeses: data.frecuenciaInspeccionMeses,
      ultimaInspeccionFecha: null,
      ultimaInspeccionScore: null,
      proximaInspeccion: null,
      estado: 'sin_inspeccionar',
      capaId: null,
      fechaCreacion: serverTimestamp(),
      fechaActualizacion: null,
    });
    registrarBitacora(uid, nit, 'Infraestructura', `Área registrada — ${data.nombre.trim()}`, data.tipoArea.trim());
    return ref.id;
  }, []);

  // ── Actualizar área física ───────────────────────────────
  const updateArea = useCallback(async (id: string, data: Partial<AreaFisicaFormData>): Promise<void> => {
    await updateDoc(doc(fbDb, 'infraestructura_areas', id), {
      ...(data.nombre !== undefined && { nombre: data.nombre.trim() }),
      ...(data.tipoArea !== undefined && { tipoArea: data.tipoArea.trim() }),
      ...(data.responsable !== undefined && { responsable: data.responsable.trim() }),
      ...(data.frecuenciaInspeccionMeses !== undefined && { frecuenciaInspeccionMeses: data.frecuenciaInspeccionMeses }),
      fechaActualizacion: serverTimestamp(),
      modificadoPor: fbAuth.currentUser?.uid ?? null,
      modificadoPorNombre: fbAuth.currentUser?.displayName ?? '',
      modificadoEn: serverTimestamp(),
    });
  }, []);

  // ── Listar inspecciones (hoja de vida) ───────────────────
  const listarInspecciones = useCallback(async (areaId: string): Promise<Inspeccion[]> => {
    const snap = await getDocs(collection(fbDb, 'infraestructura_areas', areaId, 'inspecciones'));
    const items = snap.docs.map(d => {
      const r = d.data();
      return {
        id: d.id,
        fecha: r.fecha,
        inspector: r.inspector ?? '',
        respuestas: r.respuestas ?? {},
        hallazgos: r.hallazgos ?? '',
        score: r.score ?? 0,
        fechaCreacion: (r.fechaCreacion as Timestamp) ?? null,
        registradoPor: r.registradoPor ?? '',
        capaId: r.capaId ?? null,
      } as Inspeccion;
    });
    return items.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  }, []);

  // ── Registrar inspección — escribe en la hoja de vida y denormaliza
  //    el resumen en el área para KPIs/lista sin N+1 queries, e informa a
  //    la Bitácora de Gobernanza compartida por NIT ────────────────────
  const registrarInspeccion = useCallback(async (
    areaId: string,
    data: InspeccionFormData,
    registradoPor: string,
    frecuenciaInspeccionMeses: number,
    nit: string | null,
  ) => {
    const score = calcScoreInspeccion(data.respuestas);
    const estado = calcEstadoDesdeScore(score, data.respuestas);

    await addDoc(collection(fbDb, 'infraestructura_areas', areaId, 'inspecciones'), {
      fecha: data.fecha,
      inspector: data.inspector.trim(),
      respuestas: data.respuestas,
      hallazgos: data.hallazgos.trim(),
      score,
      fechaCreacion: serverTimestamp(),
      registradoPor,
      capaId: null,
    });

    await updateDoc(doc(fbDb, 'infraestructura_areas', areaId), {
      ultimaInspeccionFecha: data.fecha,
      ultimaInspeccionScore: score,
      proximaInspeccion: addMeses(data.fecha, frecuenciaInspeccionMeses || 6),
      estado,
      fechaActualizacion: serverTimestamp(),
    });

    registrarBitacora(
      fbAuth.currentUser?.uid ?? '', nit, 'Infraestructura',
      `Inspección registrada — score ${score}/100 (${estado === 'cumple' ? 'cumple' : estado === 'parcial' ? 'cumplimiento parcial' : 'no cumple'})`,
      data.hallazgos.trim(),
    );

    return { inspeccionScore: score, inspeccionEstado: estado };
  }, []);

  // ── Vincular una CAPA creada desde los hallazgos de una inspección ──
  const vincularCapaAInspeccion = useCallback(async (
    areaId: string, inspeccionId: string, capaId: string,
  ): Promise<void> => {
    await updateDoc(doc(fbDb, 'infraestructura_areas', areaId, 'inspecciones', inspeccionId), { capaId });
    await updateDoc(doc(fbDb, 'infraestructura_areas', areaId), { capaId });
  }, []);

  return {
    areas, loading, error, stats,
    createArea, updateArea,
    listarInspecciones, registrarInspeccion, vincularCapaAInspeccion,
  };
}
