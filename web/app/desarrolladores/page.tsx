import Link from 'next/link';

export const metadata = {
  title: 'API para desarrolladores — NormaLis',
  description: 'Documentación técnica de la API pública de NormaLis para integrar sistemas de Historia Clínica Electrónica (HCE) y otros sistemas externos.',
};

const WORKER_URL = 'https://normalis.fjfc1984.workers.dev';

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-gray-900 text-emerald-300 text-xs sm:text-sm rounded-lg p-4 overflow-x-auto my-4">
      {children}
    </pre>
  );
}

export default function DesarrolladoresPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-primary-900 text-white py-10 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-primary-300 text-sm hover:text-white transition-colors">
            ← Volver a normalis.co
          </Link>
          <h1 className="text-3xl font-bold mt-4">API para desarrolladores</h1>
          <p className="text-primary-300 mt-2 text-sm">
            Integra tu Historia Clínica Electrónica (HCE) u otro sistema con NormaLis · v1 · Última actualización: agosto de 2026
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 prose prose-slate">
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Qué es esto</h2>
          <p className="text-gray-600 leading-relaxed">
            La API pública de NormaLis permite que un sistema externo (Hosvital, Greenlane, SAP Salud, o un
            desarrollo propio de la IPS) reporte incidentes y eventos adversos directamente en NormaLis, sin
            que el personal clínico tenga que abrir una segunda plataforma. También expone, sin necesidad de
            autenticación, el checklist de requisitos de la Resolución 1732 de 2026.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Está pensada para ser consumida servidor-a-servidor desde el backend de tu HCE, no desde el
            navegador del usuario final.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Base URL</h2>
          <Code>{WORKER_URL}</Code>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Autenticación</h2>
          <p className="text-gray-600 leading-relaxed">
            Los endpoints de escritura requieren una llave API, generada desde{' '}
            <strong>NormaLis → Integraciones API</strong> por el administrador de la IPS. Envíala en el
            header <code>Authorization</code> con el esquema Bearer:
          </p>
          <Code>{`Authorization: Bearer nlk_live_...`}</Code>
          <p className="text-gray-600 leading-relaxed">
            La llave se muestra una única vez al crearla — NormaLis solo guarda su hash y no puede
            recuperar el valor original. Si se pierde, hay que revocarla y generar una nueva.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            GET /api/v1/checklist-1732
          </h2>
          <p className="text-gray-600 leading-relaxed">
            Devuelve el checklist de requisitos de la Resolución 1732/2026. No requiere autenticación —
            es contenido normativo, no datos de paciente.
          </p>
          <p className="text-gray-600 leading-relaxed font-semibold mt-4 mb-1">Parámetros de consulta (opcionales)</p>
          <ul className="text-gray-600">
            <li><code>categoria</code> — filtra por texto contenido en la categoría (ej. <code>telemedicina</code>)</li>
            <li><code>esNuevo</code> — <code>true</code> para requisitos nuevos frente a la Res. 3100/2019, <code>false</code> para los que continúan vigentes</li>
          </ul>
          <p className="text-gray-600 leading-relaxed font-semibold mt-4 mb-1">Ejemplo</p>
          <Code>{`curl "${WORKER_URL}/api/v1/checklist-1732?esNuevo=true"`}</Code>
          <p className="text-gray-600 leading-relaxed font-semibold mt-4 mb-1">Respuesta</p>
          <Code>{`{
  "count": 12,
  "items": [
    {
      "id": "ihce_01",
      "categoria": "IHCE — Historia Clínica Electrónica Interoperable",
      "titulo": "Sistema de HC con capacidad de interoperabilidad",
      "descripcion": "...",
      "esNuevo": true,
      "urgencia": "alta",
      "plazo": "Diciembre 2026 (plan de adecuación progresiva)",
      "guia": "..."
    }
  ]
}`}</Code>
          <p className="text-gray-600 leading-relaxed">
            Límite: 30 solicitudes por minuto por IP.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            POST /api/v1/incidentes
          </h2>
          <p className="text-gray-600 leading-relaxed">
            Registra un incidente o evento adverso en el módulo de Seguridad del Paciente de la IPS dueña
            de la llave. Requiere autenticación.
          </p>
          <p className="text-gray-600 leading-relaxed font-semibold mt-4 mb-1">Cuerpo de la solicitud</p>
          <Code>{`{
  "tipo": "Evento adverso",
  "severidad": "moderado",
  "desc": "Caída de paciente en habitación 204",
  "accion": "Se informó al médico de turno",
  "responsable": "Enfermera Jefe"
}`}</Code>
          <p className="text-gray-600 leading-relaxed font-semibold mt-4 mb-1">Campos</p>
          <table className="w-full text-sm text-gray-600 border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="py-1.5 pr-3">Campo</th>
                <th className="py-1.5 pr-3">Tipo</th>
                <th className="py-1.5">Descripción</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 pr-3 font-mono text-xs">tipo *</td>
                <td className="py-1.5 pr-3 text-xs">string</td>
                <td className="py-1.5 text-xs">
                  Uno de: <code>Evento adverso</code>, <code>Incidente sin daño</code>,{' '}
                  <code>Casi-evento (near miss)</code>, <code>Complicación</code>,{' '}
                  <code>Accidente de trabajo</code>, <code>Otro</code>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 pr-3 font-mono text-xs">severidad *</td>
                <td className="py-1.5 pr-3 text-xs">string</td>
                <td className="py-1.5 text-xs">
                  Uno de: <code>critico</code>, <code>moderado</code>, <code>leve</code>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 pr-3 font-mono text-xs">desc *</td>
                <td className="py-1.5 pr-3 text-xs">string</td>
                <td className="py-1.5 text-xs">Máx. 3000 caracteres</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 pr-3 font-mono text-xs">accion</td>
                <td className="py-1.5 pr-3 text-xs">string</td>
                <td className="py-1.5 text-xs">Opcional. Máx. 1000 caracteres</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-3 font-mono text-xs">responsable</td>
                <td className="py-1.5 pr-3 text-xs">string</td>
                <td className="py-1.5 text-xs">Opcional. Máx. 200 caracteres</td>
              </tr>
            </tbody>
          </table>
          <p className="text-gray-600 leading-relaxed font-semibold mt-4 mb-1">Respuesta exitosa — 201</p>
          <Code>{`{ "ok": true, "id": "aB3xY9..." }`}</Code>
          <p className="text-gray-600 leading-relaxed">
            El incidente queda registrado con estado <code>Abierto</code> y visible en el dashboard de la
            IPS con la etiqueta &quot;vía API&quot;, exactamente igual que uno registrado manualmente.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Límite: 60 solicitudes por minuto por llave.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Códigos de error</h2>
          <table className="w-full text-sm text-gray-600 border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="py-1.5 pr-3">Código</th>
                <th className="py-1.5">Significado</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100"><td className="py-1.5 pr-3 font-mono text-xs">400</td><td className="py-1.5 text-xs">Solicitud inválida — revisa el mensaje de error para el campo específico</td></tr>
              <tr className="border-b border-gray-100"><td className="py-1.5 pr-3 font-mono text-xs">401</td><td className="py-1.5 text-xs">Llave faltante, inválida o revocada</td></tr>
              <tr className="border-b border-gray-100"><td className="py-1.5 pr-3 font-mono text-xs">429</td><td className="py-1.5 text-xs">Límite de solicitudes excedido — reintenta más tarde</td></tr>
              <tr><td className="py-1.5 pr-3 font-mono text-xs">500 / 502 / 503</td><td className="py-1.5 text-xs">Error del servidor — reintenta; si persiste, contáctanos</td></tr>
            </tbody>
          </table>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Estado de esta API</h2>
          <p className="text-gray-600 leading-relaxed">
            Esta es la versión 1 (v1) de la API pública de NormaLis, orientada a un primer caso de uso:
            reporte de incidentes desde sistemas externos. Estamos evaluando expandirla con más módulos
            (vencimientos, indicadores, consulta de auditorías) según la demanda de integración de cada IPS.
            Si tu equipo técnico necesita un endpoint adicional, escríbenos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Contacto técnico</h2>
          <p className="text-gray-600 leading-relaxed">
            Para soporte de integración, escribe a{' '}
            <a href="mailto:hola@normalis.co" className="text-teal-600 underline">hola@normalis.co</a>.
          </p>
        </section>
      </main>
    </div>
  );
}
