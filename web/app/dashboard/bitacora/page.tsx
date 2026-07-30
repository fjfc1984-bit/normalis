'use client';

/**
 * web/app/dashboard/bitacora/page.tsx
 * Bitácora de Gobernanza — registro de auditoría interna
 */

import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useBitacora } from '@/lib/useBitacora';
import {
  BITACORA_MODULOS, MODULO_COLOR, PAGE_SIZE,
} from '@/lib/bitacoraTypes';
import type { BitacoraModulo, BitacoraEntry } from '@/lib/bitacoraTypes';
import type { NuevoRegistro } from '@/lib/useBitacora';
import {
  SectionHeader, LoadingSpinner, Toast, useToast,
  KpiCard, EmptyState,
} from '@/components/ui';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CO') + ' ' +
           d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function todayISO(): string {
  return new Date().toISOString().substring(0, 10);
}

function weekAgoMs(): number {
  return Date.now() - 7 * 24 * 60 * 60 * 1000;
}

// ── Modal nuevo registro ──────────────────────────────────────────────────────
function NuevoRegistroModal({
  onSave, onClose, saving,
}: {
  onSave:  (p: NuevoRegistro) => Promise<void>;
  onClose: () => void;
  saving:  boolean;
}) {
  const [modulo,  setModulo]  = useState<BitacoraModulo>('Sistema');
  const [accion,  setAccion]  = useState('');
  const [detalle, setDetalle] = useState('');

  const INPUT = `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accion.trim()) return;
    await onSave({ modulo, accion: accion.trim(), detalle: detalle.trim() });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-800">Agregar registro manual</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Módulo *</label>
            <select value={modulo} onChange={e => setModulo(e.target.value as BitacoraModulo)} className={INPUT}>
              {BITACORA_MODULOS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Acción *</label>
            <input
              value={accion}
              onChange={e => setAccion(e.target.value)}
              placeholder="Ej: Revisó resultados de auditoría"
              required
              className={INPUT}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Detalle</label>
            <textarea
              value={detalle}
              onChange={e => setDetalle(e.target.value)}
              placeholder="Información adicional (opcional)…"
              rows={3}
              className={`${INPUT} resize-none`}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || !accion.trim()}
              className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                         text-white text-sm font-bold rounded-xl transition-colors"
            >
              {saving ? 'Guardando…' : '✓ Agregar registro'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700
                         text-sm font-semibold rounded-xl transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Fila de la tabla ──────────────────────────────────────────────────────────
function BitacoraRow({ entry, onDelete }: { entry: BitacoraEntry; onDelete: (id: string) => void }) {
  const mc = MODULO_COLOR[entry.modulo] ?? MODULO_COLOR['Otro'];
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDateTime(entry.ts)}</td>
      <td className="px-4 py-3 text-sm font-semibold text-gray-800 truncate max-w-[120px]">{entry.usuario}</td>
      <td className="px-4 py-3">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${mc.bg} ${mc.text}`}>
          {entry.modulo}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">{entry.accion}</td>
      <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">{entry.detalle || '—'}</td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onDelete(entry.id)}
          className="text-gray-200 hover:text-red-400 transition-colors text-sm"
          title="Eliminar"
        >
          🗑
        </button>
      </td>
    </tr>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Página principal
