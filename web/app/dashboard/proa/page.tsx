'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Intervencion {
  id?: string;
  fecha: string;
  paciente: string;
  servicio: string;
  antimicrobiano: string;
  tipo: 'suspension' | 'desescalada' | 'ajuste_dosis' | 'cambio_via' | 'inicio_dirigido';
  justificacion: string;
  resultado: 'aceptada' | 'rechazada' | 'pendiente';
  creadoEn?: Timestamp;
}

interface ConsumoAMR {
  antimicrobiano: string;
  grupo: string;
  ddd: number;     // Dosis Diaria Definida
  camas: number;
  periodo: string; // YYYY-MM
}

// ── Datos de referencia ───────────────────────────────────────────────────────
const SERVICIOS = ['UCI Adultos','UCI Pediátrica','Medicina Interna','Cirugía','Urgencias','Pediatría','Ginecología','Oncología','Neonatología'];

const ANTIMICROBIANOS_TRAZADORES = [
  { nombre: 'Meropenem', grupo: 'Carbapenémicos', watch: true },
  { nombre: 'Imipenem', grupo: 'Carbapenémicos', watch: true },
  { nombre: 'Vancomicina', grupo: 'Glicopéptidos', watch: true },
  { nombre: 'Piperacilina/Tazobactam', grupo: 'Penicilinas + IBL', watch: false },
  { nombre: 'Cefepime', grupo: 'Cefalosporinas 4G', watch: false },
  { nombre: 'Ceftriaxona', grupo: 'Cefalosporinas 3G', watch: false },
  { nombre: 'Ciprofloxacino', grupo: 'Quinolonas', watch: true },
  { nombre: 'Colistina', grupo: 'Polimixinas', watch: true },
  { nombre: 'Linezolid', grupo: 'Oxazolidinonas', watch: true },
  { nombre: 'Fluconazol', grupo: 'Azoles', watch: false },
];

const TIPOS_INTERVENCION = [
  { key: 'suspension',      label: 'Suspensión', color: '#f87171' },
  { key: 'desescalada',     label: 'Desescalada', color: '#34d399' },
  { key: 'ajuste_dosis',    label: 'Ajuste de dosis', color: '#60a5fa' },
  { key: 'cambio_via',      label: 'Cambio de vía', color: '#a78bfa' },
  { key: 'inicio_dirigido', label: 'Inicio dirigido', color: '#f59e0b' },
];

// ── Checklist PROA ────────────────────────────────────────────────────────────
const CHECKLIST_PROA = [
  {
    categoria: 'Estructura del Equipo PROA',
    items: [
      'Existe un médico infectólogo o médico líder PROA designado formalmente',
      'Existe un farmacéutico clínico vinculado al equipo PROA',
      'El equipo tiene reuniones periódicas documentadas (mínimo mensual)',
      'El equipo PROA cuenta con apoyo de microbiología clínica',
    ],
  },
  {
    categoria: 'Políticas y Procedimientos',
    items: [
      'Existe una lista institucional de antimicrobianos de acceso restringido',
      'Existe una política de autorización previa para carbapenémicos y colistina',
      'Existe una guía de terapia antibiótica empírica institucional actualizada (≤3 años)',
      'Existe un procedimiento de desescalada y suspensión de antimicrobianos',
      'Se han socializado las guías con los servicios prescriptores',
    ],
  },
  {
    categoria: 'Indicadores y Vigilancia',
    items: [
      'Se monitorea el consumo de antimicrobianos en DDD/100 camas-día',
      'Se generan informes de consumo mensuales por servicio',
      'Se realiza seguimiento a los perfiles de sensibilidad (antibiograma acumulado)',
      'Se miden tasas de infecciones asociadas al cuidado de la salud (IACS)',
      'Se reportan los indicadores al comité de infecciones y a gerencia',
    ],
  },
  {
    categoria: 'Educación y Cultura',
    items: [
      'Se realizan capacitaciones al personal prescriptor (mínimo 1 al año)',
      'Existe retroalimentación a los prescriptores sobre sus patrones de uso',
      'Se promueve la toma de cultivos antes de iniciar antimicrobiano empírico',
    ],
  },
  {
    categoria: 'Registro e Historia Clínica',
    items: [
      'Se documenta la indicación del antimicrobiano en la historia clínica',
      'Se documenta la duración planificada del tratamiento',
      'Se realizan notas de revisión a las 48-72h del inicio del antimicrobiano',
      'Se registran las intervenciones del equipo PROA con respuesta del prescriptor',
    ],
  },
];

