'use client';

// web/lib/useMultiIPS.ts
// Hook Firestore en tiempo real para el módulo "Mis IPS" (Feature 2 —
// un usuario administrando varias IPS).
//
// Modelo de datos (coincide con firestore.rules, ya desplegadas):
//   usuarios/{uid}/ips_autorizadas/{nit} — habilita a este uid a cambiar su
//     NIT activo a `nit`. Solo lo crea el dueño real de ese NIT (o un admin)
//     — nunca el propio uid.
//   solicitudes_acceso_ips/{id} — un usuario pide acceso a un NIT ajeno; el
//     dueño real de ese NIT la aprueba o rechaza. Al aprobar, el dueño crea
//     el ips_autorizadas correspondiente en el mismo paso.
//
// El "switch" en sí (cambiar cuál NIT está activo ahora mismo) es solo
// updateDoc(usuarios/{uid}, { nit }) — la propia regla de seguridad valida
// que exista un ips_autorizadas para ese NIT antes de permitirlo.

import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, getDocs, setDoc, serverTimestamp, Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db as fbDb, auth as fbAuth } from '@/lib/firebase';

export type EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada';

export interface SolicitudAccesoIPS {
  id: string;
  uid: string;
  nombreSolicitante: string;
  emailSolicitante: string;
  nit: string;
  estado: EstadoSolicitud;
  creadoEn: Timestamp | null;
  resueltoPor?: string;
  resueltoPorNombre?: string;
  resueltoEn?: Timestamp | null;
}

export interface IPSAutorizada {
  nit: string;
  nombreIPS: string;
  otorgadoPor?: string;
  otorgadoPorNombre?: string;
  otorgadoEn?: Timestamp | null;
}

/**
 * @param uid uid del usuario actual (useAuth().user?.uid)
 * @param nitActivo NIT actualmente activo (useAuth().nit) — para saber cuál
 *   de las ips_autorizadas es la que ya está en uso.
 * @param nitPropio NIT propio del usuario (useAuth().nitPropio) — si tiene
 *   uno, también puede recibir/aprobar solicitudes de otros para SU IPS.
 */
