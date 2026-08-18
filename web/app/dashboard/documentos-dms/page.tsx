'use client';

/**
 * web/app/dashboard/documentos-dms/page.tsx
 * Gestor Documental (DMS) — versionado, flujo de aprobación y evidencia de
 * socialización para los documentos institucionales.
 * Base legal: Res. 3100/2019 (control documental, Talento Humano —
 * socialización) · Ley 527/1999 Art. 7 (firma electrónica de la aprobación).
 */

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useFirma, FIRMA_CATALOGO } from '@/lib/useFirma';
import type { FirmaDocId } from '@/lib/useFirma';
import { useDocumentosDMS, type DocumentoDMS, type Socializacion } from '@/lib/useDocumentosDMS';
import { useIPSConfigLocal, contenidoParaFirmar } from '@/lib/docContenido';
import { logSecurityEvent } from '@/lib/securityLog';
import {
  SectionHeader, LoadingSpinner, Toast, useToast,
  KpiCard, ConfirmModal, StatusBadge,
} from '@/components/ui';

const BTN_P = 'px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50';
const BTN_S = 'px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors';
const INPUT = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white';

function estadoBadge(estado: DocumentoDMS['estado'] | 'sin_version') {
  switch (estado) {
    case 'borrador':    return <StatusBadge label="Borrador" bg="bg-gray-100" color="text-gray-600" />;
    case 'en_revision': return <StatusBadge label="En revisión" bg="bg-amber-100" color="text-amber-700" dot dotColor="bg-amber-500" />;
    case 'aprobado':    return <StatusBadge label="Aprobado" bg="bg-emerald-100" color="text-emerald-700" dot dotColor="bg-emerald-500" />;
    case 'obsoleto':    return <StatusBadge label="Obsoleto" bg="bg-red-50" color="text-red-500" />;
    default:            return <StatusBadge label="Sin versión" bg="bg-gray-50" color="text-gray-400" />;
  }
}

