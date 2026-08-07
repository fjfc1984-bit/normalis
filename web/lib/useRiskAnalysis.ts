'use client';
/**
 * lib/useRiskAnalysis.ts
 *
 * Carga TODOS los segmentos de auditoría del usuario desde Firestore,
 * agrega no-conformidades por los 7 Estándares de Res. 3100/2019 y calcula
 * un índice de riesgo ponderado.
 *
 * Fórmula de riesgo por estándar:
 *   riskScore = (noCount × 3 + parcialCount × 1.5) / totalCriterios × 100
 *
 * Peso adicional: si el estándar tiene ≥1 no-conformidad 'no' (no cumple)
 * → riesgo se considera GRAVE independiente del score numérico.
 */

import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { areasDB } from '@/data/auditData';
import {
  buildFlatQuestions,
  calcAreaScores,
  getNonConformities,
} from './auditScore';
import type { AuditAnswers, NonConformity } from './auditTypes';

// ── 7 Estándares de Res. 3100/2019 ───────────────────────────────────────────
export const ESTANDARES: { id: string; label: string; icon: string; criterio: string }[] = [
  { id: 'talento',          label: 'Talento Humano',           icon: '👥', criterio: 'Est. 1' },
  { id: 'infraestructura',  label: 'Infraestructura',          icon: '🏗️', criterio: 'Est. 2' },
  { id: 'dotacion',         label: 'Dotación y Mantenimiento', icon: '🔧', criterio: 'Est. 3' },
  { id: 'medicamentos',     label: 'Medicamentos e Insumos',   icon: '💊', criterio: 'Est. 4' },
  { id: 'procesos',         label: 'Procesos Prioritarios',    icon: '📋', criterio: 'Est. 5' },
  { id: 'historia',         label: 'Historia Clínica',         icon: '📂', criterio: 'Est. 6' },
  { id: 'interdependencia', label: 'Interdependencia',         icon: '🔗', criterio: 'Est. 7' },
];

// Mapeo de nombres de área → id de estándar (keyword matching)
const ESTANDAR_KEYWORDS: { id: string; words: string[] }[] = [
  { id: 'talento',          words: ['talento', 'humano', 'recurso humano', 'personal asistencial', 'especializado'] },
  { id: 'infraestructura',  words: ['infraestructura', 'planta física', 'instalaci', 'área física'] },
  { id: 'dotacion',         words: ['dotaci', 'mantenimiento', 'equipo', 'instrumental', 'esterilizaci', 'biomédic'] },
  { id: 'medicamentos',     words: ['medicamento', 'fármaco', 'insumo', 'dispositivo', 'farmacia', 'biológico', 'hemoderivado'] },
  { id: 'procesos',         words: ['proceso', 'protocolo', 'prioritario', 'procedimiento', 'seguridad del paciente'] },
  { id: 'historia',         words: ['historia clínica', 'historia cl', 'registro', 'epicrisis', 'expediente', 'documentaci'] },
  { id: 'interdependencia', words: ['interdependencia', 'referencia', 'contrarreferencia', 'red de servi', 'apoyo clínico'] },
];

