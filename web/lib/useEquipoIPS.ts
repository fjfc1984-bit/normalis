'use client';

// web/lib/useEquipoIPS.ts
// Hook Firestore en tiempo real para el módulo "Equipo IPS" (multi-usuario
// por NIT). Permite al dueño original de una cuenta (nit propio) invitar
// colegas a compartir el acceso a los datos de su IPS, sin crear una cuenta
// nueva por cada uno ni compartir contraseña.
//
// Modelo de datos (coincide con firestore.rules, ya desplegadas):
//   usuarios/{uid}.nit_ips   — NIT heredado de un miembro de equipo (en vez
//                               de `nit`, que solo lo tiene el dueño).
//   usuarios/{uid}.rol_ips   — 'director' | 'miembro' (informativo, no usado
//                               por las reglas de seguridad).
//   invitaciones/{code}      — código de invitación de un solo uso, ligado
//                               a un correo específico.
//
// Solo el dueño del NIT (usuario con `nit` propio == NIT de la IPS) puede
// crear invitaciones — así lo exige `firestore.rules` (invitaciones/{code}
// allow create). Un miembro de equipo (solo `nit_ips`) no puede invitar a
// otros desde este hook.

import { useEffect, useState } from 'react';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db as fbDb, auth as fbAuth } from '@/lib/firebase';
import { sendWorkerEmail } from '@/lib/worker';

const APP_BASE_URL = 'https://app.normalis.co';

export type EstadoInvitacion = 'pendiente' | 'usada' | 'revocada' | 'expirada';

export interface Invitacion {
  id: string;
  creadoPor: string;
  nit: string;
  nombreIPS: string;
  email: string;
  estado: EstadoInvitacion;
  creadoEn: Timestamp | null;
  expiraEn: Timestamp | null;
  usadoPor?: string;
  usadoEn?: Timestamp | null;
}

export interface MiembroEquipo {
  uid: string;
  nombreContacto: string;
  email: string;
  cargo: string;
  rol: string;
  rolIps: 'director' | 'miembro';
  activo: boolean;
}

const INVITACION_VIGENCIA_DIAS = 7;

export interface UseEquipoIPSResult {
  miembros: MiembroEquipo[];
  invitaciones: Invitacion[];
  loading: boolean;
  error: string | null;
  crearInvitacion: (email: string, nombreIPS: string) => Promise<{ codigo: string; emailEnviado: boolean }>;
  revocarInvitacion: (id: string) => Promise<void>;
  cambiarAccesoMiembro: (uid: string, activo: boolean) => Promise<void>;
}

/**
 * @param nitPropio NIT propio del usuario actual (useAuth().nitPropio) — solo
 *   los dueños de NIT ven/gestionan invitaciones. Si está vacío (miembro de
 *   equipo), el hook solo expone la lista de compañeros de equipo (miembros),
 *   sin invitaciones.
 * @param nitEfectivo NIT efectivo (useAuth().nit) — usado para listar a todo
 *   el equipo (dueño + miembros), sin importar quién consulta.
 */
