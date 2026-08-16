// normalis-crosswalk.js
// NormaLis — Motor de Cross-Walk Normativo v1.0
// Res. 1732/2026 / Res. 3100/2019 (Colombia) ↔ ISO 7101:2023 ↔ Joint Commission International (JCI 8ª ed.)
// ─────────────────────────────────────────────────────────────────────────────────────────
// Cómo funciona:
//   1. Lee las respuestas de auditoría guardadas en Firestore/localStorage
//   2. Calcula el % de cumplimiento por estándar de la Res. 1732/2026 / Res. 3100/2019
//   3. Aplica la matriz de equivalencia para derivar cobertura en ISO 7101 y JCI
//   4. Renderiza el tablero comparativo en el módulo de Cross-Walk
// ─────────────────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════
// 1. MATRIZ DE EQUIVALENCIAS (Res. 1732/2026 / Res. 3100 → ISO 7101 → JCI)
// ═══════════════════════════════════════════════════════════════════

const CROSSWALK_MATRIX = {

  talento_humano: {
    label: 'Talento Humano',
    icon: '👨‍⚕️',
    res3100: { estandar: 'Est. 1', articulos: 'Art. 5-12 · Res. 1732/2026 / Res. 3100/2019' },
    // Áreas del areasDB que mapean a este estándar
    area_ids: ['talento', 'urg-th', 'int-th', 'qui-th', 'dom-coordinacion',
               'img-talento', 'lab-th', 'cx-th', 'obs-th', 'parto-th',
               'rn-th', 'uci-th', 'dial-th', 'onco-th', 'rehab-th'],
    iso7101: {
      seccion: '§5.3 · §7.2 · §7.3',
      nombre: 'Competencia del Personal · Conciencia · Comunicación',
      score_equivalencia: 0.88,
      requisitos_cubiertos: [
        'Determinación de competencias necesarias para cada rol (§5.3.1)',
        'Verificación de educación, formación y experiencia (§5.3.2)',
        'Toma de acciones para adquirir competencia (§5.3.3)',
        'Registros documentados de competencias (§7.5.1)',
        'Comunicación de responsabilidades en calidad (§7.3)'
      ],
      gap: 'ISO 7101 exige plan de desarrollo de competencias con métricas de efectividad — va más allá del simple registro de títulos.'
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
        'QPS.3: Personal calificado para actividades de calidad'
      ],
      gap: 'JCI requiere privilegios clínicos específicos por procedimiento (SQE.10-15), credentialing independiente y peer review anual.'
    }
  },

  infraestructura: {
    label: 'Infraestructura',
    icon: '🏗️',
    res3100: { estandar: 'Est. 2', articulos: 'Art. 13-22 · Res. 1732/2026 / Res. 3100/2019 · NSR-10' },
    area_ids: ['infraestructura', 'accesibilidad', 'urg-planta', 'int-planta',
               'qui-planta', 'img-planta', 'lab-planta', 'obs-planta', 'uci-planta'],
    iso7101: {
      seccion: '§7.1.3 · §7.1.4 · §6.4',
      nombre: 'Infraestructura · Ambiente para la Operación · Ambiente de Trabajo',
      score_equivalencia: 0.79,
      requisitos_cubiertos: [
        'Determinación y provisión de infraestructura necesaria (§7.1.3)',
        'Gestión del ambiente físico para servicios seguros (§7.1.4)',
        'Control de condiciones ambientales (temperatura, humedad, ruido) (§6.4)',
        'Mantenimiento preventivo documentado (§7.1.3)'
      ],
      gap: 'ISO 7101 §6.4 exige análisis del ambiente de trabajo sobre resultados de calidad asistencial con indicadores medibles — no solo cumplimiento físico.'
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
        'FMS.10: Seguimiento del plan de gestión de instalaciones'
      ],
      gap: 'JCI FMS requiere Environmental Rounds trimestrales con hallazgos documentados y plan de acción. También exige programa formal de seguridad contra incendios con simulacros semestrales.'
    }
  },

  dotacion: {
    label: 'Dotación',
    icon: '🩺',
    res3100: { estandar: 'Est. 3', articulos: 'Art. 23-30 · Res. 1732/2026 Est. 3 · Decreto 4725/2005 · INVIMA' },
    area_ids: ['dotacion', 'urg-dotacion', 'int-dotacion', 'img-equipos',
               'lab-equipos', 'qui-esterilizacion', 'dom-dotacion'],
    iso7101: {
      seccion: '§7.1.3 · §8.5.1',
      nombre: 'Equipos e Infraestructura · Control de Producción/Provisión del Servicio',
      score_equivalencia: 0.84,
      requisitos_cubiertos: [
        'Provisión de equipos necesarios para servicios seguros (§7.1.3)',
        'Mantenimiento preventivo y correctivo documentado (§7.1.3)',
        'Control de equipos de seguimiento y medición (§7.1.5)',
        'Identificación del estado de equipos (§8.5.2)',
        'Tecnovigilancia — reporte de incidentes con dispositivos (§8.5.1)'
      ],
      gap: 'ISO 7101 §7.1.5 exige programa de metrología con trazabilidad BIPM para equipos de medición críticos — más riguroso que la calibración anual de la Res. 1732/2026.'
    },
    jci: {
      estandar: 'FMS.8 · FMS.9',
      nombre: 'Medical Equipment · Utility Systems',
      score_equivalencia: 0.78,
      requisitos_cubiertos: [
        'FMS.8.1: Inventario de equipos médicos completo',
        'FMS.8.2: Inspección regular de equipos médicos',
        'FMS.8.3: Pruebas y mantenimiento de equipos',
        'FMS.8.4: Reporte de problemas de equipos médicos al fabricante/INVIMA'
      ],
      gap: 'JCI exige Risk-based equipment management: clasificación de equipos por criticidad con frecuencias de mantenimiento diferenciadas según riesgo clínico.'
    }
  },

  medicamentos: {
    label: 'Medicamentos y Dispositivos',
    icon: '💊',
    res3100: { estandar: 'Est. 4', articulos: 'Art. 31-40 · Res. 1732/2026 Est. 4 · Decreto 677/1995 · Res. 1403/2007' },
    area_ids: ['insumos', 'int-farmacia', 'qui-farmacia', 'uci-farmacia',
               'onco-farmacia', 'urg-farmacia'],
    iso7101: {
      seccion: '§8.5.3 · §8.5.4',
      nombre: 'Trazabilidad · Preservación de Salidas',
      score_equivalencia: 0.81,
      requisitos_cubiertos: [
        'Identificación y trazabilidad de productos (§8.5.2)',
        'Preservación de medicamentos e insumos (§8.5.4)',
        'Control de salidas no conformes — medicamentos vencidos (§8.7)',
        'Almacenamiento seguro según ficha técnica (§8.5.4)',
        'Medicamentos de alto riesgo con controles adicionales (§8.5.3)'
      ],
      gap: 'ISO 7101 exige proceso formal de gestión de proveedores (§8.4) con evaluación periódica de laboratorios farmacéuticos — no solo verificar INVIMA.'
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
        'MMU.7: Monitoreo de efectos de medicamentos'
      ],
      gap: 'JCI MMU requiere formulario institucional revisado anualmente por Comité de Farmacia, sistema de reporte de errores de medicación con análisis mensual, y programa de reconciliación al ingreso/egreso.'
    }
  },

  procesos_prioritarios: {
    label: 'Procesos Prioritarios',
    icon: '📋',
    res3100: { estandar: 'Est. 5', articulos: 'Art. 41-55 · Res. 1732/2026 Est. 5 · Res. 256/2016 · Dec. 1011/2006' },
    area_ids: ['procesos', 'residuos', 'urg-bioseg', 'urg-triage', 'int-iaas',
               'int-calidad', 'qui-esterilizacion', 'img-radioproteccion',
               'img-calidad', 'dom-bioseg', 'dom-seguridad', 'dom-calidad',
               'lab-calidad', 'obs-calidad', 'uci-calidad'],
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
        'Bioseguridad y gestión de residuos (§8.5.1)'
      ],
      gap: 'ISO 7101 §9.1 exige indicadores con benchmarking externo y análisis estadístico de tendencias — no solo medición puntual de indicadores.'
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
        'QPS.4: Reporte y análisis de eventos centinela'
      ],
      gap: 'JCI exige los 6 IPSG completamente implementados con medición mensual y reporte a junta directiva. QPS requiere dashboard de indicadores con análisis de variación estadística (SPC).'
    }
  },

  historia_clinica: {
    label: 'Historia Clínica',
    icon: '📄',
    res3100: { estandar: 'Est. 6', articulos: 'Res. 1995/1999 · Res. 1732/2026 Est. 6 · IHCE · Ley 1581/2012' },
    area_ids: ['historiaclinica', 'urg-hc', 'int-hc', 'qui-hc', 'dom-hc',
               'img-paciente', 'lab-hc', 'obs-hc', 'uci-hc'],
    iso7101: {
      seccion: '§7.5 · §8.5.2',
      nombre: 'Información Documentada · Identificación y Trazabilidad',
      score_equivalencia: 0.86,
      requisitos_cubiertos: [
        'Control de información documentada clínica (§7.5.2)',
        'Disponibilidad y protección de registros (§7.5.3)',
        'Trazabilidad de la atención del paciente (§8.5.2)',
        'Protección de datos personales de salud (§7.5.3 + Ley 1581)',
        'Gestión del conocimiento institucional (§7.5.1)'
      ],
      gap: 'ISO 7101 §7.5 exige gestión del conocimiento organizacional: la institución debe capturar lecciones aprendidas de casos y convertirlas en protocolos actualizados.'
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
        'COP.2: Planificación del cuidado del paciente en HC'
      ],
      gap: 'JCI MOI requiere sistema formal de revisión de calidad de la historia clínica con muestra mensual auditada y reporte a Comité de Calidad.'
    }
  },

  interdependencia: {
    label: 'Interdependencia',
    icon: '🔗',
    res3100: { estandar: 'Est. 7', articulos: 'Art. 56-60 · Res. 1732/2026 Est. 7 · Dec. 780/2016' },
    area_ids: ['urg-interdep', 'dom-transporte', 'dom-comunicacion',
               'int-calidad', 'lab-interdep', 'obs-interdep'],
    iso7101: {
      seccion: '§8.4 · §8.5.5',
      nombre: 'Control de Procesos Externos · Entrega Posterior a la Provisión',
      score_equivalencia: 0.76,
      requisitos_cubiertos: [
        'Control de procesos provistos externamente — red de prestadores (§8.4)',
        'Comunicación con proveedores externos de salud (§8.4.3)',
        'Continuidad del cuidado — referencia y contrarreferencia (§8.5.5)',
        'Evaluación de proveedores externos de servicios (§8.4.1)'
      ],
      gap: 'ISO 7101 §8.4 exige evaluación formal y periódica de la red de prestadores como proveedores críticos — con criterios de selección documentados y reevaluación anual.'
    },
    jci: {
      estandar: 'ACC · GLD',
      nombre: 'Access to Care and Continuity · Governance, Leadership and Direction',
      score_equivalencia: 0.68,
      requisitos_cubiertos: [
        'ACC.3: Continuidad del cuidado dentro y fuera de la institución',
        'ACC.4: Transferencia de información entre niveles de atención',
        'GLD.6: Contratos con organizaciones externas',
        'ACC.2: Criterios de priorización para servicios'
      ],
      gap: 'JCI GLD exige gobernanza formal de la red: contratos con SLA medibles, auditorías a proveedores externos y reporte de desempeño a junta directiva.'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════
// 2. MOTOR DE CÁLCULO
// ═══════════════════════════════════════════════════════════════════

function calcCrosswalkScores() {
  // Lee las respuestas de auditoría guardadas en localStorage
  const auditData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('normalis_ans_')) {
      auditData[key.replace('normalis_ans_', '')] = localStorage.getItem(key);
    }
  }

  const scores = {};

  Object.entries(CROSSWALK_MATRIX).forEach(([stdKey, std]) => {
    let totalPreguntas = 0;
    let respondidas = 0;
    let cumplidas = 0;

    // Calcular % de cumplimiento en Res. 3100 para este estándar
    if (typeof areasDB !== 'undefined') {
      Object.values(areasDB).forEach(segmento => {
        segmento.forEach(area => {
          if (std.area_ids.includes(area.id)) {
            area.q.forEach((_, qi) => {
              totalPreguntas++;
              const ansKey = `${area.id}_${qi}`;
              const ans = auditData[ansKey];
              if (ans !== null && ans !== undefined) respondidas++;
              if (ans === 'si') cumplidas++;
            });
          }
        });
      });
    }

    const pctRes3100 = totalPreguntas > 0 ? Math.round((cumplidas / totalPreguntas) * 100) : 0;
    const pctIso7101 = Math.round(pctRes3100 * std.iso7101.score_equivalencia);
    const pctJCI     = Math.round(pctRes3100 * std.jci.score_equivalencia);

    scores[stdKey] = {
      label: std.label,
      icon: std.icon,
      res3100: pctRes3100,
      iso7101: Math.min(pctIso7101, 100),
      jci: Math.min(pctJCI, 100),
      totalPreguntas,
      respondidas,
      cumplidas,
      gap_iso: std.iso7101.gap,
      gap_jci: std.jci.gap,
      iso_seccion: std.iso7101.seccion,
      iso_nombre: std.iso7101.nombre,
      jci_estandar: std.jci.estandar,
      jci_nombre: std.jci.nombre,
      iso_cubiertos: std.iso7101.requisitos_cubiertos,
      jci_cubiertos: std.jci.requisitos_cubiertos
    };
  });

  return scores;
}

