'use client';

/**
 * web/app/dashboard/comparador/page.tsx
 * Módulo Comparador Normativo — Cross-Walk Res. 3100/2019 ↔ ISO 7101:2023 ↔ JCI 8ª ed.
 * Muestra la cobertura equivalente que la habilitación colombiana da en estándares internacionales.
 */

import { useState } from 'react';
import { SectionHeader } from '@/components/ui';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface NormaInfo {
  seccion: string;
  nombre: string;
  score_equivalencia: number;
  requisitos_cubiertos: string[];
  gap: string;
}

interface JCIInfo {
  estandar: string;
  nombre: string;
  score_equivalencia: number;
  requisitos_cubiertos: string[];
  gap: string;
}

interface Estandar {
  key: string;
  label: string;
  icon: string;
  res3100: { estandar: string; articulos: string };
  iso7101: NormaInfo;
  jci: JCIInfo;
}

// ── Datos del cross-walk ───────────────────────────────────────────────────────

const ESTANDARES: Estandar[] = [
  {
    key: 'talento_humano',
    label: 'Talento Humano',
    icon: '👨‍⚕️',
    res3100: { estandar: 'Est. 1', articulos: 'Art. 5-12 · Res. 3100/2019' },
    iso7101: {
      seccion: '§5.3 · §7.2 · §7.3',
      nombre: 'Competencia del Personal · Conciencia · Comunicación',
      score_equivalencia: 0.88,
      requisitos_cubiertos: [
        'Determinación de competencias necesarias para cada rol (§5.3.1)',
        'Verificación de educación, formación y experiencia (§5.3.2)',
        'Toma de acciones para adquirir competencia (§5.3.3)',
        'Registros documentados de competencias (§7.5.1)',
        'Comunicación de responsabilidades en calidad (§7.3)',
      ],
      gap: 'ISO 7101 exige plan de desarrollo de competencias con métricas de efectividad — va más allá del simple registro de títulos.',
    },
    jci: {
      estandar: 'SQE · QPS.3',
      nombre: 'Staff Qualifications and Education · Quality Patient Safety',
      score_equivalencia: 0.82,
      requisitos_cubiertos: [
        'SQE.1: Planeación de personal (staffing plan)',
        'SQE.3: Verificación de credenciales y licencias',
        'SQE.5: Expediente de personal actualizado',
        'SQE.8: Programa de salud y bienestar del personal',
        'QPS.3: Personal calificado para actividades de calidad',
      ],
      gap: 'JCI requiere privilegios clínicos específicos por procedimiento (SQE.10-15), credentialing independiente y peer review anual.',
    },
  },
  {
    key: 'infraestructura',
    label: 'Infraestructura',
    icon: '🏗️',
    res3100: { estandar: 'Est. 2', articulos: 'Art. 13-22 · Res. 3100/2019 · NSR-10' },
    iso7101: {
      seccion: '§7.1.3 · §7.1.4 · §6.4',
      nombre: 'Infraestructura · Ambiente para la Operación · Ambiente de Trabajo',
      score_equivalencia: 0.79,
      requisitos_cubiertos: [
        'Determinación y provisión de infraestructura necesaria (§7.1.3)',
        'Gestión del ambiente físico para servicios seguros (§7.1.4)',
        'Control de condiciones ambientales (temperatura, humedad, ruido) (§6.4)',
        'Mantenimiento preventivo documentado (§7.1.3)',
      ],
      gap: 'ISO 7101 §6.4 exige análisis del ambiente de trabajo sobre resultados de calidad asistencial con indicadores medibles — no solo cumplimiento físico.',
    },
    jci: {
      estandar: 'FMS',
      nombre: 'Facility Management and Safety',
      score_equivalencia: 0.75,
      requisitos_cubiertos: [
        'FMS.1: Plan de gestión de instalaciones actualizado',
        'FMS.4: Seguridad contra incendios (Life Safety)',
        'FMS.5: Equipos y tecnología médica',
        'FMS.7: Gestión de servicios de apoyo (utilidades)',
        'FMS.10: Seguimiento del plan de gestión de instalaciones',
      ],
      gap: 'JCI FMS requiere Environmental Rounds trimestrales con hallazgos documentados y plan de acción. También exige programa formal de seguridad contra incendios con simulacros semestrales.',
    },
  },
  {
    key: 'dotacion',
    label: 'Dotación',
    icon: '🩺',
    res3100: { estandar: 'Est. 3', articulos: 'Art. 23-30 · Decreto 4725/2005 · INVIMA' },
    iso7101: {
      seccion: '§7.1.3 · §8.5.1',
      nombre: 'Equipos e Infraestructura · Control de Producción/Provisión del Servicio',
      score_equivalencia: 0.84,
      requisitos_cubiertos: [
        'Provisión de equipos necesarios para servicios seguros (§7.1.3)',
        'Mantenimiento preventivo y correctivo documentado (§7.1.3)',
        'Control de equipos de seguimiento y medición (§7.1.5)',
        'Identificación del estado de equipos (§8.5.2)',
        'Tecnovigilancia — reporte de incidentes con dispositivos (§8.5.1)',
      ],
      gap: 'ISO 7101 §7.1.5 exige programa de metrología con trazabilidad BIPM para equipos de medición críticos — más riguroso que la calibración anual de la Res. 3100.',
    },
    jci: {
      estandar: 'FMS.8 · FMS.9',
      nombre: 'Medical Equipment · Utility Systems',
      score_equivalencia: 0.78,
      requisitos_cubiertos: [
        'FMS.8.1: Inventario de equipos médicos completo',
        'FMS.8.2: Inspección regular de equipos médicos',
        'FMS.8.3: Pruebas y mantenimiento de equipos',
        'FMS.8.4: Reporte de problemas de equipos médicos al fabricante/INVIMA',
      ],
      gap: 'JCI exige Risk-based equipment management: clasificación de equipos por criticidad con frecuencias de mantenimiento diferenciadas según riesgo clínico.',
    },
  },
  {
    key: 'medicamentos',
    label: 'Medicamentos y Dispositivos',
    icon: '💊',
    res3100: { estandar: 'Est. 4', articulos: 'Art. 31-40 · Decreto 677/1995 · Res. 1403/2007' },
    iso7101: {
      seccion: '§8.5.3 · §8.5.4',
      nombre: 'Trazabilidad · Preservación de Salidas',
      score_equivalencia: 0.81,
      requisitos_cubiertos: [
        'Identificación y trazabilidad de productos (§8.5.2)',
        'Preservación de medicamentos e insumos (§8.5.4)',
        'Control de salidas no conformes — medicamentos vencidos (§8.7)',
        'Almacenamiento seguro según ficha técnica (§8.5.4)',
        'Medicamentos de alto riesgo con controles adicionales (§8.5.3)',
      ],
      gap: 'ISO 7101 exige proceso formal de gestión de proveedores (§8.4) con evaluación periódica de laboratorios farmacéuticos — no solo verificar INVIMA.',
    },
    jci: {
      estandar: 'MMU',
      nombre: 'Medication Management and Use',
      score_equivalencia: 0.70,
      requisitos_cubiertos: [
        'MMU.1: Organización de la gestión de medicamentos',
        'MMU.3: Almacenamiento seguro de medicamentos',
        'MMU.4: Prescripción y transcripción de medicamentos',
        'MMU.6: Dispensación y administración segura',
        'MMU.7: Monitoreo de efectos de medicamentos',
      ],
      gap: 'JCI MMU requiere formulario institucional revisado anualmente por Comité de Farmacia, sistema de reporte de errores de medicación con análisis mensual, y programa de reconciliación al ingreso/egreso.',
    },
  },
  {
    key: 'procesos_prioritarios',
    label: 'Procesos Prioritarios',
    icon: '📋',
    res3100: { estandar: 'Est. 5', articulos: 'Art. 41-55 · Res. 256/2016 · Dec. 1011/2006' },
    iso7101: {
      seccion: '§8.5.1 · §8.5.4 · §9.1 · §10.2',
      nombre: 'Control Operacional · Seguimiento y Medición · No Conformidades',
      score_equivalencia: 0.87,
      requisitos_cubiertos: [
        'Planificación y control de procesos asistenciales (§8.5.1)',
        'Identificación y gestión de eventos adversos (§8.5.4 + §10.2)',
        'Seguimiento de indicadores de seguridad del paciente (§9.1.1)',
        'Análisis de causas raíz de no conformidades (§10.2.1)',
        'Mejora continua basada en datos (§10.3)',
        'Bioseguridad y gestión de residuos (§8.5.1)',
      ],
      gap: 'ISO 7101 §9.1 exige indicadores con benchmarking externo y análisis estadístico de tendencias — no solo medición puntual de indicadores.',
    },
    jci: {
      estandar: 'IPSG · QPS · PCI',
      nombre: 'International Patient Safety Goals · Quality · Prevention and Control of Infections',
      score_equivalencia: 0.73,
      requisitos_cubiertos: [
        'IPSG.1: Identificación correcta del paciente',
        'IPSG.2: Comunicación efectiva entre profesionales',
        'IPSG.3: Seguridad en medicamentos de alto riesgo',
        'IPSG.6: Reducción del riesgo de caídas',
        'PCI.5: Higiene de manos — programa institucional',
        'QPS.4: Reporte y análisis de eventos centinela',
      ],
      gap: 'JCI exige los 6 IPSG completamente implementados con medición mensual y reporte a junta directiva. QPS requiere dashboard de indicadores con análisis de variación estadística (SPC).',
    },
  },
  {
    key: 'historia_clinica',
    label: 'Historia Clínica',
    icon: '📄',
    res3100: { estandar: 'Est. 6', articulos: 'Res. 1995/1999 · Res. 3100/2019 Est. 6 · Ley 1581/2012' },
    iso7101: {
      seccion: '§7.5 · §8.5.2',
      nombre: 'Información Documentada · Identificación y Trazabilidad',
      score_equivalencia: 0.86,
      requisitos_cubiertos: [
        'Control de información documentada clínica (§7.5.2)',
        'Disponibilidad y protección de registros (§7.5.3)',
        'Trazabilidad de la atención del paciente (§8.5.2)',
        'Protección de datos personales de salud (§7.5.3 + Ley 1581)',
        'Gestión del conocimiento institucional (§7.5.1)',
      ],
      gap: 'ISO 7101 §7.5 exige gestión del conocimiento organizacional: la institución debe capturar lecciones aprendidas de casos y convertirlas en protocolos actualizados.',
    },
    jci: {
      estandar: 'MOI · COP',
      nombre: 'Management of Information · Care of Patients',
      score_equivalencia: 0.80,
      requisitos_cubiertos: [
        'MOI.1: Plan de gestión de información institucional',
        'MOI.6: Estandarización de abreviaturas y códigos',
        'MOI.8: Confidencialidad y seguridad de registros',
        'MOI.9: Retención de registros clínicos (20 años)',
        'COP.2: Planificación del cuidado del paciente en HC',
      ],
      gap: 'JCI MOI requiere sistema formal de revisión de calidad de la historia clínica con muestra mensual auditada y reporte a Comité de Calidad.',
    },
  },
  {
    key: 'interdependencia',
    label: 'Interdependencia',
    icon: '🔗',
    res3100: { estandar: 'Est. 7', articulos: 'Art. 56-60 · Res. 3100/2019 · Dec. 780/2016' },
    iso7101: {
      seccion: '§8.4 · §8.5.5',
      nombre: 'Control de Procesos Externos · Entrega Posterior a la Provisión',
      score_equivalencia: 0.76,
      requisitos_cubiertos: [
        'Control de procesos provistos externamente — red de prestadores (§8.4)',
        'Comunicación con proveedores externos de salud (§8.4.3)',
        'Continuidad del cuidado — referencia y contrarreferencia (§8.5.5)',
        'Evaluación de proveedores externos de servicios (§8.4.1)',
      ],
      gap: 'ISO 7101 §8.4 exige evaluación formal y periódica de la red de prestadores como proveedores críticos — con criterios de selección documentados y reevaluación anual.',
    },
    jci: {
      estandar: 'ACC · GLD',
      nombre: 'Access to Care and Continuity · Governance, Leadership and Direction',
      score_equivalencia: 0.68,
      requisitos_cubiertos: [
        'ACC.3: Continuidad del cuidado dentro y fuera de la institución',
        'ACC.4: Transferencia de información entre niveles de atención',
        'GLD.6: Contratos con organizaciones externas',
        'ACC.2: Criterios de priorización para servicios',
      ],
      gap: 'JCI GLD exige gobernanza formal de la red: contratos con SLA medibles, auditorías a proveedores externos y reporte de desempeño a junta directiva.',
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(v: number) { return Math.round(v * 100); }

function barColor(p: number) {
  if (p >= 80) return 'bg-emerald-500';
  if (p >= 60) return 'bg-amber-400';
  return 'bg-red-400';
}

function textColor(p: number) {
  if (p >= 80) return 'text-emerald-600';
  if (p >= 60) return 'text-amber-500';
  return 'text-red-500';
}

function badgeColor(p: number) {
  if (p >= 80) return 'bg-emerald-100 text-emerald-700';
  if (p >= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-600';
}

function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={`text-xs font-bold min-w-[36px] text-right ${textColor(value)}`}>
        {value}%
      </span>
    </div>
  );
}

// ── Card de estándar ──────────────────────────────────────────────────────────

function EstandarCard({ est }: { est: Estandar }) {
  const [open, setOpen] = useState(false);
  const [tab,  setTab]  = useState<'iso' | 'jci'>('iso');

  const pIso = pct(est.iso7101.score_equivalencia);
  const pJci = pct(est.jci.score_equivalencia);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

      {/* Cabecera */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{est.icon}</span>
          <div>
            <p className="text-sm font-bold text-gray-900">{est.label}</p>
            <p className="text-xs text-gray-500">{est.res3100.estandar} · {est.res3100.articulos}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {/* Badges resumen */}
          <div className="hidden sm:flex items-center gap-3">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor(pIso)}`}>
              ISO {pIso}%
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor(pJci)}`}>
              JCI {pJci}%
            </span>
          </div>
          <span className={`text-gray-400 text-lg transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </div>
      </button>

      {/* Barras de progreso */}
      <div className="px-5 pb-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-3">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">🇨🇴 Res. 3100</p>
          <ProgressBar value={100} />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">🌐 ISO 7101</p>
          <ProgressBar value={pIso} />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">⭐ JCI</p>
          <ProgressBar value={pJci} />
        </div>
      </div>

      {/* Detalle expandible */}
      {open && (
        <div className="border-t border-gray-200 px-5 py-4 bg-gray-50">

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            {(['iso', 'jci'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  tab === t
                    ? 'bg-teal-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t === 'iso' ? '🌐 ISO 7101:2023' : '⭐ JCI 8ª Ed.'}
              </button>
            ))}
          </div>

          {tab === 'iso' && (
            <div className="space-y-3">
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <p className="text-xs font-bold text-gray-700">{est.iso7101.seccion}</p>
                <p className="text-xs text-teal-700 mt-0.5">{est.iso7101.nombre}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                  ✅ Requisitos ya cubiertos por Res. 3100
                </p>
                <ul className="space-y-1">
                  {est.iso7101.requisitos_cubiertos.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                      <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-bold text-amber-700 mb-1">⚠️ Brecha para acreditación ISO 7101</p>
                <p className="text-xs text-amber-700">{est.iso7101.gap}</p>
              </div>
            </div>
          )}

          {tab === 'jci' && (
            <div className="space-y-3">
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <p className="text-xs font-bold text-gray-700">{est.jci.estandar}</p>
                <p className="text-xs text-blue-700 mt-0.5">{est.jci.nombre}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                  ✅ Estándares JCI ya cubiertos por Res. 3100
                </p>
                <ul className="space-y-1">
                  {est.jci.requisitos_cubiertos.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                      <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-bold text-amber-700 mb-1">⚠️ Brecha para acreditación JCI</p>
                <p className="text-xs text-amber-700">{est.jci.gap}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ComparadorPage() {
  const avgIso = Math.round(
    ESTANDARES.reduce((s, e) => s + pct(e.iso7101.score_equivalencia), 0) / ESTANDARES.length
  );
  const avgJci = Math.round(
    ESTANDARES.reduce((s, e) => s + pct(e.jci.score_equivalencia), 0) / ESTANDARES.length
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <SectionHeader
        title="Comparador Normativo"
        subtitle="Cross-Walk Res. 3100/2019 ↔ ISO 7101:2023 ↔ JCI 8ª Edición"
      />

      {/* Banner global */}
      <div className="bg-gradient-to-r from-teal-700 to-blue-700 rounded-2xl p-6 text-white">
        <p className="text-sm font-bold mb-4">📊 Equivalencia normativa global al cumplir Res. 3100/2019</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { norm: '🇨🇴 Res. 3100/2019', pct: 100, sub: 'Colombia — Habilitación' },
            { norm: '🌐 ISO 7101:2023',    pct: avgIso, sub: 'Sistemas de Gestión en Salud' },
            { norm: '⭐ JCI 8ª Edición',   pct: avgJci, sub: 'Joint Commission International' },
          ].map(n => (
            <div
              key={n.norm}
              className="bg-white/15 rounded-xl p-4 text-center"
            >
              <p className="text-xs opacity-80 mb-1">{n.norm}</p>
              <p className="text-4xl font-black leading-none">{n.pct}%</p>
              <p className="text-xs opacity-70 mt-1">{n.sub}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-black/20 rounded-xl p-3 text-xs opacity-90">
          💡 <strong>Cómo leer esto:</strong> Al cumplir la Res. 3100, automáticamente cubres una parte de ISO 7101 y JCI.
          El porcentaje muestra cuánto ya tienes cubierto en cada norma gracias a tu trabajo de habilitación colombiana.
          Expande cada estándar para ver los requisitos cubiertos y las brechas pendientes.
        </div>
      </div>

      {/* Cards por estándar */}
      <div className="space-y-3">
        {ESTANDARES.map(est => (
          <EstandarCard key={est.key} est={est} />
        ))}
      </div>

      {/* Nota metodológica */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
        <p className="font-bold mb-1">ℹ️ Nota metodológica</p>
        <p>
          Los porcentajes de equivalencia son estimaciones basadas en el análisis de correspondencia
          entre los criterios de la Res. 3100/2019, ISO 7101:2023 y JCI 8ª edición. No constituyen
          una certificación ni garantizan la aprobación de una auditoría internacional.
          Para acreditación formal, consulta con un organismo certificador acreditado.
        </p>
      </div>
    </div>
  );
}
