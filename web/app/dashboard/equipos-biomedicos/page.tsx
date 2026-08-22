'use client';

/**
 * web/app/dashboard/equipos-biomedicos/page.tsx
 * CMMS — Equipos Biomédicos: inventario, hoja de vida y programa de
 * mantenimiento preventivo/correctivo.
 * Base legal: Res. 1732/2026 (Tomo II — Estándar de Dotación) ·
 * Decreto 4725/2005 (registro sanitario / permiso de comercialización).
 *
 * NOTA REGULATORIA: el Estándar de Dotación exige registro del equipo con su
 * condición sanitaria vigente, programa de mantenimiento preventivo según
 * fabricante, hoja de vida con mantenimientos preventivos y correctivos,
 * ejecución por personal profesional/tecnólogo/técnico competente, y
 * capacitación del personal en el uso del equipo. Este módulo NO modela
 * calibración/metrología legal como criterio de habilitación obligatorio —
 * el texto disponible del Tomo II no lo exige de forma explícita como
 * condición independiente; verificar con la Secretaría de Salud territorial
 * si aplica para equipos específicos de tu portafolio de servicios.
 */

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useEquiposBiomedicos } from '@/lib/useEquiposBiomedicos';
import type {
  Equipo, EquipoFormData, Mantenimiento, MantenimientoFormData,
} from '@/lib/equipoTypes';
import {
  EQUIPO_ESTADO_CFG, EQUIPO_EMPTY_FORM, MANTENIMIENTO_EMPTY_FORM,
  RESPONSABLE_PERFIL_LABEL,
} from '@/lib/equipoTypes';
import {
  SERVICIOS_SALUD_3100, TODOS_LOS_SERVICIOS_SALUD, EQUIPOS_TIPICOS_POR_SERVICIO, OTRO_VALOR,
} from '@/lib/equiposCatalogo';
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

