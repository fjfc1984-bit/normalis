// web/lib/agentePilar.ts
// Motor de "Agente Pilar": al completar una auditoría de habilitación, esta
// función analiza las no conformidades detectadas con IA (Cloudflare Workers
// AI) y genera automáticamente riesgos ISO 31000 y, para los de nivel
// alto/extremo, sus CAPAs correspondientes — cerrando el ciclo
// Auditoría → Riesgo → CAPA sin intervención manual.
//
// Nota de transparencia (Circular SIC 002/2024 y política de privacidad
// §10): todo riesgo/CAPA generado por este motor queda marcado con
// origen 'agente_pilar' y la UI (Análisis de Riesgo, Cumplimiento
// Integrado) debe mostrar visiblemente que requiere revisión humana antes
// de tomarse como definitivo — este motor nunca cierra ni ejecuta nada por
// sí mismo, solo propone.
//
// Mismo principio de trazabilidad que los otros motores de esta sesión
// (web/lib/migracion1732.ts, web/lib/alertasRiesgo.ts): nunca inventa datos
// sin evidencia — aquí la "evidencia" son las no conformidades reales de la
// auditoría recién completada, enviadas tal cual al modelo.

import {
  collection, addDoc, doc, getDocs, setDoc, updateDoc, query, where,
  getCountFromServer, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { analizarAuditoriaConAgente, type AgentePilarNC } from './worker';
import type { NonConformityItem } from './useAudit';

type Nivel = 'bajo' | 'medio' | 'alto' | 'extremo';

function calcNivel(p: number, i: number): Nivel {
  const s = p * i;
  if (s <= 4)  return 'bajo';
  if (s <= 9)  return 'medio';
  if (s <= 16) return 'alto';
  return 'extremo';
}

export interface AgenteResumen {
  riesgosCreados: number;
  capasCreadadas: number;
  ncsProcessadas: number;
  errores:        string[] | null;
}

/**
 * Ejecuta el Agente Pilar sobre una auditoría recién completada.
 * Nunca lanza — cualquier error queda documentado en el propio documento de
 * la auditoría (`agenteStatus: 'error'`) para que la UI de Cumplimiento
 * Integrado lo muestre y el usuario pueda reintentar manualmente.
 */
export async function ejecutarAgentePilar(
  uid: string,
  idToken: string,
  nit: string | null | undefined,
  segmento: string,
  segmentoLabel: string,
  ncs: NonConformityItem[],
): Promise<void> {
  const auditRef = doc(db, 'auditorias', `${uid}_${segmento}`);
  const marcar = (fields: Record<string, unknown>) =>
    setDoc(auditRef, fields, { merge: true }).catch(err =>
      console.error('[AgentePilar] No se pudo actualizar el estado de la auditoría:', err),
    );

  // Guarda de idempotencia: si esta auditoría ya generó riesgos vía Agente
  // Pilar, no se reprocesa. No se puede confiar en agenteStatus para esto:
  // markComplete() lo resetea a 'pendiente' en CADA guardado, incluso si el
  // usuario simplemente revisita una auditoría ya completada y vuelve a
  // recorrer el checklist (con las mismas respuestas precargadas) hasta el
  // final — eso dispara handleSave() de nuevo. Por eso la verdad de
  // referencia es la existencia real de riesgos con origen 'agente_pilar'
  // para este segmento, no el campo de estado (que es solo para mostrar
  // progreso en la UI). El botón de reintento manual en Cumplimiento
  // Integrado solo aparece para auditorías sin ese origen registrado, así
  // que esta guarda nunca bloquea un reintento legítimo.
  try {
    const previos = await getDocs(
      query(collection(db, 'riesgos', uid, 'items'), where('segmento', '==', segmento)),
    );
    const riesgosPrevios = previos.docs.filter(d => d.data()?.origen === 'agente_pilar');
    if (riesgosPrevios.length > 0) {
      // Auto-reparación: el trabajo ya existe, pero agenteStatus puede estar
      // desincronizado (un 'procesando' huérfano por una pestaña cerrada a
      // mitad de camino, o un 'pendiente' reseteado por un reenvío del
      // mismo formulario) — se corrige el estado en vez de reprocesar o de
      // dejarlo mostrando "Procesando…" para siempre.
      const capasPrevias = riesgosPrevios.filter(d => !!d.data()?.capaId).length;
      await marcar({
        agenteStatus: 'completado',
        agenteProcessedAt: new Date().toISOString(),
        agenteResumen: {
          riesgosCreados: riesgosPrevios.length,
          capasCreadadas: capasPrevias,
          ncsProcessadas: ncs.length,
          errores: null,
        } as AgenteResumen,
      });
      return;
    }
  } catch (err) {
    console.error('[AgentePilar] No se pudo verificar el estado previo de la auditoría:', err);
    // Si la lectura falla, se continúa — es preferible reprocesar antes que
    // dejar la auditoría atascada por un error transitorio de lectura.
  }

  // agenteProcesandoDesde permite detectar en la UI un procesamiento
  // huérfano — p. ej. si el usuario cierra la pestaña o navega fuera justo
  // después de completar la auditoría, esta llamada (fire-and-forget) se
  // interrumpe a mitad de camino y el estado queda en 'procesando' para
  // siempre, sin timestamp no habría forma de distinguir "procesando de
  // verdad ahora mismo" de "atascado hace 20 minutos".
  await marcar({ agenteStatus: 'procesando', agenteProcesandoDesde: new Date().toISOString() });

  // Sin no conformidades no hay nada que analizar — se marca como
  // completado de inmediato en vez de dejarlo "procesando" para siempre.
  if (!ncs.length) {
    await marcar({
      agenteStatus: 'completado',
      agenteProcessedAt: new Date().toISOString(),
      agenteResumen: { riesgosCreados: 0, capasCreadadas: 0, ncsProcessadas: 0, errores: null } as AgenteResumen,
    });
    return;
  }

  // El Worker acota a las primeras 40 no conformidades para mantener el
  // prompt acotado (ver cloudflare-worker/worker.js, handleAgentePilar).
  // Se refleja el mismo límite aquí para que "NC analizadas" en el resumen
  // sea exacto y no sobreestime lo que la IA realmente vio.
  const NC_LIMITE = 40;
  const ncsAnalizadas = ncs.slice(0, NC_LIMITE);

  try {
    const payload = {
      segmento,
      segmentoLabel,
      nonConformities: ncsAnalizadas.map((nc): AgentePilarNC => ({
        areaName: nc.areaName,
        question: nc.question,
        answer:   nc.answer === 'no' ? 'No cumple' : 'Cumple parcialmente',
      })),
    };
    const res = await analizarAuditoriaConAgente(payload, idToken);

    if (!res.estructurado || !res.riesgos || res.riesgos.length === 0) {
      await marcar({
        agenteStatus: 'error',
        agenteProcessedAt: new Date().toISOString(),
        agenteResumen: {
          riesgosCreados: 0, capasCreadadas: 0, ncsProcessadas: ncsAnalizadas.length,
          errores: ['El análisis de IA no devolvió un formato reconocible. Puedes reintentarlo desde Cumplimiento Integrado.'],
        } as AgenteResumen,
      });
      return;
    }

    const errores: string[] = [];
    let riesgosCreados = 0;
    let capasCreadadas = 0;
    let capaCounter: number | null = null;

    const nextCapaNumero = async (): Promise<string> => {
      if (capaCounter === null) {
        const countQ = nit
          ? query(collection(db, 'capas'), where('nit', '==', nit))
          : query(collection(db, 'capas'), where('uid', '==', uid));
        const snap = await getCountFromServer(countQ);
        capaCounter = snap.data().count ?? 0;
      }
      capaCounter += 1;
      return String(capaCounter).padStart(3, '0');
    };

    const fechaRevision = new Date();
    fechaRevision.setDate(fechaRevision.getDate() + 90);
    const fechaRevisionStr = fechaRevision.toISOString().slice(0, 10);

    for (const r of res.riesgos) {
      try {
        const nivel = calcNivel(r.probabilidad, r.impacto);
        const riesgoRef = await addDoc(collection(db, 'riesgos', uid, 'items'), {
          nombre:        r.nombre,
          categoria:     r.categoria,
          probabilidad:  r.probabilidad,
          impacto:       r.impacto,
          nivel,
          puntuacion:    r.probabilidad * r.impacto,
          tratamiento:   r.tratamiento,
          responsable:   '',
          fechaRevision: fechaRevisionStr,
          descripcion:   r.descripcion || `Riesgo detectado por Agente Pilar (IA) a partir de la auditoría de ${segmentoLabel}. Requiere revisión humana.`,
          origen:        'agente_pilar',
          segmento,
          capaId:        null,
          creadoEn:      serverTimestamp(),
        });
        riesgosCreados++;

        if (nivel === 'alto' || nivel === 'extremo') {
          const num = await nextCapaNumero();
          const limite = new Date();
          limite.setDate(limite.getDate() + 30);
          const capaRef = await addDoc(collection(db, 'capas'), {
            uid,
            nit: nit ?? '',
            numero: `CAPA-${num}`,
            descripcion: `[Agente Pilar · IA] ${r.nombre}`,
            causaRaiz: r.descripcion || `Riesgo de categoría ${r.categoria} detectado automáticamente — nivel ${nivel} (Probabilidad ${r.probabilidad} × Impacto ${r.impacto}). Generado por IA a partir de la auditoría de ${segmentoLabel} — requiere revisión humana.`,
            accionCorrectiva: `Tratamiento sugerido por IA: ${r.tratamiento}. Documentar y validar las acciones concretas para mitigar este riesgo.`,
            responsable: '',
            area: r.categoria,
            fechaLimite: limite.toISOString().slice(0, 10),
            origen: 'riesgo',
            evidencia: '',
            estado: 'abierta',
            refRiesgoId: riesgoRef.id,
            fechaCreacion: serverTimestamp(),
            fechaActualizacion: null,
            fechaInicio: null,
            fechaCierre: null,
          });
          capasCreadadas++;
          await updateDoc(riesgoRef, { capaId: capaRef.id });
        }
      } catch (err) {
        console.error('[AgentePilar] Error creando riesgo/CAPA:', err);
        errores.push(`No se pudo crear el riesgo "${r.nombre}".`);
      }
    }

    await marcar({
      agenteStatus: 'completado',
      agenteProcessedAt: new Date().toISOString(),
      agenteResumen: {
        riesgosCreados, capasCreadadas, ncsProcessadas: ncsAnalizadas.length,
        errores: errores.length ? errores : null,
      } as AgenteResumen,
    });
  } catch (err) {
    console.error('[AgentePilar] Error general:', err);
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    await marcar({
      agenteStatus: 'error',
      agenteProcessedAt: new Date().toISOString(),
      agenteResumen: {
        riesgosCreados: 0, capasCreadadas: 0, ncsProcessadas: ncsAnalizadas.length,
        errores: [msg],
      } as AgenteResumen,
    });
  }
}
