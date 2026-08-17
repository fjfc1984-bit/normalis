'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { SEGMENT_META, areasDB } from '@/data/auditData';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, addDoc, doc, getDoc, getDocs,
  query, where, serverTimestamp,
} from 'firebase/firestore';

// ── Tipos ────────────────────────────────────────────────────────────────────
interface AuditStatus {
  completedAt: string | null;
  score:       number;
  nonConformities: { qKey: string; areaName: string; question: string; answer: string }[];
}
type StatusMap  = Record<string, AuditStatus>;
type CapaSegMap = Record<string, number>;   // segmento → cantidad de CAPAs

const SEGMENTOS = Object.keys(areasDB);

// ── Componente principal ─────────────────────────────────────────────────────
export default function AuditoriaPage() {
  const [statusMap,  setStatusMap]  = useState<StatusMap>({});
  const [capaSegMap, setCapaSegMap] = useState<CapaSegMap>({});
  const [syncing,    setSyncing]    = useState(false);
  const [syncDone,   setSyncDone]   = useState(false);

  const cargarYSincronizar = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setSyncing(true);

    try {
      // 1. NIT del usuario
      const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
      const nit = (userSnap.data()?.nit as string) ?? '';

      // 2. Leer todas las auditorías (por ID conocido — sin composite index)
      const auditSnaps = await Promise.allSettled(
        SEGMENTOS.map(seg => getDoc(doc(db, 'auditorias', `${user.uid}_${seg}`)))
      );

      const newStatus: StatusMap = {};
      const completedSegs: string[] = [];

      auditSnaps.forEach((r, i) => {
        const seg = SEGMENTOS[i];
        if (r.status === 'fulfilled' && r.value.exists()) {
          const d = r.value.data()!;
          newStatus[seg] = {
            completedAt:     d.completedAt     ?? null,
            score:           d.score           ?? 0,
            nonConformities: d.nonConformities ?? [],
          };
          if (d.completedAt) completedSegs.push(seg);
        }
      });
      setStatusMap(newStatus);

      if (completedSegs.length === 0) return;

      // 3. Cargar TODAS las CAPAs del usuario en una sola query (evita composite index)
      const capasSnap = await getDocs(
        query(collection(db, 'capas'), where('uid', '==', user.uid))
      );

      // Agrupar por refSegmento (client-side)
      const capasPorSeg: Record<string, number> = {};
      capasSnap.forEach(d => {
        const seg = d.data().refSegmento as string | undefined;
        if (seg) capasPorSeg[seg] = (capasPorSeg[seg] ?? 0) + 1;
      });

      // Número inicial para nuevas CAPAs
      let nextNum = capasSnap.size + 1;

      // 4. Crear CAPAs para segmentos completados sin CAPAs aún
      const newCapaMap: CapaSegMap = {};

      for (const seg of completedSegs) {
        const ncs = newStatus[seg]?.nonConformities ?? [];
        if (!ncs.length) continue;

        // ¿Ya tiene CAPAs para este segmento?
        if (capasPorSeg[seg]) {
          newCapaMap[seg] = capasPorSeg[seg];
          continue;
        }

        // Agrupar no-conformidades por área
        const porArea = ncs.reduce<Record<string, typeof ncs>>((acc, nc) => {
          if (!acc[nc.areaName]) acc[nc.areaName] = [];
          acc[nc.areaName].push(nc);
          return acc;
        }, {});

        const meta = SEGMENT_META[seg];
        let creadas = 0;

        for (const [areaName, items] of Object.entries(porArea)) {
          const preguntas = items.map(i => `• ${i.question}`).join('\n');
          try {
            await addDoc(collection(db, 'capas'), {
              uid:              user.uid,
              nit,
              numero:           `CAPA-${String(nextNum).padStart(3, '0')}`,
              descripcion:      `[Auditoría ${meta?.label ?? seg}] No conformidades en ${areaName}`,
              causaRaiz:        `${items.length} criterio(s) no cumplido(s):\n${preguntas}`,
              accionCorrectiva: 'Revisar y documentar cumplimiento de cada criterio. Capacitar al personal responsable.',
              responsable:      '',
              area:             areaName,
              fechaLimite:      (() => {
                                  const d = new Date();
                                  d.setMonth(d.getMonth() + 3);
                                  return d.toISOString().slice(0, 10);
                                })(),
              origen:           'auditoria',
              evidencia:        '',
              estado:           'abierta',
              refSegmento:      seg,
              fechaCreacion:    serverTimestamp(),
              fechaActualizacion: null,
              fechaInicio:      null,
              fechaCierre:      null,
            });
            nextNum++;
            creadas++;
          } catch (e) {
            console.error(`[AutoCAPAs] Error creando CAPA para ${seg}/${areaName}:`, e);
          }
        }

        if (creadas > 0) newCapaMap[seg] = creadas;
      }

      setCapaSegMap(newCapaMap);
    } catch (e) {
      console.error('[AuditoriaPage] Error sincronizando:', e);
    } finally {
      setSyncing(false);
      setSyncDone(true);
    }
  }, []);

  // Esperar a que Firebase Auth inicialice antes de cargar datos
  useEffect(() => {
    // Si ya hay usuario, ejecutar de inmediato
    if (auth.currentUser) {
      void cargarYSincronizar();
      return;
    }
    // Si no, esperar a onAuthStateChanged (primera carga / F5)
    const unsub = onAuthStateChanged(auth, user => {
      if (user) {
        unsub();
        void cargarYSincronizar();
      }
    });
    return unsub;
  }, [cargarYSincronizar]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Auditoría de habilitación</h2>
          <p className="text-sm text-gray-500 mt-1">
            Resolución 1732/2026 — verificación de condiciones de habilitación por tipo de servicio
          </p>
        </div>
        {syncing && (
          <span className="text-xs text-teal-600 animate-pulse flex items-center gap-1.5 mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-ping" />
            Sincronizando CAPAs…
          </span>
        )}
        {syncDone && !syncing && Object.keys(capaSegMap).length > 0 && (
          <span className="text-xs text-emerald-600 flex items-center gap-1.5 mt-1">
            ✅ CAPAs sincronizadas
          </span>
        )}
      </div>

      {/* Grid de servicios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SEGMENTOS.map(seg => {
          const meta     = SEGMENT_META[seg];
          const areas    = areasDB[seg];
          const totalQ   = areas.reduce((acc, a) => acc + a.q.length, 0);
          const st       = statusMap[seg];
          const capas    = capaSegMap[seg] ?? 0;
          const completada = !!st?.completedAt;

          return (
            <Link
              key={seg}
              href={`/dashboard/auditoria/${seg}`}
              className="group bg-white rounded-xl border p-5 hover:border-teal-500
                         hover:shadow-md transition-all duration-200 flex flex-col gap-3"
              style={{ borderColor: completada ? '#99f6e4' : '#e5e7eb' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{meta?.icon ?? '📋'}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm leading-tight">
                      {meta?.label ?? seg}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {areas.length} área{areas.length !== 1 ? 's' : ''} · {totalQ} criterios
                    </p>
                  </div>
                </div>
                {completada ? (
                  <span className="text-sm font-bold px-2.5 py-1 rounded-xl"
                    style={{
                      background: st!.score >= 75 ? '#d1fae5' : st!.score >= 60 ? '#fef3c7' : '#fee2e2',
                      color:      st!.score >= 75 ? '#065f46' : st!.score >= 60 ? '#92400e' : '#991b1b',
                    }}>
                    {st!.score}%
                  </span>
                ) : (
                  <span className="text-gray-300 group-hover:text-teal-500 text-lg transition-colors">›</span>
                )}
              </div>

              <p className="text-xs text-gray-400 line-clamp-1">{meta?.norm}</p>

              {completada ? (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50
                                   border border-emerald-200 rounded-full px-2 py-0.5">
                    ✓ Completada
                  </span>
                  {capas > 0 && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200
                                     rounded-full px-2 py-0.5">
                      📋 {capas} CAPA{capas !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {areas.slice(0, 3).map(area => (
                    <span key={area.id}
                      className="text-[10px] bg-gray-50 border border-gray-100 text-gray-500
                                 rounded px-2 py-0.5 truncate max-w-[120px]">
                      {area.icon} {area.name}
                    </span>
                  ))}
                  {areas.length > 3 && (
                    <span className="text-[10px] text-gray-400 px-1 py-0.5">
                      +{areas.length - 3} más
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-gray-400 text-center">
        Criterios basados en Res. 1732/2026 (reemplaza Res. 3100/2019 y todas sus modificaciones)
      </p>
    </div>
  );
}
