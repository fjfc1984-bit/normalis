'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useProa } from '@/lib/useProa';
import {
  checklistParaNivel, NIVEL_COMPLEJIDAD_LABEL, FASES_PROA,
  SERVICIOS, ANTIMICROBIANOS_TRAZADORES, ANTIMICROBIANOS_CATALOGO, ANTIMICROBIANOS_RESTRINGIDOS, TIPOS_INTERVENCION,
  TIPO_RESISTENCIA_LABEL, SITIOS_INFECCION, DESENLACE_LABEL, ESTADO_AUTORIZACION_LABEL, ESTADO_ENVIO_LABEL,
  INTERVENCION_EMPTY_FORM, IAAS_EMPTY_FORM, AUTORIZACION_EMPTY_FORM,
  FRECUENCIA_DOSIS_LABEL, esPrescripcionProlongada,
  type NivelComplejidad, type Intervencion, type ConsumoAMR, type IAASResistente,
  type AutorizacionPrevia, type InformeAnualPROA, type FaseImplementacion, type TipoResistencia,
  type FrecuenciaDosis,
} from '@/lib/proaTypes';

type Tab = 'checklist' | 'fases' | 'intervenciones' | 'indicadores' | 'iaas' | 'autorizaciones' | 'reporte';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'checklist', label: '✓ Checklist' },
  { key: 'fases', label: '🚩 Fases' },
  { key: 'intervenciones', label: '📋 Intervenciones' },
  { key: 'indicadores', label: '📊 DDD / DOT' },
  { key: 'iaas', label: '🧬 IAAS resistentes' },
  { key: 'autorizaciones', label: '🔐 Autorización previa' },
  { key: 'reporte', label: '📄 Informes' },
];

