'use client';

/**
 * web/app/dashboard/prem-prom/page.tsx
 * Módulo PREM/PROM — Medidas de Experiencia y Desenlaces reportados por el paciente.
 *
 * VACÍO LEGAL: ni la Res. 1732/2026 (habilitación) ni el Sistema Único de
 * Acreditación de ICONTEC exigen explícitamente este instrumento — es buena
 * práctica de calidad que refuerza los ejes de "Seguridad del Paciente" y
 * "Humanización de la Atención" de la acreditación voluntaria, no un
 * requisito de habilitación. Las preguntas son un cuestionario propio de
 * NormaLis (ver web/lib/premPromTypes.ts), no un instrumento validado
 * internacionalmente — ajústalo según tu programa de calidad.
 */

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { usePremProm } from '@/lib/usePremProm';
import {
  PREM_PROM_PREGUNTAS, promedioPregunta, indiceGlobal,
} from '@/lib/premPromTypes';
import { SEGMENT_META } from '@/data/auditData';
import {
  SectionHeader, LoadingSpinner, Toast, useToast,
  KpiCard, EmptyState, ConfirmModal,
} from '@/components/ui';

function Estrellas({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-gray-300 text-sm">Sin datos</span>;
  const color = valor >= 4 ? 'text-emerald-600' : valor >= 3 ? 'text-amber-600' : 'text-red-600';
  return <span className={`font-bold ${color}`}>{valor.toFixed(1)} / 5</span>;
}

export default function PremPromPage() {
  const { user, nombre } = useAuth();
  const { items, loading, eliminar } = usePremProm(user?.uid ?? null);
  const { toast, show } = useToast();
  const [borrarId, setBorrarId] = useState<string | null>(null);

  const handleCopiarEnlace = useCallback(async () => {
    if (!user) return;
    const url = `${window.location.origin}/prem-prom/${user.uid}?ips=${encodeURIComponent(nombre || '')}`;
    try {
      await navigator.clipboard.writeText(url);
      show('Enlace público copiado — compártelo con tus pacientes al final de la atención.', 'success');
    } catch {
      show(url, 'info');
    }
  }, [user, nombre, show]);

  const handleBorrar = useCallback(async () => {
    if (!borrarId) return;
    try {
      await eliminar(borrarId);
      show('Respuesta eliminada.', 'success');
    } catch {
      show('No se pudo eliminar.', 'error');
    } finally {
      setBorrarId(null);
    }
  }, [borrarId, eliminar, show]);

  const global = useMemo(() => indiceGlobal(items), [items]);
  const promResultado = useMemo(() => promedioPregunta(items, 'resultado'), [items]);
  const promRecomendaria = useMemo(() => promedioPregunta(items, 'recomendaria'), [items]);

  const porServicio = useMemo(() => {
    const map: Record<string, typeof items> = {};
    for (const it of items) (map[it.servicioId] ??= []).push(it);
    return Object.entries(map)
      .map(([servicioId, its]) => ({
        servicioId,
        label: SEGMENT_META[servicioId]?.label ?? servicioId,
        n: its.length,
        promedio: indiceGlobal(its),
      }))
      .sort((a, b) => (b.promedio ?? 0) - (a.promedio ?? 0));
  }, [items]);

  const comentarios = useMemo(
    () => items.filter(i => i.comentario && i.comentario.trim()).slice(0, 20),
    [items],
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <SectionHeader
        title="PREM/PROM — Experiencia del Paciente"
        subtitle="Encuesta anónima propia de NormaLis — buena práctica de calidad, no exigida por la Res. 1732/2026."
        actions={
          <button
            onClick={handleCopiarEnlace}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            🔗 Copiar enlace para pacientes
          </button>
        }
      />

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
        <p className="text-xs text-amber-800">
          <strong>Vacío legal:</strong> este cuestionario (6 preguntas) es un diseño propio de NormaLis,
          no un instrumento validado internacionalmente (tipo EQ-5D o HCAHPS). Úsalo como punto de
          partida y ajústalo a tu programa de calidad — no lo presentes como un instrumento certificado.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="💬"
          title="Aún no hay respuestas"
          description="Copia el enlace público y compártelo con tus pacientes al final de cada atención (QR impreso, WhatsApp, recibo)."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KpiCard label="Respuestas" value={items.length} icon="📋" />
            <KpiCard
              label="Índice global"
              value={global !== null ? global.toFixed(1) : '—'}
              sub="Promedio 1–5, todas las preguntas"
              colorClass={global !== null && global >= 4 ? 'text-emerald-700' : global !== null && global >= 3 ? 'text-amber-700' : 'text-red-700'}
              icon="⭐"
            />
            <KpiCard
              label="Mejoró tras la atención (PROM)"
              value={promResultado !== null ? promResultado.toFixed(1) : '—'}
              sub="Desenlace percibido, 1–5"
              icon="💊"
            />
            <KpiCard
              label="Recomendaría la IPS"
              value={promRecomendaria !== null ? promRecomendaria.toFixed(1) : '—'}
              sub="Promedio 1–5"
              icon="👍"
            />
          </div>

          {/* Por pregunta */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Promedio por pregunta</p>
            <div className="space-y-2">
              {PREM_PROM_PREGUNTAS.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-gray-600">{p.texto}</span>
                  <Estrellas valor={promedioPregunta(items, p.id)} />
                </div>
              ))}
            </div>
          </div>

          {/* Por servicio */}
          {porServicio.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Promedio por servicio</p>
              <div className="space-y-2">
                {porServicio.map(s => (
                  <div key={s.servicioId} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-gray-600">{s.label} <span className="text-gray-400">({s.n})</span></span>
                    <Estrellas valor={s.promedio} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comentarios */}
          {comentarios.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Comentarios recientes</p>
              <ul className="space-y-3">
                {comentarios.map(c => (
                  <li key={c.id} className="border-l-2 border-gray-200 pl-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-700">{c.comentario}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {SEGMENT_META[c.servicioId]?.label ?? c.servicioId} · {c.fecha}
                      </p>
                    </div>
                    <button
                      onClick={() => setBorrarId(c.id)}
                      className="text-gray-300 hover:text-red-500 text-xs shrink-0"
                      title="Eliminar respuesta"
                    >
                      🗑️
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {borrarId && (
        <ConfirmModal
          title="¿Eliminar esta respuesta?"
          description="Esta acción no se puede deshacer."
          confirmVariant="danger"
          onConfirm={handleBorrar}
          onCancel={() => setBorrarId(null)}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
