'use client';

/**
 * web/app/dashboard/mis-ips/page.tsx
 * Mis IPS — un usuario administrando varias IPS (Feature 2).
 *
 * Distinto de "Equipo IPS" (compañeros compartiendo el acceso a UNA IPS vía
 * nit_ips): aquí es la MISMA persona con acceso autorizado a VARIAS IPS
 * distintas, y puede cambiar cuál tiene activa en cualquier momento.
 *
 * Flujo (ver firestore.rules — usuarios/{uid}/ips_autorizadas y
 * solicitudes_acceso_ips):
 *   1. El usuario pide acceso a un NIT ajeno (solicitudes_acceso_ips).
 *   2. El dueño real de ese NIT la aprueba o rechaza desde esta misma
 *      pantalla — al aprobar, queda creado usuarios/{uid}/ips_autorizadas/{nit}.
 *   3. Con acceso autorizado, el usuario puede cambiar su NIT activo cuando
 *      quiera — eso es lo único que hace "el switch" en sí.
 */

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useMultiIPS, type SolicitudAccesoIPS } from '@/lib/useMultiIPS';
import { SectionHeader, LoadingSpinner, Toast, useToast, EmptyState } from '@/components/ui';
import Button from '@/components/ui/Button';

function fmtFecha(ts: { toDate: () => Date } | null | undefined): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function estadoBadge(estado: string): { label: string; cls: string } {
  switch (estado) {
    case 'pendiente':  return { label: 'Pendiente',  cls: 'bg-amber-100 text-amber-700' };
    case 'aprobada':   return { label: 'Aprobada',   cls: 'bg-emerald-100 text-emerald-700' };
    case 'rechazada':  return { label: 'Rechazada',  cls: 'bg-red-100 text-red-700' };
    default:           return { label: estado,       cls: 'bg-gray-100 text-gray-500' };
  }
}

