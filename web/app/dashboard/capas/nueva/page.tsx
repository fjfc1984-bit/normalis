'use client';

/**
 * web/app/dashboard/capas/nueva/page.tsx
 * Formulario para crear una nueva CAPA.
 * Redirige a /dashboard/capas después de guardar.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useCapas } from '@/lib/useCapas';
import AuthGuard from '@/components/auth/AuthGuard';
import { LoadingSpinner } from '@/components/ui';
import CapaForm from '../CapaForm';
import type { CapaFormData } from '@/lib/capaTypes';
import { CAPA_EMPTY_FORM } from '@/lib/capaTypes';

// Fecha límite default: hoy + 30 días
function defaultFechaLimite(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

function NuevaCapaContent() {
  const router = useRouter();
  const { user, nit, loading: authLoading } = useAuth();
  const { createCapa } = useCapas(user?.uid ?? null, nit || null);

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const initialForm: CapaFormData = {
    ...CAPA_EMPTY_FORM,
    fechaLimite: defaultFechaLimite(),
  };

  // Esperar a que auth cargue — evita el `if (!user) return` silencioso
  if (authLoading) return <LoadingSpinner fullHeight />;

  async function handleSubmit(data: CapaFormData) {
    if (!user) {
      setError('Sesión no disponible. Recarga la página e intenta de nuevo.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createCapa(data, user.uid, nit || '');
      router.push('/dashboard/capas');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Error al crear la CAPA: ${msg}`);
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Nueva CAPA</h2>
        <p className="text-sm text-gray-500 mt-1">
          Acción Correctiva o Preventiva · Ciclo PAMEC
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      <CapaForm
        initialData={initialForm}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/dashboard/capas')}
        saving={saving}
        submitLabel="Crear CAPA"
      />
    </div>
  );
}

export default function NuevaCapaPage() {
  return (
    <AuthGuard>
      <NuevaCapaContent />
    </AuthGuard>
  );
}
