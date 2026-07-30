'use client';

interface StatusBadgeProps {
  label: string;
  /** bg de Tailwind, ej. "bg-emerald-100" */
  bg: string;
  /** color de texto Tailwind, ej. "text-emerald-700" */
  color: string;
  /** Muestra un punto de color al inicio */
  dot?: boolean;
  /** Color del dot, ej. "bg-emerald-500" */
  dotColor?: string;
  size?: 'xs' | 'sm';
}

export function StatusBadge({
  label,
  bg,
  color,
  dot = false,
  dotColor,
  size = 'xs',
}: StatusBadgeProps) {
  const textSize = size === 'sm' ? 'text-sm' : 'text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full
                     font-semibold ${textSize} ${bg} ${color}`}>
      {dot && dotColor && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
      )}
      {label}
    </span>
  );
}
