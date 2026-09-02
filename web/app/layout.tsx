import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

const GA_ID = 'G-R74LQ03RWF';

export const metadata: Metadata = {
  title:       'NormaLis — Software de Habilitación IPS · Res. 1732/2026',
  description: 'Software con IA para habilitación y auditoría de IPS colombianas. Res. 1732/2026 (reemplaza Res. 3100/2019), PAMEC, PROA, SG-SST, gestión documental y alertas de vencimientos.',
  keywords:    'habilitación IPS, Resolución 1732 2026, Resolución 3100 2019, PAMEC, PROA antimicrobianos, software calidad IPS Colombia, auditoría interna IPS, habilitación servicios salud Colombia, Secretaría Salud Colombia',
  openGraph: {
    title:       'NormaLis — Software de Habilitación IPS · Res. 1732/2026',
    description: 'Plataforma SaaS para gestión de calidad y habilitación en IPS colombianas. Res. 1732/2026, auditorías, PROA, PAMEC, documentos normativos y alertas.',
    url:         'https://app.normalis.co',
    siteName:    'NormaLis',
    locale:      'es_CO',
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'NormaLis — Habilitación IPS con IA · Res. 1732/2026',
    description: 'Software colombiano para auditoría y habilitación de IPS. Cumple con Res. 1732/2026, PAMEC, PROA y más.',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
  },
  robots: { index: true, follow: true },
  metadataBase: new URL('https://app.normalis.co'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', { page_path: window.location.pathname });
          `}
        </Script>
      </body>
    </html>
  );
}
