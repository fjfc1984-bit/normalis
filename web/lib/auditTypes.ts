// web/lib/auditTypes.ts
// Tipos TypeScript para el módulo de auditoría de habilitación

export interface AuditArea {
  id: string;
  icon: string;
  name: string;
  norm: string;
  q: string[];
}

export interface AuditSegmentData {
  areas: AuditArea[];
}

export type AuditAnswer = 'si' | 'no' | 'parcial' | 'na';

export interface AuditAnswers {
  [key: string]: AuditAnswer; // key = "q0", "q1", ...
}

export interface AuditScore {
  score: number;       // 0-100
  si: number;
  no: number;
  parcial: number;
  na: number;
  total: number;
  effective: number;
}

export interface AuditAreaScore {
  areaId: string;
  areaName: string;
  icon: string;
  score: number;
  si: number;
  no: number;
  parcial: number;
  na: number;
  total: number;
}

export interface FlatQuestion {
  globalIdx: number;
  areaId: string;
  areaName: string;
  icon: string;
  norm: string;
  question: string;
  qInArea: number; // index within the area
}

export interface NonConformity {
  globalIdx: number;
  qKey:     string;
  areaId:   string;
  areaName: string;
  icon: string;
  question: string;
  answer: 'no' | 'parcial';
}

// Firestore document structure for saved audits
export interface SavedAudit {
  uid: string;
  segmento: string;
  answers: AuditAnswers;
  score: number;
  completedAt: Date | null;
  updatedAt: Date | null;
}
