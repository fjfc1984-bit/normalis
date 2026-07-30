// web/lib/sstTypes.ts
// Tipos TypeScript para el módulo SG-SST
// Base legal: Res. 0312/2019 · Decreto 1072/2015 — Ministerio de Trabajo Colombia

import type { Timestamp } from 'firebase/firestore';

// ─── Fases / cumplimiento por ítem ───────────────────────────────────────────
export type SSTFase = 'fase1' | 'fase2' | 'fase3';
export type SSTItemEstado = 'cumple' | 'parcial' | 'no' | '';
export type SSTSemaforo   = 'critico' | 'moderado' | 'aceptable';

// ─── Catálogo de estándares (mirrored from normalis-sst.js) ──────────────────
export interface SSTItem {
  id:     string;   // e.g. "f1_01"
  num:    string;   // e.g. "1.1.1"
  texto:  string;
  puntos: number;
}

export interface SSTGrupo {
  id:     string;
  nombre: string;
  puntos: number;
  items:  SSTItem[];
}

export interface SSTEstandar {
  label:         string;
  total_puntos:  number;
  nota:          string;
  grupos:        SSTGrupo[];
}

// ─── Plan de trabajo anual ───────────────────────────────────────────────────
export interface SSTPlanItem {
  id:          string;
  actividad:   string;
  responsable: string;
  mes:         number;   // 1–12
  estado:      'pendiente' | 'en_curso' | 'completado';
  evidencia:   string;
}

// ─── Vencimientos SST ────────────────────────────────────────────────────────
export interface SSTVencimiento {
  id:          string;
  concepto:    string;
  fecha:       string;   // ISO "YYYY-MM-DD"
  responsable: string;
  estado:      'vigente' | 'proximo' | 'vencido';
}

// ─── Documento Firestore: usuarios/{uid}/sst/main ────────────────────────────
export interface SSTData {
  fase:           SSTFase;
  autoevaluacion: Record<string, SSTItemEstado>;  // itemId → estado
  plan:           SSTPlanItem[];
  vencimientos:   SSTVencimiento[];
  activeTab?:     string;
  updatedAt?:     Timestamp | null;
}

// ─── Score calculado client-side ─────────────────────────────────────────────
export interface SSTScore {
  pct:      number;     // 0–100
  obtenido: number;
  total:    number;
  semaforo: SSTSemaforo;
  label:    string;
  fase:     SSTFase;
}

// ─── Configuración semáforo ───────────────────────────────────────────────────
export const SST_SEMAFORO_CFG: Record<SSTSemaforo, { label: string; color: string; bg: string; text: string }> = {
  critico:   { label: 'Crítico',   color: 'text-red-700',    bg: 'bg-red-100',    text: 'Riesgo alto de sanción (< 60%)' },
  moderado:  { label: 'Moderado',  color: 'text-amber-700',  bg: 'bg-amber-100',  text: 'Requiere mejoras (60–84%)' },
  aceptable: { label: 'Aceptable', color: 'text-emerald-700',bg: 'bg-emerald-100',text: 'SG-SST en orden (≥ 85%)' },
};

export const SST_FASE_LABELS: Record<SSTFase, string> = {
  fase1: 'Fase I — < 10 trabajadores (Riesgo I-II)',
  fase2: 'Fase II — 11–50 trabajadores (o <10 Riesgo III-V)',
  fase3: 'Fase III — > 50 trabajadores (o >10 Riesgo III-V)',
};

// ─── Valor vacío inicial ──────────────────────────────────────────────────────
export const SST_DATA_EMPTY: SSTData = {
  fase:           'fase1',
  autoevaluacion: {},
  plan:           [],
  vencimientos:   [],
};
