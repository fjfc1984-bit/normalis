'use client';

import AuthGuard from '@/components/auth/AuthGuard';
import { useAuth } from '@/lib/auth';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function NitWarningBanner() {
  const { nit, loading } = useAuth();
  if (loading || nit) return null;
  return (
    <div className="bg-amber-500 text-amber-950 text-sm font-medium px-4 py-2 flex items-center gap-2">
      <span>⚠️</span>
      <span>
        Esta cuenta no tiene NIT configurado — los módulos no pueden guardar datos.
        Ve a <strong>Firebase Console → Firestore → usuarios → tu documento</strong> y agrega el campo <code className="bg-amber-400 px-1 rounded">nit</code> con el NIT de tu IPS.
      </span>
    </div>
  );
}

const NAV_ITEMS = [
  { href: '/dashboard',                 label: 'Dashboard',            icon: '⊞'  },
  { href: '/dashboard/chat',            label: 'Asistente IA',         icon: '🤖' },
  { href: '/dashboard/auditoria',       label: 'Auditoría',            icon: '🔍' },
  { href: '/dashboard/pamec',           label: 'PAMEC',                icon: '📈' },
  { href: '/dashboard/capas',           label: 'CAPAs',                icon: '✓'  },
  { href: '/dashboard/indicadores',     label: 'Indicadores',          icon: '📊' },
  { href: '/dashboard/vencimientos',    label: 'Vencimientos',         icon: '📅' },
  { href: '/dashboard/sg-sst',          label: 'SG-SST',               icon: '🦺' },
  { href: '/dashboard/simulacros',      label: 'Simulacro',            icon: '🔔' },
  { href: '/dashboard/documentos',      label: 'Documentos',           icon: '📄' },
  { href: '/dashboard/pqrs',            label: 'PQRS',                 icon: '📬' },
  { href: '/dashboard/incidentes',      label: 'Incidentes',           icon: '🛡️' },
  { href: '/dashboard/bitacora',        label: 'Bitácora',             icon: '📋' },
  { href: '/dashboard/talento',         label: 'Talento Humano',       icon: '👥' },
  { href: '/dashboard/firma',           label: 'Firma y Versiones',    icon: '✍️' },
  { href: '/dashboard/consentimientos', label: 'Consentimientos',      icon: '📝' },
  { href: '/dashboard/comparador',      label: 'Comparador Normativo', icon: '🔄' },
];

function Sidebar() {
  const { nombre, rol } = useAuth();
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen flex flex-col fixed top-0 left-0 h-screen z-50"
           style={{ background: '#00251A' }}>

      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-3"
           style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-base text-white flex-shrink-0"
             style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)', boxShadow: '0 0 14px rgba(0,188,212,.3)' }}>
          N
        </div>
        <div>
          <p className="text-base font-extrabold text-white leading-none">NormaLis</p>
          <p className="text-xs mt-0.5 truncate max-w-[130px]"
             style={{ color: '#475569' }}>{nombre || 'IPS'}</p>
        </div>
      </div>

      {/* Badge rol */}
      <div className="px-4 pt-3 pb-1">
        <span className="text-xs px-2 py-0.5 rounded-full capitalize font-semibold"
              style={{ background: 'rgba(0,121,107,.18)', color: '#80CBC4' }}>
          {rol}
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-0.5">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
              style={active ? {
                background: 'rgba(0,137,123,.20)',
                color: '#26A69A',
                borderLeft: '3px solid #26A69A',
                paddingLeft: '9px',
                fontWeight: 600,
              } : {
                color: '#80CBC4',
              }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.06)'; (e.currentTarget as HTMLElement).style.color = '#e2e8f0'; } }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = '#80CBC4'; } }}
            >
              <span className="text-sm w-5 text-center flex-shrink-0">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,.07)' }}>
        <button
          onClick={() => signOut(auth)}
          className="w-full text-left text-xs transition-colors"
          style={{ color: '#475569' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#475569'; }}
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
      <div className="flex min-h-screen" style={{ background: '#E0F2F1' }}>
        <Sidebar />
        {/* offset por el sidebar fixed */}
        <div className="flex-1 flex flex-col overflow-auto ml-60" style={{ background: '#E0F2F1' }}>
          <NitWarningBanner />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
