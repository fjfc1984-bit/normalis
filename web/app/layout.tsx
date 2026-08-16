import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

const GA_ID = 'G-R74LQ03RWF';

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
