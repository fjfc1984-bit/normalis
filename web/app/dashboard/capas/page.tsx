'use client';

/**
 * web/app/dashboard/capas/page.tsx
 * Módulo CAPAs — Plan de Mejoramiento / Acciones Correctivas y Preventivas
 * Base legal: Dec. 1011/2006 Art. 34 · Res. 256/2016 · Ciclo PAMEC
 *
 * Ciclo de estados: abierta → en_progreso → implementada → cerrada.
 * Una CAPA nunca cierra directo desde "en progreso": primero se marca
 * implementada (evidencia + plazo de verificación) y solo se cierra tras
 * confirmar, con evidencia posterior, que el hallazgo no reincidió.
 */

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useCapas } from '@/lib/useCapas';
import type { Capa, CapaEstado, CapaVeredicto } from '@/lib/capaTypes';
import { CAPA_ESTADO_CFG, CAPA_ORIGEN_LABELS } from '@/lib/capaTypes';
import {
  KpiCard, Toast, useToast, EmptyState,
  SectionHeader, LoadingSpinner,
} from '@/components/ui';
import { ImplementarModal } from './ImplementarModal';
import { VerificarEficaciaModal } from './VerificarEficaciaModal';

// ── Helpers de fecha ─────────────────────────────────────
function fmtDate(iso: string | undefined | null): string {
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

// Fecha de referencia mostrada en la fila: límite original mientras está
// abierta/en progreso, fecha de verificación mientras está implementada.
function fechaRefCapa(capa: Capa): string | undefined {
  return capa.estado === 'implementada' ? (capa.fechaVerificacion ?? undefined) : capa.fechaLimite;
}

// ── Badge de estado ──────────────────────────────────────
function EstadoBadge({ capa }: { capa: Capa }) {
  if (capa._vencida) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold
                       bg-red-100 text-red-700">
        ⚠ {capa.estado === 'implementada' ? 'Verificación vencida' : 'Vencida'}
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
  const esVerif  = capa.estado === 'implementada';
  const urgent   = d < 0 || d <= 3;
  const label    = d < 0
    ? `${esVerif ? 'Verificación vencida hace' : 'Venció hace'} ${Math.abs(d)}d`
    : d === 0
      ? (esVerif ? 'Verificar hoy' : 'Vence hoy')
      : `${d}d ${esVerif ? 'para verificar' : 'restantes'}`;
  return (
    <span className={`text-xs font-semibold ${urgent ? 'text-red-500' : 'text-amber-600'}`}>
      {d < 0 ? '⚠' : d <= 3 ? '🔴' : '⏱'} {label}
    </span>
  );
}

// ── Fila de CAPA ─────────────────────────────────────────
function CapaRow({
  capa,
  onIniciar,
  onImplementar,
  onVerificar,
}: {
  capa: Capa;
  onIniciar: (id: string) => void;
  onImplementar: (id: string) => void;
  onVerificar: (id: string) => void;
}) {
  const origenLabel = CAPA_ORIGEN_LABELS[capa.origen] ?? capa.origen;
  const esVerif = capa.estado === 'implementada';

  return (
    <div className={`bg-white rounded-xl border p-4 transition-shadow hover:shadow-md
                    ${capa._vencida ? 'border-red-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-4">
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
            {!!capa.reincidencias && (
              <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                ⚠ {capa.reincidencias} reincidencia{capa.reincidencias > 1 ? 's' : ''}
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
            <span>{esVerif ? '🔍 Verificar' : '📅 Límite'}: {fmtDate(fechaRefCapa(capa))}</span>
            <DiasChip capa={capa} />
            <span>Creada: {fmtTimestamp(capa.fechaCreacion as { seconds: number } | null)}</span>
          </div>
        </div>

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
              onClick={() => onImplementar(capa.id)}
              className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700
                         border border-violet-200 rounded-lg text-xs font-semibold
                         transition-colors whitespace-nowrap"
            >
              ✔️ Marcar Implementada
            </button>
          )}
          {capa.estado === 'implementada' && (
            <button
              onClick={() => onVerificar(capa.id)}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700
                         border border-blue-200 rounded-lg text-xs font-semibold
                         transition-colors whitespace-nowrap"
            >
              🔍 Verificar Eficacia
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

      {capa.evidenciaImplementacion && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-violet-700">Evidencia de implementación:</span>{' '}
            {capa.evidenciaImplementacion}
          </p>
        </div>
      )}
      {capa.veredictoVerificacion && (
        <div className={`mt-2 pt-2 ${capa.evidenciaImplementacion ? '' : 'border-t border-gray-100'}`}>
          <p className="text-xs text-gray-500">
            <span className={`font-semibold ${capa.veredictoVerificacion === 'eficaz' ? 'text-emerald-700' : 'text-amber-700'}`}>
              Última verificación ({capa.veredictoVerificacion === 'eficaz' ? '✅ eficaz' : '🔁 reincidencia'}):
            </span>{' '}
            {capa.evidenciaVerificacion}
          </p>
        </div>
      )}
      {!capa.evidenciaImplementacion && capa.estado === 'cerrada' && capa.evidencia && (
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
type FiltroEstado = 'todas' | 'abierta' | 'en_progreso' | 'implementada' | 'cerrada' | 'vencidas';

const FILTROS: { value: FiltroEstado; label: string }[] = [
  { value: 'todas',        label: 'Todas'        },
  { value: 'abierta',      label: 'Abiertas'     },
  { value: 'en_progreso',  label: 'En Progreso'  },
  { value: 'implementada', label: 'Por Verificar' },
  { value: 'cerrada',      label: 'Cerradas'     },
  { value: 'vencidas',     label: 'Vencidas'     },
];

export default function CapasPage() {
  const { user, nit, loading: authLoading } = useAuth();
  const { capas, loading, error, stats, iniciarCapa, implementarCapa, verificarEficacia } = useCapas(
    user?.uid ?? null,
    nit || null,
  );

  const [filtro,            setFiltro]            = useState<FiltroEstado>('todas');
  const [busqueda,          setBusqueda]          = useState('');
  const [implementarId,     setImplementarId]     = useState<string | null>(null);
  const [implementarLoading, setImplementarLoading] = useState(false);
  const [verificarId,       setVerificarId]       = useState<string | null>(null);
  const [verificarLoading,  setVerificarLoading]  = useState(false);
  const { toast, show: showToast } = useToast();

  // Filtrar lista
  const capasVistas = useMemo(() => {
    let lista = [...capas];
    if      (filtro === 'vencidas') lista = lista.filter(c => c._vencida);
    else if (filtro !== 'todas')    lista = lista.filter(c => c.estado === filtro);
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

  const capaEnVerificacion = useMemo(
    () => capas.find(c => c.id === verificarId) ?? null,
    [capas, verificarId],
  );

  async function handleIniciar(id: string) {
    try {
      await iniciarCapa(id);
      showToast('CAPA iniciada correctamente.');
    } catch {
      showToast('Error al iniciar la CAPA.', 'error');
    }
  }

  const handleImplementar = useCallback(async (evidencia: string, dias: number) => {
    if (!implementarId) return;
    setImplementarLoading(true);
    try {
      await implementarCapa(implementarId, evidencia, dias);
      showToast('Acción marcada como implementada. Se recordará verificar su eficacia.');
      setImplementarId(null);
    } catch {
      showToast('Error al marcar la CAPA como implementada.', 'error');
    } finally {
      setImplementarLoading(false);
    }
  }, [implementarId, implementarCapa, showToast]);

  const handleVerificar = useCallback(async (evidencia: string, veredicto: CapaVeredicto) => {
    if (!verificarId) return;
    setVerificarLoading(true);
    try {
      await verificarEficacia(verificarId, evidencia, veredicto);
      showToast(
        veredicto === 'eficaz'
          ? 'CAPA cerrada — eficacia verificada con evidencia posterior.'
          : 'Reincidencia registrada: la causa raíz no fue eliminada. La CAPA se reabrió.',
        veredicto === 'eficaz' ? 'success' : 'error',
      );
      setVerificarId(null);
    } catch {
      showToast('Error al registrar la verificación.', 'error');
    } finally {
      setVerificarLoading(false);
    }
  }, [verificarId, verificarEficacia, showToast]);

  function exportarPDF() {
    const fecha = new Date().toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const ESTADO_LABEL: Record<string, string> = {
      abierta: 'ABIERTA', en_progreso: 'EN PROGRESO', implementada: 'POR VERIFICAR', cerrada: 'CERRADA',
    };
    const filas = capas.map(c => {
      const estado = c._vencida ? 'VENCIDA' : (ESTADO_LABEL[c.estado] ?? (c.estado ?? 'abierta').toUpperCase().replace('_', ' '));
      const reinc  = c.reincidencias ? ` (${c.reincidencias} reincidencia${c.reincidencias > 1 ? 's' : ''})` : '';
      const color  = estado === 'CERRADA' ? '#10b981' : estado.includes('VENC') ? '#ef4444' : '#f59e0b';
      return `<tr>
        <td>${c.numero ?? ''}</td>
        <td>${(c.descripcion ?? '').substring(0, 80)}</td>
        <td>${c.accionCorrectiva ?? '—'}</td>
        <td>${c.responsable ?? '—'}</td>
        <td>${c.fechaLimite ?? '—'}</td>
        <td style="color:${color};font-weight:700">${estado}${reinc}</td>
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
<h1>Plan de Mejoramiento — PAMEC</h1>
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

  if (authLoading || loading) return <LoadingSpinner fullHeight />;

  return (
    <div className="p-6 max-w-5xl mx-auto">

      <Toast toast={toast} />

      <SectionHeader
        title="Plan de Mejoramiento — CAPAs"
        subtitle="Acciones Correctivas y Preventivas · Dec. 1011/2006 Art. 34 · Res. 256/2016"
        actions={
          <>
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
          </>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ⚠️ Error al cargar: {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-6">
        <KpiCard label="Total"        value={stats.total}        colorClass="text-gray-800" />
        <KpiCard label="Abiertas"     value={stats.abiertas}     colorClass="text-amber-600" />
        <KpiCard label="En Progreso"  value={stats.enProgreso}   colorClass="text-blue-600" />
        <KpiCard label="Por Verificar" value={stats.porVerificar} colorClass="text-violet-600" />
        <KpiCard label="Cerradas"     value={stats.cerradas}     colorClass="text-emerald-600" />
        <KpiCard
          label="Vencidas"
          value={stats.vencidas}
          colorClass="text-red-600"
          sub={stats.vencidas > 0 ? 'Atención requerida' : undefined}
        />
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
        <EmptyState
          icon="📋"
          title={capas.length === 0 ? 'Sin CAPAs registradas' : 'Sin resultados'}
          description={
            capas.length === 0
              ? 'Crea una acción correctiva desde una auditoría o directamente aquí.'
              : 'No hay CAPAs que coincidan con el filtro.'
          }
          action={
            capas.length === 0 ? (
              <Link
                href="/dashboard/capas/nueva"
                className="inline-flex px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white
                           font-semibold rounded-xl text-sm transition-colors"
              >
                + Crear primera CAPA
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {capasVistas.map(capa => (
            <CapaRow
              key={capa.id}
              capa={capa}
              onIniciar={handleIniciar}
              onImplementar={id => setImplementarId(id)}
              onVerificar={id => setVerificarId(id)}
            />
          ))}
        </div>
      )}

      {capas.length > 0 && (
        <p className="mt-6 text-xs text-gray-400 text-center">
          Ciclo PAMEC · Dec. 1011/2006 Art. 34 · Res. 256/2016 · NormaLis
        </p>
      )}

      {implementarId && (
        <ImplementarModal
          loading={implementarLoading}
          onConfirm={handleImplementar}
          onCancel={() => setImplementarId(null)}
        />
      )}

      {verificarId && (
        <VerificarEficaciaModal
          descripcion={capaEnVerificacion?.descripcion ?? ''}
          loading={verificarLoading}
          onConfirm={handleVerificar}
          onCancel={() => setVerificarId(null)}
        />
      )}
    </div>
  );
}
