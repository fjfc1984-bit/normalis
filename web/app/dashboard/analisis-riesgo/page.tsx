'use client';

/**
 * web/app/dashboard/analisis-riesgo/page.tsx
 * Módulo de Gestión del Riesgo — ISO 31000:2018
 * Complementa Res. 1732/2026 Est. 5 (Procesos Prioritarios)
 * Archivo nuevo — no modifica ningún módulo existente.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc,
  onSnapshot, serverTimestamp, query, orderBy, where, getCountFromServer,
} from 'firebase/firestore';
import {
  SectionHeader, LoadingSpinner, Toast, useToast,
  KpiCard, EmptyState,
} from '@/components/ui';
import { calcularAlertasRiesgo, type Alerta } from '@/lib/alertasRiesgo';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Probabilidad = 1 | 2 | 3 | 4 | 5;
type Impacto      = 1 | 2 | 3 | 4 | 5;
type Nivel        = 'bajo' | 'medio' | 'alto' | 'extremo';
type Tratamiento  = 'Evitar' | 'Reducir' | 'Transferir' | 'Aceptar';
type Categoria    =
  | 'Asistencial' | 'Normativo' | 'Talento Humano' | 'Dotación'
  | 'Medicamentos' | 'Infraestructura' | 'Tecnología' | 'Financiero';

// Jerarquía de control (NIOSH / ISO 45001) — de más a menos efectiva. El ORDEN
// (Eliminación > Sustitución > Ingeniería > Administrativo > EPP) sí viene de
// esos estándares; los pesos numéricos de efectividad más abajo (PESO_JERARQUIA)
// NO — NIOSH/ISO 45001 no publican un multiplicador específico, son estimación
// editorial de NormaLis para poder calcular un riesgo residual comparable.
type TipoControl = 'Eliminación' | 'Sustitución' | 'Control de ingeniería' | 'Control administrativo' | 'EPP';

// Pasivo = actúa siempre, sin depender de que alguien lo ejecute (barrera
// física, bloqueo automático). Activo = depende de que una persona lo
// ejecute bien cada vez (protocolo, verificación manual).
type NaturalezaControl = 'pasivo' | 'activo';

interface ControlRiesgo {
  id:          string;
  descripcion: string;
  tipo:        TipoControl;
  naturaleza:  NaturalezaControl;
}

interface RiesgoItem {
  id:            string;
  nombre:        string;
  categoria:     Categoria;
  /** Probabilidad/impacto INHERENTES — antes de aplicar los controles. */
  probabilidad:  Probabilidad;
  impacto:       Impacto;
  nivelInherente?:      Nivel;
  puntuacionInherente?: number;
  /** Probabilidad/impacto RESIDUALES — después del efecto de los controles.
   *  Si no hay controles registrados, son iguales a los inherentes. */
  probabilidadResidual?: Probabilidad;
  impactoResidual?:      Impacto;
  /** nivel/puntuación = SIEMPRE los valores RESIDUALES — son los que
   *  alimentan la matriz de calor, los KPIs, los filtros y las alertas,
   *  porque reflejan el riesgo real hoy, no el riesgo antes de controles. */
  nivel:         Nivel;
  puntuacion:    number;
  controles:     ControlRiesgo[];
  tratamiento:   Tratamiento;
  responsable:   string;
  fechaRevision: string;
  causa?:        string;
  consecuencia?: string;
  /** Campo legado (pre-causa/consecuencia) — se sigue leyendo como fallback
   *  de "causa" en registros antiguos que no se han vuelto a editar. */
  descripcion?:  string;
  /** 'auditoria' si fue importado desde Cumplimiento Integrado */
  origen?:       string;
  segmento?:     string;
  /** CAPA vinculada creada desde este riesgo, si existe */
  capaId?:       string | null;
}

