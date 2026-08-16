'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[NormaLis Dashboard] Error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div
        className="max-w-md w-full rounded-2xl p-8 text-center"
        style={{ background: 'white', boxShadow: '0 4px 24px rgba(0,0,0,.08)', border: '1px solid #f1f5f9' }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}
        >
          !
        </div>
        <h2 className="text-lg font-bold mb-2" style={{ color: '#1e293b' }}>
          Error al cargar el módulo
        </h2>
        <p className="text-sm mb-1" style={{ color: '#64748b' }}>
          {error.message || 'Ocurrió un error inesperado'}
        </p>
        {error.digest && (
          <p className="text-xs font-mono mb-4" style={{ color: '#94a3b8' }}>
            ref: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center mt-6">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)' }}
          >
            Reintentar
          </button>
          <a
            href="/dashboard"
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: '#f1f5f9', color: '#475569' }}
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
