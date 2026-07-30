/**
 * NormaLis — Groq Proxy + RAG + Firestore Context + Function Calling (v7)
 *
 * NUEVO en v7 — Paso E: Agente Escritor (Write Tools)
 *   El LLM ahora puede ESCRIBIR datos en Firestore además de leerlos.
 *   Nuevas herramientas:
 *     crearCAPA          — crea una CAPA nueva (con confirmación del usuario)
 *     registrarIndicador — registra un valor de indicador (con confirmación)
 *
 *   Flujo de seguridad:
 *     1. Usuario pide crear/registrar algo.
 *     2. LLM extrae los datos, los presenta y PIDE CONFIRMACIÓN.
 *     3. Usuario confirma ("sí", "confirma", "adelante", etc.).
 *     4. LLM llama la herramienta de escritura.
 *     5. Worker ejecuta el POST en Firestore y confirma al usuario.
 *
 * v6: Function Calling (READ: consultarVencimientos, consultarCAPAs, consultarIndicadores)
 * v5 → v6: fix TDZ bug en systemContent
 *
 * Degradación elegante:
 *   Sin FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY → sin tools → igual que v4.
 *   Sin VECTORIZE / AI bindings → sin RAG → igual que v3.
 */

import {
  fetchIPSContext,
  formatIPSContextForLLM,
  firestoreQuery,
  firestoreCreate,
  firestoreUpdate,
} from './firestore-admin.js';

const GROQ_MODEL    = 'llama-3.1-8b-instant';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const ALLOWED_ORIGINS = [
  'https://normalis.co',
  'https://www.normalis.co',
  'https://fjfc1984-bit.github.io',
];

