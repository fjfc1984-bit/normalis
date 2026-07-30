'use client';

import { useAuth } from '@/lib/auth';
import Link from 'next/link';

const MODULES = [
  { href: '/dashboard/chat',         title: 'Asistente IA',  desc: 'Consultas sobre habilitación y normativa', icon: '🤖', color: 'border-violet-400', badge: 'Nuevo' },
  { href: '/dashboard/auditoria',    title: 'Auditoría',     desc: 'Res. 3100/2019 — 22 modalidades',         icon: '🔍', color: 'border-purple-400' },
  { href: '/dashboard/pamec',        title: 'PAMEC',         desc: 'Programa de auditoría de calidad',        icon: '📈', color: 'border-teal-400' },
  { href: '/dashboard/capas',        title: 'CAPAs',         desc: 'Acciones correctivas y preventivas',      icon: '✓',  color: 'border-green-400' },
  { href: '/dashboard/indicadores',  title: 'Indicadores',   desc: 'Calidad Res. 256/2016',                   icon: '📊', color: 'border-blue-400' },
  { href: '/dashboard/vencimientos', title: 'Vencimientos',  desc: 'Documentos y fechas límite',              icon: '📅', color: 'border-amber-400' },
  { href: '/dashboard/sg-sst',       title: 'SG-SST',        desc: 'Seguridad y salud en el trabajo',         icon: '🦺', color: 'border-orange-400' },
  { href: '/dashboard/simulacros',   title: 'Simulacro',     desc: 'Lista de chequeo pre-visita Secretaría',  icon: '🔔', color: 'border-red-300' },
  { href: '/dashboard/documentos',   title: 'Documentos',    desc: 'Plantillas y documentos normativos',      icon: '📄', color: 'border-sky-400' },
  { href: '/dashboard/pqrs',         title: 'PQRS',          desc: 'Peticiones, quejas y reclamos',           icon: '📬', color: 'border-pink-400' },
  { href: '/dashboard/incidentes',   title: 'Incidentes',    desc: 'Eventos adversos y seguridad del paciente',icon: '🛡️', color: 'border-rose-400' },
  { href: '/dashboard/bitacora',     title: 'Bitácora',      desc: 'Registro de actividades y auditorías',    icon: '📋', color: 'border-gray-400' },
];

export default function DashboardPage() {
  const { nombre, rol } = useAuth();

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800">
          Bienvenido{nombre ? `, ${nombre}` : ''}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Panel de habilitación y calidad en salud · NormaLis
          {rol === 'piloto' && (
            <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">
              Cuenta piloto
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {MODULES.map(m => (
          <Link
            key={m.href}
            href={m.href}
            className={`relative bg-white rounded-xl p-5 border-l-4 ${m.color}
                        shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5`}
          >
            {m.badge && (
              <span className="absolute top-3 right-3 text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-medium">
                {m.badge}
              </span>
            )}
            <div className="text-2xl mb-3">{m.icon}</div>
            <h3 className="font-semibold text-gray-800 text-sm">{m.title}</h3>
            <p className="text-xs text-gray-500 mt-1 leading-snug">{m.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-400 text-center">
        NormaLis · Resolución 3100/2019 · Resolución 465/2025 · Resolución 256/2016
      </div>
    </div>
  );
}
