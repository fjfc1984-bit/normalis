'use client';

/**
 * web/app/dashboard/cumplimiento/page.tsx
 * Cumplimiento Integrado — conecta Auditoría ↔ ISO 31000 ↔ CAPAs ↔ Indicadores
 * Base legal: Res. 1732/2026 · ISO 31000:2018 · ISO 7101:2023 · JCI 8ª Edición
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { db, auth } from '@/lib/firebase';
import {
  collection, query, where, getDocs,
  addDoc, serverTimestamp, onSnapshot, orderBy, limit,
} from 'firebase/firestore';
import Link from 'next/link';
import {
  SectionHeader, LoadingSpinner, Toast, useToast, KpiCard,
} from '@/components/ui';
import { areasDB } from '@/data/auditData';
import { buildFlatQuestions, getNonConformities } from '@/lib/auditScore';
import type { AuditAnswers, NonConformity } from '@/lib/auditTypes';
import { ejecutarAgentePilar } from '@/lib/agentePilar';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Categoria =
  | 'Asistencial' | 'Normativo' | 'Talento Humano' | 'Dotación'
  | 'Medicamentos' | 'Infraestructura' | 'Tecnología' | 'Financiero';
type Nivel = 'bajo' | 'medio' | 'alto' | 'extremo';
type Tratamiento = 'Evitar' | 'Reducir' | 'Transferir' | 'Aceptar';

interface SavedAudit {
  uid:            string;
  segmento:       string;
  answers:        AuditAnswers;
  score:          number;
  completedAt:    string | null;
  agenteStatus?:  string;
  agenteResumen?: {
    riesgosCreados:  number;
    capasCreadadas:  number;
    ncsProcessadas:  number;
    errores:         string[] | null;
  };
  agenteProcessedAt?: string;
  agenteProcesandoDesde?: string;
}

interface AuditNonConf extends NonConformity {
  segmento: string;
  segLabel: string;
  /** true si la auditoría de origen ya fue procesada por el Agente Pilar —
   *  evita que el usuario duplique el riesgo importándolo también a mano. */
  agenteProcesado: boolean;
}

// ── Constantes y helpers ──────────────────────────────────────────────────────

const SEG_META: Record<string, { label: string; icon: string }> = {
  consulta_externa: { label: 'Consulta Externa', icon: '🏥' },
  urgencias:        { label: 'Urgencias',         icon: '🚨' },
  hospitalizacion:  { label: 'Hospitalización',   icon: '🛏️' },
  cirugia:          { label: 'Cirugía',            icon: '🔬' },
  laboratorio:      { label: 'Laboratorio',        icon: '🧪' },
  odontologia:      { label: 'Odontología',        icon: '🦷' },
  imagenologia:     { label: 'Imagenología',       icon: '🩻' },
  rehabilitacion:   { label: 'Rehabilitación',     icon: '♿' },
};

// Estimación propia de NormaLis de equivalencia Res. 1732/2026 → ISO 7101:2023 / JCI 8ª ed.
// NO existe un crosswalk oficial publicado entre la Res. 1732/2026 y estos estándares
// internacionales — estos dos factores son una aproximación editorial (mismo criterio
// usado en el módulo Comparador, app/dashboard/comparador/page.tsx), no una cifra
// certificada. Una IPS con 100% en Res. 1732/2026 cubriría, según esta estimación,
// ≈84% de ISO 7101 (los estándares ISO incluyen requisitos de gestión organizacional
// y mejora continua adicionales) y ≈71% de JCI (alcance internacional, más exigente).
const ISO7101_FACTOR = 0.84;
const JCI_FACTOR     = 0.71;

function segLabel(seg: string): string {
  return SEG_META[seg]?.label ?? seg.replace(/_/g, ' ');
}

