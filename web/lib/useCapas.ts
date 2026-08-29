'use client';

// web/lib/useCapas.ts
// Hook React para CRUD de CAPAs vía Firestore en tiempo real.
// Soporta dual-write uid+nit para compatibilidad multi-usuario.
//
// Ciclo de estados: abierta → en_progreso → implementada → cerrada
// (o de vuelta a en_progreso si la verificación de eficacia encuentra
// reincidencia). Nunca se permite pasar de en_progreso a cerrada sin
// pasar por el paso de verificación con evidencia posterior.

import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp, getCountFromServer,
  increment, arrayUnion,
  type Unsubscribe,
} from 'firebase/firestore';
import { db as fbDb, auth as fbAuth } from '@/lib/firebase';
import type { Capa, CapaFormData, CapaEstado, CapaVeredicto } from './capaTypes';

// Trazabilidad: quién hizo el último cambio en un registro compartido por
// equipo (Feature 1 — Equipo IPS). No restringe permisos, solo deja rastro
// de qué compañero tocó qué — usa el usuario realmente autenticado en este
// momento, no el uid que el hook recibió como prop (puede quedar obsoleto
// si la sesión cambia sin remount).
function selloAuditoria() {
  return {
    modificadoPor: fbAuth.currentUser?.uid ?? null,
    modificadoPorNombre: fbAuth.currentUser?.displayName ?? '',
    modificadoEn: serverTimestamp(),
  };
}

// ── Helpers ─────────────────────────────────────────────────
// Fecha de referencia para plazos: mientras está "implementada" se
// vigila la fecha de verificación de eficacia; en cualquier otro estado
// abierto se vigila la fecha límite original.
function fechaRef(c: Omit<Capa, '_vencida' | '_diasRestantes'>): string | undefined {
  return c.estado === 'implementada' ? (c.fechaVerificacion ?? undefined) : c.fechaLimite;
}

function computeVencida(c: Omit<Capa, '_vencida' | '_diasRestantes'>): boolean {
  if (c.estado === 'cerrada') return false;
  const ref = fechaRef(c);
  return !!ref && new Date(ref) < new Date();
}

function computeDiasRestantes(c: Omit<Capa, '_vencida' | '_diasRestantes'>): number | null {
  if (c.estado === 'cerrada') return null;
  const ref = fechaRef(c);
  if (!ref) return null;
  return Math.ceil((new Date(ref).getTime() - Date.now()) / 86_400_000);
}

function addComputedFields(raw: Omit<Capa, '_vencida' | '_diasRestantes'>): Capa {
  return {
    ...raw,
    _vencida: computeVencida(raw),
    _diasRestantes: computeDiasRestantes(raw),
  };
}

// ── Tipos del hook ───────────────────────────────────────────
export interface UseCapasResult {
  capas: Capa[];
  loading: boolean;
  error: string | null;
  stats: CapaStats;
  createCapa: (data: CapaFormData, uid: string, nit: string) => Promise<string>;
  updateCapa: (id: string, data: Partial<CapaFormData>) => Promise<void>;
  iniciarCapa: (id: string) => Promise<void>;
  implementarCapa: (id: string, evidencia: string, diasVerificacion: number) => Promise<void>;
  verificarEficacia: (id: string, evidencia: string, veredicto: CapaVeredicto) => Promise<void>;
}

export interface CapaStats {
  total: number;
  abiertas: number;
  enProgreso: number;
  porVerificar: number;
  cerradas: number;
  vencidas: number;
}

