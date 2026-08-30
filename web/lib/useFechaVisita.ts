'use client';
/**
 * useFechaVisita.ts
 * Lee y escribe fecha_visita desde normalis_orgs/{nit}.cfg.fecha_visita
 * (colección del legacy — compatibilidad total con usuarios existentes).
 */

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth';
import { diasRestantesLocal } from './fechaLocal';

export type VisitaUrgency = 'urgente' | 'pronto' | 'ok' | 'vencida' | 'sin_fecha';

export interface FechaVisitaState {
  fechaVisita: string | null;   // ISO date string "YYYY-MM-DD" o null
  daysLeft: number | null;      // null si no hay fecha
  urgency: VisitaUrgency;
  loading: boolean;
  saving: boolean;
  setFecha: (fecha: string) => Promise<void>;
  clearFecha: () => Promise<void>;
}

function calcUrgency(days: number | null): VisitaUrgency {
  if (days === null) return 'sin_fecha';
  if (days < 0)  return 'vencida';
  if (days <= 14) return 'urgente';
  if (days <= 30) return 'pronto';
  return 'ok';
}

export function useFechaVisita(): FechaVisitaState {
  const { nit, loading: authLoading } = useAuth();
  const [fechaVisita, setFechaVisita] = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);

  // ── Cargar ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!nit) { setLoading(false); return; }

    async function load() {
      try {
        const snap = await getDoc(doc(db, 'normalis_orgs', nit));
        const raw  = snap.data()?.cfg?.fecha_visita ?? null;
        setFechaVisita(raw || null);
      } catch {
        setFechaVisita(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [nit, authLoading]);

  // ── Guardar ───────────────────────────────────────────────────────────────
  const persist = useCallback(async (fecha: string | null) => {
    if (!nit) throw new Error('SIN_NIT: Esta cuenta no tiene NIT — no se puede guardar.');
    setSaving(true);
    try {
      // Merge en cfg para no pisar otros campos del legacy
      await setDoc(
        doc(db, 'normalis_orgs', nit),
        { cfg: { fecha_visita: fecha ?? '' } },
        { merge: true }
      );
      setFechaVisita(fecha);
    } finally {
      setSaving(false);
    }
  }, [nit]);

  const setFecha   = (f: string) => persist(f);
  const clearFecha = ()          => persist(null);

  // ── Calcular días ─────────────────────────────────────────────────────────
  // Usa parseo de fecha local (no `new Date(fechaVisita)` directo) para evitar
  // el corrimiento de -1 día que causa interpretar "YYYY-MM-DD" como
  // medianoche UTC — en Colombia (UTC-5) eso adelantaba/atrasaba el conteo.
  const daysLeft = fechaVisita ? diasRestantesLocal(fechaVisita) : null;

  return {
    fechaVisita,
    daysLeft,
    urgency: calcUrgency(daysLeft),
    loading: loading || authLoading,
    saving,
    setFecha,
    clearFecha,
  };
}
