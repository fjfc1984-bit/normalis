'use client';

/**
 * web/app/prem-prom/[uid]/page.tsx
 * Formulario público de encuesta PREM/PROM — sin autenticación, sin datos
 * de identificación del paciente (anónima por diseño).
 * El paciente lo abre desde un QR o link que comparte la IPS tras la
 * atención; el envío pasa por el endpoint /prem-prom del Worker
 * (rate-limited), que escribe la respuesta en Firestore.
 *
 * VACÍO LEGAL: encuesta propia de NormaLis, no un instrumento validado
 * internacionalmente — ver web/lib/premPromTypes.ts.
 */

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { PREM_PROM_PREGUNTAS, PREM_PROM_ESCALA } from '@/lib/premPromTypes';
import { SEGMENT_META } from '@/data/auditData';
import { submitPremPromPublico } from '@/lib/worker';

export default function PremPromPublicoPage() {
  const params    = useParams<{ uid: string }>();
  const search    = useSearchParams();
  const ipsNombre = search.get('ips') || 'esta institución de salud';
  const servicioDefault = search.get('servicio') || '';

  const [servicioId, setServicioId] = useState(servicioDefault);
  const [respuestas, setRespuestas] = useState<Record<string, 1 | 2 | 3 | 4 | 5>>({});
  const [comentario, setComentario] = useState('');
  const [sending, setSending]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [enviado, setEnviado]       = useState(false);

  const completo = servicioId !== '' && PREM_PROM_PREGUNTAS.every(p => respuestas[p.id] !== undefined);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!completo) {
      setError('Responde todas las preguntas antes de enviar.');
      return;
    }
    setSending(true);
    try {
      await submitPremPromPublico({
        uid:        params.uid,
        servicioId,
        respuestas,
        comentario: comentario.trim() || undefined,
      });
      setEnviado(true);
    } catch {
      setError('No pudimos enviar tu respuesta. Intenta de nuevo en unos minutos.');
    } finally {
      setSending(false);
    }
  }

  function handleNueva() {
    setRespuestas({});
    setComentario('');
    setError(null);
    setEnviado(false);
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-5xl mb-4">🙏</div>
          <h1 className="text-lg font-bold text-gray-800 mb-2">¡Gracias por tu respuesta!</h1>
          <p className="text-sm text-gray-500">
            Tu opinión ayuda a {ipsNombre} a mejorar la atención. La encuesta es anónima —
            no queda asociada a tu nombre ni a tu historia clínica.
          </p>
          <button
            onClick={handleNueva}
            className="mt-6 px-5 py-2.5 bg-teal-600 hover:bg-teal-700
                       text-white text-sm font-bold rounded-xl transition-colors"
          >
            ← Responder otra encuesta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-teal-700 font-bold text-sm mb-2">
            <span>💬</span> Encuesta de experiencia
          </div>
          <h1 className="text-xl font-bold text-gray-800">{ipsNombre}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tu opinión es anónima y nos toma menos de un minuto. Gracias por ayudarnos a mejorar.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5"
        >
          {/* Servicio */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
              ¿En qué servicio te atendieron? *
            </label>
            <select
              value={servicioId}
              onChange={e => setServicioId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
            >
              <option value="">Selecciona un servicio</option>
              {Object.entries(SEGMENT_META).map(([id, meta]) => (
                <option key={id} value={id}>{meta.icon} {meta.label}</option>
              ))}
            </select>
          </div>

          {/* Preguntas */}
          {PREM_PROM_PREGUNTAS.map(p => (
            <div key={p.id}>
              <label className="block text-sm font-medium text-gray-700 mb-2">{p.texto}</label>
              <div className="flex justify-between gap-1">
                {PREM_PROM_ESCALA.map(op => (
                  <button
                    key={op.valor}
                    type="button"
                    title={op.label}
                    onClick={() => setRespuestas(prev => ({ ...prev, [p.id]: op.valor }))}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold border-2 transition-all
                      ${respuestas[p.id] === op.valor
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
                  >
                    {op.valor}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-0.5">
                <span>Muy en desacuerdo</span>
                <span>Muy de acuerdo</span>
              </div>
            </div>
          ))}

          {/* Comentario opcional */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
              ¿Algo más que quieras contarnos? (opcional)
            </label>
            <textarea
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              placeholder="Tu comentario…"
              rows={3}
              maxLength={1000}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={sending || !completo}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                       text-white text-sm font-bold rounded-xl transition-colors"
          >
            {sending ? 'Enviando…' : 'Enviar respuesta'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Encuesta anónima gestionada por NormaLis — no incluye datos que te identifiquen.
        </p>
      </div>
    </div>
  );
}
