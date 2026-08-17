'use client';

/**
 * web/app/dashboard/incidentes/page.tsx
 * Módulo de Incidentes y Eventos Adversos
 * Base legal: Res. 1732/2026 Est. 5 · Política Nacional de Seguridad del Paciente
 */

import { useState, useCallback } from 'react';
import {
  collection, query, where, getCountFromServer, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useIncidentes } from '@/lib/useIncidentes';
import { analizarIncidente } from '@/lib/worker';
import {
  INCIDENTE_TIPOS, INCIDENTE_SEVERIDADES, INCIDENTE_ESTADOS,
  SEVERIDAD_COLOR, ESTADO_INC_COLOR,
} from '@/lib/incidenteTypes';
import type {
  IncidenteTipo, IncidenteSeveridad, IncidenteEstado, IncidenteItem, AnalisisLondres,
} from '@/lib/incidenteTypes';
import type { NuevoIncidente } from '@/lib/useIncidentes';
import {
  SectionHeader, LoadingSpinner, Toast, useToast,
  KpiCard, EmptyState,
} from '@/components/ui';

// ── Labels legibles de severidad ─────────────────────────────────────────────
const SEV_LABEL: Record<IncidenteSeveridad, string> = {
  critico:  'Crítico',
  moderado: 'Moderado',
  leve:     'Leve',
};

