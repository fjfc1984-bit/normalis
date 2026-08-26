'use client';

/**
 * web/app/dashboard/iaas/page.tsx
 * Vigilancia Epidemiológica IAAS (Infecciones Asociadas a la Atención en
 * Salud) — seguimiento de los eventos SIVIGILA 357/359 (IAD) y 352/362
 * (IAPMQ) para IPS con UCI y/o servicios quirúrgicos/gineco-obstétricos.
 *
 * Base legal: Decreto 3518/2006 (crea el SIVIGILA) · Res. 1732/2026 § 3.17
 * (antes Res. 3100/2019) — exige vigilancia de IAAS en Procesos Prioritarios.
 *
 * Este módulo NO notifica a SIVIGILA — es evidencia interna de seguimiento
 * y plazos. La notificación real se hace en el aplicativo oficial SIVIGILA.
 */

import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useIAAS } from '@/lib/useIAAS';
import type { NuevoIAASCaso, NuevoIAASDenominador } from '@/lib/useIAAS';
import {
  IAAS_EVENTOS, IAAS_TIPOS, IAAS_CAMPOS_DENOMINADOR, IAAS_ESTADO_COLOR,
  calcularVencimientoIAASCaso, calcularVencimientoIAASDenominador,
} from '@/lib/iaasTypes';
import type { IAASTipo, IAASCaso, IAASDenominador } from '@/lib/iaasTypes';
import {
  SectionHeader, LoadingSpinner, Toast, useToast,
  KpiCard, EmptyState,
} from '@/components/ui';

const INPUT = `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
               focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white`;

