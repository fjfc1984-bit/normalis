'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useFechaVisita } from '@/lib/useFechaVisita';
import Link from 'next/link';

// ── Módulos ────────────────────────────────────────────────────────────────
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

// ── Countdown widget ───────────────────────────────────────────────────────
function CountdownWidget() {
  const { fechaVisita, daysLeft, urgency, loading, saving, setFecha, clearFecha } = useFechaVisita();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState('');

  function startEdit() {
    setDraft(fechaVisita ?? '');
    setEditing(true);
  }

  async function confirm() {
    if (!draft) return;
    await setFecha(draft);
    setEditing(false);
  }

  function cancel() { setEditing(false); }

  const palette = {
    urgente:   { bg: 'bg-red-50',   border: 'border-red-300',   text: 'text-red-700',   badge: 'bg-red-100 text-red-700',    label: 'Urgente — inicia auditoría ya' },
    pronto:    { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', label: 'Poco tiempo — revisa cronograma' },
    ok:        { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', badge: 'bg-green-100 text-green-700', label: 'Buen tiempo — sigue el plan' },
    vencida:   { bg: 'bg-gray-50',  border: 'border-gray-300',  text: 'text-gray-500',  badge: 'bg-gray-100 text-gray-500',   label: 'Fecha vencida — actualiza la fecha' },
    sin_fecha: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500', badge: 'bg-slate-100 text-slate-500', label: 'Configura tu fecha de visita' },
  };
  const p = palette[urgency];

  if (loading) {
    return <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 animate-pulse h-28" />;
  }

  return (
    <div className={`rounded-xl border ${p.border} ${p.bg} p-5 flex items-center justify-between gap-4`}>
      {/* Left — número de días */}
      <div className="flex items-center gap-4">
        <div className={`text-4xl font-black tabular-nums ${p.text}`}>
          {daysLeft !== null ? (daysLeft < 0 ? '—' : daysLeft) : '?'}
        </div>
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${p.text}`}>
            {daysLeft !== null && daysLeft >= 0 ? 'días para la visita' : 'días'}
          </p>
          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${p.badge}`}>
            {p.label}
          </span>
          {fechaVisita && !editing && (
            <p className="text-xs text-gray-400 mt-1">
              {new Date(fechaVisita).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      {/* Right — edición */}
      <div className="shrink-0">
        {editing ? (
          <div className="flex flex-col gap-2 items-end">
            <input
              type="date"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-400"
              min={new Date().toISOString().split('T')[0]}
            />
            <div className="flex gap-2">
              <button onClick={cancel} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Cancelar
              </button>
              <button
                onClick={confirm}
                disabled={!draft || saving}
                className="text-xs bg-primary-600 text-white px-3 py-1 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1 items-end">
            <button
              onClick={startEdit}
              className="text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors"
            >
              {fechaVisita ? 'Cambiar fecha' : 'Configurar fecha'}
            </button>
            {fechaVisita && (
              <button onClick={clearFecha} className="text-xs text-gray-300 hover:text-red-400 transition-colors">
                Quitar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { nombre, rol } = useAuth();

  return (
    <div className="p-6">
      <div className="mb-6">
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

      {/* Widget próxima visita */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Próxima visita de habilitación
        </p>
        <CountdownWidget />
      </div>

      {/* Módulos */}
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
