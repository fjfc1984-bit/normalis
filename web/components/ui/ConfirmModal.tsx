'use client';

import { useState } from 'react';

interface ConfirmModalProps {
  title: string;
  description?: string;
  /** Si se pasa, muestra un textarea y pasa su valor al onConfirm */
  textareaLabel?: string;
  textareaPlaceholder?: string;
  textareaRequired?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'success' | 'primary';
  loading?: boolean;
  onConfirm: (text?: string) => void;
  onCancel: () => void;
}

const CONFIRM_COLORS = {
  danger:  'bg-red-600 hover:bg-red-700',
  success: 'bg-emerald-600 hover:bg-emerald-700',
  primary: 'bg-teal-600 hover:bg-teal-700',
};

export function ConfirmModal({
  title,
  description,
  textareaLabel,
  textareaPlaceholder,
  textareaRequired = false,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmVariant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [text, setText] = useState('');
  const canConfirm = !textareaRequired || text.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 mb-4">{description}</p>
        )}
        {textareaLabel && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {textareaLabel}
            </label>
            <textarea
              rows={4}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={textareaPlaceholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-teal-400"
              autoFocus
            />
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700
                       rounded-lg text-sm font-semibold transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => onConfirm(textareaLabel ? text : undefined)}
            disabled={loading || !canConfirm}
            className={`px-4 py-2 disabled:opacity-50 text-white rounded-lg text-sm
                        font-semibold transition-colors flex items-center gap-2
                        ${CONFIRM_COLORS[confirmVariant]}`}
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
