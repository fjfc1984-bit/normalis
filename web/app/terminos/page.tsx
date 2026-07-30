import Link from 'next/link';

export const metadata = {
  title: 'Términos y Condiciones — NormaLis',
  description: 'Términos y condiciones de uso del software NormaLis para gestión de habilitación en salud.',
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-primary-900 text-white py-10 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-primary-300 text-sm hover:text-white transition-colors">
            ← Volver a normalis.co
          </Link>
          <h1 className="text-3xl font-bold mt-4">Términos y Condiciones</h1>
          <p className="text-primary-300 mt-2 text-sm">Última actualización: julio de 2026</p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 prose prose-slate">
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Objeto</h2>
          <p className="text-gray-600 leading-relaxed">
            NormaLis es un software SaaS de apoyo a la gestión de habilitación en salud, dirigido a
            Instituciones Prestadoras de Servicios de Salud (IPS) en Colombia. La plataforma facilita
            el cumplimiento de la Resolución 3100/2019, la Resolución 465/2025 y demás normativa
            vigente del Sistema Obligatorio de Garantía de Calidad en Salud (SOGCS).
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            El uso del servicio implica la aceptación plena e incondicional de estos términos.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Responsabilidad del usuario</h2>
          <p className="text-gray-600 leading-relaxed">
            El usuario es el único responsable de la veracidad, exactitud y completitud de la
            información que ingresa en la plataforma. NormaLis provee herramientas de gestión; la
            responsabilidad del cumplimiento normativo ante las autoridades de salud recae
            exclusivamente en la IPS usuaria.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            El usuario se compromete a usar la plataforma conforme a la legislación colombiana y a
            no utilizarla para fines ilícitos, fraudulentos o que vulneren derechos de terceros.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Naturaleza del servicio</h2>
          <p className="text-gray-600 leading-relaxed">
            NormaLis es una herramienta de gestión y no constituye asesoría jurídica, médica ni
            contable. Las plantillas, checklists y recomendaciones generadas por la plataforma son
            de carácter orientativo. Para decisiones de cumplimiento normativo con consecuencias
            legales, se recomienda la consulta con profesionales habilitados.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            El asistente de inteligencia artificial integrado en la plataforma genera respuestas
            informativas basadas en la normativa vigente, pero no reemplaza el criterio de un
            profesional certificado ni garantiza la exactitud absoluta de la información generada.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Propiedad intelectual</h2>
          <p className="text-gray-600 leading-relaxed">
            Todo el contenido de NormaLis, incluyendo código fuente, diseño, metodología, plantillas
            propietarias y base de conocimiento normativo, es propiedad exclusiva de NormaLis y está
            protegido por las leyes colombianas e internacionales de propiedad intelectual.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            Se prohíbe la reproducción, distribución, modificación o uso comercial de cualquier
            componente de la plataforma sin autorización escrita previa.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Planes y pagos</h2>
          <p className="text-gray-600 leading-relaxed">
            NormaLis opera bajo un modelo de suscripción mensual o anual. Los precios, características
            y condiciones de cada plan están disponibles en la página de precios. NormaLis se reserva
            el derecho de modificar los precios con previo aviso de 30 días.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            El período piloto gratuito, cuando aplique, tiene una duración definida al momento de
            la activación. Al vencerse el período piloto sin renovación, el acceso a la plataforma
            quedará suspendido hasta la activación de un plan de pago.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Disponibilidad del servicio</h2>
          <p className="text-gray-600 leading-relaxed">
            NormaLis se esfuerza por mantener una disponibilidad del 99% mensual. Sin embargo, no
            garantiza la disponibilidad ininterrumpida del servicio y no será responsable por
            perjuicios derivados de interrupciones, mantenimientos programados o fallas de
            infraestructura de terceros (Firebase, Vercel, Cloudflare).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Protección de datos</h2>
          <p className="text-gray-600 leading-relaxed">
            El tratamiento de datos personales se rige por la{' '}
            <Link href="/politica-privacidad" className="text-primary-600 hover:underline">
              Política de Privacidad
            </Link>{' '}
            y la Ley 1581 de 2012 (Ley de Habeas Data) y sus decretos reglamentarios. El usuario
            autoriza expresamente el tratamiento de los datos ingresados en la plataforma conforme
            a dicha política.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">8. Modificaciones</h2>
          <p className="text-gray-600 leading-relaxed">
            NormaLis podrá modificar estos términos en cualquier momento. Los cambios serán
            notificados por correo electrónico o mediante aviso en la plataforma con al menos
            15 días de anticipación. El uso continuado del servicio después de la notificación
            implica la aceptación de los nuevos términos.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">9. Legislación aplicable</h2>
          <p className="text-gray-600 leading-relaxed">
            Estos términos se rigen por las leyes de la República de Colombia. Cualquier
            controversia derivada del uso de la plataforma será resuelta por los tribunales
            competentes de la ciudad de Bogotá D.C., Colombia.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">10. Contacto</h2>
          <p className="text-gray-600 leading-relaxed">
            Para consultas sobre estos términos, escríbenos a{' '}
            <a href="mailto:info@normalis.co" className="text-primary-600 hover:underline">
              info@normalis.co
            </a>.
          </p>
        </section>
      </main>

      <footer className="border-t border-gray-100 py-6 px-6 text-center text-sm text-gray-400">
        <Link href="/politica-privacidad" className="hover:text-gray-600 transition-colors mr-4">
          Política de Privacidad
        </Link>
        <Link href="/" className="hover:text-gray-600 transition-colors">
          normalis.co
        </Link>
      </footer>
    </div>
  );
}
