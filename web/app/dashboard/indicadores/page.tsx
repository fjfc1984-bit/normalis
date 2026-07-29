'use client';

import { useEffect, useState } from 'react';
import {
  collection, query, where, orderBy,
  onSnapshot, addDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Toast, { useToast } from '@/components/ui/Toast';

interface Indicador {
  id:        string;
  nombre:    string;
  meta:      number;
  valor:     number;
  unidad:    string;
  periodo:   string;
  uid:       string;
  createdAt: Timestamp | null;
}

function getBarra(valor: number, meta: number) {
  const pct = meta > 0 ? Math.min(100, Math.round((valor / meta) * 100)) : 0;
  const color = pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-400' : 'bg-red-400';
  return { pct, color };
}

export default function IndicadoresPage() {
  const { user }           = useAuth();
  const { toast, show, hide } = useToast();
  const [items, setItems]  = useState<Indicador[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]    = useState({ nombre: '', meta: '', valor: '', unidad: '%', periodo: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'indicadores'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Indicador[]);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form.nombre || !form.meta) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'indicadores'), {
        nombre:    form.nombre,
        meta:      parseFloat(form.meta),
        valor:     parseFloat(form.valor || '0'),
        unidad:    form.unidad,
        periodo:   form.periodo,
        uid:       user.uid,
        createdAt: serverTimestamp(),
      });
      setForm({ nombre: '', meta: '', valor: '', unidad: '%', periodo: '' });
      setShowForm(false);
      show('Indicador registrado', 'success');
    } catch {
      show('Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Indicadores</h2>
          <p className="text-sm text-gray-500">Seguimiento de metas de calidad</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nuevo indicador'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-4">
          <h3 className="font-medium text-gray-700">Nuevo indicador</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
              <input required value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Período</label>
              <input value={form.periodo} placeholder="Ej: Q2 2025"
                onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Meta *</label>
              <input required type="number" value={form.meta}
                onChange={e => setForm(f => ({ ...f, meta: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor actual</label>
              <input type="number" value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <Button type="submit" loading={saving}>Guardar</Button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No hay indicadores registrados.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map(ind => {
            const { pct, color } = getBarra(ind.valor, ind.meta);
            return (
              <div key={ind.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex justify-between items-start mb-3">
                  <p className="font-medium text-gray-800 text-sm">{ind.nombre}</p>
                  {ind.periodo && <span className="text-xs text-gray-400">{ind.periodo}</span>}
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-2xl font-bold text-gray-800">{ind.valor}</span>
                  <span className="text-sm text-gray-400 mb-0.5">/ {ind.meta} {ind.unidad}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{pct}% de la meta</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
