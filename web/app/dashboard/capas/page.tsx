'use client';

/**
 * web/app/dashboard/capas/page.tsx
 * Módulo CAPAs — Plan de Mejoramiento / Acciones Correctivas y Preventivas
 * Base legal: Dec. 1011/2006 Art. 34 · Res. 256/2016 · Ciclo PAMEC
 */

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useCapas } from '@/lib/useCapas';
import type { Capa, CapaEstado } from '@/lib/capaTypes';
import { CAPA_ESTADO_CFG, CAPA_ORIGEN_LABELS } from '@/lib/capaTypes';

// ── Helpers de fecha ─────────────────────────────────────
function fmtDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtTimestamp(ts: { seconds: number } | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts.seconds * 1000).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short',
  });
}

// ── Badge de estado ──────────────────────────────────────
function EstadoBadge({ capa }: { capa: Capa }) {
  if (capa._vencida) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold
                       bg-red-100 text-red-700">
        ⚠ Vencida
      </span>
    );
  }
  const cfg = CAPA_ESTADO_CFG[capa.estado as CapaEstado] ?? CAPA_ESTADO_CFG.abierta;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold
                     ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ── Chip días restantes ──────────────────────────────────
function DiasChip({ capa }: { capa: Capa }) {
  const d = capa._diasRestantes;
  if (d === null || d === undefined || capa.estado === 'cerrada') return null;
  const urgent = d < 0 || d <= 3;
  const label  = d < 0 ? `Venció hace ${Math.abs(d)}d` : d === 0 ? 'Vence hoy' : `${d}d restantes`;
  return (
    <span className={`text-xs font-semibold ${urgent ? 'text-red-500' : 'text-amber-600'}`}>
      {d < 0 ? '⚠' : d <= 3 ? '🔴' : '⏱'} {label}
    </span>
  );
}

