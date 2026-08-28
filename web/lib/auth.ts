/**
 * lib/auth.ts
 * Hook useAuth — estado de autenticación compartido en toda la app.
 * Compatible con el mismo rol system que usa el sitio legacy
 * (rol almacenado en Firestore → usuarios/{uid}.rol).
 *
 * Soporte de equipo IPS (multi-usuario por NIT): un usuario puede acceder
 * con su propio NIT (`nit`, dueño original de la cuenta) o heredado de un
 * NIT ajeno vía invitación (`nit_ips`, miembro de equipo). El `nit` expuesto
 * aquí es el NIT EFECTIVO (propio si existe, si no el heredado) — así todos
 * los módulos que ya consultan por `useAuth().nit` funcionan automáticamente
 * para miembros de equipo, sin cambios adicionales. `nitPropio` conserva el
 * valor sin resolver, para distinguir dueño de miembro (ver `esMiembroEquipo`).
 */
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export type NormalisRole = 'cliente' | 'piloto' | 'admin' | 'pendiente' | 'rechazado' | null;

export interface AuthState {
  user:    User | null;
  rol:     NormalisRole;
  /** NIT efectivo para consultas de datos: nit propio, o heredado (nit_ips) si es miembro de equipo. */
  nit:     string;
  /** NIT propio del usuario, sin resolver. Vacío si es un miembro de equipo sin NIT propio. */
  nitPropio: string;
  /** true si el acceso a este NIT viene de una invitación de equipo (no es el dueño original de la cuenta). */
  esMiembroEquipo: boolean;
  nombre:  string;   // nombre de la IPS
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user:    null,
    rol:     null,
    nit:     '',
    nitPropio: '',
    esMiembroEquipo: false,
    nombre:  '',
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, rol: null, nit: '', nitPropio: '', esMiembroEquipo: false, nombre: '', loading: false });
        return;
      }

      try {
        // Leer rol y datos de IPS desde Firestore (mismo patrón que login.html)
        const snap = await getDoc(doc(db, 'usuarios', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          const nitPropio = data.nit ?? '';
          const nitIps    = data.nit_ips ?? '';
          setState({
            user,
            rol:    (data.rol as NormalisRole) ?? null,
            nit:    nitPropio || nitIps,
            nitPropio,
            esMiembroEquipo: !nitPropio && !!nitIps,
            nombre: data.nombre ?? '',   // nombre de la IPS
            loading: false,
          });
        } else {
          setState({ user, rol: null, nit: '', nitPropio: '', esMiembroEquipo: false, nombre: '', loading: false });
        }
      } catch {
        setState({ user, rol: null, nit: '', nitPropio: '', esMiembroEquipo: false, nombre: '', loading: false });
      }
    });

    return () => unsubscribe();
  }, []);

  return state;
}