// ════════════════════════════════════════════════════════════════════════════
export default function BitacoraPage() {
  const { user, nombre, loading: authLoading } = useAuth();
  const { entries, loading, add, remove } = useBitacora(user?.uid ?? null, nombre || 'Usuario');
  const { toast, show } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [search,    setSearch]    = useState('');
  const [modFil,    setModFil]    = useState<BitacoraModulo | ''>('');
  const [fechaFil,  setFechaFil]  = useState('');
  const [page,      setPage]      = useState(0);

  // KPIs
  const hoy      = todayISO();
  const semAgo   = weekAgoMs();
  const kpiHoy   = entries.filter(e => e.ts.startsWith(hoy)).length;
  const kpiSem   = entries.filter(e => new Date(e.ts).getTime() >= semAgo).length;
  const kpiUsers = new Set(entries.map(e => e.usuario)).size;

  // Filtrado
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter(e => {
      const matchQ = !q || e.usuario.toLowerCase().includes(q) ||
                          e.accion.toLowerCase().includes(q) ||
                          e.detalle.toLowerCase().includes(q);
      const matchM = !modFil || e.modulo === modFil;
      const matchF = !fechaFil || e.ts.startsWith(fechaFil);
      return matchQ && matchM && matchF;
    });
  }, [entries, search, modFil, fechaFil]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page on filter change
  const handleSearch  = (v: string)  => { setSearch(v);  setPage(0); };
  const handleModFil  = (v: string)  => { setModFil(v as BitacoraModulo | '');  setPage(0); };
  const handleFechaFil= (v: string)  => { setFechaFil(v); setPage(0); };
  const clearFiltros  = () => { setSearch(''); setModFil(''); setFechaFil(''); setPage(0); };

  const handleSave = useCallback(async (payload: NuevoRegistro) => {
    setSaving(true);
    try {
      await add(payload);
      show('Registro agregado.', 'success');
    } catch {
      show('Error al guardar el registro.', 'error');
    } finally {
      setSaving(false);
    }
  }, [add, show]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await remove(id);
      show('Registro eliminado.', 'info');
    } catch {
      show('Error al eliminar.', 'error');
    }
  }, [remove, show]);

  // Exportar CSV
  const exportCSV = useCallback(() => {
    let csv = 'Fecha,Usuario,Módulo,Acción,Detalle\n';
    entries.forEach(e => {
      const row = [fmtDateTime(e.ts), e.usuario, e.modulo, e.accion, e.detalle]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
      csv += row + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `bitacora-normalis-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    show(`CSV exportado (${entries.length} registros).`, 'success');
  }, [entries, show]);

  // Exportar PDF
  const exportPDF = useCallback(() => {
    const sample = entries.slice(0, 100);
    const w = window.open('', '_blank');
    if (!w) return;
    function escH(s: string) {
      return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    const filas = sample.map(e =>
      `<tr>
        <td>${escH(fmtDateTime(e.ts))}</td>
        <td>${escH(e.usuario)}</td>
        <td>${escH(e.modulo)}</td>
        <td>${escH(e.accion)}</td>
        <td>${escH(e.detalle || '—')}</td>
      </tr>`
    ).join('');
    w.document.write(`<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8">
<title>Bitácora de Gobernanza — NormaLis</title>
<style>
  body { font-family: Arial, sans-serif; padding: 30px; font-size: 12px; }
  h1 { color: #0f766e; font-size: 18px; margin-bottom: 4px; }
  .meta { color: #64748b; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f8fafc; padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0; font-size: 11px; color: #64748b; }
  td { padding: 7px 8px; border-bottom: 1px solid #f1f5f9; }
  tr:hover td { background: #f8fafc; }
  @media print { body { padding: 15px; } }
</style>
</head><body>
<h1>📋 Bitácora de Gobernanza</h1>
<p class="meta">NormaLis · Generado: ${new Date().toLocaleString('es-CO')} · Mostrando últimos ${sample.length} registros</p>
<table>
  <thead><tr><th>Fecha y Hora</th><th>Usuario</th><th>Módulo</th><th>Acción</th><th>Detalle</th></tr></thead>
  <tbody>${filas}</tbody>
</table>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }, [entries]);

  if (authLoading || loading) return <LoadingSpinner fullHeight />;

  const INPUT_SM = `px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white
                    focus:outline-none focus:ring-2 focus:ring-teal-400`;

  return (
    <div className="p-6 space-y-6">
      <Toast toast={toast} />

      {showModal && (
        <NuevoRegistroModal
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saving={saving}
        />
      )}

      <SectionHeader
        title="Bitácora de Gobernanza"
        subtitle="Registro de auditoría interna — historial completo de acciones en todos los módulos"
        actions={
          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              disabled={entries.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100
                         hover:bg-gray-200 disabled:opacity-40 text-gray-700
                         text-sm font-semibold rounded-xl transition-colors"
            >
              ⬇️ CSV
            </button>
            <button
              onClick={exportPDF}
              disabled={entries.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100
                         hover:bg-gray-200 disabled:opacity-40 text-gray-700
                         text-sm font-semibold rounded-xl transition-colors"
            >
              🖨️ PDF
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600
                         hover:bg-teal-700 text-white text-sm font-bold
                         rounded-xl transition-colors"
            >
              + Agregar registro
            </button>
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total registros"    value={entries.length} colorClass="text-gray-800" />
        <KpiCard label="Hoy"                value={kpiHoy}         colorClass="text-teal-700"  borderColorClass="border-teal-200" />
        <KpiCard label="Últimos 7 días"     value={kpiSem}         colorClass="text-blue-700"  borderColorClass="border-blue-200" />
        <KpiCard label="Usuarios activos"   value={kpiUsers}       colorClass="text-purple-700" borderColorClass="border-purple-200" />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="🔍 Buscar por usuario, acción o detalle…"
            className={INPUT_SM + ' col-span-1 sm:col-span-1'}
          />
          <select value={modFil} onChange={e => handleModFil(e.target.value)} className={INPUT_SM}>
            <option value="">Todos los módulos</option>
            {BITACORA_MODULOS.map(m => <option key={m}>{m}</option>)}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={fechaFil}
              onChange={e => handleFechaFil(e.target.value)}
              className={INPUT_SM + ' flex-1'}
            />
            {(search || modFil || fechaFil) && (
              <button
                onClick={clearFiltros}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600
                           text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                ✕ Limpiar
              </button>
            )}
          </div>
        </div>
        {filtered.length !== entries.length && (
          <p className="text-xs text-gray-400 mt-2">
            Mostrando {filtered.length} de {entries.length} registros
          </p>
        )}
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Sin registros en la bitácora"
          description={
            search || modFil || fechaFil
              ? 'No hay registros con los filtros aplicados.'
              : 'Los registros de actividad aparecerán aquí automáticamente. También puedes agregar entradas manuales.'
          }
          action={
            !search && !modFil && !fechaFil
              ? <button
                  onClick={() => setShowModal(true)}
                  className="mt-3 px-4 py-2 bg-teal-600 hover:bg-teal-700
                             text-white text-sm font-bold rounded-xl transition-colors"
                >
                  + Agregar primer registro
                </button>
              : undefined
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Fecha y hora', 'Usuario', 'Módulo', 'Acción', 'Detalle', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(e => (
                  <BitacoraRow key={e.id} entry={e} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
              <span>
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length} registros
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 0}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white
                             hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed
                             text-xs font-semibold transition-colors"
                >
                  ← Anterior
                </button>
                <span className="px-3 py-1.5 text-xs">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white
                             hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed
                             text-xs font-semibold transition-colors"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Bitácora de Gobernanza · NormaLis — últimos 500 registros cargados
      </p>
    </div>
  );
}
