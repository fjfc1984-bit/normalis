'use client';

/**
 * app/admin/crm/page.tsx
 * CRM interno de NormaLis — embudo unificado de prospectos, leads y
 * oportunidades hacia piloto/cliente. Reemplaza los tabs CRM/Leads
 * embebidos en /admin (que seguían leyendo `prospectos`/`leads` por
 * separado, sin un pipeline único).
 */

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import { useCRM, useCRMNotas, type NuevoContacto } from '@/lib/useCRM';
import { migrarDatosLegadosACRM } from '@/lib/crmMigration';
import {
  CRM_ETAPAS, ETAPA_LABEL, ETAPA_COLOR, FUENTE_LABEL,
  type CRMEtapa, type CRMFuente, type CRMContacto,
} from '@/lib/crmTypes';
import Button from '@/components/ui/Button';
import { Toast, useToast } from '@/components/ui/Toast';

const ETAPAS_ACTIVAS: CRMEtapa[] = CRM_ETAPAS.filter(e => e !== 'cliente' && e !== 'perdido');

function fmtDate(ts: CRMContacto['createdAt']): string {
  if (!ts) return '—';
  try { return ts.toDate().toLocaleDateString('es-CO'); } catch { return '—'; }
}

/** Sin próxima acción definida, o con fecha ya vencida — el contacto se puede "perder". */
function estaSinSeguimiento(c: CRMContacto): boolean {
  if (!ETAPAS_ACTIVAS.includes(c.etapa)) return false;
  if (!c.proximaAccion) return true;
  if (c.fechaProximaAccion && c.fechaProximaAccion.toMillis() < Date.now()) return true;
  return false;
}

const FORM_VACIO: NuevoContacto = {
  nombre: '', contactoNombre: '', email: '', telefono: '', ciudad: '',
  tipoIPS: '', fuente: 'otro',
};

