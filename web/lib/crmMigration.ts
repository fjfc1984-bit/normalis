/**
 * web/lib/crmMigration.ts
 * Migra los `prospectos` y `leads` existentes hacia la colección unificada
 * `crm_contactos`. Idempotente: cada contacto migrado guarda `origen` +
 * `origenId` apuntando al doc viejo, así que correr esto más de una vez
 * (p. ej. cada vez que se abre /admin/crm) no crea duplicados.
 */

import {
  collection, getDocs, writeBatch, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CRMEtapa, CRMFuente } from '@/lib/crmTypes';

const ETAPA_DESDE_PROSPECTO: Record<string, CRMEtapa> = {
  nuevo:      'nuevo',
  contactado: 'contactado',
  demo:       'demo',
  propuesta:  'propuesta',
  cerrado:    'cliente',
  perdido:    'perdido',
};

const ETAPA_DESDE_LEAD: Record<string, CRMEtapa> = {
  nuevo:       'nuevo',
  contactado:  'contactado',
  calificado:  'calificado',
  descartado:  'perdido',
};

export async function migrarDatosLegadosACRM(): Promise<{ migrados: number }> {
  const [prospectosSnap, leadsSnap, crmSnap] = await Promise.all([
    getDocs(collection(db, 'prospectos')),
    getDocs(collection(db, 'leads')),
    getDocs(collection(db, 'crm_contactos')),
  ]);

  const yaMigrados = new Set(
    crmSnap.docs
      .map(d => d.data().origenId as string | undefined)
      .filter((id): id is string => !!id)
  );

  const batch = writeBatch(db);
  let migrados = 0;

  for (const d of prospectosSnap.docs) {
    if (yaMigrados.has(d.id)) continue;
    const p = d.data();
    const ref = doc(collection(db, 'crm_contactos'));
    batch.set(ref, {
      nombre:         p.nombre ?? '',
      contactoNombre: p.contacto ?? '',
      email:          p.email ?? '',
      telefono:       p.telefono ?? '',
      ciudad:         p.ciudad ?? '',
      etapa:          ETAPA_DESDE_PROSPECTO[p.estado as string] ?? 'nuevo',
      fuente:         'otro' as CRMFuente,
      origen:         'prospecto',
      origenId:       d.id,
      createdAt:      p.createdAt ?? serverTimestamp(),
      updatedAt:      serverTimestamp(),
    });
    migrados++;
  }

  for (const d of leadsSnap.docs) {
    if (yaMigrados.has(d.id)) continue;
    const l = d.data();
    const ref = doc(collection(db, 'crm_contactos'));
    batch.set(ref, {
      nombre:         l.nombre ?? '',
      contactoNombre: l.nombre ?? '',
      email:          l.email ?? '',
      telefono:       l.telefono ?? '',
      ciudad:         l.ciudad ?? '',
      tipoIPS:        l.tipoIPS ?? '',
      etapa:          ETAPA_DESDE_LEAD[l.estado as string] ?? 'nuevo',
      fuente:         'demo_web' as CRMFuente,
      origen:         'lead',
      origenId:       d.id,
      createdAt:      l.createdAt ?? serverTimestamp(),
      updatedAt:      serverTimestamp(),
    });
    migrados++;
  }

  if (migrados > 0) await batch.commit();
  return { migrados };
}
