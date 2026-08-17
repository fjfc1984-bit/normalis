'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth as fbAuth, db as fbDb } from '@/lib/firebase';
import { logSecurityEvent } from '@/lib/securityLog';
import {
  esErrorMfaRequerido, getMultiFactorResolver, resolverDesafioTotp,
  iniciarEnrolamientoTotp, confirmarEnrolamientoTotp, tieneTotpEnrolado,
  type MultiFactorResolver, type EnrolamientoTotp,
} from '@/lib/mfa';
import Button from '@/components/ui/Button';

type Step = 'idle' | 'loading' | 'error' | 'mfa-challenge' | 'mfa-enroll';

// Rutas de destino por rol tras un login exitoso (con o sin MFA de por medio).
// Se centraliza aquí porque hay tres caminos que terminan enrutando:
// login directo, login tras resolver el desafío MFA, y login tras completar
// el enrolamiento MFA por primera vez.
function destinoPorRol(rol: string): string | null {
  switch (rol) {
    case 'admin':   return '/admin';
    case 'cliente':
    case 'piloto':  return '/dashboard';
    default:        return null;
  }
}

export default function LoginForm() {
  const router  = useRouter();
  const params  = useSearchParams();
  const blocked = params.get('blocked');

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep]         = useState<Step>('idle');
  const [error, setError]       = useState('');

  // ── Desafío MFA (cuenta que YA tiene TOTP enrolado) ─────────────────────
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [mfaCode, setMfaCode]         = useState('');

  // ── Enrolamiento MFA (admin sin TOTP configurado aún — obligatorio) ────
  const [enrolPendingUser, setEnrolPendingUser] = useState<User | null>(null);
  const [enrolamiento, setEnrolamiento]         = useState<EnrolamientoTotp | null>(null);
  const [enrolCode, setEnrolCode]               = useState('');

  async function despuesDeAutenticar(user: User) {
    const snap = await getDoc(doc(fbDb, 'usuarios', user.uid));
    if (!snap.exists()) throw new Error('Usuario no encontrado en el sistema.');
    const data = snap.data();
    const rol  = data.rol as string;

    if (rol === 'pendiente') {
      setError('Tu cuenta está en revisión. El equipo NormaLis te notificará por correo.');
      setStep('error');
      await signOut(fbAuth);
      return;
    }
    if (rol === 'rechazado') {
      setError('El acceso fue denegado. Contáctanos en fjfc1984@gmail.com.');
      setStep('error');
      await signOut(fbAuth);
      return;
    }

    // Verificación en dos pasos obligatoria para administradores: si es
    // admin y aún no tiene TOTP enrolado, se le exige configurarlo antes de
    // entrar — no hay forma de omitir este paso para esa cuenta.
    if (rol === 'admin' && !tieneTotpEnrolado(user)) {
      try {
        const datos = await iniciarEnrolamientoTotp(user, user.email ?? 'admin@normalis.co');
        setEnrolPendingUser(user);
        setEnrolamiento(datos);
        setStep('mfa-enroll');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(
          msg.includes('operation-not-allowed')
            ? 'La verificación en dos pasos no está habilitada aún en el proyecto de Firebase. Contacta al equipo técnico.'
            : `No se pudo iniciar la verificación en dos pasos: ${msg}`,
        );
        setStep('error');
        await signOut(fbAuth);
      }
      return;
    }

    const destino = destinoPorRol(rol);
    if (!destino) {
      setError('Rol no reconocido. Contacta soporte.');
      setStep('error');
      await signOut(fbAuth);
      return;
    }
    logSecurityEvent('login', 'auth');
    router.replace(destino);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setStep('loading');
    setError('');

    try {
      const cred = await signInWithEmailAndPassword(fbAuth, email, password);
      await despuesDeAutenticar(cred.user);
    } catch (err: unknown) {
      if (esErrorMfaRequerido(err)) {
        const resolver = getMultiFactorResolver(fbAuth, err);
        setMfaResolver(resolver);
        setStep('mfa-challenge');
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('invalid-credential') || msg.includes('wrong-password')) {
        setError('Correo o contraseña incorrectos.');
      } else if (msg.includes('too-many-requests')) {
        setError('Demasiados intentos. Espera unos minutos.');
      } else {
        setError(msg);
      }
      setStep('error');
    }
  }

  async function handleMfaChallenge(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaResolver) return;
    setStep('loading');
    setError('');
    try {
      const cred = await resolverDesafioTotp(mfaResolver, mfaCode);
      setMfaResolver(null);
      setMfaCode('');
      await despuesDeAutenticar(cred.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes('invalid-verification-code') || msg.includes('invalid-code')
          ? 'Código incorrecto. Verifica la hora de tu dispositivo y vuelve a intentar.'
          : `No se pudo verificar el código: ${msg}`,
      );
      setStep('mfa-challenge');
    }
  }

  async function handleMfaEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolPendingUser || !enrolamiento) return;
    setStep('loading');
    setError('');
    try {
      await confirmarEnrolamientoTotp(
        enrolPendingUser, enrolamiento.secret, enrolCode,
        `Verificación en dos pasos — ${enrolPendingUser.email ?? 'admin'}`,
      );
      await logSecurityEvent('mfa_enrolado', 'auth', 'Enrolamiento TOTP completado en login');
      const user = enrolPendingUser;
      setEnrolPendingUser(null);
      setEnrolamiento(null);
      setEnrolCode('');
      await despuesDeAutenticar(user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes('invalid-verification-code') || msg.includes('invalid-code')
          ? 'Código incorrecto. Verifica que escaneaste el QR correctamente y que la hora de tu dispositivo esté sincronizada.'
          : `No se pudo completar el enrolamiento: ${msg}`,
      );
      setStep('mfa-enroll');
    }
  }

  async function cancelarYVolver() {
    setMfaResolver(null);
    setMfaCode('');
    setEnrolPendingUser(null);
    setEnrolamiento(null);
    setEnrolCode('');
    setError('');
    setStep('idle');
    await signOut(fbAuth).catch(() => {});
  }

  // ── Pantalla: desafío MFA (código de la app autenticadora) ─────────────
  if (step === 'mfa-challenge' || (step === 'loading' && mfaResolver)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br
                       from-primary-900 to-primary-700 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-primary-700">Verificación en dos pasos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Abre tu app autenticadora e ingresa el código de 6 dígitos.
            </p>
          </div>
          <form onSubmit={handleMfaChallenge} className="space-y-5">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={mfaCode}
              onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
              required
              placeholder="000000"
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-center
                         text-2xl tracking-[0.5em] font-mono
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
            )}
            <Button
              type="submit"
              loading={step === 'loading'}
              disabled={mfaCode.length !== 6}
              className="w-full justify-center"
            >
              Verificar
            </Button>
            <button
              type="button"
              onClick={cancelarYVolver}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600"
            >
              Cancelar y volver a iniciar sesión
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ── Pantalla: enrolamiento MFA obligatorio (primera vez, solo admin) ───
  if (step === 'mfa-enroll' || (step === 'loading' && enrolamiento)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br
                       from-primary-900 to-primary-700 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-primary-700">Activa la verificación en dos pasos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Requisito de seguridad para cuentas de administrador. Escanea este código con
              Google Authenticator, Authy u otra app compatible con TOTP.
            </p>
          </div>
          {enrolamiento && (
            <div className="flex flex-col items-center gap-3 mb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enrolamiento.qrCodeDataUrl}
                alt="Código QR para configurar la verificación en dos pasos"
                width={180}
                height={180}
                className="rounded-lg border border-gray-200"
              />
              <details className="w-full text-center">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                  ¿No puedes escanear? Ingresa la clave manualmente
                </summary>
                <code className="block mt-2 text-xs bg-gray-50 border border-gray-200 rounded-lg
                                 p-2 break-all select-all">
                  {enrolamiento.secretKey}
                </code>
              </details>
            </div>
          )}
          <form onSubmit={handleMfaEnroll} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código de 6 dígitos de la app
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={enrolCode}
                onChange={e => setEnrolCode(e.target.value.replace(/\D/g, ''))}
                required
                placeholder="000000"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg text-center
                           text-2xl tracking-[0.5em] font-mono
                           focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
            )}
            <Button
              type="submit"
              loading={step === 'loading'}
              disabled={enrolCode.length !== 6}
              className="w-full justify-center"
            >
              Confirmar y activar
            </Button>
            <button
              type="button"
              onClick={cancelarYVolver}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600"
            >
              Cancelar y volver a iniciar sesión
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ── Pantalla: login normal (correo + contraseña) ────────────────────────
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br
                     from-primary-900 to-primary-700 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">NormaLis</h1>
          <p className="text-sm text-gray-500 mt-1">
            Software colombiano de habilitación IPS
          </p>
        </div>

        {/* Mensaje de acceso bloqueado */}
        {blocked && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg
                          text-sm text-amber-800">
            Tu cuenta no tiene acceso a esta sección.
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="admin@ips.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
          )}

          <Button
            type="submit"
            loading={step === 'loading'}
            className="w-full justify-center"
          >
            Ingresar
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          ¿No tienes cuenta?{' '}
          <a href="/registro"
             className="text-primary-600 hover:underline">
            Regístrate aquí
          </a>
        </p>
      </div>
    </main>
  );
}
