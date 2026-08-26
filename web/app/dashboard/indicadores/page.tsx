'use client';

/**
 * web/app/dashboard/indicadores/page.tsx
 * Módulo de Indicadores de Calidad — Res. 256/2016 (SOGCS / SISPRO)
 */

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useIndicadores } from '@/lib/useIndicadores';
import { INDICADOR_GRUPOS, INDICADORES_NOTA_COBERTURA } from '@/lib/indicadorTypes';
import type { IndicadorEstado, IndicadorDef } from '@/lib/indicadorTypes';
import {
  KpiCard, Toast, useToast, StatusBadge,
  SectionHeader, LoadingSpinner,
} from '@/components/ui';

// ── Semáforo config ───────────────────────────────────────
type Semaforo = 'cumple' | 'no_cumple' | 'sin_datos';

const SEMAFORO_CFG: Record<Semaforo, { label: string; bg: string; color: string; dot: string }> = {
  cumple:    { label: 'Cumple',    bg: 'bg-emerald-100', color: 'text-emerald-700', dot: 'bg-emerald-500' },
  no_cumple: { label: 'No cumple', bg: 'bg-red-100',     color: 'text-red-700',     dot: 'bg-red-500'     },
  sin_datos: { label: 'Sin datos', bg: 'bg-gray-100',    color: 'text-gray-500',    dot: 'bg-gray-400'    },
};

// ── Modal para registrar medición ─────────────────────────
interface RegistroModalProps {
  def: IndicadorDef;
  onClose: () => void;
  onSave: (indicId: string, periodo: string, valor: string, obs: string) => Promise<void>;
}

