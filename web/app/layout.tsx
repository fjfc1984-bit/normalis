import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title:       'NormaLis — Habilitación IPS',
  description: 'Software colombiano de habilitación y calidad para IPS',
  icons:       { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
