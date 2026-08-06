'use client';

/**
 * lib/AuthContext.tsx
 * Provider global de autenticación — lee Firestore UNA sola vez por sesión.
 * Todos los componentes consumen useAuth() sin costos adicionales de red.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// ── Types ──────────────────────────────────────────────────────────────────────
export type NormalisRole = 'cliente' | 'piloto' | 'admin' | 'pendiente' | 'rechazado' | null;

export interface AuthState {
  user:        User | null;
  rol:         NormalisRole;
  nit:         string;
  nombre:      string;   // Nombre de la IPS
  email:       string;
  expiresAt:   Date | null;   // Para pilotos
  loading:     boolean;
}

// ── Context ────────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthState>({
  user: null, rol: null, nit: '', nombre: '', email: '', expiresAt: null, loading: true,
});

// ── Provider ───────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, rol: null, nit: '', nombre: '', email: '', expiresAt: null, loading: true,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, rol: null, nit: '', nombre: '', email: '', expiresAt: null, loading: false });
        return;
      }

      try {
        const snap = await getDoc(doc(db, 'usuarios', user.uid));
        if (snap.exists()) {
          const d = snap.data();
          const expiresAt = d.expiresAt?.toDate ? d.expiresAt.toDate() : null;
          setState({
            user,
            rol:      (d.rol as NormalisRole) ?? null,
            nit:      d.nit      ?? '',
            nombre:   d.nombre   ?? '',
            email:    d.email    ?? user.email ?? '',
            expiresAt,
            loading: false,
          });
        } else {
          setState({ user, rol: null, nit: '', nombre: '', email: user.email ?? '', expiresAt: null, loading: false });
        }
      } catch {
        setState({ user, rol: null, nit: '', nombre: '', email: user.email ?? '', expiresAt: null, loading: false });
      }
    });

    return () => unsub();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useAuth(): AuthState {
  return useContext(AuthContext);
}
