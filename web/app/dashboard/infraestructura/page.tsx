'use client';

/**
 * web/app/dashboard/infraestructura/page.tsx
 * Gestión de Infraestructura Física — registro de áreas/ambientes y
 * bitácora de inspecciones periódicas contra el checklist real del
 * Estándar de Infraestructura (Res. 1732/2026).
 *
 * NOTA REGULATORIA: el checklist de 11 criterios se toma directamente de
 * web/data/auditData.ts (el mismo que usa el módulo de Auditoría) — ver
 * infraestructuraTypes.ts para el detalle de la fuente y la advertencia
 * sobre la numeración exacta de artículos en el Tomo I de la Res. 1732/2026.
 */

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getCountFromServer, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useInfraestructura } from '@/lib/useInfraestructura';
import {
  ESTADO_AREA_CFG, AREA_EMPTY_FORM, TIPOS_AREA,
  CRITERIOS_INFRAESTRUCTURA, NORMA_INFRAESTRUCTURA, RESPUESTA_LABEL,
  calcScoreInspeccion, calcEstadoDesdeScore,
  type AreaFisica, type AreaFisicaFormData,
  type Inspeccion, type InspeccionFormData, type RespuestaCriterio,
} from '@/lib/infraestructuraTypes';
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

// ── Modal: nueva área / editar área ─────────────────────────────────────────
function AreaFormModal({
  area, onSave, onClose,
}: {
  area?: AreaFisica;
  onSave: (data: AreaFisicaFormData) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<AreaFisicaFormData>(
    area
      ? { nombre: area.nombre, tipoArea: area.tipoArea, responsable: area.responsable, frecuenciaInspeccionMeses: area.frecuenciaInspeccionMeses }
      : AREA_EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const esEdicion = !!area;

  function set<K extends keyof AreaFisicaFormData>(k: K, v: AreaFisicaFormData[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-800">
            {esEdicion ? `✏️ Editar — ${area!.nombre}` : '🏗️ Nueva área física'}
          </p>
        </div>
        <form onSubmit={handle} className="px-6 py-5 space-y-4">
          <div>
            <label className={LABEL}>Nombre del área *</label>
            <input className={INPUT} value={form.nombre} onChange={e => set('nombre', e.target.value)}
                   placeholder="Ej: Consultorio 3, Sala de Urgencias" required />
          </div>
          <div>
            <label className={LABEL}>Tipo de área</label>
            <select className={INPUT} value={form.tipoArea} onChange={e => set('tipoArea', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {TIPOS_AREA.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Responsable</label>
            <input className={INPUT} value={form.responsable} onChange={e => set('responsable', e.target.value)}
                   placeholder="Nombre o cargo" />
          </div>
          <div>
            <label className={LABEL}>Inspeccionar cada (meses)</label>
            <input type="number" min={1} className={INPUT} value={form.frecuenciaInspeccionMeses}
                   onChange={e => set('frecuenciaInspeccionMeses', Number(e.target.value) || 1)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className={BTN_S}>Cancelar</button>
            <button type="submit" disabled={saving} className={BTN_P}>
              {saving ? 'Guardando…' : (esEdicion ? 'Guardar cambios' : 'Guardar área')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: registrar inspección ─────────────────────────────────────────────
function InspeccionFormModal({
  area, onSave, onClose,
}: {
  area: AreaFisica;
  onSave: (data: InspeccionFormData) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<InspeccionFormData>({
    fecha: new Date().toISOString().slice(0, 10),
    inspector: '',
    respuestas: {},
    hallazgos: '',
  });
  const [saving, setSaving] = useState(false);

  const respondidos = Object.keys(form.respuestas).length;
  const previewScore = calcScoreInspeccion(form.respuestas);
  const previewEstado = calcEstadoDesdeScore(previewScore, form.respuestas);
  const cfg = ESTADO_AREA_CFG[previewEstado];

  function responder(criterioId: string, r: RespuestaCriterio) {
    setForm(f => ({ ...f, respuestas: { ...f.respuestas, [criterioId]: r } }));
  }

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!form.inspector.trim() || respondidos < CRITERIOS_INFRAESTRUCTURA.length) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
          <p className="text-sm font-bold text-gray-800">🔍 Registrar inspección — {area.nombre}</p>
          <p className="text-xs text-gray-400">{NORMA_INFRAESTRUCTURA}</p>
        </div>
        <form onSubmit={handle} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Fecha *</label>
              <input type="date" className={INPUT} value={form.fecha}
                     onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
            </div>
            <div>
              <label className={LABEL}>Inspector *</label>
              <input className={INPUT} value={form.inspector}
                     onChange={e => setForm(f => ({ ...f, inspector: e.target.value }))}
                     placeholder="Nombre de quien inspecciona" required />
            </div>
          </div>

          <div className="space-y-2">
            {CRITERIOS_INFRAESTRUCTURA.map((c, i) => (
              <div key={c.id} className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-700 mb-2">{i + 1}. {c.texto}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {RESPUESTA_OPCIONES.map(r => (
                    <button
                      key={r} type="button"
                      onClick={() => responder(c.id, r)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors
                        ${form.respuestas[c.id] === r ? RESPUESTA_COLOR[r] : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
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
            <span className="text-xs text-gray-500">{respondidos}/{CRITERIOS_INFRAESTRUCTURA.length} respondidos</span>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className={BTN_S}>Cancelar</button>
            <button type="submit" disabled={saving || respondidos < CRITERIOS_INFRAESTRUCTURA.length || !form.inspector.trim()} className={BTN_P}>
              {saving ? 'Guardando…' : '✓ Registrar inspección'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: hoja de vida (inspecciones) ──────────────────────────────────────
function HojaDeVidaModal({
  area, inspecciones, onClose,
}: { area: AreaFisica; inspecciones: Inspeccion[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 sticky top-0">
          <p className="text-sm font-bold text-gray-800">📋 Historial de inspecciones — {area.nombre}</p>
          <p className="text-xs text-gray-400">{area.tipoArea || 'Sin tipo definido'}</p>
        </div>
        <div className="p-6 space-y-3">
          {inspecciones.length === 0 && (
            <p className="text-sm text-gray-400 italic">Aún no hay inspecciones registradas.</p>
          )}
          {inspecciones.map(insp => {
            const estado = calcEstadoDesdeScore(insp.score, insp.respuestas);
            const cfg = ESTADO_AREA_CFG[estado];
            return (
              <div key={insp.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <StatusBadge label={`${cfg.label} · ${insp.score}/100`} bg={cfg.bg} color={cfg.color} />
                  <span className="text-xs text-gray-400">{fmtDate(insp.fecha)}</span>
                </div>
                <p className="text-sm text-gray-700">{insp.hallazgos || '(sin hallazgos registrados)'}</p>
                <p className="text-xs text-gray-400 mt-1">👤 {insp.inspector}</p>
                {insp.capaId && (
                  <a href="/dashboard/capas" className="text-xs text-teal-600 hover:underline">✅ CAPA vinculada → Ver</a>
                )}
              </div>
            );
          })}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end sticky bottom-0 bg-white">
          <button onClick={onClose} className={BTN_S}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de área ──────────────────────────────────────────────────────────
function AreaCard({
  area, onInspeccionar, onVerHistorial, onEditar, onCrearCapa, creandoCapa,
}: {
  area: AreaFisica;
  onInspeccionar: (a: AreaFisica) => void;
  onVerHistorial: (a: AreaFisica) => void;
  onEditar: (a: AreaFisica) => void;
  onCrearCapa: (a: AreaFisica) => void;
  creandoCapa: boolean;
}) {
  const cfg = ESTADO_AREA_CFG[area.estado];
  const necesitaCapa = (area.estado === 'no_cumple' || area.estado === 'parcial') && !area.capaId;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🏗️</span>
          <div>
            <p className="text-sm font-bold text-gray-800">{area.nombre}</p>
            <p className="text-xs text-gray-500">{area.tipoArea || 'Sin tipo definido'}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <StatusBadge
                label={area.ultimaInspeccionScore !== null ? `${cfg.label} · ${area.ultimaInspeccionScore}/100` : cfg.label}
                bg={cfg.bg} color={cfg.color}
              />
              {area._inspeccionVencida && (
                <StatusBadge label="Inspección vencida" bg="bg-red-100" color="text-red-700" dot dotColor="bg-red-500" />
              )}
              <button onClick={() => onVerHistorial(area)} className="text-xs text-teal-600 hover:underline">
                Ver historial
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => onEditar(area)} className={BTN_S}>✏️ Editar</button>
          <button onClick={() => onInspeccionar(area)} className={BTN_S}>🔍 Inspeccionar</button>
          {area.capaId ? (
            <a href="/dashboard/capas" className="text-xs px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200">
              ✅ CAPA creada
            </a>
          ) : necesitaCapa ? (
            <button onClick={() => onCrearCapa(area)} disabled={creandoCapa}
                    className="text-xs px-2.5 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold rounded-lg disabled:opacity-50">
              {creandoCapa ? 'Creando…' : '+ CAPA'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-400">
        <span>Última inspección: {fmtDate(area.ultimaInspeccionFecha)}</span>
        <span>Próxima: {fmtDate(area.proximaInspeccion)}</span>
        {area.responsable && <span>👤 {area.responsable}</span>}
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function InfraestructuraPage() {
  const { user, nit } = useAuth();
  const uid = user?.uid ?? null;
  const {
    areas, loading, stats,
    createArea, updateArea, listarInspecciones, registrarInspeccion, vincularCapaAInspeccion,
  } = useInfraestructura(uid, nit || null);
  const { toast, show } = useToast();

  const [showNuevaArea, setShowNuevaArea] = useState(false);
  const [editandoArea, setEditandoArea] = useState<AreaFisica | null>(null);
  const [inspeccionandoArea, setInspeccionandoArea] = useState<AreaFisica | null>(null);
  const [historialArea, setHistorialArea] = useState<AreaFisica | null>(null);
  const [historial, setHistorial] = useState<Inspeccion[]>([]);
  const [creandoCapaId, setCreandoCapaId] = useState<string | null>(null);

  async function handleCrearArea(data: AreaFisicaFormData) {
    if (!uid) return;
    await createArea(data, uid, nit || '');
    show('🏗️ Área registrada', 'success');
    setShowNuevaArea(false);
  }

  async function handleActualizarArea(data: AreaFisicaFormData) {
    if (!editandoArea) return;
    await updateArea(editandoArea.id, data);
    show('✏️ Área actualizada', 'success');
    setEditandoArea(null);
  }

  async function handleRegistrarInspeccion(data: InspeccionFormData) {
    if (!inspeccionandoArea || !uid) return;
    await registrarInspeccion(
      inspeccionandoArea.id, data,
      user?.displayName || user?.email || 'Usuario',
      inspeccionandoArea.frecuenciaInspeccionMeses,
      nit || null,
    );
    show('🔍 Inspección registrada', 'success');
    setInspeccionandoArea(null);
  }

  async function handleVerHistorial(area: AreaFisica) {
    setHistorialArea(area);
    const list = await listarInspecciones(area.id);
    setHistorial(list);
  }

  // Crea una CAPA vinculada al área (mismo patrón que Análisis de Riesgo /
  // Incidentes) a partir de los hallazgos de la última inspección.
  async function handleCrearCapa(area: AreaFisica) {
    if (!uid || area.capaId) return;
    setCreandoCapaId(area.id);
    try {
      const countQ = nit
        ? query(collection(db, 'capas'), where('nit', '==', nit))
        : query(collection(db, 'capas'), where('uid', '==', uid));
      const countSnap = await getCountFromServer(countQ);
      const num = String((countSnap.data().count ?? 0) + 1).padStart(3, '0');
      const limite = new Date();
      limite.setDate(limite.getDate() + 30);

      const list = await listarInspecciones(area.id);
      const ultima = list[0];

      const capaRef = await addDoc(collection(db, 'capas'), {
        uid, nit: nit ?? '',
        numero: `CAPA-${num}`,
        descripcion: `[Infraestructura] ${area.nombre}`,
        causaRaiz: ultima?.hallazgos || `Hallazgos de infraestructura en ${area.nombre} — inspección con score ${area.ultimaInspeccionScore ?? '—'}/100 (${ESTADO_AREA_CFG[area.estado].label}).`,
        accionCorrectiva: `Corregir las condiciones físicas identificadas en la inspección y documentar la evidencia. Tipo de área: ${area.tipoArea || 'sin especificar'}.`,
        responsable: area.responsable || '',
        area: area.tipoArea || 'Infraestructura',
        fechaLimite: limite.toISOString().slice(0, 10),
        origen: 'infraestructura',
        evidencia: '',
        estado: 'abierta',
        refInfraestructuraId: area.id,
        fechaCreacion: serverTimestamp(),
        fechaActualizacion: null,
        fechaInicio: null,
        fechaCierre: null,
      });

      await updateDoc(doc(db, 'infraestructura_areas', area.id), { capaId: capaRef.id });
      if (ultima) await vincularCapaAInspeccion(area.id, ultima.id, capaRef.id);

      show(`✅ CAPA-${num} creada desde la inspección.`, 'success');
    } catch (err) {
      console.error('[Infraestructura] handleCrearCapa:', err);
      show('Error al crear la CAPA.', 'error');
    } finally {
      setCreandoCapaId(null);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <SectionHeader
        title="Infraestructura"
        subtitle={`Registro de áreas físicas e inspecciones periódicas — ${NORMA_INFRAESTRUCTURA}`}
        actions={
          <button onClick={() => setShowNuevaArea(true)} className={BTN_P}>+ Nueva área</button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Áreas"             value={stats.total}            icon="🏗️" />
        <KpiCard label="Cumplen"           value={stats.cumple}           icon="✅" colorClass="text-emerald-700" />
        <KpiCard label="Parcial"           value={stats.parcial}          icon="🟡" colorClass={stats.parcial > 0 ? 'text-amber-600' : 'text-gray-800'} />
        <KpiCard label="No cumplen"        value={stats.noCumple}         icon="🔴" colorClass={stats.noCumple > 0 ? 'text-red-600' : 'text-gray-800'} borderColorClass={stats.noCumple > 0 ? 'border-red-300' : 'border-gray-200'} />
        <KpiCard label="Sin inspeccionar"  value={stats.sinInspeccionar}  icon="⏳" colorClass="text-gray-500" />
      </div>

      {areas.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <p className="text-sm text-gray-500">Aún no has registrado áreas físicas.</p>
          <button onClick={() => setShowNuevaArea(true)} className={`${BTN_P} mt-4`}>+ Registrar la primera</button>
        </div>
      ) : (
        <div className="space-y-3">
          {areas.map(area => (
            <AreaCard
              key={area.id}
              area={area}
              onInspeccionar={setInspeccionandoArea}
              onVerHistorial={handleVerHistorial}
              onEditar={setEditandoArea}
              onCrearCapa={handleCrearCapa}
              creandoCapa={creandoCapaId === area.id}
            />
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
        <p className="font-bold mb-1">ℹ️ Sobre este checklist</p>
        <p>
          Los {CRITERIOS_INFRAESTRUCTURA.length} criterios de cada inspección son exactamente los
          mismos que ya usa el módulo de Auditoría para el área de Infraestructura Física —
          no es un checklist genérico aparte. Un hallazgo de &quot;no cumple&quot; o &quot;parcial&quot;
          puede convertirse directamente en una CAPA con un clic, igual que en Análisis de Riesgo.
        </p>
      </div>

      {showNuevaArea && (
        <AreaFormModal onSave={handleCrearArea} onClose={() => setShowNuevaArea(false)} />
      )}
      {editandoArea && (
        <AreaFormModal area={editandoArea} onSave={handleActualizarArea} onClose={() => setEditandoArea(null)} />
      )}
      {inspeccionandoArea && (
        <InspeccionFormModal area={inspeccionandoArea} onSave={handleRegistrarInspeccion} onClose={() => setInspeccionandoArea(null)} />
      )}
      {historialArea && (
        <HojaDeVidaModal area={historialArea} inspecciones={historial} onClose={() => { setHistorialArea(null); setHistorial([]); }} />
      )}

      <Toast toast={toast} />
    </div>
  );
}
