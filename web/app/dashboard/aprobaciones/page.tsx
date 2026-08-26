'use client';

/**
 * web/app/dashboard/aprobaciones/page.tsx
 * Cola de Aprobación (DMS) — vista SOLO ADMIN, cross-tenant.
 *
 * Un admin no pertenece a ninguna IPS (no tiene `nit`), así que la vista
 * normal del Gestor Documental (/dashboard/documentos-dms, filtrada por
 * nit/uid) siempre le queda vacía — nunca ve nada para aprobar ahí. Esta
 * página resuelve eso consultando por ESTADO ('en_revision') en vez de por
 * tenant, mostrando de qué IPS es cada documento (creadoPorNombre + nit)
 * para no mezclar nunca el historial de una IPS con el de otra.
 *
 * El contenido que se aprueba es el que la propia IPS capturó al crear la
 * versión (ver useDocumentosDMS.ts) — esta página NUNCA regenera contenido,
 * solo lo muestra (para que el admin pueda revisarlo) y lo sella tal cual.
 *
 * Base legal: Res. 1732/2026 (control documental, reemplaza Res. 3100/2019) · Ley 527/1999 Art. 7
 * (firma electrónica de la aprobación).
 */

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useColaAprobacionDMS, aprobarDocumentoDMS, type DocumentoDMS } from '@/lib/useDocumentosDMS';
import { logSecurityEvent } from '@/lib/securityLog';
import { SectionHeader, LoadingSpinner, Toast, useToast, KpiCard } from '@/components/ui';

const BTN_P = 'px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50';
const BTN_S = 'px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors';
const INPUT = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white';

function AprobarModal({
  item, directorDefault, onSave, onClose,
}: {
  item: DocumentoDMS;
  directorDefault: string;
  onSave: (aprobadoPor: string) => Promise<void>;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState(directorDefault);
  const [saving, setSaving] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    try { await onSave(nombre.trim()); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-800">{item.nombre} — v{item.version}</p>
          <p className="text-xs text-gray-400">{item.creadoPorNombre} · NIT {item.nit}</p>
        </div>

        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Contenido a aprobar</p>
          <div
            className="border border-gray-200 rounded-lg p-3 max-h-64 overflow-y-auto text-xs bg-gray-50 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: item.contenido || '<p class="text-red-500">⚠️ Esta versión no tiene contenido capturado — no debería aprobarse.</p>' }}
          />
        </div>

        <form onSubmit={handle} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Admin que aprueba *
            </label>
            <input className={INPUT} value={nombre} onChange={e => setNombre(e.target.value)} required />
          </div>
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-xs text-teal-700">
            <p className="font-bold mb-1">✅ Aprobar = firmar electrónicamente esta versión</p>
            <p>Queda sellada con HMAC del servidor, con el contenido que ves arriba (capturado cuando la IPS creó esta versión — no se regenera). Si existía una versión aprobada anterior de este documento, pasa automáticamente a obsoleta.</p>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className={BTN_S}>Cancelar</button>
            <button type="submit" disabled={saving || !item.contenido} className={BTN_P}>{saving ? 'Aprobando…' : '✅ Aprobar versión'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AprobacionesPage() {
  const { rol, nombre } = useAuth();
  const { items, loading } = useColaAprobacionDMS();
  const { toast, show } = useToast();
  const [aprobarModal, setAprobarModal] = useState<DocumentoDMS | null>(null);

  const isAdmin = rol === 'admin';

  async function handleAprobar(aprobadoPorNombre: string) {
    if (!aprobarModal) return;
    await aprobarDocumentoDMS(aprobarModal, aprobadoPorNombre);
    await logSecurityEvent('documento_version_aprobada', 'documentos-dms', `${aprobarModal.nombre} v${aprobarModal.version} (${aprobarModal.creadoPorNombre})`);
    show(`✅ Versión ${aprobarModal.version} de ${aprobarModal.nombre} aprobada`, 'success');
    setAprobarModal(null);
  }

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <SectionHeader title="Cola de Aprobación" subtitle="Solo administradores de NormaLis" />
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          Esta sección es exclusiva para administradores. Si necesitas aprobar un documento, contacta al equipo de NormaLis.
        </div>
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <SectionHeader
        title="Cola de Aprobación"
        subtitle="Documentos en revisión de todas las IPS — Res. 1732/2026 (reemplaza Res. 3100/2019) · Ley 527/1999 Art. 7"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="En revisión" value={items.length} icon="⏳" borderColorClass={items.length > 0 ? 'border-amber-400' : 'border-gray-200'} colorClass={items.length > 0 ? 'text-amber-600' : 'text-gray-800'} />
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">
          No hay documentos esperando aprobación.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-bold text-gray-800">{item.nombre} <span className="text-gray-400 font-normal">· v{item.version}</span></p>
                <p className="text-xs text-gray-500">{item.creadoPorNombre} · NIT {item.nit}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {item.fechaCreacion ? new Date(item.fechaCreacion).toLocaleDateString('es-CO') : '—'}
                  {!item.contenido && <span className="text-red-500 ml-2">⚠️ Sin contenido capturado</span>}
                </p>
              </div>
              <button onClick={() => setAprobarModal(item)} className={BTN_P}>
                ✅ Revisar y aprobar
              </button>
            </div>
          ))}
        </div>
      )}

      {aprobarModal && (
        <AprobarModal
          item={aprobarModal}
          directorDefault={nombre ?? ''}
          onSave={handleAprobar}
          onClose={() => setAprobarModal(null)}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
