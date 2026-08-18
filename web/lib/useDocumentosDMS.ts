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
 * IMPORTANTE — contenido capturado al crear, no al aprobar: el HTML exacto
 * que se sella con HMAC se genera y guarda en `crearVersion` (cuando quien
 * está logueado es la propia IPS y sus datos — nombre/nit/director/registro
 * médico — son los correctos). `aprobar` NUNCA regenera el contenido: solo
 * re-usa el que ya quedó guardado. Esto es lo que permite que un admin
 * (que no pertenece a ninguna IPS y no tiene esos datos en su sesión ni en
 * su localStorage) pueda aprobar sin correr el riesgo de sellar el
 * documento con datos equivocados o vacíos.
 *
 * Cola de aprobación: un admin no tiene `nit` propio, así que no puede
 * usar `useDocumentosDMS(uid, nit)` (queda vacío por diseño — mismo patrón
 * que usePAMEC). Para revisar/aprobar documentos de CUALQUIER IPS existe
 * `useColaAprobacionDMS()`, que consulta por estado en vez de por
 * nit/uid — ver web/app/dashboard/aprobaciones/page.tsx.
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
  contenido?:         string; // HTML exacto capturado al crear — ver nota arriba
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
    contenido: r.contenido ?? '',
    aprobadoPor: r.aprobadoPor,
    fechaAprobacion: r.fechaAprobacion ? ts(r.fechaAprobacion) : undefined,
    firmaId: r.firmaId,
    contenidoHash: r.contenidoHash,
    reemplazaVersionId: r.reemplazaVersionId ?? null,
    socializaciones: 0,
  };
}

// ── Mutaciones — funciones planas, no dependen de estado de ningún hook ────
// (se pueden llamar tanto desde useDocumentosDMS como desde
// useColaAprobacionDMS/la página de admin, sin duplicar lógica).

export const enviarARevisionDMS = async (id: string) => {
  await updateDoc(doc(db, 'documentos_dms', id), { estado: 'en_revision' });
};

/** Aprobar = firmar electrónicamente el contenido EXACTO capturado al crear
 * esta versión (sello HMAC del servidor) y marcar obsoleta la versión
 * anterior del mismo documento, si existía. Solo admin — reforzado también
 * en las reglas de Firestore, no solo aquí. No regenera contenido: usa
 * item.contenido tal cual quedó guardado en crearVersion. */
export const aprobarDocumentoDMS = async (item: DocumentoDMS, aprobadoPorNombre: string) => {
  const prueba = await crearFirma({
    tipo: 'documento',
    refId: `${item.docId}-v${item.version}`,
    contenido: item.contenido ?? '',
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
};

export const listarSocializacionesDMS = async (documentoId: string): Promise<Socializacion[]> => {
  const snap = await getDocs(collection(db, 'documentos_dms', documentoId, 'socializaciones'));
  return snap.docs.map(d => {
    const r = d.data();
    const ts = r.timestamp instanceof Timestamp ? r.timestamp.toMillis() : 0;
    return { uid: d.id, nombre: r.nombre ?? '', timestamp: ts };
  });
};

export const marcarSocializadoDMS = async (documentoId: string, uidUsuario: string, nombreUsuario: string) => {
  await setDoc(doc(db, 'documentos_dms', documentoId, 'socializaciones', uidUsuario), {
    nombre: nombreUsuario,
    timestamp: serverTimestamp(),
  });
};

// ── Hook por-IPS (vista normal: crear, enviar a revisión, socializar) ──────

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
   * "reemplaza". No toca la anterior todavía (eso pasa al aprobar).
   * `contenido` es el HTML exacto de esta versión, generado por quien
   * crea (la propia IPS) — queda guardado tal cual para que `aprobar` lo
   * re-use sin regenerar nada. */
  const crearVersion = useCallback(async (docId: FirmaDocId, uidCreador: string, nitCreador: string, nombreCreador: string, contenido: string) => {
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
      contenido,
      reemplazaVersionId: anterior?.id ?? null,
    });
    return ref.id;
  }, [vigentePorDocId]);

  return {
    items, loading, error,
    vigentePorDocId, historialPorDocId,
    crearVersion,
    enviarARevision: enviarARevisionDMS,
    aprobar: aprobarDocumentoDMS,
    listarSocializaciones: listarSocializacionesDMS,
    marcarSocializado: marcarSocializadoDMS,
  };
}

// ── Cola de aprobación (vista admin, cross-tenant) ──────────────────────────
// Un admin no tiene nit propio, así que no puede usar el hook de arriba
// (cae a la rama por uid y siempre queda vacío). Esta consulta es por
// ESTADO, no por tenant — así un admin ve lo que está "en_revision" sin
// importar de qué IPS sea. La ficha de cada item ya trae creadoPorNombre
// (nombre de la IPS) y nit para identificarla en pantalla.
export function useColaAprobacionDMS() {
  const [items,   setItems]   = useState<DocumentoDMS[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const q = query(
      collection(db, 'documentos_dms'),
      where('estado', '==', 'en_revision'),
      orderBy('fechaCreacion', 'desc'),
    );
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(fromSnap));
      setLoading(false);
    }, err => { setError(err.message); setLoading(false); });
    return () => unsub();
  }, []);

  return { items, loading, error };
}
