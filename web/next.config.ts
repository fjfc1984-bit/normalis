import type { NextConfig } from 'next';

// GitHub Pages fallback — mientras normativa-app-v2.html no esté migrada al 100%
const LEGACY_BASE = 'https://fjfc1984-bit.github.io/normalis';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // ── Rutas .html que YA existen en Next.js → URL canónica ──────────────
      { source: '/login.html',    destination: '/login',    permanent: true },
      { source: '/registro.html', destination: '/registro', permanent: true },
      { source: '/admin.html',    destination: '/admin',    permanent: true },
      { source: '/index.html',    destination: '/',         permanent: true },
      { source: '/pricing.html',  destination: '/#precios', permanent: false },

      // ── Legacy app (no migrada aún) → GitHub Pages ─────────────────────────
      {
        source:      '/normativa-app-v2.html',
        destination: `${LEGACY_BASE}/normativa-app-v2.html`,
        permanent:   false,  // temporal — cuando migración esté completa cambia a true
      },

      // ── Páginas legales → GitHub Pages ─────────────────────────────────────
      {
        source:      '/terminos.html',
        destination: `${LEGACY_BASE}/terminos.html`,
        permanent:   false,
      },
      {
        source:      '/politica-privacidad.html',
        destination: `${LEGACY_BASE}/politica-privacidad.html`,
        permanent:   false,
      },
      {
        source:      '/status.html',
        destination: `${LEGACY_BASE}/status.html`,
        permanent:   false,
      },
    ];
  },
};

export default nextConfig;