// ── Modal: nuevo equipo / editar equipo ────────────────────────────────────
function EquipoFormModal({
  equipo, onSave, onClose,
}: {
  equipo?: Equipo;
  onSave: (data: EquipoFormData) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<EquipoFormData>(
    equipo
      ? {
          nombre: equipo.nombre, marca: equipo.marca, modelo: equipo.modelo, serie: equipo.serie,
          servicioAsociado: equipo.servicioAsociado, estado: equipo.estado,
          registroSanitario: equipo.registroSanitario,
          registroSanitarioVigenciaHasta: equipo.registroSanitarioVigenciaHasta,
          fechaAdquisicion: equipo.fechaAdquisicion,
          frecuenciaMantenimientoMeses: equipo.frecuenciaMantenimientoMeses,
          personalCapacitado: equipo.personalCapacitado,
        }
      : EQUIPO_EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const esEdicion = !!equipo;

  // ── Servicio / equipo: catálogo con opción "Otro (especificar)" ──
  // Si el equipo ya existente tiene un servicio/nombre que no está en el
  // catálogo (dato antiguo, capturado como texto libre antes de este
  // cambio), arrancamos en modo "Otro" con ese valor precargado, en vez de
  // perderlo silenciosamente.
  const [servicioOtro, setServicioOtro] = useState(
    () => !!form.servicioAsociado && !TODOS_LOS_SERVICIOS_SALUD.includes(form.servicioAsociado)
  );
  const equiposDelServicio = EQUIPOS_TIPICOS_POR_SERVICIO[form.servicioAsociado] || [];
  const [nombreOtro, setNombreOtro] = useState(
    () => !!form.nombre && !equiposDelServicio.includes(form.nombre)
  );
  // Borrador del texto libre de "Otro" — se conserva aunque el usuario
  // navegue el catálogo y vuelva a "Otro" después, para no perder lo que
  // ya había escrito (o el valor heredado de un registro antiguo).
  const [servicioOtroDraft, setServicioOtroDraft] = useState(servicioOtro ? form.servicioAsociado : '');
  const [nombreOtroDraft, setNombreOtroDraft] = useState(nombreOtro ? form.nombre : '');

  function set<K extends keyof EquipoFormData>(k: K, v: EquipoFormData[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function handleServicioSelect(v: string) {
    if (v === OTRO_VALOR) {
      setServicioOtro(true);
      set('servicioAsociado', servicioOtroDraft);
      return;
    }
    setServicioOtro(false);
    set('servicioAsociado', v);
    // Si el equipo ya elegido no aplica al nuevo servicio, se limpia para
    // que el usuario vuelva a elegir del catálogo filtrado — pero solo si
    // no estaba en modo "Otro" (un nombre personalizado no se descarta).
    const opts = EQUIPOS_TIPICOS_POR_SERVICIO[v] || [];
    if (!nombreOtro && form.nombre && !opts.includes(form.nombre)) {
      set('nombre', '');
    }
  }

  function handleNombreSelect(v: string) {
    if (v === OTRO_VALOR) {
      setNombreOtro(true);
      set('nombre', nombreOtroDraft);
      return;
    }
    setNombreOtro(false);
    set('nombre', v);
  }

  function handleServicioOtroInput(v: string) {
    set('servicioAsociado', v);
    setServicioOtroDraft(v);
  }

  function handleNombreOtroInput(v: string) {
    set('nombre', v);
    setNombreOtroDraft(v);
  }

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 sticky top-0">
          <p className="text-sm font-bold text-gray-800">
            {esEdicion ? `✏️ Editar — ${equipo!.nombre}` : '🩺 Nuevo equipo biomédico'}
          </p>
        </div>
        <form onSubmit={handle} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={LABEL}>Servicio / área asociada</label>
              <select className={INPUT} value={servicioOtro ? OTRO_VALOR : form.servicioAsociado}
                      onChange={e => handleServicioSelect(e.target.value)}>
                <option value="">— Seleccionar servicio —</option>
                {SERVICIOS_SALUD_3100.map(g => (
                  <optgroup key={g.grupo} label={g.grupo}>
                    {g.servicios.map(s => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                ))}
                <option value={OTRO_VALOR}>Otro (especificar)</option>
              </select>
              {servicioOtro && (
                <input className={`${INPUT} mt-2`} value={form.servicioAsociado}
                       onChange={e => handleServicioOtroInput(e.target.value)}
                       placeholder="Nombre del servicio/área" />
              )}
              <p className="text-[11px] text-gray-400 mt-1">
                Servicios según nomenclatura Res. 3100/2019 (Anexo Técnico No. 1).
              </p>
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Nombre del equipo *</label>
              <select className={INPUT} value={nombreOtro ? OTRO_VALOR : form.nombre}
                      onChange={e => handleNombreSelect(e.target.value)}>
                <option value="">— Seleccionar equipo —</option>
                {equiposDelServicio.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                <option value={OTRO_VALOR}>Otro (especificar)</option>
              </select>
              {nombreOtro && (
                <input className={`${INPUT} mt-2`} value={form.nombre}
                       onChange={e => handleNombreOtroInput(e.target.value)}
                       placeholder="Monitor de signos vitales" required />
              )}
              {!servicioOtro && !form.servicioAsociado && (
                <p className="text-[11px] text-gray-400 mt-1">Elige primero el servicio para ver el equipo típico de esa área, o usa &quot;Otro&quot;.</p>
              )}
            </div>
            <div>
              <label className={LABEL}>Marca</label>
              <input className={INPUT} value={form.marca} onChange={e => set('marca', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Modelo</label>
              <input className={INPUT} value={form.modelo} onChange={e => set('modelo', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Serie</label>
              <input className={INPUT} value={form.serie} onChange={e => set('serie', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <div className="col-span-2">
              <label className={LABEL}>Registro sanitario / permiso comercialización (Dec. 4725/2005)</label>
              <input className={INPUT} value={form.registroSanitario} onChange={e => set('registroSanitario', e.target.value)}
                     placeholder="No. de registro INVIMA" />
            </div>
            <div>
              <label className={LABEL}>Vigente hasta</label>
              <input type="date" className={INPUT} value={form.registroSanitarioVigenciaHasta}
                     onChange={e => set('registroSanitarioVigenciaHasta', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Fecha de adquisición</label>
              <input type="date" className={INPUT} value={form.fechaAdquisicion}
                     onChange={e => set('fechaAdquisicion', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <div>
              <label className={LABEL}>Mantenimiento preventivo cada (meses)</label>
              <input type="number" min={1} className={INPUT} value={form.frecuenciaMantenimientoMeses}
                     onChange={e => set('frecuenciaMantenimientoMeses', Number(e.target.value) || 1)} />
            </div>
            <div>
              <label className={LABEL}>Estado</label>
              <select className={INPUT} value={form.estado} onChange={e => set('estado', e.target.value as EquipoFormData['estado'])}>
                {Object.entries(EQUIPO_ESTADO_CFG).map(([k, cfg]) => (
                  <option key={k} value={k}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Personal capacitado en el uso</label>
              <input className={INPUT} value={form.personalCapacitado} onChange={e => set('personalCapacitado', e.target.value)}
                     placeholder="Nombres separados por coma" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className={BTN_S}>Cancelar</button>
            <button type="submit" disabled={saving} className={BTN_P}>
              {saving ? 'Guardando…' : (esEdicion ? 'Guardar cambios' : 'Guardar equipo')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: registrar mantenimiento ────────────────────────────────────────
function MantenimientoFormModal({
  equipo, onSave, onClose,
}: {
  equipo: Equipo;
  onSave: (data: MantenimientoFormData) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<MantenimientoFormData>({
    ...MANTENIMIENTO_EMPTY_FORM,
    fecha: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof MantenimientoFormData>(k: K, v: MantenimientoFormData[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fecha || !form.responsableNombre.trim()) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-800">🔧 Registrar mantenimiento</p>
          <p className="text-xs text-gray-400">{equipo.nombre} · {equipo.marca} {equipo.modelo}</p>
        </div>
        <form onSubmit={handle} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Tipo *</label>
              <select className={INPUT} value={form.tipo} onChange={e => set('tipo', e.target.value as MantenimientoFormData['tipo'])}>
                <option value="preventivo">Preventivo</option>
                <option value="correctivo">Correctivo</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Fecha *</label>
              <input type="date" className={INPUT} value={form.fecha} onChange={e => set('fecha', e.target.value)} required />
            </div>
          </div>
          <div>
            <label className={LABEL}>Responsable *</label>
            <input className={INPUT} value={form.responsableNombre} onChange={e => set('responsableNombre', e.target.value)}
                   placeholder="Nombre de quien ejecuta" required />
          </div>
          <div>
            <label className={LABEL}>Perfil del responsable *</label>
            <select className={INPUT} value={form.responsablePerfil} onChange={e => set('responsablePerfil', e.target.value as MantenimientoFormData['responsablePerfil'])}>
              {Object.entries(RESPONSABLE_PERFIL_LABEL).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Descripción</label>
            <textarea rows={3} className={INPUT} value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                       placeholder="Actividades realizadas, repuestos, observaciones…" />
          </div>
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-xs text-teal-700">
            Queda en la hoja de vida del equipo y actualiza el próximo mantenimiento
            ({equipo.frecuenciaMantenimientoMeses} {equipo.frecuenciaMantenimientoMeses === 1 ? 'mes' : 'meses'} después de esta fecha).
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className={BTN_S}>Cancelar</button>
            <button type="submit" disabled={saving} className={BTN_P}>{saving ? 'Guardando…' : 'Registrar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: hoja de vida ────────────────────────────────────────────────────
function HojaDeVidaModal({
  equipo, mantenimientos, onClose,
}: { equipo: Equipo; mantenimientos: Mantenimiento[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 sticky top-0">
          <p className="text-sm font-bold text-gray-800">📋 Hoja de vida — {equipo.nombre}</p>
          <p className="text-xs text-gray-400">{equipo.marca} {equipo.modelo} · Serie {equipo.serie || '—'}</p>
        </div>
        <div className="p-6 space-y-3">
          {mantenimientos.length === 0 && (
            <p className="text-sm text-gray-400 italic">Aún no hay mantenimientos registrados.</p>
          )}
          {mantenimientos.map(m => (
            <div key={m.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <StatusBadge
                  label={m.tipo === 'preventivo' ? 'Preventivo' : 'Correctivo'}
                  bg={m.tipo === 'preventivo' ? 'bg-emerald-100' : 'bg-amber-100'}
                  color={m.tipo === 'preventivo' ? 'text-emerald-700' : 'text-amber-700'}
                />
                <span className="text-xs text-gray-400">{fmtDate(m.fecha)}</span>
              </div>
              <p className="text-sm text-gray-700">{m.descripcion || '(sin descripción)'}</p>
              <p className="text-xs text-gray-400 mt-1">
                👤 {m.responsableNombre} ({RESPONSABLE_PERFIL_LABEL[m.responsablePerfil]})
              </p>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end sticky bottom-0 bg-white">
          <button onClick={onClose} className={BTN_S}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de equipo ──────────────────────────────────────────────────────
function EquipoCard({
  equipo, onRegistrarMantenimiento, onVerHojaDeVida, onEditar,
}: {
  equipo: Equipo;
  onRegistrarMantenimiento: (e: Equipo) => void;
  onVerHojaDeVida: (e: Equipo) => void;
  onEditar: (e: Equipo) => void;
}) {
  const cfg = EQUIPO_ESTADO_CFG[equipo.estado];
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🩺</span>
          <div>
            <p className="text-sm font-bold text-gray-800">{equipo.nombre}</p>
            <p className="text-xs text-gray-500">
              {[equipo.marca, equipo.modelo].filter(Boolean).join(' ') || 'Sin marca/modelo registrados'}
              {equipo.servicioAsociado && ` · ${equipo.servicioAsociado}`}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <StatusBadge label={cfg.label} bg={cfg.bg} color={cfg.color} />
              {equipo._mantenimientoVencido && equipo.estado === 'activo' && (
                <StatusBadge label="Mantenimiento vencido" bg="bg-red-100" color="text-red-700" dot dotColor="bg-red-500" />
              )}
              {equipo._registroSanitarioVencido && equipo.estado === 'activo' && (
                <StatusBadge label="Registro sanitario vencido" bg="bg-red-50" color="text-red-500" />
              )}
              <button onClick={() => onVerHojaDeVida(equipo)} className="text-xs text-teal-600 hover:underline">
                Ver hoja de vida
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => onEditar(equipo)} className={BTN_S}>
            ✏️ Editar
          </button>
          <button onClick={() => onRegistrarMantenimiento(equipo)} className={BTN_S}>
            🔧 Registrar mantenimiento
          </button>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-400">
        <span>Último mantenimiento: {fmtDate(equipo.ultimoMantenimientoFecha)}</span>
        <span>Próximo: {fmtDate(equipo.proximoMantenimiento)}</span>
        {equipo.registroSanitario && <span>Registro sanitario: {equipo.registroSanitario} (vence {fmtDate(equipo.registroSanitarioVigenciaHasta)})</span>}
      </div>
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────────────────
export default function EquiposBiomedicosPage() {
  const { user, nit, nombre: ipsNombre } = useAuth();
  const uid = user?.uid ?? null;
  const {
    equipos, loading, stats,
    createEquipo, updateEquipo, listarMantenimientos, registrarMantenimiento,
  } = useEquiposBiomedicos(uid, nit || null);
  const { toast, show } = useToast();

  const [showNuevoEquipo, setShowNuevoEquipo] = useState(false);
  const [editandoEquipo, setEditandoEquipo] = useState<Equipo | null>(null);
  const [mantenimientoEquipo, setMantenimientoEquipo] = useState<Equipo | null>(null);
  const [hojaDeVidaEquipo, setHojaDeVidaEquipo] = useState<Equipo | null>(null);
  const [hojaDeVida, setHojaDeVida] = useState<Mantenimiento[]>([]);

  async function handleCrearEquipo(data: EquipoFormData) {
    if (!uid) return;
    await createEquipo(data, uid, nit || '');
    show('🩺 Equipo registrado', 'success');
    setShowNuevoEquipo(false);
  }

  async function handleActualizarEquipo(data: EquipoFormData) {
    if (!editandoEquipo) return;
    await updateEquipo(editandoEquipo.id, data);
    show('✏️ Equipo actualizado', 'success');
    setEditandoEquipo(null);
  }

  async function handleRegistrarMantenimiento(data: MantenimientoFormData) {
    if (!mantenimientoEquipo) return;
    await registrarMantenimiento(
      mantenimientoEquipo.id, data,
      ipsNombre || user?.email || 'Usuario',
      mantenimientoEquipo.frecuenciaMantenimientoMeses,
    );
    show('🔧 Mantenimiento registrado en la hoja de vida', 'success');
    setMantenimientoEquipo(null);
  }

  async function handleVerHojaDeVida(equipo: Equipo) {
    setHojaDeVidaEquipo(equipo);
    const list = await listarMantenimientos(equipo.id);
    setHojaDeVida(list);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <SectionHeader
        title="Equipos Biomédicos"
        subtitle="Inventario, hoja de vida y mantenimiento preventivo/correctivo — Res. 1732/2026, Estándar de Dotación"
        actions={
          <button onClick={() => setShowNuevoEquipo(true)} className={BTN_P}>
            + Nuevo equipo
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Equipos"                value={stats.total}                 icon="🩺" />
        <KpiCard label="Activos"                value={stats.activos}               icon="✅" />
        <KpiCard label="Mant. al día"           value={stats.mantenimientoAlDia}    icon="🟢" colorClass="text-emerald-700" />
        <KpiCard label="Mant. vencido"          value={stats.mantenimientoVencido}  icon="⏰" colorClass={stats.mantenimientoVencido > 0 ? 'text-red-600' : 'text-gray-800'} borderColorClass={stats.mantenimientoVencido > 0 ? 'border-red-300' : 'border-gray-200'} />
        <KpiCard label="Sin reg. sanitario vig." value={stats.sinRegistroSanitarioVigente} icon="⚠️" colorClass={stats.sinRegistroSanitarioVigente > 0 ? 'text-red-600' : 'text-gray-800'} />
      </div>

      {equipos.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <p className="text-sm text-gray-500">Aún no has registrado equipos biomédicos.</p>
          <button onClick={() => setShowNuevoEquipo(true)} className={`${BTN_P} mt-4`}>+ Registrar el primero</button>
        </div>
      ) : (
        <div className="space-y-3">
          {equipos.map(equipo => (
            <EquipoCard
              key={equipo.id}
              equipo={equipo}
              onRegistrarMantenimiento={setMantenimientoEquipo}
              onVerHojaDeVida={handleVerHojaDeVida}
              onEditar={setEditandoEquipo}
            />
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
        <p className="font-bold mb-1">ℹ️ Qué exige el Estándar de Dotación</p>
        <p>
          Registro del equipo con su condición sanitaria vigente, programa de mantenimiento
          preventivo según el fabricante, hoja de vida con los mantenimientos preventivos y
          correctivos, ejecución por personal profesional/tecnólogo/técnico competente, y
          capacitación del personal en el uso del equipo. La calibración metrológica no está
          modelada aquí como criterio de habilitación obligatorio — verifica con tu Secretaría de
          Salud territorial si aplica a equipos específicos de tu portafolio.
        </p>
      </div>

      {showNuevoEquipo && (
        <EquipoFormModal onSave={handleCrearEquipo} onClose={() => setShowNuevoEquipo(false)} />
      )}

      {editandoEquipo && (
        <EquipoFormModal
          equipo={editandoEquipo}
          onSave={handleActualizarEquipo}
          onClose={() => setEditandoEquipo(null)}
        />
      )}

      {mantenimientoEquipo && (
        <MantenimientoFormModal
          equipo={mantenimientoEquipo}
          onSave={handleRegistrarMantenimiento}
          onClose={() => setMantenimientoEquipo(null)}
        />
      )}

      {hojaDeVidaEquipo && (
        <HojaDeVidaModal
          equipo={hojaDeVidaEquipo}
          mantenimientos={hojaDeVida}
          onClose={() => { setHojaDeVidaEquipo(null); setHojaDeVida([]); }}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
