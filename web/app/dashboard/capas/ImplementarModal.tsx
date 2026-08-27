'use client';

// web/app/dashboard/capas/ImplementarModal.tsx
// Paso 1 del ciclo de verificación de eficacia: registrar que la acción
// correctiva se ejecutó, con evidencia y un plazo para confirmar después
// que el problema no volvió a presentarse.

import { useState } from 'react';

interface ImplementarModalProps {
  loading: boolean;
  onConfirm: (evidencia: string, diasVerificacion: number) => void;
  onCancel: () => void;
}

export function ImplementarModal({ loading, onConfirm, onCancel }: ImplementarModalProps) {
  const [evidencia, setEvidencia] = useState('');
  const [dias, setDias] = useState('30');
  const diasNum = parseInt(dias, 10);
  const canConfirm = evidencia.trim().length > 0 && Number.isFinite(diasNum) && diasNum > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Marcar como implementada</h3>
        <p className="text-sm text-gray-500 mb-4">
          Describe qué se hizo y en cuántos días se debe confirmar que el problema no volvió a ocurrir.
        </p>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Evidencia de implementación
          </label>
          <textarea
            rows={4}
            value={evidencia}
            onChange={e => setEvidencia(e.target.value)}
            placeholder="Ej. Se capacitó al personal el 15/07/2026, se adjunta acta de asistencia…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none
                       focus:outline-none focus:ring-2 focus:ring-teal-400"
            autoFocus
          />
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Días para verificar eficacia
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={dias}
              onChange={e => setDias(e.target.value)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <span className="text-xs text-gray-400">recomendado: 30</span>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700
                       rounded-lg text-sm font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(evidencia.trim(), Math.max(1, diasNum || 30))}
            disabled={loading || !canConfirm}
            className="px-4 py-2 disabled:opacity-50 text-white rounded-lg text-sm
                       font-semibold transition-colors flex items-center gap-2
                       bg-violet-600 hover:bg-violet-700"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            ✔️ Marcar implementada
          </button>
        </div>
      </div>
    </div>
  );
}
