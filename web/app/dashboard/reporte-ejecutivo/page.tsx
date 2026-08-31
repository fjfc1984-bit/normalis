'use client';

/**
 * web/app/dashboard/reporte-ejecutivo/page.tsx
 * Reporte Ejecutivo — vista de una sola pantalla con lo que un director
 * técnico necesita para mostrarle a la gerencia sin armarlo a mano:
 * score de habilitación, CAPAs abiertas, vencimientos próximos e
 * indicadores fuera de meta. Todos los datos ya existen en otros
 * módulos — esta página solo los agrega en un solo lugar y permite
 * exportarlos a PDF (imprimir del navegador, mismo patrón que
 * indicadores/page.tsx > exportarPDF()).
 *
 * NOTA: no muestra "tendencia" del score de auditoría porque
 * auditorias/{uid}_{segmento} guarda solo el estado MÁS RECIENTE de cada
 * segmento, no un historial — no hay de dónde sacar una tendencia real
 * todavía. Mostrar una inventada sería peor que no mostrar nada.
 */

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, type Timestamp } from 'firebase/firestore';
import { useIndicadores } from '@/lib/useIndicadores';
import { scoreColor, scoreLabel } from '@/lib/auditScore';
import { diasRestantesLocal, estaVencidaLocal } from '@/lib/fechaLocal';
import { SEGMENT_META } from '@/data/auditData';
import { SectionHeader, LoadingSpinner, EmptyState } from '@/components/ui';

interface AuditoriaResumen {
  segmento: string;
  score: number;
  completedAt: string | null;
}

interface CapaResumen {
  id: string;
  numero: string;
  descripcion: string;
  area: string;
  responsable: string;
  fechaLimite: string;
  estado: string;
}

interface VencimientoResumen {
  id: string;
  nombre: string;
  fecha: string;
}

function segLabel(seg: string): string {
  return SEGMENT_META[seg]?.label ?? seg;
}