// ── Modal de aprobación (= firma electrónica de esta versión) ────────────────
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
  const cat = FIRMA_CATALOGO.find(c => c.id === item.docId)!;

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    try { await onSave(nombre.trim()); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
          <span className="text-3xl">{cat.icono}</span>
          <div>
            <p className="text-sm font-semibold text-gray-800">{item.nombre}</p>
            <p className="text-xs text-gray-400">Versión {item.version}{item.reemplazaVersionId ? ' — reemplaza la anterior' : ''}</p>
          </div>
        </div>
        <form onSubmit={handle} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Admin que aprueba *
            </label>
            <input className={INPUT} value={nombre} onChange={e => setNombre(e.target.value)} required />
          </div>
          {item.contenido ? (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-xs text-teal-700">
              <p className="font-bold mb-1">✅ Aprobar = firmar electrónicamente esta versión</p>
              <p>Queda sellada con HMAC del servidor. Si existía una versión aprobada anterior de este documento, pasa automáticamente a obsoleta.</p>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-600">
              <p className="font-bold">⚠️ Esta versión no tiene contenido capturado — no debería aprobarse.</p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className={BTN_S}>Cancelar</button>
            <button type="submit" disabled={saving || !item.contenido} className={BTN_P}>{saving ? 'Aprobando…' : '✅ Aprobar versión'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Historial de versiones ────────────────────────────────────────────────────
function HistorialModal({
  docId, historial, onClose,
}: { docId: FirmaDocId; historial: DocumentoDMS[]; onClose: () => void }) {
  const cat = FIRMA_CATALOGO.find(c => c.id === docId)!;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-3 sticky top-0">
          <span className="text-2xl">{cat.icono}</span>
          <p className="text-sm font-bold text-gray-800">Historial — {cat.nombre}</p>
        </div>
        <div className="p-6 space-y-3">
          {historial.map(v => (
            <div key={v.id} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Versión {v.version}</p>
                <p className="text-xs text-gray-400">
                  {v.creadoPorNombre} · {v.fechaCreacion ? new Date(v.fechaCreacion).toLocaleDateString('es-CO') : '—'}
                  {v.aprobadoPor && ` · aprobado por ${v.aprobadoPor}`}
                </p>
              </div>
              {estadoBadge(v.estado)}
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className={BTN_S}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function DocumentosDMSPage() {
  const { user, nit, rol, nombre: ipsNombre } = useAuth();
  const uid = user?.uid ?? null;
  const {
    items, loading, vigentePorDocId, historialPorDocId,
    crearVersion, enviarARevision, aprobar, retirarVersionesRotas, marcarSocializado, listarSocializaciones,
  } = useDocumentosDMS(uid, nit || null);
  const cfg = useIPSConfigLocal(uid);
  const { toast, show } = useToast();
  const isAdmin = rol === 'admin';

  const [aprobarModal,   setAprobarModal]   = useState<DocumentoDMS | null>(null);
  const [historialDocId, setHistorialDocId] = useState<FirmaDocId | null>(null);
  const [retirarModal,   setRetirarModal]   = useState<{ docId: FirmaDocId; rotas: DocumentoDMS[] } | null>(null);
  const [socializaciones, setSocializaciones] = useState<Record<string, Socializacion[]>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function cargarSocializaciones(item: DocumentoDMS) {
    const list = await listarSocializaciones(item.id);
    setSocializaciones(prev => ({ ...prev, [item.id]: list }));
  }

  async function handleCrearVersion(docId: FirmaDocId) {
    if (!uid) return;
    setBusyId(docId);
    try {
      // El contenido EXACTO se captura aquí, mientras la propia IPS está
      // logueada y sus datos (nombre/nit/director/registro médico) son
      // los correctos — aprobar() más adelante NUNCA lo regenera, solo
      // lo re-usa (ver nota en useDocumentosDMS.ts).
      const contenido = contenidoParaFirmar(docId, cfg);
      await crearVersion(docId, uid, nit || '', ipsNombre || '', contenido);
      show('📝 Nueva versión creada como borrador', 'success');
    } finally { setBusyId(null); }
  }

  async function handleEnviarRevision(item: DocumentoDMS) {
    setBusyId(item.id);
    try {
      await enviarARevision(item.id);
      show('Enviado a revisión', 'info');
    } finally { setBusyId(null); }
  }

  async function handleAprobar(aprobadoPorNombre: string) {
    if (!aprobarModal) return;
    // No se regenera contenido aquí — aprobar() usa el que ya quedó
    // guardado en el documento desde que se creó la versión.
    await aprobar(aprobarModal, aprobadoPorNombre);
    await logSecurityEvent('documento_version_aprobada', 'documentos-dms', `${aprobarModal.nombre} v${aprobarModal.version}`);
    show(`✅ Versión ${aprobarModal.version} de ${aprobarModal.nombre} aprobada`, 'success');
    setAprobarModal(null);
  }

  /** Marca como "obsoletas" las versiones sin `contenido` capturado que
   * quedaron atascadas por el bug de captura de contenido (ya corregido) —
   * ver nota en retirarVersionesRotasDMS. Libera el botón "Nueva versión"
   * para poder crear una versión correcta. */
  async function handleRetirarRotas() {
    if (!retirarModal) return;
    const { docId, rotas } = retirarModal;
    setBusyId(`retirar-${docId}`);
    try {
      await retirarVersionesRotas(rotas.map(r => r.id), ipsNombre || user?.email || 'Usuario');
      const cat = FIRMA_CATALOGO.find(c => c.id === docId)!;
      await logSecurityEvent('documento_version_retirada', 'documentos-dms', `${cat.nombre} — ${rotas.length} versión(es) sin contenido retirada(s)`);
      show(`Se retiraron ${rotas.length} versión(es) sin contenido — ya puedes crear una nueva`, 'info');
      setRetirarModal(null);
    } finally { setBusyId(null); }
  }

  async function handleSocializar(item: DocumentoDMS) {
    if (!uid) return;
    setBusyId(item.id);
    try {
      await marcarSocializado(item.id, uid, ipsNombre || user?.email || 'Usuario');
      await cargarSocializaciones(item);
      show('✅ Registrado — quedó tu acuse de "leí y entendí"', 'success');
    } finally { setBusyId(null); }
  }

  if (loading) return <LoadingSpinner />;

  const aprobados = FIRMA_CATALOGO.filter(c => vigentePorDocId(c.id)?.estado === 'aprobado').length;
  const enRevision = items.filter(i => i.estado === 'en_revision').length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <SectionHeader
        title="Gestor Documental"
        subtitle="Versionado real, flujo de aprobación y evidencia de socialización — Res. 3100/2019"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Documentos"     value={FIRMA_CATALOGO.length} icon="📚" />
        <KpiCard label="Aprobados"      value={aprobados}             icon="✅" />
        <KpiCard label="En revisión"    value={enRevision}            icon="⏳" borderColorClass={enRevision > 0 ? 'border-amber-400' : 'border-gray-200'} colorClass={enRevision > 0 ? 'text-amber-600' : 'text-gray-800'} />
        <KpiCard label="Sin versión"    value={FIRMA_CATALOGO.length - items.filter(i => i.docId).map(i => i.docId).filter((v, i, a) => a.indexOf(v) === i).length} icon="📄" />
      </div>

      <div className="space-y-3">
        {FIRMA_CATALOGO.map(cat => {
          const vigente = vigentePorDocId(cat.id);
          const historial = historialPorDocId(cat.id);
          const socios = vigente ? socializaciones[vigente.id] : undefined;
          // Versiones atascadas sin `contenido` (bug de captura ya corregido) —
          // nunca incluye aprobadas ni obsoletas, ni versiones con contenido real.
          const rotas = historial.filter(v => v.estado !== 'aprobado' && v.estado !== 'obsoleto' && !v.contenido);

          return (
            <div key={cat.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{cat.icono}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{cat.nombre}</p>
                    <p className="text-xs text-gray-500">{cat.base}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {estadoBadge(vigente?.estado ?? 'sin_version')}
                      {vigente && <span className="text-xs text-gray-400">v{vigente.version}</span>}
                      {historial.length > 1 && (
                        <button onClick={() => setHistorialDocId(cat.id)} className="text-xs text-teal-600 hover:underline">
                          Ver historial ({historial.length})
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(!vigente || vigente.estado === 'obsoleto') && (
                    <button disabled={busyId === cat.id} onClick={() => handleCrearVersion(cat.id)} className={BTN_P}>
                      {busyId === cat.id ? 'Creando…' : '📝 Nueva versión'}
                    </button>
                  )}
                  {vigente?.estado === 'borrador' && (
                    <button disabled={busyId === vigente.id} onClick={() => handleEnviarRevision(vigente)} className={BTN_S}>
                      Enviar a revisión
                    </button>
                  )}
                  {vigente?.estado === 'en_revision' && isAdmin && (
                    <button onClick={() => setAprobarModal(vigente)} className={BTN_P}>
                      ✅ Aprobar
                    </button>
                  )}
                  {vigente?.estado === 'en_revision' && !isAdmin && (
                    <span className="text-xs text-gray-400 italic">Esperando aprobación de un admin</span>
                  )}
                  {vigente?.estado === 'aprobado' && (
                    <button disabled={busyId === vigente.id} onClick={() => { handleSocializar(vigente); }} className={BTN_S}>
                      👥 Marcar como socializado
                    </button>
                  )}
                  {rotas.length > 0 && (
                    <button
                      disabled={busyId === `retirar-${cat.id}`}
                      onClick={() => setRetirarModal({ docId: cat.id, rotas })}
                      className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors"
                    >
                      🗑️ Retirar sin contenido ({rotas.length})
                    </button>
                  )}
                </div>
              </div>

              {vigente?.estado === 'aprobado' && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Aprobado por {vigente.aprobadoPor} · {vigente.fechaAprobacion ? new Date(vigente.fechaAprobacion).toLocaleDateString('es-CO') : ''}
                  </p>
                  <button onClick={() => cargarSocializaciones(vigente)} className="text-xs text-teal-600 hover:underline">
                    {socios ? `${socios.length} persona${socios.length !== 1 ? 's' : ''} socializada${socios.length !== 1 ? 's' : ''}` : 'Ver socialización'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
        <p className="font-bold mb-1">ℹ️ Cómo funciona el control de versiones</p>
        <p>
          Cada documento pasa por borrador → en revisión → aprobado. Aprobar una versión la firma
          electrónicamente (mismo sello HMAC del módulo de Firma) y convierte automáticamente en
          obsoleta la versión aprobada anterior — así siempre hay un historial completo de qué
          versión reemplazó a cuál, exigible en visita de habilitación. La socialización es un acuse
          individual: cada persona del equipo registra su propio "leí y entendí", nadie puede
          marcarlo por otra persona.
        </p>
      </div>

      {aprobarModal && (
        <AprobarModal
          item={aprobarModal}
          directorDefault={ipsNombre ?? ''}
          onSave={handleAprobar}
          onClose={() => setAprobarModal(null)}
        />
      )}

      {historialDocId && (
        <HistorialModal
          docId={historialDocId}
          historial={historialPorDocId(historialDocId)}
          onClose={() => setHistorialDocId(null)}
        />
      )}

      {retirarModal && (
        <ConfirmModal
          title="Retirar versión(es) sin contenido"
          description={`Esta operación marca como "obsoleta" ${retirarModal.rotas.length} versión(es) de este documento que quedaron sin el contenido capturado (por una falla ya corregida) y por eso nunca se pueden aprobar. Libera el botón "Nueva versión" para crear una versión correcta. Queda registrado en la bitácora de seguridad y no se puede deshacer desde la app.`}
          confirmLabel="Retirar"
          confirmVariant="danger"
          loading={busyId === `retirar-${retirarModal.docId}`}
          onConfirm={handleRetirarRotas}
          onCancel={() => setRetirarModal(null)}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
