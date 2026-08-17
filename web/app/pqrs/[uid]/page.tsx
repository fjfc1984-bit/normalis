'use client';

/**
 * web/app/pqrs/[uid]/page.tsx
 * Formulario público de PQRS — sin autenticación.
 * El paciente lo abre desde un QR o link que comparte la IPS; el envío pasa
 * por el endpoint /pqrs del Worker (rate-limited), que escribe el caso en
 * Firestore con el token de servicio y notifica a la IPS por email.
 * Base legal: Res. 13437/1991 · Res. 1732/2026 Est. Procesos Prioritarios
 */

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { PQRS_TIPOS, PQRS_AREAS, TIPO_COLOR } from '@/lib/pqrsTypes';
import type { PQRSTipo } from '@/lib/pqrsTypes';
import { submitPqrsPublico } from '@/lib/worker';

const INPUT = `w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm
               focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white`;

export default function PQRSPublicoPage() {
  const params  = useParams<{ uid: string }>();
  const search  = useSearchParams();
  const ipsNombre = search.get('ips') || 'esta institución de salud';

  const [tipo, setTipo]         = useState<PQRSTipo>('Petición');
  const [nombre, setNombre]     = useState('');
  const [desc, setDesc]         = useState('');
  const [area, setArea]         = useState('');
  const [email, setEmail]       = useState('');
  const [telefono, setTelefono] = useState('');
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [enviado, setEnviado]   = useState(false);

  const contactoValido = email.trim().length > 0 || telefono.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim() || !desc.trim()) return;
    if (!contactoValido) {
      setError('Déjanos tu correo o tu teléfono para poder responderte.');
      return;
    }
    setSending(true);
    try {
      await submitPqrsPublico({
        uid:      params.uid,
        tipo,
        nombre:   nombre.trim(),
        desc:     desc.trim(),
        area:     area || undefined,
        email:    email.trim() || undefined,
        telefono: telefono.trim() || undefined,
      });
      setEnviado(true);
    } catch {
      setError('No pudimos enviar tu solicitud. Intenta de nuevo en unos minutos.');
    } finally {
      setSending(false);
    }
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-lg font-bold text-gray-800 mb-2">Solicitud recibida</h1>
          <p className="text-sm text-gray-500">
            Gracias por escribirnos. {ipsNombre} recibió tu {tipo.toLowerCase()} y te contactará
            {email.trim() ? ` a ${email.trim()}` : telefono.trim() ? ` al ${telefono.trim()}` : ''} pronto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-teal-700 font-bold text-sm mb-2">
            <span>📬</span> Buzón de PQRS
          </div>
          <h1 className="text-xl font-bold text-gray-800">{ipsNombre}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Cuéntanos tu petición, queja, reclamo, sugerencia o felicitación.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4"
        >
          {/* Tipo */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
              Tipo de solicitud *
            </label>
            <div className="flex flex-wrap gap-2">
              {PQRS_TIPOS.map(t => {
                const c = TIPO_COLOR[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all
                      ${tipo === t
                        ? `${c.bg} ${c.text} border-current`
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
              Tu nombre *
            </label>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Nombre completo"
              required
              className={INPUT}
            />
          </div>

          {/* Contacto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                Teléfono
              </label>
              <input
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="300 000 0000"
                className={INPUT}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 -mt-2">
            Déjanos al menos uno de los dos para poder responderte.
          </p>

          {/* Área */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
              Área o servicio
            </label>
            <select value={area} onChange={e => setArea(e.target.value)} className={INPUT}>
              <option value="">Sin especificar</option>
              {PQRS_AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
              Cuéntanos qué pasó *
            </label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Describe tu petición, queja, reclamo, sugerencia o felicitación…"
              required
              rows={5}
              className={`${INPUT} resize-none`}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={sending || !nombre.trim() || !desc.trim()}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                       text-white text-sm font-bold rounded-xl transition-colors"
          >
            {sending ? 'Enviando…' : 'Enviar solicitud'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Res. 13437/1991 — Derechos del paciente · Este formulario es gestionado por NormaLis
        </p>
      </div>
    </div>
  );
}
