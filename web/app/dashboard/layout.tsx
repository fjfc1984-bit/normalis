'use client';

import AuthGuard from '@/components/auth/AuthGuard';
import { useAuth } from '@/lib/auth';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard',               label: 'Dashboard',    icon: '⊞' },
  { href: '/dashboard/chat',          label: 'Asistente IA', icon: '🤖' },
  { href: '/dashboard/auditoria',     label: 'Auditoría',    icon: '🔍' },
  { href: '/dashboard/pamec',         label: 'PAMEC',        icon: '📈' },
  { href: '/dashboard/capas',         label: 'CAPAs',        icon: '✓' },
  { href: '/dashboard/indicadores',   label: 'Indicadores',  icon: '📊' },
  { href: '/dashboard/vencimientos',  label: 'Vencimientos', icon: '📅' },
  { href: '/dashboard/sg-sst',        label: 'SG-SST',       icon: '🦺' },
  { href: '/dashboard/simulacros',    label: 'Simulacro',    icon: '🔔' },
  { href: '/dashboard/documentos',    label: 'Documentos',   icon: '📄' },
  { href: '/dashboard/pqrs',          label: 'PQRS',         icon: '📬' },
  { href: '/dashboard/incidentes',    label: 'Incidentes',   icon: '🛡️' },
  { href: '/dashboard/bitacora',      label: 'Bitácora',     icon: '📋' },
];

function Sidebar() {
  const { nombre, rol } = useAuth();
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-primary-900 text-white flex flex-col">
      <div className="p-5 border-b border-primary-700">
        <h1 className="text-xl font-bold">NormaLis</h1>
        <p className="text-xs text-primary-300 mt-1 truncate">{nombre || 'IPS'}</p>
        <span className="text-xs bg-primary-700 px-2 py-0.5 rounded-full mt-1 inline-block capitalize">
          {rol}
        </span>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
              ${pathname === item.href
                ? 'bg-primary-600 text-white'
                : 'text-primary-200 hover:bg-primary-800'}`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-primary-700">
        <button
          onClick={() => signOut(auth)}
          className="w-full text-left text-xs text-primary-300 hover:text-white transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