function areaToCategoria(areaName: string): Categoria {
  const n = areaName.toLowerCase();
  if (n.includes('talento') || n.includes('personal') || n.includes('recurso')) return 'Talento Humano';
  if (n.includes('infra') || n.includes('planta') || n.includes('ambient')) return 'Infraestructura';
  if (n.includes('dotac') || n.includes('equipo') || n.includes('bioméd')) return 'Dotación';
  if (n.includes('medic') || n.includes('farmac') || n.includes('dispositiv')) return 'Medicamentos';
  if (n.includes('tecnolog') || n.includes('siste') || n.includes('informátic')) return 'Tecnología';
  if (n.includes('proceso') || n.includes('histor') || n.includes('clínic') || n.includes('atenci')) return 'Asistencial';
  return 'Normativo';
}

function calcNivel(p: number, i: number): Nivel {
  const s = p * i;
  if (s <= 4)  return 'bajo';
  if (s <= 9)  return 'medio';
  if (s <= 16) return 'alto';
  return 'extremo';
}

function scoreColor(s: number): string {
  if (s >= 85) return '#10b981';
  if (s >= 70) return '#f59e0b';
  return '#ef4444';
}

function scoreLabel(s: number): string {
  if (s >= 85) return 'Habilitación probable';
  if (s >= 70) return 'Riesgo moderado';
  return 'Riesgo alto';
}

// ── Barra de progreso ─────────────────────────────────────────────────────────

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-2 rounded-full overflow-hidden bg-gray-100">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, value)}%`, background: color }}
      />
    </div>
  );
}

// ── Gauge semicircular ────────────────────────────────────────────────────────

