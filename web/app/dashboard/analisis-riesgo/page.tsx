'use client';

/**
 * /dashboard/analisis-riesgo
 *
 * Motor de análisis predictivo de riesgo normativo.
 * Agrega hallazgos de TODOS los segmentos auditados → ranking por los 7
 * Estándares de Res. 1732/2026 → análisis narrativo + PAMEC vía Worker IA.
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import AuthGuard from '@/components/auth/AuthGuard';
import {
  useRiskAnalysis,
  buildRiskPrompt,
  nivelColor,
  nivelBg,
  type EstandarRisk,
} from '@/lib/useRiskAnalysis';
import type { PamecDoc, PamecItem, PamecAccion } from '@/lib/pamecTypes';

// ── Types PAMEC ───────────────────────────────────────────────────────────────
interface PamecAccion {
  num:         number;
  descripcion: string;
  responsable: string;
  fecha_inicio: string;
  fecha_fin:   string;
  recursos:    string;
}
interface PamecHallazgo {
  num:                    number;
  estandar:               string;
  criterio:               string;
  descripcion:            string;
  tipo:                   string;
  causa_raiz:             string;
  acciones:               PamecAccion[];
  indicador_verificacion: string;
  meta:                   string;
  seguimiento:            string;
}
interface PamecPlan {
  ips_nombre:         string;
  fecha_generacion:   string;
  hallazgos:          PamecHallazgo[];
  responsable_pamec:  string;
  periodo_vigencia:   string;
}

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? 'https://normalis.fjfc1984.workers.dev';

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

  // ── PAMEC state ──────────────────────────────────────────────────────────
  const [pamecPlan,    setPamecPlan]   = useState<PamecPlan | null>(null);
  const [pamecLoading, setPamecLoading] = useState(false);
  const [pamecError,   setPamecError]  = useState<string>('');
  const [pamecOpen,    setPamecOpen]   = useState(false);
  const [pamecSaved,   setPamecSaved]  = useState(false);

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

  const generatePamec = useCallback(async () => {
    if (!user || estandares.every(e => e.nivel === 'sin datos')) return;
    setPamecLoading(true);
    setPamecError('');
    setPamecPlan(null);
    setPamecOpen(true);

    // Obtener token Firebase
    let idToken = '';
    try {
      idToken = await (user as import('firebase/auth').User).getIdToken();
    } catch {
      setPamecError('No se pudo obtener el token de autenticación.');
      setPamecLoading(false);
      return;
    }

    // Convertir no-conformidades top → hallazgos PAMEC (máx 6)
    const tipoMap: Record<EstandarRisk['nivel'], string> = {
      alto: 'GRAVE', moderado: 'MODERADO', bajo: 'LEVE', 'sin datos': 'LEVE',
    };
    const hallazgos = estandares
      .filter(e => e.nivel !== 'sin datos' && e.nonConfs.length > 0)
      .slice(0, 6)
      .map(e => ({
        estandar:    e.label,
        criterio:    e.criterio,
        descripcion: e.nonConfs[0]?.question?.slice(0, 200) ?? 'Incumplimiento detectado',
        tipo:        tipoMap[e.nivel],
        causaRaiz:   e.nonConfs[0]?.answer === 'no'
          ? 'Criterio no implementado — se requiere acción inmediata'
          : 'Cumplimiento parcial — proceso en transición o documentación incompleta',
      }));

    if (hallazgos.length === 0) {
      setPamecError('No hay hallazgos con no-conformidades para generar el PAMEC.');
      setPamecLoading(false);
      return;
    }

    try {
      const res = await fetch(`${WORKER_URL}/api/pamec`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          hallazgos,
          context: { ips_nombre: nombre ?? 'IPS', nit: nit ?? '' },
        }),
      });

      const data = await res.json() as { ok?: boolean; pamec?: PamecPlan; error?: string; raw?: string };
      if (!res.ok || !data.ok) {
        setPamecError(data.error ?? `Error ${res.status}`);
        return;
      }

      const pamecData = data.pamec;
      if (!pamecData) { setPamecError('La IA no devolvió un plan válido.'); return; }
      setPamecPlan(pamecData);

      // ── Guardar en Firestore pamec/{nit} ──────────────────────────────
      if (nit) {
        try {
          // Mapear hallazgos → PamecItem[]
          const newItems: PamecItem[] = pamecData.hallazgos.map(h => ({
            id:         crypto.randomUUID(),
            proceso:    `[${h.estandar}] ${h.descripcion.slice(0, 100)}`,
            indicador:  h.indicador_verificacion,
            meta:       h.meta,
            brecha:     h.causa_raiz,
            prioridad:  (h.tipo === 'GRAVE' ? 'alta' : h.tipo === 'MODERADO' ? 'media' : 'baja') as PamecItem['prioridad'],
            estado:     'pendiente' as const,
            creadoEn:   new Date().toISOString(),
          }));

          // Mapear acciones → PamecAccion[] enlazadas a su item
          const newAcciones: PamecAccion[] = pamecData.hallazgos.flatMap((h, i) =>
            (h.acciones ?? []).map(a => ({
              id:           crypto.randomUUID(),
              itemId:       newItems[i]?.id ?? '',
              descripcion:  a.descripcion,
              responsable:  a.responsable ?? '',
              fechaLimite:  a.fecha_fin ?? '',
              estado:       'pendiente' as const,
            }))
          );

          // Cargar doc existente y hacer APPEND (no sobreescribir trabajo manual)
          const pamecRef = doc(db, 'pamec', nit);
          const snap = await getDoc(pamecRef);
          const existing = snap.exists() ? (snap.data() as PamecDoc) : null;

          await setDoc(pamecRef, {
            nit,
            fase:      'plan',
            items:     [...(existing?.items    ?? []), ...newItems],
            acciones:  [...(existing?.acciones ?? []), ...newAcciones],
            updatedAt: new Date().toISOString(),
            _ts:       serverTimestamp(),
          } satisfies Omit<PamecDoc, '_ts'> & { _ts: ReturnType<typeof serverTimestamp> }, { merge: false });

          setPamecSaved(true);
          setTimeout(() => setPamecSaved(false), 5000);
        } catch (saveErr) {
          // Error de guardado no es fatal — el plan sigue visible en pantalla
          console.error('[PAMEC] Error guardando en Firestore:', saveErr);
        }
      }
    } catch (err) {
      setPamecError(`Error de red: ${String(err)}`);
    } finally {
      setPamecLoading(false);
    }
  }, [user, estandares, nombre, nit]);

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

      {/* PAMEC block */}
      {estandares.some(e => e.nivel !== 'sin datos' && e.nonConfs.length > 0) && (
        <div className="bg-white rounded-2xl border border-teal-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setPamecOpen(o => !o)}
            className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-teal-50 transition-colors"
          >
            <div className="text-left">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                📋 Plan de Acción y Mejora — PAMEC
                {pamecPlan && (
                  <span className="text-[10px] bg-teal-100 text-teal-700 font-bold px-2 py-0.5 rounded-full">
                    {pamecPlan.hallazgos.length} hallazgo{pamecPlan.hallazgos.length !== 1 ? 's' : ''}
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Genera automáticamente el Plan de Superación de Hallazgos (Res. 1732/2026)
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={e => { e.stopPropagation(); generatePamec(); }}
                disabled={pamecLoading}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-xs
                           font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-60
                           disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {pamecLoading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generando…
                  </>
                ) : (
                  <>📋 {pamecPlan ? 'Regenerar' : 'Generar PAMEC'}</>
                )}
              </button>
              <span className="text-gray-300 text-sm">{pamecOpen ? '▲' : '▼'}</span>
            </div>
          </button>

          {pamecOpen && (
            <div className="border-t border-teal-100">
              {/* Toast guardado */}
              {pamecSaved && (
                <div className="mx-5 mt-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200
                                rounded-xl px-4 py-3 text-sm text-emerald-800">
                  <span className="text-lg">✅</span>
                  <div className="flex-1">
                    <span className="font-semibold">PAMEC guardado en el módulo.</span>
                    {' '}Los hallazgos y acciones ya están disponibles para editar y hacer seguimiento.
                  </div>
                  <Link
                    href="/dashboard/pamec"
                    className="shrink-0 text-xs font-bold text-emerald-700 hover:underline border border-emerald-300
                               bg-white rounded-lg px-3 py-1.5"
                  >
                    Ir al módulo PAMEC →
                  </Link>
                </div>
              )}

              {/* Estado vacío */}
              {!pamecPlan && !pamecLoading && !pamecError && (
                <div className="text-center py-10 px-6">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    Haz clic en <strong>Generar PAMEC</strong> para obtener un Plan de Acción
                    y Mejoramiento estructurado con acciones, responsables y plazos según
                    los {totalNonConfs} hallazgos de tus auditorías.
                  </p>
                </div>
              )}

              {/* Loading */}
              {pamecLoading && (
                <div className="flex items-center gap-3 py-10 justify-center">
                  <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Generando plan PAMEC con IA normativa…</p>
                </div>
              )}

              {/* Error */}
              {pamecError && !pamecLoading && (
                <div className="m-5 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  {pamecError}
                  <button
                    onClick={generatePamec}
                    className="ml-3 text-red-600 underline text-xs"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {/* Plan PAMEC */}
              {pamecPlan && !pamecLoading && (
                <div className="p-5 space-y-5">
                  {/* Header info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3
                                  bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 text-xs">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <span className="text-gray-600">
                        <span className="font-semibold text-gray-800">IPS:</span> {pamecPlan.ips_nombre}
                      </span>
                      <span className="text-gray-600">
                        <span className="font-semibold text-gray-800">Fecha:</span> {pamecPlan.fecha_generacion}
                      </span>
                      <span className="text-gray-600">
                        <span className="font-semibold text-gray-800">Vigencia:</span> {pamecPlan.periodo_vigencia}
                      </span>
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="text-teal-700 border border-teal-300 bg-white px-3 py-1.5 rounded-lg
                                 hover:bg-teal-50 transition-colors font-medium"
                    >
                      🖨️ Imprimir / PDF
                    </button>
                  </div>

                  {/* Hallazgos */}
                  <div className="space-y-4">
                    {pamecPlan.hallazgos.map((h, idx) => {
                      const tipoCfg = {
                        GRAVE:    { bg: 'bg-red-50 border-red-200',    badge: 'bg-red-100 text-red-700',    icon: '🔴' },
                        MODERADO: { bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700', icon: '🟡' },
                        LEVE:     { bg: 'bg-blue-50 border-blue-200',   badge: 'bg-blue-100 text-blue-700',   icon: '🔵' },
                      } as Record<string, { bg: string; badge: string; icon: string }>;
                      const cfg = tipoCfg[h.tipo] ?? tipoCfg['LEVE'];

                      return (
                        <div key={idx} className={`rounded-xl border p-4 ${cfg.bg}`}>
                          {/* Hallazgo header */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-xs font-black text-gray-500">#{h.num}</span>
                                <span className="text-sm font-bold text-gray-800">{h.estandar}</span>
                                <span className="text-xs text-gray-500">{h.criterio}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                                  {cfg.icon} {h.tipo}
                                </span>
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed">{h.descripcion}</p>
                            </div>
                          </div>

                          {/* Causa raíz */}
                          <div className="mb-3">
                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              Causa raíz
                            </p>
                            <p className="text-xs text-gray-700">{h.causa_raiz}</p>
                          </div>

                          {/* Acciones */}
                          <div className="mb-3">
                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Acciones de mejora
                            </p>
                            <div className="space-y-2">
                              {h.acciones.map((a, ai) => (
                                <div key={ai} className="bg-white/70 rounded-lg p-3 border border-black/5">
                                  <div className="flex items-start gap-2">
                                    <span className="text-[10px] font-black text-gray-400 mt-0.5 shrink-0">
                                      A{a.num}
                                    </span>
                                    <div className="flex-1">
                                      <p className="text-xs text-gray-800 mb-1">{a.descripcion}</p>
                                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-gray-500">
                                        <span>👤 {a.responsable}</span>
                                        <span>📅 {a.fecha_inicio} → {a.fecha_fin}</span>
                                        {a.recursos && <span>🔧 {a.recursos}</span>}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Indicador + Meta */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-white/70 rounded-lg p-3 border border-black/5">
                              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                Indicador de verificación
                              </p>
                              <p className="text-xs text-gray-700">{h.indicador_verificacion}</p>
                            </div>
                            <div className="bg-white/70 rounded-lg p-3 border border-black/5">
                              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                Meta / Seguimiento
                              </p>
                              <p className="text-xs text-gray-700">{h.meta}</p>
                              {h.seguimiento && (
                                <p className="text-[10px] text-gray-500 mt-1">{h.seguimiento}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer PAMEC */}
                  <div className="flex items-center justify-between border-t border-teal-100 pt-4 text-xs text-gray-500">
                    <span>Responsable PAMEC: <strong className="text-gray-700">{pamecPlan.responsable_pamec}</strong></span>
                    <Link
                      href="/dashboard/capas"
                      className="text-teal-600 hover:text-teal-700 font-semibold hover:underline"
                    >
                      Convertir acciones en CAPAs →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
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
