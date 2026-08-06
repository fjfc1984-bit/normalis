'use client';

/**
 * DemoPlayer.tsx
 * Migración de normalis-demo-video.html → componente React.
 * 11 escenas secuenciales con progress bar, animaciones CSS y chat typewriter.
 * Navegación: ← → para saltar escenas.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// ── Timing ────────────────────────────────────────────────────────────────────
const SCENES = [
  { id: 's1',  dur: 6000  },
  { id: 's2',  dur: 10000 },
  { id: 's3',  dur: 6000  },
  { id: 's4',  dur: 18000 },
  { id: 's5',  dur: 20000 },
  { id: 's6',  dur: 12000 },
  { id: 's7',  dur: 18000 },
  { id: 's8',  dur: 13000 },
  { id: 's9',  dur: 9000  },
  { id: 's10', dur: 15000 },
  { id: 's11', dur: 10000 },
] as const;

const TOTAL_MS = SCENES.reduce((a, s) => a + s.dur, 0);

type SceneId = typeof SCENES[number]['id'];

const CHAT_ANSWER =
  'La Resolución 465/2025 modificó el Artículo 5 de la Res. 3100/2019 para hacer obligatoria la autoevaluación en cuatro momentos: (1) previa a la inscripción inicial, (2) durante el cuarto año de vigencia, (3) antes de cada renovación anual, y (4) en los casos adicionales del Manual de Acreditación. El incumplimiento genera inactivación automática de la inscripción en REPS.';

// ── CSS (injected once) ───────────────────────────────────────────────────────
const CSS = `
  .nd-root{width:1280px;height:720px;overflow:hidden;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#0d2820;position:relative;}
  .nd-progress{position:absolute;bottom:0;left:0;height:4px;background:#6dd4ae;transition:width .4s linear;z-index:999;}
  .nd-counter{position:absolute;bottom:12px;right:16px;font-size:11px;color:rgba(255,255,255,.3);letter-spacing:.05em;z-index:999;}
  .nd-scene{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .9s ease;}
  .nd-scene.active{opacity:1;pointer-events:auto;}

  /* S1 */
  .s1-logo-wrap{display:flex;align-items:center;gap:18px;margin-bottom:24px;animation:ndFadeUp .8s .3s both;}
  .s1-logo-icon{width:64px;height:64px;border-radius:16px;background:#2d8a6e;display:flex;align-items:center;justify-content:center;}
  .s1-logo-icon svg{width:38px;height:38px;fill:white;}
  .s1-logo-text{font-size:52px;font-weight:800;color:#fff;letter-spacing:-1px;}
  .s1-tagline{font-size:20px;color:#6dd4ae;letter-spacing:.04em;text-align:center;margin-bottom:40px;animation:ndFadeUp .8s .6s both;}
  .s1-badge{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);padding:10px 28px;border-radius:999px;color:#fff;font-size:16px;letter-spacing:.05em;animation:ndFadeUp .8s .9s both;}

  /* S2 */
  #nd-s2{background:#0a2019;}
  .s2-question{font-size:30px;font-weight:700;color:#fff;text-align:center;max-width:780px;line-height:1.35;margin-bottom:48px;animation:ndFadeUp .8s .2s both;}
  .s2-pains{display:flex;gap:24px;animation:ndFadeUp .8s .6s both;}
  .s2-pain{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:22px 28px;width:240px;display:flex;flex-direction:column;gap:10px;}
  .s2-pain-icon{font-size:28px;}
  .s2-pain-text{color:#d1e8e0;font-size:15px;line-height:1.45;}

  /* S3 */
  #nd-s3{background:linear-gradient(135deg,#0d2820 0%,#1a5e4a 100%);}
  .s3-reveal{font-size:20px;letter-spacing:.3em;color:#6dd4ae;text-transform:uppercase;margin-bottom:16px;animation:ndFadeIn .8s .2s both;}
  .s3-name{font-size:80px;font-weight:900;color:#fff;letter-spacing:-3px;line-height:1;animation:ndScaleIn .8s .4s both;}
  .s3-badge{margin-top:16px;background:#4ab896;color:#0d2820;padding:6px 20px;border-radius:999px;font-weight:700;font-size:14px;animation:ndFadeUp .8s .8s both;}
  .s3-line{margin-top:32px;font-size:20px;color:rgba(255,255,255,.75);max-width:640px;text-align:center;line-height:1.5;animation:ndFadeUp .8s 1s both;}

  /* S4 */
  #nd-s4{background:#f4f9f7;flex-direction:row!important;align-items:stretch!important;}
  .s4-sidebar{width:200px;background:#0d2820;padding:24px 16px;display:flex;flex-direction:column;gap:6px;flex-shrink:0;animation:ndSlideRight .7s .2s both;}
  .s4-logo{color:#6dd4ae;font-weight:800;font-size:18px;padding:0 8px 16px;}
  .s4-item{padding:8px 12px;border-radius:8px;color:rgba(255,255,255,.6);font-size:12px;display:flex;align-items:center;gap:8px;}
  .s4-item.act{background:rgba(255,255,255,.1);color:#fff;}
  .s4-dot{width:6px;height:6px;border-radius:50%;background:#7aaa97;flex-shrink:0;}
  .s4-item.act .s4-dot{background:#6dd4ae;}
  .s4-content{flex:1;padding:28px;overflow:hidden;animation:ndFadeIn .7s .4s both;}
  .s4-welcome{font-size:20px;font-weight:700;color:#0d2820;margin-bottom:8px;}
  .s4-sub{font-size:13px;color:#7aaa97;margin-bottom:24px;}
  .s4-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
  .s4-card{background:#fff;border-radius:14px;padding:16px 14px;border:1px solid #d1e8e0;box-shadow:0 2px 8px rgba(0,0,0,.06);}
  .s4-card.hl{border-color:#2d8a6e;box-shadow:0 0 0 2px #2d8a6e;}
  .s4-card .ci{font-size:22px;margin-bottom:8px;}
  .s4-card .cn{font-size:12px;font-weight:700;color:#0d2820;}
  .s4-card .cd{font-size:10px;color:#7aaa97;margin-top:3px;line-height:1.3;}

  /* S5 */
  #nd-s5{background:#f4f9f7;flex-direction:column!important;align-items:stretch!important;padding:0!important;}
  .s5-header{background:#0d2820;color:#fff;padding:20px 32px;display:flex;align-items:center;gap:16px;animation:ndFadeIn .6s both;}
  .s5-htitle{font-size:18px;font-weight:700;}
  .s5-hsub{font-size:12px;color:#6dd4ae;margin-top:2px;}
  .s5-body{flex:1;padding:24px 32px;display:flex;gap:24px;animation:ndFadeUp .7s .3s both;}
  .s5-list{flex:1;display:flex;flex-direction:column;gap:10px;}
  .s5-item{background:#fff;border-radius:12px;padding:14px 16px;border:1px solid #d1e8e0;display:flex;align-items:center;gap:14px;box-shadow:0 1px 4px rgba(0,0,0,.05);}
  .s5-chk{width:22px;height:22px;border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px;}
  .s5-chk.ok{background:#dcfce7;color:#16a34a;}
  .s5-chk.warn{background:#fef9c3;color:#ca8a04;}
  .s5-chk.no{background:#fee2e2;color:#dc2626;}
  .s5-txt{font-size:12px;color:#0d2820;font-weight:500;flex:1;}
  .s5-std{font-size:10px;color:#7aaa97;margin-top:2px;}
  .s5-panel{width:220px;display:flex;flex-direction:column;gap:14px;}
  .s5-pcard{background:#fff;border-radius:14px;padding:18px;border:1px solid #d1e8e0;text-align:center;}
  .s5-pct{font-size:42px;font-weight:900;color:#2d8a6e;}
  .s5-plabel{font-size:11px;color:#7aaa97;margin-top:4px;}
  .s5-pbar{height:8px;background:#d1e8e0;border-radius:4px;margin-top:12px;overflow:hidden;}
  .s5-pfill{height:100%;background:#2d8a6e;border-radius:4px;width:0%;transition:width 2s 1s ease;}
  .s5-pfill.go{width:74%;}
  .s5-scard{background:#fff;border-radius:14px;padding:16px;border:1px solid #d1e8e0;font-size:11px;}
  .s5-stitle{font-weight:700;color:#0d2820;margin-bottom:10px;font-size:12px;}
  .s5-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;}
  .s5-sname{color:#7aaa97;}
  .s5-badge{font-size:9px;font-weight:700;padding:2px 7px;border-radius:99px;}
  .s5-badge.ok{background:#dcfce7;color:#16a34a;}
  .s5-badge.warn{background:#fef9c3;color:#ca8a04;}
  .s5-badge.no{background:#fee2e2;color:#dc2626;}

  /* S6 */
  #nd-s6{background:#f4f9f7;}
  .s6-wrap{display:flex;gap:32px;align-items:center;padding:32px;animation:ndFadeUp .7s .3s both;}
  .s6-info{flex:1;}
  .s6-title{font-size:28px;font-weight:800;color:#0d2820;margin-bottom:8px;}
  .s6-sub{font-size:15px;color:#7aaa97;margin-bottom:24px;line-height:1.5;}
  .s6-feat{display:flex;flex-direction:column;gap:10px;}
  .s6-fi{display:flex;align-items:center;gap:10px;font-size:14px;color:#0d2820;}
  .s6-fd{width:8px;height:8px;border-radius:50%;background:#2d8a6e;flex-shrink:0;}
  .s6-wheel{width:300px;height:300px;flex-shrink:0;}
  .s6-wheel svg{width:100%;height:100%;}

  /* S7 */
  #nd-s7{background:#0d2820;}
  .s7-box{width:700px;background:#1a3a2e;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5);animation:ndScaleIn .7s .2s both;}
  .s7-header{background:#1a5e4a;padding:16px 20px;display:flex;align-items:center;gap:12px;}
  .s7-avatar{width:36px;height:36px;border-radius:10px;background:#4ab896;display:flex;align-items:center;justify-content:center;font-size:18px;}
  .s7-title{color:#fff;font-weight:700;font-size:14px;}
  .s7-sub{color:#6dd4ae;font-size:11px;}
  .s7-body{padding:20px;display:flex;flex-direction:column;gap:14px;min-height:340px;}
  .s7-msg{display:flex;gap:10px;}
  .s7-msg.user{flex-direction:row-reverse;}
  .s7-bubble{max-width:480px;padding:12px 16px;border-radius:14px;font-size:13px;line-height:1.55;}
  .s7-msg.bot .s7-bubble{background:rgba(255,255,255,.08);color:#fff;border-radius:4px 14px 14px 14px;}
  .s7-msg.user .s7-bubble{background:#2d8a6e;color:#fff;border-radius:14px 4px 14px 14px;}
  .s7-sources{padding:12px 20px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:8px;}
  .s7-stag{background:rgba(255,255,255,.07);border-radius:99px;padding:3px 10px;font-size:10px;color:#6dd4ae;}

  /* S8 */
  #nd-s8{background:#f4f9f7;}
  .s8-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;width:860px;animation:ndFadeUp .7s .3s both;}
  .s8-card{background:#fff;border-radius:18px;padding:24px;border:1px solid #d1e8e0;box-shadow:0 4px 16px rgba(0,0,0,.06);display:flex;gap:16px;}
  .s8-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;}
  .s8-name{font-size:16px;font-weight:700;color:#0d2820;margin-bottom:4px;}
  .s8-desc{font-size:12px;color:#7aaa97;line-height:1.5;}
  .s8-tag{display:inline-block;margin-top:8px;background:#f4f9f7;border:1px solid #d1e8e0;padding:2px 8px;border-radius:99px;font-size:10px;color:#2d8a6e;font-weight:600;}

  /* S9 */
  #nd-s9{background:#f4f9f7;}
  .s9-mock{width:640px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.1);animation:ndScaleIn .7s .2s both;}
  .s9-head{background:#0d2820;padding:24px 28px;color:#fff;}
  .s9-hl{font-size:11px;color:#6dd4ae;margin-bottom:4px;}
  .s9-ht{font-size:22px;font-weight:700;}
  .s9-body{padding:20px 28px;}
  .s9-ok{background:#dcfce7;border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:12px;margin-bottom:16px;}
  .s9-row{display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #f0f9f5;}
  .s9-row:last-child{border-bottom:none;}
  .s9-left{display:flex;align-items:center;gap:10px;}
  .s9-dot{width:10px;height:10px;border-radius:50%;background:#22c55e;}
  .s9-sname{font-size:13px;font-weight:600;color:#0d2820;}
  .s9-ssub{font-size:11px;color:#7aaa97;}
  .s9-status{font-size:12px;font-weight:700;color:#16a34a;}

  /* S10 */
  #nd-s10{background:#0d2820;}
  .s10-top{text-align:center;margin-bottom:32px;animation:ndFadeUp .7s .2s both;}
  .s10-top h2{font-size:32px;font-weight:800;color:#fff;}
  .s10-top p{color:#6dd4ae;font-size:14px;margin-top:6px;}
  .s10-plans{display:flex;gap:20px;animation:ndFadeUp .7s .5s both;}
  .s10-plan{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:28px 24px;width:240px;}
  .s10-plan.feat{background:#2d8a6e;border-color:#4ab896;transform:scale(1.04);}
  .s10-pname{font-size:13px;font-weight:700;color:#6dd4ae;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px;}
  .s10-plan.feat .s10-pname{color:#fff;}
  .s10-price{font-size:28px;font-weight:900;color:#fff;line-height:1;}
  .s10-period{font-size:10px;color:rgba(255,255,255,.45);margin-bottom:12px;}
  .s10-feats{list-style:none;display:flex;flex-direction:column;gap:7px;}
  .s10-feats li{font-size:11px;color:rgba(255,255,255,.75);display:flex;gap:7px;align-items:flex-start;}
  .s10-feats li::before{content:'✓';color:#6dd4ae;font-weight:700;flex-shrink:0;}
  .s10-plan.feat .s10-feats li::before{color:#fff;}
  .s10-btn{display:block;margin-top:16px;text-align:center;background:#6dd4ae;color:#0d2820;font-weight:800;font-size:12px;padding:8px 16px;border-radius:8px;text-decoration:none;letter-spacing:.03em;}
  .s10-btn-w{background:#fff;color:#134e4a;}

  /* S11 */
  #nd-s11{background:#0d2820;}
  .s11-small{font-size:13px;letter-spacing:.3em;text-transform:uppercase;color:#6dd4ae;margin-bottom:16px;animation:ndFadeIn .8s .2s both;}
  .s11-big{font-size:54px;font-weight:900;color:#fff;line-height:1.1;margin-bottom:24px;animation:ndScaleIn .8s .5s both;}
  .s11-url{font-size:26px;font-weight:700;color:#6dd4ae;margin-bottom:32px;animation:ndFadeUp .8s .8s both;}
  .s11-detail{font-size:14px;color:rgba(255,255,255,.5);animation:ndFadeUp .8s 1s both;}
  .s11-div{display:inline-block;width:4px;height:4px;background:rgba(255,255,255,.3);border-radius:50%;margin:0 10px;vertical-align:middle;}

  /* Keyframes */
  @keyframes ndFadeIn    {from{opacity:0}to{opacity:1}}
  @keyframes ndFadeUp    {from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
  @keyframes ndScaleIn   {from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
  @keyframes ndSlideRight{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:none}}
`;

// ── Component ─────────────────────────────────────────────────────────────────
export default function DemoPlayer() {
  const [currentIdx, setCurrentIdx] = useState(-1);   // -1 = not started
  const [progress,   setProgress]   = useState(0);
  const [pbarGo,     setPbarGo]     = useState(false); // s5 pbar trigger
  const [chatQ,      setChatQ]      = useState(false);
  const [chatA,      setChatA]      = useState('');
  const [chatSrc,    setChatSrc]    = useState(false);

  const elapsedRef  = useRef(0);
  const idxRef      = useRef(0);
  const rafRef      = useRef<number>(0);
  const timerRef    = useRef<ReturnType<typeof setTimeout>>();

  // Chat typewriter
  const typeChat = useCallback(() => {
    setChatQ(true);
    let i = 0;
    const iv = setInterval(() => {
      if (i < CHAT_ANSWER.length) {
        setChatA(CHAT_ANSWER.slice(0, ++i));
      } else {
        clearInterval(iv);
        setTimeout(() => setChatSrc(true), 300);
      }
    }, 22);
    return () => clearInterval(iv);
  }, []);

  const activateScene = useCallback((idx: number) => {
    setCurrentIdx(idx);
    const id = SCENES[idx].id;

    if (id === 's5') {
      setTimeout(() => setPbarGo(true), 600);
    }
    if (id === 's7') {
      setChatQ(false); setChatA(''); setChatSrc(false);
      setTimeout(typeChat, 1500);
    }
  }, [typeChat]);

  const runScene = useCallback((idx: number) => {
    if (idx >= SCENES.length) {
      setProgress(100);
      return;
    }
    idxRef.current = idx;
    activateScene(idx);

    const dur   = SCENES[idx].dur;
    const start = performance.now();

    const tick = (now: number) => {
      const dt = now - start;
      setProgress(Math.min(((elapsedRef.current + dt) / TOTAL_MS) * 100, 100));
      if (dt < dur) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        elapsedRef.current += dur;
        runScene(idx + 1);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [activateScene]);

  // Start on mount
  useEffect(() => {
    const t = setTimeout(() => runScene(0), 300);
    return () => {
      clearTimeout(t);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [runScene]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && idxRef.current < SCENES.length - 1) {
        cancelAnimationFrame(rafRef.current);
        elapsedRef.current += SCENES[idxRef.current].dur;
        setPbarGo(false);
        runScene(idxRef.current + 1);
      }
      if (e.key === 'ArrowLeft' && idxRef.current > 0) {
        cancelAnimationFrame(rafRef.current);
        const prevIdx = idxRef.current - 1;
        elapsedRef.current = SCENES.slice(0, prevIdx).reduce((a, s) => a + s.dur, 0);
        setPbarGo(false);
        runScene(prevIdx);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [runScene]);

  const active = (id: SceneId) => currentIdx >= 0 && SCENES[currentIdx].id === id;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="nd-root">
        {/* Progress bar */}
        <div className="nd-progress" style={{ width: `${progress}%` }} />
        <div className="nd-counter">
          {currentIdx >= 0 ? `${currentIdx + 1} / ${SCENES.length}` : ''}
        </div>

        {/* ── S1 — Intro ── */}
        <div id="nd-s1" className={`nd-scene${active('s1') ? ' active' : ''}`}>
          <div className="s1-logo-wrap">
            <div className="s1-logo-icon">
              <svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div className="s1-logo-text">NormaLis</div>
          </div>
          <div className="s1-tagline">Software de Habilitación para IPS Colombianas</div>
          <div className="s1-badge">app.normalis.co &nbsp;·&nbsp; Versión 2 — Julio 2026</div>
        </div>

        {/* ── S2 — El Problema ── */}
        <div id="nd-s2" className={`nd-scene${active('s2') ? ' active' : ''}`}>
          <div className="s2-question">¿Su IPS está lista para la próxima visita de habilitación?</div>
          <div className="s2-pains">
            {[
              ['📋', 'Autoevaluación incompleta o hecha en Excel'],
              ['⏰', 'Vencimientos de documentos perdidos sin alertas'],
              ['📑', 'PAMEC desactualizado frente a la Res. 465/2025'],
              ['🔍', 'Sin trazabilidad de acciones del equipo de calidad'],
            ].map(([icon, text]) => (
              <div key={text} className="s2-pain">
                <div className="s2-pain-icon">{icon}</div>
                <div className="s2-pain-text">{text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── S3 — La Solución ── */}
        <div id="nd-s3" className={`nd-scene${active('s3') ? ' active' : ''}`}>
          <div className="s3-reveal">Presentamos</div>
          <div className="s3-name">NormaLis</div>
          <div className="s3-badge">Versión 2 — Ahora en producción</div>
          <div className="s3-line">Todo lo que su IPS necesita para cumplir con habilitación, PAMEC y calidad — en una sola plataforma.</div>
        </div>

        {/* ── S4 — Dashboard ── */}
        <div id="nd-s4" className={`nd-scene${active('s4') ? ' active' : ''}`}>
          <div className="s4-sidebar">
            <div className="s4-logo">NormaLis</div>
            {['Dashboard','Asistente IA','Auditoría','PAMEC','CAPAs','Indicadores','Vencimientos','SG-SST','Simulacro','Documentos','PQRS','Incidentes'].map((n,i) => (
              <div key={n} className={`s4-item${i===0?' act':''}`}><div className="s4-dot"/>{n}</div>
            ))}
          </div>
          <div className="s4-content">
            <div className="s4-welcome">Panel de habilitación y calidad en salud</div>
            <div className="s4-sub">NormaLis · Resolución 3100/2019 · Resolución 465/2025</div>
            <div className="s4-grid">
              {[
                {i:'🤖',n:'Asistente IA',d:'Consultas sobre habilitación y normativa',hl:true},
                {i:'🔍',n:'Auditoría',d:'Res. 3100/2019 — 22 modalidades'},
                {i:'📈',n:'PAMEC',d:'Auditoría de calidad PHVA'},
                {i:'✓', n:'CAPAs',d:'Acciones correctivas y preventivas'},
                {i:'📊',n:'Indicadores',d:'Calidad Res. 256/2016'},
                {i:'📅',n:'Vencimientos',d:'Documentos y fechas límite'},
                {i:'🦺',n:'SG-SST',d:'Seguridad y salud en el trabajo'},
                {i:'🔔',n:'Simulacro',d:'Pre-visita Secretaría'},
              ].map(({i,n,d,hl}) => (
                <div key={n} className={`s4-card${hl?' hl':''}`}>
                  <div className="ci">{i}</div>
                  <div className="cn">{n}</div>
                  <div className="cd">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── S5 — Auditoría ── */}
        <div id="nd-s5" className={`nd-scene${active('s5') ? ' active' : ''}`}>
          <div className="s5-header">
            <div>
              <div className="s5-htitle">🔍 Auditoría de Habilitación</div>
              <div className="s5-hsub">Resolución 3100/2019 · Resolución 465/2025 · Consulta Médica General</div>
            </div>
          </div>
          <div className="s5-body">
            <div className="s5-list">
              {[
                {s:'ok', t:'Talento Humano — Títulos y certificados vigentes',       std:'Estándar 1 — Resolución 3100/2019'},
                {s:'ok', t:'Infraestructura — Áreas mínimas y señalización',         std:'Estándar 2 — Resolución 3100/2019'},
                {s:'warn',t:'Dotación — Equipos biomédicos con mantenimiento',       std:'Estándar 3 — Resolución 3100/2019'},
                {s:'ok', t:'Medicamentos e insumos — Almacenamiento y control',      std:'Estándar 4 — Resolución 3100/2019'},
                {s:'no', t:'Procesos Prioritarios — Consentimiento informado',       std:'Estándar 5 — Resolución 3100/2019'},
                {s:'ok', t:'Historia Clínica — Formato unificado y custodia',        std:'Estándar 6 — Resolución 3100/2019'},
              ].map(({s,t,std}) => (
                <div key={t} className="s5-item">
                  <div className={`s5-chk ${s}`}>{s==='ok'?'✓':s==='warn'?'!':'✗'}</div>
                  <div><div className="s5-txt">{t}</div><div className="s5-std">{std}</div></div>
                </div>
              ))}
            </div>
            <div className="s5-panel">
              <div className="s5-pcard">
                <div className="s5-pct">74%</div>
                <div className="s5-plabel">Cumplimiento actual</div>
                <div className="s5-pbar">
                  <div className={`s5-pfill${pbarGo ? ' go' : ''}`} />
                </div>
              </div>
              <div className="s5-scard">
                <div className="s5-stitle">Resumen por Estándar</div>
                {[
                  ['Talento Humano','ok'],['Infraestructura','ok'],
                  ['Dotación','warn'],['Procesos','no'],['Historia Clínica','ok'],
                ].map(([n,s]) => (
                  <div key={n} className="s5-row">
                    <div className="s5-sname">{n}</div>
                    <div className={`s5-badge ${s}`}>{s==='ok'?'Cumple':s==='warn'?'Parcial':'No Cumple'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── S6 — PAMEC ── */}
        <div id="nd-s6" className={`nd-scene${active('s6') ? ' active' : ''}`}>
          <div className="s6-wrap">
            <div className="s6-info">
              <div className="s6-title">PAMEC Digital</div>
              <div className="s6-sub">Programa de Auditoría para el Mejoramiento de la Calidad de la Atención en Salud — ahora completamente digital y trazable.</div>
              <div className="s6-feat">
                {['Ciclos PHVA con seguimiento por responsable','Autoevaluación según Res. 465/2025','Priorización automática de hallazgos','Generación de informes en PDF institucional','Trazabilidad completa de todos los ciclos'].map(f => (
                  <div key={f} className="s6-fi"><div className="s6-fd"/>{f}</div>
                ))}
              </div>
            </div>
            <div className="s6-wheel">
              <svg viewBox="0 0 300 300">
                <circle cx="150" cy="150" r="120" fill="none" stroke="#e0eae7" strokeWidth="2"/>
                <path d="M150 150 L150 30 A120 120 0 0 1 254 90 Z" fill="#1a5e4a" opacity=".9"/>
                <path d="M150 150 L254 90 A120 120 0 0 1 254 210 Z" fill="#2d8a6e" opacity=".9"/>
                <path d="M150 150 L254 210 A120 120 0 0 1 46 210 Z" fill="#4ab896" opacity=".9"/>
                <path d="M150 150 L46 210 A120 120 0 0 1 150 30 Z" fill="#6dd4ae" opacity=".9"/>
                <circle cx="150" cy="150" r="45" fill="white"/>
                <text x="150" y="140" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0d2820">CICLO</text>
                <text x="150" y="156" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0d2820">PHVA</text>
                <text x="190" y="95"  textAnchor="middle" fontSize="14" fontWeight="900" fill="white">P</text>
                <text x="238" y="160" textAnchor="middle" fontSize="14" fontWeight="900" fill="white">H</text>
                <text x="150" y="252" textAnchor="middle" fontSize="14" fontWeight="900" fill="#0d2820">V</text>
                <text x="62"  y="160" textAnchor="middle" fontSize="14" fontWeight="900" fill="#0d2820">A</text>
              </svg>
            </div>
          </div>
        </div>

        {/* ── S7 — IA Normativa ── */}
        <div id="nd-s7" className={`nd-scene${active('s7') ? ' active' : ''}`}>
          <div className="s7-box">
            <div className="s7-header">
              <div className="s7-avatar">🤖</div>
              <div>
                <div className="s7-title">Asistente IA Normativo</div>
                <div className="s7-sub">NormaLis · Res. 3100 · 465/2025 · PAMEC · SG-SST</div>
              </div>
            </div>
            <div className="s7-body">
              <div className="s7-msg bot">
                <div className="s7-bubble">Hola, soy el asistente normativo de NormaLis. Pregúntame sobre habilitación, PAMEC, SG-SST o cualquier resolución del sector salud en Colombia.</div>
              </div>
              <div className="s7-msg user" style={{ opacity: chatQ ? 1 : 0, transition: 'opacity .5s' }}>
                <div className="s7-bubble">¿Qué cambió en la Resolución 465/2025 respecto a la autoevaluación?</div>
              </div>
              {chatA && (
                <div className="s7-msg bot" style={{ opacity: 1 }}>
                  <div className="s7-bubble">{chatA}</div>
                </div>
              )}
            </div>
            <div className="s7-sources" style={{ opacity: chatSrc ? 1 : 0, transition: 'opacity .5s' }}>
              <div className="s7-stag">Res. 465/2025 Art. 5</div>
              <div className="s7-stag">Res. 3100/2019 Art. 5</div>
              <div className="s7-stag">Confianza: 94%</div>
            </div>
          </div>
        </div>

        {/* ── S8 — Módulos adicionales ── */}
        <div id="nd-s8" className={`nd-scene${active('s8') ? ' active' : ''}`}>
          <div style={{ textAlign:'center', marginBottom:28, animation:'ndFadeUp .7s .2s both' }}>
            <div style={{ fontSize:13, letterSpacing:'.2em', color:'#2d8a6e', textTransform:'uppercase', marginBottom:8 }}>Más herramientas incluidas</div>
            <div style={{ fontSize:26, fontWeight:800, color:'#0d2820' }}>Todo lo que su equipo de calidad necesita</div>
          </div>
          <div className="s8-grid">
            {[
              {bg:'#fef9c3',i:'📅',n:'Control de Vencimientos',d:'Alertas automáticas antes de que venzan contratos, títulos y certificaciones del personal. Sin sorpresas en la visita.',t:'Alertas por email'},
              {bg:'#dcfce7',i:'✓', n:'CAPAs — Plan de Mejoramiento',d:'Registre hallazgos, asigne responsables, haga seguimiento y cierre acciones con evidencia documental trazable.',t:'Seguimiento en tiempo real'},
              {bg:'#e0f2fe',i:'🦺',n:'SG-SST — Res. 0312/2019',d:'Las tres fases del Sistema de Gestión de Seguridad y Salud en el Trabajo, con checklist y exportación de informes.',t:'3 fases completas'},
              {bg:'#fce7f3',i:'📊',n:'Indicadores de Calidad',d:'Res. 256/2016 — trazadores con semáforo de cumplimiento, registro histórico y comparativos por período.',t:'Res. 256/2016'},
            ].map(({bg,i,n,d,t}) => (
              <div key={n} className="s8-card">
                <div className="s8-icon" style={{ background: bg }}>{i}</div>
                <div>
                  <div className="s8-name">{n}</div>
                  <div className="s8-desc">{d}</div>
                  <div className="s8-tag">{t}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── S9 — Status ── */}
        <div id="nd-s9" className={`nd-scene${active('s9') ? ' active' : ''}`}>
          <div style={{ textAlign:'center', marginBottom:28, animation:'ndFadeUp .7s .1s both' }}>
            <div style={{ fontSize:13, letterSpacing:'.2em', color:'#2d8a6e', textTransform:'uppercase', marginBottom:8 }}>Infraestructura de confianza</div>
            <div style={{ fontSize:26, fontWeight:800, color:'#0d2820' }}>Disponible cuando su IPS lo necesita</div>
          </div>
          <div className="s9-mock">
            <div className="s9-head">
              <div className="s9-hl">NormaLis</div>
              <div className="s9-ht">Estado del servicio</div>
            </div>
            <div className="s9-body">
              <div className="s9-ok">
                <span style={{ fontSize:20 }}>✓</span>
                <div>
                  <div style={{ fontWeight:700, color:'#15803d', fontSize:14 }}>Todos los sistemas operativos</div>
                  <div style={{ fontSize:11, color:'#4ade80', marginTop:2 }}>app.normalis.co/status — verificado en tiempo real</div>
                </div>
              </div>
              {[
                ['Aplicación web','Next.js en Vercel'],
                ['Base de datos (Firebase)','Firestore + Authentication'],
                ['API IA (Cloudflare Worker)','Asistente normativo + proxy'],
              ].map(([name,sub]) => (
                <div key={name} className="s9-row">
                  <div className="s9-left">
                    <div className="s9-dot"/>
                    <div><div className="s9-sname">{name}</div><div className="s9-ssub">{sub}</div></div>
                  </div>
                  <div className="s9-status">Operativo</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── S10 — Precios ── */}
        <div id="nd-s10" className={`nd-scene${active('s10') ? ' active' : ''}`}>
          <div className="s10-top">
            <h2>Planes y Precios</h2>
            <p>Actualizaciones automáticas incluidas cuando cambia la normativa</p>
          </div>
          <div className="s10-plans">
            {[
              { name:'Básico', price:'$199.000', period:'COP / mes · $166K anual', feat:['1 sede · 2 usuarios','Auditoría Res. 3100 básica','Generador de documentos (5 plantillas)','Calendario de vencimientos','Dashboard de cumplimiento'], href:'https://checkout.bold.co/payment/LNK_QH7C9QNC61' },
              { name:'Profesional', price:'$399.000', period:'COP / mes · $332K anual', feat:['1 sede · 5 usuarios','Auditoría completa 559 criterios','PAMEC + Indicadores Res. 256','SG-SST Res. 0312/2019','Chat IA normativo','PQRS, incidentes y bitácora'], href:'https://checkout.bold.co/payment/LNK_JTRUHD363J', feat:true },
              { name:'Enterprise', price:'A la medida', period:'Sedes y usuarios ilimitados', feat:['Todo el plan Profesional','Sedes y usuarios ilimitados','Integraciones a la medida','Capacitación presencial','Soporte dedicado 24/7'], href:'mailto:info@normalis.co' },
            ].map((p: { name: string; price: string; period: string; feat: string[]; href: string; featured?: boolean }) => (
              <div key={p.name} className={`s10-plan${p.featured?' feat':''}`}>
                <div className="s10-pname">{p.name}</div>
                <div className="s10-price">{p.price}</div>
                <div className="s10-period">{p.period}</div>
                <ul className="s10-feats">{p.feat.map(f => <li key={f}>{f}</li>)}</ul>
                <a className={`s10-btn${p.featured?' s10-btn-w':''}`} href={p.href} target="_blank" rel="noopener noreferrer">
                  {p.name === 'Enterprise' ? 'Contactar' : 'Comenzar ahora'}
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* ── S11 — CTA Final ── */}
        <div id="nd-s11" className={`nd-scene${active('s11') ? ' active' : ''}`} style={{ textAlign:'center' }}>
          <div className="s11-small">¿Su IPS lista para la habilitación?</div>
          <div className="s11-big">Empiece hoy en<br/><span style={{ color:'#6dd4ae' }}>normalis.co</span></div>
          <div className="s11-url">Demo gratuita · 20 minutos · Sin compromiso</div>
          <div className="s11-detail">
            info@normalis.co
            <span className="s11-div"/>
            Desde COP 199.000/mes
            <span className="s11-div"/>
            Resolución 3100/2019 · Resolución 465/2025
          </div>
        </div>
      </div>
    </>
  );
}
