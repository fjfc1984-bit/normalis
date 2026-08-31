'use client';

/**
 * web/app/dashboard/informe-auditoria/page.tsx
 * Informe de Auditoría — formaliza cualquier auditoría o eventualidad
 * (habilitación, incidente, vigilancia sanitaria, u otra registrada
 * manualmente) en un documento con las secciones estándar de un informe de
 * auditoría: introducción, justificación, objetivos, metodología, alcance,
 * hallazgos, conclusiones, recomendaciones y salvedad.
 *
 * Flujo: elegir una fuente (o "manual") → "Generar borrador" auto-rellena
 * alcance/hallazgos/recomendaciones desde los datos ya registrados (y deja
 * el resto de secciones con un texto base editable, nunca inventado) →
 * el usuario edita libremente → guarda y/o exporta a PDF (mismo patrón
 * window.open+print que reporte-ejecutivo/page.tsx).
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useInformesAuditoria } from '@/lib/useInformesAuditoria';
import {
  listarAuditoriasCompletadas, listarIncidentes, listarEventosVigilancia, generarBorrador,
  type FuenteOpcion,
} from '@/lib/informeAuditoriaAutoFill';
import {
  FUENTE_LABELS, SECCION_LABELS, SECCION_ORDEN, SECCIONES_VACIAS,
  type FuenteInforme, type InformeAuditoria, type InformeFormData,
} from '@/lib/informeAuditoriaTypes';
import { SectionHeader, LoadingSpinner, EmptyState } from '@/components/ui';

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formaVacia(): InformeFormData {
  return {
    titulo: '',
    fuente: 'manual',
    fuenteRefId: null,
    fuenteLabel: '',
    secciones: { ...SECCIONES_VACIAS },
    elaboradoPor: '',
    cargoElaborador: '',
    fechaInforme: hoyISO(),
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function exportarPDF(informe: InformeFormData, ipsNombre: string) {
  const fechaGen = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

  const seccionesHtml = SECCION_ORDEN.map(key => `
    <h2>${escapeHtml(SECCION_LABELS[key])}</h2>
    <p style="white-space:pre-wrap;font-size:12px;line-height:1.5">${informe.secciones[key] ? escapeHtml(informe.secciones[key]) : '<span style="color:#999">Sin contenido</span>'}</p>
  `).join('');

  const metaLineas = [
    informe.fuenteLabel ? `Fuente: ${escapeHtml(informe.fuenteLabel)}` : '',
    `Fecha del informe: ${informe.fechaInforme || '—'}`,
    informe.elaboradoPor ? `Elaborado por: ${escapeHtml(informe.elaboradoPor)}${informe.cargoElaborador ? ' — ' + escapeHtml(informe.cargoElaborador) : ''}` : '',
  ].filter(Boolean).join('<br/>');

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>${escapeHtml(informe.titulo || 'Informe de auditoría')}</title>
<style>body{font-family:Arial,sans-serif;margin:24px;color:#111}
h1{font-size:18px;margin-bottom:2px}h2{font-size:13px;margin:20px 0 6px;color:#0d9488}
.sub{font-size:12px;color:#555;margin-bottom:4px}
.meta{font-size:11px;color:#666;margin-bottom:16px;border-bottom:1px solid #e5e7eb;padding-bottom:12px}
@media print{body{margin:0}}</style></head><body>
<h1>${escapeHtml(informe.titulo || 'Informe de auditoría')}</h1>
<p class="sub">${escapeHtml(ipsNombre || '')} · Generado el ${fechaGen}</p>
<div class="meta">${metaLineas}</div>
${seccionesHtml}
<p style="font-size:10px;color:#888;margin-top:16px">Informe generado por NormaLis · normalis.co</p>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { alert('Permite ventanas emergentes para exportar.'); return; }
  w.document.write(html); w.document.close();
  setTimeout(() => w.print(), 400);
}

export default function InformeAuditoriaPage() {
  const { user, nit, nombre: ipsNombre, loading: authLoading } = useAuth();
  const { informes, loading, crearInforme, actualizarInforme, eliminarInforme } = useInformesAuditoria(
    user?.uid ?? null, nit ?? null,
  );

  const [vista, setVista] = useState<'lista' | 'form'>('lista');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<InformeFormData | null>(null);

  // ── Paso 1: selector de fuente (solo para informes nuevos) ──────────────
  const [fuenteSel, setFuenteSel] = useState<FuenteInforme>('manual');
  const [fuenteOpciones, setFuenteOpciones] = useState<FuenteOpcion[]>([]);
  const [fuenteRefIdSel, setFuenteRefIdSel] = useState('');
  const [loadingOpciones, setLoadingOpciones] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!user || fuenteSel === 'manual') { setFuenteOpciones([]); return; }
    setLoadingOpciones(true);
    setFuenteRefIdSel('');
    (async () => {
      try {
        if (fuenteSel === 'auditoria') setFuenteOpciones(await listarAuditoriasCompletadas(user.uid));
        else if (fuenteSel === 'incidente') setFuenteOpciones(await listarIncidentes(user.uid));
        else if (fuenteSel === 'vigilancia') setFuenteOpciones(await listarEventosVigilancia(user.uid, nit));
      } catch {
        setFuenteOpciones([]);
      } finally {
        setLoadingOpciones(false);
      }
    })();
  }, [fuenteSel, user, nit]);

  function abrirNuevo() {
    setEditingId(null);
    setFormData(null);
    setFuenteSel('manual');
    setFuenteRefIdSel('');
    setVista('form');
  }

  function abrirEditar(informe: InformeAuditoria) {
    setEditingId(informe.id);
    setFormData({
      titulo: informe.titulo,
      fuente: informe.fuente,
      fuenteRefId: informe.fuenteRefId,
      fuenteLabel: informe.fuenteLabel,
      secciones: { ...informe.secciones },
      elaboradoPor: informe.elaboradoPor,
      cargoElaborador: informe.cargoElaborador,
      fechaInforme: informe.fechaInforme,
    });
    setVista('form');
  }

  async function handleGenerarBorrador() {
    if (!user) return;
    setGenerando(true);
    try {
      if (fuenteSel === 'manual') {
        const { secciones } = await generarBorrador('manual', null, user.uid, nit, ipsNombre);
        setFormData({ ...formaVacia(), fuente: 'manual', secciones, titulo: 'Informe de auditoría' });
      } else {
        const { titulo, fuenteLabel, secciones } = await generarBorrador(fuenteSel, fuenteRefIdSel, user.uid, nit, ipsNombre);
        setFormData({
          ...formaVacia(),
          titulo, fuenteLabel, secciones,
          fuente: fuenteSel,
          fuenteRefId: fuenteRefIdSel,
        });
      }
    } finally {
      setGenerando(false);
    }
  }

  async function handleGuardar() {
    if (!user || !formData) return;
    if (!formData.titulo.trim()) { alert('El informe necesita un título.'); return; }
    setGuardando(true);
    try {
      if (editingId) await actualizarInforme(editingId, formData);
      else await crearInforme(user.uid, nit, formData);
      setVista('lista');
      setFormData(null);
      setEditingId(null);
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(informe: InformeAuditoria) {
    if (!confirm(`¿Eliminar el informe "${informe.titulo}"? Esta acción no se puede deshacer.`)) return;
    await eliminarInforme(informe.id);
  }

  function setSeccion(key: keyof InformeFormData['secciones'], value: string) {
    setFormData(prev => prev ? { ...prev, secciones: { ...prev.secciones, [key]: value } } : prev);
  }

  if (authLoading || loading) return <LoadingSpinner fullHeight />;

  // ── Vista: editor (picker de fuente, o formulario ya generado) ──────────
  if (vista === 'form') {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <SectionHeader
          title={editingId ? 'Editar informe de auditoría' : 'Nuevo informe de auditoría'}
          subtitle="Introducción, justificación, objetivos, metodología, alcance, hallazgos, conclusiones, recomendaciones y salvedad"
          actions={
            <button
              onClick={() => { setVista('lista'); setFormData(null); setEditingId(null); }}
              className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-sm font-semibold rounded-lg transition-colors"
            >
              ← Volver
            </button>
          }
        />

        {!formData && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">¿Sobre qué eventualidad es este informe?</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(Object.keys(FUENTE_LABELS) as FuenteInforme[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFuenteSel(f)}
                  className={`px-3 py-3 rounded-xl border text-sm font-medium text-left transition-colors ${
                    fuenteSel === f ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {FUENTE_LABELS[f]}
                </button>
              ))}
            </div>

            {fuenteSel !== 'manual' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Selecciona el registro</label>
                {loadingOpciones ? (
                  <LoadingSpinner size="sm" />
                ) : fuenteOpciones.length === 0 ? (
                  <p className="text-sm text-gray-400">No hay registros disponibles para esta fuente todavía.</p>
                ) : (
                  <select
                    value={fuenteRefIdSel}
                    onChange={e => setFuenteRefIdSel(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">— Selecciona —</option>
                    {fuenteOpciones.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                )}
              </div>
            )}

            <button
              onClick={handleGenerarBorrador}
              disabled={generando || (fuenteSel !== 'manual' && !fuenteRefIdSel)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {generando ? 'Generando borrador…' : '✨ Generar borrador'}
            </button>
          </div>
        )}

        {formData && (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Título del informe</label>
                <input
                  value={formData.titulo}
                  onChange={e => setFormData(prev => prev && { ...prev, titulo: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold"
                />
              </div>
              {formData.fuenteLabel && (
                <p className="text-xs text-gray-400">Fuente: {FUENTE_LABELS[formData.fuente]} · {formData.fuenteLabel}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha del informe</label>
                  <input
                    type="date"
                    value={formData.fechaInforme}
                    onChange={e => setFormData(prev => prev && { ...prev, fechaInforme: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Elaborado por</label>
                  <input
                    value={formData.elaboradoPor}
                    onChange={e => setFormData(prev => prev && { ...prev, elaboradoPor: e.target.value })}
                    placeholder="Nombre completo"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Cargo</label>
                  <input
                    value={formData.cargoElaborador}
                    onChange={e => setFormData(prev => prev && { ...prev, cargoElaborador: e.target.value })}
                    placeholder="Ej. Director Técnico"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {SECCION_ORDEN.map(key => (
              <div key={key} className="bg-white rounded-2xl border border-gray-200 p-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">{SECCION_LABELS[key]}</label>
                <textarea
                  value={formData.secciones[key]}
                  onChange={e => setSeccion(key, e.target.value)}
                  rows={key === 'hallazgos' || key === 'recomendaciones' ? 8 : 4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm leading-relaxed"
                  placeholder={`Redacta la sección "${SECCION_LABELS[key]}"…`}
                />
              </div>
            ))}

            <div className="flex gap-3 justify-end sticky bottom-4">
              <button
                onClick={() => exportarPDF(formData, ipsNombre)}
                className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-sm font-semibold rounded-lg shadow-sm transition-colors"
              >
                📄 Exportar PDF
              </button>
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
              >
                {guardando ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar informe'}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Vista: lista de informes guardados ────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <SectionHeader
        title="Informe de Auditoría"
        subtitle="Formaliza cualquier auditoría o eventualidad en un informe con introducción, justificación, objetivos, metodología, alcance, hallazgos, conclusiones, recomendaciones y salvedad"
        actions={
          <button
            onClick={abrirNuevo}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            + Nuevo informe
          </button>
        }
      />

      {informes.length === 0 ? (
        <EmptyState
          icon="📑"
          title="Sin informes todavía"
          description="Genera tu primer informe a partir de una auditoría, un incidente o un evento de vigilancia sanitaria ya registrado — o empieza uno manual."
          action={
            <button
              onClick={abrirNuevo}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              + Nuevo informe
            </button>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {informes.map(inf => (
            <div key={inf.id} className="p-4 flex items-center gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800 truncate">{inf.titulo}</p>
                <p className="text-xs text-gray-400">
                  {FUENTE_LABELS[inf.fuente]}{inf.fuenteLabel ? ` · ${inf.fuenteLabel}` : ''} · {inf.fechaInforme}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => abrirEditar(inf)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => exportarPDF(inf, ipsNombre)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => handleEliminar(inf)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
