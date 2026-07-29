'use client';

import { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?:   ToastType;
  onClose: () => void;
}

const COLORS: Record<ToastType, string> = {
  success: 'bg-green-600',
  error:   'bg-red-600',
  info:    'bg-primary-600',
};

export default function Toast({ message, type = 'info', onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg text-white
                     text-sm font-medium shadow-lg transition-all ${COLORS[type]}`}>
      {message}
    </div>
  );
}

// Hook para usar toasts fácilmente
export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const show = (message: string, type: ToastType = 'info') => setToast({ message, type });
  const hide = () => setToast(null);
  return { toast, show, hide };
}
