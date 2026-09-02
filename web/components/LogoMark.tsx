/**
 * web/components/LogoMark.tsx
 * Ícono de marca de NormaLis — una N monotrazo, cada uno de sus tres trazos
 * con su propio tono (navy→teal, teal→cian, cian→cian claro) en vez de un
 * solo degradado azul repetido de intenso a suave, más una sombra proyectada
 * para dar volumen. Fondo navy sólido (no el degradado teal-cian de los
 * botones) — así los tres tonos de la N tienen contraste real contra la caja,
 * en vez de mezclarse con un fondo que ya es teal-cian.
 *
 * `idPrefix` debe ser único por instancia en la misma página — los ids de
 * los <linearGradient> son globales al documento y dos instancias con el
 * mismo id se pisarían entre sí.
 *
 * `simple`: versión de un solo tono, sin sombra — para usos muy pequeños
 * (favicon, mockups en miniatura) donde el detalle de 3 tonos + sombra deja
 * de leerse y solo se ve como textura.
 */

interface LogoMarkProps {
  size?: number;
  idPrefix: string;
  simple?: boolean;
  className?: string;
}

export function LogoMark({ size = 36, idPrefix, simple = false, className }: LogoMarkProps) {
  if (simple) {
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
        <defs>
          <linearGradient id={`${idPrefix}-s`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00897B" />
            <stop offset="100%" stopColor="#00BCD4" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="24" fill={`url(#${idPrefix}-s)`} />
        <path d="M30,68 L30,32 L70,68 L70,32" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${idPrefix}-l`} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#0a2540" />
          <stop offset="100%" stopColor="#00897B" />
        </linearGradient>
        <linearGradient id={`${idPrefix}-d`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00897B" />
          <stop offset="100%" stopColor="#00BCD4" />
        </linearGradient>
        <linearGradient id={`${idPrefix}-r`} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#00BCD4" />
          <stop offset="100%" stopColor="#67e8f9" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill="#0a2540" stroke="rgba(255,255,255,.1)" />
      <path
        d="M30,68 L30,32 M30,32 L70,68 M70,68 L70,32"
        fill="none" stroke="#04101c" strokeWidth="11" strokeLinecap="round"
        transform="translate(3,4)" opacity={0.5}
      />
      <path d="M30,68 L30,32" fill="none" stroke={`url(#${idPrefix}-l)`} strokeWidth="11" strokeLinecap="round" />
      <path d="M30,32 L70,68" fill="none" stroke={`url(#${idPrefix}-d)`} strokeWidth="11" strokeLinecap="round" />
      <path d="M70,68 L70,32" fill="none" stroke={`url(#${idPrefix}-r)`} strokeWidth="11" strokeLinecap="round" />
    </svg>
  );
}
