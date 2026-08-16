'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #00251A 0%, #00695C 100%)' }}
    >
      {/* Logo */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white mb-6"
        style={{
          background: 'linear-gradient(135deg,#00897B,#00BCD4)',
          boxShadow: '0 0 32px rgba(0,188,212,.4)',
        }}
      >
        N
      </div>

      {/* Error code */}
      <h1
        className="text-8xl font-black mb-2"
        style={{ color: '#00BCD4', textShadow: '0 0 40px rgba(0,188,212,.3)' }}
      >
        404
      </h1>

      <h2 className="text-xl font-semibold text-white mb-2">
        Página no encontrada
      </h2>
      <p className="text-sm mb-8" style={{ color: '#80CBC4' }}>
        El módulo que buscas no existe o fue movido.
      </p>

      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)' }}
        >
          Ir al Dashboard
        </Link>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'rgba(255,255,255,.08)', color: '#80CBC4', border: '1px solid rgba(255,255,255,.1)' }}
        >
          Inicio
        </Link>
      </div>

      <p className="mt-12 text-xs" style={{ color: 'rgba(128,203,196,.3)' }}>
        NormaLis · Res. 1732/2026 · app.normalis.co
      </p>
    </div>
  );
}
