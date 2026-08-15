'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const TYPING_WORDS = ['la habilitación.', 'el PAMEC.', 'la visita de la Supersalud.', 'los vencimientos.', 'la acreditación.', 'el SG-SST.', 'la seguridad del paciente.', 'la norma ISO 7101.'];

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
    { href: '#crosswalk', label: 'ISO / JCI' },
    { href: '#como-funciona', label: 'Cómo funciona' },
    { href: '#preview', label: 'Vista previa' },
    { href: '#precios', label: 'Precios' },
    { href: '#faq', label: 'FAQ' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 font-black text-xl">
          <span className={scrolled ? 'text-slate-900' : 'text-white'}>Norma</span>
          <span className="text-teal-400">Lis</span>
        </a>

        <div className="hidden md:flex items-center gap-7">
          {navLinks.map(l => (
            <a key={l.href} href={l.href} className={`text-sm font-medium transition-colors ${scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-white/80 hover:text-white'}`}>
              {l.label}
            </a>
          ))}
          <Link href="/login" className={`text-sm font-medium transition-colors ${scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-white/80 hover:text-white'}`}>
            Ingresar
          </Link>
          <button
            onClick={onDemo}
            className="bg-teal-500 hover:bg-teal-400 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-teal-500/30"
          >
            Solicitar demo
          </button>
        </div>

        <button className={`md:hidden p-2 ${scrolled ? 'text-slate-700' : 'text-white'}`} onClick={() => setMobileOpen(o => !o)}>
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-5 py-4 flex flex-col gap-4">
          {navLinks.map(l => (
            <a key={l.href} href={l.href} className="text-slate-700 text-sm font-medium" onClick={() => setMobileOpen(false)}>
              {l.label}
            </a>
          ))}
          <Link href="/login" className="text-slate-700 text-sm font-medium">Ingresar</Link>
          <button onClick={() => { onDemo(); setMobileOpen(false); }}
            className="bg-teal-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold w-full">
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
    <section
      className="relative min-h-screen flex items-center justify-center pt-16 pb-20 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f2027 0%, #0d3d3d 40%, #134e4a 70%, #0c2340 100%)' }}
    >
      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #14b8a6, transparent)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full opacity-15 blur-3xl"
        style={{ background: 'radial-gradient(circle, #0891b2, transparent)' }} />

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="relative max-w-5xl mx-auto px-5 text-center">
        <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 text-teal-300 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-8 backdrop-blur-sm">
          🏥 Hecho para IPS en Colombia · Res. 1732/2026
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6">
          Tu IPS, lista para<br />
          <span className="text-teal-400">{typedText}<span className="animate-pulse">|</span></span>
        </h1>

        <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          NormaLis automatiza la gestión de calidad y el cumplimiento normativo —
          ahorrando <strong className="text-white">más de 200 horas al año</strong> y reduciendo el riesgo de sanciones.
        </p>

        <div className="flex gap-4 justify-center flex-wrap mb-16">
          <button
            onClick={onDemo}
            className="bg-teal-500 hover:bg-teal-400 text-white px-8 py-4 rounded-xl text-base font-bold transition-all hover:-translate-y-1 shadow-xl shadow-teal-500/40"
          >
            🚀 Solicitar demo gratis
          </button>
          <Link href="/login"
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-4 rounded-xl text-base font-semibold transition-all hover:-translate-y-1 backdrop-blur-sm">
            ▶ Ver la app
          </Link>
        </div>

        {/* Floating badges */}
        <div className="flex justify-center gap-2 flex-wrap mb-12">
          {[
            { label: '16 módulos activos', glow: true },
            { label: 'Res. 1732/2026', glow: true },
            { label: 'ISO 7101:2023', glow: false },
            { label: 'JCI 8ª ed.', glow: false },
            { label: 'PAMEC · SG-SST', glow: false },
            { label: 'IA normativa', glow: true },
          ].map(b => (
            <span key={b.label}
              className="text-xs px-3 py-1.5 rounded-full backdrop-blur-sm font-medium"
              style={b.glow
                ? { background: 'rgba(0,188,212,.15)', border: '1px solid rgba(0,188,212,.35)', color: '#67e8f9', boxShadow: '0 0 10px rgba(0,188,212,.15)' }
                : { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.6)' }
              }>
              {b.label}
            </span>
          ))}
        </div>

        {/* App mockup */}
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 max-w-3xl mx-auto">
          <div className="bg-slate-900/80 backdrop-blur-sm px-4 py-3 flex items-center gap-2 border-b border-white/5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="flex-1 text-center text-xs text-slate-400 bg-slate-800 rounded px-3 py-1 mx-3">
              app.normalis.co · Dashboard
            </span>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-sm p-5 grid grid-cols-4 gap-4 min-h-52">
            <div className="bg-teal-900/60 rounded-xl p-4 col-span-1 flex flex-col gap-2 border border-teal-500/20">
              <div className="text-teal-300 font-black text-sm mb-3 pb-2 border-b border-teal-500/20">NormaLis</div>
              {['📊 Dashboard', '🔍 Auditoría', '📄 Documentos', '📅 Vencimientos'].map((item, i) => (
                <div key={i} className={`text-xs px-2 py-1.5 rounded-lg ${i === 0 ? 'bg-teal-500 text-white' : 'text-teal-300/70'}`}>
                  {item}
                </div>
              ))}
            </div>
            <div className="col-span-3 flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { num: '87', label: 'Score habilitación', color: 'text-teal-400' },
                  { num: '18', label: 'Días para visita',   color: 'text-amber-400' },
                  { num: '4/5', label: 'Docs generados',   color: 'text-emerald-400' },
                ].map((s, i) => (
                  <div key={i} className="bg-slate-800/60 rounded-xl p-3 border border-white/5">
                    <div className={`text-2xl font-black ${s.color}`}>{s.num}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-800/60 rounded-xl p-4 flex-1 border border-white/5">
                <div className="text-xs font-bold text-slate-300 mb-3">📊 Auditoría por segmento</div>
                {[
                  { label: 'Talento Hum.', pct: 92, color: 'bg-emerald-400' },
                  { label: 'Infraestructura', pct: 78, color: 'bg-amber-400' },
                  { label: 'Procesos clave', pct: 61, color: 'bg-red-400' },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-slate-400 w-24 flex-shrink-0">{b.label}</span>
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${b.color}`} style={{ width: `${b.pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-300 w-8 text-right">{b.pct}%</span>
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
  const pills = ['Ministerio de Salud', 'Res. 1732/2026', 'Res. 256/2016 · PAMEC', 'RETHUS · REPS', 'ISO 31000:2018 · Riesgo', 'Res. 1774/2025 · SG-SST'];
  return (
    <div className="bg-slate-50 border-y border-slate-200 py-8 px-5">
      <p className="text-center text-xs text-slate-400 uppercase tracking-widest mb-5 font-semibold">
        Compatible con normativa oficial colombiana
      </p>
      <div className="flex justify-center flex-wrap gap-3">
        {pills.map(p => (
          <span key={p} className="bg-white border border-teal-200 text-teal-700 text-xs font-semibold px-4 py-2 rounded-full shadow-sm">
            ✓ {p}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Stats ─────────────────────────────────────────────────────────────────────
function Stats() {
  const stats = [
    { num: '780',  suffix: '',  label: 'criterios de auditoría cubiertos en 22 modalidades', icon: '📋' },
    { num: '16',   suffix: '',  label: 'módulos activos en la plataforma', icon: '⊞' },
    { num: '3',    suffix: '',  label: 'marcos normativos cruzados: Res. 1732 · ISO 7101 · JCI', icon: '🔄' },
    { num: '100',  suffix: '%', label: 'en línea, sin instalación, desde cualquier dispositivo', icon: '☁️' },
    { num: '200',  suffix: '+', label: 'horas ahorradas al año en gestión de calidad', icon: '⏱️' },
    { num: '50',   suffix: '%', label: 'más rápido en elaboración de informes y CAPAs', icon: '🚀' },
  ];
  return (
    <div className="py-20 px-5" style={{ background: 'linear-gradient(135deg, #134e4a 0%, #0f2027 100%)' }}>
      <div className="max-w-5xl mx-auto">
        <p className="text-center text-teal-300 text-xs font-bold uppercase tracking-widest mb-12">NormaLis en números</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {stats.map(s => (
            <div key={s.label}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-colors backdrop-blur-sm">
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-4xl md:text-5xl font-black text-white mb-2">
                {s.num}<span className="text-teal-400">{s.suffix}</span>
              </div>
              <div className="text-sm text-slate-300 leading-relaxed">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Problems ──────────────────────────────────────────────────────────────────
function Problems() {
  const problems = [
    { icon: '📋', title: 'No saben qué documentos necesitan', desc: 'La Res. 1732/2026 exige más de 50 documentos según el tipo de prestador. Sin guía, siempre falta algo.', color: 'from-red-500 to-orange-500' },
    { icon: '⏰', title: 'Se enteran tarde de los vencimientos', desc: 'Tarjetas profesionales, vacunas, contratos — nadie lleva el control y la habilitación se pierde por un documento vencido.', color: 'from-orange-500 to-amber-500' },
    { icon: '🔍', title: 'No se auditan antes de la visita', desc: 'La primera vez que saben qué les falta es cuando llega el ente habilitador. Para entonces, es muy tarde.', color: 'from-amber-500 to-yellow-500' },
    { icon: '📉', title: 'No miden ni mejoran', desc: 'Sin indicadores de calidad (Res. 256/2016) ni PAMEC activo, el establecimiento no puede demostrar mejora continua.', color: 'from-rose-500 to-pink-500' },
  ];
  return (
    <section className="py-20 px-5 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <span className="inline-block bg-red-50 text-red-600 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">El problema</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Habilitarse es difícil.<br />Mantenerse habilitado, más.</h2>
          <p className="text-slate-500 max-w-xl text-lg">Las IPS pequeñas pierden habilitaciones por falta de documentación, no por mala atención.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {problems.map(p => (
            <div key={p.title} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${p.color}`} />
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4 bg-gradient-to-br ${p.color} shadow-lg`}>
                {p.icon}
              </div>
              <h3 className="font-bold text-slate-900 mb-2 text-lg">{p.title}</h3>
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
    { icon: '🔍', title: 'Auditoría Interna',               tag: 'Res. 1732/2026',        desc: '780 criterios en 22 modalidades. Score de habilitación al instante con plan de mejora.', grad: 'from-teal-400 to-cyan-500' },
    { icon: '📄', title: 'Generador de Documentos',         tag: 'Firma digital',          desc: 'Manual de Bioseguridad, Plan de Residuos, Protocolos y más — listos en minutos con datos de tu IPS.', grad: 'from-blue-400 to-indigo-500' },
    { icon: '⏰', title: 'Control de Vencimientos',         tag: 'Alertas automáticas',    desc: 'Alertas antes de que venzan tarjetas profesionales, vacunas, contratos y certificaciones.', grad: 'from-amber-400 to-orange-500' },
    { icon: '📈', title: 'PAMEC e Indicadores',             tag: 'Res. 256/2016',          desc: 'Registra y monitorea indicadores de satisfacción, eventos adversos, reingresos y más.', grad: 'from-violet-400 to-purple-500' },
    { icon: '🤖', title: 'Asistente IA Normativo',          tag: 'Gemini + RAG',           desc: 'Chat con respuestas basadas en normativa colombiana vigente. Rápido, preciso y citado.', grad: 'from-pink-400 to-rose-500' },
    { icon: '✓',  title: 'CAPAs',                           tag: 'Mejora continua',        desc: 'Acciones correctivas y preventivas con seguimiento, responsables, fechas y evidencias.', grad: 'from-green-400 to-emerald-500' },
    { icon: '👥', title: 'Talento Humano',                  tag: 'Gestión de personal',    desc: 'Contratos, hojas de vida, tarjetas profesionales y certificaciones del equipo clínico centralizadas.', grad: 'from-cyan-400 to-teal-500' },
    { icon: '📝', title: 'Consentimientos Informados',      tag: 'Habeas Data · Ley 1581', desc: 'Plantillas de consentimientos por especialidad, historial firmado y trazabilidad documental.', grad: 'from-purple-400 to-violet-500' },
    { icon: '✍️', title: 'Firma y Versiones',              tag: 'Trazabilidad',           desc: 'Control de versiones de documentos, firma digital y registro de quién aprobó cada cambio.', grad: 'from-indigo-400 to-blue-500' },
    { icon: '🔄', title: 'Comparador ISO 7101 / JCI',       tag: 'Crosswalk normativo',    desc: 'Cruza los 7 estándares de habilitación con ISO 7101:2023 y JCI 8ª edición. Score de equivalencia.', grad: 'from-sky-400 to-cyan-500' },
    { icon: '📬', title: 'PQRS Integrado',                  tag: 'Peticiones y quejas',    desc: 'Registra, clasifica y gestiona PQR. Exporta reportes para auditorías en segundos.', grad: 'from-emerald-400 to-teal-500' },
    { icon: '🛡️', title: 'Incidentes y Eventos Adversos',  tag: 'Seguridad del paciente', desc: 'Registro con clasificación por severidad, seguimiento y plan de acción documentado.', grad: 'from-red-400 to-rose-500' },
    { icon: '🦺', title: 'SG-SST',                          tag: 'Res. 1774/2025',         desc: 'Autoevaluación en 3 fases. Score automático y PDF para presentar ante la ARL.', grad: 'from-yellow-400 to-amber-500' },
    { icon: '⚠️', title: 'Análisis de Riesgo ISO 31000',   tag: 'ISO 31000:2018',         desc: 'Matriz de calor 5×5, 15 riesgos predefinidos para IPS. Trata, prioriza y genera alertas para riesgos extremos.', grad: 'from-orange-400 to-red-500' },
    { icon: '📋', title: 'Bitácora de Auditoría',           tag: 'Log de actividades',     desc: 'Registro automático de todas las acciones: auditorías, documentos, CAPAs y cambios.', grad: 'from-slate-400 to-slate-500' },
    { icon: '📱', title: 'PWA · Funciona Offline',          tag: 'iOS y Android',          desc: 'Instala NormaLis en tu celular. Audita en campo sin conexión y sincroniza después.', grad: 'from-gray-400 to-slate-600' },
  ];
  return (
    <section className="py-20 px-5 bg-slate-50" id="funcionalidades">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <span className="inline-block bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">Funcionalidades</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">Gestión de calidad integral<br />en un solo lugar</h2>
          <p className="text-slate-500 text-lg">Todo lo que tu IPS necesita para cumplir la normativa y estar lista para cualquier visita.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(f => (
            <div key={f.title}
              className="relative bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group overflow-hidden"
              style={{ borderTop: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(90deg, transparent, transparent)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}
            >
              {/* Top accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${f.grad} opacity-60 group-hover:opacity-100 transition-opacity`} />
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4 bg-gradient-to-br ${f.grad} shadow-md shadow-black/10`}>
                {f.icon}
              </div>
              <h3 className="font-bold text-slate-900 mb-2 text-sm">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">{f.desc}</p>
              <span className="inline-block bg-slate-50 text-slate-600 border border-slate-100 text-[10px] font-bold px-2.5 py-1 rounded-full">
                ✓ {f.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── ISO / JCI Crosswalk ──────────────────────────────────────────────────────
function CrosswalkSection() {
  const estandares = [
    { label: 'Talento Humano',         iso: '§5.3 · §7.2 · §7.3', isoScore: 88, jci: 'SQE · QPS.3',      jciScore: 82 },
    { label: 'Infraestructura',        iso: '§7.1 · §8.1',         isoScore: 79, jci: 'FMS.1 · FMS.4',    jciScore: 71 },
    { label: 'Dotación',               iso: '§7.1.5 · §8.5',       isoScore: 83, jci: 'FMS.8 · AOP.5',    jciScore: 78 },
    { label: 'Procesos Prioritarios',  iso: '§8.5 · §8.7',         isoScore: 91, jci: 'COP.1 · IPSG',     jciScore: 87 },
    { label: 'Historia Clínica',       iso: '§7.5 · §8.2',         isoScore: 85, jci: 'MCI.1 · MOI.11',   jciScore: 80 },
  ];
  return (
    <section className="py-20 px-5 overflow-hidden" id="crosswalk"
      style={{ background: 'linear-gradient(135deg, #0f2027 0%, #0d3d3d 50%, #134e4a 100%)' }}>
      {/* Glows */}
      <div className="pointer-events-none absolute left-0 top-1/2 w-64 h-64 rounded-full opacity-15 blur-3xl"
           style={{ background: 'radial-gradient(circle, #00BCD4, transparent)' }} />
      <div className="max-w-5xl mx-auto relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <span className="inline-block bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
              🔄 Nuevo · Crosswalk normativo
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight">
              Tu IPS en estándares<br />
              <span style={{ background: 'linear-gradient(90deg,#26A69A,#00BCD4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                internacionales
              </span>
            </h2>
            <p className="text-slate-400 text-base max-w-lg">
              NormaLis cruza automáticamente los 7 estándares de habilitación colombiana con <strong className="text-white">ISO 7101:2023</strong> y <strong className="text-white">JCI 8ª edición</strong>. Conoce tu equivalencia internacional sin trabajo extra.
            </p>
          </div>
          <div className="flex gap-4 shrink-0">
            <div className="text-center p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}>
              <p className="text-3xl font-black text-cyan-400">~82%</p>
              <p className="text-xs text-slate-400 mt-0.5">equiv. ISO 7101</p>
            </div>
            <div className="text-center p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}>
              <p className="text-3xl font-black" style={{ color: '#A78BFA' }}>~75%</p>
              <p className="text-xs text-slate-400 mt-0.5">equiv. JCI 8ª ed.</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,.1)' }}>
          <div className="grid grid-cols-12 text-xs font-bold uppercase tracking-widest px-5 py-3"
               style={{ background: 'rgba(255,255,255,.05)', borderBottom: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.4)' }}>
            <span className="col-span-3">Estándar Res. 1732/2026</span>
            <span className="col-span-3">ISO 7101:2023</span>
            <span className="col-span-2 text-center">Equiv. ISO</span>
            <span className="col-span-3">JCI 8ª edición</span>
            <span className="col-span-1 text-center">JCI</span>
          </div>
          {estandares.map((e, i) => (
            <div key={e.label}
              className="grid grid-cols-12 items-center px-5 py-4 text-sm transition-colors"
              style={{
                borderBottom: i < estandares.length - 1 ? '1px solid rgba(255,255,255,.06)' : 'none',
                background: 'rgba(0,0,0,.15)',
              }}>
              <span className="col-span-3 font-semibold text-white text-xs">{e.label}</span>
              <span className="col-span-3 text-[11px] font-mono" style={{ color: '#80CBC4' }}>{e.iso}</span>
              <div className="col-span-2 flex flex-col items-center gap-1">
                <span className="text-sm font-black" style={{ color: '#26A69A' }}>{e.isoScore}%</span>
                <div className="w-full h-1 rounded-full" style={{ background: 'rgba(255,255,255,.1)' }}>
                  <div className="h-full rounded-full" style={{ width: `${e.isoScore}%`, background: 'linear-gradient(90deg,#26A69A,#00BCD4)' }} />
                </div>
              </div>
              <span className="col-span-3 text-[11px] font-mono" style={{ color: '#A78BFA' }}>{e.jci}</span>
              <div className="col-span-1 flex flex-col items-center gap-1">
                <span className="text-sm font-black" style={{ color: '#A78BFA' }}>{e.jciScore}%</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,.25)' }}>
          Disponible en el módulo <strong className="text-white/50">Comparador Normativo</strong> · Solo plan Profesional y Enterprise
        </p>
      </div>
    </section>
  );
}

// ─── How it works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: '01', title: 'Registra tu IPS',     desc: 'Ingresa NIT, código REPS, tipo de prestador y datos básicos. Solo toma 2 minutos.', icon: '🏥' },
    { n: '02', title: 'Realiza la auditoría', desc: 'Responde los 559 criterios por segmentos. Obtén tu score y lista de no conformidades.', icon: '🔍' },
    { n: '03', title: 'Genera tus documentos', desc: 'Un clic y tienes el Manual de Bioseguridad, Plan de Residuos y más — listos para firmar.', icon: '📄' },
    { n: '04', title: 'Monitorea y mejora',   desc: 'Las alertas automáticas y el cronograma te mantienen al día. El día de la visita, tu IPS ya está lista.', icon: '📈' },
  ];
  return (
    <section className="py-20 px-5 bg-white" id="como-funciona">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <span className="inline-block bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">Proceso</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">En 4 pasos, tu IPS lista para la auditoría</h2>
          <p className="text-slate-500 text-lg">Sin instalación, sin capacitación larga. Empiezas en minutos.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-7 left-[calc(50%+2rem)] right-[-50%] h-0.5 bg-gradient-to-r from-teal-300 to-teal-100 z-0" />
              )}
              <div className="relative z-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg shadow-teal-500/30">
                  {s.icon}
                </div>
                <div className="inline-block bg-teal-50 text-teal-600 text-xs font-black px-2 py-0.5 rounded mb-2">{s.n}</div>
                <h3 className="font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Product Preview ───────────────────────────────────────────────────────────
const SCREENS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    desc: 'KPIs de cumplimiento en tiempo real, alertas activas y progreso de auditoría.',
    content: (
      <div className="flex h-full gap-3 p-3">
        {/* Sidebar */}
        <div className="w-36 bg-teal-900/80 rounded-xl p-3 flex flex-col gap-1.5 flex-shrink-0">
          <div className="text-teal-300 font-black text-xs mb-2 pb-2 border-b border-teal-700/50">NormaLis</div>
          {[
            { icon: '📊', label: 'Dashboard', active: true },
            { icon: '🔍', label: 'Auditoría', active: false },
            { icon: '📄', label: 'Documentos', active: false },
            { icon: '📅', label: 'Vencimientos', active: false },
            { icon: '📊', label: 'Indicadores', active: false },
            { icon: '🤖', label: 'Asistente IA', active: false },
          ].map((item) => (
            <div key={item.label} className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg ${item.active ? 'bg-teal-500 text-white font-bold' : 'text-teal-300/70 hover:bg-teal-800/50'}`}>
              <span className="text-xs">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </div>
        {/* Content */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <div className="grid grid-cols-3 gap-2">
            {[
              { num: '87%', label: 'Habilitación', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' },
              { num: '12d', label: 'Próx. venc.', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
              { num: '6/9', label: 'Docs listos', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-3 border ${s.bg}`}>
                <div className={`text-xl font-black ${s.color}`}>{s.num}</div>
                <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 flex-1 border border-white/5">
            <div className="text-xs font-bold text-slate-300 mb-2">Auditoría por segmento</div>
            {[
              { label: 'Talento Humano', pct: 92, color: 'bg-emerald-400' },
              { label: 'Infraestructura', pct: 78, color: 'bg-teal-400' },
              { label: 'Proc. asistenciales', pct: 65, color: 'bg-amber-400' },
              { label: 'Medicamentos', pct: 54, color: 'bg-orange-400' },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-slate-400 w-28 flex-shrink-0 truncate">{b.label}</span>
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${b.color} transition-all`} style={{ width: `${b.pct}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-300 w-7 text-right">{b.pct}%</span>
              </div>
            ))}
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span className="text-xs text-amber-300 font-medium">Tarjeta profesional Dr. Gómez vence en 12 días</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'auditoria',
    label: 'Auditoría',
    icon: '🔍',
    desc: '780 criterios según Res. 1732/2026 — mismos 7 estándares, criterios actualizados. Score instantáneo.',
    content: (
      <div className="flex h-full flex-col gap-3 p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white">Auditoría Interna · Res. 1732/2026</div>
            <div className="text-xs text-slate-400 mt-0.5">Segmento: Talento Humano · 45/52 criterios</div>
          </div>
          <div className="bg-teal-500/20 border border-teal-500/30 rounded-xl px-3 py-1.5 text-center">
            <div className="text-lg font-black text-teal-400">87%</div>
            <div className="text-xs text-slate-400">Score</div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['Talento Hum.', 'Infraestructura', 'Medicamentos', 'Historia Clínica', 'Interdependencias'].map((seg, i) => (
            <span key={seg} className={`text-xs px-2 py-1 rounded-full border ${i === 0 ? 'bg-teal-500 text-white border-teal-500' : 'text-slate-400 border-slate-600'}`}>{seg}</span>
          ))}
        </div>
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          {[
            { code: 'TH-001', text: 'Hoja de vida del personal con soportes', status: 'si' },
            { code: 'TH-002', text: 'Tarjetas profesionales vigentes verificadas', status: 'si' },
            { code: 'TH-003', text: 'Certificados de vacunación actualizados', status: 'no' },
            { code: 'TH-004', text: 'Contratos de trabajo / prestación de servicios', status: 'si' },
            { code: 'TH-005', text: 'Inducción y entrenamiento documentado', status: 'parcial' },
          ].map((item) => (
            <div key={item.code} className="bg-slate-800/60 border border-white/5 rounded-lg p-2.5 flex items-center gap-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-bold
                ${item.status === 'si' ? 'bg-emerald-500 text-white' : item.status === 'no' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                {item.status === 'si' ? '✓' : item.status === 'no' ? '✗' : '~'}
              </span>
              <span className="text-xs text-slate-400 font-mono flex-shrink-0">{item.code}</span>
              <span className="text-xs text-slate-200 truncate">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'chat',
    label: 'Asistente IA',
    icon: '🤖',
    desc: 'Chat con IA normativa entrenada en Res. 1732/2026, PAMEC y SG-SST.',
    content: (
      <div className="flex h-full flex-col p-3 gap-3">
        <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          Asistente normativo NormaLis · Res. 1732/2026
        </div>
        <div className="flex-1 flex flex-col gap-3 overflow-hidden justify-end">
          <div className="flex justify-end">
            <div className="bg-teal-500/20 border border-teal-500/30 text-teal-100 text-xs rounded-2xl rounded-tr-sm px-3 py-2 max-w-[75%]">
              ¿Qué documentos necesito para habilitarme como consultorio médico?
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center text-xs font-bold flex-shrink-0 shadow">IA</div>
            <div className="bg-slate-800/80 border border-white/10 text-slate-200 text-xs rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%]">
              Para un consultorio médico (Res. 1732/2026, Grupo 1), los documentos clave son:
              <ul className="mt-1.5 flex flex-col gap-1 pl-2">
                {['Manual de Bioseguridad', 'Plan de Gestión de Residuos', 'Protocolo de Atención al Paciente', 'Hoja de vida con tarjetas profesionales', 'Consentimientos informados'].map((d) => (
                  <li key={d} className="flex gap-1.5 items-start"><span className="text-teal-400 font-bold flex-shrink-0">✓</span>{d}</li>
                ))}
              </ul>
              <div className="mt-2 text-teal-400/70 text-xs">Fuente: Res. 1732/2026, Tomo II</div>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="bg-teal-500/20 border border-teal-500/30 text-teal-100 text-xs rounded-2xl rounded-tr-sm px-3 py-2 max-w-[75%]">
              ¿Puedo generarlos desde NormaLis?
            </div>
          </div>
        </div>
        <div className="bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-slate-400">
          <span className="flex-1">Escribe tu pregunta normativa...</span>
          <span className="bg-teal-500 text-white px-2 py-1 rounded-lg font-bold">→</span>
        </div>
      </div>
    ),
  },
  {
    id: 'documentos',
    label: 'Documentos',
    icon: '📄',
    desc: 'Genera documentos normativos en segundos con los datos de tu IPS prellenados.',
    content: (
      <div className="flex h-full flex-col p-3 gap-3">
        <div className="text-sm font-bold text-white">Generador de Documentos Normativos</div>
        <div className="grid grid-cols-2 gap-2 flex-1 content-start">
          {[
            { name: 'Manual de Bioseguridad', icon: '🛡️', status: 'listo', color: 'border-emerald-500/30 bg-emerald-500/5' },
            { name: 'Plan de Residuos', icon: '♻️', status: 'listo', color: 'border-emerald-500/30 bg-emerald-500/5' },
            { name: 'Consentimiento Informado', icon: '✍️', status: 'listo', color: 'border-emerald-500/30 bg-emerald-500/5' },
            { name: 'Protocolo de Atención', icon: '📋', status: 'listo', color: 'border-emerald-500/30 bg-emerald-500/5' },
            { name: 'Plan de Emergencias', icon: '🚨', status: 'pendiente', color: 'border-slate-600 bg-slate-800/40' },
            { name: 'Programa de Auditoría', icon: '🔍', status: 'pendiente', color: 'border-slate-600 bg-slate-800/40' },
          ].map((doc) => (
            <div key={doc.name} className={`border rounded-xl p-3 flex flex-col gap-2 ${doc.color}`}>
              <div className="text-base">{doc.icon}</div>
              <div className="text-xs font-medium text-slate-200 leading-tight">{doc.name}</div>
              <div className={`text-xs font-bold ${doc.status === 'listo' ? 'text-emerald-400' : 'text-slate-400'}`}>
                {doc.status === 'listo' ? '✓ Listo · PDF' : '+ Generar'}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'crosswalk',
    label: 'ISO / JCI',
    icon: '🔄',
    desc: 'Cruza los estándares colombianos con ISO 7101:2023 y JCI 8ª edición. Score de equivalencia automático.',
    content: (
      <div className="flex h-full flex-col p-3 gap-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white">Comparador Normativo · Crosswalk</div>
            <div className="text-xs text-slate-400 mt-0.5">Res. 1732/2026 ↔ ISO 7101:2023 ↔ JCI 8ª ed.</div>
          </div>
          <div className="flex gap-2">
            <div className="bg-teal-500/20 border border-teal-500/30 rounded-xl px-2 py-1 text-center">
              <div className="text-sm font-black text-teal-400">82%</div>
              <div className="text-[9px] text-slate-400">ISO</div>
            </div>
            <div className="rounded-xl px-2 py-1 text-center" style={{ background: 'rgba(167,139,250,.15)', border: '1px solid rgba(167,139,250,.3)' }}>
              <div className="text-sm font-black" style={{ color: '#A78BFA' }}>75%</div>
              <div className="text-[9px] text-slate-400">JCI</div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {['ISO 7101', 'JCI 8ª ed.'].map((tab, i) => (
            <span key={tab} className={`text-xs px-3 py-1 rounded-full border font-semibold ${i === 0 ? 'bg-teal-500 text-white border-teal-500' : 'text-slate-400 border-slate-600'}`}>{tab}</span>
          ))}
        </div>
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          {[
            { label: 'Talento Humano',       sec: '§5.3 · §7.2 · §7.3', pct: 88 },
            { label: 'Infraestructura',      sec: '§7.1 · §8.1',         pct: 79 },
            { label: 'Dotación',             sec: '§7.1.5 · §8.5',       pct: 83 },
            { label: 'Procesos Prioritarios',sec: '§8.5 · §8.7',         pct: 91 },
            { label: 'Historia Clínica',     sec: '§7.5 · §8.2',         pct: 85 },
          ].map((item) => (
            <div key={item.label} className="bg-slate-800/60 border border-white/5 rounded-lg p-2 flex items-center gap-3">
              <span className="text-xs text-white font-medium w-28 flex-shrink-0 truncate">{item.label}</span>
              <span className="text-[10px] font-mono text-teal-400/70 w-24 flex-shrink-0">{item.sec}</span>
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400" style={{ width: `${item.pct}%` }} />
              </div>
              <span className="text-xs font-black text-teal-400 w-8 text-right flex-shrink-0">{item.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'talento',
    label: 'Talento',
    icon: '👥',
    desc: 'Gestión centralizada de contratos, tarjetas profesionales y hojas de vida del equipo clínico.',
    content: (
      <div className="flex h-full flex-col p-3 gap-3">
        <div className="text-sm font-bold text-white">Talento Humano · Gestión de Personal</div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { num: '8', label: 'Personal activo', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' },
            { num: '2', label: 'Docs por vencer', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            { num: '6', label: 'Al día',           color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-2.5 border ${s.bg}`}>
              <div className={`text-xl font-black ${s.color}`}>{s.num}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
          {[
            { name: 'Dr. Gómez Rueda',      cargo: 'Médico general',   status: 'ok',      vence: 'Mar 2027' },
            { name: 'Enf. Ramírez López',    cargo: 'Jefe de enfermería', status: 'alerta',  vence: 'Nov 2026' },
            { name: 'Dr. Vargas Herrera',    cargo: 'Odontólogo',       status: 'ok',      vence: 'Jun 2027' },
            { name: 'Aux. Torres Medina',    cargo: 'Auxiliar clínica',  status: 'vencido', vence: 'Oct 2026' },
          ].map(p => (
            <div key={p.name} className="bg-slate-800/60 border border-white/5 rounded-lg px-3 py-2 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-600 to-cyan-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {p.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{p.name}</div>
                <div className="text-[10px] text-slate-400">{p.cargo}</div>
              </div>
              <div className="text-[10px] text-slate-500 flex-shrink-0">{p.vence}</div>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.status === 'ok' ? 'bg-emerald-400' : p.status === 'alerta' ? 'bg-amber-400' : 'bg-red-400'}`} />
            </div>
          ))}
        </div>
      </div>
    ),
  },
] as const;

// ─── Demo Video ────────────────────────────────────────────────────────────────
function DemoVideo() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="mb-10">
      <div className="relative w-full rounded-2xl overflow-hidden border border-teal-200 shadow-xl shadow-teal-50 bg-slate-950">
        {!playing ? (
          <button
            onClick={() => setPlaying(true)}
            className="w-full aspect-video flex flex-col items-center justify-center gap-5 group"
            style={{ background: 'linear-gradient(135deg, #0f2027 0%, #0d3d3d 50%, #134e4a 100%)' }}
          >
            {/* Animated glow */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <div className="w-96 h-96 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, #14b8a6, transparent)' }} />
            </div>
            {/* Play button */}
            <div className="relative w-20 h-20 rounded-full bg-teal-500 flex items-center justify-center shadow-2xl shadow-teal-500/50 group-hover:scale-110 group-hover:bg-teal-400 transition-all duration-300">
              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <div className="relative text-center">
              <p className="text-white font-black text-xl mb-1">Ver demo completo de NormaLis</p>
              <p className="text-teal-300 text-sm">Recorrido de 15 módulos · ~3 min · Sin registro</p>
            </div>
          </button>
        ) : (
          <iframe
            src="/normalis-demo-video.html"
            className="w-full aspect-video"
            title="Demo NormaLis"
            allowFullScreen
          />
        )}
      </div>
      {!playing && (
        <p className="text-center text-xs text-slate-400 mt-3">
          Auditoría · PAMEC · IA Normativa · CAPAs · Talento · Vencimientos · ISO 7101 · JCI · SG-SST · Documentos · y más
        </p>
      )}
    </div>
  );
}

function ProductPreview() {
  const [active, setActive] = useState(0);

  return (
    <section className="py-20 px-5 bg-white" id="preview">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <span className="inline-block bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
            La app en acción
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">
            Mira NormaLis por dentro
          </h2>
          <p className="text-slate-500 text-lg max-w-xl">
            Diseñada para coordinadores de calidad y directores de IPS — sin curva de aprendizaje.
          </p>
        </div>

        {/* Video demo */}
        <DemoVideo />

        {/* Screen tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {SCREENS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActive(i)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                active === i
                  ? 'bg-teal-500 text-white shadow-lg shadow-teal-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Screen preview */}
        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-xl">
          {/* Browser chrome */}
          <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-1 text-xs text-slate-400 mx-3 max-w-xs">
              app.normalis.co · {SCREENS[active].label}
            </div>
          </div>
          {/* App content */}
          <div
            className="h-80 transition-all"
            style={{ background: 'linear-gradient(135deg, #0f2027 0%, #0d3d3d 60%, #134e4a 100%)' }}
          >
            {SCREENS[active].content}
          </div>
          {/* Caption */}
          <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">{SCREENS[active].desc}</p>
            <a
              href="https://normalis.co/login.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-teal-600 hover:text-teal-500 flex items-center gap-1 flex-shrink-0 ml-4"
            >
              Ver en vivo →
            </a>
          </div>
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
      features: ['1 sede · 2 usuarios', 'Auditoría Res. 1732/2026 básica', 'Generador de documentos (5 plantillas)', 'Calendario de vencimientos', 'Dashboard de cumplimiento'],
      popular: false, cta: 'Solicitar demo',
      iconBg: 'from-slate-400 to-slate-600',
      boldUrlAnnual: 'https://checkout.bold.co/payment/LNK_QX9QJBBLWW',
      boldUrlMonthly: 'https://checkout.bold.co/payment/LNK_QH7C9QNC61',
    },
    {
      name: 'Profesional',
      monthly: '$399K', annual: '$332K',
      desc: 'Para IPS multi-servicio con equipo de calidad.',
      features: ['1 sede · 5 usuarios', 'Auditoría completa Res. 1732/2026 — 780 criterios', 'Todos los documentos + firma digital', 'PAMEC e indicadores Res. 256', 'CAPAs + Talento Humano', 'Consentimientos informados', 'PQRS, incidentes y bitácora', 'SG-SST Res. 0312/2019', 'Comparador ISO 7101 / JCI', 'Chat IA normativo', 'Soporte prioritario'],
      popular: true, cta: 'Solicitar demo',
      iconBg: 'from-teal-400 to-teal-600',
      boldUrlAnnual: 'https://checkout.bold.co/payment/LNK_RG2A6L92PU',
      boldUrlMonthly: 'https://checkout.bold.co/payment/LNK_JTRUHD363J',
    },
    {
      name: 'Enterprise',
      monthly: 'A la medida', annual: 'A la medida',
      desc: 'Para redes de IPS, clínicas y hospitales.',
      features: ['Sedes ilimitadas', 'Usuarios ilimitados', 'Todo el plan Profesional', 'Integraciones a la medida', 'SLA garantizado', 'Capacitación presencial', 'Soporte dedicado 24/7'],
      popular: false, cta: 'Hablar con ventas',
      iconBg: 'from-blue-400 to-indigo-600',
      boldUrlAnnual: null,
      boldUrlMonthly: null,
    },
  ];

  return (
    <section className="py-20 px-5 bg-slate-50" id="precios">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <span className="inline-block bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">Precios</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">Precios transparentes para IPS en Colombia</h2>
          <p className="text-slate-500 text-lg">Cancela cuando quieras. Sin letra pequeña.</p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm font-medium ${!annual ? 'text-slate-900' : 'text-slate-400'}`}>Mensual</span>
          <button
            onClick={() => setAnnual(a => !a)}
            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-teal-500' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all ${annual ? 'left-6' : 'left-0.5'}`} />
          </button>
          <span className={`text-sm font-medium ${annual ? 'text-slate-900' : 'text-slate-400'}`}>
            Anual <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full ml-1">2 meses gratis</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(p => (
            <div key={p.name} className={`relative rounded-2xl overflow-hidden flex flex-col transition-all duration-200 ${
              p.popular
                ? 'shadow-2xl shadow-teal-200 scale-105 border-2 border-teal-400'
                : 'border border-slate-200 bg-white hover:shadow-lg'
            }`}>
              {p.popular && (
                <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white text-xs font-bold text-center py-2 tracking-wider uppercase">
                  ⭐ Más popular
                </div>
              )}
              <div className={`p-7 flex flex-col flex-1 ${p.popular ? 'bg-white' : 'bg-white'}`}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.iconBg} mb-4 shadow-md`} />
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{p.name}</div>
                <div className="mb-1">
                  <span className="text-4xl font-black text-slate-900">{annual ? p.annual : p.monthly}</span>
                  {p.monthly !== 'A la medida' && <span className="text-slate-400 text-sm"> COP/mes</span>}
                </div>
                <p className="text-sm text-slate-500 mb-6 border-b border-slate-100 pb-4">{p.desc}</p>
                <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-teal-500 font-bold flex-shrink-0 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                {/* Botón primario: anual → Bold.co checkout | mensual → registro */}
                <a
                  href={
                    p.monthly === 'A la medida'
                      ? 'mailto:hola@normalis.co?subject=NormaLis%20Enterprise'
                      : annual
                        ? (p.boldUrlAnnual ?? 'https://fjfc1984-bit.github.io/normalis/registro.html')
                        : (p.boldUrlMonthly ?? 'https://fjfc1984-bit.github.io/normalis/registro.html')
                  }
                  target={p.monthly !== 'A la medida' ? '_blank' : undefined}
                  rel={p.monthly !== 'A la medida' ? 'noopener noreferrer' : undefined}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-all text-center block mb-2 ${
                    p.popular
                      ? 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white shadow-lg shadow-teal-200'
                      : 'bg-teal-500 hover:bg-teal-400 text-white shadow-sm'
                  }`}
                >
                  {p.monthly === 'A la medida' ? '📩 Hablar con ventas' : 'Empezar ahora →'}
                </a>
                {/* Botón secundario: Solicitar demo */}
                <button
                  onClick={onDemo}
                  className="w-full py-2.5 rounded-xl text-sm font-medium transition-all text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-slate-200"
                >
                  {p.monthly === 'A la medida' ? '' : 'Ver demo primero'}
                </button>
              </div>
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
      color: 'from-teal-500 to-teal-700',
    },
    {
      text: 'El chat normativo es increíble. Preguntamos sobre los requisitos de RETHUS y en segundos teníamos la respuesta exacta con la referencia normativa.',
      name: 'Ing. Jorge Martínez',
      role: 'Coord. Calidad IPS · Medellín',
      initials: 'JM',
      color: 'from-blue-500 to-indigo-600',
    },
    {
      text: 'Las alertas de vencimientos cambiaron todo. Ya no perdemos habilitaciones por una tarjeta profesional vencida. NormaLis se convirtió en parte de nuestra operación.',
      name: 'Dra. Lucía Herrera',
      role: 'Gerente IPS · Cali',
      initials: 'LH',
      color: 'from-violet-500 to-purple-600',
    },
  ];
  return (
    <section className="py-20 px-5 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <span className="inline-block bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">Testimonios</span>
          <h2 className="text-3xl font-black text-slate-900">IPS que ya confían en NormaLis</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map(t => (
            <div key={t.name} className="bg-slate-50 border border-slate-200 rounded-2xl p-7 hover:shadow-lg transition-shadow relative overflow-hidden">
              <div className="text-6xl font-black text-teal-100 leading-none absolute top-4 right-6 select-none">&ldquo;</div>
              <div className="text-amber-400 text-sm mb-4 relative z-10">★★★★★</div>
              <p className="text-sm text-slate-600 leading-relaxed mb-6 relative z-10 italic">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-black text-sm shadow-lg`}>
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
    <div className="relative py-24 px-5 text-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f2027 0%, #134e4a 50%, #0c2340 100%)' }}>
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #14b8a6, transparent)' }} />
      {/* Grid */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-teal-500/20 border border-teal-500/30 text-teal-300 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
          Demo gratuita · Sin tarjeta · Sin compromiso
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
          ¿Tu IPS está lista para<br />la próxima visita?
        </h2>
        <p className="text-slate-300 mb-10 text-lg">
          Solicita una demo gratuita y te mostramos cómo NormaLis se adapta a tu tipo de prestador en menos de 30 minutos.
        </p>
        <button
          onClick={onDemo}
          className="bg-teal-500 hover:bg-teal-400 text-white px-10 py-4 rounded-xl text-lg font-bold transition-all hover:-translate-y-1 shadow-xl shadow-teal-500/40"
        >
          🚀 Solicitar demo gratuita
        </button>
      </div>
    </div>
  );
}

// ─── FAQ ───────────────────────────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const faqs = [
    { q: '¿NormaLis aplica para todo tipo de IPS?', a: 'Sí. NormaLis cubre prestadores de baja, mediana y alta complejidad. La auditoría interna filtra los criterios según el tipo de prestador (consultorios, clínicas, hospitales) conforme a la Res. 1732/2026.' },
    { q: '¿Necesito instalar algo?', a: 'No. NormaLis es 100% web. Funciona desde cualquier navegador moderno en computador, tablet o celular. También puedes instalarlo como PWA en Android e iOS para acceso offline.' },
    { q: '¿Los documentos generados tienen validez legal?', a: 'Los documentos generados son plantillas normativas personalizadas con los datos de tu IPS. Debes revisarlos, ajustarlos a tu realidad institucional y firmarlos antes de presentarlos ante el ente habilitador.' },
    { q: '¿Cómo funciona el período de prueba?', a: 'Puedes solicitar una demo guiada completamente gratuita. Durante la demo te mostramos la plataforma completa con los datos de tu tipo de IPS. Sin tarjeta de crédito, sin compromiso.' },
    { q: '¿Qué pasa si necesito soporte técnico?', a: 'Todos los planes incluyen soporte por email y WhatsApp en horario laboral. El plan Profesional incluye soporte prioritario y Enterprise incluye soporte dedicado 24/7.' },
  ];
  return (
    <section className="bg-slate-50 py-20 px-5" id="faq">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <span className="inline-block bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">FAQ</span>
          <h2 className="text-3xl font-black text-slate-900">Preguntas frecuentes</h2>
        </div>
        <div className="flex flex-col gap-3">
          {faqs.map((f, i) => (
            <div key={i} className={`bg-white rounded-2xl overflow-hidden border transition-all duration-200 ${open === i ? 'border-teal-300 shadow-md' : 'border-slate-200'}`}>
              <button
                className="w-full text-left px-6 py-5 font-semibold text-slate-900 flex justify-between items-center hover:text-teal-600 transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span>{f.q}</span>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ml-4 transition-all ${open === i ? 'bg-teal-500 text-white rotate-180' : 'bg-slate-100 text-slate-400'}`}>
                  ▾
                </span>
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
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
    <footer style={{ background: '#0f1a1a' }} className="text-white py-16 px-5">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="font-black text-2xl mb-3">Norma<span className="text-teal-400">Lis</span></div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs mb-4">
              Software colombiano de habilitación y calidad para IPS. Cumplimiento de Resolución 1732/2026 (reemplaza Res. 3100/2019).
            </p>
            <div className="flex gap-2 flex-wrap">
              {['Res. 1732/2026', 'Res. 256/2016', 'PAMEC'].map(b => (
                <span key={b} className="bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs px-3 py-1 rounded-full">
                  {b}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Producto</h4>
            <div className="flex flex-col gap-2.5">
              {['#funcionalidades', '#como-funciona', '#precios', '#faq'].map((href, i) => (
                <a key={href} href={href} className="text-sm text-slate-400 hover:text-white transition-colors">
                  {['Funcionalidades', 'Cómo funciona', 'Precios', 'FAQ'][i]}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Legal</h4>
            <div className="flex flex-col gap-2.5">
              <a href="https://normalis.co/terminos.html" className="text-sm text-slate-400 hover:text-white transition-colors">Términos y condiciones</a>
              <a href="https://normalis.co/politica-privacidad.html" className="text-sm text-slate-400 hover:text-white transition-colors">Política de privacidad</a>
              <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">Ingresar a la app</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-slate-500">
          <span>© 2026 NormaLis · Todos los derechos reservados · Hecho en Colombia 🇨🇴</span>
          <span className="text-teal-500/60">normalis.co</span>
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-xl">✕</button>

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
            <h3 className="text-xl font-black text-slate-900 mb-2">¡Listo! Te contactamos pronto</h3>
            <p className="text-sm text-slate-500">Revisa tu correo. Te enviaremos los detalles de la demo en las próximas horas.</p>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-lg mb-4 shadow-lg shadow-teal-200">🚀</div>
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
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all placeholder:text-slate-300"
                  />
                </div>
              ))}
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-teal-200 mt-1"
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
      <CrosswalkSection />
      <HowItWorks />
      <ProductPreview />
      <Pricing onDemo={() => setDemoOpen(true)} />
      <Testimonials />
      <CTABand onDemo={() => setDemoOpen(true)} />
      <FAQ />
      <Footer />
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}
