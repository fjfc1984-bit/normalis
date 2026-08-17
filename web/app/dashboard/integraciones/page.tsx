'use client';

/**
 * web/app/dashboard/integraciones/page.tsx
 * API pública de integraciones — gestión de llaves.
 *
 * Permite a la IPS generar/revocar llaves para que sistemas externos
 * (HCE como Hosvital, Greenlane, SAP Salud, o desarrollos propios)
 * reporten incidentes directamente en NormaLis sin que el personal
 * clínico tenga que salir de su sistema habitual.
 *
 * La llave se genera y se hashea en el navegador (SHA-256); NormaLis
 * solo guarda el hash en Firestore (api_keys/{hash}) y nunca puede
 * recuperar el valor original — se muestra una única vez al crearla.
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useApiKeys } from '@/lib/apiKeys';
import type { ApiKeyItem } from '@/lib/apiKeys';
import { WORKER_URL } from '@/lib/worker';
import {
  SectionHeader, LoadingSpinner, Toast, useToast, EmptyState,
} from '@/components/ui';

// ── Modal: nueva llave ────────────────────────────────────────────────────────
function NuevaLlaveModal({
  onSave,
  onClose,
}: {
  onSave:  (nombre: string) => Promise<string>;
  onClose: () => void;
}) {
  const [nombre, setNombre]   = useState('');
  const [saving, setSaving]   = useState(false);
  const [rawKey, setRawKey]   = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      const key = await onSave(nombre.trim());
      setRawKey(key);
    } finally {
      setSaving(false);
    }
  }

  async function copiar() {
    if (!rawKey) return;
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopiado(true);
    } catch { /* el usuario puede seleccionar y copiar manualmente */ }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget && rawKey) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-800">
            {rawKey ? 'Llave creada' : 'Nueva llave API'}
          </h3>
          {rawKey && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          )}
        </div>

        {rawKey ? (
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠️ Guárdala ahora — por seguridad no volverá a mostrarse. Si la pierdes, tendrás que revocarla y crear otra.
            </p>
            <div className="bg-gray-900 rounded-lg px-4 py-3 font-mono text-xs text-emerald-300 break-all select-all">
              {rawKey}
            </div>
            <button
              onClick={copiar}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              {copiado ? '✓ Copiada al portapapeles' : '📋 Copiar llave'}
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
            >
              Ya la guardé, cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                Nombre de la integración *
              </label>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej. Integración Hosvital — Sede Norte"
                required
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              />
              <p className="text-xs text-gray-400 mt-1">
                Solo para identificarla en tu lista — no afecta su funcionamiento.
              </p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving || !nombre.trim()}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                           text-white text-sm font-bold rounded-xl transition-colors"
              >
                {saving ? 'Generando…' : '✓ Generar llave'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700
                           text-sm font-semibold rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Tarjeta de llave ───────────────────────────────────────────────────────────
function LlaveCard({
  item, onRevocar, onReactivar, onEliminar,
}: {
  item:        ApiKeyItem;
  onRevocar:   (id: string) => void;
  onReactivar: (id: string) => void;
  onEliminar:  (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{item.nombre}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Creada el {new Date(item.creadoEn).toLocaleDateString('es-CO', { dateStyle: 'long' })}
          {' · '}
          <span className="font-mono">…{item.id.slice(-8)}</span>
        </p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold
          ${item.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
          {item.activo ? 'Activa' : 'Revocada'}
        </span>
        {item.activo ? (
          <button
            onClick={() => onRevocar(item.id)}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors"
          >
            Revocar
          </button>
        ) : (
          <button
            onClick={() => onReactivar(item.id)}
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors"
          >
            Reactivar
          </button>
        )}
        <button
          onClick={() => onEliminar(item.id)}
          className="text-xs text-gray-300 hover:text-red-400 transition-colors"
          title="Eliminar permanentemente"
        >
          🗑
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Página principal
// ════════════════════════════════════════════════════════════════════════════
export default function IntegracionesPage() {
  const { user, loading: authLoading } = useAuth();
  const { keys, loading, crear, revocar, reactivar, eliminar } = useApiKeys(user?.uid ?? null);
  const { toast, show } = useToast();

  const [showModal, setShowModal] = useState(false);

  const handleCrear = useCallback(async (nombre: string): Promise<string> => {
    try {
      return await crear(nombre);
    } catch {
      show('Error al generar la llave.', 'error');
      throw new Error('crear falló');
    }
  }, [crear, show]);

  const handleRevocar = useCallback(async (id: string) => {
    try {
      await revocar(id);
      show('Llave revocada — dejará de funcionar de inmediato.', 'info');
    } catch {
      show('Error al revocar la llave.', 'error');
    }
  }, [revocar, show]);

  const handleReactivar = useCallback(async (id: string) => {
    try {
      await reactivar(id);
      show('Llave reactivada.', 'success');
    } catch {
      show('Error al reactivar la llave.', 'error');
    }
  }, [reactivar, show]);

  const handleEliminar = useCallback(async (id: string) => {
    try {
      await eliminar(id);
      show('Llave eliminada.', 'info');
    } catch {
      show('Error al eliminar la llave.', 'error');
    }
  }, [eliminar, show]);

  if (authLoading || loading) return <LoadingSpinner fullHeight />;

  return (
    <div className="p-6 space-y-6">
      <Toast toast={toast} />

      {showModal && (
        <NuevaLlaveModal onSave={handleCrear} onClose={() => setShowModal(false)} />
      )}

      <SectionHeader
        title="Integraciones API"
        subtitle="Conecta tu Historia Clínica Electrónica (Hosvital, Greenlane, SAP Salud u otra) directamente con NormaLis"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600
                       hover:bg-teal-700 text-white text-sm font-bold
                       rounded-xl transition-colors"
          >
            + Nueva llave
          </button>
        }
      />

      {/* Qué es esto */}
      <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 text-sm text-teal-900">
        <p className="font-semibold mb-1">🔌 API abierta de NormaLis (v1)</p>
        <p className="text-teal-800">
          Con una llave API, tu sistema de Historia Clínica puede reportar incidentes y eventos adversos
          directamente en NormaLis sin que el personal clínico tenga que salir de la ficha del paciente.
          También puedes consultar el checklist de la Resolución 1732/2026 de forma pública, sin llave.
          Comparte la documentación técnica con tu proveedor de HCE:{' '}
          <Link href="/desarrolladores" target="_blank" className="underline font-semibold">
            normalis.co/desarrolladores
          </Link>.
        </p>
      </div>

      {/* Lista de llaves */}
      {keys.length === 0 ? (
        <EmptyState
          icon="🔌"
          title="Sin llaves API creadas"
          description="Genera una llave para conectar tu HCE u otro sistema externo con NormaLis."
          action={
            <button
              onClick={() => setShowModal(true)}
              className="mt-3 px-4 py-2 bg-teal-600 hover:bg-teal-700
                         text-white text-sm font-bold rounded-xl transition-colors"
            >
              + Nueva llave
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {keys.map(k => (
            <LlaveCard
              key={k.id}
              item={k}
              onRevocar={handleRevocar}
              onReactivar={handleReactivar}
              onEliminar={handleEliminar}
            />
          ))}
        </div>
      )}

      {/* Referencia rápida */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <p className="text-sm font-bold text-gray-700">Referencia rápida</p>
        <p className="text-xs text-gray-500">
          Base URL: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{WORKER_URL}</code>
        </p>
        <pre className="bg-gray-900 text-emerald-300 text-xs rounded-lg p-4 overflow-x-auto">
{`curl -X POST ${WORKER_URL}/api/v1/incidentes \\
  -H "Authorization: Bearer TU_LLAVE_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tipo": "Evento adverso",
    "severidad": "moderado",
    "desc": "Caída de paciente en habitación 204",
    "responsable": "Enfermera Jefe"
  }'`}
        </pre>
        <p className="text-xs text-gray-400">
          Ver la documentación completa (endpoints, catálogos válidos, códigos de error) en{' '}
          <Link href="/desarrolladores" target="_blank" className="text-teal-600 font-semibold underline">
            la guía para desarrolladores
          </Link>.
        </p>
      </div>
    </div>
  );
}
