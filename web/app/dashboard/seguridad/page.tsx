'use client';

/**
 * web/app/dashboard/seguridad/page.tsx
 * Bitácora de seguridad — ISO 27001 Anexo A.12 (registro de eventos).
 *
 * Solo lectura: cada entrada la escribe el backend (Worker POST /audit)
 * con el token de servicio de NormaLis. Firestore rules bloquean create
 * desde el cliente y bloquean update/delete para todos, sin excepción —
 * ni un administrador puede alterar o borrar una entrada ya creada.
 */

import { useAuth } from '@/lib/auth';
import { useBitacoraSeguridad, ACCION_LABEL, type SecurityLogItem } from '@/lib/securityLog';
import { SectionHeader, LoadingSpinner, EmptyState } from '@/components/ui';

const ACCION_ICONO: Record<string, string> = {
  login:                  '🔑',
  admin_aprobar_usuario:  '✅',
  admin_rechazar_usuario: '⛔',
  llave_api_creada:       '🔌',
  llave_api_revocada:     '🔌',
  llave_api_reactivada:   '🔌',
  llave_api_eliminada:    '🔌',
  pqrs_respondida:        '📬',
};

function EventoRow({ item }: { item: SecurityLogItem }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      <span className="text-lg flex-shrink-0">{ACCION_ICONO[item.accion] || '🛡️'}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-800">
          {ACCION_LABEL[item.accion] || item.accion}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {item.email || item.uid}
          {item.detalle ? ` · ${item.detalle}` : ''}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-gray-500">
          {item.timestamp
            ? new Date(item.timestamp).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
            : '—'}
        </p>
        {item.origen && (
          <span className="text-[10px] text-gray-300 uppercase tracking-wide">{item.origen}</span>
        )}
      </div>
    </div>
  );
}

export default function SeguridadPage() {
  const { user, nit, loading: authLoading } = useAuth();
  const { items, loading } = useBitacoraSeguridad(user?.uid ?? null, nit || null);

  if (authLoading || loading) return <LoadingSpinner fullHeight />;

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="Seguridad"
        subtitle="Bitácora inmutable de eventos sensibles — quién hizo qué y cuándo"
      />

      <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 text-sm text-teal-900">
        <p className="font-semibold mb-1">🛡️ Registro de auditoría — ISO 27001 (Anexo A.12)</p>
        <p className="text-teal-800">
          Estas entradas las genera el sistema automáticamente, no el usuario — ni siquiera un
          administrador puede editarlas o borrarlas una vez creadas. Hoy se registran: inicios de
          sesión, aprobación/rechazo de usuarios, gestión de llaves API y respuestas a PQRS. El
          catálogo de eventos registrados se irá ampliando a más módulos.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="🛡️"
          title="Sin eventos registrados todavía"
          description="Los eventos de seguridad de tu cuenta o IPS aparecerán aquí a medida que ocurran."
        />
      ) : (
        <div className="space-y-2">
          {items.map(item => <EventoRow key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