// ── Modal nuevo incidente ─────────────────────────────────────────────────────
function NuevoIncidenteModal({
  onSave,
  onClose,
  saving,
}: {
  onSave:  (p: NuevoIncidente) => Promise<void>;
  onClose: () => void;
  saving:  boolean;
}) {
  const [tipo,        setTipo]        = useState<IncidenteTipo>('Evento adverso');
  const [severidad,   setSeveridad]   = useState<IncidenteSeveridad>('moderado');
  const [desc,        setDesc]        = useState('');
  const [accion,      setAccion]      = useState('');
  const [responsable, setResponsable] = useState('');

  const INPUT = `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!desc.trim()) return;
    await onSave({ tipo, severidad, desc: desc.trim(), accion: accion.trim(), responsable: responsable.trim() });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h3 className="text-base font-bold text-gray-800">Registrar Incidente / Evento Adverso</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Tipo de evento *
            </label>
            <select value={tipo} onChange={e => setTipo(e.target.value as IncidenteTipo)} className={INPUT}>
              {INCIDENTE_TIPOS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          {/* Severidad */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Severidad *
            </label>
            <div className="flex gap-2">
              {INCIDENTE_SEVERIDADES.map(s => {
                const c = SEVERIDAD_COLOR[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeveridad(s)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all
                      ${severidad === s
                        ? `${c.bg} ${c.text} ${c.border.replace('border-', 'border-2 border-')}`
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                  >
                    {SEVERIDAD_COLOR[s].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Descripción del evento *
            </label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Describa qué ocurrió, cuándo y las circunstancias del evento…"
              required
              rows={3}
              className={`${INPUT} resize-none`}
            />
          </div>

          {/* Acción inmediata */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Acción inmediata tomada
            </label>
            <textarea
              value={accion}
              onChange={e => setAccion(e.target.value)}
              placeholder="Ej: Se informó al médico de turno, se trasladó al paciente…"
              rows={2}
              className={`${INPUT} resize-none`}
            />
          </div>

          {/* Responsable */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Responsable del seguimiento
            </label>
            <input
              value={responsable}
              onChange={e => setResponsable(e.target.value)}
              placeholder="Ej: Dr. Ramírez / Enfermera Jefe"
              className={INPUT}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || !desc.trim()}
              className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                         text-white text-sm font-bold rounded-xl transition-colors"
            >
              {saving ? 'Guardando…' : '✓ Registrar evento'}
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

// ── Panel de análisis de causa raíz (Protocolo de Londres) ───────────────────
function AnalisisLondresPanel({
  analisis,
  capaId,
  creandoCapa,
  onCrearCapa,
}: {
  analisis:    AnalisisLondres;
  capaId?:     string | null;
  creandoCapa: boolean;
  onCrearCapa: () => void;
}) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
        🤖 Análisis generado por IA — requiere revisión y validación del comité de seguridad del
        paciente antes de considerarse definitivo. No sustituye el juicio clínico profesional.
      </p>

      {analisis.estructurado ? (
        <>
          {analisis.factoresContribuyentes.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                Factores contribuyentes
              </p>
              <ul className="space-y-1.5">
                {analisis.factoresContribuyentes.map((f, i) => (
                  <li key={i} className="text-xs text-gray-600">
                    <span className="font-semibold text-gray-700">{f.categoria}:</span> {f.detalle}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analisis.causaRaiz && (
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Causa raíz</p>
              <p className="text-xs text-gray-700">{analisis.causaRaiz}</p>
            </div>
          )}
          {analisis.accionRecomendada && (
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Acción recomendada</p>
              <p className="text-xs text-gray-700">{analisis.accionRecomendada}</p>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-gray-600 whitespace-pre-wrap">{analisis.textoCrudo}</p>
      )}

      <div>
        {capaId ? (
          <span className="text-xs font-semibold text-emerald-600">✓ CAPA creada desde este análisis</span>
        ) : (
          <button
            onClick={onCrearCapa}
            disabled={creandoCapa || (!analisis.causaRaiz && !analisis.textoCrudo)}
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 disabled:opacity-40 transition-colors"
          >
            {creandoCapa ? 'Creando CAPA…' : '+ Crear CAPA desde este análisis'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Tarjeta de incidente ──────────────────────────────────────────────────────
function IncidenteCard({
  item,
  onEstado,
  onDelete,
  onAnalizar,
  analizando,
  creandoCapa,
  onCrearCapa,
}: {
  item:        IncidenteItem;
  onEstado:    (id: string, e: IncidenteEstado) => void;
  onDelete:    (id: string) => void;
  onAnalizar:  (item: IncidenteItem) => void;
  analizando:  boolean;
  creandoCapa: boolean;
  onCrearCapa: (item: IncidenteItem) => void;
}) {
  const sc = SEVERIDAD_COLOR[item.severidad];
  const ec = ESTADO_INC_COLOR[item.estado];

  return (
    <div className={`bg-white rounded-xl border border-gray-200
                     border-l-4 ${sc.border} p-4 hover:shadow-sm transition-shadow`}>
      <div className="flex gap-4">
        {/* Contenido */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${sc.bg} ${sc.text}`}>
              {sc.label}
            </span>
            <span className="text-xs text-gray-500">{item.tipo}</span>
            {item.origen === 'api_externa' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-600">
                🔌 vía API
              </span>
            )}
          </div>
          <p className="text-sm text-gray-800">{item.desc}</p>
          {item.accion && (
            <p className="text-xs text-emerald-700">
              ✅ <span className="font-medium">Acción:</span> {item.accion}
            </p>
          )}
          <p className="text-xs text-gray-400">
            {item.responsable && <span>👤 {item.responsable} · </span>}
            {item.fecha}
          </p>
        </div>

        {/* Estado + acciones */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ec.bg} ${ec.text}`}>
            {item.estado}
          </span>
          <select
            value={item.estado}
            onChange={e => onEstado(item.id, e.target.value as IncidenteEstado)}
            className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white
                       focus:outline-none focus:ring-1 focus:ring-teal-400 cursor-pointer"
          >
            {INCIDENTE_ESTADOS.map(s => <option key={s}>{s}</option>)}
          </select>
          <button
            onClick={() => onDelete(item.id)}
            className="text-xs text-gray-300 hover:text-red-400 transition-colors"
            title="Eliminar"
          >
            🗑
          </button>
        </div>
      </div>

      {item.analisisLondres ? (
        <AnalisisLondresPanel
          analisis={item.analisisLondres}
          capaId={item.capaId}
          creandoCapa={creandoCapa}
          onCrearCapa={() => onCrearCapa(item)}
        />
      ) : (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => onAnalizar(item)}
            disabled={analizando}
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 disabled:opacity-40 transition-colors"
          >
            {analizando ? '🔬 Analizando…' : '🔬 Analizar causa raíz (Protocolo de Londres, IA)'}
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Página principal
// ════════════════════════════════════════════════════════════════════════════
export default function IncidentesPage() {
  const { user, nit, loading: authLoading } = useAuth();
  const {
    items, loading, add, cambiarEstado, remove, guardarAnalisis, vincularCapa,
  } = useIncidentes(user?.uid ?? null);
  const { toast, show } = useToast();

  const [showModal,   setShowModal]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [filtro,      setFiltro]      = useState<IncidenteEstado | 'Todos'>('Todos');
  const [analizando,  setAnalizando]  = useState<string | null>(null); // id en análisis
  const [creandoCapa, setCreandoCapa] = useState<string | null>(null); // id creando CAPA

  // KPIs
  const criticos  = items.filter(i => i.severidad === 'critico').length;
  const moderados = items.filter(i => i.severidad === 'moderado').length;
  const leves     = items.filter(i => i.severidad === 'leve').length;
  const cerrados  = items.filter(i => i.estado === 'Cerrado').length;

  const filtrados = filtro === 'Todos'
    ? items
    : items.filter(i => i.estado === filtro);

  const handleSave = useCallback(async (payload: NuevoIncidente) => {
    setSaving(true);
    try {
      await add(payload);
      show('Evento registrado correctamente.', 'success');
    } catch {
      show('Error al guardar el evento.', 'error');
    } finally {
      setSaving(false);
    }
  }, [add, show]);

  const handleEstado = useCallback(async (id: string, estado: IncidenteEstado) => {
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
      show('Evento eliminado.', 'info');
    } catch {
      show('Error al eliminar.', 'error');
    }
  }, [remove, show]);

  // Pide a la IA un análisis de causa raíz (Protocolo de Londres) y lo
  // persiste en el propio documento del incidente.
  const handleAnalizar = useCallback(async (item: IncidenteItem) => {
    if (!user) return;
    setAnalizando(item.id);
    try {
      const idToken = await user.getIdToken();
      const res = await analizarIncidente(
        { tipo: item.tipo, severidad: item.severidad, desc: item.desc, accion: item.accion },
        idToken,
      );
      const analisis: AnalisisLondres = {
        estructurado:           res.estructurado,
        factoresContribuyentes: res.factoresContribuyentes ?? [],
        causaRaiz:              res.causaRaiz ?? '',
        accionRecomendada:      res.accionRecomendada ?? '',
        generadoEn:             Date.now(),
        // Firestore rechaza campos con valor `undefined` explícito — solo
        // se incluye textoCrudo cuando realmente viene en la respuesta.
        ...(res.textoCrudo !== undefined ? { textoCrudo: res.textoCrudo } : {}),
      };
      await guardarAnalisis(item.id, analisis);
      show('Análisis generado — revísalo antes de considerarlo definitivo.', 'success');
    } catch (e) {
      show((e as Error).message || 'No se pudo generar el análisis.', 'error');
    } finally {
      setAnalizando(null);
    }
  }, [user, guardarAnalisis, show]);

  // Crea una CAPA prellenada con la causa raíz y la acción recomendada del
  // análisis — mismo patrón que la auto-creación de CAPAs desde Brecha 1732.
  const handleCrearCapa = useCallback(async (item: IncidenteItem) => {
    if (!user || !item.analisisLondres || item.capaId) return;
    setCreandoCapa(item.id);
    try {
      const countQ = nit
        ? query(collection(db, 'capas'), where('nit', '==', nit))
        : query(collection(db, 'capas'), where('uid', '==', user.uid));
      const countSnap = await getCountFromServer(countQ);
      const num = String((countSnap.data().count ?? 0) + 1).padStart(3, '0');
      const fechaLimite = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
      const capaRef = await addDoc(collection(db, 'capas'), {
        uid:                user.uid,
        nit:                nit ?? '',
        numero:             `CAPA-${num}`,
        descripcion:        `[Incidente] ${item.tipo} — ${item.desc.slice(0, 140)}`,
        causaRaiz:          item.analisisLondres.causaRaiz || item.analisisLondres.textoCrudo || '',
        accionCorrectiva:   item.analisisLondres.accionRecomendada || '',
        responsable:        item.responsable || '',
        area:               item.tipo,
        fechaLimite,
        origen:             'incidente',
        evidencia:          '',
        estado:             'abierta',
        refIncidenteId:     item.id,
        fechaCreacion:      serverTimestamp(),
        fechaActualizacion: null,
        fechaInicio:        null,
        fechaCierre:        null,
      });
      await vincularCapa(item.id, capaRef.id);
      show(`✅ CAPA-${num} creada desde el análisis.`, 'success');
    } catch {
      show('No se pudo crear la CAPA.', 'error');
    } finally {
      setCreandoCapa(null);
    }
  }, [user, nit, vincularCapa, show]);

  const exportarPDF = useCallback(() => {
    const w = window.open('', '_blank');
    if (!w) return;
    const filas = items.map(i =>
      `<tr>
        <td>${SEV_LABEL[i.severidad]}</td>
        <td>${i.tipo}</td>
        <td>${i.desc}</td>
        <td>${i.accion || '—'}</td>
        <td>${i.responsable || '—'}</td>
        <td>${i.estado}</td>
        <td>${i.fecha}</td>
      </tr>`
    ).join('');
    w.document.write(`<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8">
