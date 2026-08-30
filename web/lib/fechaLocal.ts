/**
 * web/lib/fechaLocal.ts
 * Helper compartido para parsear fechas "YYYY-MM-DD" (las que produce
 * <input type="date">) sin el corrimiento de -1 día que causa
 * `new Date('YYYY-MM-DD')` al interpretarse como medianoche UTC — en
 * Colombia (UTC-5) eso muestra/calcula la fecha del día anterior.
 *
 * Mismo patrón ya usado en app/dashboard/vencimientos/page.tsx y
 * lib/alertasRiesgo.ts — centralizado aquí para reutilizar en los demás
 * módulos que comparan fechas límite/vencimiento contra "hoy".
 */

/** Parsea "YYYY-MM-DD" como fecha local (medianoche hora de Colombia, no UTC). */
export function parseLocalDate(fechaISO: string): Date | null {
  if (!fechaISO) return null;
  const [y, m, d] = fechaISO.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Días restantes (positivo = futuro, negativo = ya venció) desde hoy hasta fechaISO. */
export function diasRestantesLocal(fechaISO: string): number | null {
  const fecha = parseLocalDate(fechaISO);
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.ceil((fecha.getTime() - hoy.getTime()) / 86_400_000);
}

/** true si fechaISO ya pasó (estrictamente antes de hoy). */
export function estaVencidaLocal(fechaISO: string): boolean {
  const dias = diasRestantesLocal(fechaISO);
  return dias !== null && dias < 0;
}
