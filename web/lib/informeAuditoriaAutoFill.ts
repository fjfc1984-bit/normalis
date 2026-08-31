'use client';

// web/lib/informeAuditoriaAutoFill.ts
// Auto-relleno del Informe de Auditoría a partir de una auditoría de
// habilitación, un incidente o un evento de vigilancia sanitaria ya
// registrados. Solo redacta lo que puede derivarse honestamente de datos ya
// guardados (alcance, hallazgos, recomendaciones desde CAPAs/acciones
// tomadas, y un resumen de score en conclusiones para auditorías) — nunca
// inventa análisis. El resto de secciones narrativas queda con un texto
// base editable por el usuario.

import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { areasDB, SEGMENT_META } from '@/data/auditData';
import { buildFlatQuestions, calcAuditScore, getNonConformities, scoreLabel } from './auditScore';
import type { AuditAnswers } from './auditTypes';
import type { IncidenteItem } from './incidenteTypes';
import type { EventoVigilancia } from './vigilanciaTypes';
import { TIPO_VIGILANCIA_CFG } from './vigilanciaTypes';
import type { FuenteInforme, InformeSecciones } from './informeAuditoriaTypes';

export interface FuenteOpcion {
  id: string;
  label: string;
}

// ── Listar candidatos por tipo de fuente ────────────────────────────────────
export async function listarAuditoriasCompletadas(uid: string): Promise<FuenteOpcion[]> {
  const snap = await getDocs(query(collection(db, 'auditorias'), where('uid', '==', uid)));
  return snap.docs
    .map(d => d.data() as { segmento: string; completedAt: string | null; score: number })
    .filter(a => !!a.completedAt)
    .map(a => ({ id: a.segmento, label: `${SEGMENT_META[a.segmento]?.label ?? a.segmento} — ${a.score}%` }));
}

export async function listarIncidentes(uid: string): Promise<FuenteOpcion[]> {
  const snap = await getDocs(collection(db, 'usuarios', uid, 'incidentes'));
  return snap.docs.map(d => {
    const r = d.data() as IncidenteItem;
    return { id: d.id, label: `${r.tipo} — ${r.fecha}` };
  });
}

export async function listarEventosVigilancia(uid: string, nit: string): Promise<FuenteOpcion[]> {
  const base = nit
    ? query(collection(db, 'eventos_vigilancia'), where('nit', '==', nit))
    : query(collection(db, 'eventos_vigilancia'), where('uid', '==', uid));
  const snap = await getDocs(base);
  return snap.docs.map(d => {
    const r = d.data() as EventoVigilancia;
    const label = TIPO_VIGILANCIA_CFG[r.tipoVigilancia]?.label ?? r.tipoVigilancia;
    return { id: d.id, label: `${label} — ${r.productoNombre} (${r.fechaOcurrencia})` };
  });
}

