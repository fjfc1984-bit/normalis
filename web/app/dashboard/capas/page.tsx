'use client';

import { useEffect, useState } from 'react';
import {
  collection, query, where, orderBy,
  onSnapshot, addDoc, doc, updateDoc,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Toast, { useToast } from '@/components/ui/Toast';

type EstadoCAPA = 'abierta' | 'en_proceso' | 'cerrada';

interface CAPA {
  id:          string;
  titulo:      string;
  descripcion: string;
  estado:      EstadoCAPA;
  prioridad:   'alta' | 'media' | 'baja';
  uid:         string;
  createdAt:   Timestamp | null;
}

const ESTADO_LABELS: Record<EstadoCAPA, string> = {
  abierta:    'Abierta',
  en_proceso: 'En proceso',
  cerrada:    'Cerrada',
};

const ESTADO_COLORS: Record<EstadoCAPA, string> = {
  abierta:    'bg-red-100 text-red-700',
  en_proceso: 'bg-amber-100 text-amber-700',
  cerrada:    'bg-green-100 text-green-700',
};

const PRIORIDAD_COLORS = {
  alta:  'text-red-600',
  media: 'text-amber-600',
  baja:  'text-gray-500',
};

export default function CAPAsPage() {
  const { user }           = useAuth();
  const { toast, show, hide } = useToast();
  const [capas, setCapas]  = useState<CAPA[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titulo: '', descripcion: '', prioridad: 'media' as CAPA['prioridad'] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'capas'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, snap => {
      setCapas(snap.docs.map(d => ({ id: d.id, ...d.data() })) as CAPA[]);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form.titulo) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'capas'), {
        ...form,
        estado:    'abierta',
        uid:       user.uid,
        createdAt: serverTimestamp(),
      });
      setForm({ titulo: '', descripcion: '', prioridad: 'media' });
      setShowForm(false);
      show('CAPA registrada', 'success');
    } catch {
      show('Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function avanzarEstado(capa: CAPA) {
    const next: Record<EstadoCAPA, EstadoCAPA> = { abierta: 'en_proceso', en_proceso: 'cerrada', cerrada: 'cerrada' };
    if (capa.estado === 'cerrada') return;
    await updateDoc(doc(db, 'capas', capa.id), { estado: next[capa.estado] });
  }

  return (
    <div className="p-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">CAPAs</h2>
          <p className="text-sm text-gray-500">Correcciones y acciones preventivas</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nueva CAPA'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-4">
          <h3 className="font-medium text-gray-700">Nueva CAPA</h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Título *</label>
            <input
              required value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
            <textarea
              rows={2} value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Prioridad</label>
            <select
              value={form.prioridad}
              onChange={e => setForm(f => ({ ...f, prioridad: e.target.value as CAPA['prioridad'] }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <Button type="submit" loading={saving}>Guardar</Button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando…</div>
      ) : capas.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No hay CAPAs registradas.</div>
      ) : (
        <div className="space-y-3">
          {capas.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{c.titulo}</p>
                {c.descripcion && <p className="text-xs text-gray-400 mt-0.5 truncate">{c.descripcion}</p>}
                <span className={`text-xs font-medium ${PRIORIDAD_COLORS[c.prioridad]}`}>
                  Prioridad {c.prioridad}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${ESTADO_COLORS[c.estado]}`}>
                  {ESTADO_LABELS[c.estado]}
                </span>
                {c.estado !== 'cerrada' && (
                  <button
                    onClick={() => avanzarEstado(c)}
                    className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                  >
                    Avanzar →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
