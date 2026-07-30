'use client';

import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  /** Botón u otro elemento de acción */
  action?: ReactNode;
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16 text-gray-400">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="font-semibold text-gray-600 mb-1">{title}</p>
      {description && <p className="text-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}
