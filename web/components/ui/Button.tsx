import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

const VARIANTS = {
  primary:   'bg-primary-600 hover:bg-primary-700 text-white',
  secondary: 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700',
  danger:    'bg-red-600 hover:bg-red-700 text-white',
};

export default function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent
                           rounded-full animate-spin" />
          Procesando…
        </span>
      ) : children}
    </button>
  );
}
