/**
 * app/dashboard/vencimientos/page.tsx
 * Módulo de Vencimientos — primer módulo migrado de normativa-app-v2.html.
 *
 * Lee directamente de Firestore (colección "vencimientos" filtrada por uid).
 * Conecta con el mismo Cloudflare Worker para consultas al asistente IA.
 */
'use client';

import { useEffect, useState } from 'react';
import {
  collection, query, where,
  onSnapshot, addDoc, deleteDoc, doc,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { registrarBitacora } from '@/lib/useBitacora';
import Button from '@/components/ui/Button';
import { Toast, useToast } from '@/components/ui/Toast';

interface Vencimiento {
  id:        string;
  nombre:    string;
  fecha:     string;   // ISO date
  estado:    'vigente' | 'proximo' | 'vencido';
  notas?:    string;
  uid:       string;
  nit?:      string;
  createdAt: Timestamp | null;
}

/** Parsea "YYYY-MM-DD" como fecha local (evita el corrimiento de -1 día que
 *  causa `new Date('YYYY-MM-DD')` al interpretarse como UTC medianoche). */
function parseLocalDate(fechaISO: string): Date {
  const [year, month, day] = fechaISO.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getDiasRestantes(fechaISO: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.ceil((parseLocalDate(fechaISO).getTime() - hoy.getTime()) / 86_400_000);
}

function getEstadoBadge(dias: number) {
  if (dias < 0)   return { label: 'Vencido',  cls: 'bg-red-100 text-red-700' };
  if (dias <= 30) return { label: 'Urgente',  cls: 'bg-amber-100 text-amber-700' };
  if (dias <= 90) return { label: 'Próximo',  cls: 'bg-yellow-100 text-yellow-700' };
  return             { label: 'Vigente',  cls: 'bg-green-100 text-green-700' };
}

export default function VencimientosPage() {
  const { user, nit }    = useAuth();
  const { toast, show } = useToast();

  const [vencimientos, setVencimientos] = useState<Vencimiento[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);

  // Formulario de nuevo vencimiento
  const [form, setForm] = useState({ nombre: '', fecha: '', notas: '' });
  const [saving, setSaving] = useState(false);

  // Suscripción en tiempo real a Firestore
  // Preferir query por NIT (compartido con Equipo IPS) si existe, si no por uid.
  // Sin orderBy en la query, para evitar depender de un índice compuesto —
  // el orden se aplica client-side abajo.
  useEffect(() => {
    if (!user) return;

    const q = nit
      ? query(collection(db, 'vencimientos'), where('nit', '==', nit))
      : query(collection(db, 'vencimientos'), where('uid', '==', user.uid));

    const unsub = onSnapshot(q, snap => {
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() })) as Vencimiento[];
      items.sort((a, b) => a.fecha.localeCompare(b.fecha));
      setVencimientos(items);
      setLoading(false);
    }, err => {
      console.error('[Vencimientos] Error cargando:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [user, nit]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form.nombre || !form.fecha) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'vencimientos'), {
        nombre:    form.nombre,
        fecha:     form.fecha,
        notas:     form.notas,
        uid:       user.uid,
        nit:       nit ?? '',
        estado:    'vigente',
        createdAt: serverTimestamp(),
      });
      registrarBitacora(user.uid, nit, 'Vencimientos', `Vencimiento registrado — ${form.nombre}`, `Fecha: ${form.fecha}`);
      setForm({ nombre: '', fecha: '', notas: '' });
      setShowForm(false);
      show('Vencimiento registrado', 'success');
    } catch {
      show('Error al guardar. Intenta de nuevo.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDoc(doc(db, 'vencimientos', id));
      show('Vencimiento eliminado', 'success');
    } catch {
      show('Error al eliminar', 'error');
    }
  }

  return (
    <div className="p-6">
      <Toast toast={toast} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Vencimientos</h2>
          <p className="text-sm text-gray-500">
            Documentos y certificaciones con fecha límite
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Agregar'}
        </Button>
      </div>

      {/* Formulario de creación */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-4"
        >
          <h3 className="font-medium text-gray-700">Nuevo vencimiento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nombre del documento *
              </label>
              <input
                required
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Licencia de funcionamiento"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Fecha de vencimiento *
              </label>
              <input
                required
                type="date"
                value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea
              rows={2}
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Observaciones opcionales"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
          <Button type="submit" loading={saving}>Guardar</Button>
        </form>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando…</div>
      ) : vencimientos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No hay vencimientos registrados.
        </div>
      ) : (
        <div className="space-y-3">
          {vencimientos.map(v => {
            const dias  = getDiasRestantes(v.fecha);
            const badge = getEstadoBadge(dias);
            return (
              <div
                key={v.id}
                className="bg-white rounded-xl border border-gray-200 p-4
                           flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{v.nombre}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {parseLocalDate(v.fecha).toLocaleDateString('es-CO', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                    {' · '}
                    {dias >= 0
                      ? `en ${dias} día${dias !== 1 ? 's' : ''}`
                      : `hace ${Math.abs(dias)} días`}
                  </p>
                  {v.notas && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{v.notas}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                    title="Eliminar"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
