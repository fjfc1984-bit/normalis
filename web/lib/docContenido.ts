/**
 * web/lib/docContenido.ts
 * Helpers compartidos para regenerar el contenido EXACTO de un documento
 * institucional a partir de su plantilla — usados por cualquier módulo que
 * necesite sellar (Firma) o versionar (Gestor Documental / DMS) ese
 * contenido. Extraído de web/app/dashboard/firma/page.tsx para reutilizarlo
 * sin duplicar lógica — el hash de firma DEBE salir siempre del mismo punto.
 */

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generarDocumento } from '@/lib/docTemplates';
import { DOC_CATALOGO, IPS_CONFIG_DEFAULTS } from '@/lib/docTypes';
import type { IPSConfig, DocId } from '@/lib/docTypes';
import { FIRMA_CATALOGO } from '@/lib/useFirma';
import type { FirmaDocId } from '@/lib/useFirma';

/** Config de IPS para regenerar el contenido exacto que se firma/versiona.
 * Mismos campos/fuente que web/app/dashboard/documentos/page.tsx (nombre,
 * nit, ciudad de Firestore + director/rm/esp editables guardados en
 * localStorage). */
export function useIPSConfigLocal(uid: string | null) {
  const [cfg, setCfg] = useState<IPSConfig>(IPS_CONFIG_DEFAULTS);
  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, 'usuarios', uid)).then(snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      const saved = (() => {
        try { return JSON.parse(localStorage.getItem('normalis_doc_cfg') ?? '{}'); }
        catch { return {}; }
      })();
      setCfg({
        nombre:   d.nombre   ?? IPS_CONFIG_DEFAULTS.nombre,
        nit:      d.nit      ?? IPS_CONFIG_DEFAULTS.nit,
        ciudad:   d.ciudad   ?? IPS_CONFIG_DEFAULTS.ciudad,
        director: saved.director ?? d.nombreContacto ?? IPS_CONFIG_DEFAULTS.director,
        rm:       saved.rm       ?? '',
        esp:      saved.esp      ?? IPS_CONFIG_DEFAULTS.esp,
      });
    });
  }, [uid]);
  return cfg;
}

/** Contenido exacto a firmar/versionar: el HTML real del documento cuando
 * existe plantilla en el módulo de Documentos; si no (ids legado sin
 * plantilla), un resumen determinístico como respaldo. */
export function contenidoParaFirmar(id: FirmaDocId, cfg: IPSConfig): string {
  const tieneTemplate = DOC_CATALOGO.some(d => d.id === id);
  if (tieneTemplate) return generarDocumento(id as DocId, cfg);
  const cat = FIRMA_CATALOGO.find(c => c.id === id)!;
  return `${cat.nombre}|${cat.base}|${cfg.nombre}|${cfg.nit}`;
}
