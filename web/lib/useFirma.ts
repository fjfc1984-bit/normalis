/**
 * web/lib/useFirma.ts
 * Hook Firestore para Firma y Versiones de documentos institucionales
 * Colección: usuarios/{uid}/firmaDocs/{docId}
 * Base legal: Res. 3100/2019 — Procesos Prioritarios y cada estándar documental
 */

import { useState, useEffect, useCallback } from 'react';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ── Catálogo de documentos que requieren firma del Director Técnico ───────────

export const FIRMA_CATALOGO = [
  {
    id:     'bioseguridad',
    nombre: 'Manual de Bioseguridad',
    base:   'Res. 3100/2019 Est. 2 · Decreto 1072/2015',
    icono:  '🛡️',
  },
  {
    id:     'atencion',
    nombre: 'Protocolo de Atención al Paciente',
    base:   'Res. 3100/2019 Est. 5 — Procesos Prioritarios',
    icono:  '📋',
  },
  {
    id:     'residuos',
    nombre: 'Plan de Gestión de Residuos (PGIRH)',
    base:   'Res. 1164/2002 · Res. 3100/2019 Est. 2',
    icono:  '♻️',
  },
  {
    id:     'tecnovigilancia',
    nombre: 'Manual de Tecnovigilancia',
    base:   'Res. 4816/2008 · Res. 3100/2019 Est. 3',
    icono:  '🔬',
  },
  {
    id:     'emergencias',
    nombre: 'Plan de Emergencias y Desastres',
    base:   'Res. 3100/2019 Est. 2 · UNGRD',
    icono:  '🚨',
  },
  {
    id:     'medicamentos',
    nombre: 'Protocolo de Manejo de Medicamentos',
    base:   'Res. 3100/2019 Est. 4 — Medicamentos y Dispositivos',
    icono:  '💊',
  },
  {
    id:     'habilitacion',
    nombre: 'Auto-declaración de Habilitación',
    base:   'Res. 3100/2019 Art. 6 — Formulario de Inscripción',
    icono:  '🏥',
  },
  {
    id:     'calidad',
    nombre: 'Manual del Sistema de Gestión de Calidad',
    base:   'Res. 1446/2006 · PAMEC',
    icono:  '⭐',
  },
] as const;

export type FirmaDocId = (typeof FIRMA_CATALOGO)[number]['id'];

// ── Tipo de registro ──────────────────────────────────────────────────────────

export interface FirmaDoc {
  id:        FirmaDocId;
  nombre:    string;
  version:   string;
  firmado:   boolean;
  firmante:  string;
  fecha:     string; // YYYY-MM-DD
  updatedAt: number;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFirma(uid: string | null) {
  const [items,   setItems]   = useState<FirmaDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const col = collection(db, 'usuarios', uid, 'firmaDocs');
    getDocs(col)
      .then(snap => {
        const stored: Record<string, FirmaDoc> = {};
        snap.docs.forEach(d => { stored[d.id] = { id: d.id as FirmaDocId, ...d.data() } as FirmaDoc; });

        // Merge catálogo con datos guardados
        const merged: FirmaDoc[] = FIRMA_CATALOGO.map(cat =>
          stored[cat.id] ?? {
            id:        cat.id,
            nombre:    cat.nombre,
            version:   '1.0',
            firmado:   false,
            firmante:  '',
            fecha:     '',
            updatedAt: 0,
          },
        );
        setItems(merged);
      })
      .finally(() => setLoading(false));
  }, [uid]);

  const firmar = useCallback(async (id: FirmaDocId, firmante: string) => {
    if (!uid) return;
    const cat    = FIRMA_CATALOGO.find(c => c.id === id)!;
    const today  = new Date().toISOString().slice(0, 10);
    const payload: Omit<FirmaDoc, 'id'> = {
      nombre:    cat.nombre,
      version:   '1.0',
      firmado:   true,
      firmante,
      fecha:     today,
      updatedAt: Date.now(),
    };
    await setDoc(doc(db, 'usuarios', uid, 'firmaDocs', id), payload);
    setItems(prev => prev.map(p => p.id === id ? { id, ...payload } : p));
  }, [uid]);

  const revocar = useCallback(async (id: FirmaDocId) => {
    if (!uid) return;
    const cat     = FIRMA_CATALOGO.find(c => c.id === id)!;
    const payload: Omit<FirmaDoc, 'id'> = {
      nombre:    cat.nombre,
      version:   '1.0',
      firmado:   false,
      firmante:  '',
      fecha:     '',
      updatedAt: Date.now(),
    };
    await setDoc(doc(db, 'usuarios', uid, 'firmaDocs', id), payload);
    setItems(prev => prev.map(p => p.id === id ? { id, ...payload } : p));
  }, [uid]);

  return { items, loading, firmar, revocar };
}
