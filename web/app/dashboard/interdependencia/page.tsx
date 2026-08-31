'use client';

/**
 * web/app/dashboard/interdependencia/page.tsx
 * Gestión de Interdependencia — registro de convenios con la red de
 * prestadores (laboratorio, banco de sangre, imágenes diagnósticas, IPS de
 * mayor complejidad, transporte asistencial…) con alertas de vigencia, más
 * verificación periódica contra el checklist real del Estándar de
 * Interdependencia (Res. 1732/2026, equivalente al Est. 7 de la Res.
 * 3100/2019).
 */

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getCountFromServer, serverTimestamp } from 'firebase/firestore';
import { useInterdependencia } from '@/lib/useInterdependencia';
import {
  TIPOS_SERVICIO_INTERDEPENDENCIA, ESTADO_CONVENIO_CFG, CONVENIO_EMPTY_FORM, DIAS_ALERTA_CONVENIO_DEFAULT,
  CRITERIOS_INTERDEPENDENCIA, NORMA_INTERDEPENDENCIA, RESPUESTA_LABEL, ESTADO_VERIFICACION_CFG,
  calcScoreVerificacion, calcEstadoVerificacion,
  type ConvenioInterdependencia, type ConvenioFormData, type TipoServicioInterdependencia,
  type VerificacionInterdependencia, type VerificacionFormData, type RespuestaCriterio,
} from '@/lib/interdependenciaTypes';
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