// ── Hook principal ───────────────────────────────────────────
export function useCapas(uid: string | null, nit: string | null): UseCapasResult {
  const [capas,   setCapas]   = useState<Capa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }

    setLoading(true);
    setError(null);

    // Preferir query por NIT (multi-usuario) si existe, si no por UID
    const baseQuery = nit
      ? query(
          collection(fbDb, 'capas'),
          where('nit', '==', nit),
          orderBy('fechaCreacion', 'desc'),
        )
      : query(
          collection(fbDb, 'capas'),
          where('uid', '==', uid),
          orderBy('fechaCreacion', 'desc'),
        );

    let unsub: Unsubscribe;
    try {
      unsub = onSnapshot(
        baseQuery,
        snap => {
          const items = snap.docs.map(d =>
            addComputedFields({ id: d.id, ...(d.data() as Omit<Capa, 'id' | '_vencida' | '_diasRestantes'>) })
          );
          setCapas(items);
          setLoading(false);
        },
        (err) => {
          // Índice aún no existe — fallback sin orderBy
          const fallbackQ = nit
            ? query(collection(fbDb, 'capas'), where('nit', '==', nit))
            : query(collection(fbDb, 'capas'), where('uid', '==', uid));

          unsub = onSnapshot(
            fallbackQ,
            snap => {
              const items = snap.docs
                .map(d => addComputedFields({ id: d.id, ...(d.data() as Omit<Capa, 'id' | '_vencida' | '_diasRestantes'>) }))
                .sort((a, b) => {
                  const ta = a.fechaCreacion?.seconds ?? 0;
                  const tb = b.fechaCreacion?.seconds ?? 0;
                  return tb - ta;
                });
              setCapas(items);
              setLoading(false);
            },
            e => { setError(e.message); setLoading(false); }
          );
          void err; // supress unused warning
        }
      );
    } catch (e) {
      setError(String(e));
      setLoading(false);
      return;
    }

    return () => unsub?.();
  }, [uid, nit]);

  // Calcular stats derivadas
  const stats: CapaStats = {
    total:        capas.length,
    abiertas:     capas.filter(c => c.estado === 'abierta').length,
    enProgreso:   capas.filter(c => c.estado === 'en_progreso').length,
    porVerificar: capas.filter(c => c.estado === 'implementada').length,
    cerradas:     capas.filter(c => c.estado === 'cerrada').length,
    vencidas:     capas.filter(c => c._vencida).length,
  };

  // ── Crear CAPA ──────────────────────────────────────────
  const createCapa = useCallback(async (
    data: CapaFormData,
    uid: string,
    nit: string,
  ): Promise<string> => {
    // Número secuencial por IPS
    const countQ = nit
      ? query(collection(fbDb, 'capas'), where('nit', '==', nit))
      : query(collection(fbDb, 'capas'), where('uid', '==', uid));
    const snap = await getCountFromServer(countQ);
    const num  = String((snap.data().count ?? 0) + 1).padStart(3, '0');

    const ref = await addDoc(collection(fbDb, 'capas'), {
      uid,
      nit: nit ?? '',
      numero: `CAPA-${num}`,
      descripcion:      data.descripcion.trim(),
      causaRaiz:        data.causaRaiz.trim(),
      accionCorrectiva: data.accionCorrectiva.trim(),
      responsable:      data.responsable.trim(),
      area:             data.area.trim(),
      fechaLimite:      data.fechaLimite,
      origen:           data.origen || 'manual',
      evidencia:        data.evidencia.trim(),
      estado:           'abierta' as CapaEstado,
      fechaCreacion:    serverTimestamp(),
      fechaActualizacion: null,
      fechaInicio:      null,
      fechaCierre:      null,
    });
    return ref.id;
  }, []);

  // ── Actualizar CAPA ─────────────────────────────────────
  const updateCapa = useCallback(async (id: string, data: Partial<CapaFormData>): Promise<void> => {
    await updateDoc(doc(fbDb, 'capas', id), {
      ...(data.descripcion      !== undefined && { descripcion: data.descripcion.trim() }),
      ...(data.causaRaiz        !== undefined && { causaRaiz: data.causaRaiz.trim() }),
      ...(data.accionCorrectiva !== undefined && { accionCorrectiva: data.accionCorrectiva.trim() }),
      ...(data.responsable      !== undefined && { responsable: data.responsable.trim() }),
      ...(data.area             !== undefined && { area: data.area.trim() }),
      ...(data.fechaLimite      !== undefined && { fechaLimite: data.fechaLimite }),
      ...(data.origen           !== undefined && { origen: data.origen }),
      ...(data.evidencia        !== undefined && { evidencia: data.evidencia.trim() }),
      fechaActualizacion: serverTimestamp(),
      ...selloAuditoria(),
    });
  }, []);

  // ── Iniciar CAPA ────────────────────────────────────────
  const iniciarCapa = useCallback(async (id: string): Promise<void> => {
    await updateDoc(doc(fbDb, 'capas', id), {
      estado: 'en_progreso' as CapaEstado,
      fechaInicio: serverTimestamp(),
      fechaActualizacion: serverTimestamp(),
      ...selloAuditoria(),
    });
  }, []);

  // ── Marcar como implementada (pendiente de verificar eficacia) ──
  const implementarCapa = useCallback(async (
    id: string,
    evidencia: string,
    diasVerificacion: number,
  ): Promise<void> => {
    const dias = Math.max(1, diasVerificacion || 30);
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    const fechaVerificacion = fecha.toISOString().split('T')[0];

    await updateDoc(doc(fbDb, 'capas', id), {
      estado: 'implementada' as CapaEstado,
      evidenciaImplementacion: evidencia.trim(),
      fechaImplementacion: serverTimestamp(),
      fechaVerificacion,
      fechaActualizacion: serverTimestamp(),
      ...selloAuditoria(),
    });
  }, []);

  // ── Verificar eficacia (cierra si eficaz, reabre si reincide) ──
  const verificarEficacia = useCallback(async (
    id: string,
    evidencia: string,
    veredicto: CapaVeredicto,
  ): Promise<void> => {
    const entradaHistorial = {
      fecha: new Date().toISOString(),
      veredicto,
      evidencia: evidencia.trim(),
    };

    if (veredicto === 'eficaz') {
      await updateDoc(doc(fbDb, 'capas', id), {
        estado: 'cerrada' as CapaEstado,
        evidenciaVerificacion: evidencia.trim(),
        veredictoVerificacion: 'eficaz' as CapaVeredicto,
        fechaCierre: serverTimestamp(),
        fechaActualizacion: serverTimestamp(),
        historialVerificaciones: arrayUnion(entradaHistorial),
        ...selloAuditoria(),
      });
    } else {
      await updateDoc(doc(fbDb, 'capas', id), {
        estado: 'en_progreso' as CapaEstado,
        evidenciaVerificacion: evidencia.trim(),
        veredictoVerificacion: 'reincidencia' as CapaVeredicto,
        fechaVerificacion: null,
        reincidencias: increment(1),
        fechaActualizacion: serverTimestamp(),
        historialVerificaciones: arrayUnion(entradaHistorial),
        ...selloAuditoria(),
      });
    }
  }, []);

  return {
    capas, loading, error, stats,
    createCapa, updateCapa, iniciarCapa, implementarCapa, verificarEficacia,
  };
}
