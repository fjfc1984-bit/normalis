'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const TYPING_WORDS = ['la habilitación.','el PAMEC.','la visita de la Supersalud.','los vencimientos.','la Res. 1732/2026.','el SG-SST.','la seguridad del paciente.'];

// ── Hook: contador animado ────────────────────────────────────────────────────
function useCounter(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(ease * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return count;
}

// ── Hook: intersection observer ───────────────────────────────────────────────
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ── 3D Tilt Card ──────────────────────────────────────────────────────────────
function Card3D({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${x*14}deg) rotateX(${-y*10}deg) translateZ(10px)`;
    el.style.boxShadow = `${-x*18}px ${y*18}px 40px rgba(0,188,212,.15)`;
  }, []);
  const onLeave = useCallback(() => {
    const el = ref.current; if (!el) return;
    el.style.transform = '';
    el.style.boxShadow = '';
  }, []);
  return (
    <div ref={ref} className={className} style={{ ...style, transition: 'transform .15s ease, box-shadow .15s ease', willChange: 'transform' }}
         onMouseMove={onMove} onMouseLeave={onLeave}>{children}</div>
  );
}

// ── Hero Canvas: partículas + nodos ──────────────────────────────────────────
function ParticleCanvas({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const N = 55;
    const nodes = Array.from({ length: N }, (_, i) => ({
      x: Math.random() * 1200, y: Math.random() * 700,
      vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .3,
      r: 1.5 + Math.random() * 3,
      pulse: Math.random() * Math.PI * 2,
      icon: i < 19 ? ['🔍','📈','✓','📊','🤖','📅','🦺','📬','🛡️','📋','👥','📄','✍️','📝','🔄','⚡','📱','🆕','⊞'][i] : null,
    }));

    const draw = () => {
      tRef.current += .008;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      nodes.forEach(n => {
        n.x += n.vx + (mouseX - .5) * .08;
        n.y += n.vy + (mouseY - .5) * .06;
        if (n.x < 0) n.x = w; if (n.x > w) n.x = 0;
        if (n.y < 0) n.y = h; if (n.y > h) n.y = 0;
      });

      // Conexiones
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx*dx + dy*dy);
          if (d < 160) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(0,188,212,${(1 - d/160) * .22})`;
            ctx.lineWidth = .8;
            ctx.stroke();
          }
        }
      }

      // Nodos
      nodes.forEach(n => {
        const glow = .6 + .4 * Math.sin(tRef.current * 2 + n.pulse);
        if (n.icon) {
          const sz = n.r * 5;
          const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, sz * 3);
          g.addColorStop(0, `rgba(0,188,212,${.3 * glow})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.beginPath(); ctx.arc(n.x, n.y, sz * 3, 0, Math.PI * 2);
          ctx.fillStyle = g; ctx.fill();
          ctx.font = `${sz * 1.4}px serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.globalAlpha = .7 * glow;
          ctx.fillText(n.icon, n.x, n.y);
          ctx.globalAlpha = 1;
        } else {
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,188,212,${.35 * glow})`;
          ctx.fill();
        }
      });

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(rafRef.current); };
  }, [mouseX, mouseY]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ opacity: .9 }} />;
}

// ── Dashboard 3D SVG ──────────────────────────────────────────────────────────
function Dashboard3D() {
  const bars = [92, 78, 65, 88, 71, 84];
  const colors = ['#26A69A','#00BCD4','#F59E0B','#34D399','#A78BFA','#F87171'];
  return (
    <div style={{ perspective: '1400px' }} className="w-full max-w-3xl mx-auto">
      <div className="rounded-2xl overflow-hidden"
           style={{ transform: 'rotateX(8deg) rotateY(-2deg)', transformStyle: 'preserve-3d',
                    border: '1px solid rgba(0,188,212,.25)',
                    boxShadow: '0 60px 120px rgba(0,0,0,.7), 0 0 80px rgba(0,188,212,.12), inset 0 1px 0 rgba(255,255,255,.06)' }}>
        {/* Barra del browser */}
        <div className="flex items-center gap-2 px-4 py-3"
             style={{ background: 'rgba(8,16,28,.97)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
          </div>
          <div className="flex-1 mx-3 px-3 py-1 rounded text-xs text-center"
               style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)', color: 'rgba(255,255,255,.35)' }}>
            app.normalis.co/dashboard
          </div>
          <div className="w-4 h-4 rounded-full" style={{ background: 'rgba(0,188,212,.3)' }} />
        </div>

        {/* App body */}
        <div className="grid grid-cols-12 min-h-80" style={{ background: 'rgba(6,12,24,.95)' }}>
          {/* Sidebar */}
          <div className="col-span-2 p-3 flex flex-col gap-1"
               style={{ borderRight: '1px solid rgba(255,255,255,.05)', background: 'rgba(0,20,15,.4)' }}>
            <div className="text-[9px] font-black mb-2 pb-1 flex items-center gap-1"
                 style={{ color: '#26A69A', borderBottom: '1px solid rgba(0,188,212,.1)' }}>
              <div className="w-3 h-3 rounded flex items-center justify-center text-[7px]"
                   style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)' }}>N</div>
              Norma<span style={{ color: '#00BCD4' }}>Lis</span>
            </div>
            {[['⊞','Dashboard'],['🔍','Auditoría'],['⚡','Cumplim.'],['📊','Benchmark'],['📈','PAMEC'],['✓','CAPAs']].map(([ic, lb], i) => (
              <div key={lb} className="text-[8px] px-1.5 py-1 rounded flex items-center gap-1"
                   style={i === 0
                     ? { background: 'linear-gradient(135deg,#00897B60,#00BCD440)', color: '#26A69A', fontWeight: 700 }
                     : { color: 'rgba(128,203,196,.5)' }}>
                <span>{ic}</span><span className="hidden sm:inline">{lb}</span>
              </div>
            ))}
          </div>

          {/* Main */}
          <div className="col-span-10 p-4 flex flex-col gap-3">
            {/* KPI row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { val: '94%', label: 'Score', color: '#26A69A', icon: '🏆' },
                { val: 'P87', label: 'Percentil', color: '#A78BFA', icon: '📊' },
                { val: '12d', label: 'Visita', color: '#F59E0B', icon: '⏰' },
                { val: '3 NC', label: 'Alertas', color: '#F87171', icon: '⚠️' },
              ].map(k => (
                <div key={k.label} className="rounded-xl p-2"
                     style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                  <div className="text-[9px] mb-0.5" style={{ color: 'rgba(255,255,255,.3)' }}>{k.icon} {k.label}</div>
                  <div className="text-base font-black" style={{ color: k.color }}>{k.val}</div>
                </div>
              ))}
            </div>

            {/* Chart + table */}
            <div className="grid grid-cols-5 gap-2 flex-1">
              {/* Bar chart */}
              <div className="col-span-2 rounded-xl p-3"
                   style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)' }}>
                <div className="text-[8px] font-bold mb-2" style={{ color: 'rgba(255,255,255,.4)' }}>Cumplimiento por estándar</div>
                <div className="flex items-end gap-1.5 h-16">
                  {bars.map((b, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full rounded-t transition-all" style={{ height: `${b}%`, background: `${colors[i]}`, opacity: .85 }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="col-span-3 rounded-xl p-3"
                   style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)' }}>
                <div className="text-[8px] font-bold mb-2" style={{ color: 'rgba(255,255,255,.4)' }}>No conformidades recientes</div>
                {[
                  { std: 'Talento Humano', item: 'Vacuna Hep-B vencida', sev: 'Media', col: '#F59E0B' },
                  { std: 'Infraestructura', item: 'Ruta evacuación sin señal', sev: 'Alta', col: '#F87171' },
                  { std: 'Dotación', item: 'Mantenimiento vencido', sev: 'Baja', col: '#34D399' },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-2 py-1"
                       style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                    <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ background: row.col }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[7px] font-bold truncate" style={{ color: 'rgba(255,255,255,.6)' }}>{row.item}</div>
                      <div className="text-[6px]" style={{ color: 'rgba(255,255,255,.25)' }}>{row.std}</div>
                    </div>
                    <div className="text-[7px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                         style={{ background: `${row.col}20`, color: row.col }}>{row.sev}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom: AI response */}
            <div className="rounded-xl p-2.5 flex items-start gap-2"
                 style={{ background: 'rgba(0,188,212,.06)', border: '1px solid rgba(0,188,212,.15)' }}>
              <div className="w-4 h-4 rounded flex items-center justify-center text-[8px] flex-shrink-0"
                   style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)' }}>🤖</div>
              <div className="text-[8px] leading-relaxed" style={{ color: 'rgba(128,203,196,.8)' }}>
                <strong style={{ color: '#26A69A' }}>Agente Pilar:</strong> Detecté 3 no conformidades prioritarias. Sugiero iniciar CAPA para vacuna Hep-B antes de la visita del 28/08. ¿Genero el plan de acción?
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onDemo }: { onDemo: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);
  const links = [
    ['#modulos','Módulos'],['#crosswalk','ISO/JCI'],['#como-funciona','Cómo funciona'],['#precios','Precios'],['#nosotros','Nosotros'],
  ];
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/96 backdrop-blur-xl shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5 font-black text-xl">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm"
               style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)', boxShadow: '0 0 16px rgba(0,188,212,.4)' }}>N</div>
          <span className={scrolled ? 'text-slate-900' : 'text-white'}>Norma</span>
          <span style={{ color: '#00BCD4' }}>Lis</span>
        </a>
        <div className="hidden md:flex items-center gap-8">
          {links.map(([h, l]) => (
            <a key={h} href={h} className={`text-sm font-medium transition-colors ${scrolled ? 'text-slate-600 hover:text-teal-600' : 'text-white/75 hover:text-white'}`}>{l}</a>
          ))}
          <Link href="/login" className={`text-sm font-medium ${scrolled ? 'text-slate-600 hover:text-teal-600' : 'text-white/75 hover:text-white'}`}>Ingresar</Link>
          <button onClick={onDemo} className="text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)', boxShadow: '0 0 20px rgba(0,188,212,.35)' }}>
            Demo gratis
          </button>
        </div>
        <button className={`md:hidden p-2 ${scrolled ? 'text-slate-700' : 'text-white'}`} onClick={() => setMobile(m => !m)}>{mobile ? '✕' : '☰'}</button>
      </div>
      {mobile && (
        <div className="md:hidden bg-white border-t px-5 py-4 flex flex-col gap-3">
          {links.map(([h, l]) => <a key={h} href={h} className="text-slate-700 text-sm font-medium" onClick={() => setMobile(false)}>{l}</a>)}
          <Link href="/login" className="text-slate-700 text-sm">Ingresar</Link>
          <button onClick={() => { onDemo(); setMobile(false); }} className="text-white py-3 rounded-xl font-bold"
                  style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)' }}>Demo gratis</button>
        </div>
      )}
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ onDemo }: { onDemo: () => void }) {
  const [typed, setTyped] = useState('');
  const [wi, setWi] = useState(0);
  const [ci, setCi] = useState(0);
  const [del, setDel] = useState(false);
  const [mx, setMx] = useState(.5);
  const [my, setMy] = useState(.5);

  useEffect(() => {
    const w = TYPING_WORDS[wi];
    const delay = del ? 40 : ci === w.length ? 1800 : 65;
    const t = setTimeout(() => {
      if (!del && ci < w.length) { setTyped(w.slice(0, ci + 1)); setCi(c => c + 1); }
      else if (!del) { setDel(true); }
      else if (ci > 0) { setTyped(w.slice(0, ci - 1)); setCi(c => c - 1); }
      else { setDel(false); setWi(i => (i + 1) % TYPING_WORDS.length); }
    }, delay);
    return () => clearTimeout(t);
  }, [ci, del, wi]);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 pb-24 overflow-hidden"
             style={{ background: 'radial-gradient(ellipse 120% 80% at 50% -10%, #0a2540 0%, #061018 55%, #030a10 100%)' }}
             onMouseMove={e => {
               const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
               setMx((e.clientX - r.left) / r.width);
               setMy((e.clientY - r.top) / r.height);
             }}>
      <ParticleCanvas mouseX={mx} mouseY={my} />
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(0,188,212,.08) 0%, transparent 70%)' }} />

      <div className="relative z-10 max-w-5xl mx-auto px-5 text-center mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-8"
             style={{ background: 'rgba(0,188,212,.1)', border: '1px solid rgba(0,188,212,.25)', color: '#67e8f9' }}>
          🏥 Software colombiano de habilitación · Res. 1732/2026
        </div>

        <h1 className="text-5xl md:text-[72px] font-black text-white leading-[1.05] mb-6 tracking-tight"
            style={{ textShadow: '0 0 80px rgba(0,188,212,.15)' }}>
          Tu IPS, lista para<br />
          <span style={{ background: 'linear-gradient(90deg,#26A69A 0%,#00BCD4 50%,#67e8f9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {typed}<span className="animate-pulse" style={{ WebkitTextFillColor: '#00BCD4' }}>|</span>
          </span>
        </h1>

        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: 'rgba(255,255,255,.6)' }}>
          Automatiza auditorías, PAMEC, SG-SST, vencimientos y cumplimiento normativo.<br />
          <strong className="text-white">Más de 200 horas ahorradas al año</strong> por IPS.
        </p>

        <div className="flex gap-4 justify-center flex-wrap mb-12">
          <button onClick={onDemo} className="text-white px-8 py-4 rounded-xl font-bold transition-all hover:-translate-y-1 hover:scale-105"
                  style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)', boxShadow: '0 0 40px rgba(0,188,212,.4), 0 12px 30px rgba(0,0,0,.4)' }}>
            🚀 Solicitar demo gratis
          </button>
          <Link href="/demo" className="text-white px-8 py-4 rounded-xl font-semibold transition-all hover:-translate-y-1 backdrop-blur-sm"
                style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)' }}>
            ▶ Ver demo en vivo
          </Link>
        </div>

        <div className="flex justify-center flex-wrap gap-2">
          {['20 módulos','Res. 1732/2026','ISO 7101 · JCI','IA Normativa 24/7','Benchmarking','Sin instalación'].map((t, i) => (
            <span key={t} className="text-xs px-3 py-1.5 rounded-full font-medium"
                  style={i < 4
                    ? { background: 'rgba(0,188,212,.1)', border: '1px solid rgba(0,188,212,.2)', color: '#67e8f9' }
                    : { background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.4)' }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Dashboard 3D */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-5">
        <Dashboard3D />
      </div>
    </section>
  );
}

// ── Compliance Band ───────────────────────────────────────────────────────────
function ComplianceBand() {
  return (
    <div style={{ background: '#f0fdfa', borderTop: '1px solid #99f6e4', borderBottom: '1px solid #99f6e4' }} className="py-7 px-5">
      <p className="text-center text-[11px] text-teal-600 uppercase tracking-widest font-bold mb-5">
        Normativa oficial colombiana cubierta
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {['Res. 1732/2026 — Marco principal','Res. 256/2016 — Indicadores','Res. 2471/2022 · PROA','PAMEC · SOGCS','RETHUS · REPS','ISO 31000:2018 · Riesgo','Res. 1774/2025 · SG-SST','ISO 7101:2023 · JCI 8ª ed.','Ley 1581/2012 · Habeas Data'].map(p => (
          <span key={p} className="text-xs font-semibold px-4 py-1.5 rounded-full"
                style={{ background: 'white', border: '1px solid #99f6e4', color: '#0f766e', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            ✓ {p}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Stats animados ────────────────────────────────────────────────────────────
function Stats() {
  const { ref, inView } = useInView();
  const s1 = useCounter(780, 1800, inView);
  const s2 = useCounter(19, 1000, inView);
  const s3 = useCounter(200, 1500, inView);
  const s4 = useCounter(50, 1200, inView);
  const stats = [
    { val: s1, suf: '+', label: 'criterios de habilitación cubiertos', icon: '📋' },
    { val: s2, suf: '', label: 'módulos activos en la plataforma', icon: '⊞' },
    { val: s3, suf: '+', label: 'horas ahorradas al año por IPS', icon: '⏱️' },
    { val: s4, suf: '%', label: 'más rápido en informes y CAPAs', icon: '🚀' },
  ];
  return (
    <div ref={ref} className="py-20 px-5" style={{ background: 'linear-gradient(135deg,#0a2540 0%,#061018 100%)' }}>
      <div className="max-w-5xl mx-auto">
        <p className="text-center text-xs font-bold uppercase tracking-widest mb-12" style={{ color: '#4DB6AC' }}>
          NormaLis en números
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {stats.map((s, i) => (
            <Card3D key={i} className="rounded-2xl p-6 text-center cursor-default"
                    style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-4xl md:text-5xl font-black text-white">
                {s.val}<span style={{ color: '#26A69A' }}>{s.suf}</span>
              </div>
              <div className="text-xs mt-2 leading-relaxed" style={{ color: 'rgba(128,203,196,.65)' }}>{s.label}</div>
            </Card3D>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Módulos 3D ────────────────────────────────────────────────────────────────
function Modulos() {
  const { ref, inView } = useInView(.1);
  const features = [
    { icon: '🔍', title: 'Auditoría Interna',          tag: 'Res. 1732/2026',        desc: '780 criterios en 22 modalidades. Score al instante + plan de mejora automático.', g: 'linear-gradient(135deg,#00897B,#00BCD4)' },
    { icon: '⚡', title: 'Agente de Cumplimiento IA',  tag: 'IA · Tiempo real',      desc: 'Analiza no conformidades con IA y genera planes de acción priorizados.', g: 'linear-gradient(135deg,#5b21b6,#8b5cf6)' },
    { icon: '🆕', title: 'Análisis Brecha 1732',        tag: 'Nueva norma',           desc: 'Mapa exacto de qué exige la nueva resolución vs. dónde está su IPS hoy.', g: 'linear-gradient(135deg,#0284c7,#06b6d4)' },
    { icon: '📈', title: 'PAMEC Digital',               tag: 'Ciclos PHVA',           desc: 'Autoevaluación, planes de mejoramiento y seguimiento con dashboard de ciclos.', g: 'linear-gradient(135deg,#7c3aed,#a855f7)' },
    { icon: '✓',  title: 'CAPAs',                       tag: 'Mejora continua',       desc: 'Acciones correctivas y preventivas con responsables, fechas y evidencias.', g: 'linear-gradient(135deg,#065f46,#34d399)' },
    { icon: '📊', title: 'Indicadores de Calidad',      tag: 'Res. 256/2016',         desc: 'Trazadores con semáforo: satisfacción, eventos adversos, reingresos.', g: 'linear-gradient(135deg,#0369a1,#38bdf8)' },
    { icon: '📊', title: 'Benchmarking IPS',            tag: 'Comparativo mercado',   desc: 'Compare su score contra otras IPS similares en Colombia.', g: 'linear-gradient(135deg,#92400e,#fbbf24)' },
    { icon: '📅', title: 'Control de Vencimientos',     tag: 'Alertas automáticas',   desc: 'Alertas antes de que venzan tarjetas profesionales, vacunas y contratos.', g: 'linear-gradient(135deg,#78350f,#f59e0b)' },
    { icon: '🦺', title: 'SG-SST',                      tag: 'Res. 1774/2025',        desc: 'Autoevaluación en 3 fases. PDF para presentar ante la ARL.', g: 'linear-gradient(135deg,#7f1d1d,#f97316)' },
    { icon: '🔔', title: 'Simulacros',                  tag: 'Drills de emergencia',  desc: 'Checklist digital con registro, fotos y evidencias firmadas.', g: 'linear-gradient(135deg,#134e4a,#14b8a6)' },
    { icon: '📄', title: 'Generador de Documentos',     tag: 'Firma electrónica',     desc: 'Manual de Bioseguridad, Plan de Residuos, Protocolos — en minutos.', g: 'linear-gradient(135deg,#1e3a8a,#3b82f6)' },
    { icon: '📬', title: 'PQRS Integrado',              tag: 'Gestión de quejas',     desc: 'Registra, clasifica y gestiona PQR. Reportes al instante.', g: 'linear-gradient(135deg,#14532d,#22c55e)' },
    { icon: '🛡️', title: 'Incidentes y Eventos',       tag: 'Seguridad paciente',    desc: 'Registro con severidad, seguimiento y plan de acción documentado.', g: 'linear-gradient(135deg,#7f1d1d,#f87171)' },
    { icon: '📋', title: 'Bitácora de Auditoría',       tag: 'Trazabilidad total',    desc: 'Registro automático de todas las acciones: auditorías, CAPAs, documentos.', g: 'linear-gradient(135deg,#1e293b,#64748b)' },
    { icon: '👥', title: 'Talento Humano',              tag: 'Gestión de personal',   desc: 'Hojas de vida, contratos y tarjetas profesionales centralizadas.', g: 'linear-gradient(135deg,#0c4a6e,#22d3ee)' },
    { icon: '✍️', title: 'Firma y Versiones',           tag: '🆕 Sello HMAC',         desc: 'Firma electrónica con sello criptográfico del servidor (Ley 527/1999, Art. 7) y verificación de integridad del contenido firmado.', g: 'linear-gradient(135deg,#3730a3,#818cf8)' },
    { icon: '📝', title: 'Consentimientos',             tag: '🆕 Firma dibujada',     desc: 'Firma del paciente y del médico a mano en pantalla, sellada criptográficamente. Plantillas por especialidad y trazabilidad completa.', g: 'linear-gradient(135deg,#4c1d95,#a78bfa)' },
    { icon: '🔄', title: 'ISO 7101 / JCI Crosswalk',   tag: 'Crosswalk normativo',   desc: 'Cruza los 7 estándares colombianos con ISO 7101:2023 y JCI 8ª edición.', g: 'linear-gradient(135deg,#1e3a8a,#38bdf8)' },
    { icon: '🤖', title: 'Asistente IA Normativo',      tag: 'IA + RAG',              desc: 'Chat con la norma en lenguaje natural. Respuestas citadas 24/7.', g: 'linear-gradient(135deg,#831843,#f472b6)' },
    { icon: '💊', title: 'PROA',                           tag: 'Plan Profesional+',      desc: 'Res. 2471/2022 · Plan RAM 2025–2030. Checklist PROA, consumo DDD/100 camas-día, registro de intervenciones e informe mensual para el comité de infecciones.', g: 'linear-gradient(135deg,#064e3b,#10b981)' },
  ];
  return (
    <section ref={ref} className="py-24 px-5" style={{ background: '#f8fafc' }} id="modulos">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
                style={{ background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4' }}>20 Módulos activos</span>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-3 leading-tight">
            Todo lo que su IPS<br />necesita en un solo lugar
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Cumplimiento normativo completo — desde la auditoría inicial hasta el benchmarking contra el mercado.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, idx) => (
            <Card3D key={f.title}
              className="relative bg-white rounded-2xl p-6 cursor-default overflow-hidden group"
              style={{
                border: '1px solid #e2e8f0',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(30px)',
                transition: `opacity .5s ease ${idx * 30}ms, transform .5s ease ${idx * 30}ms`,
              }}>
              <div className="absolute top-0 left-0 right-0 h-0.5 opacity-80 group-hover:opacity-100 transition-opacity"
                   style={{ background: f.g }} />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl"
                   style={{ background: 'radial-gradient(ellipse at top left, rgba(0,188,212,.03), transparent 60%)' }} />
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg mb-4"
                   style={{ background: f.g, boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}>
                {f.icon}
              </div>
              <h3 className="font-bold text-slate-900 mb-1.5 text-sm">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">{f.desc}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
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

// ── ISO/JCI Crosswalk ─────────────────────────────────────────────────────────
function CrosswalkSection() {
  const estandares = [
    { label: 'Talento Humano',       iso: '§5.3 · §7.2',  isoScore: 88, jci: 'SQE · QPS.3',  jciScore: 82 },
    { label: 'Infraestructura',      iso: '§7.1 · §8.1',  isoScore: 79, jci: 'FMS.1 · FMS.4', jciScore: 71 },
    { label: 'Dotación',             iso: '§7.1.5 · §8.5',isoScore: 83, jci: 'FMS.8 · AOP.5', jciScore: 78 },
    { label: 'Procesos Prioritarios',iso: '§8.5 · §8.7',  isoScore: 91, jci: 'COP.1 · IPSG',  jciScore: 87 },
    { label: 'Historia Clínica',     iso: '§7.5 · §8.2',  isoScore: 85, jci: 'MCI.1 · MOI.11',jciScore: 80 },
  ];
  return (
    <section className="py-20 px-5 relative overflow-hidden" id="crosswalk"
             style={{ background: 'linear-gradient(135deg,#061018 0%,#0a2540 100%)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div>
            <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
                  style={{ background: 'rgba(0,188,212,.1)', border: '1px solid rgba(0,188,212,.25)', color: '#67e8f9' }}>
              🔄 Crosswalk normativo
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
              Su IPS en estándares<br />
              <span style={{ background: 'linear-gradient(90deg,#26A69A,#00BCD4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>internacionales</span>
            </h2>
            <p className="text-slate-400 max-w-lg">Cruza automáticamente los 7 estándares con <strong className="text-white">ISO 7101:2023</strong> y <strong className="text-white">JCI 8ª edición</strong>.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            {[{v:'~82%',l:'ISO 7101',c:'#26A69A'},{v:'~75%',l:'JCI 8ª ed.',c:'#A78BFA'}].map(s => (
              <Card3D key={s.l} className="text-center p-4 rounded-2xl cursor-default"
                      style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)' }}>
                <p className="text-2xl font-black" style={{ color: s.c }}>{s.v}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,.35)' }}>{s.l}</p>
              </Card3D>
            ))}
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,.09)' }}>
          <div className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-wider px-5 py-3"
               style={{ background: 'rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.07)', color: 'rgba(255,255,255,.35)' }}>
            <span className="col-span-3">Estándar</span><span className="col-span-3">ISO 7101:2023</span>
            <span className="col-span-2 text-center">Equiv.</span><span className="col-span-3">JCI 8ª ed.</span>
            <span className="col-span-1 text-center">JCI</span>
          </div>
          {estandares.map((e, i) => (
            <div key={e.label} className="grid grid-cols-12 items-center px-5 py-4 hover:bg-white/5 transition-colors"
                 style={{ background: 'rgba(0,0,0,.15)', borderBottom: i < 4 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
              <span className="col-span-3 font-semibold text-white text-xs">{e.label}</span>
              <span className="col-span-3 text-[11px] font-mono" style={{ color: '#80CBC4' }}>{e.iso}</span>
              <div className="col-span-2 flex flex-col items-center gap-1">
                <span className="font-black text-sm" style={{ color: '#26A69A' }}>{e.isoScore}%</span>
                <div className="w-full h-1 rounded-full" style={{ background: 'rgba(255,255,255,.1)' }}>
                  <div className="h-full rounded-full" style={{ width: `${e.isoScore}%`, background: 'linear-gradient(90deg,#26A69A,#00BCD4)' }} />
                </div>
              </div>
              <span className="col-span-3 text-[11px] font-mono" style={{ color: '#A78BFA' }}>{e.jci}</span>
              <div className="col-span-1 text-center font-black text-sm" style={{ color: '#A78BFA' }}>{e.jciScore}%</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Cómo funciona ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const { ref, inView } = useInView(.15);
  const steps = [
    { n: '01', icon: '🏥', title: 'Registra tu IPS', desc: 'NIT, código REPS, tipo de prestador. En 2 minutos estás dentro.' },
    { n: '02', icon: '🔍', title: 'Auditoría completa', desc: 'Responde los criterios por segmento. Score en tiempo real.' },
    { n: '03', icon: '📄', title: 'Genera documentos', desc: 'Manual de Bioseguridad, Plan de Residuos — en un clic.' },
    { n: '04', icon: '🤖', title: 'IA te guía', desc: 'El Agente Pilar crea CAPAs y mide tu evolución semana a semana.' },
  ];
  return (
    <section ref={ref} className="py-20 px-5 bg-white" id="como-funciona">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
                style={{ background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4' }}>Proceso</span>
          <h2 className="text-4xl font-black text-slate-900 mb-2">De cero a habilitado en 4 pasos</h2>
          <p className="text-slate-500 text-lg">Sin instalaciones. Sin capacitaciones. Empieza hoy.</p>
        </div>
        <div className="grid md:grid-cols-4 gap-6 relative">
          <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px"
               style={{ background: 'linear-gradient(90deg,transparent,#00BCD4,#26A69A,#00BCD4,transparent)' }} />
          {steps.map((s, i) => (
            <div key={s.n} className="text-center relative z-10"
                 style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(24px)',
                          transition: `all .5s ease ${i * 100}ms` }}>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 relative"
                   style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)', boxShadow: '0 8px 24px rgba(0,188,212,.3)' }}>
                {s.icon}
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-[10px] font-black text-white flex items-center justify-center"
                      style={{ background: '#0f2027', border: '2px solid #00BCD4' }}>{s.n}</span>
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

// ── Precios ───────────────────────────────────────────────────────────────────
function Precios({ onDemo }: { onDemo: () => void }) {
  const plans = [
    { name: 'Básico', price: '199.000', highlight: false,
      desc: 'Para consultorios y IPS pequeñas.',
      features: ['Auditoría Res. 1732/2026','PAMEC básico','Vencimientos','1 usuario','Soporte por email'],
      cta: 'Empezar' },
    { name: 'Profesional', price: '399.000', highlight: true,
      desc: 'El más elegido por clínicas y centros médicos.',
      features: ['Todo lo del Básico','SG-SST · CAPAs · Indicadores','PROA — Antimicrobianos','Benchmarking IPS','Brecha 1732','Hasta 5 usuarios','Soporte prioritario'],
      cta: '⭐ Más popular' },
    { name: 'Enterprise', price: 'Personalizado', highlight: false,
      desc: 'Para hospitales y redes de IPS.',
      features: ['Todo lo del Profesional','IA Normativa 24/7','Agente de Cumplimiento','ISO 7101 / JCI','Usuarios ilimitados','API + integraciones'],
      cta: 'Contactar ventas' },
  ];
  return (
    <section className="py-20 px-5" id="precios"
             style={{ background: 'linear-gradient(180deg,#f8fafc 0%,#f0fdfa 100%)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
                style={{ background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4' }}>Precios</span>
          <h2 className="text-4xl font-black text-slate-900 mb-2">Planes para cada IPS</h2>
          <p className="text-slate-500 text-lg">Actualizaciones automáticas cuando cambia la normativa.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 items-center">
          {plans.map(p => (
            <Card3D key={p.name} className="rounded-2xl p-7 relative overflow-hidden cursor-default"
                    style={p.highlight
                      ? { background: 'linear-gradient(145deg,#0a2540,#134e4a)', color: 'white', transform: 'scale(1.04)', border: '2px solid rgba(0,188,212,.4)' }
                      : { background: 'white', border: '1px solid #e2e8f0' }}>
              {p.highlight && <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg,#26A69A,#00BCD4)' }} />}
              <h3 className={`font-black text-lg mb-1 ${p.highlight ? 'text-white' : 'text-slate-900'}`}>{p.name}</h3>
              <p className={`text-xs mb-5 ${p.highlight ? 'text-slate-400' : 'text-slate-500'}`}>{p.desc}</p>
              <div className="mb-6">
                <span className={`text-4xl font-black ${p.highlight ? 'text-white' : 'text-slate-900'}`}>{p.price === 'Personalizado' ? '' : '$'}{p.price}</span>
                <span className={`text-sm ml-1 ${p.highlight ? 'text-slate-400' : 'text-slate-400'}`}>{p.price === 'Personalizado' ? 'a la medida' : '/mes COP'}</span>
              </div>
              <ul className="space-y-2.5 mb-7">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5" style={{ color: '#26A69A' }}>✓</span>
                    <span className={p.highlight ? 'text-slate-300' : 'text-slate-600'}>{f}</span>
                  </li>
                ))}
              </ul>
              <button onClick={onDemo} className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02]"
                      style={p.highlight
                        ? { background: 'linear-gradient(135deg,#00897B,#00BCD4)', color: 'white', boxShadow: '0 0 20px rgba(0,188,212,.3)' }
                        : { background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4' }}>
                {p.cta}
              </button>
            </Card3D>
          ))}
        </div>
        <p className="text-center text-sm text-slate-400 mt-8">
          ¿Red de IPS o más de 10 sedes?{' '}
          <button onClick={onDemo} className="font-bold hover:underline" style={{ color: '#0f766e' }}>Cotización especial →</button>
        </p>
      </div>
    </section>
  );
}

// ── Quiénes Somos — Misión, Visión, Valores, Estrategia, Objetivos, Procesos ──
function Nosotros() {
  const { ref, inView } = useInView(.1);

  const valores = [
    { icon: '📐', title: 'Dominio profundo de la norma',  desc: 'No tercerizamos la interpretación regulatoria: cada módulo se diseña con criterio de auditor, no de quien solo copió un PDF.' },
    { icon: '🔒', title: 'Confianza y seguridad',         desc: 'Datos de cada IPS y sus pacientes protegidos bajo la Ley 1581/2012, con permisos por equipo y trazabilidad de quién hizo qué.' },
    { icon: '🤝', title: 'Cercanía con el prestador',     desc: 'Construido para equipos pequeños con poco tiempo — no para el departamento de calidad de un hospital de tercer nivel.' },
    { icon: '🔄', title: 'Mejora continua real',          desc: 'Cada bug encontrado se corrige y se documenta; cada norma nueva se incorpora sin esperar un lanzamiento grande.' },
    { icon: '🔎', title: 'Honestidad sobre el alcance',   desc: 'Decimos con claridad qué automatiza la plataforma hoy, qué sigue siendo criterio del auditor, y dónde hay vacíos que debe resolver la Secretaría de Salud territorial.' },
  ];

  const estrategia = [
    { icon: '🔁', title: 'Cobertura normativa que no se queda vieja', desc: 'Cada actualización de la Res. 1732/2026 — y las que la sucedan — se refleja en la plataforma sin que el cliente pague de más ni mueva un dedo.' },
    { icon: '🧩', title: 'Un solo sistema para todo el ciclo de calidad', desc: 'Auditoría, PAMEC, CAPAs, indicadores, SG-SST, PROA, vigilancia sanitaria y bitácora de gobernanza conectados entre sí — no módulos sueltos que no se hablan.' },
    { icon: '🤖', title: 'IA aplicada al trabajo operativo diario', desc: 'El Agente de Cumplimiento prioriza no conformidades y el Asistente Normativo responde citando la norma, para quitar horas de trabajo manual real.' },
    { icon: '🧪', title: 'Crecer validando con IPS piloto',  desc: 'Cada función nueva se prueba primero con cuentas piloto reales antes de ofrecerse de forma general.' },
  ];

  const objetivos = [
    'Terminar de llevar todos los módulos compartidos por Equipo IPS al mismo patrón de trazabilidad y bitácora automática.',
    'Cerrar la fase piloto con las IPS que hoy prueban la plataforma y usar sus hallazgos para afinar el producto antes de una comercialización más amplia.',
    'Mantener el 100% de los criterios de la Res. 1732/2026 reflejados en la plataforma, sin rezago frente a cada actualización.',
    'Consolidar el Agente de Cumplimiento con IA como apoyo confiable a la decisión — nunca como reemplazo del criterio del auditor.',
    'Evaluar el camino hacia estándares internacionales (ISO 7101, JCI) para IPS con ambición de acreditación, no solo de habilitación.',
  ];

  const procesos = [
    { icon: '🧭', title: 'Direccionamiento Estratégico',        desc: 'Define misión, visión, objetivos y prioridades de producto de NormaLis, y revisa su cumplimiento.' },
    { icon: '⚖️', title: 'Gestión Normativa y Regulatoria',     desc: 'Monitorea cambios en la Res. 1732/2026 y normativa relacionada, y coordina su incorporación oportuna.' },
    { icon: '💻', title: 'Gestión de Producto y Tecnología',     desc: 'Diseña, desarrolla y mantiene los módulos de la plataforma, la seguridad y la infraestructura.' },
    { icon: '📣', title: 'Gestión Comercial y de Clientes',      desc: 'Atiende prospectos y clientes piloto, gestiona el ciclo de ventas por planes y el acompañamiento post-venta.' },
    { icon: '✅', title: 'Gestión de Calidad y Mejora Continua', desc: 'Aplica el ciclo PHVA a la propia operación: auditoría interna del producto, incidentes y retroalimentación.' },
  ];

  return (
    <section ref={ref} className="py-24 px-5 relative overflow-hidden" id="nosotros"
             style={{ background: 'linear-gradient(135deg,#0a2540 0%,#061018 100%)' }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full pointer-events-none blur-3xl"
           style={{ background: 'radial-gradient(circle,rgba(0,188,212,.06),transparent)' }} />
      <div className="max-w-5xl mx-auto relative">
        <div className="text-center mb-14"
             style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(20px)', transition: 'all .6s ease' }}>
          <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
                style={{ background: 'rgba(0,188,212,.1)', border: '1px solid rgba(0,188,212,.25)', color: '#67e8f9' }}>
            🏢 Quiénes somos
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">
            La habilitación de su IPS,<br />
            <span style={{ background: 'linear-gradient(90deg,#26A69A,#00BCD4,#67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              sin fricción
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Hacia dónde vamos y qué nos guía para llegar ahí.
          </p>
        </div>

        {/* Misión / Visión */}
        <div className="grid md:grid-cols-2 gap-5 mb-16">
          <Card3D className="rounded-2xl p-7"
                  style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg mb-4"
                 style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)', boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}>🎯</div>
            <h3 className="font-bold text-white text-lg mb-2">Misión</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,.65)' }}>
              Darle a cada IPS, clínica, hospital o profesional independiente en Colombia una herramienta que cubra,
              criterio por criterio, los 7 estándares de la Resolución 1732/2026 — Talento Humano, Infraestructura,
              Dotación, Medicamentos y Dispositivos, Procesos Prioritarios, Historia Clínica e Interdependencia —
              para que la evidencia de cumplimiento exista todos los días, no solo se arme la noche antes de la
              visita de la Secretaría de Salud.
            </p>
          </Card3D>
          <Card3D className="rounded-2xl p-7"
                  style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg mb-4"
                 style={{ background: 'linear-gradient(135deg,#5b21b6,#8b5cf6)', boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}>🔭</div>
            <h3 className="font-bold text-white text-lg mb-2">Visión</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,.65)' }}>
              Ser, para 2027, la plataforma que las IPS colombianas —empezando por las pequeñas y medianas que hoy
              dependen de Excel, carpetas físicas o consultores externos— usan por defecto para gestionar su
              habilitación, reconocida porque nunca se queda desactualizada frente a un cambio normativo y porque
              automatiza tanto el papeleo como el seguimiento real de la calidad.
            </p>
          </Card3D>
        </div>

        {/* Valores */}
        <div className="mb-16">
          <h3 className="text-center text-xs font-bold uppercase tracking-widest mb-8" style={{ color: '#4DB6AC' }}>
            Nuestros valores
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {valores.map(v => (
              <div key={v.title} className="rounded-2xl p-5 text-center"
                   style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}>
                <div className="text-2xl mb-3">{v.icon}</div>
                <h4 className="font-bold text-white text-sm mb-1.5">{v.title}</h4>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,.5)' }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Estrategia */}
        <div className="mb-16">
          <h3 className="text-center text-xs font-bold uppercase tracking-widest mb-8" style={{ color: '#4DB6AC' }}>
            Nuestra estrategia
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {estrategia.map(e => (
              <div key={e.title} className="rounded-2xl p-5 flex gap-4"
                   style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}>
                <div className="text-2xl flex-shrink-0">{e.icon}</div>
                <div>
                  <h4 className="font-bold text-white text-sm mb-1">{e.title}</h4>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,.5)' }}>{e.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Objetivos estratégicos */}
        <div className="mb-16">
          <h3 className="text-center text-xs font-bold uppercase tracking-widest mb-8" style={{ color: '#4DB6AC' }}>
            Objetivos estratégicos
          </h3>
          <div className="rounded-2xl p-2 max-w-3xl mx-auto"
               style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}>
            {objetivos.map((o, i) => (
              <div key={o} className="flex items-start gap-3 px-4 py-3.5"
                   style={{ borderBottom: i < objetivos.length - 1 ? '1px solid rgba(255,255,255,.06)' : 'none' }}>
                <span className="mt-0.5 flex-shrink-0" style={{ color: '#26A69A' }}>✓</span>
                <span className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,.7)' }}>{o}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Procesos estratégicos */}
        <div>
          <h3 className="text-center text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#4DB6AC' }}>
            Procesos estratégicos
          </h3>
          <p className="text-center text-xs mb-8 max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,.4)' }}>
            Los procesos que dirigen y sostienen la operación de NormaLis como empresa.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {procesos.map(p => (
              <div key={p.title} className="rounded-2xl p-5"
                   style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}>
                <div className="text-2xl mb-3">{p.icon}</div>
                <h4 className="font-bold text-white text-sm mb-1.5">{p.title}</h4>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,.5)' }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState<number|null>(null);
  const faqs = [
    { q: '¿NormaLis ya tiene la Resolución 1732/2026?', a: 'Sí. Publicada el 5 de agosto de 2026, reemplazó la 3100/2019 y sus modificaciones. NormaLis ya incluye todos los nuevos criterios: Telemedicina, IHCE y Plan de Adecuación Progresiva.' },
    { q: '¿Sirve para todos los tipos de IPS?', a: 'Sí. Cubre 22 modalidades: consultorios, clínicas, hospitales, centros de imágenes, laboratorios, odontología, medicina estética y más.' },
    { q: '¿Necesito instalar algo?', a: 'No. 100% en el navegador. También funciona como app en iOS/Android y puede usarse sin internet — sincroniza al recuperar conexión.' },
    { q: '¿NormaLis incluye el módulo PROA?', a: 'Sí. El módulo PROA (Res. 2471/2022 · Plan RAM 2025–2030 · Res. 1732/2026 Estándar 5) está incluido en el Plan Profesional y superior. Cubre checklist de madurez del programa, registro de intervenciones, consumo en DDD/100 camas-día por antimicrobiano trazador e informe mensual para el comité de infecciones.' },
    { q: '¿Qué pasa cuando cambia la normativa?', a: 'NormaLis se actualiza automáticamente. Todos los planes incluyen actualizaciones normativas sin costo adicional.' },
    { q: '¿Puedo empezar hoy mismo?', a: 'Sí. Con código de activación el acceso es inmediato. Sin código, un asesor te contacta en menos de 24 horas.' },
    { q: '¿Mis datos están seguros?', a: 'Sí. Google Cloud (Firebase), cifrado en tránsito y en reposo. Ley 1581/2012 (Habeas Data). Cuentas administrativas con verificación en dos pasos (MFA/TOTP) y firmas selladas criptográficamente. Sus datos nunca se comparten con terceros. Detalle completo en Confianza y Seguridad.' },
  ];
  return (
    <section className="py-20 px-5 bg-white" id="faq">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
                style={{ background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4' }}>FAQ</span>
          <h2 className="text-3xl font-black text-slate-900">Preguntas frecuentes</h2>
        </div>
        <div className="space-y-2">
          {faqs.map((f, i) => (
            <div key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
              <button className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-sm text-slate-900 hover:bg-slate-50 transition-colors"
                      onClick={() => setOpen(open === i ? null : i)}>
                <span className="pr-4">{f.q}</span>
                <span style={{ color: '#0f766e' }} className="flex-shrink-0 text-lg font-light">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed" style={{ background: '#f8fafc' }}>
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

// ── CTA final ─────────────────────────────────────────────────────────────────
function CTAFinal({ onDemo }: { onDemo: () => void }) {
  const { ref, inView } = useInView();
  return (
    <section ref={ref} className="py-24 px-5 relative overflow-hidden"
             style={{ background: 'radial-gradient(ellipse 100% 120% at 50% 100%, #0a2540 0%, #061018 50%, #030a10 100%)' }}>
      <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[500px] h-[300px] rounded-full pointer-events-none blur-3xl"
           style={{ background: 'radial-gradient(circle,rgba(0,188,212,.12),transparent)' }} />
      <div className="max-w-3xl mx-auto text-center relative"
           style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(30px)', transition: 'all .7s ease' }}>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-8"
             style={{ background: 'rgba(0,188,212,.1)', border: '1px solid rgba(0,188,212,.25)', color: '#67e8f9' }}>
          🚀 Empieza hoy — sin tarjeta de crédito
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight"
            style={{ textShadow: '0 0 40px rgba(0,188,212,.15)' }}>
          Su IPS lista para<br />
          <span style={{ background: 'linear-gradient(90deg,#26A69A,#00BCD4,#67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            cualquier visita
          </span>
        </h2>
        <p className="text-lg mb-10 max-w-lg mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,.55)' }}>
          Únase a las IPS colombianas que ya gestionan su habilitación con NormaLis.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <button onClick={onDemo} className="text-white px-10 py-4 rounded-xl font-bold text-base transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)', boxShadow: '0 0 40px rgba(0,188,212,.4), 0 12px 30px rgba(0,0,0,.4)' }}>
            🚀 Solicitar demo gratis
          </button>
          <Link href="/registro" className="text-white px-10 py-4 rounded-xl font-semibold text-base transition-all hover:bg-white/10 backdrop-blur-sm"
                style={{ border: '1px solid rgba(255,255,255,.15)' }}>
            Crear cuenta →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="px-5 py-12" style={{ background: '#03060a', borderTop: '1px solid rgba(255,255,255,.05)' }}>
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs"
                 style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)' }}>N</div>
            <span className="font-black text-white">NormaLis</span>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,.25)' }}>Software colombiano de habilitación IPS · Res. 1732/2026</p>
        </div>
        <div className="flex gap-6 text-xs" style={{ color: 'rgba(255,255,255,.3)' }}>
          <Link href="/terminos" className="hover:text-white transition-colors">Términos</Link>
          <Link href="/politica-privacidad" className="hover:text-white transition-colors">Privacidad</Link>
          <Link href="/confianza-y-seguridad" className="hover:text-white transition-colors">Seguridad</Link>
          <Link href="/login" className="hover:text-white transition-colors">Ingresar</Link>
          <Link href="/registro" className="hover:text-white transition-colors">Registrarse</Link>
        </div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,.18)' }}>© 2026 NormaLis · normalis.co</p>
      </div>
    </footer>
  );
}

// ── Demo Modal ────────────────────────────────────────────────────────────────
function DemoModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ nombre:'', ips:'', email:'', tel:'' });
  const [sent, setSent]   = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || !form.email) return;
    setLoading(true);
    try { await addDoc(collection(db,'leads'), { ...form, fuente:'landing-demo', creadoEn: serverTimestamp() }); }
    catch { }
    finally { setSent(true); setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(12px)' }}>
      <Card3D className="w-full max-w-md rounded-2xl p-8 relative"
              style={{ background: 'linear-gradient(145deg,#0a1628,#0d2137)', border: '1px solid rgba(0,188,212,.2)', boxShadow: '0 0 80px rgba(0,188,212,.12)' }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors text-xl">✕</button>
        {sent ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">🚀</div>
            <h3 className="text-xl font-black text-white mb-2">¡Recibido!</h3>
            <p className="text-slate-400 text-sm">Le contactamos en menos de 24 horas para agendar su demo personalizada.</p>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-black text-white mb-1">Solicitar demo gratis</h3>
            <p className="text-slate-400 text-sm mb-6">20 minutos · Sin compromiso · Solo para IPS en Colombia</p>
            <form onSubmit={submit} className="space-y-4">
              {[
                { k:'nombre', l:'Nombre completo', p:'Dr. Juan Pérez', req: true },
                { k:'ips',    l:'Nombre de la IPS', p:'Clínica XYZ', req: false },
                { k:'email',  l:'Correo electrónico', p:'correo@ips.com', req: true },
                { k:'tel',    l:'WhatsApp / Teléfono', p:'300 000 0000', req: false },
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(128,203,196,.6)' }}>{f.l}</label>
                  <input type={f.k === 'email' ? 'email' : 'text'} placeholder={f.p} required={f.req}
                         value={form[f.k as keyof typeof form]}
                         onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                         className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
                         style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.09)' }} />
                </div>
              ))}
              <button type="submit" disabled={loading}
                      className="w-full py-3.5 rounded-xl font-bold text-white mt-2 transition-all hover:scale-[1.02] disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)', boxShadow: '0 0 24px rgba(0,188,212,.3)' }}>
                {loading ? 'Enviando...' : '🚀 Solicitar demo gratis'}
              </button>
            </form>
          </>
        )}
      </Card3D>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [showDemo, setShowDemo] = useState(false);
  const open = useCallback(() => setShowDemo(true), []);
  return (
    <>
      <Navbar  onDemo={open} />
      <Hero    onDemo={open} />
      <ComplianceBand />
      <Stats />
      <Modulos />
      <CrosswalkSection />
      <HowItWorks />
      <Precios onDemo={open} />
      <Nosotros />
      <FAQ />
      <CTAFinal onDemo={open} />
      <Footer />
      {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}
    </>
  );
}