interface NuevoRiesgo {
  nombre:        string;
  categoria:     Categoria;
  probabilidad:  Probabilidad;
  impacto:       Impacto;
  controles:     ControlRiesgo[];
  tratamiento:   Tratamiento;
  responsable:   string;
  fechaRevision: string;
  causa:         string;
  consecuencia:  string;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const PROB_LABELS: Record<Probabilidad, string> = {
  1: 'Rara (<5%)',
  2: 'Improbable (5-20%)',
  3: 'Posible (20-50%)',
  4: 'Probable (50-80%)',
  5: 'Casi certeza (>80%)',
};

const IMP_LABELS: Record<Impacto, string> = {
  1: 'Insignificante',
  2: 'Menor',
  3: 'Moderado',
  4: 'Mayor',
  5: 'Catastrófico',
};

const CATEGORIAS: Categoria[] = [
  'Asistencial', 'Normativo', 'Talento Humano', 'Dotación',
  'Medicamentos', 'Infraestructura', 'Tecnología', 'Financiero',
];

const TRATAMIENTOS: Tratamiento[] = ['Evitar', 'Reducir', 'Transferir', 'Aceptar'];

const NIVEL_CONFIG: Record<Nivel, { bg: string; text: string; border: string; label: string }> = {
  bajo:    { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-l-emerald-400', label: 'Bajo'    },
  medio:   { bg: 'bg-yellow-100',  text: 'text-yellow-800',  border: 'border-l-yellow-400',  label: 'Medio'   },
  alto:    { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-l-orange-400',  label: 'Alto'    },
  extremo: { bg: 'bg-red-100',     text: 'text-red-800',     border: 'border-l-red-500',     label: 'Extremo' },
};

const MATRIZ_COLOR: Record<Nivel, string> = {
  bajo:    'bg-emerald-200 text-emerald-900',
  medio:   'bg-yellow-200  text-yellow-900',
  alto:    'bg-orange-300  text-orange-900',
  extremo: 'bg-red-400     text-white',
};

// Jerarquía de control (NIOSH / ISO 45001) — orden de más a menos efectiva,
// con el "peso" de efectividad usado para calcular el riesgo residual.
// Los valores numéricos (1.0/0.8/0.6/0.4/0.2) son criterio editorial de
// NormaLis, no vienen fijados por NIOSH ni ISO 45001 — ver nota junto a
// TipoControl arriba y el aviso mostrado en la UI junto al riesgo residual.
const JERARQUIA_CONTROL: TipoControl[] = [
  'Eliminación', 'Sustitución', 'Control de ingeniería', 'Control administrativo', 'EPP',
];

const PESO_JERARQUIA: Record<TipoControl, number> = {
  'Eliminación':            1.0,
  'Sustitución':             0.8,
  'Control de ingeniería':   0.6,
  'Control administrativo':  0.4,
  'EPP':                     0.2,
};

// Pasivo = actúa siempre sin depender de la ejecución humana → efectividad
// plena. Activo = depende de que alguien lo ejecute bien cada vez → se
// descuenta, porque en la práctica ningún protocolo se sigue al 100%.
const MULTIPLICADOR_NATURALEZA: Record<NaturalezaControl, number> = {
  pasivo: 1.0,
  activo: 0.65,
};

const NATURALEZA_LABELS: Record<NaturalezaControl, string> = {
  pasivo: 'Pasivo — actúa siempre, no depende de una persona',
  activo: 'Activo — depende de que alguien lo ejecute bien',
};

// Catálogo predefinido — 15 riesgos típicos IPS (ISO 31000 + Res. 1732/2026)
// Los controles quedan vacíos: son específicos de cada IPS, no genéricos
// por tipo de riesgo — el auditor los agrega al aplicar la plantilla.
const CATALOGO: Omit<NuevoRiesgo, 'responsable' | 'fechaRevision'>[] = [
  { nombre: 'Eventos adversos no reportados',                      categoria: 'Asistencial',    probabilidad: 3, impacto: 4, tratamiento: 'Reducir',    controles: [], causa: 'Ausencia de cultura de reporte y de un canal claro y sin represalias para notificar eventos adversos al comité de seguridad del paciente.', consecuencia: 'Pérdida de la oportunidad de analizar causas raíz y prevenir recurrencia — riesgo de repetición del evento y de hallazgos en auditoría.' },
  { nombre: 'Incumplimiento Res. 1732/2026 — Talento Humano',      categoria: 'Normativo',      probabilidad: 3, impacto: 4, tratamiento: 'Reducir',    controles: [], causa: 'Contratación o vinculación de personal sin verificación previa de los requisitos de formación, experiencia y registro exigidos por el estándar de Talento Humano.', consecuencia: 'No conformidad en visita de verificación de la Secretaría de Salud, con riesgo de medida preventiva o cierre del servicio.' },
  { nombre: 'Vencimiento de habilitación sin renovar',             categoria: 'Normativo',      probabilidad: 2, impacto: 5, tratamiento: 'Evitar',     controles: [], causa: 'Ausencia de un sistema de alertas o seguimiento activo a la fecha de vencimiento de la habilitación ante la Secretaría de Salud.', consecuencia: 'Pérdida de la habilitación del servicio y suspensión inmediata de la prestación — riesgo de cierre operativo.' },
  { nombre: 'Personal sin tarjeta profesional vigente',            categoria: 'Talento Humano', probabilidad: 3, impacto: 4, tratamiento: 'Evitar',     controles: [], causa: 'Falta de control periódico de vigencia de tarjetas profesionales y registros ante los colegios/consejos profesionales correspondientes.', consecuencia: 'Prestación de servicios por personal no habilitado legalmente — riesgo jurídico y de glosa por parte de las EPS.' },
  { nombre: 'Mantenimiento de equipos biomédicos atrasado',        categoria: 'Dotación',       probabilidad: 3, impacto: 3, tratamiento: 'Reducir',    controles: [], causa: 'Plan de mantenimiento preventivo sin cumplimiento por falta de presupuesto, proveedor o seguimiento del cronograma.', consecuencia: 'Falla de equipos durante la atención, con riesgo para la seguridad del paciente y hallazgo en el estándar de Dotación.' },
  { nombre: 'Historia clínica incompleta o inconsistente',         categoria: 'Asistencial',    probabilidad: 4, impacto: 3, tratamiento: 'Reducir',    controles: [], causa: 'Carga asistencial alta, falta de capacitación en diligenciamiento o ausencia de auditoría periódica de historias clínicas.', consecuencia: 'Riesgo legal ante reclamaciones, glosas de EPS y hallazgos en el estándar de Historia Clínica.' },
  { nombre: 'Medicamentos vencidos en stock',                      categoria: 'Medicamentos',   probabilidad: 2, impacto: 4, tratamiento: 'Evitar',     controles: [], causa: 'Control de inventario deficiente — sin sistema FEFO (primero en expirar, primero en salir) o revisión periódica de fechas de vencimiento.', consecuencia: 'Riesgo de administración de un medicamento vencido a un paciente y hallazgo directo en visita de habilitación.' },
  { nombre: 'Infecciones asociadas a la atención (IAAS)',          categoria: 'Asistencial',    probabilidad: 3, impacto: 5, tratamiento: 'Reducir',    controles: [], causa: 'Fallas en la adherencia a protocolos de lavado de manos, asepsia y antisepsia, o en la limpieza y desinfección de áreas.', consecuencia: 'Infección nosocomial en el paciente, con impacto directo en morbimortalidad y en los indicadores de calidad de la IPS.' },
  { nombre: 'Accidente de trabajo en personal de salud',           categoria: 'Talento Humano', probabilidad: 3, impacto: 3, tratamiento: 'Reducir',    controles: [], causa: 'Uso inadecuado o ausencia de elementos de protección personal frente a exposición a material biológico o cortopunzantes.', consecuencia: 'Lesión o enfermedad laboral del trabajador, con costos de ARL, incapacidad y posible investigación del incidente.' },
  { nombre: 'Pérdida de información de historia clínica digital',  categoria: 'Tecnología',     probabilidad: 2, impacto: 5, tratamiento: 'Transferir', controles: [], causa: 'Ausencia de política de copias de seguridad periódicas y verificadas, o de un proveedor de nube confiable para la Historia Clínica Electrónica.', consecuencia: 'Pérdida irrecuperable de información clínica del paciente — incumplimiento de la IHCE y riesgo legal grave.' },
  { nombre: 'Incumplimiento PAMEC sin evidencia documental',       categoria: 'Normativo',      probabilidad: 3, impacto: 3, tratamiento: 'Reducir',    controles: [], causa: 'Ejecución de actividades de mejora sin registro sistemático en el ciclo PHVA del PAMEC.', consecuencia: 'Hallazgo en visita de verificación por falta de evidencia documental del programa de auditoría para el mejoramiento.' },
  { nombre: 'Caída de paciente en instalaciones',                  categoria: 'Asistencial',    probabilidad: 3, impacto: 3, tratamiento: 'Reducir',    controles: [], causa: 'Ausencia de barandas, pisos antideslizantes, señalización de riesgo de caída o protocolo de valoración de riesgo de caída al ingreso.', consecuencia: 'Lesión del paciente durante la atención — evento adverso con posible reclamación y afectación a la seguridad del paciente.' },
  { nombre: 'Falta de señalización de emergencia y evacuación',    categoria: 'Infraestructura',probabilidad: 3, impacto: 3, tratamiento: 'Evitar',     controles: [], causa: 'Rutas de evacuación, extintores y zonas de riesgo sin señalización visible ni actualizada según el plan de emergencias.', consecuencia: 'Riesgo de lesiones graves en una emergencia real y hallazgo en el estándar de Infraestructura / SG-SST.' },
  { nombre: 'Interrupción de servicios públicos (agua, energía)',  categoria: 'Infraestructura',probabilidad: 2, impacto: 3, tratamiento: 'Aceptar',    controles: [], causa: 'Dependencia de un único proveedor de servicios públicos sin planta eléctrica de respaldo ni tanque de reserva de agua suficiente.', consecuencia: 'Interrupción de la prestación del servicio de salud durante la falla, afectando la atención de pacientes en curso.' },
  { nombre: 'Falla en cadena de frío de biológicos y vacunas',     categoria: 'Medicamentos',   probabilidad: 2, impacto: 4, tratamiento: 'Evitar',     controles: [], causa: 'Ausencia de monitoreo continuo de temperatura o de plan de contingencia ante corte eléctrico en el área de cadena de frío.', consecuencia: 'Pérdida del lote de biológicos o vacunas y riesgo de aplicar un producto no efectivo o inseguro al paciente.' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcNivel(p: Probabilidad, i: Impacto): Nivel {
  const s = p * i;
  if (s <= 4)  return 'bajo';
  if (s <= 9)  return 'medio';
  if (s <= 16) return 'alto';
  return 'extremo';
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

// ── Cálculo de riesgo residual a partir de los controles ────────────────────
//
// Cada control reduce una "probabilidad de fallar" combinada — como si
// fueran barreras independientes en serie. Un control muy efectivo
// (Eliminación, pasivo) reduce mucho por sí solo; varios controles débiles
// (EPP, activos) se combinan pero nunca eliminan el riesgo del todo.
//
//   efectividad(control) = peso_jerarquía × multiplicador_naturaleza
//   factor_combinado     = min(0.8, 1 − Π(1 − efectividad_i))
//
// El tope de 80% es deliberado: ninguna combinación de controles puede
// llevar el riesgo residual a cero — siempre queda un remanente, como en
// cualquier metodología de riesgo seria. Fernando (auditor) puede ajustar
// estos pesos si su criterio profesional difiere.
function efectividadControl(c: ControlRiesgo): number {
  return PESO_JERARQUIA[c.tipo] * MULTIPLICADOR_NATURALEZA[c.naturaleza];
}

function factorReduccionCombinado(controles: ControlRiesgo[]): number {
  if (!controles || controles.length === 0) return 0;
  const probabilidadFalla = controles.reduce(
    (acc, c) => acc * (1 - efectividadControl(c)),
    1,
  );
  return Math.min(0.8, 1 - probabilidadFalla);
}

// Los controles reducen más la PROBABILIDAD de que ocurra el evento que su
// IMPACTO cuando ocurre (la mayoría de controles previenen, no limitan
// severidad) — por eso el impacto usa solo la mitad del factor.
function calcResidual(
  probInherente: Probabilidad,
  impInherente: Impacto,
  controles: ControlRiesgo[],
): { probabilidad: Probabilidad; impacto: Impacto } {
  const factor = factorReduccionCombinado(controles);
  const probabilidad = Math.max(1, Math.round(probInherente * (1 - factor))) as Probabilidad;
  const impacto      = Math.max(1, Math.round(impInherente  * (1 - factor * 0.5))) as Impacto;
  return { probabilidad, impacto };
}

// ── Matriz de calor 5×5 ───────────────────────────────────────────────────────

function MatrizCalor({ riesgos }: { riesgos: RiesgoItem[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-bold text-gray-700 mb-4">
        Matriz de Riesgo Residual — ISO 31000:2018 (Probabilidad × Impacto, después de controles)
      </h3>
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr>
              <th className="w-24 text-gray-400 font-normal text-right pr-3 pb-2">P ↓ / I →</th>
              {([1,2,3,4,5] as Impacto[]).map(i => (
                <th key={i} className="w-20 text-center pb-2 text-gray-500 font-semibold">
                  {IMP_LABELS[i]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {([5,4,3,2,1] as Probabilidad[]).map(p => (
              <tr key={p}>
                <td className="text-right pr-3 py-1 text-gray-500 font-semibold text-xs whitespace-nowrap">
                  {PROB_LABELS[p]}
                </td>
                {([1,2,3,4,5] as Impacto[]).map(i => {
                  const nivel = calcNivel(p, i);
                  const count = riesgos.filter(r =>
                    (r.probabilidadResidual ?? r.probabilidad) === p &&
                    (r.impactoResidual ?? r.impacto) === i
                  ).length;
                  return (
                    <td
                      key={i}
                      className={`w-20 h-11 text-center rounded border border-white/50 transition-all ${MATRIZ_COLOR[nivel]}`}
                    >
                      {count > 0 && (
                        <span className="font-bold text-sm">{count}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-400 mt-3">
          Números = riesgos registrados en esa celda &nbsp;·&nbsp;
          <span className="text-emerald-700 font-semibold">■ Bajo</span> &nbsp;
          <span className="text-yellow-700 font-semibold">■ Medio</span> &nbsp;
          <span className="text-orange-700 font-semibold">■ Alto</span> &nbsp;
          <span className="text-red-700 font-semibold">■ Extremo</span>
        </p>
      </div>
    </div>
  );
}

// ── Modal nuevo riesgo ────────────────────────────────────────────────────────

function RiesgoModal({
  onSave,
  onClose,
  saving,
}: {
  onSave:  (p: NuevoRiesgo) => Promise<void>;
  onClose: () => void;
  saving:  boolean;
}) {
  const [useTemplate, setUseTemplate] = useState(true);
  const [form, setForm] = useState<NuevoRiesgo>({
    nombre: '', categoria: 'Asistencial', probabilidad: 3, impacto: 3,
    tratamiento: 'Reducir', responsable: '', fechaRevision: todayStr(),
    causa: '', consecuencia: '', controles: [],
  });

  const INPUT = `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white`;

  function applyTemplate(idx: number) {
    const t = CATALOGO[idx];
    setForm(f => ({ ...f, ...t, controles: [] }));
    setUseTemplate(false);
  }

  // Nivel INHERENTE (antes de controles) — es lo que capturan los sliders.
  const nivelInherente = calcNivel(form.probabilidad, form.impacto);
  const ncInherente     = NIVEL_CONFIG[nivelInherente];

  // Nivel RESIDUAL en vivo — se recalcula con cada control agregado/quitado
  // para que el auditor vea de inmediato el efecto de sus controles.
  const residual      = calcResidual(form.probabilidad, form.impacto, form.controles);
  const nivelResidual = calcNivel(residual.probabilidad, residual.impacto);
  const ncResidual     = NIVEL_CONFIG[nivelResidual];

  function agregarControl() {
    setForm(f => ({
      ...f,
      controles: [
        ...f.controles,
        { id: `c${Date.now()}`, descripcion: '', tipo: 'Control administrativo', naturaleza: 'activo' },
      ],
    }));
  }

  function actualizarControl(id: string, cambios: Partial<ControlRiesgo>) {
    setForm(f => ({
      ...f,
      controles: f.controles.map(c => c.id === id ? { ...c, ...cambios } : c),
    }));
  }

  function quitarControl(id: string) {
    setForm(f => ({ ...f, controles: f.controles.filter(c => c.id !== id) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    await onSave(form);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h3 className="text-base font-bold text-gray-800">Registrar Riesgo — ISO 31000</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setUseTemplate(true)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors
                ${useTemplate ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              📋 Catálogo IPS
            </button>
            <button
              type="button"
              onClick={() => setUseTemplate(false)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors
                ${!useTemplate ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              ✏️ Personalizado
            </button>
          </div>

          {/* Catálogo predefinido */}
          {useTemplate && (
            <div className="grid grid-cols-1 gap-1.5 max-h-96 overflow-y-auto pr-1">
              {CATALOGO.map((t, idx) => {
                const n   = calcNivel(t.probabilidad, t.impacto);
                const nc2 = NIVEL_CONFIG[n];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyTemplate(idx)}
                    className="text-left px-3 py-2.5 rounded-xl border border-gray-200
                               hover:border-teal-300 hover:bg-teal-50/50 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-800">{t.nombre}</span>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${nc2.bg} ${nc2.text}`}>
                        {nc2.label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{t.categoria} · P:{t.probabilidad} × I:{t.impacto} = {t.probabilidad * t.impacto}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Formulario personalizado */}
          {!useTemplate && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                  Nombre del riesgo *
                </label>
                <input
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  required className={INPUT}
                  placeholder="Ej: Eventos adversos no reportados"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Categoría</label>
                  <select
                    value={form.categoria}
                    onChange={e => setForm(f => ({ ...f, categoria: e.target.value as Categoria }))}
                    className={INPUT}
                  >
                    {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Tratamiento</label>
                  <select
                    value={form.tratamiento}
                    onChange={e => setForm(f => ({ ...f, tratamiento: e.target.value as Tratamiento }))}
                    className={INPUT}
                  >
                    {TRATAMIENTOS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Sliders probabilidad e impacto — valoración INHERENTE (sin controles) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                    Probabilidad inherente — <span className="normal-case font-normal">{PROB_LABELS[form.probabilidad]}</span>
                  </label>
                  <input
                    type="range" min={1} max={5} value={form.probabilidad}
                    onChange={e => setForm(f => ({ ...f, probabilidad: parseInt(e.target.value) as Probabilidad }))}
                    className="w-full accent-teal-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>1 Rara</span><span>5 Certeza</span></div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                    Impacto inherente — <span className="normal-case font-normal">{IMP_LABELS[form.impacto]}</span>
                  </label>
                  <input
                    type="range" min={1} max={5} value={form.impacto}
                    onChange={e => setForm(f => ({ ...f, impacto: parseInt(e.target.value) as Impacto }))}
                    className="w-full accent-teal-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>1 Insignif.</span><span>5 Catastróf.</span></div>
                </div>
              </div>

              <p className="text-xs text-gray-400 -mt-2">
                Inherente = el riesgo puro, sin tener en cuenta ningún control existente.
                Los controles que agregues abajo calculan el riesgo <b>residual</b> (el real, hoy).
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Causa</label>
                <textarea
                  value={form.causa}
                  onChange={e => setForm(f => ({ ...f, causa: e.target.value }))}
                  rows={2}
                  className={`${INPUT} resize-none`}
                  placeholder="¿Qué origina este riesgo?"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Consecuencia</label>
                <textarea
                  value={form.consecuencia}
                  onChange={e => setForm(f => ({ ...f, consecuencia: e.target.value }))}
                  rows={2}
                  className={`${INPUT} resize-none`}
                  placeholder="¿Qué pasa si el riesgo se materializa?"
                />
              </div>

              {/* Controles existentes — determinan el riesgo residual */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">
                    Controles existentes
                  </label>
                  <button
                    type="button"
                    onClick={agregarControl}
                    className="text-xs font-bold text-teal-700 hover:text-teal-900"
                  >
                    + Agregar control
                  </button>
                </div>
                {form.controles.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Sin controles registrados — el riesgo residual es igual al inherente.</p>
                ) : (
                  <div className="space-y-2">
                    {form.controles.map(c => (
                      <div key={c.id} className="flex flex-wrap gap-2 items-start bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                        <input
                          value={c.descripcion}
                          onChange={e => actualizarControl(c.id, { descripcion: e.target.value })}
                          placeholder="Ej: Protocolo de lavado de manos"
                          className="flex-1 min-w-[140px] px-2 py-1.5 border border-gray-300 rounded-lg text-xs
                                     focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                        />
                        <select
                          value={c.tipo}
                          onChange={e => actualizarControl(c.id, { tipo: e.target.value as TipoControl })}
                          className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                          title="Jerarquía de control"
                        >
                          {JERARQUIA_CONTROL.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select
                          value={c.naturaleza}
                          onChange={e => actualizarControl(c.id, { naturaleza: e.target.value as NaturalezaControl })}
                          className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                          title={NATURALEZA_LABELS[c.naturaleza]}
                        >
                          <option value="pasivo">Pasivo</option>
                          <option value="activo">Activo</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => quitarControl(c.id)}
                          className="text-gray-300 hover:text-red-400 px-1"
                          title="Quitar control"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nivel inherente vs. residual, calculado en vivo */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`px-4 py-3 rounded-xl ${ncInherente.bg}`}>
                  <span className={`block text-[10px] font-bold uppercase tracking-wide ${ncInherente.text} opacity-70`}>Riesgo inherente</span>
                  <span className={`text-sm font-bold ${ncInherente.text}`}>
                    {ncInherente.label} · {form.probabilidad * form.impacto}/25
                  </span>
                </div>
                <div className={`px-4 py-3 rounded-xl ${ncResidual.bg}`}>
                  <span className={`block text-[10px] font-bold uppercase tracking-wide ${ncResidual.text} opacity-70`}>Riesgo residual (con controles)</span>
                  <span className={`text-sm font-bold ${ncResidual.text}`}>
                    {ncResidual.label} · {residual.probabilidad * residual.impacto}/25
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 -mt-1">
                El orden de la jerarquía de controles (Eliminación → Sustitución → Ingeniería →
                Administrativo → EPP) es de NIOSH/ISO 45001; los pesos numéricos usados para
                calcular este residual son un criterio editorial de NormaLis, ajústalos con tu
                propio criterio profesional si no reflejan tu realidad.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Responsable</label>
                  <input
                    value={form.responsable}
                    onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))}
                    placeholder="Nombre o cargo"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Fecha de revisión</label>
                  <input
                    type="date"
                    value={form.fechaRevision}
                    onChange={e => setForm(f => ({ ...f, fechaRevision: e.target.value }))}
                    className={INPUT}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving || !form.nombre.trim()}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                             text-white text-sm font-bold rounded-xl transition-colors"
                >
                  {saving ? 'Guardando…' : '✓ Registrar riesgo'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de riesgo ─────────────────────────────────────────────────────────

function RiesgoCard({
  item,
  onDelete,
  onUpdate,
  onCrearCapa,
  creandoCapa,
}: {
  item:        RiesgoItem;
  onDelete:    (id: string) => void;
  onUpdate:    (id: string, t: Tratamiento) => void;
  onCrearCapa: (item: RiesgoItem) => void;
  creandoCapa: boolean;
}) {
  const nc     = NIVEL_CONFIG[item.nivel];
  const isAlto = item.nivel === 'alto' || item.nivel === 'extremo';

  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${nc.border} p-4 hover:shadow-sm transition-shadow`}>
      <div className="flex gap-4">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${nc.bg} ${nc.text}`}>
              {nc.label} · {item.puntuacion}pts
            </span>
            <span className="text-xs text-gray-500">{item.categoria}</span>
            {item.controles && item.controles.length > 0 ? (
              <span className="text-xs text-gray-400">
                P:{item.probabilidad}×I:{item.impacto}={item.probabilidad * item.impacto} inherente
                {' → '}
                P:{item.probabilidadResidual ?? item.probabilidad}×I:{item.impactoResidual ?? item.impacto}={item.puntuacion} residual
              </span>
            ) : (
              <span className="text-xs text-gray-400">P:{item.probabilidad} × I:{item.impacto}</span>
            )}
            {item.origen === 'auditoria' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                📥 Desde auditoría
              </span>
            )}
            {item.origen === 'agente_pilar' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-bold"
                    title="Generado automáticamente por IA a partir de una auditoría — requiere revisión humana">
                🤖 Agente Pilar (IA) — revisar
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-800">{item.nombre}</p>
          {(item.causa || item.descripcion) && (
            <p className="text-xs text-gray-500 line-clamp-2">
              <span className="font-semibold text-gray-600">Causa: </span>
              {item.causa || item.descripcion}
            </p>
          )}
          {item.consecuencia && (
            <p className="text-xs text-gray-500 line-clamp-2">
              <span className="font-semibold text-gray-600">Consecuencia: </span>
              {item.consecuencia}
            </p>
          )}
          {item.controles && item.controles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {item.controles.map(c => (
                <span
                  key={c.id}
                  title={`${c.descripcion || c.tipo} · ${NATURALEZA_LABELS[c.naturaleza]}`}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium"
                >
                  🛡️ {c.tipo} · {c.naturaleza === 'pasivo' ? 'pasivo' : 'activo'}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
            {item.responsable   && <span>👤 {item.responsable}</span>}
            {item.fechaRevision && <span>📅 Rev. {item.fechaRevision}</span>}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <select
            value={item.tratamiento}
            onChange={e => onUpdate(item.id, e.target.value as Tratamiento)}
            className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white
                       focus:outline-none focus:ring-1 focus:ring-teal-400 cursor-pointer"
          >
            {TRATAMIENTOS.map(t => <option key={t}>{t}</option>)}
          </select>

          {isAlto && (
            item.capaId ? (
              <a
                href="/dashboard/capas"
                className="text-xs px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100
                           text-emerald-700 font-bold rounded-lg transition-colors border border-emerald-200"
                title="Ver la CAPA vinculada a este riesgo"
              >
                ✅ CAPA creada → Ver
              </a>
            ) : (
              <button
                onClick={() => onCrearCapa(item)}
                disabled={creandoCapa}
                className="text-xs px-2.5 py-1 bg-orange-100 hover:bg-orange-200
                           text-orange-700 font-bold rounded-lg transition-colors disabled:opacity-50"
                title="Crear CAPA para este riesgo"
              >
                {creandoCapa ? 'Creando…' : '+ CAPA'}
              </button>
            )
          )}

          <button
            onClick={() => onDelete(item.id)}
            className="text-xs text-gray-300 hover:text-red-400 transition-colors"
            title="Eliminar riesgo"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Página principal
// ════════════════════════════════════════════════════════════════════════════

export default function AnalisisRiesgoPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast, show } = useToast();

  const [riesgos,     setRiesgos]     = useState<RiesgoItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [filtroNivel, setFiltroNivel] = useState<Nivel | 'Todos'>('Todos');
  const [userNit,      setUserNit]      = useState<string>('');
  const [creandoCapaId, setCreandoCapaId] = useState<string | null>(null);

  // Alertas tempranas: cruce con vencimientos/incidentes reales (ver
  // web/lib/alertasRiesgo.ts). Se calculan aparte de la suscripción en vivo
  // de riesgos para no re-consultar vencimientos/incidentes en cada cambio
  // menor de la matriz — se refrescan al cargar la página y con el botón
  // "Actualizar alertas".
  const [alertas,        setAlertas]        = useState<Alerta[]>([]);
  const [loadingAlertas, setLoadingAlertas]  = useState(false);

  // Suscripción Firestore — colección aislada: riesgos/{uid}/items
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'riesgos', user.uid, 'items'),
      orderBy('puntuacion', 'desc'),
    );
    const unsub = onSnapshot(q, snap => {
      setRiesgos(snap.docs.map(d => ({ id: d.id, ...d.data() })) as RiesgoItem[]);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user]);

  // NIT del usuario — se usa para numerar CAPAs de forma consistente con
  // el resto de módulos (auditoría, gap-1732, incidentes).
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'usuarios', user.uid))
      .then(s => { if (s.exists()) setUserNit(s.data()?.nit ?? ''); })
      .catch(() => {});
  }, [user]);

  const refrescarAlertas = useCallback(async () => {
    if (!user) return;
    setLoadingAlertas(true);
    try {
      const resultado = await calcularAlertasRiesgo(user.uid, riesgos);
      setAlertas(resultado);
    } catch (err) {
      console.error('[AnalisisRiesgo] refrescarAlertas:', err);
    } finally {
      setLoadingAlertas(false);
    }
  }, [user, riesgos]);

  // Calcula las alertas una vez que los riesgos terminan de cargar por
  // primera vez — luego el usuario puede refrescarlas manualmente (p. ej.
  // tras registrar un nuevo vencimiento o incidente en otro módulo).
  useEffect(() => {
    if (!user || loading) return;
    void refrescarAlertas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  // KPIs
  const extremos = riesgos.filter(r => r.nivel === 'extremo').length;
  const altos    = riesgos.filter(r => r.nivel === 'alto').length;
  const medios   = riesgos.filter(r => r.nivel === 'medio').length;
  const bajos    = riesgos.filter(r => r.nivel === 'bajo').length;

  const filtrados = filtroNivel === 'Todos'
    ? riesgos
    : riesgos.filter(r => r.nivel === filtroNivel);

  const handleSave = useCallback(async (payload: NuevoRiesgo) => {
    if (!user) return;
    setSaving(true);
    try {
      const nivelInherente      = calcNivel(payload.probabilidad, payload.impacto);
      const puntuacionInherente = payload.probabilidad * payload.impacto;
      const residual            = calcResidual(payload.probabilidad, payload.impacto, payload.controles);

      await addDoc(collection(db, 'riesgos', user.uid, 'items'), {
        ...payload,
        nivelInherente,
        puntuacionInherente,
        probabilidadResidual: residual.probabilidad,
        impactoResidual:      residual.impacto,
        // nivel/puntuación = SIEMPRE residual — alimentan matriz, KPIs, filtros y alertas.
        nivel:      calcNivel(residual.probabilidad, residual.impacto),
        puntuacion: residual.probabilidad * residual.impacto,
        creadoEn:   serverTimestamp(),
      });
      show('Riesgo registrado correctamente.', 'success');
    } catch {
      show('Error al guardar el riesgo.', 'error');
    } finally {
      setSaving(false);
    }
  }, [user, show]);

  const handleDelete = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'riesgos', user.uid, 'items', id));
      show('Riesgo eliminado.', 'info');
    } catch {
      show('Error al eliminar.', 'error');
    }
  }, [user, show]);

  const handleUpdate = useCallback(async (id: string, tratamiento: Tratamiento) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'riesgos', user.uid, 'items', id), { tratamiento });
    } catch {
      show('Error al actualizar.', 'error');
    }
  }, [user, show]);

  // Crea una CAPA vinculada a este riesgo (mismo patrón que gap-1732 e
  // Incidentes) y la marca en el propio documento del riesgo para no
  // duplicarla si el usuario vuelve a hacer clic.
  const crearCapaDesdeRiesgo = useCallback(async (item: RiesgoItem) => {
    if (!user || item.capaId) return;
    setCreandoCapaId(item.id);
    try {
      const countQ = userNit
        ? query(collection(db, 'capas'), where('nit', '==', userNit))
        : query(collection(db, 'capas'), where('uid', '==', user.uid));
      const countSnap = await getCountFromServer(countQ);
      const num = String((countSnap.data().count ?? 0) + 1).padStart(3, '0');
      const limite = new Date();
      limite.setDate(limite.getDate() + 30);
      const capaRef = await addDoc(collection(db, 'capas'), {
        uid:                user.uid,
        nit:                userNit ?? '',
        numero:             `CAPA-${num}`,
        descripcion:        `[Riesgo ISO 31000] ${item.nombre}`,
        causaRaiz:          item.causa || item.descripcion || `Riesgo de categoría ${item.categoria} identificado en la matriz — nivel ${item.nivel} (Probabilidad ${item.probabilidadResidual ?? item.probabilidad} × Impacto ${item.impactoResidual ?? item.impacto}, residual).`,
        accionCorrectiva:   `Tratamiento definido: ${item.tratamiento}.${item.consecuencia ? ` Consecuencia si no se controla: ${item.consecuencia}` : ''} Documentar las acciones concretas para mitigar este riesgo.`,
        responsable:        item.responsable || '',
        area:               item.categoria,
        fechaLimite:        limite.toISOString().slice(0, 10),
        origen:             'riesgo',
        evidencia:          '',
        estado:             'abierta',
        refRiesgoId:        item.id,
        fechaCreacion:      serverTimestamp(),
        fechaActualizacion: null,
        fechaInicio:        null,
        fechaCierre:        null,
      });
      await updateDoc(doc(db, 'riesgos', user.uid, 'items', item.id), { capaId: capaRef.id });
      show(`✅ CAPA-${num} creada desde el riesgo.`, 'success');
    } catch (err) {
      console.error('[AnalisisRiesgo] crearCapaDesdeRiesgo:', err);
      show('Error al crear la CAPA.', 'error');
    } finally {
      setCreandoCapaId(null);
    }
  }, [user, userNit, show]);

  // PDF export
  const exportarPDF = useCallback(() => {
    const w = window.open('', '_blank');
    if (!w) return;
    const filas = riesgos.map(r => {
      const color = r.nivel === 'extremo' ? '#dc2626' : r.nivel === 'alto' ? '#ea580c' : r.nivel === 'medio' ? '#ca8a04' : '#16a34a';
      const pRes = r.probabilidadResidual ?? r.probabilidad;
      const iRes = r.impactoResidual ?? r.impacto;
      const nControles = r.controles?.length ?? 0;
      return `<tr>
        <td>${r.nombre}<br/><span style="color:#94a3b8;font-size:10px">${r.causa || r.descripcion || ''}</span></td>
        <td>${r.categoria}</td>
        <td style="text-align:center">${r.probabilidad}×${r.impacto}</td>
        <td style="text-align:center">${pRes}×${iRes}</td>
        <td style="text-align:center;font-weight:bold">${r.puntuacion}</td>
        <td style="font-weight:bold;color:${color}">${NIVEL_CONFIG[r.nivel].label}</td>
        <td style="text-align:center">${nControles || '—'}</td>
        <td>${r.tratamiento}</td>
        <td>${r.responsable || '—'}</td>
        <td>${r.fechaRevision || '—'}</td>
      </tr>`;
    }).join('');

    w.document.write(`<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"><title>Gestión del Riesgo — ISO 31000</title>
<style>
  body{font-family:Arial,sans-serif;padding:30px;font-size:12px}
  h1{color:#0f766e;font-size:18px;margin-bottom:4px}
  .meta{color:#64748b;margin-bottom:16px;font-size:11px}
  .kpis{display:flex;gap:12px;margin-bottom:16px}
  .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 14px;text-align:center}
  .kpi-v{font-size:20px;font-weight:800}.kpi-l{font-size:10px;color:#64748b}
  table{width:100%;border-collapse:collapse}
  th{background:#0f766e;color:#fff;padding:7px 8px;text-align:left;font-size:11px}
  td{padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top}
  tr:nth-child(even) td{background:#f8fafc}
  .footer{margin-top:16px;font-size:10px;color:#94a3b8;text-align:center}
  @media print{body{padding:15px}}
</style></head><body>
<h1>Gestión del Riesgo — ISO 31000:2018</h1>
<p class="meta">Generado: ${new Date().toLocaleDateString('es-CO',{dateStyle:'long'})} · Res. 1732/2026 Est. 5 — Procesos Prioritarios</p>
<div class="kpis">
  <div class="kpi"><div class="kpi-v" style="color:#dc2626">${extremos}</div><div class="kpi-l">Extremo</div></div>
  <div class="kpi"><div class="kpi-v" style="color:#ea580c">${altos}</div><div class="kpi-l">Alto</div></div>
  <div class="kpi"><div class="kpi-v" style="color:#ca8a04">${medios}</div><div class="kpi-l">Medio</div></div>
  <div class="kpi"><div class="kpi-v" style="color:#16a34a">${bajos}</div><div class="kpi-l">Bajo</div></div>
</div>
<table>
  <thead><tr>
    <th>Riesgo / Causa</th><th>Categoría</th><th>P×I inherente</th><th>P×I residual</th><th>Puntaje</th>
    <th>Nivel</th><th>Controles</th><th>Tratamiento</th><th>Responsable</th><th>Revisión</th>
  </tr></thead>
  <tbody>${filas}</tbody>
</table>
<p class="footer">ISO 31000:2018 · Resolución 1732/2026 Est. 5 — Procesos Prioritarios · NormaLis</p>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }, [riesgos, extremos, altos, medios, bajos]);

  if (authLoading || loading) return <LoadingSpinner fullHeight />;

  return (
    <div className="p-6 space-y-6">
      <Toast toast={toast} />

      {showModal && (
        <RiesgoModal
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saving={saving}
        />
      )}

      <SectionHeader
        title="Gestión del Riesgo"
        subtitle="ISO 31000:2018 · Res. 1732/2026 Est. 5 — Procesos Prioritarios"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/dashboard/cumplimiento"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50
                         hover:bg-blue-100 text-blue-700 text-sm font-semibold rounded-xl transition-colors"
            >
              📥 Importar desde auditoría
            </Link>
            <button
              onClick={exportarPDF}
              disabled={riesgos.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100
                         hover:bg-gray-200 disabled:opacity-40 text-gray-700
                         text-sm font-semibold rounded-xl transition-colors"
            >
              🖨️ Informe PDF
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600
                         hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              + Registrar riesgo
            </button>
          </div>
        }
      />

      {/* ── Alertas Tempranas ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            🚨 Alertas Tempranas
            {alertas.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                {alertas.length}
              </span>
            )}
          </h3>
          <button
            onClick={refrescarAlertas}
            disabled={loadingAlertas}
            className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50
                       text-gray-600 transition-colors disabled:opacity-50"
          >
            {loadingAlertas ? 'Actualizando…' : '🔄 Actualizar alertas'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Cruza tu matriz de riesgo con vencimientos e incidentes reales registrados en NormaLis
          para anticipar problemas antes de que escalen.
        </p>

        {loadingAlertas && alertas.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">Analizando señales de otros módulos…</p>
        ) : alertas.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            <span>✅</span>
            <span>Sin alertas por ahora — tu matriz de riesgo está al día con las señales disponibles en la plataforma.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {alertas.map(a => (
              <div
                key={a.id}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
                  a.severidad === 'alta'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <span className="text-lg flex-shrink-0">{a.severidad === 'alta' ? '🔴' : '🟡'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${a.severidad === 'alta' ? 'text-red-800' : 'text-amber-800'}`}>
                    {a.titulo}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{a.detalle}</p>
                  {a.accion && (
                    <Link
                      href={a.accion.href}
                      className="inline-block mt-1.5 text-xs font-bold text-teal-700 hover:text-teal-900"
                    >
                      {a.accion.label} →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Extremo" value={extremos} colorClass="text-red-700"     borderColorClass="border-red-200" />
        <KpiCard label="Alto"    value={altos}    colorClass="text-orange-700"  borderColorClass="border-orange-200" />
        <KpiCard label="Medio"   value={medios}   colorClass="text-yellow-700"  borderColorClass="border-yellow-200" />
        <KpiCard label="Bajo"    value={bajos}    colorClass="text-emerald-700" borderColorClass="border-emerald-200" />
      </div>

      {/* Matriz de calor — solo cuando hay datos */}
      {riesgos.length > 0 && <MatrizCalor riesgos={riesgos} />}

      {/* Filtros por nivel */}
      {riesgos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(['Todos', 'extremo', 'alto', 'medio', 'bajo'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltroNivel(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors capitalize
                ${filtroNivel === f
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f === 'Todos' ? 'Todos' : NIVEL_CONFIG[f].label}
              {f !== 'Todos' && (
                <span className="ml-1.5 opacity-70">
                  ({riesgos.filter(r => r.nivel === f).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lista de riesgos */}
      {filtrados.length === 0 ? (
        <EmptyState
          icon="⚠️"
          title={filtroNivel === 'Todos' ? 'Sin riesgos registrados' : `Sin riesgos nivel ${filtroNivel}`}
          description={
            filtroNivel === 'Todos'
              ? 'Registra el primer riesgo usando el catálogo IPS predefinido (15 riesgos típicos) o crea uno personalizado.'
              : 'No hay riesgos con este nivel de criticidad.'
          }
          action={
            filtroNivel === 'Todos'
              ? (
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-3 px-4 py-2 bg-teal-600 hover:bg-teal-700
                             text-white text-sm font-bold rounded-xl transition-colors"
                >
                  + Registrar primer riesgo
                </button>
              )
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtrados.map(item => (
            <RiesgoCard
              key={item.id}
              item={item}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              onCrearCapa={crearCapaDesdeRiesgo}
              creandoCapa={creandoCapaId === item.id}
            />
          ))}
          <p className="text-xs text-gray-400 text-center pt-1">
            {filtrados.length} riesgo{filtrados.length !== 1 ? 's' : ''}
            {filtroNivel !== 'Todos' ? ` nivel ${NIVEL_CONFIG[filtroNivel as Nivel]?.label}` : ' en total'}
          </p>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        ISO 31000:2018 · Resolución 1732/2026 Est. 5 — Procesos Prioritarios · NormaLis
      </p>
    </div>
  );
}
