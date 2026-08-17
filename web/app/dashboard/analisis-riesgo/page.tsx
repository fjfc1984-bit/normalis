'use client';

/**
 * web/app/dashboard/analisis-riesgo/page.tsx
 * Módulo de Gestión del Riesgo — ISO 31000:2018
 * Complementa Res. 1732/2026 Est. 5 (Procesos Prioritarios)
 * Archivo nuevo — no modifica ningún módulo existente.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc,
  onSnapshot, serverTimestamp, query, orderBy, where, getCountFromServer,
} from 'firebase/firestore';
import {
  SectionHeader, LoadingSpinner, Toast, useToast,
  KpiCard, EmptyState,
} from '@/components/ui';
import { calcularAlertasRiesgo, type Alerta } from '@/lib/alertasRiesgo';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Probabilidad = 1 | 2 | 3 | 4 | 5;
type Impacto      = 1 | 2 | 3 | 4 | 5;
type Nivel        = 'bajo' | 'medio' | 'alto' | 'extremo';
type Tratamiento  = 'Evitar' | 'Reducir' | 'Transferir' | 'Aceptar';
type Categoria    =
  | 'Asistencial' | 'Normativo' | 'Talento Humano' | 'Dotación'
  | 'Medicamentos' | 'Infraestructura' | 'Tecnología' | 'Financiero';

interface RiesgoItem {
  id:            string;
  nombre:        string;
  categoria:     Categoria;
  probabilidad:  Probabilidad;
  impacto:       Impacto;
  nivel:         Nivel;
  puntuacion:    number;
  tratamiento:   Tratamiento;
  responsable:   string;
  fechaRevision: string;
  descripcion:   string;
  /** 'auditoria' si fue importado desde Cumplimiento Integrado */
  origen?:       string;
  segmento?:     string;
  /** CAPA vinculada creada desde este riesgo, si existe */
  capaId?:       string | null;
}