function defaultPeriodo(periodicidad: IndicadorDef['periodicidad']): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  if (periodicidad === 'mensual')    return `${y}-${m}`;
  if (periodicidad === 'trimestral') return `${y}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
  return `${y}`;
}

function RegistroModal({ def, onClose, onSave }: RegistroModalProps) {
  const [periodo, setPeriodo] = useState(defaultPeriodo(def.periodicidad));
  const [valor,   setValor]   = useState('');
  const [obs,     setObs]     = useState('');
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');

  const periodoHint =
    def.periodicidad === 'mensual'    ? 'Ej: 2025-04' :
    def.periodicidad === 'trimestral' ? 'Ej: 2025-Q2' : 'Ej: 2025';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!periodo.trim()) { setErr('El período es obligatorio.'); return; }
    if (isNaN(parseFloat(valor))) { setErr('Ingresa un valor numérico válido.'); return; }
    setSaving(true);
    try {
      await onSave(def.id, periodo.trim(), valor, obs.trim());
      onClose();
    } catch (e2) {
      setErr(`Error al guardar: ${e2 instanceof Error ? e2.message : String(e2)}`);
      setSaving(false);
    }
  }

  const INPUT = `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-teal-600 uppercase tracking-wide mb-0.5">
              Registrar medición
            </p>
            <h3 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">
              {def.nombre}
            </h3>
          </div>
          <button onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none flex-shrink-0 mt-0.5">
            ×
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600">
          <span className="font-semibold">Meta:</span> {def.meta} {def.unidad}
          {' · '}
          <span className="font-semibold">Periodicidad:</span> {def.periodicidad}
        </div>

        {err && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            ⚠️ {err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                Período <span className="text-red-500">*</span>
              </label>
              <input value={periodo} onChange={e => setPeriodo(e.target.value)}
                     placeholder={periodoHint} className={INPUT} maxLength={10} />
              <p className="text-xs text-gray-400 mt-1">{periodoHint}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                Valor ({def.unidad}) <span className="text-red-500">*</span>
              </label>
              <input type="number" step="any" value={valor}
                     onChange={e => setValor(e.target.value)} placeholder="0" className={INPUT} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Observación
            </label>
            <textarea rows={2} value={obs} onChange={e => setObs(e.target.value)}
                      placeholder="Fuente del dato, contexto…" maxLength={500}
                      className={`${INPUT} resize-none`} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700
                               rounded-xl text-sm font-semibold transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !valor}
                    className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                               text-white font-bold rounded-xl text-sm transition-colors
                               flex items-center justify-center gap-2">
              {saving && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {saving ? 'Guardando…' : 'Guardar medición'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tarjeta de indicador ──────────────────────────────────
function IndicadorCard({
  estado,
  onRegistrar,
}: {
  estado: IndicadorEstado;
  onRegistrar: (def: IndicadorDef) => void;
}) {
  const { def, registros, ultimo, valor, semaforo } = estado;
  const [expanded, setExpanded] = useState(false);
  const historial = registros.slice(0, 3);
  const cfg = SEMAFORO_CFG[semaforo as Semaforo] ?? SEMAFORO_CFG.sin_datos;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors">
      <div className="flex">
        <div className={`w-1 flex-shrink-0 ${cfg.dot}`} />
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 mb-0.5">{def.grupo}</p>
              <p className="text-sm font-semibold text-gray-800 leading-snug">{def.nombre}</p>
            </div>
            <StatusBadge
              label={cfg.label}
              bg={cfg.bg}
              color={cfg.color}
              dot
              dotColor={cfg.dot}
            />
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">Meta:</span>{' '}
              {def.meta} {def.unidad}
            </div>
            {valor !== null && (
              <>
                <span className="text-gray-200">|</span>
                <div className="text-xs">
                  <span className="font-bold text-base text-gray-800">{valor}</span>
                  {' '}
                  <span className="text-gray-400">{def.unidad}</span>
                  {ultimo && <span className="ml-1 text-gray-400">({ultimo.periodo})</span>}
                </div>
              </>
            )}
          </div>

          {historial.length > 1 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {historial.map((r, i) => (
                <span key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500">
                  <span className="font-medium text-gray-600">{r.periodo}</span>
                  <span>{r.valor} {def.unidad}</span>
                </span>
              ))}
            </div>
          )}

          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium mb-2 flex items-center gap-1"
          >
            {expanded ? '▲ Ocultar fórmula' : '▼ Ver fórmula y descripción'}
          </button>

          {expanded && (
            <div className="mb-3 space-y-2">
              <div className="bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
                <p className="text-xs font-bold text-teal-600 uppercase tracking-wide mb-0.5">Fórmula</p>
                <p className="text-xs text-teal-800 font-mono leading-relaxed">{def.formula}</p>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-600 leading-relaxed">{def.descripcion}</p>
                <p className="text-xs text-gray-400 mt-1">{def.normativa}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => onRegistrar(def)}
            className="w-full py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200
                       text-teal-700 text-xs font-bold rounded-lg transition-colors
                       flex items-center justify-center gap-1"
          >
            <span>+</span> Registrar medición
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
//  Página principal
// ════════════════════════════════════════════════════════
export default function IndicadoresPage() {
  const { user, nit } = useAuth();
  const { estados, stats, loading, error, saveIndicador } = useIndicadores(
    user?.uid ?? null,
    nit ?? null,
  );
  const { toast, show } = useToast();

  const [modalDef,    setModalDef]    = useState<IndicadorDef | null>(null);
  const [grupoActivo, setGrupoActivo] = useState<string | null>(null);

  async function handleSave(indicId: string, periodo: string, valor: string, obs: string) {
    if (!user) throw new Error('No autenticado');
    await saveIndicador({ indicId, periodo, valor, observacion: obs }, user.uid, nit ?? '');
    show('Medición registrada correctamente.');
  }

  function exportarPDF() {
    const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
    const filas = estados.map(({ def, ultimo, valor, semaforo }) => {
      const valorStr = valor !== null ? `${valor} ${def.unidad}` : '—';
      const color = semaforo === 'cumple' ? '#d1fae5' : semaforo === 'no_cumple' ? '#fee2e2' : '#f3f4f6';
      const estadoLabel = semaforo === 'cumple' ? '✅ Cumple' : semaforo === 'no_cumple' ? '❌ No cumple' : '— Sin datos';
      return `<tr style="background:${color}">
        <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #e5e7eb">
          <strong>${def.grupo}</strong><br/><span style="font-weight:400">${def.nombre}</span>
        </td>
        <td style="padding:6px 8px;font-size:11px;text-align:center;border-bottom:1px solid #e5e7eb">${def.meta} ${def.unidad}</td>
        <td style="padding:6px 8px;font-size:11px;text-align:center;border-bottom:1px solid #e5e7eb">${valorStr}</td>
        <td style="padding:6px 8px;font-size:11px;text-align:center;border-bottom:1px solid #e5e7eb">${ultimo?.periodo ?? '—'}</td>
        <td style="padding:6px 8px;font-size:11px;text-align:center;border-bottom:1px solid #e5e7eb;font-weight:600">${estadoLabel}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Informe Indicadores SOGCS</title>
<style>body{font-family:Arial,sans-serif;margin:24px;color:#111}
h1{font-size:16px;margin-bottom:4px}.sub{font-size:12px;color:#555;margin-bottom:16px}
.kpis{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.kpi{border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;text-align:center;min-width:80px}
.kpi .n{font-size:20px;font-weight:700}.kpi .l{font-size:10px;color:#666}
table{width:100%;border-collapse:collapse}th{background:#0d9488;color:#fff;padding:7px 8px;text-align:left;font-size:11px}
@media print{body{margin:0}}</style></head><body>
<h1>Informe de Indicadores de Calidad — SOGCS</h1>
<p class="sub">Resolución 256/2016 · Generado el ${fecha}</p>
<div class="kpis">
  <div class="kpi"><div class="n">${stats.total}</div><div class="l">Total</div></div>
  <div class="kpi" style="border-color:#a7f3d0"><div class="n" style="color:#065f46">${stats.cumplen}</div><div class="l">Cumplen</div></div>
  <div class="kpi" style="border-color:#fecaca"><div class="n" style="color:#991b1b">${stats.noCumplen}</div><div class="l">No cumplen</div></div>
  <div class="kpi"><div class="n" style="color:#6b7280">${stats.sinDatos}</div><div class="l">Sin datos</div></div>
</div>
<table><thead><tr>
  <th>Indicador</th><th style="text-align:center">Meta</th><th style="text-align:center">Valor</th>
  <th style="text-align:center">Período</th><th style="text-align:center">Estado</th>
</tr></thead><tbody>${filas}</tbody></table>
<p style="font-size:10px;color:#888;margin-top:16px">Reporte generado por NormaLis · normalis.co</p>
</body></html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { show('Permite ventanas emergentes para exportar.', 'error'); return; }
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 400);
  }

  const estadosFiltrados = grupoActivo ? estados.filter(e => e.def.grupo === grupoActivo) : estados;
  function countNoC(grupo: string) {
    return estados.filter(e => e.def.grupo === grupo && e.semaforo === 'no_cumple').length;
  }

  if (loading) return <LoadingSpinner fullHeight />;
  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-600">Error al cargar indicadores: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Toast toast={toast} />
      {modalDef && <RegistroModal def={modalDef} onClose={() => setModalDef(null)} onSave={handleSave} />}

      <SectionHeader
        title="Indicadores de Calidad"
        subtitle="Resolución 256/2016 (mod. Res. 3539/2019) — 14 trazadores curados SOGCS / SISPRO"
        actions={
          <button
            onClick={exportarPDF}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700
                       text-white text-sm font-semibold rounded-xl transition-colors"
          >
            📄 Informe SOGCS
          </button>
        }
      />

      {/* Aviso de cobertura del catálogo — vacío legal declarado */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-800">
        ⚠️ {INDICADORES_NOTA_COBERTURA}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total"      value={stats.total}     colorClass="text-gray-800"    icon="📊" />
        <KpiCard label="Cumplen"    value={stats.cumplen}   colorClass="text-emerald-700" icon="✅" borderColorClass="border-emerald-200" />
        <KpiCard label="No cumplen" value={stats.noCumplen} colorClass="text-red-700"     icon="❌" borderColorClass="border-red-200" />
        <KpiCard label="Sin datos"  value={stats.sinDatos}  colorClass="text-gray-400"    icon="—" />
      </div>

      {/* Filtros de grupo */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setGrupoActivo(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
                      ${!grupoActivo ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Todos ({estados.length})
        </button>
        {INDICADOR_GRUPOS.map(grupo => {
          const noC = countNoC(grupo);
          return (
            <button
              key={grupo}
              onClick={() => setGrupoActivo(g => g === grupo ? null : grupo)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                          text-xs font-semibold transition-colors
                          ${grupoActivo === grupo ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {grupo}
              {noC > 0 && (
                <span className={`px-1.5 rounded-full text-xs font-bold
                                  ${grupoActivo === grupo ? 'bg-white text-red-600' : 'bg-red-500 text-white'}`}>
                  {noC}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grilla */}
      {grupoActivo ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {estadosFiltrados.map(est => (
            <IndicadorCard key={est.def.id} estado={est} onRegistrar={setModalDef} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {INDICADOR_GRUPOS.map(grupo => {
            const grupoEstados = estados.filter(e => e.def.grupo === grupo);
            const cumplenG = grupoEstados.filter(e => e.semaforo === 'cumple').length;
            const noCG     = grupoEstados.filter(e => e.semaforo === 'no_cumple').length;
            return (
              <div key={grupo}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-700">{grupo}</h3>
                    <span className="text-xs text-gray-400">({grupoEstados.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {cumplenG > 0 && <span className="text-xs text-emerald-700 font-semibold">✅ {cumplenG} cumplen</span>}
                    {noCG > 0     && <span className="text-xs text-red-600 font-semibold">❌ {noCG} no cumplen</span>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {grupoEstados.map(est => (
                    <IndicadorCard key={est.def.id} estado={est} onRegistrar={setModalDef} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
