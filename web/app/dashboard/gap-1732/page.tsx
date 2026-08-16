'use client';

/**
 * web/app/dashboard/gap-1732/page.tsx
 * Análisis de Brecha — Resolución 1732 de 2026
 *
 * La Res. 1732/2026 (publicada 5 ago 2026) reemplaza Res. 3100/2019.
 * Este módulo ayuda a cada IPS a identificar QUÉ debe implementar
 * durante el período de transición de 12 meses (hasta agosto 2027).
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { SectionHeader, LoadingSpinner, Toast, useToast } from '@/components/ui';
import Link from 'next/link';
import { useEffect } from 'react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Estado = 'cumple' | 'parcial' | 'no_cumple' | 'no_aplica';

interface ItemGap {
  id:          string;
  categoria:   string;
  titulo:      string;
  descripcion: string;
  esNuevo:     boolean;   // true = novedad de 1732/2026 (no existía en 3100/2019)
  urgencia:    'alta' | 'media' | 'baja';
  plazo:       string;
  guia:        string;    // qué debe hacer la IPS
}

interface RespGap {
  [id: string]: Estado;
}

// ── Checklist completo Res. 1732/2026 ────────────────────────────────────────

const ITEMS_GAP: ItemGap[] = [
  // ─── HISTORIA CLÍNICA ELECTRÓNICA INTEROPERABLE (IHCE) ──────────────────
  {
    id: 'ihce_01',
    categoria: 'IHCE — Historia Clínica Electrónica Interoperable',
    titulo: 'Sistema de HC con capacidad de interoperabilidad',
    descripcion: 'La Res. 1732/2026 exige que las IPS avancen hacia la Historia Clínica Electrónica Interoperable (IHCE). El sistema debe ser capaz de intercambiar información clínica con otras IPS y con el sistema nacional de salud.',
    esNuevo: true,
    urgencia: 'alta',
    plazo: 'Diciembre 2026 (plan de adecuación progresiva)',
    guia: 'Evalúa si tu sistema de HC actual tiene API o mecanismo de exportación en formatos estándar (HL7 FHIR, CDA). Si no, inicia gestión con el proveedor de software.',
  },
  {
    id: 'ihce_02',
    categoria: 'IHCE — Historia Clínica Electrónica Interoperable',
    titulo: 'Política de seguridad de datos clínicos electrónicos',
    descripcion: 'La IHCE requiere política documentada de seguridad de la información que incluya autenticación, trazabilidad de accesos y cifrado de datos clínicos.',
    esNuevo: true,
    urgencia: 'alta',
    plazo: 'Junio 2027',
    guia: 'Documenta quién tiene acceso a la HC electrónica, cómo se registra cada acceso (log de auditoría) y cómo se protegen los datos en tránsito y en reposo (Ley 1581/2012).',
  },
  {
    id: 'ihce_03',
    categoria: 'IHCE — Historia Clínica Electrónica Interoperable',
    titulo: 'Firma electrónica válida en documentos clínicos',
    descripcion: 'Los registros de la IHCE deben tener mecanismo de firma electrónica con validez legal equivalente a la firma manuscrita.',
    esNuevo: true,
    urgencia: 'media',
    plazo: 'Agosto 2027',
    guia: 'Verifica que tu software de HC genere firmas digitales certificadas o utiliza plataformas como la Firma Electrónica Simple del Gobierno. El módulo de Firma de NormaLis puede apoyar este proceso.',
  },
  // ─── RESUMEN DIGITAL DE ATENCIÓN (RDA) ───────────────────────────────────
  {
    id: 'rda_01',
    categoria: 'RDA — Resumen Digital de Atención',
    titulo: 'Generación del RDA al alta de cada episodio',
    descripcion: 'La Res. 1732/2026 establece que toda IPS debe generar un Resumen Digital de Atención (RDA) al momento del alta de cada episodio de atención. Es obligatorio entregarlo al paciente.',
    esNuevo: true,
    urgencia: 'alta',
    plazo: 'Febrero 2027',
    guia: 'El RDA debe incluir: diagnóstico (CIE-10), tratamiento administrado, medicamentos prescritos, indicaciones de seguimiento y datos de contacto de la IPS. Define el formato y responsable de generarlo.',
  },
  {
    id: 'rda_02',
    categoria: 'RDA — Resumen Digital de Atención',
    titulo: 'Registro del RDA en la Historia Clínica',
    descripcion: 'El RDA generado debe quedar incorporado en la historia clínica del episodio y ser trazable para auditorías posteriores.',
    esNuevo: true,
    urgencia: 'media',
    plazo: 'Agosto 2027',
    guia: 'Define el procedimiento para archivar el RDA en la HC. Si la HC es en papel, el RDA puede ser una hoja estandarizada firmada. Documenta el proceso en tus protocolos de egreso.',
  },
  // ─── TELEMEDICINA ─────────────────────────────────────────────────────────
  {
    id: 'tele_01',
    categoria: 'Telemedicina — 4 Modalidades Res. 1732/2026',
    titulo: 'Definición de modalidades de telemedicina habilitadas',
    descripcion: 'La Res. 1732/2026 define 4 modalidades específicas: Teleconsulta, Telexperticia, Teleconcepto y Telemonitoreo. Si la IPS presta alguna de estas, debe estar registrada en REPS por cada modalidad.',
    esNuevo: true,
    urgencia: 'alta',
    plazo: 'Inmediato si ya presta el servicio',
    guia: 'Revisa si actualmente prestas algún servicio de telemedicina (aunque sea informal por videollamada). Si es así, debes habilitarlo formalmente en REPS. Cada modalidad requiere registro independiente.',
  },
  {
    id: 'tele_02',
    categoria: 'Telemedicina — 4 Modalidades Res. 1732/2026',
    titulo: 'Plataforma tecnológica con cifrado y autenticación',
    descripcion: 'Las plataformas de telemedicina deben garantizar cifrado extremo a extremo y autenticación de dos factores para proteger la privacidad del paciente (Ley 1581/2012).',
    esNuevo: true,
    urgencia: 'alta',
    plazo: 'Al momento de habilitar el servicio',
    guia: 'No uses WhatsApp ni videollamadas no cifradas para telemedicina. Plataformas válidas: Zoom for Healthcare, Microsoft Teams (Health Shield), o sistemas propios con cifrado TLS 1.3. Documenta el proveedor.',
  },
  {
    id: 'tele_03',
    categoria: 'Telemedicina — 4 Modalidades Res. 1732/2026',
    titulo: 'Consentimiento informado específico para telemedicina',
    descripcion: 'Cada modalidad de telemedicina requiere consentimiento informado específico que explique las limitaciones del servicio a distancia y los mecanismos de referencia urgente.',
    esNuevo: false,
    urgencia: 'media',
    plazo: 'Al momento de habilitar el servicio',
    guia: 'Diseña un consentimiento informado que incluya: qué servicio recibirá por telemedicina, las limitaciones del diagnóstico remoto, cómo se le referiría en caso de emergencia y cómo se protegen sus datos. El módulo de Consentimientos de NormaLis puede ayudarte.',
  },
  {
    id: 'tele_04',
    categoria: 'Telemedicina — 4 Modalidades Res. 1732/2026',
    titulo: 'Protocolo de referencia urgente en telemedicina',
    descripcion: 'Toda IPS que preste telemedicina debe tener un protocolo documentado que defina cómo se activa una referencia urgente cuando el médico telemático identifica una emergencia.',
    esNuevo: true,
    urgencia: 'alta',
    plazo: 'Al momento de habilitar el servicio',
    guia: 'El protocolo debe responder: ¿qué hace el médico si detecta una emergencia? ¿A qué IPS refiere? ¿Quién activa el CRUE? ¿Cómo se le informa al paciente? Documenta el flujograma y socialízalo con el equipo.',
  },
  // ─── PLAN DE ADECUACIÓN PROGRESIVA ───────────────────────────────────────
  {
    id: 'pap_01',
    categoria: 'Plan de Adecuación Progresiva',
    titulo: '¿La IPS está en municipio con dispersión geográfica o zona PDET?',
    descripcion: 'Las IPS en territorios especiales (municipios PDET, zonas de dispersión geográfica o difícil acceso) pueden solicitar un Plan de Adecuación Progresiva con plazos extendidos para cumplir la Res. 1732/2026.',
    esNuevo: true,
    urgencia: 'media',
    plazo: 'Solicitar antes de enero 2027',
    guia: 'Si tu IPS está en uno de estos territorios, solicita el Plan a tu Secretaría de Salud departamental. Presenta: ubicación geográfica, servicios actuales, brechas identificadas y cronograma propuesto de adecuación.',
  },
  {
    id: 'pap_02',
    categoria: 'Plan de Adecuación Progresiva',
    titulo: 'Telexperticia sincrónica para UCI en zona de dispersión',
    descripcion: 'Las UCI ubicadas en municipios con dispersión geográfica deben tener disponible telexperticia sincrónica como mecanismo de apoyo clínico especializado.',
    esNuevo: true,
    urgencia: 'alta',
    plazo: 'Junio 2027',
    guia: 'Si tienes UCI en zona de dispersión, gestiona un convenio con IPS de mayor complejidad para telexperticia sincrónica (videollamada con especialista en tiempo real). Documenta el convenio y el protocolo de activación.',
  },
  // ─── SG-SST EN SALUD (Res. 1774/2025) ─────────────────────────────────
  {
    id: 'sgsst_01',
    categoria: 'SG-SST — Res. 1774/2025',
    titulo: 'Sistema de Gestión SST implementado y actualizado',
    descripcion: 'La Res. 1774/2025 actualiza el SG-SST para el sector salud con énfasis en riesgo biológico, químico (citotóxicos, gases anestésicos) y psicosocial.',
    esNuevo: false,
    urgencia: 'alta',
    plazo: 'Inmediato — ya debería estar implementado',
    guia: 'Verifica que tu SG-SST esté actualizado con la matriz de riesgos específica para servicios de salud: riesgo biológico (OPAS/OMS), exposición a citotóxicos si aplica, carga laboral y riesgo psicosocial del personal de salud.',
  },
  {
    id: 'sgsst_02',
    categoria: 'SG-SST — Res. 1774/2025',
    titulo: 'Protocolo de exposición accidental a material biológico',
    descripcion: 'Protocolo documentado y conocido por todo el personal para manejo de exposición accidental a sangre, fluidos corporales y material cortopunzante.',
    esNuevo: false,
    urgencia: 'alta',
    plazo: 'Inmediato',
    guia: 'El protocolo debe incluir: lavado inmediato, reporte, evaluación de riesgo (VIH, HBV, HCV), profilaxis post-exposición y seguimiento serológico. Personal nuevo debe recibirlo en la inducción.',
  },
  // ─── CONTINUIDAD DE REQUISITOS EXISTENTES ────────────────────────────────
  {
    id: 'cont_01',
    categoria: 'Requisitos que continúan de Res. 3100/2019',
    titulo: 'Autoevaluación anual documentada en REPS',
    descripcion: 'La obligación de autoevaluación anual antes del vencimiento de la inscripción continúa vigente bajo la Res. 1732/2026.',
    esNuevo: false,
    urgencia: 'alta',
    plazo: 'Antes del vencimiento de inscripción',
    guia: 'Usa el módulo de Auditoría de NormaLis para generar la evidencia de autoevaluación. El Agente Pilar documenta automáticamente los hallazgos y acciones de mejora.',
  },
  {
    id: 'cont_02',
    categoria: 'Requisitos que continúan de Res. 3100/2019',
    titulo: 'PAMEC implementado con indicadores Res. 256/2016',
    descripcion: 'El PAMEC sigue siendo obligatorio. Los indicadores de calidad de la Res. 256/2016 siguen vigentes y deben medirse y reportarse.',
    esNuevo: false,
    urgencia: 'media',
    plazo: 'Continuo',
    guia: 'Usa el módulo de Indicadores de NormaLis para registrar y hacer seguimiento mensual a los indicadores obligatorios (prop_queja, tasa_infeccion, tasa_caida, etc.).',
  },
  {
    id: 'cont_03',
    categoria: 'Requisitos que continúan de Res. 3100/2019',
    titulo: 'Historia clínica conservada mínimo 20 años',
    descripcion: 'La obligación de conservar la historia clínica por mínimo 20 años continúa vigente bajo la Res. 1732/2026. Para HC electrónica, aplican requisitos adicionales de respaldo y trazabilidad.',
    esNuevo: false,
    urgencia: 'alta',
    plazo: 'Continuo',
    guia: 'Para HC en papel: garantiza almacenamiento seguro. Para HC electrónica: política de backups automáticos, pruebas de recuperación y log de auditoría de accesos. Documenta el procedimiento.',
  },
];

// ── Agrupar por categoría ─────────────────────────────────────────────────────

function agrupar(items: ItemGap[]): Record<string, ItemGap[]> {
  return items.reduce((acc, item) => {
    if (!acc[item.categoria]) acc[item.categoria] = [];
    acc[item.categoria].push(item);
    return acc;
  }, {} as Record<string, ItemGap[]>);
}

// ── Colores ───────────────────────────────────────────────────────────────────

const ESTADO_CFG: Record<Estado, { label: string; bg: string; text: string; border: string }> = {
  cumple:    { label: '✅ Cumple',          bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  parcial:   { label: '⚠️ Parcial',        bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  no_cumple: { label: '❌ No cumple',      bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  no_aplica: { label: '➖ No aplica',      bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
};

const URG_CFG = {
  alta:  { label: 'Urgente',  bg: '#fee2e2', text: '#dc2626' },
  media: { label: 'Media',    bg: '#fef9c3', text: '#ca8a04' },
  baja:  { label: 'Baja',     bg: '#f0fdf4', text: '#16a34a' },
};

// ── Score de preparación ──────────────────────────────────────────────────────

function calcScore(resp: RespGap): { pct: number; cumple: number; parcial: number; no: number; total: number } {
  let cumple = 0, parcial = 0, no = 0, aplica = 0;
  for (const item of ITEMS_GAP) {
    const e = resp[item.id];
    if (!e || e === 'no_aplica') continue;
    aplica++;
    if (e === 'cumple')    cumple++;
    if (e === 'parcial')   parcial++;
    if (e === 'no_cumple') no++;
  }
  const pct = aplica === 0 ? 0 : Math.round(((cumple + parcial * 0.5) / aplica) * 100);
  return { pct, cumple, parcial, no, total: aplica };
}

// ════════════════════════════════════════════════════════════════════════════
//  Página principal
// ════════════════════════════════════════════════════════════════════════════

export default function Gap1732Page() {
  const { user } = useAuth();
  const { toast, show } = useToast();
  const [resp, setResp] = useState<RespGap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  // ── Cargar respuestas guardadas ────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const ref = doc(db, 'gap1732', user.uid);
    getDoc(ref)
      .then(snap => { if (snap.exists()) setResp(snap.data()?.respuestas ?? {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // ── Guardar respuestas ─────────────────────────────────────────────────────
  const guardar = useCallback(async (newResp: RespGap) => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'gap1732', user.uid), {
        uid: user.uid,
        respuestas: newResp,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch {
      show('Error al guardar. Verifica tu conexión.', 'error');
    } finally {
      setSaving(false);
    }
  }, [user, show]);

  const setEstado = (id: string, estado: Estado) => {
    const newResp = { ...resp, [id]: estado };
    setResp(newResp);
    guardar(newResp);
  };

  const toggleExpandido = (id: string) =>
    setExpandidos(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (loading) return <LoadingSpinner fullHeight />;

  const score   = calcScore(resp);
  const grupos  = agrupar(ITEMS_GAP);
  const colorPct = score.pct >= 80 ? '#10b981' : score.pct >= 55 ? '#f59e0b' : '#ef4444';
  const labelPct = score.pct >= 80 ? 'Preparación avanzada' : score.pct >= 55 ? 'En transición' : 'Requiere acción urgente';
  const nuevos = ITEMS_GAP.filter(i => i.esNuevo && (!resp[i.id] || resp[i.id] === 'no_cumple')).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Toast toast={toast} />

      <SectionHeader
        title="Análisis de Brecha — Res. 1732/2026"
        subtitle="Identifica qué debes implementar durante el período de transición (ago 2026 – ago 2027)"
        actions={
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-gray-400 animate-pulse">Guardando...</span>}
            <Link
              href="/dashboard/cumplimiento"
              className="text-xs px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
            >
              ← Cumplimiento
            </Link>
          </div>
        }
      />

      {/* ── Banner informativo ──────────────────────────────────────────────── */}
      <div className="rounded-2xl p-4 flex gap-3 items-start"
           style={{ background: 'linear-gradient(135deg,#f0fdfa,#e0f2fe)', border: '1px solid #99f6e4' }}>
        <div className="text-2xl flex-shrink-0">⚡</div>
        <div>
          <p className="text-sm font-bold text-teal-900">
            Res. 1732/2026 — Publicada el 5 de agosto de 2026
          </p>
          <p className="text-xs text-teal-700 mt-0.5">
            Reemplaza integralmente la Res. 3100/2019. Tienes hasta agosto de 2027 (12 meses de transición)
            para adaptar tu IPS. Este análisis te muestra exactamente qué debes implementar y en qué orden.
          </p>
        </div>
      </div>

      {/* ── Score de preparación ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Gauge */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <svg viewBox="0 0 120 120" className="w-32 h-32">
              <circle cx="60" cy="60" r="48" fill="none" stroke="#f3f4f6" strokeWidth="10" />
              <circle cx="60" cy="60" r="48" fill="none"
                stroke={colorPct} strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 48}`}
                strokeDashoffset={`${2 * Math.PI * 48 * (1 - score.pct / 100)}`}
                strokeLinecap="round" transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
              <text x="60" y="56" textAnchor="middle" fontSize="24" fontWeight="900" fill={colorPct}>{score.pct}%</text>
              <text x="60" y="70" textAnchor="middle" fontSize="9" fill="#9ca3af">preparación</text>
            </svg>
            <p className="text-xs font-bold text-center" style={{ color: colorPct }}>{labelPct}</p>
          </div>

          {/* Estadísticas */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <p className="text-2xl font-black text-emerald-700">{score.cumple}</p>
              <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wide">Cumple</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-2xl font-black text-amber-600">{score.parcial}</p>
              <p className="text-[10px] text-amber-500 font-medium uppercase tracking-wide">Parcial</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-red-50 border border-red-100">
              <p className="text-2xl font-black text-red-600">{score.no}</p>
              <p className="text-[10px] text-red-500 font-medium uppercase tracking-wide">No cumple</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-orange-50 border border-orange-100">
              <p className="text-2xl font-black text-orange-600">{nuevos}</p>
              <p className="text-[10px] text-orange-500 font-medium uppercase tracking-wide">Novedades pendientes</p>
            </div>
          </div>
        </div>

        {score.total < ITEMS_GAP.length && (
          <p className="mt-3 text-xs text-center text-gray-400">
            Completa todos los ítems para ver tu preparación real. {ITEMS_GAP.length - score.total} ítem{ITEMS_GAP.length - score.total !== 1 ? 's' : ''} sin responder.
          </p>
        )}
      </div>

      {/* ── Checklist por categoría ─────────────────────────────────────────── */}
      {Object.entries(grupos).map(([cat, items]) => (
        <div key={cat} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2"
               style={{ borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
            <span className="text-sm font-bold text-gray-800">{cat}</span>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-bold">
              {items.filter(i => resp[i.id] === 'cumple').length}/{items.length} cumple
            </span>
          </div>

          <div className="divide-y divide-gray-50">
            {items.map(item => {
              const estado = resp[item.id];
              const estadoCfg = estado ? ESTADO_CFG[estado] : null;
              const urgCfg = URG_CFG[item.urgencia];
              const expandido = expandidos.has(item.id);

              return (
                <div key={item.id} className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Indicador nuevo */}
                    <div className="flex-shrink-0 mt-0.5">
                      {item.esNuevo ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wide"
                              style={{ background: '#fef3c7', color: '#b45309' }}>NUEVO</span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
                              style={{ background: '#f0f9ff', color: '#0369a1' }}>CONTINÚA</span>
                      )}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800">{item.titulo}</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{ background: urgCfg.bg, color: urgCfg.text }}>
                          {urgCfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.descripcion}</p>

                      {expandido && (
                        <div className="mt-3 p-3 rounded-xl text-xs leading-relaxed"
                             style={{ background: '#f0fdfa', border: '1px solid #99f6e4', color: '#134e4a' }}>
                          <p className="font-bold mb-1">📋 ¿Qué hacer?</p>
                          <p>{item.guia}</p>
                          <p className="mt-2 font-bold">📅 Plazo: <span className="font-normal">{item.plazo}</span></p>
                        </div>
                      )}

                      <button
                        onClick={() => toggleExpandido(item.id)}
                        className="mt-1.5 text-[10px] text-teal-600 hover:text-teal-800 font-medium transition-colors"
                      >
                        {expandido ? '▲ Ocultar guía' : '▼ Ver guía de implementación'}
                      </button>
                    </div>

                    {/* Selector de estado */}
                    <div className="flex-shrink-0">
                      <select
                        value={estado ?? ''}
                        onChange={e => setEstado(item.id, e.target.value as Estado)}
                        className="text-xs rounded-lg px-2 py-1.5 border font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400"
                        style={estadoCfg
                          ? { background: estadoCfg.bg, color: estadoCfg.text, borderColor: estadoCfg.border }
                          : { background: '#f9fafb', color: '#9ca3af', borderColor: '#e5e7eb' }
                        }
                      >
                        <option value="" disabled>Evaluar...</option>
                        <option value="cumple">✅ Cumple</option>
                        <option value="parcial">⚠️ Parcial</option>
                        <option value="no_cumple">❌ No cumple</option>
                        <option value="no_aplica">➖ No aplica</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* ── Próximos pasos ──────────────────────────────────────────────────── */}
      {score.no > 0 && (
        <div className="bg-white rounded-2xl border border-red-100 p-5">
          <p className="text-sm font-bold text-gray-800 mb-3">⚡ Próximos pasos prioritarios</p>
          <div className="space-y-2">
            {ITEMS_GAP
              .filter(i => resp[i.id] === 'no_cumple' && i.urgencia === 'alta')
              .slice(0, 5)
              .map(item => (
                <div key={item.id} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="text-red-500 flex-shrink-0 mt-0.5">→</span>
                  <span><strong>{item.titulo}</strong> — {item.plazo}</span>
                </div>
              ))}
          </div>
          <div className="mt-4 flex gap-3">
            <Link
              href="/dashboard/capas"
              className="text-xs px-4 py-2 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-colors"
            >
              Crear CAPA por cada brecha →
            </Link>
            <Link
              href="/dashboard/cumplimiento"
              className="text-xs px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Ver Cumplimiento Integrado
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
