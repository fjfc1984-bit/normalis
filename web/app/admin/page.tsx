/**
 * app/admin/page.tsx
 * Panel de administración — migrado de admin.html
 * 5 tabs: Solicitudes, Pilotos, CRM, Leads, Analytics
 */
'use client';

import { useEffect, useState } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  doc, updateDoc, addDoc, serverTimestamp,
  Timestamp, where,
} from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Toast, { useToast } from '@/components/ui/Toast';

/* ─── Types ─────────────────────────────────────────────────── */

type RolUsuario = 'pendiente' | 'cliente' | 'piloto' | 'rechazado' | 'admin';

interface Solicitud {
  id:             string;
  nombre:         string;
  nombreContacto: string;
  email:          string;
  telefono:       string;
  nit:            string;
  tipoIPS:        string;
  ciudad:         string;
  rol:            RolUsuario;
  fechaSolicitud: Timestamp | null;
}

interface Piloto {
  id:          string;
  nombre:      string;
  email:       string;
  nit:         string;
  ciudad:      string;
  expiresAt:   Timestamp | null;
  activo:      boolean;
  salud?:      number;
}

interface Prospecto {
  id:        string;
  nombre:    string;
  contacto:  string;
  email:     string;
  telefono:  string;
  ciudad:    string;
  estado:    string;
  notas?:    string;
  createdAt: Timestamp | null;
}

interface Lead {
  id:        string;
  nombre:    string;
  email:     string;
  telefono:  string;
  ciudad:    string;
  tipoIPS:   string;
  estado:    string;
  createdAt: Timestamp | null;
}

/* ─── Helpers ───────────────────────────────────────────────── */

function fmtDate(ts: Timestamp | null): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function diasRestantes(ts: Timestamp | null): string {
  if (!ts) return '—';
  const dias = Math.ceil((ts.toDate().getTime() - Date.now()) / 86_400_000);
  if (dias < 0) return `Vencido hace ${Math.abs(dias)}d`;
  return `${dias} días`;
}

const ROL_BADGE: Record<RolUsuario, string> = {
  pendiente:  'bg-yellow-100 text-yellow-700',
  cliente:    'bg-green-100 text-green-700',
  piloto:     'bg-blue-100 text-blue-700',
  rechazado:  'bg-red-100 text-red-700',
  admin:      'bg-purple-100 text-purple-700',
};

/* ─── Tab components ────────────────────────────────────────── */