// ── KPI Card ─────────────────────────────────────────────
function KpiCard({ label, value, sub, colorClass }: {
  label: string; value: number; sub?: string; colorClass: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-1">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ── Modal de cierre ──────────────────────────────────────
function CierreModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: (evidencia: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [evidencia, setEvidencia] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Cerrar CAPA</h3>
        <p className="text-sm text-gray-500 mb-4">
          Describe la evidencia que demuestra que la acción correctiva fue implementada.
        </p>
        <textarea
          rows={4}
          value={evidencia}
          onChange={e => setEvidencia(e.target.value)}
          placeholder="Ej. Se capacitó al personal el 15/07/2026, se adjunta acta de asistencia…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none
                     focus:outline-none focus:ring-2 focus:ring-teal-400 mb-4"
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700
                       rounded-lg text-sm font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => { if (evidencia.trim()) onConfirm(evidencia); }}
            disabled={loading || !evidencia.trim()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50
                       text-white rounded-lg text-sm font-semibold transition-colors
                       flex items-center gap-2"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            ✅ Confirmar cierre
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Fila de CAPA ─────────────────────────────────────────
function CapaRow({
  capa,
  onIniciar,
  onCerrar,
}: {
  capa: Capa;
  onIniciar: (id: string) => void;
  onCerrar: (id: string) => void;
}) {
  const origenLabel = CAPA_ORIGEN_LABELS[capa.origen] ?? capa.origen;

  return (
    <div className={`bg-white rounded-xl border p-4 transition-shadow hover:shadow-md
                    ${capa._vencida ? 'border-red-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-4">
        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
              {capa.numero}
            </span>
            <EstadoBadge capa={capa} />
            {capa.origen && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {origenLabel}
              </span>
            )}
          </div>

          <p className="text-sm font-bold text-gray-800 mb-1 line-clamp-2">
            {capa.descripcion || '(sin descripción)'}
          </p>
          {capa.accionCorrectiva && (
            <p className="text-xs text-gray-500 mb-2 line-clamp-1">
              ↳ {capa.accionCorrectiva}
            </p>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
            {capa.responsable && <span>👤 {capa.responsable}</span>}
            {capa.area         && <span>📍 {capa.area}</span>}
            <span>📅 Límite: {fmtDate(capa.fechaLimite)}</span>
            <DiasChip capa={capa} />
            <span>Creada: {fmtTimestamp(capa.fechaCreacion as { seconds: number } | null)}</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {capa.estado !== 'cerrada' && (
            <Link
              href={`/dashboard/capas/${capa.id}`}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700
                         rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
            >
              ✏️ Editar
            </Link>
          )}
          {capa.estado === 'abierta' && (
            <button
              onClick={() => onIniciar(capa.id)}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700
                         border border-blue-200 rounded-lg text-xs font-semibold
                         transition-colors whitespace-nowrap"
            >
              ▶ Iniciar
            </button>
          )}
          {capa.estado === 'en_progreso' && (
            <button
              onClick={() => onCerrar(capa.id)}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700
                         border border-emerald-200 rounded-lg text-xs font-semibold
                         transition-colors whitespace-nowrap"
            >
              ✅ Cerrar
            </button>
          )}
          {capa.estado === 'cerrada' && (
            <Link
              href={`/dashboard/capas/${capa.id}`}
              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500
                         rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
            >
              👁 Ver
            </Link>
          )}
        </div>
      </div>

      {/* Evidencia de cierre */}
      {capa.estado === 'cerrada' && capa.evidencia && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-emerald-700">Evidencia de cierre:</span>{' '}
            {capa.evidencia}
          </p>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
//  Página principal
// ════════════════════════════════════════════════
type FiltroEstado = 'todas' | 'abierta' | 'en_progreso' | 'cerrada' | 'vencidas';

const FILTROS: { value: FiltroEstado; label: string }[] = [
  { value: 'todas',       label: 'Todas'       },
  { value: 'abierta',     label: 'Abiertas'    },
  { value: 'en_progreso', label: 'En Progreso' },
  { value: 'cerrada',     label: 'Cerradas'    },
  { value: 'vencidas',    label: 'Vencidas'    },
];

export default function CapasPage() {
  const { user, nit, loading: authLoading } = useAuth();
  const { capas, loading, error, stats, iniciarCapa, cerrarCapa } = useCapas(
    user?.uid ?? null,
    nit || null,
  );

  const [filtro,    setFiltro]    = useState<FiltroEstado>('todas');
  const [busqueda,  setBusqueda]  = useState('');
  const [cierreId,  setCierreId]  = useState<string | null>(null);
  const [cierreLoading, setCierreLoading] = useState(false);
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Filtrar lista
  const capasVistas = useMemo(() => {
    let lista = [...capas];
    if      (filtro === 'vencidas')    lista = lista.filter(c => c._vencida);
    else if (filtro !== 'todas')       lista = lista.filter(c => c.estado === filtro);
    if (busqueda) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(c =>
        c.descripcion?.toLowerCase().includes(q) ||
        c.responsable?.toLowerCase().includes(q) ||
        c.area?.toLowerCase().includes(q)        ||
        c.numero?.toLowerCase().includes(q)
      );
    }
    return lista;
  }, [capas, filtro, busqueda]);

  // Acciones
  async function handleIniciar(id: string) {
    try {
      await iniciarCapa(id);
      showToast('CAPA iniciada correctamente.');
    } catch {
      showToast('Error al iniciar la CAPA.', false);
    }
  }

  async function handleCerrar(evidencia: string) {
    if (!cierreId) return;
    setCierreLoading(true);
    try {
      await cerrarCapa(cierreId, evidencia);
      showToast('CAPA cerrada exitosamente.');
      setCierreId(null);
    } catch {
      showToast('Error al cerrar la CAPA.', false);
    } finally {
      setCierreLoading(false);
    }
  }

  // PDF Plan de Mejoramiento
  function exportarPDF() {
    const fecha = new Date().toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const filas = capas.map(c => {
      const estado = c._vencida ? 'VENCIDA' : (c.estado ?? 'abierta').toUpperCase().replace('_', ' ');
      const color  = estado === 'CERRADA' ? '#10b981' : estado.includes('VENC') ? '#ef4444' : '#f59e0b';
      return `<tr>
        <td>${c.numero ?? ''}</td>
        <td>${(c.descripcion ?? '').substring(0, 80)}</td>
        <td>${c.accionCorrectiva ?? '—'}</td>
        <td>${c.responsable ?? '—'}</td>
        <td>${c.fechaLimite ?? '—'}</td>
        <td style="color:${color};font-weight:700">${estado}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Plan de Mejoramiento</title>
<style>
  body{font-family:Arial,sans-serif;padding:30px;color:#1e293b}
  h1{color:#00A896;font-size:20px}h2{font-size:14px;color:#475569;font-weight:400;margin-top:4px}
  table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px}
  th{background:#00A896;color:#fff;padding:10px 8px;text-align:left;border:1px solid #00A896}
  td{padding:8px;border:1px solid #e2e8f0}tr:nth-child(even){background:#f8fafc}
  .footer{margin-top:30px;font-size:11px;color:#94a3b8}
</style></head><body>
<h1>&#x1F4CB; Plan de Mejoramiento — PAMEC</h1>
<h2>Generado el ${fecha}</h2>
<table><thead><tr>
  <th>N°</th><th>No Conformidad</th><th>Acción Correctiva</th>
  <th>Responsable</th><th>Fecha Límite</th><th>Estado</th>
</tr></thead><tbody>${filas}</tbody></table>
<div class="footer">Documento generado por NormaLis · Dec. 1011/2006 Art. 34 · Res. 256/2016</div>
</body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  }

  // Loading
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold
          ${toast.ok
            ? 'bg-emerald-600 text-white'
            : 'bg-red-600 text-white'}`}>
          {toast.ok ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Encabezado */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Plan de Mejoramiento — CAPAs</h2>
          <p className="text-sm text-gray-500 mt-1">
            Acciones Correctivas y Preventivas · Dec. 1011/2006 Art. 34 · Res. 256/2016
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {capas.length > 0 && (
            <button
              onClick={exportarPDF}
              className="px-3 py-2 bg-white border border-gray-200 hover:border-gray-300
                         text-gray-600 rounded-xl text-sm font-medium transition-colors"
            >
              📄 PDF
            </button>
          )}
          <Link
            href="/dashboard/capas/nueva"
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold
                       rounded-xl text-sm transition-colors"
          >
            + Nueva CAPA
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ⚠️ Error al cargar: {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Total"       value={stats.total}       colorClass="text-gray-800" />
        <KpiCard label="Abiertas"    value={stats.abiertas}    colorClass="text-amber-600" />
        <KpiCard label="En Progreso" value={stats.enProgreso}  colorClass="text-blue-600" />
        <KpiCard label="Cerradas"    value={stats.cerradas}    colorClass="text-emerald-600" />
        <KpiCard label="Vencidas"    value={stats.vencidas}    colorClass="text-red-600"
                 sub={stats.vencidas > 0 ? 'Atención requerida' : undefined} />
      </div>

      {/* Filtros + Búsqueda */}
      <div className="flex flex-wrap gap-2 mb-5 items-center">
        <div className="flex gap-1 flex-wrap">
          {FILTROS.map(f => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${filtro === f.value
                  ? 'bg-teal-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-400'}`}
            >
              {f.label}
              {f.value === 'vencidas' && stats.vencidas > 0 && (
                <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 text-[10px] font-bold">
                  {stats.vencidas}
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Buscar descripción, responsable…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="ml-auto w-60 px-3 py-1.5 border border-gray-200 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
      </div>

      {/* Lista */}
      {capasVistas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {capas.length === 0 ? (
            <>
              <p className="text-4xl mb-3">📋</p>
              <p className="font-semibold text-gray-600 mb-1">Sin CAPAs registradas</p>
              <p className="text-sm mb-4">
                Crea una acción correctiva desde una auditoría o directamente aquí.
              </p>
              <Link
                href="/dashboard/capas/nueva"
                className="inline-flex px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white
                           font-semibold rounded-xl text-sm transition-colors"
              >
                + Crear primera CAPA
              </Link>
            </>
          ) : (
            <p className="text-sm">No hay CAPAs que coincidan con el filtro.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {capasVistas.map(capa => (
            <CapaRow
              key={capa.id}
              capa={capa}
              onIniciar={handleIniciar}
              onCerrar={id => setCierreId(id)}
            />
          ))}
        </div>
      )}

      {capas.length > 0 && (
        <p className="mt-6 text-xs text-gray-400 text-center">
          Ciclo PAMEC · Dec. 1011/2006 Art. 34 · Res. 256/2016 · NormaLis
        </p>
      )}

      {/* Modal de cierre */}
      {cierreId && (
        <CierreModal
          loading={cierreLoading}
          onConfirm={handleCerrar}
          onCancel={() => setCierreId(null)}
        />
      )}
    </div>
  );
}
