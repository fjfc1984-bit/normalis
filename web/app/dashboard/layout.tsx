'use client';

import type { ReactNode } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import { useAuth } from '@/lib/auth';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

// ── Normativa banner ──────────────────────────────────────────────────────────
const BANNER_KEY = 'normalis_banner_1732_v1';

function NormativaBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (localStorage.getItem(BANNER_KEY) !== 'dismissed') setVisible(true);
  }, []);
  if (!visible) return null;
  return (
    <div className="bg-emerald-700 text-white text-xs px-4 py-2 flex items-center justify-between gap-4 z-10">
      <div className="flex items-center gap-2">
        <span className="shrink-0">📢</span>
        <span>
          <strong>Res. 1732/2026 vigente</strong> — Deroga Res. 3100/2019.
          Transición: <strong>hasta agosto 2027</strong>. NormaLis actualizando todos los módulos.
        </span>
      </div>
      <button
        onClick={() => { localStorage.setItem(BANNER_KEY, 'dismissed'); setVisible(false); }}
        className="shrink-0 text-emerald-200 hover:text-white text-lg font-bold leading-none"
        aria-label="Cerrar"
      >×</button>
    </div>
  );
}

// ── Navigation structure ───────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'General',
    items: [
      { href: '/dashboard',          label: 'Dashboard',     icon: HomeIcon },
      { href: '/dashboard/chat',     label: 'Asistente IA',  icon: BotIcon,   badge: 'IA' },
    ],
  },
  {
    label: 'Calidad',
    items: [
      { href: '/dashboard/auditoria',   label: 'Auditoría',   icon: AuditIcon },
      { href: '/dashboard/pamec',       label: 'PAMEC',       icon: ChartIcon },
      { href: '/dashboard/capas',       label: 'CAPAs',       icon: CheckIcon },
      { href: '/dashboard/indicadores', label: 'Indicadores', icon: BarIcon },
    ],
  },
  {
    label: 'Talento & Operaciones',
    items: [
      { href: '/dashboard/personal',      label: 'Talento Humano', icon: PeopleIcon },
      { href: '/dashboard/vencimientos',  label: 'Vencimientos',   icon: CalIcon },
      { href: '/dashboard/documentos',    label: 'Documentos',     icon: DocIcon },
    ],
  },
  {
    label: 'Seguridad',
    items: [
      { href: '/dashboard/sg-sst',     label: 'SG-SST',    icon: HardhatIcon },
      { href: '/dashboard/simulacros', label: 'Simulacro', icon: BellIcon },
      { href: '/dashboard/incidentes', label: 'Incidentes',icon: ShieldIcon },
    ],
  },
  {
    label: 'Registros',
    items: [
      { href: '/dashboard/pqrs',     label: 'PQRS',     icon: MailIcon },
      { href: '/dashboard/bitacora', label: 'Bitácora', icon: ClipIcon },
    ],
  },
];

// ── SVG Icons (inline, no dependency) ─────────────────────────────────────────
function HomeIcon()    { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>; }
function BotIcon()     { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="10" rx="2"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 11V7m-4 4V9m8 2V9M8 21v-2m8 2v-2M9 7h6M12 3v4"/></svg>; }
function AuditIcon()   { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/></svg>; }
function ChartIcon()   { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>; }
function CheckIcon()   { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>; }
function BarIcon()     { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>; }
function PeopleIcon()  { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>; }
function CalIcon()     { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function DocIcon()     { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>; }
function HardhatIcon() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>; }
function BellIcon()    { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>; }
function ShieldIcon()  { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>; }
function MailIcon()    { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>; }
function ClipIcon()    { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>; }
function MenuIcon()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>; }
function XIcon()       { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>; }
function LogOutIcon()  { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>; }

// ── Pilot expiry indicator ─────────────────────────────────────────────────────
function PilotBadge({ expiresAt }: { expiresAt: Date | null }) {
  if (!expiresAt) return null;
  const days = Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return (
    <div className="mx-3 mb-3 px-3 py-2 rounded-lg bg-red-500/20 border border-red-400/30 text-red-300 text-xs">
      ⚠ Piloto vencido
    </div>
  );
  return (
    <div className="mx-3 mb-3 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-400/25 text-amber-300 text-xs">
      🕐 Piloto — {days}d restantes
    </div>
  );
}

// ── Sidebar component ─────────────────────────────────────────────────────────
function Sidebar({ onClose }: { onClose?: () => void }) {
  const { nombre, rol, email, expiresAt } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut(auth);
    router.push('/login');
  }

  return (
    <aside className="w-64 min-h-screen flex flex-col" style={{ background: '#0a1f18' }}>
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{ background: '#1a5e4a' }}>
            <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">NormaLis</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-emerald-400 hover:text-white transition-colors lg:hidden">
            <XIcon />
          </button>
        )}
      </div>

      {/* IPS info */}
      <div className="mx-3 mb-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-white text-sm font-semibold truncate">{nombre || 'Mi IPS'}</p>
        <p className="text-emerald-400/70 text-xs truncate mt-0.5">{email}</p>
        <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium capitalize"
              style={{ background: 'rgba(52,211,153,0.15)', color: '#6ee7b7' }}>
          {rol}
        </span>
      </div>

      {/* Pilot expiry */}
      {rol === 'piloto' && <PilotBadge expiresAt={expiresAt} />}

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-3 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1.5 px-2"
               style={{ color: 'rgba(110,231,183,0.4)' }}>
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
                      active
                        ? 'text-white shadow-sm'
                        : 'text-emerald-300/60 hover:text-white hover:bg-white/5'
                    }`}
                    style={active ? { background: '#1a5e4a', color: '#fff' } : {}}
                  >
                    <span className={active ? 'text-emerald-300' : 'text-emerald-500/60 group-hover:text-emerald-300 transition-colors'}>
                      <Icon />
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {'badge' in item && item.badge && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ background: '#1a5e4a', color: '#6ee7b7', fontSize: '10px' }}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: 'rgba(110,231,183,0.5)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(110,231,183,0.5)')}
        >
          <LogOutIcon />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}

// ── Mobile header ──────────────────────────────────────────────────────────────
function MobileHeader({ onMenu }: { onMenu: () => void }) {
  const { nombre } = useAuth();
  return (
    <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-3">
        <button onClick={onMenu} className="text-gray-500 hover:text-gray-800 transition-colors">
          <MenuIcon />
        </button>
        <span className="font-bold text-gray-800">NormaLis</span>
      </div>
      <span className="text-xs text-gray-400 truncate max-w-[160px]">{nombre || 'IPS'}</span>
    </header>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  const pathname = usePathname();
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-gray-50">
        {/* Desktop sidebar */}
        <div className="hidden lg:block flex-shrink-0">
          <div className="sticky top-0 h-screen overflow-y-auto">
            <Sidebar />
          </div>
        </div>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative z-10">
              <Sidebar onClose={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <MobileHeader onMenu={() => setMobileOpen(true)} />
          <NormativaBanner />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
