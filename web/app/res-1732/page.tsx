'use client';

/**
 * web/app/res-1732/page.tsx
 * Landing page de campaña — Res. 1732/2026
 *
 * A diferencia de web/app/page.tsx (el sitio completo, 20 módulos, pensado
 * para SEO y exploración), esta página tiene un solo objetivo: que quien
 * llegue desde un anuncio pagado agende la demo antes de seguir de largo.
 * Sin navegación completa, sin las 20 tarjetas de módulos — el ángulo es
 * la fecha límite de la Res. 1732/2026, no el catálogo de funciones.
 *
 * Los leads se guardan en la misma colección `leads` que usa el sitio
 * principal (ver DemoModal en web/app/page.tsx), pero con
 * fuente: 'campana-res1732' para poder medir esta campaña por separado.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ── Cuenta regresiva hasta el fin de la transición ───────────────────────────
// Res. 1732/2026 se publicó el 5 de agosto de 2026; el periodo de transición
// es de 12 meses (ver CLAUDE.md). Esta es la única fecha que se calcula en
// esta página — nunca se inventa un número de "cupos" o "usuarios viendo esto".
const FIN_TRANSICION = new Date('2027-08-05T00:00:00-05:00');

function useDiasRestantes() {
  const [dias, setDias] = useState<number | null>(null);
  useEffect(() => {
    const ms = FIN_TRANSICION.getTime() - Date.now();
    setDias(Math.max(0, Math.ceil(ms / 86_400_000)));
  }, []);
  return dias;
}

// ── Scroll reveal ─────────────────────────────────────────────────────────────
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

// ── Modal de demo (misma colección `leads`, fuente propia de campaña) ───────
function DemoModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ nombre: '', ips: '', email: '', tel: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || !form.email) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'leads'), { ...form, fuente: 'campana-res1732', creadoEn: serverTimestamp() });
    } catch { /* best-effort, igual que el modal del sitio principal */ }
    finally { setSent(true); setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-md rounded-2xl p-8 relative"
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
            <p className="text-slate-400 text-sm mb-6">15 minutos · Sin compromiso · Solo para IPS en Colombia</p>
            <form onSubmit={submit} className="space-y-4">
              {[
                { k: 'nombre', l: 'Nombre completo', p: 'Dr. Juan Pérez', req: true },
                { k: 'ips', l: 'Nombre de la IPS', p: 'Clínica XYZ', req: false },
                { k: 'email', l: 'Correo electrónico', p: 'correo@ips.com', req: true },
                { k: 'tel', l: 'WhatsApp / Teléfono', p: '300 000 0000', req: false },
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
      </div>
    </div>
  );
}

// ── Header mínimo — sin navegación completa, un solo objetivo ───────────────
function MiniHeader() {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 px-5 py-5 flex items-center justify-between">
      <div className="flex items-center gap-2.5 font-black text-lg">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm"
             style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)', boxShadow: '0 0 16px rgba(0,188,212,.4)' }}>N</div>
        <span className="text-white">Norma<span style={{ color: '#00BCD4' }}>Lis</span></span>
      </div>
      <Link href="/login" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Ingresar</Link>
    </header>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ onDemo }: { onDemo: () => void }) {
  const dias = useDiasRestantes();
  return (
    <section className="relative pt-32 pb-20 px-5 overflow-hidden"
             style={{ background: 'radial-gradient(ellipse 120% 80% at 50% -10%, #0a2540 0%, #061018 55%, #030a10 100%)' }}>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(0,188,212,.08) 0%, transparent 70%)' }} />
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-8"
             style={{ background: 'rgba(0,188,212,.1)', border: '1px solid rgba(0,188,212,.25)', color: '#67e8f9' }}>
          🏥 Software colombiano de habilitación · Res. 1732/2026
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.08] mb-6 tracking-tight"
            style={{ textShadow: '0 0 80px rgba(0,188,212,.15)' }}>
          12 meses para adaptarse<br />a la Res. 1732/2026.<br />
          <span style={{ background: 'linear-gradient(90deg,#26A69A 0%,#00BCD4 50%,#67e8f9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Empiece hoy, no en el mes 11.
          </span>
        </h1>

        <p className="text-lg max-w-xl mx-auto mb-10 leading-relaxed" style={{ color: 'rgba(255,255,255,.6)' }}>
          NormaLis convierte los 7 estándares de la nueva resolución en una auditoría digital, con plan de mejora
          automático — sin depender de un consultor externo ni de carpetas físicas.
        </p>

        <button onClick={onDemo} className="text-white px-8 py-4 rounded-xl font-bold transition-all hover:-translate-y-1 hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)', boxShadow: '0 0 40px rgba(0,188,212,.4), 0 12px 30px rgba(0,0,0,.4)' }}>
          🚀 Solicitar demo gratis (15 min)
        </button>

        {dias !== null && (
          <p className="text-xs mt-6" style={{ color: 'rgba(255,255,255,.35)' }}>
            {dias > 0
              ? <>Quedan <strong style={{ color: '#67e8f9' }}>{dias} días</strong> del periodo de transición de 12 meses.</>
              : 'El periodo de transición de 12 meses ya venció.'}
          </p>
        )}
      </div>
    </section>
  );
}

