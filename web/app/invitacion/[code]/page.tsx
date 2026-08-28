'use client';

/**
 * web/app/invitacion/[code]/page.tsx
 * Aceptar invitación de Equipo IPS — página pública (sin autenticación).
 *
 * El dueño de una cuenta IPS genera este enlace desde /dashboard/equipo para
 * invitar a un compañero a compartir el acceso a los datos de su IPS. El
 * código en la URL es el id del documento `invitaciones/{code}`.
 *
 * Flujo (ver firestore.rules — invitaciones/{code} y usuarios/{uid}):
 *   1. Se crea la cuenta Firebase Auth + el doc usuarios/{uid} como
 *      rol:'pendiente', activo:false (única forma permitida por la regla de
 *      creación — igual que el registro normal en /registro).
 *   2. Con la cuenta ya autenticada, se lee invitaciones/{code}. La regla de
 *      lectura solo lo permite si el correo de la cuenta recién creada
 *      coincide con el correo al que se envió la invitación — así se evita
 *      que alguien use un enlace ajeno con su propio correo.
 *   3. Si el código es válido, pendiente y no ha expirado, se actualiza el
 *      propio doc usuarios/{uid} (nit_ips, rol:'cliente', activo:true) y se
 *      marca la invitación como usada — el usuario queda con acceso
 *      inmediato, sin pasar por la aprobación manual del admin, porque ya
 *      pertenece a una IPS previamente aprobada.
 *   4. Si algo falla después del paso 1, la cuenta ya existe como solicitud
 *      pendiente normal — quedará visible para un admin en Admin › Solicitudes
 *      como red de seguridad, en vez de perderse.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { auth as fbAuth, db as fbDb } from '@/lib/firebase';

type Screen = 'form' | 'ya-conectado' | 'enviando' | 'exito' | 'error';

// ── Rate limiting (localStorage) — mismo patrón que /registro ────────────
const RATE_KEY    = 'normalis_invite_attempts';
const RATE_WINDOW = 60 * 60 * 1000; // 1 hora
const RATE_MAX    = 5;

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

function sanitize(s: string): string {
  return s.replace(/[<>"'`]/g, '').slice(0, 200);
}

function friendlyAuthError(code: string): string {
  if (code?.includes('email-already-in-use'))
    return 'Ya existe una cuenta de NormaLis con ese correo. Inicia sesión y pídele a quien te invitó que te agregue con otro correo, o contáctanos.';
  if (code?.includes('invalid-email'))
    return 'El correo electrónico no es válido.';
  if (code?.includes('weak-password'))
    return 'La contraseña es muy débil. Usa al menos 8 caracteres.';
  if (code?.includes('network-request-failed'))
    return 'Error de red. Verifica tu conexión e inténtalo de nuevo.';
  return 'Ocurrió un error inesperado creando tu cuenta. Inténtalo de nuevo.';
}

export default function InvitacionPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code;

  const [screen, setScreen]   = useState<Screen>('form');
  const [checking, setChecking] = useState(true);
  const [error, setError]     = useState('');
  const [ipsExito, setIpsExito] = useState('');

  const [nombreContacto, setNombreContacto] = useState('');
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // Si ya hay una sesión activa, no intentamos crear una cuenta nueva encima.
  useEffect(() => {
    const unsub = onAuthStateChanged(fbAuth, user => {
      setChecking(false);
      if (user) setScreen('ya-conectado');
    });
    return () => unsub();
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const nombre = sanitize(nombreContacto.trim());
    const correo = email.trim().toLowerCase();

    if (!nombre)                 { setError('Ingresa tu nombre completo.'); return; }
    if (!correo.includes('@'))   { setError('El correo electrónico no es válido.'); return; }
    if (password.length < 8)     { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (password !== passwordConfirm) { setError('Las contraseñas no coinciden.'); return; }
    if (!code)                   { setError('Este enlace de invitación no es válido.'); return; }

    const rate = checkRateLimit();
    if (!rate.ok) {
      setError(`Demasiados intentos. Espera ${rate.waitMin} minuto(s) e inténtalo de nuevo.`);
      return;
    }

    setScreen('enviando');
    let cred: Awaited<ReturnType<typeof createUserWithEmailAndPassword>> | null = null;
    let cuentaCreada = false;

    try {
      // 1. Crear cuenta Auth + doc usuarios (pendiente/inactivo, único estado
      //    que permite la regla de creación).
      cred = await createUserWithEmailAndPassword(fbAuth, correo, password);
      const uid = cred.user.uid;
      await updateProfile(cred.user, { displayName: nombre });

      await setDoc(doc(fbDb, 'usuarios', uid), {
        rol:            'pendiente',
        nombre:         '',
        nombreContacto: nombre,
        cargo:          '',
        email:          correo,
        telefono:       '',
        nit:            '',
        nit_ips:        '',
        tipoIPS:        '',
        ciudad:         '',
        fechaSolicitud: serverTimestamp(),
        estado:         'pendiente_aprobacion',
        activo:         false,
        expiresAt:      null,
      });
      cuentaCreada = true;

      // 2. Leer la invitación (solo permitido si el correo coincide).
      const invRef  = doc(fbDb, 'invitaciones', code);
      const invSnap = await getDoc(invRef);

      if (!invSnap.exists()) throw new Error('CODIGO_INVALIDO');
      const inv = invSnap.data() as {
        estado: string; nit: string; nombreIPS?: string;
        expiraEn?: { toDate: () => Date } | null;
      };
      if (inv.estado !== 'pendiente') throw new Error('CODIGO_USADO');
      if (inv.expiraEn && inv.expiraEn.toDate().getTime() < Date.now()) throw new Error('CODIGO_EXPIRADO');

      // 3. Vincular la cuenta al equipo de la IPS y marcar la invitación como usada.
      await updateDoc(doc(fbDb, 'usuarios', uid), {
        nit_ips: inv.nit,
        nombre:  inv.nombreIPS || '',
        rol:     'cliente',
        activo:  true,
        estado:  'activo',
        rol_ips: 'miembro',
      });
      await updateDoc(invRef, {
        estado:   'usada',
        usadoPor: uid,
        usadoEn:  serverTimestamp(),
      });

      setIpsExito(inv.nombreIPS || '');
      setScreen('exito');

    } catch (err: unknown) {
      const message = (err as Error)?.message ?? '';
      const authCode = (err as { code?: string })?.code ?? '';

      if (!cuentaCreada) {
        // Falló antes de crear nada — no quedó ningún registro huérfano.
        setError(friendlyAuthError(authCode));
        setScreen('form');
        return;
      }

      // La cuenta ya existe (pendiente/inactiva) — no la borramos, para no
      // perder el registro. Mostramos la razón específica si la conocemos.
      if (message === 'CODIGO_INVALIDO') {
        setError('Este enlace de invitación no existe o ya no está disponible.');
      } else if (message === 'CODIGO_USADO') {
        setError('Esta invitación ya fue utilizada o fue revocada por quien te invitó.');
      } else if (message === 'CODIGO_EXPIRADO') {
        setError('Esta invitación expiró. Pídele a quien te invitó que te genere una nueva.');
      } else {
        setError('No pudimos vincular tu cuenta a la IPS automáticamente (el correo podría no coincidir con el de la invitación). Tu cuenta quedó creada y un administrador de NormaLis la revisará. Si crees que es un error, contáctanos.');
      }
      setScreen('error');
    }
  }, [code, nombreContacto, email, password, passwordConfirm]);

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 to-primary-700 p-4">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br
                     from-primary-900 to-primary-700 p-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary-700">NormaLis</h1>
          <p className="text-sm text-gray-500 mt-1">Invitación a Equipo IPS</p>
        </div>

        {screen === 'ya-conectado' && (
          <div className="text-center py-4">
            <span className="text-5xl block mb-4">🔒</span>
            <p className="text-sm text-gray-600 leading-relaxed mb-5">
              Ya tienes una sesión iniciada en este navegador. Para aceptar esta invitación con una cuenta nueva,
              primero cierra la sesión actual.
            </p>
            <a href="/dashboard" className="inline-flex items-center justify-center px-6 py-3 bg-primary-600
                       hover:bg-primary-700 text-white font-bold rounded-xl text-sm transition-colors no-underline">
              Ir a mi cuenta actual
            </a>
          </div>
        )}

        {(screen === 'form' || screen === 'enviando') && (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="flex items-center gap-2 bg-teal-50 border border-teal-200
                            rounded-lg px-3 py-2 text-xs text-teal-700">
              🤝 <span>Crea tu acceso para unirte al equipo que te invitó.</span>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                Tu nombre completo *
              </label>
              <input
                type="text"
                value={nombreContacto}
                onChange={e => setNombreContacto(e.target.value)}
                required
                maxLength={100}
                placeholder="Nombre y apellido"
                autoComplete="name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                Correo electrónico *
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                maxLength={254}
                placeholder="correo@ips.com"
                autoComplete="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-400 mt-1">Usa el mismo correo al que te llegó la invitación.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                Contraseña *
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={128}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                Confirmar contraseña *
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                required
                maxLength={128}
                placeholder="Repite la contraseña"
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <button
              type="submit"
              disabled={screen === 'enviando'}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50
                         disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm
                         transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {screen === 'enviando' ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creando tu acceso…
                </>
              ) : (
                '✓ Unirme al equipo'
              )}
            </button>
          </form>
        )}

        {screen === 'exito' && (
          <div className="text-center py-4">
            <span className="text-6xl block mb-4">🎉</span>
            <h2 className="text-xl font-bold text-gray-800 mb-2">¡Bienvenido a NormaLis!</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-5 max-w-xs mx-auto">
              Tu cuenta quedó vinculada{ipsExito ? <> a <strong className="text-teal-700">{ipsExito}</strong></> : ''}.
              Ya puedes empezar a trabajar.
            </p>
            <a href="/dashboard" className="inline-flex items-center justify-center px-6 py-3 bg-primary-600
                       hover:bg-primary-700 text-white font-bold rounded-xl text-sm transition-colors no-underline">
              Entrar a mi cuenta
            </a>
          </div>
        )}

        {screen === 'error' && (
          <div className="text-center py-4">
            <span className="text-5xl block mb-4">😕</span>
            <p className="text-sm text-gray-600 leading-relaxed mb-5">{error}</p>
            <a href="/login" className="inline-flex items-center justify-center px-6 py-3 bg-primary-600
                       hover:bg-primary-700 text-white font-bold rounded-xl text-sm transition-colors no-underline">
              Ir al inicio de sesión
            </a>
          </div>
        )}

        {(screen === 'form' || screen === 'enviando') && (
          <>
            <hr className="border-gray-100 my-5" />
            <p className="text-center text-xs text-gray-300">
              NormaLis · Res. 1732/2026 · 🔒 Datos seguros
            </p>
          </>
        )}
      </div>
    </main>
  );
}
