'use client';

/**
 * web/app/dashboard/firma/page.tsx
 * Módulo Firma y Versiones — firma digital de documentos institucionales
 * Base legal: Res. 1732/2026 — Procesos Prioritarios Est. 5 y normas referenciadas
 */

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useFirma, FIRMA_CATALOGO } from '@/lib/useFirma';
import type { FirmaDoc, FirmaDocId } from '@/lib/useFirma';
import { generarDocumento } from '@/lib/docTemplates';
import { DOC_CATALOGO, IPS_CONFIG_DEFAULTS } from '@/lib/docTypes';
import type { IPSConfig, DocId } from '@/lib/docTypes';
import { logSecurityEvent } from '@/lib/securityLog';
import {
  SectionHeader, LoadingSpinner, Toast, useToast,
  KpiCard, ConfirmModal,
} from '@/components/ui';

// ── Config IPS para regenerar el contenido exacto que se firma ────────────────
// Mismos campos/fuente que web/app/dashboard/documentos/page.tsx (nombre,
// nit, ciudad de Firestore + director/rm/esp editables guardados en
// localStorage) — así el hash de firma corresponde al documento real que
// el usuario ve y descarga en el módulo de Documentos.
function useIPSConfigLocal(uid: string | null) {
  const [cfg, setCfg] = useState<IPSConfig>(IPS_CONFIG_DEFAULTS);
  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, 'usuarios', uid)).then(snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      const saved = (() => {
        try { return JSON.parse(localStorage.getItem('normalis_doc_cfg') ?? '{}'); }
        catch { return {}; }
      })();
      setCfg({
        nombre:   d.nombre   ?? IPS_CONFIG_DEFAULTS.nombre,
        nit:      d.nit      ?? IPS_CONFIG_DEFAULTS.nit,
        ciudad:   d.ciudad   ?? IPS_CONFIG_DEFAULTS.ciudad,
        director: saved.director ?? d.nombreContacto ?? IPS_CONFIG_DEFAULTS.director,
        rm:       saved.rm       ?? '',
        esp:      saved.esp      ?? IPS_CONFIG_DEFAULTS.esp,
      });
    });
  }, [uid]);
  return cfg;
}

/** Contenido exacto a firmar: el HTML real del documento cuando existe
 * plantilla en el módulo de Documentos; si no (ids legado sin plantilla),
 * un resumen determinístico como respaldo. */
