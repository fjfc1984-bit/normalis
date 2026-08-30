'use client';

/**
 * web/app/dashboard/medicamentos/page.tsx
 * Gestión de Medicamentos y Dispositivos Médicos — inventario de lotes con
 * alertas de vencimiento (alto riesgo/controlados/cadena de frío) y
 * verificación periódica del Servicio Farmacéutico contra el checklist
 * real del Estándar de Medicamentos y Dispositivos (Res. 1732/2026).
 */

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getCountFromServer, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useMedicamentos } from '@/lib/useMedicamentos';
import {
  TIPO_MEDICAMENTO_CFG, ESTADO_LOTE_CFG, LOTE_EMPTY_FORM, DIAS_ALERTA_VENCIMIENTO,
  CRITERIOS_FARMACIA, NORMA_FARMACIA, RESPUESTA_LABEL, ESTADO_VERIFICACION_CFG,
  calcScoreVerificacion, calcEstadoVerificacion,
  type LoteMedicamento, type LoteFormData, type TipoMedicamento,
  type VerificacionFarmacia, type VerificacionFormData, type RespuestaCriterio,
} from '@/lib/medicamentosTypes';
import { textoCriteriosFallidos } from '@/lib/criteriosFallidos';
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

const RESPUESTA_OPCIONES: RespuestaCriterio[] = ['si', 'parcial', 'no', 'na'];
const RESPUESTA_COLOR: Record<RespuestaCriterio, string> = {
  si: 'bg-emerald-600 text-white', parcial: 'bg-amber-500 text-white',
  no: 'bg-red-600 text-white', na: 'bg-gray-300 text-gray-700',
};

