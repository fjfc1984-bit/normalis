// web/lib/useAudit.ts
// Hook Firestore para sesiones de auditoría de habilitación
// Persiste respuestas por UID + segmento, con auto-save debounced

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from './firebase';
import type { AuditAnswers } from './auditTypes';

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
  markComplete: (score: number, totalQ: number) => Promise<void>;
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
    db.collection('auditorias').doc(docId).get()
      .then(snap => {
        if (snap.exists) {
          const data = snap.data() as AuditSession;
          setAnswers(data.answers || {});
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
      const now = new Date().toISOString();
      await db.collection('auditorias').doc(docId).set({
        uid: user.uid,
        segmento,
        answers: latestAnswers,
        updatedAt: now,
        completedAt: null,
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

  const markComplete = useCallback(async (score: number, totalQ: number) => {
    const user = auth.currentUser;
    if (!user) return;
    setSaving(true);
    try {
      const docId = `${user.uid}_${segmento}`;
      const now = new Date().toISOString();
      const answered = Object.keys(pendingAnswersRef.current).length;
      await db.collection('auditorias').doc(docId).set({
        uid: user.uid,
        segmento,
        answers: pendingAnswersRef.current,
        score,
        totalQ,
        answeredQ: answered,
        completedAt: now,
        updatedAt: now,
      }, { merge: true });
      setCompleted(true);
      setSavedAt(now);
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
    await db.collection('auditorias').doc(docId).delete();
    setAnswers({});
    setCompleted(false);
    setSavedAt(null);
    pendingAnswersRef.current = {};
  }, [segmento]);

  return { answers, loading, saving, completed, savedAt, setAnswer, markComplete, resetAudit };
}
