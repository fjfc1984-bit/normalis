'use client';

/**
 * web/app/dashboard/consentimientos/page.tsx
 * Módulo Consentimientos Informados
 * Base legal: Ley 23/1981 Art. 15 · Res. 13437/1991 · Res. 1732/2026 Est. 6
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import {
  useConsentimientos,
  ESPECIALIDADES_CON,
  ESTADO_LABEL,
  ESTADO_COLOR,
} from '@/lib/useConsentimientos';
import type { NuevoConsentimiento, EstadoCon, ConsentimientoItem } from '@/lib/useConsentimientos';
import {
  SectionHeader, LoadingSpinner, Toast, useToast,
  KpiCard, EmptyState, ConfirmModal, StatusBadge,
} from '@/components/ui';

// ── CSS ───────────────────────────────────────────────────────────────────────

const INPUT = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white';
const LABEL = 'block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1';
const BTN_P = 'px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors';
const BTN_S = 'px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors';

// ── Modal: nuevo consentimiento ───────────────────────────────────────────────

function NuevoConModal({
  onSave, onClose, saving,
}: {
  onSave:  (c: NuevoConsentimiento) => Promise<void>;
  onClose: () => void;
  saving:  boolean;
}) {
  const [especialidad,   setEspecialidad]   = useState(Object.keys(ESPECIALIDADES_CON)[0]);
  const [procedimiento,  setProcedimiento]  = useState('');
  const [paciente,       setPaciente]       = useState('');
  const [cedula,         setCedula]         = useState('');
  const [medico,         setMedico]         = useState('');
  const [fecha,          setFecha]          = useState(new Date().toISOString().slice(0, 10));

  const procedimientos = ESPECIALIDADES_CON[especialidad] ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!procedimiento || !paciente.trim() || !medico.trim()) return;
    await onSave({ procedimiento, especialidad, paciente: paciente.trim(), cedula: cedula.trim(), medico: medico.trim(), fecha });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-800">Nuevo Consentimiento Informado</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Especialidad + Procedimiento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Especialidad *</label>
              <select
                className={INPUT}
                value={especialidad}
                onChange={e => { setEspecialidad(e.target.value); setProcedimiento(''); }}
              >
                {Object.keys(ESPECIALIDADES_CON).map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Procedimiento *</label>
              <select
                className={INPUT}
                value={procedimiento}
                onChange={e => setProcedimiento(e.target.value)}
                required
              >
                <option value="">— Selecciona —</option>
                {procedimientos.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Paciente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Nombre del paciente *</label>
              <input
                className={INPUT}
                value={paciente}
                onChange={e => setPaciente(e.target.value)}
                placeholder="Nombre completo"
                required
              />
            </div>
            <div>
              <label className={LABEL}>Cédula del paciente</label>
              <input
                className={INPUT}
                value={cedula}
                onChange={e => setCedula(e.target.value)}
                placeholder="1234567890"
              />
            </div>
          </div>

          {/* Médico + Fecha */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Médico / Profesional *</label>
              <input
                className={INPUT}
                value={medico}
                onChange={e => setMedico(e.target.value)}
                placeholder="Dr. Juan Pérez"
                required
              />
            </div>
            <div>
              <label className={LABEL}>Fecha</label>
              <input
                className={INPUT}
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
              />
            </div>
          </div>

          {/* Texto del consentimiento */}
          {procedimiento && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600 leading-relaxed">
              <p className="font-bold text-gray-700 mb-2">Vista previa del consentimiento</p>
              <p>
                Yo, <strong>{paciente || '[Paciente]'}</strong>, identificado/a con cédula{' '}
                <strong>{cedula || '[cédula]'}</strong>, declaro que he sido informado/a por el/la
                profesional <strong>{medico || '[Médico]'}</strong> sobre el procedimiento:{' '}
                <strong>{procedimiento}</strong>.
              </p>
              <p className="mt-2">
                He comprendido los beneficios, riesgos y alternativas del procedimiento. Autorizo
                su realización y declaro que puedo retirar este consentimiento en cualquier momento.
              </p>
              <p className="mt-2 text-gray-400">
                Base legal: Ley 23/1981 Art. 15 · Res. 13437/1991 Derechos del Paciente ·
                Res. 1732/2026 Est. 6 Historia Clínica
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className={BTN_S}>Cancelar</button>
            <button type="submit" disabled={saving || !procedimiento} className={BTN_P}>
              {saving ? 'Guardando…' : 'Crear consentimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: detalle / firma ────────────────────────────────────────────────────

function DetalleModal({
  item,
  onFirmar,
  onClose,
}: {
  item:     ConsentimientoItem;
  onFirmar: (quien: 'paciente' | 'medico') => Promise<void>;
  onClose:  () => void;
}) {
  const [saving, setSaving] = useState<'paciente' | 'medico' | null>(null);

  async function firmar(quien: 'paciente' | 'medico') {
    setSaving(quien);
    try { await onFirmar(quien); }
    finally { setSaving(null); }
  }

  const yaFirmoPaciente = item.estado === 'firmado_paciente' || item.estado === 'completo';
  const yaFirmoMedico   = item.estado === 'firmado_medico'   || item.estado === 'completo';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-base font-bold text-gray-800">Consentimiento Informado</h3>
            <p className="text-xs text-gray-500 mt-0.5">{item.procedimiento} — {item.especialidad}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">Paciente</p>
              <p className="font-semibold text-gray-800">{item.paciente}</p>
              {item.cedula && <p className="text-xs text-gray-400">C.C. {item.cedula}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-500">Médico / Profesional</p>
              <p className="font-semibold text-gray-800">{item.medico}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Fecha</p>
              <p className="font-semibold text-gray-800">{item.fecha}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Estado</p>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ESTADO_COLOR[item.estado]}`}>
                {ESTADO_LABEL[item.estado]}
              </span>
            </div>
          </div>

          {/* Texto consentimiento */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600 leading-relaxed">
            <p>
              Yo, <strong>{item.paciente}</strong>
              {item.cedula && <>, identificado/a con cédula <strong>{item.cedula}</strong></>},
              declaro que he sido informado/a por el/la profesional <strong>{item.medico}</strong>{' '}
              sobre el procedimiento: <strong>{item.procedimiento}</strong>.
            </p>
            <p className="mt-2">
              He comprendido los beneficios, riesgos y alternativas del procedimiento. Autorizo
              su realización y declaro que puedo retirar este consentimiento en cualquier momento.
            </p>
            <p className="mt-2 text-gray-400">
              Ley 23/1981 Art. 15 · Res. 13437/1991 · Res. 1732/2026 Est. 6 Historia Clínica
            </p>
          </div>

          {/* Firmas */}
          {item.estado !== 'completo' && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                Registrar firmas
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => firmar('paciente')}
                  disabled={!!saving || yaFirmoPaciente}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors
                    ${yaFirmoPaciente
                      ? 'bg-green-100 text-green-700 cursor-default'
                      : 'bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100'}`}
                >
                  {saving === 'paciente' ? 'Firmando…'
                    : yaFirmoPaciente ? '✅ Paciente firmó'
                    : '✍️ Firma del paciente'}
                </button>
                <button
                  onClick={() => firmar('medico')}
                  disabled={!!saving || yaFirmoMedico}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors
                    ${yaFirmoMedico
                      ? 'bg-green-100 text-green-700 cursor-default'
                      : 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100'}`}
                >
                  {saving === 'medico' ? 'Firmando…'
                    : yaFirmoMedico ? '✅ Médico firmó'
                    : '✍️ Firma del médico'}
                </button>
              </div>
            </div>
          )}

          {item.estado === 'completo' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 font-semibold text-center">
              ✅ Consentimiento completo — Listo para archivar en historia clínica
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex justify-end">
          <button onClick={onClose} className={BTN_S}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ConsentimientosPage() {
  const { user } = useAuth();
  const { items, loading, error, agregar, firmar, eliminar } = useConsentimientos(user?.uid ?? null);
  const { toast, show } = useToast();

  const [showNuevo,  setShowNuevo]  = useState(false);
  const [detalle,    setDetalle]    = useState<ConsentimientoItem | null>(null);
  const [confirmDel, setConfirmDel] = useState<ConsentimientoItem | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [filtroEst,  setFiltroEst]  = useState<EstadoCon | 'todos'>('todos');

  const completos  = items.filter(i => i.estado === 'completo');
  const pendientes = items.filter(i => i.estado !== 'completo');

  const mostrar = filtroEst === 'todos' ? items
    : items.filter(i => i.estado === filtroEst);

  const handleNuevo = useCallback(async (data: NuevoConsentimiento) => {
    setSaving(true);
    try {
      await agregar(data);
      show('Consentimiento creado', 'success');
    } catch {
      show('Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }, [agregar, show]);

  const handleFirma = useCallback(async (quien: 'paciente' | 'medico') => {
    if (!detalle) return;
    await firmar(detalle.id, quien);
    // Actualizar detalle local
    setDetalle(prev => {
      if (!prev) return prev;
      let next: EstadoCon = prev.estado;
      if (prev.estado === 'pendiente') next = quien === 'paciente' ? 'firmado_paciente' : 'firmado_medico';
      else if ((prev.estado === 'firmado_paciente' && quien === 'medico') ||
               (prev.estado === 'firmado_medico'   && quien === 'paciente')) next = 'completo';
      return { ...prev, estado: next };
    });
    show('Firma registrada', 'success');
  }, [detalle, firmar, show]);

  const handleEliminar = useCallback(async () => {
    if (!confirmDel) return;
    await eliminar(confirmDel.id);
    setConfirmDel(null);
    show('Consentimiento eliminado', 'info');
  }, [confirmDel, eliminar, show]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <SectionHeader
        title="Consentimientos Informados"
        subtitle="Ley 23/1981 Art. 15 · Res. 13437/1991 · Res. 1732/2026 Est. 6"
        actions={
          <button onClick={() => setShowNuevo(true)} className={BTN_P}>
            + Nuevo consentimiento
          </button>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          Error: {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total"      value={items.length}     icon="📋" />
        <KpiCard label="Completos"  value={completos.length} icon="✅" />
        <KpiCard label="Pendientes" value={pendientes.length} icon="⏳" borderColorClass={pendientes.length > 0 ? "border-amber-400" : "border-gray-200"} colorClass={pendientes.length > 0 ? "text-amber-600" : "text-gray-800"} />
        <KpiCard
          label="Completitud"
          value={items.length > 0 ? `${Math.round((completos.length / items.length) * 100)}%` : '—'}
          icon="📊"
        />
      </div>

      {/* Filtros de estado */}
      <div className="flex flex-wrap gap-2">
        {(['todos', 'pendiente', 'firmado_paciente', 'firmado_medico', 'completo'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltroEst(f)}
            className={`px-4 py-1.5 text-xs rounded-full font-medium transition-colors
              ${filtroEst === f
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {f === 'todos' ? 'Todos' : ESTADO_LABEL[f as EstadoCon]}
          </button>
        ))}
      </div>

      {/* Lista */}
      {mostrar.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Sin consentimientos registrados"
          description="Crea el primero para cumplir con la Ley 23/1981 y la Res. 1732/2026."
          action={
            <button onClick={() => setShowNuevo(true)} className={BTN_P}>
              + Primer consentimiento
            </button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wide">
            <div className="col-span-3">Paciente</div>
            <div className="col-span-3">Procedimiento</div>
            <div className="col-span-2">Médico</div>
            <div className="col-span-1">Fecha</div>
            <div className="col-span-2">Estado</div>
            <div className="col-span-1 text-right">Acción</div>
          </div>

          {mostrar.map(item => (
            <div
              key={item.id}
              className="grid grid-cols-12 gap-2 px-5 py-4 border-b border-gray-100 hover:bg-gray-50 items-center"
            >
              <div className="col-span-3">
                <p className="text-sm font-semibold text-gray-800">{item.paciente}</p>
                {item.cedula && <p className="text-xs text-gray-400">C.C. {item.cedula}</p>}
              </div>

              <div className="col-span-3">
                <p className="text-sm text-gray-700">{item.procedimiento}</p>
                <p className="text-xs text-gray-400">{item.especialidad}</p>
              </div>

              <div className="col-span-2 text-sm text-gray-600">{item.medico}</div>

              <div className="col-span-1 text-xs text-gray-500">{item.fecha}</div>

              <div className="col-span-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ESTADO_COLOR[item.estado]}`}>
                  {ESTADO_LABEL[item.estado]}
                </span>
              </div>

              <div className="col-span-1 flex items-center justify-end gap-2">
                <button
                  onClick={() => setDetalle(item)}
                  className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                >
                  {item.estado === 'completo' ? 'Ver' : 'Firmar'}
                </button>
                <button
                  onClick={() => setConfirmDel(item)}
                  className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                  title="Eliminar"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Nota legal */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
        <p className="font-bold mb-1">ℹ️ Base legal</p>
        <p>
          Todo procedimiento requiere consentimiento informado previo (Ley 23/1981 Art. 15).
          Para historia clínica, conservar por mínimo 15 años (Res. 1995/1999).
          El paciente puede retirarlo en cualquier momento (Res. 13437/1991).
        </p>
      </div>

      {/* Modales */}
      {showNuevo && (
        <NuevoConModal
          onSave={handleNuevo}
          onClose={() => setShowNuevo(false)}
          saving={saving}
        />
      )}

      {detalle && (
        <DetalleModal
          item={detalle}
          onFirmar={handleFirma}
          onClose={() => setDetalle(null)}
        />
      )}

      {confirmDel && (
        <ConfirmModal
          title="Eliminar consentimiento"
          description={`¿Eliminar el consentimiento de ${confirmDel.paciente}?`}
          onConfirm={handleEliminar}
          onCancel={() => setConfirmDel(null)}
          confirmVariant="danger"
        />
      )}

      {toast && <Toast toast={toast} />}
    </div>
  );
}
