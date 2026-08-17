'use client';

/**
 * web/components/MfaEnrollBanner.tsx
 * Aviso persistente + flujo de enrolamiento TOTP para administradores que
 * ya tienen una sesión activa pero nunca pasaron por el flujo obligatorio
 * de LoginForm.tsx (p. ej. una sesión abierta desde antes de que esta
 * función se desplegara). Sin este banner, esas cuentas quedarían sin
 * verificación en dos pasos indefinidamente, ya que solo cerrando sesión y
 * volviendo a entrar se dispara el enrolamiento forzado del login.
 */

import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import {
  tieneTotpEnrolado, iniciarEnrolamientoTotp, confirmarEnrolamientoTotp,
  type EnrolamientoTotp,
} from '@/lib/mfa';
import { logSecurityEvent } from '@/lib/securityLog';
import Button from './ui/Button';

export default function MfaEnrollBanner({ user }: { user: User }) {
  const [necesitaEnrolar, setNecesitaEnrolar] = useState(false);
  const [abierto, setAbierto]                 = useState(false);
  const [enrolamiento, setEnrolamiento]       = useState<EnrolamientoTotp | null>(null);
  const [code, setCode]                       = useState('');
  const [error, setError]                     = useState('');
  const [cargando, setCargando]               = useState(false);

  useEffect(() => {
    setNecesitaEnrolar(!tieneTotpEnrolado(user));
  }, [user]);

  async function iniciar() {
    setError('');
    setCargando(true);
    try {
      const datos = await iniciarEnrolamientoTotp(user, user.email ?? 'admin@normalis.co');
      setEnrolamiento(datos);
      setAbierto(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes('requires-recent-login')
          ? 'Por seguridad, cierra sesión y vuelve a entrar para activar la verificación en dos pasos.'
          : msg.includes('operation-not-allowed')
            ? 'La verificación en dos pasos no está habilitada aún en el proyecto de Firebase.'
            : `No se pudo iniciar: ${msg}`,
      );
    } finally {
      setCargando(false);
    }
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolamiento) return;
    setCargando(true);
    setError('');
    try {
      await confirmarEnrolamientoTotp(
        user, enrolamiento.secret, code,
        `Verificación en dos pasos — ${user.email ?? 'admin'}`,
      );
      await logSecurityEvent('mfa_enrolado', 'auth', 'Enrolamiento TOTP completado desde el panel admin');
      setNecesitaEnrolar(false);
      setAbierto(false);
      setEnrolamiento(null);
      setCode('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes('invalid-verification-code') || msg.includes('invalid-code')
          ? 'Código incorrecto. Intenta de nuevo.'
          : `No se pudo confirmar: ${msg}`,
      );
    } finally {
      setCargando(false);
    }
  }

  if (!necesitaEnrolar) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
      <div className="max-w-5xl mx-auto flex items-center gap-3 flex-wrap">
        <span className="text-lg">⚠️</span>
        <p className="text-sm text-amber-800 flex-1 min-w-[240px]">
          Tu cuenta de administrador no tiene verificación en dos pasos activada — es un requisito de seguridad.
        </p>
        {!abierto && (
          <button
            onClick={iniciar}
            disabled={cargando}
            className="text-xs font-bold px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600
                       disabled:opacity-50 text-white transition-colors"
          >
            {cargando ? 'Generando…' : 'Configurar ahora'}
          </button>
        )}
      </div>

      {abierto && enrolamiento && (
        <div className="max-w-5xl mx-auto mt-3 bg-white border border-amber-200 rounded-xl p-4
                        flex flex-col sm:flex-row gap-4 items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrolamiento.qrCodeDataUrl}
            alt="Código QR para configurar la verificación en dos pasos"
            width={140}
            height={140}
            className="rounded-lg border border-gray-200 flex-shrink-0"
          />
          <form onSubmit={confirmar} className="flex-1 space-y-2 w-full">
            <p className="text-xs text-gray-500">
              Escanea con Google Authenticator, Authy u otra app TOTP, luego ingresa el código de 6 dígitos.
            </p>
            <details>
              <summary className="text-[11px] text-gray-400 cursor-pointer">¿No puedes escanear?</summary>
              <code className="block mt-1 text-[11px] bg-gray-50 border border-gray-200 rounded p-1.5 break-all select-all">
                {enrolamiento.secretKey}
              </code>
            </details>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="px-3 py-2 border border-gray-300 rounded-lg text-center font-mono
                           tracking-[0.3em] text-sm w-32 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Button type="submit" loading={cargando} disabled={code.length !== 6}>
                Confirmar
              </Button>
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
          </form>
        </div>
      )}
      {!abierto && error && (
        <p className="max-w-5xl mx-auto mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