// ── Texto base narrativo por tipo de fuente ─────────────────────────────────
function boilerplatePorFuente(fuente: FuenteInforme, ipsNombre: string) {
  const nombre = ipsNombre || 'la IPS';
  switch (fuente) {
    case 'auditoria':
      return {
        introduccion: `El presente informe documenta los resultados de la auditoría de habilitación realizada en ${nombre}, en el marco del cumplimiento de las condiciones de habilitación establecidas por la normativa vigente para prestadores de servicios de salud.`,
        justificacion: `La realización de esta auditoría responde a la obligación de autoevaluación periódica de las condiciones de habilitación establecidas en la Resolución 1732 de 2026, así como a la necesidad institucional de identificar oportunidades de mejora antes de una visita de verificación por parte de la autoridad sanitaria competente.`,
        objetivos: `Verificar el cumplimiento de las condiciones de habilitación aplicables al servicio evaluado, identificar no conformidades frente a los estándares vigentes y establecer la base para el plan de mejoramiento correspondiente.`,
        metodologia: `La evaluación se realizó mediante la aplicación de una lista de verificación estructurada por áreas y criterios, basada en los estándares de habilitación de la Resolución 1732 de 2026. Cada criterio fue calificado como Cumple, Cumple parcialmente, No cumple o No aplica, con un puntaje ponderado según la criticidad de cada criterio.`,
      };
    case 'incidente':
      return {
        introduccion: `El presente informe documenta el análisis del incidente/evento adverso reportado en ${nombre}, en el marco del Sistema Institucional de Seguridad del Paciente.`,
        justificacion: `El análisis y reporte de incidentes y eventos adversos responde a la Política Nacional de Seguridad del Paciente y al estándar de Seguridad del Paciente de la Resolución 1732 de 2026, orientado a prevenir la recurrencia de eventos similares.`,
        objetivos: `Analizar las causas contribuyentes del evento reportado, documentar las acciones tomadas y establecer recomendaciones para prevenir su recurrencia.`,
        metodologia: `El análisis se realizó siguiendo el Protocolo de Londres (Vincent & Taylor-Adams) de análisis de causa raíz, identificando los factores contribuyentes agrupados por categoría y la causa raíz del evento.`,
      };
    case 'vigilancia':
      return {
        introduccion: `El presente informe documenta el evento de vigilancia sanitaria reportado en ${nombre}, en el marco de los programas institucionales de farmacovigilancia, tecnovigilancia y reactivovigilancia.`,
        justificacion: `El reporte y análisis de eventos de vigilancia sanitaria responde a las obligaciones de los programas de farmacovigilancia (Circular 48/2020 MSPS), tecnovigilancia (Res. 4816/2008 INVIMA) y reactivovigilancia (Res. 2020007532/2020 INVIMA), así como al Estándar de Medicamentos, Dispositivos Médicos e Insumos de la Resolución 1732 de 2026.`,
        objetivos: `Documentar el evento reportado, las acciones tomadas y el estado del reporte ante INVIMA, dentro de los plazos establecidos por la normativa aplicable.`,
        metodologia: `El evento fue documentado siguiendo el procedimiento institucional de vigilancia sanitaria, con clasificación de severidad y seguimiento del plazo de reporte ante INVIMA según el tipo de programa correspondiente.`,
      };
    case 'manual':
    default:
      return {
        introduccion: `El presente informe documenta la auditoría/evaluación realizada en ${nombre}.`,
        justificacion: '',
        objetivos: '',
        metodologia: '',
      };
  }
}

const SALVEDAD_ESTANDAR = 'El presente informe se basa en la información y evidencia disponible al momento de su elaboración, suministrada y registrada por el personal de la institución dentro de la plataforma NormaLis. No constituye una verificación independiente in situ de la totalidad de la evidencia documental ni reemplaza la visita de verificación de la autoridad sanitaria competente. Los hallazgos aquí consignados reflejan el estado de cumplimiento auto-reportado y evaluado al momento de la auditoría.';

