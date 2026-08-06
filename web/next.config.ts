import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // ── Rutas .html → URL canónica Next.js ───────────────────────────────
      { source: '/login.html',    destination: '/login',    permanent: true },
      { source: '/registro.html', destination: '/registro', permanent: true },
      { source: '/admin.html',    destination: '/admin',    permanent: true },
      { source: '/index.html',    destination: '/',         permanent: true },
      { source: '/pricing.html',  destination: '/#precios', permanent: true },
      { source: '/normativa-app-v2.html', destination: '/dashboard', permanent: true },
      { source: '/terminos.html',         destination: '/terminos',  permanent: true },
      { source: '/politica-privacidad.html', destination: '/politica-privacidad', permanent: true },
      { source: '/status.html',           destination: '/status',    permanent: true },
      { source: '/success.html',          destination: '/success',   permanent: true },
      { source: '/guia.html',             destination: '/demo',      permanent: true },
    ];
  },
};

export default nextConfig;
