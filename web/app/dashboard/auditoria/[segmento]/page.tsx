'use client';

import { useState, useMemo, useCallback, use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { areasDB, SEGMENT_META } from '@/data/auditData';
import {
  buildFlatQuestions,
  calcAuditScore,
  calcAreaScores,
  getNonConformities,
  calcProgress,
  scoreColor,
  scoreLabel,
} from '@/lib/auditScore';
import { useAudit } from '@/lib/useAudit';
import { askWorker } from '@/lib/worker';
import { auth } from '@/lib/firebase';
import type { AuditAnswers, AuditAnswer } from '@/lib/auditTypes';

// ─── Reusable answer button ───────────────────────────────────────────────────
type AnswerKey = AuditAnswer;

interface AnswerBtnProps {
  value: AnswerKey;
  current: AnswerKey | undefined;
  onSelect: (v: AnswerKey) => void;
  label: string;
  emoji: string;
  colorClass: string;
  activeBg: string;
}

function AnswerBtn({ value, current, onSelect, label, emoji, colorClass, activeBg }: AnswerBtnProps) {
  const isActive = current === value;
  return (
    <button
      onClick={() => onSelect(value)}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium
                  transition-all duration-150 w-full text-left
                  ${isActive
                    ? `${activeBg} ${colorClass} border-current shadow-sm`
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
    >
      <span className="text-base">{emoji}</span>
      {label}
    </button>
  );
}

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = scoreColor(score);

  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="10"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="50" y="54" textAnchor="middle" fontSize="22" fontWeight="bold" fill={color}>
        {score}
      </text>
    </svg>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
type View = 'checklist' | 'results';

export default function AuditoriaSegmentoPage({
  params,
}: {
  params: Promise<{ segmento: string }>;
}) {
  const { segmento } = use(params);

  const areas = areasDB[segmento];
  if (!areas) notFound();

  const meta = SEGMENT_META[segmento];
  const flatQ = useMemo(() => buildFlatQuestions(areas), [areas]);

  // Persistent state via Firestore (auto-save debounced)
  const { answers, loading: auditLoading, saving, savedAt, setAnswer: persistAnswer,
          markComplete, resetAudit: resetFirestore } = useAudit(segmento);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [view, setView] = useState<View>('checklist');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // ── Derived state ───────────────────────────────────────────────────────────
  const progress = calcProgress(flatQ, answers);
  const currentQ = flatQ[currentIdx];
  const currentAnswer = answers[`q${currentIdx}`];
  const isLast = currentIdx === flatQ.length - 1;
  const allAnswered = Object.keys(answers).length === flatQ.length;

  const score = useMemo(() => calcAuditScore(flatQ, answers), [flatQ, answers]);
  const areaScores = useMemo(() => calcAreaScores(areas, answers), [areas, answers]);
  const nonConformities = useMemo(() => getNonConformities(flatQ, answers), [flatQ, answers]);

  // Group flat questions by area for the sidebar progress
  const areaProgress = useMemo(() => {
    return areas.map(area => {
      const areaQs = flatQ.filter(q => q.areaId === area.id);
      const answered = areaQs.filter(q => answers[`q${q.globalIdx}`] !== undefined).length;
      return { area, answered, total: areaQs.length, firstIdx: areaQs[0]?.globalIdx ?? 0 };
    });
  }, [areas, flatQ, answers]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const setAnswer = useCallback((v: AuditAnswer) => {
    persistAnswer(`q${currentIdx}`, v);
  }, [currentIdx, persistAnswer]);

  const goNext = useCallback(() => {
    if (isLast) {
      handleSave();   // llama markComplete() + setView('results') + handleAiAnalysis()
      return;
    }
    setCurrentIdx(i => i + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLast]);

  const goPrev = useCallback(() => {
    setCurrentIdx(i => Math.max(0, i - 1));
  }, []);

  const handleSave = async () => {
    // Calcular no-conformidades para el Agente Pilar
    const ncs = getNonConformities(flatQ, answers);
    const nonConformities = ncs.map(nc => ({
      qKey:     nc.qKey,
      areaName: nc.areaName,
      question: nc.question,
      answer:   nc.answer as 'no' | 'parcial',
    }));
    await markComplete(score.score, flatQ.length, nonConformities);
    setView('results');
    // Trigger AI analysis when going to results
    handleAiAnalysis();
  };

  const handleAiAnalysis = async () => {
    if (aiLoading || aiAnalysis) return;
    const ncs = getNonConformities(flatQ, answers);
    if (ncs.length === 0) {
      setAiAnalysis('**Excelente cumplimiento.** No se detectaron no conformidades en esta auditoría. El servicio está en condiciones óptimas para la habilitación.');
      return;
    }
    setAiLoading(true);
    try {
      const uid = auth.currentUser?.uid ?? 'anon';
      const ncSummary = ncs.slice(0, 10).map(nc =>
        `- [${nc.answer === 'no' ? 'NO CUMPLE' : 'PARCIAL'}] ${nc.areaName}: ${nc.question}`
      ).join('\n');
      const question = `Soy una IPS con score de habilitación del ${score.score}% en ${meta?.label ?? segmento}. Tengo ${ncs.length} no conformidades:\n${ncSummary}\n\nDame un plan de acción priorizado con las 3 acciones más críticas para mejorar antes de la visita de habilitación.`;
      const result = await askWorker(question, {
        modulo: 'auditoria',
        uid,
        nit: '',
        ips_nombre: '',
        ips_tipo: segmento,
      });
      setAiAnalysis(result.answer);
    } catch {
      setAiAnalysis('No se pudo conectar con el Asistente IA. Verifica tu conexión.');
    } finally {
      setAiLoading(false);
    }
  };

  const resetAudit = async () => {
    await resetFirestore();
    setCurrentIdx(0);
    setView('checklist');
  };

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (auditLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  // ── Results view ─────────────────────────────────────────────────────────────
  if (view === 'results') {
    const color = scoreColor(score.score);
    const label = scoreLabel(score.score);

    return (
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/auditoria" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Servicios
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-600">{meta?.label ?? segmento}</span>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-800">Resultados</span>
        </div>

        {/* Score hero */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 flex flex-col sm:flex-row
                        items-center gap-6">
          <ScoreRing score={score.score} />
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              {meta?.icon} Auditoría {meta?.label}
            </h2>
            <p className="text-sm font-semibold" style={{ color }}>
              {label}
            </p>
            <div className="flex gap-4 mt-3 text-sm text-gray-500">
              <span><strong className="text-green-600">{score.si}</strong> Sí</span>
              <span><strong className="text-red-500">{score.no}</strong> No</span>
              <span><strong className="text-amber-500">{score.parcial}</strong> Parcial</span>
              {score.na > 0 && <span><strong className="text-gray-400">{score.na}</strong> N/A</span>}
              <span className="text-gray-400">de {score.effective} efectivos</span>
            </div>
          </div>
          <div className="sm:ml-auto flex gap-2 flex-wrap">
            {savedAt && (
              <span className="text-xs text-gray-400 self-center">
                ✓ Guardado automáticamente
              </span>
            )}
            <button
              onClick={async () => { await resetAudit(); }}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm
                         hover:bg-gray-50 transition"
            >
              Nueva auditoría
            </button>
          </div>
        </div>

        {/* Area breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">
            Resultados por área
          </h3>
          <div className="space-y-3">
            {areaScores.map(as => {
              const c = scoreColor(as.score);
              return (
                <div key={as.areaId}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-700">{as.icon} {as.areaName}</span>
                    <span className="text-sm font-bold" style={{ color: c }}>{as.score}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${as.score}%`, background: c }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {as.si} sí · {as.no} no · {as.parcial} parcial
                    {as.na > 0 ? ` · ${as.na} N/A` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Non-conformities */}
        {nonConformities.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h3 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">
              No conformidades ({nonConformities.length})
            </h3>
            <div className="space-y-3">
              {nonConformities.map(nc => (
                <div key={nc.globalIdx} className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-base flex-shrink-0 mt-0.5">
                    {nc.answer === 'no' ? '🔴' : '🟡'}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-0.5">
                      {nc.icon} {nc.areaName}
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                      {nc.question}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Recommendations */}
        <div className="bg-gradient-to-br from-teal-50 to-white rounded-2xl border border-teal-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-teal-800 text-sm uppercase tracking-wide flex items-center gap-2">
              🤖 Recomendaciones del Asistente IA
            </h3>
            {!aiAnalysis && !aiLoading && (
              <button
                onClick={handleAiAnalysis}
                className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
              >
                Analizar resultados
              </button>
            )}
          </div>

          {aiLoading && (
            <div className="flex items-center gap-3 text-sm text-teal-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600" />
              Analizando no conformidades con IA…
            </div>
          )}

          {aiAnalysis && !aiLoading && (
            <div className="prose prose-sm max-w-none text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
              {aiAnalysis}
            </div>
          )}

          {!aiAnalysis && !aiLoading && (
            <p className="text-sm text-teal-700/70">
              El Asistente IA analizará tus no conformidades y generará un plan de acción priorizado basado en la Res. 1732/2026.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Checklist view ────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/dashboard/auditoria" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Servicios
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-800">{meta?.icon} {meta?.label ?? segmento}</span>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Progreso {saving && <span className="italic">(guardando…)</span>}</span>
          <span>{Object.keys(answers).length} / {flatQ.length} criterios</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar — area progress */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Áreas</p>
            <div className="space-y-2">
              {areaProgress.map(ap => {
                const done = ap.answered === ap.total;
                const active = currentQ?.areaId === ap.area.id;
                return (
                  <button
                    key={ap.area.id}
                    onClick={() => setCurrentIdx(ap.firstIdx)}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs
                                transition-colors ${active
                                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                  : done
                                    ? 'text-gray-400 hover:bg-gray-50'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                  >
                    <span>{ap.area.icon}</span>
                    <span className="flex-1 line-clamp-1">{ap.area.name}</span>
                    {done
                      ? <span className="text-green-500 flex-shrink-0">✓</span>
                      : <span className="text-gray-300 flex-shrink-0 text-[10px]">
                          {ap.answered}/{ap.total}
                        </span>
                    }
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main question panel */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
            {/* Area + question number */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">{currentQ.icon}</span>
              <span className="text-xs font-medium text-teal-600">{currentQ.areaName}</span>
              <span className="text-gray-300 text-xs">·</span>
              <span className="text-xs text-gray-400">
                Criterio {currentQ.qInArea + 1}
              </span>
            </div>

            {/* Question text */}
            <p className="text-sm sm:text-base text-gray-800 leading-relaxed mb-2">
              {currentQ.question}
            </p>

            {/* Norm reference */}
            <p className="text-xs text-gray-400 mb-6">
              📋 {currentQ.norm}
            </p>

            {/* Answer buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <AnswerBtn
                value="si" current={currentAnswer} onSelect={setAnswer}
                label="Cumple completamente" emoji="✅"
                colorClass="text-green-700" activeBg="bg-green-50"
              />
              <AnswerBtn
                value="parcial" current={currentAnswer} onSelect={setAnswer}
                label="Cumple parcialmente" emoji="🟡"
                colorClass="text-amber-700" activeBg="bg-amber-50"
              />
              <AnswerBtn
                value="no" current={currentAnswer} onSelect={setAnswer}
                label="No cumple" emoji="❌"
                colorClass="text-red-700" activeBg="bg-red-50"
              />
            </div>

            {/* N/A option */}
            <div className="mb-6">
              <AnswerBtn
                value="na" current={currentAnswer} onSelect={setAnswer}
                label="No aplica a este establecimiento" emoji="⬜"
                colorClass="text-gray-500" activeBg="bg-gray-50"
              />
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <button
                onClick={goPrev}
                disabled={currentIdx === 0}
                className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg
                           hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                ← Anterior
              </button>

              <span className="text-xs text-gray-400">
                {currentIdx + 1} / {flatQ.length}
              </span>

              <button
                onClick={goNext}
                disabled={!currentAnswer}
                className="px-5 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg
                           hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {isLast ? 'Ver resultados →' : 'Siguiente →'}
              </button>
            </div>
          </div>

          {/* Jump to results if all answered */}
          {allAnswered && (
            <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-xl flex
                            items-center justify-between text-sm">
              <span className="text-teal-700 font-medium">
                ✅ Todos los criterios respondidos
              </span>
              <button
                onClick={handleSave}
                className="text-teal-600 font-semibold hover:underline"
              >
                Ver resultados →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
