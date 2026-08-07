'use client';
/**
 * web/app/dashboard/personal/page.tsx
 * Módulo Talento Humano — Res. 3100/2019 Estándar 1
 * Gestión de personal, hojas de vida, capacitaciones y firma digital.
 */

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { usePersonal, useCapacitaciones } from '@/lib/usePersonal';
import {
  TIPOS_PERSONAL, VINCULACION_TIPOS, DOCS_LABELS, EMPTY_DOCS,
  TEMAS_CAPACITACION, docCompliance,
} from '@/lib/personalTypes';
import type {
  PersonalItem, PersonalFormData, PersonalDocs,
  CapacitacionSesion, AsistenteEntry,
  TipoPersonal, VinculacionTipo, TemaCapacitacion,
} from '@/lib/personalTypes';
import {
  SectionHeader, LoadingSpinner, Toast, useToast,
  KpiCard, EmptyState, TabBar,
} from '@/components/ui';
import type { TabItem } from '@/components/ui';

// ── Estilos comunes ───────────────────────────────────────────────────────────
const INPUT = `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
               focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white`;
const LABEL = `block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1`;

// ── Compliance badge ──────────────────────────────────────────────────────────
function ComplianceBadge({ pct }: { pct: number }) {
  const color =
    pct >= 85 ? 'bg-green-100 text-green-700' :
    pct >= 50 ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700';
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {pct}%
    </span>
  );
}