export default function ReporteEjecutivoPage() {
  const { user, nit, nombre: ipsNombre, loading: authLoading } = useAuth();

  const [audits,        setAudits]        = useState<AuditoriaResumen[]>([]);
  const [capasAbiertas, setCapasAbiertas] = useState<CapaResumen[]>([]);
  const [vencimientos,  setVencimientos]  = useState<VencimientoResumen[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(true);

  const { estados: indicEstados, stats: indicStats, loading: loadingIndic } = useIndicadores(
    user?.uid ?? null,
    nit ?? null,
  );

  // ── Auditorías completadas (estado actual por segmento) ──────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'auditorias'), where('uid', '==', user.uid));
    getDocs(q)
      .then(snap => {
        const all = snap.docs
          .map(d => d.data() as { segmento: string; score: number; completedAt: string | null })
          .filter(a => !!a.completedAt);
        setAudits(all);
      })
      .catch(() => setAudits([]))
      .finally(() => setLoadingAudits(false));
  }, [user]);

  // ── CAPAs abiertas o en progreso ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const base = nit
      ? query(collection(db, 'capas'), where('nit', '==', nit), where('estado', 'in', ['abierta', 'en_progreso']))
      : query(collection(db, 'capas'), where('uid', '==', user.uid), where('estado', 'in', ['abierta', 'en_progreso']));
    return onSnapshot(base, snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as CapaResumen));
      items.sort((a, b) => (a.fechaLimite || '').localeCompare(b.fechaLimite || ''));
      setCapasAbiertas(items);
    }, () => setCapasAbiertas([]));
  }, [user, nit]);

  // ── Vencimientos próximos (60 días) o ya vencidos ─────────────────────────
  useEffect(() => {
    if (!user) return;
    const base = nit
      ? query(collection(db, 'vencimientos'), where('nit', '==', nit))
      : query(collection(db, 'vencimientos'), where('uid', '==', user.uid));
    return onSnapshot(base, snap => {
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as VencimientoResumen))
        .filter(v => {
          const dias = diasRestantesLocal(v.fecha);
          return dias !== null && dias <= 60;
        });
      items.sort((a, b) => a.fecha.localeCompare(b.fecha));
      setVencimientos(items);
    }, () => setVencimientos([]));
  }, [user, nit]);

  // ── Métricas derivadas ─────────────────────────────────────────────────────
  const avgScore = useMemo(() => {
    if (!audits.length) return 0;
    return Math.round(audits.reduce((sum, a) => sum + a.score, 0) / audits.length);
  }, [audits]);

  const capasVencidas = useMemo(
    () => capasAbiertas.filter(c => estaVencidaLocal(c.fechaLimite)),
    [capasAbiertas],
  );

  const indicadoresFueraMeta = useMemo(
    () => indicEstados.filter(e => e.cumple === false),
    [indicEstados],
  );

  const loading = authLoading || loadingAudits || loadingIndic;

  function exportarPDF() {
    const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

    const filasSegmentos = audits.length
      ? audits.map(a => {
          const color = scoreColor(a.score);
          return `<tr>
            <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #e5e7eb">${segLabel(a.segmento)}</td>
            <td style="padding:6px 8px;font-size:11px;text-align:center;border-bottom:1px solid #e5e7eb;font-weight:700;color:${color}">${a.score}%</td>
            <td style="padding:6px 8px;font-size:11px;text-align:center;border-bottom:1px solid #e5e7eb">${scoreLabel(a.score)}</td>
          </tr>`;
        }).join('')
      : `<tr><td colspan="3" style="padding:10px;font-size:11px;color:#888;text-align:center">Sin auditorías completadas todavía</td></tr>`;

    const filasCapas = capasAbiertas.length
      ? capasAbiertas.map(c => {
          const vencida = estaVencidaLocal(c.fechaLimite);
          return `<tr style="${vencida ? 'background:#fef2f2' : ''}">
            <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #e5e7eb">${c.numero || '—'}</td>
            <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #e5e7eb">${c.descripcion || '—'}</td>
            <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #e5e7eb">${c.responsable || '—'}</td>
            <td style="padding:6px 8px;font-size:11px;text-align:center;border-bottom:1px solid #e5e7eb;${vencida ? 'color:#b91c1c;font-weight:700' : ''}">${c.fechaLimite || '—'}${vencida ? ' ⚠️' : ''}</td>
          </tr>`;
        }).join('')
      : `<tr><td colspan="4" style="padding:10px;font-size:11px;color:#888;text-align:center">Sin CAPAs abiertas</td></tr>`;

    const filasVenc = vencimientos.length
      ? vencimientos.map(v => {
          const dias = diasRestantesLocal(v.fecha) ?? 0;
          const vencida = dias < 0;
          return `<tr style="${vencida ? 'background:#fef2f2' : ''}">
            <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #e5e7eb">${v.nombre || '—'}</td>
            <td style="padding:6px 8px;font-size:11px;text-align:center;border-bottom:1px solid #e5e7eb">${v.fecha}</td>
            <td style="padding:6px 8px;font-size:11px;text-align:center;border-bottom:1px solid #e5e7eb;${vencida ? 'color:#b91c1c;font-weight:700' : ''}">${vencida ? `Vencido hace ${Math.abs(dias)}d` : `${dias}d`}</td>
          </tr>`;
        }).join('')
      : `<tr><td colspan="3" style="padding:10px;font-size:11px;color:#888;text-align:center">Sin vencimientos en los próximos 60 días</td></tr>`;

    const filasIndic = indicadoresFueraMeta.length
      ? indicadoresFueraMeta.map(e => `<tr>
          <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #e5e7eb">${e.def.nombre}</td>
          <td style="padding:6px 8px;font-size:11px;text-align:center;border-bottom:1px solid #e5e7eb">${e.def.meta} ${e.def.unidad}</td>
          <td style="padding:6px 8px;font-size:11px;text-align:center;border-bottom:1px solid #e5e7eb;color:#b91c1c;font-weight:700">${e.valor ?? '—'} ${e.def.unidad}</td>
        </tr>`).join('')
      : `<tr><td colspan="3" style="padding:10px;font-size:11px;color:#888;text-align:center">Todos los indicadores con datos cumplen su meta</td></tr>`;

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Reporte Ejecutivo — ${ipsNombre || 'NormaLis'}</title>
<style>body{font-family:Arial,sans-serif;margin:24px;color:#111}
h1{font-size:18px;margin-bottom:2px}h2{font-size:13px;margin:20px 0 8px;color:#0d9488}
.sub{font-size:12px;color:#555;margin-bottom:16px}
.kpis{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.kpi{border:1px solid #e5e7eb;border-radius:8px;padding:10px 16px;text-align:center;min-width:100px}
.kpi .n{font-size:22px;font-weight:700}.kpi .l{font-size:10px;color:#666;margin-top:2px}
table{width:100%;border-collapse:collapse;margin-bottom:8px}
th{background:#0d9488;color:#fff;padding:7px 8px;text-align:left;font-size:11px}
@media print{body{margin:0}}</style></head><body>
<h1>Reporte Ejecutivo de Cumplimiento</h1>
<p class="sub">${ipsNombre || ''} · Generado el ${fecha}</p>

<div class="kpis">
  <div class="kpi"><div class="n" style="color:${scoreColor(avgScore)}">${audits.length ? avgScore + '%' : '—'}</div><div class="l">Score promedio</div></div>
  <div class="kpi"><div class="n" style="color:${capasVencidas.length ? '#b91c1c' : '#111'}">${capasAbiertas.length}</div><div class="l">CAPAs abiertas${capasVencidas.length ? ` (${capasVencidas.length} vencidas)` : ''}</div></div>
  <div class="kpi"><div class="n">${vencimientos.length}</div><div class="l">Vencimientos ≤60d</div></div>
  <div class="kpi"><div class="n" style="color:${indicadoresFueraMeta.length ? '#b91c1c' : '#111'}">${indicStats.cumplen}/${indicStats.total}</div><div class="l">Indicadores en meta</div></div>
</div>

<h2>Score de habilitación por servicio auditado</h2>
<table><thead><tr><th>Servicio</th><th style="text-align:center">Score</th><th style="text-align:center">Estado</th></tr></thead>
<tbody>${filasSegmentos}</tbody></table>

<h2>CAPAs abiertas</h2>
<table><thead><tr><th>N°</th><th>Descripción</th><th>Responsable</th><th style="text-align:center">Fecha límite</th></tr></thead>
<tbody>${filasCapas}</tbody></table>

<h2>Vencimientos próximos (60 días)</h2>
<table><thead><tr><th>Documento</th><th style="text-align:center">Fecha</th><th style="text-align:center">Días</th></tr></thead>
<tbody>${filasVenc}</tbody></table>

<h2>Indicadores fuera de meta</h2>
<table><thead><tr><th>Indicador</th><th style="text-align:center">Meta</th><th style="text-align:center">Valor actual</th></tr></thead>
<tbody>${filasIndic}</tbody></table>

<p style="font-size:10px;color:#888;margin-top:16px">Reporte generado por NormaLis · normalis.co</p>
</body></html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { alert('Permite ventanas emergentes para exportar.'); return; }
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 400);
  }

  if (loading) return <LoadingSpinner fullHeight />;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <SectionHeader
        title="Reporte Ejecutivo"
        subtitle="Vista consolidada de cumplimiento — lista para mostrar a gerencia, sin armarla a mano"
        actions={
          <button
            onClick={exportarPDF}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            📄 Exportar PDF
          </button>
        }
      />

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Score promedio</p>
          <p className="text-3xl font-bold mt-1" style={{ color: audits.length ? scoreColor(avgScore) : '#9ca3af' }}>
            {audits.length ? `${avgScore}%` : '—'}
          </p>
          {audits.length > 0 && <p className="text-xs text-gray-400 mt-0.5">{scoreLabel(avgScore)}</p>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">CAPAs abiertas</p>
          <p className="text-3xl font-bold mt-1" style={{ color: capasVencidas.length ? '#ef4444' : '#111827' }}>
            {capasAbiertas.length}
          </p>
          {capasVencidas.length > 0 && (
            <p className="text-xs text-red-500 mt-0.5 font-semibold">{capasVencidas.length} vencida{capasVencidas.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vencimientos ≤60d</p>
          <p className="text-3xl font-bold mt-1 text-gray-800">{vencimientos.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Indicadores en meta</p>
          <p className="text-3xl font-bold mt-1" style={{ color: indicadoresFueraMeta.length ? '#ef4444' : '#111827' }}>
            {indicStats.cumplen}/{indicStats.total}
          </p>
        </div>
      </div>

      {/* ── Score por servicio ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">Score por servicio auditado</h3>
        {audits.length === 0 ? (
          <EmptyState icon="🔍" title="Sin auditorías completadas" description="Completa una auditoría de habilitación para verla reflejada aquí." />
        ) : (
          <div className="space-y-2">
            {audits.map(a => (
              <div key={a.segmento} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-sm text-gray-700">{segLabel(a.segmento)}</span>
                <span className="text-sm font-bold" style={{ color: scoreColor(a.score) }}>{a.score}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CAPAs abiertas ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">CAPAs abiertas</h3>
        {capasAbiertas.length === 0 ? (
          <EmptyState icon="✓" title="Sin CAPAs abiertas" description="No hay acciones correctivas o preventivas pendientes." />
        ) : (
          <div className="space-y-2">
            {capasAbiertas.slice(0, 10).map(c => {
              const vencida = estaVencidaLocal(c.fechaLimite);
              return (
                <div key={c.id} className={`flex items-center gap-3 p-3 rounded-lg border ${vencida ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 flex-shrink-0">{c.numero || '—'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800 truncate">{c.descripcion || '—'}</p>
                    <p className="text-xs text-gray-400">{c.responsable || 'Sin responsable'} · {c.area || '—'}</p>
                  </div>
                  <span className={`text-xs flex-shrink-0 ${vencida ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                    {c.fechaLimite || '—'}{vencida ? ' ⚠️' : ''}
                  </span>
                </div>
              );
            })}
            {capasAbiertas.length > 10 && (
              <p className="text-xs text-gray-400 text-center pt-1">+{capasAbiertas.length - 10} más — ver módulo CAPAs completo</p>
            )}
          </div>
        )}
      </div>

      {/* ── Vencimientos próximos ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">Vencimientos próximos (60 días)</h3>
        {vencimientos.length === 0 ? (
          <EmptyState icon="📅" title="Sin vencimientos próximos" description="Nada vence en los próximos 60 días." />
        ) : (
          <div className="space-y-2">
            {vencimientos.map(v => {
              const dias = diasRestantesLocal(v.fecha) ?? 0;
              const vencida = dias < 0;
              return (
                <div key={v.id} className={`flex items-center justify-between p-3 rounded-lg border ${vencida ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                  <span className="text-sm text-gray-700">{v.nombre}</span>
                  <span className={`text-xs font-semibold ${vencida ? 'text-red-600' : 'text-gray-500'}`}>
                    {vencida ? `Vencido hace ${Math.abs(dias)}d` : `en ${dias}d`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Indicadores fuera de meta ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">Indicadores fuera de meta</h3>
        {indicadoresFueraMeta.length === 0 ? (
          <EmptyState icon="📊" title="Todo en meta" description="Todos los indicadores con datos registrados cumplen su meta." />
        ) : (
          <div className="space-y-2">
            {indicadoresFueraMeta.map(e => (
              <div key={e.def.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
                <span className="text-sm text-gray-700">{e.def.nombre}</span>
                <span className="text-xs font-semibold text-red-600">{e.valor ?? '—'} {e.def.unidad} (meta {e.def.meta} {e.def.unidad})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
