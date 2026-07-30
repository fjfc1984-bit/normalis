'use client';

interface KpiCardProps {
  label: string;
  value: number | string;
  /** Texto secundario bajo el valor */
  sub?: string;
  /** Clase de color para el valor, ej. "text-emerald-700" */
  colorClass?: string;
  /** Emoji o ícono mostrado arriba del valor */
  icon?: string;
  /** Si true, muestra borde de color (usa borderColorClass) */
  borderColorClass?: string;
}

export function KpiCard({
  label,
  value,
  sub,
  colorClass = 'text-gray-800',
  icon,
  borderColorClass = 'border-gray-200',
}: KpiCardProps) {
  return (
    <div className={`bg-white rounded-xl border ${borderColorClass} p-4 flex flex-col gap-1`}>
      {icon && <span className="text-lg mb-0.5">{icon}</span>}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
