'use client';

// web/lib/useIAAS.ts
// Hook Firestore en tiempo real para el módulo de Vigilancia IAAS.
// Colecciones raíz: iaas_casos/{id}, iaas_denominadores/{id}
// Dual-write uid+nit — acceso compartido por todo el equipo de la IPS
// (mismo patrón que useIndicadores.ts).

import { useState, useEffect, useMemo } from 'react';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, type Unsubscribe,
} from 'firebase/firestore';
import { db as fbDb } from '@/lib/firebase';
import {
  calcularVencimientoIAASCaso, calcularVencimientoIAASDenominador,
  type IAASCaso, type IAASDenominador, type IAASTipo, type IAASEstadoNotificacion,
} from './iaasTypes';

// ── Payloads ──────────────────────────────────────────────────────────────
export interface NuevoIAASCaso {
  tipo:                 IAASTipo;
  subtipo:              string;
  servicio:             string;
  fechaConfirmacion:    string;
  pacienteReferencia?:  string;
  observaciones?:       string;
}

export interface NuevoIAASDenominador {
  tipo:                 IAASTipo;
  periodo:              string;
  valores:              Record<string, number>;
  notificacionNegativa: boolean;
}

// El SDK de Firestore rechaza (throw síncrono, sin red) cualquier campo con
// valor `undefined` explícito en addDoc/setDoc — a diferencia de una llave
// simplemente ausente, que sí es válida. Los campos opcionales de los
// formularios (pacienteReferencia, observaciones) llegan como `undefined`
// cuando el usuario los deja vacíos, así que se filtran aquí antes de
// escribir, en vez de confiar en que cada caller los omita correctamente.
function sinUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

// ── Hook genérico de colección (evita duplicar la suscripción 2 veces) ────
function useIAASColeccion<T extends { id: string; creadoEn: number }>(
  coleccion: string, uid: string | null, nit: string | null,
): [T[], boolean, string | null] {
  const [items, setItems]     = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    const baseQ = nit
      ? query(collection(fbDb, coleccion), where('nit', '==', nit))
      : query(collection(fbDb, coleccion), where('uid', '==', uid));

    let unsub: Unsubscribe;
    try {
      unsub = onSnapshot(
        baseQ,
        snap => {
          const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<T, 'id'>) })) as T[];
          data.sort((a, b) => b.creadoEn - a.creadoEn);
          setItems(data);
          setLoading(false);
        },
        err => { setError(err.message); setLoading(false); },
      );
    } catch (e) {
      setError(String(e));
      setLoading(false);
      return;
    }
    return () => unsub?.();
  }, [coleccion, uid, nit]);

  return [items, loading, error];
}

// Recalcula 'pendiente' → 'vencido' localmente para lo que ya pasó el
// plazo, sin necesidad de un cron — el estado real en Firestore solo
// cambia a 'notificado' cuando el usuario lo marca explícitamente.
function conVencidosRecalculados<T extends { estadoNotificacion: IAASEstadoNotificacion }>(
  items: T[], vencimientoDe: (item: T) => number,
): T[] {
  return items.map(item => {
    if (item.estadoNotificacion !== 'pendiente') return item;
    return Date.now() > vencimientoDe(item)
      ? { ...item, estadoNotificacion: 'vencido' as IAASEstadoNotificacion }
      : item;
  });
}

export function useIAAS(uid: string | null, nit: string | null) {
  const [casosRaw, loadingCasos, errorCasos] =
    useIAASColeccion<IAASCaso>('iaas_casos', uid, nit);
  const [denomsRaw, loadingDenoms, errorDenoms] =
    useIAASColeccion<IAASDenominador>('iaas_denominadores', uid, nit);

  const casos = useMemo(
    () => conVencidosRecalculados(casosRaw, c => calcularVencimientoIAASCaso(c.fechaConfirmacion)),
    [casosRaw],
  );
  const denominadores = useMemo(
    () => conVencidosRecalculados(denomsRaw, d => calcularVencimientoIAASDenominador(d.periodo)),
    [denomsRaw],
  );

  async function addCaso(payload: NuevoIAASCaso, uidArg: string, nitArg: string): Promise<void> {
    await addDoc(collection(fbDb, 'iaas_casos'), {
      ...sinUndefined(payload),
      uid: uidArg,
      nit: nitArg ?? '',
      estadoNotificacion: 'pendiente' as IAASEstadoNotificacion,
      creadoEn: Date.now(),
    });
  }

  async function marcarNotificadoCaso(id: string): Promise<void> {
    await updateDoc(doc(fbDb, 'iaas_casos', id), {
      estadoNotificacion: 'notificado',
      fechaNotificacionReal: new Date().toISOString().slice(0, 10),
    });
  }

  async function deleteCaso(id: string): Promise<void> {
    await deleteDoc(doc(fbDb, 'iaas_casos', id));
  }

  async function addDenominador(payload: NuevoIAASDenominador, uidArg: string, nitArg: string): Promise<void> {
    await addDoc(collection(fbDb, 'iaas_denominadores'), {
      ...sinUndefined(payload),
      uid: uidArg,
      nit: nitArg ?? '',
      estadoNotificacion: 'pendiente' as IAASEstadoNotificacion,
      creadoEn: Date.now(),
    });
  }

  async function marcarNotificadoDenominador(id: string): Promise<void> {
    await updateDoc(doc(fbDb, 'iaas_denominadores', id), {
      estadoNotificacion: 'notificado',
      fechaNotificacionReal: new Date().toISOString().slice(0, 10),
    });
  }

  async function deleteDenominador(id: string): Promise<void> {
    await deleteDoc(doc(fbDb, 'iaas_denominadores', id));
  }

  return {
    casos, loadingCasos, errorCasos,
    denominadores, loadingDenoms, errorDenoms,
    loading: loadingCasos || loadingDenoms,
    addCaso, marcarNotificadoCaso, deleteCaso,
    addDenominador, marcarNotificadoDenominador, deleteDenominador,
  };
}