function Gauge({
  score,
  label,
  sub,
}: { score: number; label: string; sub: string }) {
  const r      = 38;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color  = scoreColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 100" className="w-28 h-28">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="9" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="9"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="50" y="48" textAnchor="middle" fontSize="20" fontWeight="bold" fill={color}>
          {score}%
        </text>
        <text x="50" y="62" textAnchor="middle" fontSize="8.5" fill="#9ca3af">
          equivalencia
        </text>
      </svg>
      <p className="text-sm font-bold text-gray-800 text-center leading-tight">{label}</p>
      <p className="text-[10px] text-gray-400 text-center">{sub}</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Página principal
// ════════════════════════════════════════════════════════════════════════════

export default function CumplimientoPage() {
  const { user, nit } = useAuth();
  const { toast, show } = useToast();

  const [audits,        setAudits]        = useState<SavedAudit[]>([]);
  const [riesgosCount,  setRiesgosCount]  = useState(0);
  const [capasAbiertas, setCapasAbiertas] = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [importing,     setImporting]     = useState(false);
  const [selected,      setSelected]      = useState<Set<string>>(new Set());
  const [showAll,       setShowAll]       = useState(false);
  const [agenteAudits,  setAgenteAudits]  = useState<SavedAudit[]>([]);
  const [agenteProcesando, setAgenteProcesando] = useState(false);
  const [agentePendientes, setAgentePendientes] = useState<SavedAudit[]>([]);
  const [reintentando,  setReintentando]  = useState<string | null>(null);

  // ── Auditorías completadas ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'auditorias'), where('uid', '==', user.uid));
    getDocs(q)
      .then(snap => {
        const all = snap.docs.map(d => d.data() as SavedAudit);
        setAudits(all.filter(a => !!a.completedAt));
      })
      .catch(() => {/* sin permisos aún */})
      .finally(() => setLoading(false));
  }, [user]);

  // ── Actividad del Agente Pilar (tiempo real) ───────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'auditorias'),
      where('uid', '==', user.uid),
    );
    // Una llamada real al Agente Pilar toma ~10-20s. Si sigue en
    // 'procesando' mucho más que eso, casi seguro es una llamada huérfana
    // (el usuario cerró la pestaña o navegó fuera justo después de
    // completar la auditoría, abortando el fetch a mitad de camino) — se
    // trata como atascada y se ofrece reintento en vez de dejarla mostrando
    // "Procesando…" para siempre.
    const UMBRAL_ATASCADA_MS = 3 * 60 * 1000;
    const estaAtascada = (a: SavedAudit) =>
      a.agenteStatus === 'procesando' &&
      !!a.agenteProcesandoDesde &&
      Date.now() - new Date(a.agenteProcesandoDesde).getTime() > UMBRAL_ATASCADA_MS;

    return onSnapshot(q, snap => {
      const all = snap.docs.map(d => d.data() as SavedAudit);
      const procesadas = all.filter(a => a.agenteStatus === 'completado' || a.agenteStatus === 'error');
      const procesando = all.some(a => a.agenteStatus === 'procesando' && !estaAtascada(a));
      // Auditorías completadas cuyo Agente Pilar nunca corrió ('pendiente' —
      // p. ej. auditorías anteriores a este backend), que fallaron
      // ('error'), o que quedaron atascadas en 'procesando': se ofrece un
      // reintento manual en vez de dejarlas así para siempre.
      const pendientes = all.filter(a =>
        !!a.completedAt && (a.agenteStatus === 'pendiente' || a.agenteStatus === 'error' || estaAtascada(a)),
      );
      setAgenteAudits(procesadas.sort((a, b) =>
        (b.agenteProcessedAt ?? '').localeCompare(a.agenteProcessedAt ?? '')
      ).slice(0, 5));
      setAgenteProcesando(procesando);
      setAgentePendientes(pendientes);
    }, () => {});
  }, [user]);

  // ── Reintento manual del Agente Pilar para auditorías atascadas/erradas ────
  const reintentarAgente = useCallback(async (audit: SavedAudit) => {
    if (!user) return;
    setReintentando(audit.segmento);
    try {
      const areas = areasDB[audit.segmento];
      if (!areas) throw new Error('Segmento de auditoría no reconocido');
      const flatQ = buildFlatQuestions(areas);
      const ncs = getNonConformities(flatQ, audit.answers).map(nc => ({
        qKey:     nc.qKey,
        areaName: nc.areaName,
        question: nc.question,
        answer:   nc.answer as 'no' | 'parcial',
      }));
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Sesión expirada — vuelve a iniciar sesión');
      await ejecutarAgentePilar(user.uid, idToken, nit ?? '', audit.segmento, segLabel(audit.segmento), ncs);
      show('✅ Agente Pilar reprocesado — revisa Análisis de Riesgo y CAPAs.', 'success');
    } catch (err) {
      console.error('[Cumplimiento] reintentarAgente:', err);
      show('Error al reprocesar con el Agente Pilar. Intenta de nuevo en un momento.', 'error');
    } finally {
      setReintentando(null);
    }
  }, [user, nit, show]);

  // ── Riesgos ISO 31000 ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      collection(db, 'riesgos', user.uid, 'items'),
      snap => setRiesgosCount(snap.size),
      () => {},
    );
  }, [user]);

  // ── CAPAs pendientes ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const base = nit
      ? query(collection(db, 'capas'), where('nit', '==', nit), where('estado', 'in', ['abierta', 'en_progreso']))
      : query(collection(db, 'capas'), where('uid', '==', user.uid), where('estado', 'in', ['abierta', 'en_progreso']));
    return onSnapshot(base, snap => setCapasAbiertas(snap.size), () => setCapasAbiertas(0));
  }, [user, nit]);

  // ── Métricas derivadas ─────────────────────────────────────────────────────
  const avgScore = useMemo(() => {
    if (!audits.length) return 0;
    return Math.round(audits.reduce((s, a) => s + (a.score || 0), 0) / audits.length);
  }, [audits]);

  const iso7101Score = Math.round(avgScore * ISO7101_FACTOR);
  const jciScore     = Math.round(avgScore * JCI_FACTOR);

  // ── No conformidades de todas las auditorías ───────────────────────────────
  const allNonConfs = useMemo<AuditNonConf[]>(() => {
    const result: AuditNonConf[] = [];
    for (const audit of audits) {
      const areas = areasDB[audit.segmento];
      if (!areas) continue;
      const flatQ = buildFlatQuestions(areas);
      const agenteProcesado = audit.agenteStatus === 'completado';
      getNonConformities(flatQ, audit.answers).forEach(nc =>
        result.push({ ...nc, segmento: audit.segmento, segLabel: segLabel(audit.segmento), agenteProcesado }),
      );
    }
    return result;
  }, [audits]);

  const visibleNCs = showAll ? allNonConfs : allNonConfs.slice(0, 8);

  // ── Toggle selección ───────────────────────────────────────────────────────
  const ncKey = (nc: AuditNonConf) => `${nc.segmento}_${nc.globalIdx}`;

  const toggleNC = (key: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleAll = () =>
    setSelected(
      selected.size === allNonConfs.length
        ? new Set()
        : new Set(allNonConfs.map(nc => ncKey(nc))),
    );

  // ── Importar no conformidades como riesgos ISO 31000 ──────────────────────
  const importarRiesgos = useCallback(async () => {
    if (!user || !selected.size) return;
    setImporting(true);
    try {
      const toImport = allNonConfs.filter(nc => selected.has(ncKey(nc)));
      const col = collection(db, 'riesgos', user.uid, 'items');
      const fechaRevision = new Date();
      fechaRevision.setMonth(fechaRevision.getMonth() + 3);
      const fechaStr = fechaRevision.toISOString().split('T')[0];

      for (const nc of toImport) {
        const probabilidad = nc.answer === 'no' ? 3 : 2;
        const impacto = 4;
        await addDoc(col, {
          nombre: nc.question.length > 80 ? nc.question.slice(0, 77) + '…' : nc.question,
          categoria:     areaToCategoria(nc.areaName),
          probabilidad,
          impacto,
          nivel:         calcNivel(probabilidad, impacto),
          puntuacion:    probabilidad * impacto,
          tratamiento:   'Reducir' as Tratamiento,
          responsable:   '',
          fechaRevision: fechaStr,
          descripcion:   `No conformidad — Auditoría ${nc.segLabel} · Área: ${nc.areaName}. Respuesta: ${nc.answer === 'no' ? 'No cumple' : 'Cumple parcialmente'}.`,
          origen:        'auditoria',
          segmento:      nc.segmento,
          creadoEn:      serverTimestamp(),
        });
      }

      show(
        `✅ ${toImport.length} riesgo${toImport.length !== 1 ? 's' : ''} importado${toImport.length !== 1 ? 's' : ''} a ISO 31000`,
        'success',
      );
      setSelected(new Set());
    } catch {
      show('Error al importar riesgos. Verifica los permisos de Firestore.', 'error');
    } finally {
      setImporting(false);
    }
  }, [user, selected, allNonConfs, show]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return <LoadingSpinner fullHeight />;

  const hasAudits = audits.length > 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Toast toast={toast} />

      <SectionHeader
        title="Cumplimiento Integrado"
        subtitle="Auditoría · ISO 31000:2018 · ISO 7101:2023 · JCI 8ª ed. · CAPAs — Res. 1732/2026"
        actions={
          <Link
            href="/dashboard/auditoria"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700
                       text-white text-sm font-bold rounded-xl transition-colors"
          >
            + Nueva auditoría
          </Link>
        }
      />

      {/* ── AGENTE PILAR ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border overflow-hidden"
           style={{ borderColor: agenteProcesando ? '#0d9488' : (agenteAudits.length > 0 ? '#d1fae5' : '#e5e7eb'),
                    background: agenteProcesando ? 'linear-gradient(135deg,#f0fdfa,#ecfdf5)' : (agenteAudits.length > 0 ? '#f0fdf4' : '#fafafa') }}>
        <div className="px-5 py-4 flex items-center gap-3"
             style={{ borderBottom: '1px solid', borderColor: agenteProcesando ? '#99f6e4' : (agenteAudits.length > 0 ? '#bbf7d0' : '#f3f4f6') }}>
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black text-white"
                 style={{ background: 'linear-gradient(135deg,#0d9488,#0891b2)' }}>
              🤖
            </div>
            {agenteProcesando && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-teal-400 border-2 border-white animate-ping" />
            )}
            {!agenteProcesando && agenteAudits.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 leading-tight">Agente Pilar</p>
            <p className="text-[11px] mt-0.5"
               style={{ color: agenteProcesando ? '#0d9488' : (agenteAudits.length > 0 ? '#059669' : '#9ca3af') }}>
              {agenteProcesando
                ? '⚡ Procesando auditoría — generando riesgos y CAPAs con IA...'
                : agenteAudits.length > 0
                  ? `✅ Activo — ${agenteAudits.reduce((s,a) => s + (a.agenteResumen?.riesgosCreados ?? 0), 0)} riesgos · ${agenteAudits.reduce((s,a) => s + (a.agenteResumen?.capasCreadadas ?? 0), 0)} CAPAs generadas automáticamente`
                  : 'Esperando primera auditoría completada para activarse'}
            </p>
          </div>
          {(agenteProcesando || agenteAudits.length > 0) && (
            <div className="flex gap-3 flex-shrink-0">
              <div className="text-center">
                <p className="text-lg font-black" style={{ color: '#0d9488' }}>
                  {agenteAudits.reduce((s,a) => s + (a.agenteResumen?.riesgosCreados ?? 0), 0)}
                </p>
                <p className="text-[9px] text-gray-400 uppercase tracking-wide">Riesgos</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black" style={{ color: '#0891b2' }}>
                  {agenteAudits.reduce((s,a) => s + (a.agenteResumen?.capasCreadadas ?? 0), 0)}
                </p>
                <p className="text-[9px] text-gray-400 uppercase tracking-wide">CAPAs IA</p>
              </div>
            </div>
          )}
        </div>

        {agenteAudits.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {agenteAudits.map((a, i) => {
              const meta = SEG_META[a.segmento];
              const timeAgo = a.agenteProcessedAt
                ? (() => {
                    const diff = Date.now() - new Date(a.agenteProcessedAt).getTime();
                    const mins = Math.floor(diff / 60000);
                    const hrs  = Math.floor(diff / 3600000);
                    const days = Math.floor(diff / 86400000);
                    if (days > 0) return `hace ${days}d`;
                    if (hrs  > 0) return `hace ${hrs}h`;
                    return `hace ${mins}min`;
                  })()
                : '';
              const ok = a.agenteStatus === 'completado';
              return (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-base">{meta?.icon ?? '🏥'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700 truncate">
                      {meta?.label ?? a.segmento} — Score {a.score}%
                    </p>
                    {a.agenteResumen && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {ok ? '✅' : '⚠️'} {a.agenteResumen.riesgosCreados} riesgo{a.agenteResumen.riesgosCreados !== 1 ? 's' : ''} · {a.agenteResumen.capasCreadadas} CAPA{a.agenteResumen.capasCreadadas !== 1 ? 's' : ''} IA · {a.agenteResumen.ncsProcessadas} NC analizadas
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-gray-400">{timeAgo}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                      {ok ? 'OK' : 'Error'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : !agenteProcesando ? (
          <div className="px-5 py-4 text-center">
            <p className="text-xs text-gray-400">
              Completa una auditoría → el Agente Pilar creará automáticamente los riesgos ISO 31000 y los planes CAPA con IA.
            </p>
          </div>
        ) : null}

        {agentePendientes.length > 0 && (
          <div className="px-5 py-3 border-t" style={{ borderColor: '#fde68a', background: '#fffbeb' }}>
            <p className="text-[11px] font-semibold text-amber-700 mb-2">
              ⚠️ {agentePendientes.length} auditoría{agentePendientes.length !== 1 ? 's' : ''} completada{agentePendientes.length !== 1 ? 's' : ''} sin procesar por el Agente Pilar
            </p>
            <div className="space-y-1.5">
              {agentePendientes.map(a => {
                const meta = SEG_META[a.segmento];
                const enCurso = reintentando === a.segmento;
                // Se deshabilitan TODOS los botones mientras cualquier
                // reintento está en curso — dos reintentos concurrentes
                // podrían leer el mismo conteo de CAPAs antes de que
                // cualquiera termine de escribir y numerarlas duplicado.
                const bloqueado = reintentando !== null;
                return (
                  <div key={a.segmento} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-amber-200">
                    <span className="text-sm">{meta?.icon ?? '🏥'}</span>
                    <span className="text-xs text-gray-600 flex-1 min-w-0 truncate">
                      {meta?.label ?? a.segmento}
                      {a.agenteStatus === 'error' && <span className="text-red-500"> — error previo</span>}
                    </span>
                    <button
                      onClick={() => reintentarAgente(a)}
                      disabled={bloqueado}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600
                                 disabled:opacity-50 text-white transition-colors flex-shrink-0"
                    >
                      {enCurso ? 'Procesando…' : bloqueado ? 'Espera…' : '🔄 Procesar con Agente Pilar'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard
          label="Auditorías completadas"
          value={audits.length}
          icon="🔍"
          colorClass={audits.length > 0 ? 'text-teal-700' : 'text-gray-400'}
        />
        <KpiCard
          label="Score promedio"
          value={hasAudits ? `${avgScore}%` : '—'}
          icon="📊"
          colorClass={
            !hasAudits ? 'text-gray-400'
            : avgScore >= 85 ? 'text-emerald-700'
            : avgScore >= 70 ? 'text-amber-600'
            : 'text-red-600'
          }
          borderColorClass={
            !hasAudits ? 'border-gray-200'
            : avgScore >= 85 ? 'border-emerald-200'
            : avgScore >= 70 ? 'border-amber-200'
            : 'border-red-200'
          }
        />
        <KpiCard
          label="No conformidades"
          value={allNonConfs.length}
          icon="⚠️"
          colorClass={allNonConfs.length > 0 ? 'text-amber-600' : 'text-emerald-700'}
          borderColorClass={allNonConfs.length > 0 ? 'border-amber-200' : 'border-emerald-200'}
        />
        <KpiCard
          label="Riesgos ISO 31000"
          value={riesgosCount}
          icon="🛡️"
          colorClass={riesgosCount > 0 ? 'text-orange-700' : 'text-gray-400'}
          borderColorClass={riesgosCount > 0 ? 'border-orange-200' : 'border-gray-200'}
        />
        <KpiCard
          label="CAPAs pendientes"
          value={capasAbiertas}
          icon="✓"
          colorClass={capasAbiertas > 0 ? 'text-orange-600' : 'text-emerald-700'}
          borderColorClass={capasAbiertas > 0 ? 'border-orange-200' : 'border-emerald-200'}
        />
      </div>

      {/* ── Sin auditorías ─────────────────────────────────────────────────── */}
      {!hasAudits ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            Sin auditorías completadas aún
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Completa al menos una auditoría de habilitación para ver tu perfil
            de cumplimiento integrado con ISO 7101:2023 y JCI.
          </p>
          <Link
            href="/dashboard/auditoria"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700
                       text-white text-sm font-bold rounded-xl transition-colors"
          >
            🔍 Iniciar primera auditoría
          </Link>
        </div>
      ) : (
        <>
          {/* ── Equivalencia Internacional ──────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-800">
                  Equivalencia Internacional — Calculada desde tus auditorías reales
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Score promedio actual: <span className="font-bold" style={{ color: scoreColor(avgScore) }}>{avgScore}%</span>
                  &nbsp;·&nbsp;{scoreLabel(avgScore)}
                  &nbsp;·&nbsp;{audits.length} auditoría{audits.length !== 1 ? 's' : ''} completada{audits.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Link
                href="/dashboard/comparador"
                className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
              >
                Ver crosswalk detallado →
              </Link>
            </div>
            <div className="flex flex-wrap justify-around gap-8 py-2">
              <Gauge
                score={avgScore}
                label="Res. 1732/2026"
                sub="Habilitación Colombia"
              />
              <Gauge
                score={iso7101Score}
                label="ISO 7101:2023"
                sub="Gestión Calidad Salud"
              />
              <Gauge
                score={jciScore}
                label="JCI 8ª Edición"
                sub="Joint Commission Intl."
              />
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-4">
              Crosswalk: ISO 7101 ≈ 84% del puntaje de habilitación · JCI ≈ 71% · Método: promedio ponderado de criterios mapeados
            </p>
          </div>

          {/* ── Auditorías completadas ────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">
              Detalle por servicio
            </h3>
            <div className="space-y-4">
              {audits.map(audit => {
                const meta = SEG_META[audit.segmento];
                const sc   = audit.score || 0;
                const col  = scoreColor(sc);
                return (
                  <div key={audit.segmento} className="flex items-center gap-4">
                    <span className="text-xl w-7 text-center flex-shrink-0">
                      {meta?.icon ?? '📋'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-medium text-gray-700">
                          {meta?.label ?? audit.segmento.replace(/_/g, ' ')}
                        </p>
                        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                          <span className="text-xs text-gray-400">{scoreLabel(sc)}</span>
                          <span className="text-sm font-bold" style={{ color: col }}>
                            {sc}%
                          </span>
                        </div>
                      </div>
                      <ProgressBar value={sc} color={col} />
                    </div>
                    <Link
                      href={`/dashboard/auditoria/${audit.segmento}`}
                      className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex-shrink-0 ml-1"
                    >
                      Ver →
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── No conformidades → ISO 31000 ─────────────────────────────────── */}
          {allNonConfs.length > 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">
                    No conformidades → Importar como riesgos ISO 31000
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {allNonConfs.length} no conformidad{allNonConfs.length !== 1 ? 'es' : ''} detectada{allNonConfs.length !== 1 ? 's' : ''} —
                    selecciona las que quieres convertir en riesgos
                  </p>
                  {allNonConfs.some(nc => nc.agenteProcesado) && (
                    <p className="text-[10px] text-teal-600 mt-1">
                      🤖 Las marcadas &quot;Ya en Agente Pilar&quot; vienen de una auditoría que la IA ya
                      analizó — impórtalas solo si crees que falta un riesgo específico, para evitar duplicados.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {selected.size > 0 && (
                    <button
                      onClick={importarRiesgos}
                      disabled={importing}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-orange-500
                                 hover:bg-orange-600 disabled:opacity-50 text-white text-xs
                                 font-bold rounded-xl transition-colors"
                    >
                      {importing
                        ? '⏳ Importando…'
                        : `📥 Importar ${selected.size} riesgo${selected.size !== 1 ? 's' : ''}`
                      }
                    </button>
                  )}
                  <button
                    onClick={toggleAll}
                    className="text-xs text-teal-600 hover:text-teal-700 font-semibold px-2 py-1"
                  >
                    {selected.size === allNonConfs.length
                      ? 'Deseleccionar todo'
                      : 'Seleccionar todo'
                    }
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {visibleNCs.map(nc => {
                  const key  = ncKey(nc);
                  const isSel = selected.has(key);
                  return (
                    <label
                      key={key}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all
                        ${isSel
                          ? 'border-orange-300 bg-orange-50'
                          : 'border-gray-100 bg-gray-50 hover:border-gray-300'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggleNC(key)}
                        className="mt-0.5 flex-shrink-0 accent-orange-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                            {nc.segLabel}
                          </span>
                          <span className="text-[10px] text-gray-500">{nc.icon} {nc.areaName}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                            ${nc.answer === 'no'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                            }`}>
                            {nc.answer === 'no' ? 'No cumple' : 'Cumple parcialmente'}
                          </span>
                          {nc.agenteProcesado && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700"
                                  title="La auditoría de origen ya fue analizada por el Agente Pilar (IA)">
                              🤖 Ya en Agente Pilar
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-700 line-clamp-2">{nc.question}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {allNonConfs.length > 8 && (
                <button
                  onClick={() => setShowAll(s => !s)}
                  className="w-full mt-3 text-xs text-teal-600 hover:text-teal-700 font-semibold py-2"
                >
                  {showAll
                    ? '▲ Mostrar menos'
                    : `▼ Ver ${allNonConfs.length - 8} no conformidad${allNonConfs.length - 8 !== 1 ? 'es' : ''} más`
                  }
                </button>
              )}

              {selected.size > 0 && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                  <p className="text-xs text-orange-700">
                    <span className="font-bold">
                      {selected.size} no conformidad{selected.size !== 1 ? 'es' : ''} seleccionada{selected.size !== 1 ? 's' : ''}.
                    </span>
                    {' '}Se crearán como riesgos en ISO 31000 con Probabilidad 3 (No cumple) o 2 (Parcial), Impacto 4 y tratamiento "Reducir".
                    Puedes ajustar desde el módulo de Análisis de Riesgo.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-sm font-bold text-emerald-800">
                Sin no conformidades en las auditorías completadas
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                Todas las preguntas respondidas cumplen los criterios de habilitación.
              </p>
            </div>
          )}

          {/* ── Accesos rápidos a módulos ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                href:  '/dashboard/analisis-riesgo',
                icon:  '⚠️',
                label: 'ISO 31000',
                sub:   `${riesgosCount} riesgo${riesgosCount !== 1 ? 's' : ''} registrado${riesgosCount !== 1 ? 's' : ''}`,
                color: riesgosCount > 0 ? 'border-orange-300' : 'border-gray-200',
              },
              {
                href:  '/dashboard/capas',
                icon:  '✓',
                label: 'CAPAs',
                sub:   `${capasAbiertas} pendiente${capasAbiertas !== 1 ? 's' : ''}`,
                color: capasAbiertas > 0 ? 'border-amber-300' : 'border-gray-200',
              },
              {
                href:  '/dashboard/comparador',
                icon:  '🔄',
                label: 'Comparador',
                sub:   'ISO 7101:2023 · JCI',
                color: 'border-gray-200',
              },
              {
                href:  '/dashboard/indicadores',
                icon:  '📊',
                label: 'Indicadores',
                sub:   'Res. 256/2016',
                color: 'border-gray-200',
              },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`bg-white rounded-xl border ${item.color} p-4 hover:border-teal-400
                            hover:shadow-sm transition-all flex flex-col items-center gap-2 text-center`}
              >
                <span className="text-2xl">{item.icon}</span>
                <p className="text-sm font-bold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400">{item.sub}</p>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* ── Nota metodológica ─────────────────────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
        <p className="font-bold mb-1">ℹ️ Metodología de equivalencia internacional</p>
        <p>
          Los porcentajes ISO 7101:2023 y JCI 8ª Edición son una estimación propia de NormaLis
          de correspondencia entre la Res. 1732/2026 y los estándares internacionales — no
          existe un crosswalk oficial publicado entre ellos. Según esta estimación, una
          habilitación plena (100%) equivaldría a ≈84% de ISO 7101:2023 y ≈71% de JCI,
          ya que dichos estándares incluyen requisitos adicionales de mejora continua,
          gobernanza organizacional y contexto internacional.
          Para una certificación ISO 7101 o JCI formal, se requiere auditoría de tercera parte.
        </p>
      </div>

      <p className="text-xs text-gray-400 text-center pb-2">
        Res. 1732/2026 · ISO 31000:2018 · ISO 7101:2023 · JCI 8ª Edición · NormaLis
      </p>
    </div>
  );
}
