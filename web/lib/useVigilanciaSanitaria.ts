'use client';

// web/lib/useVigilanciaSanitaria.ts
// Hook React para CRUD del módulo de Vigilancia Sanitaria (farmacovigilancia,
// tecnovigilancia, reactivovigilancia), vía Firestore en tiempo real. Mismo
// patrón dual uid+nit que useCapas/useEquiposBiomedicos.
//
// Los reportes de eventos adversos NUNCA se editan de forma que oculte su
// contenido original ni se eliminan — igual que documentos_dms y equipos_
// biomedicos, son registros de auditoría regulatoria. Se permite actualizar
// el estado (pendiente → reportado) y agregar el radicado INVIMA, pero no
// borrar el registro.

import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db as fbDb } from '@/lib/firebase';
import type { EventoVigilancia, EventoVigilanciaFormData, TipoVigilancia } from './vigilanciaTypes';
import { TIPO_VIGILANCIA_CFG } from './vigilanciaTypes';

const hoyISO = () => new Date().toISOString().slice(0, 10);

function addDias(fechaISO: string, dias: number): string {
  const d = new Date(fechaISO + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function addComputedFields(raw: Omit<EventoVigilancia, '_fechaLimiteReporte' | '_reporteVencido'>): EventoVigilancia {
  const hoy = hoyISO();
  const esSerio = raw.severidad === 'serio';
  const fechaLimite = esSerio && raw.fechaConocimiento
    ? addDias(raw.fechaConocimiento, TIPO_VIGILANCIA_CFG[raw.tipoVigilancia].plazoSerioDias)
    : null;
  return {
    ...raw,
    _fechaLimiteReporte: fechaLimite,
    _reporteVencido: !!fechaLimite && raw.estadoReporte === 'pendiente' && fechaLimite < hoy,
  };
}

export interface VigilanciaStats {
  total: number;
  seriosPendientes: number;
  vencidos: number;
  reportados: number;
}

export interface UseVigilanciaSanitariaResult {
  eventos: EventoVigilancia[];
  loading: boolean;
  error: string | null;
  stats: VigilanciaStats;
  crearEvento: (data: EventoVigilanciaFormData, uid: string, nit: string) => Promise<string>;
  actualizarEvento: (id: string, data: Partial<EventoVigilanciaFormData>) => Promise<void>;
}

export function useVigilanciaSanitaria(uid: string | null, nit: string | null): UseVigilanciaSanitariaResult {
  const [eventos, setEventos] = useState<EventoVigilancia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    const baseQuery = nit
      ? query(collection(fbDb, 'eventos_vigilancia'), where('nit', '==', nit), orderBy('fechaCreacion', 'desc'))
      : query(collection(fbDb, 'eventos_vigilancia'), where('uid', '==', uid), orderBy('fechaCreacion', 'desc'));

    let unsub: Unsubscribe;
    try {
      unsub = onSnapshot(
        baseQuery,
        snap => {
          const items = snap.docs.map(d =>
            addComputedFields({ id: d.id, ...(d.data() as Omit<EventoVigilancia, 'id' | '_fechaLimiteReporte' | '_reporteVencido'>) })
          );
          setEventos(items);
          setLoading(false);
        },
        () => {
          // Índice compuesto aún no existe — fallback sin orderBy
          const fallbackQ = nit
            ? query(collection(fbDb, 'eventos_vigilancia'), where('nit', '==', nit))
            : query(collection(fbDb, 'eventos_vigilancia'), where('uid', '==', uid));

          unsub = onSnapshot(
            fallbackQ,
            snap => {
              const items = snap.docs
                .map(d => addComputedFields({ id: d.id, ...(d.data() as Omit<EventoVigilancia, 'id' | '_fechaLimiteReporte' | '_reporteVencido'>) }))
                .sort((a, b) => {
                  const ta = a.fechaCreacion?.seconds ?? 0;
                  const tb = b.fechaCreacion?.seconds ?? 0;
                  return tb - ta;
                });
              setEventos(items);
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

  const stats: VigilanciaStats = {
    total: eventos.length,
    seriosPendientes: eventos.filter(e => e.severidad === 'serio' && e.estadoReporte === 'pendiente').length,
    vencidos: eventos.filter(e => e._reporteVencido).length,
    reportados: eventos.filter(e => e.estadoReporte === 'reportado').length,
  };

  // ── Crear evento ─────────────────────────────────────────
  const crearEvento = useCallback(async (
    data: EventoVigilanciaFormData,
    uid: string,
    nit: string,
  ): Promise<string> => {
    const ref = await addDoc(collection(fbDb, 'eventos_vigilancia'), {
      uid,
      nit: nit ?? '',
      tipoVigilancia: data.tipoVigilancia as TipoVigilancia,
      productoNombre: data.productoNombre.trim(),
      descripcionEvento: data.descripcionEvento.trim(),
      fechaOcurrencia: data.fechaOcurrencia,
      fechaConocimiento: data.fechaConocimiento,
      severidad: data.severidad,
      pacienteAfectado: data.pacienteAfectado,
      accionesTomadas: data.accionesTomadas.trim(),
      responsableReporte: data.responsableReporte.trim(),
      estadoReporte: data.estadoReporte,
      fechaReporteInvima: data.fechaReporteInvima || null,
      radicadoInvima: data.radicadoInvima.trim(),
      fechaCreacion: serverTimestamp(),
      fechaActualizacion: null,
    });
    return ref.id;
  }, []);

  // ── Actualizar evento (p.ej. marcar como reportado) ─────
  const actualizarEvento = useCallback(async (id: string, data: Partial<EventoVigilanciaFormData>): Promise<void> => {
    await updateDoc(doc(fbDb, 'eventos_vigilancia', id), {
      ...(data.tipoVigilancia !== undefined && { tipoVigilancia: data.tipoVigilancia }),
      ...(data.productoNombre !== undefined && { productoNombre: data.productoNombre.trim() }),
      ...(data.descripcionEvento !== undefined && { descripcionEvento: data.descripcionEvento.trim() }),
      ...(data.fechaOcurrencia !== undefined && { fechaOcurrencia: data.fechaOcurrencia }),
      ...(data.fechaConocimiento !== undefined && { fechaConocimiento: data.fechaConocimiento }),
      ...(data.severidad !== undefined && { severidad: data.severidad }),
      ...(data.pacienteAfectado !== undefined && { pacienteAfectado: data.pacienteAfectado }),
      ...(data.accionesTomadas !== undefined && { accionesTomadas: data.accionesTomadas.trim() }),
      ...(data.responsableReporte !== undefined && { responsableReporte: data.responsableReporte.trim() }),
      ...(data.estadoReporte !== undefined && { estadoReporte: data.estadoReporte }),
      ...(data.fechaReporteInvima !== undefined && { fechaReporteInvima: data.fechaReporteInvima || null }),
      ...(data.radicadoInvima !== undefined && { radicadoInvima: data.radicadoInvima.trim() }),
      fechaActualizacion: serverTimestamp(),
    });
  }, []);

  return { eventos, loading, error, stats, crearEvento, actualizarEvento };
}
