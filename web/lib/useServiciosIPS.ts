'use client';

/**
 * web/lib/useServiciosIPS.ts
 * Servicios/modalidades que la IPS declara que presta — alimenta el "plus"
 * del Gestor Documental (web/lib/dmsServiciosCatalogo.ts): qué documentos
 * condicionales por servicio se muestran, además de los documentos base
 * exigidos a toda IPS sin importar su portafolio.
 *
 * Persistencia: ips/{nit}/data/perfil — colección ya prevista en
 * firestore.rules para datos compartidos por todo el equipo de una misma
 * IPS (lee/escribe cualquier usuario cuyo nit coincida, o admin) — a
 * diferencia de localStorage (por navegador, no se comparte entre el
 * equipo) o de usuarios/{uid} (por persona, no por IPS).
 */

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ServicioId } from '@/lib/dmsServiciosCatalogo';

export function useServiciosIPS(nit: string | null) {
  const [servicios, setServicios] = useState<ServicioId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!nit) { setLoading(false); return; }
    setLoading(true);
    getDoc(doc(db, 'ips', nit, 'data', 'perfil'))
      .then(snap => setServicios(snap.exists() ? ((snap.data().serviciosHabilitados as ServicioId[]) ?? []) : []))
      .catch(() => setServicios([]))
      .finally(() => setLoading(false));
  }, [nit]);

  const guardar = useCallback(async (nuevos: ServicioId[]) => {
    if (!nit) return;
    await setDoc(doc(db, 'ips', nit, 'data', 'perfil'), { serviciosHabilitados: nuevos }, { merge: true });
    setServicios(nuevos);
  }, [nit]);

  return { servicios, loading, guardar };
}