export default function CRMPage() {
  const { user, rol, loading } = useAuth();
  const router = useRouter();
  const { toast, show } = useToast();
  const { contactos, loading: loadingContactos, crear, cambiarEtapa, actualizar } = useCRM();

  const [migrando, setMigrando] = useState(false);
  const [migroYa, setMigroYa]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState<NuevoContacto>(FORM_VACIO);
  const [seleccionado, setSeleccionado] = useState<CRMContacto | null>(null);

  useEffect(() => {
    if (!loading && rol !== 'admin') router.push('/login');
  }, [loading, rol, router]);

  // Migración automática e idempotente de prospectos/leads existentes.
  useEffect(() => {
    if (loading || rol !== 'admin' || migroYa) return;
    setMigroYa(true);
    setMigrando(true);
    migrarDatosLegadosACRM()
      .then(({ migrados }) => { if (migrados > 0) show(`${migrados} contacto(s) migrado(s) desde prospectos/leads`, 'success'); })
      .catch(() => show('No se pudo migrar prospectos/leads automáticamente', 'error'))
      .finally(() => setMigrando(false));
  }, [loading, rol, migroYa, show]);

  const columnas = useMemo(() => {
    const map = new Map<CRMEtapa, CRMContacto[]>(CRM_ETAPAS.map(e => [e, []]));
    for (const c of contactos) map.get(c.etapa)?.push(c);
    return map;
  }, [contactos]);

  const sinSeguimiento = useMemo(() => contactos.filter(estaSinSeguimiento), [contactos]);

  async function crearContacto(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre) return;
    setSaving(true);
    try {
      await crear(form);
      setForm(FORM_VACIO);
      setShowForm(false);
      show('Contacto agregado', 'success');
    } catch { show('Error al guardar', 'error'); }
    finally { setSaving(false); }
  }

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast toast={toast} />

      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</Link>
          <span className="text-2xl">📇</span>
          <span className="font-bold text-primary-700 text-lg">CRM NormaLis</span>
          {migrando && <span className="text-xs text-gray-400">migrando datos existentes…</span>}
        </div>
        <Button onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancelar' : '+ Nuevo contacto'}
        </Button>
      </header>

      <main className="max-w-[1600px] mx-auto p-6">
        {sinSeguimiento.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 mb-6 text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>
              <strong>{sinSeguimiento.length}</strong> contacto{sinSeguimiento.length !== 1 ? 's' : ''} sin
              próxima acción definida (o con fecha vencida) — riesgo de que se pierdan sin seguimiento.
            </span>
          </div>
        )}

        {showForm && (
          <form onSubmit={crearContacto} className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {([
                { key: 'nombre',         label: 'Nombre IPS *', required: true },
                { key: 'contactoNombre', label: 'Persona contacto', required: false },
                { key: 'email',          label: 'Email', required: false },
                { key: 'telefono',       label: 'Teléfono', required: false },
                { key: 'ciudad',         label: 'Ciudad', required: false },
                { key: 'tipoIPS',        label: 'Tipo IPS', required: false },
              ] as const).map(({ key, label, required }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    required={!!required}
                    value={form[key] ?? ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                               focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fuente</label>
                <select
                  value={form.fuente}
                  onChange={e => setForm(f => ({ ...f, fuente: e.target.value as CRMFuente }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {Object.entries(FUENTE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <Button type="submit" loading={saving}>Guardar</Button>
          </form>
        )}

        {loadingContactos ? (
          <p className="text-gray-400 py-12 text-center">Cargando…</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {CRM_ETAPAS.map(etapa => {
              const items = columnas.get(etapa) ?? [];
              return (
                <div key={etapa} className="flex-shrink-0 w-72">
                  <div className={`px-3 py-2 rounded-t-lg border text-xs font-bold uppercase tracking-wide ${ETAPA_COLOR[etapa]}`}>
                    {ETAPA_LABEL[etapa]} · {items.length}
                  </div>
                  <div className="bg-gray-100/60 rounded-b-lg border border-t-0 border-gray-200 p-2 min-h-[120px] space-y-2">
                    {items.map(c => (
                      <div
                        key={c.id}
                        onClick={() => setSeleccionado(c)}
                        className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:border-primary-300 hover:shadow-sm transition-all"
                      >
                        <p className="font-medium text-gray-800 text-sm truncate">{c.nombre || '—'}</p>
                        <p className="text-xs text-gray-400 truncate">{c.contactoNombre} · {c.ciudad}</p>
                        {estaSinSeguimiento(c) ? (
                          <p className="text-[10px] text-amber-700 mt-1.5">⚠️ Sin seguimiento</p>
                        ) : c.proximaAccion ? (
                          <p className="text-[10px] text-gray-500 mt-1.5 truncate">
                            📅 {c.proximaAccion}{c.fechaProximaAccion ? ` · ${c.fechaProximaAccion.toDate().toLocaleDateString('es-CO')}` : ''}
                          </p>
                        ) : null}
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-100">
                            {FUENTE_LABEL[c.fuente] ?? c.fuente}
                          </span>
                          <select
                            value={c.etapa}
                            onClick={e => e.stopPropagation()}
                            onChange={e => cambiarEtapa(c.id, e.target.value as CRMEtapa)}
                            className="text-[11px] px-1.5 py-1 border border-gray-200 rounded
                                       focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            {CRM_ETAPAS.map(e => <option key={e} value={e}>{ETAPA_LABEL[e]}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <p className="text-xs text-gray-300 text-center py-6">Sin contactos</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {seleccionado && (
        <ContactoDetalle
          contacto={seleccionado}
          autor={user.email ?? ''}
          onClose={() => setSeleccionado(null)}
          actualizar={actualizar}
        />
      )}
    </div>
  );
}

function ContactoDetalle({ contacto, autor, onClose, actualizar }: {
  contacto: CRMContacto; autor: string; onClose: () => void;
  actualizar: (id: string, cambios: Partial<CRMContacto>) => Promise<void>;
}) {
  const { notas, loading, agregarNota, eliminarNota } = useCRMNotas(contacto.id);
  const [texto, setTexto]   = useState('');
  const [saving, setSaving] = useState(false);

  const [proximaAccion, setProximaAccion] = useState(contacto.proximaAccion ?? '');
  const [fechaAccion, setFechaAccion]     = useState(
    contacto.fechaProximaAccion ? contacto.fechaProximaAccion.toDate().toISOString().slice(0, 10) : ''
  );
  const [savingAccion, setSavingAccion] = useState(false);

  async function guardarAccion(e: React.FormEvent) {
    e.preventDefault();
    setSavingAccion(true);
    try {
      await actualizar(contacto.id, {
        proximaAccion: proximaAccion.trim(),
        fechaProximaAccion: fechaAccion ? Timestamp.fromDate(new Date(fechaAccion + 'T00:00:00')) : null,
      });
    } finally { setSavingAccion(false); }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setSaving(true);
    try {
      await agregarNota(contacto.id, texto.trim(), autor);
      setTexto('');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-end z-40" onClick={onClose}>
      <div
        className="bg-white h-full w-full max-w-md shadow-xl p-6 overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{contacto.nombre}</h2>
            <p className="text-sm text-gray-400">{contacto.contactoNombre}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-2 text-sm text-gray-600 mb-6">
          {contacto.email && <p>✉️ <a href={`mailto:${contacto.email}`} className="text-primary-600 hover:underline">{contacto.email}</a></p>}
          {contacto.telefono && <p>📞 {contacto.telefono}</p>}
          {contacto.ciudad && <p>📍 {contacto.ciudad}{contacto.tipoIPS ? ` · ${contacto.tipoIPS}` : ''}</p>}
          <p>🏷️ {FUENTE_LABEL[contacto.fuente] ?? contacto.fuente}</p>
          <p className="text-xs text-gray-400">Creado {fmtDate(contacto.createdAt)}</p>
        </div>

        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Próxima acción</h3>
        <form onSubmit={guardarAccion} className="space-y-2 mb-6">
          <input
            value={proximaAccion}
            onChange={e => setProximaAccion(e.target.value)}
            placeholder="Ej: Llamar, enviar propuesta…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={fechaAccion}
              onChange={e => setFechaAccion(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Button type="submit" loading={savingAccion} variant="secondary">Guardar</Button>
          </div>
        </form>

        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Notas</h3>
        <form onSubmit={enviar} className="flex gap-2 mb-4">
          <input
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Agregar una nota…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button type="submit" loading={saving}>Agregar</Button>
        </form>

        {loading ? (
          <p className="text-gray-400 text-sm">Cargando notas…</p>
        ) : notas.length === 0 ? (
          <p className="text-gray-300 text-sm">Sin notas todavía.</p>
        ) : (
          <div className="space-y-3">
            {notas.map(n => (
              <div key={n.id} className="border-l-2 border-gray-100 pl-3 flex items-start justify-between gap-2 group">
                <div>
                  <p className="text-sm text-gray-700">{n.texto}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.autor} · {fmtDate(n.createdAt)}</p>
                </div>
                <button
                  onClick={() => eliminarNota(n.id)}
                  className="text-gray-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  title="Eliminar nota"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
