'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useFechaVisita } from '@/lib/useFechaVisita';
import { parseLocalDate } from '@/lib/fechaLocal';
import Link from 'next/link';

// ── Módulos con iconos + gradientes ───────────────────────────────────────────
const MODULES = [
  {
    href: '/dashboard/chat',
    title: 'Asistente IA',
    desc: 'Consultas sobre habilitación y normativa',
    icon: '🤖',
    from: '#7C3AED', to: '#A78BFA',
    badge: 'IA',
  },
  {
    href: '/dashboard/auditoria',
    title: 'Auditoría',
    desc: 'Res. 1732/2026 — 22 modalidades de servicio',
    icon: '🔍',
    from: '#00897B', to: '#00BCD4',
  },
  {
    href: '/dashboard/pamec',
    title: 'PAMEC',
    desc: 'Programa de auditoría para la mejora de calidad',
    icon: '📈',
    from: '#059669', to: '#34D399',
  },
  {
    href: '/dashboard/capas',
    title: 'CAPAs',
    desc: 'Acciones correctivas y preventivas',
    icon: '✓',
    from: '#16A34A', to: '#4ADE80',
  },
  {
    href: '/dashboard/indicadores',
    title: 'Indicadores',
    desc: 'Calidad — Resolución 256/2016',
    icon: '📊',
    from: '#1D4ED8', to: '#60A5FA',
  },
  {
    href: '/dashboard/vencimientos',
    title: 'Vencimientos',
    desc: 'Documentos y fechas límite críticas',
    icon: '📅',
    from: '#D97706', to: '#FCD34D',
  },
  {
    href: '/dashboard/sg-sst',
    title: 'SG-SST',
    desc: 'Seguridad y salud en el trabajo',
    icon: '🦺',
    from: '#EA580C', to: '#FB923C',
  },
  {
    href: '/dashboard/simulacros',
    title: 'Simulacro',
    desc: 'Lista de chequeo pre-visita Secretaría',
    icon: '🔔',
    from: '#DC2626', to: '#F87171',
  },
  {
    href: '/dashboard/documentos',
    title: 'Documentos',
    desc: 'Plantillas y documentos normativos',
    icon: '📄',
    from: '#0284C7', to: '#38BDF8',
  },
  {
    href: '/dashboard/pqrs',
    title: 'PQRS',
    desc: 'Peticiones, quejas y reclamos',
    icon: '📬',
    from: '#BE185D', to: '#F472B6',
  },
  {
    href: '/dashboard/prem-prom',
    title: 'PREM/PROM',
    desc: 'Experiencia y desenlaces del paciente',
    icon: '💬',
    from: '#7C3AED', to: '#C4B5FD',
    badge: 'NUEVO',
  },
  {
    href: '/dashboard/incidentes',
    title: 'Incidentes',
    desc: 'Eventos adversos y seguridad del paciente',
    icon: '🛡️',
    from: '#BE123C', to: '#FB7185',
  },
  {
    href: '/dashboard/bitacora',
    title: 'Bitácora',
    desc: 'Registro de actividades y auditorías',
    icon: '📋',
    from: '#475569', to: '#94A3B8',
  },
  {
    href: '/dashboard/talento',
    title: 'Talento Humano',
    desc: 'Gestión de personal y contratos',
    icon: '👥',
    from: '#0F766E', to: '#2DD4BF',
  },
  {
    href: '/dashboard/consentimientos',
    title: 'Consentimientos',
    desc: 'Informados y autorizaciones',
    icon: '📝',
    from: '#6D28D9', to: '#C4B5FD',
  },
  {
    href: '/dashboard/comparador',
    title: 'Comparador',
    desc: 'ISO 7101:2023 / JCI — crosswalk normativo',
    icon: '🔄',
    from: '#0E7490', to: '#22D3EE',
  },
  {
    href: '/dashboard/proa',
    title: 'PROA',
    desc: 'Optimización de antimicrobianos — Res. 2471/2022',
    icon: '💊',
    from: '#7C3AED', to: '#C084FC',
    badge: 'NUEVO',
  },
  {
    href: '/dashboard/gap-1732',
    title: 'Brecha 1732',
    desc: 'Análisis de brecha Res. 1732/2026 vs estado actual',
    icon: '🆕',
    from: '#0369A1', to: '#38BDF8',
    badge: '2026',
  },
  {
    href: '/dashboard/cumplimiento',
    title: 'Cumplimiento',
    desc: 'Gestión de riesgos ISO 31000 y cumplimiento normativo',
    icon: '⚡',
    from: '#B45309', to: '#FBBF24',
  },
  {
    href: '/dashboard/analisis-riesgo',
    title: 'Análisis de Riesgo',
    desc: 'Matriz ISO 31000 con alertas tempranas automáticas',
    icon: '⚠️',
    from: '#DC2626', to: '#FB923C',
    badge: 'NUEVO',
  },
  {
    href: '/dashboard/benchmarking',
    title: 'Benchmarking',
    desc: 'Comparación de indicadores entre IPS de la red',
    icon: '📊',
    from: '#1E40AF', to: '#93C5FD',
  },
  {
    href: '/dashboard/firma',
    title: 'Firma Digital',
    desc: 'Firma electrónica de documentos y actas',
    icon: '✍️',
    from: '#4F46E5', to: '#A5B4FC',
  },
];

