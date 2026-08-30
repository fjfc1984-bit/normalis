'use client';

import { useState, useEffect, useMemo } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import {
  AE_PHASES, AE_SERVICIOS, getAEFaseData, calcAEStats,
} from '@/lib/data/aeData';
import type { AEServicioId, AESeveridad } from '@/lib/data/aeData';

// ── Respuestas por servicio ──────────────────────────────────────────────────
type Respuesta   = 'cumple' | 'nc' | 'na';
type AnswersMap  = Record<string, Respuesta>;
type ServiciosMap = Partial<Record<AEServicioId, AnswersMap>>;

const SEV_CFG: Record<AESeveridad, { label: string; badge: string; dot: string }> = {
  critica:  { label: 'Crítica',  badge: 'bg-red-100 text-red-700',     dot: 'bg-red-500' },
  moderada: { label: 'Moderada', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  menor:    { label: 'Menor',    badge: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400' },
};

const RESPUESTA_BTNS: { value: Respuesta; label: string; emoji: string; on: string }[] = [
  { value: 'cumple', label: 'Cumple',    emoji: '✓', on: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'nc',     label: 'No cumple', emoji: '✗', on: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'na',     label: 'N/A',       emoji: '—', on: 'bg-gray-100 text-gray-500 border-gray-300' },
];

function SimulacroContent() {
  const { nit } = useAuth();
  const [servicios, setServicios] = useState<ServiciosMap>({});
  const [servicioId, setServicioId] = useState<AEServicioId>('general');
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [open, setOpen]         = useState<Record<string, boolean>>({ documentacion: true });

  useEffect(() => {
    if (!nit) return;
    getDoc(doc(db, 'simulacros', nit)).then(snap => {
      if (snap.exists()) setServicios((snap.data() as { servicios?: ServiciosMap }).servicios ?? {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [nit]);

  const answers = servicios[servicioId] ?? {};
  const faseData = useMemo(() => getAEFaseData(servicioId), [servicioId]);
  const stats = useMemo(() => calcAEStats(faseData, answers), [faseData, answers]);

  async function responder(key: string, valor: Respuesta) {
    if (!nit) return;
    const current = servicios[servicioId] ?? {};
    const updatedServicio = { ...current, [key]: current[key] === valor ? undefined : valor };
    // Quitar claves undefined (permite "des-responder" tocando la misma opción)
    Object.keys(updatedServicio).forEach(k => updatedServicio[k] === undefined && delete updatedServicio[k]);
    const updated = { ...servicios, [servicioId]: updatedServicio };
    setServicios(updated);
    setSaving(true);
    try {
      await setDoc(doc(db, 'simulacros', nit), { servicios: updated, nit, updatedAt: new Date().toISOString() }, { merge: true });
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (!nit) return;
    const updated = { ...servicios, [servicioId]: {} };
    setServicios(updated);
    setDoc(doc(db, 'simulacros', nit), { servicios: updated, nit, updatedAt: new Date().toISOString() }, { merge: true });
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando simulacro...</div>;

  const nivelColor =
    stats.resultado === 'CIERRE INMEDIATO'              ? 'text-red-600 bg-red-50 border-red-200' :
    stats.resultado === 'PLAN DE MEJORAMIENTO URGENTE'  ? 'text-orange-600 bg-orange-50 border-orange-200' :
    stats.resultado === 'HABILITADO CON OBSERVACIONES'  ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                                                            'text-amber-600 bg-amber-50 border-amber-200';

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Simulacro de Visita</h2>
          <p className="text-sm text-gray-500 mt-1">
            Lista de verificación pre-visita del Ente Habilitador · Res. 1732/2026 (reemplaza Res. 3100/2019)
          </p>
        </div>
        <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
          Reiniciar servicio
        </button>
      </div>

      {/* ── Selector de servicio ── */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(Object.entries(AE_SERVICIOS) as [AEServicioId, { label: string; icon: string }][]).map(([id, s]) => (
          <button
            key={id}
            onClick={() => setServicioId(id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
              ${servicioId === id
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
          >
            <span className="mr-1">{s.icon}</span>{s.label}
          </button>
        ))}
      </div>

      {/* ── Resumen ── */}
      <div className={`border rounded-xl px-5 py-4 mb-6 ${nivelColor}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold">{stats.resultado}</p>
            <p className="text-sm mt-0.5">{stats.cumple} de {stats.total} criterios evaluados en "Cumple"</p>
            {stats.criticas.length > 0 && (
              <p className="text-xs mt-1 font-semibold">⛔ {stats.criticas.length} hallazgo(s) crítico(s) sin resolver</p>
            )}
          </div>
          <div className="text-4xl font-black">{stats.score}%</div>
        </div>
        <div className="mt-3 bg-white/60 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${stats.score >= 80 ? 'bg-emerald-500' : stats.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${stats.score}%` }}
          />
        </div>
      </div>

      {/* ── Fases ── */}
      <div className="space-y-3">
        {AE_PHASES.map(phase => {
          const items = faseData[phase.id] ?? [];
          const respondidos = items.filter((_, i) => answers[`${phase.id}_${i}`]).length;
          const isOpen = open[phase.id] ?? false;

          return (
            <div key={phase.id} className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setOpen(o => ({ ...o, [phase.id]: !isOpen }))}
              >
                <span className="font-medium text-sm text-gray-800">
                  <span className="mr-2">{phase.icon}</span>{phase.label}
                </span>
                <span className="flex items-center gap-2 text-xs text-gray-500">
                  <span className={`font-semibold ${respondidos === items.length ? 'text-emerald-600' : 'text-gray-600'}`}>
                    {respondidos}/{items.length}
                  </span>
                  <span>{isOpen ? '▲' : '▼'}</span>
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {items.map((item, i) => {
                    const key = `${phase.id}_${i}`;
                    const current = answers[key];
                    const sevCfg = SEV_CFG[item.sev];
                    return (
                      <div key={key} className="px-4 py-3">
                        <div className="flex items-start gap-2 mb-2">
                          <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${sevCfg.dot}`} />
                          <div className="flex-1">
                            <p className="text-sm text-gray-700 leading-snug">{item.q}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sevCfg.badge}`}>
                                {sevCfg.label}
                              </span>
                              <span className="text-[10px] text-gray-400">{item.norm}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1.5 ml-3.5">
                          {RESPUESTA_BTNS.map(b => (
                            <button
                              key={b.value}
                              onClick={() => responder(key, b.value)}
                              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors
                                ${current === b.value ? b.on : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
                            >
                              {b.emoji} {b.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {saving && (
        <div className="fixed bottom-4 right-4 text-xs bg-primary-600 text-white px-3 py-1.5 rounded-full shadow">
          Guardando...
        </div>
      )}
    </div>
  );
}

export default function SimulacrosPage() {
  return (
    <AuthGuard>
      <SimulacroContent />
    </AuthGuard>
  );
}
