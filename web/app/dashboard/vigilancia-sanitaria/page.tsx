'use client';

/**
 * web/app/dashboard/vigilancia-sanitaria/page.tsx
 * Vigilancia Sanitaria — farmacovigilancia, tecnovigilancia y reactivovigilancia.
 * Base legal: Res. 1732/2026 (Tomo II — Estándar de Medicamentos, Dispositivos
 * Médicos, Insumos y Otras Tecnologías en Salud, Numeral 6).
 *
 * NOTA REGULATORIA: cada programa tiene su propia norma y plazo de reporte a
 * INVIMA para eventos SERIOS, contados desde la fecha de conocimiento:
 *   - Farmacovigilancia: 72 horas (Circular 48/2020 MSPS, num. 2.4.2).
 *   - Tecnovigilancia: 72 horas (Res. 4816/2008, Art. 15-16).
 *   - Reactivovigilancia: 5 días calendario (Res. 2020007532/2020 — plazo
 *     confirmado por fuente secundaria, no se verificó contra el texto
 *     completo de la resolución; confirmar con INVIMA o tu Secretaría de
 *     Salud territorial).
 * Para eventos NO serios, la norma exige consolidación periódica (mensual en
 * farmacovigilancia, trimestral en tecnovigilancia) en vez de un plazo
 * individual por evento — este módulo no calcula una fecha límite para esos
 * casos, solo para eventos serios.
 */

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useVigilanciaSanitaria } from '@/lib/useVigilanciaSanitaria';
import type { EventoVigilancia, EventoVigilanciaFormData, TipoVigilancia, Severidad, EstadoReporte } from '@/lib/vigilanciaTypes';
import {
  TIPO_VIGILANCIA_CFG, SEVERIDAD_LABEL, ESTADO_REPORTE_LABEL, EVENTO_VIGILANCIA_EMPTY_FORM,
} from '@/lib/vigilanciaTypes';
import {
  SectionHeader, LoadingSpinner, Toast, useToast,
  KpiCard, StatusBadge,
} from '@/components/ui';

