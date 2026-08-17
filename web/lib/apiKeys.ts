/**
 * web/lib/apiKeys.ts
 * Gestión de llaves de la API pública de integraciones (colección
 * top-level `api_keys/{hash}`, ver firestore.rules).
 *
 * La llave real se genera y se muestra UNA sola vez en el navegador; solo
 * su hash SHA-256 se guarda en Firestore. NormaLis nunca puede recuperar
 * el valor original — si el usuario la pierde, debe revocarla y crear otra.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc,
  getDocs, setDoc, updateDoc, deleteDoc,
  query, where, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ApiKeyItem {
  id:        string;   // hash SHA-256 de la llave (nunca la llave misma)
  nombre:    string;   // etiqueta elegida por el usuario, ej. "Integración Hosvital"
  activo:    boolean;
  creadoEn:  number;   // timestamp ms
}

// Genera una llave aleatoria criptográficamente segura con prefijo
// identificable, estilo "nlk_live_<64 hex>" (NormaLis Live Key).
function generarLlaveCruda(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `nlk_live_${hex}`;
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useApiKeys(uid: string | null) {
  const [keys,    setKeys]    = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    // Filtro simple + orden en cliente (evita requerir un índice compuesto
    // nuevo en Firestore — mismo patrón usado en el resto de módulos).
    const q = query(collection(db, 'api_keys'), where('uid', '==', uid));
    getDocs(q)
      .then(snap => {
        const data = snap.docs.map(d => {
          const r = d.data();
          return {
            id:       d.id,
            nombre:   r.nombre   ?? 'Sin nombre',
            activo:   r.activo   ?? false,
            creadoEn: r.creadoEn ?? 0,
          };
        });
        data.sort((a, b) => b.creadoEn - a.creadoEn);
        setKeys(data);
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [uid]);

  // Crea una nueva llave y la devuelve en texto plano — es la ÚNICA vez
  // que estará disponible. El caller debe mostrarla al usuario de inmediato.
  const crear = useCallback(async (nombre: string): Promise<string> => {
    if (!uid) throw new Error('No autenticado');
    const rawKey = generarLlaveCruda();
    const hash   = await sha256Hex(rawKey);
    const creadoEn = Date.now();

    await setDoc(doc(db, 'api_keys', hash), {
      uid,
      nombre: nombre.trim() || 'Sin nombre',
      activo: true,
      creadoEn,
      createdAt: Timestamp.now(),
    });

    setKeys(prev => [{ id: hash, nombre: nombre.trim() || 'Sin nombre', activo: true, creadoEn }, ...prev]);
    return rawKey;
  }, [uid]);

  const revocar = useCallback(async (id: string): Promise<void> => {
    if (!uid) return;
    await updateDoc(doc(db, 'api_keys', id), { activo: false });
    setKeys(prev => prev.map(k => k.id === id ? { ...k, activo: false } : k));
  }, [uid]);

  const reactivar = useCallback(async (id: string): Promise<void> => {
    if (!uid) return;
    await updateDoc(doc(db, 'api_keys', id), { activo: true });
    setKeys(prev => prev.map(k => k.id === id ? { ...k, activo: true } : k));
  }, [uid]);

  const eliminar = useCallback(async (id: string): Promise<void> => {
    if (!uid) return;
    await deleteDoc(doc(db, 'api_keys', id));
    setKeys(prev => prev.filter(k => k.id !== id));
  }, [uid]);

  return { keys, loading, error, crear, revocar, reactivar, eliminar };
}
