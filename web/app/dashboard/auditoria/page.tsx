'use client';

import Link from 'next/link';
import { SEGMENT_META, areasDB } from '@/data/auditData';

export default function AuditoriaPage() {
  const segments = Object.keys(areasDB);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Auditoría de habilitación</h2>
        <p className="text-sm text-gray-500 mt-1">
          Resolución 1732/2026 — verificación de condiciones de habilitación por tipo de servicio
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {segments.map(seg => {
          const meta = SEGMENT_META[seg];
          const areas = areasDB[seg];
          const totalQ = areas.reduce((acc, a) => acc + a.q.length, 0);

          return (
            <Link
              key={seg}
              href={`/dashboard/auditoria/${seg}`}
              className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-teal-500
                         hover:shadow-md transition-all duration-200 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{meta?.icon ?? '📋'}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm leading-tight">
                      {meta?.label ?? seg}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {areas.length} área{areas.length !== 1 ? 's' : ''} · {totalQ} criterios
                    </p>
                  </div>
                </div>
                <span className="text-gray-300 group-hover:text-teal-500 text-lg transition-colors">›</span>
              </div>

              <p className="text-xs text-gray-400 line-clamp-1">{meta?.norm}</p>

              <div className="flex flex-wrap gap-1">
                {areas.slice(0, 3).map(area => (
                  <span
                    key={area.id}
                    className="text-[10px] bg-gray-50 border border-gray-100 text-gray-500
                               rounded px-2 py-0.5 truncate max-w-[120px]"
                  >
                    {area.icon} {area.name}
                  </span>
                ))}
                {areas.length > 3 && (
                  <span className="text-[10px] text-gray-400 px-1 py-0.5">
                    +{areas.length - 3} más
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-gray-400 text-center">
        Criterios basados en Res. 1732/2026 (reemplaza Res. 3100/2019 y todas sus modificaciones)
      </p>
    </div>
  );
}
