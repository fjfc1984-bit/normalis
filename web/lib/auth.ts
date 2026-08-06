/**
 * lib/auth.ts — re-exporta desde AuthContext para mantener compatibilidad.
 * Todos los imports existentes de '@/lib/auth' siguen funcionando sin cambios.
 */
export { useAuth, AuthProvider } from './AuthContext';
export type { AuthState, NormalisRole } from './AuthContext';
