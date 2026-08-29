'use client';

/**
 * web/app/dashboard/equipo/page.tsx
 * Equipo IPS — multi-usuario por NIT.
 *
 * Permite al dueño de una cuenta (el usuario con NIT propio) invitar a
 * colegas de su misma IPS a acceder a NormaLis con su propio correo y
 * contraseña, viendo y editando los mismos datos (auditorías, PQRS,
 * indicadores, IAAS, etc.) sin compartir credenciales.
 *
 * Modelo: el invitado recibe un enlace de invitación de un solo uso, ligado
 * a su correo. Al aceptarla, su cuenta queda vinculada al NIT de la IPS vía
 * `nit_ips` (en vez de `nit`, que solo tiene el dueño) — las reglas de
 * seguridad (firestore.rules) ya tratan `nit_ips` como equivalente a `nit`
 * para todo lo que pertenece a esa IPS.
 */

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  useEquipoIPS, type Invitacion, type MiembroEquipo,
  LIMITE_USUARIOS_POR_PLAN, PLAN_LABEL,
} from '@/lib/useEquipoIPS';
import { SectionHeader, LoadingSpinner, Toast, useToast, EmptyState } from '@/components/ui';
import Button from '@/components/ui/Button';

const BASE_URL = 'https://app.normalis.co';

function fmtFecha(ts: { toDate: () => Date } | null | undefined): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function estadoInvitacion(inv: Invitacion): { label: string; cls: string } {
  const expirada = inv.estado === 'pendiente' && inv.expiraEn && inv.expiraEn.toDate().getTime() < Date.now();
  if (expirada) return { label: 'Expirada', cls: 'bg-gray-100 text-gray-500' };
  switch (inv.estado) {
    case 'pendiente': return { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' };
    case 'usada':     return { label: 'Aceptada',  cls: 'bg-emerald-100 text-emerald-700' };
    case 'revocada':  return { label: 'Revocada',  cls: 'bg-red-100 text-red-700' };
    default:          return { label: inv.estado,  cls: 'bg-gray-100 text-gray-500' };
  }
}

function InvitarForm({
  onInvitar, saving,
}: {
  onInvitar: (email: string) => Promise<void>;
  saving: boolean;
}) {
  const [email, setEmail] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim().includes('@')) return;
    await onInvitar(email.trim());
    setEmail('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
      <input
        type="email"
        required
        placeholder="correo@compañero.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        maxLength={254}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm
                   focus:outline-none focus:ring-2 focus:ring-teal-400"
      />
      <Button type="submit" loading={saving}>+ Invitar</Button>
    </form>
  );
}

