'use client';

/**
 * web/components/ServiciosModal.tsx
 * Selector de servicios/modalidades que la IPS presta — compartido entre
 * módulos que personalizan su contenido según el portafolio real de cada
 * IPS (hoy: Gestor Documental, Auditoría). Antes vivía duplicado dentro de
 * documentos-dms/page.tsx; se extrae aquí para reutilizarlo sin repetir la
 * misma UI dos veces.
 *
 * ServicioId = las mismas claves que SEGMENT_META (ver dmsServiciosCatalogo.ts)
 * — un servicio marcado aquí es directamente un segmento de auditoría, sin
 * necesidad de mapear entre dos catálogos distintos.
 */

import { useState } from 'react';
import { SERVICIOS_IPS, SERVICIO_IDS, type ServicioId } from '@/lib/dmsServiciosCatalogo';

const BTN_P = 'px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50';
const BTN_S = 'px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors';

export default function ServiciosModal({
  seleccionados, onSave, onClose,
}: { seleccionados: ServicioId[]; onSave: (s: ServicioId[]) => Promise<void>; onClose: () => void }) {
  const [sel, setSel] = useState<Set<ServicioId>>(new Set(seleccionados));
  const [saving, setSaving] = useState(false);

  function toggle(id: ServicioId) {
    setSel(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try { await onSave(Array.from(sel)); onClose(); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 sticky top-0">
          <p className="text-sm font-bold text-gray-800">⚙️ Servicios / modalidades que presta tu IPS</p>
          <p className="text-xs text-gray-500 mt-1">
            Compartido con todo tu equipo. Selecciona lo que ya tienes habilitado — el Gestor Documental
            suma los documentos específicos de cada servicio, y Auditoría prioriza tu checklist según esto.
          </p>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SERVICIO_IDS.map(id => (
            <label key={id} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={sel.has(id)} onChange={() => toggle(id)} className="rounded border-gray-300 text-teal-600 focus:ring-teal-400" />
              <span>{SERVICIOS_IPS[id].icon}</span>
              <span className="text-gray-700">{SERVICIOS_IPS[id].label}</span>
            </label>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className={BTN_S}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} className={BTN_P}>{saving ? 'Guardando…' : 'Guardar servicios'}</button>
        </div>
      </div>
    </div>
  );
}
