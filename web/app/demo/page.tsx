'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function DemoVideoPage() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <Link href="/" className="text-primary-400 text-sm hover:underline mb-4 inline-block">
          ← Volver a NormaLis
        </Link>
        <h1 className="text-3xl font-bold text-white mt-2">Demo NormaLis</h1>
        <p className="text-gray-400 mt-2 text-sm">
          Recorrido completo de la plataforma · ~2:30 minutos
        </p>
      </div>

      {/* Video frame */}
      <div className="relative w-full max-w-5xl">
        {!playing ? (
          /* Thumbnail / play screen */
          <div
            className="aspect-video bg-gray-900 rounded-2xl border border-gray-800 flex flex-col items-center justify-center cursor-pointer group"
            onClick={() => setPlaying(true)}
          >
            <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <p className="text-white font-semibold text-lg">Ver demo de NormaLis</p>
            <p className="text-gray-400 text-sm mt-1">Haz clic para reproducir</p>
          </div>
        ) : (
          /* Embedded auto-playing HTML demo */
          <iframe
            src="/normalis-demo-video.html"
            className="w-full aspect-video rounded-2xl border border-gray-800"
            title="Demo NormaLis"
            allowFullScreen
          />
        )}
      </div>

      {/* CTA below */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center">
        <Link
          href="https://normalis.co#demo"
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
        >
          Solicitar demo personalizada
        </Link>
        <Link
          href="/dashboard"
          className="border border-gray-700 hover:border-gray-500 text-gray-300 font-medium px-8 py-3 rounded-xl transition-colors"
        >
          Acceder a la plataforma →
        </Link>
      </div>

      <p className="text-gray-600 text-xs mt-6 text-center max-w-md">
        NormaLis · Habilitación IPS Colombia · Res. 3100/2019 · Res. 465/2025
        <br/>
        <a href="mailto:info@normalis.co" className="hover:text-gray-400">info@normalis.co</a>
      </p>
    </div>
  );
}