// ── Countdown futurista ────────────────────────────────────────────────────────
function CountdownWidget() {
  const { fechaVisita, daysLeft, urgency, loading, saving, setFecha, clearFecha } = useFechaVisita();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState('');

  function startEdit() { setDraft(fechaVisita ?? ''); setEditing(true); }
  async function confirm() { if (!draft) return; await setFecha(draft); setEditing(false); }
  function cancel() { setEditing(false); }

  const urgencyConfig = {
    urgente:   {
      gradient: 'linear-gradient(135deg, rgba(220,38,38,.12), rgba(239,68,68,.06))',
      border: 'rgba(239,68,68,.35)',
      glow: 'rgba(239,68,68,.15)',
      text: '#DC2626', label: 'URGENTE — inicia auditoría ya', dot: '#ef4444',
    },
    pronto:    {
      gradient: 'linear-gradient(135deg, rgba(217,119,6,.12), rgba(245,158,11,.06))',
      border: 'rgba(245,158,11,.35)',
      glow: 'rgba(245,158,11,.15)',
      text: '#D97706', label: 'POCO TIEMPO — revisa cronograma', dot: '#f59e0b',
    },
    ok:        {
      gradient: 'linear-gradient(135deg, rgba(5,150,105,.12), rgba(52,211,153,.06))',
      border: 'rgba(52,211,153,.35)',
      glow: 'rgba(52,211,153,.15)',
      text: '#059669', label: 'BUEN TIEMPO — sigue el plan', dot: '#10b981',
    },
    vencida:   {
      gradient: 'linear-gradient(135deg, rgba(71,85,105,.10), rgba(100,116,139,.05))',
      border: 'rgba(100,116,139,.25)',
      glow: 'transparent',
      text: '#64748B', label: 'FECHA VENCIDA — actualiza la fecha', dot: '#94a3b8',
    },
    sin_fecha: {
      gradient: 'linear-gradient(135deg, rgba(0,137,123,.10), rgba(0,188,212,.05))',
      border: 'rgba(0,188,212,.25)',
      glow: 'rgba(0,188,212,.10)',
      text: '#00796B', label: 'Configura tu fecha de visita de habilitación', dot: '#26A69A',
    },
  };
  const cfg = urgencyConfig[urgency];

  if (loading) {
    return (
      <div className="rounded-2xl h-28 nl-skeleton" />
    );
  }

  return (
    <div
      className="rounded-2xl p-5 flex items-center justify-between gap-4"
      style={{
        background: cfg.gradient,
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 0 30px ${cfg.glow}, 0 2px 8px rgba(0,0,0,.05)`,
      }}
    >
      {/* Izquierda */}
      <div className="flex items-center gap-5">
        {/* Número grande */}
        <div className="flex flex-col items-center">
          <span className="font-black tabular-nums leading-none"
                style={{ fontSize: '3rem', color: cfg.text, textShadow: `0 0 20px ${cfg.glow}` }}>
            {daysLeft !== null ? (daysLeft < 0 ? '—' : daysLeft) : '?'}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5"
                style={{ color: cfg.text, opacity: 0.7 }}>
            {daysLeft !== null && daysLeft >= 0 ? 'días' : ''}
          </span>
        </div>

        <div className="h-10 w-px" style={{ background: `${cfg.border}` }} />

        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full nl-pulse flex-shrink-0"
                  style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: cfg.text }}>
              {cfg.label}
            </p>
          </div>
          <p className="text-xs font-semibold" style={{ color: '#00251A' }}>
            Próxima visita de habilitación
          </p>
          {fechaVisita && !editing && (
            <p className="text-xs mt-1" style={{ color: '#00695C', opacity: 0.7 }}>
              {parseLocalDate(fechaVisita)?.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      {/* Derecha — controles */}
      <div className="shrink-0">
        {editing ? (
          <div className="flex flex-col gap-2 items-end">
            <input
              type="date"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="text-xs border rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              style={{ borderColor: cfg.border, color: '#00251A' }}
              min={new Date().toISOString().split('T')[0]}
            />
            <div className="flex gap-2">
              <button onClick={cancel}
                      className="text-xs px-2 py-1 rounded-lg transition-colors"
                      style={{ color: '#64748B' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#374151'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748B'; }}>
                Cancelar
              </button>
              <button
                onClick={confirm}
                disabled={!draft || saving}
                className="text-xs px-3 py-1 rounded-lg text-white font-semibold disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)', boxShadow: '0 0 12px rgba(0,188,212,.3)' }}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1 items-end">
            <button
              onClick={startEdit}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)', boxShadow: '0 0 10px rgba(0,188,212,.25)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 18px rgba(0,188,212,.45)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 10px rgba(0,188,212,.25)'; }}
            >
              {fechaVisita ? 'Cambiar fecha' : '+ Configurar fecha'}
            </button>
            {fechaVisita && (
              <button onClick={clearFecha}
                      className="text-[10px] transition-colors"
                      style={{ color: 'rgba(100,116,139,.5)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,.5)'; }}>
                Quitar fecha
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tarjeta de módulo ─────────────────────────────────────────────────────────
function ModuleCard({ m }: { m: typeof MODULES[0] }) {
  return (
    <Link
      href={m.href}
      className="nl-module-card group flex flex-col gap-3 p-4 cursor-pointer"
      style={{ '--icon-from': m.from } as React.CSSProperties}
    >
      {/* Badge */}
      {m.badge && (
        <span
          className="absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{
            background: `linear-gradient(135deg, ${m.from}, ${m.to})`,
            color: '#fff',
            boxShadow: `0 0 8px ${m.from}55`,
          }}
        >
          {m.badge}
        </span>
      )}

      {/* Icono */}
      <div
        className="nl-icon-circle"
        style={{
          background: `linear-gradient(135deg, ${m.from}22, ${m.to}33)`,
          border: `1px solid ${m.from}33`,
          boxShadow: `0 0 12px ${m.from}18`,
        }}
      >
        {m.icon}
      </div>

      {/* Texto */}
      <div>
        <h3 className="font-semibold text-sm leading-tight" style={{ color: '#00251A' }}>
          {m.title}
        </h3>
        <p className="text-xs mt-1 leading-snug" style={{ color: '#00695C', opacity: 0.75 }}>
          {m.desc}
        </p>
      </div>

      {/* Arrow */}
      <div className="mt-auto flex justify-end">
        <span
          className="text-xs font-bold transition-all duration-200 opacity-0 group-hover:opacity-100 group-hover:translate-x-1"
          style={{ color: m.from }}
        >
          →
        </span>
      </div>
    </Link>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { nombre, rol } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-7">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: '#00251A' }}>
              {greeting}{nombre ? (
                <span className="nl-gradient-text">, {nombre}</span>
              ) : ''}
            </h2>
            <p className="text-sm mt-1" style={{ color: '#00695C', opacity: 0.8 }}>
              Panel de habilitación y calidad en salud · NormaLis
            </p>
          </div>
          {rol === 'piloto' && (
            <span
              className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{
                background: 'linear-gradient(135deg,#D97706,#FCD34D)',
                color: '#1c1917',
                boxShadow: '0 0 12px rgba(217,119,6,.25)',
              }}
            >
              ✦ Cuenta piloto
            </span>
          )}
        </div>
      </div>

      {/* Alerta normativa — Res. 1732/2026 */}
      <div
        className="mb-5 rounded-xl p-4 flex items-start gap-3"
        style={{
          background: 'linear-gradient(135deg, rgba(0,137,123,.10), rgba(0,188,212,.05))',
          border: '1px solid rgba(0,188,212,.28)',
        }}
      >
        <span className="text-lg flex-shrink-0">🔔</span>
        <div>
          <p className="font-bold text-sm leading-snug" style={{ color: '#00251A' }}>
            Actualización normativa — Resolución 1732 de 2026
          </p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#00695C' }}>
            Reemplaza la Res. 3100/2019 y todas sus modificaciones. Vigente desde agosto 2026 · 12 meses de transición.
            Mismos 7 estándares — nuevos criterios de telemedicina e historia clínica electrónica interoperable (IHCE).
          </p>
        </div>
      </div>

      {/* Countdown */}
      <div className="mb-7">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#00695C', opacity: 0.6 }}>
          ◈ Visita de habilitación
        </p>
        <CountdownWidget />
      </div>

      {/* Módulos */}
      <div className="mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#00695C', opacity: 0.6 }}>
          ◈ Módulos del sistema
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {MODULES.map(m => <ModuleCard key={m.href} m={m} />)}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 py-3 text-center text-[10px] font-medium tracking-wide"
           style={{ color: '#00695C', opacity: 0.45 }}>
        NormaLis · Res. 1732/2026 (reemplaza 3100/2019) · Res. 256/2016
      </div>
    </div>
  );
}
