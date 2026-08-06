import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';

export const metadata: Metadata = {
  title:       'NormaLis — Software de Habilitación para IPS en Colombia',
  description: 'Software con IA para gestión de calidad en IPS colombianas. Resolución 3100/2019, auditorías internas, documentos normativos y alertas de vencimientos.',
  keywords:    'habilitación IPS, Resolución 3100, PAMEC, software calidad IPS Colombia, auditoría interna IPS',
  openGraph: {
    title:       'NormaLis — Software de Habilitación para IPS en Colombia',
    description: 'Software con IA para gestión de calidad en IPS colombianas. Resolución 3100/2019, auditorías, documentos normativos y alertas.',
    url:         'https://app.normalis.co',
    siteName:    'NormaLis',
    locale:      'es_CO',
    type:        'website',
  },
  icons: { icon: '/favicon.ico' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
