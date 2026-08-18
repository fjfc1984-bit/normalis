import Link from 'next/link';

export const metadata = {
  title: 'Confianza y Seguridad — NormaLis',
  description: 'Controles de seguridad técnicos y organizacionales de NormaLis, y hoja de ruta hacia estándares internacionales como ISO/IEC 27001.',
};

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="text-emerald-600 flex-shrink-0 mt-0.5">✓</span>
      <span className="text-gray-600 text-sm leading-relaxed">{children}</span>
    </li>
  );
}

function Roadmap({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="text-amber-500 flex-shrink-0 mt-0.5">○</span>
      <span className="text-gray-600 text-sm leading-relaxed">{children}</span>
    </li>
  );
}

export default function ConfianzaSeguridadPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-primary-900 text-white py-10 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-primary-300 text-sm hover:text-white transition-colors">
            ← Volver a normalis.co
          </Link>
          <h1 className="text-3xl font-bold mt-4">Confianza y Seguridad</h1>
          <p className="text-primary-300 mt-2 text-sm">
            Controles de seguridad de NormaLis y hoja de ruta hacia estándares internacionales · Agosto 2026
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Aviso de transparencia */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-10 text-sm text-blue-900">
          <strong>Nota de transparencia —</strong> NormaLis <strong>no está certificada</strong> bajo
          ISO/IEC 27001 ni ningún otro esquema de certificación de seguridad. Esta página documenta,
          con honestidad, qué controles técnicos ya están implementados hoy y cuáles están en la hoja
          de ruta. Si tu IPS o EPS necesita esta información para un proceso de contratación o RFP,
          escríbenos a <a href="mailto:info@normalis.co" className="underline font-semibold">info@normalis.co</a>.
        </div>

        {/* Controles vigentes */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Controles técnicos vigentes hoy</h2>
          <p className="text-sm text-gray-400 mb-4">Alineados con el Anexo A de ISO/IEC 27001</p>
          <ul className="space-y-3">
            <Check>
              <strong>Cifrado en tránsito:</strong> toda comunicación con NormaLis usa HTTPS/TLS.
            </Check>
            <Check>
              <strong>Cifrado en reposo:</strong> los datos en Firestore están cifrados en reposo por
              infraestructura de Google Cloud.
            </Check>
            <Check>
              <strong>Control de acceso por IPS:</strong> reglas de seguridad a nivel de base de datos
              (no solo de aplicación) restringen cada dato al usuario propietario o a su equipo por
              NIT — un usuario de una IPS nunca puede leer datos de otra, incluso si hay un error en
              la interfaz.
            </Check>
            <Check>
              <strong>Bitácora de seguridad inmutable:</strong> inicios de sesión, aprobación/rechazo
              de usuarios y gestión de llaves API quedan registrados en un log que ni siquiera un
              administrador puede editar o borrar una vez creado.
            </Check>
            <Check>
              <strong>Llaves de API con hash:</strong> las llaves de la API de integraciones se
              almacenan solo como hash SHA-256 — NormaLis nunca guarda ni puede recuperar el valor
              original.
            </Check>
            <Check>
              <strong>Límites de tasa (rate limiting):</strong> todos los endpoints públicos y la API
              de integraciones tienen límites de solicitudes para mitigar abuso y ataques automatizados.
            </Check>
            <Check>
              <strong>Aislamiento por IPS a nivel de infraestructura:</strong> arquitectura
              multi-tenant donde cada IPS solo accede a su propia información institucional.
            </Check>
            <Check>
              <strong>Proceso de reporte de vulnerabilidades:</strong> canal de divulgación
              responsable y proceso interno de respuesta a incidentes — ver la sección de{' '}
              <a href="#contacto" className="underline">contacto de seguridad</a> más abajo.
            </Check>
            <Check>
              <strong>Autenticación multifactor (MFA/TOTP) para cuentas administrativas:</strong> las
              cuentas con rol administrador deben enrolar un segundo factor (aplicación autenticadora,
              código TOTP) antes de poder iniciar sesión.
            </Check>
            <Check>
              <strong>Firma electrónica con sello criptográfico:</strong> los módulos de Firma y
              Consentimientos sellan cada firma con un HMAC-SHA256 generado del lado del servidor
              (clave nunca expuesta al navegador), conforme al Art. 7 de la Ley 527/1999. Incluye
              verificación de integridad para detectar si el contenido cambió después de firmarse.
              No equivale a la "firma digital" certificada del Decreto 2364/2012 (PKI de una Entidad
              de Certificación Digital acreditada) — ver la nota legal en cada módulo.
            </Check>
          </ul>
        </section>

        {/* Hoja de ruta */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Hoja de ruta</h2>
          <p className="text-sm text-gray-400 mb-4">Lo que todavía falta por cerrar</p>
          <ul className="space-y-3">
            <Roadmap>
              <strong>Backups automatizados de Firestore</strong> — en implementación (ver plan de
              continuidad interno).
            </Roadmap>
            <Roadmap>
              <strong>Firma digital certificada (PKI)</strong> vía Entidad de Certificación Digital
              acreditada (Decreto 2364/2012) — para IPS que requieran equivalencia plena a la firma
              manuscrita bajo el Art. 28 de la Ley 527/1999. Hoy NormaLis ofrece firma electrónica
              (Art. 7), no esta certificación.
            </Roadmap>
            <Roadmap>
              <strong>Escaneo automatizado de dependencias y vulnerabilidades</strong> en el proceso
              de integración continua.
            </Roadmap>
            <Roadmap>
              <strong>Sistema de Gestión de Seguridad de la Información (SGSI) documentado</strong> —
              política de seguridad, análisis de riesgos, Declaración de Aplicabilidad — como paso
              previo a evaluar una auditoría de certificación ISO/IEC 27001 con un organismo acreditado.
            </Roadmap>
          </ul>
        </section>

        {/* Subencargados */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Subencargados del tratamiento</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            NormaLis opera sobre la siguiente infraestructura de terceros. El detalle completo de la
            base legal y el propósito de cada uno está en la{' '}
            <Link href="/politica-privacidad#p6" className="text-teal-600 underline">Política de Privacidad</Link>.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {['Google Cloud / Firebase', 'Cloudflare', 'Vercel', 'Resend'].map(p => (
              <div key={p} className="bg-gray-50 rounded-lg py-3 px-2 text-xs font-medium text-gray-600 border border-gray-100">
                {p}
              </div>
            ))}
          </div>
        </section>

        {/* Cumplimiento normativo */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Cumplimiento normativo colombiano</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            El tratamiento de datos personales de NormaLis cumple la Ley 1581/2012 (Habeas Data) y el
            Decreto 1377/2013. El detalle completo — finalidad, base legal, derechos del titular y
            retención — está en la <Link href="/politica-privacidad" className="text-teal-600 underline">Política de Tratamiento de Datos Personales</Link>.
          </p>
        </section>

        {/* Contacto */}
        <section id="contacto">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Contacto de seguridad</h2>
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-5 text-sm">
            <p className="text-primary-800">
              Para reportar una vulnerabilidad o solicitar documentación adicional de seguridad para
              un proceso de contratación:
            </p>
            <p className="mt-2">
              📧 <a href="mailto:info@normalis.co" className="text-primary-600 hover:underline">info@normalis.co</a>
            </p>
          </div>
        </section>
      </div>

      <footer className="border-t border-gray-100 py-6 px-6 text-center text-sm text-gray-400">
        <Link href="/politica-privacidad" className="hover:text-gray-600 transition-colors mr-4">
          Política de Privacidad
        </Link>
        <Link href="/terminos" className="hover:text-gray-600 transition-colors mr-4">
          Términos y Condiciones
        </Link>
        <Link href="/" className="hover:text-gray-600 transition-colors">
          normalis.co
        </Link>
      </footer>
    </div>
  );
}
