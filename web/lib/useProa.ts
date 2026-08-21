'use client';

// web/lib/useProa.ts
// Hook React para el módulo PROA (Programa de Optimización de
// Antimicrobianos). Sigue el patrón de carga manual (getDocs + recarga)
// que ya usaba el módulo original — no onSnapshot, para mantener
// consistencia con el comportamiento ya probado en producción.
//
// Todas las colecciones de este módulo filtran únicamente por `nit`
// (igual que las 3 colecciones proa_* ya existentes) — si la cuenta no
// tiene nit configurado, el módulo no carga datos (ver NitWarningBanner
// en el layout del dashboard).

import { useState, useEffect, useCallback } from 'react';
import {
  collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  Intervencion, ConsumoAMR, IAASResistente, AutorizacionPrevia, InformeAnualPROA,
  NivelComplejidad,
} from './proaTypes';

export interface ProaChecklistDoc {
  checks: Record<string, boolean>;
  nivelComplejidad: NivelComplejidad;
}

export function useProa(nit: string | null) {
  const [intervenciones, setIntervenciones] = useState<Intervencion[]>([]);
  const [consumos, setConsumos] = useState<ConsumoAMR[]>([]);
  const [iaasResistentes, setIaasResistentes] = useState<IAASResistente[]>([]);
  const [autorizaciones, setAutorizaciones] = useState<AutorizacionPrevia[]>([]);
  const [informesAnuales, setInformesAnuales] = useState<InformeAnualPROA[]>([]);

  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [nivelComplejidad, setNivelComplejidad] = useState<NivelComplejidad>('I');
  const [checklistDocId, setChecklistDocId] = useState<string | null>(null);
  const [checklistGuardado, setChecklistGuardado] = useState(false);

  const [loading, setLoading] = useState(true);

  const cargarDatos = useCallback(async () => {
    if (!nit) { setLoading(false); return; }
    setLoading(true);
    try {
      const [snapInt, snapDDD, snapIAAS, snapAuth, snapInf, snapCheck] = await Promise.all([
        getDocs(query(collection(db, 'proa_intervenciones'), where('nit', '==', nit), orderBy('creadoEn', 'desc'))),
        getDocs(query(collection(db, 'proa_consumos'), where('nit', '==', nit), orderBy('periodo', 'desc'))),
        getDocs(query(collection(db, 'proa_iaas'), where('nit', '==', nit), orderBy('creadoEn', 'desc'))),
        getDocs(query(collection(db, 'proa_autorizaciones'), where('nit', '==', nit), orderBy('creadoEn', 'desc'))),
        getDocs(query(collection(db, 'proa_informe_anual'), where('nit', '==', nit), orderBy('anio', 'desc'))),
        getDocs(query(collection(db, 'proa_checklist'), where('nit', '==', nit))),
      ]);

      setIntervenciones(snapInt.docs.map(d => ({ id: d.id, ...d.data() } as Intervencion)));
      setConsumos(snapDDD.docs.map(d => ({ id: d.id, ...d.data() } as ConsumoAMR)));
      setIaasResistentes(snapIAAS.docs.map(d => ({ id: d.id, ...d.data() } as IAASResistente)));
      setAutorizaciones(snapAuth.docs.map(d => ({ id: d.id, ...d.data() } as AutorizacionPrevia)));
      setInformesAnuales(snapInf.docs.map(d => ({ id: d.id, ...d.data() } as InformeAnualPROA)));

      if (!snapCheck.empty) {
        const data = snapCheck.docs[0].data();
        setChecks(data.checks || {});
        setNivelComplejidad((data.nivelComplejidad as NivelComplejidad) || 'I');
        setChecklistDocId(snapCheck.docs[0].id);
        setChecklistGuardado(true);
      }
    } catch { /* offline ok */ }
    setLoading(false);
  }, [nit]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const toggleCheck = (key: string) => setChecks(p => ({ ...p, [key]: !p[key] }));

  const guardarChecklist = useCallback(async () => {
    if (!nit) return;
    if (checklistDocId) {
      await updateDoc(doc(db, 'proa_checklist', checklistDocId), { checks, nivelComplejidad, actualizadoEn: serverTimestamp() });
    } else {
      const ref = await addDoc(collection(db, 'proa_checklist'), { nit, checks, nivelComplejidad, actualizadoEn: serverTimestamp() });
      setChecklistDocId(ref.id);
    }
    setChecklistGuardado(true);
  }, [nit, checks, nivelComplejidad, checklistDocId]);

  const guardarIntervencion = useCallback(async (data: Omit<Intervencion, 'id' | 'creadoEn'>) => {
    if (!nit) return;
    await addDoc(collection(db, 'proa_intervenciones'), { ...data, nit, creadoEn: serverTimestamp() });
    await cargarDatos();
  }, [nit, cargarDatos]);

  const guardarConsumo = useCallback(async (data: Omit<ConsumoAMR, 'id' | 'creadoEn' | 'nit'>) => {
    if (!nit) return;
    await addDoc(collection(db, 'proa_consumos'), { ...data, nit, creadoEn: serverTimestamp() });
    await cargarDatos();
  }, [nit, cargarDatos]);

  const guardarIAAS = useCallback(async (data: Omit<IAASResistente, 'id' | 'creadoEn' | 'nit'>) => {
    if (!nit) return;
    await addDoc(collection(db, 'proa_iaas'), { ...data, nit, creadoEn: serverTimestamp() });
    await cargarDatos();
  }, [nit, cargarDatos]);

  const guardarAutorizacion = useCallback(async (data: Omit<AutorizacionPrevia, 'id' | 'creadoEn' | 'nit'>) => {
    if (!nit) return;
    await addDoc(collection(db, 'proa_autorizaciones'), { ...data, nit, creadoEn: serverTimestamp() });
    await cargarDatos();
  }, [nit, cargarDatos]);

  const actualizarAutorizacion = useCallback(async (id: string, estado: AutorizacionPrevia['estado']) => {
    await updateDoc(doc(db, 'proa_autorizaciones', id), { estado });
    await cargarDatos();
  }, [cargarDatos]);

  const guardarInformeAnual = useCallback(async (data: Omit<InformeAnualPROA, 'id' | 'creadoEn' | 'actualizadoEn' | 'nit'>, existingId?: string) => {
    if (!nit) return;
    if (existingId) {
      await updateDoc(doc(db, 'proa_informe_anual', existingId), { ...data, actualizadoEn: serverTimestamp() });
    } else {
      await addDoc(collection(db, 'proa_informe_anual'), { ...data, nit, creadoEn: serverTimestamp(), actualizadoEn: null });
    }
    await cargarDatos();
  }, [nit, cargarDatos]);

  return {
    loading,
    intervenciones, consumos, iaasResistentes, autorizaciones, informesAnuales,
    checks, toggleCheck, nivelComplejidad, setNivelComplejidad,
    checklistGuardado, guardarChecklist,
    guardarIntervencion, guardarConsumo, guardarIAAS, guardarAutorizacion, actualizarAutorizacion, guardarInformeAnual,
    recargar: cargarDatos,
  };
}