// ── Auto-relleno principal ──────────────────────────────────────────────────
export async function generarBorrador(
  fuente: FuenteInforme,
  fuenteRefId: string | null,
  uid: string,
  nit: string,
  ipsNombre: string,
): Promise<{ titulo: string; fuenteLabel: string; secciones: InformeSecciones }> {
  const base = boilerplatePorFuente(fuente, ipsNombre);
  const secciones: InformeSecciones = {
    introduccion: base.introduccion,
    justificacion: base.justificacion,
    objetivos: base.objetivos,
    metodologia: base.metodologia,
    alcance: '',
    hallazgos: '',
    conclusiones: '',
    recomendaciones: '',
    salvedad: SALVEDAD_ESTANDAR,
  };
  let titulo = 'Informe de auditoría';
  let fuenteLabel = '';

  if (fuente === 'auditoria' && fuenteRefId) {
    const segmento = fuenteRefId;
    const snap = await getDoc(doc(db, 'auditorias', `${uid}_${segmento}`));
    const meta = SEGMENT_META[segmento];
    fuenteLabel = meta?.label ?? segmento;
    titulo = `Informe de Auditoría de Habilitación — ${fuenteLabel}`;

    if (snap.exists()) {
      const data = snap.data() as { answers: AuditAnswers };
      const areas = areasDB[segmento] ?? [];
      const flat = buildFlatQuestions(areas);
      const scoreInfo = calcAuditScore(flat, data.answers || {});
      const ncs = getNonConformities(flat, data.answers || {});
      const totalQ = flat.length;

      secciones.alcance = `Auditoría de habilitación del servicio "${fuenteLabel}" (${meta?.norm ?? ''}), evaluado en ${areas.length} área(s) y ${totalQ} criterio(s) de verificación bajo la Resolución 1732 de 2026.`;

      secciones.hallazgos = ncs.length
        ? ncs.map(nc => `• [${nc.areaName}] ${nc.question} — ${nc.answer === 'no' ? 'No cumple' : 'Cumple parcialmente'}${nc.obligatorio ? ' ⚠️ Criterio crítico' : ''}`).join('\n')
        : 'No se identificaron no conformidades en la evaluación realizada.';

      secciones.conclusiones = `El servicio evaluado obtuvo un puntaje de ${scoreInfo.score}%, clasificado como "${scoreLabel(scoreInfo.score, scoreInfo.obligatorioIncumplido)}". Se identificaron ${ncs.length} no conformidad(es) sobre ${totalQ} criterios evaluados.`;

      const capasSnap = await getDocs(
        query(collection(db, 'capas'), where('uid', '==', uid), where('refSegmento', '==', segmento))
      );
      const capas = capasSnap.docs.map(d => d.data() as { numero: string; accionCorrectiva: string; area: string });
      secciones.recomendaciones = capas.length
        ? capas.map(c => `• [${c.numero}] (${c.area}) ${c.accionCorrectiva}`).join('\n')
        : (ncs.length
            ? 'Se recomienda establecer un plan de acción correctiva para las no conformidades identificadas.'
            : 'Se recomienda mantener el monitoreo periódico de las condiciones de habilitación evaluadas.');
    }
  }

  if (fuente === 'incidente' && fuenteRefId) {
    const snap = await getDoc(doc(db, 'usuarios', uid, 'incidentes', fuenteRefId));
    if (snap.exists()) {
      const inc = snap.data() as IncidenteItem;
      fuenteLabel = `${inc.tipo} — ${inc.fecha}`;
      titulo = `Informe de Análisis de Incidente — ${inc.tipo}`;
      secciones.alcance = `Análisis del incidente de tipo "${inc.tipo}" (severidad: ${inc.severidad}), reportado el ${inc.fecha}.`;

      const factores = inc.analisisLondres?.factoresContribuyentes ?? [];
      secciones.hallazgos = [
        `Descripción del evento: ${inc.desc || '—'}`,
        inc.analisisLondres?.causaRaiz ? `Causa raíz identificada: ${inc.analisisLondres.causaRaiz}` : '',
        factores.length ? 'Factores contribuyentes:\n' + factores.map(f => `• [${f.categoria}] ${f.detalle}`).join('\n') : '',
      ].filter(Boolean).join('\n\n');

      secciones.conclusiones = `El incidente fue clasificado con severidad "${inc.severidad}" y se encuentra en estado "${inc.estado}".`;

      secciones.recomendaciones = [
        inc.accion ? `Acción inmediata tomada: ${inc.accion}` : '',
        inc.analisisLondres?.accionRecomendada ? `Acción recomendada: ${inc.analisisLondres.accionRecomendada}` : '',
      ].filter(Boolean).join('\n') || 'Sin recomendaciones registradas.';
    }
  }

  if (fuente === 'vigilancia' && fuenteRefId) {
    const snap = await getDoc(doc(db, 'eventos_vigilancia', fuenteRefId));
    if (snap.exists()) {
      const ev = snap.data() as EventoVigilancia;
      const cfg = TIPO_VIGILANCIA_CFG[ev.tipoVigilancia];
      fuenteLabel = `${cfg?.label ?? ev.tipoVigilancia} — ${ev.productoNombre}`;
      titulo = `Informe de ${cfg?.label ?? 'Vigilancia Sanitaria'} — ${ev.productoNombre}`;
      secciones.alcance = `Evento de ${cfg?.label ?? ev.tipoVigilancia} relacionado con "${ev.productoNombre}", ocurrido el ${ev.fechaOcurrencia} y conocido el ${ev.fechaConocimiento}.`;
      secciones.hallazgos = `Severidad: ${ev.severidad === 'serio' ? 'Serio' : 'No serio'}. Paciente afectado: ${ev.pacienteAfectado ? 'Sí' : 'No'}.\n\nDescripción del evento: ${ev.descripcionEvento || '—'}`;
      secciones.conclusiones = `El evento se encuentra en estado "${ev.estadoReporte === 'reportado' ? 'Reportado a INVIMA' : 'Pendiente de reportar'}"${ev.radicadoInvima ? ` (radicado ${ev.radicadoInvima})` : ''}.`;
      secciones.recomendaciones = ev.accionesTomadas || 'Sin acciones registradas.';
    }
  }

  return { titulo, fuenteLabel, secciones };
}
