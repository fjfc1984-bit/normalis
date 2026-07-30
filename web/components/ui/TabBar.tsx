'use client';

export interface TabItem<T extends string = string> {
  value: T;
  label: string;
  emoji?: string;
  /** Número de badge rojo (ej. alertas) */
  badge?: number;
}

interface TabBarProps<T extends string> {
  tabs: TabItem<T>[];
  active: T;
  onChange: (value: T) => void;
  /** 'pill' = tabs con fondo gris, 'underline' = tabs con línea inferior */
  variant?: 'pill' | 'underline';
}

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  variant = 'pill',
}: TabBarProps<T>) {
  if (variant === 'underline') {
    return (
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors
                        border-b-2 -mb-px flex items-center gap-1.5
              ${active === tab.value
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab.emoji && <span>{tab.emoji}</span>}
            {tab.label}
            {!!tab.badge && tab.badge > 0 && (
              <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 text-[10px] font-bold">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  // variant === 'pill' (default)
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`flex-1 min-w-max px-3 py-2 rounded-lg text-xs font-semibold
                      transition-all flex items-center justify-center gap-1.5
            ${active === tab.value
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'}`}
        >
          {tab.emoji && <span>{tab.emoji}</span>}
          {tab.label}
          {!!tab.badge && tab.badge > 0 && (
            <span className="bg-red-500 text-white rounded-full px-1.5 text-[10px] font-bold">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
