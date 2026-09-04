'use client';

/**
 * web/app/registro/page.tsx
 * Módulo de auto-registro de IPS — 2 pasos:
 *   Paso 1: Nombre IPS, NIT, Tipo IPS, Ciudad
 *   Paso 2: Responsable, cargo, tel, email, contraseña
 * Firebase Auth → Firestore usuarios/{uid} → signOut
 * Notificación al admin vía Cloudflare Worker
 */

import { useState, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth as fbAuth, db as fbDb } from '@/lib/firebase';

// ── Tipos ────────────────────────────────────────────
interface Step1Data {
  nombreIPS: string;
  nit: string;
  tipoIPS: string;
  ciudad: string;
}

interface Step2Data {
  nombreContacto: string;
  cargo: string;
  telefono: string;
  email: string;
  password: string;
  passwordConfirm: string;
  terms: boolean;
}

type Screen = 'step1' | 'step2' | 'success';

// ── Rate limiting (localStorage) ─────────────────────
const RATE_KEY    = 'normalis_reg_attempts';
const RATE_WINDOW = 60 * 60 * 1000; // 1 hora
const RATE_MAX    = 3;

function checkRateLimit(): { ok: boolean; waitMin?: number } {
  if (typeof window === 'undefined') return { ok: true };
  const now = Date.now();
  let attempts: number[] = [];
  try { attempts = JSON.parse(localStorage.getItem(RATE_KEY) ?? '[]'); } catch { attempts = []; }
  attempts = attempts.filter(ts => now - ts < RATE_WINDOW);
  if (attempts.length >= RATE_MAX) {
    const waitMin = Math.ceil((RATE_WINDOW - (now - attempts[0])) / 60000);
    return { ok: false, waitMin };
  }
  attempts.push(now);
  try { localStorage.setItem(RATE_KEY, JSON.stringify(attempts)); } catch { /* noop */ }
  return { ok: true };
}

// ── Fortaleza de contraseña ───────────────────────────
function passwordStrength(p: string): { score: number; label: string; color: string } {
  let score = 0;
  if (p.length >= 8)           score++;
  if (/[A-Z]/.test(p))         score++;
  if (/[0-9]/.test(p))         score++;
  if (/[^A-Za-z0-9]/.test(p))  score++;
  const levels = [
    { label: '',          color: '#d1d5db' },
    { label: 'Débil',     color: '#ef4444' },
    { label: 'Regular',   color: '#f59e0b' },
    { label: 'Buena',     color: '#10b981' },
    { label: 'Fuerte 💪', color: '#0d9488' },
  ];
  return { score, ...levels[score] };
}

// ── Mensajes de error Firebase ────────────────────────
function friendlyError(code: string): string {
  if (code?.includes('email-already-in-use'))
    return 'Ya existe una cuenta con ese correo. ¿Quieres iniciar sesión?';
  if (code?.includes('invalid-email'))
    return 'El correo electrónico no es válido.';
  if (code?.includes('weak-password'))
    return 'La contraseña es muy débil. Usa al menos 8 caracteres.';
  if (code?.includes('too-many-requests'))
    return 'Demasiados intentos. Espera unos minutos.';
  if (code?.includes('network-request-failed'))
    return 'Error de red. Verifica tu conexión.';
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}

