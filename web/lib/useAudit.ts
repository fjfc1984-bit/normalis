// web/lib/useAudit.ts
// Hook Firestore para sesiones de auditoría de habilitación
// Persiste respuestas por UID + segmento, con auto-save debounced

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { registrarBitacora } from './useBitacora';
import type { AuditAnswers } from './auditTypes';

export interface NonConformityItem {
  qKey:     string;
  areaName: string;
  question: string;
  answer:   'no' | 'parcial';
}

export interface AuditSession {
  uid: string;
  segmento: string;
  answers: AuditAnswers;
  score: number;
  totalQ: number;
  answeredQ: number;
  completedAt: string | null;
  updatedAt: string | null;
}

interface UseAuditReturn {
  answers: AuditAnswers;
  loading: boolean;
  saving: boolean;
  completed: boolean;
  savedAt: string | null;
  setAnswer: (qKey: string, value: string) => void;
  markComplete: (score: number, totalQ: number, nonConformities?: NonConformityItem[]) => Promise<void>;
  resetAudit: () => Promise<void>;
}

const DEBOUNCE_MS = 1500;

export function useAudit(segmento: string): UseAuditReturn {
  const [answers, setAnswers] = useState<AuditAnswers>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAnswersRef = useRef<AuditAnswers>({});

  // Load existing session from Firestore
  useEffect(() => {
    if (!segmento) return;
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    const docId = `${user.uid}_${segmento}`;
    const ref = doc(db, 'auditorias', docId);

    getDoc(ref)
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data() as AuditSession;
          setAnswers(data.answers || {});
          pendingAnswersRef.current = data.answers || {};
          setCompleted(!!data.completedAt);
          setSavedAt(data.updatedAt || null);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [segmento]);

  // Persist answers to Firestore with debounce
  const persistAnswers = useCallback(async (latestAnswers: AuditAnswers) => {
    const user = auth.currentUser;
    if (!user) return;
    setSaving(true);
    try {
      const docId = `${user.uid}_${segmento}`;
      const ref = doc(db, 'auditorias', docId);
      const now = new Date().toISOString();
      await setDoc(ref, {
        uid: user.uid,
        segmento,
        answers: latestAnswers,
        updatedAt: now,
        // completedAt lo maneja exclusivamente markComplete — no sobreescribir aquí
      }, { merge: true });
      setSavedAt(now);
    } catch (err) {
      console.error('Error saving audit:', err);
    } finally {
      setSaving(false);
    }
  }, [segmento]);

  const setAnswer = useCallback((qKey: string, value: string) => {
    setAnswers(prev => {
      const updated = { ...prev, [qKey]: value as AuditAnswers[string] };
      pendingAnswersRef.current = updated;

      // Debounced save
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        persistAnswers(pendingAnswersRef.current);
      }, DEBOUNCE_MS);

      return updated;
    });
  }, [persistAnswers]);

  const markComplete = useCallback(async (
    score: number,
    totalQ: number,
    nonConformities?: NonConformityItem[],
  ) => {
    const user = auth.currentUser;
    if (!user) return;
    setSaving(true);
    try {
      const docId = `${user.uid}_${segmento}`;
      const ref = doc(db, 'auditorias', docId);
      const now = new Date().toISOString();
      const answered = Object.keys(pendingAnswersRef.current).length;
      await setDoc(ref, {
        uid: user.uid,
        segmento,
        answers: pendingAnswersRef.current,
        score,
        totalQ,
        answeredQ: answered,
        completedAt: now,
        updatedAt: now,
        // Campos para Agente Pilar (Cloud Function)
        nonConformities: nonConformities ?? [],
        agenteStatus: 'pendiente',   // 'pendiente' | 'procesando' | 'completado' | 'error'
        agenteProcessedAt: null,
      }, { merge: true });
      setCompleted(true);
      setSavedAt(now);

      // ── Guardar score anónimo para benchmarking (best-effort) ──
      try {
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        const userData = userDoc.data() || {};
        await addDoc(collection(db, 'benchmarks'), {
          segmento,
          score,
          tipoIPS: userData.tipoIPS || 'general',
          ciudad:  userData.ciudad  || 'Colombia',
          completedAt: now,
          // Sin uid ni datos personales — solo el score anónimo
        });
        registrarBitacora(user.uid, userData.nit ?? null, 'Auditoría', `Autoevaluación completada — ${segmento}`, `Puntaje: ${score}/${totalQ}`);
      } catch (_) { /* benchmarking no crítico — ignora errores */ }
    } catch (err) {
      console.error('Error marking complete:', err);
    } finally {
      setSaving(false);
    }
  }, [segmento]);

  const resetAudit = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    const docId = `${user.uid}_${segmento}`;
    const ref = doc(db, 'auditorias', docId);
    await deleteDoc(ref);
    setAnswers({});
    setCompleted(false);
    setSavedAt(null);
    pendingAnswersRef.current = {};
  }, [segmento]);

  return { answers, loading, saving, completed, savedAt, setAnswer, markComplete, resetAudit };
}