export function useMultiIPS(uid: string | null, nitActivo: string | null, nitPropio: string | null) {
  const [autorizadas, setAutorizadas]     = useState<IPSAutorizada[]>([]);
  const [misSolicitudes, setMisSolicitudes] = useState<SolicitudAccesoIPS[]>([]);
  const [entrantes, setEntrantes]         = useState<SolicitudAccesoIPS[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  // ── IPS autorizadas para este uid (a cuáles puede cambiarse) ──────────────
  useEffect(() => {
    if (!uid) { setAutorizadas([]); setLoading(false); return; }
    setLoading(true);
    let unsub: Unsubscribe;
    try {
      unsub = onSnapshot(
        collection(fbDb, 'usuarios', uid, 'ips_autorizadas'),
        snap => {
          setAutorizadas(snap.docs.map(d => ({ nit: d.id, ...(d.data() as Omit<IPSAutorizada, 'nit'>) })));
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
  }, [uid]);

  // ── Mis solicitudes enviadas ───────────────────────────────────────────
  useEffect(() => {
    if (!uid) { setMisSolicitudes([]); return; }
    const unsub = onSnapshot(
      query(collection(fbDb, 'solicitudes_acceso_ips'), where('uid', '==', uid)),
      snap => setMisSolicitudes(
        snap.docs
          .map(d => ({ id: d.id, ...(d.data() as Omit<SolicitudAccesoIPS, 'id'>) }))
          .sort((a, b) => (b.creadoEn?.seconds ?? 0) - (a.creadoEn?.seconds ?? 0)),
      ),
      err => setError(err.message),
    );
    return () => unsub();
  }, [uid]);

  // ── Solicitudes entrantes para mi propia IPS (si soy dueño) ────────────
  useEffect(() => {
    if (!nitPropio) { setEntrantes([]); return; }
    const unsub = onSnapshot(
      query(collection(fbDb, 'solicitudes_acceso_ips'), where('nit', '==', nitPropio)),
      snap => setEntrantes(
        snap.docs
          .map(d => ({ id: d.id, ...(d.data() as Omit<SolicitudAccesoIPS, 'id'>) }))
          .sort((a, b) => (b.creadoEn?.seconds ?? 0) - (a.creadoEn?.seconds ?? 0)),
      ),
      err => setError(err.message),
    );
    return () => unsub();
  }, [nitPropio]);

  // ── Solicitar acceso a un NIT ajeno ─────────────────────────────────────
  const solicitarAcceso = useCallback(async (nit: string, nombreSolicitante: string): Promise<void> => {
    const user = fbAuth.currentUser;
    if (!user) throw new Error('Sesión no válida. Vuelve a iniciar sesión e inténtalo de nuevo.');
    const nitLimpio = nit.trim();
    if (!nitLimpio) throw new Error('Ingresa el NIT de la IPS a la que quieres pedir acceso.');
    if (nitActivo && nitLimpio === nitActivo) throw new Error('Ya tienes acceso activo a ese NIT.');

    // Evitar duplicar una solicitud pendiente al mismo NIT
    const existente = await getDocs(query(
      collection(fbDb, 'solicitudes_acceso_ips'),
      where('uid', '==', user.uid),
      where('nit', '==', nitLimpio),
      where('estado', '==', 'pendiente'),
    ));
    if (!existente.empty) throw new Error('Ya tienes una solicitud pendiente para ese NIT.');

    await addDoc(collection(fbDb, 'solicitudes_acceso_ips'), {
      uid: user.uid,
      nombreSolicitante: nombreSolicitante || user.displayName || '',
      emailSolicitante: user.email || '',
      nit: nitLimpio,
      estado: 'pendiente' as EstadoSolicitud,
      creadoEn: serverTimestamp(),
    });
  }, [nitActivo]);

  // ── Aprobar/rechazar una solicitud entrante (solo dueño del NIT) ───────
  const resolverSolicitud = useCallback(async (
    solicitud: SolicitudAccesoIPS,
    aprobar: boolean,
    nombreIPS: string,
  ): Promise<void> => {
    const user = fbAuth.currentUser;
    if (!user) throw new Error('Sesión no válida.');

    await updateDoc(doc(fbDb, 'solicitudes_acceso_ips', solicitud.id), {
      estado: (aprobar ? 'aprobada' : 'rechazada') as EstadoSolicitud,
      resueltoPor: user.uid,
      resueltoPorNombre: user.displayName || '',
      resueltoEn: serverTimestamp(),
    });

    if (aprobar) {
      await setDoc(doc(fbDb, 'usuarios', solicitud.uid, 'ips_autorizadas', solicitud.nit), {
        nit: solicitud.nit,
        nombreIPS: nombreIPS || '',
        otorgadoPor: user.uid,
        otorgadoPorNombre: user.displayName || '',
        otorgadoEn: serverTimestamp(),
        solicitudId: solicitud.id,
      });
    }
  }, []);

  // ── Cambiar el NIT activo a uno ya autorizado ───────────────────────────
  const cambiarNitActivo = useCallback(async (nit: string): Promise<void> => {
    const user = fbAuth.currentUser;
    if (!user) throw new Error('Sesión no válida.');
    await updateDoc(doc(fbDb, 'usuarios', user.uid), { nit });
  }, []);

  // ── Retirar mi propia solicitud pendiente ───────────────────────────────
  const retirarSolicitud = useCallback(async (id: string): Promise<void> => {
    await deleteDoc(doc(fbDb, 'solicitudes_acceso_ips', id));
  }, []);

  // ── Revocar mi propio acceso a un NIT autorizado ────────────────────────
  const revocarAccesoPropio = useCallback(async (uidPropio: string, nit: string): Promise<void> => {
    await deleteDoc(doc(fbDb, 'usuarios', uidPropio, 'ips_autorizadas', nit));
  }, []);

  return {
    autorizadas, misSolicitudes, entrantes, loading, error,
    solicitarAcceso, resolverSolicitud, cambiarNitActivo, retirarSolicitud, revocarAccesoPropio,
  };
}