interface NuevoRiesgo {
  nombre:        string;
  categoria:     Categoria;
  probabilidad:  Probabilidad;
  impacto:       Impacto;
  tratamiento:   Tratamiento;
  responsable:   string;
  fechaRevision: string;
  descripcion:   string;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const PROB_LABELS: Record<Probabilidad, string> = {
  1: 'Rara (<5%)',
  2: 'Improbable (5-20%)',
  3: 'Posible (20-50%)',
  4: 'Probable (50-80%)',
  5: 'Casi certeza (>80%)',
};

const IMP_LABELS: Record<Impacto, string> = {
  1: 'Insignificante',
  2: 'Menor',
  3: 'Moderado',
  4: 'Mayor',
  5: 'Catastrófico',
};

const CATEGORIAS: Categoria[] = [
  'Asistencial', 'Normativo', 'Talento Humano', 'Dotación',
  'Medicamentos', 'Infraestructura', 'Tecnología', 'Financiero',
];

const TRATAMIENTOS: Tratamiento[] = ['Evitar', 'Reducir', 'Transferir', 'Aceptar'];

const NIVEL_CONFIG: Record<Nivel, { bg: string; text: string; border: string; label: string }> = {
  bajo:    { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-l-emerald-400', label: 'Bajo'    },
  medio:   { bg: 'bg-yellow-100',  text: 'text-yellow-800',  border: 'border-l-yellow-400',  label: 'Medio'   },
  alto:    { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-l-orange-400',  label: 'Alto'    },
  extremo: { bg: 'bg-red-100',     text: 'text-red-800',     border: 'border-l-red-500',     label: 'Extremo' },
};

const MATRIZ_COLOR: Record<Nivel, string> = {
  bajo:    'bg-emerald-200 text-emerald-900',
  medio:   'bg-yellow-200  text-yellow-900',
  alto:    'bg-orange-300  text-orange-900',
  extremo: 'bg-red-400     text-white',
};

// Catálogo predefinido — 15 riesgos típicos IPS (ISO 31000 + Res. 1732/2026)
const CATALOGO: Omit<NuevoRiesgo, 'responsable' | 'fechaRevision'>[] = [
  { nombre: 'Eventos adversos no reportados',                      categoria: 'Asistencial',   probabilidad: 3, impacto: 4, tratamiento: 'Reducir',    descripcion: 'Eventos adversos ocurridos durante la atención sin notificación al sistema de vigilancia.' },
  { nombre: 'Incumplimiento Res. 1732/2026 — Talento Humano',      categoria: 'Normativo',     probabilidad: 3, impacto: 4, tratamiento: 'Reducir',    descripcion: 'Personal que no cumple los requisitos del estándar de Talento Humano de habilitación.' },
  { nombre: 'Vencimiento de habilitación sin renovar',             categoria: 'Normativo',     probabilidad: 2, impacto: 5, tratamiento: 'Evitar',     descripcion: 'Habilitación ante la Secretaría de Salud próxima a vencer sin proceso de renovación iniciado.' },
  { nombre: 'Personal sin tarjeta profesional vigente',            categoria: 'Talento Humano',probabilidad: 3, impacto: 4, tratamiento: 'Evitar',     descripcion: 'Profesionales prestando servicios con tarjeta profesional vencida o suspendida.' },
  { nombre: 'Mantenimiento de equipos biomédicos atrasado',        categoria: 'Dotación',      probabilidad: 3, impacto: 3, tratamiento: 'Reducir',    descripcion: 'Equipos sin plan de mantenimiento preventivo al día según Res. 1732/2026 Est. 3.' },
  { nombre: 'Historia clínica incompleta o inconsistente',         categoria: 'Asistencial',   probabilidad: 4, impacto: 3, tratamiento: 'Reducir',    descripcion: 'Registros clínicos que no cumplen los componentes mínimos exigidos por la normativa.' },
  { nombre: 'Medicamentos vencidos en stock',                      categoria: 'Medicamentos',  probabilidad: 2, impacto: 4, tratamiento: 'Evitar',     descripcion: 'Presencia de medicamentos o dispositivos vencidos en áreas de dispensación o almacenamiento.' },
  { nombre: 'Infecciones asociadas a la atención (IAAS)',          categoria: 'Asistencial',   probabilidad: 3, impacto: 5, tratamiento: 'Reducir',    descripcion: 'Riesgo de infecciones nosocomiales por fallas en protocolos de bioseguridad y asepsia.' },
  { nombre: 'Accidente de trabajo en personal de salud',           categoria: 'Talento Humano',probabilidad: 3, impacto: 3, tratamiento: 'Reducir',    descripcion: 'Accidentes laborales incluyendo lesiones por exposición a material biológico o cortopunzantes.' },
  { nombre: 'Pérdida de información de historia clínica digital',  categoria: 'Tecnología',    probabilidad: 2, impacto: 5, tratamiento: 'Transferir', descripcion: 'Falla en sistemas de backup o pérdida de datos clínicos digitales — aplica IHCE Res. 1732/2026.' },
  { nombre: 'Incumplimiento PAMEC sin evidencia documental',       categoria: 'Normativo',     probabilidad: 3, impacto: 3, tratamiento: 'Reducir',    descripcion: 'Actividades del PAMEC ejecutadas sin documentación de soporte para visita de verificación.' },
  { nombre: 'Caída de paciente en instalaciones',                  categoria: 'Asistencial',   probabilidad: 3, impacto: 3, tratamiento: 'Reducir',    descripcion: 'Caídas de pacientes por falta de barandas, señalización o protocolos de prevención.' },
  { nombre: 'Falta de señalización de emergencia y evacuación',    categoria: 'Infraestructura',probabilidad: 3, impacto: 3, tratamiento: 'Evitar',    descripcion: 'Rutas de evacuación, extintores y zonas de riesgo sin señalización adecuada — SG-SST.' },
  { nombre: 'Interrupción de servicios públicos (agua, energía)',  categoria: 'Infraestructura',probabilidad: 2, impacto: 3, tratamiento: 'Aceptar',   descripcion: 'Suspensión de agua o electricidad que afecte la continuidad de la atención en salud.' },
  { nombre: 'Falla en cadena de frío de biológicos y vacunas',    categoria: 'Medicamentos',  probabilidad: 2, impacto: 4, tratamiento: 'Evitar',     descripcion: 'Ruptura de cadena de frío para vacunas o biológicos termolábiles — pérdida de lote.' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcNivel(p: Probabilidad, i: Impacto): Nivel {
  const s = p * i;
  if (s <= 4)  return 'bajo';
  if (s <= 9)  return 'medio';
  if (s <= 16) return 'alto';
  return 'extremo';
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

// ── Matriz de calor 5×5 ───────────────────────────────────────────────────────

function MatrizCalor({ riesgos }: { riesgos: RiesgoItem[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-bold text-gray-700 mb-4">
        Matriz de Riesgo — ISO 31000:2018 (Probabilidad × Impacto)
      </h3>
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr>
              <th className="w-24 text-gray-400 font-normal text-right pr-3 pb-2">P ↓ / I →</th>
              {([1,2,3,4,5] as Impacto[]).map(i => (
                <th key={i} className="w-20 text-center pb-2 text-gray-500 font-semibold">
                  {IMP_LABELS[i]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {([5,4,3,2,1] as Probabilidad[]).map(p => (
              <tr key={p}>
                <td className="text-right pr-3 py-1 text-gray-500 font-semibold text-xs whitespace-nowrap">
                  {PROB_LABELS[p]}
                </td>
                {([1,2,3,4,5] as Impacto[]).map(i => {
                  const nivel = calcNivel(p, i);
                  const count = riesgos.filter(r => r.probabilidad === p && r.impacto === i).length;
                  return (
                    <td
                      key={i}
                      className={`w-20 h-11 text-center rounded border border-white/50 transition-all ${MATRIZ_COLOR[nivel]}`}
                    >
                      {count > 0 && (
                        <span className="font-bold text-sm">{count}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-400 mt-3">
          Números = riesgos registrados en esa celda &nbsp;·&nbsp;
          <span className="text-emerald-700 font-semibold">■ Bajo</span> &nbsp;
          <span className="text-yellow-700 font-semibold">■ Medio</span> &nbsp;
          <span className="text-orange-700 font-semibold">■ Alto</span> &nbsp;
          <span className="text-red-700 font-semibold">■ Extremo</span>
        </p>
      </div>
    </div>
  );
}

// ── Modal nuevo riesgo ────────────────────────────────────────────────────────

function RiesgoModal({
  onSave,
  onClose,
  saving,
}: {
  onSave:  (p: NuevoRiesgo) => Promise<void>;
  onClose: () => void;
  saving:  boolean;
}) {
  const [useTemplate, setUseTemplate] = useState(true);
  const [form, setForm] = useState<NuevoRiesgo>({
    nombre: '', categoria: 'Asistencial', probabilidad: 3, impacto: 3,
    tratamiento: 'Reducir', responsable: '', fechaRevision: todayStr(), descripcion: '',
  });

  const INPUT = `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white`;

  function applyTemplate(idx: number) {
    const t = CATALOGO[idx];
    setForm(f => ({ ...f, ...t }));
    setUseTemplate(false);
  }

  const nivel = calcNivel(form.probabilidad, form.impacto);
  const nc    = NIVEL_CONFIG[nivel];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    await onSave(form);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h3 className="text-base font-bold text-gray-800">Registrar Riesgo — ISO 31000</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setUseTemplate(true)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors
                ${useTemplate ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              📋 Catálogo IPS
            </button>
            <button
              type="button"
              onClick={() => setUseTemplate(false)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors
                ${!useTemplate ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              ✏️ Personalizado
            </button>
          </div>

          {/* Catálogo predefinido */}
          {useTemplate && (
            <div className="grid grid-cols-1 gap-1.5 max-h-96 overflow-y-auto pr-1">
              {CATALOGO.map((t, idx) => {
                const n   = calcNivel(t.probabilidad, t.impacto);
                const nc2 = NIVEL_CONFIG[n];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyTemplate(idx)}
                    className="text-left px-3 py-2.5 rounded-xl border border-gray-200
                               hover:border-teal-300 hover:bg-teal-50/50 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-800">{t.nombre}</span>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${nc2.bg} ${nc2.text}`}>
                        {nc2.label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{t.categoria} · P:{t.probabilidad} × I:{t.impacto} = {t.probabilidad * t.impacto}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Formulario personalizado */}
          {!useTemplate && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                  Nombre del riesgo *
                </label>
                <input
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  required className={INPUT}
                  placeholder="Ej: Eventos adversos no reportados"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Categoría</label>
                  <select
                    value={form.categoria}
                    onChange={e => setForm(f => ({ ...f, categoria: e.target.value as Categoria }))}
                    className={INPUT}
                  >
                    {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Tratamiento</label>
                  <select
                    value={form.tratamiento}
                    onChange={e => setForm(f => ({ ...f, tratamiento: e.target.value as Tratamiento }))}
                    className={INPUT}
                  >
                    {TRATAMIENTOS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Sliders probabilidad e impacto */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                    Probabilidad — <span className="normal-case font-normal">{PROB_LABELS[form.probabilidad]}</span>
                  </label>
                  <input
                    type="range" min={1} max={5} value={form.probabilidad}
                    onChange={e => setForm(f => ({ ...f, probabilidad: parseInt(e.target.value) as Probabilidad }))}
                    className="w-full accent-teal-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>1 Rara</span><span>5 Certeza</span></div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                    Impacto — <span className="normal-case font-normal">{IMP_LABELS[form.impacto]}</span>
                  </label>
                  <input
                    type="range" min={1} max={5} value={form.impacto}
                    onChange={e => setForm(f => ({ ...f, impacto: parseInt(e.target.value) as Impacto }))}
                    className="w-full accent-teal-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>1 Insignif.</span><span>5 Catastróf.</span></div>
                </div>
              </div>

              {/* Nivel calculado */}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${nc.bg}`}>
                <span className={`text-sm font-semibold ${nc.text}`}>Nivel de riesgo:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${nc.bg} ${nc.text}`}>
                  {nc.label} — Puntuación: {form.probabilidad * form.impacto} / 25
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Responsable</label>
                  <input
                    value={form.responsable}
                    onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))}
                    placeholder="Nombre o cargo"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Fecha de revisión</label>
                  <input
                    type="date"
                    value={form.fechaRevision}
                    onChange={e => setForm(f => ({ ...f, fechaRevision: e.target.value }))}
                    className={INPUT}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  rows={2}
                  className={`${INPUT} resize-none`}
                  placeholder="Contexto y causas del riesgo…"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving || !form.nombre.trim()}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                             text-white text-sm font-bold rounded-xl transition-colors"
                >
                  {saving ? 'Guardando…' : '✓ Registrar riesgo'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de riesgo ─────────────────────────────────────────────────────────

function RiesgoCard({
  item,
  onDelete,
  onUpdate,
  onCrearCapa,
  creandoCapa,
}: {
  item:        RiesgoItem;
  onDelete:    (id: string) => void;
  onUpdate:    (id: string, t: Tratamiento) => void;
  onCrearCapa: (item: RiesgoItem) => void;
  creandoCapa: boolean;
}) {
  const nc     = NIVEL_CONFIG[item.nivel];
  const isAlto = item.nivel === 'alto' || item.nivel === 'extremo';

  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${nc.border} p-4 hover:shadow-sm transition-shadow`}>
      <div className="flex gap-4">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${nc.bg} ${nc.text}`}>
              {nc.label} · {item.puntuacion}pts
            </span>
            <span className="text-xs text-gray-500">{item.categoria}</span>
            <span className="text-xs text-gray-400">P:{item.probabilidad} × I:{item.impacto}</span>
            {item.origen === 'auditoria' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                📥 Desde auditoría
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-800">{item.nombre}</p>
          {item.descripcion && (
            <p className="text-xs text-gray-500 line-clamp-2">{item.descripcion}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
            {item.responsable   && <span>👤 {item.responsable}</span>}
            {item.fechaRevision && <span>📅 Rev. {item.fechaRevision}</span>}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <select
            value={item.tratamiento}
            onChange={e => onUpdate(item.id, e.target.value as Tratamiento)}
            className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white
                       focus:outline-none focus:ring-1 focus:ring-teal-400 cursor-pointer"
          >
            {TRATAMIENTOS.map(t => <option key={t}>{t}</option>)}
          </select>

          {isAlto && (
            item.capaId ? (
              <a
                href="/dashboard/capas"
                className="text-xs px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100
                           text-emerald-700 font-bold rounded-lg transition-colors border border-emerald-200"
                title="Ver la CAPA vinculada a este riesgo"
              >
                ✅ CAPA creada → Ver
              </a>
            ) : (
              <button
                onClick={() => onCrearCapa(item)}
                disabled={creandoCapa}
                className="text-xs px-2.5 py-1 bg-orange-100 hover:bg-orange-200
                           text-orange-700 font-bold rounded-lg transition-colors disabled:opacity-50"
                title="Crear CAPA para este riesgo"
              >
                {creandoCapa ? 'Creando…' : '+ CAPA'}
              </button>
            )
          )}

          <button
            onClick={() => onDelete(item.id)}
            className="text-xs text-gray-300 hover:text-red-400 transition-colors"
            title="Eliminar riesgo"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Página principal
// ════════════════════════════════════════════════════════════════════════════

export default function AnalisisRiesgoPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast, show } = useToast();

  const [riesgos,     setRiesgos]     = useState<RiesgoItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [filtroNivel, setFiltroNivel] = useState<Nivel | 'Todos'>('Todos');
  const [userNit,      setUserNit]      = useState<string>('');
  const [creandoCapaId, setCreandoCapaId] = useState<string | null>(null);

  // Alertas tempranas: cruce con vencimientos/incidentes reales (ver
  // web/lib/alertasRiesgo.ts). Se calculan aparte de la suscripción en vivo
  // de riesgos para no re-consultar vencimientos/incidentes en cada cambio
  // menor de la matriz — se refrescan al cargar la página y con el botón
  // "Actualizar alertas".
  const [alertas,        setAlertas]        = useState<Alerta[]>([]);
  const [loadingAlertas, setLoadingAlertas]  = useState(false);

  // Suscripción Firestore — colección aislada: riesgos/{uid}/items
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'riesgos', user.uid, 'items'),
      orderBy('puntuacion', 'desc'),
    );
    const unsub = onSnapshot(q, snap => {
      setRiesgos(snap.docs.map(d => ({ id: d.id, ...d.data() })) as RiesgoItem[]);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user]);

  // NIT del usuario — se usa para numerar CAPAs de forma consistente con
  // el resto de módulos (auditoría, gap-1732, incidentes).
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'usuarios', user.uid))
      .then(s => { if (s.exists()) setUserNit(s.data()?.nit ?? ''); })
      .catch(() => {});
  }, [user]);

  const refrescarAlertas = useCallback(async () => {
    if (!user) return;
    setLoadingAlertas(true);
    try {
      const resultado = await calcularAlertasRiesgo(user.uid, riesgos);
      setAlertas(resultado);
    } catch (err) {
      console.error('[AnalisisRiesgo] refrescarAlertas:', err);
    } finally {
      setLoadingAlertas(false);
    }
  }, [user, riesgos]);

  // Calcula las alertas una vez que los riesgos terminan de cargar por
  // primera vez — luego el usuario puede refrescarlas manualmente (p. ej.
  // tras registrar un nuevo vencimiento o incidente en otro módulo).
  useEffect(() => {
    if (!user || loading) return;
    void refrescarAlertas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  // KPIs
  const extremos = riesgos.filter(r => r.nivel === 'extremo').length;
  const altos    = riesgos.filter(r => r.nivel === 'alto').length;
  const medios   = riesgos.filter(r => r.nivel === 'medio').length;
  const bajos    = riesgos.filter(r => r.nivel === 'bajo').length;

  const filtrados = filtroNivel === 'Todos'
    ? riesgos
    : riesgos.filter(r => r.nivel === filtroNivel);

  const handleSave = useCallback(async (payload: NuevoRiesgo) => {
    if (!user) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'riesgos', user.uid, 'items'), {
        ...payload,
        nivel:      calcNivel(payload.probabilidad, payload.impacto),
        puntuacion: payload.probabilidad * payload.impacto,
        creadoEn:   serverTimestamp(),
      });
      show('Riesgo registrado correctamente.', 'success');
    } catch {
      show('Error al guardar el riesgo.', 'error');
    } finally {
      setSaving(false);
    }
  }, [user, show]);

  const handleDelete = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'riesgos', user.uid, 'items', id));
      show('Riesgo eliminado.', 'info');
    } catch {
      show('Error al eliminar.', 'error');
    }
  }, [user, show]);

  const handleUpdate = useCallback(async (id: string, tratamiento: Tratamiento) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'riesgos', user.uid, 'items', id), { tratamiento });
    } catch {
      show('Error al actualizar.', 'error');
    }
  }, [user, show]);

  // Crea una CAPA vinculada a este riesgo (mismo patrón que gap-1732 e
  // Incidentes) y la marca en el propio documento del riesgo para no
  // duplicarla si el usuario vuelve a hacer clic.
  const crearCapaDesdeRiesgo = useCallback(async (item: RiesgoItem) => {
    if (!user || item.capaId) return;
    setCreandoCapaId(item.id);
    try {
      const countQ = userNit
        ? query(collection(db, 'capas'), where('nit', '==', userNit))
        : query(collection(db, 'capas'), where('uid', '==', user.uid));
      const countSnap = await getCountFromServer(countQ);
      const num = String((countSnap.data().count ?? 0) + 1).padStart(3, '0');
      const limite = new Date();
      limite.setDate(limite.getDate() + 30);
      const capaRef = await addDoc(collection(db, 'capas'), {
        uid:                user.uid,
        nit:                userNit ?? '',
        numero:             `CAPA-${num}`,
        descripcion:        `[Riesgo ISO 31000] ${item.nombre}`,
        causaRaiz:          item.descripcion || `Riesgo de categoría ${item.categoria} identificado en la matriz — nivel ${item.nivel} (Probabilidad ${item.probabilidad} × Impacto ${item.impacto}).`,
        accionCorrectiva:   `Tratamiento definido: ${item.tratamiento}. Documentar las acciones concretas para mitigar este riesgo.`,
        responsable:        item.responsable || '',
        area:               item.categoria,
        fechaLimite:        limite.toISOString().slice(0, 10),
        origen:             'riesgo',
        evidencia:          '',
        estado:             'abierta',
        refRiesgoId:        item.id,
        fechaCreacion:      serverTimestamp(),
        fechaActualizacion: null,
        fechaInicio:        null,
        fechaCierre:        null,
      });
      await updateDoc(doc(db, 'riesgos', user.uid, 'items', item.id), { capaId: capaRef.id });
      show(`✅ CAPA-${num} creada desde el riesgo.`, 'success');
    } catch (err) {
      console.error('[AnalisisRiesgo] crearCapaDesdeRiesgo:', err);
      show('Error al crear la CAPA.', 'error');
    } finally {
      setCreandoCapaId(null);
    }
  }, [user, userNit, show]);

  // PDF export
  const exportarPDF = useCallback(() => {
    const w = window.open('', '_blank');
    if (!w) return;
    const filas = riesgos.map(r => {
      const color = r.nivel === 'extremo' ? '#dc2626' : r.nivel === 'alto' ? '#ea580c' : r.nivel === 'medio' ? '#ca8a04' : '#16a34a';
      return `<tr>
        <td>${r.nombre}</td>
        <td>${r.categoria}</td>
        <td style="text-align:center">${r.probabilidad}</td>
        <td style="text-align:center">${r.impacto}</td>
        <td style="text-align:center;font-weight:bold">${r.puntuacion}</td>
        <td style="font-weight:bold;color:${color}">${NIVEL_CONFIG[r.nivel].label}</td>
        <td>${r.tratamiento}</td>
        <td>${r.responsable || '—'}</td>
        <td>${r.fechaRevision || '—'}</td>
      </tr>`;
    }).join('');

    w.document.write(`<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"><title>Gestión del Riesgo — ISO 31000</title>
<style>
  body{font-family:Arial,sans-serif;padding:30px;font-size:12px}
  h1{color:#0f766e;font-size:18px;margin-bottom:4px}
  .meta{color:#64748b;margin-bottom:16px;font-size:11px}
  .kpis{display:flex;gap:12px;margin-bottom:16px}
  .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 14px;text-align:center}
  .kpi-v{font-size:20px;font-weight:800}.kpi-l{font-size:10px;color:#64748b}
  table{width:100%;border-collapse:collapse}
  th{background:#0f766e;color:#fff;padding:7px 8px;text-align:left;font-size:11px}
  td{padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top}
  tr:nth-child(even) td{background:#f8fafc}
  .footer{margin-top:16px;font-size:10px;color:#94a3b8;text-align:center}
  @media print{body{padding:15px}}
</style></head><body>
<h1>Gestión del Riesgo — ISO 31000:2018</h1>
<p class="meta">Generado: ${new Date().toLocaleDateString('es-CO',{dateStyle:'long'})} · Res. 1732/2026 Est. 5 — Procesos Prioritarios</p>
<div class="kpis">
  <div class="kpi"><div class="kpi-v" style="color:#dc2626">${extremos}</div><div class="kpi-l">Extremo</div></div>
  <div class="kpi"><div class="kpi-v" style="color:#ea580c">${altos}</div><div class="kpi-l">Alto</div></div>
  <div class="kpi"><div class="kpi-v" style="color:#ca8a04">${medios}</div><div class="kpi-l">Medio</div></div>
  <div class="kpi"><div class="kpi-v" style="color:#16a34a">${bajos}</div><div class="kpi-l">Bajo</div></div>
</div>
<table>
  <thead><tr>
    <th>Riesgo</th><th>Categoría</th><th>P</th><th>I</th><th>P×I</th>
    <th>Nivel</th><th>Tratamiento</th><th>Responsable</th><th>Revisión</th>
  </tr></thead>
  <tbody>${filas}</tbody>
</table>
<p class="footer">ISO 31000:2018 · Resolución 1732/2026 Est. 5 — Procesos Prioritarios · NormaLis</p>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }, [riesgos, extremos, altos, medios, bajos]);

  if (authLoading || loading) return <LoadingSpinner fullHeight />;

  return (
    <div className="p-6 space-y-6">
      <Toast toast={toast} />

      {showModal && (
        <RiesgoModal
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saving={saving}
        />
      )}

      <SectionHeader
        title="Gestión del Riesgo"
        subtitle="ISO 31000:2018 · Res. 1732/2026 Est. 5 — Procesos Prioritarios"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/dashboard/cumplimiento"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50
                         hover:bg-blue-100 text-blue-700 text-sm font-semibold rounded-xl transition-colors"
            >
              📥 Importar desde auditoría
            </Link>
            <button
              onClick={exportarPDF}
              disabled={riesgos.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100
                         hover:bg-gray-200 disabled:opacity-40 text-gray-700
                         text-sm font-semibold rounded-xl transition-colors"
            >
              🖨️ Informe PDF
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600
                         hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              + Registrar riesgo
            </button>
          </div>
        }
      />

      {/* ── Alertas Tempranas ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            🚨 Alertas Tempranas
            {alertas.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                {alertas.length}
              </span>
            )}
          </h3>
          <button
            onClick={refrescarAlertas}
            disabled={loadingAlertas}
            className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50
                       text-gray-600 transition-colors disabled:opacity-50"
          >
            {loadingAlertas ? 'Actualizando…' : '🔄 Actualizar alertas'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Cruza tu matriz de riesgo con vencimientos e incidentes reales registrados en NormaLis
          para anticipar problemas antes de que escalen.
        </p>

        {loadingAlertas && alertas.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">Analizando señales de otros módulos…</p>
        ) : alertas.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            <span>✅</span>
            <span>Sin alertas por ahora — tu matriz de riesgo está al día con las señales disponibles en la plataforma.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {alertas.map(a => (
              <div
                key={a.id}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
                  a.severidad === 'alta'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <span className="text-lg flex-shrink-0">{a.severidad === 'alta' ? '🔴' : '🟡'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${a.severidad === 'alta' ? 'text-red-800' : 'text-amber-800'}`}>
                    {a.titulo}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{a.detalle}</p>
                  {a.accion && (
                    <Link
                      href={a.accion.href}
                      className="inline-block mt-1.5 text-xs font-bold text-teal-700 hover:text-teal-900"
                    >
                      {a.accion.label} →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Extremo" value={extremos} colorClass="text-red-700"     borderColorClass="border-red-200" />
        <KpiCard label="Alto"    value={altos}    colorClass="text-orange-700"  borderColorClass="border-orange-200" />
        <KpiCard label="Medio"   value={medios}   colorClass="text-yellow-700"  borderColorClass="border-yellow-200" />
        <KpiCard label="Bajo"    value={bajos}    colorClass="text-emerald-700" borderColorClass="border-emerald-200" />
      </div>

      {/* Matriz de calor — solo cuando hay datos */}
      {riesgos.length > 0 && <MatrizCalor riesgos={riesgos} />}

      {/* Filtros por nivel */}
      {riesgos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(['Todos', 'extremo', 'alto', 'medio', 'bajo'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltroNivel(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors capitalize
                ${filtroNivel === f
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f === 'Todos' ? 'Todos' : NIVEL_CONFIG[f].label}
              {f !== 'Todos' && (
                <span className="ml-1.5 opacity-70">
                  ({riesgos.filter(r => r.nivel === f).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lista de riesgos */}
      {filtrados.length === 0 ? (
        <EmptyState
          icon="⚠️"
          title={filtroNivel === 'Todos' ? 'Sin riesgos registrados' : `Sin riesgos nivel ${filtroNivel}`}
          description={
            filtroNivel === 'Todos'
              ? 'Registra el primer riesgo usando el catálogo IPS predefinido (15 riesgos típicos) o crea uno personalizado.'
              : 'No hay riesgos con este nivel de criticidad.'
          }
          action={
            filtroNivel === 'Todos'
              ? (
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-3 px-4 py-2 bg-teal-600 hover:bg-teal-700
                             text-white text-sm font-bold rounded-xl transition-colors"
                >
                  + Registrar primer riesgo
                </button>
              )
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtrados.map(item => (
            <RiesgoCard
              key={item.id}
              item={item}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              onCrearCapa={crearCapaDesdeRiesgo}
              creandoCapa={creandoCapaId === item.id}
            />
          ))}
          <p className="text-xs text-gray-400 text-center pt-1">
            {filtrados.length} riesgo{filtrados.length !== 1 ? 's' : ''}
            {filtroNivel !== 'Todos' ? ` nivel ${NIVEL_CONFIG[filtroNivel as Nivel]?.label}` : ' en total'}
          </p>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        ISO 31000:2018 · Resolución 1732/2026 Est. 5 — Procesos Prioritarios · NormaLis
      </p>
    </div>
  );
}
