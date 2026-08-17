// web/lib/migracion1732.ts
// Motor de migración automática Res. 3100/2019 → Res. 1732/2026
//
// Cruza las auditorías de habilitación YA completadas por la IPS en NormaLis
// (módulo /dashboard/auditoria, por segmento/servicio) contra el checklist de
// Brecha 1732 para pre-sugerir el estado de los ítems donde existe evidencia
// real y verificable en la plataforma.
//
// Principio rector (obligatorio para un producto de auditoría en salud):
// SOLO se infiere automáticamente cuando hay evidencia directa y confiable.
// Todo lo que no se pueda sustentar con datos reales de la IPS se deja en
// blanco para evaluación manual — nunca se asume cumplimiento normativo.
// La única excepción es marcar "no aplica" cuando hay evidencia de que el
// servicio (p. ej. telemedicina) no se presta ni se audita en la plataforma;
// aun así el usuario puede corregirlo manualmente si su caso es distinto.

import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { areasDB } from '@/data/auditData';
import { calcAreaScores } from './auditScore';
import type { AuditAnswers } from './auditTypes';

export type EstadoGap = 'cumple' | 'parcial' | 'no_cumple' | 'no_aplica';

export interface SugerenciaAuto {
  estado: EstadoGap;
  motivo: string; // explicación trazable — de dónde sale la sugerencia
}

export interface ResultadoMigracion {
  sugerencias: Record<string, SugerenciaAuto>;
  auditoriasEncontradas: number;
  segmentosAuditados: string[]; // ids de segmento con auditoría completada
}

const SEGMENTOS = Object.keys(areasDB);

function scoreAEstado(score: number): EstadoGap {
  if (score >= 85) return 'cumple';
  if (score >= 60) return 'parcial';
  return 'no_cumple';
}

/**
 * Analiza las auditorías completadas del usuario y produce sugerencias
 * trazables para el checklist de Brecha 1732. No escribe nada en Firestore
 * — el llamador decide qué hacer con el resultado (p. ej. no sobreescribir
 * ítems que el usuario ya evaluó manualmente).
 */
export async function inferirMigracion1732(uid: string): Promise<ResultadoMigracion> {
  interface AuditCompletada {
    seg: string;
    completedAt: string;
    answers: AuditAnswers;
    areaScores: ReturnType<typeof calcAreaScores>;
  }

  const snaps = await Promise.allSettled(
    SEGMENTOS.map(seg => getDoc(doc(db, 'auditorias', `${uid}_${seg}`))),
  );

  const completadas: AuditCompletada[] = [];
  snaps.forEach((r, i) => {
    const seg = SEGMENTOS[i];
    if (r.status === 'fulfilled' && r.value.exists()) {
      const d = r.value.data();
      if (d?.completedAt) {
        const areas = areasDB[seg] ?? [];
        const answers = (d.answers ?? {}) as AuditAnswers;
        completadas.push({
          seg,
          completedAt: d.completedAt as string,
          answers,
          areaScores: calcAreaScores(areas, answers),
        });
      }
    }
  });

  const sugerencias: Record<string, SugerenciaAuto> = {};
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'long' });

  // ── cont_01: Autoevaluación anual documentada en REPS ──────────────────
  if (completadas.length === 0) {
    sugerencias['cont_01'] = {
      estado: 'no_cumple',
      motivo: 'No se encontró ninguna autoevaluación completada en el módulo de Auditoría de NormaLis.',
    };
  } else {
    const masReciente = completadas.reduce((a, b) => (a.completedAt > b.completedAt ? a : b));
    const dias = (Date.now() - new Date(masReciente.completedAt).getTime()) / 86_400_000;
    if (dias <= 365) {
      sugerencias['cont_01'] = {
        estado: 'cumple',
        motivo: `${completadas.length} autoevaluación(es) completada(s) en NormaLis — la más reciente el ${fmt(masReciente.completedAt)}.`,
      };
    } else {
      sugerencias['cont_01'] = {
        estado: 'parcial',
        motivo: `Tu autoevaluación más reciente (${fmt(masReciente.completedAt)}) tiene más de 12 meses. Debes actualizarla en el módulo de Auditoría.`,
      };
    }
  }

  // ── Telemedicina (tele_01 a tele_04) ────────────────────────────────────
  const auditTele = completadas.find(c => c.seg === 'telemedicina');
  if (!auditTele) {
    const motivo = 'No se encontró una auditoría completada del servicio de Telemedicina en NormaLis. Si tu IPS no presta este servicio, no aplica; si sí lo presta, complétala en el módulo de Auditoría para obtener una sugerencia basada en evidencia real.';
    for (const id of ['tele_01', 'tele_02', 'tele_03', 'tele_04']) {
      sugerencias[id] = { estado: 'no_aplica', motivo };
    }
  } else {
    const fecha = fmt(auditTele.completedAt);
    const scoreTec  = auditTele.areaScores.find(a => a.areaId === 'tele-tecnologia');
    const scoreProc = auditTele.areaScores.find(a => a.areaId === 'tele-procesos');

    // tele_01 (registro por modalidad en REPS) no se puede confirmar desde
    // la auditoría interna — se deja en "parcial" con advertencia explícita
    // en vez de asumir cumplimiento de un trámite externo.
    sugerencias['tele_01'] = {
      estado: 'parcial',
      motivo: `Tienes una auditoría de Telemedicina completada en NormaLis (${fecha}), pero el registro formal de cada modalidad en REPS debe verificarse directamente — NormaLis no tiene acceso a REPS.`,
    };

    if (scoreTec) {
      sugerencias['tele_02'] = {
        estado: scoreAEstado(scoreTec.score),
        motivo: `Basado en tu auditoría de Telemedicina (${fecha}) — área tecnología y plataforma: ${scoreTec.score}% (${scoreTec.no} no cumple, ${scoreTec.parcial} parcial de ${scoreTec.total} criterios).`,
      };
    }
    if (scoreProc) {
      const estadoProc = scoreAEstado(scoreProc.score);
      const motivoProc = `Basado en tu auditoría de Telemedicina (${fecha}) — área de procesos asistenciales: ${scoreProc.score}% (${scoreProc.no} no cumple, ${scoreProc.parcial} parcial de ${scoreProc.total} criterios).`;
      sugerencias['tele_03'] = { estado: estadoProc, motivo: motivoProc };
      sugerencias['tele_04'] = { estado: estadoProc, motivo: motivoProc };
    }
  }

  return {
    sugerencias,
    auditoriasEncontradas: completadas.length,
    segmentosAuditados: completadas.map(c => c.seg),
  };
}
