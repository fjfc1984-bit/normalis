'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth as fbAuth, db as fbDb } from '@/lib/firebase';
import Button from '@/components/ui/Button';

type Step = 'idle' | 'loading' | 'error';

export default function LoginForm() {
  const router  = useRouter();
  const params  = useSearchParams();
  const blocked = params.get('blocked');

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep]         = useState<Step>('idle');
  const [error, setError]       = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setStep('loading');
    setError('');

    try {
      const cred = await signInWithEmailAndPassword(fbAuth, email, password);
      const snap = await getDoc(doc(fbDb, 'usuarios', cred.user.uid));

      if (!snap.exists()) throw new Error('Usuario no encontrado en el sistema.');

      const data = snap.data();
      const rol  = data.rol as string;

      switch (rol) {
        case 'admin':
          router.replace('/admin');
          break;
        case 'cliente':
        case 'piloto':
          router.replace('/dashboard');
          break;
        case 'pendiente':
          setError('Tu cuenta está en revisión. El equipo NormaLis te notificará por correo.');
          setStep('error');
          await signOut(fbAuth);
          break;
        case 'rechazado':
          setError('El acceso fue denegado. Contáctanos en fjfc1984@gmail.com.');
          setStep('error');
          await signOut(fbAuth);
          break;
        default:
          setError('Rol no reconocido. Contacta soporte.');
          setStep('error');
          await signOut(fbAuth);
      }
    } catch (err: unknown) {
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
          <a href="https://normalis.co/registro.html"
             className="text-primary-600 hover:underline">
            Regístrate aquí
          </a>
        </p>
      </div>
    </main>
  );
}