const BTN_P = 'px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50';
const BTN_S = 'px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors disabled:opacity-50';
const INPUT = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white';
const LABEL = 'block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Modal: nuevo evento / editar evento ────────────────────────────────────
function EventoFormModal({
  evento, onSave, onClose,
}: {
  evento?: EventoVigilancia;
  onSave: (data: EventoVigilanciaFormData) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<EventoVigilanciaFormData>(
    evento
      ? {
          tipoVigilancia: evento.tipoVigilancia, productoNombre: evento.productoNombre,
          descripcionEvento: evento.descripcionEvento, fechaOcurrencia: evento.fechaOcurrencia,
          fechaConocimiento: evento.fechaConocimiento, severidad: evento.severidad,
          pacienteAfectado: evento.pacienteAfectado, accionesTomadas: evento.accionesTomadas,
          responsableReporte: evento.responsableReporte, estadoReporte: evento.estadoReporte,
          fechaReporteInvima: evento.fechaReporteInvima || '', radicadoInvima: evento.radicadoInvima,
        }
      : { ...EVENTO_VIGILANCIA_EMPTY_FORM, fechaConocimiento: new Date().toISOString().slice(0, 10) }
  );
  const [saving, setSaving] = useState(false);
  const esEdicion = !!evento;
  const cfg = TIPO_VIGILANCIA_CFG[form.tipoVigilancia];
  // Los "hechos" del evento (qué pasó, cuándo, qué tan serio) quedan
  // bloqueados una vez creado el registro — es un registro de auditoría
  // regulatoria y reescribirlos borraría la evidencia de un plazo
  // incumplido. Solo se puede avanzar el seguimiento del caso. Esto está
  // reforzado también en las reglas de Firestore, no es solo de interfaz.
  const INPUT_LOCKED = `${INPUT} bg-gray-100 text-gray-500 cursor-not-allowed`;

  function set<K extends keyof EventoVigilanciaFormData>(k: K, v: EventoVigilanciaFormData[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!form.productoNombre.trim() || !form.descripcionEvento.trim() || !form.fechaConocimiento) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 sticky top-0">
          <p className="text-sm font-bold text-gray-800">
            {esEdicion ? `✏️ Editar evento — ${evento!.productoNombre}` : '⚠️ Nuevo evento de vigilancia'}
          </p>
        </div>
        <form onSubmit={handle} className="px-6 py-5 space-y-4">
          {esEdicion && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-500">
              🔒 Los datos del evento (tipo, producto, fechas, descripción, severidad) quedan fijos una vez
              registrado — es evidencia de auditoría. Aquí solo se actualiza el seguimiento del caso.
            </div>
          )}

          <div>
            <label className={LABEL}>Tipo de vigilancia *</label>
            <select className={esEdicion ? INPUT_LOCKED : INPUT} value={form.tipoVigilancia} disabled={esEdicion}
                    onChange={e => set('tipoVigilancia', e.target.value as TipoVigilancia)}>
              {Object.entries(TIPO_VIGILANCIA_CFG).map(([k, c]) => (
                <option key={k} value={k}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={LABEL}>Producto involucrado *</label>
              <input className={esEdicion ? INPUT_LOCKED : INPUT} value={form.productoNombre} disabled={esEdicion}
                     onChange={e => set('productoNombre', e.target.value)}
                     placeholder={form.tipoVigilancia === 'farmacovigilancia' ? 'Nombre del medicamento' : form.tipoVigilancia === 'reactivovigilancia' ? 'Nombre del reactivo' : 'Nombre del dispositivo médico'}
                     required />
            </div>
            <div>
              <label className={LABEL}>Fecha de ocurrencia</label>
              <input type="date" className={esEdicion ? INPUT_LOCKED : INPUT} value={form.fechaOcurrencia} disabled={esEdicion}
                     onChange={e => set('fechaOcurrencia', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Fecha de conocimiento *</label>
              <input type="date" className={esEdicion ? INPUT_LOCKED : INPUT} value={form.fechaConocimiento} disabled={esEdicion}
                     onChange={e => set('fechaConocimiento', e.target.value)} required />
            </div>
          </div>

          <div>
            <label className={LABEL}>Descripción del evento *</label>
            <textarea rows={3} className={esEdicion ? INPUT_LOCKED : INPUT} value={form.descripcionEvento} disabled={esEdicion}
                       onChange={e => set('descripcionEvento', e.target.value)}
                       placeholder="Qué ocurrió, cómo se detectó…" required />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <div>
              <label className={LABEL}>Severidad *</label>
              <select className={esEdicion ? INPUT_LOCKED : INPUT} value={form.severidad} disabled={esEdicion}
                      onChange={e => set('severidad', e.target.value as Severidad)}>
                {Object.entries(SEVERIDAD_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className={`flex items-center gap-2 text-sm ${esEdicion ? 'text-gray-400' : 'text-gray-700'}`}>
                <input type="checkbox" checked={form.pacienteAfectado} disabled={esEdicion}
                       onChange={e => set('pacienteAfectado', e.target.checked)} />
                Hubo paciente afectado
              </label>
            </div>
          </div>

          {form.severidad === 'serio' ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
              Evento serio — {cfg.norma} exige reportarlo a INVIMA dentro de {cfg.plazoSerioDias === 3 ? '72 horas' : `${cfg.plazoSerioDias} días calendario`} desde la fecha de conocimiento.
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              Evento no serio — {cfg.norma}: {cfg.plazoNoSerio}.
            </div>
          )}

          <div>
            <label className={LABEL}>Acciones tomadas</label>
            <textarea rows={2} className={INPUT} value={form.accionesTomadas} onChange={e => set('accionesTomadas', e.target.value)}
                       placeholder="Medidas correctivas/preventivas inmediatas…" />
          </div>

          <div>
            <label className={LABEL}>Responsable del caso</label>
            <input className={INPUT} value={form.responsableReporte} onChange={e => set('responsableReporte', e.target.value)}
                   placeholder="Referente de vigilancia que gestiona el caso" />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <div>
              <label className={LABEL}>Estado del reporte</label>
              <select className={INPUT} value={form.estadoReporte} onChange={e => set('estadoReporte', e.target.value as EstadoReporte)}>
                {Object.entries(ESTADO_REPORTE_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            {form.estadoReporte === 'reportado' && (
              <div>
                <label className={LABEL}>Fecha reporte a INVIMA</label>
                <input type="date" className={INPUT} value={form.fechaReporteInvima} onChange={e => set('fechaReporteInvima', e.target.value)} />
              </div>
            )}
            {form.estadoReporte === 'reportado' && (
              <div className="col-span-2">
                <label className={LABEL}>Radicado INVIMA</label>
                <input className={INPUT} value={form.radicadoInvima} onChange={e => set('radicadoInvima', e.target.value)}
                       placeholder="Número de confirmación/radicado" />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className={BTN_S}>Cancelar</button>
            <button type="submit" disabled={saving} className={BTN_P}>
              {saving ? 'Guardando…' : (esEdicion ? 'Guardar cambios' : 'Registrar evento')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tarjeta de evento ───────────────────────────────────────────────────────
function EventoCard({ evento, onEditar }: { evento: EventoVigilancia; onEditar: (e: EventoVigilancia) => void }) {
  const cfg = TIPO_VIGILANCIA_CFG[evento.tipoVigilancia];
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <span className="text-3xl">{cfg.icon}</span>
          <div>
            <p className="text-sm font-bold text-gray-800">{evento.productoNombre}</p>
            <p className="text-xs text-gray-500">{cfg.label} · {cfg.norma}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <StatusBadge
                label={SEVERIDAD_LABEL[evento.severidad]}
                bg={evento.severidad === 'serio' ? 'bg-red-100' : 'bg-amber-100'}
                color={evento.severidad === 'serio' ? 'text-red-700' : 'text-amber-700'}
              />
              <StatusBadge
                label={ESTADO_REPORTE_LABEL[evento.estadoReporte]}
                bg={evento.estadoReporte === 'reportado' ? 'bg-emerald-100' : 'bg-gray-100'}
                color={evento.estadoReporte === 'reportado' ? 'text-emerald-700' : 'text-gray-600'}
              />
              {evento._reporteVencido && (
                <StatusBadge label="Plazo de reporte vencido" bg="bg-red-100" color="text-red-700" dot dotColor="bg-red-500" />
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onEditar(evento)} className={BTN_S}>✏️ Editar</button>
        </div>
      </div>
      <p className="mt-3 text-sm text-gray-600">{evento.descripcionEvento}</p>
      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-400">
        <span>Conocido: {fmtDate(evento.fechaConocimiento)}</span>
        {evento.severidad === 'serio' && <span>Límite reporte: {fmtDate(evento._fechaLimiteReporte)}</span>}
        {evento.estadoReporte === 'reportado' && <span>Reportado: {fmtDate(evento.fechaReporteInvima)} {evento.radicadoInvima && `· Radicado ${evento.radicadoInvima}`}</span>}
        {evento.responsableReporte && <span>👤 {evento.responsableReporte}</span>}
      </div>
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────────────────
export default function VigilanciaSanitariaPage() {
  const { user, nit } = useAuth();
  const uid = user?.uid ?? null;
  const {
    eventos, loading, stats, crearEvento, actualizarEvento,
  } = useVigilanciaSanitaria(uid, nit || null);
  const { toast, show } = useToast();

  const [showNuevo, setShowNuevo] = useState(false);
  const [editando, setEditando] = useState<EventoVigilancia | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<TipoVigilancia | 'todos'>('todos');

  async function handleCrear(data: EventoVigilanciaFormData) {
    if (!uid) return;
    await crearEvento(data, uid, nit || '');
    show('⚠️ Evento registrado', 'success');
    setShowNuevo(false);
  }

  async function handleActualizar(data: EventoVigilanciaFormData) {
    if (!editando) return;
    await actualizarEvento(editando.id, data);
    show('✏️ Evento actualizado', 'success');
    setEditando(null);
  }

  if (loading) return <LoadingSpinner />;

  const eventosFiltrados = filtroTipo === 'todos' ? eventos : eventos.filter(e => e.tipoVigilancia === filtroTipo);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <SectionHeader
        title="Vigilancia Sanitaria"
        subtitle="Farmacovigilancia, tecnovigilancia y reactivovigilancia — Res. 1732/2026, Estándar de Medicamentos y Dispositivos Médicos"
        actions={
          <button onClick={() => setShowNuevo(true)} className={BTN_P}>
            + Nuevo evento
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Eventos totales"     value={stats.total}            icon="📋" />
        <KpiCard label="Serios pendientes"   value={stats.seriosPendientes} icon="⚠️" colorClass={stats.seriosPendientes > 0 ? 'text-red-600' : 'text-gray-800'} />
        <KpiCard label="Plazo vencido"       value={stats.vencidos}         icon="⏰" colorClass={stats.vencidos > 0 ? 'text-red-600' : 'text-gray-800'} borderColorClass={stats.vencidos > 0 ? 'border-red-300' : 'border-gray-200'} />
        <KpiCard label="Reportados a INVIMA" value={stats.reportados}       icon="✅" colorClass="text-emerald-700" />
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFiltroTipo('todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filtroTipo === 'todos' ? 'bg-teal-600 text-white' : 'bg-white border border-gray-300 text-gray-600'}`}>
          Todos
        </button>
        {Object.entries(TIPO_VIGILANCIA_CFG).map(([k, cfg]) => (
          <button key={k} onClick={() => setFiltroTipo(k as TipoVigilancia)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filtroTipo === k ? 'bg-teal-600 text-white' : 'bg-white border border-gray-300 text-gray-600'}`}>
            {cfg.icon} {cfg.label}
          </button>
        ))}
      </div>

      {eventosFiltrados.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <p className="text-sm text-gray-500">
            {eventos.length === 0 ? 'Aún no has registrado eventos de vigilancia.' : 'No hay eventos para este filtro.'}
          </p>
          {eventos.length === 0 && (
            <button onClick={() => setShowNuevo(true)} className={`${BTN_P} mt-4`}>+ Registrar el primero</button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {eventosFiltrados.map(evento => (
            <EventoCard key={evento.id} evento={evento} onEditar={setEditando} />
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 space-y-1">
        <p className="font-bold mb-1">ℹ️ Qué exige el Estándar de Medicamentos y Dispositivos Médicos (Numeral 6)</p>
        <p>
          Programa documentado de farmacovigilancia, tecnovigilancia y reactivovigilancia, con reporte de
          eventos e incidentes adversos a INVIMA dentro de los plazos de cada norma. Eventos serios: 72 horas
          en farmacovigilancia y tecnovigilancia, 5 días calendario en reactivovigilancia (plazo de
          reactivovigilancia verificado por fuente secundaria — confirma con INVIMA o tu Secretaría de Salud
          territorial). Eventos no serios: se consolidan en reportes periódicos (mensual/trimestral) en vez de
          un plazo individual por evento.
        </p>
      </div>

      {showNuevo && (
        <EventoFormModal onSave={handleCrear} onClose={() => setShowNuevo(false)} />
      )}

      {editando && (
        <EventoFormModal evento={editando} onSave={handleActualizar} onClose={() => setEditando(null)} />
      )}

      <Toast toast={toast} />
    </div>
  );
}
