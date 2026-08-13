'use client';

/**
 * web/app/dashboard/talento/page.tsx
 * Módulo Talento Humano — gestión de profesionales de la IPS
 * Base legal: Res. 3100/2019 Estándar 1 — Talento Humano
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useTalento } from '@/lib/useTalento';
import { CARGOS, DOC_TIPOS, cargoBadge } from '@/lib/talentoCargos';
import type { NuevoProfesional, Profesional, DocumentoProf } from '@/lib/useTalento';
import type { CargoProfesional, DocTipoProfesional } from '@/lib/talentoCargos';
import {
  SectionHeader, LoadingSpinner, Toast, useToast,
  KpiCard, EmptyState, ConfirmModal,
} from '@/components/ui';

// ── Helpers ───────────────────────────────────────────────────────────────────

const VENCE_PRONTO_DAYS = 30;

function diasParaVencer(fecha: string): number | null {
  if (!fecha) return null;
  const diff = (new Date(fecha).getTime() - Date.now()) / 86_400_000;
  return Math.ceil(diff);
}

function docEstado(vence: string): 'ok' | 'pronto' | 'vencido' | 'sin-fecha' {
  if (!vence) return 'sin-fecha';
  const d = diasParaVencer(vence)!;
  if (d < 0) return 'vencido';
  if (d <= VENCE_PRONTO_DAYS) return 'pronto';
  return 'ok';
}

const DOC_BADGE: Record<ReturnType<typeof docEstado>, string> = {
  'ok':       'bg-green-100 text-green-800',
  'pronto':   'bg-amber-100 text-amber-800',
  'vencido':  'bg-red-100 text-red-800',
  'sin-fecha':'bg-gray-100 text-gray-500',
};

// ── CSS reutilizados ──────────────────────────────────────────────────────────

const INPUT  = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white';
const LABEL  = 'block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1';
const BTN_P  = 'px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors';
const BTN_S  = 'px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors';
const BTN_D  = 'px-3 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors';

// ── Modal: nuevo profesional ───────────────────────────────────────────────────

function NuevoProfModal({
  onSave, onClose, saving,
}: {
  onSave:  (p: NuevoProfesional) => Promise<void>;
  onClose: () => void;
  saving:  boolean;
}) {
  const [form, setForm] = useState<NuevoProfesional>({
    nombre: '', cargo: 'Médico General', cedula: '',
    telefono: '', email: '', fechaIngreso: '',
  });

  const set = (k: keyof NuevoProfesional, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.cedula.trim()) return;
    await onSave(form);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-800">Nuevo Profesional</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={LABEL}>Nombre completo *</label>
              <input className={INPUT} value={form.nombre}
                onChange={e => set('nombre', e.target.value)}
                placeholder="Ej: Dra. María García" required />
            </div>

            <div>
              <label className={LABEL}>Cargo *</label>
              <select className={INPUT} value={form.cargo}
                onChange={e => set('cargo', e.target.value as CargoProfesional)}>
                {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className={LABEL}>Cédula *</label>
              <input className={INPUT} value={form.cedula}
                onChange={e => set('cedula', e.target.value)}
                placeholder="1234567890" required />
            </div>

            <div>
              <label className={LABEL}>Teléfono</label>
              <input className={INPUT} value={form.telefono}
                onChange={e => set('telefono', e.target.value)}
                placeholder="300 000 0000" />
            </div>

            <div>
              <label className={LABEL}>Email</label>
              <input className={INPUT} type="email" value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="correo@ips.com" />
            </div>

            <div>
              <label className={LABEL}>Fecha de ingreso</label>
              <input className={INPUT} type="date" value={form.fechaIngreso}
                onChange={e => set('fechaIngreso', e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className={BTN_S}>Cancelar</button>
            <button type="submit" disabled={saving} className={BTN_P}>
              {saving ? 'Guardando…' : 'Agregar profesional'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: documentos del profesional ────────────────────────────────────────

function DocsModal({
  prof, onSave, onClose,
}: {
  prof:    Profesional;
  onSave:  (docs: DocumentoProf[]) => Promise<void>;
  onClose: () => void;
}) {
  const [docs, setDocs] = useState<DocumentoProf[]>(prof.documentos ?? []);
  const [saving, setSaving] = useState(false);

  function addDoc() {
    setDocs(prev => [...prev, {
      tipo: 'Título Profesional', nombre: '', vence: '', cargado: false,
    }]);
  }

  function removeDoc(i: number) {
    setDocs(prev => prev.filter((_, idx) => idx !== i));
  }

  function setDocField<K extends keyof DocumentoProf>(i: number, k: K, v: DocumentoProf[K]) {
    setDocs(prev => prev.map((d, idx) => idx === i ? { ...d, [k]: v } : d));
  }

  async function handleSave() {
    setSaving(true);
    try { await onSave(docs); onClose(); }
    finally { setSaving(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-base font-bold text-gray-800">Documentos — {prof.nombre}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{prof.cargo}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {docs.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">
              Sin documentos registrados. Agrega el primero.
            </p>
          )}
          {docs.map((d, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-3">
              <div className="col-span-4">
                <select
                  className={INPUT}
                  value={d.tipo}
                  onChange={e => setDocField(i, 'tipo', e.target.value as DocTipoProfesional)}
                >
                  {DOC_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-span-3">
                <input className={INPUT} placeholder="Descripción" value={d.nombre}
                  onChange={e => setDocField(i, 'nombre', e.target.value)} />
              </div>
              <div className="col-span-3">
                <input className={INPUT} type="date" value={d.vence}
                  onChange={e => setDocField(i, 'vence', e.target.value)}
                  title="Fecha de vencimiento (opcional)" />
              </div>
              <div className="col-span-1 flex items-center justify-center">
                <input type="checkbox" checked={d.cargado}
                  onChange={e => setDocField(i, 'cargado', e.target.checked)}
                  className="w-4 h-4 accent-teal-600"
                  title="¿Copia cargada?" />
              </div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => removeDoc(i)}
                  className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button onClick={addDoc}
            className="text-sm text-teal-600 hover:text-teal-800 font-medium">
            + Agregar documento
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className={BTN_S}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} className={BTN_P}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function TalentoPage() {
  const { user } = useAuth();
  const { items, loading, error, agregar, actualizar, eliminar } = useTalento(user?.uid ?? null);
  const { toast, show } = useToast();

  const [showNuevo,  setShowNuevo]  = useState(false);
  const [docsModal,  setDocsModal]  = useState<Profesional | null>(null);
  const [confirmDel, setConfirmDel] = useState<Profesional | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [filtro,     setFiltro]     = useState<'todos' | 'activo' | 'inactivo'>('todos');

  const activos   = items.filter(p => p.estado === 'activo');
  const inactivos = items.filter(p => p.estado === 'inactivo');

  // Documentos vencidos o próximos a vencer
  const alertas = items.flatMap(p =>
    (p.documentos ?? [])
      .filter(d => docEstado(d.vence) === 'vencido' || docEstado(d.vence) === 'pronto')
      .map(d => ({ prof: p.nombre, doc: d.tipo, vence: d.vence, estado: docEstado(d.vence) }))
  );

  const mostrar = filtro === 'todos' ? items
    : filtro === 'activo' ? activos : inactivos;

  const handleNuevo = useCallback(async (data: NuevoProfesional) => {
    setSaving(true);
    try {
      await agregar(data);
      show('Profesional registrado correctamente', 'success');
    } catch {
      show('Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }, [agregar, show]);

  const handleDocs = useCallback(async (docs: DocumentoProf[]) => {
    if (!docsModal) return;
    await actualizar(docsModal.id, { documentos: docs });
    show('Documentos actualizados', 'success');
  }, [docsModal, actualizar, show]);

  const handleEliminar = useCallback(async () => {
    if (!confirmDel) return;
    await eliminar(confirmDel.id);
    setConfirmDel(null);
    show('Profesional eliminado', 'info');
  }, [confirmDel, eliminar, show]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <SectionHeader
        title="Talento Humano"
        subtitle="Gestión de profesionales · Res. 3100/2019 Estándar 1"
        actions={
          <button onClick={() => setShowNuevo(true)} className={BTN_P}>
            + Nuevo profesional
          </button>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          Error cargando datos: {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total profesionales" value={items.length} icon="👥" />
        <KpiCard label="Activos"              value={activos.length}   icon="✅" />
        <KpiCard label="Inactivos"            value={inactivos.length} icon="⏸️" />
        <KpiCard
          label="Alertas documentales"
          value={alertas.length}
          icon={alertas.length > 0 ? '⚠️' : '✅'}
          borderColorClass={alertas.length > 0 ? "border-amber-400" : "border-gray-200"} colorClass={alertas.length > 0 ? "text-amber-600" : "text-gray-800"}
        />
      </div>

      {/* Alertas documentales */}
      {alertas.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-bold text-amber-800 mb-2">
            ⚠️ Documentos vencidos o próximos a vencer
          </p>
          <div className="space-y-1">
            {alertas.map((a, i) => {
              const dias = diasParaVencer(a.vence);
              return (
                <div key={i} className="text-xs text-amber-700 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${DOC_BADGE[a.estado]}`}>
                    {a.estado === 'vencido' ? 'VENCIDO' : `${dias}d`}
                  </span>
                  <span><strong>{a.prof}</strong> — {a.doc}
                    {a.vence && ` (${a.vence})`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtro */}
      <div className="flex gap-2">
        {(['todos', 'activo', 'inactivo'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-1.5 text-sm rounded-full font-medium transition-colors capitalize
              ${filtro === f
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {f === 'todos' ? 'Todos' : f === 'activo' ? 'Activos' : 'Inactivos'}
          </button>
        ))}
      </div>

      {/* Lista */}
      {mostrar.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Sin profesionales registrados"
          description="Agrega el equipo de tu IPS para cumplir con el Estándar 1 de Talento Humano."
          action={
            <button onClick={() => setShowNuevo(true)} className={BTN_P}>
              + Primer profesional
            </button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wide">
            <div className="col-span-4">Nombre</div>
            <div className="col-span-2">Cargo</div>
            <div className="col-span-2">Cédula</div>
            <div className="col-span-2">Documentos</div>
            <div className="col-span-2 text-right">Acciones</div>
          </div>

          {mostrar.map(prof => {
            const docAlertas = (prof.documentos ?? []).filter(
              d => docEstado(d.vence) === 'vencido' || docEstado(d.vence) === 'pronto'
            ).length;

            return (
              <div
                key={prof.id}
                className="grid grid-cols-12 gap-2 px-5 py-4 border-b border-gray-100 hover:bg-gray-50 items-center"
              >
                <div className="col-span-4">
                  <p className="text-sm font-semibold text-gray-800">{prof.nombre}</p>
                  {prof.email && <p className="text-xs text-gray-400">{prof.email}</p>}
                </div>

                <div className="col-span-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cargoBadge(prof.cargo)}`}>
                    {prof.cargo.split('/')[0].trim()}
                  </span>
                </div>

                <div className="col-span-2 text-sm text-gray-600">{prof.cedula}</div>

                <div className="col-span-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-600">{(prof.documentos ?? []).length}</span>
                    {docAlertas > 0 && (
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">
                        {docAlertas}⚠️
                      </span>
                    )}
                  </div>
                </div>

                <div className="col-span-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setDocsModal(prof)}
                    className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                  >
                    Documentos
                  </button>
                  <button
                    onClick={() => actualizar(prof.id, {
                      estado: prof.estado === 'activo' ? 'inactivo' : 'activo',
                    })}
                    className="text-xs text-gray-500 hover:text-gray-700"
                    title={prof.estado === 'activo' ? 'Desactivar' : 'Activar'}
                  >
                    {prof.estado === 'activo' ? '⏸' : '▶'}
                  </button>
                  <button onClick={() => setConfirmDel(prof)} className={BTN_D}>
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modales */}
      {showNuevo && (
        <NuevoProfModal
          onSave={handleNuevo}
          onClose={() => setShowNuevo(false)}
          saving={saving}
        />
      )}

      {docsModal && (
        <DocsModal
          prof={docsModal}
          onSave={handleDocs}
          onClose={() => setDocsModal(null)}
        />
      )}

      {confirmDel && (
        <ConfirmModal
          title="Eliminar profesional"
          description={`¿Eliminar a ${confirmDel.nombre} del registro? Esta acción no se puede deshacer.`}
          onConfirm={handleEliminar}
          onCancel={() => setConfirmDel(null)}
          confirmVariant="danger"
        />
      )}

      {toast && <Toast toast={toast} />}
    </div>
  );
}