// ── Modal: Agregar / Editar personal ─────────────────────────────────────────
function PersonalModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial?: PersonalItem;
  onSave:  (data: PersonalFormData) => Promise<void>;
  onClose: () => void;
  saving:  boolean;
}) {
  const [nombre,      setNombre]      = useState(initial?.nombre      ?? '');
  const [tipo,        setTipo]        = useState<TipoPersonal>(initial?.tipo ?? 'Médico general');
  const [vinculacion, setVinculacion] = useState<VinculacionTipo>(initial?.vinculacion ?? 'Contrato');
  const [tarjetaNum,  setTarjetaNum]  = useState(initial?.tarjetaNum  ?? '');
  const [rethusNum,   setRethusNum]   = useState(initial?.rethusNum   ?? '');
  const [telefono,    setTelefono]    = useState(initial?.telefono    ?? '');
  const [email,       setEmail]       = useState(initial?.email       ?? '');
  const [fechaIngreso,setFechaIngreso]= useState(initial?.fechaIngreso ?? '');
  const [notas,       setNotas]       = useState(initial?.notas       ?? '');
  const [activo,      setActivo]      = useState(initial?.activo      ?? true);
  const [docs,        setDocs]        = useState<PersonalDocs>(initial?.docs ?? { ...EMPTY_DOCS });
  const [firmaUrl,    setFirmaUrl]    = useState(initial?.firmaUrl    ?? '');

  // Canvas para firma
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing   = useRef(false);
  const [showCanvas, setShowCanvas] = useState(false);

  function toggleDoc(k: keyof PersonalDocs) {
    setDocs(d => ({ ...d, [k]: !d[k] }));
  }

  // ── Canvas firma ────────────────────────────────────────────────────────────
  function startDraw(e: React.MouseEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const r = canvasRef.current!.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
  }
  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const r = canvasRef.current!.getBoundingClientRect();
    ctx.lineWidth   = 2;
    ctx.strokeStyle = '#0f766e';
    ctx.lineTo(e.clientX - r.left, e.clientY - r.top);
    ctx.stroke();
  }
  function endDraw() {
    drawing.current = false;
    setFirmaUrl(canvasRef.current?.toDataURL() ?? '');
  }
  function clearCanvas() {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setFirmaUrl('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    await onSave({ nombre: nombre.trim(), tipo, vinculacion, tarjetaNum, rethusNum,
                   telefono, email, fechaIngreso, notas, activo, docs, firmaUrl });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
         onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h3 className="text-base font-bold text-gray-800">
            {initial ? 'Editar profesional' : 'Agregar profesional'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Datos básicos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={LABEL}>Nombre completo *</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)}
                     required placeholder="Ej: Dr. Juan Pérez" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Tipo de profesional</label>
              <select value={tipo} onChange={e => setTipo(e.target.value as TipoPersonal)} className={INPUT}>
                {TIPOS_PERSONAL.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Tipo de vinculación</label>
              <select value={vinculacion} onChange={e => setVinculacion(e.target.value as VinculacionTipo)} className={INPUT}>
                {VINCULACION_TIPOS.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>N° Tarjeta profesional</label>
              <input value={tarjetaNum} onChange={e => setTarjetaNum(e.target.value)}
                     placeholder="TP-00000" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>N° RETHUS</label>
              <input value={rethusNum} onChange={e => setRethusNum(e.target.value)}
                     placeholder="R-00000" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Teléfono</label>
              <input value={telefono} onChange={e => setTelefono(e.target.value)}
                     placeholder="300 000 0000" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                     placeholder="nombre@ejemplo.com" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Fecha de ingreso</label>
              <input type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} className={INPUT} />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="activo" checked={activo} onChange={e => setActivo(e.target.checked)}
                     className="w-4 h-4 text-teal-600" />
              <label htmlFor="activo" className="text-sm text-gray-700">Activo</label>
            </div>
          </div>

          {/* Documentos */}
          <div>
            <label className={LABEL}>Documentos de hoja de vida — Res. 3100/2019 Est. 1</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(Object.keys(DOCS_LABELS) as (keyof PersonalDocs)[]).map(k => (
                <label key={k} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer
                                          bg-gray-50 border border-gray-200 rounded-lg px-3 py-2
                                          hover:border-teal-300 transition-colors">
                  <input type="checkbox" checked={docs[k]} onChange={() => toggleDoc(k)}
                         className="w-4 h-4 text-teal-600" />
                  {DOCS_LABELS[k]}
                </label>
              ))}
            </div>
          </div>

          {/* Firma digital */}
          <div>
            <label className={LABEL}>Firma digital</label>
            {firmaUrl && !showCanvas ? (
              <div className="flex items-center gap-3">
                <img src={firmaUrl} alt="firma" className="h-16 border border-gray-200 rounded-lg bg-white px-2" />
                <button type="button" onClick={() => { setShowCanvas(true); clearCanvas(); }}
                        className="text-xs text-teal-600 hover:underline">Cambiar firma</button>
              </div>
            ) : (
              <div>
                <button type="button" onClick={() => setShowCanvas(!showCanvas)}
                        className="text-xs text-teal-600 hover:underline mb-2">
                  {showCanvas ? 'Ocultar canvas' : '+ Dibujar firma'}
                </button>
                {showCanvas && (
                  <div className="border-2 border-dashed border-teal-300 rounded-xl p-2 bg-teal-50">
                    <canvas ref={canvasRef} width={460} height={120}
                            className="w-full bg-white rounded-lg cursor-crosshair border border-gray-200"
                            onMouseDown={startDraw} onMouseMove={draw}
                            onMouseUp={endDraw} onMouseLeave={endDraw} />
                    <div className="flex gap-2 mt-2">
                      <button type="button" onClick={clearCanvas}
                              className="text-xs text-gray-500 hover:text-gray-700 underline">Limpiar</button>
                      <span className="text-xs text-gray-400">Dibuja con el mouse</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className={LABEL}>Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)}
                      rows={2} className={`${INPUT} resize-none`}
                      placeholder="Observaciones adicionales…" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
            <button type="submit" disabled={saving}
                    className="px-5 py-2 text-sm bg-teal-600 text-white rounded-xl font-semibold
                               hover:bg-teal-700 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tarjeta de profesional ────────────────────────────────────────────────────
function PersonalCard({
  p,
  onEdit,
}: {
  p:      PersonalItem;
  onEdit: (p: PersonalItem) => void;
}) {
  const pct = docCompliance(p.docs);

  return (
    <div className={`bg-white rounded-xl border-2 p-4 flex flex-col gap-3 transition-all
                     ${p.activo ? 'border-gray-200 hover:border-teal-300' : 'border-gray-100 opacity-60'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-800 text-sm truncate">{p.nombre}</p>
            {!p.activo && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactivo</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{p.tipo} · {p.vinculacion}</p>
          {p.tarjetaNum && (
            <p className="text-xs text-gray-400 flex items-center gap-1 flex-wrap">
              TP: {p.tarjetaNum}
              <a href={`https://www.rethus.minsalud.gov.co/Consultas/Registro`}
                 target="_blank" rel="noopener noreferrer"
                 className="text-teal-600 hover:text-teal-700 hover:underline font-medium ml-1"
                 title="Verificar en RETHUS — Ministerio de Salud (Res. 1732/2026 Art. 10)">
                Verificar RETHUS ↗
              </a>
            </p>
          )}
          {!p.tarjetaNum && (
            <a href="https://www.rethus.minsalud.gov.co/Consultas/Registro"
               target="_blank" rel="noopener noreferrer"
               className="text-xs text-teal-600 hover:underline">
              Consultar RETHUS ↗
            </a>
          )}
        </div>
        <ComplianceBadge pct={pct} />
      </div>

      {/* Docs */}
      <div className="flex flex-wrap gap-1">
        {(Object.keys(DOCS_LABELS) as (keyof PersonalDocs)[]).map(k => (
          <span key={k}
                className={`text-[10px] px-1.5 py-0.5 rounded
                            ${p.docs[k] ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
            {p.docs[k] ? '✓' : '✗'} {DOCS_LABELS[k].split(' ')[0]}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        {p.firmaUrl
          ? <img src={p.firmaUrl} alt="firma" className="h-8 border border-gray-200 rounded px-1 bg-white" />
          : <span className="text-xs text-gray-400 italic">Sin firma digital</span>
        }
        <button onClick={() => onEdit(p)}
                className="text-xs text-teal-600 hover:underline font-medium">Editar</button>
      </div>
    </div>
  );
}

// ── Modal: Nueva sesión de capacitación ──────────────────────────────────────
function CapacitacionModal({
  personal,
  onSave,
  onClose,
  saving,
}: {
  personal: PersonalItem[];
  onSave:   (data: Omit<CapacitacionSesion, 'id' | 'uid' | 'nit' | 'creadoEn'>) => Promise<void>;
  onClose:  () => void;
  saving:   boolean;
}) {
  const [tema,       setTema]       = useState<TemaCapacitacion>('Seguridad del paciente');
  const [temaCustom, setTemaCustom] = useState('');
  const [instructor, setInstructor] = useState('');
  const [fecha,      setFecha]      = useState(new Date().toISOString().slice(0, 10));
  const [duracion,   setDuracion]   = useState('');
  const [lugar,      setLugar]      = useState('');
  const [acta,       setActa]       = useState('');
  const [asistentes, setAsistentes] = useState<AsistenteEntry[]>(
    personal.filter(p => p.activo).map(p => ({
      personalId: p.id, nombre: p.nombre, firmaUrl: p.firmaUrl, asistio: true,
    }))
  );

  function toggleAsistente(id: string) {
    setAsistentes(a => a.map(e => e.personalId === id ? { ...e, asistio: !e.asistio } : e));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const temaFinal = tema === 'Otro' ? (temaCustom.trim() || 'Otro') : tema;
    await onSave({ tema: temaFinal, instructor: instructor.trim(), fecha, duracion, lugar, acta, asistentes });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
         onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h3 className="text-base font-bold text-gray-800">Nueva sesión de capacitación</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className={LABEL}>Tema *</label>
            <select value={tema} onChange={e => setTema(e.target.value as TemaCapacitacion)} className={INPUT}>
              {TEMAS_CAPACITACION.map(t => <option key={t}>{t}</option>)}
            </select>
            {tema === 'Otro' && (
              <input value={temaCustom} onChange={e => setTemaCustom(e.target.value)}
                     placeholder="Especifique el tema…" className={`${INPUT} mt-2`} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Instructor</label>
              <input value={instructor} onChange={e => setInstructor(e.target.value)}
                     placeholder="Nombre del instructor" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Fecha *</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} required className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Duración</label>
              <input value={duracion} onChange={e => setDuracion(e.target.value)}
                     placeholder="Ej: 2 horas" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Lugar</label>
              <input value={lugar} onChange={e => setLugar(e.target.value)}
                     placeholder="Sala / Virtual" className={INPUT} />
            </div>
          </div>

          {/* Lista de asistentes */}
          {asistentes.length > 0 && (
            <div>
              <label className={LABEL}>Lista de asistencia</label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {asistentes.map(a => (
                  <label key={a.personalId}
                         className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer
                                    hover:bg-gray-50 rounded px-2 py-1">
                    <input type="checkbox" checked={a.asistio} onChange={() => toggleAsistente(a.personalId)}
                           className="w-4 h-4 text-teal-600" />
                    <span className="flex-1">{a.nombre}</span>
                    {a.firmaUrl && (
                      <img src={a.firmaUrl} alt="firma" className="h-6 border border-gray-200 rounded bg-white px-1" />
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={LABEL}>Resumen / Acta</label>
            <textarea value={acta} onChange={e => setActa(e.target.value)}
                      rows={3} className={`${INPUT} resize-none`}
                      placeholder="Temas tratados, conclusiones, compromisos…" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
            <button type="submit" disabled={saving}
                    className="px-5 py-2 text-sm bg-teal-600 text-white rounded-xl font-semibold
                               hover:bg-teal-700 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Registrar sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tarjeta de sesión ─────────────────────────────────────────────────────────
function SesionCard({ s }: { s: CapacitacionSesion }) {
  const [open, setOpen] = useState(false);
  const asistieron = s.asistentes.filter(a => a.asistio).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button onClick={() => setOpen(!open)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50">
        <div>
          <p className="font-semibold text-gray-800 text-sm">{s.tema}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {s.fecha} · {s.instructor || 'Sin instructor'} · {asistieron}/{s.asistentes.length} asistentes
          </p>
        </div>
        <span className="text-gray-400 text-lg">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-3">
          {s.lugar && <p className="text-xs text-gray-600">📍 {s.lugar}{s.duracion ? ` · ⏱ ${s.duracion}` : ''}</p>}
          {s.acta && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-700 whitespace-pre-wrap">{s.acta}</div>
          )}
          {s.asistentes.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Lista de asistencia</p>
              <div className="grid grid-cols-2 gap-2">
                {s.asistentes.map(a => (
                  <div key={a.personalId}
                       className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2
                                   ${a.asistio ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-400'}`}>
                    <span>{a.asistio ? '✓' : '✗'}</span>
                    <span className="flex-1 truncate">{a.nombre}</span>
                    {a.firmaUrl && a.asistio && (
                      <img src={a.firmaUrl} alt="firma"
                           className="h-5 border border-green-200 rounded bg-white px-0.5" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => window.print()}
            className="text-xs text-teal-600 hover:underline"
          >
            🖨️ Imprimir acta
          </button>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
const TABS: TabItem[] = [
  { value: 'personal',       label: '👤 Personal' },
  { value: 'capacitaciones', label: '📚 Capacitaciones' },
];

export default function PersonalPage() {
  const { user, nit, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  const {
    personal, loading: persLoading,
    addPersonal, updatePersonal,
  } = usePersonal(uid, nit);

  const {
    sesiones, loading: sesLoading,
    addSesion,
  } = useCapacitaciones(uid, nit);

  const { toast, show: showToast } = useToast();

  const [tab,          setTab]          = useState('personal');
  const [showModal,    setShowModal]    = useState(false);
  const [editTarget,   setEditTarget]   = useState<PersonalItem | undefined>();
  const [showCapModal, setShowCapModal] = useState(false);
  const [saving,       setSaving]       = useState(false);

  // KPIs
  const activos    = personal.filter(p => p.activo).length;
  const sinDocs    = personal.filter(p => docCompliance(p.docs) < 85).length;
  const totalCap   = sesiones.length;

  const handleSavePersonal = useCallback(async (data: PersonalFormData) => {
    setSaving(true);
    try {
      if (editTarget) {
        await updatePersonal(editTarget.id, data);
        showToast('Profesional actualizado ✓', 'success');
      } else {
        await addPersonal(data);
        showToast('Profesional agregado ✓', 'success');
      }
    } catch {
      showToast('Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }, [editTarget, addPersonal, updatePersonal, showToast]);

  const handleSaveSesion = useCallback(async (data: Omit<CapacitacionSesion, 'id' | 'uid' | 'nit' | 'creadoEn'>) => {
    setSaving(true);
    try {
      await addSesion(data);
      showToast('Sesión registrada ✓', 'success');
    } catch {
      showToast('Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }, [addSesion, showToast]);

  const loading = authLoading || persLoading || sesLoading;

  if (loading) return (
    <div className="p-8 flex justify-center">
      <LoadingSpinner />
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <SectionHeader
        title="Talento Humano"
        subtitle="Res. 1732/2026 Art. 10 · Res. 3100/2019 Est. 1 — Gestión del personal asistencial y administrativo"
        actions={
          tab === 'personal' ? (
            <button
              onClick={() => { setEditTarget(undefined); setShowModal(true); }}
              className="px-4 py-2 bg-teal-600 text-white text-sm rounded-xl font-semibold
                         hover:bg-teal-700 transition-colors"
            >
              + Agregar profesional
            </button>
          ) : (
            <button
              onClick={() => setShowCapModal(true)}
              className="px-4 py-2 bg-teal-600 text-white text-sm rounded-xl font-semibold
                         hover:bg-teal-700 transition-colors"
            >
              + Nueva sesión
            </button>
          )
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Personal activo"     value={activos}   />
        <KpiCard label="Docs incompletos"    value={sinDocs}   colorClass={sinDocs > 0 ? 'text-amber-600' : 'text-green-700'} />
        <KpiCard label="Capacitaciones"      value={totalCap}  />
      </div>

      {/* Banner Res. 1732/2026 */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
        <span className="text-amber-500 text-lg mt-0.5 shrink-0">⚠️</span>
        <div>
          <p className="font-semibold text-amber-800">Res. 1732/2026 en vigor desde el 5 ago. 2026</p>
          <p className="text-amber-700 mt-0.5">
            La nueva norma exige <strong>verificación RETHUS online</strong> con evidencia conservada (no basta copia física de la tarjeta).
            Período de transición hasta el <strong>5 agosto 2027</strong>.{' '}
            <a href="https://www.rethus.minsalud.gov.co/Consultas/Registro"
               target="_blank" rel="noopener noreferrer"
               className="text-teal-700 underline font-medium">
              Consultar RETHUS oficial ↗
            </a>
          </p>
        </div>
      </div>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {/* ── Tab: Personal ─────────────────────────────────────────────── */}
      {tab === 'personal' && (
        personal.length === 0 ? (
          <EmptyState
            icon="👤"
            title="Sin personal registrado"
            description="Agrega el equipo asistencial y administrativo de la IPS con sus documentos de hoja de vida."
            action={
              <button onClick={() => setShowModal(true)}
                      className="px-4 py-2 bg-teal-600 text-white text-sm rounded-xl font-semibold hover:bg-teal-700">
                + Agregar profesional
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personal.map(p => (
              <PersonalCard
                key={p.id}
                p={p}
                onEdit={p => { setEditTarget(p); setShowModal(true); }}
              />
            ))}
          </div>
        )
      )}

      {/* ── Tab: Capacitaciones ───────────────────────────────────────── */}
      {tab === 'capacitaciones' && (
        sesiones.length === 0 ? (
          <EmptyState
            icon="📚"
            title="Sin capacitaciones registradas"
            description="Registra las sesiones de formación del equipo con lista de asistencia y acta."
            action={
              <button onClick={() => setShowCapModal(true)}
                      className="px-4 py-2 bg-teal-600 text-white text-sm rounded-xl font-semibold hover:bg-teal-700">
                + Nueva sesión
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {sesiones.map(s => <SesionCard key={s.id} s={s} />)}
          </div>
        )
      )}

      {/* Modales */}
      {showModal && (
        <PersonalModal
          initial={editTarget}
          onSave={handleSavePersonal}
          onClose={() => setShowModal(false)}
          saving={saving}
        />
      )}
      {showCapModal && (
        <CapacitacionModal
          personal={personal}
          onSave={handleSaveSesion}
          onClose={() => setShowCapModal(false)}
          saving={saving}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
