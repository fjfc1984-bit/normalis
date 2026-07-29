/**
 * app/login/page.tsx
 * Login migrado desde login.html.
 * Mismo flujo: Firebase Auth → leer rol en Firestore → redirigir.
 */
import { Suspense } from 'react';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br
                       from-primary-900 to-primary-700 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <p className="text-gray-500 text-sm">Cargando...</p>
        </div>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