function InvitacionRow({
  inv, onRevocar, onCopiar,
}: {
  inv: Invitacion;
  onRevocar: (id: string) => void;
  onCopiar: (id: string) => void;
}) {
  const { label, cls } = estadoInvitacion(inv);
  const activa = inv.estado === 'pendiente' && !(inv.expiraEn && inv.expiraEn.toDate().getTime() < Date.now());
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{inv.email}</p>
        <p className="text-xs text-gray-400">Enviada {fmtFecha(inv.creadoEn)} · vence {fmtFecha(inv.expiraEn)}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
        {activa && (
          <>
            <button onClick={() => onCopiar(inv.id)}
                    className="text-xs px-2 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
              Copiar enlace
            </button>
            <button onClick={() => onRevocar(inv.id)}
                    className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
              Revocar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function MiembroRow({
  m, esDueno, onCambiarAcceso,
}: {
  m: MiembroEquipo;
  esDueno: boolean;
  onCambiarAcceso: (uid: string, activo: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">
          {m.nombreContacto || m.email}
          {m.rolIps === 'director' && (
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 font-bold uppercase">Dueño</span>
          )}
        </p>
        <p className="text-xs text-gray-400 truncate">{m.email}{m.cargo ? ` · ${m.cargo}` : ''}</p>
        {m.accesoModificadoPorNombre && (
          <p className="text-[10px] text-gray-300 truncate">
            Acceso {m.activo ? 'reactivado' : 'desactivado'} por {m.accesoModificadoPorNombre}
            {m.accesoModificadoEn ? ` · ${fmtFecha(m.accesoModificadoEn)}` : ''}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
          {m.activo ? 'Activo' : 'Inactivo'}
        </span>
        {esDueno && m.rolIps === 'miembro' && (
          <button
            onClick={() => onCambiarAcceso(m.uid, !m.activo)}
            className={`text-xs px-2 py-1 border rounded-lg ${m.activo ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
          >
            {m.activo ? 'Desactivar acceso' : 'Reactivar acceso'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function EquipoPage() {
  const { nit, nitPropio, nombre, esMiembroEquipo, plan, loading: authLoading } = useAuth();
  const { miembros, invitaciones, loading, crearInvitacion, revocarInvitacion, cambiarAccesoMiembro } = useEquipoIPS(nitPropio, nit);
  const { toast, show } = useToast();
  const [saving, setSaving] = useState(false);

  const esDueno = !!nitPropio;
  const planEfectivo = plan ?? 'basico';
  const limite = LIMITE_USUARIOS_POR_PLAN[planEfectivo];
  const pendientesVigentes = invitaciones.filter(
    i => i.estado === 'pendiente' && !(i.expiraEn && i.expiraEn.toDate().getTime() < Date.now()),
  ).length;
  const usados = 1 + miembros.length + pendientesVigentes;

  async function handleInvitar(email: string) {
    setSaving(true);
    try {
      const { emailEnviado, emailError } = await crearInvitacion(email, nombre, plan);
      show(
        emailEnviado
          ? `Invitación creada y correo enviado a ${email}.`
          : `Invitación creada, pero no pudimos enviar el correo automático${emailError ? ` (${emailError})` : ''}. Copia el enlace y compártelo tú.`,
        emailEnviado ? 'success' : 'info',
      );
    } catch (err: unknown) {
      show((err as Error).message ?? 'No se pudo crear la invitación.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleCopiar(id: string) {
    const url = `${BASE_URL}/invitacion/${id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(
        () => show('Enlace copiado al portapapeles.', 'success'),
        () => show(url, 'info'),
      );
    } else {
      show(url, 'info');
    }
  }

  async function handleRevocar(id: string) {
    try {
      await revocarInvitacion(id);
      show('Invitación revocada.', 'success');
    } catch {
      show('No se pudo revocar la invitación.', 'error');
    }
  }

  async function handleCambiarAcceso(uid: string, activo: boolean) {
    try {
      await cambiarAccesoMiembro(uid, activo);
      show(activo ? 'Acceso reactivado.' : 'Acceso desactivado.', 'success');
    } catch {
      show('No se pudo actualizar el acceso.', 'error');
    }
  }

  if (authLoading || loading) return <LoadingSpinner />;

  if (!nit) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <EmptyState
          icon="⚠️"
          title="Configura el NIT de tu cuenta primero"
          description="Necesitas tener un NIT configurado en Ajustes antes de poder invitar compañeros de equipo."
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <SectionHeader
        title="Equipo IPS"
        subtitle={esDueno
          ? 'Invita a tus compañeros a acceder a NormaLis con su propio usuario, viendo los mismos datos de tu IPS.'
          : `Compañeros con acceso a los datos de ${nombre || 'tu IPS'}.`}
      />

      {esMiembroEquipo && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
          ℹ️ Tu acceso a esta IPS fue otorgado por invitación. Solo el dueño original de la cuenta puede invitar
          a más personas o quitar el acceso de un compañero.
        </div>
      )}

      {esDueno && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700">Invitar compañero de equipo</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">
              Plan {PLAN_LABEL[planEfectivo]} · {usados}/{limite ?? '∞'} usuarios
            </span>
          </div>
          {limite !== null && usados >= limite ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Alcanzaste el límite de tu plan {PLAN_LABEL[planEfectivo]} ({limite} usuario{limite === 1 ? '' : 's'}).
              Contáctanos para actualizar tu plan y seguir invitando compañeros.
            </p>
          ) : (
            <InvitarForm onInvitar={handleInvitar} saving={saving} />
          )}
          <p className="text-xs text-gray-400 mt-2">
            Le enviamos un correo automático con el enlace. Vence en 7 días y solo puede usarse una vez,
            con el correo que indiques aquí — si no le llega, cópialo abajo y compártelo tú.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-1">Miembros del equipo ({miembros.length})</h3>
        {miembros.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">Aún no hay miembros de equipo.</p>
        ) : (
          <div>
            {miembros.map(m => (
              <MiembroRow key={m.uid} m={m} esDueno={esDueno} onCambiarAcceso={handleCambiarAcceso} />
            ))}
          </div>
        )}
      </div>

      {esDueno && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-1">Invitaciones enviadas ({invitaciones.length})</h3>
          {invitaciones.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">Aún no has enviado invitaciones.</p>
          ) : (
            <div>
              {invitaciones.map(inv => (
                <InvitacionRow key={inv.id} inv={inv} onRevocar={handleRevocar} onCopiar={handleCopiar} />
              ))}
            </div>
          )}
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
