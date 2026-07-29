'use client';

import { useAuth } from '@/lib/auth';
import Link from 'next/link';

const MODULES = [
  { href: '/dashboard/vencimientos', title: 'Vencimientos', desc: 'Documentos y fechas límite', icon: '📅', color: 'border-amber-400' },
  { href: '/dashboard/capas',        title: 'CAPAs',        desc: 'Acciones correctivas abiertas', icon: '✓', color: 'border-green-400' },
  { href: '/dashboard/indicadores',  title: 'Indicadores',  desc: 'Calidad Res. 256/2016',   icon: '📊', color: 'border-blue-400' },
  { href: '/dashboard/auditoria',    title: 'Auditoría',    desc: 'Res. 3100/2019 — 7 estándares', icon: '🔍', color: 'border-purple-400' },
];

export default function DashboardPage() {
  const { nombre } = useAuth();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-1">
        Bienvenido{nombre ? `, ${nombre}` : ''}
      </h2>
      <p className="text-sm text-gray-500 mb-8">Panel de habilitación — NormaLis</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MODULES.map(m => (
          <Link
            key={m.href}
            href={m.href}
            className={`bg-white rounded-xl p-5 border-l-4 ${m.color}
                        shadow-sm hover:shadow-md transition-shadow`}
          >
            <span className="text-2xl">{m.icon}</span>
            <h3 className="font-semibold mt-2">{m.title}</h3>
            <p className="text-xs text-gray-500 mt-1">{m.desc}</p>
          </Link>
        ))}
      </div>

      {/* Nota de migración gradual — se elimina cuando todo esté en Next.js */}
      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <strong>Migración en curso:</strong> Esta es la nueva versión de NormaLis en Next.js.
        El módulo completo sigue disponible en{' '}
        <a href="https://normalis.co/normativa-app-v2.html"
           className="underline" target="_blank" rel="noopener noreferrer">
          normalis.co
        </a>.
      </div>
    </div>
  );
}
