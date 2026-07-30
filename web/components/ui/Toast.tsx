'use client';

import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastState { msg: string; type: ToastType }

const CFG: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: 'bg-emerald-600', icon: '✅' },
  error:   { bg: 'bg-red-600',     icon: '❌' },
  info:    { bg: 'bg-gray-700',    icon: 'ℹ️'  },
};

/** Coloca <Toast toast={toast} /> en la raíz del componente de página. */
export function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  const { bg, icon } = CFG[toast.type];
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg
                     text-sm font-semibold text-white flex items-center gap-2 ${bg}`}>
      <span>{icon}</span>
      <span>{toast.msg}</span>
    </div>
  );
}

/** Hook que gestiona el ciclo de vida del toast. */
export function useToast(duration = 3500) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const show = useCallback((msg: string, type: ToastType = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), duration);
  }, [duration]);
  return { toast, show };
}