export function useEquipoIPS(nitPropio: string, nitEfectivo: string): UseEquipoIPSResult {
  const [miembros, setMiembros]           = useState<MiembroEquipo[]>([]);
  const [invitaciones, setInvitaciones]   = useState<Invitacion[]>([]);
  const [dueno, setDueno]                 = useState<MiembroEquipo[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  // ── Miembros del equipo: dueño (nit == nitEfectivo) + miembros (nit_ips == nitEfectivo) ──
  useEffect(() => {
    if (!nitEfectivo) { setMiembros([]); setDueno([]); setLoading(false); return; }
    setLoading(true);
    setError(null);

    const mapDocs = (docs: Array<{ id: string; data: () => Record<string, unknown> }>, rolIps: 'director' | 'miembro') =>
      docs.map(d => {
        const data = d.data();
        return {
          uid: d.id,
          nombreContacto: (data.nombreContacto as string) ?? '',
          email:          (data.email as string) ?? '',
          cargo:          (data.cargo as string) ?? '',
          rol:            (data.rol as string) ?? '',
          rolIps,
          activo:         (data.activo as boolean) ?? false,
        } as MiembroEquipo;
      });

    let unsubDueno: Unsubscribe;
    let unsubMiembros: Unsubscribe;
    try {
      unsubDueno = onSnapshot(
        query(collection(fbDb, 'usuarios'), where('nit', '==', nitEfectivo)),
        snap => setDueno(mapDocs(snap.docs, 'director')),
        err => setError(err.message),
      );
      unsubMiembros = onSnapshot(
        query(collection(fbDb, 'usuarios'), where('nit_ips', '==', nitEfectivo)),
        snap => { setMiembros(mapDocs(snap.docs, 'miembro')); setLoading(false); },
        err => { setError(err.message); setLoading(false); },
      );
    } catch (e) {
      setError(String(e));
      setLoading(false);
      return;
    }
    return () => { unsubDueno?.(); unsubMiembros?.(); };
  }, [nitEfectivo]);

  // ── Invitaciones creadas por el dueño de este NIT ──
  useEffect(() => {
    if (!nitPropio) { setInvitaciones([]); return; }
    let unsub: Unsubscribe;
    try {
      unsub = onSnapshot(
        query(collection(fbDb, 'invitaciones'), where('nit', '==', nitPropio)),
        snap => setInvitaciones(
          snap.docs
            .map(d => ({ id: d.id, ...(d.data() as Omit<Invitacion, 'id'>) }))
            .sort((a, b) => (b.creadoEn?.seconds ?? 0) - (a.creadoEn?.seconds ?? 0)),
        ),
        err => setError(err.message),
      );
    } catch (e) {
      setError(String(e));
    }
    return () => unsub?.();
  }, [nitPropio]);

  async function crearInvitacion(email: string, nombreIPS: string): Promise<{ codigo: string; emailEnviado: boolean }> {
    if (!nitPropio) throw new Error('Solo el dueño de la cuenta de la IPS puede invitar compañeros de equipo.');
    const uid = fbAuth.currentUser?.uid;
    if (!uid) throw new Error('Sesión no válida. Vuelve a iniciar sesión e inténtalo de nuevo.');
    const expira = new Date();
    expira.setDate(expira.getDate() + INVITACION_VIGENCIA_DIAS);
    const correo = email.trim().toLowerCase();
    const ref = await addDoc(collection(fbDb, 'invitaciones'), {
      creadoPor: uid,
      nit: nitPropio,
      nombreIPS: nombreIPS || '',
      email: correo,
      estado: 'pendiente' as EstadoInvitacion,
      creadoEn: serverTimestamp(),
      expiraEn: Timestamp.fromDate(expira),
    });

    // Notificar al invitado por correo (best-effort — si falla, el enlace
    // sigue disponible para copiar/compartir manualmente desde la UI).
    let emailEnviado = false;
    try {
      const idToken = await fbAuth.currentUser?.getIdToken();
      await sendWorkerEmail('invitacion_equipo', {
        to_email: correo,
        ips_nombre: nombreIPS || '',
        director_nombre: fbAuth.currentUser?.displayName || '',
        invite_link: `${APP_BASE_URL}/invitacion/${ref.id}`,
      }, idToken);
      emailEnviado = true;
    } catch (emailErr) {
      console.error('No se pudo enviar el correo de invitación:', emailErr);
    }

    return { codigo: ref.id, emailEnviado };
  }

  async function revocarInvitacion(id: string): Promise<void> {
    await updateDoc(doc(fbDb, 'invitaciones', id), { estado: 'revocada' as EstadoInvitacion });
  }

  async function cambiarAccesoMiembro(uid: string, activo: boolean): Promise<void> {
    await updateDoc(doc(fbDb, 'usuarios', uid), { activo });
  }

  return {
    miembros: [...dueno, ...miembros],
    invitaciones,
    loading,
    error,
    crearInvitacion,
    revocarInvitacion,
    cambiarAccesoMiembro,
  };
}
