'use client';

/**
 * web/app/dashboard/sg-sst/page.tsx
 * Módulo SG-SST — Sistema de Gestión de Seguridad y Salud en el Trabajo
 * Base legal: Res. 0312/2019 · Decreto 1072/2015 — Ministerio de Trabajo Colombia
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useSST, calcSSTScore } from '@/lib/useSST';
import type { SSTFase, SSTItemEstado, SSTPlanItem, SSTVencimiento } from '@/lib/sstTypes';
import { SST_SEMAFORO_CFG, SST_FASE_LABELS } from '@/lib/sstTypes';
import { SST_ESTANDARES, SST_VENCIMIENTOS_TIPO } from '@/lib/sstCatalog';

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function diasParaVencer(iso: string): number {
  return Math.ceil((new Date(iso + 'T00:00:00').getTime() - Date.now()) / 86_400_000);
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'autoevaluacion' | 'plan' | 'vencimientos';

const TABS: { value: Tab; label: string; emoji: string }[] = [
  { value: 'dashboard',      label: 'Dashboard',      emoji: '📊' },
  { value: 'autoevaluacion', label: 'Autoevaluación', emoji: '✅' },
  { value: 'plan',           label: 'Plan de Trabajo', emoji: '📋' },
  { value: 'vencimientos',   label: 'Vencimientos',   emoji: '📅' },
];

// ── Semáforo visual ────────────────────────────────────────────────────────────
function SemaforoBar({ pct, semaforo }: { pct: number; semaforo: string }) {
  const cfg = SST_SEMAFORO_CFG[semaforo as keyof typeof SST_SEMAFORO_CFG];
  const barColor = semaforo === 'critico'
    ? 'bg-red-500' : semaforo === 'moderado'
    ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
        <span className={`text-2xl font-black ${cfg.color}`}>{pct}%</span>
      </div>
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">{cfg.text}</p>
    </div>
  );
}

// ── Estado chip para ítems ────────────────────────────────────────────────────
const ESTADO_CFG: Record<SSTItemEstado, { label: string; bg: string; color: string }> = {
  cumple:  { label: 'Cumple',  bg: 'bg-emerald-100', color: 'text-emerald-700' },
  parcial: { label: 'Parcial', bg: 'bg-amber-100',   color: 'text-amber-700'   },
  no:      { label: 'No',      bg: 'bg-red-100',     color: 'text-red-700'     },
  '':      { label: 'Sin eval',bg: 'bg-gray-100',    color: 'text-gray-500'    },
};

function EstadoSelector({
  itemId,
  value,
  onChange,
}: {
  itemId: string;
  value: SSTItemEstado;
  onChange: (id: string, estado: SSTItemEstado) => void;
}) {
  return (
    <div className="flex gap-1 flex-shrink-0">
      {(['cumple', 'parcial', 'no'] as SSTItemEstado[]).map(e => {
        const cfg = ESTADO_CFG[e];
        const active = value === e;
        return (
          <button
            key={e}
            onClick={() => onChange(itemId, active ? '' : e)}
            className={`px-2 py-1 rounded-md text-xs font-semibold transition-all
              ${active
                ? `${cfg.bg} ${cfg.color} ring-1 ring-current`
                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
          >
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Tab: Dashboard ────────────────────────────────────────────────────────────
function TabDashboard({
  score,
  fase,
  autoevaluacion,
  onFaseChange,
}: {
  score: ReturnType<typeof calcSSTScore>;
  fase: SSTFase;
  autoevaluacion: Record<string, SSTItemEstado>;
  onFaseChange: (f: SSTFase) => void;
}) {
  const estandar = SST_ESTANDARES[fase];
  const totalItems = estandar.grupos.reduce((a, g) => a + g.items.length, 0);
  const evaluados  = Object.values(autoevaluacion).filter(v => v !== '').length;
  const cumple     = Object.values(autoevaluacion).filter(v => v === 'cumple').length;
  const parcial    = Object.values(autoevaluacion).filter(v => v === 'parcial').length;
  const noC        = Object.values(autoevaluacion).filter(v => v === 'no').length;

  return (
    <div className="space-y-6">
      {/* Selector de fase */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          ¿Cuántos trabajadores tiene la IPS?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['fase1', 'fase2', 'fase3'] as SSTFase[]).map(f => (
            <button
              key={f}
              onClick={() => onFaseChange(f)}
              className={`p-3 rounded-xl border-2 text-left transition-all
                ${fase === f
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 hover:border-teal-300'}`}
            >
              <p className={`text-xs font-bold mb-1 ${fase === f ? 'text-teal-700' : 'text-gray-500'}`}>
                {f === 'fase1' ? 'Fase I' : f === 'fase2' ? 'Fase II' : 'Fase III'}
              </p>
              <p className="text-xs text-gray-600 leading-tight">
                {SST_FASE_LABELS[f].split('—')[1]?.trim()}
              </p>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">⚠️ Cambiar la fase reinicia la autoevaluación.</p>
      </div>

      {/* Score principal */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Resultado de la autoevaluación — {estandar.label}
        </h3>
        <SemaforoBar pct={score.pct} semaforo={score.semaforo} />
        <p className="text-xs text-gray-500 mt-3">
          Puntos obtenidos: <strong>{score.obtenido}</strong> / {score.total} pts
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total ítems',   value: totalItems, color: 'text-gray-800'    },
          { label: 'Evaluados',     value: evaluados,  color: 'text-blue-700'    },
          { label: 'Cumplen',       value: cumple,     color: 'text-emerald-700' },
          { label: 'No cumplen',    value: noC,        color: 'text-red-700'     },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{k.label}</p>
            <p className={`text-3xl font-black mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Por grupo */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Avance por grupo</h3>
        <div className="space-y-3">
          {estandar.grupos.map(grupo => {
            const gTotal = grupo.items.reduce((a, i) => a + i.puntos, 0);
            let gObt = 0;
            grupo.items.forEach(i => {
              const e = autoevaluacion[i.id] || '';
              if (e === 'cumple')  gObt += i.puntos;
              else if (e === 'parcial') gObt += i.puntos * 0.5;
            });
            const gPct = gTotal > 0 ? Math.round((gObt / gTotal) * 100) : 0;
            const barColor = gPct < 60 ? 'bg-red-400' : gPct < 85 ? 'bg-amber-400' : 'bg-emerald-400';
            return (
              <div key={grupo.id}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-700">{grupo.nombre}</span>
                  <span className="text-xs font-bold text-gray-600">{gPct}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} rounded-full`} style={{ width: `${gPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ítems incumplidos */}
      {noC > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-red-700 mb-3">
            ⚠️ {noC} estándar{noC > 1 ? 'es' : ''} sin cumplir — acción requerida
          </h3>
          <ul className="space-y-1">
            {estandar.grupos.flatMap(g => g.items).filter(i => autoevaluacion[i.id] === 'no').map(i => (
              <li key={i.id} className="text-xs text-red-600 flex gap-2">
                <span className="font-bold">{i.num}</span>
                <span className="line-clamp-2">{i.texto}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Parciales */}
      {parcial > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-amber-700 mb-3">
            🔶 {parcial} estándar{parcial > 1 ? 'es' : ''} en implementación parcial
          </h3>
          <ul className="space-y-1">
            {estandar.grupos.flatMap(g => g.items).filter(i => autoevaluacion[i.id] === 'parcial').map(i => (
              <li key={i.id} className="text-xs text-amber-700 flex gap-2">
                <span className="font-bold">{i.num}</span>
                <span className="line-clamp-2">{i.texto}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Tab: Autoevaluación ────────────────────────────────────────────────────────
function TabAutoevaluacion({
  fase,
  autoevaluacion,
  saving,
  onItemChange,
  onMarcarTodos,
}: {
  fase: SSTFase;
  autoevaluacion: Record<string, SSTItemEstado>;
  saving: boolean;
  onItemChange: (id: string, estado: SSTItemEstado) => void;
  onMarcarTodos: (estado: SSTItemEstado) => void;
}) {
  const estandar = SST_ESTANDARES[fase];
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(estandar.grupos[0]?.id ?? null);

  return (
    <div className="space-y-4">
      {/* Acciones rápidas */}
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <p className="text-sm text-gray-600">
          {estandar.nota} — <span className="font-semibold">{estandar.total_puntos} pts</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onMarcarTodos('cumple')}
            disabled={saving}
            className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700
                       rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
          >
            ✅ Todos cumplen
          </button>
          <button
            onClick={() => onMarcarTodos('')}
            disabled={saving}
            className="px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-600
                       rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
          >
            🔄 Limpiar
          </button>
        </div>
      </div>

      {saving && (
        <p className="text-xs text-teal-600 flex items-center gap-2">
          <span className="w-3 h-3 border border-teal-500 border-t-transparent rounded-full animate-spin" />
          Guardando en Firestore…
        </p>
      )}

      {/* Grupos acordeón */}
      {estandar.grupos.map(grupo => {
        const cumpleCount  = grupo.items.filter(i => autoevaluacion[i.id] === 'cumple').length;
        const parcialCount = grupo.items.filter(i => autoevaluacion[i.id] === 'parcial').length;
        const noCount      = grupo.items.filter(i => autoevaluacion[i.id] === 'no').length;
        const total        = grupo.items.length;
        const pct          = total > 0 ? Math.round(((cumpleCount + parcialCount * 0.5) / total) * 100) : 0;
        const open         = grupoAbierto === grupo.id;

        return (
          <div key={grupo.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header de grupo */}
            <button
              onClick={() => setGrupoAbierto(open ? null : grupo.id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 text-left">
                <span className="text-sm font-bold text-gray-800">{grupo.nombre}</span>
                <div className="flex gap-1">
                  {cumpleCount > 0  && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 rounded-full">{cumpleCount}✓</span>}
                  {parcialCount > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 rounded-full">{parcialCount}~</span>}
                  {noCount > 0      && <span className="text-xs bg-red-100 text-red-700 px-1.5 rounded-full">{noCount}✗</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-sm font-bold ${pct >= 85 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                  {pct}%
                </span>
                <span className="text-gray-400">{open ? '▲' : '▼'}</span>
              </div>
            </button>

            {/* Ítems */}
            {open && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {grupo.items.map(item => {
                  const estado = autoevaluacion[item.id] || '';
                  return (
                    <div key={item.id} className="px-5 py-3 flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-gray-400 mr-2">{item.num}</span>
                        <span className="text-sm text-gray-700">{item.texto}</span>
                        <span className="ml-2 text-xs text-gray-400">({item.puntos} pts)</span>
                      </div>
                      <EstadoSelector itemId={item.id} value={estado} onChange={onItemChange} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Plan de Trabajo ──────────────────────────────────────────────────────
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const PLAN_ESTADO_CFG = {
  pendiente:   { label: 'Pendiente',   bg: 'bg-gray-100',    color: 'text-gray-600'    },
  en_curso:    { label: 'En curso',    bg: 'bg-blue-100',    color: 'text-blue-700'    },
  completado:  { label: 'Completado',  bg: 'bg-emerald-100', color: 'text-emerald-700' },
} as const;

function TabPlan({
  plan,
  saving,
  onAdd,
  onUpdate,
  onDelete,
}: {
  plan: SSTPlanItem[];
  saving: boolean;
  onAdd: (item: Omit<SSTPlanItem, 'id'>) => void;
  onUpdate: (id: string, changes: Partial<SSTPlanItem>) => void;
  onDelete: (id: string) => void;
}) {
  const empty: Omit<SSTPlanItem, 'id'> = {
    actividad: '', responsable: '', mes: new Date().getMonth() + 1,
    estado: 'pendiente', evidencia: '',
  };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SSTPlanItem | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.actividad.trim()) return;
    onAdd(form);
    setForm(empty);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">
        Plan de trabajo anual SG-SST — Decreto 1072/2015, Art. 2.2.4.6.22
      </p>

      {/* Formulario de agregar */}
      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Agregar actividad</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Actividad *</label>
            <input
              type="text"
              value={form.actividad}
              onChange={e => setForm(p => ({ ...p, actividad: e.target.value }))}
              placeholder="Ej. Capacitación en manejo de extintores"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-teal-400"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Responsable</label>
            <input
              type="text"
              value={form.responsable}
              onChange={e => setForm(p => ({ ...p, responsable: e.target.value }))}
              placeholder="Nombre del responsable"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Mes</label>
            <select
              value={form.mes}
              onChange={e => setForm(p => ({ ...p, mes: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              {MESES.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving || !form.actividad.trim()}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                     text-white font-semibold rounded-lg text-sm transition-colors"
        >
          + Agregar
        </button>
      </form>

      {/* Lista de actividades */}
      {plan.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm">Sin actividades planificadas. Agrega la primera arriba.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plan.map(item => {
            const cfg = PLAN_ESTADO_CFG[item.estado];
            const isEditing = editId === item.id;
            return (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4">
                {isEditing && editForm ? (
                  <div className="space-y-3">
                    <input
                      value={editForm.actividad}
                      onChange={e => setEditForm(p => p ? { ...p, actividad: e.target.value } : p)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                                 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        value={editForm.responsable}
                        onChange={e => setEditForm(p => p ? { ...p, responsable: e.target.value } : p)}
                        placeholder="Responsable"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm
                                   focus:outline-none focus:ring-2 focus:ring-teal-400"
                      />
                      <select
                        value={editForm.mes}
                        onChange={e => setEditForm(p => p ? { ...p, mes: Number(e.target.value) } : p)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm
                                   focus:outline-none focus:ring-2 focus:ring-teal-400"
                      >
                        {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                    <select
                      value={editForm.estado}
                      onChange={e => setEditForm(p => p ? { ...p, estado: e.target.value as SSTPlanItem['estado'] } : p)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm
                                 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_curso">En curso</option>
                      <option value="completado">Completado</option>
                    </select>
                    <input
                      value={editForm.evidencia}
                      onChange={e => setEditForm(p => p ? { ...p, evidencia: e.target.value } : p)}
                      placeholder="Evidencia (ej. acta de capacitación, foto)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                                 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { onUpdate(item.id, editForm); setEditId(null); }}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white
                                   rounded-lg text-xs font-semibold transition-colors"
                      >✓ Guardar</button>
                      <button
                        onClick={() => setEditId(null)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600
                                   rounded-lg text-xs font-semibold transition-colors"
                      >Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {MESES[item.mes - 1]}
                        </span>
                        {item.responsable && (
                          <span className="text-xs text-gray-400">👤 {item.responsable}</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{item.actividad}</p>
                      {item.evidencia && (
                        <p className="text-xs text-gray-500 mt-1">📎 {item.evidencia}</p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditId(item.id); setEditForm(item); }}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600
                                   rounded-lg transition-colors"
                      >✏️</button>
                      <button
                        onClick={() => { if (confirm('¿Eliminar esta actividad?')) onDelete(item.id); }}
                        className="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600
                                   rounded-lg transition-colors"
                      >🗑</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab: Vencimientos ─────────────────────────────────────────────────────────
function TabVencimientos({
  vencimientos,
  saving,
  onAdd,
  onDelete,
}: {
  vencimientos: SSTVencimiento[];
  saving: boolean;
  onAdd: (v: Omit<SSTVencimiento, 'id'>) => void;
  onDelete: (id: string) => void;
}) {
  const empty: Omit<SSTVencimiento, 'id'> = {
    concepto: '', fecha: '', responsable: '', estado: 'vigente',
  };
  const [form, setForm] = useState(empty);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.concepto.trim() || !form.fecha) return;
    const dias = diasParaVencer(form.fecha);
    const estado: SSTVencimiento['estado'] =
      dias < 0 ? 'vencido' : dias <= 30 ? 'proximo' : 'vigente';
    onAdd({ ...form, estado });
    setForm(empty);
  }

  const VencimientoBadge = ({ v }: { v: SSTVencimiento }) => {
    const dias = v.fecha ? diasParaVencer(v.fecha) : null;
    const estado = dias !== null
      ? (dias < 0 ? 'vencido' : dias <= 30 ? 'proximo' : 'vigente')
      : v.estado;
    const cfgMap = {
      vigente: { bg: 'bg-emerald-100', color: 'text-emerald-700', label: 'Vigente' },
      proximo: { bg: 'bg-amber-100',   color: 'text-amber-700',   label: 'Próximo a vencer' },
      vencido: { bg: 'bg-red-100',     color: 'text-red-700',     label: 'Vencido' },
    };
    const cfg = cfgMap[estado];
    return (
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
        {cfg.label}
        {dias !== null && dias >= 0 && dias <= 30 && ` (${dias}d)`}
        {dias !== null && dias < 0 && ` (hace ${Math.abs(dias)}d)`}
      </span>
    );
  };

  const vencidos  = vencimientos.filter(v => v.fecha && diasParaVencer(v.fecha) < 0).length;
  const proximos  = vencimientos.filter(v => v.fecha && diasParaVencer(v.fecha) >= 0 && diasParaVencer(v.fecha) <= 30).length;

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">
        Controla las fechas de cumplimiento de los requisitos periódicos del SG-SST.
      </p>

      {(vencidos > 0 || proximos > 0) && (
        <div className="flex gap-3 flex-wrap">
          {vencidos > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-red-600 font-bold text-lg">{vencidos}</span>
              <span className="text-xs text-red-700">requisito{vencidos > 1 ? 's' : ''} vencido{vencidos > 1 ? 's' : ''}</span>
            </div>
          )}
          {proximos > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-amber-600 font-bold text-lg">{proximos}</span>
              <span className="text-xs text-amber-700">vence{proximos > 1 ? 'n' : ''} en 30 días</span>
            </div>
          )}
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Agregar vencimiento</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Concepto *</label>
            <select
              value={form.concepto}
              onChange={e => setForm(p => ({ ...p, concepto: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">— Seleccionar tipo —</option>
              {SST_VENCIMIENTOS_TIPO.map(t => (
                <option key={t.id} value={t.label}>{t.label}</option>
              ))}
              <option value="__otro">Otro (personalizado)</option>
            </select>
            {form.concepto === '__otro' && (
              <input
                type="text"
                placeholder="Describe el concepto"
                onChange={e => setForm(p => ({ ...p, concepto: e.target.value }))}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha de vencimiento *</label>
            <input
              type="date"
              value={form.fecha}
              onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-teal-400"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Responsable</label>
            <input
              type="text"
              value={form.responsable}
              onChange={e => setForm(p => ({ ...p, responsable: e.target.value }))}
              placeholder="Nombre del responsable"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving || !form.concepto.trim() || !form.fecha}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                     text-white font-semibold rounded-lg text-sm transition-colors"
        >
          + Agregar
        </button>
      </form>

      {/* Lista */}
      {vencimientos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-sm">Sin vencimientos registrados. Agrega el primero arriba.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...vencimientos].sort((a, b) => a.fecha.localeCompare(b.fecha)).map(v => (
            <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-4
                                       flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <VencimientoBadge v={v} />
                </div>
                <p className="text-sm font-semibold text-gray-800">{v.concepto}</p>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                  <span>📅 {fmtDate(v.fecha)}</span>
                  {v.responsable && <span>👤 {v.responsable}</span>}
                </div>
              </div>
              <button
                onClick={() => { if (confirm('¿Eliminar este vencimiento?')) onDelete(v.id); }}
                className="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600
                           rounded-lg transition-colors flex-shrink-0"
              >🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PDF export ─────────────────────────────────────────────────────────────────
function exportarPDF(
  score: ReturnType<typeof calcSSTScore>,
  fase: SSTFase,
  autoevaluacion: Record<string, SSTItemEstado>,
) {
  const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  const estandar = SST_ESTANDARES[fase];
  const semCfg = SST_SEMAFORO_CFG[score.semaforo];

  const filas = estandar.grupos.flatMap(g =>
    g.items.map(item => {
      const e = autoevaluacion[item.id] || '';
      const estadoLabel = ESTADO_CFG[e]?.label ?? 'Sin evaluar';
      const color = e === 'cumple' ? '#10b981' : e === 'parcial' ? '#f59e0b' : e === 'no' ? '#ef4444' : '#94a3b8';
      return `<tr>
        <td>${item.num}</td>
        <td style="max-width:400px">${item.texto}</td>
        <td>${item.puntos}</td>
        <td style="color:${color};font-weight:700">${estadoLabel}</td>
      </tr>`;
    })
  ).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Autoevaluación SG-SST — Res. 0312/2019</title>
<style>
  body{font-family:Arial,sans-serif;padding:30px;color:#1e293b;font-size:12px}
  h1{color:#0F766E;font-size:18px;margin-bottom:4px}
  .sub{color:#475569;font-size:12px;margin-bottom:20px}
  .score{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin-bottom:20px;display:flex;gap:30px;align-items:center}
  .pct{font-size:36px;font-weight:900;color:#0F766E}
  .label{font-size:13px;font-weight:700;color:#0F766E}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:#0F766E;color:#fff;padding:8px 6px;text-align:left}
  td{padding:6px;border-bottom:1px solid #e2e8f0;vertical-align:top}
  tr:nth-child(even){background:#f8fafc}
  .footer{margin-top:24px;font-size:10px;color:#94a3b8}
</style></head><body>
<h1>Autoevaluación SG-SST — Res. 0312/2019</h1>
<div class="sub">${estandar.label} · Generado el ${fecha}</div>
<div class="score">
  <div class="pct">${score.pct}%</div>
  <div>
    <div class="label">${semCfg.label} — ${semCfg.text}</div>
    <div style="color:#475569">Puntaje: ${score.obtenido} / ${score.total} pts</div>
  </div>
</div>
<table>
<thead><tr><th>No.</th><th>Estándar</th><th>Pts</th><th>Estado</th></tr></thead>
<tbody>${filas}</tbody>
</table>
<div class="footer">NormaLis · Res. 0312/2019 · Decreto 1072/2015 — Ministerio de Trabajo Colombia</div>
</body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
}

// ════════════════════════════════════════════════════════════════════════════════
//  Página principal
// ════════════════════════════════════════════════════════════════════════════════
export default function SgSstPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    data, score, loading, saving, error,
    setItemEstado, setFase, marcarTodos,
    addPlanItem, updatePlanItem, deletePlanItem,
    addVencimiento, deleteVencimiento,
  } = useSST(user?.uid ?? null);

  const [tab, setTab] = useState<Tab>('dashboard');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }, []);

  async function handleSetFase(f: SSTFase) {
    if (f === data.fase) return;
    if (!confirm(`¿Cambiar a ${SST_FASE_LABELS[f]}? Esto borrará la autoevaluación actual.`)) return;
    try { await setFase(f); showToast('Fase actualizada.'); }
    catch { showToast('Error al cambiar la fase.', false); }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold
          ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Encabezado */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">SG-SST</h2>
          <p className="text-sm text-gray-500 mt-1">
            Sistema de Gestión de Seguridad y Salud en el Trabajo · Res. 0312/2019
          </p>
        </div>
        <button
          onClick={() => exportarPDF(score, data.fase, data.autoevaluacion)}
          className="px-3 py-2 bg-white border border-gray-200 hover:border-gray-300
                     text-gray-600 rounded-xl text-sm font-medium transition-colors flex-shrink-0"
        >
          📄 PDF
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Score banner */}
      <div className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-4
        ${score.semaforo === 'aceptable'
          ? 'bg-emerald-50 border-emerald-200'
          : score.semaforo === 'moderado'
          ? 'bg-amber-50 border-amber-200'
          : 'bg-red-50 border-red-200'}`}>
        <div className={`text-4xl font-black
          ${score.semaforo === 'aceptable' ? 'text-emerald-600'
            : score.semaforo === 'moderado' ? 'text-amber-600'
            : 'text-red-600'}`}>
          {score.pct}%
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-800">{score.label}</p>
          <p className="text-xs text-gray-500">
            {SST_FASE_LABELS[data.fase]} · {score.obtenido}/{score.total} pts
          </p>
        </div>
        {saving && (
          <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 min-w-max px-3 py-2 rounded-lg text-xs font-semibold transition-all
              ${tab === t.value
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Contenido de la tab activa */}
      {tab === 'dashboard' && (
        <TabDashboard
          score={score}
          fase={data.fase}
          autoevaluacion={data.autoevaluacion}
          onFaseChange={handleSetFase}
        />
      )}
      {tab === 'autoevaluacion' && (
        <TabAutoevaluacion
          fase={data.fase}
          autoevaluacion={data.autoevaluacion}
          saving={saving}
          onItemChange={async (id, estado) => {
            try { await setItemEstado(id, estado); }
            catch { showToast('Error al guardar.', false); }
          }}
          onMarcarTodos={async (estado) => {
            try { await marcarTodos(estado); showToast(estado ? 'Todos marcados.' : 'Evaluación limpiada.'); }
            catch { showToast('Error.', false); }
          }}
        />
      )}
      {tab === 'plan' && (
        <TabPlan
          plan={data.plan}
          saving={saving}
          onAdd={async (item) => {
            try { await addPlanItem(item); showToast('Actividad agregada.'); }
            catch { showToast('Error al agregar.', false); }
          }}
          onUpdate={async (id, changes) => {
            try { await updatePlanItem(id, changes); showToast('Actividad actualizada.'); }
            catch { showToast('Error al actualizar.', false); }
          }}
          onDelete={async (id) => {
            try { await deletePlanItem(id); showToast('Actividad eliminada.'); }
            catch { showToast('Error al eliminar.', false); }
          }}
        />
      )}
      {tab === 'vencimientos' && (
        <TabVencimientos
          vencimientos={data.vencimientos}
          saving={saving}
          onAdd={async (v) => {
            try { await addVencimiento(v); showToast('Vencimiento agregado.'); }
            catch { showToast('Error al agregar.', false); }
          }}
          onDelete={async (id) => {
            try { await deleteVencimiento(id); showToast('Vencimiento eliminado.'); }
            catch { showToast('Error al eliminar.', false); }
          }}
        />
      )}

      {/* Footer legal */}
      <p className="mt-8 text-xs text-gray-400 text-center">
        Res. 0312/2019 · Decreto 1072/2015 · Ministerio de Trabajo Colombia · NormaLis
      </p>
    </div>
  );
}
