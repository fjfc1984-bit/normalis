'use client';

// web/app/dashboard/capas/VerificarEficaciaModal.tsx
// Paso 2 del ciclo de verificación de eficacia: con evidencia posterior
// a la implementación, confirmar explícitamente si la causa raíz sigue
// eliminada (cierra la CAPA) o si el hallazgo reincidió (la reabre).
// Las dos salidas son botones distintos — nunca se infiere "reincidencia"
// de un cierre de modal o un clic fuera, para evitar falsos positivos.

import { useState } from 'react';
import type { CapaVeredicto } from '@/lib/capaTypes';

interface VerificarEficaciaModalProps {
  descripcion: string;
  loading: boolean;
  onConfirm: (evidencia: string, veredicto: CapaVeredicto) => void;
  onCancel: () => void;
}

export function VerificarEficaciaModal({
  descripcion, loading, onConfirm, onCancel,
}: VerificarEficaciaModalProps) {
  const [evidencia, setEvidencia] = useState('');
  const canConfirm = evidencia.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Verificar eficacia</h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
          &ldquo;{descripcion}&rdquo; — describe cómo verificaste si el problema volvió a presentarse.
        </p>

        <div className="mb-5">
          <textarea
            rows={4}
            value={evidencia}
            onChange={e => setEvidencia(e.target.value)}
            placeholder="Evidencia de verificación (obligatorio)…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none
                       focus:outline-none focus:ring-2 focus:ring-teal-400"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => onConfirm(evidencia.trim(), 'eficaz')}
            disabled={loading || !canConfirm}
            className="px-4 py-2.5 disabled:opacity-50 text-white rounded-lg text-sm
                       font-semibold transition-colors text-left bg-emerald-600 hover:bg-emerald-700"
          >
            ✅ Eficaz — el hallazgo no se ha repetido
          </button>
          <button
            onClick={() => onConfirm(evidencia.trim(), 'reincidencia')}
            disabled={loading || !canConfirm}
            className="px-4 py-2.5 disabled:opacity-50 text-white rounded-lg text-sm
                       font-semibold transition-colors text-left bg-amber-600 hover:bg-amber-700"
          >
            🔁 Reincidencia — el hallazgo volvió a ocurrir
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700
                       rounded-lg text-sm font-semibold transition-colors mt-1"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
