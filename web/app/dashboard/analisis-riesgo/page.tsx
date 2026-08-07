'use client';

/**
 * /dashboard/analisis-riesgo
 *
 * Motor de análisis predictivo de riesgo normativo.
 * Agrega hallazgos de TODOS los segmentos auditados → ranking por los 7
 * Estándares de Res. 3100/2019 → análisis narrativo vía Worker IA.
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import AuthGuard from '@/components/auth/AuthGuard';
import {
  useRiskAnalysis,
  buildRiskPrompt,
  nivelColor,
  nivelBg,
  type EstandarRisk,
} from '@/lib/useRiskAnalysis';

const WORKER_URL = 'https://normalis.fjfc1984.workers.dev';

// ── Sub-components ─────────────────────────────────────────────────────────────
function NivelBadge({ nivel }: { nivel: EstandarRisk['nivel'] }) {
  const cfg: Record<string, string> = {
    alto:      'bg-red-100 text-red-700 border border-red-200',
    moderado:  'bg-amber-100 text-amber-700 border border-amber-200',
    bajo:      'bg-emerald-100 text-emerald-700 border border-emerald-200',
    'sin datos': 'bg-gray-100 text-gray-500 border border-gray-200',
  };
  const labels: Record<string, string> = {
    alto: '🔴 Alto', moderado: '🟡 Moderado', bajo: '🟢 Bajo', 'sin datos': '⬜ Sin datos',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg[nivel] ?? cfg['sin datos']}`}>
      {labels[nivel] ?? nivel}
    </span>
  );
}

function RiskBar({ score, nivel }: { score: number; nivel: EstandarRisk['nivel'] }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: nivelColor(nivel) }}
        />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color: nivelColor(nivel) }}>
        {score}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function AnalisisRiesgoContent() {
  const { user, uid, nit, nombre } = useAuth() as ReturnType<typeof useAuth> & { uid?: string };
  const resolvedUid = (user as { uid?: string } | null)?.uid ?? null;

  const { estandares, topRiesgo, totalAudits, totalNonConfs, loading, error, reload } =
    useRiskAnalysis(resolvedUid, nit || null);

  const [aiAnalysis,  setAiAnalysis]  = useState<string>('');
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiError,     setAiError]     = useState<string>('');
  const [expanded,    setExpanded]    = useState<string | null>(null);

  const runAiAnalysis = useCallback(async () => {
    if (topRiesgo.length === 0) return;
    setAiLoading(true);
    setAiError('');
    setAiAnalysis('');

    const prompt = buildRiskPrompt(topRiesgo, nombre || 'IPS');
    try {
      const res = await fetch(WORKER_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: prompt,
          context: {
            modulo:     'analisis_riesgo',
            uid:        resolvedUid ?? '',
            nit:        nit ?? '',
            ips_nombre: nombre ?? '',
          },
          sessionHistory: [],
        }),
      });
      if (!res.ok) throw new Error(`Worker error ${res.status}`);
      const data = await res.json() as { answer: string };
      setAiAnalysis(data.answer);
    } catch (err) {
      setAiError(`Error al consultar IA: ${String(err)}`);
    } finally {
      setAiLoading(false);
    }
  }, [topRiesgo, nombre, resolvedUid, nit]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-64 gap-3">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Analizando auditorías…</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="text-gray-700">{error}</p>
        <button onClick={reload} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm">
          Reintentar
        </button>
      </div>
    );
  }

  // ── No data ──────────────────────────────────────────────────────────────
  if (totalAudits === 0) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <p className="text-5xl mb-4">🔍</p>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Sin auditorías registradas</h3>
        <p className="text-sm text-gray-500 mb-5">
          Completa al menos una auditoría de habilitación para ver el análisis de riesgo.
        </p>
        <Link
          href="/dashboard/auditoria"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white
                     rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors"
        >
          Iniciar auditoría →
        </Link>
      </div>
    );
  }

  const altosCount    = estandares.filter(e => e.nivel === 'alto').length;
  const moderadosCount = estandares.filter(e => e.nivel === 'moderado').length;

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Análisis de Riesgo Normativo</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Resolución 3100/2019 · {totalAudits} servicio{totalAudits !== 1 ? 's' : ''} auditado{totalAudits !== 1 ? 's' : ''} ·{' '}
            {totalNonConfs} hallazgo{totalNonConfs !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={reload}
          className="text-xs text-gray-400 hover:text-teal-600 flex items-center gap-1 self-start sm:self-auto"
        >
          ↻ Actualizar
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-black text-red-600">{altosCount}</p>
          <p className="text-xs text-red-500 mt-1 font-medium">Estándares riesgo alto</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-black text-amber-600">{moderadosCount}</p>
          <p className="text-xs text-amber-500 mt-1 font-medium">Riesgo moderado</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-black text-gray-700">{totalNonConfs}</p>
          <p className="text-xs text-gray-500 mt-1 font-medium">No conformidades</p>
        </div>
      </div>

      {/* Risk ranking — all 7 standards */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm">
            📊 Ranking de Riesgo — 7 Estándares Res. 3100/2019
          </h3>
        </div>
        <div className="divide-y divide-gray-50">
          {estandares.map((e, i) => (
            <div key={e.estandarId}>
              <button
                onClick={() => setExpanded(expanded === e.estandarId ? null : e.estandarId)}
                className="w-full px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
              >
                {/* Rank */}
                <span className={`text-xs font-black w-5 shrink-0 ${i < 3 ? 'text-red-500' : 'text-gray-300'}`}>
                  #{i + 1}
                </span>
                {/* Icon + label */}
                <span className="text-lg shrink-0">{e.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-800 truncate">{e.label}</span>
                    <span className="text-xs text-gray-400 shrink-0">{e.criterio}</span>
                    <NivelBadge nivel={e.nivel} />
                  </div>
                  <RiskBar score={e.riskScore} nivel={e.nivel} />
                </div>
                {/* Counts */}
                <div className="flex gap-3 shrink-0 text-xs">
                  {e.noCount > 0 && (
                    <span className="text-red-600 font-semibold">❌ {e.noCount}</span>
                  )}
                  {e.parcialCount > 0 && (
                    <span className="text-amber-600 font-semibold">⚠️ {e.parcialCount}</span>
                  )}
                  {e.noCount === 0 && e.parcialCount === 0 && e.totalQ > 0 && (
                    <span className="text-emerald-600 font-semibold">✅</span>
                  )}
                </div>
                <span className="text-gray-300 text-sm shrink-0">
                  {expanded === e.estandarId ? '▲' : '▼'}
                </span>
              </button>

              {/* Expanded: non-conformity detail */}
              {expanded === e.estandarId && (
                <div className={`mx-5 mb-3 rounded-xl border p-4 ${nivelBg(e.nivel)}`}>
                  {e.nonConfs.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      {e.totalQ > 0
                        ? '✅ Sin hallazgos en este estándar.'
                        : 'No se han auditado criterios de este estándar aún.'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {e.nonConfs.slice(0, 8).map((nc, j) => (
                        <div key={j} className="flex items-start gap-2 text-xs">
                          <span className={nc.answer === 'no' ? 'text-red-500' : 'text-amber-500'}>
                            {nc.answer === 'no' ? '❌' : '⚠️'}
                          </span>
                          <div className="flex-1">
                            <span className="text-gray-400">{nc.icon} {nc.areaName} · {nc.segmentoLabel} — </span>
                            <span className="text-gray-700">{nc.question}</span>
                          </div>
                        </div>
                      ))}
                      {e.nonConfs.length > 8 && (
                        <p className="text-xs text-gray-400">+{e.nonConfs.length - 8} hallazgos más…</p>
                      )}
                      <div className="pt-2 border-t border-black/10 flex gap-2">
                        <Link
                          href={`/dashboard/capas?origen=auditoria&estandar=${e.estandarId}`}
                          className="text-[11px] px-3 py-1.5 bg-white rounded-lg border border-gray-300
                                     text-gray-700 hover:border-teal-400 hover:text-teal-700 transition-colors font-medium"
                        >
                          + Crear CAPA para {e.label}
                        </Link>
                        <Link
                          href={`/reporte/auditoria?segmento=${e.segmentos[0] ?? 'general'}`}
                          className="text-[11px] px-3 py-1.5 bg-white rounded-lg border border-gray-300
                                     text-gray-700 hover:border-teal-400 hover:text-teal-700 transition-colors font-medium"
                        >
                          Ver reporte PDF →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AI Analysis block */}
      {topRiesgo.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">🤖 Análisis Predictivo IA</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Generado por el asistente normativo de NormaLis basado en tus hallazgos reales
              </p>
            </div>
            <button
              onClick={runAiAnalysis}
              disabled={aiLoading}
              className="shrink-0 flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-xs
                         font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed
                         transition-colors shadow-sm"
            >
              {aiLoading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analizando…
                </>
              ) : (
                <>✨ {aiAnalysis ? 'Re-analizar' : 'Generar análisis'}</>
              )}
            </button>
          </div>

          <div className="px-5 py-4">
            {!aiAnalysis && !aiLoading && !aiError && (
              <div className="text-center py-8">
                <p className="text-3xl mb-3">🧠</p>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  Haz clic en <strong>Generar análisis</strong> para que la IA identifique
                  patrones de riesgo y proponga recomendaciones basadas en tus {totalNonConfs} hallazgos.
                </p>
              </div>
            )}

            {aiLoading && (
              <div className="flex items-center gap-3 py-6 justify-center">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Consultando asistente normativo…</p>
              </div>
            )}

            {aiError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {aiError}
              </div>
            )}

            {aiAnalysis && !aiLoading && (
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                {aiAnalysis}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/dashboard/capas"
          className="bg-white border border-gray-200 rounded-xl p-4 hover:border-teal-400
                     hover:shadow-sm transition-all flex items-center gap-3"
        >
          <span className="text-2xl">📝</span>
          <div>
            <p className="text-sm font-semibold text-gray-800">Plan de mejoramiento</p>
            <p className="text-xs text-gray-400">Crear CAPAs desde hallazgos</p>
          </div>
        </Link>
        <Link
          href="/dashboard/auditoria"
          className="bg-white border border-gray-200 rounded-xl p-4 hover:border-teal-400
                     hover:shadow-sm transition-all flex items-center gap-3"
        >
          <span className="text-2xl">🔍</span>
          <div>
            <p className="text-sm font-semibold text-gray-800">Nueva auditoría</p>
            <p className="text-xs text-gray-400">Auditar otro servicio</p>
          </div>
        </Link>
        <Link
          href="/dashboard/indicadores"
          className="bg-white border border-gray-200 rounded-xl p-4 hover:border-teal-400
                     hover:shadow-sm transition-all flex items-center gap-3"
        >
          <span className="text-2xl">📊</span>
          <div>
            <p className="text-sm font-semibold text-gray-800">Indicadores PAMEC</p>
            <p className="text-xs text-gray-400">Seguimiento de mejora</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function AnalisisRiesgoPage() {
  return (
    <AuthGuard>
      <AnalisisRiesgoContent />
    </AuthGuard>
  );
}