// ── Modal: nuevo lote ─────────────────────────────────────────────────────
function LoteFormModal({ onSave, onClose }: { onSave: (data: LoteFormData) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<LoteFormData>(LOTE_EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof LoteFormData>(k: K, v: LoteFormData[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.fechaVencimiento) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-800">💊 Nuevo lote</p>
        </div>
        <form onSubmit={handle} className="px-6 py-5 space-y-4">
          <div>
            <label className={LABEL}>Nombre del medicamento/dispositivo *</label>
            <input className={INPUT} value={form.nombre} onChange={e => set('nombre', e.target.value)}
                   placeholder="Ej: Insulina cristalina, Guantes de nitrilo" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>No. de lote</label>
              <input className={INPUT} value={form.lote} onChange={e => set('lote', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Vence *</label>
              <input type="date" className={INPUT} value={form.fechaVencimiento}
                     onChange={e => set('fechaVencimiento', e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Cantidad</label>
              <input type="number" min={0} className={INPUT} value={form.cantidad}
                     onChange={e => set('cantidad', Number(e.target.value) || 0)} />
            </div>
            <div>
              <label className={LABEL}>Unidad</label>
              <input className={INPUT} value={form.unidadMedida} onChange={e => set('unidadMedida', e.target.value)}
                     placeholder="unidades, cajas, frascos…" />
            </div>
          </div>
          <div>
            <label className={LABEL}>Tipo</label>
            <select className={INPUT} value={form.tipo} onChange={e => set('tipo', e.target.value as TipoMedicamento)}>
              {Object.entries(TIPO_MEDICAMENTO_CFG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Ubicación</label>
            <input className={INPUT} value={form.ubicacion} onChange={e => set('ubicacion', e.target.value)}
                   placeholder="Farmacia central, Botiquín Urgencias…" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.requiereCadenaFrio}
                   onChange={e => set('requiereCadenaFrio', e.target.checked)} className="accent-teal-600" />
            Requiere cadena de frío
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className={BTN_S}>Cancelar</button>
            <button type="submit" disabled={saving} className={BTN_P}>{saving ? 'Guardando…' : 'Guardar lote'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tarjeta de lote ────────────────────────────────────────────────────────
function LoteCard({ lote, onRetirar }: { lote: LoteMedicamento; onRetirar: (id: string) => void }) {
  const estado = lote._estado ?? 'activo';
  const cfg = ESTADO_LOTE_CFG[estado];
  const tipoCfg = TIPO_MEDICAMENTO_CFG[lote.tipo];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-gray-800">{lote.nombre}</span>
          {lote.lote && <span className="text-xs text-gray-400">Lote {lote.lote}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <StatusBadge label={cfg.label} bg={cfg.bg} color={cfg.color} dot={estado === 'vencido' || estado === 'por_vencer'} dotColor={estado === 'vencido' ? 'bg-red-500' : 'bg-amber-500'} />
          {lote.tipo !== 'regular' && <StatusBadge label={tipoCfg.label} bg={tipoCfg.bg} color={tipoCfg.color} />}
          {lote.requiereCadenaFrio && <StatusBadge label="❄️ Cadena de frío" bg="bg-sky-100" color="text-sky-700" />}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {lote.cantidad} {lote.unidadMedida} · Vence {fmtDate(lote.fechaVencimiento)}
          {lote.ubicacion && ` · ${lote.ubicacion}`}
        </p>
      </div>
      {estado !== 'retirado' && (
        <button onClick={() => onRetirar(lote.id)} className={BTN_S}>🗑️ Retirar / destruir</button>
      )}
    </div>
  );
}

// ── Modal: registrar verificación del Servicio Farmacéutico ────────────────
function VerificacionFormModal({ onSave, onClose }: { onSave: (data: VerificacionFormData) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<VerificacionFormData>({
    fecha: new Date().toISOString().slice(0, 10), responsable: '', respuestas: {}, hallazgos: '',
  });
  const [saving, setSaving] = useState(false);

  const respondidos = Object.keys(form.respuestas).length;
  const previewScore = calcScoreVerificacion(form.respuestas);
  const previewEstado = calcEstadoVerificacion(previewScore, form.respuestas);
  const cfg = ESTADO_VERIFICACION_CFG[previewEstado];

  function responder(criterioId: string, r: RespuestaCriterio) {
    setForm(f => ({ ...f, respuestas: { ...f.respuestas, [criterioId]: r } }));
  }

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!form.responsable.trim() || respondidos < CRITERIOS_FARMACIA.length) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
          <p className="text-sm font-bold text-gray-800">🔍 Verificación del Servicio Farmacéutico</p>
          <p className="text-xs text-gray-400">{NORMA_FARMACIA}</p>
        </div>
        <form onSubmit={handle} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Fecha *</label>
              <input type="date" className={INPUT} value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
            </div>
            <div>
              <label className={LABEL}>Responsable *</label>
              <input className={INPUT} value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))}
                     placeholder="Química farmacéutica / responsable" required />
            </div>
          </div>

          <div className="space-y-2">
            {CRITERIOS_FARMACIA.map((c, i) => (
              <div key={c.id} className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-700 mb-2">{i + 1}. {c.texto}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {RESPUESTA_OPCIONES.map(r => (
                    <button key={r} type="button" onClick={() => responder(c.id, r)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors
                        ${form.respuestas[c.id] === r ? RESPUESTA_COLOR[r] : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {RESPUESTA_LABEL[r]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className={LABEL}>Hallazgos / observaciones</label>
            <textarea rows={3} className={INPUT} value={form.hallazgos}
                       onChange={e => setForm(f => ({ ...f, hallazgos: e.target.value }))}
                       placeholder="Describe lo encontrado en los criterios que no cumplen o cumplen parcialmente…" />
          </div>

          <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl ${cfg.bg}`}>
            <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label} · {previewScore}/100</span>
            <span className="text-xs text-gray-500">{respondidos}/{CRITERIOS_FARMACIA.length} respondidos</span>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className={BTN_S}>Cancelar</button>
            <button type="submit" disabled={saving || respondidos < CRITERIOS_FARMACIA.length || !form.responsable.trim()} className={BTN_P}>
              {saving ? 'Guardando…' : '✓ Registrar verificación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tarjeta de verificación ──────────────────────────────────────────────────
function VerificacionCard({
  v, onCrearCapa, creandoCapa,
}: { v: VerificacionFarmacia; onCrearCapa: (v: VerificacionFarmacia) => void; creandoCapa: boolean }) {
  const estado = calcEstadoVerificacion(v.score, v.respuestas);
  const cfg = ESTADO_VERIFICACION_CFG[estado];
  const necesitaCapa = estado !== 'cumple' && !v.capaId;

  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 p-4 ${estado === 'no_cumple' ? 'border-l-red-500' : estado === 'parcial' ? 'border-l-amber-400' : 'border-l-emerald-400'}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge label={`${cfg.label} · ${v.score}/100`} bg={cfg.bg} color={cfg.color} />
          <span className="text-xs text-gray-400">{fmtDate(v.fecha)}</span>
        </div>
        {v.capaId ? (
          <a href="/dashboard/capas" className="text-xs px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200">
            ✅ CAPA creada → Ver
          </a>
        ) : necesitaCapa ? (
          <button onClick={() => onCrearCapa(v)} disabled={creandoCapa}
                  className="text-xs px-2.5 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold rounded-lg disabled:opacity-50">
            {creandoCapa ? 'Creando…' : '+ CAPA'}
          </button>
        ) : null}
      </div>
      {v.hallazgos && <p className="text-sm text-gray-600 mt-2">{v.hallazgos}</p>}
      <p className="text-xs text-gray-400 mt-1">👤 {v.responsable}</p>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function MedicamentosPage() {
  const { user, nit } = useAuth();
  const uid = user?.uid ?? null;
  const {
    lotes, loadingLotes, statsLotes, createLote, retirarLote,
    verificaciones, loadingVerificaciones, registrarVerificacion, vincularCapaAVerificacion,
  } = useMedicamentos(uid, nit || null);
  const { toast, show } = useToast();

  const [tab, setTab] = useState<'lotes' | 'verificaciones'>('lotes');
  const [showNuevoLote, setShowNuevoLote] = useState(false);
  const [showVerificacion, setShowVerificacion] = useState(false);
  const [creandoCapaId, setCreandoCapaId] = useState<string | null>(null);

  async function handleCrearLote(data: LoteFormData) {
    if (!uid) return;
    await createLote(data, uid, nit || '');
    show('💊 Lote registrado', 'success');
    setShowNuevoLote(false);
  }

  async function handleRetirarLote(id: string) {
    await retirarLote(id);
    show('🗑️ Lote retirado', 'info');
  }

  async function handleRegistrarVerificacion(data: VerificacionFormData) {
    if (!uid) return;
    await registrarVerificacion(data, uid, nit || null);
    show('🔍 Verificación registrada', 'success');
    setShowVerificacion(false);
  }

  async function handleCrearCapa(v: VerificacionFarmacia) {
    if (!uid || v.capaId) return;
    setCreandoCapaId(v.id);
    try {
      const countQ = nit
        ? query(collection(db, 'capas'), where('nit', '==', nit))
        : query(collection(db, 'capas'), where('uid', '==', uid));
      const countSnap = await getCountFromServer(countQ);
      const num = String((countSnap.data().count ?? 0) + 1).padStart(3, '0');
      const limite = new Date();
      limite.setDate(limite.getDate() + 30);

      const capaRef = await addDoc(collection(db, 'capas'), {
        uid, nit: nit ?? '',
        numero: `CAPA-${num}`,
        descripcion: `[Medicamentos y Dispositivos] Verificación del Servicio Farmacéutico ${fmtDate(v.fecha)}`,
        causaRaiz: v.hallazgos || `Verificación del Servicio Farmacéutico con score ${v.score}/100.`,
        accionCorrectiva: textoCriteriosFallidos(CRITERIOS_FARMACIA, v.respuestas),
        responsable: v.responsable || '',
        area: 'Servicio Farmacéutico',
        fechaLimite: limite.toISOString().slice(0, 10),
        origen: 'medicamentos',
        evidencia: '',
        estado: 'abierta',
        refVerificacionId: v.id,
        fechaCreacion: serverTimestamp(),
        fechaActualizacion: null,
        fechaInicio: null,
        fechaCierre: null,
      });

      await vincularCapaAVerificacion(v.id, capaRef.id);
      show(`✅ CAPA-${num} creada desde la verificación.`, 'success');
    } catch (err) {
      console.error('[Medicamentos] handleCrearCapa:', err);
      show('Error al crear la CAPA.', 'error');
    } finally {
      setCreandoCapaId(null);
    }
  }

  if (loadingLotes || loadingVerificaciones) return <LoadingSpinner />;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <SectionHeader
        title="Medicamentos y Dispositivos"
        subtitle={NORMA_FARMACIA}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowVerificacion(true)} className={BTN_S}>🔍 Verificar Servicio Farmacéutico</button>
            <button onClick={() => setShowNuevoLote(true)} className={BTN_P}>+ Nuevo lote</button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Lotes"                value={statsLotes.total}       icon="💊" />
        <KpiCard label="Por vencer"           value={statsLotes.porVencer}   icon="⏰" colorClass={statsLotes.porVencer > 0 ? 'text-amber-600' : 'text-gray-800'} />
        <KpiCard label="Vencidos"             value={statsLotes.vencidos}    icon="🔴" colorClass={statsLotes.vencidos > 0 ? 'text-red-600' : 'text-gray-800'} borderColorClass={statsLotes.vencidos > 0 ? 'border-red-300' : 'border-gray-200'} />
        <KpiCard label="Alto riesgo/control." value={statsLotes.altoRiesgoOControlado} icon="⚠️" colorClass="text-orange-700" />
        <KpiCard label="Cadena de frío"       value={statsLotes.cadenaFrio}  icon="❄️" colorClass="text-sky-700" />
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('lotes')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === 'lotes' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          💊 Inventario de lotes
        </button>
        <button onClick={() => setTab('verificaciones')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === 'verificaciones' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          🔍 Verificaciones ({verificaciones.length})
        </button>
      </div>

      {tab === 'lotes' && (
        lotes.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
            <p className="text-sm text-gray-500">Aún no has registrado lotes.</p>
            <button onClick={() => setShowNuevoLote(true)} className={`${BTN_P} mt-4`}>+ Registrar el primero</button>
          </div>
        ) : (
          <div className="space-y-2">
            {lotes.map(l => <LoteCard key={l.id} lote={l} onRetirar={handleRetirarLote} />)}
          </div>
        )
      )}

      {tab === 'verificaciones' && (
        verificaciones.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
            <p className="text-sm text-gray-500">Aún no has registrado verificaciones del Servicio Farmacéutico.</p>
            <button onClick={() => setShowVerificacion(true)} className={`${BTN_P} mt-4`}>+ Registrar la primera</button>
          </div>
        ) : (
          <div className="space-y-3">
            {verificaciones.map(v => (
              <VerificacionCard key={v.id} v={v} onCrearCapa={handleCrearCapa} creandoCapa={creandoCapaId === v.id} />
            ))}
          </div>
        )
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
        <p className="font-bold mb-1">ℹ️ Sobre este módulo</p>
        <p>
          El inventario marca &quot;por vencer&quot; con la misma ventana de {DIAS_ALERTA_VENCIMIENTO} días
          (3 meses) que exige el criterio real de PEPS del checklist de Auditoría. Los {CRITERIOS_FARMACIA.length}{' '}
          criterios de verificación del Servicio Farmacéutico son los mismos que ya usa ese módulo — no es un
          checklist genérico aparte.
        </p>
      </div>

      {showNuevoLote && <LoteFormModal onSave={handleCrearLote} onClose={() => setShowNuevoLote(false)} />}
      {showVerificacion && <VerificacionFormModal onSave={handleRegistrarVerificacion} onClose={() => setShowVerificacion(false)} />}

      <Toast toast={toast} />
    </div>
  );
}
