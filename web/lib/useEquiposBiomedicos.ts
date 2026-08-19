'use client';

// web/lib/useEquiposBiomedicos.ts
// Hook React para CRUD del módulo CMMS — Equipos Biomédicos, vía Firestore
// en tiempo real. Mismo patrón dual uid+nit que useCapas/useVencimientos.
//
// Hoja de vida (mantenimientos preventivos/correctivos) vive en la
// subcolección equipos_biomedicos/{id}/mantenimientos — igual patrón que
// documentos_dms/{id}/socializaciones. El último mantenimiento se
// denormaliza en el propio documento del equipo (ultimoMantenimientoFecha /
// proximoMantenimiento) para poder calcular KPIs y vencimientos en la lista
// sin disparar una consulta por equipo.

import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, orderBy, onSnapshot, getDocs,
  addDoc, updateDoc, doc, serverTimestamp,
  type Unsubscribe, Timestamp,
} from 'firebase/firestore';
import { db as fbDb } from '@/lib/firebase';
import type {
  Equipo, EquipoFormData, EquipoEstado,
  Mantenimiento, MantenimientoFormData,
} from './equipoTypes';

const hoyISO = () => new Date().toISOString().slice(0, 10);

function addMeses(fechaISO: string, meses: number): string {
  const d = new Date(fechaISO + 'T00:00:00');
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

function addComputedFields(raw: Omit<Equipo, '_mantenimientoVencido' | '_registroSanitarioVencido'>): Equipo {
  const hoy = hoyISO();
  return {
    ...raw,
    _mantenimientoVencido: !!raw.proximoMantenimiento && raw.proximoMantenimiento < hoy,
    _registroSanitarioVencido: !!raw.registroSanitarioVigenciaHasta && raw.registroSanitarioVigenciaHasta < hoy,
  };
}

export interface EquipoStats {
  total: number;
  activos: number;
  mantenimientoAlDia: number;
  mantenimientoVencido: number;
  sinRegistroSanitarioVigente: number;
}

export interface UseEquiposBiomedicosResult {
  equipos: Equipo[];
  loading: boolean;
  error: string | null;
  stats: EquipoStats;
  createEquipo: (data: EquipoFormData, uid: string, nit: string) => Promise<string>;
  updateEquipo: (id: string, data: Partial<EquipoFormData>) => Promise<void>;
  listarMantenimientos: (equipoId: string) => Promise<Mantenimiento[]>;
  registrarMantenimiento: (
    equipoId: string,
    data: MantenimientoFormData,
    registradoPor: string,
    frecuenciaMantenimientoMeses: number,
  ) => Promise<void>;
}

export function useEquiposBiomedicos(uid: string | null, nit: string | null): UseEquiposBiomedicosResult {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    const baseQuery = nit
      ? query(collection(fbDb, 'equipos_biomedicos'), where('nit', '==', nit), orderBy('fechaCreacion', 'desc'))
      : query(collection(fbDb, 'equipos_biomedicos'), where('uid', '==', uid), orderBy('fechaCreacion', 'desc'));

    let unsub: Unsubscribe;
    try {
      unsub = onSnapshot(
        baseQuery,
        snap => {
          const items = snap.docs.map(d =>
            addComputedFields({ id: d.id, ...(d.data() as Omit<Equipo, 'id' | '_mantenimientoVencido' | '_registroSanitarioVencido'>) })
          );
          setEquipos(items);
          setLoading(false);
        },
        () => {
          // Índice compuesto aún no existe — fallback sin orderBy
          const fallbackQ = nit
            ? query(collection(fbDb, 'equipos_biomedicos'), where('nit', '==', nit))
            : query(collection(fbDb, 'equipos_biomedicos'), where('uid', '==', uid));

          unsub = onSnapshot(
            fallbackQ,
            snap => {
              const items = snap.docs
                .map(d => addComputedFields({ id: d.id, ...(d.data() as Omit<Equipo, 'id' | '_mantenimientoVencido' | '_registroSanitarioVencido'>) }))
                .sort((a, b) => {
                  const ta = a.fechaCreacion?.seconds ?? 0;
                  const tb = b.fechaCreacion?.seconds ?? 0;
                  return tb - ta;
                });
              setEquipos(items);
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

  const stats: EquipoStats = {
    total: equipos.length,
    activos: equipos.filter(e => e.estado === 'activo').length,
    mantenimientoAlDia: equipos.filter(e => e.estado === 'activo' && !e._mantenimientoVencido).length,
    mantenimientoVencido: equipos.filter(e => e.estado === 'activo' && e._mantenimientoVencido).length,
    sinRegistroSanitarioVigente: equipos.filter(e => e.estado === 'activo' && e._registroSanitarioVencido).length,
  };

  // ── Crear equipo ────────────────────────────────────────
  const createEquipo = useCallback(async (
    data: EquipoFormData,
    uid: string,
    nit: string,
  ): Promise<string> => {
    const ref = await addDoc(collection(fbDb, 'equipos_biomedicos'), {
      uid,
      nit: nit ?? '',
      nombre: data.nombre.trim(),
      marca: data.marca.trim(),
      modelo: data.modelo.trim(),
      serie: data.serie.trim(),
      servicioAsociado: data.servicioAsociado.trim(),
      estado: data.estado as EquipoEstado,
      registroSanitario: data.registroSanitario.trim(),
      registroSanitarioVigenciaHasta: data.registroSanitarioVigenciaHasta,
      fechaAdquisicion: data.fechaAdquisicion,
      frecuenciaMantenimientoMeses: data.frecuenciaMantenimientoMeses,
      personalCapacitado: data.personalCapacitado.trim(),
      ultimoMantenimientoFecha: null,
      ultimoMantenimientoTipo: null,
      proximoMantenimiento: null,
      fechaCreacion: serverTimestamp(),
      fechaActualizacion: null,
    });
    return ref.id;
  }, []);

  // ── Actualizar equipo ───────────────────────────────────
  const updateEquipo = useCallback(async (id: string, data: Partial<EquipoFormData>): Promise<void> => {
    await updateDoc(doc(fbDb, 'equipos_biomedicos', id), {
      ...(data.nombre !== undefined && { nombre: data.nombre.trim() }),
      ...(data.marca !== undefined && { marca: data.marca.trim() }),
      ...(data.modelo !== undefined && { modelo: data.modelo.trim() }),
      ...(data.serie !== undefined && { serie: data.serie.trim() }),
      ...(data.servicioAsociado !== undefined && { servicioAsociado: data.servicioAsociado.trim() }),
      ...(data.estado !== undefined && { estado: data.estado }),
      ...(data.registroSanitario !== undefined && { registroSanitario: data.registroSanitario.trim() }),
      ...(data.registroSanitarioVigenciaHasta !== undefined && { registroSanitarioVigenciaHasta: data.registroSanitarioVigenciaHasta }),
      ...(data.fechaAdquisicion !== undefined && { fechaAdquisicion: data.fechaAdquisicion }),
      ...(data.frecuenciaMantenimientoMeses !== undefined && { frecuenciaMantenimientoMeses: data.frecuenciaMantenimientoMeses }),
      ...(data.personalCapacitado !== undefined && { personalCapacitado: data.personalCapacitado.trim() }),
      fechaActualizacion: serverTimestamp(),
    });
  }, []);

  // ── Hoja de vida — listar mantenimientos ────────────────
  const listarMantenimientos = useCallback(async (equipoId: string): Promise<Mantenimiento[]> => {
    const snap = await getDocs(collection(fbDb, 'equipos_biomedicos', equipoId, 'mantenimientos'));
    const items = snap.docs.map(d => {
      const r = d.data();
      return {
        id: d.id,
        tipo: r.tipo,
        fecha: r.fecha,
        responsableNombre: r.responsableNombre ?? '',
        responsablePerfil: r.responsablePerfil ?? 'tecnico',
        descripcion: r.descripcion ?? '',
        fechaCreacion: (r.fechaCreacion as Timestamp) ?? null,
        registradoPor: r.registradoPor ?? '',
      } as Mantenimiento;
    });
    // Más reciente primero (por fecha del mantenimiento, no de creación del registro)
    return items.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  }, []);

  // ── Hoja de vida — registrar mantenimiento ──────────────
  // Escribe el registro inmutable en la subcolección Y denormaliza el
  // resumen (última fecha / próximo mantenimiento) en el equipo, para que
  // la lista y los KPIs no requieran una consulta por equipo.
  const registrarMantenimiento = useCallback(async (
    equipoId: string,
    data: MantenimientoFormData,
    registradoPor: string,
    frecuenciaMantenimientoMeses: number,
  ): Promise<void> => {
    await addDoc(collection(fbDb, 'equipos_biomedicos', equipoId, 'mantenimientos'), {
      tipo: data.tipo,
      fecha: data.fecha,
      responsableNombre: data.responsableNombre.trim(),
      responsablePerfil: data.responsablePerfil,
      descripcion: data.descripcion.trim(),
      fechaCreacion: serverTimestamp(),
      registradoPor,
    });

    await updateDoc(doc(fbDb, 'equipos_biomedicos', equipoId), {
      ultimoMantenimientoFecha: data.fecha,
      ultimoMantenimientoTipo: data.tipo,
      proximoMantenimiento: addMeses(data.fecha, frecuenciaMantenimientoMeses || 6),
      fechaActualizacion: serverTimestamp(),
    });
  }, []);

  return {
    equipos, loading, error, stats,
    createEquipo, updateEquipo,
    listarMantenimientos, registrarMantenimiento,
  };
}
