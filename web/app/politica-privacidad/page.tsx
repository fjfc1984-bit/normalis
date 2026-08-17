import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidad — NormaLis',
  description: 'Política de Tratamiento de Datos Personales de NormaLis conforme a la Ley 1581/2012, Decreto 1377/2013 y Circular SIC 002/2024.',
};

function Tag({ children, type = 'col' }: { children: React.ReactNode; type?: 'col' | 'ia' | 'intl' }) {
  const colors = {
    col:  'bg-blue-50 text-blue-700 border border-blue-200',
    ia:   'bg-amber-50 text-amber-700 border border-amber-200',
    intl: 'bg-purple-50 text-purple-700 border border-purple-200',
  };
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium mr-1 mb-1 ${colors[type]}`}>
      {children}
    </span>
  );
}

function Section({ id, num, title, children }: { id: string; num: number; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center">
          {num}
        </span>
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="pl-11 text-gray-600 leading-relaxed space-y-3 text-sm">
        {children}
      </div>
    </section>
  );
}

export default function PoliticaPrivacidadPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-primary-900 text-white py-10 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-primary-300 text-sm hover:text-white transition-colors">
            ← Volver a normalis.co
          </Link>
          <h1 className="text-3xl font-bold mt-4">Política de Tratamiento de Datos Personales</h1>
          <p className="text-primary-300 mt-2 text-sm">Versión 1.1 · Agosto 2026</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {['Ley 1581/2012','Decreto 1377/2013','Circular SIC 002/2024','CONPES 4144/2025','AI Act EU 2024/1689','ISO/IEC 42001:2023','NIST AI RMF','ISO 31000'].map(f => (
              <span key={f} className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{f}</span>
            ))}
          </div>
        </div>
      </header>

      {/* Aviso IA */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
        <div className="max-w-3xl mx-auto text-sm text-amber-800">
          <strong>Aviso sobre uso de Inteligencia Artificial —</strong> NormaLis utiliza sistemas de IA para asistir en consultas normativas y generación de documentos. Todo contenido generado por IA incluye un aviso visible y no reemplaza asesoría jurídica profesional. Conforme a la Circular SIC 002/2024 y el AI Act (UE 2024/1689), usted tiene derecho a saber cuándo una respuesta proviene de un sistema automatizado.
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* TOC */}
        <nav className="bg-gray-50 rounded-xl p-5 mb-10 text-sm">
          <p className="font-semibold text-gray-700 mb-3">Contenido</p>
          <ol className="space-y-1 text-gray-500 list-decimal list-inside">
            {[
              ['#p1', 'Identificación del Responsable del Tratamiento'],
              ['#p2', 'Datos personales que recopilamos'],
              ['#p3', 'Finalidad del tratamiento'],
              ['#p4', 'Base legal del tratamiento'],
              ['#p5', 'Datos sensibles'],
              ['#p6', 'Compartición y transferencia de datos'],
              ['#p7', 'Conservación y retención de datos'],
              ['#p8', 'Derechos del titular (Habeas Data)'],
              ['#p9', 'Seguridad de los datos'],
              ['#p10', 'Uso de IA y tratamiento automatizado'],
              ['#p11', 'Cookies y datos técnicos'],
              ['#p12', 'Modificaciones a esta política'],
              ['#p13', 'Contacto y ejercicio de derechos'],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="hover:text-primary-600 transition-colors">{label}</a>
              </li>
            ))}
          </ol>
        </nav>

        {/* 1 */}
        <Section id="p1" num={1} title="Identificación del Responsable del Tratamiento">
          <div><Tag>Ley 1581/2012 Art. 17</Tag></div>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Nombre:</strong> NormaLis</li>
            <li><strong>Naturaleza:</strong> Plataforma SaaS de cumplimiento normativo para IPS colombianas</li>
            <li><strong>Sitio web:</strong> normalis.co</li>
            <li><strong>Correo de contacto:</strong> <a href="mailto:info@normalis.co" className="text-primary-600 hover:underline">info@normalis.co</a></li>
            <li><strong>País de operación principal:</strong> Colombia</li>
            <li><strong>Infraestructura:</strong> Firebase/Google Cloud Platform y Cloudflare (Workers)</li>
          </ul>
          <p>NormaLis actúa como <strong>Responsable del Tratamiento</strong> de los datos personales de sus usuarios conforme al artículo 3(e) de la Ley 1581/2012.</p>
        </Section>

        {/* 2 */}
        <Section id="p2" num={2} title="Datos personales que recopilamos">
          <div><Tag>Ley 1581/2012 Art. 10</Tag><Tag>Decreto 1377/2013 Art. 5</Tag></div>
          <p><strong>2.1 Datos de identificación y contacto:</strong> nombre del contacto responsable, cargo, correo electrónico y teléfono.</p>
          <p><strong>2.2 Datos de la organización (IPS):</strong> nombre de la IPS, NIT, ciudad, departamento y tipo de IPS.</p>
          <p><strong>2.3 Datos de uso:</strong> actividad en la plataforma, documentos generados con IA, resultados de autoevaluaciones, consultas al chat IA y bitácora de acciones para trazabilidad.</p>
          <p><strong>2.4 Datos técnicos:</strong> dirección IP, tipo de navegador y tokens de sesión de Firebase Authentication.</p>
          <p><strong>Principio de minimización:</strong> NormaLis solo recopila los datos estrictamente necesarios para prestar el servicio. Conforme al AI Act (Art. 10) e ISO 42001, los datos usados en sistemas de IA son los mínimos necesarios para la función específica.</p>
        </Section>

        {/* 3 */}
        <Section id="p3" num={3} title="Finalidad del tratamiento">
          <div><Tag>Ley 1581/2012 Art. 13</Tag><Tag>Decreto 1377/2013 Art. 6</Tag></div>
          <p>Los datos personales se usan exclusivamente para:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li><strong>Prestación del servicio:</strong> gestionar acceso, cuenta y módulos contratados.</li>
            <li><strong>Personalización:</strong> mostrar información de la IPS en documentos y reportes.</li>
            <li><strong>Comunicaciones:</strong> notificaciones sobre vencimientos, actualizaciones normativas y novedades de la cuenta.</li>
            <li><strong>Soporte técnico:</strong> atender solicitudes de ayuda e incidentes.</li>
            <li><strong>Facturación:</strong> gestionar suscripciones (NormaLis no almacena datos de tarjetas).</li>
            <li><strong>Mejora del servicio:</strong> análisis agregado y anonimizado. Los datos individuales no se usan para entrenamiento de modelos de IA de terceros.</li>
            <li><strong>Cumplimiento legal:</strong> atender requerimientos de autoridades competentes.</li>
          </ol>
          <p>Ningún dato personal será utilizado para finalidades distintas sin consentimiento previo, expreso e informado del titular.</p>
        </Section>

        {/* 4 */}
        <Section id="p4" num={4} title="Base legal del tratamiento">
          <div><Tag>Ley 1581/2012 Art. 6</Tag></div>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Consentimiento:</strong> otorgado al momento del registro, mediante aceptación de esta Política y los Términos y Condiciones.</li>
            <li><strong>Ejecución de contrato:</strong> el tratamiento es necesario para la prestación del servicio.</li>
            <li><strong>Obligación legal:</strong> cuando la ley colombiana exija la conservación o reporte de datos.</li>
            <li><strong>Interés legítimo:</strong> para detección de fraudes, seguridad del sistema y mejora del servicio.</li>
          </ul>
        </Section>

        {/* 5 */}
        <Section id="p5" num={5} title="Datos sensibles">
          <div><Tag>Ley 1581/2012 Art. 5 y 6</Tag></div>
          <p><strong>5.1 Regla general:</strong> NormaLis no recopila intencionalmente datos sensibles de los <strong>usuarios de la plataforma</strong> (origen racial, opiniones políticas, convicciones religiosas, datos biométricos, orientación sexual, afiliación sindical). Los módulos de auditoría, habilitación y cumplimiento generan información institucional de la IPS, no datos de pacientes individuales.</p>
          <p><strong>5.2 Excepción — módulo de Consentimientos Informados:</strong> Este módulo, por su naturaleza, sí procesa datos de identificación de pacientes (nombre y cédula) y el tipo de procedimiento clínico, con el único fin de dejar constancia del consentimiento informado exigido por la Ley 23/1981 (Art. 15) y la Resolución 13437/1991. Para estos datos específicos, la IPS es la <strong>Responsable del Tratamiento</strong> frente a sus pacientes, y NormaLis actúa como <strong>Encargada del Tratamiento</strong> (Art. 3(d) Ley 1581/2012), procesándolos únicamente por instrucción de la IPS y bajo las medidas de seguridad descritas en la Sección 9. Corresponde a la IPS contar con la autorización del paciente para que NormaLis, como encargada, almacene y procese esta información.</p>
          <p>Fuera de este módulo específico, si por error se ingresaran datos sensibles de pacientes en otros módulos, el usuario es responsable de su tratamiento conforme a la normativa de habilitación (Res. 1995/1999, Ley 23/1981).</p>
        </Section>

        {/* 6 */}
        <Section id="p6" num={6} title="Compartición y transferencia de datos">
          <div><Tag>Ley 1581/2012 Art. 17</Tag><Tag type="intl">AI Act Art. 25</Tag></div>
          <p>NormaLis <strong>no vende, alquila ni cede</strong> datos personales a terceros con fines comerciales. Los datos pueden compartirse únicamente con:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Google LLC (Firebase):</strong> autenticación, base de datos Firestore. Opera bajo el GDPR y Marco de Privacidad UE-EE.UU.</li>
            <li><strong>Cloudflare, Inc.:</strong> infraestructura del Worker (proxy IA, API de integraciones), CDN y protección DDoS.</li>
            <li><strong>Vercel Inc.:</strong> hosting y despliegue de la aplicación web.</li>
            <li><strong>Resend:</strong> envío de correos transaccionales (notificaciones, vencimientos, respuestas de PQRS). No recibe datos de pacientes.</li>
            <li><strong>Proveedor de IA:</strong> consultas del chat se envían al modelo a través de un proxy seguro. No incluyen datos identificativos del usuario.</li>
          </ul>
          <p>Toda transferencia internacional se realiza bajo garantías adecuadas conforme al artículo 26 de la Ley 1581/2012 y, en lo aplicable, el AI Act artículo 25.</p>
        </Section>

        {/* 7 */}
        <Section id="p7" num={7} title="Conservación y retención de datos">
          <div><Tag>Decreto 1377/2013 Art. 5(d)</Tag></div>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Cuenta activa:</strong> se conservan mientras la suscripción esté vigente.</li>
            <li><strong>Tras cancelación:</strong> supresión en máximo <strong>15 días hábiles</strong>, salvo obligación legal.</li>
            <li><strong>Bitácora de auditoría:</strong> hasta 12 meses por trazabilidad y seguridad.</li>
            <li><strong>Datos técnicos (logs):</strong> máximo 90 días, eliminación automática.</li>
            <li><strong>Facturación:</strong> 5 años conforme a normativa tributaria colombiana.</li>
          </ul>
        </Section>

        {/* 8 */}
        <Section id="p8" num={8} title="Derechos del titular (Habeas Data)">
          <div><Tag>Ley 1581/2012 Art. 8</Tag><Tag type="ia">Circular SIC 002/2024</Tag></div>
          <p>Como titular de datos personales, usted tiene derecho a:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
            {[
              ['Acceso', 'Conocer qué datos personales están almacenados y cómo se usan.'],
              ['Rectificación', 'Actualizar o corregir datos inexactos o incompletos.'],
              ['Supresión', 'Solicitar eliminación cuando no sean necesarios para la finalidad declarada.'],
              ['Revocación', 'Retirar el consentimiento otorgado en cualquier momento.'],
              ['Queja ante SIC', 'Presentar queja si considera que sus derechos han sido vulnerados.'],
              ['Explicación IA', 'Solicitar explicación sobre cómo los sistemas de IA procesaron su información (Circular SIC 002/2024).'],
            ].map(([title, desc]) => (
              <div key={title} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="font-semibold text-gray-700 text-xs mb-1">{title}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
          <p>Para ejercer estos derechos: <a href="mailto:info@normalis.co" className="text-primary-600 hover:underline">info@normalis.co</a> — indicando nombre, NIT de la IPS y el derecho que desea ejercer. <strong>Respuesta máxima: 15 días hábiles</strong> (Art. 14 Ley 1581/2012).</p>
        </Section>

        {/* 9 */}
        <Section id="p9" num={9} title="Seguridad de los datos">
          <div><Tag>Decreto 1377/2013 Art. 5(e)</Tag><Tag type="intl">ISO/IEC 42001 §6.1</Tag></div>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Cifrado en tránsito:</strong> HTTPS con TLS 1.2 o superior.</li>
            <li><strong>Cifrado en reposo:</strong> datos en Firestore cifrados en reposo por Google Cloud.</li>
            <li><strong>Autenticación:</strong> Firebase Authentication con tokens JWT. Contraseñas nunca en texto plano.</li>
            <li><strong>Control de acceso:</strong> Firestore Security Rules restringen datos por UID y NIT.</li>
            <li><strong>Headers de seguridad:</strong> CSP, X-Frame-Options, X-Content-Type-Options y Referrer-Policy.</li>
            <li><strong>Monitoreo:</strong> detección de errores y anomalías para respuesta ante incidentes.</li>
            <li><strong>Pagos:</strong> NormaLis no almacena datos de tarjetas ni información bancaria.</li>
          </ul>
          <p>En caso de brecha de seguridad, NormaLis notificará a los usuarios afectados y a la SIC dentro de los plazos establecidos por la normativa colombiana.</p>
        </Section>

        {/* 10 */}
        <Section id="p10" num={10} title="Uso de IA y tratamiento automatizado">
          <div>
            <Tag type="ia">Circular SIC 002/2024</Tag>
            <Tag type="intl">AI Act EU 2024/1689</Tag>
            <Tag type="intl">ISO/IEC 42001:2023</Tag>
            <Tag type="intl">NIST AI RMF</Tag>
            <Tag>CONPES 4144/2025</Tag>
          </div>
          <p><strong>10.1 Sistemas de IA utilizados</strong></p>
          <p>NormaLis utiliza modelos de lenguaje de gran escala (LLM) para asistir en consultas sobre normativa colombiana de habilitación en salud (Res. 3100/2019, Res. 465/2025, PAMEC, SG-SST). Estos modelos operan a través de un proxy seguro de Cloudflare Workers.</p>
          <p><strong>10.2 Aviso obligatorio de IA</strong></p>
          <p>Conforme a la Circular SIC 002/2024 y el artículo 50 del AI Act, toda respuesta generada por los sistemas de IA de NormaLis incluye un aviso visible que indica su origen automatizado. Este aviso es permanente y no puede ser desactivado.</p>
          <p><strong>10.3 Limitaciones del sistema</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Puede cometer errores en la interpretación de normas o artículos específicos.</li>
            <li>No accede a fuentes normativas en tiempo real salvo indicación explícita.</li>
            <li>No constituye asesoría jurídica profesional.</li>
            <li>No debe ser la única fuente para decisiones administrativas oficiales de habilitación.</li>
          </ul>
          <p><strong>10.4 Supervisión humana</strong></p>
          <p>Conforme al NIST AI RMF y la ISO 42001, NormaLis diseña sus sistemas de IA para asistir y no reemplazar el juicio humano. Toda decisión con consecuencias jurídicas, administrativas o sanitarias debe ser revisada por un profesional competente.</p>
          <p><strong>10.5 No entrenamiento con datos del usuario</strong></p>
          <p>NormaLis no utiliza datos personales ni contenido ingresado por los usuarios para reentrenar modelos de IA de terceros. Las consultas al chat se transmiten al modelo pero no son almacenadas por el proveedor para entrenamiento.</p>
          <p><strong>10.6 Clasificación de riesgo</strong></p>
          <p>Conforme al AI Act (Anexo III) y la Circular SIC 002/2024, el sistema de asistencia normativa de NormaLis se clasifica como sistema de <strong>riesgo limitado a moderado</strong>: asiste en decisiones de cumplimiento normativo pero no toma decisiones autónomas que afecten derechos fundamentales. Se aplican los controles correspondientes: transparencia obligatoria, supervisión humana y trazabilidad.</p>
        </Section>

        {/* 11 */}
        <Section id="p11" num={11} title="Cookies y datos técnicos">
          <p>NormaLis utiliza almacenamiento local del navegador (localStorage y sessionStorage) para mantener la sesión activa y guardar preferencias de configuración de la IPS. Este almacenamiento es estrictamente necesario, no se comparte con terceros y se elimina automáticamente al cerrar sesión.</p>
          <p>NormaLis no utiliza cookies de rastreo publicitario. Se utiliza Google Analytics 4 con anonimización de IP para análisis agregado del tráfico.</p>
        </Section>

        {/* 12 */}
        <Section id="p12" num={12} title="Modificaciones a esta política">
          <p>NormaLis puede actualizar esta política por cambios en la normativa aplicable, cambios en los sistemas de IA utilizados o mejoras en las prácticas de privacidad. Cualquier modificación será notificada por correo electrónico con al menos 15 días de anticipación y mediante aviso en la plataforma.</p>
          <p>El uso continuado de la plataforma después del plazo de notificación constituye aceptación de la política actualizada.</p>
        </Section>

        {/* 13 */}
        <Section id="p13" num={13} title="Contacto y ejercicio de derechos">
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-5">
            <p className="font-semibold text-primary-800 mb-3">Contacto del Responsable del Tratamiento</p>
            <ul className="space-y-1 text-sm">
              <li>📧 <a href="mailto:info@normalis.co" className="text-primary-600 hover:underline">info@normalis.co</a></li>
              <li>🌐 <a href="https://normalis.co" className="text-primary-600 hover:underline">normalis.co</a></li>
              <li>🏳️ Colombia</li>
            </ul>
            <p className="mt-3 text-xs text-primary-700">
              Tiempo de respuesta: máximo 15 días hábiles (Art. 14 Ley 1581/2012). Si no obtiene respuesta, puede elevar su solicitud a la Superintendencia de Industria y Comercio (SIC) en{' '}
              <a href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer" className="underline">www.sic.gov.co</a>.
            </p>
          </div>
        </Section>
      </div>

      <footer className="border-t border-gray-100 py-6 px-6 text-center text-sm text-gray-400">
        <Link href="/terminos" className="hover:text-gray-600 transition-colors mr-4">
          Términos y Condiciones
        </Link>
        <Link href="/confianza-y-seguridad" className="hover:text-gray-600 transition-colors mr-4">
          Confianza y Seguridad
        </Link>
        <Link href="/" className="hover:text-gray-600 transition-colors">
          normalis.co
        </Link>
        <p className="mt-2 text-xs">Política v1.1 · Agosto 2026 · Ley 1581/2012 · Circular SIC 002/2024 · AI Act EU 2024/1689</p>
      </footer>
    </div>
  );
}
