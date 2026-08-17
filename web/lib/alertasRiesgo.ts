// web/lib/alertasRiesgo.ts
// Motor de alertas tempranas para la Matriz de Riesgos (ISO 31000)
//
// Cruza los riesgos registrados con señales reales de otros módulos de
// NormaLis (vencimientos próximos, incidentes recientes) y con la propia
// higiene de la matriz (revisiones vencidas, riesgos críticos sin plan de
// acción) para anticipar problemas antes de que escalen, en vez de esperar
// a que alguien abra el módulo y note el problema por su cuenta.
//
// Mismo principio que el motor de migración 1732 (web/lib/migracion1732.ts):
// solo se alerta con evidencia real y trazable de la propia IPS. Nunca se
// inventa una alerta sin datos de respaldo verificables en la plataforma.

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

export type Severidad = 'alta' | 'media';

export interface Alerta {
  id:        string;
  severidad: Severidad;
  titulo:    string;
  detalle:   string;
  accion?:   { label: string; href: string };
}

export interface RiesgoParaAlerta {
  id:            string;
  nombre:        string;
  categoria:     string;
  nivel:         'bajo' | 'medio' | 'alto' | 'extremo';
  fechaRevision: string;
  capaId?:       string | null;
}

const DIA_MS = 86_400_000;

function parseLocalDate(fechaISO: string): Date | null {
  if (!fechaISO) return null;
  const [y, m, d] = fechaISO.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function diasDesde(fechaISO: string): number | null {
  const fecha = parseLocalDate(fechaISO);
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((hoy.getTime() - fecha.getTime()) / DIA_MS);
}

function diasHasta(fechaISO: string): number | null {
  const dias = diasDesde(fechaISO);
  return dias === null ? null : -dias;
}

/**
 * Analiza los riesgos de la IPS y los cruza contra vencimientos e incidentes
 * reales registrados en NormaLis. Devuelve alertas trazables, priorizadas
 * por severidad (alta primero). Nunca escribe nada en Firestore.
 */
export async function calcularAlertasRiesgo(
  uid: string,
  riesgos: RiesgoParaAlerta[],
): Promise<Alerta[]> {
  const alertas: Alerta[] = [];

  // ── 1. Revisiones vencidas ────────────────────────────────────────────
  // Los riesgos críticos deben revisarse al menos cada 90 días; el resto,
  // cada 180 — umbrales típicos de un programa ISO 31000 activo.
  for (const r of riesgos) {
    const dias = diasDesde(r.fechaRevision);
    if (dias === null) continue;
    const critico = r.nivel === 'alto' || r.nivel === 'extremo';
    const umbral = critico ? 90 : 180;
    if (dias > umbral) {
      alertas.push({
        id: `revision_${r.id}`,
        severidad: critico ? 'alta' : 'media',
        titulo: `Revisión vencida — ${r.nombre}`,
        detalle: `Este riesgo (${r.categoria}, nivel ${r.nivel}) no se revisa hace ${dias} días. Actualiza su probabilidad/impacto o confirma que sigue vigente.`,
      });
    }
  }

  // ── 2. Riesgos alto/extremo sin CAPA asociada ──────────────────────────
  for (const r of riesgos) {
    if ((r.nivel === 'alto' || r.nivel === 'extremo') && !r.capaId) {
      alertas.push({
        id: `sin_capa_${r.id}`,
        severidad: 'alta',
        titulo: `Riesgo crítico sin plan de acción — ${r.nombre}`,
        detalle: `Nivel ${r.nivel} sin una CAPA (plan de acción correctivo/preventivo) vinculada. Créala desde este riesgo para documentar el tratamiento definido.`,
      });
    }
  }

  // ── 3. Vencimientos urgentes sin riesgo normativo que los cubra ────────
  try {
    const vSnap = await getDocs(query(collection(db, 'vencimientos'), where('uid', '==', uid)));
    const urgentes = vSnap.docs
      .map(d => d.data() as { nombre?: string; fecha?: string })
      .filter(v => {
        const dias = diasHasta(v.fecha ?? '');
        return dias !== null && dias <= 30;
      });
    const hayRiesgoNormativoCritico = riesgos.some(
      r => r.categoria === 'Normativo' && (r.nivel === 'alto' || r.nivel === 'extremo'),
    );
    if (urgentes.length > 0 && !hayRiesgoNormativoCritico) {
      const nombres = urgentes.slice(0, 3).map(v => v.nombre || 'sin nombre').join(', ');
      alertas.push({
        id: 'vencimientos_sin_riesgo',
        severidad: 'media',
        titulo: `${urgentes.length} vencimiento(s) a 30 días o menos sin riesgo normativo registrado`,
        detalle: `Tienes vencimientos próximos o vencidos (${nombres}${urgentes.length > 3 ? '…' : ''}) en el módulo de Vencimientos, y ningún riesgo de categoría "Normativo" está en nivel alto o extremo en tu matriz. Considera registrar o escalar el riesgo correspondiente.`,
        accion: { label: 'Ver Vencimientos', href: '/dashboard/vencimientos' },
      });
    }
  } catch (err) {
    console.error('[AlertasRiesgo] Error leyendo vencimientos:', err);
  }

  // ── 4. Incidentes críticos recientes sin riesgo asistencial que los cubra
  try {
    const iSnap = await getDocs(collection(db, 'usuarios', uid, 'incidentes'));
    const hace30 = Date.now() - 30 * DIA_MS;
    const criticosRecientes = iSnap.docs
      .map(d => d.data() as { severidad?: string; creadoEn?: number })
      .filter(i => i.severidad === 'critico' && typeof i.creadoEn === 'number' && i.creadoEn >= hace30);
    const hayRiesgoAsistencialCritico = riesgos.some(
      r => r.categoria === 'Asistencial' && (r.nivel === 'alto' || r.nivel === 'extremo'),
    );
    if (criticosRecientes.length > 0 && !hayRiesgoAsistencialCritico) {
      alertas.push({
        id: 'incidentes_sin_riesgo',
        severidad: 'alta',
        titulo: `${criticosRecientes.length} incidente(s) crítico(s) reciente(s) sin riesgo asistencial registrado`,
        detalle: `En los últimos 30 días registraste ${criticosRecientes.length} incidente(s) crítico(s) en Seguridad del Paciente, pero no tienes ningún riesgo de categoría "Asistencial" en nivel alto o extremo. Tu matriz de riesgo puede no estar reflejando tu realidad operativa actual.`,
        accion: { label: 'Ver Incidentes', href: '/dashboard/incidentes' },
      });
    }
  } catch (err) {
    console.error('[AlertasRiesgo] Error leyendo incidentes:', err);
  }

  alertas.sort((a, b) => (a.severidad === b.severidad ? 0 : a.severidad === 'alta' ? -1 : 1));
  return alertas;
}
