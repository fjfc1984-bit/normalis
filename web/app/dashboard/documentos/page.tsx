'use client';

/**
 * web/app/dashboard/documentos/page.tsx
 * Módulo de Documentos Normativos — generación y vista previa de 6 manuales
 * Base legal: Res. 1732/2026 · Decreto 351/2014 · Decreto 4725/2005
 */

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { DOC_CATALOGO, IPS_CONFIG_DEFAULTS } from '@/lib/docTypes';
import type { DocId, DocMeta, IPSConfig } from '@/lib/docTypes';
import { generarDocumento, DOC_PRINT_CSS } from '@/lib/docTemplates';
import {
  SectionHeader, LoadingSpinner, Toast, useToast, EmptyState,
} from '@/components/ui';

// ── Hook: datos de configuración de la IPS ────────────────────────────────────
function useIPSConfig(uid: string | null) {
  const [cfg, setCfg] = useState<IPSConfig>(IPS_CONFIG_DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    getDoc(doc(db, 'usuarios', uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        // Merge Firestore data + any locally saved overrides
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
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [uid]);

  /** Persiste los campos editables en localStorage */
  function saveCfgOverrides(overrides: Partial<Pick<IPSConfig, 'director' | 'rm' | 'esp'>>) {
    const prev = (() => {
      try { return JSON.parse(localStorage.getItem('normalis_doc_cfg') ?? '{}'); }
      catch { return {}; }
    })();
    localStorage.setItem('normalis_doc_cfg', JSON.stringify({ ...prev, ...overrides }));
    setCfg(c => ({ ...c, ...overrides }));
  }

  return { cfg, loading, saveCfgOverrides };
}

// ── Panel de configuración de datos IPS ───────────────────────────────────────
function PanelConfigIPS({
  cfg,
  onSave,
}: {
  cfg: IPSConfig;
  onSave: (overrides: Partial<Pick<IPSConfig, 'director' | 'rm' | 'esp'>>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [director, setDirector] = useState(cfg.director);
  const [rm, setRm] = useState(cfg.rm);
  const [esp, setEsp] = useState(cfg.esp);

  // Sync when cfg changes
  useEffect(() => {
    setDirector(cfg.director);
    setRm(cfg.rm);
    setEsp(cfg.esp);
  }, [cfg.director, cfg.rm, cfg.esp]);

  const INPUT = `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4
                   hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-base">🏥</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800">{cfg.nombre || 'Mi establecimiento'}</p>
            <p className="text-xs text-gray-400">
              {cfg.nit ? `NIT ${cfg.nit} · ` : ''}{cfg.ciudad || 'Colombia'}
              {cfg.director && ` · ${cfg.director}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-teal-600 font-medium">Editar datos</span>
          <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">
            El nombre, NIT y ciudad se leen de tu perfil. Los campos adicionales
            se guardan localmente y aparecen en todos los documentos generados.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                Director Técnico
              </label>
              <input
                value={director}
                onChange={e => setDirector(e.target.value)}
                placeholder="Dr. Juan Pérez"
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                Registro Médico (RM)
              </label>
              <input
                value={rm}
                onChange={e => setRm(e.target.value)}
                placeholder="RM 12345"
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                Especialidad principal
              </label>
              <input
                value={esp}
                onChange={e => setEsp(e.target.value)}
                placeholder="Medicina General"
                className={INPUT}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { onSave({ director, rm, esp }); setOpen(false); }}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white
                         text-xs font-bold rounded-lg transition-colors"
            >
              ✓ Guardar datos
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700
                         text-xs font-semibold rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tarjeta de documento ───────────────────────────────────────────────────────
function DocCard({
  meta,
  onVer,
  onImprimir,
}: {
  meta: DocMeta;
  onVer: (id: DocId) => void;
  onImprimir: (id: DocId) => void;
}) {
  return (
    <div className={`bg-white rounded-xl border-2 ${meta.borderColor}
                     p-5 flex flex-col gap-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-start gap-3">
        <span className="text-3xl flex-shrink-0">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${meta.color}`}>
            {meta.categoria}
          </p>
          <h3 className="text-sm font-bold text-gray-800 leading-snug">{meta.title}</h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{meta.descripcion}</p>
        </div>
      </div>

      <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-1.5">
        📋 {meta.norma}
      </div>

      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => onVer(meta.id)}
          className="flex-1 py-2 bg-teal-50 hover:bg-teal-100 border border-teal-200
                     text-teal-700 text-xs font-bold rounded-lg transition-colors"
        >
          👁 Ver documento
        </button>
        <button
          onClick={() => onImprimir(meta.id)}
          className="px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200
                     text-gray-600 text-xs font-bold rounded-lg transition-colors"
          title="Imprimir / Exportar PDF"
        >
          🖨️
        </button>
      </div>
    </div>
  );
}

// ── Viewer modal (overlay) ────────────────────────────────────────────────────
function DocViewer({
  meta,
  html,
  onClose,
  onPrint,
}: {
  meta: DocMeta;
  html: string;
  onClose: () => void;
  onPrint: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh]
                      flex flex-col overflow-hidden">
        {/* Header del viewer */}
        <div className="flex items-center justify-between px-6 py-4
                        border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{meta.icon}</span>
            <div>
              <h3 className="text-sm font-bold text-gray-800">{meta.fullTitle}</h3>
              <p className="text-xs text-gray-400">{meta.norma}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrint}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700
                         text-white text-sm font-bold rounded-xl transition-colors"
            >
              🖨️ Imprimir / PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100
                         rounded-lg transition-colors text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Papel del documento */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
          <div
            className="doc-paper bg-white rounded-lg shadow-sm mx-auto p-10"
            style={{ maxWidth: '760px', fontFamily: 'Georgia, serif' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Estilos del doc-paper (inline style tag via useEffect) ────────────────────
const DOC_VIEWER_STYLES = `
  .doc-paper h2 {
    font-size: 14px; font-weight: 800; margin: 24px 0 10px;
    padding-bottom: 4px; border-bottom: 2px solid #0d9488;
    font-family: 'Segoe UI', sans-serif; color: #0f766e;
  }
  .doc-paper h3 {
    font-size: 13px; font-weight: 700; margin: 16px 0 6px;
    font-family: 'Segoe UI', sans-serif;
  }
  .doc-paper .doc-header-meta {
    text-align: center; color: #64748b; font-size: 12px;
    margin-bottom: 28px; font-family: 'Segoe UI', sans-serif;
    border-bottom: 1px solid #e2e8f0; padding-bottom: 14px;
    line-height: 1.8;
  }
  .doc-paper table {
    width: 100%; border-collapse: collapse; margin: 12px 0;
    font-family: 'Segoe UI', sans-serif; font-size: 12px;
  }
  .doc-paper th {
    background: #0d9488; color: #fff; padding: 8px 10px;
    text-align: left; font-weight: 700;
  }
  .doc-paper td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
  .doc-paper tr:nth-child(even) td { background: #f8fafc; }
  .doc-paper .sign-block {
    margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr;
    gap: 40px; font-family: 'Segoe UI', sans-serif; font-size: 12px;
  }
  .doc-paper .sign-line {
    border-top: 1px solid #1e293b; margin-top: 40px; padding-top: 6px;
  }
  .doc-paper ul { margin: 8px 0 8px 20px; }
  .doc-paper li { margin-bottom: 4px; line-height: 1.7; }
  .doc-paper p { margin: 8px 0; text-align: justify; line-height: 1.8; }
  .doc-paper strong { font-weight: 700; }
`;

// ════════════════════════════════════════════════════════════════════════════
//  Página principal
// ════════════════════════════════════════════════════════════════════════════
export default function DocumentosPage() {
  const { user, loading: authLoading } = useAuth();
  const { cfg, loading: cfgLoading, saveCfgOverrides } = useIPSConfig(user?.uid ?? null);
  const { toast, show } = useToast();

  const [viewer, setViewer] = useState<{ meta: DocMeta; html: string } | null>(null);

  // Inyectar estilos del doc-paper una sola vez
  useEffect(() => {
    const id = 'normalis-doc-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = DOC_VIEWER_STYLES;
    document.head.appendChild(style);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  const handleVer = useCallback((id: DocId) => {
    const meta = DOC_CATALOGO.find(d => d.id === id);
    if (!meta) return;
    const html = generarDocumento(id, cfg);
    setViewer({ meta, html });
  }, [cfg]);

  const handleImprimir = useCallback((id: DocId) => {
    const meta = DOC_CATALOGO.find(d => d.id === id);
    if (!meta) return;
    const html = generarDocumento(id, cfg);
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { show('Permite ventanas emergentes para imprimir.', 'error'); return; }
    w.document.write(`<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8">
<title>${meta.fullTitle}</title>
<style>${DOC_PRINT_CSS}</style>
</head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }, [cfg, show]);

  if (authLoading || cfgLoading) return <LoadingSpinner fullHeight />;

  return (
    <div className="p-6 space-y-6">
      <Toast toast={toast} />

      {viewer && (
        <DocViewer
          meta={viewer.meta}
          html={viewer.html}
          onClose={() => setViewer(null)}
          onPrint={() => handleImprimir(viewer.meta.id)}
        />
      )}

      <SectionHeader
        title="Documentos Normativos"
        subtitle="6 manuales personalizados para tu IPS — listos para imprimir y presentar en visita de habilitación"
        actions={
          <button
            onClick={() => {
              DOC_CATALOGO.forEach(d => handleImprimir(d.id));
              show('Generando todos los documentos…', 'info');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700
                       text-white text-sm font-bold rounded-xl transition-colors"
          >
            📦 Generar todos
          </button>
        }
      />

      {/* Panel de datos IPS */}
      <PanelConfigIPS cfg={cfg} onSave={overrides => {
        saveCfgOverrides(overrides);
        show('Datos del establecimiento actualizados.', 'success');
      }} />

      {/* Aviso sobre datos incompletos */}
      {(!cfg.director || cfg.director === 'Director Técnico') && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
          <p className="text-sm text-amber-800">
            <strong>Completa los datos de tu establecimiento</strong> para que los documentos
            incluyan el nombre del director técnico, registro médico y especialidad.
            Haz clic en "Editar datos" arriba.
          </p>
        </div>
      )}

      {/* Grilla de documentos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOC_CATALOGO.map(meta => (
          <DocCard
            key={meta.id}
            meta={meta}
            onVer={handleVer}
            onImprimir={handleImprimir}
          />
        ))}
      </div>

      {/* Nota legal */}
      <p className="text-xs text-gray-400 text-center pt-2">
        Documentos generados conforme a Res. 1732/2026, Decreto 351/2014, Decreto 4725/2005
        y normativa vigente del Ministerio de Salud de Colombia · NormaLis
      </p>
    </div>
  );
}
