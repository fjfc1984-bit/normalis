'use client';

/**
 * web/app/dashboard/capas/[id]/page.tsx
 * Ver / Editar una CAPA existente.
 * - Si estado === 'cerrada': muestra solo lectura
 * - Si estado !== 'cerrada': permite editar campos
 */

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db as fbDb } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useCapas } from '@/lib/useCapas';
import CapaForm from '../CapaForm';
import type { Capa, CapaFormData } from '@/lib/capaTypes';
import { CAPA_ESTADO_CFG, CAPA_ORIGEN_LABELS } from '@/lib/capaTypes';

// Helpers
function fmtDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}
function fmtTimestamp(ts: { seconds: number } | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts.seconds * 1000).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── Vista de solo lectura (CAPA cerrada) ─────────────
function CapaReadOnly({ capa }: { capa: Capa }) {
  const cfg = CAPA_ESTADO_CFG[capa.estado] ?? CAPA_ESTADO_CFG.abierta;
  const origenLabel = CAPA_ORIGEN_LABELS[capa.origen] ?? capa.origen;

  return (
    <div className="space-y-4">
      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-2">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
          {capa.numero}
        </span>
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold
                         ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>
        {capa.origen && (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            {origenLabel}
          </span>
        )}
        {!!capa.reincidencias && (
          <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
            ⚠ {capa.reincidencias} reincidencia{capa.reincidencias > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Campos */}
      {[
        { label: 'No Conformidad / Hallazgo', value: capa.descripcion },
        { label: 'Causa Raíz',                value: capa.causaRaiz },
        { label: 'Acción Correctiva',          value: capa.accionCorrectiva },
        { label: 'Responsable',               value: capa.responsable },
        { label: 'Área / Proceso',             value: capa.area },
      ].map(({ label, value }) => value ? (
        <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{value}</p>
        </div>
      ) : null)}

      {/* Fechas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Fecha Límite', value: fmtDate(capa.fechaLimite) },
          { label: 'Creada',       value: fmtTimestamp(capa.fechaCreacion as { seconds: number } | null) },
          { label: 'Iniciada',     value: fmtTimestamp(capa.fechaInicio   as { seconds: number } | null) },
          { label: 'Implementada', value: fmtTimestamp(capa.fechaImplementacion as { seconds: number } | null) },
          { label: 'Cerrada',      value: fmtTimestamp(capa.fechaCierre   as { seconds: number } | null) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-gray-700">{value}</p>
          </div>
        ))}
      </div>

      {/* Evidencia de implementación */}
      {capa.evidenciaImplementacion && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <p className="text-xs font-bold text-violet-700 uppercase tracking-wide mb-1">
            Evidencia de Implementación
          </p>
          <p className="text-sm text-violet-800 whitespace-pre-wrap">{capa.evidenciaImplementacion}</p>
        </div>
      )}

      {/* Verificación de eficacia (ciclo completo: no se cierra sin esto) */}
      {capa.veredictoVerificacion && (
        <div className={`rounded-xl p-4 border ${capa.veredictoVerificacion === 'eficaz'
          ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${capa.veredictoVerificacion === 'eficaz' ? 'text-emerald-700' : 'text-amber-700'}`}>
            Verificación de Eficacia ({capa.veredictoVerificacion === 'eficaz' ? '✅ Eficaz' : '🔁 Reincidencia'})
          </p>
          <p className={`text-sm whitespace-pre-wrap ${capa.veredictoVerificacion === 'eficaz' ? 'text-emerald-800' : 'text-amber-800'}`}>
            {capa.evidenciaVerificacion}
          </p>
        </div>
      )}

      {/* Historial completo de verificaciones (si hubo más de una, ej. reincidencias previas) */}
      {capa.historialVerificaciones && capa.historialVerificaciones.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Historial de Verificaciones
          </p>
          <ul className="space-y-2">
            {capa.historialVerificaciones.map((h, i) => (
              <li key={i} className="text-xs text-gray-600 border-l-2 border-gray-200 pl-3">
                <span className="font-semibold">
                  {new Date(h.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {' — '}
                  {h.veredicto === 'eficaz' ? '✅ Eficaz' : '🔁 Reincidencia'}:
                </span>{' '}
                {h.evidencia}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Evidencia legado (CAPAs cerradas antes del ciclo de verificación) */}
      {!capa.evidenciaImplementacion && !capa.veredictoVerificacion && capa.evidencia && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">
            Evidencia de Cierre
          </p>
          <p className="text-sm text-emerald-800 whitespace-pre-wrap">{capa.evidencia}</p>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
//  Página principal [id]
// ════════════════════════════════════════════════
export default function EditCapaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();
  const { user, nit } = useAuth();
  const { updateCapa } = useCapas(user?.uid ?? null, nit || null);

  const [capa,    setCapa]    = useState<Capa | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  // Cargar CAPA desde Firestore
  useEffect(() => {
    if (!id) return;
    getDoc(doc(fbDb, 'capas', id))
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data() as Omit<Capa, 'id' | '_vencida' | '_diasRestantes'>;
          const vencida = data.estado !== 'cerrada' && !!data.fechaLimite &&
                          new Date(data.fechaLimite) < new Date();
          setCapa({ id: snap.id, ...data, _vencida: vencida, _diasRestantes: null });
        } else {
          setError('CAPA no encontrada.');
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(data: CapaFormData) {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateCapa(id, data);
      setSuccess('CAPA actualizada correctamente.');
      // Refrescar datos locales
      const snap = await getDoc(doc(fbDb, 'capas', id));
      if (snap.exists()) {
        const d = snap.data() as Omit<Capa, 'id' | '_vencida' | '_diasRestantes'>;
        setCapa({ id: snap.id, ...d, _vencida: false, _diasRestantes: null });
      }
    } catch (e) {
      setError(`Error al guardar: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!capa) {
    return (
      <div className="p-6 text-center text-gray-500">
        {error || 'CAPA no encontrada.'}
      </div>
    );
  }

  const isReadOnly = capa.estado === 'cerrada';
  const cfg = CAPA_ESTADO_CFG[capa.estado] ?? CAPA_ESTADO_CFG.abierta;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Encabezado */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-gray-400">{capa.numero}</span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold
                             ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">
            {isReadOnly ? 'Ver CAPA' : 'Editar CAPA'}
          </h2>
        </div>
        <button
          onClick={() => router.push('/dashboard/capas')}
          className="text-sm text-gray-500 hover:text-gray-700 font-medium"
        >
          ← Volver
        </button>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          ✅ {success}
        </div>
      )}

      {/* Contenido */}
      {isReadOnly ? (
        <>
          <CapaReadOnly capa={capa} />
          <div className="mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => router.push('/dashboard/capas')}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700
                         rounded-xl text-sm font-semibold transition-colors"
            >
              ← Volver al listado
            </button>
          </div>
        </>
      ) : (
        <CapaForm
          initialData={{
            descripcion:      capa.descripcion      ?? '',
            causaRaiz:        capa.causaRaiz         ?? '',
            accionCorrectiva: capa.accionCorrectiva  ?? '',
            responsable:      capa.responsable       ?? '',
            area:             capa.area              ?? '',
            fechaLimite:      capa.fechaLimite       ?? '',
            origen:           capa.origen            ?? 'manual',
            evidencia:        capa.evidencia         ?? '',
          }}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/dashboard/capas')}
          saving={saving}
          submitLabel="Guardar cambios"
          showEvidencia
        />
      )}
    </div>
  );
}
