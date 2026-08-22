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
import { generarDocumento, escH, hoy, header, signBlock } from '@/lib/docTemplates';
import { DOC_CATALOGO, IPS_CONFIG_DEFAULTS } from '@/lib/docTypes';
import type { IPSConfig, DocId } from '@/lib/docTypes';
import { DOCUMENTOS_SERVICIO_CATALOGO } from '@/lib/dmsServiciosCatalogo';
import { FIRMA_CATALOGO } from '@/lib/useFirma';

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

/** Esqueleto profesional (mismo look & feel que las plantillas completas de
 * docTemplates.ts: encabezado con datos de la IPS, objetivo/alcance, marco
 * normativo, secciones a desarrollar y bloque de firma) para cualquier
 * documento del Gestor Documental que no tiene una plantilla propia
 * redactada a mano — evita el resumen "nombre|base|ips|nit" que antes se
 * guardaba y se veía como texto plano sin formato en la cola de aprobación.
 * No inventa contenido clínico/operativo específico: cuando se pasan
 * `secciones`, solo lista los encabezados que el equipo técnico de la IPS
 * debe desarrollar. */
function esqueletoProfesional(nombreDoc: string, base: string, cfg: IPSConfig, secciones?: string[]): string {
  const { director, nombre } = cfg;
  const tieneSecciones = !!secciones?.length;
  const bloqueSecciones = tieneSecciones
    ? `\n<h2>3. SECCIONES A DESARROLLAR POR EL EQUIPO TÉCNICO</h2>\n<ul>${secciones!.map(s => `<li>${escH(s)}</li>`).join('')}</ul>\n`
    : '';
  const numRevision = tieneSecciones ? 4 : 3;
  return `
<h2>${escH(nombreDoc.toUpperCase())}</h2>
${header(cfg, nombreDoc, 'Versión 1.0', base || 'Verificar base legal con la Secretaría de Salud territorial')}

<h2>1. OBJETIVO Y ALCANCE</h2>
<p>Este documento establece los lineamientos, responsables y procedimientos de <strong>${escH(nombreDoc)}</strong> en <strong>${escH(nombre)}</strong>${base ? `, conforme a ${escH(base)}` : ''}.</p>
<p>Aplica a todo el personal asistencial y administrativo involucrado en la prestación de este servicio o proceso.</p>

<h2>2. MARCO NORMATIVO</h2>
<ul><li>${escH(base || 'Pendiente de precisar — verificar con la Secretaría de Salud territorial antes de aprobar este documento')}</li></ul>
${bloqueSecciones}
<h2>${numRevision}. REVISIÓN Y CONTROL DE VERSIONES</h2>
<table><tr><th>Versión</th><th>Fecha</th><th>Descripción</th><th>Elaboró</th></tr>
<tr><td>1.0</td><td>${hoy()}</td><td>Elaboración inicial</td><td>${escH(director)}</td></tr></table>

${signBlock(cfg, 'Responsable del proceso')}`;
}

/** Contenido exacto a firmar/versionar: el HTML real del documento cuando
 * existe plantilla redactada a mano en el módulo de Documentos; si no
 * (documentos condicionales por servicio, o ids legado como "habilitación"
 * y "calidad" que nunca tuvieron plantilla propia), un esqueleto profesional
 * generado — nunca el resumen plano "nombre|base|ips|nit" de antes. */
export function contenidoParaFirmar(id: string, cfg: IPSConfig): string {
  const tieneTemplate = DOC_CATALOGO.some(d => d.id === id);
  if (tieneTemplate) return generarDocumento(id as DocId, cfg);

  const docServicio = DOCUMENTOS_SERVICIO_CATALOGO.find(d => d.id === id);
  if (docServicio) return esqueletoProfesional(docServicio.nombre, docServicio.base, cfg, docServicio.secciones);

  const cat = FIRMA_CATALOGO.find(c => c.id === id);
  if (cat) return esqueletoProfesional(cat.nombre, cat.base, cfg);

  return esqueletoProfesional(id, '', cfg);
}
