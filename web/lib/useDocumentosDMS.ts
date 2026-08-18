'use client';

/**
 * web/lib/useDocumentosDMS.ts
 * Gestor Documental (DMS) — versionado real + flujo de aprobación +
 * evidencia de socialización para los documentos institucionales.
 *
 * Evoluciona el módulo de Firma (usuarios/{uid}/firmaDocs, que sobreescribe
 * un único registro por documento) hacia una colección compartida por IPS
 * (`documentos_dms`, mismo patrón que capas/vencimientos/indicadores) donde
 * cada firma crea una VERSIÓN NUEVA en vez de reemplazar la anterior —
 * respondiendo "qué versión reemplazó a cuál" (Res. 3100/2019 — control
 * documental) en vez de solo "cuál es el estado actual".
 *
 * Estados: borrador → en_revision → aprobado → (obsoleto, cuando una
 * versión más nueva del mismo documento queda aprobada). El paso a
 * "aprobado" reutiliza el mismo sello HMAC del servidor que ya usan Firma
 * y Consentimientos (web/lib/firmar.ts) — aprobar una versión ES firmarla
 * electrónicamente (Ley 527/1999 Art. 7), y solo puede hacerlo un admin
 * (las reglas de Firestore lo exigen, no solo la UI).
 *
 * Socialización: cada persona del equipo deja su propio acuse de "leí y
 * entendí" en una subcolección — nadie puede marcarlo por otra persona.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, orderBy, onSnapshot, addDoc, updateDoc,
  doc, setDoc, getDocs, serverTimestamp, Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { crearFirma } from '@/lib/firmar';
import { FIRMA_CATALOGO } from '@/lib/useFirma';
import type { FirmaDocId } from '@/lib/useFirma';

export type DmsEstado = 'borrador' | 'en_revision' | 'aprobado' | 'obsoleto';

export interface DocumentoDMS {
  id:                 string;
  docId:              FirmaDocId;
  nombre:             string;
  version:            number;
  estado:             DmsEstado;
  uid:                string;
  nit:                string;
  creadoPorNombre:    string;
  fechaCreacion:      number; // epoch ms
  aprobadoPor?:       string;
  fechaAprobacion?:   number;
  firmaId?:           string;
  contenidoHash?:     string;
  reemplazaVersionId?: string | null;
  socializaciones:    number; // conteo — se completa por separado con listarSocializaciones
}

export interface Socializacion {
  uid:       string;
  nombre:    string;
  timestamp: number;
}

function fromSnap(d: any): DocumentoDMS {
  const r = d.data();
  const ts = (v: any) => (v instanceof Timestamp ? v.toMillis() : (typeof v === 'number' ? v : 0));
  return {
    id: d.id,
    docId: r.docId,
    nombre: r.nombre ?? '',
    version: r.version ?? 1,
    estado: r.estado ?? 'borrador',
    uid: r.uid ?? '',
    nit: r.nit ?? '',
    creadoPorNombre: r.creadoPorNombre ?? '',
    fechaCreacion: ts(r.fechaCreacion),
    aprobadoPor: r.aprobadoPor,
    fechaAprobacion: r.fechaAprobacion ? ts(r.fechaAprobacion) : undefined,
    firmaId: r.firmaId,
    contenidoHash: r.contenidoHash,
    reemplazaVersionId: r.reemplazaVersionId ?? null,
    socializaciones: 0,
  };
}

export function useDocumentosDMS(uid: string | null, nit: string | null) {
  const [items,   setItems]   = useState<DocumentoDMS[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    const q = nit
      ? query(collection(db, 'documentos_dms'), where('nit', '==', nit), orderBy('fechaCreacion', 'desc'))
      : query(collection(db, 'documentos_dms'), where('uid', '==', uid), orderBy('fechaCreacion', 'desc'));

    let unsub: Unsubscribe;
    try {
      unsub = onSnapshot(q, snap => {
        setItems(snap.docs.map(fromSnap));
        setLoading(false);
      }, err => { setError(err.message); setLoading(false); });
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
    return () => unsub?.();
  }, [uid, nit]);

  /** Última versión (la más alta) por cada docId — para saber qué está vigente. */
  const vigentePorDocId = useCallback((docId: FirmaDocId): DocumentoDMS | null => {
    const delTipo = items.filter(i => i.docId === docId && i.estado !== 'obsoleto');
    if (!delTipo.length) return null;
    return delTipo.reduce((a, b) => (b.version > a.version ? b : a));
  }, [items]);

  const historialPorDocId = useCallback((docId: FirmaDocId): DocumentoDMS[] => {
    return items.filter(i => i.docId === docId).sort((a, b) => b.version - a.version);
  }, [items]);

  /** Crea una nueva versión en borrador — si ya existe una versión previa
   * (aprobada o no) para ese docId, esta nueva la referencia como
   * "reemplaza". No toca la anterior todavía (eso pasa al aprobar). */
  const crearVersion = useCallback(async (docId: FirmaDocId, uidCreador: string, nitCreador: string, nombreCreador: string) => {
    const cat = FIRMA_CATALOGO.find(c => c.id === docId)!;
    const anterior = vigentePorDocId(docId);
    const nuevaVersion = anterior ? anterior.version + 1 : 1;
    const ref = await addDoc(collection(db, 'documentos_dms'), {
      docId,
      nombre: cat.nombre,
      version: nuevaVersion,
      estado: 'borrador',
      uid: uidCreador,
      nit: nitCreador,
      creadoPorNombre: nombreCreador,
      fechaCreacion: serverTimestamp(),
      reemplazaVersionId: anterior?.id ?? null,
    });
    return ref.id;
  }, [vigentePorDocId]);

  const enviarARevision = useCallback(async (id: string) => {
    await updateDoc(doc(db, 'documentos_dms', id), { estado: 'en_revision' });
  }, []);

  /** Aprobar = firmar electrónicamente el contenido exacto de esta versión
   * (sello HMAC del servidor) y marcar obsoleta la versión anterior del
   * mismo documento, si existía. Solo admin — reforzado también en las
   * reglas de Firestore, no solo aquí. */
  const aprobar = useCallback(async (item: DocumentoDMS, contenido: string, aprobadoPorNombre: string) => {
    const prueba = await crearFirma({
      tipo: 'documento',
      refId: `${item.docId}-v${item.version}`,
      contenido,
      firmante: aprobadoPorNombre,
    });
    await updateDoc(doc(db, 'documentos_dms', item.id), {
      estado: 'aprobado',
      firmaId: prueba.id,
      contenidoHash: prueba.contenidoHash,
      aprobadoPor: aprobadoPorNombre,
      fechaAprobacion: serverTimestamp(),
    });
    if (item.reemplazaVersionId) {
      await updateDoc(doc(db, 'documentos_dms', item.reemplazaVersionId), { estado: 'obsoleto' });
    }
  }, []);

  const listarSocializaciones = useCallback(async (documentoId: string): Promise<Socializacion[]> => {
    const snap = await getDocs(collection(db, 'documentos_dms', documentoId, 'socializaciones'));
    return snap.docs.map(d => {
      const r = d.data();
      const ts = r.timestamp instanceof Timestamp ? r.timestamp.toMillis() : 0;
      return { uid: d.id, nombre: r.nombre ?? '', timestamp: ts };
    });
  }, []);

  const marcarSocializado = useCallback(async (documentoId: string, uidUsuario: string, nombreUsuario: string) => {
    await setDoc(doc(db, 'documentos_dms', documentoId, 'socializaciones', uidUsuario), {
      nombre: nombreUsuario,
      timestamp: serverTimestamp(),
    });
  }, []);

  return {
    items, loading, error,
    vigentePorDocId, historialPorDocId,
    crearVersion, enviarARevision, aprobar,
    listarSocializaciones, marcarSocializado,
  };
}
