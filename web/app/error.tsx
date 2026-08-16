'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[NormaLis] Global error:', error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #00251A 0%, #00695C 100%)' }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white mb-6"
        style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 0 24px rgba(239,68,68,.4)' }}
      >
        !
      </div>

      <h2 className="text-xl font-bold text-white mb-2">Ocurrió un error inesperado</h2>
      <p className="text-sm mb-1" style={{ color: '#80CBC4' }}>
        {error.message || 'Error interno del sistema'}
      </p>
      {error.digest && (
        <p className="text-xs mb-6 font-mono" style={{ color: 'rgba(128,203,196,.5)' }}>
          Código: {error.digest}
        </p>
      )}

      <div className="flex gap-3 mt-4">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)' }}
        >
          Reintentar
        </button>
        <a
          href="/dashboard"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'rgba(255,255,255,.08)', color: '#80CBC4', border: '1px solid rgba(255,255,255,.1)' }}
        >
          Ir al Dashboard
        </a>
      </div>

      <p className="mt-12 text-xs" style={{ color: 'rgba(128,203,196,.3)' }}>
        NormaLis · Si el error persiste, recarga la página o contacta soporte.
      </p>
    </div>
  );
}