// ── Línea de tiempo ───────────────────────────────────────────────────────────
function Timeline() {
  const { ref, inView } = useInView(.3);
  const items = [
    { fecha: '05 AGO 2026', texto: 'Se publica la Res. 1732/2026 — reemplaza la Res. 3100/2019 y la Res. 465/2025.', alert: false },
    { fecha: 'HOY', texto: 'Cada mes sin auditar es evidencia que no existe si la visita llega antes de tiempo.', alert: false },
    { fecha: '05 AGO 2027', texto: 'Vence el periodo de transición de 12 meses.', alert: true },
  ];
  return (
    <section ref={ref} className="py-16 px-5 bg-white">
      <div className="max-w-2xl mx-auto"
           style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(20px)', transition: 'all .6s ease' }}>
        <div className="flex flex-col gap-4">
          {items.map(it => (
            <div key={it.fecha} className="flex items-start gap-4 p-4 rounded-xl"
                 style={{ background: it.alert ? '#fef2f2' : '#f8fafc', border: `1px solid ${it.alert ? '#fecaca' : '#e2e8f0'}` }}>
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: it.alert ? '#fee2e2' : '#f0fdfa', color: it.alert ? '#b91c1c' : '#0f766e' }}>
                {it.fecha}
              </span>
              <span className="text-sm text-slate-600 leading-relaxed pt-0.5">{it.texto}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Beneficios (solo 3, no los 20 módulos) ───────────────────────────────────
function Beneficios() {
  const { ref, inView } = useInView(.2);
  const items = [
    { icon: '🔍', title: 'Auditoría con score en tiempo real', desc: 'Responda por criterio y vea de inmediato dónde está su IPS frente a la norma.' },
    { icon: '✓', title: 'Plan de mejora que se arma solo', desc: 'Cada no conformidad genera su CAPA, con responsable y fecha límite.' },
    { icon: '📅', title: 'Alertas antes de que algo venza', desc: 'Tarjetas profesionales, vacunas, contratos — siempre por delante.' },
  ];
  return (
    <section ref={ref} className="py-16 px-5" style={{ background: '#f8fafc' }}>
      <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-5">
        {items.map((it, i) => (
          <div key={it.title} className="bg-white rounded-2xl p-6"
               style={{ border: '1px solid #e2e8f0', opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(20px)', transition: `all .5s ease ${i * 100}ms` }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg mb-4"
                 style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)' }}>{it.icon}</div>
            <h3 className="font-bold text-slate-900 mb-1.5 text-sm">{it.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{it.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Barra de números ──────────────────────────────────────────────────────────
function StatBar() {
  const stats = [
    { v: '780+', l: 'criterios cubiertos' },
    { v: '20', l: 'módulos activos' },
    { v: '200+', l: 'horas ahorradas al año' },
  ];
  return (
    <section className="py-14 px-5" style={{ background: 'linear-gradient(135deg,#0a2540 0%,#061018 100%)' }}>
      <div className="max-w-3xl mx-auto grid grid-cols-3 gap-4 text-center">
        {stats.map(s => (
          <div key={s.l}>
            <div className="text-3xl md:text-4xl font-black text-white">{s.v}</div>
            <div className="text-xs mt-1.5" style={{ color: 'rgba(128,203,196,.65)' }}>{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── FAQ reducido (3 objeciones, no las 7 del sitio principal) ───────────────
function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const faqs = [
    { q: '¿Reemplaza a mi asesor de calidad?', a: 'No. Le da la evidencia lista para que su criterio decida más rápido — no reemplaza el juicio del auditor.' },
    { q: '¿Necesito instalar algo?', a: 'No. Funciona 100% en el navegador, sin servidores ni capacitaciones largas.' },
    { q: '¿Qué pasa si la norma cambia otra vez?', a: 'Actualizamos la plataforma sin costo adicional para su plan.' },
  ];
  return (
    <section className="py-16 px-5 bg-white">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-black text-slate-900 mb-6 text-center">Antes de agendar</h2>
        <div className="space-y-2">
          {faqs.map((f, i) => (
            <div key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
              <button className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-sm text-slate-900 hover:bg-slate-50 transition-colors"
                      onClick={() => setOpen(open === i ? null : i)}>
                <span className="pr-4">{f.q}</span>
                <span style={{ color: '#0f766e' }} className="flex-shrink-0 text-lg font-light">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed" style={{ background: '#f8fafc' }}>{f.a}</div>
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
  return (
    <section className="py-20 px-5 relative overflow-hidden"
             style={{ background: 'radial-gradient(ellipse 100% 120% at 50% 100%, #0a2540 0%, #061018 50%, #030a10 100%)' }}>
      <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[500px] h-[300px] rounded-full pointer-events-none blur-3xl"
           style={{ background: 'radial-gradient(circle,rgba(0,188,212,.12),transparent)' }} />
      <div className="max-w-xl mx-auto text-center relative">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
          Agende 15 minutos y salga con<br />el mapa exacto de qué le falta
        </h2>
        <button onClick={onDemo} className="text-white px-10 py-4 rounded-xl font-bold text-base transition-all hover:scale-105 mt-2"
                style={{ background: 'linear-gradient(135deg,#00897B,#00BCD4)', boxShadow: '0 0 40px rgba(0,188,212,.4), 0 12px 30px rgba(0,0,0,.4)' }}>
          🚀 Solicitar demo gratis
        </button>
        <p className="text-xs mt-5" style={{ color: 'rgba(255,255,255,.35)' }}>
          Datos protegidos bajo la Ley 1581/2012 de Habeas Data.
        </p>
      </div>
    </section>
  );
}

// ── Footer mínimo ─────────────────────────────────────────────────────────────
function MiniFooter() {
  return (
    <footer className="px-5 py-8 text-center" style={{ background: '#03060a', borderTop: '1px solid rgba(255,255,255,.05)' }}>
      <div className="flex justify-center gap-6 text-xs mb-3" style={{ color: 'rgba(255,255,255,.3)' }}>
        <Link href="/" className="hover:text-white transition-colors">Sitio completo</Link>
        <Link href="/terminos" className="hover:text-white transition-colors">Términos</Link>
        <Link href="/politica-privacidad" className="hover:text-white transition-colors">Privacidad</Link>
      </div>
      <p className="text-xs" style={{ color: 'rgba(255,255,255,.18)' }}>© 2026 NormaLis · normalis.co</p>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Res1732LandingPage() {
  const [showDemo, setShowDemo] = useState(false);
  const open = useCallback(() => setShowDemo(true), []);
  return (
    <>
      <MiniHeader />
      <Hero onDemo={open} />
      <Timeline />
      <Beneficios />
      <StatBar />
      <FAQ />
      <CTAFinal onDemo={open} />
      <MiniFooter />
      {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}
    </>
  );
}