function contenidoParaFirmar(id: FirmaDocId, cfg: IPSConfig): string {
  const tieneTemplate = DOC_CATALOGO.some(d => d.id === id);
  if (tieneTemplate) return generarDocumento(id as DocId, cfg);
  const cat = FIRMA_CATALOGO.find(c => c.id === id)!;
  return `${cat.nombre}|${cat.base}|${cfg.nombre}|${cfg.nit}`;
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const INPUT = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white';
const LABEL = 'block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1';
const BTN_P = 'px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors';
const BTN_S = 'px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors';

// ── Modal de firma ────────────────────────────────────────────────────────────

function FirmaModal({
  doc: fdoc,
  directorDefault,
  onSave,
  onClose,
}: {
  doc:            FirmaDoc;
  directorDefault: string;
  onSave:         (firmante: string) => Promise<void>;
  onClose:        () => void;
}) {
  const [firmante, setFirmante] = useState(directorDefault);
  const [saving,   setSaving]   = useState(false);
  const cat = FIRMA_CATALOGO.find(c => c.id === fdoc.id)!;

  async function handleFirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!firmante.trim()) return;
    setSaving(true);
    try { await onSave(firmante.trim()); onClose(); }
    finally { setSaving(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-base font-bold text-gray-800">Firmar documento</h3>
            <p className="text-xs text-teal-600 mt-0.5">{fdoc.nombre}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Preview del documento */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{cat.icono}</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{fdoc.nombre}</p>
              <p className="text-xs text-gray-500">{cat.base}</p>
              <p className="text-xs text-gray-400 mt-0.5">Versión {fdoc.version}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleFirmar} className="px-6 py-5 space-y-4">
          <div>
            <label className={LABEL}>Director Técnico firmante *</label>
            <input
              className={INPUT}
              value={firmante}
              onChange={e => setFirmante(e.target.value)}
              placeholder="Nombre completo del Director Técnico"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              La firma tiene validez ante la Secretaría de Salud departamental.
            </p>
          </div>

          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-xs text-teal-700">
            <p className="font-bold mb-1">✍️ Firma digital electrónica</p>
            <p>Al firmar confirmas que revisaste y aprobaste este documento como Director Técnico responsable de la habilitación. Fecha: {new Date().toLocaleDateString('es-CO')}.</p>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className={BTN_S}>Cancelar</button>
            <button type="submit" disabled={saving} className={BTN_P}>
              {saving ? 'Firmando…' : '✍️ Firmar documento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function FirmaPage() {
  const { user, nombre: ipsNombre } = useAuth();
  const { items, loading, firmar, revocar, verificarIntegridad } = useFirma(user?.uid ?? null);
  const cfg = useIPSConfigLocal(user?.uid ?? null);
  const { toast, show } = useToast();

  const [firmaModal,   setFirmaModal]   = useState<FirmaDoc | null>(null);
  const [revocarConf,  setRevocarConf]  = useState<FirmaDoc | null>(null);
  const [verificando,  setVerificando]  = useState<string | null>(null);

  const firmados   = items.filter(d => d.firmado);
  const sinFirmar  = items.filter(d => !d.firmado);
  const porcentaje = items.length > 0 ? Math.round((firmados.length / items.length) * 100) : 0;

  async function handleFirma(firmante: string) {
    if (!firmaModal) return;
    const contenido = contenidoParaFirmar(firmaModal.id as FirmaDocId, cfg);
    await firmar(firmaModal.id as FirmaDocId, firmante, contenido);
    logSecurityEvent('documento_firmado', 'firma', firmaModal.nombre);
    show(`✅ ${firmaModal.nombre} firmado correctamente`, 'success');
  }

  async function handleRevocar() {
    if (!revocarConf) return;
    await revocar(revocarConf.id as FirmaDocId);
    setRevocarConf(null);
    show('Firma revocada', 'info');
  }

  async function handleVerificar(item: FirmaDoc) {
    setVerificando(item.id);
    try {
      const contenido = contenidoParaFirmar(item.id, cfg);
      const r = await verificarIntegridad(item, contenido);
      if (!r.valido) {
        show('⚠️ No se pudo confirmar la firma con el servidor.', 'error');
      } else if (!r.contenidoCoincide) {
        show('⚠️ El documento cambió después de firmarse — requiere refirmar.', 'error');
      } else {
        show(`✅ Firma íntegra — firmada por ${r.firmadoPor}`, 'success');
      }
    } catch (e) {
      show(`No se pudo verificar: ${(e as Error).message}`, 'error');
    } finally {
      setVerificando(null);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <SectionHeader
        title="Firma y Versiones"
        subtitle="Control documental con firma del Director Técnico · Res. 1732/2026"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total documentos"  value={items.length}    icon="📄" />
        <KpiCard label="Firmados"          value={firmados.length}  icon="✅" />
        <KpiCard label="Sin firma"         value={sinFirmar.length} icon="⏳" borderColorClass={sinFirmar.length > 0 ? "border-amber-400" : "border-gray-200"} colorClass={sinFirmar.length > 0 ? "text-amber-600" : "text-gray-800"} />
        <KpiCard label="Completitud"       value={`${porcentaje}%`} icon="📊" />
      </div>

      {/* Barra de progreso */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Estado documental</p>
          <p className="text-sm font-bold text-teal-600">{porcentaje}% firmado</p>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        {sinFirmar.length > 0 && (
          <p className="text-xs text-amber-600 mt-2">
            ⚠️ {sinFirmar.length} documento{sinFirmar.length !== 1 ? 's' : ''} pendiente{sinFirmar.length !== 1 ? 's' : ''} de firma del Director Técnico
          </p>
        )}
      </div>

      {/* Documentos sin firmar */}
      {sinFirmar.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Pendientes de firma ({sinFirmar.length})
          </h2>
          <div className="grid gap-3">
            {sinFirmar.map(d => {
              const cat = FIRMA_CATALOGO.find(c => c.id === d.id)!;
              return (
                <div
                  key={d.id}
                  className="bg-white border-2 border-amber-200 rounded-xl p-5 flex items-center justify-between hover:border-amber-300 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{cat.icono}</span>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{d.nombre}</p>
                      <p className="text-xs text-gray-500">{cat.base}</p>
                      <p className="text-xs text-amber-600 mt-0.5">⏳ Sin firma — Versión {d.version}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFirmaModal(d)}
                    className={BTN_P}
                  >
                    ✍️ Firmar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Documentos firmados */}
      {firmados.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Firmados ({firmados.length})
          </h2>
          <div className="grid gap-3">
            {firmados.map(d => {
              const cat = FIRMA_CATALOGO.find(c => c.id === d.id)!;
              return (
                <div
                  key={d.id}
                  className="bg-white border border-green-200 rounded-xl p-5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{cat.icono}</span>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{d.nombre}</p>
                      <p className="text-xs text-gray-500">{cat.base}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                          ✅ Firmado
                        </span>
                        <span className="text-xs text-gray-400">
                          {d.firmante} · {d.fecha}
                        </span>
                        <span className="text-xs text-gray-400">v{d.version}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVerificar(d)}
                      disabled={verificando === d.id}
                      className="text-xs text-teal-600 hover:text-teal-800 transition-colors px-3 py-1.5 border border-teal-200 hover:border-teal-300 rounded-lg disabled:opacity-50"
                    >
                      {verificando === d.id ? 'Verificando…' : '🔎 Verificar integridad'}
                    </button>
                    <button
                      onClick={() => setRevocarConf(d)}
                      className="text-xs text-gray-400 hover:text-red-600 transition-colors px-3 py-1.5 border border-gray-200 hover:border-red-200 rounded-lg"
                    >
                      Revocar firma
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Nota legal */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
        <p className="font-bold mb-1">ℹ️ Nota sobre firma electrónica</p>
        <p>
          Cada firma queda sellada con un hash del contenido exacto del documento y un HMAC generado
          por el servidor (nunca por el navegador), en un registro que ningún usuario puede editar o
          borrar — cumple el estándar de "firma electrónica" del Art. 7 de la Ley 527/1999 y el
          Decreto 1074/2015: identifica al firmante y detecta si el documento cambió después de
          firmarse. No es una "firma digital" certificada (Art. 28, Decreto 2364/2012, que requiere
          una Entidad de Certificación Digital acreditada como Certicámara o Andes SCD); para
          documentos de alto valor jurídico, complementa con esa vía o con firma manuscrita.
        </p>
      </div>

      {/* Modales */}
      {firmaModal && (
        <FirmaModal
          doc={firmaModal}
          directorDefault={ipsNombre ?? ''}
          onSave={handleFirma}
          onClose={() => setFirmaModal(null)}
        />
      )}

      {revocarConf && (
        <ConfirmModal
          title="Revocar firma"
          description={`¿Revocar la firma de "${revocarConf.nombre}"? El documento quedará sin firma del Director Técnico.`}
          onConfirm={handleRevocar}
          onCancel={() => setRevocarConf(null)}
          confirmVariant="danger"
        />
      )}

      {toast && <Toast toast={toast} />}
    </div>
  );
}