function fmtFecha(ms: number): string {
  return new Date(ms).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function periodoActual(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ── Modal nuevo caso ───────────────────────────────────────────────────────
function NuevoCasoModal({
  onSave, onClose, saving,
}: {
  onSave: (p: NuevoIAASCaso) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) {
  const [tipo, setTipo] = useState<IAASTipo>('IAD');
  const evento = IAAS_EVENTOS[tipo];
  const [subtipo, setSubtipo] = useState(evento.subtipos[0].id);
  const [servicio, setServicio] = useState(evento.serviciosQueObligan[0]);
  const [fechaConfirmacion, setFechaConfirmacion] = useState(new Date().toISOString().slice(0, 10));
  const [pacienteReferencia, setPacienteReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');

  function cambiarTipo(t: IAASTipo) {
    setTipo(t);
    setSubtipo(IAAS_EVENTOS[t].subtipos[0].id);
    setServicio(IAAS_EVENTOS[t].serviciosQueObligan[0]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fechaConfirmacion) return;
    await onSave({
      tipo, subtipo, servicio, fechaConfirmacion,
      pacienteReferencia: pacienteReferencia.trim() || undefined,
      observaciones: observaciones.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-800">Nuevo caso IAAS</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Evento *</label>
            <div className="flex gap-2">
              {IAAS_TIPOS.map(t => (
                <button key={t} type="button" onClick={() => cambiarTipo(t)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all
                    ${tipo === t ? 'bg-teal-50 text-teal-700 border-teal-400' : 'bg-white text-gray-500 border-gray-200'}`}>
                  {t}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{evento.nombre} · ficha SIVIGILA {evento.codigoIndividual}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Subtipo *</label>
            <select value={subtipo} onChange={e => setSubtipo(e.target.value)} className={INPUT}>
              {evento.subtipos.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Servicio *</label>
            <select value={servicio} onChange={e => setServicio(e.target.value)} className={INPUT}>
              {evento.serviciosQueObligan.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Fecha de confirmación del caso *
            </label>
            <input type="date" value={fechaConfirmacion} onChange={e => setFechaConfirmacion(e.target.value)}
              required className={INPUT} />
            <p className="text-[10px] text-gray-400 mt-1">
              Define el plazo de notificación: {evento.plazoIndividualTexto}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Referencia del paciente (opcional)
            </label>
            <input value={pacienteReferencia} onChange={e => setPacienteReferencia(e.target.value)}
              placeholder="Ej. iniciales o consecutivo de HC — NUNCA nombre completo ni cédula"
              className={INPUT} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Observaciones</label>
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2}
              className={`${INPUT} resize-none`} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                         text-white text-sm font-bold rounded-xl transition-colors">
              {saving ? 'Guardando…' : '✓ Registrar caso'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700
                         text-sm font-semibold rounded-xl transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal nuevo consolidado mensual ────────────────────────────────────────
function NuevoDenominadorModal({
  onSave, onClose, saving,
}: {
  onSave: (p: NuevoIAASDenominador) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) {
  const [tipo, setTipo] = useState<IAASTipo>('IAD');
  const [periodo, setPeriodo] = useState(periodoActual());
  const [notificacionNegativa, setNotificacionNegativa] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>({});

  const campos = IAAS_CAMPOS_DENOMINADOR[tipo];
  const evento = IAAS_EVENTOS[tipo];

  function cambiarTipo(t: IAASTipo) {
    setTipo(t);
    setValores({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valoresNum: Record<string, number> = {};
    for (const campo of campos) {
      const v = parseFloat(valores[campo] ?? '0');
      valoresNum[campo] = isNaN(v) ? 0 : v;
    }
    await onSave({ tipo, periodo, valores: valoresNum, notificacionNegativa });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-800">Nuevo consolidado mensual</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Evento *</label>
            <div className="flex gap-2">
              {IAAS_TIPOS.map(t => (
                <button key={t} type="button" onClick={() => cambiarTipo(t)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all
                    ${tipo === t ? 'bg-teal-50 text-teal-700 border-teal-400' : 'bg-white text-gray-500 border-gray-200'}`}>
                  {t}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">ficha SIVIGILA {evento.codigoColectivo} · {evento.plazoColectivoTexto}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Período (mes vigilado) *</label>
            <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} required className={INPUT} />
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={notificacionNegativa}
              onChange={e => setNotificacionNegativa(e.target.checked)} />
            Notificación negativa (no hubo casos este mes — igual debe notificarse)
          </label>

          <div className="space-y-2">
            {campos.map(campo => (
              <div key={campo}>
                <label className="block text-xs text-gray-500 mb-1">{campo}</label>
                <input type="number" min="0" value={valores[campo] ?? ''}
                  onChange={e => setValores(v => ({ ...v, [campo]: e.target.value }))}
                  placeholder="0" className={INPUT} />
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                         text-white text-sm font-bold rounded-xl transition-colors">
              {saving ? 'Guardando…' : '✓ Registrar consolidado'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700
                         text-sm font-semibold rounded-xl transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tarjeta de caso ─────────────────────────────────────────────────────────
function CasoCard({ caso, onNotificar, onDelete }: {
  caso: IAASCaso; onNotificar: (id: string) => void; onDelete: (id: string) => void;
}) {
  const evento = IAAS_EVENTOS[caso.tipo];
  const subtipoLabel = evento.subtipos.find(s => s.id === caso.subtipo)?.label ?? caso.subtipo;
  const ec = IAAS_ESTADO_COLOR[caso.estadoNotificacion];
  const vencimiento = calcularVencimientoIAASCaso(caso.fechaConfirmacion);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4 hover:shadow-sm transition-shadow">
      <div className="flex-shrink-0 pt-0.5">
        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700">
          {caso.tipo}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{subtipoLabel}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          📍 {caso.servicio} · Confirmado: {caso.fechaConfirmacion}
          {caso.estadoNotificacion !== 'notificado' && <> · Vence: {fmtFecha(vencimiento)}</>}
        </p>
        {caso.pacienteReferencia && <p className="text-xs text-gray-400 mt-0.5">Ref.: {caso.pacienteReferencia}</p>}
        {caso.observaciones && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{caso.observaciones}</p>}
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ec.bg} ${ec.text}`}>
          {caso.estadoNotificacion}
        </span>
        {caso.estadoNotificacion !== 'notificado' && (
          <button onClick={() => onNotificar(caso.id)}
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors">
            ✓ Marcar notificado
          </button>
        )}
        <button onClick={() => onDelete(caso.id)} className="text-xs text-gray-300 hover:text-red-400 transition-colors">🗑</button>
      </div>
    </div>
  );
}

// ── Tarjeta de consolidado ────────────────────────────────────────────────
function DenominadorCard({ denom, onNotificar, onDelete }: {
  denom: IAASDenominador; onNotificar: (id: string) => void; onDelete: (id: string) => void;
}) {
  const ec = IAAS_ESTADO_COLOR[denom.estadoNotificacion];
  const vencimiento = calcularVencimientoIAASDenominador(denom.periodo);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4 hover:shadow-sm transition-shadow">
      <div className="flex-shrink-0 pt-0.5">
        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
          {denom.tipo}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">Consolidado {denom.periodo}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {denom.notificacionNegativa ? 'Notificación negativa (sin casos)' :
            Object.entries(denom.valores).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'Sin valores registrados'}
          {denom.estadoNotificacion !== 'notificado' && <> · Vence: {fmtFecha(vencimiento)}</>}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ec.bg} ${ec.text}`}>
          {denom.estadoNotificacion}
        </span>
        {denom.estadoNotificacion !== 'notificado' && (
          <button onClick={() => onNotificar(denom.id)}
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors">
            ✓ Marcar notificado
          </button>
        )}
        <button onClick={() => onDelete(denom.id)} className="text-xs text-gray-300 hover:text-red-400 transition-colors">🗑</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Página principal
// ════════════════════════════════════════════════════════════════════════════
export default function IAASPage() {
  const { user, nit, loading: authLoading } = useAuth();
  const {
    casos, loadingCasos, denominadores, loadingDenoms,
    addCaso, marcarNotificadoCaso, deleteCaso,
    addDenominador, marcarNotificadoDenominador, deleteDenominador,
  } = useIAAS(user?.uid ?? null, nit ?? null);
  const { toast, show } = useToast();

  const [vista, setVista] = useState<'casos' | 'consolidados'>('casos');
  const [showCasoModal, setShowCasoModal] = useState(false);
  const [showDenomModal, setShowDenomModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const casosVencidos    = useMemo(() => casos.filter(c => c.estadoNotificacion === 'vencido').length, [casos]);
  const casosPendientes  = useMemo(() => casos.filter(c => c.estadoNotificacion === 'pendiente').length, [casos]);
  const denomsVencidos   = useMemo(() => denominadores.filter(d => d.estadoNotificacion === 'vencido').length, [denominadores]);
  const denomsPendientes = useMemo(() => denominadores.filter(d => d.estadoNotificacion === 'pendiente').length, [denominadores]);

  async function handleSaveCaso(payload: NuevoIAASCaso) {
    if (!user) return;
    setSaving(true);
    try {
      await addCaso(payload, user.uid, nit ?? '');
      show('Caso registrado.', 'success');
      setShowCasoModal(false);
    } catch {
      show('Error al guardar el caso.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDenominador(payload: NuevoIAASDenominador) {
    if (!user) return;
    setSaving(true);
    try {
      await addDenominador(payload, user.uid, nit ?? '');
      show('Consolidado registrado.', 'success');
      setShowDenomModal(false);
    } catch {
      show('Error al guardar el consolidado.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loadingCasos || loadingDenoms) return <LoadingSpinner fullHeight />;

  return (
    <div className="p-6 space-y-6">
      <Toast toast={toast} />

      {showCasoModal && (
        <NuevoCasoModal onSave={handleSaveCaso} onClose={() => setShowCasoModal(false)} saving={saving} />
      )}
      {showDenomModal && (
        <NuevoDenominadorModal onSave={handleSaveDenominador} onClose={() => setShowDenomModal(false)} saving={saving} />
      )}

      <SectionHeader
        title="Vigilancia IAAS"
        subtitle="Decreto 3518/2006 (SIVIGILA) · Res. 1732/2026 § 3.17 — eventos IAD (357/359) e IAPMQ (352/362)"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowDenomModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200
                         text-gray-700 text-sm font-semibold rounded-xl transition-colors">
              + Consolidado mensual
            </button>
            <button onClick={() => setShowCasoModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700
                         text-white text-sm font-bold rounded-xl transition-colors">
              + Nuevo caso
            </button>
          </div>
        }
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-xs text-blue-800">
        ℹ️ Este módulo es seguimiento y evidencia interna de plazos — la notificación oficial se hace en el
        aplicativo SIVIGILA del INS/Secretaría de Salud. Los plazos calculados aquí son una aproximación
        calendario; valida el plazo exacto contra el calendario de semanas epidemiológicas oficial del INS
        cuando un caso esté cerca del vencimiento.
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Casos pendientes"         value={casosPendientes}  colorClass="text-amber-700" borderColorClass="border-amber-200" />
        <KpiCard label="Casos vencidos"           value={casosVencidos}    colorClass="text-red-700"   borderColorClass="border-red-200" />
        <KpiCard label="Consolidados pendientes"  value={denomsPendientes} colorClass="text-amber-700" borderColorClass="border-amber-200" />
        <KpiCard label="Consolidados vencidos"    value={denomsVencidos}   colorClass="text-red-700"   borderColorClass="border-red-200" />
      </div>

      <div className="flex gap-2">
        <button onClick={() => setVista('casos')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors
            ${vista === 'casos' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Casos individuales ({casos.length})
        </button>
        <button onClick={() => setVista('consolidados')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors
            ${vista === 'consolidados' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Consolidados mensuales ({denominadores.length})
        </button>
      </div>

      {vista === 'casos' ? (
        casos.length === 0 ? (
          <EmptyState icon="🦠" title="Sin casos registrados"
            description="Registra un caso IAD o IAPMQ con el botón '+ Nuevo caso'." />
        ) : (
          <div className="space-y-3">
            {casos.map(c => (
              <CasoCard key={c.id} caso={c} onNotificar={marcarNotificadoCaso} onDelete={deleteCaso} />
            ))}
          </div>
        )
      ) : (
        denominadores.length === 0 ? (
          <EmptyState icon="📋" title="Sin consolidados registrados"
            description="Registra el consolidado mensual con el botón '+ Consolidado mensual'." />
        ) : (
          <div className="space-y-3">
            {denominadores.map(d => (
              <DenominadorCard key={d.id} denom={d} onNotificar={marcarNotificadoDenominador} onDelete={deleteDenominador} />
            ))}
          </div>
        )
      )}

      <p className="text-xs text-gray-400 text-center">
        {IAAS_EVENTOS.IAD.protocolo} · {IAAS_EVENTOS.IAPMQ.protocolo}
      </p>
    </div>
  );
}