function calcGlobalCrosswalk(scores) {
  const vals = Object.values(scores);
  return {
    res3100: Math.round(vals.reduce((s, v) => s + v.res3100, 0) / vals.length),
    iso7101: Math.round(vals.reduce((s, v) => s + v.iso7101, 0) / vals.length),
    jci:     Math.round(vals.reduce((s, v) => s + v.jci,     0) / vals.length)
  };
}

// ═══════════════════════════════════════════════════════════════════
// 3. RENDER — TABLERO DE CROSS-WALK
// ═══════════════════════════════════════════════════════════════════

function renderCrosswalk() {
  const container = document.getElementById('crosswalk-container');
  if (!container) return;

  const scores = calcCrosswalkScores();
  const global = calcGlobalCrosswalk(scores);

  const barColor = (pct) => pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const bar = (pct, color) => `
    <div style="display:flex;align-items:center;gap:8px">
      <div style="flex:1;background:#f1f5f9;border-radius:99px;height:8px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:99px;transition:width .5s"></div>
      </div>
      <span style="font-size:12px;font-weight:700;color:${color};min-width:36px;text-align:right">${pct}%</span>
    </div>`;

  container.innerHTML = `
    <!-- Header global -->
    <div style="background:linear-gradient(135deg,#0d9488,#0369a1);border-radius:14px;padding:20px 24px;margin-bottom:20px;color:#fff">
      <div style="font-size:16px;font-weight:700;margin-bottom:16px">📊 Equivalencia Normativa Global</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
        ${[
          { norm: '🇨🇴 Res. 1732/2026', pct: global.res3100, sub: 'Colombia — Habilitación' },
          { norm: '🌐 ISO 7101:2023',    pct: global.iso7101, sub: 'Sistemas de Gestión en Salud' },
          { norm: '⭐ JCI 8ª Edición',   pct: global.jci,     sub: 'Joint Commission International' }
        ].map(n => `
          <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:11px;opacity:.85;margin-bottom:4px">${n.norm}</div>
            <div style="font-size:36px;font-weight:800;line-height:1">${n.pct}%</div>
            <div style="font-size:10px;opacity:.75;margin-top:4px">${n.sub}</div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:14px;font-size:11px;opacity:.8;background:rgba(0,0,0,.15);border-radius:8px;padding:10px">
        💡 <strong>Cómo leer esto:</strong> Al cumplir la Res. 1732/2026 (que reemplaza la Res. 3100/2019), automáticamente cubres una parte de ISO 7101 y JCI. El porcentaje muestra cuánto ya tienes cubierto en cada norma gracias a tu trabajo en habilitación colombiana.
      </div>
    </div>

    <!-- Cards por estándar -->
    <div style="display:flex;flex-direction:column;gap:12px">
      ${Object.entries(scores).map(([key, s]) => `
        <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff">

          <!-- Header del estándar -->
          <div style="background:#f8fafc;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;cursor:pointer"
               onclick="toggleCrosswalkDetail('${key}')">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:20px">${s.icon}</span>
              <div>
                <div style="font-weight:700;color:#0f172a;font-size:14px">${s.label}</div>
                <div style="font-size:11px;color:#64748b">${s.cumplidas} de ${s.totalPreguntas} criterios cumplidos en Res. 1732/2026</div>
              </div>
            </div>
            <span id="chevron-${key}" style="color:#94a3b8;font-size:18px;transition:transform .2s">▼</span>
          </div>

          <!-- Barras de progreso -->
          <div style="padding:14px 18px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;border-bottom:1px solid #f1f5f9">
            <div>
              <div style="font-size:10px;font-weight:700;color:#475569;margin-bottom:6px;text-transform:uppercase">🇨🇴 Res. 1732/2026</div>
              ${bar(s.res3100, barColor(s.res3100))}
            </div>
            <div>
              <div style="font-size:10px;font-weight:700;color:#475569;margin-bottom:6px;text-transform:uppercase">🌐 ISO 7101</div>
              ${bar(s.iso7101, barColor(s.iso7101))}
            </div>
            <div>
              <div style="font-size:10px;font-weight:700;color:#475569;margin-bottom:6px;text-transform:uppercase">⭐ JCI</div>
              ${bar(s.jci, barColor(s.jci))}
            </div>
          </div>

          <!-- Detalle expandible -->
          <div id="detail-${key}" style="display:none;padding:16px 18px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">

              <!-- ISO 7101 -->
              <div style="background:#eff6ff;border-radius:10px;padding:14px">
                <div style="font-weight:700;color:#1e40af;font-size:12px;margin-bottom:8px">🌐 ISO 7101:2023 — ${s.iso_seccion}</div>
                <div style="font-size:11px;color:#3730a3;font-style:italic;margin-bottom:10px">${s.iso_nombre}</div>
                <div style="font-size:11px;color:#1e3a8a;font-weight:600;margin-bottom:6px">✅ Ya cubierto por tu habilitación:</div>
                ${s.iso_cubiertos.map(r => `<div style="font-size:11px;color:#1e40af;margin-bottom:3px;padding-left:8px">• ${r}</div>`).join('')}
                <div style="margin-top:10px;background:#dbeafe;border-radius:6px;padding:8px;font-size:11px;color:#1e3a8a">
                  <strong>⚠️ Gap a cerrar:</strong> ${s.gap_iso}
                </div>
              </div>

              <!-- JCI -->
              <div style="background:#fdf4ff;border-radius:10px;padding:14px">
                <div style="font-weight:700;color:#7e22ce;font-size:12px;margin-bottom:8px">⭐ JCI — ${s.jci_estandar}</div>
                <div style="font-size:11px;color:#6b21a8;font-style:italic;margin-bottom:10px">${s.jci_nombre}</div>
                <div style="font-size:11px;color:#581c87;font-weight:600;margin-bottom:6px">✅ Ya cubierto por tu habilitación:</div>
                ${s.jci_cubiertos.map(r => `<div style="font-size:11px;color:#7e22ce;margin-bottom:3px;padding-left:8px">• ${r}</div>`).join('')}
                <div style="margin-top:10px;background:#f3e8ff;border-radius:6px;padding:8px;font-size:11px;color:#581c87">
                  <strong>⚠️ Gap a cerrar:</strong> ${s.gap_jci}
                </div>
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Footer -->
    <div style="margin-top:16px;background:#f8fafc;border-radius:10px;padding:14px;font-size:11px;color:#64748b;border:1px solid #e2e8f0">
      📌 <strong>Nota metodológica:</strong> Los porcentajes de ISO 7101 y JCI son equivalencias derivadas —
      muestran cuánto de esas normas queda cubierto al cumplir la Res. 1732/2026 (reemplaza Res. 3100/2019), según la matriz de equivalencias NormaLis v1.0.
      Para una acreditación formal se requiere evaluación por organismo certificador externo.
      Última actualización del motor: Agosto 2026.
    </div>
  `;
}

function toggleCrosswalkDetail(key) {
  const detail  = document.getElementById(`detail-${key}`);
  const chevron = document.getElementById(`chevron-${key}`);
  if (!detail) return;
  const open = detail.style.display === 'none';
  detail.style.display  = open ? 'block' : 'none';
  if (chevron) chevron.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
}

// ═══════════════════════════════════════════════════════════════════
// 4. AUTO-REGISTRO DEL MÓDULO EN LA APP
// El módulo se registra a sí mismo: inyecta el botón del sidebar
// y el div de la vista sin depender del HTML para ello.
// ═══════════════════════════════════════════════════════════════════

function _crosswalkRegistrar() {
  // --- Sidebar: botón de navegación ---
  const sidebar = document.querySelector('.sidebar-nav, .sb-nav, [class*="sidebar"] ul, [class*="sb-list"]')
    || document.querySelector('[data-mod="incidentes"]')?.parentElement;

  if (sidebar && !document.querySelector('[data-mod="crosswalk"]')) {
    const ref = document.querySelector('[data-mod="incidentes"]');
    const btn = document.createElement('div');
    btn.className = 'sb-item';
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('data-mod', 'crosswalk');
    btn.setAttribute('onclick', "nav('crosswalk')");
    btn.setAttribute('onkeydown', "if(event.key==='Enter'||event.key===' '){event.preventDefault();nav('crosswalk');}");
    btn.innerHTML = '<i class="ti ti-arrows-exchange" aria-hidden="true"></i>Cross-Walk Normativo';
    if (ref && ref.nextSibling) {
      ref.parentNode.insertBefore(btn, ref.nextSibling);
    } else if (sidebar) {
      sidebar.appendChild(btn);
    }
  }

  // --- Vista: contenedor del módulo ---
  if (!document.getElementById('view-crosswalk')) {
    const refView = document.getElementById('view-pamec');
    const view = document.createElement('div');
    view.className = 'view';
    view.id = 'view-crosswalk';
    view.style.display = 'none';
    view.innerHTML = `
      <div class="card-title">🔀 Cross-Walk Normativo — Equivalencias Internacionales</div>
      <p style="color:#64748b;font-size:13px;margin-bottom:16px">
        Aquí puedes ver cuánto avance en <strong>ISO 7101:2023</strong> y
        <strong>Joint Commission International (JCI)</strong> ya tienes cubierto gracias a tu
        cumplimiento de la <strong>Resolución 1732/2026</strong> (reemplaza Res. 3100/2019).
        El motor calcula la equivalencia automáticamente a partir de tus respuestas de auditoría.
      </p>
      <div id="crosswalk-container">
        <div style="text-align:center;padding:40px;color:#94a3b8">
          <div style="font-size:32px;margin-bottom:8px">🔀</div>
          <div>Cargando equivalencias normativas...</div>
        </div>
      </div>`;
    if (refView) {
      refView.parentNode.insertBefore(view, refView);
    } else {
      document.body.appendChild(view);
    }
  }
}

function initCrosswalk() {
  _crosswalkRegistrar();
  renderCrosswalk();
}

// Auto-registro al cargar el script (por si nav() se llama antes de DOMContentLoaded)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _crosswalkRegistrar);
} else {
  _crosswalkRegistrar();
}

// END:normalis-crosswalk.js — NormaLis integrity seal
