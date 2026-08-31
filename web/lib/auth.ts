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
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';

export type NormalisRole = 'cliente' | 'piloto' | 'admin' | 'pendiente' | 'rechazado' | null;

/**
 * Plan de suscripción, asignado a mano por un admin desde /admin (tab
 * "Planes") — ver firestore.rules. Ausente (`null`) si nunca se ha asignado
 * uno todavía; se trata como el más restrictivo (equivalente a 'basico')
 * en los límites del lado del cliente, y bloquea Enterprise-only en rules.
 */
export type PlanId = 'basico' | 'profesional' | 'enterprise' | null;

export interface AuthState {
  user:    User | null;
  rol:     NormalisRole;
  /** NIT efectivo para consultas de datos: nit propio, o heredado (nit_ips) si es miembro de equipo. */
  nit:     string;
  /** NIT propio del usuario, sin resolver. Vacío si es un miembro de equipo sin NIT propio. */
  nitPropio: string;
  /** true si el acceso a este NIT viene de una invitación de equipo (no es el dueño original de la cuenta). */
  esMiembroEquipo: boolean;
  /** Plan de suscripción de ESTA cuenta (no del NIT) — ver PlanId. */
  plan:    PlanId;
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
    plan:    null,
    nombre:  '',
    loading: true,
  });

  useEffect(() => {
    // Suscripción anidada: onAuthStateChanged (¿quién está logueado?) por
    // fuera, onSnapshot del propio documento (¿qué rol/plan/nit tiene?) por
    // dentro. Antes era un getDoc de una sola vez — si un admin cambiaba el
    // rol de alguien (ej. lo rechazaba) mientras esa persona tenía sesión
    // abierta, seguía viendo el dashboard hasta recargar la página. Las
    // Firestore rules ya bloqueaban los datos reales igual (no había fuga
    // de información), pero la revocación no se sentía instantánea como
    // debería en un producto de cumplimiento normativo. Con onSnapshot el
    // cambio de rol llega solo, sin que el usuario tenga que hacer nada.
    let unsubDoc: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // Cambio de usuario (login/logout/cambio de cuenta) — cortar
      // cualquier listener del documento anterior antes de abrir el nuevo.
      if (unsubDoc) { unsubDoc(); unsubDoc = null; }

      if (!user) {
        setState({ user: null, rol: null, nit: '', nitPropio: '', esMiembroEquipo: false, plan: null, nombre: '', loading: false });
        return;
      }

      unsubDoc = onSnapshot(
        doc(db, 'usuarios', user.uid),
        (snap) => {
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
              plan:   (data.plan as PlanId) ?? null,
              nombre: data.nombre ?? '',   // nombre de la IPS
              loading: false,
            });
          } else {
            setState({ user, rol: null, nit: '', nitPropio: '', esMiembroEquipo: false, plan: null, nombre: '', loading: false });
          }
        },
        () => {
          // Error de lectura (ej. reglas rechazando por rol inconsistente
          // en pleno cambio) — mismo fallback que el catch original.
          setState({ user, rol: null, nit: '', nitPropio: '', esMiembroEquipo: false, plan: null, nombre: '', loading: false });
        },
      );
    });

    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  return state;
}