export default function MisIPSPage() {
  const { user, nit, nitPropio, nombre, plan, loading: authLoading } = useAuth();
  const esEnterprise = plan === 'enterprise';
  const {
    autorizadas, misSolicitudes, entrantes, loading,
    solicitarAcceso, resolverSolicitud, cambiarNitActivo, retirarSolicitud, revocarAccesoPropio,
  } = useMultiIPS(user?.uid ?? null, nit, nitPropio);
  const { toast, show } = useToast();

  const [nitSolicitado, setNitSolicitado] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [resolviendo, setResolviendo] = useState<string | null>(null);

  async function handleSolicitar(e: React.FormEvent) {
    e.preventDefault();
    if (!esEnterprise) {
      show('Administrar varias IPS es una función Enterprise. Contáctanos para una cotización especial.', 'error');
      return;
    }
    setEnviando(true);
    try {
      await solicitarAcceso(nitSolicitado, user?.displayName || '');
      show('Solicitud enviada. El dueño de esa IPS debe aprobarla.', 'success');
      setNitSolicitado('');
    } catch (err: unknown) {
      show((err as Error).message ?? 'No se pudo enviar la solicitud.', 'error');
    } finally {
      setEnviando(false);
    }
  }

  async function handleCambiar(nitDestino: string) {
    setCambiando(nitDestino);
    try {
      await cambiarNitActivo(nitDestino);
      show('IPS activa actualizada. Puede tardar unos segundos en reflejarse en todo el panel.', 'success');
    } catch {
      show('No se pudo cambiar de IPS.', 'error');
    } finally {
      setCambiando(null);
    }
  }

  async function handleResolver(s: SolicitudAccesoIPS, aprobar: boolean) {
    setResolviendo(s.id);
    try {
      await resolverSolicitud(s, aprobar, nombre || '');
      show(aprobar ? 'Solicitud aprobada — ya tiene acceso autorizado.' : 'Solicitud rechazada.', 'success');
    } catch {
      show('No se pudo procesar la solicitud.', 'error');
    } finally {
      setResolviendo(null);
    }
  }

  async function handleRetirar(id: string) {
    try {
      await retirarSolicitud(id);
      show('Solicitud retirada.', 'success');
    } catch {
      show('No se pudo retirar la solicitud.', 'error');
    }
  }

  async function handleRevocar(uidTarget: string, nitTarget: string) {
    try {
      await revocarAccesoPropio(uidTarget, nitTarget);
      show('Acceso revocado.', 'success');
    } catch {
      show('No se pudo revocar el acceso.', 'error');
    }
  }

  if (authLoading || loading) return <LoadingSpinner />;

  const entrantesPendientes = entrantes.filter(s => s.estado === 'pendiente');

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <SectionHeader
        title="Mis IPS"
        subtitle="Administra el acceso a varias IPS con una sola cuenta — pide acceso, aprueba solicitudes de tu propia IPS, y cambia cuál tienes activa."
      />

      {/* IPS activa + switcher */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">IPS activa ahora</h3>
        <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 mb-3">
          <div>
            <p className="text-sm font-bold text-teal-800">{nombre || 'Sin nombre'}</p>
            <p className="text-xs text-teal-600">NIT {nit || '—'}</p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-teal-600 text-white font-medium">Activa</span>
        </div>

        {autorizadas.filter(a => a.nit !== nit).length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Cambiar a otra IPS autorizada</p>
            {autorizadas.filter(a => a.nit !== nit).map(a => (
              <div key={a.nit} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm text-gray-700 truncate">{a.nombreIPS || 'IPS sin nombre'}</p>
                  <p className="text-xs text-gray-400">NIT {a.nit}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleCambiar(a.nit)}
                    disabled={cambiando === a.nit}
                    className="text-xs px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-medium"
                  >
                    {cambiando === a.nit ? 'Cambiando…' : 'Cambiar aquí'}
                  </button>
                  {user?.uid && (
                    <button
                      onClick={() => handleRevocar(user.uid, a.nit)}
                      className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      Salir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Solicitar acceso */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Solicitar acceso a otra IPS</h3>
        {esEnterprise ? (
          <>
            <form onSubmit={handleSolicitar} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                required
                placeholder="NIT de la otra IPS (ej. 900123456-7)"
                value={nitSolicitado}
                onChange={e => setNitSolicitado(e.target.value)}
                maxLength={30}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <Button type="submit" loading={enviando}>Solicitar acceso</Button>
            </form>
            <p className="text-xs text-gray-400 mt-2">
              El dueño de esa cuenta en NormaLis verá tu solicitud aquí mismo y debe aprobarla — no se te da acceso automáticamente.
            </p>
          </>
        ) : (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Administrar varias IPS con una sola cuenta es una función del plan Enterprise.{' '}
            <a href="https://normalis.co/#precios" target="_blank" rel="noopener noreferrer" className="font-bold underline">
              Ver cotización especial →
            </a>
          </p>
        )}
      </div>

      {/* Mis solicitudes */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-1">Mis solicitudes ({misSolicitudes.length})</h3>
        {misSolicitudes.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">Aún no has solicitado acceso a otra IPS.</p>
        ) : (
          <div>
            {misSolicitudes.map(s => {
              const { label, cls } = estadoBadge(s.estado);
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 truncate">NIT {s.nit}</p>
                    <p className="text-xs text-gray-400">Enviada {fmtFecha(s.creadoEn)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
                    {s.estado === 'pendiente' && (
                      <button
                        onClick={() => handleRetirar(s.id)}
                        className="text-xs px-2 py-1 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
                      >
                        Retirar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Solicitudes entrantes (solo dueños de NIT) */}
      {nitPropio && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-1">
            Solicitudes de acceso a tu IPS ({entrantesPendientes.length} pendiente{entrantesPendientes.length === 1 ? '' : 's'})
          </h3>
          {entrantes.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">Nadie ha solicitado acceso a tu IPS todavía.</p>
          ) : (
            <div>
              {entrantes.map(s => {
                const { label, cls } = estadoBadge(s.estado);
                return (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{s.nombreSolicitante || s.emailSolicitante}</p>
                      <p className="text-xs text-gray-400 truncate">{s.emailSolicitante} · {fmtFecha(s.creadoEn)}</p>
                      {s.estado !== 'pendiente' && s.resueltoPorNombre && (
                        <p className="text-[10px] text-gray-300">{label} por {s.resueltoPorNombre} · {fmtFecha(s.resueltoEn)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {s.estado === 'pendiente' ? (
                        <>
                          <button
                            onClick={() => handleResolver(s, true)}
                            disabled={resolviendo === s.id}
                            className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-medium"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleResolver(s, false)}
                            disabled={resolviendo === s.id}
                            className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                          >
                            Rechazar
                          </button>
                        </>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!nitPropio && autorizadas.length === 0 && misSolicitudes.length === 0 && (
        <EmptyState
          icon="🏥"
          title="Todavía no administras más de una IPS"
          description="Usa el formulario de arriba para pedir acceso a otra IPS, o pídele a otro dueño de cuenta que te autorice."
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
