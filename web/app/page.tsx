'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const TYPING_WORDS = ['la habilitación.','el PAMEC.','la visita de la Supersalud.','los vencimientos.','la Res. 1732/2026.','el SG-SST.','la seguridad del paciente.'];

// ── 3D Canvas Hero Network ──────────────────────────────────────────────────
const MODULE_NODES = [
  { label: '🔍', name: 'Auditoría' },
  { label: '📈', name: 'PAMEC' },
  { label: '✓',  name: 'CAPAs' },
  { label: '📊', name: 'Indicadores' },
  { label: '🤖', name: 'IA Normativa' },
  { label: '📅', name: 'Vencimientos' },
  { label: '🦺', name: 'SG-SST' },
  { label: '📬', name: 'PQRS' },
  { label: '🛡️', name: 'Incidentes' },
  { label: '📋', name: 'Bitácora' },
  { label: '👥', name: 'Talento' },
  { label: '📄', name: 'Documentos' },
  { label: '✍️', name: 'Firma' },
  { label: '📝', name: 'Consentimientos' },
  { label: '🔄', name: 'ISO/JCI' },
  { label: '⚡', name: 'Cumplimiento' },
  { label: '📱', name: 'PWA' },
  { label: '🆕', name: 'Brecha 1732' },
];

function HeroCanvas({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const nodesRef  = useRef<{ x: number; y: number; z: number; vx: number; vy: number; vz: number; label: string }[]>([]);
  const timeRef   = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialise nodes in 3D space
    nodesRef.current = MODULE_NODES.map(m => ({
      x:  (Math.random() - 0.5) * 800,
      y:  (Math.random() - 0.5) * 500,
      z:  (Math.random() - 0.5) * 600,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.2,
      vz: (Math.random() - 0.5) * 0.15,
      label: m.label,
    }));

    const project = (x: number, y: number, z: number, w: number, h: number, mx: number, my: number) => {
      const fov = 600;
      const tiltX = (my - 0.5) * 0.3;
      const tiltY = (mx - 0.5) * 0.3;
      const cosX = Math.cos(tiltX), sinX = Math.sin(tiltX);
      const cosY = Math.cos(tiltY), sinY = Math.sin(tiltY);
      const y1 = y * cosX - z * sinX;
      const z1 = y * sinX + z * cosX;
      const x2 = x * cosY + z1 * sinY;
      const z2 = -x * sinY + z1 * cosY;
      const scale = fov / (fov + z2 + 400);
      return {
        sx: w / 2 + x2 * scale,
        sy: h / 2 + y1 * scale,
        scale,
        z: z2,
      };
    };

    const draw = () => {
      timeRef.current += 0.003;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const nodes = nodesRef.current;
      // Drift
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy; n.z += n.vz;
        if (Math.abs(n.x) > 450) n.vx *= -1;
        if (Math.abs(n.y) > 280) n.vy *= -1;
        if (Math.abs(n.z) > 350) n.vz *= -1;
      });

      // Project all
      const projected = nodes.map(n =>
        project(n.x + Math.sin(timeRef.current + n.z * 0.01) * 20,
                n.y + Math.cos(timeRef.current + n.x * 0.01) * 15,
                n.z, w, h, mouseX, mouseY)
      );

      // Draw connections
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const a = projected[i], b = projected[j];
          const dist = Math.hypot(a.sx - b.sx, a.sy - b.sy);
          if (dist < 180) {
            const alpha = (1 - dist / 180) * 0.35;
            ctx.beginPath();
            ctx.moveTo(a.sx, a.sy);
            ctx.lineTo(b.sx, b.sy);
            ctx.strokeStyle = `rgba(0,188,212,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      projected.forEach((p, i) => {
        const r = Math.max(6, 16 * p.scale);
        const glow = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r * 2.5);
        glow.addColorStop(0,   `rgba(0,188,212,${0.6 * p.scale})`);
        glow.addColorStop(0.4, `rgba(0,137,123,${0.25 * p.scale})`);
        glow.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,188,212,${0.5 + 0.3 * p.scale})`;
        ctx.fill();

        // Label emoji
        ctx.font = `${Math.max(10, 18 * p.scale)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(nodes[i].label, p.sx, p.sy);
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [mouseX, mouseY]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.85 }}
    />
  );
}

// ── 3D Tilt Card ─────────────────────────────────────────────────────────────
function Card3D({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    card.style.transform = `perspective(700px) rotateY(${x * 16}deg) rotateX(${-y * 12}deg) translateZ(8px)`;
    card.style.boxShadow = `${-x * 20}px ${y * 20}px 40px rgba(0,188,212,0.18), 0 8px 32px rgba(0,0,0,0.15)`;
  }, []);

  const handleLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(700px) rotateY(0deg) rotateX(0deg) translateZ(0px)';
    card.style.boxShadow = '';
  }, []);

  return (
    <div
      ref={cardRef}
      className={className}
      style={{ ...style, transition: 'transform 0.15s ease, box-shadow 0.15s ease', transformStyle: 'preserve-3d', willChange: 'transform' }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onDemo }: { onDemo: () => void }) {
  const [scrolled, setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const navLinks = [
    { href: '#funcionalidades', label: 'Módulos' },
    { href: '#crosswalk',       label: 'ISO / JCI' },
    { href: '#como-funciona',   label: 'Cómo funciona' },
    { href: '#precios',         label: 'Precios' },
    { href: '#faq',             label: 'FAQ' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 font-black text-xl">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm"
               style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)', boxShadow: '0 0 12px rgba(0,188,212,.4)' }}>N</div>
          <span className={scrolled ? 'text-slate-900' : 'text-white'}>Norma</span>
          <span className="text-teal-400">Lis</span>
        </a>
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map(l => (
            <a key={l.href} href={l.href} className={`text-sm font-medium transition-colors ${scrolled ? 'text-slate-600 hover:text-teal-600' : 'text-white/80 hover:text-white'}`}>
              {l.label}
            </a>
          ))}
          <Link href="/login" className={`text-sm font-medium transition-colors ${scrolled ? 'text-slate-600 hover:text-teal-600' : 'text-white/80 hover:text-white'}`}>
            Ingresar
          </Link>
          <button onClick={onDemo}
            className="text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-lg"
            style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)', boxShadow: '0 0 16px rgba(0,188,212,.35)' }}>
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
            <a key={l.href} href={l.href} className="text-slate-700 text-sm font-medium" onClick={() => setMobileOpen(false)}>{l.label}</a>
          ))}
          <Link href="/login" className="text-slate-700 text-sm font-medium">Ingresar</Link>
          <button onClick={() => { onDemo(); setMobileOpen(false); }}
            className="text-white px-5 py-2.5 rounded-lg text-sm font-bold w-full"
            style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)' }}>
            Solicitar demo gratis
          </button>
        </div>
      )}
    </nav>
  );
}

// ── Hero 3D ───────────────────────────────────────────────────────────────────
function Hero({ onDemo }: { onDemo: () => void }) {
  const [typedText, setTypedText] = useState('');
  const [wordIdx, setWordIdx]     = useState(0);
  const [charIdx, setCharIdx]     = useState(0);
  const [deleting, setDeleting]   = useState(false);
  const [mouseX, setMouseX]       = useState(0.5);
  const [mouseY, setMouseY]       = useState(0.5);

  useEffect(() => {
    const word  = TYPING_WORDS[wordIdx];
    const delay = deleting ? 40 : charIdx === word.length ? 1800 : 65;
    const t = setTimeout(() => {
      if (!deleting && charIdx < word.length) { setTypedText(word.slice(0, charIdx + 1)); setCharIdx(c => c + 1); }
      else if (!deleting && charIdx === word.length) { setDeleting(true); }
      else if (deleting && charIdx > 0) { setTypedText(word.slice(0, charIdx - 1)); setCharIdx(c => c - 1); }
      else { setDeleting(false); setWordIdx(i => (i + 1) % TYPING_WORDS.length); }
    }, delay);
    return () => clearTimeout(t);
  }, [charIdx, deleting, wordIdx]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMouseX((e.clientX - r.left) / r.width);
    setMouseY((e.clientY - r.top)  / r.height);
  }, []);

  return (
    <section
      className="relative min-h-screen flex items-center justify-center pt-16 pb-20 overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 30% 40%, #0d3d3d 0%, #0f2027 45%, #0c1a30 100%)' }}
      onMouseMove={handleMouseMove}
    >
      {/* 3D Node Network Canvas */}
      <HeroCanvas mouseX={mouseX} mouseY={mouseY} />

      {/* Dark overlay gradient */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, transparent 30%, rgba(12,26,48,0.6) 100%)' }} />

      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
           style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.15) 1px,transparent 1px)', backgroundSize: '50px 50px' }} />

      <div className="relative z-10 max-w-5xl mx-auto px-5 text-center">
        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-8 backdrop-blur-sm"
             style={{ background: 'rgba(0,188,212,.12)', border: '1px solid rgba(0,188,212,.3)', color: '#67e8f9', boxShadow: '0 0 20px rgba(0,188,212,.15)' }}>
          🏥 Software colombiano · Res. 1732/2026
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6"
            style={{ textShadow: '0 0 60px rgba(0,188,212,.2)' }}>
          Tu IPS, lista para<br />
          <span style={{ background: 'linear-gradient(90deg,#26A69A,#00BCD4,#67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {typedText}<span className="animate-pulse" style={{ WebkitTextFillColor: '#00BCD4' }}>|</span>
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          NormaLis automatiza la gestión de calidad y el cumplimiento normativo —
          ahorrando <strong className="text-white">más de 200 horas al año</strong> y reduciendo el riesgo de sanciones.
        </p>

        <div className="flex gap-4 justify-center flex-wrap mb-12">
          <button onClick={onDemo}
            className="text-white px-8 py-4 rounded-xl text-base font-bold transition-all hover:-translate-y-1 hover:scale-105"
            style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)', boxShadow: '0 0 30px rgba(0,188,212,.45), 0 8px 24px rgba(0,0,0,.3)' }}>
            🚀 Solicitar demo gratis
          </button>
          <Link href="/demo"
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-4 rounded-xl text-base font-semibold transition-all hover:-translate-y-1 backdrop-blur-sm">
            ▶ Ver demo en vivo
          </Link>
        </div>

        {/* Floating badges */}
        <div className="flex justify-center gap-2 flex-wrap mb-14">
          {['19 módulos activos','Res. 1732/2026','ISO 7101:2023','JCI 8ª ed.','IA normativa 24/7','Benchmarking IPS'].map((b, i) => (
            <span key={b}
              className="text-xs px-3 py-1.5 rounded-full font-medium backdrop-blur-sm"
              style={i < 3
                ? { background: 'rgba(0,188,212,.12)', border: '1px solid rgba(0,188,212,.3)', color: '#67e8f9', boxShadow: '0 0 8px rgba(0,188,212,.1)' }
                : { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.55)' }
              }>
              {b}
            </span>
          ))}
        </div>

        {/* 3D App Mockup */}
        <div className="max-w-3xl mx-auto" style={{ perspective: '1200px' }}>
          <div className="rounded-2xl overflow-hidden shadow-2xl"
               style={{ border: '1px solid rgba(0,188,212,.2)', transform: 'rotateX(6deg)', boxShadow: '0 40px 80px rgba(0,0,0,.6), 0 0 60px rgba(0,188,212,.15)' }}>
            {/* Browser bar */}
            <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(10,20,35,.95)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div className="w-3 h-3 rounded-full bg-red-400/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
              <div className="w-3 h-3 rounded-full bg-green-400/70" />
              <span className="flex-1 text-center text-xs text-slate-400 rounded px-3 py-1 mx-3"
                    style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }}>
                app.normalis.co · Dashboard
              </span>
            </div>
            {/* Dashboard UI */}
            <div className="p-5 grid grid-cols-4 gap-4 min-h-52" style={{ background: 'rgba(8,18,32,.92)' }}>
              <div className="col-span-1 rounded-xl p-3 flex flex-col gap-2"
                   style={{ background: 'rgba(0,137,123,.12)', border: '1px solid rgba(0,188,212,.15)' }}>
                <div className="text-xs font-black mb-2 pb-2" style={{ color: '#26A69A', borderBottom: '1px solid rgba(0,188,212,.12)' }}>NormaLis</div>
                {['⊞ Dashboard','🔍 Auditoría','⚡ Cumplimiento','📊 Benchmarking'].map((item, i) => (
                  <div key={i} className="text-xs px-2 py-1.5 rounded-lg"
                       style={i === 0 ? { background: 'linear-gradient(135deg,#00897B,#00BCD4)', color: 'white' } : { color: 'rgba(128,203,196,.7)' }}>
                    {item}
                  </div>
                ))}
              </div>
              <div className="col-span-3 flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { num: '94', label: 'Score habilitación', color: '#26A69A' },
                    { num: '12', label: 'Días para visita',   color: '#F59E0B' },
                    { num: 'P87', label: 'Percentil mercado', color: '#A78BFA' },
                  ].map((s, i) => (
                    <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                      <div className="text-2xl font-black" style={{ color: s.color }}>{s.num}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.4)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl p-4 flex-1" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                  <div className="text-xs font-bold mb-3" style={{ color: 'rgba(255,255,255,.6)' }}>📊 Cumplimiento por estándar</div>
                  {[
                    { label: 'Talento Hum.', pct: 94, color: '#26A69A' },
                    { label: 'Infraestructura', pct: 81, color: '#F59E0B' },
                    { label: 'Procesos clave', pct: 68, color: '#F87171' },
                    { label: 'Dotación',       pct: 88, color: '#34D399' },
                  ].map((b, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <span className="text-xs w-24 flex-shrink-0" style={{ color: 'rgba(255,255,255,.4)' }}>{b.label}</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.08)' }}>
                        <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: b.color }} />
                      </div>
                      <span className="text-xs font-bold w-8 text-right" style={{ color: b.color }}>{b.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Compliance band ───────────────────────────────────────────────────────────
function ComplianceBand() {
  const pills = ['Res. 1732/2026','Res. 256/2016 · PAMEC','RETHUS · REPS','ISO 31000:2018','Res. 1774/2025 · SG-SST','ISO 7101:2023 · JCI'];
  return (
    <div style={{ background: '#f0fdfa', borderTop: '1px solid #ccfbf1', borderBottom: '1px solid #ccfbf1' }} className="py-7 px-5">
      <p className="text-center text-xs text-teal-600 uppercase tracking-widest mb-5 font-bold">Compatible con normativa oficial colombiana</p>
      <div className="flex justify-center flex-wrap gap-3">
        {pills.map(p => (
          <span key={p} className="text-xs font-semibold px-4 py-1.5 rounded-full"
                style={{ background: 'white', border: '1px solid #99f6e4', color: '#0f766e', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            ✓ {p}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function Stats() {
  const stats = [
    { num: '780',  suf: '+', label: 'criterios de auditoría en 22 modalidades',       icon: '📋' },
    { num: '19',   suf: '',  label: 'módulos activos en la plataforma',                icon: '⊞' },
    { num: '3',    suf: '',  label: 'marcos normativos: Res. 1732 · ISO 7101 · JCI',  icon: '🔄' },
    { num: '200',  suf: '+', label: 'horas ahorradas al año en gestión de calidad',   icon: '⏱️' },
    { num: '50',   suf: '%', label: 'más rápido en informes y CAPAs',                 icon: '🚀' },
    { num: '100',  suf: '%', label: 'en línea, sin instalación, desde cualquier dispositivo', icon: '☁️' },
  ];
  return (
    <div className="py-20 px-5" style={{ background: 'linear-gradient(135deg,#134e4a 0%,#0f2027 100%)' }}>
      <div className="max-w-5xl mx-auto">
        <p className="text-center text-xs font-bold uppercase tracking-widest mb-12" style={{ color: '#80CBC4' }}>NormaLis en números</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {stats.map(s => (
            <Card3D key={s.label}
              className="rounded-2xl p-6 text-center cursor-default"
              style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)' }}>
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-4xl md:text-5xl font-black text-white mb-2">
                {s.num}<span style={{ color: '#26A69A' }}>{s.suf}</span>
              </div>
              <div className="text-sm leading-relaxed" style={{ color: '#80CBC4' }}>{s.label}</div>
            </Card3D>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Problems ──────────────────────────────────────────────────────────────────
function Problems() {
  const problems = [
    { icon: '📋', title: 'No saben qué documentos necesitan',   desc: 'La Res. 1732/2026 exige más de 50 documentos según el tipo de prestador. Sin guía, siempre falta algo.', col: '#ef4444' },
    { icon: '⏰', title: 'Se enteran tarde de los vencimientos', desc: 'Tarjetas profesionales, vacunas, contratos — nadie lleva el control y la habilitación se pierde por un documento vencido.', col: '#f97316' },
    { icon: '🔍', title: 'No se auditan antes de la visita',    desc: 'La primera vez que saben qué les falta es cuando llega el ente habilitador. Para entonces, es muy tarde.', col: '#eab308' },
    { icon: '📉', title: 'No miden ni mejoran',                 desc: 'Sin indicadores de calidad (Res. 256/2016) ni PAMEC activo, el establecimiento no puede demostrar mejora continua.', col: '#ec4899' },
  ];
  return (
    <section className="py-20 px-5 bg-white">
      <div className="max-w-5xl mx-auto">
        <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
              style={{ background: '#fff1f2', color: '#e11d48' }}>El problema</span>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">Habilitarse es difícil.<br />Mantenerse habilitado, más.</h2>
        <p className="text-slate-500 text-lg mb-10 max-w-xl">Las IPS pequeñas pierden habilitaciones por falta de documentación, no por mala atención.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {problems.map(p => (
            <Card3D key={p.title}
              className="bg-white rounded-2xl p-6 relative overflow-hidden cursor-default"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,.07)', border: '1px solid #f1f5f9' }}>
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: p.col }} />
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4"
                   style={{ background: p.col + '18', border: `1px solid ${p.col}30` }}>
                {p.icon}
              </div>
              <h3 className="font-bold text-slate-900 mb-2 text-lg">{p.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{p.desc}</p>
            </Card3D>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features 3D ───────────────────────────────────────────────────────────────
function Features() {
  const features = [
    { icon: '🔍', title: 'Auditoría Interna',            tag: 'Res. 1732/2026',       desc: '780 criterios en 22 modalidades. Score al instante + plan de mejora automático.', grad: 'linear-gradient(135deg,#00897B,#00BCD4)' },
    { icon: '⚡', title: 'Agente de Cumplimiento IA',    tag: 'Gemini · Tiempo real', desc: 'Analiza sus no conformidades con IA y genera planes de acción priorizados.', grad: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
    { icon: '🆕', title: 'Análisis Brecha 1732',         tag: 'Nueva norma',          desc: 'Mapa exacto de qué le exige la nueva resolución vs. dónde está su IPS hoy.', grad: 'linear-gradient(135deg,#0891b2,#06b6d4)' },
    { icon: '📈', title: 'PAMEC Digital',                tag: 'Ciclos PHVA',          desc: 'Autoevaluación, planes de mejoramiento y seguimiento con dashboard de ciclos.', grad: 'linear-gradient(135deg,#7c3aed,#a855f7)' },
    { icon: '✓',  title: 'CAPAs',                        tag: 'Mejora continua',      desc: 'Acciones correctivas y preventivas con responsables, fechas y evidencias.', grad: 'linear-gradient(135deg,#059669,#34d399)' },
    { icon: '📊', title: 'Indicadores de Calidad',       tag: 'Res. 256/2016',        desc: 'Trazadores con semáforo: satisfacción, eventos adversos, reingresos y más.', grad: 'linear-gradient(135deg,#0284c7,#38bdf8)' },
    { icon: '📊', title: 'Benchmarking IPS',             tag: 'Comparativo mercado',  desc: 'Compare su score contra otras IPS similares. Sepa en qué percentil está.', grad: 'linear-gradient(135deg,#d97706,#fbbf24)' },
    { icon: '📅', title: 'Control de Vencimientos',      tag: 'Alertas automáticas',  desc: 'Alertas antes de que venzan tarjetas profesionales, vacunas y certificaciones.', grad: 'linear-gradient(135deg,#b45309,#f59e0b)' },
    { icon: '🦺', title: 'SG-SST',                       tag: 'Res. 1774/2025',       desc: 'Autoevaluación en 3 fases. Score automático y PDF para presentar ante la ARL.', grad: 'linear-gradient(135deg,#c2410c,#f97316)' },
    { icon: '🔔', title: 'Simulacros',                   tag: 'Drills de emergencia', desc: 'Checklist digital de simulacros con registro, fotos y evidencias firmadas.', grad: 'linear-gradient(135deg,#0f766e,#14b8a6)' },
    { icon: '📄', title: 'Generador de Documentos',      tag: 'Firma digital',        desc: 'Manual de Bioseguridad, Plan de Residuos, Protocolos — listos en minutos.', grad: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' },
    { icon: '📬', title: 'PQRS Integrado',               tag: 'Peticiones y quejas',  desc: 'Registra, clasifica y gestiona PQR. Reportes para auditorías al instante.', grad: 'linear-gradient(135deg,#166534,#22c55e)' },
    { icon: '🛡️', title: 'Incidentes y Eventos',        tag: 'Seguridad del paciente',desc: 'Registro con clasificación por severidad, seguimiento y plan documentado.', grad: 'linear-gradient(135deg,#991b1b,#f87171)' },
    { icon: '📋', title: 'Bitácora de Auditoría',        tag: 'Trazabilidad total',   desc: 'Registro automático de todas las acciones: auditorías, CAPAs, documentos.', grad: 'linear-gradient(135deg,#374151,#6b7280)' },
    { icon: '👥', title: 'Talento Humano',               tag: 'Gestión de personal',  desc: 'Hojas de vida, contratos, tarjetas profesionales del equipo clínico centralizadas.', grad: 'linear-gradient(135deg,#0e7490,#22d3ee)' },
    { icon: '✍️', title: 'Firma y Versiones',            tag: 'Control documental',   desc: 'Firma digital, control de versiones y quién aprobó cada cambio.', grad: 'linear-gradient(135deg,#4338ca,#818cf8)' },
    { icon: '📝', title: 'Consentimientos Informados',   tag: 'Habeas Data · Ley 1581',desc: 'Plantillas por especialidad, historial firmado y trazabilidad documental.', grad: 'linear-gradient(135deg,#5b21b6,#a78bfa)' },
    { icon: '🔄', title: 'Comparador ISO 7101 / JCI',    tag: 'Crosswalk normativo',  desc: 'Cruza los 7 estándares colombianos con ISO 7101:2023 y JCI 8ª edición.', grad: 'linear-gradient(135deg,#0f4c81,#38bdf8)' },
    { icon: '🤖', title: 'Asistente IA Normativo',       tag: 'Gemini + RAG',         desc: 'Chat con la norma en lenguaje natural. Respuestas citadas y precisas 24/7.', grad: 'linear-gradient(135deg,#be185d,#f472b6)' },
  ];

  return (
    <section className="py-20 px-5" style={{ background: '#f8fafc' }} id="funcionalidades">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
                style={{ background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4' }}>
            19 Módulos activos
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">
            Gestión de calidad integral<br />en un solo lugar
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Todo lo que tu IPS necesita para cumplir la normativa y estar lista para cualquier visita.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(f => (
            <Card3D
              key={f.title}
              className="relative bg-white rounded-2xl p-6 cursor-default overflow-hidden group"
              style={{ border: '1px solid #e2e8f0' }}
            >
              {/* Top gradient bar */}
              <div className="absolute top-0 left-0 right-0 h-0.5 opacity-70 group-hover:opacity-100 transition-opacity"
                   style={{ background: f.grad }} />
              {/* Subtle background glow on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl"
                   style={{ background: 'radial-gradient(ellipse at top left, rgba(0,188,212,.04), transparent 60%)' }} />

              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4 relative"
                   style={{ background: f.grad, boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}>
                {f.icon}
              </div>
              <h3 className="font-bold text-slate-900 mb-2 text-sm relative">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4 relative">{f.desc}</p>
              <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full relative"
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>
                ✓ {f.tag}
              </span>
            </Card3D>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── ISO / JCI Crosswalk ──────────────────────────────────────────────────────
function CrosswalkSection() {
  const estandares = [
    { label: 'Talento Humano',        iso: '§5.3 · §7.2 · §7.3', isoScore: 88, jci: 'SQE · QPS.3',   jciScore: 82 },
    { label: 'Infraestructura',       iso: '§7.1 · §8.1',         isoScore: 79, jci: 'FMS.1 · FMS.4', jciScore: 71 },
    { label: 'Dotación',              iso: '§7.1.5 · §8.5',       isoScore: 83, jci: 'FMS.8 · AOP.5', jciScore: 78 },
    { label: 'Procesos Prioritarios', iso: '§8.5 · §8.7',         isoScore: 91, jci: 'COP.1 · IPSG',  jciScore: 87 },
    { label: 'Historia Clínica',      iso: '§7.5 · §8.2',         isoScore: 85, jci: 'MCI.1 · MOI.11',jciScore: 80 },
  ];
  return (
    <section className="py-20 px-5 relative overflow-hidden" id="crosswalk"
      style={{ background: 'linear-gradient(135deg,#0f2027 0%,#0d3d3d 50%,#134e4a 100%)' }}>
      <div className="pointer-events-none absolute left-0 top-1/2 w-64 h-64 rounded-full blur-3xl"
           style={{ background: 'radial-gradient(circle,#00BCD4,transparent)', opacity: 0.1 }} />
      <div className="max-w-5xl mx-auto relative">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
                  style={{ background: 'rgba(0,188,212,.1)', border: '1px solid rgba(0,188,212,.3)', color: '#67e8f9' }}>
              🔄 Crosswalk normativo
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight">
              Tu IPS en estándares<br />
              <span style={{ background: 'linear-gradient(90deg,#26A69A,#00BCD4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                internacionales
              </span>
            </h2>
            <p className="text-slate-400 text-base max-w-lg">
              NormaLis cruza automáticamente los 7 estándares con <strong className="text-white">ISO 7101:2023</strong> y <strong className="text-white">JCI 8ª edición</strong>.
            </p>
          </div>
          <div className="flex gap-4 shrink-0">
            {[{val:'~82%',label:'equiv. ISO 7101',col:'#26A69A'},{val:'~75%',label:'equiv. JCI 8ª ed.',col:'#A78BFA'}].map(s => (
              <Card3D key={s.label} className="text-center p-4 rounded-2xl cursor-default"
                style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}>
                <p className="text-3xl font-black" style={{ color: s.col }}>{s.val}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.4)' }}>{s.label}</p>
              </Card3D>
            ))}
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,.1)' }}>
          <div className="grid grid-cols-12 text-xs font-bold uppercase tracking-widest px-5 py-3"
               style={{ background: 'rgba(255,255,255,.05)', borderBottom: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.4)' }}>
            <span className="col-span-3">Estándar Res. 1732/2026</span>
            <span className="col-span-3">ISO 7101:2023</span>
            <span className="col-span-2 text-center">Equiv.</span>
            <span className="col-span-3">JCI 8ª ed.</span>
            <span className="col-span-1 text-center">JCI</span>
          </div>
          {estandares.map((e, i) => (
            <div key={e.label} className="grid grid-cols-12 items-center px-5 py-4 text-sm transition-colors hover:bg-white/5"
                 style={{ borderBottom: i < estandares.length - 1 ? '1px solid rgba(255,255,255,.06)' : 'none', background: 'rgba(0,0,0,.15)' }}>
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
          Disponible en el módulo <strong className="text-white/50">Comparador Normativo</strong> · Plan Profesional y Enterprise
        </p>
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: '01', title: 'Registra tu IPS',      desc: 'Ingresa NIT, código REPS, tipo de prestador y datos básicos. Solo toma 2 minutos.', icon: '🏥' },
    { n: '02', title: 'Realiza la auditoría', desc: 'Responde los criterios por segmentos. Obtén tu score y lista de no conformidades.', icon: '🔍' },
    { n: '03', title: 'Genera tus documentos',desc: 'Un clic y tienes el Manual de Bioseguridad, Plan de Residuos y más — listos para firmar.', icon: '📄' },
    { n: '04', title: 'Monitorea y mejora',   desc: 'El Agente IA analiza tus resultados, crea CAPAs y mide tu evolución semana a semana.', icon: '📊' },
  ];
  return (
    <section className="py-20 px-5 bg-white" id="como-funciona">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12 text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
                style={{ background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4' }}>Cómo funciona</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">De cero a habilitado<br />en 4 pasos</h2>
          <p className="text-slate-500 text-lg">Sin instalaciones, sin capacitaciones largas. Empieza hoy.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5"
               style={{ background: 'linear-gradient(90deg,#00BCD4,#26A69A,#00BCD4)' }} />
          {steps.map((s, i) => (
            <Card3D key={s.n} className="text-center cursor-default">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 relative z-10"
                   style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)', boxShadow: '0 8px 24px rgba(0,188,212,.35)' }}>
                {s.icon}
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-900 text-[10px] font-black text-white flex items-center justify-center"
                      style={{ border: '2px solid #00BCD4' }}>{s.n}</span>
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{s.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </Card3D>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
function Pricing({ onDemo }: { onDemo: () => void }) {
  const plans = [
    {
      name: 'Básico', price: '99.000', highlight: false,
      desc: 'Para consultorios y IPS pequeñas que necesitan arrancar.',
      features: ['Auditoría Res. 1732/2026','PAMEC básico','Control de vencimientos','1 usuario','Soporte por email'],
      cta: 'Empezar',
    },
    {
      name: 'Profesional', price: '199.000', highlight: true,
      desc: 'El más elegido por clínicas y centros médicos.',
      features: ['Todo lo del Básico','SG-SST completo','CAPAs + Indicadores','Benchmarking IPS','Brecha 1732','Hasta 5 usuarios','Soporte prioritario'],
      cta: 'El más popular',
    },
    {
      name: 'Enterprise', price: '299.000', highlight: false,
      desc: 'Para hospitales y redes de IPS que exigen lo máximo.',
      features: ['Todo lo del Profesional','IA normativa 24/7','Agente de Cumplimiento','ISO 7101 / JCI Crosswalk','Usuarios ilimitados','API + integraciones','Gerente de cuenta dedicado'],
      cta: 'Contactar ventas',
    },
  ];
  return (
    <section className="py-20 px-5" id="precios"
      style={{ background: 'linear-gradient(180deg,#f8fafc 0%,#f0fdfa 100%)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-12 text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
                style={{ background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4' }}>Precios</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">Planes para cada IPS</h2>
          <p className="text-slate-500 text-lg">Todos incluyen actualizaciones cuando cambia la normativa.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {plans.map(p => (
            <Card3D key={p.name}
              className={`rounded-2xl p-7 cursor-default relative overflow-hidden ${p.highlight ? 'ring-2 ring-teal-400' : ''}`}
              style={p.highlight
                ? { background: 'linear-gradient(145deg,#0f2027,#134e4a)', color: 'white', transform: 'scale(1.04)' }
                : { background: 'white', border: '1px solid #e2e8f0' }
              }>
              {p.highlight && (
                <div className="absolute top-0 left-0 right-0 h-1"
                     style={{ background: 'linear-gradient(90deg,#26A69A,#00BCD4)' }} />
              )}
              {p.highlight && (
                <span className="absolute top-4 right-4 text-[10px] font-black px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(0,188,212,.15)', color: '#67e8f9', border: '1px solid rgba(0,188,212,.3)' }}>
                  ⭐ MÁS POPULAR
                </span>
              )}
              <h3 className={`text-lg font-black mb-1 ${p.highlight ? 'text-white' : 'text-slate-900'}`}>{p.name}</h3>
              <p className={`text-xs mb-4 ${p.highlight ? 'text-slate-400' : 'text-slate-500'}`}>{p.desc}</p>
              <div className="mb-6">
                <span className={`text-4xl font-black ${p.highlight ? 'text-white' : 'text-slate-900'}`}>
                  ${p.price}
                </span>
                <span className={`text-sm ml-1 ${p.highlight ? 'text-slate-400' : 'text-slate-400'}`}>/mes COP</span>
              </div>
              <ul className="space-y-2.5 mb-7">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span style={{ color: p.highlight ? '#26A69A' : '#0f766e' }}>✓</span>
                    <span className={p.highlight ? 'text-slate-300' : 'text-slate-600'}>{f}</span>
                  </li>
                ))}
              </ul>
              <button onClick={onDemo}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                style={p.highlight
                  ? { background: 'linear-gradient(135deg,#00897B,#00BCD4)', color: 'white', boxShadow: '0 0 20px rgba(0,188,212,.3)' }
                  : { background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4' }
                }>
                {p.cta}
              </button>
            </Card3D>
          ))}
        </div>
        <p className="text-center text-sm text-slate-400 mt-8">
          ¿Tienes una red de IPS o más de 10 sedes? <button onClick={onDemo} className="text-teal-600 font-bold hover:underline">Cotización especial →</button>
        </p>
      </div>
    </section>
  );
}

// ── FAQ ────────────────────────────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const faqs = [
    { q: '¿NormaLis ya tiene la Resolución 1732/2026?', a: 'Sí. La Res. 1732 fue publicada el 5 de agosto de 2026 y reemplazó a la 3100/2019 y sus modificaciones. NormaLis ya está actualizado con todos los nuevos criterios, incluyendo Telemedicina, IHCE y el Plan de Adecuación Progresiva.' },
    { q: '¿Sirve para todos los tipos de IPS?', a: 'Sí. NormaLis cubre 22 modalidades de servicios: consultorios, clínicas, hospitales de primer y segundo nivel, centros de imágenes, laboratorios, odontología, medicina estética y más.' },
    { q: '¿Necesito instalar algo?', a: 'No. NormaLis funciona 100% en el navegador. También puedes instalarlo como app en tu celular (iOS/Android) y usarlo sin internet en campo — sincroniza cuando recuperes conexión.' },
    { q: '¿Qué pasa cuando cambia la normativa?', a: 'Nada — NormaLis se actualiza automáticamente. Todos los planes incluyen actualizaciones normativas sin costo adicional.' },
    { q: '¿Puedo empezar hoy mismo?', a: 'Sí. Crea tu cuenta en minutos en normalis.co/registro. Si tienes un código de activación, el acceso es inmediato. Sin código, un asesor te contacta en menos de 24 horas.' },
    { q: '¿Mis datos están seguros?', a: 'Sí. Los datos se almacenan en Google Cloud (Firebase), cifrados en tránsito y en reposo. Cumplimos con la Ley Estatutaria 1581/2012 (Habeas Data) y nunca compartimos datos con terceros.' },
  ];
  return (
    <section className="py-20 px-5 bg-white" id="faq">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12 text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
                style={{ background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4' }}>Preguntas frecuentes</span>
          <h2 className="text-3xl font-black text-slate-900">Lo que siempre nos preguntan</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
                onClick={() => setOpen(open === i ? null : i)}>
                <span className="text-sm pr-4">{f.q}</span>
                <span className="text-teal-500 flex-shrink-0 text-lg">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed" style={{ background: '#f8fafc' }}>
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

// ── CTA Final ──────────────────────────────────────────────────────────────────
function CTASection({ onDemo }: { onDemo: () => void }) {
  return (
    <section className="py-24 px-5 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #0d3d3d 0%, #0f2027 60%, #0c1a30 100%)' }}>
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl"
           style={{ background: 'radial-gradient(circle,#00BCD4,transparent)', opacity: 0.15 }} />
      <div className="max-w-3xl mx-auto text-center relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-8"
             style={{ background: 'rgba(0,188,212,.12)', border: '1px solid rgba(0,188,212,.3)', color: '#67e8f9' }}>
          🚀 Empieza hoy — sin tarjeta de crédito
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight"
            style={{ textShadow: '0 0 40px rgba(0,188,212,.2)' }}>
          Su IPS lista para<br />
          <span style={{ background: 'linear-gradient(90deg,#26A69A,#00BCD4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            cualquier visita
          </span>
        </h2>
        <p className="text-slate-300 text-lg mb-10 max-w-lg mx-auto">
          Únase a las IPS colombianas que ya gestionan su habilitación con NormaLis.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <button onClick={onDemo}
            className="text-white px-10 py-4 rounded-xl text-base font-bold transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)', boxShadow: '0 0 40px rgba(0,188,212,.45), 0 8px 24px rgba(0,0,0,.3)' }}>
            🚀 Solicitar demo gratis
          </button>
          <Link href="/registro"
            className="text-white border border-white/20 px-10 py-4 rounded-xl text-base font-semibold transition-all hover:bg-white/10 backdrop-blur-sm">
            Crear cuenta →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: '#060f1a', borderTop: '1px solid rgba(255,255,255,.06)' }} className="px-5 py-12">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs"
                 style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)' }}>N</div>
            <span className="font-black text-white text-base">NormaLis</span>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,.3)' }}>Software colombiano de habilitación IPS · Res. 1732/2026</p>
        </div>
        <div className="flex items-center gap-6 text-xs" style={{ color: 'rgba(255,255,255,.35)' }}>
          <Link href="/terminos" className="hover:text-white transition-colors">Términos</Link>
          <Link href="/politica-privacidad" className="hover:text-white transition-colors">Privacidad</Link>
          <Link href="/login" className="hover:text-white transition-colors">Ingresar</Link>
          <Link href="/registro" className="hover:text-white transition-colors">Registrarse</Link>
        </div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,.2)' }}>© 2026 NormaLis · normalis.co</p>
      </div>
    </footer>
  );
}

// ── Demo Modal ─────────────────────────────────────────────────────────────────
function DemoModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ nombre: '', ips: '', email: '', tel: '' });
  const [sent, setSent]   = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || !form.email) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'leads'), { ...form, fuente: 'landing-demo', creadoEn: serverTimestamp() });
      setSent(true);
    } catch { setSent(true); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md rounded-2xl p-8 relative" style={{ background: '#0f1f2e', border: '1px solid rgba(0,188,212,.2)', boxShadow: '0 0 60px rgba(0,188,212,.15)' }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors text-xl">✕</button>
        {sent ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">🚀</div>
            <h3 className="text-xl font-black text-white mb-2">¡Recibido!</h3>
            <p className="text-slate-400 text-sm">Le contactamos en menos de 24 horas para agendar su demo.</p>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-black text-white mb-1">Solicitar demo gratis</h3>
            <p className="text-slate-400 text-sm mb-6">20 minutos · Sin compromiso · Solo para IPS en Colombia</p>
            <form onSubmit={submit} className="space-y-4">
              {[
                { key: 'nombre', label: 'Su nombre completo', ph: 'Dr. Juan Pérez', req: true },
                { key: 'ips',    label: 'Nombre de la IPS',   ph: 'Clínica XYZ',   req: false },
                { key: 'email',  label: 'Correo electrónico', ph: 'correo@ips.com', req: true },
                { key: 'tel',    label: 'WhatsApp / Teléfono',ph: '300 000 0000',   req: false },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">{f.label}</label>
                  <input
                    type={f.key === 'email' ? 'email' : 'text'}
                    placeholder={f.ph}
                    required={f.req}
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:ring-2"
                    style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', focusRingColor: '#00BCD4' }}
                  />
                </div>
              ))}
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white mt-2 transition-all hover:scale-[1.02] disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)', boxShadow: '0 0 20px rgba(0,188,212,.3)' }}>
                {loading ? 'Enviando...' : '🚀 Solicitar demo gratis'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <>
      <Navbar onDemo={() => setShowDemo(true)} />
      <Hero   onDemo={() => setShowDemo(true)} />
      <ComplianceBand />
      <Stats />
      <Problems />
      <Features />
      <CrosswalkSection />
      <HowItWorks />
      <Pricing   onDemo={() => setShowDemo(true)} />
      <FAQ />
      <CTASection onDemo={() => setShowDemo(true)} />
      <Footer />
      {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}
    </>
  );
}