// ── Modal: nuevo/editar convenio ────────────────────────────────────────────
function ConvenioFormModal({ onSave, onClose }: { onSave: (data: ConvenioFormData) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<ConvenioFormData>(CONVENIO_EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof ConvenioFormData>(k: K, v: ConvenioFormData[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!form.prestador.trim()) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-800">🔗 Nuevo convenio / prestador de red</p>
        </div>
        <form onSubmit={handle} className="px-6 py-5 space-y-4">
          <div>
            <label className={LABEL}>Nombre del prestador *</label>
            <input className={INPUT} value={form.prestador} onChange={e => set('prestador', e.target.value)}
                   placeholder="Ej: Laboratorio Clínico XYZ, IPS Nivel III" required />
          </div>
          <div>
            <label className={LABEL}>Tipo de servicio</label>
            <select className={INPUT} value={form.tipoServicio}
                    onChange={e => set('tipoServicio', e.target.value as TipoServicioInterdependencia)}>
              {TIPOS_SERVICIO_INTERDEPENDENCIA.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Contacto de coordinación</label>
            <input className={INPUT} value={form.contacto} onChange={e => set('contacto', e.target.value)}
                   placeholder="Teléfono, correo o responsable" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.tieneConvenioFormal}
                   onChange={e => set('tieneConvenioFormal', e.target.checked)} className="accent-teal-600" />
            Tiene convenio/contrato formal firmado
          </label>
          {form.tieneConvenioFormal && (
            <div>
              <label className={LABEL}>Vigente hasta (dejar vacío si es indefinido)</label>
              <input type="date" className={INPUT} value={form.vigenciaHasta}
                     onChange={e => set('vigenciaHasta', e.target.value)} />
            </div>
          )}
          <div>
            <label className={LABEL}>Tiempo de respuesta acordado</label>
            <input className={INPUT} value={form.tiempoRespuestaAcordado}
                   onChange={e => set('tiempoRespuestaAcordado', e.target.value)}
                   placeholder="Ej: 60 min pruebas básicas, 24h disponible…" />
          </div>
          {form.tieneConvenioFormal && (
            <div>
              <label className={LABEL}>Alertar vencimiento con (días de anticipación)</label>
              <input type="number" min={1} className={INPUT} value={form.diasAlerta}
                     onChange={e => set('diasAlerta', Number(e.target.value) || DIAS_ALERTA_CONVENIO_DEFAULT)} />
              <p className="text-[11px] text-gray-400 mt-1">
                No hay un plazo exigido por norma — define tú la anticipación con la que quieres el aviso.
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className={BTN_S}>Cancelar</button>
            <button type="submit" disabled={saving} className={BTN_P}>{saving ? 'Guardando…' : 'Guardar convenio'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tarjeta de convenio ──────────────────────────────────────────────────────
function ConvenioCard({ convenio }: { convenio: ConvenioInterdependencia }) {
  const estado = convenio._estado ?? 'vigente';
  const cfg = ESTADO_CONVENIO_CFG[estado];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-gray-800">{convenio.prestador}</span>
          <span className="text-xs text-gray-400">{convenio.tipoServicio}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <StatusBadge label={cfg.label} bg={cfg.bg} color={cfg.color} dot={estado === 'vencido' || estado === 'por_vencer'} dotColor={estado === 'vencido' ? 'bg-red-500' : 'bg-amber-500'} />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {convenio.tieneConvenioFormal ? `Vigente hasta ${fmtDate(convenio.vigenciaHasta)}` : 'Sin convenio formal'}
          {convenio.tiempoRespuestaAcordado && ` · Respuesta: ${convenio.tiempoRespuestaAcordado}`}
          {convenio.contacto && ` · ${convenio.contacto}`}
        </p>
      </div>
    </div>
  );
}

// ── Modal: registrar verificación de Interdependencia ───────────────────────
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
    if (!form.responsable.trim() || respondidos < CRITERIOS_INTERDEPENDENCIA.length) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
          <p className="text-sm font-bold text-gray-800">🔍 Verificación de Interdependencia</p>
          <p className="text-xs text-gray-400">{NORMA_INTERDEPENDENCIA}</p>
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
                     placeholder="Coordinador(a) de referencia/contrarreferencia" required />
            </div>
          </div>

          <div className="space-y-2">
            {CRITERIOS_INTERDEPENDENCIA.map((c, i) => (
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
            <span className="text-xs text-gray-500">{respondidos}/{CRITERIOS_INTERDEPENDENCIA.length} respondidos</span>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className={BTN_S}>Cancelar</button>
            <button type="submit" disabled={saving || respondidos < CRITERIOS_INTERDEPENDENCIA.length || !form.responsable.trim()} className={BTN_P}>
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
}: { v: VerificacionInterdependencia; onCrearCapa: (v: VerificacionInterdependencia) => void; creandoCapa: boolean }) {
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
          <Link href="/dashboard/capas" className="text-xs px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200">
            ✅ CAPA creada → Ver
          </Link>
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
export default function InterdependenciaPage() {
  const { user, nit } = useAuth();
  const uid = user?.uid ?? null;
  const {
    convenios, loadingConvenios, statsConvenios, createConvenio,
    verificaciones, loadingVerificaciones, registrarVerificacion, vincularCapaAVerificacion,
  } = useInterdependencia(uid, nit || null);
  const { toast, show } = useToast();

  const [tab, setTab] = useState<'convenios' | 'verificaciones'>('convenios');
  const [showNuevoConvenio, setShowNuevoConvenio] = useState(false);
  const [showVerificacion, setShowVerificacion] = useState(false);
  const [creandoCapaId, setCreandoCapaId] = useState<string | null>(null);

  async function handleCrearConvenio(data: ConvenioFormData) {
    if (!uid) return;
    await createConvenio(data, uid, nit || '');
    show('🔗 Convenio registrado', 'success');
    setShowNuevoConvenio(false);
  }

  async function handleRegistrarVerificacion(data: VerificacionFormData) {
    if (!uid) return;
    await registrarVerificacion(data, uid, nit || null);
    show('🔍 Verificación registrada', 'success');
    setShowVerificacion(false);
  }

  async function handleCrearCapa(v: VerificacionInterdependencia) {
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
        descripcion: `[Interdependencia] Verificación ${fmtDate(v.fecha)}`,
        causaRaiz: v.hallazgos || `Verificación de Interdependencia con score ${v.score}/100.`,
        accionCorrectiva: textoCriteriosFallidos(CRITERIOS_INTERDEPENDENCIA, v.respuestas),
        responsable: v.responsable || '',
        area: 'Interdependencia / Red de prestadores',
        fechaLimite: limite.toISOString().slice(0, 10),
        origen: 'interdependencia',
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
      console.error('[Interdependencia] handleCrearCapa:', err);
      show('Error al crear la CAPA.', 'error');
    } finally {
      setCreandoCapaId(null);
    }
  }

  if (loadingConvenios || loadingVerificaciones) return <LoadingSpinner />;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <SectionHeader
        title="Interdependencia"
        subtitle={NORMA_INTERDEPENDENCIA}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowVerificacion(true)} className={BTN_S}>🔍 Verificar Interdependencia</button>
            <button onClick={() => setShowNuevoConvenio(true)} className={BTN_P}>+ Nuevo convenio</button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Convenios"          value={statsConvenios.total}             icon="🔗" />
        <KpiCard label="Vigentes"           value={statsConvenios.vigentes}          icon="✅" colorClass="text-emerald-700" />
        <KpiCard label="Por vencer"         value={statsConvenios.porVencer}         icon="⏰" colorClass={statsConvenios.porVencer > 0 ? 'text-amber-600' : 'text-gray-800'} />
        <KpiCard label="Vencidos"           value={statsConvenios.vencidos}          icon="🔴" colorClass={statsConvenios.vencidos > 0 ? 'text-red-600' : 'text-gray-800'} borderColorClass={statsConvenios.vencidos > 0 ? 'border-red-300' : 'border-gray-200'} />
        <KpiCard label="Sin convenio formal" value={statsConvenios.sinConvenioFormal} icon="⚠️" colorClass="text-orange-700" />
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('convenios')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === 'convenios' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          🔗 Red de prestadores
        </button>
        <button onClick={() => setTab('verificaciones')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === 'verificaciones' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          🔍 Verificaciones ({verificaciones.length})
        </button>
      </div>

      {tab === 'convenios' && (
        convenios.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
            <p className="text-sm text-gray-500">Aún no has registrado convenios con la red de prestadores.</p>
            <button onClick={() => setShowNuevoConvenio(true)} className={`${BTN_P} mt-4`}>+ Registrar el primero</button>
          </div>
        ) : (
          <div className="space-y-2">
            {convenios.map(c => <ConvenioCard key={c.id} convenio={c} />)}
          </div>
        )
      )}

      {tab === 'verificaciones' && (
        verificaciones.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
            <p className="text-sm text-gray-500">Aún no has registrado verificaciones de Interdependencia.</p>
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
          Cada convenio define su propia ventana de alerta de vencimiento (sugerida en {DIAS_ALERTA_CONVENIO_DEFAULT} días
          al crearlo) — no hay un plazo exigido por norma para esto. Los {CRITERIOS_INTERDEPENDENCIA.length}{' '}
          criterios de verificación sí son los mismos del Estándar de Interdependencia que ya usa el módulo de Auditoría —
          no es un checklist genérico aparte. Esta primera versión registra el convenio marco con cada prestador; el
          registro remisión-por-remisión (paciente, desenlace, tiempo de traslado) es la extensión natural siguiente
          si se necesita.
        </p>
      </div>

      {showNuevoConvenio && <ConvenioFormModal onSave={handleCrearConvenio} onClose={() => setShowNuevoConvenio(false)} />}
      {showVerificacion && <VerificacionFormModal onSave={handleRegistrarVerificacion} onClose={() => setShowVerificacion(false)} />}

      <Toast toast={toast} />
    </div>
  );
}