<title>Informe Incidentes y Eventos Adversos</title>
<style>
  body { font-family: Arial, sans-serif; padding: 30px; font-size: 13px; }
  h1 { color: #0f766e; font-size: 18px; margin-bottom: 4px; }
  .meta { color: #64748b; margin-bottom: 20px; font-size: 12px; }
  .kpis { display: flex; gap: 16px; margin-bottom: 20px; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
         padding: 10px 14px; text-align: center; min-width: 80px; }
  .kpi-v { font-size: 22px; font-weight: 800; }
  .kpi-l { font-size: 11px; color: #64748b; }
  .red { color: #ef4444; }
  .amber { color: #f59e0b; }
  .blue { color: #3b82f6; }
  .green { color: #10b981; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #0f766e; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; }
  td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  @media print { body { padding: 15px; } }
</style>
</head><body>
<h1>Informe de Incidentes y Eventos Adversos</h1>
<p class="meta">Generado el ${new Date().toLocaleDateString('es-CO', { dateStyle: 'long' })}</p>
<div class="kpis">
  <div class="kpi"><div class="kpi-v red">${criticos}</div><div class="kpi-l">Críticos</div></div>
  <div class="kpi"><div class="kpi-v amber">${moderados}</div><div class="kpi-l">Moderados</div></div>
  <div class="kpi"><div class="kpi-v blue">${leves}</div><div class="kpi-l">Leves</div></div>
  <div class="kpi"><div class="kpi-v green">${cerrados}</div><div class="kpi-l">Cerrados</div></div>
</div>
<table>
  <thead><tr><th>Severidad</th><th>Tipo</th><th>Descripción</th><th>Acción</th><th>Responsable</th><th>Estado</th><th>Fecha</th></tr></thead>
  <tbody>${filas}</tbody>
</table>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }, [items, criticos, moderados, leves, cerrados]);

  if (authLoading || loading) return <LoadingSpinner fullHeight />;

  return (
    <div className="p-6 space-y-6">
      <Toast toast={toast} />

      {showModal && (
        <NuevoIncidenteModal
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saving={saving}
        />
      )}

      <SectionHeader
        title="Incidentes y Eventos Adversos"
        subtitle="Registro y seguimiento de eventos · Res. 1732/2026 Est. 5 · Seguridad del Paciente"
        actions={
          <div className="flex gap-2">
            <button
              onClick={exportarPDF}
              disabled={items.length === 0}
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
              + Registrar evento
            </button>
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Críticos"   value={criticos}  colorClass="text-red-700"     borderColorClass="border-red-200" />
        <KpiCard label="Moderados"  value={moderados} colorClass="text-amber-700"   borderColorClass="border-amber-200" />
        <KpiCard label="Leves"      value={leves}     colorClass="text-blue-700"    borderColorClass="border-blue-200" />
        <KpiCard label="Cerrados"   value={cerrados}  colorClass="text-emerald-700" borderColorClass="border-emerald-200" />
      </div>

      {/* Filtros */}
      {items.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(['Todos', ...INCIDENTE_ESTADOS] as const).map(f => (
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
                  ({items.filter(i => i.estado === f).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      {filtrados.length === 0 ? (
        <EmptyState
          icon="🛡️"
          title={filtro === 'Todos' ? 'Sin eventos registrados' : `Sin eventos "${filtro}"`}
          description={
            filtro === 'Todos'
              ? 'Registra el primer incidente o evento adverso con el botón de arriba.'
              : 'No hay eventos con este estado.'
          }
          action={
            filtro === 'Todos'
              ? <button
                  onClick={() => setShowModal(true)}
                  className="mt-3 px-4 py-2 bg-teal-600 hover:bg-teal-700
                             text-white text-sm font-bold rounded-xl transition-colors"
                >
                  + Registrar evento
                </button>
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtrados.map(item => (
            <IncidenteCard
              key={item.id}
              item={item}
              onEstado={handleEstado}
              onDelete={handleDelete}
              onAnalizar={handleAnalizar}
              analizando={analizando === item.id}
              creandoCapa={creandoCapa === item.id}
              onCrearCapa={handleCrearCapa}
            />
          ))}
          <p className="text-xs text-gray-400 text-center pt-1">
            {filtrados.length} evento{filtrados.length !== 1 ? 's' : ''}
            {filtro !== 'Todos' ? ` con estado "${filtro}"` : ' en total'}
          </p>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Res. 1732/2026 Est. 5 · Política Nacional de Seguridad del Paciente · NormaLis
      </p>
    </div>
  );
}
