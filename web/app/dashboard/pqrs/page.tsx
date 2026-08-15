'use client';

/**
 * web/app/dashboard/pqrs/page.tsx
 * Módulo PQRS — Peticiones, Quejas, Reclamos, Sugerencias y Felicitaciones
 * Base legal: Res. 13437/1991 · Res. 3100/2019 Est. 5
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { usePQRS } from '@/lib/usePQRS';
import {
  PQRS_TIPOS, PQRS_ESTADOS, PQRS_AREAS,
  TIPO_COLOR, ESTADO_COLOR,
} from '@/lib/pqrsTypes';
import type { PQRSTipo, PQRSEstado, PQRSItem } from '@/lib/pqrsTypes';
import type { NuevaPQRS } from '@/lib/usePQRS';
import {
  SectionHeader, LoadingSpinner, Toast, useToast,
  KpiCard, EmptyState, StatusBadge,
} from '@/components/ui';

// ── Modal nueva PQRS ──────────────────────────────────────────────────────────
function NuevaPQRSModal({
  onSave,
  onClose,
  saving,
}: {
  onSave:  (p: NuevaPQRS) => Promise<void>;
  onClose: () => void;
  saving:  boolean;
}) {
  const [tipo,   setTipo]   = useState<PQRSTipo>('Petición');
  const [nombre, setNombre] = useState('');
  const [desc,   setDesc]   = useState('');
  const [area,   setArea]   = useState('');

  const INPUT = `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !desc.trim()) return;
    await onSave({ tipo, nombre: nombre.trim(), desc: desc.trim(), area });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-800">Nueva PQRS</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Tipo de solicitud *
            </label>
            <div className="flex flex-wrap gap-2">
              {PQRS_TIPOS.map(t => {
                const c = TIPO_COLOR[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all
                      ${tipo === t
                        ? `${c.bg} ${c.text} border-current`
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Nombre del solicitante *
            </label>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej. María González"
              required
              className={INPUT}
            />
          </div>

          {/* Área */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Área / Servicio
            </label>
            <select value={area} onChange={e => setArea(e.target.value)} className={INPUT}>
              <option value="">Sin especificar</option>
              {PQRS_AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Descripción *
            </label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Describa detalladamente la petición, queja, reclamo, sugerencia o felicitación…"
              required
              rows={4}
              className={`${INPUT} resize-none`}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || !nombre.trim() || !desc.trim()}
              className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                         text-white text-sm font-bold rounded-xl transition-colors"
            >
              {saving ? 'Guardando…' : '✓ Registrar PQRS'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700
                         text-sm font-semibold rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tarjeta de PQRS ────────────────────────────────────────────────────────────
function PQRSCard({
  item,
  onEstado,
  onDelete,
}: {
  item:     PQRSItem;
  onEstado: (id: string, e: PQRSEstado) => void;
  onDelete: (id: string) => void;
}) {
  const tc = TIPO_COLOR[item.tipo];
  const ec = ESTADO_COLOR[item.estado];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4 hover:shadow-sm transition-shadow">
      {/* Tipo pill */}
      <div className="flex-shrink-0 pt-0.5">
        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${tc.bg} ${tc.text}`}>
          {item.tipo}
        </span>
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{item.nombre}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.desc}</p>
        <p className="text-xs text-gray-400 mt-1.5">
          {item.area && <span>📍 {item.area} · </span>}
          {item.fecha}
        </p>
      </div>

      {/* Estado + acciones */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ec.bg} ${ec.text}`}>
          {item.estado}
        </span>
        <select
          value={item.estado}
          onChange={e => onEstado(item.id, e.target.value as PQRSEstado)}
          className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white
                     focus:outline-none focus:ring-1 focus:ring-teal-400 cursor-pointer"
        >
          {PQRS_ESTADOS.map(s => <option key={s}>{s}</option>)}
        </select>
        <button
          onClick={() => onDelete(item.id)}
          className="text-xs text-gray-300 hover:text-red-400 transition-colors"
          title="Eliminar PQRS"
        >
          🗑
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Página principal
// ════════════════════════════════════════════════════════════════════════════
export default function PQRSPage() {
  const { user, loading: authLoading } = useAuth();
  const { items, loading, add, cambiarEstado, remove } = usePQRS(user?.uid ?? null);
  const { toast, show } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [filtro, setFiltro]       = useState<PQRSEstado | 'Todos'>('Todos');

  // KPIs
  const total     = items.length;
  const pendientes = items.filter(p => p.estado === 'Pendiente').length;
  const enProceso  = items.filter(p => p.estado === 'En Proceso').length;
  const cerradas   = items.filter(p => p.estado === 'Cerrada').length;

  // Lista filtrada
  const filtradas = filtro === 'Todos'
    ? items
    : items.filter(p => p.estado === filtro);

  const handleSave = useCallback(async (payload: NuevaPQRS) => {
    setSaving(true);
    try {
      await add(payload);
      show('PQRS registrada correctamente.', 'success');
    } catch {
      show('Error al guardar la PQRS.', 'error');
    } finally {
      setSaving(false);
    }
  }, [add, show]);

  const handleEstado = useCallback(async (id: string, estado: PQRSEstado) => {
    try {
      await cambiarEstado(id, estado);
      show(`Estado actualizado a "${estado}".`, 'success');
    } catch {
      show('Error al actualizar el estado.', 'error');
    }
  }, [cambiarEstado, show]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await remove(id);
      show('PQRS eliminada.', 'info');
    } catch {
      show('Error al eliminar.', 'error');
    }
  }, [remove, show]);

  const exportarPDF = useCallback(() => {
    const w = window.open('', '_blank');
    if (!w) return;
    const filas = items.map(p =>
      `<tr>
        <td>${p.tipo}</td>
        <td>${p.nombre}</td>
        <td>${p.desc}</td>
        <td>${p.area || '—'}</td>
        <td>${p.estado}</td>
        <td>${p.fecha}</td>
      </tr>`
    ).join('');
    w.document.write(`<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8">
<title>Informe PQRS</title>
<style>
  body { font-family: Arial, sans-serif; padding: 30px; font-size: 13px; }
  h1 { color: #0f766e; font-size: 18px; margin-bottom: 4px; }
  .meta { color: #64748b; margin-bottom: 20px; font-size: 12px; }
  .kpis { display: flex; gap: 24px; margin-bottom: 20px; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
         padding: 10px 16px; text-align: center; }
  .kpi-v { font-size: 22px; font-weight: 800; color: #0f766e; }
  .kpi-l { font-size: 11px; color: #64748b; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #0f766e; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; }
  td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  @media print { body { padding: 15px; } }
</style>
</head><body>
<h1>Informe de PQRS</h1>
<p class="meta">Generado el ${new Date().toLocaleDateString('es-CO', { dateStyle: 'long' })}</p>
<div class="kpis">
  <div class="kpi"><div class="kpi-v">${total}</div><div class="kpi-l">Total</div></div>
  <div class="kpi"><div class="kpi-v">${pendientes}</div><div class="kpi-l">Pendientes</div></div>
  <div class="kpi"><div class="kpi-v">${enProceso}</div><div class="kpi-l">En Proceso</div></div>
  <div class="kpi"><div class="kpi-v">${cerradas}</div><div class="kpi-l">Cerradas</div></div>
</div>
<table>
  <thead><tr><th>Tipo</th><th>Solicitante</th><th>Descripción</th><th>Área</th><th>Estado</th><th>Fecha</th></tr></thead>
  <tbody>${filas}</tbody>
</table>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }, [items, total, pendientes, enProceso, cerradas]);

  if (authLoading || loading) return <LoadingSpinner fullHeight />;

  return (
    <div className="p-6 space-y-6">
      <Toast toast={toast} />

      {showModal && (
        <NuevaPQRSModal
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saving={saving}
        />
      )}

      <SectionHeader
        title="PQRS"
        subtitle="Gestión de Peticiones, Quejas, Reclamos, Sugerencias y Felicitaciones · Res. 13437/1991"
        actions={
          <div className="flex gap-2">
            <button
              onClick={exportarPDF}
              disabled={total === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100
                         hover:bg-gray-200 disabled:opacity-40 text-gray-700
                         text-sm font-semibold rounded-xl transition-colors"
            >
              🖨️ Informe
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600
                         hover:bg-teal-700 text-white text-sm font-bold
                         rounded-xl transition-colors"
            >
              + Nueva PQRS
            </button>
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total PQRS"   value={total}      colorClass="text-gray-800" />
        <KpiCard label="Pendientes"   value={pendientes} colorClass="text-amber-700"   borderColorClass="border-amber-200" />
        <KpiCard label="En Proceso"   value={enProceso}  colorClass="text-blue-700"    borderColorClass="border-blue-200" />
        <KpiCard label="Cerradas"     value={cerradas}   colorClass="text-emerald-700" borderColorClass="border-emerald-200" />
      </div>

      {/* Filtros por estado */}
      {total > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(['Todos', ...PQRS_ESTADOS] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors
                ${filtro === f
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f}
              {f !== 'Todos' && (
                <span className="ml-1.5 opacity-70">
                  ({items.filter(p => p.estado === f).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      {filtradas.length === 0 ? (
        <EmptyState
          icon="📬"
          title={filtro === 'Todos' ? 'Sin PQRS registradas' : `Sin PQRS "${filtro}"`}
          description={
            filtro === 'Todos'
              ? 'Registra la primera PQRS con el botón "+ Nueva PQRS".'
              : 'No hay registros con este estado.'
          }
          action={
            filtro === 'Todos'
              ? <button
                  onClick={() => setShowModal(true)}
                  className="mt-3 px-4 py-2 bg-teal-600 hover:bg-teal-700
                             text-white text-sm font-bold rounded-xl transition-colors"
                >
                  + Nueva PQRS
                </button>
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtradas.map(item => (
            <PQRSCard
              key={item.id}
              item={item}
              onEstado={handleEstado}
              onDelete={handleDelete}
            />
          ))}
          <p className="text-xs text-gray-400 text-center pt-1">
            {filtradas.length} registro{filtradas.length !== 1 ? 's' : ''}
            {filtro !== 'Todos' ? ` con estado "${filtro}"` : ' en total'}
          </p>
        </div>
      )}

      {/* Nota legal */}
      <p className="text-xs text-gray-400 text-center">
        Resolución 13437/1991 — Derechos del Paciente · Resolución 1732/2026 Est. 5 · NormaLis
      </p>
    </div>
  );
}
