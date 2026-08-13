/**
 * web/lib/useConsentimientos.ts
 * Hook Firestore para Consentimientos Informados
 * Colección: usuarios/{uid}/consentimientos/{id}
 * Base legal: Ley 23/1981 Art. 15 · Res. 13437/1991 · Res. 3100/2019 Est. 6
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc,
  getDocs, addDoc, updateDoc, deleteDoc,
  orderBy, query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type EstadoCon =
  | 'pendiente'
  | 'firmado_paciente'
  | 'firmado_medico'
  | 'completo';

export interface ConsentimientoItem {
  id:           string;
  procedimiento: string;
  especialidad:  string;
  paciente:      string;
  cedula:        string;
  medico:        string;
  fecha:         string; // YYYY-MM-DD
  estado:        EstadoCon;
  creadoEn:      number;
}

export interface NuevoConsentimiento {
  procedimiento: string;
  especialidad:  string;
  paciente:      string;
  cedula:        string;
  medico:        string;
  fecha:         string;
}

// ── Catálogos de procedimientos por especialidad ───────────────────────────────

export const ESPECIALIDADES_CON: Record<string, string[]> = {
  'Medicina General': [
    'Consulta médica general',
    'Procedimiento ambulatorio menor',
    'Toma de muestras de laboratorio',
    'Aplicación de vacunas',
    'Cirugía menor ambulatoria',
  ],
  'Odontología': [
    'Extracción dental',
    'Tratamiento de conductos (endodoncia)',
    'Cirugía oral menor',
    'Blanqueamiento dental',
    'Implante dental',
  ],
  'Ginecología y Obstetricia': [
    'Citología cérvico-vaginal',
    'Inserción de DIU',
    'Colposcopia',
    'Parto vaginal',
    'Cesárea',
  ],
  'Cirugía': [
    'Cirugía ambulatoria bajo sedación',
    'Cirugía laparoscópica',
    'Procedimiento con anestesia general',
    'Biopsia de tejido',
    'Drenaje quirúrgico',
  ],
  'Psicología': [
    'Evaluación psicológica',
    'Psicoterapia individual',
    'Pruebas psicométricas',
    'Intervención en crisis',
  ],
  'Fisioterapia': [
    'Terapia física y rehabilitación',
    'Electroterapia',
    'Aplicación de calor/frío terapéutico',
  ],
  'Imágenes Diagnósticas': [
    'Radiografía',
    'Ecografía',
    'Tomografía',
    'Resonancia magnética',
    'Endoscopia diagnóstica',
  ],
  'Otro': ['Procedimiento específico'],
};

// ── Estado de consentimiento ──────────────────────────────────────────────────

export const ESTADO_LABEL: Record<EstadoCon, string> = {
  pendiente:         'Pendiente',
  firmado_paciente:  'Firmado (paciente)',
  firmado_medico:    'Firmado (médico)',
  completo:          'Completo',
};

export const ESTADO_COLOR: Record<EstadoCon, string> = {
  pendiente:         'bg-amber-100 text-amber-800',
  firmado_paciente:  'bg-blue-100 text-blue-800',
  firmado_medico:    'bg-indigo-100 text-indigo-800',
  completo:          'bg-green-100 text-green-800',
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useConsentimientos(uid: string | null) {
  const [items,   setItems]   = useState<ConsentimientoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const col = collection(db, 'usuarios', uid, 'consentimientos');
    const q   = query(col, orderBy('creadoEn', 'desc'));
    getDocs(q)
      .then(snap => {
        const data: ConsentimientoItem[] = snap.docs.map(d => {
          const r = d.data();
          return {
            id:            d.id,
            procedimiento: r.procedimiento ?? '',
            especialidad:  r.especialidad  ?? '',
            paciente:      r.paciente      ?? '',
            cedula:        r.cedula        ?? '',
            medico:        r.medico        ?? '',
            fecha:         r.fecha         ?? '',
            estado:        r.estado        ?? 'pendiente',
            creadoEn:      r.creadoEn      ?? 0,
          };
        });
        setItems(data);
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [uid]);

  const agregar = useCallback(async (data: NuevoConsentimiento) => {
    if (!uid) return;
    const payload = { ...data, estado: 'pendiente' as EstadoCon, creadoEn: Date.now() };
    const ref = await addDoc(
      collection(db, 'usuarios', uid, 'consentimientos'),
      payload,
    );
    setItems(prev => [{ id: ref.id, ...payload }, ...prev]);
  }, [uid]);

  const firmar = useCallback(async (id: string, quien: 'paciente' | 'medico') => {
    if (!uid) return;
    const item = items.find(i => i.id === id);
    if (!item) return;

    let next: EstadoCon = item.estado;
    if (item.estado === 'pendiente') {
      next = quien === 'paciente' ? 'firmado_paciente' : 'firmado_medico';
    } else if (item.estado === 'firmado_paciente' && quien === 'medico') {
      next = 'completo';
    } else if (item.estado === 'firmado_medico' && quien === 'paciente') {
      next = 'completo';
    }

    await updateDoc(
      doc(db, 'usuarios', uid, 'consentimientos', id),
      { estado: next },
    );
    setItems(prev => prev.map(p => p.id === id ? { ...p, estado: next } : p));
  }, [uid, items]);

  const eliminar = useCallback(async (id: string) => {
    if (!uid) return;
    await deleteDoc(doc(db, 'usuarios', uid, 'consentimientos', id));
    setItems(prev => prev.filter(p => p.id !== id));
  }, [uid]);

  return { items, loading, error, agregar, firmar, eliminar };
}
