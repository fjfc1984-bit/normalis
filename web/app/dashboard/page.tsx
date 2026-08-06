'use client';

/**
 * Dashboard home — NormaLis
 * KPIs en tiempo real: última auditoría, CAPAs abiertas, vencimientos próximos,
 * countdown visita, y acceso rápido a los 13 módulos.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  collection, query, where, orderBy, limit,
  getDocs, onSnapshot, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useFechaVisita } from '@/lib/useFechaVisita';

// ── SVG Ring (compliance score) ────────────────────────────────────────────────
function ScoreRing({ pct, size = 120 }: { pct: number; size?: number }) {
  const r     = (size - 16) / 2;
  const circ  = 2 * Math.PI * r;
  const dash  = (pct / 100) * circ;
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const track = pct >= 80 ? '#dcfce7' : pct >= 50 ? '#fef3c7' : '#fee2e2';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track}   strokeWidth={10} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}   strokeWidth={10}
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 1.2s ease' }} />
    </svg>
  );
}

// ── KPI card ───────────────────────────────────────────────────────────────────
interface KpiProps {
  label:    string;
  value:    string | number;
  sub?:     string;
  accent:   string;  // tailwind bg class
  textColor:string;
  icon:     string;
  href?:    string;
}

function KpiCard({ label, value, sub, accent, textColor, icon, href }: KpiProps) {
  const content = (
    <div className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${accent} flex items-center justify-center text-xl`}>
          {icon}
        </div>
        {href && (
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        )}
      </div>
      <p className={`text-3xl font-bold tabular-nums ${textColor}`}>{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

// ── Module card ────────────────────────────────────────────────────────────────
interface Module {
  href:    string;
  title:   string;
  desc:    string;
  icon:    string;
  bg:      string;
  badge?:  string;
}

const MODULES: Module[] = [
  { href:'/dashboard/chat',         title:'Asistente IA',   desc:'Normativa y habilitación con IA', icon:'🤖', bg:'bg-violet-50', badge:'Nuevo' },
  { href:'/dashboard/auditoria',    title:'Auditoría',      desc:'Res. 3100/2019 · 22 modalidades',  icon:'🔍', bg:'bg-teal-50' },
  { href:'/dashboard/pamec',        title:'PAMEC',          desc:'Programa de auditoría PHVA',       icon:'📈', bg:'bg-emerald-50' },
  { href:'/dashboard/capas',        title:'CAPAs',          desc:'Acciones correctivas y preventivas',icon:'✅', bg:'bg-green-50' },
  { href:'/dashboard/indicadores',  title:'Indicadores',    desc:'Calidad Res. 256/2016',            icon:'📊', bg:'bg-blue-50' },
  { href:'/dashboard/personal',     title:'Talento Humano', desc:'Hojas de vida y capacitaciones',   icon:'👥', bg:'bg-indigo-50' },
  { href:'/dashboard/vencimientos', title:'Vencimientos',   desc:'Documentos y fechas críticas',     icon:'📅', bg:'bg-amber-50' },
  { href:'/dashboard/sg-sst',       title:'SG-SST',         desc:'Seguridad Res. 0312/2019',         icon:'🦺', bg:'bg-orange-50' },
  { href:'/dashboard/simulacros',   title:'Simulacro',      desc:'Lista pre-visita Secretaría',      icon:'🔔', bg:'bg-red-50' },
  { href:'/dashboard/documentos',   title:'Documentos',     desc:'Plantillas y normativa',            icon:'📄', bg:'bg-sky-50' },
  { href:'/dashboard/pqrs',         title:'PQRS',           desc:'Peticiones, quejas y reclamos',    icon:'📬', bg:'bg-pink-50' },
  { href:'/dashboard/incidentes',   title:'Incidentes',     desc:'Eventos adversos y seguridad',     icon:'🛡️', bg:'bg-rose-50' },
  { href:'/dashboard/bitacora',     title:'Bitácora',       desc:'Registro de actividades',          icon:'📋', bg:'bg-gray-50' },
];

// ── Countdown widget ───────────────────────────────────────────────────────────
function CountdownCard() {
  const { fechaVisita, daysLeft, urgency, loading, saving, setFecha, clearFecha } = useFechaVisita();
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');

  const cfg = {
    urgente:   { color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-200',  label: 'Urgente', icon: '🚨' },
    pronto:    { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200',label: 'Pronto',  icon: '⚠️' },
    ok:        { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200',label: 'OK',      icon: '✅' },
    vencida:   { color: 'text-gray-500',  bg: 'bg-gray-50',  border: 'border-gray-200', label: 'Vencida', icon: '📅' },
    sin_fecha: { color: 'text-gray-400',  bg: 'bg-gray-50',  border: 'border-gray-200', label: 'Sin fecha',icon:'📅' },
  }[urgency];

  if (loading) return <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm h-36 animate-pulse" />;

  return (
    <div className={`bg-white rounded-2xl p-5 border ${cfg.border} shadow-sm`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
            Próxima visita de habilitación
          </p>
          {fechaVisita && (
            <p className="text-xs text-gray-400">
              {new Date(fechaVisita).toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' })}
            </p>
          )}
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${cfg.bg} ${cfg.color}`}>
          {cfg.icon} {cfg.label}
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <span className={`text-5xl font-black tabular-nums ${cfg.color}`}>
            {daysLeft !== null ? (daysLeft < 0 ? '—' : daysLeft) : '?'}
          </span>
          {daysLeft !== null && daysLeft >= 0 && (
            <span className="ml-2 text-sm text-gray-400">días</span>
          )}
        </div>

        <div className="flex flex-col gap-1 items-end text-right">
          {editing ? (
            <>
              <input
                type="date"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                <button
                  onClick={async () => { if (draft) { await setFecha(draft); setEditing(false); } }}
                  disabled={!draft || saving}
                  className="text-xs bg-teal-600 text-white px-3 py-1 rounded-lg disabled:opacity-50"
                >
                  {saving ? '…' : 'Guardar'}
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => { setDraft(fechaVisita ?? ''); setEditing(true); }}
                className="text-xs text-teal-600 hover:text-teal-800 font-semibold"
              >
                {fechaVisita ? 'Cambiar fecha' : 'Configurar fecha →'}
              </button>
              {fechaVisita && (
                <button onClick={clearFecha} className="text-xs text-gray-300 hover:text-red-400">
                  Quitar
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, nombre, nit, rol } = useAuth();

  // ── Real data ──
  const [auditScore,   setAuditScore]   = useState<number | null>(null);
  const [capasAbiertas, setCapasAbiertas] = useState<number | null>(null);
  const [vencProximos,  setVencProximos]  = useState<number | null>(null);
  const [loadingKpis,   setLoadingKpis]   = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    // Última auditoría (score)
    getDocs(
      query(
        collection(db, 'auditorias'),
        where('uid', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(1),
      )
    ).then(snap => {
      if (!snap.empty) {
        const d = snap.docs[0].data();
        const score = d.score ?? d.puntaje ?? d.porcentaje ?? null;
        setAuditScore(typeof score === 'number' ? Math.round(score) : null);
      }
    }).catch(() => null);

    // CAPAs abiertas
    const capasUnsub = onSnapshot(
      query(collection(db, 'capas'), where('uid', '==', user.uid), where('estado', '!=', 'cerrada')),
      snap => setCapasAbiertas(snap.size),
    );

    // Vencimientos próximos (≤30 días)
    const hoy   = new Date();
    const en30d = new Date(Date.now() + 30 * 86_400_000);
    const vencUnsub = onSnapshot(
      query(
        collection(db, 'vencimientos'),
        where('uid', '==', user.uid),
        where('fecha', '>=', Timestamp.fromDate(hoy)),
        where('fecha', '<=', Timestamp.fromDate(en30d)),
      ),
      snap => setVencProximos(snap.size),
    );

    setLoadingKpis(false);

    return () => { capasUnsub(); vencUnsub(); };
  }, [user?.uid]);

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const hoy = new Date().toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long' });

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-gray-400 capitalize">{hoy}</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
              {greeting}{nombre ? `, ${nombre}` : ''}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Panel de habilitación y calidad · NormaLis
            </p>
          </div>
          {rol === 'piloto' && (
            <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-200">
              🕐 Cuenta piloto
            </span>
          )}
        </div>
      </div>

      {/* ── Compliance score + KPIs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">

        {/* Score ring — ocupa 1 col */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-2">
          <div className="relative">
            <ScoreRing pct={auditScore ?? 0} size={120} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-gray-800 tabular-nums">
                {auditScore !== null ? `${auditScore}%` : '—'}
              </span>
            </div>
          </div>
          <p className="text-xs font-semibold text-gray-500 text-center">Último cumplimiento</p>
          {auditScore === null && (
            <Link href="/dashboard/auditoria" className="text-xs text-teal-600 font-semibold hover:underline">
              Iniciar auditoría →
            </Link>
          )}
        </div>

        {/* KPIs — 4 cols */}
        <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard
            label="CAPAs abiertas"
            value={loadingKpis ? '…' : (capasAbiertas ?? 0)}
            sub={capasAbiertas ? 'Requieren seguimiento' : 'Todo al día'}
            accent={capasAbiertas ? 'bg-red-100' : 'bg-green-100'}
            textColor={capasAbiertas ? 'text-red-600' : 'text-green-600'}
            icon="✓"
            href="/dashboard/capas"
          />
          <KpiCard
            label="Vencimientos ≤30d"
            value={loadingKpis ? '…' : (vencProximos ?? 0)}
            sub={vencProximos ? 'Documentos por renovar' : 'Sin alertas'}
            accent={vencProximos ? 'bg-amber-100' : 'bg-green-100'}
            textColor={vencProximos ? 'text-amber-600' : 'text-green-600'}
            icon="📅"
            href="/dashboard/vencimientos"
          />
          <KpiCard
            label="NIT"
            value={nit || '—'}
            sub={nit ? 'IPS registrada' : 'Completar perfil'}
            accent="bg-teal-100"
            textColor="text-teal-700"
            icon="🏥"
          />
          <KpiCard
            label="Estado"
            value={rol === 'cliente' ? 'Activo' : rol === 'piloto' ? 'Piloto' : (rol ?? '—')}
            sub="Plan actual"
            accent="bg-emerald-100"
            textColor="text-emerald-700"
            icon="✅"
          />
        </div>
      </div>

      {/* ── Countdown ── */}
      <div className="mb-8">
        <CountdownCard />
      </div>

      {/* ── Módulos ── */}
      <div className="mb-2">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Módulos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {MODULES.map(m => (
            <Link
              key={m.href}
              href={m.href}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group relative overflow-hidden"
            >
              {/* Badge */}
              {m.badge && (
                <span className="absolute top-2.5 right-2.5 text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-semibold" style={{ fontSize:'10px' }}>
                  {m.badge}
                </span>
              )}

              {/* Icon box */}
              <div className={`w-10 h-10 ${m.bg} rounded-xl flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform`}>
                {m.icon}
              </div>

              {/* Text */}
              <p className="text-sm font-semibold text-gray-800 leading-snug">{m.title}</p>
              <p className="text-xs text-gray-400 mt-1 leading-snug">{m.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 text-center">
        <p className="text-xs text-gray-300">
          NormaLis · Resolución 1732/2026 (vigente, período de transición hasta ago. 2027)
          · Res. 465/2025 · Res. 256/2016
        </p>
      </div>
    </div>
  );
}
