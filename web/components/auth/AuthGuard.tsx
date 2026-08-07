'use client';

/**
 * components/auth/AuthGuard.tsx
 * Wrapper que redirige a /login si el usuario no está autenticado
 * o si su rol no está en la lista de roles permitidos.
 */

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type NormalisRole } from '@/lib/auth';

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: NormalisRole[];
}

export default function AuthGuard({
  children,
  allowedRoles = ['cliente', 'piloto', 'admin'],
}: AuthGuardProps) {
  const { user, rol, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (rol && !allowedRoles.includes(rol)) {
      // pendiente / rechazado → mostrar mensaje de acceso denegado
      router.replace('/login?blocked=1');
    }
  }, [user, rol, loading, router, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent
                          rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Verificando acceso…</p>
        </div>
      </div>
    );
  }

  if (!user || (rol && !allowedRoles.includes(rol))) return null;
  return <>{children}</>;
}
