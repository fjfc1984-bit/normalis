'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  /** Si true, centra el spinner en un contenedor de 64 de alto */
  fullHeight?: boolean;
}

const SIZE = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-2', lg: 'w-12 h-12 border-4' };

export function LoadingSpinner({
  size = 'md',
  color = 'border-teal-500',
  fullHeight = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={`${SIZE[size]} ${color} border-t-transparent rounded-full animate-spin`} />
  );
  if (fullHeight) {
    return (
      <div className="flex items-center justify-center h-64">{spinner}</div>
    );
  }
  return spinner;
}
