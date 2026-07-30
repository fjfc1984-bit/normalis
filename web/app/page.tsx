'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ─── Typing words ──────────────────────────────────────────────────────────────
const TYPING_WORDS = ['la habilitación.', 'el PAMEC.', 'la visita de la Supersalud.', 'los vencimientos.', 'la acreditación.'];

// ─── Nav ───────────────────────────────────────────────────────────────────────
function Navbar({ onDemo }: { onDemo: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: '#funcionalidades', label: 'Funcionalidades' },
    { href: '#como-funciona', label: 'Cómo funciona' },
    { href: '#precios', label: 'Precios' },
    { href: '#faq', label: 'FAQ' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 font-black text-xl text-slate-900">
          Norma<span className="text-primary-600">Lis</span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map(l => (
            <a key={l.href} href={l.href} className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
              {l.label}
            </a>
          ))}
          <Link href="/login" className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
            Ingresar
          </Link>
          <button
            onClick={onDemo}
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors"
          >
            Solicitar demo
          </button>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-2 text-slate-700" onClick={() => setMobileOpen(o => !o)}>
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-5 py-4 flex flex-col gap-4">
          {navLinks.map(l => (
            <a key={l.href} href={l.href} className="text-slate-700 text-sm font-medium" onClick={() => setMobileOpen(false)}>
              {l.label}
            </a>
          ))}
          <Link href="/login" className="text-slate-700 text-sm font-medium">Ingresar</Link>
          <button onClick={() => { onDemo(); setMobileOpen(false); }}
            className="bg-primary-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold w-full">
            Solicitar demo gratis
          </button>
        </div>
      )}
    </nav>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ onDemo }: { onDemo: () => void }) {
  const [typedText, setTypedText] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = TYPING_WORDS[wordIdx];
    const delay = deleting ? 40 : charIdx === word.length ? 1800 : 65;

    const t = setTimeout(() => {
      if (!deleting && charIdx < word.length) {
        setTypedText(word.slice(0, charIdx + 1));
        setCharIdx(c => c + 1);
      } else if (!deleting && charIdx === word.length) {
        setDeleting(true);
      } else if (deleting && charIdx > 0) {
        setTypedText(word.slice(0, charIdx - 1));
        setCharIdx(c => c - 1);
      } else {
        setDeleting(false);
        setWordIdx(i => (i + 1) % TYPING_WORDS.length);
      }
    }, delay);

    return () => clearTimeout(t);
  }, [charIdx, deleting, wordIdx]);

  return (
    <section className="min-h-screen flex items-center justify-center pt-16 pb-16 bg-gradient-to-b from-primary-50 via-white to-white">
      <div className="max-w-4xl mx-auto px-5 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-200 text-primary-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-8">
          🏥 Hecho para IPS en Colombia · Res. 3100/2019 + 465/2025
        </div>

        <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-tight mb-6">
          Tu IPS, lista para<br />
          <span className="text-primary-600">{typedText}<span className="animate-pulse">|</span></span>
        </h1>

        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10">
          NormaLis automatiza la gestión de calidad y el cumplimiento normativo para IPS en Colombia —
          ahorrando <strong className="text-slate-700">más de 200 horas al año</strong> y reduciendo el riesgo de sanciones.
        </p>

        <div className="flex gap-4 justify-center flex-wrap mb-14">
          <button
            onClick={onDemo}
            className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-xl text-base font-bold transition-all hover:-translate-y-0.5 shadow-lg shadow-primary-200"
          >
            🚀 Solicitar demo gratis
          </button>
          <a href="https://normalis.co/normativa-app-v2.html" target="_blank" rel="noopener noreferrer"
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-8 py-4 rounded-xl text-base font-semibold transition-all hover:-translate-y-0.5">
            ▶ Ver la app
          </a>
        </div>

        {/* App preview mockup */}
        <div className="rounded-2xl overflow-hidden shadow-2xl shadow-slate-200 border border-slate-200 max-w-3xl mx-auto">
          <div className="bg-slate-800 px-4 py-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="flex-1 text-center text-xs text-slate-400 bg-slate-700 rounded px-3 py-1 mx-3">
              app.normalis.co · Dashboard
            </span>
          </div>
          <div className="bg-slate-50 p-5 grid grid-cols-4 gap-4 min-h-52">
            {/* Sidebar */}
            <div className="bg-primary-900 rounded-xl p-4 col-span-1 flex flex-col gap-2 text-white">
              <div className="text-primary-300 font-black text-sm mb-3 pb-2 border-b border-primary-700">NormaLis</div>
              {['📊 Dashboard', '🔍 Auditoría', '📄 Documentos', '📅 Vencimientos'].map((item, i) => (
                <div key={i} className={`text-xs px-2 py-1.5 rounded-lg ${i === 0 ? 'bg-primary-600 text-white' : 'text-primary-300'}`}>
                  {item}
                </div>
              ))}
            </div>
            {/* Main area */}
            <div className="col-span-3 flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { num: '87', label: 'Score habilitación', color: 'text-primary-600' },
                  { num: '18', label: 'Días para visita',   color: 'text-amber-500'   },
                  { num: '4/5', label: 'Docs generados',   color: 'text-emerald-600' },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                    <div className={`text-2xl font-black ${s.color}`}>{s.num}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex-1">
                <div className="text-xs font-bold text-slate-700 mb-3">📊 Auditoría por segmento</div>
                {[
                  { label: 'Talento Hum.', pct: 92, color: 'bg-emerald-400' },
                  { label: 'Infraestructura', pct: 78, color: 'bg-amber-400' },
                  { label: 'Procesos clave', pct: 61, color: 'bg-red-400'    },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-slate-500 w-24 flex-shrink-0">{b.label}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${b.color}`} style={{ width: `${b.pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-600 w-8 text-right">{b.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Compliance band ───────────────────────────────────────────────────────────
function ComplianceBand() {
  const pills = ['Ministerio de Salud', 'Res. 3100/2019', 'Res. 465/2025', 'Res. 256/2016 · PAMEC', 'RETHUS · REPS', 'Res. 0312/2019 · SG-SST'];
  return (
    <div className="bg-white border-y border-slate-100 py-8 px-5">
      <p className="text-center text-xs text-slate-400 uppercase tracking-widest mb-5">Compatible con normativa oficial colombiana</p>
      <div className="flex justify-center flex-wrap gap-3">
        {pills.map(p => (
          <span key={p} className="bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold px-4 py-2 rounded-lg">
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Stats ─────────────────────────────────────────────────────────────────────
function Stats() {
  const stats = [
    { num: '559',   suffix: '',  label: 'criterios de auditoría según Res. 3100' },
    { num: '11',    suffix: '',  label: 'segmentos normativos cubiertos' },
    { num: '6',     suffix: '',  label: 'documentos normativos generados automáticamente' },
    { num: '100',   suffix: '%', label: 'en línea, sin instalación, desde cualquier dispositivo' },
    { num: '200',   suffix: '+', label: 'horas ahorradas al año en gestión de calidad' },
    { num: '50',    suffix: '%', label: 'más rápido en elaboración de informes y CAPAs' },
  ];
  return (
    <div className="bg-primary-900 py-16 px-5">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-8 text-center">
        {stats.map(s => (
          <div key={s.label}>
            <div className="text-4xl md:text-5xl font-black text-white mb-1">{s.num}<span className="text-primary-300">{s.suffix}</span></div>
            <div className="text-sm text-primary-200">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Problems ──────────────────────────────────────────────────────────────────
function Problems() {
  const problems = [
    { icon: '📋', title: 'No saben qué documentos necesitan', desc: 'La Res. 3100/2019 exige más de 50 documentos según el tipo de prestador. Sin guía, siempre falta algo.' },
    { icon: '⏰', title: 'Se enteran tarde de los vencimientos', desc: 'Tarjetas profesionales, vacunas, contratos — nadie lleva el control y la habilitación se pierde por un documento vencido.' },
    { icon: '🔍', title: 'No se auditan antes de la visita', desc: 'La primera vez que saben qué les falta es cuando llega el ente habilitador. Para entonces, es muy tarde.' },
    { icon: '📉', title: 'No miden ni mejoran', desc: 'Sin indicadores de calidad (Res. 256/2016) ni PAMEC activo, el establecimiento no puede demostrar mejora continua.' },
  ];
  return (
    <section className="py-20 px-5">
      <div className="max-w-5xl mx-auto">
        <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-3">El problema</p>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Habilitarse es difícil.<br />Mantenerse habilitado, más.</h2>
        <p className="text-slate-500 max-w-xl mb-12">Las IPS pequeñas pierden habilitaciones por falta de documentación, no por mala atención.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {problems.map(p => (
            <div key={p.title} className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-400 to-orange-400" />
              <div className="text-3xl mb-3">{p.icon}</div>
              <h3 className="font-bold text-slate-900 mb-2">{p.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
function Features() {
  const features = [
    { icon: '🔍', title: 'Auditoría Interna Completa',       tag: 'Res. 3100/2019',    desc: '559 criterios organizados en 11 segmentos. Responde sí/no/parcial y obtén tu score de habilitación al instante.' },
    { icon: '📄', title: 'Generador de Documentos',          tag: 'Firma digital',      desc: 'Genera Manual de Bioseguridad, Plan de Residuos, Protocolo de Atención y más — personalizados con los datos de tu IPS.' },
    { icon: '⏰', title: 'Control de Vencimientos',          tag: 'Alertas automáticas', desc: 'Alertas por email antes de que venzan tarjetas profesionales, vacunas, contratos y certificaciones de tu equipo.' },
    { icon: '📊', title: 'Indicadores de Calidad PAMEC',     tag: 'Res. 256/2016',      desc: 'Registra y monitorea indicadores de satisfacción, eventos adversos, oportunidad de cita, reingresos y más.' },
    { icon: '🤖', title: 'IA Normativa',                     tag: 'Gemini + RAG',       desc: 'Chat con respuestas basadas en normativa colombiana vigente. Consulta sobre habilitación, RETHUS, bioseguridad y más.' },
    { icon: '📬', title: 'PQRS Integrado',                   tag: 'Peticiones y quejas', desc: 'Registra, clasifica y gestiona Peticiones, Quejas, Reclamos y Sugerencias. Exporta reportes para auditorías.' },
    { icon: '🛡️', title: 'Incidentes y Eventos Adversos',   tag: 'Seguridad del paciente', desc: 'Registra y hace seguimiento de incidentes clínicos con clasificación por severidad y plan de acción.' },
    { icon: '🦺', title: 'SG-SST · Seguridad en el Trabajo', tag: 'Res. 0312/2019',    desc: 'Autoevaluación de los Estándares Mínimos en 3 fases. Score automático y exportación PDF para presentar ante la ARL.' },
    { icon: '📱', title: 'PWA · Funciona Offline',           tag: 'iOS y Android',      desc: 'Instala NormaLis en tu celular. Realiza auditorías en campo sin conexión y sincroniza cuando tengas señal.' },
  ];
  return (
    <section className="bg-slate-50 py-20 px-5" id="funcionalidades">
      <div className="max-w-5xl mx-auto">
        <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-3">Funcionalidades</p>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Gestión de calidad integral<br />para tu IPS, en un solo lugar</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
          {features.map(f => (
            <div key={f.title} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-primary-300 hover:-translate-y-0.5 transition-all duration-200">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-2xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-3">{f.desc}</p>
              <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">
                ✓ {f.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: '1', title: 'Registra tu IPS',     desc: 'Ingresa NIT, código REPS, tipo de prestador y datos básicos. Solo toma 2 minutos.' },
    { n: '2', title: 'Realiza la auditoría', desc: 'Responde los 559 criterios por segmentos. Obtén tu score y lista de no conformidades al instante.' },
    { n: '3', title: 'Genera tus documentos', desc: 'Un clic y tienes el Manual de Bioseguridad, Plan de Residuos y más — listos para firmar.' },
    { n: '4', title: 'Monitorea y mejora',   desc: 'Las alertas automáticas y el cronograma te mantienen al día. El día de la visita, tu IPS ya está lista.' },
  ];
  return (
    <section className="py-20 px-5" id="como-funciona">
      <div className="max-w-5xl mx-auto">
        <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-3">Proceso</p>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">En 4 pasos, tu IPS lista para la auditoría</h2>
        <p className="text-slate-500 mb-12">Sin instalación, sin capacitación larga. Empiezas en minutos.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map(s => (
            <div key={s.n} className="text-center">
              <div className="w-14 h-14 rounded-full border-2 border-primary-600 text-primary-600 text-2xl font-black flex items-center justify-center mx-auto mb-4">
                {s.n}
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{s.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ───────────────────────────────────────────────────────────────────
function Pricing({ onDemo }: { onDemo: () => void }) {
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: 'Básico',
      monthly: '$199K', annual: '$166K',
      desc: 'Para consultorios y clínicas de un solo servicio.',
      features: [
        '1 sede · 2 usuarios',
        'Auditoría Res. 3100 básica',
        'Generador de documentos (5 plantillas)',
        'Calendario de vencimientos',
        'Dashboard de cumplimiento',
      ],
      popular: false,
      cta: 'Solicitar demo',
    },
    {
      name: 'Profesional',
      monthly: '$399K', annual: '$332K',
      desc: 'Para IPS multi-servicio con equipo de calidad.',
      features: [
        '1 sede · 5 usuarios',
        'Auditoría completa 559 criterios',
        'Todos los documentos + firma digital',
        'PAMEC e indicadores Res. 256',
        'PQRS, incidentes y bitácora',
        'SG-SST Res. 0312/2019',
        'Chat IA normativo',
        'Soporte prioritario',
      ],
      popular: true,
      cta: 'Solicitar demo',
    },
    {
      name: 'Enterprise',
      monthly: 'A la medida', annual: 'A la medida',
      desc: 'Para redes de IPS, clínicas y hospitales.',
      features: [
        'Sedes ilimitadas',
        'Usuarios ilimitados',
        'Todo el plan Profesional',
        'Integraciones a la medida',
        'SLA garantizado',
        'Capacitación presencial',
        'Soporte dedicado 24/7',
      ],
      popular: false,
      cta: 'Hablar con ventas',
    },
  ];

  return (
    <section className="bg-slate-50 py-20 px-5" id="precios">
      <div className="max-w-5xl mx-auto">
        <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-3">Precios</p>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">Precios transparentes para IPS en Colombia</h2>
        <p className="text-slate-500 mb-8">Cancela cuando quieras. Sin letra pequeña.</p>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm ${!annual ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>Mensual</span>
          <button
            onClick={() => setAnnual(a => !a)}
            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-primary-600' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${annual ? 'left-6' : 'left-0.5'}`} />
          </button>
          <span className={`text-sm ${annual ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
            Anual <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full ml-1">2 meses gratis</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(p => (
            <div key={p.name} className={`relative rounded-2xl p-7 border-2 flex flex-col ${
              p.popular
                ? 'border-primary-600 bg-white shadow-xl shadow-primary-100'
                : 'border-slate-200 bg-white'
            }`}>
              {p.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                  Más popular
                </div>
              )}
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{p.name}</div>
              <div className="mb-1">
                <span className="text-4xl font-black text-slate-900">{annual ? p.annual : p.monthly}</span>
                {p.monthly !== 'A la medida' && <span className="text-slate-400 text-sm"> COP/mes</span>}
              </div>
              <p className="text-sm text-slate-500 mb-6">{p.desc}</p>
              <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-emerald-500 font-bold flex-shrink-0 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onDemo}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-colors ${
                  p.popular
                    ? 'bg-primary-600 hover:bg-primary-700 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ──────────────────────────────────────────────────────────────
function Testimonials() {
  const testimonials = [
    {
      text: 'En dos días teníamos la auditoría completa y todos los documentos generados. Nos ahorró semanas de trabajo antes de la visita del ente habilitador.',
      name: 'Dra. Carolina Vargas',
      role: 'Directora Clínica · Bogotá',
      initials: 'CV',
    },
    {
      text: 'El chat normativo es increíble. Preguntamos sobre los requisitos de RETHUS y en segundos teníamos la respuesta exacta con la referencia normativa.',
      name: 'Ing. Jorge Martínez',
      role: 'Coord. Calidad IPS · Medellín',
      initials: 'JM',
    },
    {
      text: 'Las alertas de vencimientos cambiaron todo. Ya no perdemos habilitaciones por una tarjeta profesional vencida. NormaLis se convirtió en parte de nuestra operación.',
      name: 'Dra. Lucía Herrera',
      role: 'Gerente IPS · Cali',
      initials: 'LH',
    },
  ];
  return (
    <section className="py-20 px-5">
      <div className="max-w-5xl mx-auto">
        <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-3">Testimonios</p>
        <h2 className="text-3xl font-black text-slate-900 mb-10">IPS que ya confían en NormaLis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map(t => (
            <div key={t.name} className="bg-white border border-slate-200 rounded-2xl p-7">
              <div className="text-amber-400 text-sm mb-4">★★★★★</div>
              <p className="text-sm text-slate-600 leading-relaxed italic mb-6">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-black text-sm">
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{t.name}</div>
                  <div className="text-xs text-slate-400">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Band ──────────────────────────────────────────────────────────────────
function CTABand({ onDemo }: { onDemo: () => void }) {
  return (
    <div className="bg-gradient-to-r from-primary-900 to-primary-700 py-20 px-5 text-center">
      <h2 className="text-3xl md:text-4xl font-black text-white mb-4">¿Tu IPS está lista para la próxima visita?</h2>
      <p className="text-primary-200 mb-10 max-w-md mx-auto">Solicita una demo gratuita y te mostramos cómo NormaLis se adapta a tu tipo de prestador en menos de 30 minutos.</p>
      <button
        onClick={onDemo}
        className="bg-white text-primary-700 hover:bg-primary-50 px-8 py-4 rounded-xl text-base font-bold transition-all hover:-translate-y-0.5 shadow-lg"
      >
        🚀 Solicitar demo gratuita
      </button>
    </div>
  );
}

// ─── FAQ ───────────────────────────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const faqs = [
    { q: '¿NormaLis aplica para todo tipo de IPS?', a: 'Sí. NormaLis cubre prestadores de baja, mediana y alta complejidad. La auditoría interna filtra los criterios según el tipo de prestador (consultorios, clínicas, hospitales) conforme a la Res. 3100/2019.' },
    { q: '¿Necesito instalar algo?', a: 'No. NormaLis es 100% web. Funciona desde cualquier navegador moderno en computador, tablet o celular. También puedes instalarlo como PWA en Android e iOS para acceso offline.' },
    { q: '¿Los documentos generados tienen validez legal?', a: 'Los documentos generados son plantillas normativas personalizadas con los datos de tu IPS. Debes revisarlos, ajustarlos a tu realidad institucional y firmarlos antes de presentarlos ante el ente habilitador.' },
    { q: '¿Cómo funciona el período de prueba?', a: 'Puedes solicitar una demo guiada completamente gratuita. Durante la demo te mostramos la plataforma completa con los datos de tu tipo de IPS. Sin tarjeta de crédito, sin compromiso.' },
    { q: '¿Qué pasa si necesito soporte técnico?', a: 'Todos los planes incluyen soporte por email y WhatsApp en horario laboral. El plan Profesional incluye soporte prioritario y Enterprise incluye soporte dedicado 24/7.' },
  ];
  return (
    <section className="bg-slate-50 py-20 px-5" id="faq">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-3">FAQ</p>
        <h2 className="text-3xl font-black text-slate-900 mb-10">Preguntas frecuentes</h2>
        <div className="flex flex-col gap-3">
          {faqs.map((f, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <button
                className="w-full text-left px-6 py-4 font-semibold text-slate-900 flex justify-between items-center hover:text-primary-600 transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
              >
                {f.q}
                <span className={`text-slate-400 transition-transform ml-4 flex-shrink-0 ${open === i ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-sm text-slate-500 leading-relaxed">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-14 px-5">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          <div>
            <div className="font-black text-xl mb-3">Norma<span className="text-primary-400">Lis</span></div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Software colombiano de habilitación y calidad para IPS. Cumplimiento de Resolución 3100/2019 y 465/2025.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Producto</h4>
            <div className="flex flex-col gap-2">
              {['#funcionalidades', '#como-funciona', '#precios', '#faq'].map((href, i) => (
                <a key={href} href={href} className="text-sm text-slate-400 hover:text-white transition-colors">
                  {['Funcionalidades', 'Cómo funciona', 'Precios', 'FAQ'][i]}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Legal</h4>
            <div className="flex flex-col gap-2">
              <a href="https://normalis.co/terminos.html" className="text-sm text-slate-400 hover:text-white transition-colors">Términos y condiciones</a>
              <a href="https://normalis.co/politica-privacidad.html" className="text-sm text-slate-400 hover:text-white transition-colors">Política de privacidad</a>
              <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">Ingresar a la app</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-slate-500">
          <span>© 2025 NormaLis · Todos los derechos reservados</span>
          <div className="flex gap-3">
            <span className="bg-slate-800 text-slate-400 px-3 py-1 rounded-full">Res. 3100/2019</span>
            <span className="bg-slate-800 text-slate-400 px-3 py-1 rounded-full">Res. 465/2025</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Demo Modal ────────────────────────────────────────────────────────────────
interface DemoForm {
  ips: string; nombre: string; email: string; telefono: string; ciudad: string;
}

function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<DemoForm>({ ips: '', nombre: '', email: '', telefono: '', ciudad: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handle = (k: keyof DemoForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.nombre || !form.ips) { setError('Completa los campos requeridos.'); return; }
    setLoading(true); setError('');
    try {
      await addDoc(collection(db, 'leads'), {
        ...form,
        fuente: 'landing-nextjs',
        creadoEn: serverTimestamp(),
      });
      setSuccess(true);
    } catch {
      setError('Hubo un error. Escríbenos a hola@normalis.co');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-xl">✕</button>

        {success ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-black text-slate-900 mb-2">¡Listo! Te contactamos pronto</h3>
            <p className="text-sm text-slate-500">Revisa tu correo. Te enviaremos los detalles de la demo en las próximas horas.</p>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-black text-slate-900 mb-1">Solicitar demo gratuita</h3>
            <p className="text-sm text-slate-500 mb-6">Sin compromiso · Sin tarjeta de crédito</p>
            <form onSubmit={submit} className="flex flex-col gap-4">
              {[
                { k: 'ips',      label: 'Nombre de la IPS *',   placeholder: 'Clínica San Pablo' },
                { k: 'nombre',   label: 'Tu nombre *',           placeholder: 'Dra. María González' },
                { k: 'email',    label: 'Correo electrónico *',  placeholder: 'maria@clinica.co' },
                { k: 'telefono', label: 'WhatsApp / Teléfono',   placeholder: '310 000 0000' },
                { k: 'ciudad',   label: 'Ciudad',                placeholder: 'Bogotá' },
              ].map(field => (
                <div key={field.k}>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{field.label}</label>
                  <input
                    type={field.k === 'email' ? 'email' : 'text'}
                    placeholder={field.placeholder}
                    value={form[field.k as keyof DemoForm]}
                    onChange={handle(field.k as keyof DemoForm)}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 transition-colors placeholder:text-slate-300"
                  />
                </div>
              ))}
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm transition-colors mt-1"
              >
                {loading ? 'Enviando…' : '🚀 Solicitar demo'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <>
      <Navbar onDemo={() => setDemoOpen(true)} />
      <Hero onDemo={() => setDemoOpen(true)} />
      <ComplianceBand />
      <Stats />
      <Problems />
      <Features />
      <HowItWorks />
      <Pricing onDemo={() => setDemoOpen(true)} />
      <Testimonials />
      <CTABand onDemo={() => setDemoOpen(true)} />
      <FAQ />
      <Footer />
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}
