'use client';

/**
 * app/success/page.tsx
 * Página de confirmación de pago Bold.co — migrada desde success.html
 *
 * Flujo:
 *  1. Firebase Auth detecta sesión activa
 *  2. Pollemos Firestore usuarios/{uid} cada 2s hasta que aparezca
 *     { plan, planActivatedAt } (seteados por el webhook de Bold.co)
 *  3. Estado verifying → success | pending según resultado
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// ── Types ────────────────────────────────────────────────────────────────────
type PageState = 'verifying' | 'success' | 'pending';

const PLAN_LABELS: Record<string, string> = {
  basico:      'NormaLis Esencial',
  profesional: 'NormaLis Profesional',
  empresarial: 'NormaLis Empresarial',
};

interface StepProps {
  dot:   'pending' | 'active' | 'done' | 'skip';
  text:  string;
  done?: boolean;
}

// ── Sub-components ───────────────────────────────────────────────────────────
function NavBar() {
  return (
    <nav className="bg-slate-900 px-[5%] flex items-center h-16">
      <Link href="/" className="flex items-center gap-3 no-underline">
        <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center
                        text-lg font-black text-white">N</div>
        <span className="text-xl font-black text-teal-400 tracking-widest">NormaLis</span>
      </Link>
    </nav>
  );
}

function Step({ dot, text, done }: StepProps) {
  const dotCls = {
    pending: 'border-2 border-slate-300 bg-slate-100',
    active:  'border-[2.5px] border-teal-600 border-t-transparent rounded-full animate-spin bg-transparent',
    done:    'bg-teal-600 text-white text-[11px] flex items-center justify-center',
    skip:    'bg-slate-100 text-slate-400',
  }[dot];

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className={`w-5 h-5 rounded-full shrink-0 ${dotCls}`}>
        {dot === 'done' && '✓'}
      </div>
      <span className={`text-sm flex-1 ${done ? 'text-teal-600 font-semibold' : dot === 'active' ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
        {text}
      </span>
    </div>
  );
}

// ── Verifying state ───────────────────────────────────────────────────────────
function Verifying({ progress, step }: { progress: number; step: number }) {
  return (
    <div>
      <span className="text-6xl block mb-5">⚙️</span>
      <h1 className="text-3xl font-black text-slate-900 mb-2">Verificando tu pago</h1>
      <p className="text-slate-500 text-base leading-relaxed mb-6">
        Estamos confirmando tu pago con Bold.co y activando tu plan. Esto toma unos segundos.
      </p>

      <div className="h-1 bg-slate-100 rounded-full overflow-hidden mb-7">
        <div
          className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 rounded-full transition-all duration-[1500ms] ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mb-7">
        <Step dot="done"    text="Pago recibido por Bold.co"          done />
        <Step dot={step >= 2 ? (step > 2 ? 'done' : 'active') : 'pending'}
              text="Activando plan en NormaLis…"                      done={step > 2} />
        <Step dot={step >= 3 ? (step > 3 ? 'done' : 'active') : 'pending'}
              text="Enviando email de confirmación"                    done={step > 3} />
        <Step dot={step >= 4 ? 'done' : 'pending'}
              text="Listo para usar"                                   done={step >= 4} />
      </div>
    </div>
  );
}

// ── Success state ─────────────────────────────────────────────────────────────
function Success({ planKey, ipsNombre }: { planKey: string; ipsNombre: string }) {
  const label = PLAN_LABELS[planKey] ?? 'Plan activo';
  return (
    <div>
      <span className="text-6xl block mb-5">🎉</span>
      <h1 className="text-3xl font-black text-slate-900 mb-2">¡Plan activado!</h1>
      <p className="text-slate-500 text-base leading-relaxed mb-5">
        Tu IPS ya tiene acceso completo a los módulos incluidos en tu plan.
      </p>

      <div className="inline-flex items-center gap-2 bg-green-50 border border-green-300
                      rounded-full px-5 py-2 text-green-800 font-bold text-sm mb-5">
        <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
        {label} ✓
      </div>

      {ipsNombre && (
        <p className="text-sm text-slate-500 mb-5">IPS: {ipsNombre}</p>
      )}

      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 text-left mb-7">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          ¿Qué hacer ahora?
        </p>
        {[
          'Revisa tu correo — ahí estará tu confirmación y factura',
          'Lanza tu primera autoevaluación de habilitación',
          'Descarga tu primer reporte PDF de cumplimiento',
        ].map((t, i) => (
          <div key={i} className="flex items-start gap-3.5 mb-3 last:mb-0">
            <div className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold
                            flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{t}</p>
          </div>
        ))}
      </div>

      <Link
        href="/dashboard"
        className="inline-block bg-gradient-to-r from-teal-600 to-indigo-600 text-white
                   rounded-full px-10 py-3.5 text-base font-bold no-underline
                   hover:opacity-90 transition-opacity"
      >
        Ir a la app →
      </Link>
      <p className="text-xs text-slate-400 mt-3">
        ¿Algún problema?{' '}
        <a href="mailto:fjfc1984@gmail.com" className="text-teal-600 font-semibold no-underline">
          fjfc1984@gmail.com
        </a>
      </p>
    </div>
  );
}

// ── Pending state ─────────────────────────────────────────────────────────────
function Pending() {
  return (
    <div>
      <span className="text-6xl block mb-5">⏳</span>
      <h1 className="text-3xl font-black text-slate-900 mb-2">Pago procesado</h1>
      <p className="text-slate-500 text-base leading-relaxed mb-5">
        Recibimos tu pago correctamente. Tu plan se activará en los próximos minutos.
      </p>

      <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-left mb-6">
        <p className="text-sm text-yellow-800 leading-relaxed">
          📧 Recibirás un <strong>email de confirmación</strong> cuando tu plan esté activo
          (normalmente menos de 2 minutos). Si no lo recibes en 10 minutos, escríbenos.
        </p>
      </div>

      <Link
        href="/login"
        className="inline-block bg-gradient-to-r from-teal-600 to-indigo-600 text-white
                   rounded-full px-10 py-3.5 text-base font-bold no-underline
                   hover:opacity-90 transition-opacity"
      >
        Ir a la app →
      </Link>
      <p className="text-xs text-slate-400 mt-3">
        ¿Demora más de lo normal?{' '}
        <a href="mailto:fjfc1984@gmail.com" className="text-teal-600 font-semibold no-underline">
          fjfc1984@gmail.com
        </a>
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SuccessPage() {
  const [state,     setState]     = useState<PageState>('verifying');
  const [progress,  setProgress]  = useState(15);
  const [step,      setStep]      = useState(2);   // 1=paid,2=activating,3=email,4=done
  const [planKey,   setPlanKey]   = useState('');
  const [ipsNombre, setIpsNombre] = useState('');

  const activatedRef  = useRef(false);
  const pollRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef   = useRef(0);

  function showSuccess(plan: string, nombre: string) {
    setPlanKey(plan);
    setIpsNombre(nombre);
    setStep(3);
    setProgress(75);

    setTimeout(() => {
      setStep(4);
      setProgress(100);
      setTimeout(() => setState('success'), 800);
    }, 1200);
  }

  function pollForPlan(uid: string) {
    pollRef.current = setInterval(async () => {
      attemptsRef.current += 1;
      setProgress(p => Math.min(p + 4, 65));

      try {
        const snap = await getDoc(doc(db, 'usuarios', uid));
        if (!snap.exists()) return;
        const data = snap.data() as Record<string, unknown>;

        if (data.plan && data.planActivatedAt) {
          clearInterval(pollRef.current!);
          activatedRef.current = true;
          showSuccess(data.plan as string, (data.nombre as string) ?? '');
        } else if (attemptsRef.current >= 15) {
          clearInterval(pollRef.current!);
          setState('pending');
        }
      } catch {
        if (attemptsRef.current >= 15) {
          clearInterval(pollRef.current!);
          setState('pending');
        }
      }
    }, 2000);
  }

  useEffect(() => {
    setProgress(15);

    const globalTimeout = setTimeout(() => {
      if (!activatedRef.current) {
        clearInterval(pollRef.current!);
        setState('pending');
      }
    }, 35_000);

    const unsub = onAuthStateChanged(auth, user => {
      if (user) {
        clearTimeout(globalTimeout);
        setProgress(30);
        setStep(2);
        pollForPlan(user.uid);
      } else {
        // Fallback: sessionStorage
        const rol      = sessionStorage.getItem('normalis_rol');
        const plan     = sessionStorage.getItem('normalis_plan');
        const nombre   = localStorage.getItem('normalis_ips_nombre') ?? '';

        if (rol === 'cliente' && plan) {
          clearTimeout(globalTimeout);
          activatedRef.current = true;
          showSuccess(plan, nombre);
        } else {
          clearTimeout(globalTimeout);
          setTimeout(() => {
            if (!activatedRef.current) setState('pending');
          }, 5_000);
        }
      }
    });

    // Animate progress while waiting
    const t1 = setTimeout(() => setProgress(20), 500);
    const t2 = setTimeout(() => setProgress(35), 2_000);

    return () => {
      unsub();
      clearTimeout(globalTimeout);
      clearTimeout(t1);
      clearTimeout(t2);
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-teal-50">
      <NavBar />
      <main className="flex-1 flex items-center justify-center px-[5%] py-10">
        <div className="bg-white border border-blue-100 rounded-3xl p-12 max-w-lg w-full
                        text-center shadow-[0_8px_40px_rgba(13,148,136,0.10)]">
          {state === 'verifying' && <Verifying progress={progress} step={step} />}
          {state === 'success'   && <Success   planKey={planKey} ipsNombre={ipsNombre} />}
          {state === 'pending'   && <Pending />}
        </div>
      </main>
    </div>
  );
}