function SolicitudesTab({ show }: { show: (m: string, t: 'success'|'error') => void }) {
  const [items, setItems] = useState<Solicitud[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'usuarios'),
      where('rol', '==', 'pendiente'),
      orderBy('fechaSolicitud', 'desc'),
    );
    return onSnapshot(q, snap =>
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Solicitud[]),
    );
  }, []);

  async function aprobar(id: string, rol: 'cliente' | 'piloto') {
    await updateDoc(doc(db, 'usuarios', id), { rol, activo: true });
    show(`Usuario aprobado como ${rol}`, 'success');
  }

  async function rechazar(id: string) {
    await updateDoc(doc(db, 'usuarios', id), { rol: 'rechazado', activo: false });
    show('Solicitud rechazada', 'success');
  }

  if (items.length === 0)
    return <p className="text-gray-400 py-12 text-center">No hay solicitudes pendientes.</p>;

  return (
    <div className="space-y-4">
      {items.map(s => (
        <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-800">{s.nombre}</p>
              <p className="text-sm text-gray-500">{s.nombreContacto} · {s.email}</p>
              <p className="text-xs text-gray-400 mt-1">
                NIT {s.nit} · {s.tipoIPS} · {s.ciudad} · {fmtDate(s.fechaSolicitud)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => aprobar(s.id, 'cliente')}>Aprobar cliente</Button>
              <Button onClick={() => aprobar(s.id, 'piloto')} variant="secondary">Piloto</Button>
              <Button onClick={() => rechazar(s.id)} variant="danger">Rechazar</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PilotosTab({ show }: { show: (m: string, t: 'success'|'error') => void }) {
  const [pilotos, setPilotos]   = useState<Piloto[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({
    nombre: '', nombreContacto: '', email: '', password: '',
    nit: '', ciudad: '', tipoIPS: '', dias: '30',
  });

  useEffect(() => {
    const q = query(collection(db, 'usuarios'), where('rol', '==', 'piloto'));
    return onSnapshot(q, snap =>
      setPilotos(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Piloto[]),
    );
  }, []);

  async function crearIPS(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const auth = getAuth();
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const expires = new Date();
      expires.setDate(expires.getDate() + parseInt(form.dias));

      await updateDoc(doc(db, 'usuarios', user.uid), {
        nombre:         form.nombre,          // IPS name
        nombreContacto: form.nombreContacto,  // contact person
        email:          form.email,
        nit:            form.nit,
        ciudad:         form.ciudad,
        tipoIPS:        form.tipoIPS,
        rol:            'piloto',
        activo:         true,
        expiresAt:      Timestamp.fromDate(expires),
        fechaSolicitud: serverTimestamp(),
        estado:         'activo',
        cargo:          '',
        telefono:       '',
      });

      await addDoc(collection(db, 'ips'), {
        nit:    form.nit,
        nombre: form.nombre,
        ciudad: form.ciudad,
        tipo:   form.tipoIPS,
      });

      show('IPS piloto creada', 'success');
      setShowForm(false);
      setForm({ nombre:'', nombreContacto:'', email:'', password:'', nit:'', ciudad:'', tipoIPS:'', dias:'30' });
    } catch (err: unknown) {
      show((err as Error).message ?? 'Error al crear', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nueva IPS piloto'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={crearIPS} className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-4">
          <h3 className="font-medium text-gray-700">Nueva IPS piloto</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'nombre',         label: 'Nombre IPS *',       type: 'text',     required: true },
              { key: 'nombreContacto', label: 'Persona de contacto', type: 'text',    required: false },
              { key: 'email',          label: 'Email *',             type: 'email',   required: true },
              { key: 'password',       label: 'Contraseña *',        type: 'password', required: true },
              { key: 'nit',            label: 'NIT *',               type: 'text',    required: true },
              { key: 'ciudad',         label: 'Ciudad',              type: 'text',    required: false },
              { key: 'tipoIPS',        label: 'Tipo IPS',            type: 'text',    required: false },
              { key: 'dias',           label: 'Días de piloto',      type: 'number',  required: true },
            ].map(({ key, label, type, required }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  type={type}
                  required={required}
                  value={(form as Record<string, string>)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            ))}
          </div>
          <Button type="submit" loading={saving}>Crear IPS piloto</Button>
        </form>
      )}

      {pilotos.length === 0 ? (
        <p className="text-gray-400 py-12 text-center">No hay pilotos activos.</p>
      ) : (
        <div className="space-y-3">
          {pilotos.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{p.nombre}</p>
                <p className="text-xs text-gray-400">{p.email} · {p.ciudad}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-gray-600">{diasRestantes(p.expiresAt)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CRMTab({ show }: { show: (m: string, t: 'success'|'error') => void }) {
  const [items, setItems]       = useState<Prospecto[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ nombre:'', contacto:'', email:'', telefono:'', ciudad:'', notas:'' });

  useEffect(() => {
    const q = query(collection(db, 'prospectos'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap =>
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Prospecto[]),
    );
  }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'prospectos'), { ...form, estado: 'nuevo', createdAt: serverTimestamp() });
      setForm({ nombre:'', contacto:'', email:'', telefono:'', ciudad:'', notas:'' });
      setShowForm(false);
      show('Prospecto agregado', 'success');
    } catch { show('Error al guardar', 'error'); }
    finally { setSaving(false); }
  }

  const ESTADOS = ['nuevo', 'contactado', 'demo', 'propuesta', 'cerrado', 'perdido'];

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Agregar prospecto'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={crear} className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key:'nombre',   label:'Nombre IPS *', required:true },
              { key:'contacto', label:'Persona contacto' },
              { key:'email',    label:'Email' },
              { key:'telefono', label:'Teléfono' },
              { key:'ciudad',   label:'Ciudad' },
            ].map(({ key, label, required }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  required={!!required}
                  value={(form as Record<string, string>)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            ))}
          </div>
          <Button type="submit" loading={saving}>Guardar</Button>
        </form>
      )}

      <div className="space-y-3">
        {items.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800">{p.nombre}</p>
              <p className="text-xs text-gray-400">{p.contacto} · {p.email} · {p.ciudad}</p>
              {p.notas && <p className="text-xs text-gray-400 mt-0.5 truncate">{p.notas}</p>}
            </div>
            <select
              value={p.estado}
              onChange={e => updateDoc(doc(db, 'prospectos', p.id), { estado: e.target.value })}
              className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ))}
        {items.length === 0 && <p className="text-gray-400 py-12 text-center">No hay prospectos.</p>}
      </div>
    </div>
  );
}

