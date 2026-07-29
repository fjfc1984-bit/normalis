import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // El sitio antiguo (normalis.co) sigue en GitHub Pages.
  // Este proyecto se despliega en Vercel → app.normalis.co
  // Los requests al Worker van por la misma URL pública.
};

export default nextConfig;
