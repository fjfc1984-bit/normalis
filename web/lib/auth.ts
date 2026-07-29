/**
 * lib/auth.ts
 * Hook useAuth — estado de autenticación compartido en toda la app.
 * Compatible con el mismo rol system que usa el sitio legacy
 * (rol almacenado en Firestore → usuarios/{uid}.rol).
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
  nit:     string;
  nombre:  string;   // nombre de la IPS
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user:    null,
    rol:     null,
    nit:     '',
    nombre:  '',
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, rol: null, nit: '', nombre: '', loading: false });
        return;
      }

      try {
        // Leer rol y datos de IPS desde Firestore (mismo patrón que login.html)
        const snap = await getDoc(doc(db, 'usuarios', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setState({
            user,
            rol:    (data.rol    as NormalisRole) ?? null,
            nit:    data.nit    ?? '',
            nombre: data.nombre ?? '',   // nombre de la IPS
            loading: false,
          });
        } else {
          setState({ user, rol: null, nit: '', nombre: '', loading: false });
        }
      } catch {
        setState({ user, rol: null, nit: '', nombre: '', loading: false });
      }
    });

    return () => unsubscribe();
  }, []);

  return state;
}