function LeadsTab() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap =>
      setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Lead[]),
    );
  }, []);

  const ESTADOS_LEAD = ['nuevo', 'contactado', 'calificado', 'descartado'];

  return (
    <div className="space-y-3">
      {leads.length === 0 && <p className="text-gray-400 py-12 text-center">No hay leads.</p>}
      {leads.map(l => (
        <div key={l.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800">{l.nombre}</p>
            <p className="text-xs text-gray-400">{l.email} · {l.telefono} · {l.ciudad}</p>
            <p className="text-xs text-gray-400">{l.tipoIPS} · {fmtDate(l.createdAt)}</p>
          </div>
          <select
            value={l.estado}
            onChange={e => updateDoc(doc(db, 'leads', l.id), { estado: e.target.value })}
            className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {ESTADOS_LEAD.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

function AnalyticsTab() {
  const [totales, setTotales] = useState({ clientes: 0, pilotos: 0, pendientes: 0, leads: 0 });

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'usuarios'), where('rol', '==', 'cliente')),
        s => setTotales(t => ({ ...t, clientes: s.size }))),
      onSnapshot(query(collection(db, 'usuarios'), where('rol', '==', 'piloto')),
        s => setTotales(t => ({ ...t, pilotos: s.size }))),
      onSnapshot(query(collection(db, 'usuarios'), where('rol', '==', 'pendiente')),
        s => setTotales(t => ({ ...t, pendientes: s.size }))),
      onSnapshot(collection(db, 'leads'),
        s => setTotales(t => ({ ...t, leads: s.size }))),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const cards = [
    { label: 'Clientes activos',     value: totales.clientes,   color: 'text-green-600' },
    { label: 'Pilotos activos',      value: totales.pilotos,    color: 'text-blue-600' },
    { label: 'Solicitudes pendientes', value: totales.pendientes, color: 'text-amber-600' },
    { label: 'Leads totales',        value: totales.leads,      color: 'text-purple-600' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map(c => (
        <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <p className={`text-4xl font-bold ${c.color}`}>{c.value}</p>
          <p className="text-xs text-gray-500 mt-2">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */

const TABS = ['Solicitudes', 'Pilotos', 'CRM', 'Leads', 'Analytics'] as const;
type Tab = typeof TABS[number];

export default function AdminPage() {
  const { user, rol, loading } = useAuth();
  const router                 = useRouter();
  const { toast, show, hide }  = useToast();
  const [tab, setTab]          = useState<Tab>('Solicitudes');

  useEffect(() => {
    if (!loading && rol !== 'admin') router.push('/login');
  }, [loading, rol, router]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏥</span>
          <span className="font-bold text-primary-700 text-lg">NormaLis Admin</span>
        </div>
        <p className="text-sm text-gray-500">{user.email}</p>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex gap-1 -mb-px">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto p-6">
        {tab === 'Solicitudes' && <SolicitudesTab show={show} />}
        {tab === 'Pilotos'     && <PilotosTab     show={show} />}
        {tab === 'CRM'         && <CRMTab         show={show} />}
        {tab === 'Leads'       && <LeadsTab />}
        {tab === 'Analytics'   && <AnalyticsTab />}
      </main>
    </div>
  );
}
