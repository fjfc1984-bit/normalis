'use client';

/**
 * web/app/dashboard/ajustes/page.tsx
 * Ajustes de cuenta — permite a cualquier usuario configurar/actualizar
 * su propio NIT y nombre de establecimiento sin depender de Firebase Console.
 *
 * Antes, un usuario sin NIT en su documento de Firestore (usuarios/{uid})
 * quedaba bloqueado en varios módulos (PAMEC, Fecha de Visita, etc. que
 * usan el NIT como llave de documento multi-tenant) y la única forma de
 * corregirlo era editando la base de datos manualmente desde Firebase
 * Console. Este formulario permite que el propio usuario lo resuelva —
 * las reglas de Firestore ya permiten que el dueño actualice su propio
 * documento (isOwner(uid) en /usuarios/{uid}).
 *
 * IMPORTANTE — Equipo IPS (multi-usuario por NIT, ver /dashboard/equipo):
 * este formulario edita `nit` (el NIT PROPIO), nunca `nit_ips` (el NIT
 * heredado por un miembro de equipo vía invitación). Si dejáramos que un
 * miembro de equipo escribiera aquí su NIT efectivo (heredado), quedaría
 * con un `nit` propio igual al de la IPS que lo invitó — y eso lo
 * convertiría, sin querer, en "dueño" de ese NIT (podría invitar a más
 * gente él mismo). Por eso el campo de NIT queda deshabilitado para
 * miembros de equipo: su acceso lo administra el dueño desde Equipo IPS.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useEquipoIPS } from '@/lib/useEquipoIPS';
import { SectionHeader, LoadingSpinner, Toast, useToast } from '@/components/ui';

export default function AjustesPage() {
  const { user, nombre, nit, nitPropio, esMiembroEquipo, rol, loading: authLoading } = useAuth();
  const { miembros } = useEquipoIPS(nitPropio, nit);
  const { toast, show } = useToast();

  const [formNombre, setFormNombre] = useState('');
  const [formNit, setFormNit]       = useState('');
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    setFormNombre(nombre || '');
    setFormNit(nitPropio || '');
  }, [nombre, nitPropio]);

  // Miembros de equipo distintos del dueño (para advertir antes de cambiar el NIT).
  const equipoActivo = miembros.filter(m => m.rolIps === 'miembro' && m.activo).length;
  const nitCambiado = !esMiembroEquipo && formNit.trim() !== (nitPropio || '').trim();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!formNombre.trim()) { show('Ingresa el nombre del establecimiento.', 'error'); return; }
    if (esMiembroEquipo) {
      // Los miembros de equipo solo pueden actualizar su nombre visible, nunca el NIT.
      setSaving(true);
      try {
        await updateDoc(doc(db, 'usuarios', user.uid), { nombreContacto: formNombre.trim() });
        show('✓ Datos guardados.', 'success');
      } catch {
        show('Error al guardar. Intenta de nuevo.', 'error');
      } finally {
        setSaving(false);
      }
      return;
    }
    if (nitCambiado && equipoActivo > 0) {
      const ok = window.confirm(
        `Tienes ${equipoActivo} compañero(s) de equipo con acceso a esta cuenta. Si cambias el NIT, ` +
        `perderán acceso a los datos de esta IPS hasta que los vuelvas a invitar. ¿Deseas continuar?`
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'usuarios', user.uid), {
        nombre: formNombre.trim(),
        nit:    formNit.trim(),
      });
      show('✓ Datos guardados. Los cambios ya están activos.', 'success');
    } catch {
      show('Error al guardar. Intenta de nuevo.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) return <LoadingSpinner fullHeight />;

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <Toast toast={toast} />

      <SectionHeader
        title="Ajustes de cuenta"
        subtitle="Configura el NIT y nombre de tu establecimiento. Estos datos identifican tu cuenta en NormaLis."
      />

      {esMiembroEquipo && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-sm text-teal-900">
          <p className="font-semibold mb-1">🤝 Tu cuenta pertenece a un equipo</p>
          <p>
            Tienes acceso a los datos de <strong>{nombre || 'tu IPS'}</strong> por invitación.
            El NIT lo administra el dueño de la cuenta — visítalo en <strong>Equipo IPS</strong> en el menú
            si necesitas ayuda con tu acceso.
          </p>
        </div>
      )}

      {!esMiembroEquipo && !nit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
          <p className="font-semibold mb-1">⚠️ Tu cuenta no tiene NIT configurado</p>
          <p>
            Algunos módulos (PAMEC, fecha de visita, entre otros) usan el NIT para separar los
            datos de cada establecimiento y no pueden guardar información hasta que lo configures.
            Si es una cuenta de prueba y no tienes un NIT real todavía, puedes usar un valor temporal
            (ej. <code className="bg-amber-100 px-1 rounded">PRUEBA-{user?.uid.slice(0, 8)}</code>) y
            actualizarlo después con el NIT real de la IPS.
          </p>
        </div>
      )}

      {!esMiembroEquipo && nitCambiado && equipoActivo > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          ⚠️ Tienes {equipoActivo} compañero(s) de equipo activos. Cambiar el NIT hará que pierdan
          acceso a los datos de esta IPS hasta que los invites de nuevo.
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
            Correo
          </label>
          <input
            value={user?.email ?? ''}
            disabled
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
            Nombre del establecimiento *
          </label>
          <input
            value={formNombre}
            onChange={e => setFormNombre(e.target.value)}
            required
            disabled={esMiembroEquipo}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white disabled:bg-gray-50 disabled:text-gray-500"
          />
          {esMiembroEquipo && (
            <p className="text-xs text-gray-400 mt-1">El nombre de la IPS lo administra el dueño de la cuenta.</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
            NIT
          </label>
          <input
            value={esMiembroEquipo ? nit : formNit}
            onChange={e => setFormNit(e.target.value)}
            placeholder="Ej. 900123456-7"
            disabled={esMiembroEquipo}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white disabled:bg-gray-50 disabled:text-gray-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            {esMiembroEquipo
              ? 'Heredado del equipo al que perteneces — no se puede editar aquí.'
              : 'Puedes dejarlo temporal en cuentas de prueba y corregirlo luego. Solo tú puedes editar este campo.'}
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
            Rol
          </label>
          <input
            value={rol ?? ''}
            disabled
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 capitalize"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                     text-white text-sm font-bold rounded-xl transition-colors"
        >
          {saving ? 'Guardando…' : '✓ Guardar cambios'}
        </button>
      </form>
    </div>
  );
}
