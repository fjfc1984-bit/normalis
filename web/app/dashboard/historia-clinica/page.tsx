'use client';

/**
 * web/app/dashboard/historia-clinica/page.tsx
 * Auditoría de Historia Clínica por muestreo — checklist real del
 * Estándar de Historia Clínica (Res. 1732/2026) aplicado a una muestra
 * periódica de expedientes, con hallazgos que pueden convertirse en CAPA.
 *
 * NOTA: NormaLis no administra el contenido clínico de los pacientes — ese
 * dato vive en el sistema de HC de cada IPS. Este módulo digitaliza la
 * auditoría de completitud/calidad por muestreo, que es como un comité de
 * historias clínicas evidencia cumplimiento ante una visita de verificación.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getCountFromServer, serverTimestamp } from 'firebase/firestore';
import { useHistoriaClinica } from '@/lib/useHistoriaClinica';
import {
  CRITERIOS_HC, NORMA_HC, RESPUESTA_LABEL, ESTADO_HC_CFG,
  AUDITORIA_HC_EMPTY_FORM, calcScoreHC, calcEstadoHC,
  ESTADO_IHCE_CFG, IHCE_EMPTY_FORM, IHCE_FECHA_VIGOR, NORMA_IHCE, diasDesdeVigorIhce,
  type AuditoriaHC, type AuditoriaHCFormData, type RespuestaCriterio,
  type EstadoIntegracionIHCE, type IhceFormData, type EstadoIHCE,
} from '@/lib/historiaClinicaTypes';
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

// ── Modal: nueva auditoría de HC ────────────────────────────────────────────
function AuditoriaHCModal({ onSave, onClose }: { onSave: (data: AuditoriaHCFormData) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<AuditoriaHCFormData>({
    ...AUDITORIA_HC_EMPTY_FORM, fecha: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  const respondidos = Object.keys(form.respuestas).length;
  const previewScore = calcScoreHC(form.respuestas);
  const previewEstado = calcEstadoHC(previewScore, form.respuestas);
  const cfg = ESTADO_HC_CFG[previewEstado];

  function responder(criterioId: string, r: RespuestaCriterio) {
    setForm(f => ({ ...f, respuestas: { ...f.respuestas, [criterioId]: r } }));
  }

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!form.auditor.trim() || respondidos < CRITERIOS_HC.length) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
          <p className="text-sm font-bold text-gray-800">📄 Auditoría de Historia Clínica</p>
          <p className="text-xs text-gray-400">{NORMA_HC}</p>
        </div>
        <form onSubmit={handle} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Fecha *</label>
              <input type="date" className={INPUT} value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
            </div>
            <div>
              <label className={LABEL}>Auditor *</label>
              <input className={INPUT} value={form.auditor} onChange={e => setForm(f => ({ ...f, auditor: e.target.value }))}
                     placeholder="Nombre de quien audita" required />
            </div>
            <div>
              <label className={LABEL}>Servicio / segmento</label>
              <input className={INPUT} value={form.servicio} onChange={e => setForm(f => ({ ...f, servicio: e.target.value }))}
                     placeholder="Consulta externa, Urgencias, Hospitalización…" />
            </div>
            <div>
              <label className={LABEL}>Tamaño de la muestra (expedientes)</label>
              <input type="number" min={1} className={INPUT} value={form.tamanoMuestra}
                     onChange={e => setForm(f => ({ ...f, tamanoMuestra: Number(e.target.value) || 1 }))} />
            </div>
          </div>

          <div className="space-y-2">
            {CRITERIOS_HC.map((c, i) => (
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
                       placeholder="Describe lo encontrado en la muestra revisada…" />
          </div>

          <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl ${cfg.bg}`}>
            <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label} · {previewScore}/100</span>
            <span className="text-xs text-gray-500">{respondidos}/{CRITERIOS_HC.length} respondidos</span>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className={BTN_S}>Cancelar</button>
            <button type="submit" disabled={saving || respondidos < CRITERIOS_HC.length || !form.auditor.trim()} className={BTN_P}>
              {saving ? 'Guardando…' : '✓ Registrar auditoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tarjeta de auditoría ──────────────────────────────────────────────────────
function AuditoriaCard({
  a, onCrearCapa, creandoCapa,
}: { a: AuditoriaHC; onCrearCapa: (a: AuditoriaHC) => void; creandoCapa: boolean }) {
  const estado = calcEstadoHC(a.score, a.respuestas);
  const cfg = ESTADO_HC_CFG[estado];
  const necesitaCapa = estado !== 'cumple' && !a.capaId;

  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 p-4 ${estado === 'no_cumple' ? 'border-l-red-500' : estado === 'parcial' ? 'border-l-amber-400' : 'border-l-emerald-400'}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge label={`${cfg.label} · ${a.score}/100`} bg={cfg.bg} color={cfg.color} />
          <span className="text-xs text-gray-500">{a.servicio || 'Sin servicio especificado'}</span>
          <span className="text-xs text-gray-400">Muestra: {a.tamanoMuestra} expedientes</span>
          <span className="text-xs text-gray-400">{fmtDate(a.fecha)}</span>
        </div>
        {a.capaId ? (
          <Link href="/dashboard/capas" className="text-xs px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200">
            ✅ CAPA creada → Ver
          </Link>
        ) : necesitaCapa ? (
          <button onClick={() => onCrearCapa(a)} disabled={creandoCapa}
                  className="text-xs px-2.5 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold rounded-lg disabled:opacity-50">
            {creandoCapa ? 'Creando…' : '+ CAPA'}
          </button>
        ) : null}
      </div>
      {a.hallazgos && <p className="text-sm text-gray-600 mt-2">{a.hallazgos}</p>}
      <p className="text-xs text-gray-400 mt-1">👤 {a.auditor}</p>
    </div>
  );
}

// ── Modal: estado de integración IHCE ────────────────────────────────────────
function IhceFormModal({
  actual, onSave, onClose,
}: { actual: EstadoIntegracionIHCE | null; onSave: (data: IhceFormData) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<IhceFormData>(
    actual ? {
      estado: actual.estado, sistemaHC: actual.sistemaHC,
      evidencia: actual.evidencia, responsable: actual.responsable, notas: actual.notas,
    } : IHCE_EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);

  function set<K extends keyof IhceFormData>(k: K, v: IhceFormData[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-800">🔌 Estado de integración IHCE</p>
          <p className="text-xs text-gray-400">{NORMA_IHCE}</p>
        </div>
        <form onSubmit={handle} className="px-6 py-5 space-y-4">
          <div>
            <label className={LABEL}>Estado</label>
            <select className={INPUT} value={form.estado} onChange={e => set('estado', e.target.value as EstadoIHCE)}>
              {Object.entries(ESTADO_IHCE_CFG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Sistema de Historia Clínica</label>
            <input className={INPUT} value={form.sistemaHC} onChange={e => set('sistemaHC', e.target.value)}
                   placeholder="Nombre del software de HC que usa la IPS" />
          </div>
          <div>
            <label className={LABEL}>Evidencia de integración</label>
            <input className={INPUT} value={form.evidencia} onChange={e => set('evidencia', e.target.value)}
                   placeholder="Acta, correo de habilitación IHCE, número de ticket…" />
          </div>
          <div>
            <label className={LABEL}>Responsable</label>
            <input className={INPUT} value={form.responsable} onChange={e => set('responsable', e.target.value)}
                   placeholder="Quién gestiona la integración" />
          </div>
          <div>
            <label className={LABEL}>Notas</label>
            <textarea rows={3} className={INPUT} value={form.notas} onChange={e => set('notas', e.target.value)}
                       placeholder="Contexto adicional, bloqueos, próximos pasos…" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className={BTN_S}>Cancelar</button>
            <button type="submit" disabled={saving} className={BTN_P}>{saving ? 'Guardando…' : 'Guardar estado'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tarjeta de estado IHCE ────────────────────────────────────────────────────
function IhceCard({
  ihce, onEditar, onCrearCapa, creandoCapa,
}: { ihce: EstadoIntegracionIHCE | null; onEditar: () => void; onCrearCapa: () => void; creandoCapa: boolean }) {
  const estado = ihce?.estado ?? 'pendiente';
  const cfg = ESTADO_IHCE_CFG[estado];
  const dias = diasDesdeVigorIhce();
  const necesitaCapa = estado !== 'integrado' && !ihce?.capaId;

  return (
    <div className="bg-white rounded-xl border border-gray-200 border-l-4 p-4"
         style={{ borderLeftColor: estado === 'integrado' ? '#34d399' : estado === 'en_proceso' ? '#fbbf24' : '#f87171' }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-gray-800">🔌 Interoperabilidad IHCE</span>
          <StatusBadge label={cfg.label} bg={cfg.bg} color={cfg.color} />
        </div>
        <div className="flex gap-2">
          {ihce?.capaId ? (
            <Link href="/dashboard/capas" className="text-xs px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200">
              ✅ CAPA creada → Ver
            </Link>
          ) : necesitaCapa ? (
            <button onClick={onCrearCapa} disabled={creandoCapa}
                    className="text-xs px-2.5 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold rounded-lg disabled:opacity-50">
              {creandoCapa ? 'Creando…' : '+ CAPA'}
            </button>
          ) : null}
          <button onClick={onEditar} className="text-xs px-2.5 py-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold rounded-lg">
            {ihce ? 'Actualizar' : 'Declarar estado'}
          </button>
        </div>
      </div>
      {ihce ? (
        <div className="mt-2 text-xs text-gray-500 space-y-0.5">
          {ihce.sistemaHC && <p>Sistema de HC: <span className="text-gray-700">{ihce.sistemaHC}</span></p>}
          {ihce.evidencia && <p>Evidencia: <span className="text-gray-700">{ihce.evidencia}</span></p>}
          {ihce.responsable && <p>👤 {ihce.responsable}</p>}
          {ihce.notas && <p className="text-gray-600 mt-1">{ihce.notas}</p>}
        </div>
      ) : (
        <p className="text-xs text-gray-500 mt-2">Aún no has declarado el estado de integración a la red nacional IHCE.</p>
      )}
      <p className="text-[11px] text-gray-400 mt-2">
        Obligatoria desde el {new Date(IHCE_FECHA_VIGOR + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
        {dias > 0 && estado !== 'integrado' && ` — ${dias} días vencida`}. La integración técnica (RDA/conectores) la ejecuta
        el sistema de historia clínica de la IPS; NormaLis lleva aquí el estado declarado, no la operación técnica.
      </p>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function HistoriaClinicaPage() {
  const { user, nit } = useAuth();
  const uid = user?.uid ?? null;
  const {
    auditorias, loading, stats, registrarAuditoria, vincularCapa,
    ihce, loadingIhce, guardarEstadoIhce, vincularCapaAIhce,
  } = useHistoriaClinica(uid, nit || null);
  const { toast, show } = useToast();

  const [showAuditoria, setShowAuditoria] = useState(false);
  const [creandoCapaId, setCreandoCapaId] = useState<string | null>(null);
  const [showIhce, setShowIhce] = useState(false);
  const [creandoCapaIhce, setCreandoCapaIhce] = useState(false);

  async function handleRegistrar(data: AuditoriaHCFormData) {
    if (!uid) return;
    await registrarAuditoria(data, uid, nit || null);
    show('📄 Auditoría de HC registrada', 'success');
    setShowAuditoria(false);
  }

  async function handleGuardarIhce(data: IhceFormData) {
    if (!uid) return;
    await guardarEstadoIhce(data, uid, nit || null);
    show('🔌 Estado de integración IHCE actualizado', 'success');
    setShowIhce(false);
  }

  async function handleCrearCapaIhce() {
    if (!uid || ihce?.capaId) return;
    setCreandoCapaIhce(true);
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
        descripcion: '[Historia Clínica] Integración pendiente a la red nacional IHCE',
        causaRaiz: ihce?.notas || 'El sistema de historia clínica de la IPS aún no está integrado a la red nacional de Interoperabilidad de Historia Clínica Electrónica (IHCE), obligatoria desde el 15-abr-2026.',
        accionCorrectiva: 'Gestionar con el proveedor del sistema de historia clínica la integración técnica (RDA/conectores) a la red IHCE de MinSalud y documentar la evidencia.',
        responsable: ihce?.responsable || '',
        area: 'Historia Clínica — Interoperabilidad IHCE',
        fechaLimite: limite.toISOString().slice(0, 10),
        origen: 'historia_clinica_ihce',
        evidencia: '',
        estado: 'abierta',
        fechaCreacion: serverTimestamp(),
        fechaActualizacion: null,
        fechaInicio: null,
        fechaCierre: null,
      });

      await vincularCapaAIhce(capaRef.id);
      show(`✅ CAPA-${num} creada por integración IHCE pendiente.`, 'success');
    } catch (err) {
      console.error('[HistoriaClinica] handleCrearCapaIhce:', err);
      show('Error al crear la CAPA.', 'error');
    } finally {
      setCreandoCapaIhce(false);
    }
  }

  async function handleCrearCapa(a: AuditoriaHC) {
    if (!uid || a.capaId) return;
    setCreandoCapaId(a.id);
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
        descripcion: `[Historia Clínica] Auditoría ${fmtDate(a.fecha)} — ${a.servicio || 'muestra general'}`,
        causaRaiz: a.hallazgos || `Auditoría de Historia Clínica con score ${a.score}/100 sobre una muestra de ${a.tamanoMuestra} expedientes.`,
        accionCorrectiva: textoCriteriosFallidos(CRITERIOS_HC, a.respuestas),
        responsable: a.auditor || '',
        area: 'Historia Clínica',
        fechaLimite: limite.toISOString().slice(0, 10),
        origen: 'historia_clinica',
        evidencia: '',
        estado: 'abierta',
        refAuditoriaHCId: a.id,
        fechaCreacion: serverTimestamp(),
        fechaActualizacion: null,
        fechaInicio: null,
        fechaCierre: null,
      });

      await vincularCapa(a.id, capaRef.id);
      show(`✅ CAPA-${num} creada desde la auditoría.`, 'success');
    } catch (err) {
      console.error('[HistoriaClinica] handleCrearCapa:', err);
      show('Error al crear la CAPA.', 'error');
    } finally {
      setCreandoCapaId(null);
    }
  }

  if (loading || loadingIhce) return <LoadingSpinner />;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <SectionHeader
        title="Historia Clínica"
        subtitle={`Auditoría de completitud y calidad por muestreo — ${NORMA_HC}`}
        actions={<button onClick={() => setShowAuditoria(true)} className={BTN_P}>+ Nueva auditoría</button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Auditorías"     value={stats.total}    icon="📄" />
        <KpiCard label="Cumplen"        value={stats.cumple}   icon="✅" colorClass="text-emerald-700" />
        <KpiCard label="Parcial"        value={stats.parcial}  icon="🟡" colorClass={stats.parcial > 0 ? 'text-amber-600' : 'text-gray-800'} />
        <KpiCard label="No cumplen"     value={stats.noCumple} icon="🔴" colorClass={stats.noCumple > 0 ? 'text-red-600' : 'text-gray-800'} borderColorClass={stats.noCumple > 0 ? 'border-red-300' : 'border-gray-200'} />
        <KpiCard label="Score promedio" value={stats.promedioScore} icon="📊" />
      </div>

      <IhceCard ihce={ihce} onEditar={() => setShowIhce(true)} onCrearCapa={handleCrearCapaIhce} creandoCapa={creandoCapaIhce} />

      {auditorias.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <p className="text-sm text-gray-500">Aún no has registrado auditorías de Historia Clínica.</p>
          <button onClick={() => setShowAuditoria(true)} className={`${BTN_P} mt-4`}>+ Registrar la primera</button>
        </div>
      ) : (
        <div className="space-y-3">
          {auditorias.map(a => (
            <AuditoriaCard key={a.id} a={a} onCrearCapa={handleCrearCapa} creandoCapa={creandoCapaId === a.id} />
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
        <p className="font-bold mb-1">ℹ️ Sobre este módulo</p>
        <p>
          NormaLis no administra el contenido clínico de tus pacientes — esta auditoría es de completitud y
          calidad, por muestreo, con los mismos {CRITERIOS_HC.length} criterios que ya usa el módulo de
          Auditoría para Historia Clínica. Define el tamaño de muestra que tu comité de historias clínicas
          considere estadísticamente representativo.
        </p>
      </div>

      {showAuditoria && <AuditoriaHCModal onSave={handleRegistrar} onClose={() => setShowAuditoria(false)} />}
      {showIhce && <IhceFormModal actual={ihce} onSave={handleGuardarIhce} onClose={() => setShowIhce(false)} />}

      <Toast toast={toast} />
    </div>
  );
}
