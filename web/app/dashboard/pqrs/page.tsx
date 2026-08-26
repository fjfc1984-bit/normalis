'use client';

/**
 * web/app/dashboard/pqrs/page.tsx
 * Módulo PQRS — Peticiones, Quejas, Reclamos, Sugerencias y Felicitaciones
 * Base legal: Res. 13437/1991 · Res. 1732/2026 Est. 5 (reemplaza Res. 3100/2019)
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { usePQRS } from '@/lib/usePQRS';
import { sendWorkerEmail } from '@/lib/worker';
import {
  PQRS_TIPOS, PQRS_ESTADOS, PQRS_AREAS, PQRS_PRIORIDADES, PQRS_SLA,
  TIPO_COLOR, ESTADO_COLOR, PRIORIDAD_COLOR, calcularVencimientoPQRS,
} from '@/lib/pqrsTypes';
import type { PQRSTipo, PQRSEstado, PQRSPrioridad, PQRSItem } from '@/lib/pqrsTypes';
import type { NuevaPQRS } from '@/lib/usePQRS';
import {
  SectionHeader, LoadingSpinner, Toast, useToast,
  KpiCard, EmptyState, StatusBadge,
} from '@/components/ui';

// ── Modal responder PQRS ────────────────────────────────────────────────────────
function ResponderModal({
  item,
  onSend,
  onClose,
  sending,
}: {
  item:    PQRSItem;
  onSend:  (respuesta: string) => Promise<void>;
  onClose: () => void;
  sending: boolean;
}) {
  const [texto, setTexto] = useState(item.respuesta ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    await onSend(texto.trim());
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-base font-bold text-gray-800">Responder a {item.nombre}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Se enviará por correo a {item.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-500">
            <p className="font-semibold text-gray-600 mb-1">Solicitud original:</p>
            {item.desc}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Tu respuesta *
            </label>
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder="Escribe la respuesta que recibirá el solicitante…"
              required
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={sending || !texto.trim()}
              className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                         text-white text-sm font-bold rounded-xl transition-colors"
            >
              {sending ? 'Enviando…' : '✓ Enviar respuesta'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700
                         text-sm font-semibold rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal nueva PQRS ──────────────────────────────────────────────────────────
function NuevaPQRSModal({
  onSave,
  onClose,
  saving,
}: {
  onSave:  (p: NuevaPQRS) => Promise<void>;
  onClose: () => void;
  saving:  boolean;
}) {
  const [tipo,      setTipo]      = useState<PQRSTipo>('Petición');
  const [nombre,    setNombre]    = useState('');
  const [desc,      setDesc]      = useState('');
  const [area,      setArea]      = useState('');
  const [prioridad, setPrioridad] = useState<PQRSPrioridad>('General');

  const INPUT = `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !desc.trim()) return;
    await onSave({ tipo, nombre: nombre.trim(), desc: desc.trim(), area, prioridad });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-800">Nueva PQRS</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Tipo de solicitud *
            </label>
            <div className="flex flex-wrap gap-2">
              {PQRS_TIPOS.map(t => {
                const c = TIPO_COLOR[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all
                      ${tipo === t
                        ? `${c.bg} ${c.text} border-current`
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prioridad / SLA */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Prioridad (define el plazo de respuesta)
            </label>
            <div className="flex flex-wrap gap-2">
              {PQRS_PRIORIDADES.map(p => {
                const c = PRIORIDAD_COLOR[p];
                const sla = PQRS_SLA[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrioridad(p)}
                    title={sla.descripcion}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all
                      ${prioridad === p
                        ? `${c.bg} ${c.text} border-current`
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                  >
                    {p} · {sla.horas ? `${sla.horas}h` : `${sla.diasHabiles}d hábiles`}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Plazos según Circular Externa 2023151000000010-5 de 2023 (SuperSalud).
            </p>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Nombre del solicitante *
            </label>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej. María González"
              required
              className={INPUT}
            />
          </div>

          {/* Área */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Área / Servicio
            </label>
            <select value={area} onChange={e => setArea(e.target.value)} className={INPUT}>
              <option value="">Sin especificar</option>
              {PQRS_AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Descripción *
            </label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Describa detalladamente la petición, queja, reclamo, sugerencia o felicitación…"
              required
              rows={4}
              className={`${INPUT} resize-none`}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || !nombre.trim() || !desc.trim()}
              className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                         text-white text-sm font-bold rounded-xl transition-colors"
            >
              {saving ? 'Guardando…' : '✓ Registrar PQRS'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700
                         text-sm font-semibold rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tarjeta de PQRS ────────────────────────────────────────────────────────────
function PQRSCard({
  item,
  onEstado,
  onDelete,
  onResponder,
}: {
  item:        PQRSItem;
  onEstado:    (id: string, e: PQRSEstado) => void;
  onDelete:    (id: string) => void;
  onResponder: (item: PQRSItem) => void;
}) {
  const tc = TIPO_COLOR[item.tipo];
  const ec = ESTADO_COLOR[item.estado];
  const contacto = [item.email, item.telefono].filter(Boolean).join(' · ');

  const prioridad = item.prioridad ?? 'General';
  const pc = PRIORIDAD_COLOR[prioridad];
  const vencimiento = calcularVencimientoPQRS(item.creadoEn, prioridad);
  const vencida = item.estado !== 'Cerrada' && Date.now() > vencimiento;
  const horasRestantes = Math.round((vencimiento - Date.now()) / (1000 * 60 * 60));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4 hover:shadow-sm transition-shadow">
      {/* Tipo pill */}
      <div className="flex-shrink-0 pt-0.5 flex flex-col gap-1 items-start">
        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${tc.bg} ${tc.text}`}>
          {item.tipo}
        </span>
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${pc.bg} ${pc.text}`}
          title={PQRS_SLA[prioridad].descripcion}
        >
          {prioridad}
        </span>
        {item.estado !== 'Cerrada' && (
          vencida ? (
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
              ⏱ Vencida
            </span>
          ) : (
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">
              ⏱ {horasRestantes < 48 ? `${horasRestantes}h restantes` : `${Math.round(horasRestantes / 24)}d restantes`}
            </span>
          )
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-800">{item.nombre}</p>
          {item.origen === 'publico' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-600">
              📬 formulario público
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.desc}</p>
        <p className="text-xs text-gray-400 mt-1.5">
          {item.area && <span>📍 {item.area} · </span>}
          {item.fecha}
          {contacto && <span> · ✉️ {contacto}</span>}
        </p>
        {item.respuesta && (
          <div className="mt-2 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
            <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">
              Respondido {item.respuestaFecha ? `· ${item.respuestaFecha}` : ''}
            </p>
            <p className="text-xs text-teal-800 mt-0.5 line-clamp-2">{item.respuesta}</p>
          </div>
        )}
      </div>

      {/* Estado + acciones */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ec.bg} ${ec.text}`}>
          {item.estado}
        </span>
        <select
          value={item.estado}
          onChange={e => onEstado(item.id, e.target.value as PQRSEstado)}
          className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white
                     focus:outline-none focus:ring-1 focus:ring-teal-400 cursor-pointer"
        >
          {PQRS_ESTADOS.map(s => <option key={s}>{s}</option>)}
        </select>
        {item.email ? (
          <button
            onClick={() => onResponder(item)}
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors"
          >
            {item.respuesta ? '✏️ Editar respuesta' : '↩️ Responder'}
          </button>
        ) : (
          <span className="text-[10px] text-gray-300" title="El solicitante no dejó correo">
            Sin correo
          </span>
        )}
        <button
          onClick={() => onDelete(item.id)}
          className="text-xs text-gray-300 hover:text-red-400 transition-colors"
          title="Eliminar PQRS"
        >
          🗑
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Página principal
// ════════════════════════════════════════════════════════════════════════════
export default function PQRSPage() {
  const { user, nombre, loading: authLoading } = useAuth();
  const { items, loading, add, cambiarEstado, remove, responder } = usePQRS(user?.uid ?? null);
  const { toast, show } = useToast();

  const [showModal, setShowModal]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [filtro, setFiltro]             = useState<PQRSEstado | 'Todos'>('Todos');
  const [responderItem, setResponderItem] = useState<PQRSItem | null>(null);
  const [respondiendo, setRespondiendo] = useState(false);

  // KPIs
  const total     = items.length;
  const pendientes = items.filter(p => p.estado === 'Pendiente').length;
  const enProceso  = items.filter(p => p.estado === 'En Proceso').length;
  const cerradas   = items.filter(p => p.estado === 'Cerrada').length;
  const vencidas   = items.filter(p =>
    p.estado !== 'Cerrada' && Date.now() > calcularVencimientoPQRS(p.creadoEn, p.prioridad ?? 'General')
  ).length;

  // Lista filtrada
  const filtradas = filtro === 'Todos'
    ? items
    : items.filter(p => p.estado === filtro);

  const handleSave = useCallback(async (payload: NuevaPQRS) => {
    setSaving(true);
    try {
      await add(payload);
      show('PQRS registrada correctamente.', 'success');
    } catch {
      show('Error al guardar la PQRS.', 'error');
    } finally {
      setSaving(false);
    }
  }, [add, show]);

  const handleEstado = useCallback(async (id: string, estado: PQRSEstado) => {
    try {
      await cambiarEstado(id, estado);
      show(`Estado actualizado a "${estado}".`, 'success');
    } catch {
      show('Error al actualizar el estado.', 'error');
    }
  }, [cambiarEstado, show]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await remove(id);
      show('PQRS eliminada.', 'info');
    } catch {
      show('Error al eliminar.', 'error');
    }
  }, [remove, show]);

  const handleResponder = useCallback(async (respuesta: string) => {
    if (!responderItem || !user) return;
    setRespondiendo(true);
    try {
      await responder(responderItem.id, respuesta);
      const idToken = await user.getIdToken();
      await sendWorkerEmail('pqrs_respuesta', {
        to:         responderItem.email,
        nombre:     responderItem.nombre,
        tipo:       responderItem.tipo,
        desc:       responderItem.desc,
        respuesta,
        ips_nombre: nombre,
      }, idToken);
      show('Respuesta enviada al solicitante.', 'success');
      setResponderItem(null);
    } catch {
      show('La respuesta se guardó, pero el correo no pudo enviarse. Intenta de nuevo.', 'error');
    } finally {
      setRespondiendo(false);
    }
  }, [responderItem, user, nombre, responder, show]);

  const handleCopiarEnlace = useCallback(async () => {
    if (!user) return;
    const url = `${window.location.origin}/pqrs/${user.uid}?ips=${encodeURIComponent(nombre || '')}`;
    try {
      await navigator.clipboard.writeText(url);
      show('Enlace público copiado — compártelo con tus pacientes.', 'success');
    } catch {
      show(url, 'info');
    }
  }, [user, nombre, show]);

  const exportarPDF = useCallback(() => {
    const w = window.open('', '_blank');
    if (!w) return;
    const filas = items.map(p => {
      const prioridad = p.prioridad ?? 'General';
      const venceMs = calcularVencimientoPQRS(p.creadoEn, prioridad);
      const vencida = p.estado !== 'Cerrada' && Date.now() > venceMs;
      const venceTxt = new Date(venceMs).toLocaleDateString('es-CO', { dateStyle: 'medium' });
      return `<tr>
        <td>${p.tipo}</td>
        <td>${prioridad}</td>
        <td>${p.nombre}</td>
        <td>${p.desc}</td>
        <td>${p.area || '—'}</td>
        <td>${p.estado}</td>
        <td>${p.fecha}</td>
        <td style="${vencida ? 'color:#b91c1c;font-weight:700;' : ''}">${venceTxt}${vencida ? ' (vencida)' : ''}</td>
      </tr>`;
    }).join('');
    w.document.write(`<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8">
<title>Informe PQRS</title>
<style>
  body { font-family: Arial, sans-serif; padding: 30px; font-size: 13px; }
  h1 { color: #0f766e; font-size: 18px; margin-bottom: 4px; }
  .meta { color: #64748b; margin-bottom: 20px; font-size: 12px; }
  .kpis { display: flex; gap: 24px; margin-bottom: 20px; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
         padding: 10px 16px; text-align: center; }
  .kpi-v { font-size: 22px; font-weight: 800; color: #0f766e; }
  .kpi-l { font-size: 11px; color: #64748b; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #0f766e; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; }
  td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  @media print { body { padding: 15px; } }
</style>
</head><body>
<h1>Informe de PQRS</h1>
<p class="meta">Generado el ${new Date().toLocaleDateString('es-CO', { dateStyle: 'long' })}</p>
<div class="kpis">
  <div class="kpi"><div class="kpi-v">${total}</div><div class="kpi-l">Total</div></div>
  <div class="kpi"><div class="kpi-v">${pendientes}</div><div class="kpi-l">Pendientes</div></div>
  <div class="kpi"><div class="kpi-v">${enProceso}</div><div class="kpi-l">En Proceso</div></div>
  <div class="kpi"><div class="kpi-v">${cerradas}</div><div class="kpi-l">Cerradas</div></div>
  <div class="kpi"><div class="kpi-v">${vencidas}</div><div class="kpi-l">Vencidas (SLA)</div></div>
</div>
<table>
  <thead><tr><th>Tipo</th><th>Prioridad</th><th>Solicitante</th><th>Descripción</th><th>Área</th><th>Estado</th><th>Fecha</th><th>Vence</th></tr></thead>
  <tbody>${filas}</tbody>
</table>
<p style="margin-top:16px;font-size:10px;color:#94a3b8;">
  Plazos de respuesta según Circular Externa 2023151000000010-5 de 2023 (SuperSalud).
  El plazo "General" (15 días hábiles) excluye fines de semana pero no festivos colombianos —
  validar contra el calendario oficial si el caso está cerca del límite.
</p>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }, [items, total, pendientes, enProceso, cerradas, vencidas]);

  if (authLoading || loading) return <LoadingSpinner fullHeight />;

  return (
    <div className="p-6 space-y-6">
      <Toast toast={toast} />

      {showModal && (
        <NuevaPQRSModal
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saving={saving}
        />
      )}

      {responderItem && (
        <ResponderModal
          item={responderItem}
          onSend={handleResponder}
          onClose={() => setResponderItem(null)}
          sending={respondiendo}
        />
      )}

      <SectionHeader
        title="PQRS"
        subtitle="Gestión de Peticiones, Quejas, Reclamos, Sugerencias y Felicitaciones · Res. 13437/1991"
        actions={
          <div className="flex gap-2">
            <button
              onClick={handleCopiarEnlace}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100
                         hover:bg-gray-200 text-gray-700
                         text-sm font-semibold rounded-xl transition-colors"
              title="Copiar el enlace público para que tus pacientes envíen PQRS directamente"
            >
              🔗 Enlace público
            </button>
            <button
              onClick={exportarPDF}
              disabled={total === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100
                         hover:bg-gray-200 disabled:opacity-40 text-gray-700
                         text-sm font-semibold rounded-xl transition-colors"
            >
              🖨️ Informe
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600
                         hover:bg-teal-700 text-white text-sm font-bold
                         rounded-xl transition-colors"
            >
              + Nueva PQRS
            </button>
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <KpiCard label="Total PQRS"   value={total}      colorClass="text-gray-800" />
        <KpiCard label="Pendientes"   value={pendientes} colorClass="text-amber-700"   borderColorClass="border-amber-200" />
        <KpiCard label="En Proceso"   value={enProceso}  colorClass="text-blue-700"    borderColorClass="border-blue-200" />
        <KpiCard label="Cerradas"     value={cerradas}   colorClass="text-emerald-700" borderColorClass="border-emerald-200" />
        <KpiCard label="Vencidas (SLA)" value={vencidas} colorClass="text-red-700"     borderColorClass="border-red-200" />
      </div>

      {/* Filtros por estado */}
      {total > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(['Todos', ...PQRS_ESTADOS] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors
                ${filtro === f
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f}
              {f !== 'Todos' && (
                <span className="ml-1.5 opacity-70">
                  ({items.filter(p => p.estado === f).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      {filtradas.length === 0 ? (
        <EmptyState
          icon="📬"
          title={filtro === 'Todos' ? 'Sin PQRS registradas' : `Sin PQRS "${filtro}"`}
          description={
            filtro === 'Todos'
              ? 'Registra la primera PQRS con el botón "+ Nueva PQRS".'
              : 'No hay registros con este estado.'
          }
          action={
            filtro === 'Todos'
              ? <button
                  onClick={() => setShowModal(true)}
                  className="mt-3 px-4 py-2 bg-teal-600 hover:bg-teal-700
                             text-white text-sm font-bold rounded-xl transition-colors"
                >
                  + Nueva PQRS
                </button>
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtradas.map(item => (
            <PQRSCard
              key={item.id}
              item={item}
              onEstado={handleEstado}
              onDelete={handleDelete}
              onResponder={setResponderItem}
            />
          ))}
          <p className="text-xs text-gray-400 text-center pt-1">
            {filtradas.length} registro{filtradas.length !== 1 ? 's' : ''}
            {filtro !== 'Todos' ? ` con estado "${filtro}"` : ' en total'}
          </p>
        </div>
      )}

      {/* Nota legal */}
      <p className="text-xs text-gray-400 text-center">
        Resolución 13437/1991 — Derechos del Paciente · Resolución 1732/2026 Est. 5 ·
        Plazos SLA: Circular Externa 2023151000000010-5 de 2023 (SuperSalud) · NormaLis
      </p>
      <p className="text-[10px] text-gray-300 text-center -mt-4">
        Vacío legal: no está confirmado si esta IPS tiene obligación de reportar estos casos
        en los formatos mensuales GT005/GT006 de SuperSalud — validar con la Secretaría de Salud
        o la propia SuperSalud según el tipo de prestador.
      </p>
    </div>
  );
}
