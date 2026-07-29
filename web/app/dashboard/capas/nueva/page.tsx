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
import CapaForm from '../CapaForm';
import type { CapaFormData } from '@/lib/capaTypes';
import { CAPA_EMPTY_FORM } from '@/lib/capaTypes';

// Fecha límite default: hoy + 30 días
function defaultFechaLimite(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

export default function NuevaCapaPage() {
  const router = useRouter();
  const { user, nit } = useAuth();
  const { createCapa } = useCapas(user?.uid ?? null, nit || null);

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const initialForm: CapaFormData = {
    ...CAPA_EMPTY_FORM,
    fechaLimite: defaultFechaLimite(),
  };

  async function handleSubmit(data: CapaFormData) {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      await createCapa(data, user.uid, nit ?? '');
      router.push('/dashboard/capas');
    } catch (e) {
      setError(`Error al crear la CAPA: ${e instanceof Error ? e.message : String(e)}`);
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
