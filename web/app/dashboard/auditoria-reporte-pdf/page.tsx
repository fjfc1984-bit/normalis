'use client';

/**
 * /dashboard/auditoria-reporte-pdf?segmento=<clave>
 *
 * Genera un reporte imprimible / exportable a PDF de una auditoría de
 * habilitación guardada en Firestore.
 *
 * Flujo:
 *  1. Lee el parámetro `segmento` de la URL.
 *  2. Carga el documento `auditorias/{uid}_{segmento}` de Firestore.
 *  3. Calcula scores por área y no conformidades usando las funciones existentes.
 *  4. Renderiza el reporte. El botón llama a window.print().
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { areasDB, SEGMENT_META } from '@/data/auditData';
import {
  buildFlatQuestions,
  calcAuditScore,
  calcAreaScores,
  getNonConformities,
  scoreColor,
  scoreLabel,
} from '@/lib/auditScore';
import type { AuditAnswers, AuditAreaScore, NonConformity } from '@/lib/auditTypes';

// ── Types ──────────────────────────────────────────────────────────────────────
interface AuditSessionRaw {
  uid: string;
  segmento: string;
  answers: AuditAnswers;
  score: number;
  totalQ: number;
  answeredQ: number;
  completedAt: string | null;
  updatedAt: string | null;
}

// ── Print styles injected via <style> to avoid Tailwind @media gap ─────────────
const PRINT_STYLE = `
  @media print {
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page-break { page-break-before: always; }
  }
`;

// ── Score badge ────────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const color = scoreColor(score);
  const label = scoreLabel(score);
  return (
    <div
      className="inline-flex flex-col items-center justify-center rounded-full border-8 w-36 h-36"
      style={{ borderColor: color }}
    >
      <span className="text-4xl font-black" style={{ color }}>{score}%</span>
      <span className="text-xs font-semibold mt-1 text-center leading-tight px-2" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

// ── Non-conformity badge ───────────────────────────────────────────────────────
function NcBadge({ answer }: { answer: 'no' | 'parcial' }) {
  return answer === 'no'
    ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">NO CUMPLE</span>
    : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">PARCIAL</span>;
}

// ── Main report ────────────────────────────────────────────────────────────────
function ReportContent() {
  const searchParams = useSearchParams();
  const segmento     = searchParams.get('segmento') ?? '';
  const { user, nombre, nit, loading: authLoading } = useAuth();

  const [session,    setSession]    = useState<AuditSessionRaw | null>(null);
  const [areaScores, setAreaScores] = useState<AuditAreaScore[]>([]);
  const [nonConfs,   setNonConfs]   = useState<NonConformity[]>([]);
  const [globalScore, setGlobalScore] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const meta  = SEGMENT_META[segmento];
  const areas = areasDB[segmento] ?? [];

  // Load audit session from Firestore
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setError('Sesión no encontrada. Inicia sesión primero.'); setLoading(false); return; }
    if (!segmento) { setError('Parámetro segmento requerido en la URL.'); setLoading(false); return; }

    const docId = `${user.uid}_${segmento}`;
    getDoc(doc(db, 'auditorias', docId))
      .then(snap => {
        if (!snap.exists()) {
          setError(`No se encontró ninguna auditoría guardada para "${meta?.label ?? segmento}". Completa la auditoría primero.`);
          return;
        }
        const data = snap.data() as AuditSessionRaw;
        setSession(data);

        // Calculate scores
        const flat  = buildFlatQuestions(areas);
        const ans   = data.answers ?? {};
        const gs    = calcAuditScore(flat, ans);
        const as_   = calcAreaScores(areas, ans);
        const nc    = getNonConformities(flat, ans);

        setGlobalScore(gs.score);
        setAreaScores(as_);
        setNonConfs(nc);
      })
      .catch(err => setError(`Error cargando datos: ${String(err)}`))
      .finally(() => setLoading(false));
  }, [authLoading, user, segmento, areas, meta]);

  // ── Loading / Error states ──────────────────────────────────────────────────
  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Cargando reporte…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="text-gray-700 font-medium">{error}</p>
          <button
            onClick={() => history.back()}
            className="mt-6 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 no-print"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  // ── Date formatting ─────────────────────────────────────────────────────────
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  const completedAt = fmtDate(session?.completedAt ?? null);
  const updatedAt   = fmtDate(session?.updatedAt   ?? null);

  // Summary counts
  const totalQ  = areaScores.reduce((s, a) => s + a.total, 0);
  const totalSi = areaScores.reduce((s, a) => s + a.si, 0);
  const totalNo = areaScores.reduce((s, a) => s + a.no, 0);
  const totalPa = areaScores.reduce((s, a) => s + a.parcial, 0);
  const totalNa = areaScores.reduce((s, a) => s + a.na, 0);

  return (
    <>
      {/* Print styles */}
      <style>{PRINT_STYLE}</style>

      {/* ── Toolbar (hidden on print) ─────────────────────────────────────── */}
      <div className="no-print sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => history.back()}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ← Volver
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700">
            {meta?.icon} Reporte — {meta?.label ?? segmento}
          </span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold
                     rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
        >
          🖨️ Imprimir / Exportar PDF
        </button>
      </div>

      {/* ── Report body ──────────────────────────────────────────────────── */}
      <div className="min-h-screen bg-white p-8 max-w-4xl mx-auto font-sans text-gray-800">

        {/* Header */}
        <header className="mb-8 pb-5 border-b-2 border-teal-600 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl font-black text-teal-700 tracking-tight">NormaLis</span>
              <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2 py-0.5 font-medium">
                Habilitación · Auditoría
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {meta?.norm ?? 'Resolución 3100 de 2019'} — Sistema de Gestión de Calidad
            </p>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold text-gray-800">Reporte de Auditoría de Habilitación</h1>
            <p className="text-sm text-gray-500 mt-1">
              Servicio: <strong>{meta?.icon} {meta?.label ?? segmento}</strong>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Fecha de generación: {new Date().toLocaleDateString('es-CO')}</p>
          </div>
        </header>

        {/* IPS Info + Score */}
        <section className="mb-8 flex flex-col sm:flex-row gap-6 items-start">
          {/* IPS data */}
          <div className="flex-1 bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Datos del prestador</h2>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
              <div>
                <p className="text-xs text-gray-400">Nombre IPS</p>
                <p className="font-semibold text-gray-800">{nombre || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">NIT</p>
                <p className="font-semibold text-gray-800">{nit || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Fecha de auditoría</p>
                <p className="font-medium text-gray-700">{completedAt !== '—' ? completedAt : updatedAt}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Última actualización</p>
                <p className="font-medium text-gray-700">{updatedAt}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400">Tipo de auditoría</p>
                <p className="font-medium text-gray-700">Autoevaluación interna — Habilitación</p>
              </div>
            </div>
          </div>

          {/* Score circle */}
          <div className="flex flex-col items-center gap-3">
            <ScoreBadge score={globalScore} />
            <p className="text-xs text-gray-500 text-center max-w-[140px]">Puntaje global de cumplimiento</p>
          </div>
        </section>

        {/* Summary counters */}
        <section className="mb-8 grid grid-cols-5 gap-3">
          {[
            { label: 'Total criterios', value: totalQ,  bg: 'bg-gray-50',     text: 'text-gray-700' },
            { label: 'Cumple',          value: totalSi, bg: 'bg-emerald-50',  text: 'text-emerald-700' },
            { label: 'No cumple',       value: totalNo, bg: 'bg-red-50',      text: 'text-red-700' },
            { label: 'Parcial',         value: totalPa, bg: 'bg-amber-50',    text: 'text-amber-700' },
            { label: 'No aplica',       value: totalNa, bg: 'bg-blue-50',     text: 'text-blue-700' },
          ].map(c => (
            <div key={c.label} className={`${c.bg} rounded-xl p-4 text-center border border-white shadow-sm`}>
              <p className={`text-2xl font-black ${c.text}`}>{c.value}</p>
              <p className="text-xs text-gray-500 mt-1">{c.label}</p>
            </div>
          ))}
        </section>

        {/* Area scores chart */}
        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-800 mb-4 pb-1 border-b border-gray-200">
            📊 Cumplimiento por área
          </h2>
          {areaScores.length > 0 ? (
            <div className="space-y-2">
              {areaScores.map(a => (
                <div key={a.areaId} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-44 shrink-0 truncate">
                    {a.icon} {a.areaName}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                      style={{ width: `${a.score}%`, backgroundColor: scoreColor(a.score) }}
                    />
                  </div>
                  <span
                    className="text-xs font-bold w-10 text-right"
                    style={{ color: scoreColor(a.score) }}
                  >
                    {a.score}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">Sin datos de áreas.</p>
          )}
        </section>

        {/* Area detail table */}
        <section className="mb-8 page-break">
          <h2 className="text-base font-bold text-gray-800 mb-4 pb-1 border-b border-gray-200">
            📋 Detalle por área
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-teal-700 text-white">
                <th className="py-2 px-3 text-left font-semibold rounded-tl-lg">Área</th>
                <th className="py-2 px-3 text-center font-semibold">Criterios</th>
                <th className="py-2 px-3 text-center font-semibold">✅ Cumple</th>
                <th className="py-2 px-3 text-center font-semibold">❌ No cumple</th>
                <th className="py-2 px-3 text-center font-semibold">⚠️ Parcial</th>
                <th className="py-2 px-3 text-center font-semibold rounded-tr-lg">Puntaje</th>
              </tr>
            </thead>
            <tbody>
              {areaScores.map((a, i) => (
                <tr key={a.areaId} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-2 px-3 font-medium">{a.icon} {a.areaName}</td>
                  <td className="py-2 px-3 text-center text-gray-600">{a.total}</td>
                  <td className="py-2 px-3 text-center text-emerald-700 font-semibold">{a.si}</td>
                  <td className="py-2 px-3 text-center text-red-600 font-semibold">{a.no}</td>
                  <td className="py-2 px-3 text-center text-amber-600 font-semibold">{a.parcial}</td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: scoreColor(a.score) }}
                    >
                      {a.score}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Non-conformities */}
        {nonConfs.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-bold text-gray-800 mb-4 pb-1 border-b border-gray-200">
              🚨 Hallazgos — No conformidades ({nonConfs.length})
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Criterios que requieren plan de mejoramiento según Resolución 3100/2019 Est. 1 al 7.
            </p>
            <div className="space-y-2">
              {nonConfs.map((nc, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-lg px-4 py-3 border text-sm
                    ${nc.answer === 'no'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                    }`}
                >
                  <div className="shrink-0 mt-0.5">
                    <NcBadge answer={nc.answer} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-0.5">
                      {nc.icon} {nc.areaName} — criterio #{nc.globalIdx + 1}
                    </p>
                    <p className="text-gray-800 leading-snug">{nc.question}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {nonConfs.length === 0 && (
          <section className="mb-8">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-emerald-700 font-semibold">Sin hallazgos de no conformidad</p>
              <p className="text-xs text-emerald-600 mt-1">
                Todos los criterios evaluados cumplen o no aplican.
              </p>
            </div>
          </section>
        )}

        {/* Signature section */}
        <section className="mt-12 pt-6 border-t border-gray-200 grid grid-cols-2 gap-12">
          <div>
            <div className="h-16 border-b border-gray-300 mb-2" />
            <p className="text-xs text-gray-500">Firma del Auditor</p>
            <p className="text-xs text-gray-400 mt-0.5">Nombre: ___________________________</p>
            <p className="text-xs text-gray-400 mt-0.5">Cargo: _____________________________</p>
          </div>
          <div>
            <div className="h-16 border-b border-gray-300 mb-2" />
            <p className="text-xs text-gray-500">Firma del Representante Legal / Director</p>
            <p className="text-xs text-gray-400 mt-0.5">Nombre: ___________________________</p>
            <p className="text-xs text-gray-400 mt-0.5">Cargo: _____________________________</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-10 pt-4 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400">
          <span>NormaLis · Plataforma de Habilitación y Auditoría · normalis.co</span>
          <span>Generado: {new Date().toLocaleString('es-CO')} · Confidencial</span>
        </footer>
      </div>
    </>
  );
}

// ── Page export (wraps in Suspense — requerido por useSearchParams en Next.js 15) ──
export default function AuditoriaReportePdfPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ReportContent />
    </Suspense>
  );
}