function detectEstandar(areaName: string): string {
  const lower = areaName.toLowerCase();
  for (const { id, words } of ESTANDAR_KEYWORDS) {
    if (words.some(w => lower.includes(w.toLowerCase()))) return id;
  }
  return 'procesos'; // fallback
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SegmentAudit {
  segmento: string;
  answers: AuditAnswers;
  score: number;
  completedAt: string | null;
}

export interface EstandarRisk {
  estandarId:   string;
  label:        string;
  icon:         string;
  criterio:     string;
  noCount:      number;   // respuestas 'no cumple'
  parcialCount: number;   // respuestas 'parcial'
  totalQ:       number;   // criterios evaluados
  riskScore:    number;   // 0–100
  nivel:        'alto' | 'moderado' | 'bajo' | 'sin datos';
  nonConfs:     (NonConformity & { segmento: string; segmentoLabel: string })[];
  segmentos:    string[]; // segmentos donde aparece
}

export interface RiskAnalysis {
  estandares:   EstandarRisk[];        // los 7 estándares ordenados por riesgo
  totalAudits:  number;                // segmentos con datos
  totalNonConfs: number;
  topRiesgo:    EstandarRisk[];        // top 3
  loading:      boolean;
  error:        string | null;
  reload:       () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useRiskAnalysis(uid: string | null, nit: string | null): RiskAnalysis {
  const [estandares,    setEstandares]    = useState<EstandarRisk[]>([]);
  const [totalAudits,   setTotalAudits]   = useState(0);
  const [totalNonConfs, setTotalNonConfs] = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [tick,          setTick]          = useState(0);

  const reload = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    // Init risk accumulators for each estándar
    const acc: Record<string, {
      noCount: number;
      parcialCount: number;
      totalQ: number;
      nonConfs: (NonConformity & { segmento: string; segmentoLabel: string })[];
      segmentos: Set<string>;
    }> = {};
    for (const e of ESTANDARES) {
      acc[e.id] = { noCount: 0, parcialCount: 0, totalQ: 0, nonConfs: [], segmentos: new Set() };
    }

    // Query all audit docs for this user
    const q = query(collection(db, 'auditorias'), where('uid', '==', uid));
    getDocs(q)
      .then(snap => {
        let auditCount = 0;

        snap.forEach(docSnap => {
          const data  = docSnap.data();
          const seg   = data.segmento as string;
          const areas = areasDB[seg];
          if (!areas || !data.answers) return;

          auditCount++;
          const flat  = buildFlatQuestions(areas);
          const ans   = data.answers as AuditAnswers;
          const nc    = getNonConformities(flat, ans);
          const aScores = calcAreaScores(areas, ans);

          // Map each area → estándar
          for (const aScore of aScores) {
            const eId = detectEstandar(aScore.areaName);
            acc[eId].totalQ       += aScore.total;
            acc[eId].noCount      += aScore.no;
            acc[eId].parcialCount += aScore.parcial;
            acc[eId].segmentos.add(seg);
          }

          // Attach segment info to each non-conformity
          const { SEGMENT_META } = require('@/data/auditData');
          const segLabel = (SEGMENT_META as Record<string, { label: string }>)[seg]?.label ?? seg;
          for (const n of nc) {
            const eId = detectEstandar(n.areaName);
            acc[eId].nonConfs.push({ ...n, segmento: seg, segmentoLabel: segLabel });
          }
        });

        // Build EstandarRisk[]
        const result: EstandarRisk[] = ESTANDARES.map(e => {
          const a         = acc[e.id];
          const effective = a.totalQ;
          const rawScore  = effective > 0
            ? Math.min(100, Math.round(((a.noCount * 3 + a.parcialCount * 1.5) / effective) * 100))
            : 0;

          const nivel: EstandarRisk['nivel'] = effective === 0
            ? 'sin datos'
            : rawScore >= 30 || a.noCount >= 2
              ? 'alto'
              : rawScore >= 15 || a.noCount >= 1
                ? 'moderado'
                : 'bajo';

          return {
            estandarId:   e.id,
            label:        e.label,
            icon:         e.icon,
            criterio:     e.criterio,
            noCount:      a.noCount,
            parcialCount: a.parcialCount,
            totalQ:       effective,
            riskScore:    rawScore,
            nivel,
            nonConfs:     a.nonConfs,
            segmentos:    [...a.segmentos],
          };
        });

        // Sort by riskScore desc
        result.sort((a, b) => b.riskScore - a.riskScore || b.noCount - a.noCount);

        const totalNC = result.reduce((s, e) => s + e.nonConfs.length, 0);
        setEstandares(result);
        setTotalAudits(auditCount);
        setTotalNonConfs(totalNC);
      })
      .catch(err => setError(`Error cargando auditorías: ${String(err)}`))
      .finally(() => setLoading(false));
  }, [uid, tick]);

  return {
    estandares,
    totalAudits,
    totalNonConfs,
    topRiesgo: estandares.filter(e => e.nivel !== 'sin datos').slice(0, 3),
    loading,
    error,
    reload,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function nivelColor(nivel: EstandarRisk['nivel']): string {
  switch (nivel) {
    case 'alto':      return '#ef4444';
    case 'moderado':  return '#f59e0b';
    case 'bajo':      return '#10b981';
    default:          return '#94a3b8';
  }
}

export function nivelBg(nivel: EstandarRisk['nivel']): string {
  switch (nivel) {
    case 'alto':      return 'bg-red-50 border-red-200';
    case 'moderado':  return 'bg-amber-50 border-amber-200';
    case 'bajo':      return 'bg-emerald-50 border-emerald-200';
    default:          return 'bg-gray-50 border-gray-200';
  }
}

/** Construye el prompt para enviar al Worker */
export function buildRiskPrompt(top3: EstandarRisk[], nombre: string): string {
  const findings = top3.flatMap(e =>
    e.nonConfs.slice(0, 5).map((nc, i) =>
      `- [${e.label} · ${e.criterio}] ${nc.areaName} — ${nc.question.slice(0, 100)} (${nc.answer === 'no' ? 'NO CUMPLE' : 'PARCIAL'})`
    )
  ).join('\n');

  return `Eres un experto en auditoría de habilitación de IPS en Colombia (Res. 3100/2019).
La IPS "${nombre}" tiene estos hallazgos de auditoría:

${findings}

Top 3 estándares con mayor riesgo:
${top3.map((e, i) => `${i + 1}. ${e.label} (${e.criterio}): ${e.noCount} no cumplen, ${e.parcialCount} parciales, índice ${e.riskScore}/100`).join('\n')}

Por favor:
1. Explica en 2 oraciones por qué cada uno de los 3 estándares es de alto riesgo para la habilitación.
2. Da 2 acciones correctivas concretas y urgentes para el estándar #1.
Responde en español, conciso y técnico.`;
}
