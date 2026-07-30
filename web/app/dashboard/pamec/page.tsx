'use client';

import { useState } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import { usePAMEC } from '@/lib/usePAMEC';
import { PAMEC_FASES, PROCESOS_SUGERIDOS, type PamecFase } from '@/lib/pamecTypes';

// ── Badge estado ────────────────────────────────────────────────────────────
function Badge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    pendiente:   'bg-gray-100 text-gray-600',
    en_curso:    'bg-amber-100 text-amber-700',
    cerrado:     'bg-green-100 text-green-700',
    completada:  'bg-green-100 text-green-700',
    alta:        'bg-red-100 text-red-700',
    media:       'bg-amber-100 text-amber-700',
    baja:        'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[estado] ?? 'bg-gray-100 text-gray-500'}`}>
      {estado}
    </span>
  );
}

// ── Indicador de fase ───────────────────────────────────────────────────────
function FaseStepper({ current, onChange }: { current: PamecFase; onChange: (f: PamecFase) => void }) {
  return (
    <div className="flex gap-2 flex-wrap mb-6">
      {PAMEC_FASES.map((f, i) => {
        const isCurrent = f.id === current;
        const idx = PAMEC_FASES.findIndex(x => x.id === current);
        const isDone = i < idx;
        return (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border
              ${isCurrent ? 'bg-primary-600 text-white border-primary-600' :
                isDone    ? 'bg-green-50 text-green-700 border-green-200' :
                            'bg-white text-gray-500 border-gray-200 hover:border-primary-300'}`}
          >
            <span className="text-base">{isDone ? '✓' : i + 1}</span>
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

function PAMECContent() {
  const { pamec, loading, saving, setFase, addItem, updateItem, deleteItem, addAccion, updateAccion } = usePAMEC();

  // Form estados
  const [showItemForm,   setShowItemForm]   = useState(false);
  const [showAccionForm, setShowAccionForm] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');

  const [newItem, setNewItem] = useState({ proceso: '', indicador: '', meta: '', resultado: '', brecha: '', prioridad: 'media' as const });
  const [newAccion, setNewAccion] = useState({ descripcion: '', responsable: '', fechaLimite: '', evidencia: '' });

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando PAMEC...</div>;

  const fase = pamec?.fase ?? 'autoeval';
  const items = pamec?.items ?? [];
  const acciones = pamec?.acciones ?? [];

  function submitItem() {
    if (!newItem.proceso || !newItem.indicador) return;
    addItem({ ...newItem });
    setNewItem({ proceso: '', indicador: '', meta: '', resultado: '', brecha: '', prioridad: 'media' });
    setShowItemForm(false);
  }

  function submitAccion() {
    if (!newAccion.descripcion || !selectedItemId) return;
    addAccion({ itemId: selectedItemId, ...newAccion });
    setNewAccion({ descripcion: '', responsable: '', fechaLimite: '', evidencia: '' });
    setShowAccionForm(false);
    setSelectedItemId('');
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">PAMEC</h2>
        <p className="text-sm text-gray-500 mt-1">
          Programa de Auditoría para el Mejoramiento de la Calidad · Res. 1446/2006 · Res. 256/2016
        </p>
      </div>

      <FaseStepper current={fase} onChange={setFase} />

      {/* ── Fase desc ── */}
      <div className="bg-primary-50 border border-primary-100 rounded-lg px-4 py-3 mb-6 text-sm text-primary-700">
        <strong>{PAMEC_FASES.find(f => f.id === fase)?.label}:</strong>{' '}
        {PAMEC_FASES.find(f => f.id === fase)?.desc}
      </div>

      {/* ── Fase 1 y 2: Items / procesos ── */}
      {(fase === 'autoeval' || fase === 'priorizacion') && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-700">
              {fase === 'autoeval' ? 'Procesos e indicadores' : 'Priorización de brechas'}
            </h3>
            <button
              onClick={() => setShowItemForm(true)}
              className="text-sm bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700"
            >
              + Agregar proceso
            </button>
          </div>

          {items.length === 0 && (
            <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-3xl mb-2">📊</p>
              <p className="text-sm">No hay procesos registrados todavía.</p>
              <p className="text-xs mt-1">Agrega los procesos que quieres mejorar.</p>
            </div>
          )}

          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-800">{item.proceso}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.indicador}</p>
                    {item.meta && <p className="text-xs text-gray-400 mt-0.5">Meta: {item.meta}</p>}
                    {item.resultado && <p className="text-xs text-amber-600 mt-0.5">Resultado: {item.resultado}</p>}
                    {item.brecha && <p className="text-xs text-red-500 mt-0.5">Brecha: {item.brecha}</p>}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {item.prioridad && <Badge estado={item.prioridad} />}
                    <Badge estado={item.estado} />
                  </div>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <select
                    value={item.estado}
                    onChange={e => updateItem(item.id, { estado: e.target.value as never })}
                    className="text-xs border border-gray-200 rounded px-2 py-1"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_curso">En curso</option>
                    <option value="cerrado">Cerrado</option>
                  </select>
                  {fase === 'priorizacion' && (
                    <select
                      value={item.prioridad ?? 'media'}
                      onChange={e => updateItem(item.id, { prioridad: e.target.value as never })}
                      className="text-xs border border-gray-200 rounded px-2 py-1"
                    >
                      <option value="alta">Prioridad alta</option>
                      <option value="media">Prioridad media</option>
                      <option value="baja">Prioridad baja</option>
                    </select>
                  )}
                  <button
                    onClick={() => { setSelectedItemId(item.id); setShowAccionForm(true); }}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    + Acción
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Fase 3 y 4: Acciones ── */}
      {(fase === 'plan' || fase === 'seguimiento') && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-700">
              {fase === 'plan' ? 'Acciones de mejora' : 'Seguimiento de acciones'}
            </h3>
            <button
              onClick={() => { setSelectedItemId(items[0]?.id ?? ''); setShowAccionForm(true); }}
              disabled={items.length === 0}
              className="text-sm bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 disabled:opacity-40"
            >
              + Nueva acción
            </button>
          </div>

          {acciones.length === 0 && (
            <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm">No hay acciones registradas.</p>
            </div>
          )}

          <div className="space-y-3">
            {acciones.map(accion => {
              const itemParent = items.find(i => i.id === accion.itemId);
              return (
                <div key={accion.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 mb-1">{itemParent?.proceso ?? '—'}</p>
                      <p className="text-sm font-medium text-gray-800">{accion.descripcion}</p>
                      {accion.responsable && <p className="text-xs text-gray-500 mt-1">Responsable: {accion.responsable}</p>}
                      {accion.fechaLimite && <p className="text-xs text-gray-500">Plazo: {accion.fechaLimite}</p>}
                      {accion.evidencia && <p className="text-xs text-green-600 mt-1">Evidencia: {accion.evidencia}</p>}
                    </div>
                    <Badge estado={accion.estado} />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <select
                      value={accion.estado}
                      onChange={e => updateAccion(accion.id, { estado: e.target.value as never })}
                      className="text-xs border border-gray-200 rounded px-2 py-1"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_curso">En curso</option>
                      <option value="completada">Completada</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {saving && <div className="fixed bottom-4 right-4 text-xs bg-primary-600 text-white px-3 py-1.5 rounded-full shadow">Guardando...</div>}

      {/* ── Modal nuevo proceso ── */}
      {showItemForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg">
            <h3 className="font-semibold text-gray-800 mb-4">Nuevo proceso</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Proceso *</label>
                <input
                  list="procesos-list"
                  value={newItem.proceso}
                  onChange={e => setNewItem(p => ({ ...p, proceso: e.target.value }))}
                  placeholder="ej: Atención de urgencias"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                <datalist id="procesos-list">
                  {PROCESOS_SUGERIDOS.map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Indicador *</label>
                <input
                  value={newItem.indicador}
                  onChange={e => setNewItem(p => ({ ...p, indicador: e.target.value }))}
                  placeholder="ej: Tasa de reingreso a urgencias en 72h"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Meta</label>
                  <input
                    value={newItem.meta}
                    onChange={e => setNewItem(p => ({ ...p, meta: e.target.value }))}
                    placeholder="ej: &lt; 5%"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Resultado actual</label>
                  <input
                    value={newItem.resultado}
                    onChange={e => setNewItem(p => ({ ...p, resultado: e.target.value }))}
                    placeholder="ej: 8%"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Análisis de brecha</label>
                <textarea
                  value={newItem.brecha}
                  onChange={e => setNewItem(p => ({ ...p, brecha: e.target.value }))}
                  rows={2}
                  placeholder="Describe la diferencia entre meta y resultado..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowItemForm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={submitItem} className="flex-1 bg-primary-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-700">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal nueva acción ── */}
      {showAccionForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg">
            <h3 className="font-semibold text-gray-800 mb-4">Nueva acción de mejora</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Proceso relacionado</label>
                <select
                  value={selectedItemId}
                  onChange={e => setSelectedItemId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  {items.map(i => <option key={i.id} value={i.id}>{i.proceso}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Descripción de la acción *</label>
                <textarea
                  value={newAccion.descripcion}
                  onChange={e => setNewAccion(p => ({ ...p, descripcion: e.target.value }))}
                  rows={2}
                  placeholder="Describe la acción de mejora..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Responsable</label>
                  <input
                    value={newAccion.responsable}
                    onChange={e => setNewAccion(p => ({ ...p, responsable: e.target.value }))}
                    placeholder="Nombre o cargo"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Fecha límite</label>
                  <input
                    type="date"
                    value={newAccion.fechaLimite}
                    onChange={e => setNewAccion(p => ({ ...p, fechaLimite: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAccionForm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={submitAccion} className="flex-1 bg-primary-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-700">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PAMECPage() {
  return (
    <AuthGuard>
      <PAMECContent />
    </AuthGuard>
  );
}