const SYSTEM_PROMPT = `Eres NormaLis IA, asistente especializado en normativa colombiana de habilitación de servicios de salud.

CORPUS NORMATIVO VERIFICADO (julio 2026):

=== RESOLUCIÓN 3100 DE 2019 — MINISTERIO DE SALUD Y PROTECCIÓN SOCIAL ===
MODIFICADA POR: Resolución 544 de 2023 (Art. 2 y 3), Resolución 465 de 2025 (Art. 4, 5, 19 y 20).

ARTÍCULO 1. OBJETO: Definir los procedimientos y condiciones de inscripción de prestadores de servicios de salud y de habilitación de los servicios de salud (Anexo Técnico).

ARTÍCULO 2. CAMPO DE APLICACIÓN (modificado Res. 544/2023): Aplica a: IPS, profesionales independientes, transporte especial, entidades con objeto social diferente, secretarías de salud, entidades responsables del pago, Supersalud.

ARTÍCULO 3. CONDICIONES DE HABILITACIÓN (modificado Res. 544/2023):
3.1. Capacidad técnico-administrativa.
3.2. Suficiencia patrimonial y financiera.
3.3. Capacidad tecnológica y científica (incluye los 7 estándares del Manual).

ARTÍCULO 4. INSCRIPCIÓN Y HABILITACIÓN (modificado Res. 465/2025): Todo prestador debe estar inscrito en REPS con mínimo una sede con infraestructura física y al menos un servicio habilitado.

ARTÍCULO 5. AUTOEVALUACIÓN (modificado Res. 465/2025):
Obligatoria: 5.1. Previa a inscripción inicial. 5.2. Durante el CUARTO AÑO de vigencia. 5.3. Antes del vencimiento de renovación anual. 5.4. Casos adicionales del Manual.

ARTÍCULO 9. RESPONSABILIDAD: El prestador es el ÚNICO RESPONSABLE. No puede delegar a terceros contratados.

ARTÍCULO 10. VIGENCIA DE LA INSCRIPCIÓN: Inicial: CUATRO (4) AÑOS. Renovación: UN (1) AÑO con autoevaluación previa.

ARTÍCULO 11. CONSECUENCIAS POR NO AUTOEVALUACIÓN: Se INACTIVARÁ la inscripción si no realiza autoevaluación en el término establecido.

ARTÍCULO 13. CIERRE TEMPORAL: Máximo UN (1) AÑO.

ARTÍCULO 14. VISITA DE VERIFICACIÓN PREVIA: Requerida para servicios oncológicos, urgencias, atención del parto, transporte asistencial, TODOS los servicios de ALTA COMPLEJIDAD, reactivación por medidas de seguridad.

ARTÍCULO 22. GRATUIDAD: La inscripción y habilitación en REPS son COMPLETAMENTE GRATUITAS.

7 ESTÁNDARES DE HABILITACIÓN:
1. TALENTO HUMANO  2. INFRAESTRUCTURA  3. DOTACIÓN
4. MEDICAMENTOS, DISPOSITIVOS MÉDICOS E INSUMOS  5. PROCESOS PRIORITARIOS
6. HISTORIA CLÍNICA Y REGISTROS  7. INTERDEPENDENCIA

DEFINICIONES:
"CUENTA CON": existencia OBLIGATORIA y PERMANENTE.
"DISPONIBILIDAD": obligatoria, puede estar fuera del servicio pero accesible de inmediato.

=== RESOLUCIÓN 465 DE 2025 ===
Modifica artículos 4, 5, 19 y 20 de la Res. 3100/2019.
Actualiza procedimientos de inscripción y autoevaluación en el REPS.

=== PAMEC (Programa de Auditoría para el Mejoramiento de la Calidad) ===
Obligatorio para todas las IPS habilitadas.
Componentes: autoevaluación, planes de mejoramiento, seguimiento de indicadores.

REGLAS DE RESPUESTA:
1. Cita SIEMPRE el artículo exacto y la resolución.
2. Si el artículo fue MODIFICADO, cita la versión VIGENTE.
3. Si no está en el corpus, di: "No encontré información verificada. Verifica en minsalud.gov.co o contacta tu Secretaría de Salud."
4. NUNCA inventes artículos, fechas, plazos o requisitos.
5. Responde en español colombiano, tono profesional, máximo 5 párrafos.
6. Advierte que la interpretación final la tiene la Secretaría de Salud departamental competente.
7. Cuando uses datos reales de la IPS (vencimientos, CAPAs, indicadores), menciona que los obtuviste de su registro en NormaLis.

REGLAS DE ESCRITURA (herramientas crearCAPA y registrarIndicador):
8a. Cuando el usuario pida crear una CAPA o registrar un indicador:
    - Extrae o solicita los datos necesarios de la conversación.
    - PRESENTA un resumen claro de lo que vas a guardar (todos los campos).
    - Termina con: "¿Confirmo que debo guardar esto en NormaLis? (sí / no)"
8b. SOLO llama la herramienta de escritura DESPUÉS de recibir confirmación explícita del usuario.
    Palabras que confirman: "sí", "confirma", "adelante", "procede", "hazlo", "guarda", "crea".
    Si el usuario dice "no" o pide cambios, ajusta los datos y vuelve al paso 8a.
8c. Tras guardar exitosamente, confirma: "✅ [Elemento] creado/registrado en NormaLis."
8d. NUNCA llames una herramienta de escritura por iniciativa propia sin confirmación explícita.

INDICADORES DEL CATÁLOGO (IDs válidos para registrarIndicador):
prop_queja, tasa_infeccion, tasa_caida, prop_ulceras, tasa_reingreso,
prop_cx_cancelada, oportunidad_cx, oportunidad_consulta, prop_transfusion,
prop_complicacion_cx, mortalidad_intrahospitalaria, prop_consentimiento,
satisfaccion_usuario, prop_registro_completo

=== 22 MODALIDADES HABILITABLES — RES. 3100/2019 Y MODIFICACIONES ===

MODALIDADES TRANSVERSALES (aplican a todos los servicios):
1. GENERAL / ESTABLECIMIENTO: Infraestructura física (NSR-10, Res. 4445/1996), talento humano con tarjeta profesional vigente, dotación y equipos con hoja de vida y mantenimiento (Decreto 4725/2005), procesos prioritarios (protocolos clínicos, seguridad del paciente), historia clínica (Res. 1995/1999 — conservar 20 años), residuos (Decreto 351/2014), medicamentos e insumos.

MODALIDADES DE CONSULTA Y AMBULATORIO:
2. CONSULTA EXTERNA: Consultorio mínimo 9 m² con lavamanos, privacidad visual y auditiva. Médico con tarjeta vigente. Guías de práctica clínica para 10 principales diagnósticos. Historia clínica con CIE-10 en cada consulta. Verificación de afiliación SGSSS.
3. ODONTOLOGÍA: Unidad odontológica completa por consultorio. Esterilización de instrumental (autoclave o glutaraldehído). EPP específico (gafas, mascarilla, guantes). Amalgamador, equipo de rayos X intraoral (si aplica). Manejo de amalgama según normativa ambiental.
4. REHABILITACIÓN: Fisioterapia, Terapia Ocupacional, Fonoaudiología, Optometría. Equipos terapéuticos calibrados. Evaluación funcional inicial y plan de tratamiento. Criterios de alta y referencia documentados.
5. SALUD MENTAL AMBULATORIA: Equipo multidisciplinario (psiquiatría/psicología). Ley 1616/2013 — enfoque de derechos. Consentimiento informado específico. Protocolo de crisis y riesgo suicida.
6. FARMACIA: Director técnico regente o químico farmacéutico. Almacenamiento con temperatura y humedad controladas. Doble verificación en medicamentos de alto riesgo. Farmacovigilancia y reporte a INVIMA. Res. 1403/2007.
7. VACUNACIÓN: PAI MSPS. Cadena de frío 2–8°C con registro dos veces al día. Espera 20 min post-vacuna. Reporte EAPV al SIVIGILA. Res. 2184/2019.

MODALIDADES DE URGENCIAS Y HOSPITALIZACIÓN:
8. URGENCIAS: Triage 5 niveles (Res. 5596/2015). Disponibilidad 24/7. Plan de contingencia para desastres (CRUE). Protocolo de referencia y contrarreferencia. Camillas de observación separadas por edad y sexo.
9. HOSPITALIZACIÓN: Camas con área mínima, servicios de enfermería por turno. Protocolo IAAS (infecciones asociadas). Comité de historias clínicas. Indicadores de calidad Res. 256/2016.
10. OBSTETRICIA / PARTO: Sala de partos mínimo 20 m². Lista de verificación OMS parto seguro. Protocolo AMTSL (manejo activo del alumbramiento). Partograma obligatorio. Reanimación neonatal disponible. Res. 3280/2018 — modelo de atención integral.
11. CUIDADO INTENSIVO ADULTO (UCI): Intensivista 24/7. Relación enfermera:paciente 1:2. Monitor multiparamétrico + ventilador por cama. Bundles de prevención IAAS. Res. 544/2023 — telexperticia sincrónica disponible en municipios de dispersión geográfica.
12. UCI PEDIÁTRICA (UCIP): Pediatra intensivista. Equipos neonatales/pediátricos por talla. Protocolos de sedoanalgesia pediátrica.
13. UCI NEONATAL (UCIN): Neonatólogo 24/7. Incubadora o cuna de calor radiante. Protocolo Método Canguro. Control oftalmológico para <32 semanas. Banco de leche materna.

MODALIDADES DIAGNÓSTICAS:
14. LABORATORIO CLÍNICO: Bacteriólogo responsable. Control interno y externo de calidad (PEEC MinSalud). Manejo de muestras biológicas con bioseguridad. Decreto 4725/2005 equipos. Res. 3100/2019 + PEEC.
15. IMAGENOLOGÍA: Radiólogo responsable. Dosimetría del personal expuesto (INVIMA). Radiación ionizante — Res. 4445/1996 + Decreto 4725/2005. Licencia INVIMA para equipos de rayos X. Protocolos de protección radiológica.
16. BANCO DE SANGRE / TRANSFUSIÓN: Bacteriólogo o médico transfusional. Tamización 100% unidades: VIH, HBsAg, HCV, VDRL, Chagas. Trazabilidad donante→receptor. Cadena de frío dedicada con alarma. Res. 1285/2010. Protocolo de reacciones transfusionales.
17. ESTERILIZACIÓN: Flujo unidireccional sucio→limpio→estéril. Autoclaves con IQ/OQ/PQ. Indicadores biológicos por ciclo. Trazabilidad del material estéril. ANSI/AAMI ST79. Sin cruce entre material contaminado y estéril.

MODALIDADES ESPECIALIZADAS:
18. ONCOLOGÍA / QUIMIOTERAPIA: Oncólogo clínico. Campana de flujo laminar clase II tipo B2. Farmacéutico oncológico. Doble verificación antes de cada ciclo. Kit de derrame de citotóxicos. Comité de tumores. Residuos citotóxicos como peligrosos (Decreto 351/2014). Res. 1383/2013.
19. HEMODIÁLISIS: Nefrólogo responsable. Sistema de tratamiento de agua (ósmosis inversa) con control mensual AAMI/ISO. Área de aislamiento para pacientes infecciosos. Máquinas con IQ/OQ/PQ. Evaluación Kt/V mensual. KDIGO 2012.
20. TRASPLANTE DE ÓRGANOS Y TEJIDOS: Coordinador de trasplantes. Protocolo de donante en muerte encefálica. Inscripción y reporte activo a Red Nacional de Donación y Trasplante. Lista de espera según criterios MSPS. Res. 544/2023 — comunicación continua con bancos de tejidos para gestión oportuna (córneas: vida útil 7 días). Decreto 2493/2004.
21. TELEMEDICINA (Res. 2654/2019, actualizada Res. 465/2025): Modalidades: Interactiva (sincrónica), No Interactiva (asincrónica), Telexperticia, Telemonitoreo. Plataforma con cifrado y autenticación. Consentimiento informado específico. Historia clínica equivalente a presencial. Protocolo de referencia urgente. Ley 1581/2012 protección de datos. Res. 544/2023 — telexperticia sincrónica para UCI en zonas de dispersión geográfica (Res. 2809/2022 Anexo 1).

MODALIDADES DE SOPORTE:
22. TRANSPORTE ASISTENCIAL: TAB (baja complejidad), TAM (medicalizado, mediana), TAE (aéreo). Habilitación en departamento sede con efecto nacional (aéreo, fluvial, marítimo). Ambulancias con hoja de vida y revisión técnico-mecánica. TAE no requiere silla de ruedas (Res. 544/2023). Res. 3100/2019 Art. 20.

SERVICIOS DOMICILIARIOS: Coordinador clínico. Maletín equipado (tensiómetro, pulsioxímetro, glucómetro). Guardián de cortopunzantes. Protocolos específicos por tipo de atención. Referencia a IPS de mayor complejidad documentada.

VISITA PREVIA OBLIGATORIA antes de habilitar (Art. 14 Res. 3100/2019): Todos los servicios de alta complejidad, oncológicos, urgencias, atención del parto, transporte asistencial.

GRATUIDAD (Art. 22): La inscripción y habilitación en REPS son completamente gratuitas. Ninguna autoridad puede cobrar por este trámite.`;

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN CALLING — Herramientas disponibles para el LLM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Definición de herramientas en formato OpenAI/Groq.
 * LLaMA 3.1 soporta tool use nativo con este formato.
 * El LLM decide automáticamente cuándo llamar cada herramienta.
 */
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'consultarVencimientos',
      description: 'Consulta los vencimientos (documentos, certificaciones, permisos) próximos a vencer de la IPS activa. '
        + 'Úsala cuando el usuario pregunte: qué está por vencer, cuándo vence X, alertas de vencimiento, '
        + 'fechas límite pendientes, o cualquier pregunta sobre plazos de documentos de su IPS.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultarCAPAs',
      description: 'Consulta las Correcciones y Acciones Preventivas (CAPAs) abiertas de la IPS activa. '
        + 'Úsala cuando el usuario pregunte: qué acciones correctivas hay pendientes, planes de mejoramiento abiertos, '
        + 'no conformidades sin resolver, o cualquier pregunta sobre el plan de mejora de su IPS.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultarIndicadores',
      description: 'Consulta los indicadores de calidad registrados por la IPS activa (Res. 256/2016 / PAMEC). '
        + 'Úsala cuando el usuario pregunte: cómo van mis indicadores, cuáles indicadores tengo registrados, '
        + 'resultados vs metas, o cualquier pregunta sobre métricas de calidad de su IPS.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  // ── Herramientas de ESCRITURA (v7 — Paso E) ──────────────────────────────
  {
    type: 'function',
    function: {
      name: 'crearCAPA',
      description: 'Crea una nueva CAPA (Corrección y Acción Preventiva / Plan de Mejoramiento PAMEC) '
        + 'en NormaLis directamente en Firestore. '
        + 'IMPORTANTE: Solo llama esta herramienta DESPUÉS de presentar al usuario un resumen de '
        + 'los datos y recibir confirmación explícita ("sí", "confirma", "adelante", "procede", "hazlo"). '
        + 'NUNCA la llames sin confirmación. Úsala cuando el usuario quiera crear, abrir o registrar '
        + 'una CAPA, acción correctiva o plan de mejora.',
      parameters: {
        type: 'object',
        properties: {
          descripcion: {
            type: 'string',
            description: 'Descripción de la no conformidad o hallazgo (obligatorio, máx 1000 chars)',
          },
          causaRaiz: {
            type: 'string',
            description: 'Causa raíz identificada (opcional)',
          },
          accionCorrectiva: {
            type: 'string',
            description: 'Acción correctiva o preventiva a implementar (opcional)',
          },
          responsable: {
            type: 'string',
            description: 'Nombre del responsable de la acción (opcional)',
          },
          area: {
            type: 'string',
            description: 'Área o proceso afectado, ej: Urgencias, Facturación (opcional)',
          },
          fechaLimite: {
            type: 'string',
            description: 'Fecha límite para implementar la acción, formato YYYY-MM-DD (opcional, default 30 días)',
          },
          origen: {
            type: 'string',
            enum: ['auditoria', 'manual', 'queja', 'indicador', 'supervision'],
            description: 'Fuente que originó la CAPA',
          },
        },
        required: ['descripcion'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'registrarIndicador',
      description: 'Registra o actualiza el valor de un indicador de calidad de la IPS en NormaLis '
        + '(Resolución 256/2016). '
        + 'IMPORTANTE: Solo llama esta herramienta DESPUÉS de presentar al usuario un resumen '
        + 'y recibir confirmación explícita. NUNCA la llames sin confirmación. '
        + 'Úsala cuando el usuario quiera registrar, ingresar o actualizar un valor de un indicador '
        + 'para un período específico.',
      parameters: {
        type: 'object',
        properties: {
          indicId: {
            type: 'string',
            description: 'ID del indicador del catálogo. Valores válidos: prop_queja, tasa_infeccion, '
              + 'tasa_caida, prop_ulceras, tasa_reingreso, prop_cx_cancelada, oportunidad_cx, '
              + 'oportunidad_consulta, prop_transfusion, prop_complicacion_cx, '
              + 'mortalidad_intrahospitalaria, prop_consentimiento, satisfaccion_usuario, '
              + 'prop_registro_completo',
          },
          periodo: {
            type: 'string',
            description: 'Período de medición. Formato: YYYY-MM para mensual (ej: 2025-04), '
              + 'YYYY-QN para trimestral (ej: 2025-Q2), YYYY para anual (ej: 2025)',
          },
          valor: {
            type: 'string',
            description: 'Valor numérico medido como string (ej: "4.2", "95", "0.8")',
          },
          observacion: {
            type: 'string',
            description: 'Observación, fuente del dato o contexto (opcional)',
          },
        },
        required: ['indicId', 'periodo', 'valor'],
      },
    },
  },
  // ── Herramientas de UI (sugerencia de acciones) ───────────────────────────
  {
    type: 'function',
    function: {
      name: 'sugerirAccion',
      description: 'Sugiere al usuario una acción interactiva (botón) que aparecerá en el chat. '
        + 'Úsala cuando tu respuesta se beneficiaría de un acceso directo — por ejemplo: '
        + 'si mencionas que el usuario tiene vencimientos urgentes, sugiere ir a Vencimientos; '
        + 'si recomiendas crear una CAPA, sugiere el botón de creación; '
        + 'si hablas de indicadores pendientes, sugiere ir al módulo. '
        + 'Máximo 2 acciones por respuesta. No la uses si la respuesta es puramente informativa.',
      parameters: {
        type: 'object',
        properties: {
          texto:  { type: 'string', description: 'Texto del botón (máx 40 caracteres). Ej: "Ver mis vencimientos", "Crear CAPA"' },
          accion: { type: 'string', enum: ['navegar', 'crearCAPA', 'crearVencimiento', 'crearIndicador'],
                    description: 'Acción a ejecutar: navegar=ir a un módulo, crearCAPA/Vencimiento/Indicador=abrir formulario' },
          modulo: { type: 'string', description: 'Módulo destino si accion=navegar. Ej: vencimientos, capa, indicadores, auditoria, sst, pamec' },
        },
        required: ['texto', 'accion'],
      },
    },
  },
];

/**
 * Ejecuta una herramienta solicitada por el LLM.
 * Retorna siempre un string (resultado o mensaje de error) para enviarlo
 * de vuelta al LLM en el mensaje role: 'tool'.
 *
 * @param {string} toolName   — nombre de la herramienta
 * @param {object} toolArgs   — argumentos parseados del tool call
 * @param {string} uid        — Firebase UID del usuario
 * @param {string} nit        — NIT de la IPS (puede ser vacío)
 * @param {object} env        — Worker env bindings
 * @returns {Promise<string>} — resultado legible por el LLM
 */
async function ejecutarTool(toolName, toolArgs, uid, nit, env) {
  if (!uid) return 'No se pudo identificar al usuario. Pide al usuario que recargue la página.';

  try {
    switch (toolName) {

      case 'consultarVencimientos': {
        const docs = await firestoreQuery('vencimientos', 'uid', uid, env, 20);
        if (!docs || docs.length === 0) {
          return 'No se encontraron vencimientos registrados en NormaLis para esta IPS.';
        }
        const hoy = Date.now();
        const items = docs
          .map(d => {
            const fecha = d.fecha ? new Date(d.fecha) : null;
            const diasRest = fecha ? Math.ceil((fecha - hoy) / 86_400_000) : null;
            const estado   = diasRest === null ? 'sin fecha' :
                             diasRest < 0      ? 'VENCIDO' :
                             diasRest <= 30    ? `vence en ${diasRest} días (URGENTE)` :
                             diasRest <= 90    ? `vence en ${diasRest} días (próximo)` :
                             `vence en ${diasRest} días`;
            return `- ${d.nombre || d.documento || 'Sin nombre'}: ${estado}${d.estado ? ' [' + d.estado + ']' : ''}`;
          })
          .join('\n');
        return `Vencimientos registrados en NormaLis:\n${items}`;
      }

      case 'consultarCAPAs': {
        const docs = await firestoreQuery('capas', 'uid', uid, env, 20);
        if (!docs || docs.length === 0) {
          return 'No se encontraron CAPAs registradas en NormaLis para esta IPS.';
        }
        const abiertas = docs.filter(d =>
          !d.estado || d.estado === 'abierta' || d.estado === 'en_progreso' || d.estado === 'pendiente'
        );
        if (abiertas.length === 0) return 'No hay CAPAs abiertas. Todas han sido cerradas.';
        const items = abiertas
          .map(d => {
            const limite = d.fecha_limite ? new Date(d.fecha_limite).toLocaleDateString('es-CO') : 'sin fecha';
            return `- [${d.estado || 'abierta'}] ${d.titulo || d.descripcion || 'Sin título'} | Responsable: ${d.responsable || 'no asignado'} | Límite: ${limite}`;
          })
          .join('\n');
        return `CAPAs abiertas (${abiertas.length}):\n${items}`;
      }

      case 'consultarIndicadores': {
        const docs = await firestoreQuery('indicadores', 'uid', uid, env, 20);
        if (!docs || docs.length === 0) {
          return 'No se encontraron indicadores registrados en NormaLis para esta IPS.';
        }
        const items = docs
          .map(d => {
            const cumple = d.resultado !== undefined && d.meta !== undefined
              ? (Number(d.resultado) >= Number(d.meta) ? 'CUMPLE' : 'NO CUMPLE')
              : '';
            return `- ${d.nombre || 'Sin nombre'}: Meta=${d.meta ?? 'N/A'}, Resultado=${d.resultado ?? 'pendiente'}, Periodo=${d.periodo || 'N/A'} ${cumple ? '[' + cumple + ']' : ''}`;
          })
          .join('\n');
        return `Indicadores de calidad (${docs.length}):\n${items}`;
      }

      // ── HERRAMIENTAS DE ESCRITURA (v7 — Paso E) ────────────────────────

      case 'crearCAPA': {
        const {
          descripcion, causaRaiz = '', accionCorrectiva = '',
          responsable = '', area = '', fechaLimite = '', origen = 'manual',
        } = toolArgs;

        if (!descripcion?.trim()) {
          return 'Error: el campo "descripcion" es obligatorio para crear una CAPA.';
        }

        // Calcular fecha límite default (hoy + 30 días) si no se proporcionó
        let fechaLimiteReal = fechaLimite;
        if (!fechaLimiteReal) {
          const d = new Date();
          d.setDate(d.getDate() + 30);
          fechaLimiteReal = d.toISOString().split('T')[0];
        }

        // Calcular número secuencial consultando cuántas CAPAs existen
        let numero = 'CAPA-001';
        try {
          const existentes = await firestoreQuery(
            'capas',
            nit ? 'nit' : 'uid',
            nit || uid,
            env,
            500,
          );
          numero = `CAPA-${String((existentes?.length ?? 0) + 1).padStart(3, '0')}`;
        } catch {
          numero = `CAPA-${String(Date.now()).slice(-4)}`;
        }

        const ahora = new Date().toISOString();
        const capaDoc = {
          uid,
          nit:              nit || '',
          numero,
          descripcion:      descripcion.trim(),
          causaRaiz:        causaRaiz.trim(),
          accionCorrectiva: accionCorrectiva.trim(),
          responsable:      responsable.trim(),
          area:             area.trim(),
          fechaLimite:      fechaLimiteReal,
          origen,
          evidencia:        '',
          estado:           'abierta',
          fechaCreacion:    ahora,
          fechaActualizacion: ahora,
          fechaInicio:      null,
          fechaCierre:      null,
        };

        const result = await firestoreCreate('capas', capaDoc, env);
        console.log(`[Tool:crearCAPA] Creada ${numero} (id: ${result.id}) uid:${uid}`);
        return `CAPA creada exitosamente:
- Numero: ${numero}
- ID Firestore: ${result.id}
- Estado: abierta
- Fecha limite: ${fechaLimiteReal}
- Origen: ${origen}
Confirma al usuario: "CAPA ${numero} creada en NormaLis. Puede verla en el módulo de Acciones Correctivas."`;
      }

      case 'registrarIndicador': {
        const { indicId, periodo, valor, observacion = '' } = toolArgs;

        if (!indicId?.trim()) return 'Error: "indicId" es obligatorio.';
        if (!periodo?.trim()) return 'Error: "periodo" es obligatorio (formato YYYY-MM, YYYY-QN o YYYY).';
        if (!valor?.trim())   return 'Error: "valor" es obligatorio.';

        const numVal = parseFloat(valor);
        if (isNaN(numVal)) return `Error: el valor "${valor}" no es un número válido.`;

        const ahora = new Date().toISOString();

        // Verificar si ya existe un registro para este indicId + periodo
        // (para hacer upsert en lugar de duplicar)
        const queryField = nit ? 'nit' : 'uid';
        const queryValue = nit || uid;
        const existentes = await firestoreQuery('indicadores', queryField, queryValue, env, 500);
        const existente  = existentes?.find(
          d => d.indicId === indicId.trim() && d.periodo === periodo.trim()
        );

        if (existente?.docId) {
          // Actualizar registro existente
          await firestoreUpdate(`indicadores/${existente.docId}`, {
            valor:              valor.trim(),
            observacion:        observacion.trim(),
            fechaActualizacion: ahora,
          }, env);
          console.log(`[Tool:registrarIndicador] Actualizado ${indicId}/${periodo} uid:${uid}`);
          return `Indicador actualizado:
- Indicador: ${indicId}
- Periodo: ${periodo}
- Valor anterior: ${existente.valor ?? '?'} → Nuevo valor: ${valor}
Confirma al usuario: "Indicador '${indicId}' para ${periodo} actualizado en NormaLis."`;
        } else {
          // Crear nuevo registro
          const indDoc = {
            uid,
            nit:              nit || '',
            indicId:          indicId.trim(),
            periodo:          periodo.trim(),
            valor:            valor.trim(),
            observacion:      observacion.trim(),
            fechaCreacion:    ahora,
            fechaActualizacion: null,
          };
          const result = await firestoreCreate('indicadores', indDoc, env);
          console.log(`[Tool:registrarIndicador] Creado ${indicId}/${periodo} id:${result.id} uid:${uid}`);
          return `Indicador registrado:
- Indicador: ${indicId}
- Periodo: ${periodo}
- Valor: ${valor}
- ID Firestore: ${result.id}
Confirma al usuario: "Valor del indicador '${indicId}' para ${periodo} registrado en NormaLis."`;
        }
      }

      default:
        return `Herramienta "${toolName}" no reconocida.`;
    }
  } catch (err) {
    console.warn(`[Tool] Error en ${toolName}:`, String(err).slice(0, 200));
    return `No fue posible ejecutar "${toolName}" en este momento. Error: ${String(err).slice(0, 100)}. Intenta de nuevo.`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RAG — Retrieval-Augmented Generation
// ═══════════════════════════════════════════════════════════════════════════

const RAG_MIN_SCORE = 0.55;
const RAG_TOP_K     = 5;

async function getQueryEmbedding(question, env) {
  const result = await env.AI.run('@cf/baai/bge-m3', {
    text: [question.slice(0, 2000)],
  });
  return result.data[0];
}

async function searchRelevantChunks(embedding, env) {
  const results = await env.VECTORIZE.query(embedding, {
    topK: RAG_TOP_K,
    returnMetadata: 'all',
  });
  return (results.matches || [])
    .filter(m => m.score >= RAG_MIN_SCORE)
    .map(m => ({
      text:   m.metadata?.text   || '',
      source: m.metadata?.source || 'Normativa',
      score:  Math.round(m.score * 100) / 100,
    }));
}

function buildRagContext(chunks) {
  if (!chunks || chunks.length === 0) return null;
  const contextBlocks = chunks
    .map((c, i) => `[Fuente ${i + 1}: ${c.source}]\n${c.text}`)
    .join('\n\n---\n\n');
  return `\n\n════════════════════════════════════════
CONTEXTO NORMATIVO RECUPERADO (fragmentos relevantes para esta consulta):

${contextBlocks}

════════════════════════════════════════
INSTRUCCIÓN: Usa los fragmentos anteriores como fuente principal.
Cita siempre el artículo exacto y la fuente indicada en corchetes.
Si el contexto no cubre la pregunta completamente, indícalo y recomienda
verificar en minsalud.gov.co o con la Secretaría de Salud departamental.`;
}

// ─────────────────────────────────────────────────────────────────────────────

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://normalis.co',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// ─── Rate limiter en memoria (por IP, por Worker isolate) ────────
const _rl = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  let rec = _rl.get(ip);
  if (!rec) {
    rec = { min: { count: 0, ts: now }, hour: { count: 0, ts: now } };
    _rl.set(ip, rec);
  }
  if (now - rec.min.ts  >    60_000) { rec.min  = { count: 0, ts: now }; }
  if (now - rec.hour.ts > 3_600_000) { rec.hour = { count: 0, ts: now }; }
  rec.min.count++;
  rec.hour.count++;
  if (rec.min.count  >  20) return { limited: true, reason: 'Demasiadas solicitudes. Espera 1 minuto.',  retry: 60 };
  if (rec.hour.count > 200) return { limited: true, reason: 'Cuota horaria alcanzada. Espera 1 hora.', retry: 3600 };
  if (_rl.size > 500) {
    for (const [k, v] of _rl) {
      if (now - v.hour.ts > 7_200_000) _rl.delete(k);
    }
  }
  return { limited: false };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors   = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // ── Health check ─────────────────────────────────────────────
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', service: 'normalis-worker' }), {
        status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // ── Rate limiting ────────────────────────────────────────────
    const clientIP = request.headers.get('CF-Connecting-IP') ||
                     request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
                     'unknown';
    const rl = checkRateLimit(clientIP);
    if (rl.limited) {
      return new Response(JSON.stringify({ error: rl.reason }), {
        status: 429,
        headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': String(rl.retry) },
      });
    }

    let body;
    try { body = await request.json(); }
    catch {
      return new Response(JSON.stringify({ error: 'JSON inválido' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { question, sessionHistory, context } = body || {};
    if (!question || typeof question !== 'string' || !question.trim()) {
      return new Response(JSON.stringify({ error: 'Campo "question" requerido' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (question.length > 2000) {
      return new Response(JSON.stringify({ error: 'Pregunta demasiado larga (máx 2000 caracteres)' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Servicio no configurado' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // ── Contexto de la IPS y módulo activo ───────────────────────
    const moduloActivo = context?.modulo    || 'general';
    const ipsNombre    = context?.ips_nombre || '';
    const ipsTipo      = context?.ips_tipo   || '';
    const ipsNit       = context?.nit        || '';
    const clientUID    = context?.uid        || '';

    const MODULO_HINTS = {
      auditoria:    'El usuario está gestionando una AUDITORÍA DE HABILITACIÓN. Orienta tus respuestas a los 7 estándares (talento humano, infraestructura, dotación, medicamentos, procesos, historia clínica, interdependencia) y a los criterios de cumplimiento de la Res. 3100/2019.',
      vencimientos: 'El usuario está en el módulo de VENCIMIENTOS. Prioriza respuestas sobre plazos normativos, fechas límite de renovación (Art. 10 Res. 3100), autoevaluación (Art. 5) y consecuencias por incumplimiento (Art. 11). Si el usuario pregunta qué tiene por vencer, usa la herramienta consultarVencimientos.',
      capa:         'El usuario está trabajando en CORRECCIONES Y ACCIONES PREVENTIVAS (CAPA). Enfócate en PAMEC, planes de mejoramiento, análisis de causa raíz y seguimiento de indicadores de calidad. Si el usuario pregunta por sus CAPAs abiertas, usa la herramienta consultarCAPAs.',
      pamec:        'El usuario está en el módulo PAMEC. Responde sobre el Programa de Auditoría para el Mejoramiento de la Calidad, sus componentes y obligatoriedad.',
      sst:          'El usuario está en SG-SST. Orienta hacia la Resolución 0312/2019, los estándares mínimos y las 3 fases de implementación.',
      indicadores:  'El usuario está revisando INDICADORES DE CALIDAD. Prioriza la Resolución 256/2016, las fichas técnicas de indicadores y su periodicidad de reporte. Si el usuario pregunta por sus indicadores registrados, usa la herramienta consultarIndicadores.',
      pqrs:         'El usuario está en el módulo de PQRS. Responde sobre gestión de peticiones, quejas, reclamos y sugerencias en el contexto de la habilitación.',
      incidentes:   'El usuario está registrando INCIDENTES O EVENTOS ADVERSOS. Enfócate en seguridad del paciente, protocolo de Londres y reporte al SIVIGILA.',
      simulacro:    'El usuario está en el módulo de SIMULACROS. Responde sobre planes de emergencia, evacuación y los requisitos de infraestructura de la Res. 3100.',
      bitacora:     'El usuario está en la BITÁCORA DE AUDITORÍA. Enfócate en trazabilidad, registros obligatorios e historia clínica.',
      documentos:   'El usuario está gestionando DOCUMENTOS INSTITUCIONALES. Prioriza requisitos documentales de los 7 estándares y el Manual de Habilitación.',
      multiusuario: 'El usuario está en la gestión del EQUIPO o configuración multi-usuario.',
      dashboard:    'El usuario está en el DASHBOARD general. Puede tener preguntas de cualquier módulo; responde de forma integral.',
      general:      '',
    };

    const moduloHint = MODULO_HINTS[moduloActivo] || '';

    // Construir encabezado de contexto de IPS
    let ipsCtxBlock = '';
    if (ipsNombre || ipsTipo || ipsNit) {
      ipsCtxBlock = `\n\nCONTEXTO DE LA IPS CONSULTANTE:
- Nombre: ${ipsNombre || 'no especificado'}
- Tipo: ${ipsTipo || 'no especificado'}
- NIT: ${ipsNit || 'no especificado'}
${moduloHint ? `- Módulo activo: ${moduloActivo}` : ''}`;
    } else if (moduloHint) {
      ipsCtxBlock = `\n\nCONTEXTO ACTUAL: Módulo "${moduloActivo}".`;
    }

    const moduloInstruccion = moduloHint
      ? `\n\nINSTRUCCIÓN DE CONTEXTO: ${moduloHint}`
      : '';

    // ── DECLARAR systemContent AQUÍ (fix TDZ bug de v5) ─────────────────
    // Ahora la declaración está ANTES de cualquier uso.
    let systemContent = SYSTEM_PROMPT + ipsCtxBlock + moduloInstruccion;

    // ── RAG: recuperar fragmentos normativos relevantes ──────────────────
    let ragChunks = [];
    if (env.VECTORIZE && env.AI) {
      try {
        const embedding = await getQueryEmbedding(question.trim(), env);
        ragChunks       = await searchRelevantChunks(embedding, env);
        const ragCtx    = buildRagContext(ragChunks);
        if (ragCtx) {
          systemContent += ragCtx;
          console.log(`[RAG] ${ragChunks.length} fragmentos | módulo: ${moduloActivo}`);
        }
      } catch (ragErr) {
        console.warn('[RAG] Fallo, continuando sin RAG:', String(ragErr).slice(0, 80));
      }
    }

    // ── Construir mensajes en formato OpenAI ─────────────────────────────
    const messages = [{ role: 'system', content: systemContent }];
    if (Array.isArray(sessionHistory)) {
      for (const turn of sessionHistory.slice(-6)) {
        if (turn.role && turn.text) {
          messages.push({ role: turn.role === 'model' ? 'assistant' : 'user', content: turn.text });
        }
      }
    }
    messages.push({ role: 'user', content: question.trim() });

    // ── Determinar si usar Function Calling ─────────────────────────────
    // Solo si los secrets de Firebase están configurados.
    // Sin secrets → comportamiento igual que v4 (sin tools).
    const useTools = !!(env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY && clientUID);

    try {
      // ── LLAMADA 1: con o sin tools ───────────────────────────────────
      const firstBody = {
        model:       GROQ_MODEL,
        messages,
        temperature: 0.1,
        max_tokens:  1024,
      };
      if (useTools) {
        firstBody.tools       = TOOLS;
        firstBody.tool_choice = 'auto';  // el LLM decide si usar alguna herramienta
      }

      const firstRes = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(firstBody),
      });

      if (!firstRes.ok) {
        const errText = await firstRes.text();
        return new Response(
          JSON.stringify({ error: 'Error al consultar Groq', status: firstRes.status, detail: errText }),
          { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }

      const firstData   = await firstRes.json();
      const firstChoice = firstData?.choices?.[0];

      // ── LOOP DE HERRAMIENTAS ────────────────────────────────────────
      // Si el LLM pidió usar una herramienta, la ejecutamos y volvemos a llamar.
      // Limitamos a 1 ronda de tool calls para evitar loops infinitos.
      let finalText = null;
      const toolsUsed = [];
      let acciones   = [];  // se llena si el LLM llama sugerirAccion

      if (useTools && firstChoice?.finish_reason === 'tool_calls') {
          const toolCalls = firstChoice.message?.tool_calls || [];
        console.log(`[Tools] LLM solicitó ${toolCalls.length} herramienta(s): ${toolCalls.map(t => t.function?.name).join(', ')}`);

        // Agregar la respuesta del asistente (con las tool_calls) al historial
        messages.push(firstChoice.message);

        // Ejecutar cada herramienta y capturar sugerirAccion
        for (const tc of toolCalls) {
          const toolName = tc.function?.name || '';
          let toolArgs   = {};
          try { toolArgs = JSON.parse(tc.function?.arguments || '{}'); } catch {}

          if (toolName === 'sugerirAccion') {
            // Capturar la acción sin efecto secundario — se enviará al frontend
            if (toolArgs.texto && toolArgs.accion) {
              const ACCIONES_VALIDAS = ['navegar', 'crearCAPA', 'crearVencimiento', 'crearIndicador'];
              if (ACCIONES_VALIDAS.includes(toolArgs.accion)) {
                acciones.push({
                  texto:  String(toolArgs.texto).slice(0, 60),
                  accion: toolArgs.accion,
                  modulo: String(toolArgs.modulo || '').replace(/[^a-zA-Z0-9_-]/g, ''),
                });
              }
            }
            messages.push({ role: 'tool', tool_call_id: tc.id, content: 'Accion registrada. Se mostrara al usuario como boton.' });
          } else {
            // Herramienta de datos o de escritura — ejecutar con uid + nit + args
            const toolResult = await ejecutarTool(toolName, toolArgs, clientUID, ipsNit, env);
            toolsUsed.push(toolName);
            console.log(`[Tools] ${toolName} -> ${toolResult.slice(0, 80)}...`);
            messages.push({ role: 'tool', tool_call_id: tc.id, content: toolResult });
          }
        }

        // ── LLAMADA 2: el LLM genera la respuesta final con los datos ──
        const secondRes = await fetch(GROQ_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model:       GROQ_MODEL,
            messages,
            temperature: 0.1,
            max_tokens:  1024,
          }),
        });

        if (!secondRes.ok) {
          const errText = await secondRes.text();
          return new Response(
            JSON.stringify({ error: 'Error en llamada secundaria a Groq', status: secondRes.status, detail: errText }),
            { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
          );
        }

        const secondData = await secondRes.json();
        finalText = secondData?.choices?.[0]?.message?.content ?? null;

      } else {
        // El LLM respondió directamente sin herramientas
        finalText = firstChoice?.message?.content ?? null;
      }

      if (!finalText) {
        return new Response(JSON.stringify({ error: 'Respuesta vacía de Groq' }), {
          status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      // Devolver respuesta + fuentes RAG + herramientas usadas + acciones sugeridas
      const sources = ragChunks.map(c => ({ source: c.source, score: c.score }));
      return new Response(JSON.stringify({ answer: finalText, sources, toolsUsed, acciones }), {
        status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: 'Error interno del proxy', detail: String(err) }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  },
};

export async function scheduled(event, env, ctx) {
  console.log(`[NormaLis Cron] Heartbeat — ${new Date().toISOString()}`);
}
