'use client';

import Link from 'next/link';

const SERVICIOS = [
  'Consulta externa médica',
  'Consulta externa odontológica',
  'Urgencias',
  'Hospitalización',
  'Apoyo diagnóstico',
  'Farmacia',
  'Transporte asistencial',
];

export default function AuditoriaPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Auditoría de habilitación</h2>
        <p className="text-sm text-gray-500">
          Resolución 3100/2019 — verificación de estándares por servicio
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-amber-800">
          <strong>Módulo en migración.</strong> El motor de auditoría completo sigue disponible en{' '}
          <a
            href="https://normalis.co/normativa-app-v2.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            normalis.co/normativa-app-v2.html
          </a>
          . Esta vista será migrada en la próxima iteración.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SERVICIOS.map(s => (
          <div
            key={s}
            className="bg-white rounded-xl border border-gray-200 p-5 flex items-center
                       justify-between cursor-not-allowed opacity-60"
          >
            <div>
              <p className="font-medium text-gray-700 text-sm">{s}</p>
              <p className="text-xs text-gray-400 mt-0.5">Próximamente</p>
            </div>
            <span className="text-gray-300 text-xl">›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