export default function PROAPage() {
  const { nit, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('checklist');
  const p = useProa(nit);

  // ── Forms state (siempre inicializados con TODOS los campos definidos —
  // nunca `undefined`, porque Firestore rechaza escrituras con campos
  // undefined) ─────────────────────────────────────────────────
  const [showFormInt, setShowFormInt] = useState(false);
  const [formInt, setFormInt] = useState<Omit<Intervencion, 'id' | 'creadoEn'>>({
    ...INTERVENCION_EMPTY_FORM, fecha: new Date().toISOString().split('T')[0],
  });
  const [guardandoInt, setGuardandoInt] = useState(false);

  const [showFormDDD, setShowFormDDD] = useState(false);
  const [formDDD, setFormDDD] = useState<Partial<ConsumoAMR>>({
    periodo: new Date().toISOString().slice(0, 7), camas: 30,
  });
  const [guardandoDDD, setGuardandoDDD] = useState(false);

  const [showFormIAAS, setShowFormIAAS] = useState(false);
  const [formIAAS, setFormIAAS] = useState<Omit<IAASResistente, 'id' | 'creadoEn' | 'nit'>>({
    ...IAAS_EMPTY_FORM, fecha: new Date().toISOString().split('T')[0],
  });
  const [guardandoIAAS, setGuardandoIAAS] = useState(false);

  const [showFormAuth, setShowFormAuth] = useState(false);
  const [formAuth, setFormAuth] = useState<Omit<AutorizacionPrevia, 'id' | 'creadoEn' | 'nit'>>({
    ...AUTORIZACION_EMPTY_FORM, fecha: new Date().toISOString().split('T')[0],
  });
  const [guardandoAuth, setGuardandoAuth] = useState(false);

  const [guardandoChecklist, setGuardandoChecklist] = useState(false);

  const [fasesEstado, setFasesEstado] = useState<Record<FaseImplementacion, boolean>>({
    preimplementacion: false, evaluacion_inicial: false, ejecucion: false, evaluacion_ejecucion: false, planes_mejora: false,
  });

  const [anioInforme, setAnioInforme] = useState(new Date().getFullYear());
  const [formInforme, setFormInforme] = useState<Partial<InformeAnualPROA>>({
    fechaEnvioSecretaria: '', radicadoSecretaria: '', estadoEnvio: 'pendiente', observaciones: '',
  });
  const [guardandoInforme, setGuardandoInforme] = useState(false);

  // ── Scores ────────────────────────────────────────────────────
  const checklistNivel = checklistParaNivel(p.nivelComplejidad);
  const totalItems = checklistNivel.reduce((acc, c) => acc + c.items.length, 0);
  const checksSi = checklistNivel.reduce((acc, c) => acc + c.items.filter(it => p.checks[`${c.categoria}-${it.id}`]).length, 0);
  const scoreChecklist = totalItems ? Math.round((checksSi / totalItems) * 100) : 0;
  const scoreColor = scoreChecklist >= 80 ? '#34d399' : scoreChecklist >= 50 ? '#f59e0b' : '#f87171';

  const intAceptadas = p.intervenciones.filter(i => i.resultado === 'aceptada').length;
  const tasaAceptacion = p.intervenciones.length ? Math.round((intAceptadas / p.intervenciones.length) * 100) : 0;

  const informeAnioActual = p.informesAnuales.find(inf => inf.anio === anioInforme);

  if (authLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#00BCD4', borderTopColor: 'transparent' }} />
    </div>
  );

  const btnPrimary = { background: 'linear-gradient(135deg,#00897B,#00BCD4)' };
  const cardBox = { border: '1px solid #e2e8f0' } as const;
  const headerBox = { background: '#f8fafc', color: '#0f766e', borderBottom: '1px solid #e2e8f0' } as const;

  const guardarChecklistClick = async () => {
    if (guardandoChecklist) return;
    setGuardandoChecklist(true);
    try { await p.guardarChecklist(); } finally { setGuardandoChecklist(false); }
  };

  const guardarIntervencion = async () => {
    if (guardandoInt || !formInt.paciente.trim() || !formInt.antimicrobiano || !formInt.servicio) return;
    setGuardandoInt(true);
    try {
      await p.guardarIntervencion({ ...formInt, paciente: formInt.paciente.trim(), justificacion: formInt.justificacion.trim() });
      setShowFormInt(false);
      setFormInt({ ...INTERVENCION_EMPTY_FORM, fecha: new Date().toISOString().split('T')[0] });
    } finally { setGuardandoInt(false); }
  };

  const guardarConsumo = async () => {
    if (guardandoDDD || !formDDD.antimicrobiano || !formDDD.ddd) return;
    setGuardandoDDD(true);
    try {
      const amr = ANTIMICROBIANOS_TRAZADORES.find(a => a.nombre === formDDD.antimicrobiano);
      await p.guardarConsumo({
        antimicrobiano: formDDD.antimicrobiano!, grupo: amr?.grupo || '',
        ddd: formDDD.ddd!, dot: formDDD.dot ?? null, camas: formDDD.camas || 30, periodo: formDDD.periodo!,
      });
      setShowFormDDD(false);
      setFormDDD({ periodo: new Date().toISOString().slice(0, 7), camas: 30 });
    } finally { setGuardandoDDD(false); }
  };

  const guardarIAAS = async () => {
    if (guardandoIAAS || !formIAAS.microorganismo.trim() || !formIAAS.servicio || !formIAAS.sitioInfeccion) return;
    setGuardandoIAAS(true);
    try {
      await p.guardarIAAS({ ...formIAAS, microorganismo: formIAAS.microorganismo.trim() });
      setShowFormIAAS(false);
      setFormIAAS({ ...IAAS_EMPTY_FORM, fecha: new Date().toISOString().split('T')[0] });
    } finally { setGuardandoIAAS(false); }
  };

  const guardarAutorizacion = async () => {
    if (guardandoAuth || !formAuth.paciente.trim() || !formAuth.antibiotico || !formAuth.servicio) return;
    setGuardandoAuth(true);
    try {
      await p.guardarAutorizacion({ ...formAuth, paciente: formAuth.paciente.trim(), justificacionClinica: formAuth.justificacionClinica.trim() });
      setShowFormAuth(false);
      setFormAuth({ ...AUTORIZACION_EMPTY_FORM, fecha: new Date().toISOString().split('T')[0] });
    } finally { setGuardandoAuth(false); }
  };

  const guardarInformeAnual = async () => {
    if (guardandoInforme) return;
    setGuardandoInforme(true);
    try {
      await p.guardarInformeAnual({
        anio: anioInforme,
        fechaEnvioSecretaria: formInforme.fechaEnvioSecretaria || null,
        radicadoSecretaria: formInforme.radicadoSecretaria || '',
        estadoEnvio: formInforme.estadoEnvio || 'pendiente',
        observaciones: formInforme.observaciones || '',
      }, informeAnioActual?.id);
    } finally { setGuardandoInforme(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">💊</span>
            <h1 className="text-2xl font-black text-slate-900">PROA</h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4' }}>
              Plan Profesional+
            </span>
          </div>
          <p className="text-sm text-slate-500">Programa de Optimización del Uso de Antimicrobianos · <span className="font-semibold text-teal-700">Res. 2471/2022</span> · Plan RAM 2025–2030</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {[
            { val: `${scoreChecklist}%`, label: 'Madurez PROA', color: scoreColor },
            { val: `${p.intervenciones.length}`, label: 'Intervenciones', color: '#00BCD4' },
            { val: `${tasaAceptacion}%`, label: 'Tasa aceptación', color: '#a78bfa' },
            { val: `${p.iaasResistentes.length}`, label: 'IAAS resistentes', color: '#f87171' },
          ].map(k => (
            <div key={k.label} className="text-center px-4 py-2 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div className="text-xl font-black" style={{ color: k.color }}>{k.val}</div>
              <div className="text-[10px] text-slate-400">{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Nivel de complejidad */}
      <div className="mb-4 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap" style={{ background: '#f0fdfa', border: '1px solid #99f6e4' }}>
        <span className="text-xs font-bold uppercase tracking-wide text-teal-700">Nivel de complejidad de la IPS</span>
        <select value={p.nivelComplejidad} onChange={e => p.setNivelComplejidad(e.target.value as NivelComplejidad)}
                className="px-3 py-1.5 rounded-lg text-sm border border-teal-200 bg-white text-slate-700">
          {(Object.keys(NIVEL_COMPLEJIDAD_LABEL) as NivelComplejidad[]).map(n => (
            <option key={n} value={n}>{NIVEL_COMPLEJIDAD_LABEL[n]}</option>
          ))}
        </select>
        <span className="text-[11px] text-teal-700 opacity-80">El checklist se ajusta al equipo mínimo exigido por la Res. 2471/2022 (Art. 15) según el nivel seleccionado.</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl flex-wrap" style={{ background: '#f1f5f9' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
                  className="flex-1 min-w-[110px] py-2 px-3 rounded-lg text-xs font-semibold transition-all"
                  style={tab === t.key
                    ? { background: 'white', color: '#0f766e', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }
                    : { color: '#64748b' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Checklist ── */}
      {tab === 'checklist' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-black" style={{ color: scoreColor }}>{scoreChecklist}%</div>
              <div>
                <div className="text-sm font-semibold text-slate-700">Madurez del programa PROA</div>
                <div className="text-xs text-slate-400">{checksSi} de {totalItems} criterios cumplidos · {NIVEL_COMPLEJIDAD_LABEL[p.nivelComplejidad]}</div>
              </div>
            </div>
            <button onClick={guardarChecklistClick} disabled={guardandoChecklist}
                    className="text-white text-sm font-bold px-5 py-2 rounded-xl transition-all hover:scale-105 disabled:opacity-60"
                    style={btnPrimary}>
              {guardandoChecklist ? 'Guardando...' : p.checklistGuardado ? '✓ Guardado — Guardar cambios' : 'Guardar'}
            </button>
          </div>

          {checklistNivel.map((cat) => (
            <div key={cat.categoria} className="rounded-2xl overflow-hidden" style={cardBox}>
              <div className="px-5 py-3 font-bold text-sm" style={headerBox}>
                {cat.categoria}
                <span className="ml-2 text-xs font-normal text-slate-400">
                  ({cat.items.filter(it => p.checks[`${cat.categoria}-${it.id}`]).length}/{cat.items.length})
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {cat.items.map((item) => {
                  const key = `${cat.categoria}-${item.id}`;
                  const checked = !!p.checks[key];
                  return (
                    <label key={key} className="flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50 transition-colors">
                      <div onClick={() => p.toggleCheck(key)}
                           className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                           style={checked ? { background: 'linear-gradient(135deg,#00897B,#00BCD4)', border: 'none' } : { border: '2px solid #cbd5e1', background: 'white' }}>
                        {checked && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                      <span className={`text-sm leading-relaxed ${checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {item.texto}
                        {item.nivelMinimo !== 'I' && (
                          <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#ede9fe', color: '#7c3aed' }}>
                            desde Nivel {item.nivelMinimo}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <p className="text-[11px] text-slate-400 px-1">
            Diferenciación por nivel de complejidad basada en Res. 2471/2022, Art. 15 y Tabla 2. Si tiene dudas sobre la conformación exacta del equipo para su nivel, verifique con la Secretaría de Salud departamental/distrital.
          </p>
        </div>
      )}

      {/* ── TAB: Fases de implementación ── */}
      {tab === 'fases' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 mb-2">Fases de implementación del programa según el numeral 2.2 de la Res. 2471/2022 — vista de madurez complementaria al checklist de ítems.</p>
          {FASES_PROA.map((f, idx) => {
            const activo = fasesEstado[f.key];
            return (
              <div key={f.key} className="rounded-2xl px-5 py-4 flex items-start gap-4" style={cardBox}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                     style={activo ? { background: 'linear-gradient(135deg,#00897B,#00BCD4)', color: 'white' } : { background: '#f1f5f9', color: '#94a3b8' }}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-800">{f.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{f.desc}</div>
                </div>
                <button onClick={() => setFasesEstado(p2 => ({ ...p2, [f.key]: !p2[f.key] }))}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
                        style={activo ? { background: '#d1fae5', color: '#047857' } : { background: '#f1f5f9', color: '#64748b' }}>
                  {activo ? '✓ Completada' : 'Marcar completada'}
                </button>
              </div>
            );
          })}
          <p className="text-[11px] text-slate-400 px-1">Esta vista es local a la sesión — use el checklist de la primera pestaña para el registro que se guarda en Firestore.</p>
        </div>
      )}

      {/* ── TAB: Intervenciones ── */}
      {tab === 'intervenciones' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-slate-500">{p.intervenciones.length} intervenciones registradas · {tasaAceptacion}% aceptación</div>
            <button onClick={() => setShowFormInt(true)} className="text-white text-sm font-bold px-5 py-2 rounded-xl hover:scale-105 transition-all" style={btnPrimary}>
              + Nueva intervención
            </button>
          </div>

          {showFormInt && (
            <div className="rounded-2xl p-5 mb-4" style={{ background: '#f0fdfa', border: '1px solid #99f6e4' }}>
              <h3 className="font-bold text-teal-800 mb-4 text-sm">Registrar intervención PROA</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { k: 'fecha', l: 'Fecha', t: 'date' },
                  { k: 'paciente', l: 'Paciente / HC', t: 'text' },
                  { k: 'servicio', l: 'Servicio', t: 'select', opts: SERVICIOS },
                  { k: 'antimicrobiano', l: 'Antimicrobiano', t: 'select', opts: ANTIMICROBIANOS_CATALOGO.map(a => a.nombre) },
                  { k: 'tipo', l: 'Tipo de intervención', t: 'select', opts: TIPOS_INTERVENCION.map(t => t.key), labels: TIPOS_INTERVENCION.map(t => t.label) },
                  { k: 'resultado', l: 'Resultado', t: 'select', opts: ['aceptada', 'rechazada', 'pendiente'], labels: ['Aceptada', 'Rechazada', 'Pendiente'] },
                ].map(f => (
                  <div key={f.k}>
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">{f.l}</label>
                    {f.t === 'select' ? (
                      <select value={(formInt as unknown as Record<string, string>)[f.k] || ''}
                              onChange={e => setFormInt(p2 => ({ ...p2, [f.k]: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white text-slate-700">
                        <option value="">Seleccionar</option>
                        {f.opts!.map((o, i) => <option key={o} value={o}>{f.labels ? f.labels[i] : o}</option>)}
                      </select>
                    ) : (
                      <input type={f.t} value={(formInt as unknown as Record<string, string>)[f.k] || ''}
                             onChange={e => setFormInt(p2 => ({ ...p2, [f.k]: e.target.value }))}
                             className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white text-slate-700" />
                    )}
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">Momento de la dosis (frecuencia)</label>
                  <select value={formInt.frecuenciaDosis}
                          onChange={e => setFormInt(p2 => ({ ...p2, frecuenciaDosis: e.target.value as FrecuenciaDosis }))}
                          className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white text-slate-700">
                    {(Object.keys(FRECUENCIA_DOSIS_LABEL) as FrecuenciaDosis[]).map(k => (
                      <option key={k} value={k}>{FRECUENCIA_DOSIS_LABEL[k]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">Duración del tratamiento (días)</label>
                  <input type="number" min={0} step={1} value={formInt.duracionDiasTratamiento ?? ''}
                         onChange={e => {
                           const raw = e.target.value;
                           if (raw === '') { setFormInt(p2 => ({ ...p2, duracionDiasTratamiento: null })); return; }
                           const n = Number(raw);
                           if (!Number.isFinite(n) || n < 0) return; // ignora entradas inválidas (ej. "-", NaN)
                           setFormInt(p2 => ({ ...p2, duracionDiasTratamiento: n }));
                         }}
                         className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white text-slate-700" />
                  {esPrescripcionProlongada(formInt.antimicrobiano, formInt.duracionDiasTratamiento) && (
                    <p className="text-[10px] font-bold text-amber-600 mt-1">⚠ Prescripción prolongada — sugerir revisión del equipo PROA (umbral administrativo, no clínico).</p>
                  )}
                </div>
                <div className="col-span-2 md:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">Justificación / Recomendación</label>
                  <textarea value={formInt.justificacion || ''} onChange={e => setFormInt(p2 => ({ ...p2, justificacion: e.target.value }))}
                            rows={2} className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white text-slate-700 resize-none" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={guardarIntervencion} disabled={guardandoInt} className="text-white text-sm font-bold px-5 py-2 rounded-xl disabled:opacity-60" style={btnPrimary}>{guardandoInt ? 'Guardando...' : 'Guardar'}</button>
                <button onClick={() => setShowFormInt(false)} className="text-slate-500 text-sm px-4 py-2 rounded-xl hover:bg-white">Cancelar</button>
              </div>
            </div>
          )}

          {p.intervenciones.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ border: '2px dashed #e2e8f0' }}>
              <div className="text-4xl mb-3">💊</div>
              <p className="text-slate-500 text-sm">No hay intervenciones registradas aún.</p>
              <p className="text-slate-400 text-xs mt-1">Registre la primera intervención del equipo PROA.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={cardBox}>
              <div className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-wide px-4 py-2" style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <span className="col-span-1">Fecha</span>
                <span className="col-span-2">Paciente</span>
                <span className="col-span-2">Servicio</span>
                <span className="col-span-2">Antimicrobiano</span>
                <span className="col-span-2">Tipo</span>
                <span className="col-span-2">Resultado</span>
                <span className="col-span-1">Alerta</span>
              </div>
              {p.intervenciones.map((inv, i) => {
                const tipo = TIPOS_INTERVENCION.find(t => t.key === inv.tipo);
                const resColor = inv.resultado === 'aceptada' ? '#34d399' : inv.resultado === 'rechazada' ? '#f87171' : '#f59e0b';
                const prolongada = esPrescripcionProlongada(inv.antimicrobiano, inv.duracionDiasTratamiento);
                return (
                  <div key={inv.id || i} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-slate-50 transition-colors"
                       style={{ borderBottom: i < p.intervenciones.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <span className="col-span-1 text-xs text-slate-500">{inv.fecha}</span>
                    <span className="col-span-2 text-xs font-semibold text-slate-700 truncate">{inv.paciente}</span>
                    <span className="col-span-2 text-xs text-slate-500 truncate">{inv.servicio}</span>
                    <span className="col-span-2 text-xs text-slate-700 truncate">
                      {inv.antimicrobiano}
                      {(inv.frecuenciaDosis || inv.duracionDiasTratamiento) && (
                        <span className="block text-[10px] text-slate-400">
                          {inv.frecuenciaDosis ? FRECUENCIA_DOSIS_LABEL[inv.frecuenciaDosis] : ''}
                          {inv.duracionDiasTratamiento ? ` · ${inv.duracionDiasTratamiento}d` : ''}
                        </span>
                      )}
                    </span>
                    <span className="col-span-2 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${tipo?.color}20`, color: tipo?.color }}>{tipo?.label}</span>
                    <span className="col-span-2 text-xs px-2 py-0.5 rounded-full font-bold capitalize" style={{ background: `${resColor}15`, color: resColor }}>{inv.resultado}</span>
                    <span className="col-span-1 text-xs">
                      {prolongada && (
                        <span title="Prescripción prolongada — revisar (umbral administrativo PROA, no clínico)" className="px-2 py-0.5 rounded-full font-bold" style={{ background: '#fef3c7', color: '#b45309' }}>⚠</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Indicadores DDD / DOT ── */}
      {tab === 'indicadores' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">Consumo de antimicrobianos — DDD y DOT</p>
              <p className="text-xs text-slate-400">DDD/100 camas-día (Dosis Diaria Definida) y DOT (Días de Terapia) · num. 2.2.3 Res. 2471/2022</p>
            </div>
            <button onClick={() => setShowFormDDD(true)} className="text-white text-sm font-bold px-5 py-2 rounded-xl hover:scale-105 transition-all" style={btnPrimary}>
              + Registrar consumo
            </button>
          </div>

          {showFormDDD && (
            <div className="rounded-2xl p-5 mb-4" style={{ background: '#f0fdfa', border: '1px solid #99f6e4' }}>
              <h3 className="font-bold text-teal-800 mb-4 text-sm">Registrar consumo mensual</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">Período</label>
                  <input type="month" value={formDDD.periodo || ''} onChange={e => setFormDDD(p2 => ({ ...p2, periodo: e.target.value }))}
                         className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">Antimicrobiano</label>
                  <select value={formDDD.antimicrobiano || ''} onChange={e => setFormDDD(p2 => ({ ...p2, antimicrobiano: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white">
                    <option value="">Seleccionar</option>
                    {ANTIMICROBIANOS_TRAZADORES.map(a => <option key={a.nombre} value={a.nombre}>{a.nombre} {a.watch ? '⚠️' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">DDD consumidas</label>
                  <input type="number" value={formDDD.ddd ?? ''} onChange={e => setFormDDD(p2 => ({ ...p2, ddd: Number(e.target.value) }))}
                         className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white" placeholder="0.00" step="0.01" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">DOT (días de terapia)</label>
                  <input type="number" value={formDDD.dot ?? ''} onChange={e => setFormDDD(p2 => ({ ...p2, dot: e.target.value === '' ? null : Number(e.target.value) }))}
                         className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white" placeholder="Opcional" step="1" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">N° camas-día</label>
                  <input type="number" value={formDDD.camas ?? ''} onChange={e => setFormDDD(p2 => ({ ...p2, camas: Number(e.target.value) }))}
                         className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white" placeholder="30" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={guardarConsumo} disabled={guardandoDDD} className="text-white text-sm font-bold px-5 py-2 rounded-xl disabled:opacity-60" style={btnPrimary}>{guardandoDDD ? 'Guardando...' : 'Guardar'}</button>
                <button onClick={() => setShowFormDDD(false)} className="text-slate-500 text-sm px-4 py-2 rounded-xl hover:bg-slate-100">Cancelar</button>
              </div>
            </div>
          )}

          <div className="rounded-2xl overflow-hidden mb-4" style={cardBox}>
            <div className="px-5 py-3 font-bold text-sm" style={headerBox}>Antimicrobianos trazadores PROA</div>
            <div className="divide-y divide-slate-100">
              {ANTIMICROBIANOS_TRAZADORES.map(amr => {
                const registros = p.consumos.filter(c => c.antimicrobiano === amr.nombre);
                const ultimo = registros[0];
                const ddd100 = ultimo ? ((ultimo.ddd / ultimo.camas) * 100).toFixed(1) : '—';
                const dot100 = ultimo && ultimo.dot != null ? ((ultimo.dot / ultimo.camas) * 100).toFixed(1) : '—';
                return (
                  <div key={amr.nombre} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{amr.nombre}</span>
                        {amr.watch && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#fef3c7', color: '#92400e' }}>⚠️ Vigilancia especial</span>}
                        {amr.restringido && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#fee2e2', color: '#b91c1c' }}>🔐 Restringido</span>}
                      </div>
                      <div className="text-xs text-slate-400">{amr.grupo}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black" style={{ color: amr.watch && ddd100 !== '—' && Number(ddd100) > 5 ? '#f87171' : '#26A69A' }}>{ddd100}</div>
                      <div className="text-[10px] text-slate-400">DDD/100 camas-día</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-slate-500">{dot100}</div>
                      <div className="text-[10px] text-slate-400">DOT/100 camas-día</div>
                    </div>
                    <div className="text-xs text-slate-400 w-20 text-right">{ultimo?.periodo || 'Sin datos'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: IAAS resistentes ── */}
      {tab === 'iaas' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">IAAS por microorganismos resistentes</p>
              <p className="text-xs text-slate-400">Infecciones asociadas a la atención en salud causadas por gérmenes resistentes · art. 20.6 Res. 2471/2022</p>
            </div>
            <button onClick={() => setShowFormIAAS(true)} className="text-white text-sm font-bold px-5 py-2 rounded-xl hover:scale-105 transition-all" style={btnPrimary}>
              + Registrar caso
            </button>
          </div>

          {showFormIAAS && (
            <div className="rounded-2xl p-5 mb-4" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
              <h3 className="font-bold text-red-800 mb-4 text-sm">Registrar IAAS por microorganismo resistente</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-red-700 mb-1">Fecha</label>
                  <input type="date" value={formIAAS.fecha || ''} onChange={e => setFormIAAS(p2 => ({ ...p2, fecha: e.target.value }))}
                         className="w-full px-3 py-2 rounded-lg text-sm border border-red-200 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-red-700 mb-1">Servicio</label>
                  <select value={formIAAS.servicio || ''} onChange={e => setFormIAAS(p2 => ({ ...p2, servicio: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg text-sm border border-red-200 bg-white">
                    <option value="">Seleccionar</option>
                    {SERVICIOS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-red-700 mb-1">Microorganismo</label>
                  <input type="text" value={formIAAS.microorganismo || ''} onChange={e => setFormIAAS(p2 => ({ ...p2, microorganismo: e.target.value }))}
                         placeholder="Ej. Klebsiella pneumoniae" className="w-full px-3 py-2 rounded-lg text-sm border border-red-200 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-red-700 mb-1">Mecanismo de resistencia</label>
                  <select value={formIAAS.tipoResistencia || 'BLEE'} onChange={e => setFormIAAS(p2 => ({ ...p2, tipoResistencia: e.target.value as TipoResistencia }))}
                          className="w-full px-3 py-2 rounded-lg text-sm border border-red-200 bg-white">
                    {(Object.keys(TIPO_RESISTENCIA_LABEL) as TipoResistencia[]).map(k => <option key={k} value={k}>{TIPO_RESISTENCIA_LABEL[k]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-red-700 mb-1">Sitio de infección</label>
                  <select value={formIAAS.sitioInfeccion || ''} onChange={e => setFormIAAS(p2 => ({ ...p2, sitioInfeccion: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg text-sm border border-red-200 bg-white">
                    <option value="">Seleccionar</option>
                    {SITIOS_INFECCION.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-red-700 mb-1">Desenlace</label>
                  <select value={formIAAS.desenlace || 'en_tratamiento'} onChange={e => setFormIAAS(p2 => ({ ...p2, desenlace: e.target.value as IAASResistente['desenlace'] }))}
                          className="w-full px-3 py-2 rounded-lg text-sm border border-red-200 bg-white">
                    {(Object.keys(DESENLACE_LABEL) as IAASResistente['desenlace'][]).map(k => <option key={k} value={k}>{DESENLACE_LABEL[k]}</option>)}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-3 flex items-center gap-2">
                  <input type="checkbox" checked={!!formIAAS.notificadoEpidemiologia}
                         onChange={e => setFormIAAS(p2 => ({ ...p2, notificadoEpidemiologia: e.target.checked }))} className="w-4 h-4" />
                  <label className="text-xs text-red-700">Notificado al comité de infecciones / epidemiología</label>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={guardarIAAS} disabled={guardandoIAAS} className="text-white text-sm font-bold px-5 py-2 rounded-xl disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#dc2626,#f87171)' }}>{guardandoIAAS ? 'Guardando...' : 'Guardar'}</button>
                <button onClick={() => setShowFormIAAS(false)} className="text-slate-500 text-sm px-4 py-2 rounded-xl hover:bg-white">Cancelar</button>
              </div>
            </div>
          )}

          {p.iaasResistentes.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ border: '2px dashed #e2e8f0' }}>
              <div className="text-4xl mb-3">🧬</div>
              <p className="text-slate-500 text-sm">No hay casos de IAAS por microorganismos resistentes registrados.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={cardBox}>
              <div className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-wide px-4 py-2" style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <span className="col-span-1">Fecha</span>
                <span className="col-span-2">Servicio</span>
                <span className="col-span-2">Microorganismo</span>
                <span className="col-span-2">Resistencia</span>
                <span className="col-span-2">Sitio</span>
                <span className="col-span-2">Desenlace</span>
                <span className="col-span-1">Notif.</span>
              </div>
              {p.iaasResistentes.map((c, i) => (
                <div key={c.id || i} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-slate-50 transition-colors"
                     style={{ borderBottom: i < p.iaasResistentes.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <span className="col-span-1 text-xs text-slate-500">{c.fecha}</span>
                  <span className="col-span-2 text-xs text-slate-500 truncate">{c.servicio}</span>
                  <span className="col-span-2 text-xs font-semibold text-slate-700 truncate">{c.microorganismo}</span>
                  <span className="col-span-2 text-xs px-2 py-0.5 rounded-full font-medium w-fit" style={{ background: '#fee2e2', color: '#b91c1c' }}>{TIPO_RESISTENCIA_LABEL[c.tipoResistencia]}</span>
                  <span className="col-span-2 text-xs text-slate-500 truncate">{c.sitioInfeccion}</span>
                  <span className="col-span-2 text-xs text-slate-600">{DESENLACE_LABEL[c.desenlace]}</span>
                  <span className="col-span-1 text-xs">{c.notificadoEpidemiologia ? '✓' : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Autorización previa ── */}
      {tab === 'autorizaciones' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">Registro de autorización previa — antibióticos restringidos</p>
              <p className="text-xs text-slate-400">Carbapenémicos y colistina (art. 2.3 Res. 2471/2022) · evidencia operativa exigida en auditoría territorial</p>
            </div>
            <button onClick={() => setShowFormAuth(true)} className="text-white text-sm font-bold px-5 py-2 rounded-xl hover:scale-105 transition-all" style={btnPrimary}>
              + Nueva solicitud
            </button>
          </div>

          {showFormAuth && (
            <div className="rounded-2xl p-5 mb-4" style={{ background: '#f0fdfa', border: '1px solid #99f6e4' }}>
              <h3 className="font-bold text-teal-800 mb-4 text-sm">Solicitud de autorización previa</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">Fecha</label>
                  <input type="date" value={formAuth.fecha || ''} onChange={e => setFormAuth(p2 => ({ ...p2, fecha: e.target.value }))}
                         className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">Paciente / HC</label>
                  <input type="text" value={formAuth.paciente || ''} onChange={e => setFormAuth(p2 => ({ ...p2, paciente: e.target.value }))}
                         className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">Servicio</label>
                  <select value={formAuth.servicio || ''} onChange={e => setFormAuth(p2 => ({ ...p2, servicio: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white">
                    <option value="">Seleccionar</option>
                    {SERVICIOS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">Antibiótico restringido</label>
                  <select value={formAuth.antibiotico || ''} onChange={e => setFormAuth(p2 => ({ ...p2, antibiotico: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white">
                    <option value="">Seleccionar</option>
                    {ANTIMICROBIANOS_RESTRINGIDOS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">Médico solicitante</label>
                  <input type="text" value={formAuth.medicoSolicitante || ''} onChange={e => setFormAuth(p2 => ({ ...p2, medicoSolicitante: e.target.value }))}
                         className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">Autorizado por (líder PROA/infectólogo)</label>
                  <input type="text" value={formAuth.autorizadoPor || ''} onChange={e => setFormAuth(p2 => ({ ...p2, autorizadoPor: e.target.value }))}
                         className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">Estado</label>
                  <select value={formAuth.estado || 'pendiente'} onChange={e => setFormAuth(p2 => ({ ...p2, estado: e.target.value as AutorizacionPrevia['estado'] }))}
                          className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white">
                    {(Object.keys(ESTADO_AUTORIZACION_LABEL) as AutorizacionPrevia['estado'][]).map(k => <option key={k} value={k}>{ESTADO_AUTORIZACION_LABEL[k]}</option>)}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">Justificación clínica</label>
                  <textarea value={formAuth.justificacionClinica || ''} onChange={e => setFormAuth(p2 => ({ ...p2, justificacionClinica: e.target.value }))}
                            rows={2} className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white resize-none" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={guardarAutorizacion} disabled={guardandoAuth} className="text-white text-sm font-bold px-5 py-2 rounded-xl disabled:opacity-60" style={btnPrimary}>{guardandoAuth ? 'Guardando...' : 'Guardar'}</button>
                <button onClick={() => setShowFormAuth(false)} className="text-slate-500 text-sm px-4 py-2 rounded-xl hover:bg-white">Cancelar</button>
              </div>
            </div>
          )}

          {p.autorizaciones.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ border: '2px dashed #e2e8f0' }}>
              <div className="text-4xl mb-3">🔐</div>
              <p className="text-slate-500 text-sm">No hay solicitudes de autorización previa registradas.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={cardBox}>
              <div className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-wide px-4 py-2" style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <span className="col-span-1">Fecha</span>
                <span className="col-span-2">Paciente</span>
                <span className="col-span-2">Antibiótico</span>
                <span className="col-span-2">Solicitante</span>
                <span className="col-span-2">Autoriza</span>
                <span className="col-span-3">Estado</span>
              </div>
              {p.autorizaciones.map((a, i) => {
                const color = a.estado === 'autorizado' ? '#34d399' : a.estado === 'negado' ? '#f87171' : '#f59e0b';
                return (
                  <div key={a.id || i} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-slate-50 transition-colors"
                       style={{ borderBottom: i < p.autorizaciones.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <span className="col-span-1 text-xs text-slate-500">{a.fecha}</span>
                    <span className="col-span-2 text-xs font-semibold text-slate-700 truncate">{a.paciente}</span>
                    <span className="col-span-2 text-xs text-slate-700 truncate">{a.antibiotico}</span>
                    <span className="col-span-2 text-xs text-slate-500 truncate">{a.medicoSolicitante}</span>
                    <span className="col-span-2 text-xs text-slate-500 truncate">{a.autorizadoPor}</span>
                    <span className="col-span-3 flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `${color}15`, color }}>{ESTADO_AUTORIZACION_LABEL[a.estado]}</span>
                      {a.estado === 'pendiente' && a.id && (
                        <span className="flex gap-1">
                          <button onClick={() => p.actualizarAutorizacion(a.id!, 'autorizado')} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#d1fae5', color: '#047857' }}>Autorizar</button>
                          <button onClick={() => p.actualizarAutorizacion(a.id!, 'negado')} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#fee2e2', color: '#b91c1c' }}>Negar</button>
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Informes ── */}
      {tab === 'reporte' && (
        <div className="space-y-4">
          <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg,#0a2540,#134e4a)', color: 'white' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-black mb-1">Informe PROA</h2>
                <p className="text-sm opacity-60">{new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</p>
              </div>
              <button onClick={() => window.print()} className="text-teal-900 text-sm font-bold px-4 py-2 rounded-xl" style={{ background: '#34d399' }}>🖨️ Imprimir</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Madurez PROA', value: `${scoreChecklist}%`, sub: `${checksSi}/${totalItems} criterios` },
                { label: 'Intervenciones', value: p.intervenciones.length, sub: `${tasaAceptacion}% aceptación` },
                { label: 'AMR vigilados', value: p.consumos.length, sub: 'registros DDD/DOT' },
                { label: 'IAAS resistentes', value: p.iaasResistentes.length, sub: 'casos registrados' },
              ].map(k => (
                <div key={k.label} className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,.08)' }}>
                  <div className="text-2xl font-black text-teal-300">{k.value}</div>
                  <div className="text-xs font-semibold opacity-90 mt-0.5">{k.label}</div>
                  <div className="text-[10px] opacity-50">{k.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Informe anual — reporte territorial */}
          <div className="rounded-2xl overflow-hidden" style={cardBox}>
            <div className="px-5 py-3 font-bold text-sm flex items-center justify-between" style={headerBox}>
              <span>Informe anual — envío a la Secretaría de Salud territorial</span>
              <select value={anioInforme} onChange={e => {
                        const anio = Number(e.target.value);
                        setAnioInforme(anio);
                        const existente = p.informesAnuales.find(inf => inf.anio === anio);
                        setFormInforme(existente ? { ...existente } : { fechaEnvioSecretaria: '', radicadoSecretaria: '', estadoEnvio: 'pendiente', observaciones: '' });
                      }}
                      className="px-2 py-1 rounded-lg text-xs border border-teal-200 bg-white text-slate-700">
                {[0, 1, 2].map(off => {
                  const y = new Date().getFullYear() - off;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Estado de envío</label>
                <select value={formInforme.estadoEnvio || 'pendiente'} onChange={e => setFormInforme(p2 => ({ ...p2, estadoEnvio: e.target.value as InformeAnualPROA['estadoEnvio'] }))}
                        className="w-full px-3 py-2 rounded-lg text-sm border border-slate-200 bg-white">
                  {(Object.keys(ESTADO_ENVIO_LABEL) as InformeAnualPROA['estadoEnvio'][]).map(k => <option key={k} value={k}>{ESTADO_ENVIO_LABEL[k]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Fecha de envío</label>
                <input type="date" value={formInforme.fechaEnvioSecretaria || ''} onChange={e => setFormInforme(p2 => ({ ...p2, fechaEnvioSecretaria: e.target.value }))}
                       className="w-full px-3 py-2 rounded-lg text-sm border border-slate-200 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Radicado Secretaría</label>
                <input type="text" value={formInforme.radicadoSecretaria || ''} onChange={e => setFormInforme(p2 => ({ ...p2, radicadoSecretaria: e.target.value }))}
                       className="w-full px-3 py-2 rounded-lg text-sm border border-slate-200 bg-white" />
              </div>
              <div className="flex items-end">
                <button onClick={guardarInformeAnual} disabled={guardandoInforme} className="w-full text-white text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-60" style={btnPrimary}>
                  {guardandoInforme ? 'Guardando...' : informeAnioActual ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
              <div className="col-span-2 md:col-span-4">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Observaciones</label>
                <textarea value={formInforme.observaciones || ''} onChange={e => setFormInforme(p2 => ({ ...p2, observaciones: e.target.value }))}
                          rows={2} className="w-full px-3 py-2 rounded-lg text-sm border border-slate-200 bg-white resize-none" />
              </div>
            </div>
            <p className="px-5 pb-4 text-[11px] text-slate-400">
              Art. 20.6 Res. 2471/2022: el informe anual debe socializarse institucional y territorialmente. Art. 12.5: las Secretarías consolidan los reportes de las IPS hacia el Ministerio.
            </p>
          </div>

          {/* Resumen por categoría */}
          <div className="rounded-2xl overflow-hidden" style={cardBox}>
            <div className="px-5 py-3 font-bold text-sm" style={headerBox}>Cumplimiento por categoría ({NIVEL_COMPLEJIDAD_LABEL[p.nivelComplejidad]})</div>
            {checklistNivel.map(cat => {
              const total = cat.items.length;
              const cumplidos = cat.items.filter(it => p.checks[`${cat.categoria}-${it.id}`]).length;
              const pct = total ? Math.round((cumplidos / total) * 100) : 0;
              const color = pct >= 80 ? '#34d399' : pct >= 50 ? '#f59e0b' : '#f87171';
              return (
                <div key={cat.categoria} className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-700">{cat.categoria}</div>
                    <div className="w-full h-1.5 rounded-full mt-1" style={{ background: '#e2e8f0' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                  <div className="font-black text-sm w-12 text-right" style={{ color }}>{pct}%</div>
                  <div className="text-xs text-slate-400 w-16 text-right">{cumplidos}/{total}</div>
                </div>
              );
            })}
          </div>

          {/* Intervenciones del mes */}
          {p.intervenciones.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={cardBox}>
              <div className="px-5 py-3 font-bold text-sm" style={headerBox}>Resumen de intervenciones</div>
              <div className="p-5 grid grid-cols-3 gap-3">
                {TIPOS_INTERVENCION.map(tipo => {
                  const count = p.intervenciones.filter(i => i.tipo === tipo.key).length;
                  return (
                    <div key={tipo.key} className="text-center p-3 rounded-xl" style={{ background: `${tipo.color}10`, border: `1px solid ${tipo.color}30` }}>
                      <div className="text-xl font-black" style={{ color: tipo.color }}>{count}</div>
                      <div className="text-xs font-semibold mt-0.5" style={{ color: tipo.color }}>{tipo.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-xs text-slate-400 text-center py-2">
            Generado por NormaLis · PROA · Res. 2471/2022 · Plan RAM 2025–2030 · Res. 1732/2026 — {new Date().toLocaleDateString('es-CO')}
          </div>
        </div>
      )}
    </div>
  );
}
