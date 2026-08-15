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
    <div style={{ background: 'linear-gradient(90deg,#f59e0b,#d97706)', color: '#1c1917' }}
         className="text-sm font-medium px-4 py-2 flex items-center gap-2">
      <span>⚠️</span>
      <span>
        Esta cuenta no tiene NIT configurado — los módulos no pueden guardar datos.
        Ve a <strong>Firebase Console → Firestore → usuarios → tu documento</strong> y agrega el campo{' '}
        <code className="px-1 rounded text-xs" style={{ background: 'rgba(0,0,0,.15)' }}>nit</code>.
      </span>
    </div>
  );
}

// Grupos de navegación
const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard',      label: 'Dashboard',   icon: '⊞' },
      { href: '/dashboard/chat', label: 'Asistente IA', icon: '🤖' },
    ],
  },
  {
    label: 'Auditoría y Calidad',
    items: [
      { href: '/dashboard/auditoria',    label: 'Auditoría',    icon: '🔍' },
      { href: '/dashboard/cumplimiento', label: 'Cumplimiento', icon: '⚡' },
      { href: '/dashboard/pamec',        label: 'PAMEC',        icon: '📈' },
      { href: '/dashboard/capas',        label: 'CAPAs',        icon: '✓'  },
      { href: '/dashboard/indicadores',  label: 'Indicadores',  icon: '📊' },
      { href: '/dashboard/comparador',   label: 'Comparador',   icon: '🔄' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/dashboard/vencimientos',    label: 'Vencimientos',  icon: '📅' },
      { href: '/dashboard/sg-sst',          label: 'SG-SST',         icon: '🦺' },
      { href: '/dashboard/simulacros',      label: 'Simulacro',      icon: '🔔' },
      { href: '/dashboard/documentos',      label: 'Documentos',     icon: '📄' },
      { href: '/dashboard/pqrs',            label: 'PQRS',           icon: '📬' },
      { href: '/dashboard/incidentes',      label: 'Incidentes',     icon: '🛡️' },
    ],
  },
  {
    label: 'Registros',
    items: [
      { href: '/dashboard/bitacora',        label: 'Bitácora',       icon: '📋' },
      { href: '/dashboard/talento',         label: 'Talento',        icon: '👥' },
      { href: '/dashboard/firma',           label: 'Firma',          icon: '✍️' },
      { href: '/dashboard/consentimientos', label: 'Consentimientos', icon: '📝' },
    ],
  },
];

function Sidebar() {
  const { nombre, rol } = useAuth();
  const pathname = usePathname();

  return (
    <aside
      className="w-60 min-h-screen flex flex-col fixed top-0 left-0 h-screen z-50 overflow-hidden"
      style={{ background: '#00251A' }}
    >
      {/* Glow superior decorativo */}
      <div className="pointer-events-none absolute -top-16 -left-8 w-48 h-48 rounded-full opacity-20"
           style={{ background: 'radial-gradient(circle, #00BCD4 0%, transparent 70%)' }} />

      {/* Logo */}
      <div className="relative px-4 py-5 flex items-center gap-3"
           style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-base text-white flex-shrink-0"
             style={{
               background: 'linear-gradient(135deg,#00897B,#00BCD4)',
               boxShadow: '0 0 16px rgba(0,188,212,.35)',
             }}>
          N
        </div>
        <div>
          <p className="text-base font-extrabold text-white leading-none tracking-tight">NormaLis</p>
          <p className="text-[10px] mt-0.5 tracking-wide uppercase" style={{ color: '#4DB6AC' }}>
            Habilitación IPS
          </p>
        </div>
      </div>

      {/* Usuario */}
      <div className="px-4 py-3 flex items-center gap-2.5"
           style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
             style={{ background: 'linear-gradient(135deg,#00695C,#0097A7)' }}>
          {nombre ? nombre[0].toUpperCase() : 'U'}
        </div>
        <div className="overflow-hidden">
          <p className="text-xs font-semibold text-white truncate leading-tight">{nombre || 'IPS'}</p>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize"
                style={{ background: 'rgba(0,121,107,.22)', color: '#80CBC4' }}>
            {rol}
          </span>
        </div>
        {/* Live dot */}
        <div className="ml-auto w-2 h-2 rounded-full flex-shrink-0 nl-pulse"
             style={{ background: '#26A69A', boxShadow: '0 0 6px #26A69A' }} />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[9px] font-bold uppercase tracking-widest"
               style={{ color: 'rgba(128,203,196,.45)' }}>
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all duration-150 group"
                    style={active ? {
                      background: 'rgba(0,137,123,.22)',
                      color: '#26A69A',
                      borderLeft: '3px solid #26A69A',
                      paddingLeft: '9px',
                      fontWeight: 600,
                      boxShadow: 'inset 0 0 12px rgba(0,188,212,.06)',
                    } : {
                      color: '#80CBC4',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        const el = e.currentTarget as HTMLElement;
                        el.style.background = 'rgba(255,255,255,.06)';
                        el.style.color = '#e2f8f6';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        const el = e.currentTarget as HTMLElement;
                        el.style.background = '';
                        el.style.color = '#80CBC4';
                      }
                    }}
                  >
                    <span className="text-sm w-5 text-center flex-shrink-0 transition-transform duration-150 group-hover:scale-110">
                      {item.icon}
                    </span>
                    {item.label}
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: '#26A69A', boxShadow: '0 0 5px #26A69A' }} />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 relative" style={{ borderTop: '1px solid rgba(255,255,255,.07)' }}>
        <button
          onClick={() => signOut(auth)}
          className="w-full flex items-center gap-2 text-xs transition-all duration-150 rounded-lg px-2 py-1.5 group"
          style={{ color: 'rgba(128,203,196,.5)' }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.color = '#ef4444';
            el.style.background = 'rgba(239,68,68,.08)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.color = 'rgba(128,203,196,.5)';
            el.style.background = '';
          }}
        >
          <span>⎋</span>
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
