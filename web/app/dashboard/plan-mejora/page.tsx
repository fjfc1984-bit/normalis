'use client';

/**
 * web/app/dashboard/plan-mejora/page.tsx
 * Plan de Mejora — Procesos Prioritarios e Interdependencia
 *
 * Una IPS ya habilitada necesita, para estos dos estándares en particular,
 * más que el checklist puntual: un plan de mejora de ALTO IMPACTO (hallazgos
 * ligados a un criterio obligatorio — los que en una visita real pueden
 * cerrar el servicio) y una MEJORA ACTIVA (todo lo demás que sigue abierto,
 * hasta cerrarse). Esta página no crea un tipo de dato nuevo: filtra y
 * prioriza las CAPAs ya existentes (mismo módulo CAPAs de siempre) que
 * quedaron etiquetadas con `estandar` al crearse desde una auditoría o desde
 * una verificación de Interdependencia — ver capaTypes.ts.
 *
 * GAP CONOCIDO: solo las CAPAs creadas DESPUÉS de esta función (o desde
 * áreas ya clasificadas por estándar, ver auditData.ts) tienen `estandar`.
 * CAPAs previas, o creadas desde segmentos/áreas todavía sin clasificar,
 * no aparecen aquí — no se intenta adivinar retroactivamente a cuál
 * estándar pertenecen.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useCapas } from '@/lib/useCapas';
import type { Capa } from '@/lib/capaTypes';
import { CAPA_ESTADO_CFG } from '@/lib/capaTypes';
import type { EstandarHabilitacion } from '@/lib/auditTypes';
import { SectionHeader, LoadingSpinner, EmptyState, KpiCard } from '@/components/ui';

const ESTANDAR_LABEL: Record<EstandarHabilitacion, string> = {
  procesos_prioritarios: '📋 Procesos Prioritarios',
  interdependencia: '🔗 Interdependencia',
};

function fmtDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function CapaRow({ capa }: { capa: Capa }) {
  const cfg = CAPA_ESTADO_CFG[capa.estado] ?? CAPA_ESTADO_CFG.abierta;
  return (
    <Link
      href={`/dashboard/capas/${capa.id}`}
      className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:border-teal-400 transition-colors flex-wrap"
      style={{ borderColor: capa._vencida ? '#fecaca' : '#e5e7eb' }}
    >
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">{capa.numero || '—'}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-800 truncate">{capa.descripcion || '—'}</p>
        <p className="text-xs text-gray-400">
          {capa.estandar && ESTANDAR_LABEL[capa.estandar]} · {capa.area || '—'}
          {capa.responsable && ` · ${capa.responsable}`}
        </p>
      </div>
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
        {cfg.label}
      </span>
      <span className={`text-xs flex-shrink-0 ${capa._vencida ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
        {fmtDate(capa.fechaLimite)}{capa._vencida ? ' ⚠️' : ''}
      </span>
    </Link>
  );
}

export default function PlanMejoraPage() {
  const { user, nit, nombre: ipsNombre, loading: authLoading } = useAuth();
  const { capas, loading } = useCapas(user?.uid ?? null, nit || null);

  const relevantes = useMemo(
    () => capas.filter(c => c.estandar === 'procesos_prioritarios' || c.estandar === 'interdependencia'),
    [capas],
  );
  const altoImpacto = useMemo(() => relevantes.filter(c => c.obligatorio && c.estado !== 'cerrada'), [relevantes]);
  const mejoraActiva = useMemo(() => relevantes.filter(c => c.estado !== 'cerrada'), [relevantes]);
  const cerradas = useMemo(() => relevantes.filter(c => c.estado === 'cerrada'), [relevantes]);
  const vencidas = useMemo(() => mejoraActiva.filter(c => c._vencida), [mejoraActiva]);

  function exportarPDF() {
    const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

    const filas = (items: Capa[]) => items.length
      ? items.map(c => `<tr style="${c._vencida ? 'background:#fef2f2' : ''}">
          <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #e5e7eb">${escapeHtml(c.numero || '—')}</td>
          <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #e5e7eb">${c.estandar ? escapeHtml(ESTANDAR_LABEL[c.estandar]) : '—'}</td>
          <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #e5e7eb">${escapeHtml(c.descripcion || '—')}</td>
          <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #e5e7eb">${escapeHtml(c.responsable || '—')}</td>
          <td style="padding:6px 8px;font-size:11px;text-align:center;border-bottom:1px solid #e5e7eb;${c._vencida ? 'color:#b91c1c;font-weight:700' : ''}">${fmtDate(c.fechaLimite)}${c._vencida ? ' ⚠️' : ''}</td>
        </tr>`).join('')
      : `<tr><td colspan="5" style="padding:10px;font-size:11px;color:#888;text-align:center">Sin registros</td></tr>`;

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Plan de Mejora — ${escapeHtml(ipsNombre || 'NormaLis')}</title>
<style>body{font-family:Arial,sans-serif;margin:24px;color:#111}
h1{font-size:18px;margin-bottom:2px}h2{font-size:13px;margin:20px 0 8px;color:#0d9488}
.sub{font-size:12px;color:#555;margin-bottom:16px}
.kpis{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.kpi{border:1px solid #e5e7eb;border-radius:8px;padding:10px 16px;text-align:center;min-width:100px}
.kpi .n{font-size:22px;font-weight:700}.kpi .l{font-size:10px;color:#666;margin-top:2px}
table{width:100%;border-collapse:collapse;margin-bottom:8px}
th{background:#0d9488;color:#fff;padding:7px 8px;text-align:left;font-size:11px}
@media print{body{margin:0}}</style></head><body>
<h1>Plan de Mejora — Procesos Prioritarios e Interdependencia</h1>
<p class="sub">${escapeHtml(ipsNombre || '')} · Generado el ${fecha}</p>

<div class="kpis">
  <div class="kpi"><div class="n" style="color:${altoImpacto.length ? '#b91c1c' : '#111'}">${altoImpacto.length}</div><div class="l">Alto impacto abiertas</div></div>
  <div class="kpi"><div class="n">${mejoraActiva.length}</div><div class="l">Mejora activa (total abiertas)</div></div>
  <div class="kpi"><div class="n" style="color:${vencidas.length ? '#b91c1c' : '#111'}">${vencidas.length}</div><div class="l">Vencidas</div></div>
  <div class="kpi"><div class="n" style="color:#059669">${cerradas.length}</div><div class="l">Cerradas</div></div>
</div>

<h2>Alto impacto — hallazgos ligados a criterio obligatorio</h2>
<table><thead><tr><th>N°</th><th>Estándar</th><th>Descripción</th><th>Responsable</th><th style="text-align:center">Fecha límite</th></tr></thead>
<tbody>${filas(altoImpacto)}</tbody></table>

<h2>Mejora activa — todas las abiertas de estos dos estándares</h2>
<table><thead><tr><th>N°</th><th>Estándar</th><th>Descripción</th><th>Responsable</th><th style="text-align:center">Fecha límite</th></tr></thead>
<tbody>${filas(mejoraActiva)}</tbody></table>

<p style="font-size:10px;color:#888;margin-top:16px">Reporte generado por NormaLis · normalis.co</p>
</body></html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { alert('Permite ventanas emergentes para exportar.'); return; }
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 400);
  }

  if (authLoading || loading) return <LoadingSpinner fullHeight />;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <SectionHeader
        title="Plan de Mejora — Procesos Prioritarios e Interdependencia"
        subtitle="Los dos estándares que una IPS ya habilitada debe seguir trabajando activamente: hallazgos de alto impacto primero, mejora continua siempre"
        actions={
          <button
            onClick={exportarPDF}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            📄 Exportar PDF
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Alto impacto abiertas" value={altoImpacto.length} icon="🔴" colorClass={altoImpacto.length ? 'text-red-600' : 'text-gray-800'} />
        <KpiCard label="Mejora activa (total)" value={mejoraActiva.length} icon="🔄" />
        <KpiCard label="Vencidas" value={vencidas.length} icon="⏰" colorClass={vencidas.length ? 'text-red-600' : 'text-gray-800'} />
        <KpiCard label="Cerradas" value={cerradas.length} icon="✅" colorClass="text-emerald-700" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-700 mb-1 text-sm uppercase tracking-wide">🔴 Alto impacto</h3>
        <p className="text-xs text-gray-400 mb-4">Hallazgos que incluyen al menos un criterio obligatorio — los que en una visita real pueden cerrar el servicio. Priorízalos primero.</p>
        {altoImpacto.length === 0 ? (
          <EmptyState icon="✓" title="Sin hallazgos de alto impacto abiertos" description="No hay CAPAs de Procesos Prioritarios o Interdependencia ligadas a un criterio obligatorio pendientes." />
        ) : (
          <div className="space-y-2">{altoImpacto.map(c => <CapaRow key={c.id} capa={c} />)}</div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-700 mb-1 text-sm uppercase tracking-wide">🔄 Mejora activa</h3>
        <p className="text-xs text-gray-400 mb-4">Todas las CAPAs abiertas de estos dos estándares, hasta que se cierren — incluye las de alto impacto de arriba.</p>
        {mejoraActiva.length === 0 ? (
          <EmptyState icon="✓" title="Sin mejoras activas pendientes" description="No hay CAPAs abiertas de Procesos Prioritarios o Interdependencia todavía." />
        ) : (
          <div className="space-y-2">{mejoraActiva.map(c => <CapaRow key={c.id} capa={c} />)}</div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
        <p className="font-bold mb-1">ℹ️ Sobre esta vista</p>
        <p>
          Solo aparecen aquí las CAPAs creadas desde una auditoría de habilitación (áreas ya clasificadas por
          estándar) o desde una verificación de Interdependencia. CAPAs manuales o de segmentos/áreas todavía
          sin clasificar no se muestran — no se adivina a qué estándar pertenecen. Ve al{' '}
          <Link href="/dashboard/capas" className="underline font-semibold">módulo CAPAs completo</Link>{' '}
          para ver el resto.
        </p>
      </div>
    </div>
  );
}