// ── Sanitizar texto ───────────────────────────────────
function sanitize(s: string): string {
  return s.replace(/[<>"'`]/g, '').slice(0, 200);
}

// ════════════════════════════════════════════════════
//  Componente principal
// ════════════════════════════════════════════════════
export default function RegistroPage() {
  const [screen, setScreen] = useState<Screen>('step1');
  const [error,  setError]  = useState('');
  const [loading, setLoading] = useState(false);

  // Datos acumulados
  const [step1, setStep1] = useState<Step1Data>({
    nombreIPS: '', nit: '', tipoIPS: '', ciudad: '',
  });
  const [step2, setStep2] = useState<Step2Data>({
    nombreContacto: '', cargo: '', telefono: '', email: '',
    password: '', passwordConfirm: '', terms: false,
  });

  // Resultado del registro exitoso
  const [successData, setSuccessData] = useState({ ips: '', email: '' });

  // Password UI
  const [showPass,  setShowPass]  = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const strength = passwordStrength(step2.password);

  // ── Paso 1 → Paso 2 ──────────────────────────────
  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    const nombre = sanitize(step1.nombreIPS.trim());
    const ciudad = sanitize(step1.ciudad.trim());
    if (!nombre) { setError('Ingresa el nombre de la IPS.'); return; }
    if (!ciudad)  { setError('Ingresa la ciudad.'); return; }
    setStep1(s => ({ ...s, nombreIPS: nombre, ciudad }));
    setError('');
    setScreen('step2');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Paso 2 → Registro ────────────────────────────
  const handleStep2 = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const contacto = sanitize(step2.nombreContacto.trim());
    const email    = step2.email.trim().toLowerCase();
    const pass     = step2.password;
    const pass2    = step2.passwordConfirm;

    if (!contacto)          { setError('Ingresa tu nombre completo.'); return; }
    if (!email.includes('@')) { setError('El correo electrónico no es válido.'); return; }
    if (pass.length < 8)    { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (pass !== pass2)     { setError('Las contraseñas no coinciden.'); return; }
    if (!step2.terms)       { setError('Debes aceptar los términos para continuar.'); return; }

    const rate = checkRateLimit();
    if (!rate.ok) {
      setError(`Demasiados intentos. Espera ${rate.waitMin} minuto(s) antes de volver a registrarte.`);
      return;
    }

    setLoading(true);
    let cred: Awaited<ReturnType<typeof createUserWithEmailAndPassword>> | null = null;

    try {
      // 1. Crear cuenta Firebase Auth
      cred = await createUserWithEmailAndPassword(fbAuth, email, pass);
      const uid = cred.user.uid;

      // 2. Actualizar displayName
      await updateProfile(cred.user, { displayName: contacto });

      // 3. Crear documento Firestore
      await setDoc(doc(fbDb, 'usuarios', uid), {
        rol:            'pendiente',
        nombre:         sanitize(step1.nombreIPS),
        nombreContacto: contacto,
        cargo:          sanitize(step2.cargo.trim())    || '',
        email,
        telefono:       sanitize(step2.telefono.trim()) || '',
        nit:            sanitize(step1.nit.trim())      || '',
        tipoIPS:        step1.tipoIPS                   || '',
        ciudad:         sanitize(step1.ciudad.trim()),
        fechaSolicitud: serverTimestamp(),
        estado:         'pendiente_aprobacion',
        activo:         false,
        expiresAt:      null,
      });

      // 4. Cerrar sesión (espera aprobación del admin)
      await signOut(fbAuth);

      // 5. Notificar admin por email vía Cloudflare Worker (best-effort)
      fetch('https://normalis.fjfc1984.workers.dev/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'nueva_solicitud_admin',
          data: {
            ips_nombre:      sanitize(step1.nombreIPS),
            nit:             sanitize(step1.nit.trim())      || '',
            tipo_ips:        step1.tipoIPS                   || '',
            ciudad:          sanitize(step1.ciudad.trim())   || '',
            nombre_contacto: contacto,
            cargo:           sanitize(step2.cargo.trim())    || '',
            email,
            telefono:        sanitize(step2.telefono.trim()) || '',
            uid,
          },
        }),
      }).catch(() => { /* silencioso — el registro ya ocurrió */ });

      // 6. Mostrar pantalla de éxito
      setSuccessData({ ips: sanitize(step1.nombreIPS), email });
      setScreen('success');

    } catch (err: unknown) {
      // ROLLBACK: si Auth se creó pero Firestore falló, eliminar la cuenta Auth
      if (cred?.user) {
        try { await cred.user.delete(); } catch {
          try { await signOut(fbAuth); } catch { /* noop */ }
        }
      }
      const code = (err as { code?: string })?.code ?? '';
      setError(friendlyError(code));
    } finally {
      setLoading(false);
    }
  }, [step1, step2]);

  // ════════════════════════════════════════════════
  //  Render
  // ════════════════════════════════════════════════
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br
                     from-primary-900 to-primary-700 p-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary-700">NormaLis</h1>
          <p className="text-sm text-gray-500 mt-1">Solicitar acceso al software de habilitación IPS</p>
        </div>

        {/* ── Indicador de pasos ── */}
        {screen !== 'success' && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {/* Paso 1 */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2
              ${screen === 'step1'
                ? 'bg-primary-50 border-primary-500 text-primary-700'
                : 'bg-primary-600 border-primary-600 text-white'}`}>
              {screen === 'step2' ? '✓' : '1'}
            </div>
            <span className="text-xs text-gray-400 font-semibold">IPS</span>
            {/* Línea */}
            <div className={`flex-1 max-w-[40px] h-0.5 rounded ${screen === 'step2' ? 'bg-primary-500' : 'bg-gray-200'}`} />
            {/* Paso 2 */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2
              ${screen === 'step2'
                ? 'bg-primary-50 border-primary-500 text-primary-700'
                : 'bg-gray-100 border-gray-200 text-gray-400'}`}>
              2
            </div>
            <span className="text-xs text-gray-400 font-semibold">Acceso</span>
          </div>
        )}

        {/* ── Error global ── */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* ══════════════════════════════════════════
            PASO 1 — Datos de la IPS
        ══════════════════════════════════════════ */}
        {screen === 'step1' && (
          <form onSubmit={handleStep1} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                Nombre de la IPS / Organización *
              </label>
              <input
                type="text"
                value={step1.nombreIPS}
                onChange={e => setStep1(s => ({ ...s, nombreIPS: e.target.value }))}
                required
                maxLength={150}
                placeholder="Ej. Clínica San Rafael"
                autoComplete="organization"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                  NIT (opcional)
                </label>
                <input
                  type="text"
                  value={step1.nit}
                  onChange={e => setStep1(s => ({ ...s, nit: e.target.value }))}
                  maxLength={20}
                  placeholder="900123456-7"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                  Tipo de IPS
                </label>
                <select
                  value={step1.tipoIPS}
                  onChange={e => setStep1(s => ({ ...s, tipoIPS: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">— Selecciona —</option>
                  <option value="ips_primaria">IPS Primaria</option>
                  <option value="clinica">Clínica</option>
                  <option value="hospital">Hospital</option>
                  <option value="consultorio">Consultorio / Esp.</option>
                  <option value="profesional_independiente">Profesional Independiente de Salud</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                Ciudad *
              </label>
              <input
                type="text"
                value={step1.ciudad}
                onChange={e => setStep1(s => ({ ...s, ciudad: e.target.value }))}
                required
                maxLength={80}
                placeholder="Ej. Bogotá, Medellín…"
                autoComplete="address-level2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white
                         font-bold rounded-xl text-sm transition-colors mt-2"
            >
              Continuar →
            </button>
          </form>
        )}

        {/* ══════════════════════════════════════════
            PASO 2 — Responsable + acceso
        ══════════════════════════════════════════ */}
        {screen === 'step2' && (
          <form onSubmit={handleStep2} className="space-y-4" noValidate>

            {/* Banner de contexto */}
            <div className="flex items-center gap-2 bg-teal-50 border border-teal-200
                            rounded-lg px-3 py-2 text-xs text-teal-700">
              🏥 <span>Registrando acceso para: <strong>{step1.nombreIPS}</strong></span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                Tu nombre completo (responsable) *
              </label>
              <input
                type="text"
                value={step2.nombreContacto}
                onChange={e => setStep2(s => ({ ...s, nombreContacto: e.target.value }))}
                required
                maxLength={100}
                placeholder="Nombre y apellido"
                autoComplete="name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                  Cargo
                </label>
                <input
                  type="text"
                  value={step2.cargo}
                  onChange={e => setStep2(s => ({ ...s, cargo: e.target.value }))}
                  maxLength={80}
                  placeholder="Ej. Coord. Calidad"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                  WhatsApp / Teléfono
                </label>
                <input
                  type="tel"
                  value={step2.telefono}
                  onChange={e => setStep2(s => ({ ...s, telefono: e.target.value }))}
                  maxLength={25}
                  placeholder="+57 300 000 0000"
                  autoComplete="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                Correo electrónico *
              </label>
              <input
                type="email"
                value={step2.email}
                onChange={e => setStep2(s => ({ ...s, email: e.target.value }))}
                required
                maxLength={254}
                placeholder="correo@ips.com"
                autoComplete="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-400 mt-1">Este correo será tu usuario de acceso.</p>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                Contraseña *
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={step2.password}
                  onChange={e => setStep2(s => ({ ...s, password: e.target.value }))}
                  required
                  minLength={8}
                  maxLength={128}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-gray-600 text-base p-1"
                  aria-label="Mostrar contraseña"
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
              {/* Barra de fortaleza */}
              {step2.password && (
                <div className="mt-1.5">
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${strength.score * 25}%`,
                        background: strength.color,
                      }}
                    />
                  </div>
                  <p className="text-xs mt-0.5 font-semibold" style={{ color: strength.color }}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                Confirmar contraseña *
              </label>
              <div className="relative">
                <input
                  type={showPass2 ? 'text' : 'password'}
                  value={step2.passwordConfirm}
                  onChange={e => setStep2(s => ({ ...s, passwordConfirm: e.target.value }))}
                  required
                  maxLength={128}
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPass2(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-gray-600 text-base p-1"
                  aria-label="Mostrar contraseña"
                >
                  {showPass2 ? '🙈' : '👁'}
                </button>
              </div>
              {step2.passwordConfirm && step2.passwordConfirm !== step2.password && (
                <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden.</p>
              )}
            </div>

            {/* Términos */}
            <div className="flex items-start gap-2 mt-2">
              <input
                type="checkbox"
                id="terms"
                checked={step2.terms}
                onChange={e => setStep2(s => ({ ...s, terms: e.target.checked }))}
                required
                className="mt-0.5 w-4 h-4 flex-shrink-0 accent-teal-600 cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
                Acepto los{' '}
                <a href="https://normalis.co/terminos.html" target="_blank" rel="noopener noreferrer"
                   className="text-primary-600 hover:underline">
                  Términos y Condiciones
                </a>{' '}
                y la{' '}
                <a href="https://normalis.co/politica-privacidad.html" target="_blank" rel="noopener noreferrer"
                   className="text-primary-600 hover:underline">
                  Política de Tratamiento de Datos Personales
                </a>{' '}
                de NormaLis, y autorizo el almacenamiento de los datos conforme a la Ley 1581/2012.
              </label>
            </div>

            {/* Botones */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => { setError(''); setScreen('step1'); }}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700
                           font-bold rounded-xl text-sm transition-colors flex-shrink-0"
              >
                ← Atrás
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50
                           disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm
                           transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando…
                  </>
                ) : (
                  '✓ Enviar solicitud'
                )}
              </button>
            </div>
          </form>
        )}

        {/* ══════════════════════════════════════════
            PANTALLA DE ÉXITO
        ══════════════════════════════════════════ */}
        {screen === 'success' && (
          <div className="text-center py-4">
            <span className="text-6xl block mb-4">🎉</span>
            <h2 className="text-xl font-bold text-gray-800 mb-2">¡Solicitud enviada!</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-5 max-w-xs mx-auto">
              Tu cuenta ha sido creada para{' '}
              <strong className="text-teal-700">{successData.ips}</strong>.<br /><br />
              Un administrador de NormaLis revisará tu solicitud y activará el acceso.
              Te notificaremos a{' '}
              <strong className="text-teal-700">{successData.email}</strong>.
            </p>

            <div className="flex gap-2 justify-center flex-wrap mb-6">
              <span className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200
                               rounded-full px-3 py-1.5 text-xs font-semibold text-teal-700">
                ⏱ Revisión en 24–48 h
              </span>
              <span className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200
                               rounded-full px-3 py-1.5 text-xs font-semibold text-teal-700">
                📧 Recibirás un correo
              </span>
            </div>

            <a
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary-600
                         hover:bg-primary-700 text-white font-bold rounded-xl text-sm
                         transition-colors no-underline"
            >
              Ir al inicio de sesión
            </a>
          </div>
        )}

        {/* Footer */}
        {screen !== 'success' && (
          <>
            <hr className="border-gray-100 my-5" />
            <p className="text-center text-xs text-gray-400">
              ¿Ya tienes cuenta?{' '}
              <a href="/login" className="text-primary-600 hover:underline font-semibold">
                Ingresar
              </a>
            </p>
            <p className="text-center text-xs text-gray-300 mt-1">
              NormaLis · Res. 3100/2019 &amp; 465/2025 · 🔒 Datos seguros
            </p>
          </>
        )}

      </div>
    </main>
  );
}
