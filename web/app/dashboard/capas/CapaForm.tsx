'use client';

/**
 * web/app/dashboard/capas/CapaForm.tsx
 * Formulario reutilizable para crear y editar CAPAs.
 */

import { useState } from 'react';
import type { CapaFormData } from '@/lib/capaTypes';
import { CAPA_ORIGEN_LABELS } from '@/lib/capaTypes';

interface CapaFormProps {
  initialData: CapaFormData;
  onSubmit: (data: CapaFormData) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  submitLabel?: string;
  showEvidencia?: boolean;
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT_CLS = `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white`;
const TEXTAREA_CLS = `${INPUT_CLS} resize-none`;

export default function CapaForm({
  initialData,
  onSubmit,
  onCancel,
  saving,
  submitLabel = 'Guardar',
  showEvidencia = false,
}: CapaFormProps) {
  const [form, setForm] = useState<CapaFormData>(initialData);
  const [validationError, setValidationError] = useState('');

  const set = (field: keyof CapaFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError('');
    if (!form.descripcion.trim()) {
      setValidationError('La descripción de la no conformidad es obligatoria.');
      return;
    }
    await onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">

      {validationError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          ⚠️ {validationError}
        </div>
      )}

      {/* ── Sección 1: Hallazgo ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700 border-b border-gray-100 pb-2">
          1. Hallazgo / No conformidad
        </h3>

        <Field label="Descripción de la no conformidad" required>
          <textarea
            rows={3}
            value={form.descripcion}
            onChange={set('descripcion')}
            required
            maxLength={1000}
            placeholder="Describe la no conformidad o hallazgo identificado…"
            className={TEXTAREA_CLS}
          />
        </Field>

        <Field label="Causa raíz">
          <textarea
            rows={2}
            value={form.causaRaiz}
            onChange={set('causaRaiz')}
            maxLength={500}
            placeholder="¿Por qué ocurrió? Análisis de causa raíz…"
            className={TEXTAREA_CLS}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Origen / Fuente">
            <select value={form.origen} onChange={set('origen')} className={INPUT_CLS}>
              {Object.entries(CAPA_ORIGEN_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Área / Proceso">
            <input
              type="text"
              value={form.area}
              onChange={set('area')}
              maxLength={100}
              placeholder="Ej. Urgencias, Facturación, RRHH…"
              className={INPUT_CLS}
            />
          </Field>
        </div>
      </div>

      {/* ── Sección 2: Plan de acción ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700 border-b border-gray-100 pb-2">
          2. Plan de acción
        </h3>

        <Field label="Acción correctiva / preventiva">
          <textarea
            rows={3}
            value={form.accionCorrectiva}
            onChange={set('accionCorrectiva')}
            maxLength={1000}
            placeholder="Describe la acción a implementar para eliminar la causa raíz…"
            className={TEXTAREA_CLS}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Responsable">
            <input
              type="text"
              value={form.responsable}
              onChange={set('responsable')}
              maxLength={100}
              placeholder="Nombre del responsable de la acción"
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Fecha límite">
            <input
              type="date"
              value={form.fechaLimite}
              onChange={set('fechaLimite')}
              min={new Date().toISOString().split('T')[0]}
              className={INPUT_CLS}
            />
          </Field>
        </div>
      </div>

      {/* ── Sección 3: Seguimiento (solo en edición) ── */}
      {showEvidencia && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-700 border-b border-gray-100 pb-2">
            3. Seguimiento y evidencia
          </h3>
          <Field label="Evidencia de avance o cierre">
            <textarea
              rows={3}
              value={form.evidencia}
              onChange={set('evidencia')}
              maxLength={1000}
              placeholder="Describe la evidencia del avance o implementación de la acción…"
              className={TEXTAREA_CLS}
            />
          </Field>
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700
                     rounded-xl text-sm font-semibold transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                     text-white font-bold rounded-xl text-sm transition-colors
                     flex items-center justify-center gap-2"
        >
          {saving && (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {saving ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