// ── Componente principal ──────────────────────────────────────────────────────
export default function PROAPage() {
  const { nit, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<'checklist' | 'intervenciones' | 'indicadores' | 'reporte'>('checklist');

  // Checklist state
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [guardandoChecklist, setGuardandoChecklist] = useState(false);
  const [checklistGuardado, setChecklistGuardado] = useState(false);

  // Intervenciones
  const [intervenciones, setIntervenciones] = useState<Intervencion[]>([]);
  const [showFormInt, setShowFormInt] = useState(false);
  const [formInt, setFormInt] = useState<Partial<Intervencion>>({
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'desescalada',
    resultado: 'pendiente',
  });
  const [guardandoInt, setGuardandoInt] = useState(false);

  // Indicadores DDD
  const [consumos, setConsumos] = useState<ConsumoAMR[]>([]);
  const [showFormDDD, setShowFormDDD] = useState(false);
  const [formDDD, setFormDDD] = useState<Partial<ConsumoAMR>>({
    periodo: new Date().toISOString().slice(0, 7),
    camas: 30,
  });
  const [guardandoDDD, setGuardandoDDD] = useState(false);

  // Cargar datos
  const cargarDatos = useCallback(async () => {
    if (!nit) return;
    try {
      // Intervenciones
      const qInt = query(
        collection(db, 'proa_intervenciones'),
        where('nit', '==', nit),
        orderBy('creadoEn', 'desc')
      );
      const snapInt = await getDocs(qInt);
      setIntervenciones(snapInt.docs.map(d => ({ id: d.id, ...d.data() } as Intervencion)));

      // Consumos DDD
      const qDDD = query(
        collection(db, 'proa_consumos'),
        where('nit', '==', nit),
        orderBy('periodo', 'desc')
      );
      const snapDDD = await getDocs(qDDD);
      setConsumos(snapDDD.docs.map(d => d.data() as ConsumoAMR));

      // Checklist guardado
      const qCheck = query(collection(db, 'proa_checklist'), where('nit', '==', nit));
      const snapCheck = await getDocs(qCheck);
      if (!snapCheck.empty) {
        setChecks(snapCheck.docs[0].data().checks || {});
        setChecklistGuardado(true);
      }
    } catch { /* offline ok */ }
  }, [nit]);

  useEffect(() => { if (!authLoading && nit) cargarDatos(); }, [authLoading, nit, cargarDatos]);

  const toggleCheck = (key: string) => setChecks(p => ({ ...p, [key]: !p[key] }));

  const guardarChecklist = async () => {
    if (!nit) return;
    setGuardandoChecklist(true);
    try {
      const q = query(collection(db, 'proa_checklist'), where('nit', '==', nit));
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(collection(db, 'proa_checklist'), { nit, checks, actualizadoEn: serverTimestamp() });
      } else {
        const { updateDoc } = await import('firebase/firestore');
        await updateDoc(snap.docs[0].ref, { checks, actualizadoEn: serverTimestamp() });
      }
      setChecklistGuardado(true);
    } catch { }
    setGuardandoChecklist(false);
  };

  const guardarIntervencion = async () => {
    if (!nit || !formInt.paciente || !formInt.antimicrobiano) return;
    setGuardandoInt(true);
    try {
      await addDoc(collection(db, 'proa_intervenciones'), {
        ...formInt, nit, creadoEn: serverTimestamp(),
      });
      setShowFormInt(false);
      setFormInt({ fecha: new Date().toISOString().split('T')[0], tipo: 'desescalada', resultado: 'pendiente' });
      cargarDatos();
    } catch { }
    setGuardandoInt(false);
  };

  const guardarConsumo = async () => {
    if (!nit || !formDDD.antimicrobiano || !formDDD.ddd) return;
    setGuardandoDDD(true);
    try {
      const amr = ANTIMICROBIANOS_TRAZADORES.find(a => a.nombre === formDDD.antimicrobiano);
      await addDoc(collection(db, 'proa_consumos'), {
        ...formDDD,
        grupo: amr?.grupo || '',
        nit,
        creadoEn: serverTimestamp(),
      });
      setShowFormDDD(false);
      setFormDDD({ periodo: new Date().toISOString().slice(0, 7), camas: 30 });
      cargarDatos();
    } catch { }
    setGuardandoDDD(false);
  };

  // ── Score checklist
  const totalItems = CHECKLIST_PROA.reduce((acc, c) => acc + c.items.length, 0);
  const checksSi = Object.values(checks).filter(Boolean).length;
  const scoreChecklist = totalItems ? Math.round((checksSi / totalItems) * 100) : 0;
  const scoreColor = scoreChecklist >= 80 ? '#34d399' : scoreChecklist >= 50 ? '#f59e0b' : '#f87171';

  // ── Score intervenciones
  const intAceptadas = intervenciones.filter(i => i.resultado === 'aceptada').length;
  const tasaAceptacion = intervenciones.length ? Math.round((intAceptadas / intervenciones.length) * 100) : 0;

  if (authLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#00BCD4', borderTopColor: 'transparent' }} />
    </div>
  );

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
        {/* KPIs rápidos */}
        <div className="flex gap-3">
          {[
            { val: `${scoreChecklist}%`, label: 'Madurez PROA', color: scoreColor },
            { val: `${intervenciones.length}`, label: 'Intervenciones', color: '#00BCD4' },
            { val: `${tasaAceptacion}%`, label: 'Tasa aceptación', color: '#a78bfa' },
          ].map(k => (
            <div key={k.label} className="text-center px-4 py-2 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div className="text-xl font-black" style={{ color: k.color }}>{k.val}</div>
              <div className="text-[10px] text-slate-400">{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: '#f1f5f9' }}>
        {[
          { key: 'checklist', label: '✓ Checklist', },
          { key: 'intervenciones', label: '📋 Intervenciones' },
          { key: 'indicadores', label: '📊 Indicadores DDD' },
          { key: 'reporte', label: '📄 Informe mensual' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all"
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
                <div className="text-xs text-slate-400">{checksSi} de {totalItems} criterios cumplidos</div>
              </div>
            </div>
            <button onClick={guardarChecklist} disabled={guardandoChecklist}
                    className="text-white text-sm font-bold px-5 py-2 rounded-xl transition-all hover:scale-105 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)' }}>
              {guardandoChecklist ? 'Guardando...' : checklistGuardado ? '✓ Guardado' : 'Guardar'}
            </button>
          </div>

          {CHECKLIST_PROA.map((cat) => (
            <div key={cat.categoria} className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
              <div className="px-5 py-3 font-bold text-sm" style={{ background: '#f8fafc', color: '#0f766e', borderBottom: '1px solid #e2e8f0' }}>
                {cat.categoria}
                <span className="ml-2 text-xs font-normal text-slate-400">
                  ({cat.items.filter((_, i) => checks[`${cat.categoria}-${i}`]).length}/{cat.items.length})
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {cat.items.map((item, i) => {
                  const key = `${cat.categoria}-${i}`;
                  const checked = !!checks[key];
                  return (
                    <label key={key} className="flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50 transition-colors">
                      <div onClick={() => toggleCheck(key)}
                           className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                           style={checked
                             ? { background: 'linear-gradient(135deg,#00897B,#00BCD4)', border: 'none' }
                             : { border: '2px solid #cbd5e1', background: 'white' }}>
                        {checked && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                      <span className={`text-sm leading-relaxed ${checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: Intervenciones ── */}
      {tab === 'intervenciones' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-slate-500">{intervenciones.length} intervenciones registradas · {tasaAceptacion}% aceptación</div>
            <button onClick={() => setShowFormInt(true)}
                    className="text-white text-sm font-bold px-5 py-2 rounded-xl hover:scale-105 transition-all"
                    style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)' }}>
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
                  { k: 'antimicrobiano', l: 'Antimicrobiano', t: 'select', opts: ANTIMICROBIANOS_TRAZADORES.map(a => a.nombre) },
                  { k: 'tipo', l: 'Tipo de intervención', t: 'select', opts: TIPOS_INTERVENCION.map(t => t.key), labels: TIPOS_INTERVENCION.map(t => t.label) },
                  { k: 'resultado', l: 'Resultado', t: 'select', opts: ['aceptada','rechazada','pendiente'], labels: ['Aceptada','Rechazada','Pendiente'] },
                ].map(f => (
                  <div key={f.k}>
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">{f.l}</label>
                    {f.t === 'select' ? (
                      <select value={(formInt as Record<string,string>)[f.k] || ''}
                              onChange={e => setFormInt(p => ({ ...p, [f.k]: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white text-slate-700">
                        <option value="">Seleccionar</option>
                        {f.opts!.map((o, i) => <option key={o} value={o}>{f.labels ? f.labels[i] : o}</option>)}
                      </select>
                    ) : (
                      <input type={f.t} value={(formInt as Record<string,string>)[f.k] || ''}
                             onChange={e => setFormInt(p => ({ ...p, [f.k]: e.target.value }))}
                             className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white text-slate-700" />
                    )}
                  </div>
                ))}
                <div className="col-span-2 md:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">Justificación / Recomendación</label>
                  <textarea value={formInt.justificacion || ''}
                            onChange={e => setFormInt(p => ({ ...p, justificacion: e.target.value }))}
                            rows={2} className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white text-slate-700 resize-none" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={guardarIntervencion} disabled={guardandoInt}
                        className="text-white text-sm font-bold px-5 py-2 rounded-xl disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)' }}>
                  {guardandoInt ? 'Guardando...' : 'Guardar'}
                </button>
                <button onClick={() => setShowFormInt(false)} className="text-slate-500 text-sm px-4 py-2 rounded-xl hover:bg-white">Cancelar</button>
              </div>
            </div>
          )}

          {intervenciones.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ border: '2px dashed #e2e8f0' }}>
              <div className="text-4xl mb-3">💊</div>
              <p className="text-slate-500 text-sm">No hay intervenciones registradas aún.</p>
              <p className="text-slate-400 text-xs mt-1">Registre la primera intervención del equipo PROA.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
              <div className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-wide px-4 py-2"
                   style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <span className="col-span-1">Fecha</span>
                <span className="col-span-2">Paciente</span>
                <span className="col-span-2">Servicio</span>
                <span className="col-span-2">Antimicrobiano</span>
                <span className="col-span-2">Tipo</span>
                <span className="col-span-3">Resultado</span>
              </div>
              {intervenciones.map((inv, i) => {
                const tipo = TIPOS_INTERVENCION.find(t => t.key === inv.tipo);
                const resColor = inv.resultado === 'aceptada' ? '#34d399' : inv.resultado === 'rechazada' ? '#f87171' : '#f59e0b';
                return (
                  <div key={inv.id || i} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-slate-50 transition-colors"
                       style={{ borderBottom: i < intervenciones.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <span className="col-span-1 text-xs text-slate-500">{inv.fecha}</span>
                    <span className="col-span-2 text-xs font-semibold text-slate-700 truncate">{inv.paciente}</span>
                    <span className="col-span-2 text-xs text-slate-500 truncate">{inv.servicio}</span>
                    <span className="col-span-2 text-xs text-slate-700 truncate">{inv.antimicrobiano}</span>
                    <span className="col-span-2 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${tipo?.color}20`, color: tipo?.color }}>{tipo?.label}</span>
                    <span className="col-span-3 text-xs px-2 py-0.5 rounded-full font-bold capitalize" style={{ background: `${resColor}15`, color: resColor }}>
                      {inv.resultado}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Indicadores DDD ── */}
      {tab === 'indicadores' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">Consumo en DDD/100 camas-día</p>
              <p className="text-xs text-slate-400">Dosis Diaria Definida por 100 camas-día · estándar OMS</p>
            </div>
            <button onClick={() => setShowFormDDD(true)}
                    className="text-white text-sm font-bold px-5 py-2 rounded-xl hover:scale-105 transition-all"
                    style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)' }}>
              + Registrar consumo
            </button>
          </div>

          {showFormDDD && (
            <div className="rounded-2xl p-5 mb-4" style={{ background: '#f0fdfa', border: '1px solid #99f6e4' }}>
              <h3 className="font-bold text-teal-800 mb-4 text-sm">Registrar consumo mensual</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">Período</label>
                  <input type="month" value={formDDD.periodo || ''}
                         onChange={e => setFormDDD(p => ({ ...p, periodo: e.target.value }))}
                         className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">Antimicrobiano</label>
                  <select value={formDDD.antimicrobiano || ''}
                          onChange={e => setFormDDD(p => ({ ...p, antimicrobiano: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white">
                    <option value="">Seleccionar</option>
                    {ANTIMICROBIANOS_TRAZADORES.map(a => (
                      <option key={a.nombre} value={a.nombre}>{a.nombre} {a.watch ? '⚠️' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">DDD consumidas</label>
                  <input type="number" value={formDDD.ddd || ''}
                         onChange={e => setFormDDD(p => ({ ...p, ddd: Number(e.target.value) }))}
                         className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white"
                         placeholder="0.00" step="0.01" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">N° camas-día</label>
                  <input type="number" value={formDDD.camas || ''}
                         onChange={e => setFormDDD(p => ({ ...p, camas: Number(e.target.value) }))}
                         className="w-full px-3 py-2 rounded-lg text-sm border border-teal-200 bg-white"
                         placeholder="30" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={guardarConsumo} disabled={guardandoDDD}
                        className="text-white text-sm font-bold px-5 py-2 rounded-xl disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)' }}>
                  {guardandoDDD ? 'Guardando...' : 'Guardar'}
                </button>
                <button onClick={() => setShowFormDDD(false)} className="text-slate-500 text-sm px-4 py-2 rounded-xl hover:bg-slate-100">Cancelar</button>
              </div>
            </div>
          )}

          {/* Tabla de antimicrobianos trazadores */}
          <div className="rounded-2xl overflow-hidden mb-4" style={{ border: '1px solid #e2e8f0' }}>
            <div className="px-5 py-3 font-bold text-sm" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#0f766e' }}>
              Antimicrobianos trazadores PROA
            </div>
            <div className="divide-y divide-slate-100">
              {ANTIMICROBIANOS_TRAZADORES.map(amr => {
                const registros = consumos.filter(c => c.antimicrobiano === amr.nombre);
                const ultimo = registros[0];
                const ddd100 = ultimo ? ((ultimo.ddd / ultimo.camas) * 100).toFixed(1) : '—';
                return (
                  <div key={amr.nombre} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{amr.nombre}</span>
                        {amr.watch && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#fef3c7', color: '#92400e' }}>
                            ⚠️ Vigilancia especial
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{amr.grupo}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black" style={{ color: amr.watch && ddd100 !== '—' && Number(ddd100) > 5 ? '#f87171' : '#26A69A' }}>
                        {ddd100}
                      </div>
                      <div className="text-[10px] text-slate-400">DDD/100 camas-día</div>
                    </div>
                    <div className="text-xs text-slate-400 w-20 text-right">{ultimo?.periodo || 'Sin datos'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Informe mensual ── */}
      {tab === 'reporte' && (
        <div className="space-y-4">
          <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg,#0a2540,#134e4a)', color: 'white' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-black mb-1">Informe PROA</h2>
                <p className="text-sm opacity-60">{new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</p>
              </div>
              <button onClick={() => window.print()}
                      className="text-teal-900 text-sm font-bold px-4 py-2 rounded-xl"
                      style={{ background: '#34d399' }}>
                🖨️ Imprimir
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Madurez PROA', value: `${scoreChecklist}%`, sub: `${checksSi}/${totalItems} criterios` },
                { label: 'Intervenciones', value: intervenciones.length, sub: `${tasaAceptacion}% aceptación` },
                { label: 'AMR vigilados', value: consumos.length, sub: 'registros DDD' },
              ].map(k => (
                <div key={k.label} className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,.08)' }}>
                  <div className="text-2xl font-black text-teal-300">{k.value}</div>
                  <div className="text-xs font-semibold opacity-90 mt-0.5">{k.label}</div>
                  <div className="text-[10px] opacity-50">{k.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen por categoría */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
            <div className="px-5 py-3 font-bold text-sm" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#0f766e' }}>
              Cumplimiento por categoría
            </div>
            {CHECKLIST_PROA.map(cat => {
              const total = cat.items.length;
              const cumplidos = cat.items.filter((_, i) => checks[`${cat.categoria}-${i}`]).length;
              const pct = Math.round((cumplidos / total) * 100);
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
          {intervenciones.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
              <div className="px-5 py-3 font-bold text-sm" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#0f766e' }}>
                Resumen de intervenciones
              </div>
              <div className="p-5 grid grid-cols-3 gap-3">
                {TIPOS_INTERVENCION.map(tipo => {
                  const count = intervenciones.filter(i => i.tipo === tipo.key).length;
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
            Generado por NormaLis · PROA · Res. 2471/2022 · Plan RAM 2025–2030 · Res. 1732/2026 Est. 5 — {new Date().toLocaleDateString('es-CO')}
          </div>
        </div>
      )}
    </div>
  );
}
